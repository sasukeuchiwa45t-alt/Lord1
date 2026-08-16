import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Eye, 
  User, 
  Calendar, 
  HardDrive, 
  Share2, 
  Tag, 
  Code2, 
  ExternalLink, 
  Sparkles, 
  Check, 
  FolderGit2, 
  ShieldCheck, 
  Layers,
  Edit,
  Trash2,
  Flag
} from 'lucide-react';
import { Project, UserProfile } from '../types';
import { getCategoryById } from '../data/categories';
import { formatFileSize } from '../services/cloudinary';
import { recordProjectDownload, recordProjectView } from '../services/firebase';
import { triggerProjectDownload } from '../utils/downloadHelper';
import { useToast } from './Toast';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
  currentUser: UserProfile | null;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onReport?: (project: Project) => void;
  onProjectUpdated?: (updated: Project) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  onClose,
  currentUser,
  onEdit,
  onDelete,
  onReport,
  onProjectUpdated,
}) => {
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentDownloads, setCurrentDownloads] = useState(project?.downloads || 0);
  const [currentViews, setCurrentViews] = useState(project?.views || 0);

  useEffect(() => {
    if (project) {
      setCurrentDownloads(project.downloads || 0);
      setCurrentViews(project.views || 0);
    }
  }, [project?.downloads, project?.views]);

  useEffect(() => {
    if (project) {
      // Record view count strictly once per user account / visitor
      recordProjectView(project.id, currentUser?.uid).then((res) => {
        setCurrentViews(res.views);
        if (onProjectUpdated && res.isNew) {
          onProjectUpdated({ ...project, views: res.views });
        }
      });
    }
  }, [project?.id, currentUser?.uid]);

  if (!project) return null;

  const categoryInfo = getCategoryById(project.category);
  const isLordDemon = project.developerName.toUpperCase().includes('LORD DEMON');
  const isOwner = currentUser && (currentUser.uid === project.ownerId || currentUser.uid === 'dev_lord_demon');

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Récemment';
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    showToast({
      title: 'Téléchargement lancé...',
      message: `Enregistrement du fichier ${project.fileName || project.name} sur votre appareil`,
      type: 'info',
    });

    try {
      // 1. Immediately trigger the binary/archive download to preserve user activation gesture
      const downloadPromise = triggerProjectDownload(project);

      // 2. Fire celebratory confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // Ignore confetti error
      }

      // 3. Record unique account download in parallel
      recordProjectDownload(project.id, currentUser?.uid).then((res) => {
        setCurrentDownloads(res.downloads);
        if (onProjectUpdated && res.isNew) {
          onProjectUpdated({ ...project, downloads: res.downloads });
        }
      });

      await downloadPromise;

      setTimeout(() => {
        setDownloading(false);
        showToast({
          title: 'Téléchargement réussi !',
          message: `Le fichier "${project.fileName || project.name}" a été transmis à votre gestionnaire de téléchargements.`,
          type: 'success',
        });
      }, 800);
    } catch (err: any) {
      setDownloading(false);
      showToast({
        title: 'Erreur lors du téléchargement',
        message: err.message || 'Impossible de télécharger le fichier.',
        type: 'error',
      });
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast({
      title: 'Lien copié !',
      message: 'Lien du projet copié dans le presse-papier.',
      type: 'info',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col"
      >
        {/* Header Bar with close & actions */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/70 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${categoryInfo.badgeBg}`}>
              {categoryInfo.name}
            </span>
            {project.version && (
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-300">
                v{project.version}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onReport && (
              <button
                id="btn-report-project-modal"
                onClick={() => onReport(project)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-300 border border-zinc-700 hover:border-rose-800/50 text-xs transition-colors"
                title="Signaler ce projet"
              >
                <Flag className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Signaler</span>
              </button>
            )}

            <button
              id="btn-copy-project-link"
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Copier le lien du projet"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {isOwner && (
              <>
                {onEdit && (
                  <button
                    id="btn-edit-project-modal"
                    onClick={() => onEdit(project)}
                    className="p-2 rounded-xl bg-zinc-800/80 hover:bg-cyan-950 text-cyan-400 hover:border-cyan-500/40 border border-transparent transition-colors"
                    title="Modifier ce projet"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    id="btn-delete-project-modal"
                    onClick={() => onDelete(project)}
                    className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950 text-rose-400 hover:border-rose-500/40 border border-transparent transition-colors"
                    title="Supprimer ce projet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            <button
              id="btn-close-project-modal"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-8 flex-1">
          
          {/* Top Banner Image and Title */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {project.name}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-zinc-500" />
                  <span>Par</span>
                  <span className={`font-semibold ${isLordDemon ? 'text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40' : 'text-zinc-200'}`}>
                    {project.developerName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span>Publié le {formatDate(project.createdAt)}</span>
                </div>
              </div>

              {/* Technologies list */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {project.technologies.map((tech, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800 text-cyan-300 border border-zinc-700"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Thumbnail preview */}
            <div className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 relative shadow-inner">
              <img
                src={project.thumbnail}
                alt={project.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg text-xs font-mono bg-black/80 backdrop-blur-sm text-zinc-300 border border-zinc-700">
                {formatFileSize(project.fileSize)}
              </div>
            </div>
          </div>

          {/* Quick Metrics & Download Bar */}
          <div className="bg-zinc-950/80 p-4 sm:p-5 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-6 text-sm font-mono">
              <div className="flex items-center gap-2 text-emerald-400">
                <Download className="w-5 h-5" />
                <div>
                  <div className="font-bold text-base text-white">{currentDownloads.toLocaleString('fr-FR')}</div>
                  <div className="text-[11px] text-zinc-400 uppercase">Téléchargements</div>
                </div>
              </div>

              <div className="w-[1px] h-8 bg-zinc-800" />

              <div className="flex items-center gap-2 text-cyan-400">
                <Eye className="w-5 h-5" />
                <div>
                  <div className="font-bold text-base text-white">{currentViews.toLocaleString('fr-FR')}</div>
                  <div className="text-[11px] text-zinc-400 uppercase">Vues</div>
                </div>
              </div>

              <div className="w-[1px] h-8 bg-zinc-800 hidden xs:block" />

              <div className="hidden xs:flex items-center gap-2 text-zinc-300">
                <HardDrive className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-bold text-base text-white">{formatFileSize(project.fileSize)}</div>
                  <div className="text-[11px] text-zinc-400 uppercase">{project.fileFormat || 'ARCHIVE'}</div>
                </div>
              </div>
            </div>

            {/* Main Download Button */}
            <button
              id="btn-download-project-main"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Download className={`w-5 h-5 stroke-[2.5] ${downloading ? 'animate-bounce' : ''}`} />
              <span>{downloading ? 'Téléchargement...' : 'TÉLÉCHARGER LE PROJET'}</span>
            </button>
          </div>

          {/* Description Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-2 font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              Description & Documentation
            </h3>

            <div className="prose prose-invert max-w-none text-zinc-300 text-sm sm:text-base leading-relaxed bg-zinc-950/40 p-5 rounded-2xl border border-zinc-800/60 whitespace-pre-line font-sans">
              {project.description}
            </div>
          </div>

          {/* Tags & Metadata */}
          {project.tags && project.tags.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-500" />
                Mots-clés / Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800/60 text-zinc-300 border border-zinc-700/50"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* File details container */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400 space-y-2">
            <div className="flex justify-between items-center">
              <span>Nom du fichier archive :</span>
              <span className="text-zinc-200 font-semibold truncate max-w-[200px]">{project.fileName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Poids du téléchargement :</span>
              <span className="text-cyan-400">{formatFileSize(project.fileSize)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Dernière mise à jour :</span>
              <span className="text-zinc-300">{formatDate(project.updatedAt)}</span>
            </div>

            {/* Direct Link Alternate Trigger */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-sans">Lien de secours direct :</span>
              {project.fileUrl && (project.fileUrl.startsWith('http://') || project.fileUrl.startsWith('https://')) ? (
                <a
                  href={project.fileUrl}
                  download={project.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline font-sans flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Téléchargement direct</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline font-sans flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Lancer l'archive</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>ORAX PROJET Cloud Security Verified</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-sans transition-colors"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
};

