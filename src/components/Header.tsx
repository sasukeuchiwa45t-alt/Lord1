import React, { useState } from 'react';
import { 
  Upload, 
  Search, 
  Menu, 
  X, 
  User as UserIcon, 
  LogOut, 
  FolderGit2, 
  Sparkles, 
  Layers, 
  Flame, 
  Check, 
  ShieldCheck, 
  Cloud,
  ChevronDown
} from 'lucide-react';
import { UserProfile } from '../types';
import { isFirebaseConfigured } from '../services/firebase';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenPublish: () => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  onOpenAuth,
  onOpenPublish,
  onLogout,
  searchQuery,
  onSearchChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const isCloudActive = isFirebaseConfigured();

  const handleNavClick = (tab: string) => {
    onNavigate(tab);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand Logo */}
          <div 
            id="brand-logo-btn"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <FolderGit2 className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg sm:text-xl text-white font-mono">
                  ORAX<span className="text-cyan-400">PROJET</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 -mt-0.5 hidden xs:block">
                Plateforme de Partage Dev
              </p>
            </div>
          </div>

          {/* Search Bar - Desktop center */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                id="header-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher un projet, bot, script, dev..."
                className="w-full bg-zinc-900/90 hover:bg-zinc-900 text-sm text-zinc-200 placeholder-zinc-500 pl-10 pr-4 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
              />
              {searchQuery && (
                <button 
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <button
              id="nav-home-btn"
              onClick={() => handleNavClick('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'home'
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Accueil
            </button>
            <button
              id="nav-projects-btn"
              onClick={() => handleNavClick('projects')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'projects'
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Projets
            </button>
            <button
              id="nav-categories-btn"
              onClick={() => handleNavClick('categories')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentTab === 'categories'
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              Catégories
            </button>
            <button
              id="nav-popular-btn"
              onClick={() => handleNavClick('popular')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentTab === 'popular'
                  ? 'text-amber-400 bg-amber-950/30 border border-amber-800/40'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-400" />
              Populaires
            </button>
          </nav>

          {/* Action Buttons: Publish + User/Auth */}
          <div className="flex items-center gap-2.5">
            {/* Publish Button */}
            <button
              id="header-publish-btn"
              onClick={onOpenPublish}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all transform active:scale-95"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden xs:inline">Publier un projet</span>
              <span className="xs:hidden">Publier</span>
            </button>

            {/* Auth or User Profile */}
            {currentUser ? (
              <div className="relative">
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-left"
                >
                  <img
                    src={currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.displayName)}`}
                    alt={currentUser.displayName}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-800 object-cover border border-zinc-700"
                  />
                  <div className="hidden sm:block text-xs">
                    <p className="font-semibold text-zinc-200 leading-tight truncate max-w-[100px]">
                      {currentUser.displayName}
                    </p>
                    <span className="text-[10px] text-cyan-400 font-mono">Dev</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in-50 slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                      <p className="text-xs text-zinc-400">Connecté en tant que</p>
                      <p className="text-sm font-semibold text-white truncate">{currentUser.displayName}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{currentUser.email}</p>
                    </div>

                    <button
                      id="dropdown-my-profile-btn"
                      onClick={() => {
                        handleNavClick('profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-cyan-400" />
                      Mon Profil & Mes Projets
                    </button>

                    <button
                      id="dropdown-publish-btn"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenPublish();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
                    >
                      <Upload className="w-4 h-4 text-blue-400" />
                      Nouveau Projet
                    </button>

                    <div className="border-t border-zinc-800 mt-1 pt-1">
                      <button
                        id="dropdown-logout-btn"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="header-login-btn"
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-sm font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all"
              >
                <UserIcon className="w-4 h-4 text-cyan-400" />
                <span className="hidden xs:inline">Connexion</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
              aria-label="Menu principal"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-zinc-800/80 py-4 px-2 space-y-3 animate-in slide-in-from-top-2">
            {/* Mobile Search input */}
            <div className="relative w-full pb-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher des projets..."
                className="w-full bg-zinc-900 text-sm text-zinc-200 placeholder-zinc-500 pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleNavClick('home')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium transition-colors ${
                  currentTab === 'home'
                    ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-800/40'
                    : 'text-zinc-300 bg-zinc-900'
                }`}
              >
                Accueil
              </button>
              <button
                onClick={() => handleNavClick('projects')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium transition-colors ${
                  currentTab === 'projects'
                    ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-800/40'
                    : 'text-zinc-300 bg-zinc-900'
                }`}
              >
                Tous les Projets
              </button>
              <button
                onClick={() => handleNavClick('categories')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium transition-colors ${
                  currentTab === 'categories'
                    ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-800/40'
                    : 'text-zinc-300 bg-zinc-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                Catégories
              </button>
              <button
                onClick={() => handleNavClick('popular')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-medium transition-colors ${
                  currentTab === 'popular'
                    ? 'text-amber-400 bg-amber-950/50 border border-amber-800/40'
                    : 'text-zinc-300 bg-zinc-900'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-400" />
                Populaires
              </button>
            </div>

            {currentUser ? (
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                <button
                  onClick={() => handleNavClick('profile')}
                  className="flex items-center gap-2 text-sm text-cyan-400 font-medium"
                >
                  <UserIcon className="w-4 h-4" />
                  Mon profil ({currentUser.displayName})
                </button>
                <button
                  onClick={onLogout}
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-zinc-800">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-medium bg-zinc-900 text-zinc-200 border border-zinc-800 text-center"
                >
                  Se connecter / Créer un compte
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
