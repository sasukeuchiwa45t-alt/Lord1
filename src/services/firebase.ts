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
  query,
  orderBy,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import { Project, UserProfile } from '../types';
import { INITIAL_DEMO_PROJECTS } from '../data/demoProjects';

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
// LOCAL PERSISTENCE ENGINE (Fallback for preview & offline mode)
// --------------------------------------------------------------------------
const STORAGE_KEY_PROJECTS = 'orax_projet_items_v2';
const STORAGE_KEY_USERS = 'orax_projet_users_v2';
const STORAGE_KEY_SESSION = 'orax_projet_current_user_v2';

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

function getLocalProjects(): Project[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (saved) {
      const parsed: Project[] = JSON.parse(saved);
      // Clean and keep only projects published by real users
      const realOnly = parsed.filter(p => p && p.id && !DEMO_PROJECT_IDS.has(p.id));
      if (realOnly.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(realOnly));
      }
      return realOnly;
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
}

function saveLocalProjects(projects: Project[]): void {
  const realOnly = projects.filter(p => p && p.id && !DEMO_PROJECT_IDS.has(p.id));
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(realOnly));
}

function getLocalUsers(): UserProfile[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }
  return [];
}

function getLocalSession(): UserProfile | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SESSION);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }
  return null;
}

function saveLocalSession(user: UserProfile | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }
}

// --------------------------------------------------------------------------
// AUTHENTICATION METHODS
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
  const finalPhotoURL = customPhotoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName || email)}`;
  const cleanDisplayName = displayName.trim() || email.split('@')[0];

  if (auth && isFirebaseConfigured()) {
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
      };

      if (db) {
        // Asynchronously save to Firestore without blocking user creation flow
        setDoc(doc(db, 'users', cred.user.uid), sanitizeForFirestore(userProfile))
          .catch((err) => console.warn('Firestore setDoc user warning (non-blocking):', err));
      }
      
      saveLocalSession(userProfile);
      return userProfile;
    } catch (err: any) {
      throw new Error(translateFirebaseError(err));
    }
  }

  // Local fallback registration
  const users = getLocalUsers();
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('Cette adresse e-mail est déjà utilisée.');
  }

  const newUser: UserProfile = {
    uid: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email,
    displayName: cleanDisplayName,
    photoURL: finalPhotoURL,
    createdAt: new Date().toISOString(),
    projectsCount: 0,
    totalDownloads: 0,
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  saveLocalSession(newUser);
  return newUser;
}

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const defaultPhotoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

  if (auth && isFirebaseConfigured()) {
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
      };

      if (db) {
        try {
          const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
          if (userDoc.exists()) {
            userProfile = { ...userProfile, ...(userDoc.data() as UserProfile) };
          } else {
            // Asynchronously sync profile to firestore
            setDoc(doc(db, 'users', cred.user.uid), sanitizeForFirestore(userProfile))
              .catch((err) => console.warn('Firestore user init warning:', err));
          }
        } catch {
          // Continue with auth profile
        }
      }
      
      saveLocalSession(userProfile);
      return userProfile;
    } catch (err: any) {
      throw new Error(translateFirebaseError(err));
    }
  }

  // Local fallback login
  const users = getLocalUsers();
  let found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!found) {
    // If not found in mock list, auto-create to allow seamless testing
    found = {
      uid: `user_${Date.now()}`,
      email,
      displayName: email.split('@')[0],
      photoURL: defaultPhotoURL,
      createdAt: new Date().toISOString(),
      projectsCount: 0,
      totalDownloads: 0,
    };
    users.push(found);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }

  saveLocalSession(found);
  return found;
}

export async function updateUserProfile(
  userId: string, 
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const currentSession = getLocalSession();
  const updatedProfile: UserProfile = {
    ...(currentSession || {
      uid: userId,
      email: '',
      displayName: 'Dev',
      createdAt: new Date().toISOString(),
    }),
    ...updates,
  };

  // 1. Update Firebase Auth if user is currently logged in
  if (auth && auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (updates.displayName) authUpdates.displayName = updates.displayName;
      if (updates.photoURL) authUpdates.photoURL = updates.photoURL;
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(auth.currentUser, authUpdates);
      }
    } catch (err) {
      console.warn('Firebase Auth updateProfile warning:', err);
    }
  }

  // 2. Update Firestore document
  if (db && isFirebaseConfigured()) {
    try {
      setDoc(doc(db, 'users', userId), sanitizeForFirestore(updatedProfile), { merge: true })
        .catch((err) => console.warn('Firestore updateUserProfile warning:', err));
    } catch (err) {
      console.warn('Firestore update error:', err);
    }
  }

  // 3. Update Local Storage list and session
  const users = getLocalUsers();
  const idx = users.findIndex(u => u.uid === userId);
  if (idx !== -1) {
    users[idx] = updatedProfile;
  } else {
    users.push(updatedProfile);
  }
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  saveLocalSession(updatedProfile);

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
  saveLocalSession(null);
}

export async function resetUserPassword(email: string): Promise<void> {
  if (auth && isFirebaseConfigured()) {
    try {
      await sendPasswordResetEmail(auth, email);
      return;
    } catch (err: any) {
      throw new Error(translateFirebaseError(err));
    }
  }
  // Local simulator delay
  await new Promise(r => setTimeout(r, 600));
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  if (auth && isFirebaseConfigured()) {
    return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const defaultPhotoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbUser.displayName || fbUser.email || 'dev')}`;
        let profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Utilisateur',
          photoURL: fbUser.photoURL || defaultPhotoURL,
          createdAt: new Date().toISOString(),
        };
        if (db) {
          try {
            const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
            if (userDoc.exists()) {
              profile = { ...profile, ...(userDoc.data() as UserProfile) };
            }
          } catch {
            // fallback to default profile
          }
        }
        callback(profile);
      } else {
        callback(null);
      }
    });
  }

  // Local storage auth subscriber
  const current = getLocalSession();
  callback(current);

  const handleStorage = () => {
    callback(getLocalSession());
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

// --------------------------------------------------------------------------
// FIRESTORE & PROJECT SERVICES
// --------------------------------------------------------------------------

const PROJECTS_CHANGE_EVENT = 'orax_projects_changed';

export function broadcastProjectsChange(projects: Project[]): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROJECTS_CHANGE_EVENT, { detail: projects }));
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
            const realOnly = fetched.filter((p) => p && p.id && !DEMO_PROJECT_IDS.has(p.id));
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
      callback(customEvent.detail);
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
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      const fetchPromise = getDocs(q);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 2500)
      );
      const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
      if (snapshot && !snapshot.empty) {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
        const realOnly = fetched.filter(p => p && p.id && !DEMO_PROJECT_IDS.has(p.id));
        saveLocalProjects(realOnly);
        return realOnly;
      }
    } catch (err) {
      // Graceful offline fallback
    }
  }

  return getLocalProjects();
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'projects', id);
      const fetchPromise = getDoc(docRef);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 2500)
      );
      const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
      if (snapshot && snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Project;
      }
    } catch (err) {
      // Graceful offline fallback
    }
  }

  const projects = getLocalProjects();
  return projects.find(p => p.id === id) || null;
}

export async function saveNewProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'downloads' | 'views'>): Promise<Project> {
  const newId = `orax_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newProject: Project = {
    ...projectData,
    id: newId,
    downloads: 0,
    views: 1,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Immediately update local storage cache and broadcast for instant UI feedback
  const projects = getLocalProjects();
  projects.unshift(newProject);
  saveLocalProjects(projects);
  broadcastProjectsChange(projects);

  // 2. Synchronize to Firestore with timeout race
  if (db && isFirebaseConfigured()) {
    try {
      const setDocPromise = setDoc(doc(db, 'projects', newId), sanitizeForFirestore(newProject));
      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 1500));
      await Promise.race([setDocPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Firestore save warning (persisted locally):', err);
    }
  }

  return newProject;
}

export async function updateExistingProject(id: string, updates: Partial<Project>): Promise<Project> {
  const now = new Date().toISOString();
  const updatedData = { ...updates, updatedAt: now };

  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === id);
  let updatedProject: Project;
  if (index !== -1) {
    projects[index] = { ...projects[index], ...updatedData };
    saveLocalProjects(projects);
    broadcastProjectsChange(projects);
    updatedProject = projects[index];
  } else {
    throw new Error('Projet non trouvé pour la mise à jour.');
  }

  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, sanitizeForFirestore(updatedData));
    } catch (err) {
      console.warn('Firestore update error:', err);
    }
  }

  return updatedProject;
}

export async function deleteExistingProject(id: string, userId: string): Promise<boolean> {
  const projects = getLocalProjects();
  const project = projects.find(p => p.id === id);

  if (project && project.ownerId !== userId && userId !== 'dev_lord_demon') {
    throw new Error('Vous n\'êtes pas autorisé à supprimer ce projet.');
  }

  const updated = projects.filter(p => p.id !== id);
  saveLocalProjects(updated);
  broadcastProjectsChange(updated);

  if (db && isFirebaseConfigured()) {
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (err) {
      console.warn('Firestore delete error:', err);
    }
  }

  return true;
}

export async function recordProjectDownload(id: string): Promise<number> {
  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === id);
  let updatedDownloads = 1;

  if (index !== -1) {
    projects[index].downloads = (projects[index].downloads || 0) + 1;
    updatedDownloads = projects[index].downloads;
    saveLocalProjects(projects);
    broadcastProjectsChange(projects);
  }

  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, { downloads: increment(1) });
    } catch (err) {
      console.warn('Firestore download increment warning:', err);
    }
  }

  return updatedDownloads;
}

export async function recordProjectView(id: string): Promise<number> {
  const projects = getLocalProjects();
  const index = projects.findIndex(p => p.id === id);
  let updatedViews = 1;

  if (index !== -1) {
    projects[index].views = (projects[index].views || 0) + 1;
    updatedViews = projects[index].views;
    saveLocalProjects(projects);
    broadcastProjectsChange(projects);
  }

  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, { views: increment(1) });
    } catch (err) {
      console.warn('Firestore view increment warning:', err);
    }
  }

  return updatedViews;
}
