import { Product, SaleTransaction, Supplier, Customer, MarketOrder, MarketNotification, StoreSettings, PurchaseInvoice, POSKeyboardShortcuts } from '../types';

export const initialProducts: Product[] = [];

export const initialSalesHistory: SaleTransaction[] = [];

export const initialSuppliers: Supplier[] = [];

export const initialCustomers: Customer[] = [];

export const initialOrders: MarketOrder[] = [];

export const initialNotifications: MarketNotification[] = [];

export const initialPurchaseInvoices: PurchaseInvoice[] = [];

export const defaultPOSShortcuts: POSKeyboardShortcuts = {
  newWindow: 'F1',
  openInventory: 'F2',
  toggleReturn: 'F3',
  viewReceipts: 'F4',
  cashPayment: 'F5',
  debtPayment: 'F6',
  cardPayment: 'F7',
  clearCart: 'F8',
  completeSale: 'F9',
  printReceipt: 'F10',
  openCashDrawer: 'F11',
  focusBarcode: 'Space',
  switchNextWindow: 'F6',
  switchPrevWindow: 'F7',
  closeActiveWindow: 'F10',
};

export const defaultSettings: StoreSettings = {
  storeName: '7amo.pos',
  storeNameAr: '7amo.pos',
  storeNameKu: '7amo.pos',
  taxRate: 15, // 15% VAT
  currency: 'IQD',
  currencySymbol: 'د.ع',
  phone: '+964 770 000 0000',
  address: 'العراق - بغداد - شارع فلسطين',
  receiptHeaderMsg: 'أهلاً بكم في المنظومة - شكراً لتسوقكم معنا!',
  receiptFooterMsg: 'البضاعة المباعة ترجع وتستبدل خلال 14 يوماً بشرط الفاتورة.',
  autoPrintReceipt: true,
  lowStockThresholdDefault: 15,
  language: 'ar',
  themeMode: 'dark',
  printerType: 'thermal80mm',
  posShortcuts: defaultPOSShortcuts,
  autoBackupEnabled: true,
  autoBackupFrequency: 'hourly',
  autoBackupDestination: 'both',
  lastAutoBackupTime: '',
  keepBackupHistoryCount: 15,
};
