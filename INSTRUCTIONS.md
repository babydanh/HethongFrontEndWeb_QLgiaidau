# QUY TẮC BẮT BUỘC — Frontend Quản Lý Giải Đấu

> **ĐỌC FILE NÀY TRƯỚC KHI VIẾT CODE.**
> Tài liệu chi tiết nằm trong `docs/`.

## CÔNG NGHỆ

- Framework: **Next.js** (>= 15.x, App Router) + **React** (>= 19.x)
- Ngôn ngữ: **TypeScript** (>= 5.x, strict mode)
- Styling: **TailwindCSS** (>= 4.x)
- State: **Zustand**
- HTTP: **Axios** (qua `features/*/api/`, KHÔNG fetch trong components)
- Forms: **React Hook Form** + **Zod**
- Real-time: **Socket.io-client**
- Package manager: **pnpm**

## CẤM

- ❌ JavaScript (`.js`, `.jsx`) — Chỉ **TypeScript** (`.ts`, `.tsx`)
- ❌ Pages Router (`pages/`) — Chỉ **App Router** (`app/`)
- ❌ CSS Modules, styled-components — Chỉ **TailwindCSS**
- ❌ Redux, MobX — Chỉ **Zustand**
- ❌ Fetch API trực tiếp trong components — Dùng **features/*/api/** qua Axios
- ❌ Kiểu `any` — Type đầy đủ

## CẤU TRÚC THƯ MỤC

```
src/
├── app/              # Routes (App Router) — CHỈ page.tsx, layout.tsx, loading.tsx
├── components/       # UI components dùng chung (Button, Modal, DataTable)
├── features/         # Feature-Sliced: mỗi feature có api/, components/, hooks/
├── hooks/            # Hooks dùng chung (useDebounce, useMediaQuery)
├── lib/              # Config thư viện (axios.ts, socket.ts, zustand/)
├── services/         # Base API client
├── types/            # TypeScript types chung
└── utils/            # Helper functions (format, cn)
```

## CẤU TRÚC FEATURE

```
features/{name}/
├── api/              # Hàm gọi API (1 file = 1 endpoint)
├── components/       # UI riêng feature (PascalCase.tsx)
├── hooks/            # Custom hooks (useXxx.ts)
├── stores/           # Zustand store (nếu cần)
└── types/            # Types riêng (nếu cần)
```

## RENDERING

- **Server Component** (mặc định): Layout, page tĩnh, SEO
- **Client Component** (`'use client'`): Form, Filter, Chart, WebSocket, useState/useEffect
- **SSR** (`cache: 'no-store'`): Admin pages, data nhạy cảm
- **ISR** (`revalidate: 60`): Tournament list, Leaderboard

## NAMING

- Components: `PascalCase.tsx` — Hooks: `useXxx.ts` — API: `getXxx.ts`
- Folders: `kebab-case` — Types: `PascalCase` — Env: `NEXT_PUBLIC_UPPER_SNAKE`

## API

- Backend: `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1`
- Axios interceptor: attach JWT token, auto-refresh on 401
- Response format: `{ statusCode, message, data, meta }`

## TÀI LIỆU THAM KHẢO

- `docs/architecture.md` — Cấu trúc Feature-Sliced Design
- `docs/plan.md` — Kế hoạch phát triển theo Phase
- `docs/pages.md` — Chi tiết từng trang (URL, rendering, API)
- `docs/skills.md` — Công nghệ & kỹ năng
- `docs/spec.md` — Quy cách kỹ thuật
- `docs/rules.md` — Quy tắc code & git workflow
