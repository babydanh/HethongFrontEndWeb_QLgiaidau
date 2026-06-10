# 🤖 AI Agent Prompt — Triển Khai Phase 5 Frontend UI

> **Prompt này dành riêng cho AI Agent làm phần Frontend.**
> Nếu làm cả Backend + Frontend → dùng file `backend-api_qlgiaidau/docs/prompt.md`

---

## NHIỆM VỤ

Bạn là AI Agent chuyên nghiệp đang làm phần **Frontend (Next.js)** cho dự án Quản Lý Giải Đấu Thể Thao.

Nhiệm vụ: Triển khai Phase 5 Frontend — Tournament Card nâng cấp, Visibility UI, Doubles Registration Flow, Community Tournaments, ELO Leaderboard, Region Filter.

**Backend API đã sẵn sàng.** Bạn chỉ cần xây dựng UI và gọi đúng API.

---

## QUY TẮC BẮT BUỘC

### 🚫 TUYỆT ĐỐI KHÔNG:
- Dùng `any` trong TypeScript
- Viết CSS thuần (chỉ TailwindCSS + cn() helper)
- Hardcode URL API trong component (`axios.get('/api/v1/...')` → ❌)
- Dùng `alert()` (phải dùng toast)
- Định nghĩa interface đồ sộ trong file component (đặt vào `src/types/`)
- Viết logic giống nhau ở nhiều file (check `src/utils/`, `src/hooks/` trước)
- Format ngày sai (phải dùng dd/MM/yyyy, không dùng yyyy-MM-dd cho UI)

### ✅ BẮT BUỘC:
- Dùng `cn()` để gộp class TailwindCSS
- Mobile-first (code từ màn hình nhỏ → `sm:` → `md:` → `lg:`)
- Xử lý lỗi bằng `getErrorMessage()` từ `src/utils/error.ts` + toast
- Import type bằng `import type { ... }` để tối ưu bundle
- Logic API nằm trong `features/*/api/*.ts`, KHÔNG đặt trong component
- Kiểm tra `src/utils/`, `src/hooks/`, `src/constants/` trước khi viết mới
- `'use client'` chỉ khi cần hooks/events (mặc định Server Component)

---

## TÀI LIỆU BẮT BUỘC ĐỌC (THEO THỨ TỰ)

```
1. docs/skills.md         ← Quy tắc công nghệ, naming, kiến trúc
2. docs/phase5-plan.md    ← UI mockups + component specs + flow chi tiết
3. docs/routes.md         ← Tất cả routes hiện tại + routes mới Phase 5
4. docs/pages.md          ← Rendering strategy, APIs, components từng trang
```

**Đọc code hiện tại trước khi sửa:**
```
src/app/(public)/tournaments/page.tsx      ← Trang danh sách giải (sẽ nâng cấp)
src/app/(public)/tournaments/[id]/         ← Trang chi tiết giải (thêm register)
src/app/organizer/tournaments/[id]/manage/ ← Manage page (thêm visibility settings)
src/components/ui/                         ← UI primitives đã có (tái sử dụng)
src/utils/                                 ← Check trước khi viết logic mới
src/features/tournaments/                  ← API functions đã có
```

---

## CÁC VIỆC CẦN LÀM (THEO THỨ TỰ)

### 1. Tournament Card Nâng Cấp
**File:** Component TournamentCard (tìm file hiện tại hoặc tạo mới)

Mỗi card phải hiển thị:
- Tên giải + banner/logo
- Môn thể thao (icon + tên)
- 📍 Địa chỉ / khu vực (từ venue address)
- 📅 Ngày thi đấu (**format dd/MM/yyyy**)
- 🎾 Loại: Singles / Doubles / Mixed
- 💰 Phí (hoặc "Miễn phí")
- 👥 `X/Y đội` đã đăng ký
- Badge trạng thái (màu xanh/vàng/xám tùy status)
- 🚻 Ràng buộc giới tính (nếu có — chỉ hiện khi không phải NULL)

### 2. Filter Bar Nâng Cấp (trang /tournaments)
**Thêm các bộ lọc mới:**
- 🗺️ Khu vực → dropdown từ `GET /regions`
- 💰 Phí → Tất cả / Miễn phí / Có phí
- 🎾 Loại → Singles / Doubles / Mixed

**API call:** `GET /tournaments?search=&categoryId=&status=&region=&visibility=PUBLIC&tournamentType=PUBLIC&page=1&limit=12`

### 3. Visibility Setting trong Manage Page
**File:** `src/app/organizer/tournaments/[id]/manage/page.tsx`

Thêm vào Tab Settings:
```
Toggle: "Chế độ hiển thị"
  ○ PUBLIC  → "Hiển thị trên trang tìm kiếm"
  ● PRIVATE → "Chỉ đăng ký qua link mời"
              [Link mời: https://.../register?invite=ABC123] [Copy]
              [Tạo lại mã mời]

Dropdown: "Ràng buộc giới tính"
  - Không ràng buộc
  - Chỉ Nam
  - Chỉ Nữ
  - Mixed (1 nam + 1 nữ)
```

API: `PATCH /tournaments/:id` + `POST /tournaments/:id/regenerate-invite`

### 4. Trang Đăng Ký Qua Invite Link
**File mới:** `src/app/(public)/tournaments/[id]/register/page.tsx`

URL: `/tournaments/[id]/register?invite={code}`

Flow:
1. Gọi `POST /tournaments/:id/validate-invite { inviteCode }` → Lấy thông tin giải
2. Nếu INVALID → Hiển thị lỗi "Mã mời không hợp lệ"
3. Nếu VALID → Hiển thị info giải + check auth:
   - Chưa đăng nhập → Nút "Đăng nhập để đăng ký" → `/login?redirect=...`
   - Đã đăng nhập → Hiển thị form đăng ký
4. Form: Tên đội + info user (pre-fill)
5. Submit → `POST /tournaments/:id/register { inviteCode, teamName }`
6. Nếu Doubles → Chuyển sang flow mời partner
7. Nếu có phí → Redirect thanh toán

### 5. Login Redirect Flow
**File:** `src/app/(public)/login/page.tsx`

Sửa: Sau login thành công → redirect về `searchParams.get('redirect')` thay vì `/`

### 6. Doubles Registration Flow
**File mới:** `src/app/(public)/tournaments/[id]/register/components/DoublesRegistrationFlow.tsx`

3 steps:
```
Step 1: Đăng ký → API POST /register → Nhận teamInviteLink
Step 2: Hiển thị link mời + QR Code
        Polling mỗi 5s: GET /tournaments/:id/my-registration
        → Khi teamStatus = 'COMPLETE': chuyển Step 3
Step 3: Đội đủ người → Nút "Thanh toán" (có phí) / "Hoàn tất" (free)
```

### 7. Trang Join Team (Partner)
**File mới:** `src/app/(public)/tournaments/[id]/join-team/page.tsx`

URL: `/tournaments/[id]/join-team?pid={participantId}&token={teamInviteToken}`

Flow:
1. Lấy thông tin giải + participant
2. Check đăng nhập → redirect login nếu chưa
3. Hiển thị: tên đội, leader, thông tin giải
4. Check giới tính phù hợp → hiện cảnh báo nếu sai
5. Nút "Tham gia đội" → `POST /tournaments/:id/join-team { participantId, teamInviteToken }`

### 8. Hiển thị Trạng Thái Đăng Ký + Rút Lui
**File sửa:** `src/app/(public)/tournaments/[id]/TournamentDetailClient.tsx`

Thêm vào header trang giải:
- Gọi `GET /tournaments/:id/my-registration`
- Nếu đã đăng ký → hiện "Bạn đã đăng ký: Team ABC"
- Nếu PENDING (đội chưa đủ) → hiện "Đang chờ partner" + link mời
- Nút "Rút khỏi giải" → ConfirmDialog → `POST /tournaments/:id/withdraw`

### 9. Tab Giải Đấu trong Community Detail
**File sửa:** `src/app/(public)/communities/[id]/page.tsx`

Thêm tab "Giải đấu":
- Gọi `GET /tournaments?communityId={id}&tournamentType=CLUB`
- Hiển thị danh sách giải CLB
- Nút "Tạo giải CLB" (chỉ hiện nếu user là admin CLB) → `/organizer/tournaments/create?communityId={id}`

### 10. EloTierBadge Component
**File mới:** `src/components/ui/EloTierBadge.tsx`

```typescript
// Props: { elo: number, size?: 'sm' | 'md' | 'lg' }
// Tiers:
// Bronze  : 100-1199   (màu cam đất)
// Silver  : 1200-1399  (màu xám)
// Gold    : 1400-1599  (màu vàng)
// Platinum: 1600-1799  (màu xanh nhạt)
// Diamond : 1800-1999  (màu cyan)
// Master  : 2000-2199  (màu tím)
// Grand Master: 2200+  (màu amber/vàng đậm)
```

### 11. Leaderboard Page Nâng Cấp
**File sửa:** `src/app/(public)/leaderboard/page.tsx`

Thêm:
- Tab "Xếp hạng chung" → `GET /rankings?scope=PUBLIC&categoryId=xx`
- Tab "Xếp hạng CLB" → Chọn CLB → `GET /rankings?scope=COMMUNITY&communityId=xx&categoryId=xx`
- EloTierBadge cho mỗi người trong bảng xếp hạng

### 12. Region Filtering
**File sửa:**
- `src/app/(public)/tournaments/page.tsx` → Dropdown khu vực
- `src/app/(public)/communities/page.tsx` → Dropdown khu vực

API: `GET /regions` → populate dropdown

---

## QUY TRÌNH LÀM

```
1. Đọc tài liệu (docs/skills.md + docs/phase5-plan.md + docs/routes.md)
2. Đọc code hiện tại của file sắp sửa
3. Check src/utils/ và src/hooks/ trước khi viết logic mới
4. Code + TypeScript strict
5. Sau mỗi nhóm việc: pnpm build → fix lỗi trước khi tiếp
6. Báo cáo xong theo format bên dưới
```

---

## FORMAT BÁO CÁO

```
✅ Xong: [Tên việc]
- File mới: [...]
- File sửa: [...]
- API sử dụng: [...]
- pnpm build: PASS
```
