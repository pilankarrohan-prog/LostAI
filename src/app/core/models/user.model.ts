export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  notificationsEnabled?: boolean;
  reputationScore?: number;
  reputationLevel?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  role?: 'user' | 'admin';
}
