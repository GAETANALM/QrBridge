import React, { useState, useRef } from "react";
import { Upload, Loader2, AlertCircle, FileUp, Clock, Calendar, MessageSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FileMetadata } from "../types";
import { apiUploadFile } from "../lib/api";

interface FileUploaderProps {
  onUploadSuccess: (file: FileMetadata) => void;
}

const getNowPlusHours = (hoursToAdd: number = 1): string => {
  const d = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expirationType, setExpirationType] = useState<'never' | '10m' | '1h' | '1d' | '7d' | 'custom'>('never');
  const [customExpiryDate, setCustomExpiryDate] = useState<string>(getNowPlusHours(1));
  const [customMessage, setCustomMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const processFile = (file: File) => {
    // Limit to 45MB in base64 (which is well within our 100MB server payload limit)
    const MAX_SIZE = 45 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("Le fichier est trop volumineux (maximum 45 Mo).");
      return;
    }

    if (expirationType === "custom" && !customExpiryDate) {
      setError("Veuillez sélectionner une date et une heure d'expiration personnalisées.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(10);

    // Calculate expiration timestamp
    let expiresAt: string | null = null;
    const now = Date.now();
    if (expirationType === "10m") {
      expiresAt = new Date(now + 10 * 60 * 1000).toISOString();
    } else if (expirationType === "1h") {
      expiresAt = new Date(now + 60 * 60 * 1000).toISOString();
    } else if (expirationType === "1d") {
      expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    } else if (expirationType === "7d") {
      expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (expirationType === "custom" && customExpiryDate) {
      expiresAt = new Date(customExpiryDate).toISOString();
    }

    const reader = new FileReader();

    reader.onloadstart = () => {
      setUploadProgress(30);
    };

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 50) + 30; // Scale to 30%-80%
        setUploadProgress(percent);
      }
    };

    reader.onload = async () => {
      setUploadProgress(85);
      const base64Content = reader.result as string;

      try {
        const token = localStorage.getItem("qr_drive_token") || "";
        const uploadedFile = await apiUploadFile(token, {
          name: file.name,
          type: file.type,
          size: file.size,
          content: base64Content,
          expiresAt,
          message: customMessage.trim() || null,
        });

        setUploadProgress(100);
        
        // Brief delay for the 100% progress animation to be visible
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          setCustomMessage("");
          onUploadSuccess(uploadedFile);
        }, 600);

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Impossible de télécharger le fichier.");
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setError("Erreur lors de la lecture du fichier.");
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full">
      <input
        id="file-upload-input"
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* Settings Container (Expiration & Custom Message) - Placed above upload drop zone */}
      {!isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3.5 bg-slate-900/40 border border-slate-800/70 rounded-2xl p-3.5 sm:p-5 space-y-4"
        >
          {/* Custom Message Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-slate-300">
                <MessageSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold">Message accompagné avec le QR Code (optionnel)</h4>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {customMessage.length}/300
              </span>
            </div>
            <div className="relative">
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value.slice(0, 300))}
                rows={2}
                placeholder="Ajoutez une note, une consigne ou des instructions qui s'afficheront lors du scan du QR code..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none transition-all resize-none"
              />
              {customMessage && (
                <button
                  type="button"
                  onClick={() => setCustomMessage("")}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 p-1 rounded-md transition-colors"
                  title="Effacer le message"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Expiration Settings */}
          <div className="pt-3 border-t border-slate-800/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-slate-300">
                <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold">Durée de validité du QR Code</h4>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 py-0.5 px-2 rounded-full">
                {expirationType === "never" && "Permanent"}
                {expirationType === "10m" && "Expire dans 10 min"}
                {expirationType === "1h" && "Expire dans 1 heure"}
                {expirationType === "1d" && "Expire dans 1 jour"}
                {expirationType === "7d" && "Expire dans 7 jours"}
                {expirationType === "custom" && "Date personnalisée"}
              </span>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { value: "never", label: "Permanent" },
                { value: "10m", label: "10 min" },
                { value: "1h", label: "1 heure" },
                { value: "1d", label: "1 jour" },
                { value: "7d", label: "7 jours" },
                { value: "custom", label: "Perso" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setExpirationType(opt.value as any);
                    if (opt.value === "custom" && !customExpiryDate) {
                      setCustomExpiryDate(getNowPlusHours(1));
                    }
                  }}
                  className={`py-2.5 px-1 text-center rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[44px] flex items-center justify-center active:scale-95 ${
                    expirationType === opt.value
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm"
                      : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {expirationType === "custom" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3.5 pt-3.5 border-t border-slate-800/60 space-y-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Sélection de la date et de l'horaire :</span>
                    </div>
                    {customExpiryDate && (
                      <span className="text-[11px] text-emerald-400 font-medium hidden sm:inline">
                        {(() => {
                          try {
                            const d = new Date(customExpiryDate);
                            if (isNaN(d.getTime())) return "";
                            return d.toLocaleDateString("fr-FR", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            });
                          } catch {
                            return "";
                          }
                        })()}
                      </span>
                    )}
                  </div>

                  {/* Dual Selectors: Date and Horaire */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Date d'expiration
                      </label>
                      <input
                        type="date"
                        value={customExpiryDate ? customExpiryDate.split("T")[0] : getNowPlusHours(1).split("T")[0]}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => {
                          const dateVal = e.target.value;
                          const timeVal = customExpiryDate ? (customExpiryDate.split("T")[1] || "12:00") : "12:00";
                          if (dateVal) {
                            setCustomExpiryDate(`${dateVal}T${timeVal}`);
                          }
                        }}
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none w-full min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Horaire d'expiration (Heure & Minutes)
                      </label>
                      <input
                        type="time"
                        value={customExpiryDate ? customExpiryDate.split("T")[1] : getNowPlusHours(1).split("T")[1]}
                        onChange={(e) => {
                          const timeVal = e.target.value;
                          const dateVal = customExpiryDate ? (customExpiryDate.split("T")[0] || getNowPlusHours(1).split("T")[0]) : getNowPlusHours(1).split("T")[0];
                          if (timeVal) {
                            setCustomExpiryDate(`${dateVal}T${timeVal}`);
                          }
                        }}
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none w-full min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Shortcut presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-medium mr-1">Raccourcis :</span>
                    <button
                      type="button"
                      onClick={() => setCustomExpiryDate(getNowPlusHours(1))}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30 min-h-[32px]"
                    >
                      +1 heure (défaut)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomExpiryDate(getNowPlusHours(3))}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700/50 min-h-[32px]"
                    >
                      +3 heures
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomExpiryDate(getNowPlusHours(24))}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700/50 min-h-[32px]"
                    >
                      Demain même heure
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomExpiryDate(getNowPlusHours(168))}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700/50 min-h-[32px]"
                    >
                      +7 jours
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Drag and Drop Zone */}
      <motion.div
        id="uploader-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isUploading ? triggerFileInput : undefined}
        className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          isDragging 
            ? "border-emerald-500 bg-emerald-50/10" 
            : "border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/60"
        } ${isUploading ? "pointer-events-none" : ""}`}
        whileHover={!isUploading ? { scale: 1.002 } : {}}
        whileTap={!isUploading ? { scale: 0.98 } : {}}
      >
        {isUploading ? (
          <div className="flex flex-col items-center space-y-4 py-4 sm:py-6">
            <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-500 animate-spin" id="upload-spinner" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-200">Conversion et envoi du fichier...</p>
              <p className="text-xs text-slate-400 mt-1">{uploadProgress}% complété</p>
            </div>
            <div className="w-56 sm:w-64 bg-slate-800 h-2.5 rounded-full overflow-hidden mt-2">
              <motion.div 
                className="bg-emerald-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-3.5 py-2">
            <div className="p-3.5 sm:p-4 bg-slate-800/80 rounded-2xl text-slate-300 ring-4 ring-slate-800/30">
              <FileUp className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-400" id="upload-icon" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-semibold text-slate-100">
                <span className="hidden sm:inline">Glissez un fichier ici ou </span>
                <span className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-4 font-bold">Toucher pour choisir un fichier</span>
              </p>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium">
                Photos, vidéos, PDF, documents (max 45 Mo)
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {error && (
        <motion.div
          id="upload-error-banner"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center space-x-3 text-red-200 text-sm"
        >
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}
