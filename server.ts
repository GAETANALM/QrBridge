import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Support large file uploads (up to 100MB) via base64 JSON payload
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

import crypto from "crypto";

// Helper to generate a short unique ID (6 characters)
function generateShortId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

const USERS_FILE = path.join(UPLOADS_DIR, "users.json");
const HISTORY_FILE = path.join(UPLOADS_DIR, "history.json");
const PASSWORD_SALT = "qrdrive-secret-salt-2026";

async function logActivity(entry: {
  action: 'upload' | 'download' | 'trash' | 'restore' | 'delete' | 'user_update';
  userId: string;
  username: string;
  details: string;
  fileName?: string;
  fileId?: string;
}) {
  try {
    let logs: any[] = [];
    if (fs.existsSync(HISTORY_FILE)) {
      const data = await fs.promises.readFile(HISTORY_FILE, "utf-8");
      logs = JSON.parse(data);
    }
    const newLog = {
      id: generateShortId(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    logs.unshift(newLog);
    if (logs.length > 500) {
      logs = logs.slice(0, 500);
    }
    await fs.promises.writeFile(HISTORY_FILE, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}

// Session storage in memory (token -> user info)
const SESSIONS = new Map<string, { id: string; username: string; role: 'admin' | 'user' }>();

function hashPassword(password: string): string {
  return crypto.createHmac("sha256", PASSWORD_SALT).update(password).digest("hex");
}

async function loadUsers(): Promise<any[]> {
  const defaultUsers = [
    {
      id: "admin-id",
      username: "admin",
      password: hashPassword("111111"),
      role: "admin",
      createdAt: new Date().toISOString()
    },
    {
      id: "user-id",
      username: "user",
      password: hashPassword("111111"),
      role: "user",
      createdAt: new Date().toISOString()
    }
  ];

  if (!fs.existsSync(USERS_FILE)) {
    await fs.promises.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    return defaultUsers;
  }
  try {
    const data = await fs.promises.readFile(USERS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    
    // Check if any user is missing "username" (needs migration to username schema)
    let needsMigration = false;
    if (Array.isArray(parsed)) {
      for (const u of parsed) {
        if (!u || !u.username) {
          needsMigration = true;
          break;
        }
      }
    } else {
      await fs.promises.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
      return defaultUsers;
    }

    if (needsMigration) {
      console.log("Migrating users.json to single username schema");
      const migrated = parsed.map((u: any) => {
        if (!u) return null;
        if (u.username) {
          return u;
        }

        let username = "utilisateur";
        if (u.prenom && u.nom) {
          username = `${u.prenom.trim()}${u.nom.trim()}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        } else if (u.prenom) {
          username = u.prenom.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        } else if (u.id === "admin-id" || u.role === "admin") {
          username = "admin";
        } else if (u.id === "user-id") {
          username = "user";
        }

        // Strip any special characters from username
        username = username.replace(/[^a-zA-Z0-9_\-]/g, "");
        if (!username) {
          username = "user_" + generateShortId();
        }

        return {
          id: u.id || "u_" + generateShortId(),
          username: username,
          password: u.password || hashPassword("111111"),
          role: u.role || "user",
          createdAt: u.createdAt || new Date().toISOString()
        };
      }).filter(Boolean);

      await fs.promises.writeFile(USERS_FILE, JSON.stringify(migrated, null, 2));
      return migrated;
    }
    return parsed;
  } catch (error) {
    console.error("Error loading users:", error);
    return defaultUsers;
  }
}

async function saveUsers(users: any[]): Promise<void> {
  await fs.promises.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Middleware to parse token and set req.user
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentification requise." });
  }

  const session = SESSIONS.get(token);
  if (!session) {
    return res.status(401).json({ error: "Session expirée ou invalide. Veuillez vous reconnecter." });
  }

  req.user = session;
  next();
}

// Middleware to check admin role
async function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Droits d'administration requis." });
  }
  next();
}

// API Routes

// --- Auth Endpoints ---

// 1. Register a new user
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username) {
      return res.status(400).json({ error: "L'identifiant est requis." });
    }

    const trimmedUsername = username.trim();
    const passCode = password || "111111";

    if (!/^\d{6}$/.test(passCode)) {
      return res.status(400).json({ error: "Le mot de passe doit être un code à 6 chiffres." });
    }

    const cleanSearch = (str: string) => {
      if (!str) return "";
      return str.trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_\-]/g, "");
    };

    const usernameLower = cleanSearch(trimmedUsername);
    if (!usernameLower) {
      return res.status(400).json({ error: "L'identifiant doit contenir au moins quelques lettres ou chiffres." });
    }

    const users = await loadUsers();

    if (users.find(u => u.username && cleanSearch(u.username) === usernameLower)) {
      return res.status(400).json({ error: "Cet identifiant est déjà utilisé." });
    }

    const newUser = {
      id: "u_" + generateShortId(),
      username: trimmedUsername,
      password: hashPassword(passCode),
      role: "user",
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers(users);

    const token = crypto.randomBytes(32).toString("hex");
    const userSession = { id: newUser.id, username: newUser.username, role: newUser.role as 'admin' | 'user' };
    SESSIONS.set(token, userSession);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
});

// 2. Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "L'identifiant et le code à 6 chiffres sont requis." });
    }

    const trimmedUsername = username.trim();

    if (!/^\d{6}$/.test(password)) {
      return res.status(400).json({ error: "Le mot de passe doit être un code à 6 chiffres." });
    }

    const cleanSearch = (str: string) => {
      if (!str) return "";
      return str.trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_\-]/g, "");
    };

    const searchInput = cleanSearch(trimmedUsername);
    const users = await loadUsers();
    const user = users.find(u => {
      if (!u.username) return false;
      return cleanSearch(u.username) === searchInput;
    });

    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: "Identifiants incorrects (Identifiant ou Code erroné)." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const userSession = { id: user.id, username: user.username, role: user.role as 'admin' | 'user' };
    SESSIONS.set(token, userSession);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Erreur lors de la connexion." });
  }
});

// 3. Get current session user
app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  res.json({ user: req.user });
});

// 4. Logout
app.post("/api/auth/logout", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    SESSIONS.delete(token);
  }
  res.json({ success: true });
});


// --- Admin Endpoints ---

// 5. Get all users (Admin only)
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await loadUsers();
    // Return users without passwords
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username || `${u.prenom || ''} ${u.nom || ''}`.trim() || 'utilisateur',
      role: u.role,
      createdAt: u.createdAt
    }));
    res.json(safeUsers);
  } catch (error) {
    console.error("Get users admin error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs." });
  }
});

// 6. Update user role (Admin only)
app.patch("/api/admin/users/:id/role", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== "admin" && role !== "user") {
      return res.status(400).json({ error: "Rôle invalide." });
    }

    const users = await loadUsers();
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    // Prevent revoking oneself's admin role if they are the logged in admin
    if (id === req.user.id && role !== "admin") {
      return res.status(400).json({ error: "Vous ne pouvez pas révoquer vos propres droits d'administrateur." });
    }

    users[userIndex].role = role;
    await saveUsers(users);

    // Update active sessions if any
    for (const [token, session] of SESSIONS.entries()) {
      if (session.id === id) {
        SESSIONS.set(token, { ...session, role });
      }
    }

    res.json({
      id,
      username: users[userIndex].username || `${users[userIndex].prenom || ''} ${users[userIndex].nom || ''}`.trim(),
      role: users[userIndex].role,
      createdAt: users[userIndex].createdAt
    });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du rôle." });
  }
});

// Update complete profile data (username, role) - Admin only
app.put("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { username, role } = req.body;

    const users = await loadUsers();
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    if (role && !["admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Rôle invalide." });
    }

    // Check self admin demotion
    if (id === req.user.id && role && role !== "admin") {
      return res.status(400).json({ error: "Vous ne pouvez pas révoquer vos propres droits d'administrateur." });
    }

    let newUsername = users[userIndex].username;
    if (username && typeof username === "string") {
      const trimmed = username.trim();
      if (trimmed.length < 2) {
        return res.status(400).json({ error: "L'identifiant doit contenir au moins 2 caractères." });
      }
      // Check duplicate username
      const existing = users.find(u => u.id !== id && u.username.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: "Cet identifiant est déjà utilisé par un autre compte." });
      }
      newUsername = trimmed;
    }

    const updatedRole = role || users[userIndex].role;

    users[userIndex].username = newUsername;
    users[userIndex].role = updatedRole;

    await saveUsers(users);

    // Update active sessions if any
    for (const [token, session] of SESSIONS.entries()) {
      if (session.id === id) {
        SESSIONS.set(token, { ...session, username: newUsername, role: updatedRole });
      }
    }

    // Update metadata files for uploads owned by this user
    try {
      const files = await fs.promises.readdir(UPLOADS_DIR);
      const metaFiles = files.filter((f) => f.endsWith(".meta.json") && f !== "users.json");
      for (const metaFile of metaFiles) {
        const filePath = path.join(UPLOADS_DIR, metaFile);
        const content = await fs.promises.readFile(filePath, "utf-8");
        const meta = JSON.parse(content);
        if (meta.ownerId === id) {
          meta.ownerUsername = newUsername;
          await fs.promises.writeFile(filePath, JSON.stringify(meta, null, 2));
        }
      }
    } catch (e) {
      console.error("Error updating user file metadata:", e);
    }

    res.json({
      id,
      username: newUsername,
      role: updatedRole,
      createdAt: users[userIndex].createdAt
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil." });
  }
});

// 7. Delete user (Admin only)
app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte." });
    }

    const users = await loadUsers();
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    users.splice(userIndex, 1);
    await saveUsers(users);

    // Delete active sessions for this user
    for (const [token, session] of SESSIONS.entries()) {
      if (session.id === id) {
        SESSIONS.delete(token);
      }
    }

    res.json({ success: true, message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Erreur lors de la suppression de l'utilisateur." });
  }
});

// 8. Reset user password / passcode (Admin only)
app.post("/api/admin/users/:id/reset-password", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const users = await loadUsers();
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    let passcode = newPassword ? newPassword.toString().trim() : "";
    if (!passcode) {
      passcode = Math.floor(100000 + Math.random() * 900000).toString();
    }

    if (!/^\d{6}$/.test(passcode)) {
      return res.status(400).json({ error: "Le mot de passe doit être un code à 6 chiffres." });
    }

    users[userIndex].password = hashPassword(passcode);
    await saveUsers(users);

    res.json({
      success: true,
      message: "Mot de passe réinitialisé avec succès.",
      newPassword: passcode,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Erreur lors de la réinitialisation du mot de passe." });
  }
});


// --- Files Endpoints ---

// 1. Upload a file (Authenticated)
app.post("/api/upload", authenticateToken, async (req: any, res) => {
  try {
    const { name, type, size, content, expiresAt } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: "Nom du fichier et contenu requis." });
    }

    // Extract the raw base64 content (remove prefix if present, e.g. "data:image/png;base64,")
    const base64Data = content.includes(",") ? content.split(",")[1] : content;
    const buffer = Buffer.from(base64Data, "base64");

    const id = generateShortId();
    const metaPath = path.join(UPLOADS_DIR, `${id}.meta.json`);
    const binPath = path.join(UPLOADS_DIR, `${id}.bin`);

    const metadata = {
      id,
      name,
      type: type || "application/octet-stream",
      size: size || buffer.length,
      uploadedAt: new Date().toISOString(),
      downloads: 0,
      expiresAt: expiresAt || null,
      ownerId: req.user.id,
      ownerUsername: req.user.username || 'utilisateur',
    };

    // Save binary data and metadata
    await fs.promises.writeFile(binPath, buffer);
    await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2));

    await logActivity({
      action: "upload",
      userId: req.user.id,
      username: req.user.username || "utilisateur",
      details: `Fichier "${name}" téléversé (${(metadata.size / 1024).toFixed(1)} Ko)`,
      fileName: name,
      fileId: id,
    });

    res.status(201).json(metadata);
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Erreur lors du traitement du fichier." });
  }
});

// 2. Get list of active files (metadata only) - Authenticated
// Administrators see all active files, standard users see only theirs
app.get("/api/files", authenticateToken, async (req: any, res) => {
  try {
    const files = await fs.promises.readdir(UPLOADS_DIR);
    const metaFiles = files.filter((f) => f.endsWith(".meta.json") && f !== "users.json" && f !== "history.json");

    const list = [];
    for (const metaFile of metaFiles) {
      const filePath = path.join(UPLOADS_DIR, metaFile);
      try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        const meta = JSON.parse(content);
        
        // Exclude files in trash
        if (meta.inTrash) continue;

        // Filter: Admin sees everything, standard user sees only their files
        const isOwner =
          (meta.ownerId && meta.ownerId === req.user.id) ||
          (meta.ownerUsername && meta.ownerUsername.toLowerCase() === req.user.username.toLowerCase()) ||
          (!meta.ownerId && !meta.ownerUsername);

        if (req.user.role === "admin" || isOwner) {
          list.push(meta);
        }
      } catch (err) {
        console.error(`Error reading metadata file ${metaFile}:`, err);
      }
    }

    // Sort by uploadedAt descending
    list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    res.json(list);
  } catch (error) {
    console.error("List files error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des fichiers." });
  }
});

// 2b. Get list of files in TRASH - Authenticated
app.get("/api/files-trash", authenticateToken, async (req: any, res) => {
  try {
    const files = await fs.promises.readdir(UPLOADS_DIR);
    const metaFiles = files.filter((f) => f.endsWith(".meta.json") && f !== "users.json" && f !== "history.json");

    const list = [];
    for (const metaFile of metaFiles) {
      const filePath = path.join(UPLOADS_DIR, metaFile);
      try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        const meta = JSON.parse(content);
        
        // Include ONLY files in trash
        if (!meta.inTrash) continue;

        const isOwner =
          (meta.ownerId && meta.ownerId === req.user.id) ||
          (meta.ownerUsername && meta.ownerUsername.toLowerCase() === req.user.username.toLowerCase()) ||
          (!meta.ownerId && !meta.ownerUsername);

        if (req.user.role === "admin" || isOwner) {
          list.push(meta);
        }
      } catch (err) {
        console.error(`Error reading trash metadata file ${metaFile}:`, err);
      }
    }

    // Sort by deletedAt descending
    list.sort((a, b) => new Date(b.deletedAt || b.uploadedAt).getTime() - new Date(a.deletedAt || a.uploadedAt).getTime());

    res.json(list);
  } catch (error) {
    console.error("List trash files error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération de la corbeille." });
  }
});

// 2c. Restore a file from TRASH - Authenticated
app.post("/api/files/:id/restore", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const metaPath = path.join(UPLOADS_DIR, `${id}.meta.json`);

  if (!fs.existsSync(metaPath)) {
    return res.status(404).json({ error: "Fichier non trouvé." });
  }

  try {
    const metaContent = await fs.promises.readFile(metaPath, "utf-8");
    const metadata = JSON.parse(metaContent);

    const isOwner =
      (metadata.ownerId && metadata.ownerId === req.user.id) ||
      (metadata.ownerUsername && metadata.ownerUsername.toLowerCase() === req.user.username.toLowerCase()) ||
      (!metadata.ownerId && !metadata.ownerUsername);

    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ error: "Vous n'êtes pas autorisé à restaurer ce fichier." });
    }

    metadata.inTrash = false;
    metadata.deletedAt = null;

    await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2));

    await logActivity({
      action: "restore",
      userId: req.user.id,
      username: req.user.username || "utilisateur",
      details: `Fichier "${metadata.name}" restauré de la corbeille`,
      fileName: metadata.name,
      fileId: id,
    });

    res.json({ success: true, metadata, message: "Fichier restauré avec succès." });
  } catch (error) {
    console.error("Restore file error:", error);
    res.status(500).json({ error: "Erreur lors de la restauration du fichier." });
  }
});

// 2d. Empty Trash - Authenticated
app.delete("/api/files-trash/empty", authenticateToken, async (req: any, res) => {
  try {
    const files = await fs.promises.readdir(UPLOADS_DIR);
    const metaFiles = files.filter((f) => f.endsWith(".meta.json") && f !== "users.json" && f !== "history.json");

    let count = 0;
    for (const metaFile of metaFiles) {
      const filePath = path.join(UPLOADS_DIR, metaFile);
      try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        const meta = JSON.parse(content);
        
        if (!meta.inTrash) continue;

        const isOwner =
          (meta.ownerId && meta.ownerId === req.user.id) ||
          (meta.ownerUsername && meta.ownerUsername.toLowerCase() === req.user.username.toLowerCase()) ||
          (!meta.ownerId && !meta.ownerUsername);

        if (req.user.role === "admin" || isOwner) {
          const binPath = path.join(UPLOADS_DIR, `${meta.id}.bin`);
          if (fs.existsSync(binPath)) {
            await fs.promises.unlink(binPath);
          }
          await fs.promises.unlink(filePath);
          count++;
        }
      } catch (err) {
        console.error(`Error emptying file ${metaFile}:`, err);
      }
    }

    await logActivity({
      action: "delete",
      userId: req.user.id,
      username: req.user.username || "utilisateur",
      details: `Corbeille vidée (${count} fichier(s) supprimé(s) définitivement)`,
    });

    res.json({ success: true, count, message: `Corbeille vidée avec succès (${count} fichier(s)).` });
  } catch (error) {
    console.error("Empty trash error:", error);
    res.status(500).json({ error: "Erreur lors du vidage de la corbeille." });
  }
});

// 2e. Get Activity History Logs - Authenticated
app.get("/api/history", authenticateToken, async (req: any, res) => {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return res.json([]);
    }
    const data = await fs.promises.readFile(HISTORY_FILE, "utf-8");
    const logs = JSON.parse(data);

    // Admin sees all logs, regular user sees logs where userId matches
    const filtered = req.user.role === "admin"
      ? logs
      : logs.filter((log: any) => log.userId === req.user.id || (log.username && log.username.toLowerCase() === req.user.username.toLowerCase()));

    res.json(filtered);
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération de l'historique." });
  }
});

// 3. Get metadata for a specific file (PUBLIC ACCESS)
app.get("/api/files/:id", async (req, res) => {
  const { id } = req.params;
  const metaPath = path.join(UPLOADS_DIR, `${id}.meta.json`);

  if (!fs.existsSync(metaPath)) {
    return res.status(404).json({ error: "Fichier non trouvé." });
  }

  try {
    const content = await fs.promises.readFile(metaPath, "utf-8");
    const metadata = JSON.parse(content);

    if (metadata.inTrash) {
      return res.status(404).json({ error: "Ce fichier est actuellement dans la corbeille." });
    }

    // Enforce expiration check
    if (metadata.expiresAt && new Date() > new Date(metadata.expiresAt)) {
      return res.status(410).json({ 
        error: "Ce fichier a expiré et n'est plus accessible.", 
        expired: true,
        name: metadata.name,
        size: metadata.size,
        type: metadata.type,
        expiresAt: metadata.expiresAt
      });
    }

    res.json(metadata);
  } catch (error) {
    console.error("Get file metadata error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des métadonnées." });
  }
});

// 4. Download a file (PUBLIC ACCESS)
app.get("/api/download/:id", async (req, res) => {
  const { id } = req.params;
  const metaPath = path.join(UPLOADS_DIR, `${id}.meta.json`);
  const binPath = path.join(UPLOADS_DIR, `${id}.bin`);

  if (!fs.existsSync(metaPath) || !fs.existsSync(binPath)) {
    return res.status(404).send("Fichier non trouvé.");
  }

  try {
    // Read and update metadata (increment downloads)
    const metaContent = await fs.promises.readFile(metaPath, "utf-8");
    const metadata = JSON.parse(metaContent);

    if (metadata.inTrash) {
      return res.status(404).send("Ce fichier est dans la corbeille.");
    }

    // Enforce expiration check
    if (metadata.expiresAt && new Date() > new Date(metadata.expiresAt)) {
      return res.status(410).send("Ce fichier a expiré et n'est plus accessible.");
    }

    metadata.downloads += 1;
    await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2));

    await logActivity({
      action: "download",
      userId: metadata.ownerId || "public",
      username: metadata.ownerUsername || "visiteur",
      details: `Fichier "${metadata.name}" téléchargé (${metadata.downloads} fois au total)`,
      fileName: metadata.name,
      fileId: id,
    });

    // Serve binary file
    const fileBuffer = await fs.promises.readFile(binPath);

    // Set correct headers
    res.setHeader("Content-Type", metadata.type || "application/octet-stream");
    // Ensure filename is safely encoded for headers
    const safeName = encodeURIComponent(metadata.name).replace(/['()]/g, escape);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${safeName}`);
    res.setHeader("Content-Length", fileBuffer.length);

    res.send(fileBuffer);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).send("Erreur lors du téléchargement.");
  }
});

// 5. Delete a file (Authenticated) - Soft delete by default, or permanent delete if permanent=true
app.delete("/api/files/:id", authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const isPermanent = req.query.permanent === "true";
  const metaPath = path.join(UPLOADS_DIR, `${id}.meta.json`);
  const binPath = path.join(UPLOADS_DIR, `${id}.bin`);

  if (!fs.existsSync(metaPath)) {
    return res.status(404).json({ error: "Fichier non trouvé." });
  }

  try {
    const metaContent = await fs.promises.readFile(metaPath, "utf-8");
    const metadata = JSON.parse(metaContent);

    // Authorization check
    const isOwner =
      (metadata.ownerId && metadata.ownerId === req.user.id) ||
      (metadata.ownerUsername && metadata.ownerUsername.toLowerCase() === req.user.username.toLowerCase()) ||
      (!metadata.ownerId && !metadata.ownerUsername);

    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ error: "Vous n'êtes pas autorisé à supprimer ce fichier." });
    }

    if (isPermanent) {
      if (fs.existsSync(binPath)) {
        await fs.promises.unlink(binPath);
      }
      await fs.promises.unlink(metaPath);

      await logActivity({
        action: "delete",
        userId: req.user.id,
        username: req.user.username || "utilisateur",
        details: `Fichier "${metadata.name}" supprimé définitivement`,
        fileName: metadata.name,
        fileId: id,
      });

      return res.json({ success: true, message: "Fichier supprimé définitivement." });
    } else {
      // Soft-delete: Move to trash
      metadata.inTrash = true;
      metadata.deletedAt = new Date().toISOString();

      await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2));

      await logActivity({
        action: "trash",
        userId: req.user.id,
        username: req.user.username || "utilisateur",
        details: `Fichier "${metadata.name}" déplacé dans la corbeille`,
        fileName: metadata.name,
        fileId: id,
      });

      return res.json({ success: true, message: "Fichier déplacé dans la corbeille." });
    }
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({ error: "Erreur lors de la suppression du fichier." });
  }
});


// Serve frontend assets
async function setupViteMiddleware() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support single page application routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

setupViteMiddleware();
