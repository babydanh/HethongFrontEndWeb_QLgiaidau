# Architect Skills

# 🛠️ 9 Kỹ Năng Cốt Lõi Frontend (Tech Skills Map)

> **🚨 LƯU Ý TỐI QUAN TRỌNG DÀNH CHO AI AGENT:** 
> **Thay vì tự mò mẫm tìm kiếm toàn bộ hệ thống file một cách mù quáng và tốn token, BẮT BUỘC phải tham chiếu thư mục `graphify-out/` (chạy skill `/graphify` hoặc đọc file JSON/Report) để nắm cấu trúc kiến trúc và luồng dữ liệu.**
> 
> Tài liệu này quy định **chính xác** 9 nhóm kỹ năng cần thiết để xây dựng phần Frontend (Web) cho dự án.
> Mỗi kỹ năng được **map trực tiếp** với các Backend DTOs/APIs và quy cách từ `spec.md`, `plan.md`.
> **AI Agent hoặc thành viên mới:** Hãy đọc file này TRƯỚC KHI viết bất kỳ dòng code Frontend nào.

---


## Skill 4: API & HTTP Client — Axios + Interceptors 🌐

> **Cầu nối giao tiếp.** Nơi Frontend lấy dữ liệu từ Backend REST APIs.

| Công nghệ | Phiên bản | Vai trò trong dự án |
|---|---|---|
| **Axios** | Latest | Gọi REST API |

### Phải biết gì?
- **Cấu hình Instance (`lib/axios.ts`)**: Cài đặt `baseURL` trỏ thẳng tới Backend (vd: `http://localhost:3000/api/v1`).
- **Request Interceptor**: Tự động lấy `accessToken` từ Zustand và gán vào header `Authorization: Bearer <token>`.
- **Response Interceptor (Cực kỳ quan trọng)**:
  - Nếu API Backend trả về `401 Unauthorized`: Tạm ngưng (pause) request, gọi API `/auth/refresh` kèm `refreshToken` để lấy token mới, sau đó gán lại vào request cũ và chạy tiếp (Silent Refresh).
  - Nếu API trả về `403`: Bắn Toast "Không có quyền".
- **Typing**: Khai báo Interface mapping CHÍNH XÁC với DTOs của Backend (`CreateTournamentDto`, `UserResponse`...).

### Dùng ở đâu trong dự án?
- Nằm trong các file thuộc thư mục `features/*/api/*.ts`.

---
