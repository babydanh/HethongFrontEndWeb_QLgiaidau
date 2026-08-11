# Kế hoạch Chi tiết Nâng cấp Giao diện & Tính năng Câu lạc bộ (Web & Mobile App)

## 📌 Bối cảnh & Mục tiêu
Chuẩn hóa đồng bộ giao diện và luồng dữ liệu của trang **Chi tiết Câu lạc bộ** giữa **Web Frontend (React/Next.js)** và **Mobile App (Flutter)**.

Mục tiêu chính:
1. Đổi tên Tab **"Giới thiệu"** ➔ **"Tổng quan"** (Overview Dashboard) với dữ liệu thi đấu thực tế, sinh động.
2. Thiết kế tính năng **Gán Tag Tùy Chỉnh / Danh Hiệu Hài Hước cho Thành Viên** (Streak Thắng/Thua, Biệt danh CLB...).
3. Thiết kế **Pop-up Hồ Sơ Thành Viên Nội Bộ CLB** (Club Member Profile Modal) chứa toàn bộ thống kê đóng góp trong CLB + Nút chuyển sang Profile chính toàn hệ thống.
4. Xây dựng **Kênh Chat Chung Nội Bộ CLB** (Chat Room) có hiển thị Tag & Badge bên cạnh tên người gửi.
5. **Tuyệt đối KHÔNG sử dụng tin giả (Mockup) hay dữ liệu 0% làm nghèo UI**.

---

## 🎭 1. KẾ HOẠCH TÍNH NĂNG: GÁN TAG TÙY CHỈNH & DANH HIỆU (FUNNY & STREAK TAGS)

### A. Loại Tag Hài Hước & Hệ Thống Chuỗi (Streak Tags):
Hệ thống chia làm 2 loại Tag hiển thị ở Badge bên cạnh tên thành viên:

1. **Tag Chuỗi Phong Độ (Hệ thống tự động gán dựa trên dữ liệu thật)**:
   - 🔥 `🔥 Win Streak x3` / `🔥 Đang Độc Cô Cầu Bại (Win 5+)` (Dành cho VĐV đang có chuỗi thắng).
   - ❄️ `🧊 Freeze Streak` / `🛑 Đang Tìm Trận Thắng` (Dành cho VĐV đang có chuỗi thua).
   - 📈 `🚀 Thăng Hạng ELO` (VĐV tăng ELO nhiều nhất tuần).

2. **Tag Biệt Danh Hài Hước / Danh Hiệu CLB (Do Ban Quản Trị CLB gán thủ công)**:
   - 🤡 `[Thánh Gánh Đội]` / `[Thánh Bóp Team]`
   - 💸 `[Thủ Quỹ Quyền Lực]` / `[Thánh Nợ Quỹ]`
   - 🏸 `[Chỉ Thích Đánh Đôi]` / `[Thánh Đập Cầu]` / `[Vua Giao Hữu]`
   - 🍺 `[Thánh Nhậu Sau Trận]` / `[Chuyên Gia Dự Bị]`

### B. Luồng Quản Lý & Gán Tag (Cách BQT Gán):
- **Trong Tab Thành viên (`MembersTab`)**: BQT (`OWNER`/`MODERATOR`) bấm vào 3 chấm ở thẻ thành viên ➔ Chọn **"Gán Tag / Danh hiệu"**.
- Opens **Modal Chọn & Tạo Tag**:
  - Cho phép chọn từ danh sách Preset Tag gợi ý có sẵn (icon + chữ + màu sắc).
  - Cho phép tự gõ Tag mới dài tối đa 20 ký tự + chọn màu Badge (Xanh, Đỏ, Vàng, Tím, Cam...).
- **API Backend**: `PATCH /communities/:id/members/:memberId/tags` lưu mảng `tags: [{ name: string, color: string, icon: string }]`.

---

## 🎴 2. POP-UP HỒ SƠ THÀNH VIÊN TRONG CLB (CLUB MEMBER PROFILE MODAL)

Khi người dùng bấm vào Avatar hoặc Tên của một thành viên trong **Tab Thành viên**, **Bảng Xếp Hạng**, hoặc trong **Kênh Chat**, một Pop-up đặc thù của CLB sẽ xuất hiện gồm 3 phần:

### A. Top Banner - Thông Tin & Tag CLB:
- **Avatar + Tên hiển thị + Username**.
- **Chức vụ trong CLB**: `👑 Chủ sở hữu` / `🛡️ Quản trị viên` / `👤 Thành viên`.
- **Danh hiệu & Tag CLB**: `[🔥 Win Streak x3]` `[Thánh Gánh Đội]` `[Thủ Quỹ]`.
- **Thâm niên**: *Đã gia nhập 1 năm 2 tháng (15/05/2025)*.

### B. Thống Kê Thi Đấu Trực Tiếp Liên Quan Đến CLB Này:
- 🏅 **Thứ hạng & Điểm ELO CLB**: `1,580 ELO` (Xếp hạng **#3** toàn CLB).
- ⚔️ **Thành tích thi đấu trong CLB**: `42 Trận` · `68% Thắng` (28 Thắng / 14 Thua).
- 🏆 **Thành tích Giải đấu CLB**: *Vô địch Giải Cầu lông Mùa Hè 2026*, *Á quân Giải Pickleball Đôi Nam*.
- 🤝 **Cặp đôi ăn ý nhất CLB**: Hay đánh đôi hợp rơ nhất với **Nguyễn Văn B** (Winrate 80%).

### C. Nút Chức Năng BQT & Nút Chuyển Profile Chính:
- ⚙️ **Công cụ BQT (Nếu bạn là Owner/Mod)**: Nút **[🏷️ Chỉnh sửa Tag]** và Nút **[👑 Phân quyền / 🚫 Cấm]**.
- 🚀 **Nút [👉 Xem Trang Cá Nhân Chính (Full Profile)]**:
  - Chuyển hướng người dùng sang trang **Profile Toàn Hệ Thống** (`/players/[id]` hoặc `/profile`), nơi hiển thị toàn bộ lịch sử đấu giải bên ngoài, ELO tổng và tất cả CLB khác mà VĐV đó tham gia.

---

## 💬 3. KẾ HOẠCH TÍNH NĂNG: KÊNH CHAT CHUNG NỘI BỘ CLB (COMMUNITY CHAT)

### A. Vị Trí Đặt Kênh Chat:
- **Trên Web**: 
  - Thêm 1 **Tab "Kênh Chat" 💬** trên thanh Tab chính của CLB.
  - Đồng thời bổ sung 1 **Cửa sổ Chat Nhanh Floating Widget ở góc dưới bên phải màn hình** (Thu gọn / Mở rộng giống Messenger Facebook) để khi duyệt Tab khác vẫn chat được!
- **Trên App Mobile (Flutter)**:
  - Thêm Tab **"Kênh Chat" 💬** trên thanh TabBar chính.
  - Bổ sung nút Chat nhanh dạng **Floating Action Button (FAB)** ở góc dưới.

### B. Giao Diện & Nội Dung Trong Kênh Chat:
Khung Chat gồm 2 Sub-tab chính:
1. **📢 Kênh Thông Báo (Announcements)**: Chỉ BQT được nhắn. Thành viên chỉ thả tim/xem tin tức quan trọng (Lịch giao lưu, thông báo giải).
2. **💬 Kênh Trò Chuyện Chung (General Chat)**: Mọi thành viên `JOINED` đều được nhắn tin.

**Trong mỗi dòng tin nhắn hiển thị**:
```text
[Avatar]  Nguyễn Văn A 👑 [Chủ CLB] [🔥 Win x5] [Thánh Gánh Đội]
          Tối nay 19h sân số 3 giao lưu nhé anh em!
          --------------------------------------------------
[Avatar]  Trần Văn B 👤 [🧊 Freeze Streak] [Thánh Bóp Team]
          Cho em 1 suất dự bị với anh ơi! 😅
```

---

## 📊 4. CHI TIẾT GIAO DIỆN TAB 1: "TỔNG QUAN" (DYNAMIC OVERVIEW DASHBOARD)

Tab **Tổng quan** sẽ kết hợp 70% dữ liệu trận đấu thật gần đây + 30% thông tin liên hệ:

### A. Bar Chỉ Số Nhanh (Top Metric Bar):
- 👥 **Thành viên**: `328 Thành viên`
- 🏆 **Giải đấu**: `24 Giải đấu`
- ⚔️ **Trận đấu đã diễn ra**: `186 Trận`

### B. Khung Cột Chính (Cột Trái 8/12 - Dữ Liệu Thi Đấu Thực Tế):
1. **⚔️ AI MỚI ĐÁNH VỚI AI (Trận Đấu & Thách Đấu Gần Đây)**:
   - Dữ liệu: Lấy 3-4 trận đấu ELO hoặc trận thách đấu giữa 2 VĐV / 2 CLB mới hoàn thành gần nhất.
   - Layout dòng:
     - `Nguyễn Văn A & Trần Văn B` **3 - 1** `Lê Văn C & Phạm Văn D`
     - Badge: `[🟢 THẮNG (+14 ELO)]` · *15 phút trước*
2. **🏆 GIẢI ĐẤU NỔI BẬT GẦN ĐÂY**:
   - Thẻ hiển thị giải đấu gần nhất do CLB tổ chức.
   - Thể hiện: Banner giải, Trạng thái (`🟢 Đang diễn ra` / `🔵 Mở đăng ký`), Tên VĐV / Đôi Vô Địch (nếu giải đã xong).
3. **👑 THÀNH VIÊN XUẤT SẮC (Hall of Fame)**:
   - Top 3 VĐV có ELO cao nhất nội bộ CLB.
   - Có Avatar + Hạng **🥇 #1**, **🥈 #2**, **🥉 #3** + Tag phong độ (`🔥 Win Streak x4`).

### C. Khung Cột Phụ (Cột Phải 4/12 - Thông Tin & Thống Kê):
1. **📊 PHONG ĐỘ CLB**:
   - Tỉ lệ thắng (Win rate %), Tổng trận Thắng / Thua.
   - Chuỗi thắng hiện tại của CLB (`🔥 3 trận thắng liên tiếp`).
2. **ℹ️ THÔNG TIN VÀ LIÊN HỆ (Thu gọn từ Card cũ)**:
   - 📍 Địa điểm sân tập.
   - ⚽ Bộ môn thi đấu (Cầu lông, Pickleball...).
   - 📅 Ngày thành lập & Chế độ gia nhập (`Công khai` / `Xin duyệt`).
   - 📞 SĐT liên hệ & Link Zalo/Facebook.
3. **📜 QUY ĐỊNH & MÔ TẢ CLB**:
   - Đoạn văn giới thiệu nội quy sinh hoạt (có nút Xem thêm).

---

## 🔍 HIỆN TRẠNG & KẾ HOẠCH BẢNG MA TRẬN (FEATURE MATRIX)

| STT | Component / Feature | Backend API | Web Frontend | Mobile App (Flutter) | Kế hoạch triển khai |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | **Tab 1: Tổng quan Dashboard** | 🟡 Tinh chỉnh | 🟡 Cần nâng cấp | 🟡 Cần nâng cấp | Chuyển trang Giới thiệu cũ thành Dashboard Thành tích kết hợp Thông tin. |
| **2** | **Tag Thành Viên & Biệt Danh** | 🟡 Thêm DB `tags` | 🟡 UI gán & hiển thị | 🟡 UI gán & hiển thị | BQT gán Tag hài hước + Hệ thống tự tính Streak Tag. |
| **3** | **Pop-up Hồ Sơ Thành Viên CLB** | ✅ APIs có sẵn | 🟡 Modal Chi tiết | 🟡 Modal Chi tiết | Hiện thông tin đóng góp CLB + Nút chuyển sang Profile chính. |
| **4** | **Kênh Chat Chung Nội Bộ** | 🟡 Bổ sung Chat API | 🟡 Tab Chat + Widget Chat | 🟡 Tab Chat + FAB Chat | Kênh chat riêng có hiển thị Member Tags cạnh tên. |
| **5** | **Tab Thách Đấu (Giao hữu)** | ✅ Backend 100% | 🟡 Thêm Tab Public | 🔴 Thêm Tab Public | Đưa danh sách thách đấu & nút thách đấu ra giao diện ngoài. |
| **6** | **Tab Giải đấu, BXH, Ảnh** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | Giữ nguyên và tối ưu giao diện. |

---

## 🔄 QUY TRÌNH THỰC HIỆN TỔNG THỂ

### Bước 1: Backend Database & REST/Realtime APIs
1. Migration DB: Thêm `tags` vào `community_members`.
2. Viết API gán Tag (`PATCH /communities/:id/members/:memberId/tags`).
3. Viết API Lấy & Gửi tin nhắn Kênh Chat CLB (`/communities/:id/chat/messages`).

### Bước 2: Web Frontend (`frontend-web_qlgiaidau`)
1. Cập nhật `AboutTab.tsx` ➔ Biến thành Dashboard **Tổng quan** (Ai mới đánh với ai, Giải đấu gần đây, Top ELO, Thông tin thu gọn).
2. Tạo **Pop-up Hồ sơ Thành viên Nội bộ CLB** + Modal gán Tag.
3. Tạo Tab **Kênh Chat** + Khung Chat Floating Widget góc dưới.
4. Thêm Tab **Thách đấu**.

### Bước 3: Mobile App (`app_quanly_giaidau`)
1. Cập nhật `_buildAboutTab` trong `club_detail_screen.dart` thành Dashboard Tổng quan chuẩn 1:1 với Web.
2. Tạo Pop-up Hồ sơ Thành viên Nội bộ trên Flutter App + Modal gán Tag cho BQT.
3. Thêm Tab **Kênh Chat** nội bộ trên Flutter App.
