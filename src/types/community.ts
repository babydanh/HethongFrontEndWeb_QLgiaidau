import { Category } from './category';

export interface Community {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  ownerId?: string;
  creatorId?: string;
  createdAt: string;
  updatedAt: string;
  categories?: Category[];
  _count?: {
    members: number;
    tournaments: number;
  };
}
