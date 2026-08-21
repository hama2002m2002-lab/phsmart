import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

const API_BASE = '/api';

/**
 * Fast non-blocking fetch with short timeout to prevent UI lag in offline mode
 */
async function fastFetch(url: string, options: RequestInit = {}, timeoutMs = 400): Promise<Response | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return null;
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch {
    clearTimeout(id);
    return null;
  }
}

/**
 * Real-time Firebase Firestore collection subscription.
 * Uses persistent IndexedDB local cache instantly, never blocking offline startup.
 */
export function subscribeToCollection<T extends { id?: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  initialFallbackData?: T[]
): () => void {
  let isMounted = true;
  let hasReceivedData = false;

  const fetchLocalFallback = async () => {
    // Only attempt if mounted and no data received
    if (!isMounted || hasReceivedData) return;
    try {
      const res = await fastFetch(`${API_BASE}/${collectionName}`);
      if (res && res.ok && isMounted) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          hasReceivedData = true;
          onData(items);
        }
      }
    } catch {
      // Offline fallback silently continues using React's localStorage state
    }
  };

  // Set up real-time Firebase Firestore listener with IndexedDB cache priority
  try {
    const colRef = collection(db, collectionName);
    const unsubscribeFirestore = onSnapshot(
      colRef,
      (snapshot) => {
        if (!isMounted) return;
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          items.push({ ...d, id: docSnap.id } as unknown as T);
        });

        if (items.length > 0) {
          hasReceivedData = true;
          onData(items);
        } else if (!hasReceivedData && initialFallbackData && initialFallbackData.length > 0) {
          // If empty and online, populate initial data quietly
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            syncBulkWriteCollection(collectionName, initialFallbackData).catch(() => {});
          }
        } else if (hasReceivedData) {
          onData([]);
        }
      },
      (error) => {
        console.warn(`[Firestore Offline Note] Collection ${collectionName}:`, error?.message || error);
        if (!hasReceivedData && isMounted) {
          fetchLocalFallback();
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribeFirestore();
    };
  } catch (err) {
    console.warn(`[Firestore Offline Init Note] ${collectionName}:`, err);
    fetchLocalFallback();
    return () => {
      isMounted = false;
    };
  }
}

/**
 * Real-time Firebase Firestore single document subscription (e.g. Store Settings).
 */
export function subscribeToDocument<T>(
  collectionName: string,
  documentId: string,
  onData: (data: T) => void,
  initialFallbackData?: T
): () => void {
  let isMounted = true;

  try {
    const docRef = doc(db, collectionName, documentId);
    const unsubscribeDoc = onSnapshot(
      docRef,
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const data = docSnap.data() as T;
          onData(data);
        }
      },
      (error) => {
        console.warn(`[Firestore Offline Note] Doc ${collectionName}/${documentId}:`, error?.message || error);
      }
    );

    return () => {
      isMounted = false;
      unsubscribeDoc();
    };
  } catch {
    return () => {
      isMounted = false;
    };
  }
}

/**
 * Write/Update a document in Firebase Firestore online and backup to local REST API
 */
export async function syncWriteDocument(collectionName: string, docId: string, data: any) {
  if (!docId && data?.id) {
    docId = String(data.id);
  }
  if (!docId) {
    docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  const payload = { ...data, id: docId };

  // Write to Firestore (IndexedDB persistence handles offline instantly)
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    // Handled by local persistence
  }

  // Non-blocking local API backup
  fastFetch(`${API_BASE}/${collectionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

/**
 * Delete a document from Firebase Firestore online
 */
export async function syncDeleteDocument(collectionName: string, docId: string) {
  if (!docId) return;

  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch {
    // Handled by local persistence
  }

  fastFetch(`${API_BASE}/${collectionName}/${docId}`, {
    method: 'DELETE'
  }).catch(() => {});
}

/**
 * Bulk write items to Firebase Firestore in batches
 */
export async function syncBulkWriteCollection<T extends { id?: string }>(
  collectionName: string,
  items: T[]
) {
  if (!items || items.length === 0) return;

  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const item of items) {
      const docId = String(item.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
      const docRef = doc(db, collectionName, docId);
      batch.set(docRef, { ...item, id: docId }, { merge: true });
      count++;

      if (count >= 450) {
        await batch.commit();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    // Handled by local persistence
  }
}
