# Graph Report - frontend-web_qlgiaidau  (2026-07-16)

## Corpus Check
- 258 files · ~404,779 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1396 nodes · 4027 edges · 86 communities (80 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a11fb4a`
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
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 85|Community 85]]

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 77 edges
2. `Button` - 70 edges
3. `cn()` - 67 edges
4. `Tournament` - 60 edges
5. `getErrorMessage()` - 50 edges
6. `api` - 43 edges
7. `Input` - 36 edges
8. `tournamentsApi` - 36 edges
9. `Category` - 33 edges
10. `Match` - 29 edges

## Surprising Connections (you probably didn't know these)
- `CommunityDetailPage()` --calls--> `useAuthStore`  [INFERRED]
  src/app/(public)/communities/[id]/page.tsx → src/lib/zustand/authStore.ts
- `CreateCommunityPage()` --calls--> `useAuthStore`  [INFERRED]
  src/app/(public)/communities/create/page.tsx → src/lib/zustand/authStore.ts
- `TournamentsListPage()` --calls--> `useAuthStore`  [INFERRED]
  src/app/(public)/tournaments/page.tsx → src/lib/zustand/authStore.ts
- `AdminChangeRequestsPage()` --calls--> `useAuthStore`  [INFERRED]
  src/app/admin/change-requests/page.tsx → src/lib/zustand/authStore.ts
- `AdminPayoutsReview()` --calls--> `formatCurrency()`  [INFERRED]
  src/app/admin/payouts/page.tsx → src/utils/format.ts

## Import Cycles
- 1-file cycle: `src/app/organizer/tournaments/[id]/manage/components/BracketTab.tsx -> src/app/organizer/tournaments/[id]/manage/components/BracketTab.tsx`
- 1-file cycle: `src/app/moderation/change-requests/page.tsx -> src/app/moderation/change-requests/page.tsx`
- 1-file cycle: `src/app/moderation/communities/page.tsx -> src/app/moderation/communities/page.tsx`
- 1-file cycle: `src/app/moderation/disputes/page.tsx -> src/app/moderation/disputes/page.tsx`
- 1-file cycle: `src/app/moderation/reports/page.tsx -> src/app/moderation/reports/page.tsx`
- 1-file cycle: `src/app/moderation/tournaments/page.tsx -> src/app/moderation/tournaments/page.tsx`
- 1-file cycle: `src/app/moderation/verification/page.tsx -> src/app/moderation/verification/page.tsx`

## Communities (86 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (41): SeriesCard(), SeriesCardProps, SeriesOverviewTab(), SeriesOverviewTabProps, SeriesRulesTab(), SeriesRulesTabProps, SeriesScheduleTab(), SeriesScheduleTabProps (+33 more)

### Community 1 - "Community 1"
Cohesion: 0.20
Nodes (12): OfficialScoreModalProps, PermissionsTab(), PermissionsTabProps, refereeStatusMeta, roleMap, StaffMember, TournamentReferee, ModalContent (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.23
Nodes (9): getDivisionBracketLabel(), getDivisionMatchLabel(), NormalizableDivision, normalizeGenderValue(), RegisterFormValues, TournamentRegisterPage(), WithdrawModal(), WithdrawModalProps (+1 more)

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
Cohesion: 0.23
Nodes (5): AdminChangeRequestsPage(), UpdateProfileDto, UserChangeRequest, UserProfile, RawUserProfileResponse

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (30): 🛠️ 9 Kỹ Năng Cốt Lõi Frontend (Tech Skills Map), 🚫 Công Nghệ KHÔNG ĐƯỢC Dùng (Cấm), Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án?, Dùng ở đâu trong dự án? (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (45): bindNotificationSocket(), DEFAULT_NOTIFICATION_STATE, emitNotificationStore(), fetchNotifications(), getSocketAccessToken(), markAllNotificationsAsRead(), markAllNotificationsReadInState(), markNotificationAsRead() (+37 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (13): inter, metadata, HomePage(), EditProfilePage(), useSocket(), Footer(), GUEST_ROUTES, Header() (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (15): LiveMatchControlPanel(), useLiveMatch(), awardTennisPoint(), buildPenaltyPresets(), createTennisLivePointState(), formatTennisPointDisplay(), isTennisPointStateEmpty(), readPenaltyLog() (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (15): PenaltyPanel(), PenaltyPanelProps, PenaltyTeamSelection, BADMINTON_SCHEMA, DEFAULT_SCHEMA, getPenaltySchema(), PenaltyActionSchema, PenaltyCardStyle (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (27): CommunityLogoAvatar(), LiveMatchSportLabel(), MatchBucket, OPERATION_OPTIONS, OperationDraft, OpsMatches(), ScheduleDraft, STATUS_FILTERS (+19 more)

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (5): Props, Props, TournamentStepperProps, ParentWithDivisions, Tournament

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (22): 1. API Communication, 2. Authentication Flow, 3. Cấu trúc File trong mỗi Feature, 4. Component Convention, 5. Styling Convention, 6. Environment Variables, 7. Error Handling, 8. HTTP Status Handling (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (25): BadmintonOfficialPanel(), BadmintonOfficialPanelProps, LiveMatchControlPanelProps, OfficialScoreModal(), PickleballOfficialPanel(), PickleballOfficialPanelProps, RallyScoreControls(), RallyScoreControlsProps (+17 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (17): 1. Quy tắc cho AI Agent 🤖, 2. Quy tắc Viết Code (Code Convention), 3. Quy tắc Component, 4. Quy trình Git (Git Workflow), 5. Quy tắc Performance, 6. Quy tắc Accessibility (a11y), Branches, Bắt buộc: (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.27
Nodes (13): OperationsWorkspaceProps, OpsActivity(), OpsActivityProps, OpsMatchesProps, UseOrganizerOpsOptions, UseOrganizerOpsResult, MatchOperationInput, MatchScheduleInput (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (14): 10. Chat Types (`types/chat.ts`), 11. Social Types (`types/social.ts`), 1. API Types (`types/api.ts`), 2. User Types (`types/user.ts`), 3. Tournament Types (`types/tournament.ts`), 4. Match Types (`types/match.ts`), 5. ELO Types (`types/elo.ts`), 6. Community Types (`types/community.ts`) (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (13): AdminLayout(), LiveMetricsWidget(), Metrics, AdminDisputesPage(), LoginPage(), menuItems, ModerationLayout(), OrganizerLayout() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (9): DoublesRegistrationFlow(), Props, RegistrationParticipant, MyRegistrationParticipant, getRegistrationModeUi(), REGISTRATION_MODE_UI, RegistrationMode, RegistrationModeUi (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (11): 1. Cấu Trúc Thư Mục Tiêu Chuẩn (Directory Structure), 2. Phân Tích Mô Hình 3 Tầng (3-Layer Architecture), 3. Chiến Lược Rendering (Rendering Strategies), 4.1 REST API Flow (Đa số trang), 4.2 Real-time Flow (Live Score & Chat), 4. Luồng Dữ Liệu (Data Flow), 5. Tài Liệu Liên Quan, Deep-dive: Cấu trúc bên trong mỗi Feature (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): API, CÔNG NGHỆ, CẤM, CẤU TRÚC FEATURE, CẤU TRÚC THƯ MỤC, NAMING, QUY TẮC BẮT BUỘC — Frontend Quản Lý Giải Đấu, RENDERING (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.27
Nodes (6): chatApi, ChatPage(), SOCKET_URL, SocketAuthPayload, ChatConversation, ChatMessage

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): 10. HTTP Error Handling (Frontend), 8. RANKINGS (`/rankings`), 📡 API Contract — Frontend ↔ Backend, Base Configuration, `GET /rankings`, `POST /rankings/update-elo`, Response Wrapper (Mọi API đều trả về format này)

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
Cohesion: 0.16
Nodes (14): Step1Info(), Step3ScheduleFees(), step3Schema, Step3Values, step3Schema, Step3Values, Step3Venue(), CreateTournamentPayload (+6 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (20): Court, TournamentReferee, Venue, buildDefaultSportRules(), DEFAULT_SPORT_RULES, asRecord(), inferSportRuleKindFromCategory(), isRecord() (+12 more)

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
Cohesion: 0.33
Nodes (8): CountdownTimerProps, getParticipantStatusClassName(), getParticipantStatusLabel(), isParticipantApproved(), isParticipantPendingApproval(), isParticipantPendingPartner(), isParticipantReadyForNextStep(), isParticipantWaitlisted()

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (34): ReportFiltersBar(), ReportFiltersBarProps, ReportReviewModal(), ReportReviewModalProps, ReviewAction, ReportStatusBadge(), statusClasses, parseEvidenceUrls() (+26 more)

### Community 46 - "Community 46"
Cohesion: 0.13
Nodes (17): FinanceTabProps, FILTER_OPTIONS, KickDraft, OpsParticipantsProps, ParticipantFilter, RegistrationTabProps, RegisterTournamentResponse, TournamentParticipant (+9 more)

### Community 47 - "Community 47"
Cohesion: 0.08
Nodes (38): ChartRow, MetricItem, Metrics, PendingPayoutSummary, GATEWAY_INFO, MockGatewayContent(), AdminPaymentListRow, AdminPayoutListRow (+30 more)

### Community 48 - "Community 48"
Cohesion: 0.08
Nodes (31): EnrichedMatch, EnrichedTournament, GroupMatchesData, HomepageTournamentCard(), ShareModalProps, Props, buildRoundFilterOptions(), getComparableStageKey() (+23 more)

### Community 49 - "Community 49"
Cohesion: 0.12
Nodes (13): NotFound(), MatchesTab(), Props, RegisterFormValues, RegisterModal(), registerSchema, TournamentDetailPage(), Props (+5 more)

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (15): authApi, LoginFormValues, loginSchema, PasswordFormValues, passwordSchema, ProfileFormValues, profileSchema, HIGHLIGHTS (+7 more)

### Community 51 - "Community 51"
Cohesion: 0.21
Nodes (8): challengesApi, CommunityChallenge, Badge(), BadgeProps, getVariantClasses(), DateTimePicker, Textarea, TextareaProps

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (4): AdminTournamentsPage(), CreatorInfo, TournamentDetail, TournamentItem

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (39): FinanceTab(), TournamentStepper(), DashboardPage(), dateFormatter, dateTimeFormatter, TournamentDetailClient(), TournamentWorkspace, WorkspaceRefereeInvite (+31 more)

### Community 54 - "Community 54"
Cohesion: 0.36
Nodes (8): Step2Format(), Step2FormInput, step2Schema, getAllowedSportRuleKinds(), isRecord(), isSportRuleKind(), normalizeSportRuleKindForCategory(), readAllowedRuleKinds()

### Community 55 - "Community 55"
Cohesion: 0.27
Nodes (12): calculateStandings(), getMatchByIndex(), getRoundLabel(), isSlotBye(), isSlotByeGrandFinals(), isSlotByeLosers(), isSlotByeMain(), isSrcWinnerless() (+4 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (19): CheckoutContent(), Step4ReviewSubmit(), getDivisionBracketLabel(), getDivisionMatchLabel(), JoinTournamentPage(), RegisterFormValues, registerSchema, JoinTeamPage() (+11 more)

### Community 57 - "Community 57"
Cohesion: 0.08
Nodes (23): OverviewTab(), Props, Referee, RefereesTabProps, RegisterFormValues, registerSchema, ScheduleTab(), ScheduleTabProps (+15 more)

### Community 58 - "Community 58"
Cohesion: 0.09
Nodes (21): communitiesApi, CommunityMemberRecord, CommunityRankingRecord, GalleryImage, JoinRequest, CommunitiesPage(), ReviewCommunity, ReviewCommunityStatus (+13 more)

### Community 60 - "Community 60"
Cohesion: 0.12
Nodes (13): SystemConfig, api, AxiosInstance, moderationCards, UserItem, Message, QUICK_PROMPTS, ApiResponse (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (6): LivestreamTab(), LivestreamTabProps, statusLabel, CreatedLivestreamCamera, livestreamApi, LivestreamCamera

### Community 62 - "Community 62"
Cohesion: 0.10
Nodes (22): ReportViolationButton(), Match, PublicProfile, PublicUserProfilePage(), UserRank, LeaderboardSearchResult, AchievementCard, AchievementRank (+14 more)

### Community 63 - "Community 63"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, type (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (9): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.14
Nodes (18): step1Schema, Step1Values, BRACKET_TYPE_OPTIONS, Step2FormatMulti(), ALL_MATCH_FORMAT_OPTIONS, getAllowedMatchFormatOptions(), isRecord(), MatchFormatOptionValue (+10 more)

### Community 66 - "Community 66"
Cohesion: 0.38
Nodes (5): AboutTab(), GalleryImage, MapView(), MapViewProps, formatDate()

### Community 67 - "Community 67"
Cohesion: 0.11
Nodes (15): categoriesApi, JoinRequest, UserSearchResult, CreateCommunityFormValues, CreateCommunityPage(), createCommunitySchema, regionsApi, Region (+7 more)

### Community 68 - "Community 68"
Cohesion: 0.38
Nodes (6): CommonTreeProps, DoubleEliminationBracketProps, MatchComponentProps, MatchType, ParticipantType, SingleEliminationBracketProps

### Community 72 - "Community 72"
Cohesion: 0.13
Nodes (18): BasicInfoTab(), OperationsWorkspace(), cards, OpsOverview(), OpsOverviewProps, OpsParticipants(), RegistrationTab(), useManageState() (+10 more)

### Community 73 - "Community 73"
Cohesion: 0.14
Nodes (18): StatusFilter, TennisOfficialPanelProps, matchesApi, PaginationMeta, TennisPointUpdateResult, EnrichedMatch, EnrichedParticipant, EnrichedTournament (+10 more)

### Community 74 - "Community 74"
Cohesion: 0.40
Nodes (3): config, GUEST_ROUTES, PROTECTED_ROUTES

### Community 75 - "Community 75"
Cohesion: 0.15
Nodes (16): BasicInfoTabProps, Step2Confirm(), CreateDivisionInput, Division, LivestreamPublishInfo, MatchLivestream, MatchPlaybackResponse, MockPaymentPayload (+8 more)

### Community 76 - "Community 76"
Cohesion: 0.16
Nodes (21): RoundRobinView(), buildMatchRuleSummary(), getBracketStatLabels(), resolveBracketMatchRules(), BracketTabProps, ConfigTab(), ConfigTabProps, getSportRuleKind() (+13 more)

### Community 81 - "Community 81"
Cohesion: 0.67
Nodes (3): 5. VENUES (`/venues`), `GET /venues`, `GET /venues/:id`

### Community 85 - "Community 85"
Cohesion: 0.19
Nodes (24): DoubleElimView(), Props, buildMatchesByRound(), getMaxColumns(), MatchCard(), Props, Props, SingleElimView() (+16 more)

## Knowledge Gaps
- **457 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+452 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button` connect `Community 57` to `Community 0`, `Community 1`, `Community 2`, `Community 9`, `Community 10`, `Community 18`, `Community 19`, `Community 21`, `Community 26`, `Community 37`, `Community 42`, `Community 44`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 53`, `Community 54`, `Community 56`, `Community 58`, `Community 61`, `Community 62`, `Community 65`, `Community 67`, `Community 72`, `Community 75`, `Community 76`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 21` to `Community 0`, `Community 1`, `Community 65`, `Community 2`, `Community 8`, `Community 73`, `Community 10`, `Community 9`, `Community 44`, `Community 72`, `Community 46`, `Community 17`, `Community 18`, `Community 51`, `Community 23`, `Community 25`, `Community 62`, `Community 57`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Community 25` to `Community 0`, `Community 2`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 29`, `Community 44`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 52`, `Community 53`, `Community 56`, `Community 57`, `Community 58`, `Community 60`, `Community 62`, `Community 67`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `useAuthStore` (e.g. with `AdminChangeRequestsPage()` and `CreateCommunityPage()`) actually correct?**
  _`useAuthStore` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _457 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07401129943502825 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._