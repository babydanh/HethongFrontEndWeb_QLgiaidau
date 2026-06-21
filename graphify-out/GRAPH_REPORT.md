# Graph Report - frontend-web_qlgiaidau  (2026-06-18)

## Corpus Check
- 177 files · ~388,101 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1141 nodes · 2096 edges · 77 communities (67 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21c0fff6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 51 edges
2. `Button` - 45 edges
3. `Tournament` - 37 edges
4. `cn()` - 36 edges
5. `api` - 34 edges
6. `tournamentsApi` - 24 edges
7. `Input` - 23 edges
8. `getErrorMessage()` - 22 edges
9. `formatCurrency()` - 22 edges
10. `ApiResponse` - 21 edges

## Surprising Connections (you probably didn't know these)
- `AdminPayoutsReview()` --calls--> `formatCurrency()`  [INFERRED]
  src/app/admin/payouts/page.tsx → src/utils/format.ts
- `AdminTransactionsList()` --calls--> `formatCurrency()`  [INFERRED]
  src/app/admin/transactions/page.tsx → src/utils/format.ts
- `ChatPage()` --calls--> `useAuthStore`  [EXTRACTED]
  src/app/(player)/chat/page.tsx → src/lib/zustand/authStore.ts
- `AboutTab()` --calls--> `formatDate()`  [EXTRACTED]
  src/app/(public)/communities/[id]/components/AboutTab.tsx → src/utils/format.ts
- `CommunityDetailPage()` --calls--> `useAuthStore`  [INFERRED]
  src/app/(public)/communities/[id]/page.tsx → src/lib/zustand/authStore.ts

## Import Cycles
- None detected.

## Communities (77 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (13): AdminLayout(), CommunitiesPage(), OverviewTab(), Props, CreateCommunityPage(), DashboardPage(), CommunityDetailPage(), TournamentDetailClient() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (39): categoriesApi, communitiesApi, CommunityMemberRecord, CommunityRankingRecord, GalleryImage, JoinRequest, AboutTab(), GalleryImage (+31 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (32): dependencies, axios, clsx, @editorjs/editorjs, @editorjs/header, @editorjs/image, @editorjs/list, framer-motion (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (8): Props, TournamentStepperProps, Props, TournamentManagePage(), getFormatLabel(), ParentWithDivisions, Tournament, Props

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (34): 1.1 Trang chủ / Homepage, 1.2 Đăng nhập, 1.3 Đăng ký, 1.4 Bảng xếp hạng (Leaderboard), 1.5 Danh sách Giải đấu, 1.6 Chi tiết Giải đấu, 1.7 Danh sách Cộng đồng, 1.8 Chi tiết Cộng đồng (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (30): 🛠️ 9 Kỹ Năng Cốt Lõi Frontend (Tech Skills Map), 🚫 Công Nghệ KHÔNG ĐƯỢC Dùng (Cấm), Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án? (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (14): paymentsApi, AdminPayoutsReview(), OrganizerPayoutsPage(), PayoutFormValues, payoutSchema, PaymentDetails, ResultContent(), AdminTransactionsList() (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (27): Admin Dashboard, 🛡️ ADMIN PAGES (Role ADMIN), Chat, 📄 Chi Tiết Các Trang (Pages Specification), Chi tiết giải đấu, Communities, Danh sách giải đấu, Dashboard (+19 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (29): Step1Info(), Step2Confirm(), BRACKET_TYPE_OPTIONS, FORMAT_OPTIONS, Step2FormatMulti(), Step2Format(), Step2FormInput, step2Schema (+21 more)

### Community 18 - "Community 18"
Cohesion: 0.36
Nodes (7): useLiveMatch(), matchesApi, PaginationMeta, LiveMatchPage(), Props, Match, MatchScore

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (31): 1.1 Design System & Components, 1.2 Layout Components, 1.3 Auth Feature (`features/auth/`), 1.4 Profile Feature (`features/auth/` mở rộng), 2.1 Tournaments Feature (`features/tournaments/`), 2.2 Matches & Live Score Feature (`features/matches/`), 2.3 ELO & Leaderboard Feature (`features/elo/`), 2.4 Communities Feature (`features/communities/`) (+23 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (22): 1. API Communication, 2. Authentication Flow, 3. Cấu trúc File trong mỗi Feature, 4. Component Convention, 5. Styling Convention, 6. Environment Variables, 7. Error Handling, 8. HTTP Status Handling (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (18): 🎯 Design System, 📄 PROMPT 10 — Thanh toán, 📄 PROMPT 11 — Tin nhắn, 📄 PROMPT 12 — Thông báo, 📄 PROMPT 13 — Admin Dashboard, 📄 PROMPT 14 — Form Tạo Giải đấu (Wizard), 📄 PROMPT 15 — Component Library, 📄 PROMPT 1 — Layout chính (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (17): 1. Quy tắc cho AI Agent 🤖, 2. Quy tắc Viết Code (Code Convention), 3. Quy tắc Component, 4. Quy trình Git (Git Workflow), 5. Quy tắc Performance, 6. Quy tắc Accessibility (a11y), Branches, Bắt buộc: (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (16): 🎯 DESIGN SYSTEM (Paste vào đầu mỗi session), PROMPT 10: Profile cá nhân, PROMPT 11: Chat, PROMPT 12: Admin Dashboard, PROMPT 13: Form Tạo Giải đấu (Wizard), PROMPT 1: Component Library, PROMPT 2: Layout (Header + Footer), PROMPT 3: Auth (Login + Register) (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (14): 10. Chat Types (`types/chat.ts`), 11. Social Types (`types/social.ts`), 1. API Types (`types/api.ts`), 2. User Types (`types/user.ts`), 3. Tournament Types (`types/tournament.ts`), 4. Match Types (`types/match.ts`), 5. ELO Types (`types/elo.ts`), 6. Community Types (`types/community.ts`) (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (13): 1. Tầm nhìn (Vision), 2. Đối tượng & Giao diện tương ứng, 3. Tính năng theo nhóm, 4. Kiến trúc tổng thể, 5. Tài liệu liên quan, 🟢 Nhóm 1 — Authentication & Profile, 🟡 Nhóm 2 — Giải đấu & Trận đấu, 🔴 Nhóm 3 — ELO & Xếp hạng (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (12): 1. Auth & Users (Phase 1), 2. Giải đấu & Trận đấu (Phase 2), 3. Thanh toán (Phase 3), 4. Tương tác cộng đồng (Phase 4), Categories & Communities, Chat, Friendships, Matches & Live Score (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (11): 1. Cấu Trúc Thư Mục Tiêu Chuẩn (Directory Structure), 2. Phân Tích Mô Hình 3 Tầng (3-Layer Architecture), 3. Chiến Lược Rendering (Rendering Strategies), 4.1 REST API Flow (Đa số trang), 4.2 Real-time Flow (Live Score & Chat), 4. Luồng Dữ Liệu (Data Flow), 5. Tài Liệu Liên Quan, Deep-dive: Cấu trúc bên trong mỗi Feature (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): API, CÔNG NGHỆ, CẤM, CẤU TRÚC FEATURE, CẤU TRÚC THƯ MỤC, NAMING, QUY TẮC BẮT BUỘC — Frontend Quản Lý Giải Đấu, RENDERING (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (8): 🔗 BACKEND INFO, ❌ Chưa làm (theo plan.md):, 📖 HƯỚNG DẪN ĐỌC TÀI LIỆU (BẮT BUỘC), 🚀 MASTER PROMPT — Frontend Quản Lý Giải Đấu, ⚡ QUY TẮC VÀNG (GOLDEN RULES), 🏗️ TECH STACK, 🎯 TRẠNG THÁI HIỆN TẠI (Current State), ✅ Đã hoàn thành:

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): 10. HTTP Error Handling (Frontend), 5. VENUES (`/venues`), 📡 API Contract — Frontend ↔ Backend, Base Configuration, `GET /venues`, `GET /venues/:id`, Response Wrapper (Mọi API đều trả về format này)

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (8): 4. COMMUNITIES (`/communities`), `GET /communities`, `GET /communities/:id`, `GET /communities/:id/members`, `PATCH /communities/:id`, `PATCH /communities/:id/review`, `POST /communities`, `POST /communities/:id/members`

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (7): 1. AUTH (`/auth`), `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/register`

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (7): 6. TOURNAMENTS (`/tournaments`), `GET /tournaments`, `GET /tournaments/:id`, `PATCH /tournaments/:id`, `POST /tournaments`, `POST /tournaments/:id/generate-bracket`, `POST /tournaments/:id/register`

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (6): 2. USERS (`/users`), `GET /users`, `GET /users/:id`, `GET /users/profile`, `PATCH /users/change-password`, `PATCH /users/profile`

### Community 35 - "Community 35"
Cohesion: 0.40
Nodes (5): 7. MATCHES (`/matches`), `GET /matches`, `GET /matches/:id`, `PATCH /matches/:id/score`, `PATCH /matches/:id/status`

### Community 36 - "Community 36"
Cohesion: 0.40
Nodes (5): 9. WEBSOCKET EVENTS, Authentication cho WebSocket:, Chat (`ws://localhost:3000/chat`), Live Score (`ws://localhost:3000/live`), Notifications (`ws://localhost:3000/notifications`)

### Community 37 - "Community 37"
Cohesion: 0.40
Nodes (4): 1. Player Pages (Cần đăng nhập), 2. Organizer Pages (Dành cho Ban tổ chức), 3. Admin Pages (Dành cho Quản trị viên), Danh Sách Các Trang Còn Thiếu (Missing Pages)

### Community 38 - "Community 38"
Cohesion: 0.04
Nodes (44): 10. Verification Checklist, 1.1 Bài Toán & Triết Lý Thiết Kế (Loosely-Coupled Design), 1.2 Phạm Vi, 1.3 Sơ Đồ Kiến Trúc Tổng Thể, 1. Tổng Quan Sản Phẩm, 2.1 Bảng Mới — Backend Drizzle Schema, 2.2 Cấu Trúc JSONB `rules`, 2. Database Schema (+36 more)

### Community 39 - "Community 39"
Cohesion: 0.50
Nodes (3): APP_CONFIG, DATE_FORMATS, ERROR_CODES

### Community 40 - "Community 40"
Cohesion: 0.50
Nodes (4): 3. CATEGORIES (`/categories`), `GET /categories`, `GET /categories/:id`, `GET /categories/:id/elo-tiers`

### Community 41 - "Community 41"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 42 - "Community 42"
Cohesion: 0.07
Nodes (28): 1.1 Setting Visibility trong Manage Page, 1.2 Trang Đăng Ký Qua Invite Link, 1.3 Auth Redirect Flow, 2.1 Component DoublesRegistrationFlow, 2.2 Trang Join Team (Partner), 2.3 Rút Lui (Withdraw), 3.1 Tournament Card — Hiển thị đầy đủ thông tin, 3.2 Filter Bar Nâng Cấp (+20 more)

### Community 46 - "Community 46"
Cohesion: 0.06
Nodes (34): 1.1 Tổng Quan Chuỗi Giải, 1.2 Dữ Liệu Thực Tế Từ Baseline.vn, 1.3 Cấu Trúc Nội Dung Chi Tiết Một Giải, 1. Bối Cảnh Thực Tế — "Đường Đến Superstars Cup", 2.1 Cấu Trúc Baseline.vn, 2.2 Phân Tích Player Ratings, 2.3 Phân Tích Clubs, 2.4 Điểm Yếu Cần Baseline Chưa Giải Quyết Mà Dự Án Ta Có Thể Làm Tốt Hơn (+26 more)

### Community 47 - "Community 47"
Cohesion: 0.09
Nodes (21): 10. EloTierBadge Component, 11. Leaderboard Page Nâng Cấp, 12. Region Filtering, 1. Tournament Card Nâng Cấp, 2. Filter Bar Nâng Cấp (trang /tournaments), 3. Visibility Setting trong Manage Page, 4. Trang Đăng Ký Qua Invite Link, 5. Login Redirect Flow (+13 more)

### Community 49 - "Community 49"
Cohesion: 0.19
Nodes (9): CheckoutContent(), JoinTournamentPage(), RegisterFormValues, registerSchema, JoinTeamPage(), TournamentRegisterPage(), tournamentsApi, formatCurrency() (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (7): Brand & Style, Colors, Components, Elevation & Depth, Layout & Spacing, Shapes, Typography

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (7): Brand & Style, Colors, Components, Elevation & Depth, Layout & Spacing, Shapes, Typography

### Community 52 - "Community 52"
Cohesion: 0.14
Nodes (20): Step4ReviewSubmit(), Props, Court, Venue, CreateDivisionInput, Division, divisionsApi, TournamentFeesConfig (+12 more)

### Community 53 - "Community 53"
Cohesion: 0.05
Nodes (63): SeriesCard(), SeriesCardProps, SeriesOverviewTab(), SeriesOverviewTabProps, SeriesRulesTab(), SeriesRulesTabProps, SeriesScheduleTab(), SeriesScheduleTabProps (+55 more)

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (5): EditorJSAPI, EditorJSBlock, EditorJSData, EditorJSUploaderResponse, RichTextEditorProps

### Community 55 - "Community 55"
Cohesion: 0.14
Nodes (14): bracketHeight(), bracketWidth(), buildMatchesByRound(), buildPosMap(), calculateStandings(), DoubleElimView(), LOWER_SET, MatchPos (+6 more)

### Community 56 - "Community 56"
Cohesion: 0.10
Nodes (20): 1.1 Bối cảnh từ Baseline.vn (Chuỗi "Đường Đến Superstars Cup"), 1.2 Những điểm yếu trên Web của Baseline.vn & Cơ hội nâng cấp, 1.3 Mô hình Cải tiến của chúng ta (Unified Parent-Child Model), 1. Nghiên cứu thực tế và Đối chiếu Mô hình: Baseline.vn vs Hệ thống của chúng ta, 2.1 Cập nhật Định nghĩa các Bảng (Drizzle Schema Typescript), 2. Thiết kế Cơ sở Dữ liệu chi tiết (Detailed Database Schema), 3.1 Cấu trúc cấu hình Vòng đấu (`match_settings` trong `tournament_stages`), 3.2 Logic áp dụng khi cập nhật Tỷ số trận đấu (Match Scoring Algorithm) (+12 more)

### Community 57 - "Community 57"
Cohesion: 0.52
Nodes (4): chatApi, ChatPage(), ChatConversation, ChatMessage

### Community 59 - "Community 59"
Cohesion: 0.13
Nodes (14): 1. Phân tích Hiện trạng & Nghiên cứu Bất cập (Inconsistencies), 2.1 Backend (Dịch vụ Giải đấu - NestJS), 2.2 Frontend (Trang chi tiết giải đấu công khai - Next.js), 2. Kế hoạch Giải pháp Kỹ thuật & Luồng Dữ liệu (Proposed Implementation), 3. Kịch bản Kiểm thử & Xác minh (Verification Plan), A. Kiểm thử Cascade Soft Delete, A. Ràng buộc quan hệ Parent - Child dưới Database, B. Kiểm thử Dynamic Tab Filtering (+6 more)

### Community 60 - "Community 60"
Cohesion: 0.17
Nodes (7): challengesApi, CommunityChallenge, api, AxiosInstance, UserItem, RegisterForm, registerSchema

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (3): 8. RANKINGS (`/rankings`), `GET /rankings`, `POST /rankings/update-elo`

### Community 62 - "Community 62"
Cohesion: 0.31
Nodes (6): inter, metadata, Footer(), Header(), PageTransition(), PageTransitionProps

### Community 63 - "Community 63"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, type (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (9): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.29
Nodes (7): NotificationResponse, useSocket(), SOCKET_URL, Notification, notificationsApi, isHttpStatusError(), isNetworkError()

### Community 68 - "Community 68"
Cohesion: 0.38
Nodes (6): CommonTreeProps, DoubleEliminationBracketProps, MatchComponentProps, MatchType, ParticipantType, SingleEliminationBracketProps

### Community 69 - "Community 69"
Cohesion: 0.33
Nodes (3): Match, PublicProfile, UserRank

### Community 70 - "Community 70"
Cohesion: 0.33
Nodes (4): ReporterInfo, ReportItem, TargetTournamentInfo, TargetUserInfo

### Community 71 - "Community 71"
Cohesion: 0.33
Nodes (5): content, endIdx, fs, path, startIdx

### Community 73 - "Community 73"
Cohesion: 0.40
Nodes (3): ChartRow, MetricItem, Metrics

### Community 74 - "Community 74"
Cohesion: 0.40
Nodes (3): config, GUEST_ROUTES, PROTECTED_ROUTES

### Community 75 - "Community 75"
Cohesion: 0.16
Nodes (9): step1Schema, Step1Values, SystemConfig, CreatorInfo, TournamentItem, ApiResponse, PaginatedResponse, Venue (+1 more)

### Community 76 - "Community 76"
Cohesion: 0.16
Nodes (14): DoublesRegistrationFlow(), Props, Props, RegisterFormValues, RegisterModal(), registerSchema, RegisterFormValues, registerSchema (+6 more)

### Community 77 - "Community 77"
Cohesion: 0.22
Nodes (9): HomePage(), EditProfilePage(), PasswordFormValues, passwordSchema, ProfileFormValues, profileSchema, getButtonClasses(), Textarea (+1 more)

### Community 78 - "Community 78"
Cohesion: 0.15
Nodes (10): authApi, LoginFormValues, loginSchema, RegisterFormValues, registerSchema, LoginForm, LoginPage(), loginSchema (+2 more)

## Knowledge Gaps
- **594 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+589 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 53` to `Community 0`, `Community 65`, `Community 1`, `Community 10`, `Community 77`, `Community 60`, `Community 62`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `api` connect `Community 60` to `Community 1`, `Community 2`, `Community 65`, `Community 5`, `Community 70`, `Community 69`, `Community 8`, `Community 73`, `Community 75`, `Community 76`, `Community 78`, `Community 48`, `Community 18`, `Community 52`, `Community 53`, `Community 57`, `Community 58`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Community 0` to `Community 1`, `Community 65`, `Community 8`, `Community 76`, `Community 77`, `Community 78`, `Community 48`, `Community 49`, `Community 18`, `Community 52`, `Community 53`, `Community 57`, `Community 60`, `Community 62`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `useAuthStore` (e.g. with `CreateCommunityPage()` and `CommunityDetailPage()`) actually correct?**
  _`useAuthStore` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _594 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07052631578947369 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._