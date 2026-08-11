# Kế hoạch Chuẩn hóa Giao diện & Tính năng Câu lạc bộ (Web & Mobile App)

## 📌 Bối cảnh & Mục tiêu
Chuẩn hóa đồng bộ giao diện và luồng dữ liệu của trang **Chi tiết Câu lạc bộ** giữa cả **Web Frontend (React/Next.js)** và **Mobile App (Flutter)**.

Mục tiêu chính:
1. Đổi tên Tab **"Giới thiệu"** ➔ **"Tổng quan"** (Overview Dashboard).
2. Tận dụng tối đa dữ liệu thực tế sẵn có từ Backend (Giải đấu, Thành viên, Trận đấu ELO, Thách đấu giao hữu) để tạo một Hồ sơ Thể thao sống động.
3. Rà soát chính xác **Tính năng nào đã có sẵn (Đang chạy)** và **Tính năng nào cần bổ sung/nâng cấp**.
4. **Tuyệt đối KHÔNG làm tính năng Đăng bài / News feed / Chat giữa trang / Fake data**.

---

## 🔍 HIỆN TRẠNG TÍNH NĂNG (FEATURE STATUS MATRIX)

| STT | Tính năng / Thành phần UI | Backend DB & API | Web Frontend | Mobile App (Flutter) | Trạng thái & Kế hoạch |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | **Header Cover & Banner** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Slide ảnh bìa, Avatar logo, Tên CLB, Bộ môn, Khu vực. |
| **2** | **Nút Tham gia / Xin duyệt** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Logic JOINED, PENDING, APPROVAL mode hoạt động tốt. |
| **3** | **Chia sẻ CLB (Share Modal)** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Share Web (Zalo, FB, Messenger) & Share App Mobile Native. |
| **4** | **Tab 1: Tổng quan (Dashboard)** | 🟡 Cần tinh chỉnh | 🟡 Cần nâng cấp | 🟡 Cần nâng cấp | **Đang có**: Trang Giới thiệu cũ (Static description).<br>👉 **Kế hoạch**: Chuyển thành Dashboard Thành tích kết hợp Thông tin. |
| **5** | **Tab 2: Giải đấu CLB** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Lấy danh sách giải đấu nội bộ & mở rộng của CLB. |
| **6** | **Tab 3: Bảng xếp hạng ELO** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Bảng xếp hạng điểm ELO nội bộ CLB theo môn & thể thức. |
| **7** | **Tab 4: Thách đấu (Giao hữu)** | ✅ Có sẵn | 🟡 Có ở trang BQT | 🔴 Chưa có tab public | **Backend có 100%**: Tạo/nhận thách đấu, tự động tạo giải giao hữu.<br>👉 **Kế hoạch**: Thêm Tab "Thách đấu" ra giao diện Public cho cả Web & App. |
| **8** | **Tab 5: Thành viên** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Danh sách thành viên, phân quyền BQT, duyệt đơn xin vào. |
| **9** | **Tab 6: Bộ sưu tập ảnh** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | **Đã có**: Thư viện ảnh hoạt động & Lightbox xem ảnh. |

---

## 🏗️ CHI TIẾT KẾ HOẠCH NÂNG CẤP TAB 1: "TỔNG QUAN" (WEB & FLUTTER APP)

Tab **Tổng quan** mới sẽ kết hợp **30% Thông tin cố định (Cũ)** + **70% Chỉ số & Thành tích động (Mới)** theo bố cục chuẩn thể thao:

### 1. Thanh Chỉ số Nhanh (Quick Metric Bar - Trên cùng)
- 👥 **Thành viên** (`_count.members`)
- 🏆 **Giải đấu** (`_count.tournaments`)
- ⚔️ **Trận đấu đã diễn ra**

### 2. Cột chính / Khung chính (70% Dữ liệu thi đấu động)
- ⚔️ **Card Trận đấu gần đây**: Hiển thị 3-4 trận vừa diễn ra với Tỉ số & Badge kết quả (`[THẮNG]` / `[THUA]`).
- 🏆 **Card Giải đấu nổi bật**: Giải đấu mới nhất do CLB tổ chức kèm trạng thái (`Đang diễn ra`/`Mở đăng ký`).
- 👑 **Card VĐV Nổi bật (Hall of Fame)**: Top 3 VĐV có ELO cao nhất trong Bảng xếp hạng nội bộ CLB.

### 3. Cột phụ / Khung phụ (30% Thông tin & Thống kê)
- 📊 **Card Phong độ & Winrate**: Tỉ lệ thắng %, Chuỗi thắng liên tiếp (`🔥 2 trận thắng`).
- ℹ️ **Card Thông tin & Liên hệ (Thu gọn)**: Địa điểm sân tập, Bộ môn, Ngày lập, Chế độ gia nhập, SĐT/FB.
- 📜 **Card Mô tả & Quy định CLB**: Đoạn giới thiệu sinh hoạt CLB (Thu gọn có nút Xem thêm).

---

## 🔄 QUY TRÌNH CHUẨN HÓA ĐỒNG BỘ NỀN TẢNG (IMPLEMENTATION STEPS)

### Bước 1: Cập nhật Web Frontend (`frontend-web_qlgiaidau`)
1. Cập nhật `AboutTab.tsx` ➔ Đổi tên thành Dashboard Tổng quan kết hợp thông tin cũ & dữ liệu thi đấu.
2. Thêm Tab **"Thách đấu"** vào thanh tab chính của `/communities/[id]/page.tsx`.

### Bước 2: Cập nhật Mobile App (`app_quanly_giaidau`)
1. Cập nhật `_buildAboutTab` trong `club_detail_screen.dart` chuẩn hóa đúng bố cục Dashboard 2 cột / dạng danh sách vuốt dọc như Web.
2. Bổ sung Tab **"Thách đấu"** vào `TabBarView` của Flutter App.

---

## 🚫 CAM KẾT VÀ TÔN CHỈ (NON-GOALS)
- ❌ Không làm tính năng Đăng bài / News feed / Like / Comment.
- ❌ Không thêm chat ngầm giữa trang.
- ❌ Tuyệt đối không dùng dữ liệu giả (Mock data) — chỉ hiển thị khi API có dữ liệu thật.
