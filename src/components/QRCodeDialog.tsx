import { useEffect, useRef, useState } from "react";
import { X, Copy, Check, Download, ExternalLink, QrCode, Share2, Clipboard } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import QRCode from "qrcode";
import { FileMetadata } from "../types";

interface QRCodeDialogProps {
  file: FileMetadata | null;
  onClose: () => void;
}

export default function QRCodeDialog({ file, onClose }: QRCodeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedQR, setCopiedQR] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isShareSupported, setIsShareSupported] = useState(false);

  useEffect(() => {
    // Check if Web Share API is available
    if (typeof navigator !== "undefined" && navigator.share) {
      setIsShareSupported(true);
    }
  }, []);

  useEffect(() => {
    if (file) {
      // Calculate full share URL based on the current domain
      const url = `${window.location.origin}/share/${file.id}`;
      setShareUrl(url);

      // Brief timeout to ensure canvas is rendered
      const timeoutId = setTimeout(() => {
        if (canvasRef.current) {
          QRCode.toCanvas(
              canvasRef.current,
              url,
              {
                width: 260,
                margin: 1.5,
                color: {
                  dark: "#0b1329", // dark navy/black matching the theme
                  light: "#ffffff", // clean white background for high scan contrast
                },
              },
              (error) => {
                if (error) {
                  console.error("Error generating QR Code:", error);
                }
              }
          );
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [file]);

  if (!file) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleCopyQRImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          setCopiedQR(true);
          setTimeout(() => setCopiedQR(false), 2000);
        } catch (innerErr) {
          console.error("Failed to write to clipboard:", innerErr);
          // Fallback if ClipboardItem fails
          alert("Votre navigateur ne supporte pas la copie directe d'images. Veuillez faire un clic droit sur le code QR pour le copier.");
        }
      }, "image/png");
    } catch (err) {
      console.error("Failed to convert canvas to blob:", err);
    }
  };

  const handleDownloadQR = () => {
    if (canvasRef.current) {
      try {
        const url = canvasRef.current.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `qrcode-${file.name.replace(/\.[^/.]+$/, "")}.png`;
        link.href = url;
        link.click();
      } catch (err) {
        console.error("Failed to download QR code:", err);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QR Drive - ${file.name}`,
          text: `Scannez ou cliquez pour accéder au fichier "${file.name}" :`,
          url: shareUrl,
        });
      } catch (err) {
        // Ignore abort error
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to share:", err);
        }
      }
    } else {
      // Fallback
      handleCopyLink();
      alert("Le partage natif n'est pas supporté sur cet appareil. Le lien a été copié dans votre presse-papiers.");
    }
  };

  return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
              id="dialog-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
              id="dialog-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center space-x-2 text-emerald-400">
                <QrCode className="h-5 w-5" />
                <h3 className="font-semibold text-slate-200">Options du QR Code</h3>
              </div>
              <button
                  id="dialog-close-btn"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col items-center">
              {/* File info banner */}
              <div className="w-full text-center mb-5">
                <p className="text-sm font-semibold text-slate-300 line-clamp-1 break-all px-2">
                  {file.name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} Mo • Prêt à être partagé
                </p>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-3 rounded-2xl shadow-inner border border-slate-700/50 mb-6 relative group overflow-hidden">
                <canvas ref={canvasRef} id="qr-code-canvas" className="rounded-lg" />
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />
              </div>

              {/* Link Copy Field */}
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between mb-5">
                <div className="overflow-hidden mr-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Lien de téléchargement</p>
                  <p className="text-xs text-slate-300 font-mono truncate select-all">{shareUrl}</p>
                </div>
                <button
                    id="copy-link-btn"
                    onClick={handleCopyLink}
                    className={`p-2 rounded-lg transition-all shrink-0 cursor-pointer ${
                        copiedLink
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    }`}
                    title="Copier le lien"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              {/* Action grid (Copy Image, Save QR, Share, Open) */}
              <div className="grid grid-cols-2 gap-3.5 w-full">
                {/* 1. Copy QR image directly */}
                <button
                    id="copy-qr-img-btn"
                    onClick={handleCopyQRImage}
                    className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer active:scale-[0.98] ${
                        copiedQR
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-950 hover:bg-slate-850 text-slate-200 border-slate-800"
                    }`}
                    title="Copier l'image du QR code dans le presse-papiers"
                >
                  {copiedQR ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>QR Copié !</span>
                      </>
                  ) : (
                      <>
                        <Clipboard className="h-4 w-4 text-emerald-400" />
                        <span>Copier l'image</span>
                      </>
                  )}
                </button>

                {/* 2. Download / Save PNG */}
                <button
                    id="download-qr-btn"
                    onClick={handleDownloadQR}
                    className="flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-850 text-slate-200 py-3 px-4 rounded-xl font-bold text-xs border border-slate-800 transition-all cursor-pointer active:scale-[0.98]"
                    title="Télécharger l'image PNG du QR code"
                >
                  <Download className="h-4 w-4 text-emerald-400" />
                  <span>Enregistrer l'image</span>
                </button>

                {/* 3. Share link */}
                <button
                    id="share-qr-btn"
                    onClick={handleShare}
                    className="flex items-center justify-center space-x-2 bg-slate-950 hover:bg-slate-850 text-slate-200 py-3 px-4 rounded-xl font-bold text-xs border border-slate-800 transition-all cursor-pointer active:scale-[0.98]"
                    title="Partager le QR Code"
                >
                  <Share2 className="h-4 w-4 text-emerald-400" />
                  <span>{isShareSupported ? "Partager" : "Partager (Copier)"}</span>
                </button>

                {/* 4. Open page in new tab */}
                <a
                    id="open-share-link"
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-xl font-bold text-xs shadow-lg shadow-emerald-950/20 transition-all cursor-pointer active:scale-[0.98]"
                    title="Ouvrir le lien de téléchargement directement"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Ouvrir la page</span>
                </a>
              </div>
            </div>

            {/* Footer Guide */}
            <div className="px-6 py-4 bg-slate-950/30 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Vous pouvez copier l'image pour la coller directement, l'enregistrer sur votre appareil, ou partager le lien d'accès.
              </p>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
  );
}
