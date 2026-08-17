import React from 'react';
import { FolderGit2, Shield, Heart, Sparkles, Terminal, Code2, Cloud, ExternalLink } from 'lucide-react';
import { isFirebaseConfigured } from '../services/firebase';
import { isCloudinaryConfigured } from '../services/cloudinary';

interface FooterProps {
  onNavigate: (tab: string) => void;
  onSelectCategory?: (category: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onSelectCategory }) => {
  const isCloud = isFirebaseConfigured();
  const isCloudinary = isCloudinaryConfigured();

  return (
    <footer className="w-full bg-zinc-950 border-t border-zinc-900 pt-14 pb-10 text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 pb-12 border-b border-zinc-900">
          
          {/* Col 1: Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <div 
              onClick={() => onNavigate('home')}
              className="flex items-center gap-3 cursor-pointer group w-fit"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <span className="font-extrabold tracking-tight text-xl text-white font-mono">
                ORAX<span className="text-cyan-400">PROJET</span>
              </span>
            </div>
            
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
              Plateforme moderne et dédiée au partage, à la découverte et au téléchargement libre de projets numériques, logiciels, bots et scripts informatiques.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-300">
                <span className={`w-2 h-2 rounded-full ${isCloud ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`}></span>
                {isCloud ? 'Serveur Cloud Connecté' : 'Mode Local Persistant Actif'}
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-300">
                <Cloud className="w-3.5 h-3.5 text-blue-400" />
                <span>Stockage Sécurisé Haute Vitesse</span>
              </div>
            </div>
          </div>

          {/* Col 2: Navigation rapide */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 font-mono">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={() => onNavigate('home')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Accueil
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('projects')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Tous les Projets
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('categories')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Explorer par Catégorie
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('popular')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Projets Populaires & Top Téléchargements
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('publish')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Publier un Projet
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Catégories populaires */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 font-mono">
              Top Catégories
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={() => {
                    onNavigate('projects');
                    if (onSelectCategory) onSelectCategory('bot');
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  🤖 Bots & Scripts
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    onNavigate('projects');
                    if (onSelectCategory) onSelectCategory('security');
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  🔐 Cybersécurité
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    onNavigate('projects');
                    if (onSelectCategory) onSelectCategory('ai');
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  🧠 Intelligence Artificielle
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    onNavigate('projects');
                    if (onSelectCategory) onSelectCategory('web');
                  }}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  🌐 Sites & APIs
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Communauté Officielle & Réseaux */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 font-mono">
              Communauté
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://t.me/nexusforger"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 transition-colors flex items-center gap-2 group text-zinc-300"
                >
                  <span className="w-2 h-2 rounded-full bg-sky-400 group-hover:scale-125 transition-transform" />
                  <span>Canal Télégram</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-sky-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://whatsapp.com/channel/0029Vb7EMRIEFeXqc72cRk1N"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-2 group text-zinc-300"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
                  <span>Chaîne WhatsApp</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://chat.whatsapp.com/JY9P9mO9DBe8R6i7Oc93Dt?s=cl&p=a&ilr=0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-green-400 transition-colors flex items-center gap-2 group text-zinc-300"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 group-hover:scale-125 transition-transform" />
                  <span>Groupe WhatsApp Dev</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-green-400" />
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom developer credit: LORD DEMON */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-zinc-500 text-center sm:text-left">
            © 2026 <strong className="text-zinc-300 font-semibold font-mono">ORAX PROJET</strong> — Tous droits réservés.
          </p>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-zinc-300">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Développé par</span>
            <span className="font-bold text-white font-mono tracking-wide text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
              LORD DEMON
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
