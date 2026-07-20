export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  downloads: number;
  expiresAt?: string | null;
  ownerId?: string;
  ownerPrenom?: string;
  ownerNom?: string;
}

export interface User {
  id: string;
  prenom: string;
  nom: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export type AppRoute = 
  | { type: 'admin' }
  | { type: 'share'; fileId: string };
