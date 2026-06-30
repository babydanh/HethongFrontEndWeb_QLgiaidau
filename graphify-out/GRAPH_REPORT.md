# Graph Report - frontend-web_qlgiaidau  (2026-06-30)

## Corpus Check
- 214 files · ~599,528 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1104 nodes · 2957 edges · 69 communities (60 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

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
- [[_COMMUNITY_Community 17|Community 17]]
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
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]

## God Nodes (most connected - your core abstractions)
1. `Button` - 63 edges
2. `useAuthStore` - 57 edges
3. `Tournament` - 52 edges
4. `cn()` - 41 edges
5. `api` - 39 edges
6. `getErrorMessage()` - 38 edges
7. `Input` - 35 edges
8. `Category` - 32 edges
9. `tournamentsApi` - 30 edges
10. `formatDate()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `CommunityDetailPage()` --calls--> `useAuthStore`  [INFERRED]
  src/app/(public)/communities/[id]/page.tsx → src/lib/zustand/authStore.ts
- `PublicUserProfilePage()` --calls--> `formatDate()`  [INFERRED]
  src/app/(public)/users/[id]/page.tsx → src/utils/format.ts
- `AdminPayoutsReview()` --calls--> `formatCurrency()`  [INFERRED]
  src/app/admin/payouts/page.tsx → src/utils/format.ts
- `OrganizerSeriesPage()` --calls--> `useAuthStore`  [INFERRED]
  src/app/organizer/series/page.tsx → src/lib/zustand/authStore.ts
- `ChatPage()` --calls--> `useAuthStore`  [EXTRACTED]
  src/app/(player)/chat/page.tsx → src/lib/zustand/authStore.ts

## Import Cycles
- 1-file cycle: `src/app/organizer/tournaments/[id]/manage/components/BracketTab.tsx -> src/app/organizer/tournaments/[id]/manage/components/BracketTab.tsx`

## Communities (69 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (81): OperationsWorkspace(), OperationsWorkspaceProps, OpsActivity(), OpsActivityProps, OpsDisputes(), OpsDisputesProps, MatchBucket, MatchInsight (+73 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (44): HomePage(), categoriesApi, communitiesApi, CommunityMemberRecord, CommunityRankingRecord, GalleryImage, JoinRequest, GalleryImage (+36 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (23): Court, TournamentReferee, Venue, buildDefaultSportRules(), DEFAULT_SPORT_RULES, buildSportRulesPayload(), buildStageRoundConfigPayload(), buildStageRoundRulePayload() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (33): dependencies, axios, bracketry, clsx, @editorjs/editorjs, @editorjs/header, @editorjs/image, @editorjs/list (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (29): 1. Overview, 2. Participants, 3. Matches, 4. Incidents, 5. Finance, Backend Placement, Case A: Replace one player before registration lock, Case B: Replace one player after bracket generation but before first match (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (14): useSocket(), GUEST_ROUTES, Header(), DEFAULT_NOTIFICATION_META, NOTIFICATION_TYPE_LABELS, NOTIFICATION_TYPE_META, NotificationTypeMeta, NotificationFilter (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (30): 🛠️ 9 Kỹ Năng Cốt Lõi Frontend (Tech Skills Map), 🚫 Công Nghệ KHÔNG ĐƯỢC Dùng (Cấm), Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án? (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.27
Nodes (6): chatApi, ChatPage(), SOCKET_URL, SocketAuthPayload, ChatConversation, ChatMessage

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (20): BasicInfoTab(), BasicInfoTabProps, FinanceTab(), PermissionsTab(), PermissionsTabProps, Referee, RefereesTabProps, RegistrationTab() (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (23): ChangeRequest, Step1Info(), step1Schema, Step1Values, Step2Confirm(), Step3ScheduleFees(), step3Schema, Step3Values (+15 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (16): CheckoutContent(), DoublesRegistrationFlow(), Props, JoinTeamPage(), GATEWAY_INFO, MockGatewayContent(), PaymentsPage(), OrganizerPayoutsPage() (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (26): NotFound(), FinanceTabProps, Props, OverviewTab(), Props, Props, TournamentStepper(), TournamentStepperProps (+18 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (22): 1. API Communication, 2. Authentication Flow, 3. Cấu trúc File trong mỗi Feature, 4. Component Convention, 5. Styling Convention, 6. Environment Variables, 7. Error Handling, 8. HTTP Status Handling (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (10): getMatchByIndex(), isSlotBye(), isSlotByeGrandFinals(), isSlotByeLosers(), isSlotByeMain(), isSrcWinnerless(), miniStandings(), tiebreakerSort() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (17): 1. Quy tắc cho AI Agent 🤖, 2. Quy tắc Viết Code (Code Convention), 3. Quy tắc Component, 4. Quy trình Git (Git Workflow), 5. Quy tắc Performance, 6. Quy tắc Accessibility (a11y), Branches, Bắt buộc: (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (9): notificationsApi, NotificationItem, NotificationListResponse, NotificationListResult, NotificationListState, NotificationMutationResponse, NotificationNavigationTarget, NotificationQueryParams (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (14): 10. Chat Types (`types/chat.ts`), 11. Social Types (`types/social.ts`), 1. API Types (`types/api.ts`), 2. User Types (`types/user.ts`), 3. Tournament Types (`types/tournament.ts`), 4. Match Types (`types/match.ts`), 5. ELO Types (`types/elo.ts`), 6. Community Types (`types/community.ts`) (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (9): getDivisionBracketLabel(), getDivisionMatchLabel(), NormalizableDivision, normalizeGenderValue(), RegisterFormValues, TournamentRegisterPage(), WithdrawModal(), WithdrawModalProps (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.50
Nodes (7): asRecord(), inferSportRuleKindFromCategory(), isRecord(), normalizeKind(), readBoolean(), readNumber(), resolveSportRuleView()

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (11): 1. Cấu Trúc Thư Mục Tiêu Chuẩn (Directory Structure), 2. Phân Tích Mô Hình 3 Tầng (3-Layer Architecture), 3. Chiến Lược Rendering (Rendering Strategies), 4.1 REST API Flow (Đa số trang), 4.2 Real-time Flow (Live Score & Chat), 4. Luồng Dữ Liệu (Data Flow), 5. Tài Liệu Liên Quan, Deep-dive: Cấu trúc bên trong mỗi Feature (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): API, CÔNG NGHỆ, CẤM, CẤU TRÚC FEATURE, CẤU TRÚC THƯ MỤC, NAMING, QUY TẮC BẮT BUỘC — Frontend Quản Lý Giải Đấu, RENDERING (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.62
Nodes (5): calculateStandings(), RoundRobinView(), buildMatchRuleSummary(), getBracketStatLabels(), resolveBracketMatchRules()

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
Cohesion: 0.12
Nodes (13): authApi, LoginFormValues, loginSchema, RegisterFormValues, registerSchema, PasswordFormValues, passwordSchema, ProfileFormValues (+5 more)

### Community 38 - "Community 38"
Cohesion: 0.50
Nodes (3): CreatorInfo, TournamentDetail, TournamentItem

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
Cohesion: 0.18
Nodes (12): AboutTab(), GalleryImage, TournamentDetailClient(), getDivisionBracketLabel(), getDivisionMatchLabel(), JoinTournamentPage(), RegisterFormValues, registerSchema (+4 more)

### Community 44 - "Community 44"
Cohesion: 0.16
Nodes (19): BracketTabProps, ConfigTab(), ConfigTabProps, ScheduleTabProps, BRACKET_TYPE_OPTIONS, Step2FormatMulti(), getSportRuleKind(), getSportRulePresentation() (+11 more)

### Community 48 - "Community 48"
Cohesion: 0.06
Nodes (57): SeriesCard(), SeriesCardProps, SeriesOverviewTab(), SeriesOverviewTabProps, SeriesRulesTab(), SeriesRulesTabProps, SeriesScheduleTab(), SeriesScheduleTabProps (+49 more)

### Community 49 - "Community 49"
Cohesion: 0.23
Nodes (12): Step2Format(), Step2FormInput, step2Schema, ResolvedSportRuleView, getAllowedSportRuleKinds(), isRecord(), isSportRuleKind(), normalizeSportRuleKindForCategory() (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (7): Brand & Style, Colors, Components, Elevation & Depth, Layout & Spacing, Shapes, Typography

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (7): Brand & Style, Colors, Components, Elevation & Depth, Layout & Spacing, Shapes, Typography

### Community 52 - "Community 52"
Cohesion: 0.26
Nodes (7): inter, metadata, Footer(), PageTransition(), PageTransitionProps, RootLayoutClient(), Toaster()

### Community 53 - "Community 53"
Cohesion: 0.28
Nodes (7): Props, RegisterFormValues, RegisterModal(), registerSchema, capitalizeFirstLetter(), trimAndNormalizeSpaces(), trimSpaces()

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (3): 8. RANKINGS (`/rankings`), `GET /rankings`, `POST /rankings/update-elo`

### Community 55 - "Community 55"
Cohesion: 0.18
Nodes (23): DoubleElimView(), Props, buildMatchesByRound(), getRoundLabel(), getMaxColumns(), MatchCard(), Props, Props (+15 more)

### Community 59 - "Community 59"
Cohesion: 0.23
Nodes (9): AdminLayout(), CommunitiesPage(), CreateCommunityPage(), DashboardPage(), OrganizerLayout(), RouteGuard(), RouteGuardProps, VerifyEmailContent() (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.12
Nodes (13): challengesApi, CommunityChallenge, SystemConfig, api, UserItem, Message, QUICK_PROMPTS, ApiResponse (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.33
Nodes (4): HIGHLIGHTS, RegisterForm, STATS, registerSchema

### Community 62 - "Community 62"
Cohesion: 0.15
Nodes (19): bindNotificationSocket(), DEFAULT_NOTIFICATION_STATE, emitNotificationStore(), fetchNotifications(), getSocketAccessToken(), markAllNotificationsAsRead(), markAllNotificationsReadInState(), markNotificationAsRead() (+11 more)

### Community 63 - "Community 63"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, type (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (9): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+1 more)

### Community 66 - "Community 66"
Cohesion: 0.14
Nodes (5): ChartRow, MetricItem, Metrics, AxiosInstance, UpdateProfileDto

### Community 68 - "Community 68"
Cohesion: 0.38
Nodes (6): CommonTreeProps, DoubleEliminationBracketProps, MatchComponentProps, MatchType, ParticipantType, SingleEliminationBracketProps

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (6): HIGHLIGHTS, LoginForm, LoginPage(), LoginResponse, loginSchema, STATS

### Community 70 - "Community 70"
Cohesion: 0.33
Nodes (4): ReporterInfo, ReportItem, TargetTournamentInfo, TargetUserInfo

### Community 74 - "Community 74"
Cohesion: 0.40
Nodes (3): config, GUEST_ROUTES, PROTECTED_ROUTES

### Community 75 - "Community 75"
Cohesion: 0.25
Nodes (10): paymentsApi, AdminPayoutsReview(), PayoutRequestWithOrganizer, PaymentDetails, PaymentWithUser, CreatePaymentDto, Payment, PaymentHistoryStats (+2 more)

## Knowledge Gaps
- **403 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+398 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `Community 59` to `Community 0`, `Community 1`, `Community 66`, `Community 37`, `Community 6`, `Community 69`, `Community 8`, `Community 42`, `Community 75`, `Community 48`, `Community 17`, `Community 19`, `Community 52`, `Community 53`, `Community 25`, `Community 62`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Button` connect `Community 10` to `Community 0`, `Community 1`, `Community 37`, `Community 6`, `Community 69`, `Community 9`, `Community 42`, `Community 75`, `Community 44`, `Community 46`, `Community 47`, `Community 48`, `Community 17`, `Community 49`, `Community 19`, `Community 53`, `Community 25`, `Community 61`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 48` to `Community 0`, `Community 1`, `Community 6`, `Community 9`, `Community 10`, `Community 44`, `Community 25`, `Community 59`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `useAuthStore` (e.g. with `CreateCommunityPage()` and `CommunityDetailPage()`) actually correct?**
  _`useAuthStore` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _403 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.052019044260271555 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._