# 📡 API Contract — Frontend ↔ Backend

> **Hợp đồng API chính xác giữa Frontend và Backend.**
> Mỗi endpoint được mô tả: method, URL, request payload, response type, error codes.
> AI Agent: Dùng file này khi implement các file trong `features/*/api/`.

---

## Base Configuration

```typescript
// lib/axios.ts
baseURL: 'http://localhost:3000/api/v1'
withCredentials: true // Cookie-based JWT
```

## Response Wrapper (Mọi API đều trả về format này)

```typescript
// Success Response
interface ApiResponse<T> {
  statusCode: number;   // 200, 201, 204
  message: string;      // "Success"
  data: T;              // Dữ liệu thực tế
  meta?: {              // Chỉ có khi GET list
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Response
interface ApiError {
  statusCode: number;   // 400, 401, 403, 404, 409, 500
  message: string;
  error: string;
  details?: { field: string; message: string }[];
  timestamp: string;
  path: string;
}
```

---

## 1. AUTH (`/auth`)

### `POST /auth/register`
- **Guard:** Public
- **Request:**
  ```typescript
  interface RegisterDto {
    email: string;       // IsEmail()
    password: string;    // MinLength(8), MaxLength(32)
    fullName: string;    // MinLength(2), MaxLength(100)
  }
  ```
- **Response (201):** `ApiResponse<{ id: string; email: string }>`
- **Errors:** `400` Validation | `409` Email đã tồn tại

### `POST /auth/login`
- **Guard:** Public
- **Request:**
  ```typescript
  interface LoginDto {
    email: string;       // IsEmail()
    password: string;    // IsNotEmpty()
  }
  ```
- **Response (200):** Backend set cookies (`accessToken`, `refreshToken`) + trả về `ApiResponse<{ user: UserProfile }>`
- **Errors:** `401` Sai email/mật khẩu

### `POST /auth/refresh`
- **Guard:** Public (nhưng cần cookie refreshToken)
- **Request:** Empty body (cookie tự gửi kèm)
- **Response (200):** Set cookie accessToken mới
- **Errors:** `401` Refresh token hết hạn → redirect `/login`

### `POST /auth/logout`
- **Guard:** JwtAuthGuard
- **Request:** Empty body
- **Response (200):** Clear cookies

### `GET /auth/google`
- **Guard:** Public
- **Action:** Redirect tới Google OAuth consent screen

### `GET /auth/google/callback`
- **Guard:** Public (Google redirect về)
- **Response:** Set cookies + redirect về Frontend `/`

---

## 2. USERS (`/users`)

### `GET /users`
- **Guard:** Admin
- **Query:** `?page=1&limit=10&search=keyword`
- **Response:** `ApiResponse<User[]>` + `meta`

### `GET /users/profile`
- **Guard:** JwtAuthGuard
- **Response:** `ApiResponse<UserProfile>`

### `GET /users/:id`
- **Guard:** Public
- **Response:** `ApiResponse<UserProfile>`

### `PATCH /users/profile`
- **Guard:** JwtAuthGuard
- **Request:**
  ```typescript
  interface UpdateProfileDto {
    fullName?: string;
    phone?: string;
    dateOfBirth?: string;  // ISO date
    bio?: string;
    avatarUrl?: string;
  }
  ```
- **Response:** `ApiResponse<UserProfile>`

### `PATCH /users/change-password`
- **Guard:** JwtAuthGuard
- **Request:**
  ```typescript
  interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;       // MinLength(8)
    confirmPassword: string;
  }
  ```
- **Response (200):** `ApiResponse<{ message: string }>`

---

## 3. CATEGORIES (`/categories`)

### `GET /categories`
- **Guard:** Public
- **Response:** `ApiResponse<Category[]>`

### `GET /categories/:id`
- **Guard:** Public
- **Response:** `ApiResponse<Category>`

### `GET /categories/:id/elo-tiers`
- **Guard:** Public
- **Response:** `ApiResponse<EloTier[]>`

---

## 4. COMMUNITIES (`/communities`)

### `GET /communities`
- **Guard:** Public (trả về status=APPROVED)
- **Query:** `?search=xx&page=1&limit=12&lat=10.5&lng=106.7&radiusKm=10`
- **Response:** `ApiResponse<Community[]>` + `meta`

### `GET /communities/:id`
- **Guard:** Public
- **Response:** `ApiResponse<Community>`

### `POST /communities`
- **Guard:** JwtAuthGuard
- **Request:**
  ```typescript
  interface CreateCommunityDto {
    name: string;
    description?: string;
    logoUrl?: string;
    bannerUrl?: string;
    locationAddress?: string;
    lat?: number;
    lng?: number;
    categoryIds?: string[];
  }
  ```
- **Response (201):** `ApiResponse<Community>`

### `PATCH /communities/:id`
- **Guard:** JwtAuthGuard (OWNER/MODERATOR)
- **Request:** `Partial<CreateCommunityDto>`

### `PATCH /communities/:id/review`
- **Guard:** Admin
- **Request:**
  ```typescript
  interface ReviewCommunityDto {
    status: 'APPROVED' | 'REJECTED';
    rejectedReason?: string;
  }
  ```

### `GET /communities/:id/members`
- **Guard:** Public
- **Response:** `ApiResponse<CommunityMember[]>`

### `POST /communities/:id/members`
- **Guard:** JwtAuthGuard
- **Request:** `{ userId: string; role?: string }`

---

## 5. VENUES (`/venues`)

### `GET /venues`
- **Guard:** Public
- **Query:** `?search=xx&page=1&limit=20`
- **Response:** `ApiResponse<Venue[]>`

### `GET /venues/:id`
- **Guard:** Public
- **Response:** `ApiResponse<Venue>` (includes `courts[]`)

---

## 6. TOURNAMENTS (`/tournaments`)

### `GET /tournaments`
- **Guard:** Public
- **Query:** `?category_id=xx&status=UPCOMING|IN_PROGRESS|COMPLETED&search=xx&page=1&limit=12`
- **Response:** `ApiResponse<Tournament[]>` + `meta`

### `GET /tournaments/:id`
- **Guard:** Public
- **Response:** `ApiResponse<Tournament>` (full detail)

### `POST /tournaments`
- **Guard:** ORGANIZER/ADMIN
- **Request:**
  ```typescript
  interface CreateTournamentDto {
    name: string;
    description?: string;
    categoryId: string;         // UUID
    communityId?: string;       // UUID
    format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN';
    sportRules: {
      setsToWin: number;        // 1, 2, 3
      pointsPerSet: number;     // 11, 15, 21
      winByTwo: boolean;
    };
    tournamentConfig: Record<string, unknown>;
    entryFee?: number;          // 0 = miễn phí
    maxParticipants?: number;
    registrationStartDate?: string; // ISO datetime
    registrationEndDate?: string;
    startDate?: string;
    endDate?: string;
    venueId?: string;           // UUID
  }
  ```
- **Response (201):** `ApiResponse<Tournament>`

### `PATCH /tournaments/:id`
- **Guard:** ORGANIZER/ADMIN (owner)
- **Request:** `Partial<CreateTournamentDto>`

### `POST /tournaments/:id/register`
- **Guard:** JwtAuthGuard
- **Request:**
  ```typescript
  interface RegisterTournamentDto {
    teamName: string;           // MinLength(3)
    rosterUserIds?: string[];   // UUID[]
  }
  ```
- **Response (201):** `ApiResponse<{ participantId: string }>`
- **Errors:** `400` Hết hạn đăng ký | `409` Giải đã đầy

### `POST /tournaments/:id/generate-bracket`
- **Guard:** ORGANIZER/ADMIN
- **Response:** `ApiResponse<Match[]>`

---

## 7. MATCHES (`/matches`)

### `GET /matches`
- **Guard:** Public
- **Query:** `?tournament_id=xx&status=xx&page=1&limit=20`
- **Response:** `ApiResponse<Match[]>` + `meta`

### `GET /matches/:id`
- **Guard:** Public
- **Response:** `ApiResponse<Match>`

### `PATCH /matches/:id/score`
- **Guard:** JwtAuthGuard (Referee/Admin)
- **Request:**
  ```typescript
  interface UpdateMatchScoreDto {
    scoreDetails: Record<string, unknown>;  // { p1_score: 15, p2_score: 14 }
    p1SetsWon: number;
    p2SetsWon: number;
  }
  ```
- **Side effect:** Backend emit `score:update` via WebSocket

### `PATCH /matches/:id/status`
- **Guard:** JwtAuthGuard (Referee/Admin)
- **Request:**
  ```typescript
  interface UpdateMatchStatusDto {
    status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED';
    winnerId?: string;
  }
  ```
- **Side effect:** Backend emit `match:status` via WebSocket + trigger ELO calculation

---

## 8. RANKINGS (`/rankings`)

### `GET /rankings`
- **Guard:** Public
- **Query:** `?category_id=xx&page=1&limit=50`
- **Response:** `ApiResponse<UserRank[]>` + `meta`

### `POST /rankings/update-elo`
- **Guard:** Admin
- **Request:** Manual ELO recalculation trigger

---

## 9. WEBSOCKET EVENTS

### Live Score (`ws://localhost:3000/live`)
| Event | Direction | Payload | Mô tả |
|-------|-----------|---------|-------|
| `joinRoom` | Client → Server | `{ matchId: string }` | Vào phòng xem trận |
| `leaveRoom` | Client → Server | `{ matchId: string }` | Rời phòng |
| `score:update` | Server → Client | `{ matchId, scoreDetails, p1SetsWon, p2SetsWon }` | Cập nhật tỷ số realtime |
| `match:status` | Server → Client | `{ matchId, status, winnerId? }` | Trận bắt đầu/kết thúc |

### Chat (`ws://localhost:3000/chat`)
| Event | Direction | Payload | Mô tả |
|-------|-----------|---------|-------|
| `chat:message` | Both | `{ roomId, senderId, messageText, attachments? }` | Gửi/nhận tin nhắn |
| `chat:typing` | Both | `{ roomId, userId, isTyping }` | Hiện "đang nhập..." |
| `chat:read` | Client → Server | `{ roomId, messageId }` | Đánh dấu đã đọc |

### Notifications (`ws://localhost:3000/notifications`)
| Event | Direction | Payload | Mô tả |
|-------|-----------|---------|-------|
| `notification:new` | Server → Client | `Notification` object | Push thông báo mới |

### Authentication cho WebSocket:
```typescript
const socket = io('ws://localhost:3000/live', {
  auth: { token: `Bearer ${accessToken}` },
  transports: ['websocket'],
});
```

---

## 10. HTTP Error Handling (Frontend)

| Status | Xử lý |
|--------|-------|
| `200`, `201` | Hiển thị data, toast success (nếu mutation) |
| `204` | Toast success (delete) |
| `400` | Hiển thị validation errors inline dưới input |
| `401` | Auto-refresh token (interceptor). Nếu refresh fail → redirect `/login` |
| `403` | Toast "Bạn không có quyền" |
| `404` | Hiển thị NotFound component |
| `409` | Toast conflict message (VD: "Email đã tồn tại") |
| `422` | Toast logic error (VD: "Giải đã kết thúc") |
| `500` | Toast "Lỗi hệ thống, vui lòng thử lại" |
