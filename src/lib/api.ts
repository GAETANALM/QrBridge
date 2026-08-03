import { FileMetadata, User } from "../types";
import {
  clientLogin,
  clientRegister,
  clientGetMe,
  clientLogout,
  clientGetUsers,
  clientUpdateUserRole,
  clientUpdateUserProfile,
  clientDeleteUser,
  clientResetUserPassword,
  clientUploadFile,
  clientGetFiles,
  clientGetFileMetadata,
  clientGetFileContent,
  clientDeleteFile,
} from "./clientStorage";

export function getApiUrl(path: string): string {
  const baseUrl = (((import.meta as any).env?.VITE_API_URL || "") as string).replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

// --- AUTH API ---

export async function apiLogin(username: string, password: string): Promise<{ user: User; token: string }> {
  try {
    const res = await fetch(getApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 404) {
      // Backend server absent (e.g. Netlify static hosting) -> Fallback to client local storage!
      return await clientLogin(username, password);
    }

    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erreur de connexion (${res.status})`);
  } catch (err: any) {
    if (err.message && err.message.includes("Identifiants incorrects")) {
      throw err;
    }
    // Network or server unreachable -> Fallback to client storage
    return await clientLogin(username, password);
  }
}

export async function apiRegister(username: string, password: string): Promise<{ user: User; token: string }> {
  try {
    const res = await fetch(getApiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 404) {
      return await clientRegister(username, password);
    }

    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erreur d'inscription (${res.status})`);
  } catch (err: any) {
    if (err.message && (err.message.includes("utilisé") || err.message.includes("code"))) {
      throw err;
    }
    return await clientRegister(username, password);
  }
}

export async function apiGetMe(token: string): Promise<User> {
  try {
    const res = await fetch(getApiUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      return data.user;
    }

    if (res.status === 404) {
      return await clientGetMe(token);
    }

    throw new Error("Session invalide");
  } catch (err) {
    return await clientGetMe(token);
  }
}

export async function apiLogout(token: string): Promise<void> {
  try {
    await fetch(getApiUrl("/api/auth/logout"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    // ignore
  }
  await clientLogout(token);
}

// --- FILES API ---

export async function apiGetFiles(token: string): Promise<FileMetadata[]> {
  try {
    const res = await fetch(getApiUrl("/api/files"), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 404) {
      return await clientGetFiles(token);
    }

    throw new Error("Impossible de récupérer la liste des fichiers.");
  } catch (err) {
    return await clientGetFiles(token);
  }
}

export async function apiUploadFile(
  token: string,
  fileInfo: {
    name: string;
    type: string;
    size: number;
    content: string;
    expiresAt?: string | null;
  }
): Promise<FileMetadata> {
  try {
    const res = await fetch(getApiUrl("/api/upload"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(fileInfo),
    });

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 404) {
      return await clientUploadFile(token, fileInfo);
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Erreur d'envoi");
  } catch (err: any) {
    if (err.message && err.message.includes("Erreur")) throw err;
    return await clientUploadFile(token, fileInfo);
  }
}

export async function apiDeleteFile(token: string, fileId: string): Promise<void> {
  try {
    const res = await fetch(getApiUrl(`/api/files/${fileId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) return;

    if (res.status === 404) {
      return await clientDeleteFile(token, fileId);
    }

    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Impossible de supprimer le fichier.");
  } catch (err: any) {
    if (err instanceof Error && err.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError")) {
      throw err;
    }
    return await clientDeleteFile(token, fileId);
  }
}

export async function apiGetFileMetadata(fileId: string): Promise<{ file?: FileMetadata; status: number; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/api/files/${fileId}`));

    if (res.ok) {
      const data = await res.json();
      return { status: 200, file: data };
    }

    if (res.status === 410) {
      const data = await res.json().catch(() => ({}));
      return {
        status: 410,
        file: {
          id: fileId,
          name: data.name || "Fichier",
          size: data.size || 0,
          type: data.type || "application/octet-stream",
          uploadedAt: "",
          downloads: 0,
          expiresAt: data.expiresAt,
        },
        error: "expired",
      };
    }

    if (res.status === 404) {
      return await clientGetFileMetadata(fileId);
    }

    throw new Error("Erreur de chargement");
  } catch (err) {
    return await clientGetFileMetadata(fileId);
  }
}

export async function apiDownloadFile(fileId: string): Promise<{ blobUrl?: string; name?: string; status: number; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/api/download/${fileId}`));
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      return { status: 200, blobUrl };
    }
    if (res.status === 404) {
      const result = await clientGetFileContent(fileId);
      if (result.status === 200 && result.record) {
        return {
          status: 200,
          blobUrl: result.record.content,
          name: result.record.name,
        };
      }
      return { status: result.status, error: result.error };
    }
    return { status: res.status, error: "Téléchargement impossible" };
  } catch (err) {
    const result = await clientGetFileContent(fileId);
    if (result.status === 200 && result.record) {
      return {
        status: 200,
        blobUrl: result.record.content,
        name: result.record.name,
      };
    }
    return { status: result.status || 500, error: result.error || "Erreur de téléchargement" };
  }
}

// --- ADMIN API ---

export async function apiGetUsers(token: string): Promise<User[]> {
  try {
    const res = await fetch(getApiUrl("/api/admin/users"), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 404) {
      return await clientGetUsers(token);
    }

    throw new Error("Erreur de chargement des utilisateurs.");
  } catch (err) {
    return await clientGetUsers(token);
  }
}

export async function apiUpdateUserRole(token: string, userId: string, newRole: "admin" | "user"): Promise<User> {
  try {
    const res = await fetch(getApiUrl(`/api/admin/users/${userId}/role`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 404) {
      return await clientUpdateUserRole(token, userId, newRole);
    }

    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erreur lors de la mise à jour");
  } catch (err) {
    return await clientUpdateUserRole(token, userId, newRole);
  }
}

export async function apiDeleteUser(token: string, userId: string): Promise<void> {
  try {
    const res = await fetch(getApiUrl(`/api/admin/users/${userId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) return;

    if (res.status === 404) {
      return await clientDeleteUser(token, userId);
    }

    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erreur lors de la suppression");
  } catch (err) {
    return await clientDeleteUser(token, userId);
  }
}

export async function apiResetUserPassword(token: string, userId: string, newPassword?: string): Promise<{ newPassword: string }> {
  try {
    const res = await fetch(getApiUrl(`/api/admin/users/${userId}/reset-password`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword }),
    });

    if (res.ok) {
      const data = await res.json();
      return { newPassword: data.newPassword };
    }

    if (res.status === 404) {
      return await clientResetUserPassword(token, userId, newPassword);
    }

    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erreur lors de la réinitialisation");
  } catch (err) {
    return await clientResetUserPassword(token, userId, newPassword);
  }
}

export async function apiUpdateUserProfile(
  token: string,
  userId: string,
  data: { username?: string; role?: "admin" | "user" }
): Promise<User> {
  try {
    const res = await fetch(getApiUrl(`/api/admin/users/${userId}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 404) {
      return await clientUpdateUserProfile(token, userId, data);
    }

    const resData = await res.json().catch(() => ({}));
    throw new Error(resData.error || "Erreur lors de la mise à jour du profil");
  } catch (err: any) {
    if (err.message && (err.message.includes("identifiant") || err.message.includes("droits"))) {
      throw err;
    }
    return await clientUpdateUserProfile(token, userId, data);
  }
}

