# 📐 Data Types — TypeScript Interfaces (Frontend)

> **Mapping 1:1 với Backend Database Schema + DTOs.**
> AI Agent: Copy các types này vào `src/types/` tương ứng. TUYỆT ĐỐI KHÔNG dùng `any`.

---

## Quy tắc đặt file

```text
src/types/
├── api.ts          # ApiResponse<T>, PaginatedResponse<T>, ApiError
├── user.ts         # User, UserProfile, AuthUser
├── tournament.ts   # Tournament, Stage, Group, Participant, Roster
├── match.ts        # Match, MatchPlayer, ScoreDetails
├── elo.ts          # UserRank, EloTier, EloHistoryLog
├── community.ts    # Community, CommunityMember, CommunitySport
├── venue.ts        # Venue, VenueCourt
├── payment.ts      # Payment, OrganizerPayout
├── chat.ts         # ChatRoom, ChatMessage, ChatRoomMember
├── social.ts       # Friendship, Notification, MatchComment, MatchReaction
└── index.ts        # Re-export tất cả
```

---

## 1. API Types (`types/api.ts`)

```typescript
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: ValidationError[];
  timestamp: string;
  path: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}
```

---

## 2. User Types (`types/user.ts`)

```typescript
export type UserRole = 'PLAYER' | 'ORGANIZER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  isEmailVerified: boolean;
  acceptedTosAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  roles: UserRole[];
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  roles: UserRole[];
}

// DTOs
export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateProfileDto {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
```

---

## 3. Tournament Types (`types/tournament.ts`)

```typescript
export type TournamentStatus = 'UPCOMING' | 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TournamentFormat = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN';

export interface SportRules {
  setsToWin: number;
  pointsPerSet: number;
  winByTwo: boolean;
  [key: string]: unknown;
}

export interface TournamentConfig {
  [key: string]: unknown;
}

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  status: TournamentStatus;
  format: TournamentFormat;
  categoryId: string;
  communityId: string | null;
  createdBy: string;
  sportRules: SportRules;
  tournamentConfig: TournamentConfig;
  entryFee: number;
  platformFeePercentage: number;
  maxParticipants: number | null;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  startDate: string | null;
  endDate: string | null;
  venueId: string | null;
  locationAddress: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // Computed/joined fields (Backend may include)
  _count?: {
    participants: number;
  };
  category?: Category;
  community?: Community;
  venue?: Venue;
}

export interface TournamentStage {
  id: string;
  tournamentId: string;
  name: string;
  type: string;
  order: number;
}

export interface TournamentGroup {
  id: string;
  stageId: string;
  name: string;
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  groupId: string | null;
  registeredBy: string;
  teamName: string;
  seed: number | null;
  points: number;
  isPaid: boolean;
  registeredAt: string;
  roster?: TournamentRoster[];
}

export interface TournamentRoster {
  id: string;
  participantId: string;
  userId: string;
  role: 'MAIN' | 'SUBSTITUTE';
  joinedAt: string;
  user?: UserProfile;
}

export interface GroupStanding {
  id: string;
  groupId: string;
  participantId: string;
  played: number;
  won: number;
  lost: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  totalPoints: number;
  participant?: TournamentParticipant;
}

// DTOs
export interface CreateTournamentDto {
  name: string;
  description?: string;
  categoryId: string;
  communityId?: string;
  format: TournamentFormat;
  sportRules: SportRules;
  tournamentConfig?: TournamentConfig;
  entryFee?: number;
  maxParticipants?: number;
  registrationStartDate?: string;
  registrationEndDate?: string;
  startDate?: string;
  endDate?: string;
  venueId?: string;
}

export interface RegisterTournamentDto {
  teamName: string;
  rosterUserIds?: string[];
}

export interface QueryTournamentDto extends PaginationQuery {
  categoryId?: string;
  status?: TournamentStatus;
  communityId?: string;
}
```

---

## 4. Match Types (`types/match.ts`)

```typescript
export type MatchStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type BracketBranch = 'MAIN' | 'LOSERS';

export interface ScoreDetails {
  [key: string]: unknown;
  // Typical: { p1_score: number, p2_score: number, sets: SetScore[] }
}

export interface Match {
  id: string;
  groupId: string;
  participant1Id: string | null;
  participant2Id: string | null;
  winnerId: string | null;
  status: MatchStatus;
  scoreDetails: ScoreDetails;
  p1SetsWon: number;
  p2SetsWon: number;
  totalSetsPlayed: number;
  roundNumber: number;
  matchOrder: number;
  bracketBranch: BracketBranch;
  isBye: boolean;
  nextMatchId: string | null;
  loserNextMatchId: string | null;
  courtId: string | null;
  refereeId: string | null;
  scoreConfirmedBy: string | null;
  scoreConfirmedAt: string | null;
  matchEvidenceImages: string[];
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  // Joined
  participant1?: TournamentParticipant;
  participant2?: TournamentParticipant;
  court?: VenueCourt;
}

export interface MatchPlayer {
  id: string;
  matchId: string;
  participantId: string;
  userId: string;
  status: 'PLAYED' | 'NO_SHOW' | 'INJURED';
}

export interface MatchComment {
  id: string;
  matchId: string;
  userId: string | null;
  commentText: string;
  parentId: string | null;
  createdAt: string;
  user?: UserProfile;
  replies?: MatchComment[];
}

export interface MatchReaction {
  id: string;
  matchId: string;
  userId: string;
  type: 'LIKE' | 'HIGH_FIVE' | 'FIRE';
  createdAt: string;
}

export interface MatchDispute {
  id: string;
  matchId: string;
  filedBy: string;
  reason: string;
  evidenceUrls: string[];
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
  resolvedBy: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

// DTOs
export interface UpdateMatchScoreDto {
  scoreDetails: ScoreDetails;
  p1SetsWon: number;
  p2SetsWon: number;
}

export interface UpdateMatchStatusDto {
  status: MatchStatus;
  winnerId?: string;
}
```

---

## 5. ELO Types (`types/elo.ts`)

```typescript
export interface EloTier {
  id: string;
  categoryId: string;
  name: string;       // "Low D", "High A"
  minElo: number;
  maxElo: number;
  iconUrl: string | null;
}

export interface UserRank {
  id: string;
  userId: string;
  categoryId: string;
  eloPoints: number;
  tierId: string | null;
  matchesPlayed: number;
  matchesWon: number;
  updatedAt: string;
  // Joined
  user?: UserProfile;
  tier?: EloTier;
  category?: Category;
}

export interface EloHistoryLog {
  id: string;
  userId: string;
  categoryId: string;
  matchId: string | null;
  reason: 'MATCH_WIN' | 'MATCH_LOSS' | 'ADMIN_ADJUSTMENT' | 'SEASON_RESET';
  previousElo: number;
  newElo: number;
  changedPoints: number;
  createdAt: string;
}
```

---

## 6. Community Types (`types/community.ts`)

```typescript
export type CommunityStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type CommunityMemberRole = 'OWNER' | 'MODERATOR' | 'MEMBER';
export type CommunityMemberStatus = 'JOINED' | 'PENDING' | 'BANNED';

export interface Community {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  creatorId: string;
  status: CommunityStatus;
  approvedBy: string | null;
  rejectedReason: string | null;
  reviewedAt: string | null;
  locationAddress: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // Computed
  _count?: {
    members: number;
    tournaments: number;
  };
}

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  joinedAt: string;
  user?: UserProfile;
}

// DTOs
export interface CreateCommunityDto {
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  locationAddress?: string;
  lat?: number;
  lng?: number;
  categoryIds?: string[];
}

export interface QueryCommunityDto extends PaginationQuery {
  status?: CommunityStatus;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}
```

---

## 7. Venue Types (`types/venue.ts`)

```typescript
export interface Venue {
  id: string;
  name: string;
  locationAddress: string;
  imagesUrls: string[];
  createdAt: string;
  deletedAt: string | null;
  courts?: VenueCourt[];
}

export interface VenueCourt {
  id: string;
  venueId: string;
  courtName: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
}
```

---

## 8. Category Types (`types/category.ts`)

```typescript
export interface Category {
  id: string;
  name: string;       // "Pickleball", "Tennis", "Cầu lông"
  slug: string;
  description: string | null;
  categoryConfig: Record<string, unknown>;
}
```

---

## 9. Payment Types (`types/payment.ts`)

```typescript
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'EXPIRED';
export type PayoutStatus = 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';

export interface Payment {
  id: string;
  userId: string;
  participantId: string | null;
  tournamentId: string;
  amount: number;
  platformFeeAmount: number | null;
  status: PaymentStatus;
  refundStatus: string | null;
  refundedAmount: number;
  paymentGateway: string | null;    // "VNPAY", "MOMO"
  transactionReference: string | null;
  gatewayResponse: Record<string, unknown> | null;
  paidAt: string | null;
  createdAt: string;
  tournament?: Tournament;
}

export interface OrganizerPayout {
  id: string;
  tournamentId: string;
  organizerId: string;
  totalCollected: number;
  amountRequested: number;
  platformFeeRetained: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  status: PayoutStatus;
  transactionProofUrl: string | null;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tournament?: Tournament;
}
```

---

## 10. Chat Types (`types/chat.ts`)

```typescript
export type ChatRoomType = 'DIRECT' | 'GROUP';

export interface ChatRoom {
  id: string;
  name: string | null;
  type: ChatRoomType;
  createdAt: string;
  members?: ChatRoomMember[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

export interface ChatRoomMember {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: string;
  user?: UserProfile;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string | null;
  messageText: string | null;
  attachmentsUrls: string[];
  isRead: boolean;
  createdAt: string;
  sender?: UserProfile;
}
```

---

## 11. Social Types (`types/social.ts`)

```typescript
export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
export type NotificationType = 'TOURNAMENT' | 'MATCH' | 'FRIEND_REQUEST' | 'PAYMENT' | 'SYSTEM';

export interface Friendship {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
  sender?: UserProfile;
  receiver?: UserProfile;
}

export interface Notification {
  id: string;
  receiverId: string;
  senderId: string | null;
  type: NotificationType;
  title: string;
  content: string;
  redirectUrl: string | null;
  isRead: boolean;
  createdAt: string;
  sender?: UserProfile;
}
```

---

## Import Convention

```typescript
// ✅ Đúng — import từ barrel file
import type { Tournament, CreateTournamentDto, QueryTournamentDto } from '@/types';
import type { ApiResponse, PaginatedResponse } from '@/types';

// ❌ Sai — import trực tiếp file
import type { Tournament } from '@/types/tournament';
```
