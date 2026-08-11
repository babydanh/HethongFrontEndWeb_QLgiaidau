# Kế hoạch Chuẩn hóa Giao diện & Tính năng Câu lạc bộ (Web & Mobile App)

## 📌 Bối cảnh & Mục tiêu
Chuẩn hóa đồng bộ giao diện và luồng dữ liệu của trang **Chi tiết Câu lạc bộ** giữa cả **Web Frontend (React/Next.js)** và **Mobile App (Flutter)**.

Mục tiêu chính:
1. Đổi tên Tab **"Giới thiệu"** ➔ **"Tổng quan"** (Overview Dashboard).
2. Tận dụng tối đa dữ liệu thực tế sẵn có từ Backend (Giải đấu, Thành viên, Trận đấu ELO, Thách đấu giao hữu) để tạo một Hồ sơ Thể thao sống động.
3. **MỚI**: Thiết kế tính năng **Gán Tag tùy chỉnh cho Thành viên** và **Khu vực Kênh Chat Nội bộ CLB** (hiển thị Badge Tag cạnh tên thành viên khi chat và trong Tab Thành viên).
4. Rà soát chính xác **Tính năng nào đã có sẵn (Đang chạy)** và **Tính năng nào cần bổ sung/nâng cấp**.

---

## 🔍 HIỆN TRẠNG TÍNH NĂNG (FEATURE STATUS MATRIX)

| STT | Tính năng / Thành phần UI | Backend DB & API | Web Frontend | Mobile App (Flutter) | Trạng thái & Kế hoạch |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | **Header Cover & Banner** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Slide ảnh bìa, Avatar logo, Tên CLB, Bộ môn, Khu vực. |
| **2** | **Nút Tham gia / Xin duyệt** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Logic JOINED, PENDING, APPROVAL mode hoạt động tốt. |
| **3** | **Chia sẻ CLB (Share Modal)** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Share Web (Zalo, FB, Messenger) & Share App Mobile Native. |
| **4** | **Tab 1: Tổng quan (Dashboard)** | 🟡 Cần tinh chỉnh | 🟡 Cần nâng cấp | 🟡 Cần nâng cấp | **Đang có**: Trang Giới thiệu cũ (Static description).<br>👉 **Kế hoạch**: Chuyển thành Dashboard Thành tích kết hợp Thông tin. |
| **5** | **Tab 2: Giải đấu CLB** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Lấy danh sách giải đấu nội bộ & mở rộng của CLB. |
| **6** | **Tab 3: Bảng xếp hạng ELO** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Bảng xếp hạng điểm ELO nội bộ CLB theo môn & thể thức. |
| **7** | **Tab 4: Thách đấu (Giao hữu)** | ✅ Có sẵn | 🟡 Có ở trang BQT | 🔴 Chưa có tab public | **Backend có 100%**: Tạo/nhận thách đấu, tự động tạo giải giao hữu.<br>👉 **Kế hoạch**: Thêm Tab "Thách đấu" ra giao diện Public cho cả Web & App. |
| **8** | **Tab 5: Thành viên & Member Tags** | 🟡 Thêm cột `tags` | 🟡 Thêm hiển thị Tag | 🟡 Thêm hiển thị Tag | **Cần nâng cấp**: Cho BQT gán Custom Tag (vd: `[Đội tuyển A]`, `[Trưởng ban tài chính]`, `[Tân binh]`). |
| **9** | **Tab 6: Bộ sưu tập ảnh** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Thư viện ảnh hoạt động & Lightbox xem ảnh. |
| **10**| **Kênh Chat Nội bộ CLB** | 🟡 Bổ sung Realtime | 🟡 Giao diện Chat | 🟡 Giao diện Chat | **Kế hoạch Mới**: Khung chat nội bộ dành cho thành viên CLB. Hiển thị Badge Tag bên cạnh tên người gửi. |

---

## 🏷️ KẾ HOẠCH TÍNH NĂNG: MEMBER TAGS (GÁN TAG THÀNH VIÊN)

### 1. Backend (Database & API)
- **Cơ sở dữ liệu**: Bổ sung cột `tags` (dạng `jsonb` hoặc `varchar[]`) vào bảng `community_members`.
  - Ví dụ: `tags = ["Đội tuyển A", "Ban HLV", "Tài năng trẻ"]`.
- **API Endpoints**:
  - `PATCH /communities/:id/members/:memberId/tags`: Cho phép Chủ sở hữu (Owner) hoặc Ban quản trị (Moderator) gán / gỡ Tag của thành viên.

### 2. Hiển thị Tag trong Tab Thành viên (`MembersTab`)
- Bên cạnh Chức vụ (`OWNER`, `MODERATOR`, `MEMBER`), mỗi card/dòng thành viên sẽ hiển thị thêm các **Pill Badges màu sắc** thể hiện danh hiệu/tag của họ:
  - 👑 `Chủ sở hữu` `[Ban huấn luyện]` `[Tay vợt số 1]`

---

## 💬 KẾ HOẠCH TÍNH NĂNG: KÊNH CHAT NỘI BỘ CLB (COMMUNITY CHAT ROOM)

### 1. Phạm vi & Truy cập
- Chỉ dành riêng cho các thành viên có trạng thái `status = 'JOINED'` trong CLB.
- Nằm ở một vị trí chuyên biệt (Tab Chat riêng hoặc Khung Chat rút gọn ở góc dưới).

### 2. Giao diện & Hiển thị Member Tags trong Chat
- Mỗi tin nhắn gửi đi trong Kênh Chat sẽ hiển thị:
  - Avatar + Tên người gửi.
  - **Badge Chức vụ & Member Tags** nằm ngay bên cạnh tên người gửi.
  - *Ví dụ*: **Nguyễn Văn A** `[Chủ CLB]` `[Đội tuyển A]`: *Tối nay 19h sân số 3 giao hữu nhé anh em!*

---

## 🏗️ CHI TIẾT KẾ HOẠCH TAB 1: "TỔNG QUAN" (DASHBOARD)

Tab **Tổng quan** mới sẽ kết hợp **30% Thông tin cố định (Cũ)** + **70% Chỉ số & Thành tích động (Mới)**:

### 1. Thanh Chỉ số Nhanh (Quick Metric Bar)
- 👥 **Thành viên** (`_count.members`) | 🏆 **Giải đấu** (`_count.tournaments`) | ⚔️ **Trận đấu đã diễn ra**

### 2. Cột chính (Dữ liệu thi đấu động)
- ⚔️ **Card Trận đấu gần đây**: Danh sách 3-4 trận vừa diễn ra với Tỉ số & Badge kết quả (`[THẮNG]` / `[THUA]`).
- 🏆 **Card Giải đấu nổi bật**: Giải đấu mới nhất do CLB tổ chức.
- 👑 **Card VĐV Nổi bật (Hall of Fame)**: Top 3 VĐV có ELO cao nhất nội bộ CLB.

### 3. Cột phụ (Thông tin & Thống kê)
- 📊 **Card Phong độ & Winrate**: Tỉ lệ thắng %, Chuỗi thắng liên tiếp (`🔥 2 trận thắng`).
- ℹ️ **Card Thông tin & Liên hệ (Thu gọn)**: Địa điểm sân tập, Bộ môn, Ngày lập, Chế độ gia nhập, SĐT/FB.
- 📜 **Card Mô tả & Quy định CLB**: Đoạn giới thiệu sinh hoạt CLB.

---

## 🔄 QUY TRÌNH THỰC HIỆN TỔNG THỂ

### Bước 1: Backend Database & APIs
1. Migration thêm `tags` vào `community_members`.
2. Tạo API cập nhật Tag thành viên (`PATCH /communities/:id/members/:memberId/tags`).
3. Chuẩn bị Kênh Chat Realtime cho CLB.

### Bước 2: Web Frontend (`frontend-web_qlgiaidau`)
1. Cập nhật `AboutTab.tsx` ➔ Chuyển thành Dashboard **Tổng quan**.
2. Thêm UI Quản lý Tag thành viên & hiển thị Badge Tag trong `MembersTab.tsx`.
3. Thêm Tab **Thách đấu** & **Kênh Chat nội bộ**.

### Bước 3: Mobile App (`app_quanly_giaidau`)
1. Cập nhật `_buildAboutTab` thành Dashboard Tổng quan chuẩn hóa 1:1 với Web.
2. Thêm hiển thị Tag thành viên & Kênh Chat nội bộ trên Flutter App.
