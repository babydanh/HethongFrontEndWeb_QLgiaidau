# Danh Sách Các Trang Còn Thiếu (Missing Pages)

Dựa trên tài liệu `docs/pages.md` và quá trình dựng giao diện hiện tại, dưới đây là danh sách các trang còn thiếu trong hệ thống (chưa được triển khai Frontend):

## 1. Player Pages (Cần đăng nhập)
- **Dashboard:** `/dashboard` - Trang tổng quan của user (Welcome, Giải đấu sắp tới, Lịch sử trận, Biến động ELO nhanh).
- **Chat:** `/chat` và `/chat/[roomId]` - Giao diện nhắn tin real-time.
- **Chi tiết Cộng đồng:** `/communities/[id]` - Trang xem thông tin chi tiết một cộng đồng cụ thể, bản đồ sân, danh sách thành viên.

## 2. Organizer Pages (Dành cho Ban tổ chức)
- **Quản lý giải của mình:** `/organizer/tournaments`
- **Tạo giải mới (Wizard 4 bước):** `/organizer/tournaments/create`
- **Nhập tỷ số trận đấu:** `/organizer/scores`
- **Rút tiền giải đấu:** `/organizer/payouts`

## 3. Admin Pages (Dành cho Quản trị viên)
- **Admin Dashboard:** `/admin`
- **Duyệt Cộng đồng:** `/admin/communities`
- **Quản lý Thanh toán:** `/admin/payments`
- **Quản lý Users:** `/admin/users`
- **Xử lý Khiếu nại (Disputes):** `/admin/disputes`
- **Duyệt Lệnh Rút tiền (Payouts):** `/admin/payouts`

*Lưu ý: Các trang Đăng nhập, Đăng ký, Trang chủ, Danh sách giải đấu đã được xác nhận là hoàn thành hoặc bỏ qua theo yêu cầu trước đó.*
