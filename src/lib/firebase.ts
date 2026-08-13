import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase Application
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore DB with long-polling fallback for iframe / sandboxed environments
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export const auth = getAuth(app);

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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
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

