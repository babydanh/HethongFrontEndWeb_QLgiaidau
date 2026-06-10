# 🚀 MASTER PROMPT — Frontend Quản Lý Giải Đấu

> **DÀNH CHO AI AGENT:** Đây là file DUY NHẤT bạn cần đọc đầu tiên. File này chứa toàn bộ chỉ dẫn cần thiết để hiểu hệ thống và bắt tay vào code.

---

## 📖 HƯỚNG DẪN ĐỌC TÀI LIỆU (BẮT BUỘC)

Đọc THEO THỨ TỰ sau trước khi code:

| # | File | Nội dung | Bắt buộc |
|---|------|----------|----------|
| 1 | `docs/skills.md` | 9 kỹ năng cốt lõi, công nghệ cấm, quy tắc nghiêm ngặt | ⭐⭐⭐ |
| 2 | `docs/routes.md` | **Bản đồ tất cả routes** — URL, rendering, API mapping, data types | ⭐⭐⭐ |
| 3 | `docs/api-contract.md` | **Hợp đồng API** — mọi endpoint, request/response types, error codes | ⭐⭐⭐ |
| 4 | `docs/data-types.md` | **Toàn bộ TypeScript types** — mapping 1:1 với Backend DTOs | ⭐⭐⭐ |
| 5 | `docs/stitch-prompts.md` | **Prompt thiết kế UI** cho Stitch MCP — design system + từng trang | ⭐⭐ |
| 6 | `docs/architecture.md` | Kiến trúc thư mục, 3-layer, rendering strategies | ⭐⭐ |
| 7 | `docs/ui.md` | Chi tiết prompt UI từng trang (tham khảo thêm) | ⭐ |
| 8 | `graphify-out/` | Knowledge Graph codebase (nếu có) | ⭐ |

---

## ⚡ QUY TẮC VÀNG (GOLDEN RULES)

```
1. KHÔNG BAO GIỜ dùng `any` → Dùng `unknown`, `Record<string, unknown>`, hoặc Generic <T>
2. KHÔNG dùng CSS thuần / CSS Modules → CHỈ TailwindCSS + cn()
3. KHÔNG dùng npm/yarn → CHỈ pnpm
4. KHÔNG dùng Pages Router → CHỈ App Router (app/)
5. KHÔNG dùng Redux/MobX → CHỈ Zustand
6. KHÔNG dùng Fetch API thuần → CHỈ Axios (qua instance lib/axios.ts)
7. Mỗi thay đổi lớn → Cập nhật Graphify + Restart backend nếu sửa DB schema
8. Trước khi báo hoàn thành → Chạy `pnpm lint` và `pnpm build`
```

---

## 🎯 TRẠNG THÁI HIỆN TẠI (Current State)

### ✅ Đã hoàn thành:
- Design System cơ bản (Button, Input, Modal, Badge, Skeleton, Avatar, Toast)
- Layout: Header, Footer
- Auth: Login, Register pages + Zustand authStore + Axios interceptors
- Homepage (`/`) — có fetch tournaments + communities từ API
- Trang danh sách Tournaments, Communities, Leaderboard (basic)

### ❌ Chưa làm (theo plan.md):
- Middleware auth (redirect chưa login)
- Profile page (xem/sửa)
- Chi tiết Tournament (tabs, bracket, register)
- Live Score (WebSocket)
- Chat (WebSocket)
- Organizer dashboard (tạo giải, nhập score, rút tiền)
- Admin dashboard (duyệt community, quản lý users, payments)
- Notifications
- Payments

---

## 🏗️ TECH STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.x |
| UI Library | React | 19.x |
| Language | TypeScript (Strict) | 5.x |
| Styling | TailwindCSS | 4.x |
| State | Zustand + persist | Latest |
| HTTP | Axios + interceptors | Latest |
| Forms | React Hook Form + Zod | Latest |
| Realtime | Socket.io-client | Latest |
| Charts | Recharts | Latest |
| Icons | Lucide React | Latest |
| Package Manager | pnpm | Latest |

---

## 🔗 BACKEND INFO

- **Base URL:** `http://localhost:3000/api/v1`
- **WebSocket:** `ws://localhost:3000/live` (Live Score), `ws://localhost:3000/chat` (Chat)
- **Auth:** JWT (Cookie-based, `withCredentials: true`)
  - Access Token: 15 min
  - Refresh Token: 7 days
  - Auto-refresh via Axios response interceptor
- **Database:** PostgreSQL (Supabase) + PostGIS + Drizzle ORM
- **Response format:** `{ statusCode, message, data, meta? }`
