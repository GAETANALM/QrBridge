import React, { useState, useRef } from "react";
import { Upload, Loader2, AlertCircle, FileUp, Clock, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FileMetadata, getApiUrl } from "../types";

interface FileUploaderProps {
  onUploadSuccess: (file: FileMetadata) => void;
}

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expirationType, setExpirationType] = useState<'never' | '10m' | '1h' | '1d' | '7d' | 'custom'>('never');
  const [customExpiryDate, setCustomExpiryDate] = useState<string>("");
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
        const token = localStorage.getItem("qr_drive_token");
        const response = await fetch(getApiUrl("/api/upload"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64Content,
            expiresAt,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Une erreur est survenue lors de l'envoi.");
        }

        const uploadedFile = await response.json();
        setUploadProgress(100);
        
        // Brief delay for the 100% progress animation to be visible
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
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
      
      <motion.div
        id="uploader-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isUploading ? triggerFileInput : undefined}
        className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          isDragging 
            ? "border-emerald-500 bg-emerald-50/10" 
            : "border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/60"
        } ${isUploading ? "pointer-events-none" : ""}`}
        whileHover={!isUploading ? { scale: 1.002 } : {}}
        whileTap={!isUploading ? { scale: 0.998 } : {}}
      >
        {isUploading ? (
          <div className="flex flex-col items-center space-y-4 py-6">
            <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" id="upload-spinner" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-200">Conversion et envoi du fichier...</p>
              <p className="text-xs text-slate-400 mt-1">{uploadProgress}% complété</p>
            </div>
            <div className="w-64 bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <motion.div 
                className="bg-emerald-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-slate-800/80 rounded-full text-slate-300 ring-4 ring-slate-800/30">
              <FileUp className="h-8 w-8 text-emerald-400" id="upload-icon" />
            </div>
            <div>
              <p className="text-base font-medium text-slate-200">
                Glissez-déposez un fichier ici, ou{" "}
                <span className="text-emerald-400 font-semibold hover:underline">parcourez</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tous types de fichiers acceptés (maximum 45 Mo)
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Expiration Settings Container */}
      {!isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-slate-900/30 border border-slate-800/60 rounded-2xl p-4 md:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-slate-300">
              <Clock className="h-4 w-4 text-emerald-400" />
              <h4 className="text-sm font-semibold">Durée de validité du QR Code</h4>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/15 py-0.5 px-2 rounded-full">
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
                onClick={() => setExpirationType(opt.value as any)}
                className={`py-2 px-1 text-center rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  expirationType === opt.value
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-sm"
                    : "bg-slate-950/40 text-slate-400 border-slate-850 hover:border-slate-800 hover:text-slate-300"
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
                className="mt-4 pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center gap-3 overflow-hidden"
              >
                <div className="flex items-center space-x-2 text-xs text-slate-400 shrink-0">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <span>Date et heure d'expiration :</span>
                </div>
                <input
                  type="datetime-local"
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  min={new Date().toISOString().substring(0, 16)}
                  className="bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none w-full sm:max-w-xs"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

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
