# 📋 Kế Hoạch Phase 5 — Frontend UI Nâng Cấp Toàn Diện

> Tài liệu này mô tả **từng trang và component** cần xây dựng cho Phase 5.
> AI Agent: Đọc file này + `skills.md` + `routes.md` + backend `phase5-plan.md` trước khi viết code.
> **Tuân thủ design system**: TailwindCSS 4, Lucide Icons, cn() helper, Mobile-first.
> **KHÔNG ĐƯỢC viết code cho đến khi đọc hiểu hết tài liệu này.**

---

## Tổng Quan Các Nhóm Công Việc

| # | Nhóm | Priority | Trang/Component chính |
|---|------|----------|----------------------|
| 1 | Tournament Visibility & Registration UI | 🔴 High | Setting page, Register page, Invite flow |
| 2 | Doubles Registration Flow | 🔴 High | Team registration, Join team page |
| 3 | Tournament List Nâng Cấp | 🔴 High | Card thông tin đầy đủ, filter region |
| 4 | Community Tournaments | 🟡 Medium | Tab giải đấu trong CLB |
| 5 | Bracket & Scoring UI | 🟡 Medium | Setting nâng cao, nhập điểm |
| 6 | ELO & Leaderboard | 🔴 High | Leaderboard, EloTierBadge, EloChart |
| 7 | Missing Pages | 🟡 Medium | Profile, Dashboard, Live Score |

---

## Nhóm 1: Tournament Visibility & Registration UI

### 1.1 Setting Visibility trong Manage Page

**File sửa:** `app/organizer/tournaments/[id]/manage/page.tsx` — Tab Settings / Tab 1

**UI cần thêm:**
- Toggle switch "Chế độ hiển thị": **PUBLIC** / **PRIVATE**
  - PUBLIC: Mô tả nhỏ "Giải đấu sẽ hiển thị trên trang tìm kiếm, mọi người đều có thể đăng ký."
  - PRIVATE: Mô tả nhỏ "Giải đấu ẩn khỏi tìm kiếm, chỉ ai có link mời mới đăng ký."
- Khi chọn PRIVATE → hiển thị:
  - Ô hiển thị invite link (readonly): `{FRONTEND_URL}/tournaments/{id}/register?invite={inviteCode}`
  - Nút "Copy Link" (copy to clipboard + toast "Đã copy!")
  - Nút "Tạo lại mã mời" (gọi API `POST /tournaments/:id/regenerate-invite`)
- Dropdown "Ràng buộc giới tính":
  - Không ràng buộc (null)
  - Chỉ Nam
  - Chỉ Nữ
  - Mixed (1 nam + 1 nữ — chỉ áp dụng doubles)

**API calls:**
- `PATCH /tournaments/:id` body: `{ visibility, genderRestriction }`
- `POST /tournaments/:id/regenerate-invite`

### 1.2 Trang Đăng Ký Qua Invite Link

**File mới:** `app/(public)/tournaments/[id]/register/page.tsx`

**URL:** `/tournaments/{id}/register?invite={code}`

**Flow UI:**
```
1. Khi vào trang → Gọi POST /tournaments/:id/validate-invite { inviteCode }
   ├── Nếu INVALID → Hiển thị lỗi "Mã mời không hợp lệ hoặc đã hết hạn"
   └── Nếu VALID → Hiển thị thông tin giải đấu:
       - Banner/Logo giải
       - Tên giải, môn thể thao, ngày thi đấu
       - Loại: Singles/Doubles
       - Phí tham gia (hoặc "Miễn phí")
       - Ràng buộc giới tính (nếu có)
       - Số lượng đã đăng ký / tối đa

2. Check đăng nhập:
   ├── Nếu CHƯA đăng nhập → Nút "Đăng nhập để đăng ký"
   │   → Redirect: /login?redirect=/tournaments/{id}/register?invite={code}
   └── Nếu ĐÃ đăng nhập → Hiển thị form đăng ký

3. Form đăng ký:
   - Tên đội / Tên hiển thị (text input)
   - Thông tin user (pre-fill từ profile): Họ tên, giới tính, ELO hiện tại
   - Nút "Đăng ký tham gia" → Gọi POST /tournaments/:id/register

4. Sau đăng ký:
   ├── Nếu Doubles → Chuyển sang step "Mời bạn đánh chung" (Nhóm 2)
   ├── Nếu có phí → Chuyển sang trang thanh toán
   └── Nếu free + singles → Toast "Đăng ký thành công!" + redirect về trang giải
```

### 1.3 Auth Redirect Flow

**File sửa:** `app/(public)/login/page.tsx`

**Logic:**
- Nhận query param `redirect` từ URL
- Sau login thành công → redirect về URL trong `redirect` param thay vì `/` mặc định
- Giữ nguyên toàn bộ query params (bao gồm `invite` code)

---

## Nhóm 2: Doubles Registration Flow

### 2.1 Component DoublesRegistrationFlow

**File mới:** `app/(public)/tournaments/[id]/register/components/DoublesRegistrationFlow.tsx`

**UI Flow (Multi-step):**

```
Step 1: "Đăng ký đội" (Team Leader)
┌──────────────────────────────────────┐
│  📋 Đăng Ký Đội Đánh Đôi           │
│                                      │
│  Tên đội: [________________]         │
│  Đội trưởng: Nguyễn Văn A (bạn)     │
│  Giới tính: Nam ✅                   │
│                                      │
│  [Đăng ký & Tạo đội] (primary btn)  │
└──────────────────────────────────────┘

Step 2: "Mời bạn đánh chung"
┌──────────────────────────────────────┐
│  🤝 Mời Partner Vào Đội             │
│                                      │
│  Đã tạo đội "Team ABC" thành công!  │
│                                      │
│  Gửi link sau cho bạn đánh chung:   │
│  ┌────────────────────────┐          │
│  │ https://...join-team... │ [Copy]  │
│  └────────────────────────┘          │
│                                      │
│  [QR Code hiển thị link]             │
│                                      │
│  ⏳ Đang chờ partner tham gia...     │
│  (Auto-refresh hoặc polling 5s)      │
│                                      │
│  Lưu ý:                             │
│  • Partner cần đăng nhập để tham gia │
│  • Giải yêu cầu: Mixed (1 nam+1 nữ) │
└──────────────────────────────────────┘

Step 3: "Partner đã tham gia" (hoặc chuyển thẳng thanh toán)
┌──────────────────────────────────────┐
│  ✅ Đội đã đủ thành viên!           │
│                                      │
│  👤 Nguyễn Văn A (Đội trưởng)      │
│  👤 Trần Thị B (Partner)            │
│                                      │
│  [Thanh toán lệ phí] (nếu có phí)   │
│  hoặc                                │
│  [Hoàn tất đăng ký] (nếu free)      │
└──────────────────────────────────────┘
```

### 2.2 Trang Join Team (Partner)

**File mới:** `app/(public)/tournaments/[id]/join-team/page.tsx`

**URL:** `/tournaments/{id}/join-team?pid={participantId}&token={teamInviteToken}`

**Flow UI:**
```
1. Gọi GET /tournaments/:id → Hiển thị thông tin giải
2. Check đăng nhập:
   ├── Chưa đăng nhập → Nút "Đăng nhập để tham gia đội"
   │   → Redirect: /login?redirect=/tournaments/{id}/join-team?pid=...&token=...
   └── Đã đăng nhập → Tiếp tục

3. Hiển thị thông tin đội:
   - Tên đội: "Team ABC"
   - Đội trưởng: Nguyễn Văn A (avatar + tên)
   - Giải: Tên giải, môn, ngày

4. Check giới tính (nếu có ràng buộc):
   ├── Phù hợp → Hiển thị nút "Tham gia đội"
   └── Không phù hợp → Hiển thị lỗi:
       "Giải Mixed Doubles yêu cầu 1 nam + 1 nữ.
        Đội trưởng là Nam, cần Partner là Nữ."

5. Nút "Tham gia đội" → POST /tournaments/:id/join-team
   → Toast "Đã tham gia đội thành công!"
   → Redirect về trang chi tiết giải
```

### 2.3 Rút Lui (Withdraw)

**Thêm vào:** `app/(public)/tournaments/[id]/TournamentDetailClient.tsx` hoặc trang chi tiết giải

**UI:**
- Khi user đã đăng ký giải → Hiển thị trạng thái đăng ký ở header giải:
  - "Bạn đã đăng ký đội: Team ABC" + nút "Rút khỏi giải"
  - Nếu doubles + chưa đủ 2 người → Hiển thị "Đang chờ partner" + link mời
- Nút "Rút khỏi giải" → ConfirmDialog:
  - "Bạn có chắc muốn rút khỏi giải? Lệ phí sẽ được hoàn lại."
  - [Xác nhận rút] [Hủy]
- Gọi `POST /tournaments/:id/withdraw`
- Toast: "Đã rút khỏi giải. Lệ phí sẽ được hoàn trong 3-5 ngày."

---

## Nhóm 3: Tournament List Nâng Cấp

### 3.1 Tournament Card — Hiển thị đầy đủ thông tin

**File sửa/mới:** `components/tournaments/TournamentCard.tsx`

**Thông tin hiển thị trên mỗi card:**
```
┌──────────────────────────────────────┐
│ [Banner Image / Logo]                │
│                                      │
│  🏸 Giải Cầu Lông Mở Rộng 2026     │
│  📍 Quận 1, TP. Hồ Chí Minh        │
│  📅 15/07/2026 — 20/07/2026         │
│  🎾 Singles • Mixed Doubles          │
│                                      │
│  💰 100,000đ / đội    🏅 ELO: 1200+ │
│  👥 24/32 đội đã đăng ký            │
│                                      │
│  [ĐANG MỞ ĐĂNG KÝ]  ← Status badge │
│  [Xem chi tiết →]                    │
└──────────────────────────────────────┘
```

**Thông tin bắt buộc trên card:**
- Tên giải
- Môn thể thao (category name + icon)
- Địa chỉ / Khu vực (từ venue hoặc tournament location)
- Ngày thi đấu (format: dd/MM/yyyy)
- Loại giải: Singles / Doubles / Mixed
- Phí tham gia (hoặc "Miễn phí")
- Số lượng đã đăng ký / max
- Trạng thái (badge màu: Mở đăng ký, Đang thi đấu, Đã kết thúc...)
- Ràng buộc giới tính (nếu có)

### 3.2 Filter Bar Nâng Cấp

**File sửa:** `app/(public)/tournaments/page.tsx`

**Bộ lọc:**
- 🔍 Tìm kiếm theo tên (text input)
- 🏸 Môn thể thao (dropdown từ categories API)
- 📊 Trạng thái (REGISTRATION_OPEN, IN_PROGRESS, COMPLETED...)
- 🗺️ Khu vực (dropdown từ regions API)
- 💰 Phí (Tất cả, Miễn phí, Có phí)
- 🎾 Loại (Singles, Doubles, Mixed)
- Nút "Xóa bộ lọc" (reset tất cả)

**API call:** `GET /tournaments?search=xx&categoryId=xx&status=xx&region=xx&visibility=PUBLIC&tournamentType=PUBLIC&page=1&limit=12`

---

## Nhóm 4: Community Tournaments

### 4.1 Tab Giải Đấu trong Community Detail

**File sửa:** `app/(public)/communities/[id]/page.tsx` hoặc `CommunityDetailClient.tsx`

**Tab "Giải đấu" trong trang chi tiết CLB:**
```
┌──────────────────────────────────────┐
│  🏆 Giải Đấu Của CLB               │
│                                      │
│  [+ Tạo giải CLB] (nếu là admin CLB)│
│                                      │
│  ┌────────────────────────┐          │
│  │ Giải nội bộ tháng 7    │          │
│  │ 📅 15/07 • Miễn phí    │          │
│  │ 👥 16 đội • Doubles    │          │
│  │ [Đang mở đăng ký]      │          │
│  └────────────────────────┘          │
│                                      │
│  ┌────────────────────────┐          │
│  │ Giải ELO nội bộ Q2     │          │
│  │ 📅 01/06 • Miễn phí    │          │
│  │ 👥 8 đội • Singles     │          │
│  │ [Đã kết thúc]          │          │
│  └────────────────────────┘          │
└──────────────────────────────────────┘
```

**API call:** `GET /tournaments?communityId={id}&tournamentType=CLUB`

**Nút "Tạo giải CLB":**
- Chỉ hiện nếu user là owner/admin của CLB
- Redirect đến `/organizer/tournaments/create?communityId={id}`
- Trang tạo giải sẽ auto-fill communityId + lock tournamentType = 'CLUB'

### 4.2 Trang `/tournaments` — Chỉ hiện giải PUBLIC

**File sửa:** `app/(public)/tournaments/page.tsx`

**Logic:** Luôn gọi API với `tournamentType=PUBLIC`, không hiển thị giải CLUB.

---

## Nhóm 5: Bracket & Scoring UI

### 5.1 Setting Số Set Nâng Cao

**Thêm vào Manage Page — Tab tương ứng (Thể thức / Stage Setting):**

```
┌──────────────────────────────────────┐
│  ⚙️ Cấu Hình Set Theo Vòng         │
│                                      │
│  Vòng bảng:                          │
│    Best of: [BO3 ▼]                  │
│    Điểm mỗi set: [21]               │
│    Deuce: [✅ Bật]                   │
│                                      │
│  Bán kết:                            │
│    Best of: [BO5 ▼]                  │
│    Điểm mỗi set: [21]               │
│                                      │
│  Chung kết:                          │
│    Best of: [BO7 ▼]                  │
│    Điểm mỗi set: [21]               │
│                                      │
│  [Lưu cấu hình]                     │
└──────────────────────────────────────┘
```

**API call:** `PATCH /tournaments/:id/stages/:stageId` body: `{ roundConfig: {...} }`

---

## Nhóm 6: ELO & Leaderboard

### 6.1 Leaderboard Page Nâng Cấp

**File sửa:** `app/(public)/leaderboard/page.tsx`

```
┌──────────────────────────────────────┐
│  🏆 Bảng Xếp Hạng ELO              │
│                                      │
│  [Xếp hạng chung] [Xếp hạng CLB]   │
│                                      │
│  Môn: [Cầu lông ▼]  Khu vực: [TP.HCM ▼]
│                                      │
│  #  | Avatar | Tên        | ELO  | Hạng     | W/L    │
│  1  | 👤    | Nguyễn A   | 2150 | 👑Master | 45/12  │
│  2  | 👤    | Trần B     | 1890 | 💠Diamond| 38/15  │
│  3  | 👤    | Lê C       | 1720 | 💎Plat   | 32/18  │
│  ...                                │
│                                      │
│  [← Trang trước] [1] [2] [3] [→]   │
└──────────────────────────────────────┘
```

**Tabs:**
- "Xếp hạng chung": `GET /rankings?scope=PUBLIC&categoryId=xx`
- "Xếp hạng CLB": Chọn CLB → `GET /rankings?scope=COMMUNITY&communityId=xx&categoryId=xx`

### 6.2 EloTierBadge Component

**File mới:** `components/ui/EloTierBadge.tsx`

**Props:** `{ elo: number, size?: 'sm' | 'md' | 'lg' }`

**Logic:**
```typescript
function getTier(elo: number) {
  if (elo >= 2200) return { name: 'Grand Master', color: 'text-amber-400', icon: '🏆' };
  if (elo >= 2000) return { name: 'Master', color: 'text-purple-500', icon: '👑' };
  if (elo >= 1800) return { name: 'Diamond', color: 'text-cyan-400', icon: '💠' };
  if (elo >= 1600) return { name: 'Platinum', color: 'text-sky-300', icon: '💎' };
  if (elo >= 1400) return { name: 'Gold', color: 'text-yellow-500', icon: '🥇' };
  if (elo >= 1200) return { name: 'Silver', color: 'text-gray-400', icon: '⚪' };
  return { name: 'Bronze', color: 'text-orange-700', icon: '🥉' };
}
```

**Hiển thị:** `[Icon] TierName — 1890 ELO` (có badge màu tương ứng)

### 6.3 ELO trong Community Detail

**Tab "Bảng xếp hạng" trong trang CLB:**
- Hiển thị ELO riêng của CLB (từ bảng `community_rankings`)
- Layout tương tự leaderboard nhưng scope community
- API: `GET /rankings?scope=COMMUNITY&communityId={id}&categoryId=xx`

---

## Nhóm 7: Missing Pages (Gap Closure)

### 7.1 Profile Page

**File:** `app/(player)/profile/page.tsx`

**Components cần xây:**
- `ProfileHeader`: Avatar, tên, bio, nút "Chỉnh sửa"
- `EloSummary`: Hiển thị ELO Public của user theo các môn
- `EloChart`: Biểu đồ line chart biến động ELO theo thời gian (Recharts)
- `MatchHistory`: Danh sách các trận đã đấu (paginated)
- `EditProfileForm`: Form sửa thông tin cá nhân (tên, avatar, giới tính, ngày sinh, bio)

**API calls:**
- `GET /users/profile`
- `GET /rankings/user/:userId`
- `GET /rankings/user/:userId/history`
- `PATCH /users/profile`

**Đặc biệt quan trọng:** Profile cần có đầy đủ **giới tính** (gender) vì Module 3 (Doubles Registration) cần check giới tính khi đăng ký. Nếu user chưa điền giới tính → hiện cảnh báo "Vui lòng cập nhật giới tính để đăng ký giải đấu."

### 7.2 Dashboard

**File:** `app/(player)/dashboard/page.tsx`

**Components:**
- `WelcomeCard`: "Chào [tên]! ELO của bạn: [elo]"
- `UpcomingTournaments`: Danh sách giải sắp tới (max 5)
- `MyRegistrations`: Giải đấu user đã đăng ký + trạng thái
- `RecentMatches`: Kết quả trận đấu gần nhất
- `QuickActions`: Nút tắt (Tìm giải, Tạo giải, Xem ELO)

### 7.3 Live Score

**File:** `app/live/[matchId]/page.tsx`

**Components:**
- `LiveScoreBoard`: Tỷ số real-time (WebSocket)
- `SetScoreTable`: Bảng chi tiết từng set
- `MatchTimeline`: Timeline sự kiện
- `MatchComments`: Bình luận trận đấu

**WebSocket events:** `score:update`, `match:status`

---

## Design System Reminders (Từ skills.md)

> **KHÔNG viết CSS thuần.** Dùng TailwindCSS + cn() helper.
> **KHÔNG dùng `any`** — TypeScript strict mode.
> **Mobile-first** — Design từ màn hình nhỏ (`sm:`, `md:`, `lg:`).
> **Format ngày tháng:** dd/MM/yyyy (VD: 15/07/2026).
> **Lỗi:** Dùng `getErrorMessage()` + toast, KHÔNG dùng `alert()`.
> **DRY:** Check `src/utils/`, `src/hooks/`, `src/constants/` trước khi viết logic mới.

---

## Thứ Tự Triển Khai Frontend

```
1. Nhóm 3: Tournament Card + Filter nâng cấp (cần làm trước vì là trang chính)
2. Nhóm 1: Visibility setting + Register page + Auth redirect
3. Nhóm 2: Doubles flow (register team, join team, withdraw)
4. Nhóm 4: Community tournaments tab
5. Nhóm 6: ELO leaderboard + EloTierBadge
6. Nhóm 5: Bracket scoring UI
7. Nhóm 7: Profile, Dashboard, Live Score
```

> **Nguyên tắc:** Mỗi nhóm hoàn thành → chạy `pnpm build` kiểm tra TypeScript. Không để lỗi dồn.
