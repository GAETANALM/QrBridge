import React, { useEffect, useState } from "react";
import { User, Shield, User as UserIcon, Trash2, Calendar, Loader2, AlertCircle, CheckCircle2, KeyRound, Copy, Check, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiGetUsers, apiUpdateUserRole, apiDeleteUser, apiResetUserPassword } from "../lib/api";

interface AdminUsersTabProps {
  currentUser: { id: string; username: string; role: 'admin' | 'user' } | null;
}

interface UserData {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export default function AdminUsersTab({ currentUser }: AdminUsersTabProps) {
  const [users, setUsers] = useState<UserData[]>([]);
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

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("qr_drive_token") || "";
      const data = await apiGetUsers(token);
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement des utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de "${fullName}" ? Tous ses fichiers seront également inaccessibles si vous les supprimez.`)) {
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
        <p className="text-slate-400 text-xs mt-3 font-semibold animate-pulse">Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-200">Gestion des Comptes</h3>
          <p className="text-xs text-slate-400 mt-1">
            Administrez les rôles, régénérez les mots de passe et supprimez les comptes utilisateurs.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="text-xs font-semibold px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          Rafraîchir la liste
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
                <th className="py-4 px-5">Créé le</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/50">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isActing = actionUserId === u.id;
                const fullName = u.username || 'utilisateur';

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
                        {u.role === "admin" ? "Administrateur" : "Utilisateur"}
                      </span>
                    </td>

                    {/* Created date */}
                    <td className="py-4 px-5 text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>{formatDate(u.createdAt)}</span>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
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
                          {isActing && actionUserId === u.id ? (
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
