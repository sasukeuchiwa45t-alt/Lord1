import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  runTransaction,
  query,
  orderBy,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import { Project, UserProfile, ProjectReport, ProjectStatus, ReportStatus, CloudSyncState } from '../types';
import { deleteStoredFile } from '../utils/fileStorage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    try {
      setLogLevel('silent');
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalForceLongPolling: true,
      });
    } catch {
      db = getFirestore(app);
    }
  } catch (err) {
    console.warn('Firebase initialization notice:', err);
  }
}

// --------------------------------------------------------------------------
// CLOUD SYNCHRONIZATION STATE LISTENER
// --------------------------------------------------------------------------
let currentSyncStatus: CloudSyncState = isFirebaseConfigured() ? (navigator.onLine ? 'synced' : 'offline') : 'offline';
const SYNC_STATUS_EVENT = 'orax_sync_status_changed';

export function getSyncStatus(): CloudSyncState {
  return currentSyncStatus;
}

export function updateSyncStatus(newStatus: CloudSyncState): void {
  if (currentSyncStatus !== newStatus) {
    currentSyncStatus = newStatus;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: newStatus }));
    }
  }
}

export function subscribeToSyncStatus(callback: (status: CloudSyncState) => void): () => void {
  callback(currentSyncStatus);
  const handler = (e: Event) => {
    const custom = e as CustomEvent<CloudSyncState>;
    callback(custom.detail || currentSyncStatus);
  };
  window.addEventListener(SYNC_STATUS_EVENT, handler);
  
  const onlineHandler = () => updateSyncStatus(isFirebaseConfigured() ? 'synced' : 'offline');
  const offlineHandler = () => updateSyncStatus('offline');
  
  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);

  return () => {
    window.removeEventListener(SYNC_STATUS_EVENT, handler);
    window.removeEventListener('online', onlineHandler);
    window.removeEventListener('offline', offlineHandler);
  };
}

// Admin email configured for LORD DEMON admin privileges
const ADMIN_EMAILS = new Set(['epargnelock@gmail.com', 'lord.demon.dev@orax.net']);

export function checkIsAdmin(
  user: UserProfile | { email?: string; uid?: string; isAdmin?: boolean } | null,
  hasCustomClaimAdmin?: boolean
): boolean {
  if (!user) return false;
  if (hasCustomClaimAdmin === true) return true;
  if (user.email && ADMIN_EMAILS.has(user.email.toLowerCase())) return true;
  return false;
}

// Helper to remove any undefined properties before sending to Firestore
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        clean[key] = sanitizeForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean as T;
}

// --------------------------------------------------------------------------
// LOCAL CACHE ONLY (Used for instant UI paint & offline fallback)
// Firestore is the sole SOURCE OF TRUTH.
// --------------------------------------------------------------------------
const STORAGE_KEY_PROJECTS = 'orax_projet_items_v2';
const STORAGE_KEY_REPORTS = 'orax_projet_reports_v2';
const STORAGE_KEY_SESSION_UI = 'orax_projet_cached_session_v2';

const DEMO_PROJECT_IDS = new Set([
  'orax-bot-v2',
  'cyber-shield-scanner',
  'nexus-ai-studio',
  'pulse-finance-app',
  'hyper-commerce-saas',
  'cyber-rogue-game',
  'devops-automation-toolkit',
  'electron-markdown-studio'
]);

export function deduplicateProjects(projects: Project[]): Project[] {
  const seen = new Set<string>();
  const unique: Project[] = [];
  for (const p of projects) {
    if (p && p.id && !DEMO_PROJECT_IDS.has(p.id) && !seen.has(p.id)) {
      seen.add(p.id);
      unique.push(p);
    }
  }
  return unique;
}

function getLocalProjects(): Project[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (saved) {
      const parsed: Project[] = JSON.parse(saved);
      const unique = deduplicateProjects(parsed);
      if (unique.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(unique));
      }
      return unique;
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
}

function saveLocalProjects(projects: Project[]): void {
  const unique = deduplicateProjects(projects);
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(unique));
}

function getLocalReports(): ProjectReport[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }
  return [];
}

function saveLocalReports(reports: ProjectReport[]): void {
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
}

function getCachedSession(): UserProfile | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SESSION_UI);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.isAdmin = checkIsAdmin(parsed);
      return parsed;
    }
  } catch {
    // Ignore
  }
  return null;
}

function saveCachedSession(user: UserProfile | null): void {
  if (user) {
    user.isAdmin = checkIsAdmin(user);
    localStorage.setItem(STORAGE_KEY_SESSION_UI, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY_SESSION_UI);
  }
}

// --------------------------------------------------------------------------
// AUTHENTICATION METHODS (Strictly Firebase Auth - No Mock Account Creation)
// --------------------------------------------------------------------------

export function translateFirebaseError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail est déjà associée à un compte.';
    case 'auth/invalid-email':
      return 'L\'adresse e-mail saisie n\'est pas valide.';
    case 'auth/user-not-found':
      return 'Aucun compte associé à cette adresse e-mail.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou mot de passe incorrect.';
    case 'auth/weak-password':
      return 'Le mot de passe doit comporter au moins 6 caractères.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives échouées. Veuillez patienter avant de réessayer.';
    case 'auth/network-request-failed':
      return 'Erreur de connexion réseau. Vérifiez votre accès internet.';
    case 'auth/user-disabled':
      return 'Ce compte utilisateur a été temporairement désactivé.';
    default:
      return error?.message || 'Une erreur est survenue lors de l\'authentification.';
  }
}

export async function registerUser(
  email: string, 
  password: string, 
  displayName: string,
  customPhotoURL?: string
): Promise<UserProfile> {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Service d\'authentification Firebase non configuré. Veuillez vérifier la configuration réseau.');
  }

  const finalPhotoURL = customPhotoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName || email)}`;
  const cleanDisplayName = displayName.trim() || email.split('@')[0];
  const isAdmin = ADMIN_EMAILS.has(email.toLowerCase());

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    try {
      await updateProfile(cred.user, { 
        displayName: cleanDisplayName,
        photoURL: finalPhotoURL
      });
    } catch (profileErr) {
      console.warn('Profile update notice (non-blocking):', profileErr);
    }
    
    const userProfile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email || email,
      displayName: cleanDisplayName,
      photoURL: finalPhotoURL,
      createdAt: new Date().toISOString(),
      projectsCount: 0,
      totalDownloads: 0,
      isAdmin,
    };

    if (db) {
      // Save to Firestore users collection
      try {
        await setDoc(doc(db, 'users', cred.user.uid), sanitizeForFirestore(userProfile));
      } catch (err) {
        console.warn('Firestore setDoc user warning:', err);
      }
    }
    
    saveCachedSession(userProfile);
    return userProfile;
  } catch (err: any) {
    throw new Error(translateFirebaseError(err));
  }
}

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Service d\'authentification Firebase non configuré. Impossible de se connecter.');
  }

  const defaultPhotoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
  const isAdmin = ADMIN_EMAILS.has(email.toLowerCase());

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    let userProfile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email || email,
      displayName: cred.user.displayName || email.split('@')[0],
      photoURL: cred.user.photoURL || defaultPhotoURL,
      createdAt: new Date().toISOString(),
      projectsCount: 0,
      totalDownloads: 0,
      isAdmin,
    };

    if (db) {
      try {
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        if (userDoc.exists()) {
          userProfile = { ...userProfile, ...(userDoc.data() as UserProfile) };
        } else {
          setDoc(doc(db, 'users', cred.user.uid), sanitizeForFirestore(userProfile))
            .catch((err) => console.warn('Firestore user init warning:', err));
        }
      } catch {
        // Continue with auth profile
      }
    }
    
    userProfile.isAdmin = checkIsAdmin(userProfile);
    saveCachedSession(userProfile);
    return userProfile;
  } catch (err: any) {
    throw new Error(translateFirebaseError(err));
  }
}

export async function updateUserProfile(
  userId: string, 
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const authUser = auth?.currentUser;
  if (!authUser || (authUser.uid !== userId && !checkIsAdmin({ email: authUser.email || '', uid: authUser.uid }))) {
    throw new Error('Vous n\'êtes pas autorisé à modifier ce profil.');
  }

  const isAdmin = checkIsAdmin({ email: authUser.email || '', uid: authUser.uid });

  // Security: Prevent privilege escalation and immutable UID modification
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isAdmin: _attemptedAdmin, uid: _ignoredUid, ...safeUpdates } = updates;
  const currentSession = getCachedSession();

  const updatedProfile: UserProfile = {
    ...(currentSession || {
      uid: userId,
      email: authUser.email || '',
      displayName: authUser.displayName || 'Dev',
      createdAt: new Date().toISOString(),
    }),
    ...safeUpdates,
    uid: userId,
    isAdmin,
  };

  // 1. Update Firebase Auth if user is currently logged in
  if (authUser.uid === userId) {
    try {
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (safeUpdates.displayName) authUpdates.displayName = safeUpdates.displayName;
      if (safeUpdates.photoURL) authUpdates.photoURL = safeUpdates.photoURL;
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(authUser, authUpdates);
      }
    } catch (err) {
      console.warn('Firebase Auth updateProfile warning:', err);
    }
  }

  // 2. Update Firestore document (Source of Truth)
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'users', userId), sanitizeForFirestore(updatedProfile), { merge: true });
    } catch (err: any) {
      throw new Error(err?.message || 'Échec de la mise à jour du profil sur Firestore.');
    }
  }

  saveCachedSession(updatedProfile);
  return updatedProfile;
}

export async function logoutUser(): Promise<void> {
  if (auth && isFirebaseConfigured()) {
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
  }
  saveCachedSession(null);
}

export async function resetUserPassword(email: string): Promise<void> {
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('Service d\'authentification non disponible pour la réinitialisation.');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err: any) {
    throw new Error(translateFirebaseError(err));
  }
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  // First paint with cached session for UX responsiveness
  const cached = getCachedSession();
  if (cached) {
    callback(cached);
  }

  if (auth && isFirebaseConfigured()) {
    return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const defaultPhotoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbUser.displayName || fbUser.email || 'dev')}`;
        
        let hasCustomAdminClaim = false;
        try {
          const tokenResult = await fbUser.getIdTokenResult();
          hasCustomAdminClaim = tokenResult.claims.admin === true;
        } catch {
          // Non-blocking token error
        }

        const isAdmin = checkIsAdmin({ email: fbUser.email || '', uid: fbUser.uid }, hasCustomAdminClaim);

        let profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Utilisateur',
          photoURL: fbUser.photoURL || defaultPhotoURL,
          createdAt: new Date().toISOString(),
          isAdmin,
        };
        if (db) {
          try {
            const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              profile = { 
                ...profile, 
                ...userData,
                isAdmin,
              };
            }
          } catch {
            // fallback to auth profile
          }
        }
        profile.isAdmin = isAdmin;
        saveCachedSession(profile);
        callback(profile);
      } else {
        saveCachedSession(null);
        callback(null);
      }
    });
  }

  callback(null);
  return () => {};
}

// --------------------------------------------------------------------------
// POPULARITY ALGORITHM
// --------------------------------------------------------------------------

/**
 * Calculates a balanced popularity score based on downloads (x3), views (x1),
 * and recency decay so new active projects can trend without being permanently locked behind historical numbers.
 */
export function calculatePopularityScore(project: Project): number {
  const downloads = project.downloads || 0;
  const views = project.views || 0;
  const createdTime = new Date(project.createdAt || Date.now()).getTime();
  const daysSinceCreation = Math.max(0, (Date.now() - createdTime) / (1000 * 60 * 60 * 24));
  
  // Recency decay factor (newer projects have multiplier up to 1.0, older projects decay gradually to 0.3)
  const recencyFactor = Math.max(0.3, 1 / (1 + daysSinceCreation * 0.03));
  const baseScore = (downloads * 3 + views * 1) * recencyFactor;
  const featuredBonus = project.featured ? 25 : 0;
  
  return Math.round(baseScore + featuredBonus);
}

// --------------------------------------------------------------------------
// FIRESTORE & PROJECT SERVICES
// --------------------------------------------------------------------------

const PROJECTS_CHANGE_EVENT = 'orax_projects_changed';

export function broadcastProjectsChange(projects: Project[]): void {
  if (typeof window !== 'undefined') {
    const unique = deduplicateProjects(projects);
    window.dispatchEvent(new CustomEvent(PROJECTS_CHANGE_EVENT, { detail: unique }));
  }
}

/**
 * Real-time subscription to projects:
 * Synchronizes across Firestore onSnapshot, in-window events, and cross-tab storage changes.
 */
export function subscribeToProjects(callback: (projects: Project[]) => void): () => void {
  // 1. Immediately provide cached/local data
  const initial = getLocalProjects();
  callback(initial);

  let unsubscribeFirestore: (() => void) | null = null;

  // 2. Attach live Firestore listener
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
            const realOnly = deduplicateProjects(fetched);
            saveLocalProjects(realOnly);
            callback(realOnly);
          } else if (snapshot && snapshot.empty) {
            callback([]);
          }
        },
        (err) => {
          console.warn('Firestore real-time snapshot fallback:', err);
        }
      );
    } catch (err) {
      console.warn('Firestore onSnapshot init error:', err);
    }
  }

  // 3. Custom event listener for instant reactive updates within the app
  const handleCustomChange = (e: Event) => {
    const customEvent = e as CustomEvent<Project[]>;
    if (customEvent.detail) {
      callback(deduplicateProjects(customEvent.detail));
    } else {
      callback(getLocalProjects());
    }
  };

  // 4. Cross-tab storage change listener
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_PROJECTS) {
      callback(getLocalProjects());
    }
  };

  window.addEventListener(PROJECTS_CHANGE_EVENT, handleCustomChange);
  window.addEventListener('storage', handleStorageChange);

  return () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
    window.removeEventListener(PROJECTS_CHANGE_EVENT, handleCustomChange);
    window.removeEventListener('storage', handleStorageChange);
  };
}

export async function getProjects(): Promise<Project[]> {
  if (!db || !isFirebaseConfigured()) {
    // If Firebase is not configured, fallback to cached data with offline sync state
    updateSyncStatus('offline');
    return getLocalProjects();
  }

  try {
    updateSyncStatus('syncing');
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot) {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      const realOnly = deduplicateProjects(fetched);
      saveLocalProjects(realOnly);
      updateSyncStatus(navigator.onLine ? 'synced' : 'offline');
      return realOnly;
    }
  } catch (err) {
    updateSyncStatus(navigator.onLine ? 'error' : 'offline');
    console.warn('Firestore getProjects network notice, using local cache:', err);
  }

  return getLocalProjects();
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'projects', id);
      const snapshot = await getDoc(docRef);
      if (snapshot && snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Project;
      }
    } catch (err) {
      console.warn('Firestore getProjectById notice, using cache:', err);
    }
  }

  const projects = getLocalProjects();
  return projects.find(p => p.id === id) || null;
}

export async function saveNewProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'downloads' | 'views'>): Promise<Project> {
  const currentAuthUser = auth?.currentUser;
  const verifiedOwnerId = currentAuthUser?.uid || projectData.ownerId;
  
  if (!verifiedOwnerId) {
    throw new Error('Vous devez être authentifié pour publier un projet.');
  }

  if (!db || !isFirebaseConfigured()) {
    throw new Error('Impossible de publier le projet : la base de données Firestore n\'est pas connectée.');
  }

  const newId = `orax_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newProject: Project = {
    ...projectData,
    id: newId,
    ownerId: verifiedOwnerId,
    status: projectData.status || 'published',
    downloads: 0,
    views: 1,
    viewedBy: [verifiedOwnerId],
    downloadedBy: [],
    createdAt: now,
    updatedAt: now,
  };

  // Mark author as having viewed this project locally
  markProjectAsViewedLocally(newId, verifiedOwnerId);

  // 1. Mandatory Firestore Confirmation (Source of Truth)
  updateSyncStatus('syncing');
  try {
    await setDoc(doc(db, 'projects', newId), sanitizeForFirestore(newProject));
    updateSyncStatus('synced');
  } catch (err: any) {
    updateSyncStatus('error');
    throw new Error(err?.message || 'Échec de l\'enregistrement du projet sur Firestore. Publication annulée.');
  }

  // 2. Update local storage cache only AFTER Firestore confirmation
  const projects = getLocalProjects();
  const updatedList = deduplicateProjects([newProject, ...projects]);
  saveLocalProjects(updatedList);
  broadcastProjectsChange(updatedList);

  return newProject;
}

export async function updateExistingProject(id: string, updates: Partial<Project>): Promise<Project> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Impossible de modifier le projet : Firestore n\'est pas connecté.');
  }

  const projects = getLocalProjects();
  const existingProject = projects.find(p => p.id === id);
  const authUser = auth?.currentUser;
  const isAdmin = authUser ? checkIsAdmin({ email: authUser.email || '', uid: authUser.uid }) : false;
  const isOwner = Boolean(authUser && existingProject && existingProject.ownerId === authUser.uid);

  if (authUser && existingProject && !isOwner && !isAdmin) {
    throw new Error('Vous n\'êtes pas autorisé à modifier ce projet.');
  }

  // Security: Prevent tampering with immutable identifiers
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ownerId: _ignoredOwnerId, createdAt: _ignoredCreatedAt, id: _ignoredId, ...safeUpdates } = updates;

  const now = new Date().toISOString();
  const updatedData: Partial<Project> = { 
    ...safeUpdates, 
    updatedAt: now,
  };

  // 1. Mandatory Firestore Confirmation (Source of Truth)
  updateSyncStatus('syncing');
  try {
    const docRef = doc(db, 'projects', id);
    await updateDoc(docRef, sanitizeForFirestore(updatedData));
    updateSyncStatus('synced');
  } catch (err: any) {
    updateSyncStatus('error');
    throw new Error(err?.message || 'Échec de la modification sur Firestore. Modifications non enregistrées.');
  }

  // 2. Update Local Cache after server confirmation
  const index = projects.findIndex(p => p.id === id);
  let updatedProject: Project;
  if (index !== -1) {
    projects[index] = { ...projects[index], ...updatedData };
    const cleanList = deduplicateProjects(projects);
    saveLocalProjects(cleanList);
    broadcastProjectsChange(cleanList);
    updatedProject = projects[index];
  } else {
    updatedProject = { ...existingProject, ...updatedData } as Project;
  }

  return updatedProject;
}

export async function deleteExistingProject(id: string, userId: string): Promise<boolean> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Impossible de supprimer le projet : Firestore n\'est pas connecté.');
  }

  const projects = getLocalProjects();
  const project = projects.find(p => p.id === id);
  const authUser = auth?.currentUser;
  const isAdmin = authUser ? checkIsAdmin({ email: authUser.email || '', uid: authUser.uid }) : false;

  // Strict ownership check
  const isOwner = Boolean(
    project && 
    project.ownerId && 
    (
      (authUser && project.ownerId === authUser.uid) ||
      project.ownerId === userId
    )
  );

  if (!isOwner && !isAdmin) {
    throw new Error('Vous n\'êtes pas autorisé à supprimer ce projet.');
  }

  // 1. Mandatory Firestore Confirmation BEFORE visual/cache deletion
  updateSyncStatus('syncing');
  try {
    const docRef = doc(db, 'projects', id);
    await deleteDoc(docRef);
    updateSyncStatus('synced');
  } catch (err: any) {
    updateSyncStatus('error');
    throw new Error(err?.message || 'Échec de la suppression sur le serveur Firestore. Projet conservé.');
  }

  // 2. Remove from local storage cache & broadcast to UI only after server confirmation
  const updated = deduplicateProjects(projects.filter(p => p.id !== id));
  saveLocalProjects(updated);
  broadcastProjectsChange(updated);

  // 3. Remove associated binary file from local IndexedDB
  try {
    await deleteStoredFile(id);
    if (project?.fileUrl) {
      await deleteStoredFile(project.fileUrl);
    }
  } catch (err) {
    console.warn('IndexedDB file cleanup notice:', err);
  }

  return true;
}

// --------------------------------------------------------------------------
// SECURE UNIQUE VIEW & DOWNLOAD TRACKING PER ACCOUNT / VISITOR
// (Uses Serverless Function + Subcollection verification + Atomic transactions)
// --------------------------------------------------------------------------

const STORAGE_KEY_USER_VIEWS = 'orax_unique_user_views';
const STORAGE_KEY_USER_DOWNLOADS = 'orax_unique_user_downloads';
const STORAGE_KEY_GUEST_ID = 'orax_guest_device_id';

/**
 * Returns a stable identifier for the current user or visitor device
 */
export function getVisitorIdentifier(customUserId?: string): string {
  if (customUserId && customUserId.trim()) {
    return customUserId.trim();
  }
  const authUser = auth?.currentUser;
  if (authUser?.uid) {
    return authUser.uid;
  }
  const session = getCachedSession();
  if (session?.uid) {
    return session.uid;
  }
  try {
    let guestId = localStorage.getItem(STORAGE_KEY_GUEST_ID);
    if (!guestId) {
      guestId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(STORAGE_KEY_GUEST_ID, guestId);
    }
    return guestId;
  } catch {
    return 'visitor_guest';
  }
}

function hasUserViewedProjectLocally(projectId: string, visitorId: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_VIEWS);
    if (raw) {
      const map: Record<string, string[]> = JSON.parse(raw);
      if (map[visitorId] && map[visitorId].includes(projectId)) {
        return true;
      }
    }
  } catch {
    // Ignore parse error
  }
  return false;
}

function markProjectAsViewedLocally(projectId: string, visitorId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_VIEWS);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!map[visitorId]) {
      map[visitorId] = [];
    }
    if (!map[visitorId].includes(projectId)) {
      map[visitorId].push(projectId);
    }
    localStorage.setItem(STORAGE_KEY_USER_VIEWS, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function hasUserDownloadedProjectLocally(projectId: string, visitorId: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_DOWNLOADS);
    if (raw) {
      const map: Record<string, string[]> = JSON.parse(raw);
      if (map[visitorId] && map[visitorId].includes(projectId)) {
        return true;
      }
    }
  } catch {
    // Ignore parse error
  }
  return false;
}

function markProjectAsDownloadedLocally(projectId: string, visitorId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_DOWNLOADS);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!map[visitorId]) {
      map[visitorId] = [];
    }
    if (!map[visitorId].includes(projectId)) {
      map[visitorId].push(projectId);
    }
    localStorage.setItem(STORAGE_KEY_USER_DOWNLOADS, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

// In-memory anti-spam debounce maps
const recentViewCalls = new Map<string, number>();
const recentDownloadCalls = new Map<string, number>();

/**
 * Increments project downloads ONLY ONCE per user account / visitor.
 * Controlled server-side with atomic verification in projects/{projectId}/downloads/{visitorId}.
 */
export async function recordProjectDownload(
  id: string, 
  customUserId?: string
): Promise<{ downloads: number; isNew: boolean }> {
  const visitorId = getVisitorIdentifier(customUserId);
  const debounceKey = `${id}_${visitorId}`;
  const nowMs = Date.now();

  // Rapid click / spam protection: Ignore requests within 2.5 seconds
  if (recentDownloadCalls.has(debounceKey) && nowMs - (recentDownloadCalls.get(debounceKey) || 0) < 2500) {
    const projects = getLocalProjects();
    const current = projects.find(p => p.id === id);
    return { downloads: current?.downloads || 0, isNew: false };
  }
  recentDownloadCalls.set(debounceKey, nowMs);

  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === id);
  const targetProject = index !== -1 ? projects[index] : null;

  // 1. Fast local check to avoid redundant network hits
  if (hasUserDownloadedProjectLocally(id, visitorId)) {
    return {
      downloads: targetProject?.downloads || 0,
      isNew: false,
    };
  }

  // Mark local optimistic cache
  markProjectAsDownloadedLocally(id, visitorId);

  // 2. Try Netlify Serverless Function first for server-authoritative tracking
  try {
    const response = await fetch('/api/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: id,
        type: 'download',
        visitorId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (index !== -1) {
        projects[index].downloads = data.count;
        const clean = deduplicateProjects(projects);
        saveLocalProjects(clean);
        broadcastProjectsChange(clean);
      }
      return { downloads: data.count, isNew: data.isNew };
    }
  } catch {
    // Fallback to direct client-side atomic Firestore transaction if function is unreachable
  }

  // 3. Fallback: Direct Firestore Atomic Transaction using Subcollections
  if (db && isFirebaseConfigured()) {
    try {
      const projectRef = doc(db, 'projects', id);
      const sanitizedVisitorId = visitorId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
      const downloadTrackRef = doc(db, 'projects', id, 'downloads', sanitizedVisitorId);

      const result = await runTransaction(db, async (transaction) => {
        const [projectSnap, trackSnap] = await Promise.all([
          transaction.get(projectRef),
          transaction.get(downloadTrackRef),
        ]);

        if (!projectSnap.exists()) {
          throw new Error('Projet introuvable');
        }

        const projectData = projectSnap.data();
        const currentCount = projectData.downloads || 0;

        if (trackSnap.exists()) {
          return { downloads: currentCount, isNew: false };
        }

        const newCount = currentCount + 1;
        const nowIso = new Date().toISOString();

        transaction.set(downloadTrackRef, {
          visitorId: sanitizedVisitorId,
          createdAt: nowIso,
          type: 'download',
        });

        transaction.update(projectRef, {
          downloads: newCount,
          updatedAt: nowIso,
        });

        return { downloads: newCount, isNew: true };
      });

      if (index !== -1) {
        projects[index].downloads = result.downloads;
        const clean = deduplicateProjects(projects);
        saveLocalProjects(clean);
        broadcastProjectsChange(clean);
      }

      return result;
    } catch (err) {
      console.warn('Firestore direct transaction fallback notice:', err);
    }
  }

  // 4. Offline / Local fallback
  let updatedDownloads = 1;
  if (index !== -1) {
    projects[index].downloads = (projects[index].downloads || 0) + 1;
    updatedDownloads = projects[index].downloads;
    const clean = deduplicateProjects(projects);
    saveLocalProjects(clean);
    broadcastProjectsChange(clean);
  }

  return { downloads: updatedDownloads, isNew: true };
}

/**
 * Increments project views ONLY ONCE per user account / visitor.
 * Controlled server-side with atomic verification in projects/{projectId}/views/{visitorId}.
 */
export async function recordProjectView(
  id: string, 
  customUserId?: string
): Promise<{ views: number; isNew: boolean }> {
  const visitorId = getVisitorIdentifier(customUserId);
  const debounceKey = `${id}_${visitorId}`;
  const nowMs = Date.now();

  // Rapid view / refresh spam protection: Ignore repeat calls within 2.5 seconds
  if (recentViewCalls.has(debounceKey) && nowMs - (recentViewCalls.get(debounceKey) || 0) < 2500) {
    const projects = getLocalProjects();
    const current = projects.find(p => p.id === id);
    return { views: current?.views || 1, isNew: false };
  }
  recentViewCalls.set(debounceKey, nowMs);

  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === id);
  const targetProject = index !== -1 ? projects[index] : null;

  // 1. Fast local check
  if (hasUserViewedProjectLocally(id, visitorId)) {
    return {
      views: targetProject?.views || 1,
      isNew: false,
    };
  }

  // Mark local optimistic cache
  markProjectAsViewedLocally(id, visitorId);

  // 2. Try Netlify Serverless Function first
  try {
    const response = await fetch('/api/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: id,
        type: 'view',
        visitorId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (index !== -1) {
        projects[index].views = data.count;
        const clean = deduplicateProjects(projects);
        saveLocalProjects(clean);
        broadcastProjectsChange(clean);
      }
      return { views: data.count, isNew: data.isNew };
    }
  } catch {
    // Fallback to direct client-side atomic Firestore transaction if function is unreachable
  }

  // 3. Fallback: Direct Firestore Atomic Transaction using Subcollections
  if (db && isFirebaseConfigured()) {
    try {
      const projectRef = doc(db, 'projects', id);
      const sanitizedVisitorId = visitorId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
      const viewTrackRef = doc(db, 'projects', id, 'views', sanitizedVisitorId);

      const result = await runTransaction(db, async (transaction) => {
        const [projectSnap, trackSnap] = await Promise.all([
          transaction.get(projectRef),
          transaction.get(viewTrackRef),
        ]);

        if (!projectSnap.exists()) {
          throw new Error('Projet introuvable');
        }

        const projectData = projectSnap.data();
        const currentCount = projectData.views || 1;

        if (trackSnap.exists()) {
          return { views: currentCount, isNew: false };
        }

        const newCount = currentCount + 1;
        const nowIso = new Date().toISOString();

        transaction.set(viewTrackRef, {
          visitorId: sanitizedVisitorId,
          createdAt: nowIso,
          type: 'view',
        });

        transaction.update(projectRef, {
          views: newCount,
          updatedAt: nowIso,
        });

        return { views: newCount, isNew: true };
      });

      if (index !== -1) {
        projects[index].views = result.views;
        const clean = deduplicateProjects(projects);
        saveLocalProjects(clean);
        broadcastProjectsChange(clean);
      }

      return result;
    } catch (err) {
      console.warn('Firestore direct transaction fallback notice:', err);
    }
  }

  // 4. Offline / Local fallback
  let updatedViews = 1;
  if (index !== -1) {
    projects[index].views = (projects[index].views || 0) + 1;
    updatedViews = projects[index].views;
    const clean = deduplicateProjects(projects);
    saveLocalProjects(clean);
    broadcastProjectsChange(clean);
  }

  return { views: updatedViews, isNew: true };
}

// --------------------------------------------------------------------------
// MODERATION & REPORTS SERVICES
// --------------------------------------------------------------------------

export async function submitProjectReport(
  reportData: Omit<ProjectReport, 'id' | 'createdAt' | 'status'>
): Promise<ProjectReport> {
  const currentAuthUser = auth?.currentUser;
  const verifiedReporterId = currentAuthUser?.uid || reportData.reporterId;
  
  if (!verifiedReporterId) {
    throw new Error('Vous devez être authentifié pour signaler un projet.');
  }

  const newId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newReport: ProjectReport = {
    ...reportData,
    reporterId: verifiedReporterId,
    id: newId,
    status: 'pending',
    createdAt: now,
  };

  const reports = getLocalReports();
  reports.unshift(newReport);
  saveLocalReports(reports);

  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'reports', newId), sanitizeForFirestore(newReport));
    } catch (err) {
      console.warn('Firestore save report warning:', err);
    }
  }

  return newReport;
}

export async function getProjectReports(): Promise<ProjectReport[]> {
  const authUser = auth?.currentUser;
  const isAdmin = authUser ? checkIsAdmin({ email: authUser.email || '', uid: authUser.uid }) : false;

  if (db && isFirebaseConfigured() && (!authUser || isAdmin)) {
    try {
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot && !snapshot.empty) {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectReport));
        saveLocalReports(fetched);
        return fetched;
      }
    } catch (err) {
      console.warn('Firestore reports fetch fallback:', err);
    }
  }
  return getLocalReports();
}

export async function updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
  const authUser = auth?.currentUser;
  const isAdmin = authUser ? checkIsAdmin({ email: authUser.email || '', uid: authUser.uid }) : false;

  if (authUser && !isAdmin) {
    throw new Error('Seul l\'administrateur peut modifier le statut d\'un signalement.');
  }

  const reports = getLocalReports();
  const idx = reports.findIndex(r => r.id === reportId);
  if (idx !== -1) {
    reports[idx].status = status;
    reports[idx].updatedAt = new Date().toISOString();
    saveLocalReports(reports);
  }

  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'reports', reportId);
      await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.warn('Firestore report status update error:', err);
    }
  }
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus): Promise<void> {
  await updateExistingProject(projectId, { status });
}
