import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Camera,
  Upload,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { registerUser, loginUser, resetUserPassword } from '../services/firebase';
import { uploadAvatarToCloudinary } from '../services/cloudinary';
import { UserProfile } from '../types';
import { useToast } from './Toast';
import { motion } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score += 25;
    if (password.length >= 10) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  };

  const strength = getPasswordStrength();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner un fichier image valide (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('L\'image de profil ne doit pas dépasser 10 Mo.');
      return;
    }

    setError('');
    setUploadingAvatar(true);
    setAvatarProgress(0);

    try {
      const url = await uploadAvatarToCloudinary(file, (progress) => {
        setAvatarProgress(progress);
      });
      setAvatarUrl(url);
      showToast({
        title: 'Photo de profil prête',
        message: 'L\'image a été hébergée avec succès.',
        type: 'success',
      });
    } catch (err: any) {
      setError(err.message || 'Échec de l\'envoi de la photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim() || !email.includes('@')) {
      setError('Veuillez saisir une adresse e-mail valide.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await resetUserPassword(email.trim());
        setResetSent(true);
        showToast({
          title: 'E-mail de réinitialisation envoyé',
          message: 'Consultez votre boîte de réception pour réinitialiser votre mot de passe.',
          type: 'success',
        });
      } catch (err: any) {
        setError(err.message || 'Impossible d\'envoyer l\'e-mail de réinitialisation.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (mode === 'register') {
      if (!displayName.trim()) {
        setError('Veuillez renseigner un nom d\'utilisateur.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les deux mots de passe ne correspondent pas.');
        return;
      }
      if (uploadingAvatar) {
        setError('Veuillez patienter pendant l\'envoi de votre photo de profil.');
        return;
      }
    }

    setLoading(true);
    try {
      let user: UserProfile;
      if (mode === 'register') {
        user = await registerUser(
          email.trim(), 
          password, 
          displayName.trim(), 
          avatarUrl || undefined
        );
        showToast({
          title: 'Bienvenue sur ORAX PROJET !',
          message: `Compte créé avec succès pour ${user.displayName}.`,
          type: 'success',
        });
      } else {
        user = await loginUser(email.trim(), password);
        showToast({
          title: 'Connexion réussie',
          message: `Ravi de vous revoir, ${user.displayName} !`,
          type: 'success',
        });
      }
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'authentification.');
    } finally {
      setLoading(false);
    }
  };

  const previewAvatar = avatarUrl || (displayName.trim() 
    ? `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName.trim())}`
    : 'https://api.dicebear.com/7.x/bottts/svg?seed=newdev');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white font-mono">
            {mode === 'login' && 'Connexion à ORAX'}
            {mode === 'register' && 'Créer un compte Dev'}
            {mode === 'forgot' && 'Mot de passe oublié'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === 'login' && 'Accédez à vos projets et publiez vos créations'}
            {mode === 'register' && 'Rejoignez la communauté des développeurs ORAX PROJET'}
            {mode === 'forgot' && 'Entrez votre e-mail pour recevoir le lien de réinitialisation'}
          </p>
        </div>

        {/* Mode Switch Tabs (Login / Register) */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-6 text-xs font-semibold">
            <button
              id="tab-auth-login"
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2 rounded-lg transition-colors ${
                mode === 'login' ? 'bg-cyan-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Se connecter
            </button>
            <button
              id="tab-auth-register"
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2 rounded-lg transition-colors ${
                mode === 'register' ? 'bg-cyan-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Créer un compte
            </button>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {resetSent && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Un lien de réinitialisation a été envoyé à {email}.</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Avatar Upload in Register Mode */}
          {mode === 'register' && (
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
              <div className="relative group shrink-0">
                <img
                  src={previewAvatar}
                  alt="Avatar Preview"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-500/40 bg-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  title="Changer la photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">Photo de profil</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Stockage Cloud</span>
                </div>
                <p className="text-[11px] text-zinc-500 truncate">
                  {avatarUrl ? 'Photo hébergée et synchronisée' : 'Avatar généré par défaut ou personnalisé'}
                </p>

                <div className="mt-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                        <span>Envoi ({avatarProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 text-cyan-400" />
                        <span>{avatarUrl ? 'Changer l\'image' : 'Importer une photo'}</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Display Name (Only for Register) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nom d'utilisateur / Pseudo *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="auth-username-input"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: LORD DEMON ou DevPro"
                  className="w-full bg-zinc-950 text-sm text-white placeholder-zinc-500 pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
                />
              </div>
            </div>
          )}

          {/* Email input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Adresse e-mail *
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@orax.net"
                className="w-full bg-zinc-950 text-sm text-white placeholder-zinc-500 pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>

          {/* Password inputs */}
          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-zinc-300">
                  Mot de passe *
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 text-sm text-white placeholder-zinc-500 pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60 font-mono"
                />
              </div>

              {/* Password strength bar in register */}
              {mode === 'register' && password && (
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength <= 25 ? 'bg-rose-500 w-1/4' :
                        strength <= 50 ? 'bg-amber-500 w-2/4' :
                        strength <= 75 ? 'bg-cyan-400 w-3/4' : 'bg-emerald-400 w-full'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {strength < 50 ? 'Mot de passe faible (min 6 caractères)' : 'Mot de passe sécurisé'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confirm Password (Register mode only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="auth-confirm-password-input"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 text-sm text-white placeholder-zinc-500 pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60 font-mono"
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading || uploadingAvatar}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Création du compte en cours...
              </span>
            ) : (
              <>
                <span>
                  {mode === 'login' && 'SE CONNECTER'}
                  {mode === 'register' && 'CRÉER MON COMPTE'}
                  {mode === 'forgot' && 'ENVOYER LE LIEN'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Forgot return */}
          {mode === 'forgot' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Retour à la connexion
              </button>
            </div>
          )}

        </form>

        {/* Security badge note */}
        <div className="mt-6 pt-4 border-t border-zinc-800 text-center flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Authentification sécurisée & Données cryptées de bout en bout</span>
        </div>
      </motion.div>
    </div>
  );
};
