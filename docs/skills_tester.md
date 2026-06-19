# Tester Skills

# 🛠️ 9 Kỹ Năng Cốt Lõi Frontend (Tech Skills Map)

> **🚨 LƯU Ý TỐI QUAN TRỌNG DÀNH CHO AI AGENT:** 
> **Thay vì tự mò mẫm tìm kiếm toàn bộ hệ thống file một cách mù quáng và tốn token, BẮT BUỘC phải tham chiếu thư mục `graphify-out/` (chạy skill `/graphify` hoặc đọc file JSON/Report) để nắm cấu trúc kiến trúc và luồng dữ liệu.**
> 
> Tài liệu này quy định **chính xác** 9 nhóm kỹ năng cần thiết để xây dựng phần Frontend (Web) cho dự án.
> Mỗi kỹ năng được **map trực tiếp** với các Backend DTOs/APIs và quy cách từ `spec.md`, `plan.md`.
> **AI Agent hoặc thành viên mới:** Hãy đọc file này TRƯỚC KHI viết bất kỳ dòng code Frontend nào.

---


## Skill 8: DevOps & Tooling — pnpm + ESLint 🛠️

> **Chuẩn mực code.** Giữ dự án sạch sẽ và đồng bộ.

| Công nghệ | Vai trò trong dự án |
|---|---|
| **pnpm** | Package manager bắt buộc (nhanh, đồng bộ workspace với Backend) |
| **ESLint** + **Prettier** | Linting & Format (sửa hết warning trước khi push code) |
| **TypeScript (tsc)** | Chạy type-check kỹ càng |

### Phải biết gì?
- Không dùng `npm` hay `yarn` để tránh xung đột file lock.
- Trước khi báo cáo hoàn thành phase, phải chạy `pnpm lint` và `pnpm build` thành công.

---
