export type ProjectCategory = 
  | 'web'
  | 'mobile'
  | 'bot'
  | 'software'
  | 'game'
  | 'ai'
  | 'security'
  | 'script'
  | 'other';

export interface Project {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  developerName: string;
  ownerId: string;
  ownerEmail?: string;
  category: ProjectCategory;
  technologies: string[];
  tags: string[];
  fileUrl: string;
  fileName: string;
  fileSize: number; // in bytes
  fileFormat?: string;
  cloudinaryPublicId?: string;
  thumbnail: string;
  downloads: number;
  views: number;
  featured?: boolean;
  demoUrl?: string;
  githubUrl?: string;
  version?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  bio?: string;
  github?: string;
  website?: string;
  totalDownloads?: number;
  projectsCount?: number;
}

export type SortOption = 'recent' | 'oldest' | 'downloads' | 'popular' | 'alpha';

export interface FilterOptions {
  search: string;
  category: ProjectCategory | 'all';
  technology: string | 'all';
  tag: string | 'all';
  sortBy: SortOption;
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  originalFilename: string;
}

export interface CategoryMetadata {
  id: ProjectCategory;
  name: string;
  icon: string;
  description: string;
  color: string;
  badgeBg: string;
  borderColor: string;
}
