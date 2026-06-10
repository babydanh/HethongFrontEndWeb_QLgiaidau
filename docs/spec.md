# 📐 Quy Cách Kỹ Thuật Frontend (Technical Specification)

> Quy định chi tiết kỹ thuật mà code frontend phải tuân theo.  
> AI Agent và Developer: Đọc file này khi cần biết cách triển khai cụ thể.

---

## 1. API Communication

### Base URL
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### Response Format (từ Backend)
```typescript
// Success
interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error
interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: { field: string; message: string }[];
  timestamp: string;
  path: string;
}
```

### Pagination Query
Mọi API GET danh sách đều hỗ trợ:
```
?page=1&limit=10&search=keyword&sort=created_at&order=desc
```

---

## 2. Authentication Flow

```
1. User đăng nhập → POST /auth/login → nhận { accessToken, refreshToken }
2. Lưu tokens vào Zustand authStore (persist localStorage)
3. Mọi request → Axios interceptor attach: Authorization: Bearer <accessToken>
4. Khi accessToken hết hạn (401) → POST /auth/refresh → nhận accessToken mới → retry
5. Khi refreshToken hết hạn → Clear store → redirect /login
6. Logout → POST /auth/logout → Clear store → redirect /login
```

### JWT Token Info
| Token | Thời hạn | Lưu ở đâu |
|---|---|---|
| Access Token | 15 phút | Zustand store (memory + persist) |
| Refresh Token | 7 ngày | Zustand store (persist localStorage) |

### Role-based Access
| Route Group | Roles cho phép | Middleware check |
|---|---|---|
| `/(public)/*` | Tất cả (kể cả chưa login) | Không check |
| `/(player)/*` | PLAYER, ORGANIZER, ADMIN | Check isAuthenticated |
| `/organizer/*` | ORGANIZER, ADMIN | Check role ORGANIZER+ |
| `/admin/*` | ADMIN | Check role ADMIN |

---

## 3. Cấu trúc File trong mỗi Feature

```text
features/{featureName}/
├── api/                    # Hàm gọi API (1 file = 1 endpoint)
│   ├── getItems.ts         #   GET request
│   ├── createItem.ts       #   POST request
│   ├── updateItem.ts       #   PATCH request
│   ├── deleteItem.ts       #   DELETE request
│   └── index.ts            #   Re-export
├── components/             # UI components riêng feature
│   ├── ItemList.tsx
│   ├── ItemCard.tsx
│   ├── ItemForm.tsx
│   └── index.ts
├── hooks/                  # Custom hooks (business logic)
│   ├── useItems.ts         #   Fetch + state logic
│   └── useItemSubmit.ts    #   Form submit logic
├── stores/                 # Zustand store (nếu cần)
│   └── itemFilter.ts
└── types/                  # Types riêng (nếu phức tạp)
    └── index.ts
```

### Quy tắc:
- Mỗi file API chỉ chứa **1 function**, export default.
- Hooks phải bắt đầu bằng `use`.
- Components phải là `PascalCase.tsx`.
- Mỗi folder có `index.ts` re-export.

---

## 4. Component Convention

### Server Component (mặc định)
```tsx
// Không cần directive — mặc định là Server Component
export default async function TournamentsPage() {
  const data = await getTournaments(); // Fetch ở server
  return <TournamentList data={data} />;
}
```

### Client Component
```tsx
'use client';

import { useState } from 'react';

export default function FilterBar() {
  const [search, setSearch] = useState('');
  // ... interactive logic
}
```

### Quy tắc chọn:
- **Server Component** khi: chỉ hiển thị data, không cần useState/useEffect/onClick.
- **Client Component** khi: cần tương tác (form, filter, modal, chart, websocket).

---

## 5. Styling Convention

### Sử dụng `cn()` utility
```typescript
// utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Component styling
```tsx
// ✅ Đúng — dùng TailwindCSS + cn()
<button className={cn(
  'px-4 py-2 rounded-lg font-medium transition-colors',
  variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
  variant === 'ghost' && 'bg-transparent hover:bg-gray-100',
  disabled && 'opacity-50 cursor-not-allowed',
  className // cho phép override từ parent
)}>

// ❌ Sai — KHÔNG dùng inline style hoặc CSS modules
<button style={{ padding: '8px 16px' }}>
```

---

## 6. Environment Variables

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3000

# Cloudinary (upload ảnh)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset

# App
NEXT_PUBLIC_APP_NAME=Quản Lý Giải Đấu
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

> **Quy tắc:** Biến dùng ở client PHẢI có prefix `NEXT_PUBLIC_`. Biến server-only thì KHÔNG có prefix.

---

## 7. Error Handling

### API errors
```typescript
// Trong Axios interceptor
try {
  const response = await api.get('/tournaments');
  return response.data.data; // unwrap ApiResponse
} catch (error) {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    // Hiển thị toast: apiError.message
    // Nếu validation: hiển thị apiError.details
  }
  throw error;
}
```

### UI error boundaries
- Mỗi route có `error.tsx` để catch render errors.
- Mỗi route có `loading.tsx` để hiện skeleton.
- Mỗi route có `not-found.tsx` nếu cần.

---

## 8. HTTP Status Handling

| Status | Frontend xử lý |
|---|---|
| `200`, `201` | Hiển thị data, toast success |
| `204` | Toast success (delete xong) |
| `400` | Hiển thị validation errors inline |
| `401` | Auto-refresh token hoặc redirect login |
| `403` | Toast "Bạn không có quyền", redirect back |
| `404` | Hiển thị NotFound component |
| `409` | Toast conflict message (VD: "Email đã tồn tại") |
| `422` | Toast logic error (VD: "Giải đã kết thúc") |
| `500` | Toast "Lỗi hệ thống, vui lòng thử lại" |
