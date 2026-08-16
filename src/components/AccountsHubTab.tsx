import React, { useState } from 'react';
import { 
  Users, 
  Truck, 
  UserCheck, 
  Store, 
  ShieldCheck, 
  CreditCard, 
  ArrowRight, 
  ArrowLeft,
  ShoppingCart, 
  Plus, 
  Search, 
  DollarSign, 
  Clock, 
  Phone, 
  Mail, 
  Key, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Zap, 
  Tag, 
  Sliders, 
  FileText, 
  Cpu, 
  Layers, 
  Barcode, 
  Radio, 
  Globe, 
  Eye, 
  EyeOff,
  Sparkles,
  Award,
  Wallet,
  ShoppingBag,
  TrendingUp,
  UserPlus
} from 'lucide-react';
import { 
  StoreSettings, 
  UserAccount, 
  Supplier, 
  Customer, 
  MarketOrder, 
  PurchaseInvoice, 
  Product, 
  SaleTransaction, 
  UserPermissions 
} from '../types';
import { SuppliersTab } from './SuppliersTab';
import { CustomersTab } from './CustomersTab';
import { OrdersTab } from './OrdersTab';
import { ReportsTab } from './ReportsTab';
import { syncWriteDocument, syncDeleteDocument } from '../lib/firestoreSync';

export type AccountsSubTab = 
  | 'hub'
  | 'pos'
  | 'cashierAccounts'
  | 'permissions'
  | 'suppliers'
  | 'customers'
  | 'orders';

interface AccountsHubTabProps {
  initialSubTab?: AccountsSubTab;
  settings: StoreSettings;
  currentUser?: UserAccount | null;
  userAccounts: UserAccount[];
  setUserAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  orders: MarketOrder[];
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  salesHistory: SaleTransaction[];
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  onOpenPOS: () => void;
  onOpenAddProductForSupplier?: (supplierId: string, supplierName: string) => void;
  onViewReceipt?: (sale: SaleTransaction) => void;
  onBackToDashboard?: () => void;
}

export const AccountsHubTab: React.FC<AccountsHubTabProps> = ({
  initialSubTab = 'hub',
  settings,
  currentUser,
  userAccounts,
  setUserAccounts,
  suppliers,
  setSuppliers,
  customers,
  setCustomers,
  orders,
  products,
  setProducts,
  salesHistory,
  purchaseInvoices,
  setPurchaseInvoices,
  onOpenPOS,
  onOpenAddProductForSupplier,
  onViewReceipt,
  onBackToDashboard,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const isRTL = isAr || isKu;
  const currency = settings.currencySymbol || (isAr ? 'د.ع' : isKu ? 'د.ع' : 'IQD');

  const [activeSubTab, setActiveSubTab] = useState<AccountsSubTab>(initialSubTab);

  // User & Permissions Management State
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserAccount | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [searchAccountQuery, setSearchAccountQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Admin' | 'Manager' | 'Cashier'>('all');
  
  // New User Form State
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Manager' | 'Cashier'>('Cashier');
  const [newPhone, setNewPhone] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Calculate Metrics
  const totalSuppliersCount = suppliers.length;
  const totalSupplierDebts = suppliers.reduce((acc, s) => acc + (s.totalDebt || 0), 0);

  const totalCustomersCount = customers.length;
  const totalCustomerDebts = customers.reduce((acc, c) => acc + (c.debtBalance || 0), 0);
  const totalLoyaltyPoints = customers.reduce((acc, c) => acc + (c.points || 0), 0);

  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  const totalStaffCount = userAccounts.length;
  const activeStaffCount = userAccounts.filter(u => u.active).length;

  const totalSalesAmount = salesHistory.reduce((acc, s) => acc + s.total, 0);

  // Permission definitions for the Permissions SubTab
  const permissionDefinitions = [
    { 
      key: 'canAccessPOS' as keyof UserPermissions, 
      labelAr: 'الكاشير والبيع السريع (POS)', 
      labelKu: 'کاشێر و فرۆشتنی خێرا (POS)', 
      labelEn: 'POS & Quick Sale', 
      descAr: 'إصدار الفواتير وطباعة الوصولات والخصومات', 
      descKu: 'دەرکردنی پسوولە، چاپکردنی وەسڵ و داشکاندن', 
      descEn: 'Issue invoices, print receipts and discounts', 
      icon: Zap, 
      getVal: (p?: UserPermissions) => p?.canAccessPOS ?? true 
    },
    { 
      key: 'canManageProducts' as keyof UserPermissions, 
      labelAr: 'الأصناف والمنتجات والمخزن', 
      labelKu: 'کاڵاکان و کۆگا', 
      labelEn: 'Products & Inventory', 
      descAr: 'إضافة وتعديل المنتجات وأسعار المفرد والجملة', 
      descKu: 'زیادکردن و دەستکاریکردنی کاڵاکان و نرخەکان', 
      descEn: 'Add and edit products, retail and wholesale prices', 
      icon: Tag, 
      getVal: (p?: UserPermissions) => p?.canManageProducts ?? false 
    },
    { 
      key: 'canAccessDashboard' as keyof UserPermissions, 
      labelAr: 'لوحة التحكم الرئيسية والمالية', 
      labelKu: 'داشبۆردی سەرەکی و دارایی', 
      labelEn: 'Main Overview Dashboard', 
      descAr: 'رؤية إجمالي أرباح اليوم والمبيعات والصندوق', 
      descKu: 'بینینی کۆی قازانجی ئەمڕۆ و فرۆش و سندووق', 
      descEn: 'View today\'s total profit, sales and cash drawer', 
      icon: Sliders, 
      getVal: (p?: UserPermissions) => p?.canAccessDashboard !== false 
    },
    { 
      key: 'canViewReports' as keyof UserPermissions, 
      labelAr: 'تقارير الأرباح والمبيعات', 
      labelKu: 'ڕاپۆرتەکانی قازانج و فرۆشتن', 
      labelEn: 'Profit & Sales Reports', 
      descAr: 'تصدير التقارير وتحليلات الأرباح اليومية والشهريّة', 
      descKu: 'دەرکردنی ڕاپۆرت و شیکاری قازانجی ڕۆژانە و مانگانە', 
      descEn: 'Export reports and daily/monthly profit analysis', 
      icon: FileText, 
      getVal: (p?: UserPermissions) => p?.canViewReports ?? false 
    },
    { 
      key: 'canViewAnalytics' as keyof UserPermissions, 
      labelAr: 'تحليلات الأداء والذكاء الاصطناعي', 
      labelKu: 'شیکاری ئەدای کار و زیرەکی دەستکرد', 
      labelEn: 'AI Analytics & Forecast', 
      descAr: 'استشارات الذكاء الاصطناعي وتحليل حركة المخزن', 
      descKu: 'ڕاوێژی زیرەکی دەستکرد و شیکاری جووڵەی کۆگا', 
      descEn: 'AI insights and inventory movement forecast', 
      icon: Cpu, 
      getVal: (p?: UserPermissions) => (p?.canViewAnalytics ?? p?.canViewReports) ?? false 
    },
    { 
      key: 'canManagePurchases' as keyof UserPermissions, 
      labelAr: 'فواتير الشراء والتجهيز', 
      labelKu: 'پسوولەکانی کڕین و دابینکردن', 
      labelEn: 'Purchase Invoices', 
      descAr: 'إدخال وجدول فواتير التجهيز والمشتريات والديون', 
      descKu: 'تۆمارکردنی پسوولەی کڕین، کەلوپەل و قەرزەکان', 
      descEn: 'Record supplier purchases, stock additions and debts', 
      icon: Layers, 
      getVal: (p?: UserPermissions) => (p?.canManagePurchases ?? p?.canManageProducts) ?? false 
    },
    { 
      key: 'canManageInventoryAudit' as keyof UserPermissions, 
      labelAr: 'جرد وتفتيش المخزون', 
      labelKu: 'جەرد و پشکنینی کۆگا', 
      labelEn: 'Stock Audit & Inventory', 
      descAr: 'فحص نواقص المواد وجرد كميات الرفوف والباركود', 
      descKu: 'پشکنینی کەمیی کاڵاکان و جەردی ڕەفەکان و بارکۆد', 
      descEn: 'Check shortages and shelf stock barcode audit', 
      icon: Barcode, 
      getVal: (p?: UserPermissions) => (p?.canManageInventoryAudit ?? p?.canManageProducts) ?? false 
    },
    { 
      key: 'canManageSuppliers' as keyof UserPermissions, 
      labelAr: 'سجل الموردين والشركات', 
      labelKu: 'تۆماری دابینکەران و کۆمپانیاکان', 
      labelEn: 'Suppliers & Vendors', 
      descAr: 'إدارة شركات التجهيز والمندوبين والحسابات الدائنة', 
      descKu: 'بەڕێوەبردنی کۆمپانیاکانی دابینکردن، نوێنەران و قەرزەکان', 
      descEn: 'Manage vendors, distributors and accounts payable', 
      icon: Radio, 
      getVal: (p?: UserPermissions) => p?.canManageSuppliers ?? false 
    },
    { 
      key: 'canManageCustomers' as keyof UserPermissions, 
      labelAr: 'إدارة العملاء والزبائن والديون', 
      labelKu: 'بەڕێوەبردنی کڕیاران و قەرزەکان', 
      labelEn: 'Customers & Loyalty', 
      descAr: 'تسجيل الديون والعملاء وبرنامج النقاط والولاء', 
      descKu: 'تۆمارکردنی کڕیاران، قەرز و خاڵەکانی پاداشت', 
      descEn: 'Manage customers, debts, and loyalty rewards', 
      icon: Users, 
      getVal: (p?: UserPermissions) => p?.canManageCustomers ?? true 
    },
    { 
      key: 'canViewInvoices' as keyof UserPermissions, 
      labelAr: 'سجل الفواتير والمقبوضات', 
      labelKu: 'تۆماری پسوولەکان و وەسڵەکان', 
      labelEn: 'Saved Sales Invoices', 
      descAr: 'استعراض الفواتير السابقة وإلغاء المبيعات', 
      descKu: 'بینینی پسوولەکانی پێشوو و هەڵوەشاندنەوەی فرۆشتن', 
      descEn: 'View past invoices and manage sales returns', 
      icon: CheckCircle2, 
      getVal: (p?: UserPermissions) => (p?.canViewInvoices ?? p?.canManageOrders) ?? false 
    },
    { 
      key: 'canManageOrders' as keyof UserPermissions, 
      labelAr: 'طلبات الشحنات والتوصيل', 
      labelKu: 'داواکارییەکانی بار و گەیاندن', 
      labelEn: 'Market Orders & Delivery', 
      descAr: 'متابعة الشحنات والطلبات الواردة للمتجر', 
      descKu: 'بەدواداچوونی گەیاندن و داواکارییە هاتووەکان', 
      descEn: 'Track market shipments and incoming orders', 
      icon: Globe, 
      getVal: (p?: UserPermissions) => p?.canManageOrders ?? false 
    },
    { 
      key: 'canManageSettings' as keyof UserPermissions, 
      labelAr: 'إدارة إعدادات المنظومة', 
      labelKu: 'ڕێکخستنەکانی سیستەم', 
      labelEn: 'System Settings', 
      descAr: 'التحكم بإعدادات المتجر والطابعات', 
      descKu: 'کۆنتڕۆڵکردنی ڕێکخستنی فرۆشگە و چاپکەرەکان', 
      descEn: 'Manage system settings and printers', 
      icon: ShieldAlert, 
      getVal: (p?: UserPermissions) => p?.canManageSettings ?? false 
    },
    { 
      key: 'canViewPurchasePriceInPOS' as keyof UserPermissions, 
      labelAr: 'إظهار سعر الشراء في سلة الكاشير (POS)', 
      labelKu: 'نیشاندانی نرخی کڕین لە شاشەی کاشێر (POS)', 
      labelEn: 'Show Purchase Price in POS Cart', 
      descAr: 'السماح لمستخدم الكاشير بمشاهدة سعر تكلفة وشراء المادة في السلة', 
      descKu: 'ڕێگەدان بە کاشێر بۆ بینینی نرخی تێچوو و کڕینی کاڵا لە سەبەتەدا', 
      descEn: 'Allow cashier to see item purchase and cost price in sales cart', 
      icon: DollarSign, 
      getVal: (p?: UserPermissions) => p?.canViewPurchasePriceInPOS ?? false 
    },
  ];

  // Handle toggling single permission
  const handleTogglePermission = (userId: string, permKey: keyof UserPermissions) => {
    setUserAccounts(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const currentVal = u.permissions ? (u.permissions as any)[permKey] : false;
      const updatedPermissions: UserPermissions = {
        ...u.permissions,
        [permKey]: !currentVal
      };
      const updatedUser = { ...u, permissions: updatedPermissions };
      syncWriteDocument('users', userId, updatedUser);
      return updatedUser;
    }));
  };

  // Handle toggling user active status
  const handleToggleUserActive = (userId: string) => {
    setUserAccounts(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const updatedUser = { ...u, active: !u.active };
      syncWriteDocument('users', userId, updatedUser);
      return updatedUser;
    }));
  };

  // Handle Create User Account
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newUsername.trim()) {
      alert(isAr ? 'يرجى إدخال الاسم واسم المستخدم' : 'Please enter name and username');
      return;
    }

    const defaultPerms: UserPermissions = newRole === 'Admin' ? {
      canAccessDashboard: true,
      canAccessPOS: true,
      canManageProducts: true,
      canManageInventoryAudit: true,
      canManagePurchases: true,
      canManageSuppliers: true,
      canManageCustomers: true,
      canManageOrders: true,
      canViewInvoices: true,
      canViewAnalytics: true,
      canViewReports: true,
      canManageSettings: true,
      canViewPurchasePriceInPOS: true,
    } : newRole === 'Manager' ? {
      canAccessDashboard: true,
      canAccessPOS: true,
      canManageProducts: true,
      canManageInventoryAudit: true,
      canManagePurchases: true,
      canManageSuppliers: true,
      canManageCustomers: true,
      canManageOrders: true,
      canViewInvoices: true,
      canViewAnalytics: true,
      canViewReports: true,
      canManageSettings: false,
      canViewPurchasePriceInPOS: false,
    } : {
      canAccessDashboard: false,
      canAccessPOS: true,
      canManageProducts: false,
      canManageInventoryAudit: false,
      canManagePurchases: false,
      canManageSuppliers: false,
      canManageCustomers: true,
      canManageOrders: true,
      canViewInvoices: false,
      canViewAnalytics: false,
      canViewReports: false,
      canManageSettings: false,
      canViewPurchasePriceInPOS: false,
    };

    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      fullName: newFullName.trim(),
      username: newUsername.trim(),
      email: `${newUsername.trim().toLowerCase()}@pos.local`,
      password: newPassword.trim() || '123',
      role: newRole,
      active: true,
      createdAt: new Date().toISOString().split('T')[0],
      phone: newPhone.trim() || undefined,
      specialization: newSpecialization.trim() || undefined,
      permissions: defaultPerms
    };

    setUserAccounts(prev => [...prev, newUser]);
    syncWriteDocument('users', newUser.id, newUser);

    // Reset Form
    setNewFullName('');
    setNewUsername('');
    setNewPassword('');
    setNewPhone('');
    setNewSpecialization('');
    setNewRole('Cashier');
    setIsAddUserModalOpen(false);
  };

  // Handle Delete User
  const handleDeleteUser = (userId: string, name: string) => {
    if (confirm(isKu ? `دڵنیایت لە سڕینەوەی هەژماری (${name})؟` : isAr ? `هل أنت متأكد من حذف حساب (${name})؟` : `Delete account ${name}?`)) {
      setUserAccounts(prev => prev.filter(u => u.id !== userId));
      syncDeleteDocument('users', userId);
    }
  };

  // Filtered Users
  const filteredUsers = userAccounts.filter(u => {
    const matchesSearch = 
      (u.fullName || '').toLowerCase().includes(searchAccountQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchAccountQuery.toLowerCase()) ||
      (u.phone || '').includes(searchAccountQuery);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050813] text-slate-100 overflow-hidden">
      
      {/* Top Header & SubTab Bar */}
      <div className="bg-[#090F1E] border-b border-cyan-500/20 px-4 py-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Title & Back to Hub */}
          <div className="flex items-center gap-3">
            {activeSubTab !== 'hub' && (
              <button
                type="button"
                onClick={() => setActiveSubTab('hub')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border border-slate-700 active:scale-95"
              >
                <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                <span>{isKu ? 'پێڕستی سەرەکی هەژمارەکان' : isAr ? 'رئيسية الحسابات والجهات' : 'Accounts Hub'}</span>
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-black text-white flex items-center gap-2">
                  <span>{isKu ? 'هەژمارەکان و لایەنەکان' : isAr ? 'الحسابات والجهات' : 'Accounts & Relations'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    HUB
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  {isKu 
                    ? 'بەڕێوەبردنی کاشێر، دابینکەران، کڕیاران، داواکارییەکان، کەشف حیساب و دەسەڵاتەکان' 
                    : isAr 
                    ? 'إدارة الكاشير، الموردين، العملاء، الطلبات، كشوفات الحسابات وصلاحيات المستخدمين' 
                    : 'Manage POS, Cashiers, Suppliers, Customers, Orders & User Permissions'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick SubTab Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar max-w-full pb-1 sm:pb-0">
            {/* 1. كاشير */}
            <button
              type="button"
              onClick={() => {
                onOpenPOS();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 shrink-0"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-white" />
              <span>{isKu ? 'کاشێر' : isAr ? 'كاشير' : 'Cashier POS'}</span>
            </button>

            {/* 2. حسابات كاشير */}
            <button
              type="button"
              onClick={() => setActiveSubTab('cashierAccounts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === 'cashierAccounts'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isKu ? 'کەشف حیسابی کاشێر' : isAr ? 'حسابات كاشير' : 'Cashier Shifts'}</span>
            </button>

            {/* 3. الصلاحيات والمستخدمين */}
            <button
              type="button"
              onClick={() => setActiveSubTab('permissions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === 'permissions'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>{isKu ? 'دەسەڵاتەکان و بەکارهێنەران' : isAr ? 'صلاحيات وحسابات المستخدمين' : 'Permissions & Users'}</span>
            </button>

            {/* 4. دابینکەران و کۆمپانیاکان */}
            <button
              type="button"
              onClick={() => setActiveSubTab('suppliers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === 'suppliers'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isKu ? 'دابینکەران و کۆمپانیاکان' : isAr ? 'الموردين والشركات' : 'Suppliers'}</span>
            </button>

            {/* 5. کڕیاران و بەرنامەی دڵسۆزی */}
            <button
              type="button"
              onClick={() => setActiveSubTab('customers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === 'customers'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-pink-400" />
              <span>{isKu ? 'کڕیاران و بەرنامەی دڵسۆزی' : isAr ? 'العملاء وبرنامج الولاء' : 'Customers'}</span>
            </button>

            {/* 6. داواکارییەکان و گەیاندن */}
            <button
              type="button"
              onClick={() => setActiveSubTab('orders')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === 'orders'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>{isKu ? 'داواکارییەکان و گەیاندن' : isAr ? 'الطلبات والتوصيل' : 'Orders'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5">

        {/* 1. HUB OVERVIEW (Cards Portal Grid) */}
        {activeSubTab === 'hub' && (
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
            
            {/* Top Quick Action Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-[#0B1528] to-blue-950/60 border border-cyan-500/30 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold">
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                      <span>{isKu ? 'ناوەندی هەژمارەکان' : isAr ? 'بوابة الحسابات' : 'Accounts Portal'}</span>
                    </span>
                    <h2 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-tight">
                      {isKu ? 'بەڕێوەبردنی تەواوی لایەنەکان و کەشف حیساب' : isAr ? 'الإدارة الشاملة للجهات وكشوفات الحسابات' : 'Comprehensive Entities & Account Management'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300">
                    {isKu 
                      ? 'ڕێکخستنی خێرای فرۆشتنی کاشێر، هەژماری کۆمپانیاکان و کڕیاران، داواکارییەکان و پێدانی دەسەڵات بە بەکارهێنەران.' 
                      : isAr 
                      ? 'الوصول المباشر لنقاط بيع الكاشير، كشوفات الحسابات، ديون الموردين والزبائن، ومصفوفة صلاحيات طاقم العمل.' 
                      : 'Quick access to POS cashiers, shift audits, vendor & customer ledgers, and staff permission matrices.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={onOpenPOS}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4 text-slate-950" />
                    <span>{isKu ? 'کردنەوەی کاشێر' : isAr ? 'فتح الكاشير (POS)' : 'Open Cashier POS'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('permissions')}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-[#121E36] hover:bg-[#182949] border border-cyan-500/40 text-cyan-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <UserPlus className="w-4 h-4 text-cyan-400" />
                    <span>{isKu ? 'زیادکردنی بەکارهێنەر' : isAr ? 'إضافة مستخدم' : 'New User'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Compact Action Buttons Grid: ONLY Icon & Button Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              
              {/* BUTTON 1: كاشير (کاشێری خێرا - POS) */}
              <button
                type="button"
                onClick={onOpenPOS}
                className="group relative bg-[#0C1B33] hover:bg-[#102445] active:scale-[0.98] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-between gap-3 text-start w-full"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                    <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm lg:text-base font-black text-white group-hover:text-emerald-300 transition-colors leading-tight">
                      {isKu ? 'کاشێر (کاشێری خێرا - POS)' : isAr ? 'كاشير (نقطة البيع السريع)' : 'Cashier (POS System)'}
                    </h3>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors shrink-0">
                  {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </button>

              {/* BUTTON 2: حسابات كاشير (کەشف حیسابی کاشێرەکان) */}
              <button
                type="button"
                onClick={() => setActiveSubTab('cashierAccounts')}
                className="group relative bg-[#0D182E] hover:bg-[#122242] active:scale-[0.98] border border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-between gap-3 text-start w-full"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0">
                    <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm lg:text-base font-black text-white group-hover:text-cyan-300 transition-colors leading-tight">
                      {isKu ? 'کەشف حیسابی کاشێرەکان' : isAr ? 'حسابات كاشير (كشف حسابات الكاشيرية)' : 'Cashier Shift Reports'}
                    </h3>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 text-cyan-400 flex items-center justify-center transition-colors shrink-0">
                  {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </button>

              {/* BUTTON 3: الصلاحيات والمستخدمين (دەسەڵاتەکان و بەکارهێنەران) */}
              <button
                type="button"
                onClick={() => setActiveSubTab('permissions')}
                className="group relative bg-[#131130] hover:bg-[#1B1845] active:scale-[0.98] border border-purple-500/40 hover:border-purple-400 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-between gap-3 text-start w-full"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform shrink-0">
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm lg:text-base font-black text-white group-hover:text-purple-300 transition-colors leading-tight">
                      {isKu ? 'دەسەڵاتەکان و بەکارهێنەران' : isAr ? 'صلاحيات وحسابات المستخدمين' : 'User Permissions & Accounts'}
                    </h3>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 text-purple-400 flex items-center justify-center transition-colors shrink-0">
                  {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </button>

              {/* BUTTON 4: دابینکەران و کۆمپانیاکان (الموردين والشركات) */}
              <button
                type="button"
                onClick={() => setActiveSubTab('suppliers')}
                className="group relative bg-[#0F172A] hover:bg-[#162340] active:scale-[0.98] border border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-between gap-3 text-start w-full"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                    <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm lg:text-base font-black text-white group-hover:text-indigo-300 transition-colors leading-tight">
                      {isKu ? 'دابینکەران و کۆمپانیاکان' : isAr ? 'الموردين والشركات' : 'Suppliers & Vendors'}
                    </h3>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center transition-colors shrink-0">
                  {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </button>

              {/* BUTTON 5: کڕیاران و بەرنامەی دڵسۆزی (العملاء وبرنامج الولاء) */}
              <button
                type="button"
                onClick={() => setActiveSubTab('customers')}
                className="group relative bg-[#1C1022] hover:bg-[#281730] active:scale-[0.98] border border-pink-500/40 hover:border-pink-400 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-between gap-3 text-start w-full"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform shrink-0">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm lg:text-base font-black text-white group-hover:text-pink-300 transition-colors leading-tight">
                      {isKu ? 'کڕیاران و بەرنامەی دڵسۆزی' : isAr ? 'العملاء وبرنامج الولاء' : 'Customers & Loyalty'}
                    </h3>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-lg bg-pink-500/10 group-hover:bg-pink-500/20 text-pink-400 flex items-center justify-center transition-colors shrink-0">
                  {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </button>

              {/* BUTTON 6: داواکارییەکان و گەیاندن (الطلبات والتوصيل) */}
              <button
                type="button"
                onClick={() => setActiveSubTab('orders')}
                className="group relative bg-[#1C160B] hover:bg-[#2A2111] active:scale-[0.98] border border-amber-500/40 hover:border-amber-400 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-between gap-3 text-start w-full"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                    <Store className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm lg:text-base font-black text-white group-hover:text-amber-300 transition-colors leading-tight">
                      {isKu ? 'داواکارییەکان و گەیاندن' : isAr ? 'الطلبات والتوصيل' : 'Orders & Delivery'}
                    </h3>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 text-amber-400 flex items-center justify-center transition-colors shrink-0">
                  {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </button>

            </div>

          </div>
        )}

        {/* 2. SUBTAB: SUPPLIERS */}
        {activeSubTab === 'suppliers' && (
          <div className="h-full">
            <SuppliersTab
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              products={products}
              setProducts={setProducts}
              purchaseInvoices={purchaseInvoices}
              setPurchaseInvoices={setPurchaseInvoices}
              settings={settings}
              onOpenAddProductForSupplier={onOpenAddProductForSupplier}
            />
          </div>
        )}

        {/* 3. SUBTAB: CUSTOMERS */}
        {activeSubTab === 'customers' && (
          <div className="h-full">
            <CustomersTab
              customers={customers}
              setCustomers={setCustomers}
              settings={settings}
            />
          </div>
        )}

        {/* 4. SUBTAB: ORDERS */}
        {activeSubTab === 'orders' && (
          <div className="h-full">
            <OrdersTab
              orders={orders}
              settings={settings}
            />
          </div>
        )}

        {/* 5. SUBTAB: CASHIER ACCOUNTS */}
        {activeSubTab === 'cashierAccounts' && (
          <div className="h-full">
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
              onOpenShiftReport={() => {}}
              onOpenAccountsModal={() => {}}
              onViewReceipt={onViewReceipt}
              onBackToDashboard={() => setActiveSubTab('hub')}
            />
          </div>
        )}

        {/* 6. SUBTAB: PERMISSIONS & USER ACCOUNTS MANAGEMENT */}
        {activeSubTab === 'permissions' && (
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header & Action Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#090F1E] p-4 sm:p-5 rounded-3xl border border-cyan-500/30 shadow-xl">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <span>{isKu ? 'بەڕێوەبردنی هەژمارەکان و دەسەڵاتەکان' : isAr ? 'إدارة حسابات الطاقم ومصفوفة الصلاحيات' : 'User Accounts & Permission Matrix'}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isKu 
                    ? 'دیاریکردنی دەسەڵاتی هەر بەکارهێنەرێک بۆ بینین و دەستکاری بەشەکانی سیستەم' 
                    : isAr 
                    ? 'التحكم الدقيق بصلاحيات كل مستخدم (كاشير / مدير / مسؤول) للوصول للأقسام والوظائف' 
                    : 'Configure access controls and permissions for cashiers, managers and admins.'}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isKu ? 'زیادکردنی هەژماری نوێ' : isAr ? 'إضافة حساب جديد' : 'Add New Account'}</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D1527] p-3 rounded-2xl border border-slate-800">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchAccountQuery}
                  onChange={(e) => setSearchAccountQuery(e.target.value)}
                  placeholder={isKu ? 'گەڕان بەپێی ناو، ناوی بەکارهێنەر یان ژمارە...' : isAr ? 'بحث بالاسم، اسم المستخدم أو الهاتف...' : 'Search users...'}
                  className="w-full bg-[#050813] text-slate-100 text-xs py-2 pl-9 pr-3 rtl:pl-3 rtl:pr-9 rounded-xl border border-slate-700/60 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-[#050813] p-1 rounded-xl border border-slate-800">
                {(['all', 'Admin', 'Manager', 'Cashier'] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(role)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      roleFilter === role 
                        ? 'bg-purple-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {role === 'all' 
                      ? (isKu ? 'هەموو' : isAr ? 'الكل' : 'All') 
                      : role === 'Admin' 
                      ? (isKu ? 'بەڕێوەبەر' : isAr ? 'أدمن' : 'Admin')
                      : role === 'Manager' 
                      ? (isKu ? 'سەرپەرشتیار' : isAr ? 'مدير' : 'Manager')
                      : (isKu ? 'کاشێر' : isAr ? 'كاشير' : 'Cashier')}
                  </button>
                ))}
              </div>
            </div>

            {/* Users List & Interactive Permissions Matrix */}
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center bg-[#090F1E] rounded-3xl border border-slate-800 text-slate-400 text-xs">
                  {isKu ? 'هیچ هەژمارێک نەدۆزرایەوە' : isAr ? 'لم يتم العثور على أي مستخدمين' : 'No user accounts found'}
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isAdmin = user.role === 'Admin';
                  const isManager = user.role === 'Manager';
                  const isCashier = user.role === 'Cashier';

                  return (
                    <div 
                      key={user.id}
                      className="p-5 rounded-3xl bg-[#090F1E] border border-cyan-500/20 hover:border-cyan-500/40 transition-all shadow-xl space-y-4"
                    >
                      {/* User Top Info Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.fullName}
                                className="w-12 h-12 rounded-2xl object-cover border border-cyan-500/40 bg-slate-800 shadow"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 flex items-center justify-center font-black text-white text-base shadow">
                                {user.fullName.charAt(0)}
                              </div>
                            )}
                            <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#090F1E] ${user.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-white">{user.fullName}</h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isAdmin 
                                  ? 'bg-purple-950 text-purple-300 border border-purple-500/30' 
                                  : isManager 
                                  ? 'bg-blue-950 text-blue-300 border border-blue-500/30' 
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {user.role}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-mono">
                              <span>@{user.username}</span>
                              {user.phone && <span>• {user.phone}</span>}
                              {user.specialization && <span className="text-cyan-400">• {user.specialization}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Status Toggle & Delete Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(user.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              user.active 
                                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' 
                                : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                            }`}
                          >
                            {user.active ? (isKu ? 'چالاک' : isAr ? 'نشط' : 'Active') : (isKu ? 'ناچالاک' : isAr ? 'معطل' : 'Disabled')}
                          </button>

                          {user.role !== 'Admin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id, user.fullName)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-all cursor-pointer"
                              title={isKu ? 'سڕینەوە' : isAr ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Permissions Matrix Pills Grid */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 mb-2.5 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{isKu ? 'دەسەڵاتەکان و مافەکانی گەیشتن:' : isAr ? 'صلاحيات الحساب والوصول للأقسام:' : 'Assigned Permissions:'}</span>
                          {isAdmin && (
                            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                              {isKu ? 'بەڕێوەبەری سەرەکی خاوەنی هەموو دەسەڵاتەکانە' : isAr ? 'الأدمن يملك كافة الصلاحيات تلقائياً' : 'Admin has all permissions by default'}
                            </span>
                          )}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {permissionDefinitions.map((perm) => {
                            const isGranted = isAdmin ? true : perm.getVal(user.permissions);
                            const IconComponent = perm.icon;

                            return (
                              <div
                                key={perm.key}
                                onClick={() => {
                                  if (!isAdmin) {
                                    handleTogglePermission(user.id, perm.key);
                                  }
                                }}
                                className={`p-2.5 rounded-2xl border transition-all flex items-start gap-2.5 select-none ${
                                  isAdmin 
                                    ? 'bg-[#060A14] border-purple-500/30 opacity-80 cursor-default' 
                                    : isGranted
                                    ? 'bg-cyan-950/30 border-cyan-500/50 hover:bg-cyan-950/50 cursor-pointer shadow-sm shadow-cyan-500/10'
                                    : 'bg-[#060A14] border-slate-800 hover:border-slate-700 text-slate-500 cursor-pointer opacity-60'
                                }`}
                              >
                                <div className={`p-1.5 rounded-xl shrink-0 ${
                                  isGranted ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
                                }`}>
                                  <IconComponent className="w-4 h-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-xs font-bold truncate ${isGranted ? 'text-white' : 'text-slate-400'}`}>
                                      {isKu ? perm.labelKu : isAr ? perm.labelAr : perm.labelEn}
                                    </span>
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${isGranted ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-slate-700'}`} />
                                  </div>
                                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                    {isKu ? perm.descKu : isAr ? perm.descAr : perm.descEn}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

      </div>

      {/* MODAL: ADD USER ACCOUNT */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#090F1E] border border-cyan-500/40 rounded-3xl p-6 space-y-5 shadow-2xl animate-scale-up">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                <span>{isKu ? 'دروستکردنی هەژماری نوێ' : isAr ? 'إضافة مستخدم جديد للمنظومة' : 'Create New Account'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isKu ? 'ناوی تەواو' : isAr ? 'الاسم الكامل' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder={isKu ? 'ناوی کارمەند...' : isAr ? 'اسم الموظف أو الكاشير...' : 'Full name...'}
                  className="w-full bg-[#050813] text-slate-100 text-xs py-2.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isKu ? 'ناوی بەکارهێنەر (Username)' : isAr ? 'اسم المستخدم للدخول (Username)' : 'Username'} *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="cashier1"
                  className="w-full bg-[#050813] text-slate-100 text-xs font-mono py-2.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isKu ? 'ڕەمزی نهێنی / PIN' : isAr ? 'كلمة المرور أو رمز الـ PIN' : 'Password / PIN'} *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-[#050813] text-slate-100 text-xs font-mono py-2.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ڕۆڵ / پلە' : isAr ? 'الدور / الرتبة' : 'Role'}
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-[#050813] text-slate-100 text-xs py-2.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Cashier">{isKu ? 'کاشێر' : isAr ? 'كاشير' : 'Cashier'}</option>
                    <option value="Manager">{isKu ? 'سەرپەرشتیار' : isAr ? 'مدير' : 'Manager'}</option>
                    <option value="Admin">{isKu ? 'بەڕێوەبەر' : isAr ? 'أدمن' : 'Admin'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isKu ? 'ژمارەی مۆبایل' : isAr ? 'رقم الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0770..."
                    className="w-full bg-[#050813] text-slate-100 text-xs font-mono py-2.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  {isKu ? 'پاشگەزبوونەوە' : isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-purple-500/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  {isKu ? 'دروستکردنی هەژمار' : isAr ? 'حفظ وإنشاء الحساب' : 'Create Account'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
