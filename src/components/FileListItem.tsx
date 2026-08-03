import React, { useState } from "react";
import { FileText, ImageIcon, Music, Video, File, QrCode, Copy, Check, Trash2, Clock, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { FileMetadata } from "../types";

interface FileListItemProps {
  key?: string | number;
  file: FileMetadata;
  onOpenQR: (file: FileMetadata) => void;
  onDelete: (id: string) => void | Promise<void>;
}

export default function FileListItem({ file, onOpenQR, onDelete }: FileListItemProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  // Check if file has expired
  const isExpired = file.expiresAt ? new Date() > new Date(file.expiresAt) : false;

  const getFormatSize = (bytes: number): string => {
    if (bytes === 0) return "0 Octets";
    const k = 1024;
    const sizes = ["Octets", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    const className = `h-6 w-6 ${isExpired ? "text-slate-500" : "text-emerald-400"}`;
    if (type.startsWith("image/")) return <ImageIcon className={className} />;
    if (type.startsWith("video/")) return <Video className={className} />;
    if (type.startsWith("audio/")) return <Music className={className} />;
    if (type.includes("pdf") || type.includes("text") || type.includes("word") || type.includes("document")) {
      return <FileText className={className} />;
    }
    return <File className={className} />;
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpired) return;
    try {
      const shareUrl = `${window.location.origin}/share/${file.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <motion.div
      id={`file-item-${file.id}`}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isExpired
          ? "bg-slate-950/40 border-slate-900/60 text-slate-500"
          : "bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700/80"
      }`}
    >
      {/* File Info */}
      <div className="flex items-center space-x-4 min-w-0 flex-1">
        <div className={`p-3 bg-slate-950 border rounded-xl shrink-0 shadow-inner ${
          isExpired ? "border-slate-900" : "border-slate-800"
        }`}>
          {getFileIcon(file.type)}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold truncate break-all ${
            isExpired ? "text-slate-500 line-through" : "text-slate-200"
          }`} title={file.name}>
            {file.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
            <span className={`font-medium ${isExpired ? "text-slate-500" : "text-slate-300"}`}>
              {getFormatSize(file.size)}
            </span>
            <span className="text-slate-700">•</span>
            <div className="flex items-center space-x-1 text-slate-400">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{formatDate(file.uploadedAt)}</span>
            </div>
            
            {/* Expiration and Download status */}
            {file.expiresAt && (
              <>
                <span className="text-slate-700">•</span>
                <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  isExpired
                    ? "bg-red-500/10 text-red-400/90 border-red-500/15"
                    : "bg-amber-500/10 text-amber-400/90 border-amber-500/15"
                }`}>
                  <Clock className="h-3 w-3" />
                  <span>
                    {isExpired 
                      ? `Expiré le ${formatDate(file.expiresAt)}` 
                      : `Expire le ${formatDate(file.expiresAt)}`
                    }
                  </span>
                </div>
              </>
            )}

            {!isExpired && file.downloads > 0 && (
              <>
                <span className="text-slate-700">•</span>
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-500/10">
                  {file.downloads} {file.downloads > 1 ? "téléchargements" : "téléchargement"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 border-t border-slate-800/40 md:border-t-0 pt-3 md:pt-0 w-full md:w-auto">
        {isExpired ? (
          <div className="flex items-center space-x-1.5 px-3 py-2 bg-red-950/10 border border-red-950/20 text-red-400/80 rounded-xl text-xs font-semibold select-none min-h-[44px]">
            <AlertTriangle className="h-4 w-4" />
            <span>Lien expiré</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 md:flex-initial">
            {/* Copy Link Button */}
            <button
              id={`copy-btn-${file.id}`}
              onClick={handleCopyLink}
              className={`flex-1 md:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px] active:scale-95 ${
                copied
                  ? "bg-emerald-500/25 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-800"
              }`}
              title="Copier le lien"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-emerald-400" />
                  <span>Copier</span>
                </>
              )}
            </button>

            {/* QR Code Action */}
            <button
              id={`qr-btn-${file.id}`}
              onClick={() => onOpenQR(file)}
              className="flex-1 md:flex-initial flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/20 cursor-pointer min-h-[44px] active:scale-95"
              title="Afficher le QR code"
            >
              <QrCode className="h-4 w-4" />
              <span>QR Code</span>
            </button>
          </div>
        )}

        {/* Delete button */}
        <button
          id={`delete-btn-${file.id}`}
          onClick={() => onDelete(file.id)}
          className="p-2.5 bg-slate-850 hover:bg-red-950/30 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/45 rounded-xl transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
          title="Supprimer définitivement"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
