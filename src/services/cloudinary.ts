import { CloudinaryUploadResult } from '../types';

// Cloudinary settings from environment variables or defaults
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

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
 * Uploads a file (archive, code, or image) to Cloudinary or falls back gracefully to a client storage blob.
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
      // Use 'auto' or 'raw' based on file type
      const effectiveType = resourceType === 'auto' 
        ? (file.type.startsWith('image/') ? 'image' : 'raw')
        : resourceType;
      
      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${effectiveType}/upload`;
      const formData = new FormData();

      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', folderName);

      xhr.open('POST', url, true);
      xhr.timeout = 45000; // 45 seconds timeout

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
            reject(new Error('Réponse Cloudinary invalide'));
          }
        } else {
          let errMsg = `Échec de l'envoi Cloudinary (${xhr.status})`;
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
        reject(new Error('Délai d\'attente dépassé lors de l\'envoi vers Cloudinary.'));
      };

      xhr.onerror = () => {
        reject(new Error('Erreur de connexion réseau lors de l\'upload vers Cloudinary'));
      };

      xhr.send(formData);
    });
  }

  // Fallback simulator for preview & development mode when Cloudinary env is not set
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 25) + 20;
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
