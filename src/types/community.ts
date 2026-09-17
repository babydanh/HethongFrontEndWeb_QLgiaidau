import { Category } from './category';

export interface Community {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  /** Newest gallery image exposed as the public list-card cover fallback. */
  coverImageUrl?: string | null;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
  joinMode?: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
  joinQuestions?: string[];
  rules?: string;
  maxMembers?: number;
  locationAddress?: string;
  lat?: number;
  lng?: number;
  status: 'ACTIVE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectedReason?: string | null;
  ownerId?: string;
  creatorId?: string;
  myRole?: 'OWNER' | 'MODERATOR' | 'MEMBER';
  createdAt: string;
  updatedAt: string;
  socialLinks?: Record<string, string>;
  categories?: Category[];
  _count?: {
    members: number;
    tournaments: number;
  };
  access?: {
    visibility: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
    isAuthenticated: boolean;
    isMember: boolean;
    membershipStatus: string | null;
    membershipRole: string | null;
    isAdmin: boolean;
      canViewContent: boolean;
      canViewFeed: boolean;
      canViewMembers: boolean;
    canPost: boolean;
  };
}

