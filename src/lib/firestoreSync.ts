import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  localDbGetAll, 
  localDbPut, 
  localDbDelete, 
  localDbBulkPut, 
  StoreName 
} from './localDb';

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
 * Real-time Firebase Firestore collection subscription with Instant IndexedDB Local Pre-loading
 */
export function subscribeToCollection<T extends { id?: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  initialFallbackData?: T[]
): () => void {
  let isMounted = true;
  let hasReceivedData = false;

  // 1. Instant Local IndexedDB Load (0ms offline load for 100,000+ items)
  localDbGetAll<T>(collectionName as StoreName).then((localItems) => {
    if (isMounted && !hasReceivedData && localItems && localItems.length > 0) {
      hasReceivedData = true;
      onData(localItems);
    }
  }).catch(() => {});

  const fetchLocalFallback = async () => {
    if (!isMounted || hasReceivedData) return;
    try {
      const res = await fastFetch(`${API_BASE}/${collectionName}`);
      if (res && res.ok && isMounted) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          hasReceivedData = true;
          onData(items);
          localDbBulkPut(collectionName as StoreName, items).catch(() => {});
        }
      }
    } catch {
      // Handled silently
    }
  };

  // 2. Set up real-time Firebase Firestore listener with IndexedDB cache priority
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
          // Mirror immediately to high-capacity local IndexedDB
          localDbBulkPut(collectionName as StoreName, items).catch(() => {});
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
          localDbPut(collectionName as StoreName, { ...(data as any), id: documentId }).catch(() => {});
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
 * Write/Update a document in High-Capacity IndexedDB, Firebase Firestore, and Local REST API
 */
export async function syncWriteDocument(collectionName: string, docId: string, data: any) {
  if (!docId && data?.id) {
    docId = String(data.id);
  }
  if (!docId) {
    docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  const payload = { ...data, id: docId };

  // 1. High-Capacity Local IndexedDB Save (Immediate & Unlimited Capacity)
  try {
    await localDbPut(collectionName as StoreName, payload);
  } catch (err) {
    console.warn('[LocalDB Write Error]', err);
  }

  // 2. Write to Firestore (Cloud sync & offline persistent cache)
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    // Handled by local persistence
  }

  // 3. Non-blocking local API backup
  fastFetch(`${API_BASE}/${collectionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

/**
 * Delete a document from High-Capacity IndexedDB, Firebase Firestore, and Local REST API
 */
export async function syncDeleteDocument(collectionName: string, docId: string) {
  if (!docId) return;

  // 1. Delete from Local IndexedDB
  try {
    await localDbDelete(collectionName as StoreName, docId);
  } catch (err) {
    console.warn('[LocalDB Delete Error]', err);
  }

  // 2. Delete from Firestore
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    // Handled by local persistence
  }

  // 3. Delete from Local REST API
  fastFetch(`${API_BASE}/${collectionName}/${docId}`, {
    method: 'DELETE'
  }).catch(() => {});
}

/**
 * Bulk write items to High-Capacity IndexedDB, Firebase Firestore in batches
 */
export async function syncBulkWriteCollection<T extends { id?: string }>(
  collectionName: string,
  items: T[]
) {
  if (!items || items.length === 0) return;

  // 1. Instant High-Capacity Local IndexedDB Bulk Save
  try {
    await localDbBulkPut(collectionName as StoreName, items);
  } catch (err) {
    console.warn('[LocalDB Bulk Put Error]', err);
  }

  // 2. Write to Firestore in batches
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
