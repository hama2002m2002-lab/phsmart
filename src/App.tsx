import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, ShoppingCart, Package, FileText, Menu, BarChart3, UserCheck } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar, MainNavTab } from './components/Sidebar';
import { OverviewTab } from './components/OverviewTab';
import { InvoicesTab } from './components/InvoicesTab';
import { ProductsTab } from './components/ProductsTab';
import { PurchasesTab } from './components/PurchasesTab';
import { POSTab } from './components/POSTab';
import { VouchersHubTab } from './components/VouchersHubTab';
import { SuppliersTab } from './components/SuppliersTab';
import { CustomersTab } from './components/CustomersTab';
import { OrdersTab } from './components/OrdersTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { ReportsTab } from './components/ReportsTab';
import { NotificationsTab } from './components/NotificationsTab';
import { SettingsTab } from './components/SettingsTab';
import { PrintCenterTab } from './components/PrintCenterTab';
import { AccountsHubTab } from './components/AccountsHubTab';
import { LoginScreen } from './components/LoginScreen';
import { ReceiptModal } from './components/ReceiptModal';
import { ProductModal } from './components/ProductModal';
import { CompletedReceiptsModal } from './components/CompletedReceiptsModal';
import { SalesReturnModal } from './components/SalesReturnModal';
import { CashDrawerModal } from './components/CashDrawerModal';
import { ShiftReportModal } from './components/ShiftReportModal';
import { MobileSyncModal } from './components/MobileSyncModal';
import { BarcodePrintModal } from './components/BarcodePrintModal';
import { InventoryAuditModal } from './components/InventoryAuditModal';
import { formatNumber } from './lib/formatUtils';
import { DamagedItemsModal } from './components/DamagedItemsModal';
import { DelegateReturnsModal } from './components/DelegateReturnsModal';
import { AccountModal } from './components/AccountModal';
import { DesktopAppModal } from './components/DesktopAppModal';
import { CSharpExporterModal } from './components/CSharpExporterModal';
import { CashierAccountsModal } from './components/CashierAccountsModal';
import { bitmojiToDataUri, defaultBitmojiPresets } from './components/BitmojiAvatarSelector';
import { CustomerDisplayScreen } from './components/CustomerDisplayScreen';
import { openCustomerDisplayWindow } from './lib/customerDisplayBroadcast';
import { AIInvoiceScannerModal } from './components/AIInvoiceScannerModal';
import { AILegacySystemMigratorModal } from './components/AILegacySystemMigratorModal';
import { findBestFuzzyProductMatch } from './lib/fuzzyMatching';

import {
  initialProducts,
  initialSalesHistory,
  initialSuppliers,
  initialCustomers,
  initialOrders,
  initialNotifications,
  initialPurchaseInvoices,
  defaultSettings
} from './data/mockData';

import { Product, SaleTransaction, Supplier, Customer, MarketOrder, MarketNotification, StoreSettings, UserAccount, PurchaseInvoice } from './types';
import { 
  getDeviceLocalPreferences,
  saveDeviceLocalPreferences,
  mergeWithDevicePreferences,
  getSharedStoreSettingsForCloud
} from './lib/devicePreferences';
import { 
  syncWriteDocument, 
  syncDeleteDocument, 
  syncBulkWriteCollection 
} from './lib/firestoreSync';
import {
  localDbBulkPut,
  localDbSetKV,
  localDbGetKV,
  localDbGetAll,
  localDbFactoryReset
} from './lib/localDb';

// Optimized Dual-layer High-Capacity persistent state hook (LocalStorage + Unlimited IndexedDB)
function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn(`Failed to parse localStorage key "${key}":`, err);
    }
    return initialValue;
  });

  const isFirstRender = useRef(true);

  // Non-blocking async IndexedDB hydration check (for large data exceeding 5MB)
  useEffect(() => {
    const handle = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (window as any).requestIdleCallback(() => {
          localDbGetKV<T>(key, initialValue).then((val) => {
            if (val !== undefined && val !== null) {
              if (Array.isArray(val) && val.length > 0) {
                setState((prev) => {
                  if (Array.isArray(prev) && prev.length === 0) return val;
                  return prev;
                });
              }
            }
          }).catch(() => {});
        }, { timeout: 2000 })
      : setTimeout(() => {
          localDbGetKV<T>(key, initialValue).then((val) => {
            if (val !== undefined && val !== null) {
              if (Array.isArray(val) && val.length > 0) {
                setState((prev) => {
                  if (Array.isArray(prev) && prev.length === 0) return val;
                  return prev;
                });
              }
            }
          }).catch(() => {});
        }, 100);

    return () => {
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && typeof handle === 'number') {
        (window as any).cancelIdleCallback(handle);
      } else {
        clearTimeout(handle);
      }
    };
  }, [key]);

  // Persist mutative updates without blocking initial mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    try {
      if (state === undefined) {
        localStorage.removeItem(key);
      } else {
        try {
          localStorage.setItem(key, JSON.stringify(state));
        } catch {
          // If localStorage quota (5MB) is exceeded, silently rely on IndexedDB
        }
        // Save in IndexedDB in background
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => localDbSetKV(key, state), { timeout: 1000 });
        } else {
          setTimeout(() => localDbSetKV(key, state), 50);
        }
      }
    } catch (err) {
      console.warn(`Failed to save key "${key}":`, err);
    }
  }, [key, state]);

  return [state, setState];
}

const initialUserAccounts: UserAccount[] = [
  {
    id: 'user-admin-1',
    fullName: 'المدير العام (Admin)',
    email: 'admin@market.com',
    username: 'admin',
    password: '123',
    role: 'Admin',
    active: true,
    createdAt: '2026-01-01',
    avatar: bitmojiToDataUri(defaultBitmojiPresets[0].config),
    permissions: {
      canAccessPOS: true,
      canManageProducts: true,
      canViewReports: true,
      canManageSuppliers: true,
      canManageCustomers: true,
      canManageOrders: true,
      canManageSettings: true,
    }
  }
];

export function App() {
  // Session-based user authentication: Closing and reopening the program prompts for the login PIN
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      // Clear old legacy persistent user tokens
      localStorage.removeItem('supermarket_current_user_v1');
      localStorage.removeItem('supermarket_current_user');

      const activeSession = sessionStorage.getItem('pos_session_active_user_v1');
      if (activeSession) {
        return JSON.parse(activeSession);
      }
    } catch {
      // ignore
    }
    return null; // Always require login on fresh launch / window reopen
  });

  // Sync active user to sessionStorage
  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem('pos_session_active_user_v1', JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem('pos_session_active_user_v1');
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  const [userAccounts, setUserAccounts] = usePersistentState<UserAccount[]>('supermarket_user_accounts_v3', initialUserAccounts);

  // Ensure legacy fake accounts (like user-cashier-2002) are removed
  useEffect(() => {
    if (userAccounts.some(u => u.id === 'user-cashier-2002')) {
      const cleaned = userAccounts.filter(u => u.id !== 'user-cashier-2002');
      setUserAccounts(cleaned.length > 0 ? cleaned : initialUserAccounts);
    }
  }, []);

  const [products, setProducts] = usePersistentState<Product[]>('supermarket_products_v1', initialProducts);
  const [salesHistory, setSalesHistory] = usePersistentState<SaleTransaction[]>('supermarket_sales_v1', initialSalesHistory);
  const [suppliers, setSuppliers] = usePersistentState<Supplier[]>('supermarket_suppliers_v1', initialSuppliers);
  const [customers, setCustomers] = usePersistentState<Customer[]>('supermarket_customers_v1', initialCustomers);
  const [orders, setOrders] = usePersistentState<MarketOrder[]>('supermarket_orders_v1', initialOrders);
  const [notifications, setNotifications] = usePersistentState<MarketNotification[]>('supermarket_notifications_v1', initialNotifications);
  const [purchaseInvoices, setPurchaseInvoices] = usePersistentState<PurchaseInvoice[]>('supermarket_purchases_v1', initialPurchaseInvoices);
  const [settings, setSettingsState] = usePersistentState<StoreSettings>(
    'supermarket_settings_v3',
    mergeWithDevicePreferences(defaultSettings, getDeviceLocalPreferences())
  );

  const setSettings: React.Dispatch<React.SetStateAction<StoreSettings>> = (action) => {
    setSettingsState((prev) => {
      const nextSettings = typeof action === 'function' ? action(prev) : action;
      
      // Save device-specific preferences locally on THIS laptop/device only
      saveDeviceLocalPreferences({
        themeMode: nextSettings.themeMode,
        language: nextSettings.language,
        printerType: nextSettings.printerType,
        connectedPrinterName: nextSettings.connectedPrinterName,
        printerIpAddress: nextSettings.printerIpAddress,
        paperSize: nextSettings.paperSize,
        autoPrintReceipt: nextSettings.autoPrintReceipt,
        posShortcuts: nextSettings.posShortcuts,
      });

      // Write ONLY shared store parameters to cloud database so other laptops' theme/language remain untouched
      const sharedStoreData = getSharedStoreSettingsForCloud(nextSettings);
      syncWriteDocument('settings', 'store', sharedStoreData);

      return nextSettings;
    });
  };

  // Persist activeTab & activeTopTab so any update maintains the exact view the user is on
  const [activeTab, setActiveTab] = usePersistentState<MainNavTab>('supermarket_active_tab_v1', 'dashboard');
  const [activeTopTab, setActiveTopTab] = usePersistentState<'overview' | 'analytics' | 'reports' | 'notifications'>('supermarket_active_top_tab_v1', 'overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<SaleTransaction | null>(null);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [initialSupplierForNewProduct, setInitialSupplierForNewProduct] = useState<string>('');
  const [showPOSInventory, setShowPOSInventory] = useState(false);

  const [isCompletedReceiptsOpen, setIsCompletedReceiptsOpen] = useState(false);
  const [isSalesReturnOpen, setIsSalesReturnOpen] = useState(false);
  const [salesReturnPreInvoiceNo, setSalesReturnPreInvoiceNo] = useState<string | null>(null);
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);
  const [isShiftReportOpen, setIsShiftReportOpen] = useState(false);
  const [isMobileSyncOpen, setIsMobileSyncOpen] = useState(false);
  const [isBarcodePrintOpen, setIsBarcodePrintOpen] = useState(false);
  const [productForBarcodePrint, setProductForBarcodePrint] = useState<Product | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDesktopAppModalOpen, setIsDesktopAppModalOpen] = useState(false);
  const [isCSharpModalOpen, setIsCSharpModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isYellowLineModalOpen, setIsYellowLineModalOpen] = useState(false);
  const [isReportsFullscreen, setIsReportsFullscreen] = useState(false);
  const [isInventoryAuditOpen, setIsInventoryAuditOpen] = useState(false);
  const [isAIInvoiceScannerOpen, setIsAIInvoiceScannerOpen] = useState(false);
  const [isLegacyMigratorOpen, setIsLegacyMigratorOpen] = useState(false);
  const [aiDraftImportData, setAiDraftImportData] = useState<any | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const isRTL = settings.language === 'ar' || settings.language === 'ku';
  const isAr = settings.language === 'ar';
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  // Apply theme class to document element and body
  useEffect(() => {
    const theme = settings.themeMode || 'dark';
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    }
  }, [settings.themeMode]);

  const [isFirebaseSynced, setIsFirebaseSynced] = useState(true);

  // Local standalone initialization
  useEffect(() => {
    setIsFirebaseSynced(true);
  }, []);

  // Helper to check if current user has permission for activeTab
  const userHasPermissionForTab = (tabId: MainNavTab, user: UserAccount | null): boolean => {
    if (!user || user.role === 'Admin') return true;
    const perms = user.permissions;
    if (!perms) return true;

    switch (tabId) {
      case 'dashboard': return perms.canAccessDashboard !== false;
      case 'vouchers': return perms.canAccessPOS || (perms.canManagePurchases ?? perms.canManageProducts) || perms.canManageProducts;
      case 'pos': return perms.canAccessPOS;
      case 'products': return perms.canManageProducts;
      case 'inventoryAudit': return perms.canManageInventoryAudit ?? perms.canManageProducts;
      case 'damagedItems': return perms.canManageProducts;
      case 'delegateReturns': return perms.canManageProducts || perms.canManageSuppliers;
      case 'purchases': return perms.canManagePurchases ?? perms.canManageProducts;
      case 'suppliers': return perms.canManageSuppliers;
      case 'customers': return perms.canManageCustomers;
      case 'orders': return perms.canManageOrders;
      case 'invoices': return perms.canViewInvoices ?? perms.canManageOrders;
      case 'analytics': return perms.canViewAnalytics ?? perms.canViewReports;
      case 'reports': return perms.canViewReports;
      case 'cashierAccounts': return perms.canViewReports;
      case 'settings': return perms.canManageSettings;
      default: return true;
    }
  };

  const getExitTabForUser = (user: UserAccount | null): MainNavTab => {
    if (!user || user.role === 'Admin') return 'dashboard';
    
    const candidateTabs: MainNavTab[] = [
      'dashboard',
      'vouchers',
      'customers',
      'invoices',
      'orders',
      'products',
      'purchases',
      'suppliers',
      'reports',
      'analytics',
      'inventoryAudit',
      'settings',
    ];
    
    const allowed = candidateTabs.find(t => userHasPermissionForTab(t, user));
    return allowed || 'vouchers';
  };

  // Automatically switch activeTab if logged in user does not have permission for the current activeTab
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'Admin') return;

    if (!userHasPermissionForTab(activeTab, currentUser)) {
      const fallbackOrder: MainNavTab[] = [
        'dashboard',
        'vouchers',
        'customers',
        'invoices',
        'orders',
        'products',
        'purchases',
        'suppliers',
        'reports',
        'analytics',
        'inventoryAudit',
        'settings',
        'pos'
      ];
      const firstAllowed = fallbackOrder.find(t => userHasPermissionForTab(t, currentUser));
      if (firstAllowed) {
        setActiveTab(firstAllowed);
      }
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (activeTab === 'cashierAccounts') {
      setIsReportsFullscreen(true);
    } else if (activeTab !== 'reports') {
      setIsReportsFullscreen(false);
    }
  }, [activeTab]);

  const handleSaleCompleted = (newSale: SaleTransaction) => {
    setSalesHistory(prev => [newSale, ...prev]);
    syncWriteDocument('sales', newSale.id, newSale);

    const isRefund = newSale.status === 'refunded';

    // Sync sold or returned product stocks to Firestore immediately taking carton units into account
    newSale.items.forEach(item => {
      const updatedProd = products.find(p => p.id === item.productId);
      if (updatedProd) {
        let unitsMultiplier = 1;
        if (item.saleType === 'carton') {
          unitsMultiplier = (updatedProd.unitsPerCarton && updatedProd.unitsPerCarton > 0) ? updatedProd.unitsPerCarton : 1;
        }
        const totalUnitsChange = item.quantity * unitsMultiplier;
        const newStock = isRefund 
          ? (updatedProd.stock + totalUnitsChange) 
          : (updatedProd.stock - totalUnitsChange);
        const prodData = { ...updatedProd, stock: newStock, totalUnits: newStock };
        syncWriteDocument('products', item.productId, prodData);
      }
    });
    
    // Create new sales notification
    const newNotif: MarketNotification = {
      id: `notif-${Date.now()}`,
      title: 'New Sale Completed!',
      titleAr: 'تمت عملية بيع جديدة!',
      message: `Invoice ${newSale.invoiceNumber} processed for $${formatNumber(newSale.total)}.`,
      messageAr: `تم إصدار الفاتورة ${newSale.invoiceNumber} بقيمة $${formatNumber(newSale.total)}.`,
      time: 'Just now',
      priority: 'low',
      category: 'sales',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    syncWriteDocument('notifications', newNotif.id, newNotif);
  };

  const handleOpenAddProduct = () => {
    console.log('[App:productToEdit] handleOpenAddProduct -> setProductToEdit(null), open modal');
    setProductToEdit(null);
    setInitialSupplierForNewProduct('');
    setIsProductModalOpen(true);
  };

  const handleOpenAddProductForSupplier = (supplierName: string) => {
    console.log('[App:productToEdit] handleOpenAddProductForSupplier -> supplier:', supplierName);
    setProductToEdit(null);
    setInitialSupplierForNewProduct(supplierName);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (prod: Product) => {
    console.log('[App:productToEdit] handleEditProduct -> editing product ID:', prod.id, prod.nameAr || prod.name);
    setProductToEdit(prod);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (prod: Product) => {
    console.log('[App:productToEdit] handleSaveProduct -> saving product:', prod.id, prod.nameAr || prod.name);
    setProducts(prev => {
      const exists = prev.some(p => p.id === prod.id);
      if (exists) {
        return prev.map(p => p.id === prod.id ? prod : p);
      }
      return [prod, ...prev];
    });
    syncWriteDocument('products', prod.id, prod);
  };

  const handleDeleteProduct = (prodId: string) => {
    setProducts(prev => prev.filter(p => p.id !== prodId));
    syncDeleteDocument('products', prodId);
  };

  const handleConfirmAIInvoiceImport = (data: {
    newProducts: Product[];
    updatedProducts: Product[];
    targetSupplier?: Supplier;
    newSupplier?: Supplier;
    newPurchaseInvoice?: PurchaseInvoice;
  }) => {
    // 1. Update & Add products in local state, localStorage, IndexedDB and Firestore
    setProducts(prev => {
      let updatedList = [...prev];
      // Update existing products with new stock, prices, expiries
      data.updatedProducts.forEach(up => {
        const idx = updatedList.findIndex(p => p.id === up.id);
        if (idx !== -1) {
          updatedList[idx] = up;
        }
      });
      // Prepend brand new products, but protect against subtle spelling duplicates using Fuzzy Matching
      if (data.newProducts.length > 0) {
        data.newProducts.forEach(newP => {
          const fuzzyResult = findBestFuzzyProductMatch(newP.name, updatedList, {
            barcode: newP.barcode,
            threshold: 0.82
          });
          if (fuzzyResult.matchedProduct) {
            const matchIdx = updatedList.findIndex(p => p.id === fuzzyResult.matchedProduct!.id);
            if (matchIdx !== -1) {
              // Merge into existing item to avoid duplicate!
              updatedList[matchIdx] = {
                ...updatedList[matchIdx],
                stock: (updatedList[matchIdx].stock || 0) + (newP.stock || 0),
                totalUnits: (updatedList[matchIdx].totalUnits || 0) + (newP.totalUnits || 0),
                costPerUnit: newP.costPerUnit || updatedList[matchIdx].costPerUnit,
                lastPurchasePrice: newP.lastPurchasePrice || updatedList[matchIdx].lastPurchasePrice,
                lastPriceUpdate: new Date().toISOString(),
                expiryDate: newP.expiryDate || updatedList[matchIdx].expiryDate,
                status: ((updatedList[matchIdx].stock || 0) + (newP.stock || 0)) > 0 ? 'in_stock' : 'out_of_stock'
              };
              return;
            }
          }
          updatedList.unshift(newP);
        });
      }
      try { localStorage.setItem('supermarket_products_v1', JSON.stringify(updatedList)); } catch {}
      localDbBulkPut('products', updatedList);
      syncBulkWriteCollection('products', updatedList);
      return updatedList;
    });

    // 2. Add or update supplier & delegate account
    if (data.newPurchaseInvoice || data.targetSupplier || data.newSupplier) {
      setSuppliers(prev => {
        const supName = (data.targetSupplier?.nameAr || data.targetSupplier?.name || data.newSupplier?.nameAr || data.newSupplier?.name || data.newPurchaseInvoice?.supplierName || '').trim();
        const supPhone = (data.targetSupplier?.phone || data.newSupplier?.phone || data.newPurchaseInvoice?.supplierPhone || '').trim();
        const invoiceTotal = data.newPurchaseInvoice?.totalInvoiceAmount || data.newSupplier?.totalInvoiced || data.targetSupplier?.totalInvoiced || 0;
        const remainingAmount = data.newPurchaseInvoice?.remainingAmount !== undefined ? data.newPurchaseInvoice.remainingAmount : invoiceTotal;
        const invoiceDate = data.newPurchaseInvoice?.date || new Date().toISOString().split('T')[0];

        const existingIdx = prev.findIndex(s => 
          (data.targetSupplier && s.id === data.targetSupplier.id) ||
          (data.newSupplier && s.id === data.newSupplier.id) ||
          (supName && (s.name.toLowerCase() === supName.toLowerCase() || (s.nameAr && s.nameAr.toLowerCase() === supName.toLowerCase()))) ||
          (supPhone && s.phone && s.phone === supPhone)
        );

        let nextSuppliers: Supplier[];
        if (existingIdx !== -1) {
          nextSuppliers = prev.map((s, idx) => {
            if (idx !== existingIdx) return s;
            return {
              ...s,
              balanceDue: (s.balanceDue || 0) + remainingAmount,
              totalInvoiced: (s.totalInvoiced || 0) + invoiceTotal,
              totalInvoicesCount: (s.totalInvoicesCount || 0) + 1,
              activeOrders: (s.activeOrders || 0) + 1,
              lastSupplyDate: invoiceDate,
              phone: s.phone || supPhone,
              address: s.address || data.targetSupplier?.address || data.newSupplier?.address || 'العراق'
            };
          });
        } else if (data.newSupplier || data.targetSupplier) {
          const supplierToAdd = data.newSupplier || data.targetSupplier!;
          nextSuppliers = [{
            ...supplierToAdd,
            balanceDue: remainingAmount,
            totalInvoiced: invoiceTotal,
            totalInvoicesCount: 1,
            lastSupplyDate: invoiceDate
          }, ...prev];
        } else if (supName) {
          const created: Supplier = {
            id: `sup-${Date.now()}`,
            name: supName,
            nameAr: supName,
            contactPerson: supName,
            phone: supPhone || '07700000000',
            email: '',
            categorySupplied: 'أدوية ومستلزمات عامة',
            activeOrders: 1,
            totalInvoiced: invoiceTotal,
            totalPaid: (data.newPurchaseInvoice?.paidAmount || 0),
            balanceDue: remainingAmount,
            totalInvoicesCount: 1,
            lastSupplyDate: invoiceDate,
            rating: 5.0,
            avatar: '🏢',
            taxNumber: '',
            address: 'العراق',
            isSaved: true,
            payments: []
          };
          nextSuppliers = [created, ...prev];
        } else {
          return prev;
        }

        try { localStorage.setItem('supermarket_suppliers_v1', JSON.stringify(nextSuppliers)); } catch {}
        localDbBulkPut('suppliers', nextSuppliers);
        syncBulkWriteCollection('suppliers', nextSuppliers);
        return nextSuppliers;
      });
    }

    // 3. Add purchase invoice (سجل فواتير التوريد والمشتريات)
    if (data.newPurchaseInvoice) {
      setPurchaseInvoices(prev => {
        const nextInvoices = [data.newPurchaseInvoice!, ...prev];
        try { localStorage.setItem('supermarket_purchases_v1', JSON.stringify(nextInvoices)); } catch {}
        localDbBulkPut('purchases', nextInvoices);
        syncBulkWriteCollection('purchases', nextInvoices);
        return nextInvoices;
      });
    }

    // 4. Create notification
    const totalCount = data.newProducts.length + data.updatedProducts.length;
    const newNotif: MarketNotification = {
      id: `notif-${Date.now()}`,
      title: 'AI Invoice Scanned & Imported',
      titleAr: 'تم مسح وإدراج مواد الوصل بالذكاء الاصطناعي',
      message: `Successfully processed ${totalCount} items from invoice ${data.newPurchaseInvoice?.invoiceNumber || ''}.`,
      messageAr: `تم بنجاح إدراج وتحديث ${totalCount} مادة من الوصل ${data.newPurchaseInvoice?.invoiceNumber || ''} في المخزن والتقارير وحساب المورد.`,
      time: 'Just now',
      priority: 'high',
      category: 'inventory',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    syncWriteDocument('notifications', newNotif.id, newNotif);
  };

  const handleConfirmLegacyMigration = (importedProducts: Product[]) => {
    if (!importedProducts || importedProducts.length === 0) return;

    setProducts(prev => {
      const updatedList = [...prev];
      let newCount = 0;
      let updatedCount = 0;

      importedProducts.forEach(newP => {
        let matchIndex = updatedList.findIndex(p => 
          (newP.barcode && p.barcode && p.barcode.trim() === newP.barcode.trim()) ||
          p.id === newP.id ||
          p.name.toLowerCase() === newP.name.toLowerCase()
        );

        // Fallback: If not matched by exact ID/barcode/name, use intelligent Fuzzy Matching for minor spelling variations
        if (matchIndex === -1 && newP.name) {
          const fuzzyMatch = findBestFuzzyProductMatch(newP.name, updatedList, {
            barcode: newP.barcode,
            threshold: 0.80
          });
          if (fuzzyMatch.matchedProduct) {
            matchIndex = updatedList.findIndex(p => p.id === fuzzyMatch.matchedProduct!.id);
          }
        }

        if (matchIndex !== -1) {
          // Update existing inventory item
          updatedList[matchIndex] = {
            ...updatedList[matchIndex],
            name: newP.name || updatedList[matchIndex].name,
            nameAr: newP.nameAr || newP.name || updatedList[matchIndex].nameAr,
            nameKu: newP.nameKu || newP.name || updatedList[matchIndex].nameKu,
            stock: (updatedList[matchIndex].stock || 0) + (newP.stock || 0),
            totalUnits: (updatedList[matchIndex].totalUnits || 0) + (newP.totalUnits || 0),
            cartonPurchasePrice: newP.cartonPurchasePrice || updatedList[matchIndex].cartonPurchasePrice,
            cost: newP.cost || updatedList[matchIndex].cost,
            costPerUnit: newP.costPerUnit || updatedList[matchIndex].costPerUnit,
            price: newP.price || updatedList[matchIndex].price,
            singleRetailPrice: newP.singleRetailPrice || updatedList[matchIndex].singleRetailPrice,
            cartonSellingPrice: newP.cartonSellingPrice || updatedList[matchIndex].cartonSellingPrice,
            blisterPrice: newP.blisterPrice || updatedList[matchIndex].blisterPrice,
            blistersPerBox: newP.blistersPerBox || updatedList[matchIndex].blistersPerBox,
            expiryDate: newP.expiryDate || updatedList[matchIndex].expiryDate,
            manufacturer: newP.manufacturer || updatedList[matchIndex].manufacturer,
            dosageForm: newP.dosageForm || updatedList[matchIndex].dosageForm,
            lastPriceUpdate: new Date().toISOString()
          };
          updatedCount++;
        } else {
          // Add as fresh product
          updatedList.unshift(newP);
          newCount++;
        }
      });

      try { localStorage.setItem('supermarket_products_v1', JSON.stringify(updatedList)); } catch {}
      localDbBulkPut('products', updatedList);
      syncBulkWriteCollection('products', updatedList);

      // Notification
      const newNotif: MarketNotification = {
        id: `notif-mig-${Date.now()}`,
        title: 'Legacy System Products Migrated',
        titleAr: 'تم استيراد المواد من شاشة النظام القديم بنجاح',
        message: `Successfully imported ${newCount} new products and updated ${updatedCount} existing items.`,
        messageAr: `تم بنجاح إدراج ${newCount} دواء ومادة جديدة وتحديث رصيد وأسعار ${updatedCount} مادة في المخزن.`,
        time: 'Just now',
        priority: 'high',
        category: 'inventory',
        read: false
      };
      setNotifications(nPrev => [newNotif, ...nPrev]);
      syncWriteDocument('notifications', newNotif.id, newNotif);

      return updatedList;
    });
  };

  const handleImportBackup = (rawBackup: any) => {
    if (!rawBackup) return 0;
    const backup = Array.isArray(rawBackup) ? { products: rawBackup } : rawBackup;
    if (typeof backup !== 'object') return 0;

    let restoredCount = 0;
    if (backup.products && Array.isArray(backup.products)) {
      setProducts(backup.products);
      try { localStorage.setItem('supermarket_products_v1', JSON.stringify(backup.products)); } catch {}
      localDbBulkPut('products', backup.products);
      syncBulkWriteCollection('products', backup.products);
      restoredCount++;
    }
    const salesData = backup.salesHistory || backup.sales;
    if (salesData && Array.isArray(salesData)) {
      setSalesHistory(salesData);
      try { localStorage.setItem('supermarket_sales_v1', JSON.stringify(salesData)); } catch {}
      localDbBulkPut('sales', salesData);
      syncBulkWriteCollection('sales', salesData);
      restoredCount++;
    }
    if (backup.suppliers && Array.isArray(backup.suppliers)) {
      setSuppliers(backup.suppliers);
      try { localStorage.setItem('supermarket_suppliers_v1', JSON.stringify(backup.suppliers)); } catch {}
      localDbBulkPut('suppliers', backup.suppliers);
      syncBulkWriteCollection('suppliers', backup.suppliers);
      restoredCount++;
    }
    if (backup.customers && Array.isArray(backup.customers)) {
      setCustomers(backup.customers);
      try { localStorage.setItem('supermarket_customers_v1', JSON.stringify(backup.customers)); } catch {}
      localDbBulkPut('customers', backup.customers);
      syncBulkWriteCollection('customers', backup.customers);
      restoredCount++;
    }
    if (backup.orders && Array.isArray(backup.orders)) {
      setOrders(backup.orders);
      try { localStorage.setItem('supermarket_orders_v1', JSON.stringify(backup.orders)); } catch {}
      localDbBulkPut('orders', backup.orders);
      syncBulkWriteCollection('orders', backup.orders);
      restoredCount++;
    }
    if (backup.notifications && Array.isArray(backup.notifications)) {
      setNotifications(backup.notifications);
      try { localStorage.setItem('supermarket_notifications_v1', JSON.stringify(backup.notifications)); } catch {}
      localDbBulkPut('notifications', backup.notifications);
      syncBulkWriteCollection('notifications', backup.notifications);
      restoredCount++;
    }
    const purchasesData = backup.purchaseInvoices || backup.purchases;
    if (purchasesData && Array.isArray(purchasesData)) {
      setPurchaseInvoices(purchasesData);
      try { localStorage.setItem('supermarket_purchases_v1', JSON.stringify(purchasesData)); } catch {}
      localDbBulkPut('purchases', purchasesData);
      syncBulkWriteCollection('purchases', purchasesData);
      restoredCount++;
    }
    const usersData = backup.userAccounts || backup.users;
    if (usersData && Array.isArray(usersData)) {
      setUserAccounts(usersData);
      try { localStorage.setItem('supermarket_user_accounts_v3', JSON.stringify(usersData)); } catch {}
      localDbBulkPut('users', usersData);
      syncBulkWriteCollection('users', usersData);
      restoredCount++;
    }
    if (backup.settings && typeof backup.settings === 'object') {
      setSettings(backup.settings);
      try { localStorage.setItem('supermarket_settings_v3', JSON.stringify(backup.settings)); } catch {}
      syncWriteDocument('settings', 'store', backup.settings);
      restoredCount++;
    }
    // Restore damaged logs
    if (backup.damagedLogs && Array.isArray(backup.damagedLogs)) {
      localStorage.setItem('pos_damaged_items_logs', JSON.stringify(backup.damagedLogs));
      restoredCount++;
    }
    // Restore delegate returns
    if (backup.delegateReturns && Array.isArray(backup.delegateReturns)) {
      localStorage.setItem('pos_delegate_returns_logs', JSON.stringify(backup.delegateReturns));
      restoredCount++;
    }
    // Restore operating expenses
    if (backup.operatingExpenses && Array.isArray(backup.operatingExpenses)) {
      localStorage.setItem('pos_custom_operating_expenses', JSON.stringify(backup.operatingExpenses));
      restoredCount++;
    }
    // Restore custom expense types
    if (backup.customExpenseTypes && Array.isArray(backup.customExpenseTypes)) {
      localStorage.setItem('pos_custom_expense_types', JSON.stringify(backup.customExpenseTypes));
      restoredCount++;
    }
    // Restore cash adjustments
    if (backup.cashAdjustments && Array.isArray(backup.cashAdjustments)) {
      localStorage.setItem('pos_cash_adjustments', JSON.stringify(backup.cashAdjustments));
      restoredCount++;
    }

    // Trigger storage event for live sub-components
    try {
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }

    return restoredCount;
  };

  // Factory Reset & Wipe Entire Database for a New Client / New Store
  const handleFactoryResetAllData = async () => {
    // 1. Reset React States to clean empty arrays
    setProducts([]);
    setSalesHistory([]);
    setSuppliers([]);
    setCustomers([]);
    setOrders([]);
    setNotifications([]);
    setPurchaseInvoices([]);
    setUserAccounts(initialUserAccounts);
    setSettingsState(defaultSettings);

    // 2. Remove all persistence keys from localStorage
    const keysToRemove = [
      'supermarket_products_v1',
      'supermarket_sales_v1',
      'supermarket_suppliers_v1',
      'supermarket_customers_v1',
      'supermarket_orders_v1',
      'supermarket_notifications_v1',
      'supermarket_purchases_v1',
      'pos_damaged_items_logs',
      'pos_delegate_returns_logs',
      'pos_custom_operating_expenses',
      'pos_custom_expense_types',
      'pos_cash_adjustments',
      'pos_inventory_audits_v1',
      'pos_cash_drawer_history',
      'pos_shift_reports',
      'supermarket_current_user_v1',
      'supermarket_current_user',
      'pos_session_active_user_v1',
      'pos_session_active_user'
    ];
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    });

    // Save clean initial defaults
    try {
      localStorage.setItem('supermarket_settings_v3', JSON.stringify(defaultSettings));
      localStorage.setItem('supermarket_user_accounts_v3', JSON.stringify(initialUserAccounts));
    } catch {
      // ignore
    }

    // 3. Clear IndexedDB High-Capacity Local Database
    await localDbFactoryReset();

    // 4. Clear Session Storage
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }

    // 5. Reset Firestore collections if connected
    syncBulkWriteCollection('products', []);
    syncBulkWriteCollection('sales', []);
    syncBulkWriteCollection('suppliers', []);
    syncBulkWriteCollection('customers', []);
    syncBulkWriteCollection('purchases', []);
    syncBulkWriteCollection('orders', []);
    syncBulkWriteCollection('notifications', []);
    syncWriteDocument('settings', 'store', defaultSettings);
    syncBulkWriteCollection('users', initialUserAccounts);

    // 6. Trigger storage update event
    try {
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }

    // 7. Lock screen / return to login PIN screen
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const [isCustomerDisplayRoute, setIsCustomerDisplayRoute] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.search.includes('view=customer-display') || window.location.hash.includes('customer-display');
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const isDisplay = window.location.search.includes('view=customer-display') || window.location.hash.includes('customer-display');
      setIsCustomerDisplayRoute(isDisplay);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // If this window was opened specifically as a standalone Customer Display (e.g. secondary monitor / tablet)
  if (isCustomerDisplayRoute) {
    return <CustomerDisplayScreen isStandalone={true} />;
  }

  // If user is not logged in, render the futuristic LoginScreen
  if (!currentUser) {
    return (
      <>
        <LoginScreen
          userAccounts={userAccounts}
          settings={settings}
          setSettings={setSettings}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            if (user.role === 'Cashier') {
              setActiveTab('pos');
            } else {
              setActiveTab('dashboard');
            }
          }}
        />
        <AccountModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          settings={settings}
          onSaveAccount={(newAccount) => {
            setUserAccounts(prev => {
              const idx = prev.findIndex(u => u.id === newAccount.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = newAccount;
                return updated;
              }
              return [newAccount, ...prev];
            });
            setCurrentUser(newAccount);
            if (newAccount.role === 'Cashier') {
              setActiveTab('pos');
            } else {
              setActiveTab('dashboard');
            }
            setIsRegisterModalOpen(false);
          }}
        />
      </>
    );
  }

  // Determine view based on activeTopTab vs activeTab
  const renderMainContent = () => {
    // If top tab is switched to analytics, reports, or notifications, prioritize those
    if (activeTopTab === 'analytics') {
      return <AnalyticsTab products={products} salesHistory={salesHistory} settings={settings} />;
    }
    if (activeTopTab === 'reports') {
      return <ReportsTab products={products} salesHistory={salesHistory} settings={settings} />;
    }
    if (activeTopTab === 'notifications') {
      return (
        <NotificationsTab
          notifications={notifications}
          setNotifications={setNotifications}
          settings={settings}
          onOpenProducts={() => {
            setActiveTopTab('overview');
            setActiveTab('products');
          }}
        />
      );
    }

    // Otherwise render based on left sidebar nav
    switch (activeTab) {
      case 'dashboard':
        return (
          <OverviewTab
            products={products}
            salesHistory={salesHistory}
            settings={settings}
            currentUser={currentUser}
            onOpenPOS={() => setActiveTab('pos')}
            onOpenProducts={() => setActiveTab('products')}
            onOpenProductModal={handleOpenAddProduct}
            onOpenInventoryAudit={() => setActiveTab('inventoryAudit')}
            onOpenSuppliers={() => setActiveTab('suppliers')}
            onOpenCustomers={() => setActiveTab('customers')}
          />
        );

      case 'vouchers': {
        const isAnyModalOpen = Boolean(
          isCompletedReceiptsOpen ||
          isSalesReturnOpen ||
          isCashDrawerOpen ||
          selectedReceipt ||
          isProductModalOpen ||
          showPOSInventory ||
          isShiftReportOpen ||
          isMobileSyncOpen ||
          isBarcodePrintOpen ||
          isRegisterModalOpen ||
          isDesktopAppModalOpen ||
          isCSharpModalOpen ||
          isAccountsModalOpen
        );
        const handleExitPOS = () => {
          const nextTab = getExitTabForUser(currentUser);
          if (nextTab === 'pos' || nextTab === 'vouchers') {
            setActiveTab('dashboard');
          } else {
            setActiveTab(nextTab);
          }
        };

        return (
          <VouchersHubTab
            initialSubTab="hub"
            products={products}
            setProducts={setProducts}
            salesHistory={salesHistory}
            setSalesHistory={setSalesHistory}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            customers={customers}
            setCustomers={setCustomers}
            purchaseInvoices={purchaseInvoices}
            setPurchaseInvoices={setPurchaseInvoices}
            settings={settings}
            setSettings={setSettings}
            currentUser={currentUser}
            onOpenPOS={() => setActiveTab('pos')}
            onSaleCompleted={handleSaleCompleted}
            showPOSInventory={showPOSInventory}
            setShowPOSInventory={setShowPOSInventory}
            isYellowLineModalOpen={isYellowLineModalOpen}
            setIsYellowLineModalOpen={setIsYellowLineModalOpen}
            isAnyModalOpen={isAnyModalOpen}
            onViewReceipt={(sale) => setSelectedReceipt(sale)}
            onOpenMobileSync={() => setIsMobileSyncOpen(true)}
            onExitPOS={handleExitPOS}
            onBackToDashboard={handleExitPOS}
            onOpenPrintBarcode={(prod) => {
              setProductForBarcodePrint(prod || null);
              setIsBarcodePrintOpen(true);
            }}
            onOpenSalesReturn={() => setIsSalesReturnOpen(true)}
            onOpenCustomerDisplay={() => openCustomerDisplayWindow()}
            handleOpenAddProduct={handleOpenAddProduct}
            handleOpenAddProductForSupplier={handleOpenAddProductForSupplier}
            setSalesReturnPreInvoiceNo={setSalesReturnPreInvoiceNo}
            setIsSalesReturnOpen={setIsSalesReturnOpen}
          />
        );
      }

      case 'pos': {
        const isAnyModalOpen = Boolean(
          isCompletedReceiptsOpen ||
          isSalesReturnOpen ||
          isCashDrawerOpen ||
          selectedReceipt ||
          isProductModalOpen ||
          showPOSInventory ||
          isShiftReportOpen ||
          isMobileSyncOpen ||
          isBarcodePrintOpen ||
          isRegisterModalOpen ||
          isDesktopAppModalOpen ||
          isCSharpModalOpen ||
          isAccountsModalOpen
        );
        const handleExitPOS = () => {
          const nextTab = getExitTabForUser(currentUser);
          if (nextTab === 'pos') {
            alert(
              isRTL
                ? 'حساب الكاشير مقتصر على واجهة البيع (POS) فقط بناءً على صلاحيات الإدارة.'
                : 'Your cashier account is restricted to the POS view only based on manager permissions.'
            );
          } else {
            setActiveTab(nextTab);
          }
        };

        return (
          <POSTab
            products={products}
            setProducts={setProducts}
            customers={customers}
            setCustomers={setCustomers}
            settings={settings}
            setSettings={setSettings}
            onSaleCompleted={handleSaleCompleted}
            showInventory={showPOSInventory}
            setShowInventory={setShowPOSInventory}
            showYellowLineModal={isYellowLineModalOpen}
            setShowYellowLineModal={setIsYellowLineModalOpen}
            isAnyModalOpen={isAnyModalOpen}
            salesHistory={salesHistory}
            onViewReceipt={(sale) => setSelectedReceipt(sale)}
            onOpenMobileSync={() => setIsMobileSyncOpen(true)}
            onExitPOS={handleExitPOS}
            onBackToDashboard={handleExitPOS}
            onOpenPrintBarcode={(prod) => {
              setProductForBarcodePrint(prod || null);
              setIsBarcodePrintOpen(true);
            }}
            onOpenSalesReturn={() => setIsSalesReturnOpen(true)}
            onOpenDelegateReturns={() => setActiveTab('delegateReturns')}
            onOpenCustomerDisplay={() => openCustomerDisplayWindow()}
            currentUser={currentUser}
          />
        );
      }

      case 'products':
        return (
          <ProductsTab
            products={products}
            setProducts={setProducts}
            settings={settings}
            currentUser={currentUser}
            onOpenAddModal={handleOpenAddProduct}
            onEditProduct={handleEditProduct}
            onBackToDashboard={() => setActiveTab(getExitTabForUser(currentUser))}
            onOpenPrintBarcode={(prod) => {
              setProductForBarcodePrint(prod || null);
              setIsBarcodePrintOpen(true);
            }}
            onOpenInventoryAudit={() => setActiveTab('inventoryAudit')}
            onOpenDamagedItems={() => setActiveTab('damagedItems')}
            onOpenInvoices={() => setActiveTab('invoices')}
            onNavigateToReports={() => setActiveTopTab('reports')}
            onOpenAIInvoiceScanner={() => setIsAIInvoiceScannerOpen(true)}
            onOpenLegacyScreenMigrator={() => setIsLegacyMigratorOpen(true)}
          />
        );

      case 'inventoryAudit':
        return (
          <InventoryAuditModal
            isOpen={true}
            onClose={() => setActiveTab('products')}
            products={products}
            setProducts={setProducts}
            settings={settings}
          />
        );

      case 'damagedItems':
        return (
          <DamagedItemsModal
            isOpen={true}
            onClose={() => setActiveTab('products')}
            products={products}
            setProducts={setProducts}
            settings={settings}
            cashierName={currentUser?.fullName || (isAr ? 'الكاشير الرئيسي' : 'Main Cashier')}
          />
        );

      case 'delegateReturns':
        return (
          <DelegateReturnsModal
            isOpen={true}
            onClose={() => setActiveTab('products')}
            products={products}
            setProducts={setProducts}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            settings={settings}
            cashierName={currentUser?.fullName || (isAr ? 'الكاشير الرئيسي' : 'Main Cashier')}
          />
        );

      case 'purchases':
        return (
          <PurchasesTab
            products={products}
            setProducts={setProducts}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            purchaseInvoices={purchaseInvoices}
            setPurchaseInvoices={setPurchaseInvoices}
            settings={settings}
            onOpenAddProduct={handleOpenAddProduct}
            onBackToDashboard={() => setActiveTab(getExitTabForUser(currentUser))}
            onOpenAIInvoiceScanner={() => setIsAIInvoiceScannerOpen(true)}
            initialDraftData={aiDraftImportData}
            onClearInitialDraftData={() => setAiDraftImportData(null)}
          />
        );

      case 'accountsHub':
      case 'permissions':
        return (
          <AccountsHubTab
            initialSubTab={activeTab === 'permissions' ? 'permissions' : 'hub'}
            settings={settings}
            setSettings={setSettings}
            currentUser={currentUser}
            userAccounts={userAccounts}
            setUserAccounts={setUserAccounts}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            customers={customers}
            setCustomers={setCustomers}
            orders={orders}
            products={products}
            setProducts={setProducts}
            salesHistory={salesHistory}
            setSalesHistory={setSalesHistory}
            purchaseInvoices={purchaseInvoices}
            setPurchaseInvoices={setPurchaseInvoices}
            notifications={notifications}
            onImportBackup={handleImportBackup}
            onOpenPOS={() => setActiveTab('pos')}
            onOpenAddProductForSupplier={handleOpenAddProductForSupplier}
            onOpenAIInvoiceScanner={() => setIsAIInvoiceScannerOpen(true)}
            onViewReceipt={(sale) => setSelectedReceipt(sale)}
            onBackToDashboard={() => setActiveTab(getExitTabForUser(currentUser))}
          />
        );

      case 'suppliers':
        return (
          <AccountsHubTab
            initialSubTab="suppliers"
            settings={settings}
            setSettings={setSettings}
            currentUser={currentUser}
            userAccounts={userAccounts}
            setUserAccounts={setUserAccounts}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            customers={customers}
            setCustomers={setCustomers}
            orders={orders}
            products={products}
            setProducts={setProducts}
            salesHistory={salesHistory}
            setSalesHistory={setSalesHistory}
            purchaseInvoices={purchaseInvoices}
            setPurchaseInvoices={setPurchaseInvoices}
            notifications={notifications}
            onImportBackup={handleImportBackup}
            onOpenPOS={() => setActiveTab('pos')}
            onOpenAddProductForSupplier={handleOpenAddProductForSupplier}
            onOpenAIInvoiceScanner={() => setIsAIInvoiceScannerOpen(true)}
            onViewReceipt={(sale) => setSelectedReceipt(sale)}
            onBackToDashboard={() => setActiveTab(getExitTabForUser(currentUser))}
          />
        );

      case 'customers':
        return (
          <AccountsHubTab
            initialSubTab="customers"
            settings={settings}
            setSettings={setSettings}
            currentUser={currentUser}
            userAccounts={userAccounts}
            setUserAccounts={setUserAccounts}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            customers={customers}
            setCustomers={setCustomers}
            orders={orders}
            products={products}
            setProducts={setProducts}
            salesHistory={salesHistory}
            setSalesHistory={setSalesHistory}
            purchaseInvoices={purchaseInvoices}
            setPurchaseInvoices={setPurchaseInvoices}
            notifications={notifications}
            onImportBackup={handleImportBackup}
            onOpenPOS={() => setActiveTab('pos')}
            onOpenAddProductForSupplier={handleOpenAddProductForSupplier}
            onOpenAIInvoiceScanner={() => setIsAIInvoiceScannerOpen(true)}
            onViewReceipt={(sale) => setSelectedReceipt(sale)}
            onBackToDashboard={() => setActiveTab(getExitTabForUser(currentUser))}
          />
        );

      case 'orders':
        return (
          <AccountsHubTab
            initialSubTab="orders"
            settings={settings}
            setSettings={setSettings}
            currentUser={currentUser}
            userAccounts={userAccounts}
            setUserAccounts={setUserAccounts}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            customers={customers}
            setCustomers={setCustomers}
            orders={orders}
            products={products}
            setProducts={setProducts}
            salesHistory={salesHistory}
            purchaseInvoices={purchaseInvoices}
            setPurchaseInvoices={setPurchaseInvoices}
            notifications={notifications}
            onImportBackup={handleImportBackup}
            onOpenPOS={() => setActiveTab('pos')}
            onOpenAddProductForSupplier={handleOpenAddProductForSupplier}
            onOpenAIInvoiceScanner={() => setIsAIInvoiceScannerOpen(true)}
            onViewReceipt={(sale) => setSelectedReceipt(sale)}
            onBackToDashboard={() => setActiveTab(getExitTabForUser(currentUser))}
          />
        );

      case 'analytics':
        return (
          <AnalyticsTab
            products={products}
            salesHistory={salesHistory}
            settings={settings}
          />
        );

      case 'reports':
        return (
          <ReportsTab
            products={products}
            salesHistory={salesHistory}
            suppliers={suppliers}
            customers={customers}
            purchaseInvoices={purchaseInvoices}
            userAccounts={userAccounts}
            settings={settings}
            onOpenShiftReport={() => setIsShiftReportOpen(true)}
            onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
            onViewReceipt={(sale) => setSelectedReceipt(sale)}
            onOpenDamagedItemsModal={() => setActiveTab('damagedItems')}
            onOpenInventoryAudit={() => setIsInventoryAuditOpen(true)}
            onToggleFullscreen={(isFull) => setIsReportsFullscreen(isFull)}
            onBackToDashboard={() => {
              setActiveTopTab('overview');
              setActiveTab('dashboard');
            }}
          />
        );

      case 'cashierAccounts':
        return (
          <AccountsHubTab
            initialSubTab="cashierAccounts"
            settings={settings}
            setSettings={setSettings}
            currentUser={currentUser}
            userAccounts={userAccounts}
            setUserAccounts={setUserAccounts}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            customers={customers}
            setCustomers={setCustomers}
            orders={orders}
            products={products}
            setProducts={setProducts}
            salesHistory={salesHistory}
            purchaseInvoices={purchaseInvoices}
            setPurchaseInvoices={setPurchaseInvoices}
            notifications={notifications}
            onImportBackup={handleImportBackup}
            onOpenPOS={() => setActiveTab('pos')}
            onOpenAddProductForSupplier={handleOpenAddProductForSupplier}
            onViewReceipt={(sale) => setSelectedReceipt(sale)}
            onBackToDashboard={() => setActiveTab(getExitTabForUser(currentUser))}
          />
        );

      case 'invoices':
        return (
          <InvoicesTab
            products={products}
            salesHistory={salesHistory}
            setSalesHistory={setSalesHistory}
            userAccounts={userAccounts}
            onUpdateSaleCashier={(saleId, newCashierName) => {
              setSalesHistory(prev => prev.map(s => s.id === saleId ? { ...s, cashierName: newCashierName } : s));
            }}
            settings={settings}
            onOpenPOS={() => setActiveTab('pos')}
            onBackToDashboard={() => setActiveTab(getExitTabForUser(currentUser))}
            onViewReceipt={(sale) => setSelectedReceipt(sale)}
            onOpenReturnForSale={(sale) => {
              setSalesReturnPreInvoiceNo(sale.invoiceNumber);
              setIsSalesReturnOpen(true);
            }}
          />
        );

      case 'print':
        return (
          <PrintCenterTab
            products={products}
            setProducts={setProducts}
            settings={settings}
            onBackToDashboard={() => setActiveTab(getExitTabForUser(currentUser))}
          />
        );

      case 'settings':
        return (
          <SettingsTab
            settings={settings}
            setSettings={setSettings}
            userAccounts={userAccounts}
            setUserAccounts={setUserAccounts}
            products={products}
            salesHistory={salesHistory}
            suppliers={suppliers}
            customers={customers}
            orders={orders}
            notifications={notifications}
            purchaseInvoices={purchaseInvoices}
            onImportBackup={handleImportBackup}
            onFactoryReset={handleFactoryResetAllData}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`h-screen max-h-screen overflow-hidden bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Top Header */}
      <Header
        activeTopTab={activeTopTab}
        setActiveTopTab={setActiveTopTab}
        unreadNotifsCount={unreadNotifsCount}
        settings={settings}
        setSettings={setSettings}
        onQuickPOS={() => {
          setActiveTopTab('overview');
          setActiveTab('pos');
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
        isPOSMode={activeTab === 'pos'}
        onExitPOS={() => {
          const nextTab = getExitTabForUser(currentUser);
          if (nextTab === 'pos') {
            alert(
              isRTL
                ? 'حساب الكاشير مقتصر على واجهة البيع (POS) فقط بناءً على صلاحيات الإدارة.'
                : 'Your cashier account is restricted to the POS view only based on manager permissions.'
            );
          } else {
            setActiveTab(nextTab);
          }
        }}
        onShowInventory={() => setShowPOSInventory(true)}
        inventoryCount={products.filter(p => p.stock > 0).length}
        onOpenCompletedReceipts={() => setIsCompletedReceiptsOpen(true)}
        onOpenSalesReturn={() => {
          setSalesReturnPreInvoiceNo(null);
          setIsSalesReturnOpen(true);
        }}
        onOpenCashDrawer={() => setIsCashDrawerOpen(true)}
        onOpenShiftReport={() => setIsShiftReportOpen(true)}
        onOpenMobileSync={() => setIsMobileSyncOpen(true)}
        onOpenDesktopApp={() => setIsDesktopAppModalOpen(true)}
        onOpenCSharpCode={() => setIsCSharpModalOpen(true)}
        onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
        onOpenCustomerDisplay={() => openCustomerDisplayWindow()}
        isFirebaseSynced={isFirebaseSynced}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Desktop Sidebar (Fixed side navigation on lg+ screens) */}
        {isSidebarOpen && activeTab !== 'pos' && activeTab !== 'products' && activeTab !== 'purchases' && activeTab !== 'invoices' && activeTab !== 'accountsHub' && activeTab !== 'cashierAccounts' && !isReportsFullscreen && (
          <div className="hidden lg:block w-64 shrink-0 h-full">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTopTab('overview');
                setActiveTab(tab);
              }}
              settings={settings}
              lowStockCount={lowStockCount}
              currentUser={currentUser}
              onLogout={() => setCurrentUser(null)}
            />
          </div>
        )}

        {/* Mobile Slide-over Drawer (on small/tablet screens) */}
        {isSidebarOpen && activeTab !== 'pos' && (
          <div className="lg:hidden fixed inset-0 z-50 flex animate-fadeIn">
            {/* Dark Backdrop */}
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
            {/* Drawer Container */}
            <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
              <Sidebar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                  setActiveTopTab('overview');
                  setActiveTab(tab);
                  setIsSidebarOpen(false);
                }}
                settings={settings}
                lowStockCount={lowStockCount}
                currentUser={currentUser}
                onLogout={() => {
                  setCurrentUser(null);
                  setIsSidebarOpen(false);
                }}
                onClose={() => setIsSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className={`flex-1 w-full min-h-0 ${
          activeTab === 'pos' 
            ? 'max-w-full overflow-hidden h-full p-1.5 sm:p-2.5 lg:p-3' 
            : activeTab === 'products' || activeTab === 'purchases' || activeTab === 'invoices' || activeTab === 'accountsHub' || activeTab === 'cashierAccounts' || isReportsFullscreen 
            ? 'max-w-full overflow-y-auto p-2 sm:p-4 lg:p-6 pb-24 lg:pb-6' 
            : 'max-w-7xl mx-auto overflow-y-auto p-2 sm:p-4 lg:p-6 pb-24 lg:pb-6'
        }`}>
          {renderMainContent()}
        </main>

      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop & in POS Mode) */}
      {activeTab !== 'pos' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B1120]/95 backdrop-blur-xl border-t border-cyan-500/20 px-2 py-1.5 safe-bottom-nav shadow-[0_-4px_25px_rgba(0,0,0,0.6)] select-none">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {/* Dashboard */}
            <button
              type="button"
              onClick={() => {
                setActiveTopTab('overview');
                setActiveTab('dashboard');
              }}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
                activeTab === 'dashboard'
                  ? 'text-cyan-400 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''}`} />
              <span className="text-[10px] leading-tight font-bold">
                {settings.language === 'ku' ? 'سەرەکی' : settings.language === 'ar' ? 'الرئيسية' : 'Home'}
              </span>
            </button>

            {/* Products */}
            <button
              type="button"
              onClick={() => {
                setActiveTopTab('overview');
                setActiveTab('products');
              }}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all relative cursor-pointer active:scale-95 ${
                activeTab === 'products'
                  ? 'text-cyan-400 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className={`w-5 h-5 mb-0.5 ${activeTab === 'products' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''}`} />
              <span className="text-[10px] leading-tight font-bold">
                {settings.language === 'ku' ? 'کۆگا' : settings.language === 'ar' ? 'المخزن' : 'Stock'}
              </span>
              {lowStockCount > 0 && (
                <span className="absolute -top-1 end-1 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center border border-[#0B1120] animate-pulse">
                  {lowStockCount}
                </span>
              )}
            </button>

            {/* POS Fast Sales (Center Elevated Button) */}
            <button
              type="button"
              onClick={() => {
                setActiveTopTab('overview');
                setActiveTab('pos');
              }}
              className="flex flex-col items-center py-1 px-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-90 transition-all cursor-pointer -mt-3.5 border-2 border-[#0B1120]"
            >
              <ShoppingCart className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-black leading-tight">
                {settings.language === 'ku' ? 'کاشێر' : settings.language === 'ar' ? 'الكاشير' : 'POS'}
              </span>
            </button>

            {/* Cashier Accounts */}
            <button
              type="button"
              onClick={() => {
                setActiveTopTab('overview');
                setActiveTab('cashierAccounts');
              }}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
                activeTab === 'cashierAccounts'
                  ? 'text-cyan-400 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className={`w-5 h-5 mb-0.5 ${activeTab === 'cashierAccounts' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''}`} />
              <span className="text-[10px] leading-tight font-bold">
                {settings.language === 'ku' ? 'حیساب' : settings.language === 'ar' ? 'كشف الحساب' : 'Accounts'}
              </span>
            </button>

            {/* More Menu Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl active:scale-95 transition-all cursor-pointer relative ${
                ['vouchers', 'accountsHub', 'reports', 'settings', 'suppliers', 'customers', 'orders', 'permissions', 'analytics', 'notifications'].includes(activeTab)
                  ? 'text-cyan-400 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight font-bold">
                {settings.language === 'ku' ? 'بەشەکان' : settings.language === 'ar' ? 'المزيد' : 'Menu'}
              </span>
              {['vouchers', 'accountsHub', 'reports', 'settings', 'suppliers', 'customers', 'orders', 'permissions', 'analytics', 'notifications'].includes(activeTab) && (
                <span className="absolute top-1 end-2 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              )}
            </button>
          </div>
        </nav>
      )}

      {/* Modals */}
      {selectedReceipt && (
        <ReceiptModal
          sale={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          settings={settings}
        />
      )}

      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          productToEdit={productToEdit}
          onSave={handleSaveProduct}
          settings={settings}
          suppliers={suppliers}
          initialSupplierName={initialSupplierForNewProduct}
          existingProducts={products}
        />
      )}

      {isCompletedReceiptsOpen && (
        <CompletedReceiptsModal
          isOpen={isCompletedReceiptsOpen}
          onClose={() => setIsCompletedReceiptsOpen(false)}
          salesHistory={salesHistory}
          setSalesHistory={setSalesHistory}
          userAccounts={userAccounts}
          onUpdateSaleCashier={(saleId, newCashierName) => {
            setSalesHistory(prev => prev.map(s => s.id === saleId ? { ...s, cashierName: newCashierName } : s));
          }}
          settings={settings}
          onViewReceipt={(sale) => setSelectedReceipt(sale)}
          onOpenReturnForSale={(sale) => {
            setSalesReturnPreInvoiceNo(sale.invoiceNumber);
            setIsSalesReturnOpen(true);
          }}
          onOpenCashDrawer={() => setIsCashDrawerOpen(true)}
        />
      )}

      {isSalesReturnOpen && (
        <SalesReturnModal
          isOpen={isSalesReturnOpen}
          onClose={() => setIsSalesReturnOpen(false)}
          products={products}
          setProducts={setProducts}
          salesHistory={salesHistory}
          setSalesHistory={setSalesHistory}
          settings={settings}
          preSelectedInvoiceNo={salesReturnPreInvoiceNo}
          onViewReceipt={(sale) => setSelectedReceipt(sale)}
          onOpenCashDrawer={() => setIsCashDrawerOpen(true)}
          onOpenInventory={() => {
            setIsSalesReturnOpen(false);
            setActiveTab('products');
          }}
        />
      )}

      {isCashDrawerOpen && (
        <CashDrawerModal
          isOpen={isCashDrawerOpen}
          onClose={() => setIsCashDrawerOpen(false)}
          salesHistory={salesHistory}
          settings={settings}
          onOpenShiftReport={() => setIsShiftReportOpen(true)}
        />
      )}

      {isShiftReportOpen && (
        <ShiftReportModal
          isOpen={isShiftReportOpen}
          onClose={() => setIsShiftReportOpen(false)}
          salesHistory={salesHistory}
          settings={settings}
          cashierName={currentUser?.fullName || (isAr ? 'الكاشير الرئيسي' : 'Main Cashier')}
          onViewReceipt={(sale) => setSelectedReceipt(sale)}
          onOpenSalesReturn={(invoiceNo) => {
            setSalesReturnPreInvoiceNo(invoiceNo || null);
            setIsSalesReturnOpen(true);
          }}
        />
      )}

      {isMobileSyncOpen && (
        <MobileSyncModal
          isOpen={isMobileSyncOpen}
          onClose={() => setIsMobileSyncOpen(false)}
          settings={settings}
        />
      )}

      {isBarcodePrintOpen && (
        <BarcodePrintModal
          isOpen={isBarcodePrintOpen}
          onClose={() => setIsBarcodePrintOpen(false)}
          initialProduct={productForBarcodePrint}
          products={products}
          settings={settings}
        />
      )}

      {isDesktopAppModalOpen && (
        <DesktopAppModal
          isOpen={isDesktopAppModalOpen}
          onClose={() => setIsDesktopAppModalOpen(false)}
          settings={settings}
          deferredPrompt={deferredPrompt}
          onTriggerInstall={handleTriggerInstall}
        />
      )}

      {isCSharpModalOpen && (
        <CSharpExporterModal
          isOpen={isCSharpModalOpen}
          onClose={() => setIsCSharpModalOpen(false)}
          settings={settings}
          products={products}
          sales={salesHistory}
        />
      )}

      {isAccountsModalOpen && (
        <CashierAccountsModal
          isOpen={isAccountsModalOpen}
          onClose={() => setIsAccountsModalOpen(false)}
          userAccounts={userAccounts}
          salesHistory={salesHistory}
          settings={settings}
          onViewReceipt={(sale) => setSelectedReceipt(sale)}
          onOpenReturnForSale={(sale) => {
            setSalesReturnPreInvoiceNo(sale.invoiceNumber);
            setIsSalesReturnOpen(true);
          }}
          onOpenSalesReturnModal={() => setIsSalesReturnOpen(true)}
          onOpenCompletedReceiptsModal={() => setIsCompletedReceiptsOpen(true)}
        />
      )}

      {isInventoryAuditOpen && (
        <InventoryAuditModal
          isOpen={isInventoryAuditOpen}
          onClose={() => setIsInventoryAuditOpen(false)}
          products={products}
          setProducts={setProducts}
          settings={settings}
        />
      )}

      {isAIInvoiceScannerOpen && (
        <AIInvoiceScannerModal
          isOpen={isAIInvoiceScannerOpen}
          onClose={() => setIsAIInvoiceScannerOpen(false)}
          settings={settings}
          existingProducts={products}
          existingSuppliers={suppliers}
          onConfirmImport={handleConfirmAIInvoiceImport}
          onTransferToDraft={(draftData) => {
            setAiDraftImportData(draftData);
            setActiveTab('purchases');
          }}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
          onOpenLegacyScreenMigrator={() => setIsLegacyMigratorOpen(true)}
        />
      )}

      {isLegacyMigratorOpen && (
        <AILegacySystemMigratorModal
          isOpen={isLegacyMigratorOpen}
          onClose={() => setIsLegacyMigratorOpen(false)}
          settings={settings}
          existingProducts={products}
          currentUser={currentUser}
          onConfirmMigration={handleConfirmLegacyMigration}
        />
      )}

    </div>
  );
}

export default App;

