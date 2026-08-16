import { CloudinaryUploadResult } from '../types';

// Cloudinary settings from environment variables
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

// Configurable Limits
export const MAX_FILE_SIZE = 400 * 1024 * 1024; // 400 MB
export const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024; // 10 MB

// Allowed Extensions
export const ALLOWED_ARCHIVE_EXTENSIONS = ['.zip', '.tar', '.tar.gz', '.tgz', '.rar', '.7z', '.apk', '.gz'];
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validates a project archive or code bundle file
 */
export function validateProjectFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Veuillez sélectionner un fichier de projet.' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Ce fichier est trop volumineux (${formatFileSize(file.size)}). La taille maximale autorisée est de ${formatFileSize(MAX_FILE_SIZE)}.`,
    };
  }

  const nameLower = file.name.toLowerCase();
  const hasValidExt = ALLOWED_ARCHIVE_EXTENSIONS.some(ext => nameLower.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error: `Format de fichier non autorisé. Formats acceptés : ${ALLOWED_ARCHIVE_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validates a project thumbnail image
 */
export function validateThumbnailFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Veuillez sélectionner une image de miniature.' };
  }

  if (file.size > MAX_THUMBNAIL_SIZE) {
    return {
      valid: false,
      error: `L'image dépasse la taille maximale autorisée (${formatFileSize(MAX_THUMBNAIL_SIZE)}).`,
    };
  }

  const nameLower = file.name.toLowerCase();
  const hasValidExt = ALLOWED_IMAGE_EXTENSIONS.some(ext => nameLower.endsWith(ext));

  if (!hasValidExt && !file.type.startsWith('image/')) {
    return {
      valid: false,
      error: `Format d'image non valide. Formats acceptés : PNG, JPG, JPEG, WEBP, GIF, SVG.`,
    };
  }

  return { valid: true };
}

/**
 * Uploads a file (archive, code, or image) to Cloudinary or handles local offline mode
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: number) => void,
  resourceType: 'auto' | 'image' | 'raw' = 'auto',
  folderName: string = 'orax_projects'
): Promise<CloudinaryUploadResult> {
  // If Cloudinary keys are configured, perform real upload
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      // Use 'auto', 'image', or 'raw' based on file type
      const effectiveType = resourceType === 'auto' 
        ? (file.type.startsWith('image/') ? 'image' : 'raw')
        : resourceType;
      
      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${effectiveType}/upload`;
      const formData = new FormData();

      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', folderName);

      xhr.open('POST', url, true);
      xhr.timeout = 180000; // 3 minutes timeout for up to 400MB files

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (onProgress) onProgress(100);
            resolve({
              url: response.secure_url || response.url,
              publicId: response.public_id,
              bytes: response.bytes || file.size,
              format: response.format || file.name.split('.').pop() || 'zip',
              originalFilename: response.original_filename || file.name,
            });
          } catch {
            reject(new Error('Réponse du serveur de stockage invalide.'));
          }
        } else {
          let errMsg = `Échec du téléchargement (${xhr.status})`;
          try {
            const errRes = JSON.parse(xhr.responseText);
            if (errRes.error?.message) {
              errMsg = errRes.error.message;
            }
          } catch {
            // Keep generic message
          }
          reject(new Error(errMsg));
        }
      };

      xhr.ontimeout = () => {
        reject(new Error('Délai d\'attente dépassé lors de l\'envoi du fichier. Veuillez réessayer.'));
      };

      xhr.onerror = () => {
        reject(new Error('Erreur de connexion réseau lors du transfert du fichier.'));
      };

      xhr.send(formData);
    });
  }

  // Fallback simulator for preview & development mode when Cloudinary env is not set
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        if (onProgress) onProgress(100);
        
        // Generate a local blob URL for download or preview
        const blobUrl = URL.createObjectURL(file);
        const format = file.name.split('.').pop()?.toUpperCase() || 'ZIP';
        
        setTimeout(() => {
          resolve({
            url: blobUrl,
            publicId: `orax_local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            bytes: file.size,
            format: format,
            originalFilename: file.name,
          });
        }, 100);
      } else if (onProgress) {
        onProgress(progress);
      }
    }, 60);
  });
}

/**
 * Uploads an avatar image specifically to Cloudinary
 */
export async function uploadAvatarToCloudinary(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const result = await uploadToCloudinary(file, onProgress, 'image', 'orax_avatars');
  return result.url;
}

