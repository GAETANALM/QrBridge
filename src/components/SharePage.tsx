import { useEffect, useState } from "react";
import { Download, FileText, ImageIcon, Music, Video, File, AlertCircle, Loader2, ArrowLeft, Heart } from "lucide-react";
import { motion } from "motion/react";
import { FileMetadata } from "../types";
import { apiGetFileMetadata, apiDownloadFile } from "../lib/api";

interface SharePageProps {
  fileId: string;
  onGoToHome: () => void;
}

export default function SharePage({ fileId, onGoToHome }: SharePageProps) {
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadFileData() {
      try {
        const metaRes = await apiGetFileMetadata(fileId);
        if (metaRes.status === 410) {
          if (metaRes.file) setFile(metaRes.file);
          setError("expired");
          setLoading(false);
          return;
        }
        if (metaRes.status === 404 || !metaRes.file) {
          throw new Error("Ce fichier n'existe plus ou est introuvable.");
        }
        setFile(metaRes.file);

        // Fetch download blob/data URL
        const downloadRes = await apiDownloadFile(fileId);
        if (downloadRes.status === 200 && downloadRes.blobUrl) {
          setContentUrl(downloadRes.blobUrl);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Une erreur est survenue.");
      } finally {
        setLoading(false);
      }
    }

    loadFileData();
  }, [fileId]);

  const getFormatSize = (bytes: number): string => {
    if (bytes === 0) return "0 Octets";
    const k = 1024;
    const sizes = ["Octets", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-10 w-10 text-emerald-400" />;
    if (type.startsWith("video/")) return <Video className="h-10 w-10 text-emerald-400" />;
    if (type.startsWith("audio/")) return <Music className="h-10 w-10 text-emerald-400" />;
    if (type.includes("pdf") || type.includes("text") || type.includes("word") || type.includes("document")) {
      return <FileText className="h-10 w-10 text-emerald-400" />;
    }
    return <File className="h-10 w-10 text-emerald-400" />;
  };

  const isPreviewableImage = (type: string): boolean => {
    return type.startsWith("image/");
  };

  const isPreviewableAudio = (type: string): boolean => {
    return type.startsWith("audio/");
  };

  const isPreviewableVideo = (type: string): boolean => {
    return type.startsWith("video/");
  };

  const handleDownload = async () => {
    if (file && error !== "expired") {
      let targetUrl = contentUrl;
      if (!targetUrl) {
        const res = await apiDownloadFile(file.id);
        if (res.blobUrl) {
          targetUrl = res.blobUrl;
          setContentUrl(res.blobUrl);
        }
      }

      if (targetUrl) {
        const a = document.createElement("a");
        a.href = targetUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        window.location.href = `/api/download/${file.id}`;
      }

      // Increment download count locally for visual feel
      setFile((prev) => (prev ? { ...prev, downloads: prev.downloads + 1 } : null));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
        <p className="text-slate-400 mt-4 font-medium animate-pulse">Récupération du fichier...</p>
      </div>
    );
  }

  // Handle expired state UI
  if (error === "expired" && file) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6">
        {/* Top Bar / Logo */}
        <header className="max-w-4xl w-full mx-auto flex items-center justify-between mb-8">
          <button
            id="logo-brand-btn"
            onClick={onGoToHome}
            className="flex items-center space-x-2 text-slate-200 hover:text-white transition-colors"
          >
            <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-lg">
              <Download className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight text-lg">QR Drive</span>
          </button>
        </header>

        {/* Main Content Area */}
        <main className="max-w-xl w-full mx-auto flex-grow flex flex-col justify-center py-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-center"
          >
            {/* Background warning red glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="p-5 bg-red-950/20 border border-red-900/20 text-red-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-9 w-9" />
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-slate-200 mb-2">Lien de partage expiré</h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
              Le propriétaire a défini une date de validité pour ce fichier de partage, et elle est désormais dépassée.
            </p>

            <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 text-left space-y-2 mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Détails du fichier</p>
              <p className="text-sm font-semibold text-slate-300 break-all">{file.name}</p>
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Taille : {getFormatSize(file.size)}</span>
                {file.expiresAt && (
                  <span className="text-red-400 font-semibold">Expiré le {formatDate(file.expiresAt)}</span>
                )}
              </div>
            </div>

            <button
              id="go-home-expired-btn"
              onClick={onGoToHome}
              className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-semibold transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Créer votre propre QR Drive</span>
            </button>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-xs py-6 border-t border-slate-900/80 max-w-4xl w-full mx-auto mt-8 flex items-center justify-between">
          <p>© 2026 QR Drive • Partage sécurisé et instantané</p>
          <p className="flex items-center space-x-1">
            <span>Développé avec</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
          </p>
        </footer>
      </div>
    );
  }

  // General error handling UI
  if (error || !file) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-xl"
        >
          <div className="p-3 bg-red-950/50 text-red-400 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">Fichier introuvable</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {error || "Ce lien de partage n'est plus valide. Le propriétaire a peut-être supprimé le fichier."}
          </p>
          <button
            id="go-home-error-btn"
            onClick={onGoToHome}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-semibold transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Aller sur QR Drive</span>
          </button>
        </motion.div>
      </div>
    );
  }

  // Define preview URL
  const previewUrl = contentUrl || `/api/download/${file.id}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6">
      {/* Top Bar / Logo */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between mb-8">
        <button
          id="logo-brand-btn"
          onClick={onGoToHome}
          className="flex items-center space-x-2 text-slate-200 hover:text-white transition-colors animate-fade-in"
        >
          <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-lg">
            <Download className="h-5 w-5" />
          </div>
          <span className="font-bold tracking-tight text-lg">QR Drive</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl w-full mx-auto flex-grow flex flex-col justify-center py-6">
        <motion.div
          id="share-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* File Metadata Overview */}
          <div className="flex flex-col items-center text-center">
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl shadow-inner mb-6 ring-4 ring-slate-900/50">
              {getFileIcon(file.type)}
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-slate-100 leading-snug break-all px-2" id="share-filename">
              {file.name}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-3 font-medium">
              <span>{getFormatSize(file.size)}</span>
              <span className="text-slate-600">•</span>
              <span>Téléchargé {file.downloads} fois</span>
              {file.expiresAt && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400 font-semibold">Valide jusqu'au {formatDate(file.expiresAt)}</span>
                </>
              )}
            </div>

            {/* Rich Media Previews */}
            {isPreviewableImage(file.type) && (
              <div id="image-preview-container" className="w-full mt-6 bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden p-2 group">
                <img
                  src={previewUrl}
                  alt={file.name}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-72 object-contain rounded-xl bg-slate-950 transition-transform duration-300 group-hover:scale-[1.01]"
                />
              </div>
            )}

            {isPreviewableAudio(file.type) && (
              <div id="audio-preview-container" className="w-full mt-6 bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center">
                <p className="text-xs text-slate-500 mb-2 font-mono">Aperçu Audio</p>
                <audio controls src={previewUrl} className="w-full h-10 accent-emerald-500" />
              </div>
            )}

            {isPreviewableVideo(file.type) && (
              <div id="video-preview-container" className="w-full mt-6 bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden p-2">
                <video controls src={previewUrl} className="w-full max-h-72 rounded-xl object-contain" />
              </div>
            )}

            {/* Main Action Button */}
            <motion.button
              id="main-download-button"
              onClick={handleDownload}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-8 flex items-center justify-center space-x-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-emerald-950/40 transition-all cursor-pointer text-base"
            >
              <Download className="h-5 w-5 animate-bounce" />
              <span>Télécharger le Fichier</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Viral Conversion Loop Banner */}
        <motion.div
          id="viral-loop-banner"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8 p-4 bg-slate-900/40 border border-slate-800/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-xl mx-auto"
        >
          <div className="text-left sm:text-left text-center">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Besoin de partager un fichier ?</p>
            <p className="text-sm text-slate-200 mt-0.5">Créez votre propre lien de partage par QR code</p>
          </div>
          <button
            id="viral-create-btn"
            onClick={onGoToHome}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/45 text-emerald-400 py-2 px-4 rounded-xl font-semibold text-xs transition-all shrink-0 cursor-pointer"
          >
            Créer un QR Drive
          </button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center text-slate-500 text-xs py-6 border-t border-slate-900/80 max-w-4xl w-full mx-auto mt-8 flex items-center justify-between">
        <p>© 2026 QR Drive • Partage sécurisé et instantané</p>
        <p className="flex items-center space-x-1">
          <span>Développé avec</span>
          <Heart className="h-3 w-3 text-red-500 fill-red-500" />
        </p>
      </footer>
    </div>
  );
}
