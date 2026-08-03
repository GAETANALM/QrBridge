export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  downloads: number;
  expiresAt?: string | null;
  message?: string | null;
  ownerId?: string;
  ownerUsername?: string;
  inTrash?: boolean;
  deletedAt?: string | null;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: 'upload' | 'download' | 'trash' | 'restore' | 'delete' | 'user_update';
  userId: string;
  username: string;
  details: string;
  fileName?: string;
  fileId?: string;
}

export type SortField = 'date' | 'name' | 'size';
export type SortOrder = 'asc' | 'desc';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export type AppRoute = 
  | { type: 'admin' }
  | { type: 'share'; fileId: string };


