# Tích hợp API Backend (API Endpoints Mapped)

Tài liệu này dùng để mapping các API Backend đã hoàn thành cho team Frontend sử dụng.
**Base URL:** `http://localhost:3000/api/v1`

---

## 1. Auth & Users (Phase 1)
- `POST /auth/register` — Đăng ký tài khoản mới.
- `POST /auth/login` — Đăng nhập (trả về access_token, refresh_token).
- `POST /auth/refresh` — Làm mới access token.
- `POST /auth/logout` — Đăng xuất (thu hồi session).
- `GET /auth/google` — Đăng nhập bằng Google.
- `GET /users/me` — Lấy thông tin user hiện tại (Profile).
- `PATCH /users/me` — Cập nhật thông tin cá nhân.
- `POST /users/change-password` — Đổi mật khẩu.

## 2. Giải đấu & Trận đấu (Phase 2)
### Categories & Communities
- `GET /categories` — Lấy danh sách các môn thể thao.
- `POST /communities` — Tạo cộng đồng mới.
- `GET /communities` — Danh sách cộng đồng (có filter location).

### Tournaments & Brackets
- `POST /tournaments` — Tạo giải đấu.
- `POST /tournaments/:id/generate-bracket` — Tự động xếp lịch / chia nhánh đấu (Single/Double Elimination, Round Robin).
- `GET /tournaments` — Lấy danh sách giải đấu.

### Matches & Live Score
- `PATCH /matches/:id/score` — Cập nhật tỉ số trận đấu.
- `WS ws://localhost:3000/live` — Socket Gateway phát Live Score (Event: `score:update`, Room: `match:{id}`).

### Rankings (ELO)
- `GET /rankings/leaderboard` — Lấy bảng xếp hạng điểm ELO.

## 3. Thanh toán (Phase 3)
- `POST /payments/create-link` — Tạo URL thanh toán VNPay/MoMo để đóng phí tham gia giải (`entry_fee`).
- `POST /payments/webhook` — Nhận callback báo thành công từ Cổng thanh toán (Frontend không gọi trực tiếp cái này).
- `POST /payments/payout` — Ban tổ chức (Organizer) làm lệnh rút tiền giải đấu về ngân hàng.

## 4. Tương tác cộng đồng (Phase 4)
### Friendships
- `POST /social/friend-requests` — Gửi lời mời kết bạn.
- `PATCH /social/friend-requests/:id` — Chấp nhận / Từ chối lời mời.
- `GET /social/friends` — Lấy danh sách bạn bè của user.

### Chat
- `POST /chat/rooms` — Tạo phòng chat mới (Direct 1-1 hoặc Group).
- `POST /chat/messages` — Gửi tin nhắn.
- `GET /chat/rooms/:id/messages` — Lấy lịch sử chat.
- `WS ws://localhost:3000/chat` — Socket Gateway nhận tin nhắn Real-time (Event: `chat:message`, Room: `chat:{roomId}`).

### Notifications
- `GET /notifications` — Lấy danh sách thông báo.
- `PATCH /notifications/:id/read` — Đánh dấu đã đọc.
- `WS ws://localhost:3000/notifications` — Socket Gateway nhận Push Notification (Event: `notification:new`, Room: `user:{userId}`).
