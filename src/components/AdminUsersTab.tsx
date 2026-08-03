import React, { useEffect, useState } from "react";
import { 
  Shield, 
  User as UserIcon, 
  Trash2, 
  Calendar, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  Copy, 
  Check, 
  RefreshCw, 
  X,
  Pencil,
  FolderKey,
  FileText,
  QrCode
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  apiGetUsers, 
  apiUpdateUserRole, 
  apiUpdateUserProfile, 
  apiDeleteUser, 
  apiResetUserPassword,
  apiGetFiles,
  apiDeleteFile
} from "../lib/api";
import { FileMetadata } from "../types";

interface AdminUsersTabProps {
  currentUser: { id: string; username: string; role: 'admin' | 'user' } | null;
  onOpenQR?: (file: FileMetadata) => void;
}

interface UserData {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export default function AdminUsersTab({ currentUser, onOpenQR }: AdminUsersTabProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  // Reset password modal states
  const [resetModalUser, setResetModalUser] = useState<{ id: string; username: string } | null>(null);
  const [customPasscode, setCustomPasscode] = useState<string>("");
  const [isResetting, setIsResetting] = useState(false);
  const [resultPasscode, setResultPasscode] = useState<{ username: string; code: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Profile Edit modal states
  const [editModalUser, setEditModalUser] = useState<UserData | null>(null);
  const [editUsername, setEditUsername] = useState<string>("");
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // View User Files modal states
  const [viewFilesUser, setViewFilesUser] = useState<UserData | null>(null);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const fetchUsersAndFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("qr_drive_token") || "";
      const [usersData, filesData] = await Promise.all([
        apiGetUsers(token),
        apiGetFiles(token)
      ]);
      setUsers(usersData);
      setFiles(filesData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndFiles();
  }, []);

  // --- Reset Password Handlers ---
  const handleOpenResetModal = (u: UserData) => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setCustomPasscode(randomCode);
    setResetModalUser({ id: u.id, username: u.username });
    setResultPasscode(null);
    setCopiedCode(false);
  };

  const handleGenerateRandomCode = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setCustomPasscode(randomCode);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetModalUser) return;
    if (!/^\d{6}$/.test(customPasscode.trim())) {
      setError("Le code doit contenir exactement 6 chiffres.");
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      const token = localStorage.getItem("qr_drive_token") || "";
      const result = await apiResetUserPassword(token, resetModalUser.id, customPasscode.trim());

      setResultPasscode({
        username: resetModalUser.username,
        code: result.newPassword,
      });
      setSuccess(`Le mot de passe de "${resetModalUser.username}" a été réinitialisé avec succès.`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de la réinitialisation.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!resultPasscode) return;
    try {
      await navigator.clipboard.writeText(resultPasscode.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Profile Edit Handlers ---
  const handleOpenEditModal = (u: UserData) => {
    setEditModalUser(u);
    setEditUsername(u.username);
    setEditRole(u.role);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;

    if (!editUsername.trim() || editUsername.trim().length < 2) {
      setError("L'identifiant doit contenir au moins 2 caractères.");
      return;
    }

    setIsSavingProfile(true);
    setError(null);

    try {
      const token = localStorage.getItem("qr_drive_token") || "";
      const updatedUser = await apiUpdateUserProfile(token, editModalUser.id, {
        username: editUsername.trim(),
        role: editRole,
      });

      setUsers(prev => prev.map(u => u.id === editModalUser.id ? { ...u, username: updatedUser.username, role: updatedUser.role } : u));
      // Update files list metadata if username changed
      setFiles(prev => prev.map(f => f.ownerId === editModalUser.id ? { ...f, ownerUsername: updatedUser.username } : f));

      setSuccess(`Profil de "${updatedUser.username}" mis à jour avec succès.`);
      setTimeout(() => setSuccess(null), 3000);
      setEditModalUser(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de la mise à jour du profil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- Role Quick Toggle ---
  const handleToggleRole = async (userId: string, currentRole: 'admin' | 'user') => {
    if (userId === currentUser?.id) {
      setError("Vous ne pouvez pas modifier votre propre rôle.");
      return;
    }

    const newRole = currentRole === "admin" ? "user" : "admin";
    setActionUserId(userId);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("qr_drive_token") || "";
      await apiUpdateUserRole(token, userId, newRole);

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setSuccess(`Rôle de l'utilisateur mis à jour en ${newRole === 'admin' ? 'Administrateur' : 'Utilisateur'}.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setActionUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, fullName: string) => {
    if (userId === currentUser?.id) {
      setError("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de "${fullName}" ?`)) {
      return;
    }

    setActionUserId(userId);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("qr_drive_token") || "";
      await apiDeleteUser(token, userId);

      setUsers(prev => prev.filter(u => u.id !== userId));
      setSuccess(`Compte de "${fullName}" supprimé avec succès.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setActionUserId(null);
    }
  };

  // --- File deletion in modal ---
  const handleDeleteUserFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Supprimer définitivement le fichier "${fileName}" ?`)) {
      return;
    }

    setDeletingFileId(fileId);
    try {
      const token = localStorage.getItem("qr_drive_token") || "";
      await apiDeleteFile(token, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setSuccess(`Fichier "${fileName}" supprimé.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Erreur lors de la suppression du fichier.");
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleCopyLink = async (fileId: string) => {
    const url = `${window.location.origin}/share/${fileId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedFileId(fileId);
      setTimeout(() => setCopiedFileId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      return isoString;
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        <p className="text-slate-400 text-xs mt-3 font-semibold animate-pulse">Chargement de l'administration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-200">Gestion des Comptes & Fichiers</h3>
          <p className="text-xs text-slate-400 mt-1">
            Éditez les identifiants, réinitialisez les mots de passe et inspectez les fichiers partagés par chaque utilisateur.
          </p>
        </div>
        <button
          onClick={fetchUsersAndFiles}
          className="text-xs font-semibold px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center space-x-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
          <span>Rafraîchir</span>
        </button>
      </div>

      {/* Messages */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-3.5 bg-red-950/40 border border-red-900/30 text-red-400 rounded-2xl flex items-center space-x-2 text-xs font-semibold"
          >
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-3.5 bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 rounded-2xl flex items-center space-x-2 text-xs font-semibold"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-900/40 border border-slate-850 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/40">
                <th className="py-4 px-5">Utilisateur</th>
                <th className="py-4 px-5">Rôle</th>
                <th className="py-4 px-5">Fichiers</th>
                <th className="py-4 px-5">Créé le</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/50">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isActing = actionUserId === u.id;
                const fullName = u.username || 'utilisateur';
                const userFiles = files.filter(f => f.ownerId === u.id || f.ownerUsername === u.username);

                return (
                  <tr key={u.id} className="text-xs hover:bg-slate-900/30 transition-colors">
                    {/* User info */}
                    <td className="py-4 px-5">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl border ${
                          u.role === "admin" 
                            ? "bg-emerald-500/10 border-emerald-500/15 text-emerald-400" 
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}>
                          {u.role === "admin" ? <Shield className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                            {fullName}
                            {isSelf && (
                              <span className="text-[9px] bg-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded">
                                Vous
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{u.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        u.role === "admin"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                          : "bg-slate-950 text-slate-400 border-slate-800"
                      }`}>
                        {u.role === "admin" ? "Administrateur" : "Membre"}
                      </span>
                    </td>

                    {/* User Files count button */}
                    <td className="py-4 px-5">
                      <button
                        onClick={() => setViewFilesUser(u)}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                        title="Voir les fichiers de cet utilisateur"
                      >
                        <FolderKey className="h-3.5 w-3.5" />
                        <span>{userFiles.length} fichier{userFiles.length > 1 ? 's' : ''}</span>
                      </button>
                    </td>

                    {/* Created date */}
                    <td className="py-4 px-5 text-slate-400 font-mono text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>{formatDate(u.createdAt)}</span>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Edit Profile Button */}
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          disabled={isActing}
                          className="p-2 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition-all cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center active:scale-95"
                          title="Modifier les données du profil"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* Reset Password / Passcode Button */}
                        <button
                          onClick={() => handleOpenResetModal(u)}
                          disabled={isActing}
                          className="p-2 bg-slate-950 hover:bg-emerald-950/30 text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-900/40 rounded-xl transition-all cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center active:scale-95"
                          title="Régénérer le mot de passe à 6 chiffres"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>

                        {/* Toggle Role Button */}
                        <button
                          onClick={() => handleToggleRole(u.id, u.role)}
                          disabled={isSelf || isActing}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer min-h-[42px] flex items-center justify-center ${
                            isSelf 
                              ? "opacity-40 cursor-not-allowed text-slate-600 border-slate-900" 
                              : "bg-slate-950 hover:bg-slate-850 text-slate-300 border-slate-800 hover:text-white active:scale-95"
                          }`}
                          title="Changer le rôle"
                        >
                          {isActing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                          ) : (
                            u.role === "admin" ? "Rétrograder" : "Promouvoir"
                          )}
                        </button>

                        {/* Delete User Button */}
                        <button
                          onClick={() => handleDeleteUser(u.id, fullName)}
                          disabled={isSelf || isActing}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center ${
                            isSelf 
                              ? "opacity-40 cursor-not-allowed text-slate-600 border-slate-900" 
                              : "bg-slate-950 hover:bg-red-950/30 text-slate-500 border-slate-800 hover:border-red-900/40 hover:text-red-400 active:scale-95"
                          }`}
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-slate-900 border border-slate-800/90 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Pencil className="h-5 w-5" />
                  <h3 className="font-bold text-slate-200">Modifier le Profil</h3>
                </div>
                <button
                  onClick={() => setEditModalUser(null)}
                  className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-2 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Identifiant (Nom d'utilisateur)</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-100 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Utilisé par l'utilisateur pour se connecter à QR Drive.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Rôle d'Accès</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    disabled={editModalUser.id === currentUser?.id}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-100 focus:outline-none"
                  >
                    <option value="user">Membre (Accès fichiers standard)</option>
                    <option value="admin">Administrateur (Gestion globale)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const target = editModalUser;
                      setEditModalUser(null);
                      handleOpenResetModal(target);
                    }}
                    className="text-xs font-semibold text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Régénérer le mot de passe</span>
                  </button>
                </div>

                <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditModalUser(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 cursor-pointer transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 cursor-pointer transition-all disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <span>Sauvegarder</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Files Inspection Modal */}
      <AnimatePresence>
        {viewFilesUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-slate-900 border border-slate-800/90 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <FolderKey className="h-5 w-5" />
                  <h3 className="font-bold text-slate-200">
                    Fichiers de <span className="text-emerald-400">{viewFilesUser.username}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setViewFilesUser(null)}
                  className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-2 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body list */}
              <div className="p-5 overflow-y-auto space-y-3 flex-grow">
                {(() => {
                  const userFiles = files.filter(
                    f => f.ownerId === viewFilesUser.id || f.ownerUsername === viewFilesUser.username
                  );

                  if (userFiles.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center">
                        <FolderKey className="h-8 w-8 text-slate-600 mb-2" />
                        <p className="font-semibold text-slate-300">Aucun fichier téléversé</p>
                        <p className="text-slate-500 mt-1">Cet utilisateur n'a aucun fichier hébergé sur QR Drive.</p>
                      </div>
                    );
                  }

                  return userFiles.map((file) => {
                    const isExpired = file.expiresAt && new Date() > new Date(file.expiresAt);
                    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

                    return (
                      <div
                        key={file.id}
                        className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700/80 transition-all"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-200 truncate">{file.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 flex-wrap">
                              <span>{sizeMB} Mo</span>
                              <span>•</span>
                              <span>{formatDate(file.uploadedAt)}</span>
                              <span>•</span>
                              <span className="text-emerald-400/90 font-semibold">{file.downloads} téléchargement{file.downloads > 1 ? 's' : ''}</span>
                              {isExpired && (
                                <span className="text-red-400 font-bold bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/30">
                                  Expiré
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-850">
                          {/* QR code dialog shortcut */}
                          {onOpenQR && (
                            <button
                              onClick={() => {
                                setViewFilesUser(null);
                                onOpenQR(file);
                              }}
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
                              title="Afficher le QR code"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              <span className="hidden xs:inline">QR Code</span>
                            </button>
                          )}

                          {/* Copy Link */}
                          <button
                            onClick={() => handleCopyLink(file.id)}
                            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
                            title="Copier le lien"
                          >
                            {copiedFileId === file.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          </button>

                          {/* Delete file */}
                          <button
                            onClick={() => handleDeleteUserFile(file.id, file.name)}
                            disabled={deletingFileId === file.id}
                            className="p-2.5 bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/40 rounded-xl transition-all cursor-pointer active:scale-95"
                            title="Supprimer le fichier"
                          >
                            {deletingFileId === file.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-400">
                  Supervision administrateur — Accès direct aux fichiers.
                </span>
                <button
                  onClick={() => setViewFilesUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-slate-900 border border-slate-800/90 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <KeyRound className="h-5 w-5" />
                  <h3 className="font-bold text-slate-200">Réinitialiser le mot de passe</h3>
                </div>
                <button
                  onClick={() => setResetModalUser(null)}
                  className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-2 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!resultPasscode ? (
                <div className="mt-5 space-y-4">
                  <p className="text-xs text-slate-300">
                    Définissez ou régénérez un nouveau code à 6 chiffres pour l'utilisateur{" "}
                    <strong className="text-emerald-400">{resetModalUser.username}</strong> :
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Nouveau code (6 chiffres)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={customPasscode}
                        onChange={(e) => setCustomPasscode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="111111"
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-center text-xl font-mono tracking-widest text-emerald-400 font-bold focus:outline-none w-full"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateRandomCode}
                        className="p-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-2xl border border-slate-700 hover:border-slate-600 cursor-pointer transition-colors shrink-0"
                        title="Générer un code aléatoire"
                      >
                        <RefreshCw className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setResetModalUser(null)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 cursor-pointer transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmResetPassword}
                      disabled={isResetting || customPasscode.length !== 6}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Mise à jour...</span>
                        </>
                      ) : (
                        <span>Enregistrer le code</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 text-center space-y-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 inline-block mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Mot de passe mis à jour !</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Le code d'accès pour <strong className="text-slate-200">{resultPasscode.username}</strong> est maintenant :
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
                    <span className="text-2xl font-mono font-bold tracking-widest text-emerald-400">
                      {resultPasscode.code}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-emerald-500/30 active:scale-95"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setResetModalUser(null)}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
