# 📋 Kế Hoạch Tính Năng: Chuỗi Giải Đấu (Tournament Series)

> **Tài liệu tham chiếu:** [series-research.md](./series-research.md) — Nghiên cứu chi tiết Baseline.vn
>
> **Tài liệu kỹ thuật tuân thủ:** [skills.md](./skills.md) · [spec.md](./spec.md) · [data-types.md](./data-types.md) · [architecture.md](./architecture.md)
>
> **KHÔNG ĐƯỢC viết code cho đến khi đọc hiểu và được duyệt tài liệu này.**

---

## Mục Lục

1. [Tổng Quan Sản Phẩm](#1-tổng-quan-sản-phẩm)
2. [Database Schema](#2-database-schema)
3. [Backend API Endpoints](#3-backend-api-endpoints)
4. [Frontend Routes & Pages](#4-frontend-routes--pages)
5. [Frontend Components](#5-frontend-components)
6. [Feature Files Structure](#6-feature-files-structure)
7. [TypeScript Types](#7-typescript-types)
8. [Business Logic Rules](#8-business-logic-rules)
9. [Kế Hoạch Triển Khai Theo Phase](#9-kế-hoạch-triển-khai-theo-phase)
10. [Verification Checklist](#10-verification-checklist)

---

## 1. Tổng Quan Sản Phẩm

### 1.1 Bài Toán & Triết Lý Thiết Kế (Loosely-Coupled Design)

BTC (Organizer) muốn tạo **chuỗi giải đấu** — nhiều giải đấu riêng lẻ được nhóm lại theo chặng (leg), có hệ thống tích điểm PSR xuyên suốt, vé thẳng/vé vớt vào Vòng Chung Kết, và ràng buộc Exclusion Rule.

Hệ thống hiện tại chỉ hỗ trợ Tournament đơn lẻ. Tính năng Series sẽ được thiết kế theo mô hình **Loosely Coupled (Liên kết lỏng)** để giải quyết bài toán vận hành thực tế:
1. **Giải đấu (Tournament) là thực thể độc lập tối cao:** Mọi giải đấu khi tạo ra đều mặc định là giải đấu đơn lẻ. Nó tự hoạt động, tự đăng ký, tự chia bảng, tính điểm ELO và kết thúc mà không cần biết đến sự tồn tại của bất kỳ Series nào.
2. **Series là một "Wrapper" (Lớp bọc bên ngoài) tự chọn:**
   * Đối với người dùng thông thường / giải đơn lẻ: Quy trình tạo giải hoàn toàn không đổi. Các trường cấu hình liên quan đến Series sẽ được ẩn đi hoặc để tùy chọn mặc định là "Không thuộc chuỗi".
   * Đối với chuỗi giải đấu: BTC tạo thực thể **Tournament Series** trước, sau đó khi tạo/quản lý giải đấu, họ sẽ chọn liên kết (link) giải đấu đó vào một **Chặng (Leg)** cụ thể của Series.
   * Khi giải đấu thuộc Series kết thúc, hệ thống mới kích hoạt tính toán điểm PSR cho Series, cập nhật bảng xếp hạng và kiểm tra Exclusion Rule mà không làm ảnh hưởng đến luồng cập nhật ELO cơ bản.

### 1.2 Phạm Vi

| Gồm | Không gồm |
|-----|-----------|
| CRUD Series (Organizer) | Thay đổi Tournament schema hiện tại (giữ Tournament độc lập) |
| CRUD Legs trong Series | Mobile app |
| Link Tournament → SeriesEvent (Tự chọn khi tạo/sửa giải) | Payment cho Series (dùng payment độc lập của từng Tournament) |
| Bảng XH PSR tự động (chỉ chạy khi Tournament thuộc Series) | DUPR integration (tự dùng ELO nội bộ để thay thế) |
| Exclusion Rule engine (Khóa đăng ký các giải tiếp theo thuộc chặng) | Map view Mapbox (Phase sau) |
| Trang Series cho Public | Notification cho PSR (Phase sau) |
| Hỗ trợ luồng tạo giải đấu đơn lẻ hoàn toàn độc lập | |

### 1.3 Sơ Đồ Kiến Trúc Tổng Thể

```
                     TournamentSeries
                     "Superstars Cup 2026"
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         SeriesLeg    SeriesLeg    SeriesLeg
         "Chặng 1"   "Chặng 2"   "Chung Kết"
         (T5-T7)     (T8-T10)
              │            │
     ┌───────┼───────┐    │
     ▼       ▼       ▼    ▼
SeriesEvent  SE      SE   SE
     │       │       │    │
     ▼       ▼       ▼    ▼
Tournament  T       T    T        ← Tournament hiện tại, không đổi
(Đà Lạt)  (ĐN)   (TH)  (CK)
```

---

## 2. Database Schema

### 2.1 Bảng Mới — Backend Drizzle Schema

> **Lưu ý (skills.md Rule 4):** Sau khi tạo schema mới, **BẮT BUỘC** chạy `drizzle push` + restart `pnpm start:dev`.

#### `tournament_series`

| Cột | Kiểu | Nullable | Mặc định | Ghi chú |
|-----|------|----------|----------|---------|
| `id` | `uuid` | ❌ | `gen_random_uuid()` | PK |
| `name` | `varchar(255)` | ❌ | | "Đường đến Superstars Cup 2026" |
| `slug` | `varchar(255)` | ❌ | | Unique, SEO-friendly |
| `description` | `text` | ✅ | | HTML từ Editor.js |
| `banner_url` | `varchar(512)` | ✅ | | Cloudinary URL |
| `logo_url` | `varchar(512)` | ✅ | | |
| `organizer_id` | `uuid` | ❌ | | FK → `users.id` |
| `status` | `enum` | ❌ | `'DRAFT'` | DRAFT, ACTIVE, COMPLETED, CANCELLED |
| `start_date` | `date` | ✅ | | |
| `end_date` | `date` | ✅ | | |
| `total_prize` | `integer` | ✅ | | Tổng giải thưởng (VNĐ) |
| `rules` | `jsonb` | ❌ | `'{}'` | PsrPointConfig (bảng điểm, vé, exclusion) |
| `visibility` | `enum` | ❌ | `'PUBLIC'` | PUBLIC, PRIVATE |
| `created_at` | `timestamp` | ❌ | `now()` | |
| `updated_at` | `timestamp` | ❌ | `now()` | |
| `deleted_at` | `timestamp` | ✅ | | Soft delete |

**Indexes:** `slug` (unique), `organizer_id`, `status`

---

#### `series_legs`

| Cột | Kiểu | Nullable | Ghi chú |
|-----|------|----------|---------|
| `id` | `uuid` | ❌ | PK |
| `series_id` | `uuid` | ❌ | FK → `tournament_series.id` ON DELETE CASCADE |
| `name` | `varchar(100)` | ❌ | "Chặng 1", "Vòng Chung Kết" |
| `order` | `integer` | ❌ | Thứ tự chặng (1, 2, 3...) |
| `start_date` | `date` | ✅ | |
| `end_date` | `date` | ✅ | |
| `status` | `enum` | ❌ | UPCOMING, ONGOING, COMPLETED |
| `direct_entry_slots` | `integer` | ❌ | Default 2 (top N mỗi event) |
| `wildcard_slots` | `integer` | ❌ | Default 16 (top N PSR cuối chặng) |
| `rules_override` | `jsonb` | ✅ | Override bảng điểm riêng cho chặng |
| `created_at` | `timestamp` | ❌ | |

**Indexes:** `series_id`, `(series_id, order)` unique

---

#### `series_events`

| Cột | Kiểu | Nullable | Ghi chú |
|-----|------|----------|---------|
| `id` | `uuid` | ❌ | PK |
| `leg_id` | `uuid` | ❌ | FK → `series_legs.id` ON DELETE CASCADE |
| `tournament_id` | `uuid` | ❌ | FK → `tournaments.id` — **Unique** (1 tournament chỉ thuộc 1 event) |
| `region` | `varchar(100)` | ✅ | "Tây Nguyên", "Miền Trung"... |
| `order` | `integer` | ❌ | Thứ tự trong chặng |
| `point_multiplier` | `numeric(3,1)` | ❌ | Default 1.0, có thể 1.5 cho premium |
| `created_at` | `timestamp` | ❌ | |

**Indexes:** `leg_id`, `tournament_id` (unique)

---

#### `series_standings`

| Cột | Kiểu | Nullable | Ghi chú |
|-----|------|----------|---------|
| `id` | `uuid` | ❌ | PK |
| `leg_id` | `uuid` | ❌ | FK → `series_legs.id` |
| `user_id` | `uuid` | ❌ | FK → `users.id` |
| `category_id` | `uuid` | ❌ | FK → `categories.id` (Đơn Nam, Đôi Nữ...) |
| `total_psr_points` | `integer` | ❌ | Default 0, cộng dồn |
| `events_played` | `integer` | ❌ | Default 0 |
| `best_rank` | `integer` | ✅ | Hạng cao nhất đạt được |
| `direct_entry` | `boolean` | ❌ | Default false |
| `wildcard_entry` | `boolean` | ❌ | Default false |
| `locked_out` | `boolean` | ❌ | Default false (Exclusion Rule) |
| `qualified_event_id` | `uuid` | ✅ | FK → `series_events.id` (event nào cho vé) |
| `updated_at` | `timestamp` | ❌ | |

**Indexes:** `(leg_id, user_id, category_id)` unique composite, `leg_id`, `total_psr_points` DESC

---

#### `psr_point_logs`

| Cột | Kiểu | Nullable | Ghi chú |
|-----|------|----------|---------|
| `id` | `uuid` | ❌ | PK |
| `standing_id` | `uuid` | ❌ | FK → `series_standings.id` |
| `event_id` | `uuid` | ❌ | FK → `series_events.id` |
| `participant_id` | `uuid` | ❌ | FK → `tournament_participants.id` |
| `rank_achieved` | `integer` | ❌ | Hạng tại giải |
| `base_points` | `integer` | ❌ | Điểm gốc theo hạng |
| `bonus_points` | `integer` | ❌ | Default 0 |
| `multiplier` | `numeric(3,1)` | ❌ | Từ series_events.point_multiplier |
| `total_points` | `integer` | ❌ | = (base + bonus) × multiplier |
| `is_direct_entry` | `boolean` | ❌ | Default false (giải này cho vé thẳng?) |
| `created_at` | `timestamp` | ❌ | |

**Indexes:** `standing_id`, `event_id`

---

### 2.2 Cấu Trúc JSONB `rules`

```typescript
// tournament_series.rules
interface PsrPointConfig {
  pointsByRank: Record<number, number>;
  // Ví dụ: { 1: 100, 2: 75, 3: 50, 5: 30, 9: 15, 17: 5 }
  // Key = hạng bắt đầu, Value = điểm
  // Hạng 1 = 100 pts, Hạng 2 = 75 pts, Hạng 3-4 = 50 pts, ...

  directEntryThreshold: number;  // Default 2 (Top N → vé thẳng)
  wildcardCount: number;         // Default 16
  exclusionRule: boolean;        // Default true
  exclusionScope: 'CATEGORY' | 'ALL';
  // CATEGORY = chỉ khóa nội dung đã thắng
  // ALL = khóa toàn bộ nội dung

  description: string;           // Mô tả luật cho người chơi xem
}
```

---

## 3. Backend API Endpoints

### 3.1 Public APIs

| Method | Endpoint | Mô tả | Response Type |
|--------|----------|-------|--------------|
| `GET` | `/series` | Danh sách series công khai | `PaginatedResponse<TournamentSeries>` |
| `GET` | `/series/:slug` | Chi tiết series (kèm legs, counts) | `TournamentSeries` (with relations) |
| `GET` | `/series/:id/legs` | Danh sách chặng | `SeriesLeg[]` |
| `GET` | `/series/:id/legs/:legId/events` | Các events trong 1 chặng | `SeriesEvent[]` (with tournament) |
| `GET` | `/series/:id/standings` | Bảng XH PSR | `PaginatedResponse<SeriesStanding>` |

**Query params cho `/series`:**
- `?status=ACTIVE` — lọc theo trạng thái
- `?search=superstars` — tìm theo tên
- `?page=1&limit=10` — phân trang

**Query params cho `/series/:id/standings`:**
- `?legId=xxx` — lọc theo chặng (bắt buộc)
- `?categoryId=xxx` — lọc theo nội dung
- `?page=1&limit=50` — phân trang
- `?sort=totalPsrPoints&order=desc` — sắp xếp

### 3.2 Organizer APIs

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `POST` | `/organizer/series` | Tạo series mới | ORGANIZER+ |
| `PATCH` | `/organizer/series/:id` | Cập nhật series | Owner |
| `DELETE` | `/organizer/series/:id` | Soft delete series | Owner |
| `POST` | `/organizer/series/:id/legs` | Thêm chặng | Owner |
| `PATCH` | `/organizer/series/:id/legs/:legId` | Sửa chặng | Owner |
| `DELETE` | `/organizer/series/:id/legs/:legId` | Xóa chặng | Owner |
| `POST` | `/organizer/series/:id/legs/:legId/events` | Link tournament vào chặng | Owner |
| `DELETE` | `/organizer/series/:id/legs/:legId/events/:eventId` | Bỏ link tournament | Owner |
| `POST` | `/organizer/series/:id/legs/:legId/compute-standings` | Tính lại PSR cho chặng | Owner |

### 3.3 Admin APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/admin/series` | Danh sách tất cả series (kể cả PRIVATE) |
| `PATCH` | `/admin/series/:id/status` | Đổi trạng thái (ACTIVE ↔ CANCELLED) |

### 3.4 Internal/Auto APIs

| Method | Endpoint | Trigger |
|--------|----------|---------|
| `POST` | `/internal/series/compute-psr` | Webhook khi Tournament kết thúc |

---

## 4. Frontend Routes & Pages

### 4.1 Public Routes

| URL | File | Rendering | Status |
|-----|------|-----------|--------|
| `/series` | `app/(public)/series/page.tsx` | ISR (revalidate: 60) | 🔴 TODO |
| `/series/[slug]` | `app/(public)/series/[slug]/page.tsx` | SSR | 🔴 TODO |

### 4.2 Organizer Routes

| URL | File | Rendering | Status |
|-----|------|-----------|--------|
| `/organizer/series` | `app/organizer/series/page.tsx` | SSR | 🔴 TODO |
| `/organizer/series/create` | `app/organizer/series/create/page.tsx` | CSR (wizard) | 🔴 TODO |
| `/organizer/series/[id]/manage` | `app/organizer/series/[id]/manage/page.tsx` | CSR | 🔴 TODO |

### 4.3 Cấu Trúc File Route

```text
app/
├── (public)/
│   └── series/
│       ├── page.tsx                  # /series — Danh sách chuỗi giải
│       └── [slug]/
│           └── page.tsx              # /series/superstars-cup-2026
│
└── organizer/
    └── series/
        ├── page.tsx                  # Danh sách series của tôi
        ├── create/
        │   └── page.tsx              # Wizard tạo series
        └── [id]/
            └── manage/
                └── page.tsx          # Quản lý series
```

---

## 5. Frontend Components

### 5.1 Trang `/series` — Danh Sách Chuỗi Giải

```
┌─────────────────────────────────────────────────────────────────┐
│  🏆 CHUỖI GIẢI ĐẤU                                            │
│  Discover the most exciting tournament series                    │
│                                                                  │
│  [Tìm kiếm...] [Status ▼: Active/Upcoming/Completed]           │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ [Banner]     │  │ [Banner]     │  │ [Banner]     │          │
│  │ Superstars   │  │ Tennis Tour  │  │ Badminton    │          │
│  │ Cup 2026     │  │ 2026         │  │ League       │          │
│  │              │  │              │  │              │          │
│  │ 🟢 ACTIVE   │  │ 🟡 UPCOMING │  │ ✅ COMPLETED │          │
│  │ 3 chặng     │  │ 2 chặng     │  │ 4 chặng     │          │
│  │ 18 giải     │  │ 8 giải      │  │ 24 giải     │          │
│  │ 💰 500tr    │  │ 💰 200tr    │  │ 💰 1tỷ      │          │
│  │              │  │              │  │              │          │
│  │ [Xem →]     │  │ [Xem →]     │  │ [Xem →]     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

**Component: `SeriesCard.tsx`**
- Banner với gradient overlay (tối dần xuống dưới)
- Tên series (font lớn, bold)
- Badge status với màu: ACTIVE=green, UPCOMING=blue, COMPLETED=gray
- Stats: số chặng, số giải, tổng giải thưởng
- Logo organizer + tên CLB
- Hover: scale nhẹ + shadow
- Mobile: card full-width, stack vertical

### 5.2 Trang `/series/[slug]` — Chi Tiết Series

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ HERO BANNER ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬                │
│  Banner full-width, max-w-screen-2xl, h-[320px] md:h-[460px]   │
│                                                                  │
│  🏆 ĐƯỜNG ĐẾN SUPERSTARS CUP 2026                              │
│  by Pickleball Superstar                                         │
│                                                                  │
│  📅 01/05 — 31/10/2026     🎾 Pickleball                       │
│  ▓▓▓▓▓▓▓░░░ 60% hoàn thành (12/20 giải)                       │
│  ⏰ Event tiếp theo: Bảo Lộc — còn 2 ngày                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  [Tổng Quan] [Bảng Xếp Hạng] [Lịch Thi Đấu] [Quy Chế]       │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  (Nội dung tab tương ứng)                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Tabs:**

| Tab | Component | Dữ liệu |
|-----|-----------|----------|
| Tổng Quan | `SeriesOverviewTab.tsx` | Description (HTML), Stats cards, Next event |
| Bảng Xếp Hạng | `SeriesStandingsTab.tsx` | StandingsTable + filter by leg + category |
| Lịch Thi Đấu | `SeriesScheduleTab.tsx` | EventTimeline (list view theo thời gian) |
| Quy Chế | `SeriesRulesTab.tsx` | PSR rules, bảng điểm, Exclusion Rule mô tả |

### 5.3 Bảng Xếp Hạng PSR — `StandingsTable.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│  Chặng: [Chặng 1 ▼]    Nội dung: [Đôi Nam ▼]                  │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  #  │ VĐV              │ PSR  │ Giải │ Hạng tốt nhất │ Vé     │
│  ───┼──────────────────┼──────┼──────┼───────────────┼────────│
│  1  │ 👤 Nguyễn Văn A  │ 250  │ 3    │ 🥇 1          │ 🎫 TT │
│  2  │ 👤 Trần Thị B    │ 185  │ 5    │ 🥈 2          │ 🎫 TT │
│  3  │ 👤 Lê Văn C      │ 160  │ 4    │ 🥉 3          │ 🎫 VV │
│  4  │ 👤 Phạm D        │ 145  │ 3    │ 5             │ 🎫 VV │
│  ...│                   │      │      │               │        │
│  17 │ 👤 Hoàng G       │ 35   │ 2    │ 9             │ ⏳ Chờ │
│  ───┴──────────────────┴──────┴──────┴───────────────┴────────│
│                                                                  │
│  🎫 TT = Vé Thẳng   🎫 VV = Vé Vớt   ⏳ = Đang chờ           │
│  🔒 = Bị khóa (Exclusion Rule)                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Component: `TicketStatusBadge.tsx`**

| Status | Badge | Color |
|--------|-------|-------|
| DIRECT_ENTRY | 🎫 Vé Thẳng | `bg-emerald-100 text-emerald-800` |
| WILDCARD | 🎫 Vé Vớt | `bg-blue-100 text-blue-800` |
| IN_CONTENTION | ⏳ Đang chờ | `bg-amber-100 text-amber-800` |
| LOCKED_OUT | 🔒 Đã khóa | `bg-gray-100 text-gray-500` |
| NOT_QUALIFIED | — | `text-gray-400` |

### 5.4 Timeline Sự Kiện — `EventTimeline.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 CHẶNG 1 — VÒNG TÌM KIẾM TÀI NĂNG (T5-T7/2026)           │
│                                                                  │
│  ○───●───●───●───○───○                                          │
│  ĐL  ĐN  TH  ĐN  BL  ĐT                                      │
│                                                                  │
│  30/05 ✅  │  Đà Lạt — Tây Nguyên                               │
│            │  Sân Pickleball Khánh Anh                           │
│            │  👥 48 VĐV  │  🏆 Top 2: VĐV A, VĐV B            │
│            │                                                     │
│  30/05 ✅  │  Đà Nẵng — Miền Trung                              │
│            │  [Xem chi tiết giải →]                              │
│            │                                                     │
│  06/06 ✅  │  Đà Nẵng lần 2 — Miền Trung                       │
│            │                                                     │
│  13/06 🟡  │  Bảo Lộc — Tây Nguyên    ← ĐANG DIỄN RA          │
│            │  [Đăng ký →]                                        │
│            │                                                     │
│  27/06 ⬜  │  Đức Trọng — Tây Nguyên                            │
│            │  [Sắp mở đăng ký]                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 Wizard Tạo Series — `/organizer/series/create`

**4 Steps:**

| Step | Tên | Components | Validation |
|------|-----|-----------|------------|
| 1 | Thông Tin | Tên, slug (auto-gen), description (RichTextEditor), banner/logo, visibility | name: required, min 3 |
| 2 | Cấu Hình Điểm | Bảng điểm PSR theo hạng (editable table), vé thẳng/vớt, Exclusion Rule toggle | pointsByRank: at least rank 1 |
| 3 | Chặng & Events | Thêm chặng (tên, ngày), trong mỗi chặng link Tournament (dropdown/search) | Ít nhất 1 leg, 1 event |
| 4 | Xác Nhận | Review tất cả, nút Publish | — |

---

## 6. Feature Files Structure

> **Tuân thủ architecture.md:** Feature-Sliced Design, tách api/components/hooks/types.

```text
src/features/series/
├── api/
│   ├── getSeries.ts                  # GET /series
│   ├── getSeriesDetail.ts            # GET /series/:slug
│   ├── getSeriesLegs.ts              # GET /series/:id/legs
│   ├── getSeriesEvents.ts            # GET /series/:id/legs/:legId/events
│   ├── getSeriesStandings.ts         # GET /series/:id/standings
│   ├── createSeries.ts              # POST /organizer/series
│   ├── updateSeries.ts              # PATCH /organizer/series/:id
│   ├── deleteSeries.ts              # DELETE /organizer/series/:id
│   ├── createLeg.ts                 # POST /organizer/series/:id/legs
│   ├── updateLeg.ts                 # PATCH /organizer/series/:id/legs/:legId
│   ├── deleteLeg.ts                 # DELETE /organizer/series/:id/legs/:legId
│   ├── linkEvent.ts                 # POST /organizer/series/:id/legs/:legId/events
│   ├── unlinkEvent.ts               # DELETE /organizer/series/:id/legs/:legId/events/:eventId
│   ├── computeStandings.ts          # POST /organizer/series/:id/legs/:legId/compute-standings
│   └── index.ts
│
├── components/
│   ├── SeriesCard.tsx                # Card trong danh sách
│   ├── SeriesHeroBanner.tsx          # Hero banner trang chi tiết
│   ├── SeriesOverviewTab.tsx         # Tab Tổng Quan
│   ├── SeriesStandingsTab.tsx        # Tab Bảng XH
│   ├── SeriesScheduleTab.tsx         # Tab Lịch Thi Đấu
│   ├── SeriesRulesTab.tsx            # Tab Quy Chế
│   ├── StandingsTable.tsx            # Bảng XH PSR (reusable)
│   ├── EventTimeline.tsx             # Timeline sự kiện
│   ├── EventCard.tsx                 # Card 1 event trong timeline
│   ├── TicketStatusBadge.tsx         # Badge trạng thái vé
│   ├── PsrPointsDisplay.tsx          # Hiển thị điểm PSR
│   ├── SeriesProgressBar.tsx         # Progress bar X/Y giải
│   ├── CountdownTimer.tsx            # Countdown đến event tiếp
│   │
│   ├── organizer/                    # Components cho Organizer
│   │   ├── CreateSeriesWizard.tsx    # Multi-step wizard
│   │   ├── StepInfo.tsx              # Step 1: Thông tin
│   │   ├── StepPsrConfig.tsx         # Step 2: Cấu hình điểm
│   │   ├── StepLegsEvents.tsx        # Step 3: Chặng & Events
│   │   ├── StepReview.tsx            # Step 4: Xác nhận
│   │   ├── LegEditor.tsx             # Form thêm/sửa chặng
│   │   ├── EventLinker.tsx           # UI link tournament vào event
│   │   ├── PsrConfigTable.tsx        # Bảng input điểm theo hạng
│   │   └── SeriesManageClient.tsx    # Client component quản lý
│   │
│   └── index.ts
│
├── hooks/
│   ├── useSeries.ts                  # Fetch + filter danh sách
│   ├── useSeriesDetail.ts            # Fetch chi tiết + legs
│   ├── useSeriesStandings.ts         # Fetch bảng XH + filter
│   ├── useCreateSeries.ts            # Form submit logic wizard
│   └── useManageSeries.ts            # CRUD legs/events
│
└── types/
    └── index.ts                      # Types riêng cho Series feature
```

---

## 7. TypeScript Types

> **Tuân thủ skills.md Rule 1:** TUYỆT ĐỐI KHÔNG dùng `any`. Dùng `unknown` hoặc định nghĩa Interface.
> **Tuân thủ data-types.md:** Đặt trong `src/types/series.ts`, re-export từ `src/types/index.ts`.

```typescript
// src/types/series.ts

export type SeriesStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type LegStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';
export type TicketStatus = 'DIRECT_ENTRY' | 'WILDCARD' | 'IN_CONTENTION' | 'LOCKED_OUT' | 'NOT_QUALIFIED';
export type ExclusionScope = 'CATEGORY' | 'ALL';

// ─── Entities ──────────────────────────────────────────────────

export interface TournamentSeries {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  organizerId: string;
  status: SeriesStatus;
  startDate: string | null;
  endDate: string | null;
  totalPrize: number | null;
  rules: PsrPointConfig;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
  updatedAt: string;
  // Computed / Joined
  organizer?: UserProfile;
  _count?: {
    legs: number;
    events: number;
  };
}

export interface SeriesLeg {
  id: string;
  seriesId: string;
  name: string;
  order: number;
  startDate: string | null;
  endDate: string | null;
  status: LegStatus;
  directEntrySlots: number;
  wildcardSlots: number;
  rulesOverride: Partial<PsrPointConfig> | null;
  createdAt: string;
  // Joined
  events?: SeriesEvent[];
  _count?: { events: number };
}

export interface SeriesEvent {
  id: string;
  legId: string;
  tournamentId: string;
  region: string | null;
  order: number;
  pointMultiplier: number;
  createdAt: string;
  // Joined
  tournament?: Tournament;
}

export interface SeriesStanding {
  id: string;
  legId: string;
  userId: string;
  categoryId: string;
  totalPsrPoints: number;
  eventsPlayed: number;
  bestRank: number | null;
  directEntry: boolean;
  wildcardEntry: boolean;
  lockedOut: boolean;
  qualifiedEventId: string | null;
  updatedAt: string;
  // Joined
  user?: UserProfile;
  category?: Category;
  qualifiedEvent?: SeriesEvent;
  pointLogs?: PsrPointLog[];
}

export interface PsrPointLog {
  id: string;
  standingId: string;
  eventId: string;
  participantId: string;
  rankAchieved: number;
  basePoints: number;
  bonusPoints: number;
  multiplier: number;
  totalPoints: number;
  isDirectEntry: boolean;
  createdAt: string;
  // Joined
  event?: SeriesEvent;
}

// ─── Config ────────────────────────────────────────────────────

export interface PsrPointConfig {
  pointsByRank: Record<number, number>;
  directEntryThreshold: number;
  wildcardCount: number;
  exclusionRule: boolean;
  exclusionScope: ExclusionScope;
  description: string;
}

// ─── DTOs ──────────────────────────────────────────────────────

export interface CreateSeriesDto {
  name: string;
  description?: string;
  bannerUrl?: string;
  logoUrl?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  startDate?: string;
  endDate?: string;
  totalPrize?: number;
  rules: PsrPointConfig;
}

export interface UpdateSeriesDto extends Partial<CreateSeriesDto> {
  status?: SeriesStatus;
}

export interface CreateLegDto {
  name: string;
  order: number;
  startDate?: string;
  endDate?: string;
  directEntrySlots?: number;
  wildcardSlots?: number;
  rulesOverride?: Partial<PsrPointConfig>;
}

export interface LinkEventDto {
  tournamentId: string;
  region?: string;
  order: number;
  pointMultiplier?: number;
}

export interface QuerySeriesDto {
  status?: SeriesStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface QueryStandingsDto {
  legId: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}
```

---

## 8. Business Logic Rules

### 8.1 PSR Computation Flow

```
Khi Tournament.status chuyển sang COMPLETED:
  1. Kiểm tra: Tournament này có thuộc series_events nào không?
     → Nếu KHÔNG → Bỏ qua (giải đơn lẻ bình thường)
     → Nếu CÓ → Tiếp tục

  2. Lấy danh sách kết quả xếp hạng cuối cùng từ Tournament:
     - Sort participants by points DESC, wins DESC
     - Gán rank 1, 2, 3, ...

  3. Với mỗi participant:
     a. Tìm hoặc tạo SeriesStanding (leg_id + user_id + category_id)
     b. Kiểm tra Exclusion: nếu standing.lockedOut = true → BỎ QUA (không cho điểm)
     c. Tra bảng pointsByRank → lấy base_points
     d. total_points = (base_points + bonus) × event.pointMultiplier
     e. Tạo PsrPointLog
     f. Cập nhật standing: totalPsrPoints += total_points, eventsPlayed++

  4. Kiểm tra Direct Entry:
     - Nếu rank ≤ directEntryThreshold (thường = 2):
       → standing.directEntry = true
       → standing.qualifiedEventId = event.id
       → Nếu exclusionRule = true:
         → standing.lockedOut = true

  5. Sau khi tất cả events trong leg kết thúc:
     - Sort standings by totalPsrPoints DESC
     - Top wildcardCount (thường = 16) chưa có directEntry:
       → standing.wildcardEntry = true
```

### 8.2 Exclusion Rule Details

```
Khi exclusionRule = true và VĐV đạt directEntry:

  Nếu exclusionScope = 'CATEGORY':
    → VĐV bị khóa chỉ ở nội dung (category) đã thắng
    → VĐV vẫn có thể đăng ký nội dung khác ở giải tiếp
    → Ví dụ: Thắng Đôi Nam ở Đà Lạt → bị khóa Đôi Nam ở Bảo Lộc, nhưng vẫn đăng ký Đơn Nam được

  Nếu exclusionScope = 'ALL':
    → VĐV bị khóa hoàn toàn khỏi tất cả giải tiếp trong chặng
    → Phù hợp cho giải nhỏ, ít nội dung

  Kiểm tra khi đăng ký Tournament:
    1. Tournament có thuộc SeriesEvent nào không?
    2. Nếu có → Lấy SeriesStanding của user cho leg + category tương ứng
    3. Nếu standing.lockedOut = true → TỪ CHỐI đăng ký, thông báo lý do
```

### 8.3 Validation Rules

```
Tạo Series:
  - name: required, min 3, max 255
  - slug: auto-generated từ name, unique
  - rules.pointsByRank: phải có ít nhất rank 1
  - rules.directEntryThreshold: >= 1
  - rules.wildcardCount: >= 0

Link Event:
  - Tournament chưa được link vào series nào khác
  - Tournament thuộc cùng organizer (hoặc admin override)
  - Tournament chưa COMPLETED (vẫn cho link giải đang diễn ra)

Compute Standings:
  - Chỉ compute khi có ít nhất 1 event COMPLETED trong leg
```

---

## 9. Kế Hoạch Triển Khai Theo Phase

### Phase A: Backend Foundation (Ưu tiên 🔴 — 1-2 tuần)

| # | Task | Files | Ghi chú |
|---|------|-------|---------|
| A1 | Tạo Drizzle schema 5 bảng | `src/db/schema/series.ts` | Chạy `drizzle push` + restart |
| A2 | Module `series` — CRUD APIs | `src/modules/series/` | Controller, Service, DTOs |
| A3 | PSR computation service | `src/modules/series/services/psr-computation.service.ts` | Logic tính điểm |
| A4 | Exclusion Rule guard | `src/modules/series/guards/exclusion.guard.ts` | Check khi đăng ký tournament |
| A5 | Hook vào Tournament completion | `src/modules/tournaments/events/` | Emit event khi tournament COMPLETED |
| A6 | Unit tests | `src/modules/series/__tests__/` | PSR computation + Exclusion |

### Phase B: Core Frontend UI (Ưu tiên 🔴 — 1-2 tuần)

| # | Task | Files | Ghi chú |
|---|------|-------|---------|
| B1 | Types + API layer | `src/types/series.ts`, `src/features/series/api/` | Mapping DTOs |
| B2 | Trang `/series` | `app/(public)/series/page.tsx` + `SeriesCard.tsx` | ISR |
| B3 | Trang `/series/[slug]` | Page + 4 Tab components | SSR |
| B4 | `StandingsTable.tsx` | `features/series/components/` | Filter, pagination |
| B5 | `EventTimeline.tsx` | `features/series/components/` | Vertical timeline |
| B6 | `TicketStatusBadge.tsx` | `features/series/components/` | 5 trạng thái |
| B7 | Navigation link | Header.tsx — thêm "Chuỗi Giải" | |

### Phase C: Organizer Tools (🟡 — 1 tuần)

| # | Task | Files |
|---|------|-------|
| C1 | Wizard tạo Series (4 steps) | `app/organizer/series/create/` |
| C2 | Manage Series page | `app/organizer/series/[id]/manage/` |
| C3 | LegEditor + EventLinker | `features/series/components/organizer/` |
| C4 | PsrConfigTable | Bảng input điểm theo hạng |
| C5 | Nút "Tính PSR" | Gọi compute-standings API |

### Phase D: Polish (🟡 — 1 tuần)

| # | Task |
|---|------|
| D1 | Countdown timer đến event tiếp |
| D2 | Progress bar series |
| D3 | Mobile responsive hoàn chỉnh |
| D4 | SEO: meta tags, Open Graph cho `/series/[slug]` |
| D5 | Skeleton loading states |
| D6 | Error boundaries cho series pages |
| D7 | `pnpm build` pass, `pnpm lint` clean |

### Phase E: Advanced (🔵 Tương lai)

| # | Task |
|---|------|
| E1 | Map view (Mapbox/Leaflet) — pins events trên bản đồ VN |
| E2 | Notification khi PSR thay đổi |
| E3 | Auto-compute PSR webhook (không cần BTC bấm) |
| E4 | Public API cho third-party embed bảng XH |

---

## 10. Verification Checklist

> **Tuân thủ skills.md Rule 8:** Chạy `pnpm lint` + `pnpm build` sau mỗi phase.

### Backend

- [ ] 5 bảng DB tạo thành công (`drizzle push`)
- [ ] API `/series` trả về đúng format `ApiResponse<PaginatedResponse<TournamentSeries>>`
- [ ] API standings trả về sorted by PSR DESC
- [ ] PSR computation tính đúng: base × multiplier
- [ ] Exclusion Rule block đăng ký tournament đúng scope
- [ ] Unit test pass: PSR computation edge cases
- [ ] `pnpm lint` clean
- [ ] `pnpm build` pass

### Frontend

- [ ] `pnpm tsc --noEmit` — không lỗi TypeScript
- [ ] Không có `any` type nào trong `features/series/`
- [ ] Mobile responsive (test 375px, 768px, 1440px)
- [ ] Skeleton loading cho trang series list và detail
- [ ] Toast error handling (dùng `getErrorMessage()`)
- [ ] Banner tuân thủ rules: `max-w-screen-2xl`, `h-[320px] md:h-[460px]`
- [ ] `pnpm lint` clean
- [ ] `pnpm build` pass

---

> **Bước tiếp theo:** Trả lời các câu hỏi mở trong [series-research.md § 7](./series-research.md#7-các-câu-hỏi-mở-từ-nghiên-cứu), sau đó bắt đầu Phase A.
