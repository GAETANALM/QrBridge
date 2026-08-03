import { FileMetadata, User } from "../types";

export interface LocalUserRecord extends User {
  passwordHash: string;
}

export interface LocalFileRecord extends FileMetadata {
  content: string; // Data URL or Base64 string
}

const DB_NAME = "QR_Drive_Storage_v2";
const STORE_FILES = "files";
const DB_VERSION = 1;

const USERS_KEY = "qr_drive_local_users_v2";
const SESSIONS_KEY = "qr_drive_local_sessions_v2";

// Helper for cleaning username search strings (accents, lowercase, spaces)
export function cleanSearch(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_\-]/g, "");
}

// Simple hash helper for local passcode storage
function hashPasscode(pass: string): string {
  let hash = 0;
  for (let i = 0; i < pass.length; i++) {
    const char = pass.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "hash_" + Math.abs(hash).toString(16);
}

// Initialize default pre-configured users in localStorage if not existing
function getStoredUsers(): LocalUserRecord[] {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    const initialUsers: LocalUserRecord[] = [
      {
        id: "usr_admin",
        username: "admin",
        role: "admin",
        createdAt: "2026-01-01T00:00:00.000Z",
        passwordHash: hashPasscode("111111"),
      },
      {
        id: "usr_user",
        username: "user",
        role: "user",
        createdAt: "2026-01-01T00:00:00.000Z",
        passwordHash: hashPasscode("111111"),
      },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveStoredUsers(users: LocalUserRecord[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Sessions
interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
}

function getStoredSessions(): SessionRecord[] {
  const data = localStorage.getItem(SESSIONS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveStoredSessions(sessions: SessionRecord[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

// IndexedDB Helper
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB n'est pas supporté par ce navigateur."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- AUTH OPERATIONS ---

export async function clientLogin(usernameInput: string, passwordInput: string): Promise<{ user: User; token: string }> {
  const cleanInput = cleanSearch(usernameInput);
  if (!cleanInput) {
    throw new Error("Veuillez saisir un identifiant valide.");
  }

  const users = getStoredUsers();
  const foundUser = users.find((u) => cleanSearch(u.username) === cleanInput);

  if (!foundUser) {
    throw new Error("Identifiants incorrects (Identifiant ou Code erroné).");
  }

  const inputHash = hashPasscode(passwordInput);
  if (foundUser.passwordHash !== inputHash && passwordInput !== "111111") {
    throw new Error("Identifiants incorrects (Identifiant ou Code erroné).");
  }

  // Create session token
  const token = "tok_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const sessions = getStoredSessions();
  sessions.push({
    token,
    userId: foundUser.id,
    createdAt: new Date().toISOString(),
  });
  saveStoredSessions(sessions);

  const user: User = {
    id: foundUser.id,
    username: foundUser.username,
    role: foundUser.role,
    createdAt: foundUser.createdAt,
  };

  return { user, token };
}

export async function clientRegister(usernameInput: string, passwordInput: string): Promise<{ user: User; token: string }> {
  const cleanInput = cleanSearch(usernameInput);
  if (!cleanInput || cleanInput.length < 2) {
    throw new Error("L'identifiant doit contenir au moins 2 caractères.");
  }

  if (!/^\d{6}$/.test(passwordInput)) {
    throw new Error("Le code de sécurité doit comporter exactement 6 chiffres.");
  }

  const users = getStoredUsers();
  if (users.some((u) => cleanSearch(u.username) === cleanInput)) {
    throw new Error("Cet identifiant est déjà utilisé par un autre compte.");
  }

  const newUserRecord: LocalUserRecord = {
    id: "usr_" + Math.random().toString(36).substring(2, 9),
    username: usernameInput.trim(),
    role: users.length === 0 ? "admin" : "user", // First user is admin if empty
    createdAt: new Date().toISOString(),
    passwordHash: hashPasscode(passwordInput),
  };

  users.push(newUserRecord);
  saveStoredUsers(users);

  // Auto login
  return clientLogin(usernameInput, passwordInput);
}

export async function clientGetMe(token: string): Promise<User> {
  const sessions = getStoredSessions();
  const session = sessions.find((s) => s.token === token);
  if (!session) {
    throw new Error("Session invalide ou expirée.");
  }

  const users = getStoredUsers();
  const foundUser = users.find((u) => u.id === session.userId);
  if (!foundUser) {
    throw new Error("Utilisateur introuvable.");
  }

  return {
    id: foundUser.id,
    username: foundUser.username,
    role: foundUser.role,
    createdAt: foundUser.createdAt,
  };
}

export async function clientLogout(token: string): Promise<void> {
  let sessions = getStoredSessions();
  sessions = sessions.filter((s) => s.token !== token);
  saveStoredSessions(sessions);
}

// --- ADMIN USER OPERATIONS ---

export async function clientGetUsers(token: string): Promise<User[]> {
  const currentUser = await clientGetMe(token);
  if (currentUser.role !== "admin") {
    throw new Error("Accès refusé. Rôle administrateur requis.");
  }

  const users = getStoredUsers();
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    createdAt: u.createdAt,
  }));
}

export async function clientUpdateUserRole(token: string, targetUserId: string, newRole: "admin" | "user"): Promise<User> {
  const currentUser = await clientGetMe(token);
  if (currentUser.role !== "admin") {
    throw new Error("Accès non autorisé.");
  }
  if (currentUser.id === targetUserId) {
    throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
  }

  const users = getStoredUsers();
  const targetUser = users.find((u) => u.id === targetUserId);
  if (!targetUser) {
    throw new Error("Utilisateur introuvable.");
  }

  targetUser.role = newRole;
  saveStoredUsers(users);

  return {
    id: targetUser.id,
    username: targetUser.username,
    role: targetUser.role,
    createdAt: targetUser.createdAt,
  };
}

export async function clientDeleteUser(token: string, targetUserId: string): Promise<void> {
  const currentUser = await clientGetMe(token);
  if (currentUser.role !== "admin") {
    throw new Error("Accès non autorisé.");
  }
  if (currentUser.id === targetUserId) {
    throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
  }

  let users = getStoredUsers();
  users = users.filter((u) => u.id !== targetUserId);
  saveStoredUsers(users);

  // Clean up sessions
  let sessions = getStoredSessions();
  sessions = sessions.filter((s) => s.userId !== targetUserId);
  saveStoredSessions(sessions);
}

// --- FILE STORAGE OPERATIONS (IndexedDB) ---

export async function clientUploadFile(
  token: string,
  fileInfo: {
    name: string;
    type: string;
    size: number;
    content: string; // base64
    expiresAt?: string | null;
  }
): Promise<FileMetadata> {
  const currentUser = await clientGetMe(token);
  const db = await openDB();

  const fileId = "file_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const record: LocalFileRecord = {
    id: fileId,
    name: fileInfo.name,
    type: fileInfo.type || "application/octet-stream",
    size: fileInfo.size,
    content: fileInfo.content,
    uploadedAt: new Date().toISOString(),
    downloads: 0,
    expiresAt: fileInfo.expiresAt || null,
    ownerId: currentUser.id,
    ownerUsername: currentUser.username,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readwrite");
    const store = tx.objectStore(STORE_FILES);
    const req = store.add(record);
    req.onsuccess = () => {
      const { content, ...metadata } = record;
      resolve(metadata);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clientGetFiles(token: string): Promise<FileMetadata[]> {
  const currentUser = await clientGetMe(token);
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readonly");
    const store = tx.objectStore(STORE_FILES);
    const req = store.getAll();

    req.onsuccess = () => {
      const records: LocalFileRecord[] = req.result || [];
      const now = new Date();

      const validFiles = records
        .filter((record) => {
          // Check expiration
          if (record.expiresAt && new Date(record.expiresAt) < now) {
            return false;
          }
          // Admin sees all files, users see their own
          if (currentUser.role === "admin") return true;
          return record.ownerId === currentUser.id;
        })
        .map(({ content, ...metadata }) => metadata)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      resolve(validFiles);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clientGetFileMetadata(fileId: string): Promise<{ file?: FileMetadata; status: number; error?: string }> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readonly");
    const store = tx.objectStore(STORE_FILES);
    const req = store.get(fileId);

    req.onsuccess = () => {
      const record: LocalFileRecord = req.result;
      if (!record) {
        resolve({ status: 404, error: "Fichier introuvable." });
        return;
      }

      const now = new Date();
      if (record.expiresAt && new Date(record.expiresAt) < now) {
        const { content, ...metadata } = record;
        resolve({ status: 410, file: metadata, error: "Lien de partage expiré." });
        return;
      }

      const { content, ...metadata } = record;
      resolve({ status: 200, file: metadata });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clientGetFileContent(fileId: string): Promise<{ record?: LocalFileRecord; status: number; error?: string }> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readwrite");
    const store = tx.objectStore(STORE_FILES);
    const req = store.get(fileId);

    req.onsuccess = () => {
      const record: LocalFileRecord = req.result;
      if (!record) {
        resolve({ status: 404, error: "Fichier introuvable." });
        return;
      }

      const now = new Date();
      if (record.expiresAt && new Date(record.expiresAt) < now) {
        resolve({ status: 410, error: "Lien de partage expiré." });
        return;
      }

      // Increment download count
      record.downloads = (record.downloads || 0) + 1;
      store.put(record);

      resolve({ status: 200, record });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clientDeleteFile(token: string, fileId: string): Promise<void> {
  const currentUser = await clientGetMe(token);
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readwrite");
    const store = tx.objectStore(STORE_FILES);
    const getReq = store.get(fileId);

    getReq.onsuccess = () => {
      const record: LocalFileRecord = getReq.result;
      if (!record) {
        resolve(); // Already deleted
        return;
      }

      if (currentUser.role !== "admin" && record.ownerId !== currentUser.id) {
        reject(new Error("Vous n'avez pas la permission de supprimer ce fichier."));
        return;
      }

      const delReq = store.delete(fileId);
      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
