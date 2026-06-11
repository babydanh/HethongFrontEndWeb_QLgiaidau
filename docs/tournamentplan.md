# 🏆 Kế hoạch Nghiên cứu & Thiết kế: Cấu trúc Giải đấu (Parent/Child), Cascade Soft Delete & Phân bộ lọc Phân hạng

Tài liệu này đặc tả nghiên cứu chi tiết và kế hoạch triển khai cải tổ cấu trúc giải đấu: phân tách rõ ràng vai trò của **Giải đấu Mẹ (Parent)** làm trang PR/Overview đa môn và các **Giải đấu Con/Phân hạng (Child Divisions)** làm nơi đăng ký thi đấu thực tế, hỗ trợ tính năng **Cascade Soft Delete** phục vụ testing, và đảm bảo hiển thị danh sách đội chuẩn hóa theo phân hạng.

---

## 1. Phân tích Hiện trạng & Nghiên cứu Bất cập (Inconsistencies)

### A. Ràng buộc quan hệ Parent - Child dưới Database
*   Bảng `parent_tournaments` đóng vai trò là "Trang PR chính". Nó lưu tên giải đấu mẹ, mô tả chung, banner, logo và danh sách các môn thi đấu (`sports` dưới dạng mảng JSON `string[]`).
*   Bảng `tournaments` chứa cột `parent_id` liên kết trực tiếp đến `parent_tournaments.id` với khóa ngoại `onDelete: 'cascade'`.
*   **Bất cập**: Cấu hình `onDelete: 'cascade'` của PostgreSQL chỉ hoạt động đối với câu lệnh **Hard Delete (`DELETE FROM`)**. Trong khi đó, cả hệ thống của chúng ta đều sử dụng **Soft Delete** bằng cách cập nhật cột `deletedAt`. Do đó, khi ta đánh dấu xóa giải đấu mẹ (`parent_tournaments.deletedAt = now()`), các giải đấu con (`tournaments` có `parentId` tương ứng) vẫn hoàn toàn hoạt động và hiển thị ở client vì `deletedAt` của chúng vẫn là `NULL`. Đây là lỗi sinh ra các bản ghi mồ côi (orphans).

### B. Môn thi đấu vs Hình thức/Phân hạng thi đấu
*   **Giải đấu mẹ (Parent)**: Có thể tích hợp nhiều bộ môn khác nhau (ví dụ: Pickleball, Tennis, Cầu lông...).
*   **Giải đấu con (Child / Division)**: Chỉ thuộc **1 bộ môn duy nhất** (`categoryId` trỏ tới bảng `categories`). Tuy nhiên, mỗi giải con này quy định cụ thể một **Hình thức thi đấu** (như Đơn/Đôi qua cột `matchType`) và phân hạng trình độ (ví dụ: hạng 5.5, hạng 4.8).
*   **Bất cập trên Giao diện (Frontend)**:
    1.  Tab **Đội tham gia (TeamsTab)**, **Bảng đấu (BracketTab)**, và **Lịch thi đấu (MatchesTab)** chưa nhận diện đồng nhất sự thay đổi của phân hạng được chọn. Khi người dùng thay đổi phân hạng ở Dropdown, dữ liệu hiển thị cần load đúng theo ID của giải đấu con được chọn (`selectedDivision.id`), chứ không được dùng ID của giải đấu mẹ.
    2.  File [TeamsTab.tsx](file:///d:/Duancanhan/Project_QuanLyGiaiDau/frontend-web_qlgiaidau/src/app/%28public%29/tournaments/%5Bid%5D/components/TeamsTab.tsx) đang bị lỗi đặt import sai chuẩn (`import React from 'react';` nằm ở tận cuối file thay vì ở đầu file).

### C. Ràng buộc xóa giải đấu phục vụ Testing
*   **Bất cập**: Phía backend chặn không cho xóa giải đấu khi trạng thái không phải là `DRAFT`:
    ```typescript
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ cho phép xóa giải đấu ở trạng thái nháp (DRAFT).');
    }
    ```
    Để hỗ trợ quá trình phát triển và kiểm thử dễ dàng hơn (như yêu cầu của user: *"cho xoá giải trước để có gì hiện tại tôi test được mốt thêm ràng buộc không cho xoá sau"*), chúng ta cần tạm thời bỏ qua ràng buộc này cho cả giải đấu mẹ và giải đấu con.

---

## 2. Kế hoạch Giải pháp Kỹ thuật & Luồng Dữ liệu (Proposed Implementation)

### 2.1 Backend (Dịch vụ Giải đấu - NestJS)

#### Bước 1: Bổ sung API Xóa Giải đấu Mẹ (Cascade Soft Delete)
1.  **Repository (`tournaments.repository.ts`)**:
    *   Thêm phương thức `softDeleteParent(id: string, userId: string)`:
        *   Mở một database transaction.
        *   Cập nhật `deletedAt = new Date()` cho bản ghi trong `parent_tournaments` có `id = id`.
        *   Cập nhật `deletedAt = new Date()` cho tất cả các bản ghi trong `tournaments` có `parentId = id` để cascade soft delete toàn bộ giải đấu con.
        *   Ghi log Audit cho hành động xóa giải đấu mẹ.
2.  **Service (`tournaments.service.ts`)**:
    *   Tạm thời comment out/loại bỏ check `existing.status !== 'DRAFT'` trong phương thức `remove` đối với giải đấu con để hỗ trợ xóa giải tự do phục vụ test.
    *   Thêm phương thức `removeParent(id: string, userId: string, systemRoles: string[])`:
        *   Tìm kiếm thông tin giải đấu mẹ.
        *   Kiểm tra quyền sở hữu (Creator hoặc Admin).
        *   Gọi phương thức `softDeleteParent` từ repository.
3.  **Controller (`tournaments.controller.ts`)**:
    *   Thêm route `@Delete('parent/:id')` để đón nhận request xóa giải đấu mẹ từ client.

---

### 2.2 Frontend (Trang chi tiết giải đấu công khai - Next.js)

#### Bước 1: Chuẩn hóa hiển thị và xử lý Dropdown Chọn Phân hạng
*   Ở component [TournamentDetailClient.tsx](file:///d:/Duancanhan/Project_QuanLyGiaiDau/frontend-web_qlgiaidau/src/app/%28public%29/tournaments/%5Bid%5D/TournamentDetailClient.tsx):
    *   Khi người dùng click vào trang giải đấu mẹ, trang sẽ hiển thị giao diện PR tổng quan (lấy banner, logo, mô tả từ giải đấu mẹ).
    *   Hiển thị dropdown liệt kê tất cả các giải đấu con (Divisions / Hình thức thi đấu) thuộc giải đấu mẹ này.
    *   Khi chọn một phân hạng khác, cập nhật `selectedDivisionId` và tự động fetch chi tiết giải đấu con đó làm `selectedDivision`.

#### Bước 2: Truyền đúng ID phân hạng vào các Tab dữ liệu
*   Cần đảm bảo truyền chính xác đối tượng `selectedDivision` (chứ không phải giải đấu mẹ) vào các tab:
    ```tsx
    {activeTab === 'teams' && <TeamsTab tournament={selectedDivision} />}
    {activeTab === 'bracket' && <BracketTab tournament={selectedDivision} />}
    {activeTab === 'matches' && <MatchesTab tournament={selectedDivision} />}
    ```
*   **Tại [TeamsTab.tsx](file:///d:/Duancanhan/Project_QuanLyGiaiDau/frontend-web_qlgiaidau/src/app/%28public%29/tournaments/%5Bid%5D/components/TeamsTab.tsx)**:
    *   Chuyển `import React from 'react';` lên đầu file để tuân thủ ESLint.
    *   Trong `useEffect` lắng nghe sự thay đổi của `tournament.id`, khi ID phân hạng thay đổi, gọi API `getTournamentParticipants(tournament.id)` để lấy danh sách đội đã đăng ký riêng cho phân hạng đó.

---

## 3. Kịch bản Kiểm thử & Xác minh (Verification Plan)

### A. Kiểm thử Cascade Soft Delete
1.  **Chuẩn bị**: Tạo 1 giải đấu mẹ `Parent Test` và 2 phân hạng con là `Đôi Pickleball 4.5` và `Đôi Pickleball 5.0`.
2.  **Thực hiện**: Gọi API `DELETE /tournaments/parent/[parentId]` của giải đấu mẹ.
3.  **Xác minh**:
    *   Truy vấn trực tiếp database: Đảm bảo bản ghi trong `parent_tournaments` đã có `deletedAt` là timestamp hiện tại.
    *   Đảm bảo cả 2 bản ghi con trong `tournaments` cũng đã được cập nhật `deletedAt` tương ứng.
    *   Truy cập danh sách giải đấu công khai: Xác nhận không còn thấy giải đấu mẹ và các giải đấu con xuất hiện.

### B. Kiểm thử Dynamic Tab Filtering
1.  **Chuẩn bị**: Đăng ký 2 đội thi đấu vào phân hạng `Đôi Pickleball 4.5` và 1 đội vào `Đôi Pickleball 5.0`.
2.  **Thực hiện**: Trên trang chi tiết công khai của giải đấu mẹ, chuyển đổi dropdown giữa 2 phân hạng và click vào tab **"Đội tham gia"**.
3.  **Xác minh**:
    *   Khi chọn `Đôi Pickleball 4.5`, danh sách hiển thị chính xác 2 đội.
    *   Khi chuyển sang `Đôi Pickleball 5.0`, danh sách lập tức cập nhật lại và hiển thị đúng 1 đội đã đăng ký.
    *   Tab "Bảng đấu" và "Lịch thi đấu" hiển thị sơ đồ và lịch riêng biệt tương ứng.
