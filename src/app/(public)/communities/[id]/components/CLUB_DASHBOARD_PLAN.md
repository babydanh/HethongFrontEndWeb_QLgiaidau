# Kế hoạch Thiết kế & Nâng cấp Tab Giới thiệu Câu lạc bộ (Club Dashboard View)

## 📌 Bối cảnh & Mục tiêu
Trang chi tiết Câu lạc bộ (`/communities/[id]`) hiện tại có phần **Tab Giới thiệu (AboutTab.tsx)** hiển thị khá trống và thụ động, chỉ gồm văn bản giới thiệu lớn và khung ảnh trống (`ẢNH (0)`).

Mục tiêu là biến **Tab Giới thiệu** thành một **Hồ sơ Dashboard Thành tích năng động (Club Profile & Stats Dashboard)** bằng cách khai thác tối đa dữ liệu thực tế đang có trong hệ thống (Giải đấu, Thành viên, Trận đấu ELO, Thách đấu liên CLB), **tuyệt đối KHÔNG sử dụng tin giả/mockup và KHÔNG làm tính năng Đăng bài/Newsfeed**.

---

## 🏗️ Cấu trúc Giao diện Đề xuất (Proposed Layout & Components)

Giao diện sẽ được chia làm 2 Cột chính (Layout 8/12 - 4/12 trên Desktop):

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ ℹ️ TỔNG QUAN CLB (Quick Overview Metric Bar)                                            │
│ [ 👥 328 Thành viên ]      [ 🏆 24 Giải đấu ]      [ ⚔️ 186 Trận đấu ]                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│ ⚔️ TRẬN ĐẤU GẦN ĐÂY                           │ │ 📊 THỐNG KÊ & PHONG ĐỘ                │
│ (Lấy 3-4 trận đấu ELO / Thách đấu gần nhất)  │ │ (Winrate %, Chuỗi thắng, Thách đấu)  │
│                                               │ │                                       │
│ ABC  3 - 1  XYZ     [🟢 THẮNG]                │ │  186         72%         +128         │
│ ABC  2 - 0  DEF     [🟢 THẮNG]                │ │  Trận       Thắng        ELO*         │
│ ABC  1 - 2  KLM     [🔴 THUA]                 │ │                                       │
│                                               │ │  Chuỗi hiện tại: 🔥 2 trận thắng      │
│ [ Xem tất cả trận đấu → ]                     │ └───────────────────────────────────────┘
└───────────────────────────────────────────────┘
                                                  ┌───────────────────────────────────────┐
┌───────────────────────────────────────────────┐ │ ℹ️ THÔNG TIN VÀ LIÊN HỆ               │
│ 🏆 GIẢI ĐẤU CLB MỚI NHẤT                      │ │ (Thu gọn từ Card lớn cũ)              │
│ (Lấy 1-2 giải đấu do CLB tổ chức gần nhất)    │ │ 📍 Địa điểm: Trần Đề, Sóc Trăng       │
│                                               │ │ ⚽ Bộ môn: Cầu lông, Pickleball       │
│ Summer Cup 2026                               │ │ 📅 Thành lập: 11/08/2026             │
│ 🥇 Vô địch: Nguyễn Văn A                      │ │                                       │
│ [ 🟢 Đang diễn ra / Đã kết thúc ]             │ │ [ Xem chi tiết quy định → ]           │
└───────────────────────────────────────────────┘ └───────────────────────────────────────┘

┌───────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│ 👑 THÀNH VIÊN NỔI BẬT                         │ │ ⚔️ ĐỐI ĐẦU CLB GẦN ĐÂY                │
│ (Top 3 ELO thành viên cao nhất trong CLB)    │ │ (Lịch sử Thách đấu với CLB khác)      │
│ 🥇 #1  Nguyễn Văn A    1682 ELO               │ │ CLB A   3 - 1   CLB B    [🟢 THẮNG]   │
│ 🥈 #2  Trần Văn B      1542 ELO               │ │ CLB A   1 - 2   CLB C    [🔴 THUA]    │
│ [ Xem Bảng xếp hạng CLB → ]                   │ │ [ Xem lịch sử giao hữu → ]            │
└───────────────────────────────────────────────┘ └───────────────────────────────────────┘
```

---

## 🛠️ Chi tiết các Thành phần Changes

### 1. **Thanh Metric Tổng quan (Quick Overview Bar)**
- **Vị trí**: Nằm ngang trên cùng của Tab.
- **Chỉ số**: Thành viên (`_count.members`), Giải đấu (`_count.tournaments`), Tổng số trận đấu đã diễn ra.

### 2. **Card Trận đấu gần đây (Recent Matches Card)**
- **Dữ liệu**: Lấy danh sách 3-4 trận đấu ELO hoặc trận đấu trong giải CLB gần đây.
- **Hiển thị**: Tên 2 bên, tỉ số, badge trạng thái `THẮNG (Xanh)` / `THUA (Đỏ)` / `HÒA (Vàng)`.

### 3. **Card Phong độ & Thống kê (Form & Stats Sidebar Card)**
- **Dữ liệu**: Tỷ lệ thắng (Win rate %), Tổng số trận thắng/thua, Chuỗi thắng hiện tại (Streak 🔥).
- **Quy tắc**: Nếu CLB mới chưa có trận đấu nào, ẩn các chỉ số 0% để tránh nghèo giao diện, chỉ hiển thị "Chưa có dữ liệu thi đấu".

### 4. **Card Giải đấu CLB nổi bật (Featured Club Tournament Card)**
- **Dữ liệu**: Lấy giải đấu mới nhất do CLB đứng ra tổ chức.
- **Hiển thị**: Banner/Tên giải, Trạng thái (Đang diễn ra/Mở đăng ký), Đội/VĐV vô địch (nếu giải đã COMPLETED).

### 5. **Card Thành viên nổi bật (Top Club Members Card)**
- **Dữ liệu**: Lấy Top 3 VĐV có điểm ELO cao nhất trong Bảng xếp hạng nội bộ CLB (`communityRankings`).
- **Hiển thị**: Rank #1 #2 #3, Avatar, Tên VĐV, Điểm ELO. Nút chuyển nhanh sang Tab *Bảng xếp hạng*.

### 6. **Card Thu gọn Thông tin CLB (Compact Info Sidebar Card)**
- **Vị trí**: Đưa xuống cột bên phải thành 1 Card nhỏ gọn.
- **Hiển thị**: Địa điểm, Chế độ tham gia, Bộ môn thể thao, Ngày thành lập.

### 7. **Card Đối đầu giao hữu CLB (Inter-Club Challenges Card)**
- **Dữ liệu**: Lấy thông tin từ bảng `communityChallenges` (Lịch sử giao hữu với CLB khác).
- **Hiển thị**: Tên 2 CLB đối đầu, kết quả tỉ số trận giao hữu.

---

## 🚫 Những gì TUYỆT ĐỐI KHÔNG LÀM (Non-Goals)
- ❌ Không thêm News Feed / Đăng bài / Bình luận / Lượt thích.
- ❌ Không thêm tính năng Chat trực tiếp giữa trang.
- ❌ Không tạo tin giả (mock data), chỉ dùng dữ liệu thực từ Backend API.
