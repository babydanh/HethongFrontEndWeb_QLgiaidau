# ⚖️ Quy Tắc Dự Án Frontend (Rules)

> Tất cả thành viên (người hoặc AI Agent) **BẮT BUỘC** tuân thủ.  
> Vi phạm sẽ bị reject PR.

---

## 1. Quy tắc cho AI Agent 🤖

> **ĐỌC CÁC FILE SAU TRƯỚC KHI VIẾT CODE:**

| File | Lý do |
|---|---|
| `docs/skills.md` | Công nghệ & phiên bản được phép |
| `docs/spec.md` | Quy cách kỹ thuật (API format, auth, styling) |
| `docs/architecture.md` | Cấu trúc thư mục, đặt file đúng chỗ |
| `docs/pages.md` | Chi tiết từng trang cần xây |
| `docs/rules.md` | File này — quy tắc viết code |

### Bắt buộc:
- ✅ Dùng **TypeScript** (`.ts`, `.tsx`). KHÔNG file `.js`, `.jsx`.
- ✅ Dùng **App Router** (`app/`). KHÔNG Pages Router (`pages/`).
- ✅ Dùng **TailwindCSS**. KHÔNG CSS Modules, styled-components.
- ✅ Dùng **Zustand** cho state. KHÔNG Redux.
- ✅ Dùng **Axios** qua `features/*/api/`. KHÔNG fetch trực tiếp trong components.
- ✅ Mọi form dùng **React Hook Form + Zod**.
- ✅ KHÔNG dùng `any`. Type đầy đủ.
- ✅ Mỗi component interactive phải có `'use client'` directive.
- ✅ Đặt file đúng Feature-Sliced: `features/{name}/api/`, `features/{name}/components/`.

---

## 2. Quy tắc Viết Code (Code Convention)

### Đặt tên (Naming)

| Loại | Quy tắc | Ví dụ |
|---|---|---|
| Components | `PascalCase.tsx` | `TournamentCard.tsx`, `LiveScoreBoard.tsx` |
| Hooks | `camelCase` bắt đầu `use` | `useTournaments.ts`, `useDebounce.ts` |
| API functions | `camelCase` bắt đầu verb | `getTournaments.ts`, `createMatch.ts` |
| Utils | `camelCase` | `formatCurrency.ts`, `cn.ts` |
| Stores | `camelCase` + `Store` | `authStore.ts`, `notificationStore.ts` |
| Types/Interfaces | `PascalCase` | `Tournament`, `CreateTournamentDto` |
| Folders | `kebab-case` hoặc `camelCase` | `live-score/`, `components/` |
| Env vars | `NEXT_PUBLIC_UPPER_SNAKE` | `NEXT_PUBLIC_API_URL` |

### Format & Linting
- **Prettier** + **ESLint** (Next.js config mặc định).
- Tab size: **2 spaces**.
- Dấu nháy đơn (`'`) cho string.
- Có dấu `;` cuối dòng.
- Max line length: 100 characters (khuyến nghị).

### Import Order
```typescript
// 1. React / Next.js
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// 2. Thư viện bên thứ 3
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// 3. Components dùng chung
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/data-display/DataTable';

// 4. Feature-specific imports
import { getTournaments } from '../api';
import { TournamentCard } from '../components/TournamentCard';

// 5. Types, utils, constants
import type { Tournament } from '@/types/tournament';
import { formatCurrency } from '@/utils/format';
```

---

## 3. Quy tắc Component

### Server Component (mặc định)
- KHÔNG thêm `'use client'` nếu không cần.
- Fetch data trực tiếp bằng `async/await` trong component.
- Dùng cho: Layout, Page hiển thị data tĩnh.

### Client Component
- PHẢI thêm `'use client'` ở dòng đầu tiên.
- Dùng cho: Form, Filter, Modal, Chart, WebSocket, bất cứ gì cần `useState`/`useEffect`/`onClick`.

### Props Convention
```tsx
// ✅ Đúng — destructure props, type rõ ràng
interface TournamentCardProps {
  tournament: Tournament;
  onSelect?: (id: string) => void;
  className?: string;          // Luôn cho phép override className
}

export function TournamentCard({ tournament, onSelect, className }: TournamentCardProps) {
  // ...
}

// ❌ Sai
export function TournamentCard(props: any) { ... }
```

---

## 4. Quy trình Git (Git Workflow)

### Branches
| Nhánh | Mục đích |
|---|---|
| `main` | Production — ổn định |
| `develop` | Staging — tích hợp features |
| `feature/*` | Tính năng mới |
| `bugfix/*` | Sửa lỗi |
| `hotfix/*` | Sửa khẩn cấp Production |

### Commit Message (Conventional Commits)
```
<type>(<scope>): <mô tả>

Ví dụ:
feat(tournaments): add bracket view component
fix(auth): resolve token refresh loop
style(ui): update button hover states
refactor(chat): extract socket connection to hook
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`.

### Pull Request
- 1 PR = 1 feature hoặc 1 bugfix.
- PHẢI pass ESLint + TypeScript build trước khi merge.
- Tiêu đề rõ ràng: `feat(elo): implement leaderboard with category filter`.

---

## 5. Quy tắc Performance

- Dùng `next/image` cho mọi hình ảnh (auto lazy load, responsive).
- Dùng `next/font` cho Google Fonts (auto optimization).
- Dùng `next/dynamic` (lazy load) cho components nặng: Charts, BracketView, Map.
- Mọi danh sách dài phải có **pagination** hoặc **infinite scroll**.
- KHÔNG import toàn bộ thư viện: `import { LineChart } from 'recharts'` thay vì `import * as Recharts`.

---

## 6. Quy tắc Accessibility (a11y)

- Mọi `<img>` phải có `alt` text.
- Mọi button phải có text hoặc `aria-label`.
- Mọi form input phải có `<label>` liên kết.
- Focus management: Modal trap focus, keyboard navigation.
- Color contrast: tối thiểu 4.5:1 ratio.
