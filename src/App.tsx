import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, MainNavTab } from './components/Sidebar';
import { OverviewTab } from './components/OverviewTab';
import { InvoicesTab } from './components/InvoicesTab';
import { ProductsTab } from './components/ProductsTab';
import { PurchasesTab } from './components/PurchasesTab';
import { POSTab } from './components/POSTab';
import { SuppliersTab } from './components/SuppliersTab';
import { CustomersTab } from './components/CustomersTab';
import { OrdersTab } from './components/OrdersTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { ReportsTab } from './components/ReportsTab';
import { NotificationsTab } from './components/NotificationsTab';
import { SettingsTab } from './components/SettingsTab';
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
import { AccountModal } from './components/AccountModal';
import { DesktopAppModal } from './components/DesktopAppModal';
import { CSharpExporterModal } from './components/CSharpExporterModal';
import { CashierAccountsModal } from './components/CashierAccountsModal';
import { bitmojiToDataUri, defaultBitmojiPresets } from './components/BitmojiAvatarSelector';

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
  subscribeToCollection, 
  subscribeToDocument, 
  syncWriteDocument, 
  syncDeleteDocument, 
  syncBulkWriteCollection 
} from './lib/firestoreSync';

// Custom persistent state hook to keep data in localStorage across updates & reloads
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

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      console.warn(`Failed to save to localStorage key "${key}":`, err);
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
  // Current logged in user is null on app launch to force login screen immediately
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
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
  const [settings, setSettingsState] = usePersistentState<StoreSettings>('supermarket_settings_v3', defaultSettings);

  const setSettings: React.Dispatch<React.SetStateAction<StoreSettings>> = (action) => {
    setSettingsState((prev) => {
      const nextSettings = typeof action === 'function' ? action(prev) : action;
      syncWriteDocument('settings', 'store', nextSettings);
      return nextSettings;
    });
  };

  const [activeTab, setActiveTab] = useState<MainNavTab>('dashboard');
  const [activeTopTab, setActiveTopTab] = useState<'overview' | 'analytics' | 'reports' | 'notifications'>('overview');
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
  const [isReportsFullscreen, setIsReportsFullscreen] = useState(false);
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

  // Real-Time Multi-Device Synchronization via Firestore Listeners
  useEffect(() => {
    const unsubProducts = subscribeToCollection<Product>('products', (cloudProducts) => {
      setProducts(cloudProducts);
      setIsFirebaseSynced(true);
    }, initialProducts);

    const unsubSales = subscribeToCollection<SaleTransaction>('sales', (cloudSales) => {
      setSalesHistory(cloudSales);
    }, initialSalesHistory);

    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', (cloudSuppliers) => {
      setSuppliers(cloudSuppliers);
    }, initialSuppliers);

    const unsubCustomers = subscribeToCollection<Customer>('customers', (cloudCustomers) => {
      setCustomers(cloudCustomers);
    }, initialCustomers);

    const unsubOrders = subscribeToCollection<MarketOrder>('orders', (cloudOrders) => {
      setOrders(cloudOrders);
    }, initialOrders);

    const unsubNotifications = subscribeToCollection<MarketNotification>('notifications', (cloudNotifs) => {
      setNotifications(cloudNotifs);
    }, initialNotifications);

    const unsubPurchases = subscribeToCollection<PurchaseInvoice>('purchases', (cloudPurchases) => {
      setPurchaseInvoices(cloudPurchases);
    }, initialPurchaseInvoices);

    const unsubUsers = subscribeToCollection<UserAccount>('users', (cloudUsers) => {
      setUserAccounts(cloudUsers);
    }, initialUserAccounts);

    const unsubSettings = subscribeToDocument<StoreSettings>('settings', 'store', (cloudSettings) => {
      if (cloudSettings && typeof cloudSettings === 'object' && Object.keys(cloudSettings).length > 0) {
        setSettingsState((prev) => ({
          ...defaultSettings,
          ...prev,
          ...cloudSettings
        }));
      }
    }, defaultSettings);

    return () => {
      unsubProducts();
      unsubSales();
      unsubSuppliers();
      unsubCustomers();
      unsubOrders();
      unsubNotifications();
      unsubPurchases();
      unsubUsers();
      unsubSettings();
    };
  }, []);

  // Helper to check if current user has permission for activeTab
  const userHasPermissionForTab = (tabId: MainNavTab, user: UserAccount | null): boolean => {
    if (!user || user.role === 'Admin') return true;
    const perms = user.permissions;
    if (!perms) return true;

    switch (tabId) {
      case 'dashboard': return perms.canAccessDashboard !== false;
      case 'pos': return perms.canAccessPOS;
      case 'products': return perms.canManageProducts;
      case 'inventoryAudit': return perms.canManageInventoryAudit ?? perms.canManageProducts;
      case 'damagedItems': return perms.canManageProducts;
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
    return allowed || 'pos';
  };

  // Automatically switch activeTab if logged in user does not have permission for the current activeTab
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'Admin') return;

    if (!userHasPermissionForTab(activeTab, currentUser)) {
      const fallbackOrder: MainNavTab[] = [
        'dashboard',
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

    // Sync sold product stocks to Firestore immediately
    newSale.items.forEach(item => {
      const updatedProd = products.find(p => p.id === item.productId);
      if (updatedProd) {
        const newStock = Math.max(0, updatedProd.stock - item.quantity);
        const prodData = { ...updatedProd, stock: newStock };
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
    setProductToEdit(null);
    setInitialSupplierForNewProduct('');
    setIsProductModalOpen(true);
  };

  const handleOpenAddProductForSupplier = (supplierName: string) => {
    setProductToEdit(null);
    setInitialSupplierForNewProduct(supplierName);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (prod: Product) => {
    setProductToEdit(prod);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (prod: Product) => {
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

  const handleImportBackup = (rawBackup: any) => {
    if (!rawBackup) return 0;
    const backup = Array.isArray(rawBackup) ? { products: rawBackup } : rawBackup;
    if (typeof backup !== 'object') return 0;

    let restoredCount = 0;
    if (backup.products && Array.isArray(backup.products)) {
      setProducts(backup.products);
      localStorage.setItem('supermarket_products_v1', JSON.stringify(backup.products));
      syncBulkWriteCollection('products', backup.products);
      restoredCount++;
    }
    const salesData = backup.salesHistory || backup.sales;
    if (salesData && Array.isArray(salesData)) {
      setSalesHistory(salesData);
      localStorage.setItem('supermarket_sales_v1', JSON.stringify(salesData));
      syncBulkWriteCollection('sales', salesData);
      restoredCount++;
    }
    if (backup.suppliers && Array.isArray(backup.suppliers)) {
      setSuppliers(backup.suppliers);
      localStorage.setItem('supermarket_suppliers_v1', JSON.stringify(backup.suppliers));
      syncBulkWriteCollection('suppliers', backup.suppliers);
      restoredCount++;
    }
    if (backup.customers && Array.isArray(backup.customers)) {
      setCustomers(backup.customers);
      localStorage.setItem('supermarket_customers_v1', JSON.stringify(backup.customers));
      syncBulkWriteCollection('customers', backup.customers);
      restoredCount++;
    }
    if (backup.orders && Array.isArray(backup.orders)) {
      setOrders(backup.orders);
      localStorage.setItem('supermarket_orders_v1', JSON.stringify(backup.orders));
      syncBulkWriteCollection('orders', backup.orders);
      restoredCount++;
    }
    if (backup.notifications && Array.isArray(backup.notifications)) {
      setNotifications(backup.notifications);
      localStorage.setItem('supermarket_notifications_v1', JSON.stringify(backup.notifications));
      syncBulkWriteCollection('notifications', backup.notifications);
      restoredCount++;
    }
    const purchasesData = backup.purchaseInvoices || backup.purchases;
    if (purchasesData && Array.isArray(purchasesData)) {
      setPurchaseInvoices(purchasesData);
      localStorage.setItem('supermarket_purchases_v1', JSON.stringify(purchasesData));
      syncBulkWriteCollection('purchases', purchasesData);
      restoredCount++;
    }
    const usersData = backup.userAccounts || backup.users;
    if (usersData && Array.isArray(usersData)) {
      setUserAccounts(usersData);
      localStorage.setItem('supermarket_user_accounts_v1', JSON.stringify(usersData));
      syncBulkWriteCollection('users', usersData);
      restoredCount++;
    }
    if (backup.settings && typeof backup.settings === 'object') {
      setSettings(backup.settings);
      localStorage.setItem('supermarket_settings_v1', JSON.stringify(backup.settings));
      syncWriteDocument('settings', 'store', backup.settings);
      restoredCount++;
    }
    return restoredCount;
  };

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
            settings={settings}
            onSaleCompleted={handleSaleCompleted}
            showInventory={showPOSInventory}
            setShowInventory={setShowPOSInventory}
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
            onOpenAddModal={handleOpenAddProduct}
            onEditProduct={handleEditProduct}
            onBackToDashboard={() => setActiveTab(getExitTabForUser(currentUser))}
            onOpenPrintBarcode={(prod) => {
              setProductForBarcodePrint(prod || null);
              setIsBarcodePrintOpen(true);
            }}
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
          />
        );

      case 'suppliers':
        return (
          <SuppliersTab
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            products={products}
            setProducts={setProducts}
            settings={settings}
            onOpenAddProductForSupplier={handleOpenAddProductForSupplier}
          />
        );

      case 'customers':
        return (
          <CustomersTab
            customers={customers}
            setCustomers={setCustomers}
            settings={settings}
          />
        );

      case 'orders':
        return (
          <OrdersTab
            orders={orders}
            settings={settings}
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
            onToggleFullscreen={(isFull) => setIsReportsFullscreen(isFull)}
            onBackToDashboard={() => {
              setActiveTopTab('overview');
              setActiveTab('dashboard');
            }}
          />
        );

      case 'cashierAccounts':
        return (
          <ReportsTab
            products={products}
            salesHistory={salesHistory}
            suppliers={suppliers}
            customers={customers}
            purchaseInvoices={purchaseInvoices}
            userAccounts={userAccounts}
            settings={settings}
            initialCategory="financial"
            initialSubTab="cashier_accounts"
            isCashierAccountsOnly={true}
            onOpenShiftReport={() => setIsShiftReportOpen(true)}
            onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
            onViewReceipt={(sale) => setSelectedReceipt(sale)}
            onToggleFullscreen={(isFull) => setIsReportsFullscreen(isFull)}
            onBackToDashboard={() => {
              setActiveTopTab('overview');
              setActiveTab('dashboard');
            }}
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
        isFirebaseSynced={isFirebaseSynced}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left/Right Sidebar */}
        {isSidebarOpen && activeTab !== 'pos' && activeTab !== 'products' && activeTab !== 'purchases' && activeTab !== 'invoices' && !isReportsFullscreen && (
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
        )}

        {/* Content Area */}
        <main className={`flex-1 w-full min-h-0 ${activeTab === 'pos' ? 'max-w-full overflow-hidden h-full p-2 sm:p-3' : activeTab === 'products' || activeTab === 'purchases' || activeTab === 'invoices' || isReportsFullscreen ? 'max-w-full overflow-y-auto p-3 sm:p-4 lg:p-6' : 'max-w-7xl mx-auto overflow-y-auto p-3 sm:p-4 lg:p-6'}`}>
          {renderMainContent()}
        </main>

      </div>

      {/* Modals */}
      <ReceiptModal
        sale={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        settings={settings}
      />

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

      <CashDrawerModal
        isOpen={isCashDrawerOpen}
        onClose={() => setIsCashDrawerOpen(false)}
        salesHistory={salesHistory}
        settings={settings}
        onOpenShiftReport={() => setIsShiftReportOpen(true)}
      />

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

      <MobileSyncModal
        isOpen={isMobileSyncOpen}
        onClose={() => setIsMobileSyncOpen(false)}
        settings={settings}
      />

      <BarcodePrintModal
        isOpen={isBarcodePrintOpen}
        onClose={() => setIsBarcodePrintOpen(false)}
        initialProduct={productForBarcodePrint}
        products={products}
        settings={settings}
      />

      <DesktopAppModal
        isOpen={isDesktopAppModalOpen}
        onClose={() => setIsDesktopAppModalOpen(false)}
        settings={settings}
        deferredPrompt={deferredPrompt}
        onTriggerInstall={handleTriggerInstall}
      />

      <CSharpExporterModal
        isOpen={isCSharpModalOpen}
        onClose={() => setIsCSharpModalOpen(false)}
        settings={settings}
        products={products}
        sales={salesHistory}
      />

      <CashierAccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        userAccounts={userAccounts}
        salesHistory={salesHistory}
        settings={settings}
      />

    </div>
  );
}

export default App;

