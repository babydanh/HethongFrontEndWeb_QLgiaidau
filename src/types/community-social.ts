export type CommunityPostStatus = 'PUBLISHED' | 'PENDING' | 'REJECTED';

export interface CommunityDashboardPlayer {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface CommunityRecentMatch {
  id: string;
  playerA: CommunityDashboardPlayer | null;
  playerB: CommunityDashboardPlayer | null;
  scoreA: number;
  scoreB: number;
  status: string;
  eloDelta: number;
  playedAt: string | null;
}

export interface CommunityFeaturedTournament {
  id: string;
  name: string;
  status: string;
  participantCount: number;
  championName: string | null;
}

export interface CommunityTopPlayer {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  elo: number;
  tierName: string | null;
  rank: number;
  winStreak: number;
}

export interface CommunityActivityItem {
  type: 'MEMBER_JOINED' | 'GALLERY_ADDED' | 'TOURNAMENT_CREATED';
  userId: string | null;
  userName: string;
  message: string;
  at: string;
}

export interface CommunityUpcomingMatch {
  id: string;
  playerA: CommunityDashboardPlayer | null;
  playerB: CommunityDashboardPlayer | null;
  scheduledAt: string | null;
}

export interface CommunityDashboard {
  recentMatches: CommunityRecentMatch[];
  featuredTournament: CommunityFeaturedTournament | null;
  topPlayers: CommunityTopPlayer[];
  activity: CommunityActivityItem[];
  upcomingMatches: CommunityUpcomingMatch[];
}

export interface CommunityPostAuthor {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface CommunityPostTournament {
  id: string;
  name: string;
  sport?: string | null;
  categoryName?: string | null;
  matchType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  bannerUrl?: string | null;
  maxParticipants?: number | null;
  inviteCode?: string | null;
}

export interface CommunityPollVoter {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface CommunityPollOption {
  id: string;
  pollId: string;
  optionText: string;
  voteCount: number;
  isVoted: boolean;
  voters: CommunityPollVoter[];
}

export interface CommunityPoll {
  id: string;
  communityId: string;
  postId?: string | null;
  creatorId?: string | null;
  creator?: CommunityPostAuthor | null;
  question: string;
  allowMultipleAnswers: boolean;
  allowAddOptions: boolean;
  isClosed: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  totalVotes: number;
  options: CommunityPollOption[];
}

export interface CommunityPost {
  id: string;
  communityId: string;
  author: CommunityPostAuthor;
  tournamentId?: string | null;
  type?: 'NORMAL' | 'TOURNAMENT_ANNOUNCEMENT' | string;
  tournament?: CommunityPostTournament | null;
  content: string;
  imageUrls: string[];
  status: CommunityPostStatus;
  createdAt: string;
  updatedAt: string;
  reactionCount: number;
  commentCount: number;
  topics?: string[];
  mentions?: string[];
  viewerReaction?: CommunityReactionType | null;
  poll?: CommunityPoll | null;
}

export type CommunityReactionType = 'LIKE' | 'CHEER' | 'RESPECT' | 'LAUGH' | 'CLUTCH';

export interface CommunityComment {
  id: string;
  postId: string;
  parentId?: string | null;
  author: CommunityPostAuthor;
  body: string;
  createdAt: string;
  updatedAt?: string;
  status?: 'PUBLISHED' | 'HIDDEN' | 'REJECTED';
  moderationReason?: string | null;
}

export interface CommunitySocialSettings {
  postingPolicy: 'MEMBERS' | 'ADMINS' | 'OFF';
  postApprovalRequired: boolean;
  commentsEnabled: boolean;
  chatEnabled: boolean;
  publicFeed: boolean;
  memberTaggingPolicy: 'MEMBERS' | 'ADMINS' | 'OFF';
}

export interface ChatRoom {
  id: string;
  type: string;
  communityId?: string | null;
  name?: string | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName?: string | null;
  senderAvatarUrl?: string | null;
  messageText?: string | null;
  attachmentsUrls?: string[];
  isRevoked?: boolean;
  revokedBy?: string | null;
  isPinned?: boolean;
  replyToId?: string | null;
  replyTo?: { id: string; senderName: string; text: string } | null;
  type?: 'TEXT' | 'POLL' | 'TOURNAMENT_SHARE' | 'LINK_PREVIEW' | string;
  metadata?: any;
  reactions?: string[];
  createdAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreatePollPayload {
  question: string;
  options: string[];
  allowMultipleAnswers?: boolean;
  allowAddOptions?: boolean;
  expiresAt?: string;
}

export interface CreateCommunityPostPayload {
  content: string;
  imageUrls?: string[];
  topics?: string[];
  mentions?: string[];
  poll?: CreatePollPayload;
}


