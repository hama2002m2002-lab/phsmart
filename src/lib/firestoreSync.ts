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
 * Real-time Firebase Firestore collection subscription.
 * Listens for live updates across all connected devices and tabs online.
 */
export function subscribeToCollection<T extends { id?: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  initialFallbackData?: T[]
): () => void {
  let isMounted = true;
  let hasReceivedCloudData = false;

  const fetchLocalFallback = async () => {
    try {
      const res = await fetch(`${API_BASE}/${collectionName}`);
      if (res.ok && isMounted) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          onData(items);
        } else if (initialFallbackData) {
          onData(initialFallbackData);
        }
      }
    } catch {
      if (isMounted && initialFallbackData) {
        onData(initialFallbackData);
      }
    }
  };

  // Set up real-time Firebase Firestore listener
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
          hasReceivedCloudData = true;
          onData(items);
        } else if (!hasReceivedCloudData && initialFallbackData && initialFallbackData.length > 0) {
          onData(initialFallbackData);
          syncBulkWriteCollection(collectionName, initialFallbackData).catch(() => {});
        } else if (hasReceivedCloudData) {
          onData([]);
        }
      },
      (error) => {
        console.warn(`[Online Cloud Sync] Firestore listener for ${collectionName}:`, error);
        if (!hasReceivedCloudData && isMounted && initialFallbackData) {
          fetchLocalFallback();
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribeFirestore();
    };
  } catch (err) {
    console.warn(`[Online Cloud Sync Setup Error] ${collectionName}:`, err);
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
        } else if (initialFallbackData) {
          onData(initialFallbackData);
          syncWriteDocument(collectionName, documentId, initialFallbackData).catch(() => {});
        }
      },
      (error) => {
        console.warn(`[Online Cloud Sync] Firestore doc listener for ${collectionName}/${documentId}:`, error);
        if (isMounted && initialFallbackData) {
          onData(initialFallbackData);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribeDoc();
    };
  } catch {
    if (initialFallbackData) {
      onData(initialFallbackData);
    }
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

  // Write online to Firestore
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn(`[Online Cloud Write Note] ${collectionName}/${docId}:`, err);
  }

  // Also backup to local REST API / SQLite
  try {
    await fetch(`${API_BASE}/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch {
    // Ignore
  }
}

/**
 * Delete a document from Firebase Firestore online
 */
export async function syncDeleteDocument(collectionName: string, docId: string) {
  if (!docId) return;

  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`[Online Cloud Delete Note] ${collectionName}/${docId}:`, err);
  }

  try {
    await fetch(`${API_BASE}/${collectionName}/${docId}`, {
      method: 'DELETE'
    });
  } catch {
    // Ignore
  }
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
    console.warn(`[Online Cloud Bulk Write Note] ${collectionName}:`, err);
  }
}
