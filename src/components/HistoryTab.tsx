import React, { useEffect, useState } from "react";
import { History, Search, RefreshCw, UploadCloud, Download, Trash2, RotateCcw, XCircle, ShieldAlert, UserCheck, Clock, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ActivityLog } from "../types";
import { apiGetHistory } from "../lib/api";

interface HistoryTabProps {
  token: string;
}

export default function HistoryTab({ token }: HistoryTabProps): React.JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetHistory(token);
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur de chargement de l'historique.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "upload":
        return {
          icon: <UploadCloud className="h-4 w-4 text-emerald-400" />,
          label: "Téléversement",
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "download":
        return {
          icon: <Download className="h-4 w-4 text-sky-400" />,
          label: "Téléchargement",
          bg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        };
      case "trash":
        return {
          icon: <Trash2 className="h-4 w-4 text-amber-400" />,
          label: "Mise à la corbeille",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "restore":
        return {
          icon: <RotateCcw className="h-4 w-4 text-indigo-400" />,
          label: "Restauration",
          bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        };
      case "delete":
        return {
          icon: <XCircle className="h-4 w-4 text-rose-400" />,
          label: "Suppression",
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        };
      case "user_update":
        return {
          icon: <UserCheck className="h-4 w-4 text-purple-400" />,
          label: "Compte Utilisateur",
          bg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        };
      default:
        return {
          icon: <Clock className="h-4 w-4 text-slate-400" />,
          label: "Action",
          bg: "bg-slate-800 text-slate-300 border-slate-700",
        };
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.fileName && log.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = filterAction === "all" || log.action === filterAction;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6" id="history-tab-container">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" />
            <span>Historique des Activités</span>
            {logs.length > 0 && (
              <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">
                {logs.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Journal chronologique de toutes les actions effectuées sur vos fichiers et votre compte.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[42px]"
          title="Actualiser l'historique"
        >
          <RefreshCw className={`h-4 w-4 text-slate-400 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher dans l'historique..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 focus:border-slate-700 hover:border-slate-850 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all"
          />
        </div>

        {/* Action Type Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/40 border border-slate-850 p-1 rounded-xl text-[11px] font-semibold">
          <button
            onClick={() => setFilterAction("all")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterAction === "all" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Tous ({logs.length})
          </button>
          <button
            onClick={() => setFilterAction("upload")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterAction === "upload" ? "bg-emerald-500/20 text-emerald-300 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Téléversements
          </button>
          <button
            onClick={() => setFilterAction("download")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterAction === "download" ? "bg-sky-500/20 text-sky-300 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Téléchargements
          </button>
          <button
            onClick={() => setFilterAction("trash")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterAction === "trash" ? "bg-amber-500/20 text-amber-300 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Corbeille
          </button>
        </div>
      </div>

      {/* Timeline List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-xs mt-3 font-semibold">Chargement de l'historique...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex items-center space-x-3 text-red-200 text-sm">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="border border-slate-900 bg-slate-900/10 rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/50 text-slate-500 mb-4">
            <History className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-300">Aucun historique</h3>
          <p className="text-slate-500 text-xs max-w-sm mt-1.5">
            Les actions effectuées apparaîtront ici automatiquement.
          </p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Aucun événement ne correspond à vos filtres.
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-850 ml-3.5 space-y-4 pl-5 pt-1">
          <AnimatePresence mode="popLayout">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const dateStr = new Date(log.timestamp).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <motion.div
                  key={log.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative group"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[27px] top-3.5 h-3 w-3 rounded-full bg-slate-800 border-2 border-slate-950 group-hover:bg-indigo-400 transition-all" />

                  <div className="bg-slate-900/70 border border-slate-850 hover:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-slate-850 rounded-xl border border-slate-800 mt-0.5 shrink-0">
                        {badge.icon}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-200">{log.details}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 font-medium">
                          <span className="text-slate-400">Par <strong className="text-slate-300">{log.username}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="h-3 w-3" />
                            {dateStr}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
