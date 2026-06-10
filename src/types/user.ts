export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  role: 'PLAYER' | 'ORGANIZER' | 'ADMIN';
  status: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileDto {
  fullName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
}
