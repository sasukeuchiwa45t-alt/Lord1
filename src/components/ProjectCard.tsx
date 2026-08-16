import React from 'react';
import { 
  Download, 
  Eye, 
  User, 
  Calendar, 
  HardDrive, 
  ArrowUpRight, 
  Sparkles, 
  ExternalLink,
  Code
} from 'lucide-react';
import { Project } from '../types';
import { getCategoryById } from '../data/categories';
import { formatFileSize } from '../services/cloudinary';
import { motion } from 'motion/react';

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  onQuickDownload?: (e: React.MouseEvent, project: Project) => void;
  index?: number;
}

const ProjectCardComponent: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onQuickDownload,
  index = 0,
}) => {
  const categoryInfo = getCategoryById(project.category);
  const isLordDemon = project.developerName.toUpperCase().includes('LORD DEMON');

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Récemment';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
      id={`project-card-${project.id}`}
      onClick={() => onSelect(project)}
      className="group relative flex flex-col bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/90 hover:border-cyan-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer"
    >
      {/* Top Banner Thumbnail */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-zinc-950">
        <img
          src={project.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'}
          alt={project.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30" />

        {/* Category Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-md shadow-md ${categoryInfo.badgeBg}`}>
            {categoryInfo.name}
          </span>
          {project.featured && (
            <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Top
            </span>
          )}
        </div>

        {/* File Size Badge */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[11px] font-mono bg-zinc-900/80 backdrop-blur-md text-zinc-300 border border-zinc-700/60 flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-cyan-400" />
          <span>{formatFileSize(project.fileSize)}</span>
        </div>

        {/* Version tag */}
        {project.version && (
          <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-950/80 text-zinc-400 border border-zinc-800">
            v{project.version}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Title */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
              {project.name}
            </h3>
            <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
          </div>

          {/* Short description */}
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
            {project.shortDescription || project.description.replace(/[#*`_]/g, '')}
          </p>

          {/* Developer tag */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-zinc-500">Développeur :</span>
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span className={`font-semibold ${isLordDemon ? 'text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40' : 'text-zinc-200'}`}>
                {project.developerName}
              </span>
            </div>
          </div>

          {/* Technologies stack */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 3).map((tech, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-zinc-800/80 text-zinc-300 border border-zinc-700/50"
              >
                {tech}
              </span>
            ))}
            {project.technologies.length > 3 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-zinc-800/50 text-zinc-400">
                +{project.technologies.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Footer info: Downloads, views, and button */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-400" title="Téléchargements">
              <Download className="w-3.5 h-3.5" />
              <span>{project.downloads.toLocaleString('fr-FR')}</span>
            </span>
            <span className="flex items-center gap-1 text-zinc-400" title="Vues">
              <Eye className="w-3.5 h-3.5" />
              <span>{project.views.toLocaleString('fr-FR')}</span>
            </span>
          </div>

          <button
            id={`btn-view-${project.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(project);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 group-hover:bg-cyan-500 text-zinc-200 group-hover:text-zinc-950 transition-all flex items-center gap-1"
          >
            <span>Voir le projet</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const ProjectCard = React.memo(ProjectCardComponent);
