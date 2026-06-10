# 🗺️ Bản Đồ Routes — Frontend Quản Lý Giải Đấu

> **Tài liệu này quy định CHÍNH XÁC mọi trang của Frontend.**
> AI Agent: Đọc file này để biết cần tạo file nào, ở đâu, gọi API gì, render kiểu gì.

---

## Quy ước ký hiệu

| Ký hiệu | Ý nghĩa |
|----------|---------|
| 🟢 | Đã hoàn thành |
| 🟡 | Đang làm / Cơ bản |
| 🔴 | Chưa làm |
| `RSC` | React Server Component (mặc định, không cần `'use client'`) |
| `CSR` | Client Component (`'use client'` — cần hooks/events) |
| `SSR` | Server-side render mỗi request (`cache: 'no-store'`) |
| `ISR` | Incremental Static Regeneration (`revalidate: N`) |

---

## 1. PUBLIC ROUTES — Không cần đăng nhập

### 1.1 Trang chủ / Homepage
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🟡 Basic |
| **URL** | `/` |
| **File** | `app/page.tsx` |
| **Rendering** | `CSR` (fetch data client-side) |
| **APIs** | `GET /tournaments?limit=5` · `GET /communities?limit=4` |
| **Components cần** | `TournamentCard`, `CommunityCard`, `ActivityFeed`, `ProfileWidget`, `LeaderboardWidget` |
| **Data Types** | `Tournament[]`, `Community[]` |
| **Ghi chú** | Hiện tại đang fetch OK nhưng UI chưa xử lý empty state tốt. Cần thêm phần Activity Feed từ API thực tế |

---

### 1.2 Đăng nhập
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🟢 Done |
| **URL** | `/login` |
| **File** | `app/(public)/login/page.tsx` |
| **Rendering** | `CSR` |
| **APIs** | `POST /auth/login` |
| **Components** | `LoginForm` |
| **Zod Schema** | `{ email: z.string().email(), password: z.string().min(8) }` |
| **Redirect** | Sau login → `/` (homepage) |
| **Error handling** | `401` → Toast "Sai email hoặc mật khẩu" |

---

### 1.3 Đăng ký
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🟢 Done |
| **URL** | `/register` |
| **File** | `app/(public)/register/page.tsx` |
| **Rendering** | `CSR` |
| **APIs** | `POST /auth/register` |
| **Zod Schema** | `{ email, password (min 8), fullName (min 2, max 100), confirmPassword }` |
| **Error handling** | `409` → Toast "Email đã tồn tại" |

---

### 1.4 Bảng xếp hạng (Leaderboard)
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🟡 Basic |
| **URL** | `/leaderboard` |
| **File** | `app/(public)/leaderboard/page.tsx` |
| **Rendering** | `ISR` (revalidate: 60) |
| **APIs** | `GET /rankings?category_id=xxx&page=1&limit=50` |
| **Components cần** | `LeaderboardTable`, `EloTierBadge`, `CategoryFilter`, `Top3Podium` |
| **Data Types** | `UserRank[]`, `EloTier[]`, `Category[]` |

---

### 1.5 Danh sách Giải đấu
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🟡 Basic |
| **URL** | `/tournaments` |
| **File** | `app/(public)/tournaments/page.tsx` |
| **Rendering** | `ISR` (revalidate: 60) + `CSR` cho FilterBar |
| **APIs** | `GET /tournaments?category_id=xx&status=xx&search=xx&page=1&limit=12` |
| **Components cần** | `TournamentList`, `TournamentCard`, `FilterBar`, `Pagination` |
| **Data Types** | `PaginatedResponse<Tournament>` |
| **Query Params** | `?category_id`, `?status` (UPCOMING/IN_PROGRESS/COMPLETED), `?search`, `?page`, `?limit` |

---

### 1.6 Chi tiết Giải đấu
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🔴 TODO |
| **URL** | `/tournaments/[id]` |
| **File** | `app/(public)/tournaments/[id]/page.tsx` |
| **Rendering** | `SSR` |
| **APIs** | `GET /tournaments/:id`, `GET /tournaments/:id/register` (POST) |
| **Components cần** | `TournamentDetail`, `BracketView`, `GroupStandings`, `TeamList`, `MatchSchedule`, `RegisterForm` |
| **Tabs** | Tổng quan · Đội tham gia · Bảng đấu · Lịch thi đấu · Bình luận |
| **Data Types** | `Tournament`, `TournamentParticipant[]`, `Match[]`, `GroupStanding[]` |
| **Actions** | Nút "Đăng ký tham gia" → `POST /tournaments/:id/register` → redirect thanh toán |

---

### 1.7 Danh sách Cộng đồng
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🟡 Basic |
| **URL** | `/communities` |
| **File** | `app/(public)/communities/page.tsx` |
| **Rendering** | `ISR` (revalidate: 60) |
| **APIs** | `GET /communities?search=xx&page=1&limit=12` |
| **Components cần** | `CommunityList`, `CommunityCard`, `FilterBar`, `Pagination` |
| **Data Types** | `PaginatedResponse<Community>` |

---

### 1.8 Chi tiết Cộng đồng
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🔴 TODO |
| **URL** | `/communities/[id]` |
| **File** | `app/(public)/communities/[id]/page.tsx` |
| **Rendering** | `SSR` |
| **APIs** | `GET /communities/:id`, `GET /communities/:id/members`, `POST /communities/:id/members` |
| **Components cần** | `CommunityDetail`, `MemberList`, `CommunityTournaments` |
| **Tabs** | Giới thiệu · Thành viên · Giải đấu · Bảng xếp hạng |
| **Data Types** | `Community`, `CommunityMember[]` |

---

## 2. PLAYER ROUTES — Cần đăng nhập (role: PLAYER+)

### 2.1 Dashboard
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🔴 TODO |
| **URL** | `/dashboard` |
| **File** | `app/(player)/dashboard/page.tsx` |
| **Rendering** | `SSR` (no-store) |
| **APIs** | `GET /users/profile`, `GET /tournaments?status=UPCOMING&limit=5`, `GET /rankings?user_id=me` |
| **Components cần** | `WelcomeCard`, `UpcomingTournaments`, `RecentMatches`, `EloSummaryCard`, `QuickActions` |
| **Auth Guard** | Middleware check `isAuthenticated` |

---

### 2.2 Profile
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🔴 TODO |
| **URL** | `/profile`, `/profile/edit` |
| **File** | `app/(player)/profile/page.tsx` |
| **Rendering** | `SSR` |
| **APIs** | `GET /users/profile`, `PATCH /users/profile`, `PATCH /users/change-password` |
| **Components cần** | `ProfileHeader`, `EditProfileForm`, `EloChart`, `MatchHistory`, `ChangePasswordForm` |
| **Tabs** | Tổng quan · Giải đấu · Trận đấu · ELO · Bạn bè |

---

### 2.3 Chat
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🔴 TODO |
| **URL** | `/chat`, `/chat/[roomId]` |
| **File** | `app/(player)/chat/page.tsx`, `app/(player)/chat/[roomId]/page.tsx` |
| **Rendering** | `CSR` (WebSocket real-time) |
| **APIs** | `GET /chat/rooms`, `GET /chat/rooms/:id/messages`, `POST /chat/messages` |
| **WebSocket** | `ws://localhost:3000/chat` — Events: `chat:message`, `chat:typing`, `chat:read` |
| **Components cần** | `ChatSidebar`, `ChatBox`, `ChatBubble`, `MessageInput` |

---

## 3. LIVE SCORE — Công khai

### 3.1 Live Score
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🔴 TODO |
| **URL** | `/live/[matchId]` |
| **File** | `app/live/[matchId]/page.tsx` |
| **Rendering** | `CSR` (WebSocket real-time) |
| **APIs** | `GET /matches/:id`, `GET /matches/:id/comments`, `POST /matches/:id/comments` |
| **WebSocket** | `ws://localhost:3000/live` — Events: `score:update`, `match:status` — Room: `match:{matchId}` |
| **Components cần** | `LiveScoreBoard`, `MatchTimeline`, `SetScoreTable`, `MatchComments`, `MatchReactions` |

---

## 4. ORGANIZER ROUTES — Role: ORGANIZER+

### 4.1 Danh sách giải của tôi
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🔴 TODO |
| **URL** | `/organizer/tournaments` |
| **File** | `app/organizer/tournaments/page.tsx` |
| **Rendering** | `SSR` |
| **APIs** | `GET /tournaments?created_by=me` |

### 4.2 Tạo giải mới (Multi-step Wizard)
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🟡 Basic |
| **URL** | `/tournaments/new` |
| **File** | `app/(public)/tournaments/new/page.tsx` (cần chuyển sang `/organizer/tournaments/create`) |
| **Rendering** | `CSR` (Multi-step form) |
| **APIs** | `POST /tournaments`, `GET /categories`, `GET /venues` |
| **Steps** | 1. Info cơ bản → 2. Thể thức → 3. Lịch & Địa điểm → 4. Phí & Xác nhận |
| **Zod Schemas** | Từng step có schema riêng, mapping với `CreateTournamentDto` |

### 4.3 Nhập tỷ số
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🔴 TODO |
| **URL** | `/organizer/scores` |
| **APIs** | `PATCH /matches/:id/score`, `PATCH /matches/:id/status` |

### 4.4 Rút tiền
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🔴 TODO |
| **URL** | `/organizer/payouts` |
| **APIs** | `POST /payouts`, `GET /payouts?organizer_id=me` |

---

## 5. ADMIN ROUTES — Role: ADMIN only

### 5.1 Admin Dashboard
| Thuộc tính | Giá trị |
|------------|---------|
| **Status** | 🔴 TODO |
| **URL** | `/admin` |
| **File** | `app/admin/page.tsx` |
| **APIs** | `GET /users`, `GET /communities?status=PENDING`, `GET /payments` |

### 5.2 Duyệt Community
| **URL** | `/admin/communities` |
| **APIs** | `GET /communities?status=PENDING`, `PATCH /communities/:id/review` |

### 5.3 Quản lý Users
| **URL** | `/admin/users` |
| **APIs** | `GET /users`, `PATCH /users/:id`, `DELETE /users/:id` |

### 5.4 Quản lý Payments
| **URL** | `/admin/payments` |
| **APIs** | `GET /payments?status=xx&page=1` |

### 5.5 Xử lý Disputes
| **URL** | `/admin/disputes` |
| **APIs** | `GET /disputes?status=OPEN`, `PATCH /disputes/:id` |

### 5.6 Duyệt Payouts
| **URL** | `/admin/payouts` |
| **APIs** | `GET /payouts?status=PENDING`, `PATCH /payouts/:id` |

---

## 📁 Cấu trúc File Route (Next.js App Router)

```text
app/
├── page.tsx                              # / (Homepage) 🟡
├── layout.tsx                            # Root layout (font, providers)
├── globals.css                           # TailwindCSS base
│
├── (public)/                             # Route group: No auth required
│   ├── login/page.tsx                    # /login 🟢
│   ├── register/page.tsx                 # /register 🟢
│   ├── leaderboard/page.tsx              # /leaderboard 🟡
│   ├── tournaments/
│   │   ├── page.tsx                      # /tournaments 🟡
│   │   ├── [id]/page.tsx                 # /tournaments/:id 🔴
│   │   └── new/page.tsx                  # /tournaments/new 🟡
│   └── communities/
│       ├── page.tsx                      # /communities 🟡
│       └── [id]/page.tsx                 # /communities/:id 🔴
│
├── (player)/                             # Route group: Auth required (PLAYER+)
│   ├── layout.tsx                        # Auth check middleware
│   ├── dashboard/page.tsx                # /dashboard 🔴
│   ├── profile/
│   │   ├── page.tsx                      # /profile 🔴
│   │   └── edit/page.tsx                 # /profile/edit 🔴
│   ├── chat/
│   │   ├── page.tsx                      # /chat 🔴
│   │   └── [roomId]/page.tsx             # /chat/:roomId 🔴
│   ├── notifications/page.tsx            # /notifications 🔴
│   └── payments/page.tsx                 # /payments 🔴
│
├── live/
│   └── [matchId]/page.tsx                # /live/:matchId 🔴
│
├── organizer/                            # Route group: ORGANIZER+ role
│   ├── layout.tsx                        # Role check middleware
│   ├── tournaments/
│   │   ├── page.tsx                      # /organizer/tournaments 🔴
│   │   ├── create/page.tsx               # /organizer/tournaments/create 🔴
│   │   └── [id]/page.tsx                 # /organizer/tournaments/:id 🔴
│   ├── scores/page.tsx                   # /organizer/scores 🔴
│   └── payouts/page.tsx                  # /organizer/payouts 🔴
│
└── admin/                                # Route group: ADMIN role
    ├── layout.tsx                        # Admin role check
    ├── page.tsx                          # /admin (dashboard) 🔴
    ├── communities/page.tsx              # /admin/communities 🔴
    ├── users/page.tsx                    # /admin/users 🔴
    ├── payments/page.tsx                 # /admin/payments 🔴
    ├── disputes/page.tsx                 # /admin/disputes 🔴
    └── payouts/page.tsx                  # /admin/payouts 🔴
```
