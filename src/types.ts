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

export type ProjectStatus = 'published' | 'pending' | 'hidden' | 'rejected';

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
  viewedBy?: string[];
  downloadedBy?: string[];
  featured?: boolean;
  status?: ProjectStatus;
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
  isAdmin?: boolean;
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

export type ReportReason = 
  | 'malicious' 
  | 'spam' 
  | 'stolen' 
  | 'inappropriate' 
  | 'dangerous' 
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

export type CloudSyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface ProjectReport {
  id: string;
  projectId: string;
  projectName: string;
  reporterId: string;
  reporterEmail?: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt?: string;
}
