export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  walletId: string | null;
  balance: string;
  createdAt: Date;
}

export interface AdminAvailability {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
  isOnline: boolean;
  lastSeen: Date | null;
}

export interface AvailableRepresentative {
  id: string;
  username: string;
  isOnline: boolean;
  lastSeen: Date | null;
}
