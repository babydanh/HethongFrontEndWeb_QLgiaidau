# 🏟️ Tổng Quan Dự Án Frontend (Project Overview)

> **Tên dự án:** Quản Lý Giải Đấu — Frontend Web  
> **Backend API:** `../backend-api_qlgiaidau/` (NestJS + PostgreSQL)  
> **Tham khảo:** [Baseline.vn](https://baseline.vn/)  
> **Trạng thái:** 🟡 Đang phát triển

---

## 1. Tầm nhìn (Vision)

Xây dựng giao diện web **responsive, real-time** cho nền tảng quản lý giải đấu thể thao:
- **Player** duyệt giải, đăng ký, xem live score, theo dõi ELO cá nhân.
- **Organizer** tạo giải, nhập tỷ số, quản lý đội, yêu cầu rút tiền.
- **Admin** duyệt community, quản lý thanh toán, xử lý khiếu nại.
- **Fan/Viewer** xem live score real-time, bình luận, react trận đấu.

---

## 2. Đối tượng & Giao diện tương ứng

| Vai trò | Giao diện | Chức năng chính |
|---|---|---|
| 🏃 **Player** | `/(player)/*` | Dashboard, duyệt giải, đăng ký, xem ELO, chat, kết bạn |
| 🏢 **Organizer** | `/organizer/*` | Tạo giải, nhập score, quản lý đội, rút tiền |
| 👀 **Viewer** | `/(public)/*`, `/live/*` | Landing, leaderboard, xem live score, bình luận |
| ⚙️ **Admin** | `/admin/*` | Duyệt community, quản lý payments, disputes, users |

---

## 3. Tính năng theo nhóm

### 🟢 Nhóm 1 — Authentication & Profile
- Đăng ký / Đăng nhập (JWT — Access Token + Refresh Token).
- Hồ sơ cá nhân: avatar, bio, số điện thoại, ngày sinh.
- Đổi mật khẩu. Upload avatar lên Cloudinary.

### 🟡 Nhóm 2 — Giải đấu & Trận đấu
- Duyệt giải đấu: filter theo category, status, search.
- Chi tiết giải: thông tin, bracket nhánh đấu, bảng xếp hạng vòng bảng, danh sách đội.
- Đăng ký tham gia giải + thanh toán phí.
- **Live Score**: Xem tỷ số trực tiếp real-time qua WebSocket.
- Bình luận trận đấu (nested comments), React (Like, High Five).

### 🔴 Nhóm 3 — ELO & Xếp hạng
- Leaderboard: bảng xếp hạng theo category (Pickleball, Tennis, Cầu lông).
- Biểu đồ biến động ELO cá nhân (line chart theo thời gian).
- Badge hiển thị tier: Low D → High D → C → B → Low A → High A.

### 🟣 Nhóm 4 — Cộng đồng
- Danh sách cộng đồng, tham gia, tìm gần tôi (bản đồ GIS).
- Chi tiết community: members, tournaments, hoạt động.

### 💰 Nhóm 5 — Thanh toán
- Checkout: redirect sang VNPay/MoMo.
- Callback page: hiển thị kết quả thanh toán.
- Lịch sử thanh toán cá nhân.

### 💬 Nhóm 6 — Social
- Chat 1-1 (Direct Message) và Chat nhóm — real-time WebSocket.
- Kết bạn: gửi lời mời, chấp nhận/từ chối.
- Thông báo: dropdown + trang danh sách, đánh dấu đã đọc.

### 🛡️ Nhóm 7 — Quản trị (Admin + Organizer)
- **Organizer**: Tạo giải (wizard multi-step), nhập tỷ số set-by-set, quản lý đội, rút tiền.
- **Admin**: Dashboard thống kê, duyệt community, quản lý payments/payouts, xử lý disputes.

---

## 4. Kiến trúc tổng thể

```
┌────────────────────┐
│  Frontend Web      │        REST API          ┌──────────────────┐
│  (Next.js)         │ ──────────────────────▶  │  Backend API     │
│                    │                          │  (NestJS)        │
│  - App Router      │        WebSocket         │                  │
│  - TailwindCSS     │ ◀═══════════════════▶   │  - PostgreSQL    │
│  - Zustand         │   (Live Score, Chat)     │  - Redis         │
│  - Socket.io       │                          │  - Drizzle ORM   │
└────────────────────┘                          └──────────────────┘
```

---

## 5. Tài liệu liên quan

| File | Mục đích |
|---|---|
| [architecture.md](./architecture.md) | Cấu trúc thư mục Feature-Sliced Design |
| [plan.md](./plan.md) | Kế hoạch phát triển theo Phase |
| [pages.md](./pages.md) | Chi tiết từng trang (data, rendering, components) |
| [skills.md](./skills.md) | Công nghệ & kỹ năng Frontend |
| [spec.md](./spec.md) | Quy cách kỹ thuật (API format, auth flow, env) |
| [rules.md](./rules.md) | Quy tắc viết code & git workflow |
