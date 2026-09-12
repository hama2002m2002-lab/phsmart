import { AutoBackupSnapshot, StoreSettings, Product, SaleTransaction, Supplier, Customer, PurchaseInvoice, UserAccount, MarketOrder, MarketNotification } from '../types';
import { localDbGetKV, localDbSetKV } from './localDb';

const BACKUP_ARCHIVE_KEY = 'pos_auto_backups_archive';
const BACKUP_META_KEY = 'pos_auto_backups_meta_v1';
const MAX_ARCHIVE_SNAPSHOTS = 15;

/**
 * Format timestamp into readable localized Arabic / Kurdish / English string
 */
export function formatBackupDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return isoString;
  }
}

/**
 * Get all existing backup snapshots from IndexedDB and local storage
 */
export async function getStoredBackupSnapshots(): Promise<AutoBackupSnapshot[]> {
  try {
    // Check IndexedDB first (holds the full JSON data without localStorage size limits)
    const archived = await localDbGetKV<AutoBackupSnapshot[]>(BACKUP_ARCHIVE_KEY, []);
    if (Array.isArray(archived) && archived.length > 0) {
      return archived;
    }
  } catch (err) {
    console.warn('[AutoBackup] Error loading from IndexedDB:', err);
  }

  // Fallback to localStorage metadata
  try {
    const local = localStorage.getItem(BACKUP_META_KEY);
    if (local) {
      return JSON.parse(local);
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Helper to gather full system state from storage
 */
export function gatherCurrentStoreState() {
  const getJson = (key: string, defaultVal: any) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  const products = getJson('supermarket_products_v1', []);
  const salesHistory = getJson('supermarket_sales_v1', []);
  const suppliers = getJson('supermarket_suppliers_v1', []);
  const customers = getJson('supermarket_customers_v1', []);
  const purchaseInvoices = getJson('supermarket_purchases_v1', []);
  const userAccounts = getJson('supermarket_user_accounts_v3', getJson('supermarket_user_accounts_v1', []));
  const orders = getJson('supermarket_orders_v1', []);
  const notifications = getJson('supermarket_notifications_v1', []);
  const damagedLogs = getJson('pos_damaged_items_logs', []);
  const delegateReturns = getJson('pos_delegate_returns_logs', []);
  const operatingExpenses = getJson('pos_custom_operating_expenses', []);
  const customExpenseTypes = getJson('pos_custom_expense_types', []);
  const cashAdjustments = getJson('pos_cash_adjustments', []);
  const inventoryAudits = getJson('pos_inventory_audits_v1', []);
  const settings = getJson('supermarket_settings_v3', getJson('supermarket_settings_v1', {}));

  return {
    products,
    salesHistory,
    suppliers,
    customers,
    purchaseInvoices,
    userAccounts,
    orders,
    notifications,
    damagedLogs,
    delegateReturns,
    operatingExpenses,
    customExpenseTypes,
    cashAdjustments,
    inventoryAudits,
    settings,
    exportedAt: new Date().toISOString(),
    appName: '7amo.pos'
  };
}

/**
 * Creates a complete snapshot of all store data, archives it in IndexedDB,
 * and optionally triggers a download
 */
export async function createFullSystemBackup(
  triggerType: 'hourly' | 'daily' | 'manual',
  downloadFile = false
): Promise<AutoBackupSnapshot> {
  const fullData = gatherCurrentStoreState();
  const jsonString = JSON.stringify(fullData, null, 2);
  const now = new Date();
  const timestamp = now.toISOString();
  const sizeBytes = new Blob([jsonString]).size;

  const snapshot: AutoBackupSnapshot = {
    id: `backup_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    formattedDate: formatBackupDateTime(timestamp),
    triggerType,
    itemsCount: {
      products: Array.isArray(fullData.products) ? fullData.products.length : 0,
      sales: Array.isArray(fullData.salesHistory) ? fullData.salesHistory.length : 0,
      purchases: Array.isArray(fullData.purchaseInvoices) ? fullData.purchaseInvoices.length : 0,
      customers: Array.isArray(fullData.customers) ? fullData.customers.length : 0,
      suppliers: Array.isArray(fullData.suppliers) ? fullData.suppliers.length : 0,
      invoices: Array.isArray(fullData.purchaseInvoices) ? fullData.purchaseInvoices.length : 0,
      audits: Array.isArray(fullData.inventoryAudits) ? fullData.inventoryAudits.length : 0,
    },
    totalRecords:
      (fullData.products?.length || 0) +
      (fullData.salesHistory?.length || 0) +
      (fullData.purchaseInvoices?.length || 0) +
      (fullData.customers?.length || 0) +
      (fullData.suppliers?.length || 0),
    sizeBytes,
    dataJson: jsonString
  };

  // 1. Save in IndexedDB (holds full payload)
  const existingSnapshots = await getStoredBackupSnapshots();
  const updatedSnapshots = [snapshot, ...existingSnapshots].slice(0, MAX_ARCHIVE_SNAPSHOTS);

  await localDbSetKV(BACKUP_ARCHIVE_KEY, updatedSnapshots);

  // 2. Save lightweight metadata list in localStorage (omitting heavy dataJson) for rapid display
  try {
    const metaList = updatedSnapshots.map(s => ({
      ...s,
      dataJson: undefined // strip heavy JSON from localStorage
    }));
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify(metaList));
  } catch {
    // ignore quota
  }

  // 3. If file download requested or configured
  if (downloadFile && typeof window !== 'undefined') {
    try {
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      a.href = url;
      a.download = `7amo_pos_${triggerType}_backup_${dateStr}_${timeStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.warn('[AutoBackup] Error downloading backup file:', err);
    }
  }

  // 4. Update last auto backup timestamp in settings
  try {
    const currentSettings = JSON.parse(localStorage.getItem('supermarket_settings_v3') || '{}');
    currentSettings.lastAutoBackupTime = timestamp;
    localStorage.setItem('supermarket_settings_v3', JSON.stringify(currentSettings));
  } catch {
    // ignore
  }

  // 5. Notify UI components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pos_backup_created', {
        detail: {
          snapshot,
          triggerType,
          totalRecords: snapshot.totalRecords,
          downloaded: downloadFile
        }
      })
    );
  }

  return snapshot;
}

/**
 * Restores all system data from a specific snapshot ID
 */
export async function restoreBackupSnapshot(
  snapshotId: string,
  onApplyData?: (fullData: any) => void
): Promise<{ success: boolean; message: string }> {
  try {
    const snapshots = await getStoredBackupSnapshots();
    const target = snapshots.find(s => s.id === snapshotId);
    if (!target) {
      return { success: false, message: 'النسخة المطلوبة غير موجودة في الأرشيف' };
    }

    let rawJson = target.dataJson;
    if (!rawJson) {
      // Reload full from IndexedDB
      const fullList = await localDbGetKV<AutoBackupSnapshot[]>(BACKUP_ARCHIVE_KEY, []);
      const found = fullList.find(s => s.id === snapshotId);
      rawJson = found?.dataJson;
    }

    if (!rawJson) {
      return { success: false, message: 'بيانات النسخة الاحتياطية فارغة أو غير مقروءة' };
    }

    const data = JSON.parse(rawJson);

    // Apply into local storage collections
    if (Array.isArray(data.products)) localStorage.setItem('supermarket_products_v1', JSON.stringify(data.products));
    if (Array.isArray(data.salesHistory)) localStorage.setItem('supermarket_sales_v1', JSON.stringify(data.salesHistory));
    if (Array.isArray(data.suppliers)) localStorage.setItem('supermarket_suppliers_v1', JSON.stringify(data.suppliers));
    if (Array.isArray(data.customers)) localStorage.setItem('supermarket_customers_v1', JSON.stringify(data.customers));
    if (Array.isArray(data.purchaseInvoices)) localStorage.setItem('supermarket_purchases_v1', JSON.stringify(data.purchaseInvoices));
    if (Array.isArray(data.orders)) localStorage.setItem('supermarket_orders_v1', JSON.stringify(data.orders));
    if (Array.isArray(data.notifications)) localStorage.setItem('supermarket_notifications_v1', JSON.stringify(data.notifications));
    if (Array.isArray(data.userAccounts)) localStorage.setItem('supermarket_user_accounts_v3', JSON.stringify(data.userAccounts));
    if (Array.isArray(data.damagedLogs)) localStorage.setItem('pos_damaged_items_logs', JSON.stringify(data.damagedLogs));
    if (Array.isArray(data.delegateReturns)) localStorage.setItem('pos_delegate_returns_logs', JSON.stringify(data.delegateReturns));
    if (Array.isArray(data.operatingExpenses)) localStorage.setItem('pos_custom_operating_expenses', JSON.stringify(data.operatingExpenses));
    if (Array.isArray(data.customExpenseTypes)) localStorage.setItem('pos_custom_expense_types', JSON.stringify(data.customExpenseTypes));
    if (Array.isArray(data.cashAdjustments)) localStorage.setItem('pos_cash_adjustments', JSON.stringify(data.cashAdjustments));
    if (Array.isArray(data.inventoryAudits)) localStorage.setItem('pos_inventory_audits_v1', JSON.stringify(data.inventoryAudits));

    if (onApplyData) {
      onApplyData(data);
    }

    return {
      success: true,
      message: `تمت استعادة النسخة بنجاح (${target.itemsCount.products} مادة، ${target.itemsCount.sales} عملية بيع)!`
    };
  } catch (err: any) {
    console.error('Error restoring snapshot:', err);
    return { success: false, message: err.message || 'حدث خطأ أثناء استعادة النسخة' };
  }
}

/**
 * Trigger download of an archived snapshot
 */
export async function downloadBackupSnapshot(snapshotId: string): Promise<boolean> {
  try {
    const snapshots = await getStoredBackupSnapshots();
    const target = snapshots.find(s => s.id === snapshotId);
    if (!target) return false;

    let rawJson = target.dataJson;
    if (!rawJson) {
      const fullList = await localDbGetKV<AutoBackupSnapshot[]>(BACKUP_ARCHIVE_KEY, []);
      rawJson = fullList.find(s => s.id === snapshotId)?.dataJson;
    }
    if (!rawJson) return false;

    const blob = new Blob([rawJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `7amo_pos_archived_backup_${target.formattedDate.replace(/[: ]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a snapshot from archive
 */
export async function deleteBackupSnapshot(snapshotId: string): Promise<boolean> {
  try {
    const snapshots = await getStoredBackupSnapshots();
    const filtered = snapshots.filter(s => s.id !== snapshotId);
    await localDbSetKV(BACKUP_ARCHIVE_KEY, filtered);

    try {
      const metaList = filtered.map(s => ({ ...s, dataJson: undefined }));
      localStorage.setItem(BACKUP_META_KEY, JSON.stringify(metaList));
    } catch {
      // ignore
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all archived snapshots
 */
export async function clearAllBackupSnapshots(): Promise<boolean> {
  try {
    await localDbSetKV(BACKUP_ARCHIVE_KEY, []);
    localStorage.removeItem(BACKUP_META_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Determines whether an auto-backup is currently due based on schedule
 */
export function shouldRunAutoBackup(settings: StoreSettings): boolean {
  if (settings.autoBackupEnabled === false) return false;
  if (settings.autoBackupFrequency === 'disabled') return false;

  const frequency = settings.autoBackupFrequency || 'hourly';
  const intervalMs = frequency === 'hourly' 
    ? 60 * 60 * 1000       // 1 hour
    : 24 * 60 * 60 * 1000;  // 24 hours (daily)

  const lastTimeStr = settings.lastAutoBackupTime;
  if (!lastTimeStr) {
    // Never run before -> Run now to establish baseline snapshot
    return true;
  }

  const lastTime = new Date(lastTimeStr).getTime();
  if (isNaN(lastTime)) return true;

  const now = Date.now();
  return now - lastTime >= intervalMs;
}

/**
 * Computes human-friendly time remaining until next automated backup
 */
export function getTimeRemainingUntilNextBackup(
  settings: StoreSettings,
  lang: 'ar' | 'ku' | 'en' = 'ar'
): { text: string; percentProgress: number } {
  if (!settings.autoBackupEnabled || settings.autoBackupFrequency === 'disabled') {
    return {
      text: lang === 'ku' ? 'ناچالاکە' : lang === 'ar' ? 'النسخ التلقائي معطل' : 'Auto-backup disabled',
      percentProgress: 0
    };
  }

  const frequency = settings.autoBackupFrequency || 'hourly';
  const totalMs = frequency === 'hourly' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const lastTimeStr = settings.lastAutoBackupTime;

  if (!lastTimeStr) {
    return {
      text: lang === 'ku' ? 'ئامادەیە بۆ ئەنجامدان' : lang === 'ar' ? 'جاهز للتنفيذ الآن' : 'Ready to execute now',
      percentProgress: 100
    };
  }

  const lastTime = new Date(lastTimeStr).getTime();
  if (isNaN(lastTime)) {
    return {
      text: lang === 'ku' ? 'ئامادەیە بۆ ئەنجامدان' : lang === 'ar' ? 'جاهز للتنفيذ' : 'Ready',
      percentProgress: 100
    };
  }

  const elapsed = Date.now() - lastTime;
  const remaining = Math.max(0, totalMs - elapsed);
  const percent = Math.min(100, Math.max(0, Math.round((elapsed / totalMs) * 100)));

  if (remaining <= 0) {
    return {
      text: lang === 'ku' ? 'ئێستا ئەنجام دەدرێت...' : lang === 'ar' ? 'جاري التنفيذ في الخلفية...' : 'Executing now...',
      percentProgress: 100
    };
  }

  const minutes = Math.floor(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  let text = '';
  if (hours > 0) {
    text = lang === 'ku'
      ? `دوای ${hours} کاتژمێر و ${remMinutes} خولەک`
      : lang === 'ar'
      ? `خلال ${hours} ساعة و ${remMinutes} دقيقة`
      : `In ${hours}h ${remMinutes}m`;
  } else {
    text = lang === 'ku'
      ? `دوای ${minutes} خولەک`
      : lang === 'ar'
      ? `خلال ${minutes} دقيقة`
      : `In ${minutes} minutes`;
  }

  return { text, percentProgress: percent };
}
