export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  downloads: number;
  expiresAt?: string | null;
  ownerId?: string;
  ownerUsername?: string;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export type AppRoute = 
  | { type: 'admin' }
  | { type: 'share'; fileId: string };

