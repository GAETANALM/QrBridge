import { useEffect, useState } from "react";
import { HardDrive, Search, Loader2, AlertCircle, RefreshCw, QrCode, Sparkles, LogOut, Users, FileUp, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FileUploader from "./components/FileUploader";
import FileListItem from "./components/FileListItem";
import QRCodeDialog from "./components/QRCodeDialog";
import SharePage from "./components/SharePage";
import AuthPage from "./components/AuthPage";
import AdminUsersTab from "./components/AdminUsersTab";
import { FileMetadata, AppRoute, User } from "./types";
import { apiGetMe, apiLogout, apiGetFiles, apiDeleteFile } from "./lib/api";

export default function App() {
  const [route, setRoute] = useState<AppRoute>({ type: "admin" });
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);

  // Authentication states
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<'files' | 'users'>('files');

  // Load and verify auth state on mount
  useEffect(() => {
    async function checkExistingSession() {
      const savedToken = localStorage.getItem("qr_drive_token");
      const savedUserStr = localStorage.getItem("qr_drive_user");
      
      if (savedToken && savedUserStr) {
        try {
          const verifiedUser = await apiGetMe(savedToken);
          setUser(verifiedUser);
          setToken(savedToken);
          localStorage.setItem("qr_drive_user", JSON.stringify(verifiedUser));
        } catch (err) {
          console.error("Session verification failed:", err);
          localStorage.removeItem("qr_drive_token");
          localStorage.removeItem("qr_drive_user");
        }
      }
      setIsAuthChecking(false);
    }

    checkExistingSession();
  }, []);

  // Client-side Router setup
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/share\/([^/]+)/);
      if (match) {
        setRoute({ type: "share", fileId: match[1] });
      } else {
        setRoute({ type: "admin" });
      }
    };

    // Initialize and listen to back/forward button clicks
    handleLocationChange();
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const navigateTo = (newRoute: AppRoute) => {
    let url = "/";
    if (newRoute.type === "share") {
      url = `/share/${newRoute.fileId}`;
    }
    window.history.pushState({}, "", url);
    setRoute(newRoute);
  };

  const handleAuthSuccess = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("qr_drive_token", newToken);
    localStorage.setItem("qr_drive_user", JSON.stringify(newUser));
  };

  const handleLogout = async () => {
    const savedToken = localStorage.getItem("qr_drive_token") || token;
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem("qr_drive_token");
    localStorage.removeItem("qr_drive_user");
    setActiveTab("files");

    if (savedToken) {
      try {
        await apiLogout(savedToken);
      } catch (err) {
        console.error("Logout request failed:", err);
      }
    }
  };

  // Fetch files list on mount (only if in admin/dashboard mode and authenticated)
  const fetchFiles = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetFiles(token);
      setFiles(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur de connexion avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (route.type === "admin" && token) {
      fetchFiles();
    }
  }, [route, token]);

  const handleUploadSuccess = (newFile: FileMetadata) => {
    // Add new file to the top of the list
    setFiles((prev) => [newFile, ...prev]);
    // Automatically trigger the QR code dialog for the newly uploaded file!
    setSelectedFile(newFile);
  };

  const handleDeleteFile = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce fichier ?")) {
      try {
        if (!token) return;
        await apiDeleteFile(token, id);
        // Filter out of local state
        setFiles((prev) => prev.filter((f) => f.id !== id));
      } catch (err: any) {
        console.error(err);
        alert(err.message || "Impossible de supprimer le fichier.");
      }
    }
  };

  // Filter files based on search
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If we are on the public file view/receipt page (NO AUTH NEEDED)
  if (route.type === "share") {
    return (
      <SharePage
        fileId={route.fileId}
        onGoToHome={() => navigateTo({ type: "admin" })}
      />
    );
  }

  // Show a full-screen loading spinner while restoring auth state from localStorage
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <Loader2 className="h-10 w-12 text-emerald-500 animate-spin" />
        <p className="text-slate-400 mt-4 text-xs font-semibold animate-pulse">Initialisation de QR Drive...</p>
      </div>
    );
  }

  // If not authenticated, force login/register screen
  if (!user || !token) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Upper header decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-60" />

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto px-4 py-8 md:py-12 flex-grow">
        
        {/* Navigation / Hero section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-slate-900 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500 text-slate-950 rounded-2xl shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10">
              <HardDrive className="h-6 w-6" id="logo-icon" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                QR Drive <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-0.5 px-2 rounded-full">Bêta</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Partagez vos fichiers instantanément via QR codes</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* User credentials & role indicator */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center space-x-3 text-xs">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <p className="font-semibold text-slate-300 truncate max-w-[150px]">{user.username}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  {user.role === "admin" ? (
                    <>
                      <Shield className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Administrateur</span>
                    </>
                  ) : (
                    <span>Membre</span>
                  )}
                </p>
              </div>
            </div>

            {/* Logout button */}
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-red-950/20 border border-slate-800 hover:border-red-900/30 text-slate-300 hover:text-red-400 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </header>

        {/* Admin Tab Switching */}
        {user.role === "admin" && (
          <div className="flex bg-slate-900/40 border border-slate-850 p-1.5 rounded-2xl mb-8 max-w-sm">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'files'
                  ? "bg-slate-850 text-emerald-400 shadow-sm border border-slate-800"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <FileUp className="h-4 w-4" />
              <span>Mes Fichiers</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? "bg-slate-850 text-emerald-400 shadow-sm border border-slate-800"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Administration</span>
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'files' ? (
            <motion.div
              key="files-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Upload Container */}
              <section className="mb-10" id="upload-section">
                <FileUploader onUploadSuccess={handleUploadSuccess} />
              </section>

              {/* Shared Files List Explorer */}
              <section className="space-y-6" id="files-explorer-section">
                
                {/* Header & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
                  <h2 className="text-base font-bold text-slate-300 flex items-center gap-2">
                    <span>
                      {user.role === "admin" ? "Tous les Fichiers Plateforme" : "Mes Fichiers Partagés"}
                    </span>
                    {files.length > 0 && (
                      <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-semibold">
                        {files.length}
                      </span>
                    )}
                  </h2>

                  <div className="flex items-center gap-3">
                    {/* Search Input */}
                    {files.length > 0 && (
                      <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          id="search-input"
                          type="text"
                          placeholder="Rechercher..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-900/60 border border-slate-800 focus:border-slate-700 hover:border-slate-850 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all"
                        />
                      </div>
                    )}

                    <button
                      id="refresh-btn"
                      onClick={fetchFiles}
                      className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 text-slate-300 p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title="Actualiser les fichiers"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Grid/List */}
                <AnimatePresence mode="popLayout">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16" id="list-loader">
                      <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                      <p className="text-slate-400 text-xs mt-3 font-semibold">Chargement des fichiers...</p>
                    </div>
                  ) : error ? (
                    <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex items-center space-x-3 text-red-200 text-sm" id="list-error">
                      <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : files.length === 0 ? (
                    // Empty State (No uploads)
                    <motion.div
                      id="empty-state"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-slate-900 bg-slate-900/10 rounded-3xl p-12 text-center flex flex-col items-center"
                    >
                      <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/50 text-slate-400 mb-4 ring-8 ring-slate-900/20">
                        <QrCode className="h-7 w-7 text-emerald-400/85" />
                      </div>
                      <h3 className="text-base font-bold text-slate-200">Aucun fichier</h3>
                      <p className="text-slate-400 text-xs max-w-sm mt-1.5 leading-relaxed">
                        Glissez un fichier dans la zone ci-dessus pour générer instantanément un code QR et le partager.
                      </p>
                    </motion.div>
                  ) : filteredFiles.length === 0 ? (
                    // Empty State (No search results)
                    <motion.div
                      id="empty-search"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-12 text-center text-slate-400 text-xs"
                    >
                      Aucun fichier ne correspond à votre recherche "{searchQuery}"
                    </motion.div>
                  ) : (
                    // Render List
                    <div className="flex flex-col gap-3">
                      {filteredFiles.map((file) => (
                        <FileListItem
                          key={file.id}
                          file={file}
                          onOpenQR={setSelectedFile}
                          onDelete={handleDeleteFile}
                        />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="users-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <AdminUsersTab currentUser={user} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* QR Code Dialog / Modal */}
        {selectedFile && (
          <QRCodeDialog
            file={selectedFile}
            onClose={() => setSelectedFile(null)}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-slate-500 text-[11px] py-8 border-t border-slate-900/60 max-w-4xl w-full mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-12">
        <div className="flex items-center space-x-1">
          <Sparkles className="h-3 w-3 text-emerald-400" />
          <span>QR Drive — Vos fichiers partout en un clin d'œil</span>
        </div>
        <p>© 2026 QR Drive • Code QR généré en local de manière sécurisée</p>
      </footer>
    </div>
  );
}

