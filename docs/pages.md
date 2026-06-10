# 📄 Chi Tiết Các Trang (Pages Specification)

> Mô tả chi tiết từng trang: URL, rendering strategy, data sources, components chính.  
> AI Agent: Dùng file này khi cần biết trang nào cần xây và xây như thế nào.

---

## 🌐 PUBLIC PAGES (Không cần đăng nhập)

### Landing Page
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/` |
| **File** | `app/(public)/page.tsx` |
| **Rendering** | RSC (Server Component) |
| **Components** | HeroSection, FeaturesShowcase, StatsCounter, CTASection, Footer |
| **Data** | Tĩnh — không fetch API |
| **SEO** | Title: "Quản Lý Giải Đấu — Nền tảng tổ chức giải thể thao", meta description |

### Login
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/login` |
| **File** | `app/(public)/login/page.tsx` |
| **Rendering** | CSR (`'use client'` — form tương tác) |
| **Components** | `features/auth/components/LoginForm.tsx` |
| **API** | `POST /auth/login` |
| **Redirect** | Sau login → `/dashboard` |

### Register
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/register` |
| **File** | `app/(public)/register/page.tsx` |
| **Rendering** | CSR |
| **Components** | `features/auth/components/RegisterForm.tsx` |
| **API** | `POST /auth/register` |
| **Validation** | Email format, password >= 8 chars, confirm password match |

### Leaderboard
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/leaderboard` |
| **File** | `app/(public)/leaderboard/page.tsx` |
| **Rendering** | ISR (`revalidate: 60`) |
| **Components** | `features/elo/components/LeaderboardTable.tsx`, `EloTierBadge.tsx`, CategoryFilter |
| **API** | `GET /ratings?category_id=xxx&page=1&limit=50` |
| **Data** | Bảng xếp hạng ELO theo category, có pagination |

---

## 🏃 PLAYER PAGES (Cần đăng nhập — role PLAYER+)

### Dashboard
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/dashboard` |
| **File** | `app/(player)/dashboard/page.tsx` |
| **Rendering** | SSR (`cache: 'no-store'`) — data cá nhân luôn fresh |
| **Components** | WelcomeCard, UpcomingTournaments, RecentMatches, EloSummaryCard, QuickActions |
| **API** | `GET /users/me`, `GET /tournaments?status=UPCOMING`, `GET /ratings/:userId` |

### Danh sách giải đấu
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/tournaments` |
| **File** | `app/(player)/tournaments/page.tsx` |
| **Rendering** | ISR (`revalidate: 60`) + CSR cho FilterBar |
| **Components** | `TournamentList`, `TournamentCard`, `FilterBar` (category, status, search) |
| **API** | `GET /tournaments?category_id=xx&status=xx&search=xx&page=1&limit=12` |

### Chi tiết giải đấu
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/tournaments/[id]` |
| **File** | `app/(player)/tournaments/[id]/page.tsx` |
| **Rendering** | SSR (data thay đổi khi có đội đăng ký mới) |
| **Components** | TournamentDetail (tabs: Info, Bracket, Teams, Results), BracketView, GroupStandings, RegisterForm |
| **API** | `GET /tournaments/:id`, `GET /tournaments/:id/stages`, `GET /tournaments/:id/participants` |
| **Actions** | Đăng ký tham gia → `POST /tournaments/:id/register` → redirect thanh toán |

### Profile
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/profile` |
| **File** | `app/(player)/profile/page.tsx` |
| **Rendering** | SSR |
| **Components** | ProfileHeader (avatar, name, bio), EloChart (line chart), MatchHistory, EditProfileForm |
| **API** | `GET /users/me`, `GET /ratings/:userId`, `GET /ratings/:userId/history` |

### Chat
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/chat`, `/chat/[roomId]` |
| **File** | `app/(player)/chat/page.tsx`, `app/(player)/chat/[roomId]/page.tsx` |
| **Rendering** | CSR (WebSocket real-time) |
| **Components** | ChatSidebar, ChatBox, ChatBubble, MessageInput |
| **WebSocket** | `chat:message`, `chat:typing`, `chat:read` |
| **API** | `GET /chat/rooms`, `GET /chat/rooms/:id/messages`, `POST /chat/rooms/:id/messages` |

### Communities
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/communities`, `/communities/[id]` |
| **File** | `app/(player)/communities/page.tsx` |
| **Rendering** | ISR (list) + SSR (detail) |
| **Components** | CommunityCard, CommunityList, CommunityDetail, NearbyMap, MemberList |
| **API** | `GET /communities`, `GET /communities/:id`, `POST /communities/:id/members` |

---

## 📡 LIVE SCORE PAGE (Công khai)

### Live Score
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/live/[matchId]` |
| **File** | `app/live/[matchId]/page.tsx` |
| **Rendering** | CSR (WebSocket real-time) |
| **Components** | LiveScoreBoard, MatchTimeline, SetScoreTable, MatchComments, MatchReactions |
| **WebSocket** | `score:update`, `match:status` — join room `match:{matchId}` |
| **API** | `GET /matches/:id`, `GET /matches/:id/comments`, `POST /matches/:id/comments` |
| **UX** | Auto-update score, animation khi score thay đổi, live comments feed |

---

## 🏢 ORGANIZER PAGES (Role ORGANIZER+)

### Quản lý giải của mình
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/organizer/tournaments` |
| **Rendering** | SSR |
| **Components** | OrganizerTournamentList, StatusBadge, QuickActions (edit, manage, view) |
| **API** | `GET /tournaments?created_by=me` |

### Tạo giải mới
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/organizer/tournaments/create` |
| **Rendering** | CSR (multi-step form) |
| **Components** | CreateTournamentWizard (4 steps: Info → Format → Fees → Review) |
| **API** | `POST /tournaments` |
| **Validation** | Zod schema cho mỗi step |

### Nhập tỷ số
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/organizer/scores` |
| **Rendering** | CSR |
| **Components** | MatchScoreInput (nhập set-by-set), MatchList (filter by tournament), ConfirmDialog |
| **API** | `PATCH /matches/:id` (score update), triggers ELO calculation trên backend |

### Rút tiền
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/organizer/payouts` |
| **Rendering** | SSR |
| **Components** | PayoutRequestForm (bank info), PayoutHistory, StatusTimeline |
| **API** | `POST /payouts`, `GET /payouts?organizer_id=me` |

---

## 🛡️ ADMIN PAGES (Role ADMIN)

### Admin Dashboard
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/admin` |
| **Rendering** | SSR (`cache: 'no-store'`) |
| **Components** | StatsCards (users, tournaments, revenue), RevenueChart, RecentPayments, PendingActions |

### Duyệt Community
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/admin/communities` |
| **Components** | PendingCommunityList, ApproveRejectActions, RejectionReasonModal |
| **API** | `GET /communities?status=PENDING`, `PATCH /communities/:id` (approve/reject) |

### Quản lý Payments
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/admin/payments` |
| **Components** | PaymentTable (filter by status, date range), PaymentDetail, StatusLog |
| **API** | `GET /payments?status=xx&page=1` |

### Quản lý Users
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/admin/users` |
| **Components** | UserTable (search, filter role), UserDetail, RoleAssignment, BanUser |
| **API** | `GET /users`, `PATCH /users/:id`, `POST /users/:id/roles` |

### Xử lý Disputes
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/admin/disputes` |
| **Components** | DisputeList (filter by status), DisputeDetail, EvidenceViewer, ResolutionForm |
| **API** | `GET /disputes?status=OPEN`, `PATCH /disputes/:id` (resolve/reject) |

### Duyệt Payouts
| Thuộc tính | Chi tiết |
|---|---|
| **URL** | `/admin/payouts` |
| **Components** | PayoutList, PayoutDetail, UploadProofForm, ApproveRejectActions |
| **API** | `GET /payouts?status=PENDING`, `PATCH /payouts/:id` |
