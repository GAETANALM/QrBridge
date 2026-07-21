import React, { useEffect, useState } from "react";
import { User, Shield, User as UserIcon, Trash2, Calendar, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl } from "../types";

interface AdminUsersTabProps {
  currentUser: { id: string; prenom: string; nom: string; role: 'admin' | 'user' } | null;
}

interface UserData {
  id: string;
  prenom: string;
  nom: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export default function AdminUsersTab({ currentUser }: AdminUsersTabProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("qr_drive_token");
      const response = await fetch(getApiUrl("/api/admin/users"), {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error("Impossible de charger la liste des utilisateurs.");
      }

      const data = await response.json();
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
      const token = localStorage.getItem("qr_drive_token");
      const response = await fetch(getApiUrl(`/api/admin/users/${userId}/role`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de mettre à jour le rôle.");
      }

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
      const token = localStorage.getItem("qr_drive_token");
      const response = await fetch(getApiUrl(`/api/admin/users/${userId}`), {
        method: "DELETE",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de supprimer l'utilisateur.");
      }

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
            Administrez les rôles et supprimez les comptes utilisateurs. Les administrateurs peuvent voir et supprimer tous les fichiers partagés de la plateforme.
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
                const fullName = `${u.prenom} ${u.nom}`;

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
                        {/* Toggle Role Button */}
                        <button
                          onClick={() => handleToggleRole(u.id, u.role)}
                          disabled={isSelf || isActing}
                          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${
                            isSelf 
                              ? "opacity-40 cursor-not-allowed text-slate-600 border-slate-900" 
                              : "bg-slate-950 hover:bg-slate-850 text-slate-300 border-slate-800 hover:text-white"
                          }`}
                          title="Changer le rôle"
                        >
                          {isActing && actionUserId === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                          ) : (
                            u.role === "admin" ? "Rétrograder" : "Promouvoir"
                          )}
                        </button>

                        {/* Delete User Button */}
                        <button
                          onClick={() => handleDeleteUser(u.id, fullName)}
                          disabled={isSelf || isActing}
                          className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                            isSelf 
                              ? "opacity-40 cursor-not-allowed text-slate-600 border-slate-900" 
                              : "bg-slate-950 hover:bg-red-950/30 text-slate-500 border-slate-800 hover:border-red-900/40 hover:text-red-400"
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
    </div>
  );
}
