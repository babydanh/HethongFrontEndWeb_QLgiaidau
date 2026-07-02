export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  provinceCode?: string | null;
  role: 'PLAYER' | 'ORGANIZER' | 'MODERATOR' | 'ADMIN';
  roles?: string[];
  status: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isGenderLocked?: boolean;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
}

export interface UpdateProfileDto {
  fullName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  provinceCode?: string;
  bio?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export interface UserChangeRequest {
  id: string;
  userId: string;
  requestType: 'GENDER' | 'EMAIL';
  oldValue: string;
  newValue: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string | null;
  createdAt: string;
  user?: {
    email: string;
    profile?: {
      fullName: string;
      avatarUrl?: string;
    };
  };
}
