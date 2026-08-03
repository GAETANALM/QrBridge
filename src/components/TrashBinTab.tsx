import React, { useEffect, useState } from "react";
import { Trash2, RotateCcw, Loader2, AlertCircle, RefreshCw, FileText, ImageIcon, Music, Video, File, Shield, Trash, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FileMetadata } from "../types";
import { apiGetTrashedFiles, apiRestoreFile, apiDeleteFile, apiEmptyTrash } from "../lib/api";

interface TrashBinTabProps {
  token: string;
  onRestoreSuccess?: () => void;
}

export default function TrashBinTab({ token, onRestoreSuccess }: TrashBinTabProps): React.JSX.Element {
  const [trashedFiles, setTrashedFiles] = useState<FileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFileId, setActionFileId] = useState<string | null>(null);
  const [isEmptying, setIsEmptying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTrash = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await apiGetTrashedFiles(token);
      setTrashedFiles(list);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur de chargement de la corbeille.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, [token]);

  const handleRestore = async (id: string) => {
    setActionFileId(id);
    try {
      await apiRestoreFile(token, id);
      setTrashedFiles((prev) => prev.filter((f) => f.id !== id));
      if (onRestoreSuccess) onRestoreSuccess();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la restauration.");
    } finally {
      setActionFileId(null);
    }
  };

  const handlePermanentDelete = async (id: string, fileName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${fileName}" ? Cette action est irréversible.`)) {
      setActionFileId(id);
      try {
        await apiDeleteFile(token, id, true);
        setTrashedFiles((prev) => prev.filter((f) => f.id !== id));
      } catch (err: any) {
        alert(err.message || "Erreur lors de la suppression définitive.");
      } finally {
        setActionFileId(null);
      }
    }
  };

  const handleEmptyTrash = async () => {
    if (trashedFiles.length === 0) return;
    if (window.confirm(`Êtes-vous sûr de vouloir vider la corbeille (${trashedFiles.length} fichier(s)) ? Tout sera définitivement supprimé.`)) {
      setIsEmptying(true);
      try {
        await apiEmptyTrash(token);
        setTrashedFiles([]);
      } catch (err: any) {
        alert(err.message || "Erreur lors du vidage de la corbeille.");
      } finally {
        setIsEmptying(false);
      }
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-purple-400 shrink-0" />;
    if (mimeType.startsWith("audio/")) return <Music className="h-5 w-5 text-pink-400 shrink-0" />;
    if (mimeType.startsWith("video/")) return <Video className="h-5 w-5 text-amber-400 shrink-0" />;
    if (mimeType.includes("pdf") || mimeType.includes("text")) return <FileText className="h-5 w-5 text-blue-400 shrink-0" />;
    return <File className="h-5 w-5 text-slate-400 shrink-0" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Octet";
    const k = 1024;
    const sizes = ["Octets", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const filteredTrash = trashedFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (file.ownerUsername && file.ownerUsername.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6" id="trash-tab-container">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-amber-400" />
            <span>Corbeille</span>
            {trashedFiles.length > 0 && (
              <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">
                {trashedFiles.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Les fichiers supprimés sont conservés ici. Vous pouvez les restaurer ou les effacer définitivement.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTrash}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px]"
            title="Actualiser la corbeille"
          >
            <RefreshCw className={`h-4 w-4 text-slate-400 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {trashedFiles.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              disabled={isEmptying}
              className="flex items-center space-x-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] active:scale-95 disabled:opacity-50"
            >
              {isEmptying ? (
                <Loader2 className="h-4 w-4 animate-spin text-red-400" />
              ) : (
                <Trash className="h-4 w-4 text-red-400" />
              )}
              <span>Vider la corbeille</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search inside trash */}
      {trashedFiles.length > 0 && (
        <div className="max-w-md w-full">
          <input
            type="text"
            placeholder="Rechercher dans la corbeille..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 focus:border-slate-700 hover:border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all"
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <p className="text-slate-400 text-xs mt-3 font-semibold">Chargement de la corbeille...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex items-center space-x-3 text-red-200 text-sm">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : trashedFiles.length === 0 ? (
        <div className="border border-slate-900 bg-slate-900/10 rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/50 text-slate-500 mb-4">
            <Trash2 className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-300">La corbeille est vide</h3>
          <p className="text-slate-500 text-xs max-w-sm mt-1.5">
            Aucun fichier en attente de suppression.
          </p>
        </div>
      ) : filteredTrash.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Aucun fichier correspondant à "{searchQuery}" dans la corbeille.
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTrash.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900/80 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                  <div className="p-2.5 bg-slate-850 rounded-xl border border-slate-800">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-200 truncate">{file.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      {file.ownerUsername && (
                        <span className="text-slate-400 font-medium">Par {file.ownerUsername}</span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1 text-amber-400/90 font-medium">
                        <Clock className="h-3 w-3" />
                        Supprimé le {file.deletedAt ? new Date(file.deletedAt).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : "Récemment"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0 justify-end">
                  <button
                    onClick={() => handleRestore(file.id)}
                    disabled={actionFileId === file.id}
                    className="flex items-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50 min-h-[38px]"
                    title="Restaurer le fichier"
                  >
                    {actionFileId === file.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    <span>Restaurer</span>
                  </button>

                  <button
                    onClick={() => handlePermanentDelete(file.id, file.name)}
                    disabled={actionFileId === file.id}
                    className="flex items-center space-x-1.5 bg-slate-850 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/40 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50 min-h-[38px]"
                    title="Supprimer définitivement"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
