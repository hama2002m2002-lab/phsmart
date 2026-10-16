import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import localConfig from '../../firebase-applet-config.json';

// Hybrid Firebase configuration: supports environment variables and applet configuration
const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || localConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || localConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || localConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || localConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || localConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || localConfig.appId,
};

// Resilient Firebase initialization that never blocks offline startup or module evaluation
let appInstance: any = null;
try {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn('[Firebase] Initialization skipped in offline mode:', e);
}
export const app = appInstance;

// Lazy Auth getter
let authInstance: Auth | null = null;
export function getFirebaseAuth(): Auth | null {
  if (!authInstance && app) {
    try {
      authInstance = getAuth(app);
    } catch (err) {
      console.warn('[Firebase Auth] Failed to get auth instance:', err);
    }
  }
  return authInstance;
}
export const auth = getFirebaseAuth();

// Resilient Firestore DB reference
let firestoreInstance: any = null;
export function getFirebaseDb() {
  if (!firestoreInstance && app) {
    const firestoreDbId = (env.VITE_FIRESTORE_DATABASE_ID || (localConfig as any).firestoreDatabaseId || '').trim();
    try {
      firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }, firestoreDbId || undefined);
    } catch {
      try {
        firestoreInstance = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
      } catch (err) {
        console.warn('[Firestore] Not available offline:', err);
      }
    }
  }
  return firestoreInstance;
}
export const db = getFirebaseDb();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType | string;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType | string, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
    },
    operationType,
    path,
  };
  console.warn('[Firebase Firestore Engine] Error info:', JSON.stringify(errInfo));
}

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'check'));
    return true;
  } catch (err) {
    // Offline mode or connection warning is normal when network is offline/sandboxed
    console.warn('[Firebase Firestore Engine] Connection test note (operating in offline/local fallback mode if unavailable):', err);
    return false;
  }
}



