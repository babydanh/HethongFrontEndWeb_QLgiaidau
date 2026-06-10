# 🏗️ Kiến Trúc Dự Án (Project Architecture) — Frontend Quản Lý Giải Đấu

> Tài liệu này trình bày kiến trúc tổng thể frontend (Next.js) cho nền tảng Quản Lý Giải Đấu.  
> Dự án áp dụng **Next.js App Router** + **Feature-Sliced Design (FSD)** — kiến trúc hướng tính năng.  
> Tham khảo API backend tại: `../backend-api_qlgiaidau/docs/`

---

## 1. Cấu Trúc Thư Mục Tiêu Chuẩn (Directory Structure)

```text
src/
├── app/                    # 🔗 Routes (Next.js App Router) — Chỉ định nghĩa URL
│   ├── (public)/           # Nhóm route công khai (Landing, Login, Register, Leaderboard)
│   ├── (player)/           # Nhóm route cho Player đã đăng nhập
│   │   ├── dashboard/      #   /dashboard — Tổng quan cá nhân
│   │   ├── tournaments/    #   /tournaments — Duyệt & đăng ký giải
│   │   ├── profile/        #   /profile — Hồ sơ & ELO cá nhân
│   │   ├── chat/           #   /chat — Nhắn tin
│   │   └── communities/    #   /communities — Cộng đồng đã tham gia
│   ├── organizer/          # Nhóm route cho Organizer (BTC)
│   │   ├── tournaments/    #   /organizer/tournaments — Quản lý giải của mình
│   │   ├── scores/         #   /organizer/scores — Nhập tỷ số
│   │   └── payouts/        #   /organizer/payouts — Yêu cầu rút tiền
│   ├── admin/              # Nhóm route cho Admin hệ thống
│   │   ├── communities/    #   /admin/communities — Duyệt community
│   │   ├── payments/       #   /admin/payments — Quản lý thanh toán
│   │   ├── users/          #   /admin/users — Quản lý người dùng
│   │   └── disputes/       #   /admin/disputes — Xử lý khiếu nại
│   ├── live/               # Route đặc biệt: Live Score (real-time WebSocket)
│   │   └── [matchId]/      #   /live/abc-123 — Xem trực tiếp 1 trận
│   └── layout.tsx          # Root layout (font, metadata, providers)
│
├── components/             # 🧩 UI Components dùng chung toàn cục
│   ├── ui/                 #   Primitives: Button, Input, Modal, Select, Badge, Skeleton
│   ├── layout/             #   Header, Sidebar, Footer, MobileNav
│   ├── data-display/       #   DataTable, Pagination, EmptyState, Avatar
│   └── feedback/           #   Toast, LoadingSpinner, ErrorBoundary, ConfirmDialog
│
├── features/               # 🧠 Logic đóng gói theo TÍNH NĂNG (Feature-Sliced)
│   ├── auth/               #   Đăng nhập, Đăng ký, Refresh Token, Logout
│   ├── tournaments/        #   Duyệt giải, Chi tiết giải, Đăng ký, Bracket View
│   ├── matches/            #   Danh sách trận, Chi tiết trận, Live Score
│   ├── elo/                #   Leaderboard, Lịch sử ELO, Biểu đồ phong độ
│   ├── communities/        #   Danh sách, Chi tiết, Tham gia, Tìm gần tôi
│   ├── chat/               #   Direct Message, Group Chat, Real-time
│   ├── social/             #   Friends, Notifications, Comments, Reactions
│   ├── payments/           #   Thanh toán giải, Lịch sử giao dịch
│   ├── organizer/          #   Tạo giải, Nhập score, Quản lý đội, Rút tiền
│   └── admin/              #   Duyệt community, Quản lý users, Disputes, Payouts
│
├── hooks/                  # 🪝 Hooks dùng chung toàn cục
│   ├── useDebounce.ts
│   ├── useMediaQuery.ts
│   ├── useInfiniteScroll.ts
│   └── useLocalStorage.ts
│
├── lib/                    # 📚 Cấu hình thư viện bên thứ 3
│   ├── axios.ts            #   Axios instance (baseURL, interceptors, token refresh)
│   ├── socket.ts           #   Socket.io client (connect, events, reconnect)
│   └── zustand/            #   Zustand stores (auth, cart, notifications)
│
├── services/               # 🔌 API Client layer — giao tiếp với Backend
│   ├── api.ts              #   Base fetch wrapper (error handling, token attach)
│   └── endpoints.ts        #   Tập trung URL endpoints: /api/v1/users, /api/v1/tournaments...
│
├── types/                  # 📐 TypeScript types/interfaces dùng chung
│   ├── user.ts             #   User, Profile, Role
│   ├── tournament.ts       #   Tournament, Stage, Group, Participant
│   ├── match.ts            #   Match, MatchPlayer, ScoreDetails
│   ├── elo.ts              #   UserRank, EloTier, EloHistory
│   ├── payment.ts          #   Payment, Payout
│   ├── community.ts        #   Community, CommunityMember
│   ├── chat.ts             #   ChatRoom, ChatMessage
│   ├── social.ts           #   Friendship, Notification, Comment, Reaction
│   └── api.ts              #   ApiResponse<T>, PaginatedResponse<T>, ApiError
│
└── utils/                  # 🔧 Hàm helper dùng chung
    ├── format.ts           #   formatCurrency, formatDate, formatRelativeTime
    ├── elo.ts              #   getEloTierLabel, getEloColor, getEloIcon
    ├── tournament.ts       #   getStatusLabel, getStatusColor, getBracketLayout
    └── cn.ts               #   Tailwind class merge utility (clsx + twMerge)
```

---

### Deep-dive: Cấu trúc bên trong mỗi Feature

Mỗi feature được đóng gói khép kín — chỉ cần vào 1 folder duy nhất để sửa.

```text
features/tournaments/
├── api/                    # (Data Access) — Gọi API backend
│   ├── getTournaments.ts   #   GET /api/v1/tournaments
│   ├── getTournamentById.ts#   GET /api/v1/tournaments/:id
│   ├── registerTeam.ts     #   POST /api/v1/tournaments/:id/register
│   └── index.ts            #   Re-export tất cả
│
├── components/             # (Presentation) — UI riêng của feature
│   ├── TournamentCard.tsx  #   Card hiển thị 1 giải đấu
│   ├── TournamentList.tsx  #   Danh sách + filter + pagination
│   ├── TournamentDetail.tsx#   Chi tiết giải (info, stages, teams)
│   ├── BracketView.tsx     #   Bracket nhánh đấu (Single/Double Elimination)
│   ├── GroupStandings.tsx  #   Bảng xếp hạng vòng bảng
│   └── RegisterForm.tsx    #   Form đăng ký tham gia giải
│
├── hooks/                  # (Business Logic) — Custom hooks
│   ├── useTournaments.ts   #   Fetch + filter + pagination logic
│   ├── useTournamentDetail.ts
│   └── useRegister.ts      #   Submit registration + payment redirect
│
├── stores/                 # (State) — Zustand store nếu cần
│   └── tournamentFilter.ts #   Lưu trạng thái bộ lọc (category, status, search)
│
└── types/                  # (Types) — Types riêng nếu feature phức tạp
    └── index.ts
```

---

## 2. Phân Tích Mô Hình 3 Tầng (3-Layer Architecture)

```
┌──────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (Tầng Giao diện)                     │
│  app/ → layout, page (route)                             │
│  components/ → UI primitives                             │
│  features/*/components/ → UI riêng từng feature          │
├──────────────────────────────────────────────────────────┤
│  BUSINESS LOGIC LAYER (Tầng Nghiệp vụ)                  │
│  features/*/hooks/ → Custom hooks chứa logic             │
│  hooks/ → Hooks dùng chung                               │
│  lib/zustand/ → State management                         │
│  utils/ → Helper functions                               │
├──────────────────────────────────────────────────────────┤
│  DATA ACCESS LAYER (Tầng Dữ liệu)                       │
│  features/*/api/ → Gọi API cho từng feature              │
│  services/ → Base API client, interceptors               │
│  lib/axios.ts → Axios config                             │
│  lib/socket.ts → WebSocket connection                    │
└──────────────────────────────────────────────────────────┘
```

### Quy tắc tầng:

1. **Presentation** — CHỈ hiển thị và nhận tương tác. KHÔNG gọi API trực tiếp trong JSX.
2. **Business Logic** — Xử lý nghiệp vụ: tính ELO display, format bracket, validate form, quản lý state.
3. **Data Access** — Giao tiếp với Backend API. Xử lý error, transform response, attach JWT token.

---

## 3. Chiến Lược Rendering (Rendering Strategies)

| Chiến lược | Khi nào dùng | Ví dụ cụ thể |
|---|---|---|
| **RSC** (Server Component) — Mặc định | Layout, page tĩnh, SEO-critical | Header, Footer, Landing Page, Leaderboard page |
| **CSR** (`'use client'`) | Component cần tương tác, state, effects | BracketView, LiveScoreBoard, ChatBox, FilterBar, Forms |
| **SSR** (`cache: 'no-store'`) | Data thay đổi liên tục, cần fresh mỗi request | Admin Dashboard, Danh sách payments, Disputes |
| **ISR** (`next: { revalidate: 60 }`) | Data ít thay đổi, cần tốc độ | Danh sách tournaments công khai, Community list, Leaderboard |

### Quy tắc chọn rendering:

```
Trang cần SEO + ít thay đổi?        → ISR (revalidate 60s)
Trang cần data real-time?            → CSR + WebSocket (Live Score, Chat)
Trang admin, data nhạy cảm?         → SSR (no-store, luôn fetch mới)
Layout, trang giới thiệu?           → RSC (mặc định, 0 JS client)
```

---

## 4. Luồng Dữ Liệu (Data Flow)

### 4.1 REST API Flow (Đa số trang)

```
User Action → Component → Hook → API function → Axios → Backend /api/v1/*
                                                            ↓
UI Update  ← Component ← Hook ← Transform Response ← JSON Response
```

### 4.2 Real-time Flow (Live Score & Chat)

```
                    ┌──── Socket.io Server (Backend) ────┐
                    │  Event: 'score:update'             │
                    │  Event: 'chat:message'             │
                    └────────────┬───────────────────────┘
                                 │ WebSocket
                    ┌────────────▼───────────────────────┐
                    │  lib/socket.ts (Client)             │
                    │  → Listen events                    │
                    │  → Update Zustand store             │
                    └────────────┬───────────────────────┘
                                 │ State change
                    ┌────────────▼───────────────────────┐
                    │  Component re-render                │
                    │  → LiveScoreBoard hiện tỷ số mới   │
                    │  → ChatBox hiện tin nhắn mới        │
                    └────────────────────────────────────┘
```

---

## 5. Tài Liệu Liên Quan

| File | Mục đích |
|---|---|
| [plan.md](./plan.md) | Kế hoạch phát triển Frontend theo Phase |
| [pages.md](./pages.md) | Chi tiết từng trang (UI, data, rendering) |
| [rules.md](./rules.md) | Quy tắc viết code Frontend |
| **Backend docs** | `../backend-api_qlgiaidau/docs/` — API, Database, Spec |
