export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  role: 'PLAYER' | 'ORGANIZER' | 'ADMIN';
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileDto {
  fullName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
}
