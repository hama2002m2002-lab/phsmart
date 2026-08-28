import { 
  localDbGetAll, 
  localDbPut, 
  localDbDelete, 
  localDbBulkPut, 
  StoreName 
} from './localDb';

/**
 * 100% Isolated & Standalone Local Storage Engine.
 * Each laptop / device runs independently with its own local IndexedDB and localStorage.
 * No data, themes, languages, or invoices are shared or linked between different devices.
 */

export function isLiveCloudSyncActive(): boolean {
  return false;
}

/**
 * Real-time collection loader: loads purely from THIS device's local high-capacity IndexedDB.
 * Completely detached from any other laptop or cloud database.
 */
export function subscribeToCollection<T extends { id?: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  _initialFallbackData?: T[]
): () => void {
  let isMounted = true;

  // Instant Local IndexedDB Load (0ms offline load, completely isolated to this laptop)
  localDbGetAll<T>(collectionName as StoreName).then((localItems) => {
    if (isMounted && localItems && localItems.length > 0) {
      onData(localItems);
    }
  }).catch(() => {});

  return () => {
    isMounted = false;
  };
}

/**
 * Single document subscription: detached from cloud, isolated to this device.
 */
export function subscribeToDocument<T>(
  _collectionName: string,
  _documentId: string,
  _onData: (data: T) => void,
  _initialFallbackData?: T
): () => void {
  return () => {};
}

/**
 * Write/Update a document in High-Capacity IndexedDB (Strictly local to this laptop only).
 * Never broadcasts to any other device or remote database.
 */
export async function syncWriteDocument(collectionName: string, docId: string, data: any) {
  if (!docId && data?.id) {
    docId = String(data.id);
  }
  if (!docId) {
    docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  const payload = { ...data, id: docId };

  // 1. High-Capacity Local IndexedDB Save (100% Private to this laptop)
  try {
    await localDbPut(collectionName as StoreName, payload);
  } catch (err) {
    console.warn('[LocalDB Write Error]', err);
  }
}

/**
 * Delete a document from High-Capacity IndexedDB (Strictly local to this laptop only).
 */
export async function syncDeleteDocument(collectionName: string, docId: string) {
  if (!docId) return;

  try {
    await localDbDelete(collectionName as StoreName, docId);
  } catch (err) {
    console.warn('[LocalDB Delete Error]', err);
  }
}

/**
 * Bulk write items to High-Capacity IndexedDB (Strictly local to this laptop only).
 */
export async function syncBulkWriteCollection<T extends { id?: string }>(
  collectionName: string,
  items: T[]
) {
  if (!items || items.length === 0) return;

  try {
    await localDbBulkPut(collectionName as StoreName, items);
  } catch (err) {
    console.warn('[LocalDB Bulk Put Error]', err);
  }
}
