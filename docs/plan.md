# 📋 Kế Hoạch Phát Triển Frontend (Development Plan)

> Kế hoạch xây dựng giao diện cho nền tảng Quản Lý Giải Đấu.  
> Mỗi Phase map với Phase tương ứng của Backend.  
> **Nguyên tắc:** Phase N frontend chỉ bắt đầu khi API Backend Phase N đã sẵn sàng.

---

## Phase 0: Thiết lập Dự án & Tài liệu ✅

- [x] Khởi tạo Next.js project (App Router, TypeScript, TailwindCSS, pnpm).
- [x] Viết tài liệu: `architecture.md`, `plan.md`, `pages.md`, `rules.md`.

---

## Phase 1: Foundation & Design System 🎨
**Mục tiêu:** Có design system, layout chung, Auth flow hoàn chỉnh.  
**Phụ thuộc Backend:** Phase 1 (Auth API, Users API, Swagger)

### 1.1 Design System & Components
- [x] Cấu hình TailwindCSS: custom colors, fonts (Inter/Outfit), spacing, breakpoints.
- [x] Tạo `utils/cn.ts` (clsx + tailwind-merge).
- [x] Xây dựng UI primitives trong `components/ui/`:
  - [x] Button (variants: primary, secondary, ghost, danger + sizes: sm, md, lg).
  - [x] Input, Select, Textarea (với error state + label).
  - [x] Modal, ConfirmDialog.
  - [x] Badge (cho status: UPCOMING, IN_PROGRESS, COMPLETED...).
  - [x] Skeleton, LoadingSpinner, EmptyState.
  - [x] Avatar (fallback initials).
  - [x] Toast notifications.

### 1.2 Layout Components
- [x] `components/layout/Header.tsx` — Logo, Navigation, User menu, Notifications bell.
- [ ] `components/layout/Sidebar.tsx` — Admin/Organizer sidebar navigation.
- [x] `components/layout/Footer.tsx`.
- [ ] `components/layout/MobileNav.tsx` — Bottom tab bar cho mobile.
- [ ] `components/data-display/DataTable.tsx` — Bảng dữ liệu có sort, pagination.
- [ ] `components/data-display/Pagination.tsx`.

### 1.3 Auth Feature (`features/auth/`)
- [x] Cấu hình Axios instance (`lib/axios.ts`):
  - [x] `baseURL` trỏ về Backend `/api/v1`.
  - [x] Request interceptor: attach JWT access token.
  - [x] Response interceptor: auto-refresh token khi 401.
- [x] Zustand auth store (`lib/zustand/authStore.ts`): user, tokens, login, logout.
- [x] `features/auth/api/` — login, register, refresh, logout.
- [x] `features/auth/components/` — LoginForm, RegisterForm.
- [x] Trang `app/(public)/login/page.tsx`.
- [x] Trang `app/(public)/register/page.tsx`.
- [ ] Middleware `middleware.ts` — redirect chưa login, check role cho admin/organizer routes.

### 1.4 Profile Feature (`features/auth/` mở rộng)
- [ ] Trang `app/(player)/profile/page.tsx` — Xem & sửa hồ sơ.
- [ ] Upload avatar (Cloudinary integration).
- [ ] Đổi mật khẩu.

---

## Phase 2: Core Features — Giải đấu & Live Score ⭐
**Mục tiêu:** Player có thể duyệt giải, xem bracket, xem live score, check ELO.  
**Phụ thuộc Backend:** Phase 2 (Tournaments, Matches, ELO APIs)

### 2.1 Tournaments Feature (`features/tournaments/`)
- [ ] `api/` — getTournaments, getTournamentById, getStages, getGroups.
- [ ] `components/TournamentCard.tsx` — Card hiển thị giải (tên, category, status, ngày, phí).
- [ ] `components/TournamentList.tsx` — Grid/List + Filter bar (category, status, search).
- [ ] `components/TournamentDetail.tsx` — Tabs: Thông tin | Nhánh đấu | Đội | Kết quả.
- [ ] `components/BracketView.tsx` — Hiển thị bracket Single/Double Elimination (SVG/Canvas).
- [ ] `components/GroupStandings.tsx` — Bảng xếp hạng Round Robin.
- [ ] `components/RegisterForm.tsx` — Đăng ký tham gia giải (chọn thành viên đội).
- [ ] Trang `app/(player)/tournaments/page.tsx` — Danh sách giải (ISR).
- [ ] Trang `app/(player)/tournaments/[id]/page.tsx` — Chi tiết giải.

### 2.2 Matches & Live Score Feature (`features/matches/`)
- [ ] Cấu hình Socket.io client (`lib/socket.ts`):
  - [ ] Connect với JWT auth.
  - [ ] Join room `match:{matchId}`.
  - [ ] Listen events: `score:update`, `match:status`.
- [ ] `components/MatchCard.tsx` — Card 1 trận (đội A vs đội B, tỷ số, status).
- [ ] `components/LiveScoreBoard.tsx` — Real-time score update (CSR + WebSocket).
- [ ] `components/MatchTimeline.tsx` — Timeline diễn biến set/game.
- [ ] `components/MatchComments.tsx` — Bình luận trận đấu (nested).
- [ ] `components/MatchReactions.tsx` — React (Like, High Five).
- [ ] Trang `app/live/[matchId]/page.tsx` — Live Score page (CSR).

### 2.3 ELO & Leaderboard Feature (`features/elo/`)
- [ ] `components/LeaderboardTable.tsx` — Bảng xếp hạng ELO (filter theo category).
- [ ] `components/EloChart.tsx` — Biểu đồ biến động ELO cá nhân (line chart).
- [ ] `components/EloTierBadge.tsx` — Badge hiển thị tier (Low D → High A) có màu/icon.
- [ ] Trang `app/(public)/leaderboard/page.tsx` — Leaderboard (ISR).
- [ ] Tích hợp ELO vào Profile page.

### 2.4 Communities Feature (`features/communities/`)
- [ ] `components/CommunityCard.tsx` — Card cộng đồng (logo, thành viên, môn thể thao).
- [ ] `components/CommunityDetail.tsx` — Info, Members, Tournaments.
- [ ] `components/NearbyMap.tsx` — Bản đồ tìm community gần tôi (PostGIS + Map).
- [ ] Trang `app/(player)/communities/page.tsx`.
- [ ] Trang `app/(player)/communities/[id]/page.tsx`.

---

## Phase 3: Payments & Organizer Dashboard 💰
**Mục tiêu:** Thanh toán giải, Organizer quản lý giải và rút tiền.  
**Phụ thuộc Backend:** Phase 3 (Payments, Payouts APIs)

### 3.1 Payments Feature (`features/payments/`)
- [ ] `components/PaymentCheckout.tsx` — Redirect sang VNPay/MoMo.
- [ ] `components/PaymentResult.tsx` — Trang callback sau thanh toán (success/fail).
- [ ] `components/PaymentHistory.tsx` — Lịch sử thanh toán cá nhân.
- [ ] Trang `app/(player)/payments/page.tsx`.

### 3.2 Organizer Feature (`features/organizer/`)
- [ ] `components/CreateTournamentForm.tsx` — Form tạo giải (multi-step wizard):
  - [ ] Step 1: Thông tin cơ bản (tên, mô tả, category, ngày).
  - [ ] Step 2: Thể thức (Round Robin, Elimination, config JSONB).
  - [ ] Step 3: Phí & cài đặt (entry fee, platform fee).
  - [ ] Step 4: Review & Submit.
- [ ] `components/ScoreInput.tsx` — Nhập tỷ số trận đấu (set by set).
- [ ] `components/TeamManagement.tsx` — Duyệt đội đăng ký, confirm thanh toán.
- [ ] `components/PayoutRequest.tsx` — Form yêu cầu rút tiền (nhập bank info).
- [ ] Trang `app/organizer/tournaments/page.tsx` — Danh sách giải của mình.
- [ ] Trang `app/organizer/tournaments/[id]/page.tsx` — Quản lý 1 giải.
- [ ] Trang `app/organizer/scores/page.tsx`.
- [ ] Trang `app/organizer/payouts/page.tsx`.

---

## Phase 4: Social & Notifications 💬
**Mục tiêu:** Chat, kết bạn, thông báo — tăng tương tác.  
**Phụ thuộc Backend:** Phase 4 (Social, Chat, Notifications APIs)

### 4.1 Chat Feature (`features/chat/`)
- [ ] Socket.io events: `chat:message`, `chat:typing`, `chat:read`.
- [ ] `components/ChatSidebar.tsx` — Danh sách phòng chat.
- [ ] `components/ChatBox.tsx` — Gửi/nhận tin nhắn real-time.
- [ ] `components/ChatBubble.tsx` — Tin nhắn đơn lẻ (sent/received style).
- [ ] Trang `app/(player)/chat/page.tsx`.
- [ ] Trang `app/(player)/chat/[roomId]/page.tsx`.

### 4.2 Social Feature (`features/social/`)
- [ ] `components/FriendsList.tsx` — Danh sách bạn bè + gửi lời mời.
- [ ] `components/NotificationDropdown.tsx` — Dropdown thông báo trên Header.
- [ ] `components/NotificationList.tsx` — Trang danh sách thông báo đầy đủ.
- [ ] Zustand notification store — count unread, mark as read.

---

## Phase 5: Nâng Cấp Toàn Diện — Registration, ELO, Filter 🚀
**Mục tiêu:** Tournament visibility UI, đăng ký doubles, ELO leaderboard, region filter.
**Chi tiết đầy đủ:** Xem file `docs/phase5-plan.md`

### 5.1 Tournament List Nâng Cấp
- [ ] `TournamentCard.tsx` — Hiển thị đầy đủ: địa chỉ, phí, số đội, giới tính, trạng thái.
- [ ] FilterBar nâng cấp: Môn, Trạng thái, Khu vực, Phí, Loại (Singles/Doubles).
- [ ] Chỉ hiện giải `visibility=PUBLIC` + `tournamentType=PUBLIC`.

### 5.2 Tournament Visibility & Registration
- [ ] Setting visibility (PUBLIC/PRIVATE) trong manage page.
- [ ] Invite link copy + QR Code cho giải PRIVATE.
- [ ] Trang `/tournaments/[id]/register` — Đăng ký qua invite link.
- [ ] Auth redirect flow (login → quay lại trang đăng ký).

### 5.3 Doubles Registration Flow
- [ ] `DoublesRegistrationFlow` component — Multi-step: Đăng ký → Mời partner → Chờ → Thanh toán.
- [ ] Trang `/tournaments/[id]/join-team` — Partner join team.
- [ ] Hiển thị trạng thái đăng ký trên trang chi tiết giải.
- [ ] Nút "Rút khỏi giải" + ConfirmDialog.

### 5.4 Community Tournaments
- [ ] Tab "Giải đấu" trong trang CLB (`/communities/[id]`).
- [ ] Nút "Tạo giải CLB" (chỉ admin CLB).
- [ ] Trang `/tournaments` chỉ hiện giải PUBLIC (không hiện CLUB).

### 5.5 Bracket & Scoring UI
- [ ] Setting số set nâng cao cho mỗi vòng (BO1/BO3/BO5/BO7).
- [ ] Lưu `roundConfig` vào tournament_stages.

### 5.6 ELO & Leaderboard
- [ ] `EloTierBadge.tsx` — Badge hiển thị hạng (Bronze → Grand Master).
- [ ] Leaderboard page nâng cấp: Tab "Xếp hạng chung" + "Xếp hạng CLB".
- [ ] ELO Chart (biểu đồ biến động ELO theo thời gian).
- [ ] Bảng xếp hạng CLB riêng trong trang community.

### 5.7 Region Filtering
- [ ] Dropdown "Khu vực" trong FilterBar (tournaments + communities).
- [ ] Gọi `GET /regions` populate danh sách.

### 5.8 Missing Pages (Gap Closure)
- [ ] Profile page (avatar, ELO, match history, edit form).
- [ ] Dashboard (upcoming tournaments, recent matches, quick actions).
- [ ] Live Score page (WebSocket real-time).

---

## Phase 6: Admin Panel & Polish 🛡️
**Mục tiêu:** Admin quản trị toàn hệ thống. Tối ưu UX.
**Phụ thuộc Backend:** Tất cả API đã sẵn sàng.

### 6.1 Admin Feature (`features/admin/`)
- [ ] `components/AdminDashboard.tsx` — Thống kê: users, tournaments, revenue (charts).
- [ ] `components/CommunityApproval.tsx` — Duyệt community.
- [ ] `components/PaymentManagement.tsx` — Quản lý payments.
- [ ] `components/PayoutApproval.tsx` — Duyệt rút tiền.
- [ ] `components/UserManagement.tsx` — CRUD users + assign roles.
- [ ] `components/DisputeReview.tsx` — Xem khiếu nại.

### 6.2 Landing Page & SEO
- [ ] Hero section + Features showcase.
- [ ] SEO: Meta tags, Open Graph.

### 6.3 Polish & Optimization
- [ ] Dark mode toggle.
- [ ] Responsive hoàn chỉnh.
- [ ] Skeleton loading + Error boundaries.
- [ ] Performance: next/image, code splitting, lazy load.

---

> **Nguyên tắc:** Frontend Phase N chỉ bắt đầu khi Backend Phase N đã có API + Swagger.
> Trong lúc chờ API, có thể mock data bằng MSW hoặc JSON files.
