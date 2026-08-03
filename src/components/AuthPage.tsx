import React, { useState, useEffect } from "react";
import { User as UserIcon, Lock, LogIn, UserPlus, AlertCircle, Eye, EyeOff, ShieldCheck, Heart, Smartphone, ArrowRight, UserX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";
import { apiLogin, apiRegister } from "../lib/api";

interface AuthPageProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [savedAccount, setSavedAccount] = useState<string | null>(null);
  const [isUsingSavedAccount, setIsUsingSavedAccount] = useState<boolean>(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('111111'); // prefill default 6-digit passcode
  const [confirmPassword, setConfirmPassword] = useState('111111');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved account on mount (for mobile / returning phone users)
  useEffect(() => {
    const saved = localStorage.getItem("qr_drive_saved_account");
    if (saved) {
      setSavedAccount(saved);
      setUsername(saved);
      setIsUsingSavedAccount(true);
    }
  }, []);

  // When changing mode or saved state, reset password inputs & error
  useEffect(() => {
    setPassword('111111');
    setConfirmPassword('111111');
    setError(null);
  }, [mode, isUsingSavedAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetUsername = isUsingSavedAccount && savedAccount ? savedAccount : username.trim();

    if (!targetUsername || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (!/^\d{6}$/.test(password)) {
      setError("Le mot de passe doit être un code composé d'exactement 6 chiffres.");
      return;
    }

    if (mode === 'register' && !isUsingSavedAccount && password !== confirmPassword) {
      setError("Les codes de sécurité ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      let result;
      if (mode === 'login' || isUsingSavedAccount) {
        result = await apiLogin(targetUsername, password);
      } else {
        result = await apiRegister(targetUsername, password);
      }

      // Save username locally so mobile device remembers the account
      localStorage.setItem("qr_drive_saved_account", result.user.username);

      onAuthSuccess(result.user, result.token);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Impossible de se connecter.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setPassword(cleaned);
  };

  const handleConfirmPasswordChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setConfirmPassword(cleaned);
  };

  const handleForgetAccount = () => {
    localStorage.removeItem("qr_drive_saved_account");
    setSavedAccount(null);
    setIsUsingSavedAccount(false);
    setUsername('');
    setPassword('111111');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Brand Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between mb-4 sm:mb-8 pt-2">
        <div className="flex items-center space-x-2 text-slate-200">
          <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-bold tracking-tight text-lg sm:text-xl">QR Drive</span>
        </div>
      </header>

      {/* Main Card */}
      <main className="max-w-md w-full mx-auto flex-grow flex flex-col justify-center py-4 sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Quick Saved Account View for Phone / Returning Users */}
          {isUsingSavedAccount && savedAccount ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium px-3 py-1 rounded-full mb-4">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Compte enregistré sur cet appareil</span>
                </div>

                {/* Avatar & Username */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white text-2xl font-black uppercase shadow-lg shadow-emerald-950/50 border border-emerald-400/30 mb-3">
                    {savedAccount.charAt(0)}
                  </div>
                  <h2 className="text-xl font-bold text-slate-100 font-mono">@{savedAccount}</h2>
                  <p className="text-xs text-slate-400 mt-1">Saisissez votre code à 6 chiffres pour déverrouiller</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Single Passcode Field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300">Code secret (6 chiffres)</label>
                    <span className="text-[10px] text-slate-500 font-medium">Par défaut : 111111</span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      maxLength={6}
                      autoFocus
                      placeholder="111111"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded-xl pl-10 pr-10 py-3.5 text-base sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors font-mono tracking-widest min-h-[48px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer p-2"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="p-3 bg-red-950/40 border border-red-900/30 text-red-400 rounded-xl flex items-center space-x-2 text-xs font-medium"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Primary Unlock Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/50 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-950/50 transition-colors cursor-pointer text-sm min-h-[48px]"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>Se connecter</span>
                      <ArrowRight className="h-4 w-4 ml-1 opacity-80" />
                    </>
                  )}
                </button>
              </form>

              {/* Saved Account Options */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/60 text-xs">
                <button
                  type="button"
                  onClick={() => setIsUsingSavedAccount(false)}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline cursor-pointer py-1"
                >
                  Utiliser un autre identifiant
                </button>

                <button
                  type="button"
                  onClick={handleForgetAccount}
                  className="text-slate-500 hover:text-red-400 flex items-center space-x-1 cursor-pointer py-1 transition-colors"
                >
                  <UserX className="h-3.5 w-3.5" />
                  <span>Oublier cet appareil</span>
                </button>
              </div>
            </div>
          ) : (
            /* Standard Login / Registration Form */
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                  {mode === 'login' ? "Connexion" : "Créer un compte"}
                </h1>
                <p className="text-xs text-slate-400 mt-1.5">
                  {mode === 'login' 
                    ? "Saisissez votre identifiant et votre code à 6 chiffres" 
                    : "Créez votre compte simplement sans email"
                  }
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Identifiant Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Identifiant</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                      <UserIcon className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="Ex: jean_dupont"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-3.5 text-base sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors min-h-[48px]"
                    />
                  </div>
                </div>

                {/* Passcode Field (6 digits) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300">Code secret (6 chiffres)</label>
                    <span className="text-[10px] text-slate-500 font-medium">Par défaut : 111111</span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      maxLength={6}
                      placeholder="111111"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl pl-10 pr-10 py-3.5 text-base sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors font-mono tracking-widest min-h-[48px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer p-2"
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
                          inputMode="numeric"
                          pattern="[0-9]*"
                          required={mode === 'register'}
                          maxLength={6}
                          placeholder="111111"
                          value={confirmPassword}
                          onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-3.5 text-base sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors font-mono tracking-widest min-h-[48px]"
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
                  className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/50 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition-colors cursor-pointer text-sm min-h-[48px]"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

              {/* Return to saved account if exists */}
              {savedAccount && (
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setIsUsingSavedAccount(true)}
                    className="text-xs text-slate-400 hover:text-emerald-400 transition-colors py-1 cursor-pointer inline-flex items-center space-x-1"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Revenir à mon compte enregistré (@{savedAccount})</span>
                  </button>
                </div>
              )}

              {/* Mode Switcher */}
              <div className="text-center mt-5 pt-5 border-t border-slate-800/60">
                <p className="text-xs text-slate-500 font-medium">
                  {mode === 'login' ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'login' ? 'register' : 'login');
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold ml-1 hover:underline cursor-pointer py-1"
                  >
                    {mode === 'login' ? "S'inscrire" : "Se connecter"}
                  </button>
                </p>
              </div>
            </>
          )}
        </motion.div>

        {/* Demo Credentials Box */}
        {mode === 'login' && !isUsingSavedAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-5 bg-slate-900/30 border border-slate-800/40 rounded-2xl p-3.5 text-center max-w-sm mx-auto"
          >
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Comptes d'essai pré-configurés (Cliquer pour remplir)</p>
            <div className="grid grid-cols-2 gap-2.5 text-left">
              <button
                type="button"
                onClick={() => {
                  setUsername("admin");
                  setPassword("111111");
                  setError(null);
                }}
                className="bg-slate-950/60 hover:bg-slate-950/90 hover:border-emerald-500/30 p-2.5 rounded-xl border border-slate-850 text-left transition-all cursor-pointer focus:outline-none w-full min-h-[44px]"
              >
                <p className="text-[10px] font-bold text-emerald-400">Administrateur</p>
                <p className="text-xs font-semibold text-slate-200 font-mono">admin</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Code: <span className="font-mono text-slate-300 font-bold">111111</span></p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername("user");
                  setPassword("111111");
                  setError(null);
                }}
                className="bg-slate-950/60 hover:bg-slate-950/90 hover:border-slate-500/30 p-2.5 rounded-xl border border-slate-850 text-left transition-all cursor-pointer focus:outline-none w-full min-h-[44px]"
              >
                <p className="text-[10px] font-bold text-slate-400">Utilisateur</p>
                <p className="text-xs font-semibold text-slate-200 font-mono">user</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Code: <span className="font-mono text-slate-300 font-bold">111111</span></p>
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-slate-500 text-xs py-4 border-t border-slate-900/85 max-w-4xl w-full mx-auto mt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 QR Drive • Partage sécurisé et instantané</p>
        <p className="flex items-center space-x-1">
          <span>Développé avec</span>
          <Heart className="h-3 w-3 text-red-500 fill-red-500" />
        </p>
      </footer>
    </div>
  );
}

