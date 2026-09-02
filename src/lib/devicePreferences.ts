import { StoreSettings, Language, POSKeyboardShortcuts } from '../types';
import { defaultPOSShortcuts } from '../data/mockData';

export interface DeviceLocalPreferences {
  themeMode: 'dark' | 'light';
  language: Language;
  printerType: 'thermal80mm' | 'thermal58mm' | 'network' | 'browser' | 'a4' | 'a5' | 'label_barcode';
  connectedPrinterName?: string;
  printerIpAddress?: string;
  paperSize?: '80mm' | '58mm' | 'A4' | 'A5' | '50x30mm' | '40x20mm' | 'a4';
  autoPrintReceipt?: boolean;
  posShortcuts?: POSKeyboardShortcuts;
  isCloudSyncEnabled?: boolean; // When false, this device operates completely standalone (100% offline & isolated)
}

const STORAGE_KEY = 'pos_device_local_preferences_v1';

export const defaultDevicePreferences: DeviceLocalPreferences = {
  themeMode: 'dark',
  language: 'ar',
  printerType: 'thermal80mm',
  connectedPrinterName: '',
  printerIpAddress: '',
  paperSize: '80mm',
  autoPrintReceipt: true,
  posShortcuts: defaultPOSShortcuts,
  isCloudSyncEnabled: false, // Isolated & private by default so other laptops cannot see or interfere with each other
};

/**
 * Retrieves the local device preferences (Theme, Language, Printer config)
 * ensuring each laptop or phone runs with its own isolated display and hardware configuration.
 */
export function getDeviceLocalPreferences(): DeviceLocalPreferences {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      return {
        ...defaultDevicePreferences,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('Could not read local device preferences:', err);
  }
  return defaultDevicePreferences;
}

/**
 * Saves device-isolated preferences to localStorage on this machine only.
 */
export function saveDeviceLocalPreferences(prefs: Partial<DeviceLocalPreferences>): DeviceLocalPreferences {
  try {
    const current = getDeviceLocalPreferences();
    const updated = {
      ...current,
      ...prefs,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Could not save local device preferences:', err);
    return { ...defaultDevicePreferences, ...prefs };
  }
}

/**
 * Merge store settings with device-isolated local preferences
 * so changes on another device (like theme switch, language switch, or printer setup)
 * NEVER alter or disrupt this device's interface.
 */
export function mergeWithDevicePreferences(
  settings: Partial<StoreSettings> | null | undefined,
  localPrefs?: DeviceLocalPreferences
): StoreSettings {
  const devicePrefs = localPrefs || getDeviceLocalPreferences();
  
  return {
    storeName: settings?.storeName || '7amo.pos',
    storeNameAr: settings?.storeNameAr || '7amo.pos',
    storeNameKu: settings?.storeNameKu || '7amo.pos',
    taxRate: settings?.taxRate ?? 15,
    currency: settings?.currency || 'IQD',
    currencySymbol: settings?.currencySymbol || 'د.ع',
    phone: settings?.phone || '+964 770 000 0000',
    address: settings?.address || 'العراق - بغداد - شارع فلسطين',
    receiptHeaderMsg: settings?.receiptHeaderMsg || 'أهلاً بكم في المنظومة - شكراً لتسوقكم معنا!',
    receiptFooterMsg: settings?.receiptFooterMsg || 'البضاعة المباعة ترجع وتستبدل خلال 14 يوماً بشرط الفاتورة.',
    lowStockThresholdDefault: settings?.lowStockThresholdDefault ?? 15,
    
    // STRICTLY DEVICE-LOCAL (never synced across different laptops)
    themeMode: devicePrefs.themeMode,
    language: devicePrefs.language,
    printerType: devicePrefs.printerType,
    connectedPrinterName: devicePrefs.connectedPrinterName,
    printerIpAddress: devicePrefs.printerIpAddress,
    paperSize: devicePrefs.paperSize,
    autoPrintReceipt: devicePrefs.autoPrintReceipt,
    posShortcuts: devicePrefs.posShortcuts || defaultPOSShortcuts,
  };
}

/**
 * Strips device-specific preferences before writing to shared cloud database.
 * Only shared store attributes (names, tax, phone, address, invoices header/footer) are synced.
 */
export function getSharedStoreSettingsForCloud(settings: StoreSettings): Partial<StoreSettings> {
  return {
    storeName: settings.storeName,
    storeNameAr: settings.storeNameAr,
    storeNameKu: settings.storeNameKu,
    taxRate: settings.taxRate,
    currency: settings.currency,
    currencySymbol: settings.currencySymbol,
    phone: settings.phone,
    address: settings.address,
    receiptHeaderMsg: settings.receiptHeaderMsg,
    receiptFooterMsg: settings.receiptFooterMsg,
    lowStockThresholdDefault: settings.lowStockThresholdDefault,
  };
}
