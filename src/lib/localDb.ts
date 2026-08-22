/**
 * High-Capacity IndexedDB & Multi-Layer Local Storage Engine
 * Designed for High-Performance POS & Supermarket Workloads (100,000+ items)
 * Zero latency offline loading, non-blocking asynchronous transactions, unlimited capacity.
 */

const DB_NAME = 'SupermarketPosLocalDB';
const DB_VERSION = 3;

export interface DBStoreNames {
  products: 'products';
  sales: 'sales';
  suppliers: 'suppliers';
  customers: 'customers';
  orders: 'orders';
  notifications: 'notifications';
  purchases: 'purchases';
  users: 'users';
  settings: 'settings';
  inventory_audits: 'inventory_audits';
  pending_sync_queue: 'pending_sync_queue';
  kv_store: 'kv_store';
}

export type StoreName = keyof DBStoreNames;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open or upgrade the local IndexedDB database with schema & indexes
 */
export function openLocalDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Products Store
      if (!db.objectStoreNames.contains('products')) {
        const prodStore = db.createObjectStore('products', { keyPath: 'id' });
        prodStore.createIndex('barcode', 'barcode', { unique: false });
        prodStore.createIndex('name', 'name', { unique: false });
        prodStore.createIndex('category', 'category', { unique: false });
        prodStore.createIndex('categoryAr', 'categoryAr', { unique: false });
      }

      // 2. Sales / Receipts Store
      if (!db.objectStoreNames.contains('sales')) {
        const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('date', 'date', { unique: false });
        salesStore.createIndex('timestamp', 'timestamp', { unique: false });
        salesStore.createIndex('cashierName', 'cashierName', { unique: false });
        salesStore.createIndex('paymentMethod', 'paymentMethod', { unique: false });
      }

      // 3. Suppliers Store
      if (!db.objectStoreNames.contains('suppliers')) {
        db.createObjectStore('suppliers', { keyPath: 'id' });
      }

      // 4. Customers Store
      if (!db.objectStoreNames.contains('customers')) {
        const custStore = db.createObjectStore('customers', { keyPath: 'id' });
        custStore.createIndex('phone', 'phone', { unique: false });
      }

      // 5. Orders Store
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id' });
      }

      // 6. Notifications Store
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id' });
      }

      // 7. Purchase Invoices Store
      if (!db.objectStoreNames.contains('purchases')) {
        const purStore = db.createObjectStore('purchases', { keyPath: 'id' });
        purStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: false });
        purStore.createIndex('date', 'date', { unique: false });
      }

      // 8. User Accounts Store
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('username', 'username', { unique: false });
      }

      // 9. Settings Store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // 10. Inventory Audits Store
      if (!db.objectStoreNames.contains('inventory_audits')) {
        const auditStore = db.createObjectStore('inventory_audits', { keyPath: 'id' });
        auditStore.createIndex('sessionNumber', 'sessionNumber', { unique: false });
        auditStore.createIndex('date', 'date', { unique: false });
      }

      // 11. Offline Pending Sync Queue Store
      if (!db.objectStoreNames.contains('pending_sync_queue')) {
        const queueStore = db.createObjectStore('pending_sync_queue', { keyPath: 'queueId', autoIncrement: true });
        queueStore.createIndex('collection', 'collection', { unique: false });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 12. General Key-Value Store for app configuration & cache
      if (!db.objectStoreNames.contains('kv_store')) {
        db.createObjectStore('kv_store', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open local database:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Get all records from a specific store
 */
export async function localDbGetAll<T>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result as T[]) || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn(`[LocalDB] localDbGetAll failed for ${storeName}:`, err);
    return [];
  }
}

/**
 * Put or update a single record in a store
 */
export async function localDbPut<T extends { id?: string | number }>(storeName: StoreName, item: T): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[LocalDB] localDbPut failed for ${storeName}:`, err);
  }
}

/**
 * Bulk save items into a store with a single fast transaction
 */
export async function localDbBulkPut<T extends { id?: string | number }>(storeName: StoreName, items: T[]): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      for (const item of items) {
        store.put(item);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[LocalDB] localDbBulkPut failed for ${storeName}:`, err);
  }
}

/**
 * Delete a single record from a store by ID
 */
export async function localDbDelete(storeName: StoreName, id: string | number): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[LocalDB] localDbDelete failed for ${storeName}:`, err);
  }
}

/**
 * Clear all records in a store
 */
export async function localDbClear(storeName: StoreName): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[LocalDB] localDbClear failed for ${storeName}:`, err);
  }
}

/**
 * Save value to Key-Value Store
 */
export async function localDbSetKV<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv_store', 'readwrite');
      const store = tx.objectStore('kv_store');
      store.put({ key, value, updated: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[LocalDB] localDbSetKV failed for ${key}:`, err);
  }
}

/**
 * Get value from Key-Value Store
 */
export async function localDbGetKV<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('kv_store', 'readonly');
      const store = tx.objectStore('kv_store');
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };

      request.onerror = () => {
        resolve(defaultValue);
      };
    });
  } catch {
    return defaultValue;
  }
}

/**
 * Get Storage Analytics & Capacity Diagnostics
 */
export interface StorageDiagnostics {
  indexedDbSupported: boolean;
  estimatedUsageBytes: number;
  estimatedQuotaBytes: number;
  usagePercentage: number;
  counts: Record<StoreName, number>;
  totalRecordsCount: number;
}

export async function getStorageDiagnostics(): Promise<StorageDiagnostics> {
  const counts: Record<string, number> = {};
  let totalRecords = 0;

  try {
    const db = await openLocalDatabase();
    const storeNames: StoreName[] = [
      'products',
      'sales',
      'suppliers',
      'customers',
      'orders',
      'notifications',
      'purchases',
      'users',
      'settings',
      'inventory_audits'
    ];

    await Promise.all(
      storeNames.map((name) => {
        return new Promise<void>((res) => {
          try {
            const tx = db.transaction(name, 'readonly');
            const store = tx.objectStore(name);
            const countReq = store.count();
            countReq.onsuccess = () => {
              counts[name] = countReq.result || 0;
              totalRecords += countReq.result || 0;
              res();
            };
            countReq.onerror = () => {
              counts[name] = 0;
              res();
            };
          } catch {
            counts[name] = 0;
            res();
          }
        });
      })
    );
  } catch {
    // fallback
  }

  let usage = 0;
  let quota = 0;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usage = estimate.usage || 0;
      quota = estimate.quota || 0;
    } catch {
      // ignore
    }
  }

  const usagePercent = quota > 0 ? (usage / quota) * 100 : 0;

  return {
    indexedDbSupported: typeof window !== 'undefined' && !!window.indexedDB,
    estimatedUsageBytes: usage,
    estimatedQuotaBytes: quota,
    usagePercentage: Number(usagePercent.toFixed(2)),
    counts: counts as Record<StoreName, number>,
    totalRecordsCount: totalRecords
  };
}

/**
 * Export full local database to a downloadable JSON backup
 */
export async function exportLocalDatabaseBackup(): Promise<string> {
  const [
    products,
    sales,
    suppliers,
    customers,
    orders,
    notifications,
    purchases,
    users,
    settings,
    inventory_audits
  ] = await Promise.all([
    localDbGetAll('products'),
    localDbGetAll('sales'),
    localDbGetAll('suppliers'),
    localDbGetAll('customers'),
    localDbGetAll('orders'),
    localDbGetAll('notifications'),
    localDbGetAll('purchases'),
    localDbGetAll('users'),
    localDbGetAll('settings'),
    localDbGetAll('inventory_audits')
  ]);

  const backupData = {
    version: DB_VERSION,
    appName: '7AMO Supermarket POS & Warehouse',
    exportedAt: new Date().toISOString(),
    database: {
      products,
      sales,
      suppliers,
      customers,
      orders,
      notifications,
      purchases,
      users,
      settings,
      inventory_audits
    }
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Import and restore local database from a JSON backup file
 */
export async function importLocalDatabaseBackup(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.database) {
      throw new Error('Invalid backup format');
    }

    const dbData = parsed.database;

    if (Array.isArray(dbData.products)) await localDbBulkPut('products', dbData.products);
    if (Array.isArray(dbData.sales)) await localDbBulkPut('sales', dbData.sales);
    if (Array.isArray(dbData.suppliers)) await localDbBulkPut('suppliers', dbData.suppliers);
    if (Array.isArray(dbData.customers)) await localDbBulkPut('customers', dbData.customers);
    if (Array.isArray(dbData.orders)) await localDbBulkPut('orders', dbData.orders);
    if (Array.isArray(dbData.notifications)) await localDbBulkPut('notifications', dbData.notifications);
    if (Array.isArray(dbData.purchases)) await localDbBulkPut('purchases', dbData.purchases);
    if (Array.isArray(dbData.users)) await localDbBulkPut('users', dbData.users);
    if (Array.isArray(dbData.settings)) await localDbBulkPut('settings', dbData.settings);
    if (Array.isArray(dbData.inventory_audits)) await localDbBulkPut('inventory_audits', dbData.inventory_audits);

    return true;
  } catch (err) {
    console.error('Failed to import database backup:', err);
    return false;
  }
}

/**
 * Factory Reset & Wipe All Local Database Tables (IndexedDB + KV Store)
 */
export async function localDbFactoryReset(): Promise<void> {
  const stores: StoreName[] = [
    'products',
    'sales',
    'suppliers',
    'customers',
    'orders',
    'notifications',
    'purchases',
    'users',
    'settings',
    'inventory_audits',
    'pending_sync_queue',
    'kv_store'
  ];

  await Promise.all(stores.map(s => localDbClear(s)));
}
