import React, { useState } from 'react';
import { X, Save, AlertCircle, Image as ImageIcon, Tag, Code2 } from 'lucide-react';
import { Project, ProjectCategory } from '../types';
import { CATEGORIES } from '../data/categories';
import { updateExistingProject } from '../services/firebase';
import { uploadToCloudinary } from '../services/cloudinary';
import { useToast } from './Toast';
import { motion } from 'motion/react';

interface EditProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onUpdated: (updatedProject: Project) => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  onClose,
  onUpdated,
}) => {
  const { showToast } = useToast();

  if (!project) return null;

  const [name, setName] = useState(project.name);
  const [shortDescription, setShortDescription] = useState(project.shortDescription || '');
  const [description, setDescription] = useState(project.description);
  const [category, setCategory] = useState<ProjectCategory>(project.category);
  const [developerName, setDeveloperName] = useState(project.developerName);
  const [version, setVersion] = useState(project.version || '1.0.0');
  const [technologies, setTechnologies] = useState<string[]>(project.technologies);
  const [techInput, setTechInput] = useState('');
  const [tags, setTags] = useState<string[]>(project.tags);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState(project.thumbnail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddTech = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (e.preventDefault) e.preventDefault();
    const clean = techInput.trim();
    if (clean && !technologies.includes(clean)) {
      setTechnologies([...technologies, clean]);
      setTechInput('');
    }
  };

  const handleRemoveTech = (t: string) => {
    setTechnologies(technologies.filter(item => item !== t));
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (e.preventDefault) e.preventDefault();
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter(item => item !== t));
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const res = await uploadToCloudinary(file, undefined, 'image');
        setThumbnailUrl(res.url);
        showToast({
          title: 'Miniature mise à jour',
          type: 'success',
        });
      } catch {
        setThumbnailUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !description.trim()) {
      setError('Veuillez remplir le nom et la description.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateExistingProject(project.id, {
        name: name.trim(),
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        category,
        developerName: developerName.trim(),
        version: version.trim(),
        technologies,
        tags,
        thumbnail: thumbnailUrl,
      });

      showToast({
        title: 'Projet mis à jour avec succès',
        type: 'success',
      });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Impossible de mettre à jour le projet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6 shrink-0">
          <h2 className="text-lg font-bold text-white font-mono">Modifier le projet</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto flex-1 pr-1">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Nom du projet</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                className="w-full bg-zinc-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full bg-zinc-950 text-sm font-mono text-white px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Description courte</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full bg-zinc-950 text-sm text-white px-3.5 py-2 rounded-xl border border-zinc-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Description complète</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 text-sm text-white p-3.5 rounded-xl border border-zinc-800 focus:outline-none"
            />
          </div>

          {/* Technologies */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Technologies</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={handleAddTech}
                placeholder="Ajouter une techno..."
                className="flex-1 bg-zinc-950 text-xs text-white px-3 py-1.5 rounded-xl border border-zinc-800"
              />
              <button
                type="button"
                onClick={handleAddTech}
                className="px-3 py-1.5 bg-zinc-800 text-xs text-white rounded-xl"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {technologies.map(t => (
                <span key={t} className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-cyan-300 flex items-center gap-1">
                  {t}
                  <button type="button" onClick={() => handleRemoveTech(t)} className="text-zinc-400 hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Ajouter un tag..."
                className="flex-1 bg-zinc-950 text-xs text-white px-3 py-1.5 rounded-xl border border-zinc-800"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-zinc-800 text-xs text-white rounded-xl"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tg => (
                <span key={tg} className="px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-300 flex items-center gap-1">
                  #{tg}
                  <button type="button" onClick={() => handleRemoveTag(tg)} className="text-zinc-400 hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Thumbnail update */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">URL de la miniature</label>
            <div className="flex gap-3 items-center">
              <img src={thumbnailUrl} alt="Thumbnail" className="w-12 h-12 rounded-lg object-cover bg-zinc-950 border border-zinc-800" />
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="flex-1 bg-zinc-950 text-xs text-white px-3 py-2 rounded-xl border border-zinc-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
