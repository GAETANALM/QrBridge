import React, { useState, useEffect } from "react";
import { User as UserIcon, Lock, LogIn, UserPlus, AlertCircle, Eye, EyeOff, ShieldCheck, Heart, Hash } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, getApiUrl } from "../types";

interface AuthPageProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [password, setPassword] = useState('111111'); // prefill default 6-digit passcode
  const [confirmPassword, setConfirmPassword] = useState('111111');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When changing mode, reset error and prefill passcode with default "111111"
  useEffect(() => {
    setPassword('111111');
    setConfirmPassword('111111');
    setError(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!prenom.trim() || !nom.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (!/^\d{6}$/.test(password)) {
      setError("Le mot de passe doit être un code composé d'exactement 6 chiffres.");
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError("Les codes de sécurité ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(getApiUrl(endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          prenom: prenom.trim(), 
          nom: nom.trim(), 
          password 
        })
      });

      let data: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const textStr = await response.text();
        throw new Error(textStr || `Erreur de communication avec le serveur (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.error || "Une erreur s'est produite lors de l'authentification.");
      }

      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Impossible de se connecter.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (val: string) => {
    // Only allow numbers and max length of 6 digits
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setPassword(cleaned);
  };

  const handleConfirmPasswordChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setConfirmPassword(cleaned);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6">
      {/* Brand Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2 text-slate-200">
          <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-lg">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-bold tracking-tight text-lg">QR Drive</span>
        </div>
      </header>

      {/* Main Card */}
      <main className="max-w-md w-full mx-auto flex-grow flex flex-col justify-center py-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle background blur */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              {mode === 'login' ? "Connexion" : "Créer un compte"}
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              {mode === 'login' 
                ? "Entrez votre prénom, votre nom et votre code secret pour vous connecter" 
                : "Inscrivez-vous simplement avec votre prénom et nom"
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* First Name & Last Name in same row or block */}
            <div className="grid grid-cols-2 gap-3">
              {/* First Name Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Prénom</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Jean"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Last Name Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nom</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Dupont"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Passcode Field (6 digits) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300">Code de sécurité (6 chiffres)</label>
                <span className="text-[10px] text-slate-500 font-medium">Par défaut : 111111</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="111111"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Passcode (only on register) */}
            <AnimatePresence>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-xs font-semibold text-slate-300">Confirmer le code à 6 chiffres</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required={mode === 'register'}
                      pattern="\d{6}"
                      maxLength={6}
                      placeholder="111111"
                      value={confirmPassword}
                      onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors font-mono tracking-widest"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-red-950/40 border border-red-900/30 text-red-400 rounded-xl flex items-center space-x-2 text-xs font-medium"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/50 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-colors cursor-pointer mt-2 text-sm disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Se connecter</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Créer mon compte</span>
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="text-center mt-6 pt-6 border-t border-slate-800/60">
            <p className="text-xs text-slate-500 font-medium">
              {mode === 'login' ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-semibold ml-1 hover:underline cursor-pointer"
              >
                {mode === 'login' ? "S'inscrire" : "Se connecter"}
              </button>
            </p>
          </div>
        </motion.div>

        {/* Demo Credentials Box */}
        {mode === 'login' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-6 bg-slate-900/30 border border-slate-800/40 rounded-2xl p-4 text-center max-w-sm mx-auto"
          >
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Comptes d'essai pré-configurés</p>
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                <p className="text-[10px] font-bold text-emerald-400">Administrateur</p>
                <p className="text-xs font-semibold text-slate-200">Admin Admin</p>
                <p className="text-[10px] text-slate-500 mt-1">Code: <span className="font-mono text-slate-300 select-all font-bold">111111</span></p>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                <p className="text-[10px] font-bold text-slate-400">Utilisateur Standard</p>
                <p className="text-xs font-semibold text-slate-200">Utilisateur Standard</p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">Code: <span className="font-mono text-slate-300 select-all font-bold">111111</span></p>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-slate-500 text-xs py-6 border-t border-slate-900/85 max-w-4xl w-full mx-auto mt-8 flex items-center justify-between">
        <p>© 2026 QR Drive • Partage sécurisé et instantané</p>
        <p className="flex items-center space-x-1">
          <span>Développé avec</span>
          <Heart className="h-3 w-3 text-red-500 fill-red-500" />
        </p>
      </footer>
    </div>
  );
}
