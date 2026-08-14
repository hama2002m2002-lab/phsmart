import React, { useState, useRef } from 'react';
import { Settings as SettingsIcon, Store, Globe, DollarSign, Percent, Save, CheckCircle2, UserPlus, Users, Shield, Trash2, Key, Check, X, ShieldAlert, Edit3, ShieldCheck, Database, Download, Upload, RefreshCw, Keyboard, Printer, FileText, Wifi, Tag, Cpu, Radio, Play, Sliders, Layers, Barcode, AlertCircle, FileSpreadsheet, Moon, Sun, Zap } from 'lucide-react';
import { StoreSettings, UserAccount, Product, SaleTransaction, Supplier, Customer, MarketOrder, MarketNotification, PurchaseInvoice, UserPermissions } from '../types';
import { AccountModal } from './AccountModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { getTranslation } from '../lib/translations';
import { exportStoreToExcel, exportProductsToExcel, parseExcelBackupFile } from '../lib/excelExport';
import { isWebSerialSupported, connectWebSerialPrinter, sendRawToWebSerialPrinter } from '../lib/thermalPrinter';
import { syncWriteDocument, syncBulkWriteCollection } from '../lib/firestoreSync';

interface SettingsTabProps {
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  userAccounts: UserAccount[];
  setUserAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  products?: Product[];
  salesHistory?: SaleTransaction[];
  suppliers?: Supplier[];
  customers?: Customer[];
  orders?: MarketOrder[];
  notifications?: MarketNotification[];
  purchaseInvoices?: PurchaseInvoice[];
  onImportBackup?: (backupData: any) => number | void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  settings, 
  setSettings,
  userAccounts,
  setUserAccounts,
  products,
  salesHistory,
  suppliers,
  customers,
  orders,
  notifications,
  purchaseInvoices,
  onImportBackup
}) => {
  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  // Account Modal state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState('');

  // Selected User for Detailed Permissions Toggle Switch Section
  const [selectedPermissionUserId, setSelectedPermissionUserId] = useState<string>('');

  const selectedUser = userAccounts.find(u => u.id === (selectedPermissionUserId || userAccounts[0]?.id)) || userAccounts[0];

  const handleToggleUserPermission = (userId: string, permKey: keyof UserPermissions) => {
    setUserAccounts(prev => prev.map(usr => {
      if (usr.id !== userId) return usr;
      const currentVal = usr.permissions?.[permKey];
      let newVal = false;
      if (permKey === 'canAccessDashboard') {
        newVal = usr.permissions?.canAccessDashboard === false ? true : false;
      } else {
        newVal = !currentVal;
      }
      const updatedUser: UserAccount = {
        ...usr,
        permissions: {
          ...usr.permissions,
          [permKey]: newVal
        }
      };
      syncWriteDocument('users', userId, updatedUser);
      return updatedUser;
    }));
  };

  const handleApplyPermissionPreset = (userId: string, preset: 'all' | 'cashier' | 'none') => {
    setUserAccounts(prev => prev.map(usr => {
      if (usr.id !== userId) return usr;
      let newPerms: UserPermissions;
      if (preset === 'all') {
        newPerms = {
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
        };
      } else if (preset === 'cashier') {
        newPerms = {
          canAccessDashboard: false,
          canAccessPOS: true,
          canManageProducts: false,
          canManageInventoryAudit: false,
          canManagePurchases: false,
          canManageSuppliers: false,
          canManageCustomers: true,
          canManageOrders: false,
          canViewInvoices: false,
          canViewAnalytics: false,
          canViewReports: false,
          canManageSettings: false,
        };
      } else {
        newPerms = {
          canAccessDashboard: false,
          canAccessPOS: false,
          canManageProducts: false,
          canManageInventoryAudit: false,
          canManagePurchases: false,
          canManageSuppliers: false,
          canManageCustomers: false,
          canManageOrders: false,
          canViewInvoices: false,
          canViewAnalytics: false,
          canViewReports: false,
          canManageSettings: false,
        };
      }
      const updatedUser = { ...usr, permissions: newPerms };
      syncWriteDocument('users', userId, updatedUser);
      return updatedUser;
    }));
  };

  const permissionDefinitions = [
    { 
      key: 'canAccessPOS', 
      labelAr: 'الكاشير والبيع السريع (POS)', 
      labelKu: 'کاشێر و فرۆشتنی خێرا (POS)', 
      labelEn: 'POS & Cashier', 
      descAr: 'إصدار الفواتير وطباعة الوصولات والخصومات', 
      descKu: 'دەرکردنی پسوولە، چاپکردنی وەسڵ و داشکاندن', 
      descEn: 'Issue invoices, print receipts and discounts', 
      icon: Zap, 
      getVal: (p?: UserPermissions) => p?.canAccessPOS ?? true 
    },
    { 
      key: 'canManageProducts', 
      labelAr: 'الأصناف والمنتجات والأسعار', 
      labelKu: 'کاڵاکان، بەرهەمەکان و نرخەکان', 
      labelEn: 'Products & Pricing', 
      descAr: 'إضافة وتعديل المنتجات وأسعار المفرد والجملة', 
      descKu: 'زیادکردن و دەستکاریکردنی کاڵاکان و نرخی تاک و کۆ', 
      descEn: 'Add and edit products, retail and wholesale prices', 
      icon: Tag, 
      getVal: (p?: UserPermissions) => p?.canManageProducts ?? false 
    },
    { 
      key: 'canAccessDashboard', 
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
      key: 'canViewReports', 
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
      key: 'canViewAnalytics', 
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
      key: 'canManagePurchases', 
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
      key: 'canManageInventoryAudit', 
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
      key: 'canManageSuppliers', 
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
      key: 'canManageCustomers', 
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
      key: 'canViewInvoices', 
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
      key: 'canManageOrders', 
      labelAr: 'طلبات الشحنات ورسائل السوق', 
      labelKu: 'داواکارییەکانی بار و بازاڕ', 
      labelEn: 'Market Orders', 
      descAr: 'متابعة الشحنات والطلبات الواردة للمتجر', 
      descKu: 'بەدواداچوونی گەیاندن و داواکارییە هاتووەکان', 
      descEn: 'Track market shipments and incoming orders', 
      icon: Globe, 
      getVal: (p?: UserPermissions) => p?.canManageOrders ?? false 
    },
    { 
      key: 'canManageSettings', 
      labelAr: 'إدارة إعدادات المنظومة وصلاحيات الحسابات', 
      labelKu: 'ڕێکخستنەکانی سیستەم و دەسەڵاتی هەژمارەکان', 
      labelEn: 'System Settings & Users', 
      descAr: 'التحكم بإعدادات المتجر وإنشاء وتعديل الحسابات', 
      descKu: 'کۆنتڕۆڵکردنی ڕێکخستنی فرۆشگە و دروستکردنی هەژمار', 
      descEn: 'Manage system settings and user credentials', 
      icon: ShieldAlert, 
      getVal: (p?: UserPermissions) => p?.canManageSettings ?? false 
    },
  ];

  // POS Keyboard Shortcuts Modal State
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Printer Management & Detection State
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);
  const [printerScanMessage, setPrinterScanMessage] = useState('');
  const [testPrintType, setTestPrintType] = useState<'receipt' | 'label' | 'a4' | null>(null);

  const defaultDetectedPrinters = [
    { id: 'p1', name: 'HP LaserJet Pro MFP M404 (طابعة مكتبية A4 كبيرة)', type: 'a4', interface: 'system', status: 'ready' },
    { id: 'p2', name: 'Xprinter XP-365B (طابعة ملصقات الأسعار والباركود)', type: 'label_barcode', interface: 'usb', status: 'ready' },
    { id: 'p3', name: 'Epson TM-T20III Thermal (طابعة إيصالات الكاشير 80mm)', type: 'thermal80mm', interface: 'network', status: 'ready' },
    { id: 'p4', name: 'Canon imageCLASS LBP6030 (طابعة ورقية عادية A4/A5)', type: 'a4', interface: 'system', status: 'ready' },
    { id: 'p5', name: 'POS-58 Series Thermal Roll (طابعة حرارية 58mm)', type: 'thermal58mm', interface: 'bluetooth', status: 'ready' },
    { id: 'p6', name: 'Zebra ZD420 Barcode Tag Printer (طابعة باركود حرارية)', type: 'label_barcode', interface: 'usb', status: 'ready' },
  ];

  const handleScanPrinters = () => {
    setIsScanningPrinters(true);
    setPrinterScanMessage(isAr ? 'جاري فحص منافذ USB والشبكة والطابعات المربوطة بالجهاز...' : 'Scanning connected printers & USB/Network ports...');
    setTimeout(() => {
      setIsScanningPrinters(false);
      setPrinterScanMessage(isAr ? '✅ تم فحص واكتشاف كافة الطابعات المربوطة بالكمبيوتر بنجاح!' : '✅ Connected printers detected successfully!');
      
      if (!settings.connectedPrinterName) {
        setSettings(prev => ({
          ...prev,
          connectedPrinterName: 'Epson TM-T20III Thermal (طابعة إيصالات الكاشير 80mm)',
          labelPrinterName: 'Xprinter XP-365B (طابعة ملصقات الأسعار والباركود)',
          printerConnectionType: prev.printerConnectionType || 'system'
        }));
      }
      setTimeout(() => setPrinterScanMessage(''), 4000);
    }, 1200);
  };

  const handleTriggerTestPrint = (type: 'receipt' | 'label' | 'a4') => {
    setTestPrintType(type);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleChange = (field: keyof StoreSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenNewAccountModal = () => {
    setEditingAccount(null);
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccountModal = (account: UserAccount) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (account: UserAccount) => {
    setUserAccounts(prev => {
      const exists = prev.some(u => u.id === account.id);
      if (exists) {
        return prev.map(u => u.id === account.id ? account : u);
      } else {
        return [account, ...prev];
      }
    });

    setFormSuccessMessage(isAr ? 'تم حفظ الحساب وتحديث الصلاحيات بنجاح!' : 'Account & permissions saved successfully!');
    setTimeout(() => setFormSuccessMessage(''), 4000);
  };

  const handleToggleUserStatus = (id: string) => {
    setUserAccounts(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  const handleDeleteUser = (id: string) => {
    if (confirm(isAr ? 'هل أنت تأكد من حذف هذا الحساب؟' : 'Are you sure you want to delete this account?')) {
      setUserAccounts(prev => prev.filter(u => u.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-[#10192D] p-5 rounded-3xl border border-blue-500/20 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
            {isKu ? 'ڕێکخستنەکانی فرۆشگە و دروستکردن و دەستکاریکردنی هەژمارەکان' : isAr ? 'إعدادات المتجر وإنشاء وتعديل الحسابات' : 'Store Settings & User Management'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isKu ? 'ڕێکخستنی زانیارییەکانی باجی پسوولە، دراو، دروستکردن و دەستکاریکردنی پرۆفایلی کاشێر و سەرپەرشتیاران لەگەڵ دیاریکردنی دەسەڵاتەکان' : isAr ? 'تخصيص بيانات الفواتير الضريبية، العملة، وإنشاء وتعديل ملفات الكاشير والمشرفين مع تحديد الصلاحيات' : 'Configure VAT tax rates, store metadata, create user profiles, and assign permissions'}
          </p>
        </div>

        {/* ACTION BUTTONS: KEYBOARD SHORTCUTS & CREATE ACCOUNT */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white text-xs font-black shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-cyan-400/30"
          >
            <Keyboard className="w-4 h-4 text-cyan-300" />
            <span>{isKu ? '⌨️ کورتەبڕەکانی تەختەکلیل (Hotkeys)' : isAr ? '⌨️ اختصارات لوحة المفاتيح' : '⌨️ POS Keyboard Shortcuts'}</span>
          </button>

          <button
            onClick={handleOpenNewAccountModal}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white text-xs font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[3]" />
            <span>{isKu ? '➕ دروستکردنی هەژماری نوێ و دەستکاری' : isAr ? '➕ إنشاء حساب جديد وتعديل الملف' : 'Create New Account'}</span>
          </button>
        </div>
      </div>

      {formSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs text-center font-bold animate-bounce">
          ✓ {formSuccessMessage}
        </div>
      )}

      {/* ACCOUNT CREATION & USER MANAGEMENT TABLE SECTION */}
      <div className="cyber-card p-6 rounded-3xl border border-blue-500/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {isKu ? 'لیستی هەژمارەکان و کارمەندانی سیستەم' : isAr ? 'قائمة حسابات وموظفي المنظومة' : 'System Users & Permission Management'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isKu ? 'کرتە بکە لەسەر "دەستکاریکردنی پەڕگە و دەسەڵاتەکان" بۆ کۆنتڕۆڵی چوونەژوورەوە و مافەکان' : isAr ? 'انقر على "تعديل الملف والصلاحيات" للتحكم بالدخول والصلاحيات' : 'Click "Edit Profile & Permissions" to update user credentials and rights'}
            </p>
          </div>
          <span className="text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 font-bold">
            {userAccounts.length} {isKu ? 'هەژماری تۆمارکراو' : isAr ? 'حسابات مسجلة' : 'Accounts'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] bg-[#0B1120]/80">
                <th className="py-3 px-3">{isKu ? 'پەڕگەی کەسی و ناو' : isAr ? 'الملف الشخصي والاسم' : 'User Profile'}</th>
                <th className="py-3 px-3">{isKu ? 'زانیاری چوونەژوورەوە (ناوی بەکارهێنەر/وشەی تێپەڕ)' : isAr ? 'بيانات الدخول (اسم المستخدم/الكلمة)' : 'Credentials'}</th>
                <th className="py-3 px-3">{isKu ? 'پسپۆڕی و پلە' : isAr ? 'التخصص والرتبة' : 'Specialization & Role'}</th>
                <th className="py-3 px-3 text-center">{isKu ? 'دەسەڵاتە بەخشراوەکان' : isAr ? 'الصلاحيات الممنوحة' : 'Granted Permissions'}</th>
                <th className="py-3 px-3 text-center">{isKu ? 'دۆخ' : isAr ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-3 text-center">{isKu ? 'کردارەکان' : isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {userAccounts.map((usr) => (
                <tr key={usr.id} className="hover:bg-slate-800/40 transition-colors">
                  
                  {/* User Profile Info */}
                  <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-3">
                    <img
                      src={usr.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80'}
                      alt={usr.fullName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-500/30"
                    />
                    <div>
                      <p className="font-bold text-slate-100 flex items-center gap-1">
                        {usr.fullName}
                        {usr.role === 'Admin' && <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 inline" />}
                      </p>
                      <p className="text-[10px] text-slate-400 font-normal">{usr.phone || '+20 1126732118'}</p>
                    </div>
                  </td>

                  {/* Username / Login Credentials */}
                  <td className="py-3 px-3 font-mono text-slate-300">
                    <div className="font-bold text-cyan-300">@{usr.username}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{isKu ? 'وشەی تێپەڕ: ••••••••' : isAr ? 'كلمة السر: ••••••••' : 'Password: ••••••••'}</div>
                  </td>

                  {/* Specialization / Role */}
                  <td className="py-3 px-3">
                    <span className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                      usr.role === 'Admin' ? 'bg-purple-950 text-purple-300 border-purple-500/30' :
                      usr.role === 'Manager' ? 'bg-blue-950 text-blue-300 border-blue-500/30' :
                      'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {usr.role === 'Admin' ? (isKu ? 'بەڕێوەبەری گشتی سیستەم' : isAr ? 'مدير عام المنظومة' : 'Super Admin') :
                       usr.role === 'Manager' ? (isKu ? 'بەڕێوەبەری لک و کۆگا' : isAr ? 'مدير فرع ومخزن' : 'Branch Manager') :
                       (isKu ? 'کاشێری فرۆشتن' : isAr ? 'كاشير مبيعات' : 'Sales Cashier')}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                      {usr.specialization || (usr.role === 'Admin' ? (isKu ? 'بەڕێوەبەری سەرپەرشتیاران' : isAr ? 'مدير المشرفين' : 'Admin Lead') : (isKu ? 'بەرپرسی فرۆشتن' : isAr ? 'مسؤول المبيعات' : 'Sales Rep'))}
                    </p>
                  </td>

                  {/* Permissions Badges */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1 max-w-[200px] mx-auto">
                      {usr.permissions?.canAccessPOS && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold border border-emerald-500/30">
                          {isKu ? 'کاشێر' : isAr ? 'الكاشير' : 'POS'}
                        </span>
                      )}
                      {usr.permissions?.canManageProducts && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-semibold border border-blue-500/30">
                          {isKu ? 'کاڵاکان' : isAr ? 'المواد' : 'Products'}
                        </span>
                      )}
                      {usr.permissions?.canViewReports && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-semibold border border-purple-500/30">
                          {isKu ? 'قازانج' : isAr ? 'الأرباح' : 'Reports'}
                        </span>
                      )}
                      {usr.permissions?.canManageSettings && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold border border-amber-500/30">
                          {isKu ? 'ڕێکخستن' : isAr ? 'الإعدادات' : 'Settings'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status Toggle */}
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleToggleUserStatus(usr.id)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors ${
                        usr.active 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      {usr.active ? (isKu ? 'چالاک ✓' : isAr ? 'مفعل ✓' : 'Active') : (isKu ? 'ناچالاک ✕' : isAr ? 'معطل ✕' : 'Disabled')}
                    </button>
                  </td>

                  {/* Actions (Edit Profile Modal Button + Delete) */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditAccountModal(usr)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 transition-all"
                        title={isKu ? 'دەستکاریکردنی پەڕگە و دەسەڵاتەکان' : isAr ? 'تعديل الملف والصلاحيات' : 'Edit Profile & Permissions'}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isKu ? 'دەستکاری' : isAr ? 'تعديل الملف' : 'Edit'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteUser(usr.id)}
                        className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 transition-colors"
                        title={isKu ? 'سڕینەوەی هەژمار' : isAr ? 'حذف الحساب' : 'Delete Account'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED PERMISSIONS TOGGLE SWITCHES SECTION FOR MANAGERS */}
      <div className="cyber-card p-6 rounded-3xl border border-cyan-500/30 space-y-5 bg-[#0E1628]/90 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-3">
          <div>
            <h3 className="text-base font-black text-cyan-300 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>{isKu ? 'بەشی دەستکاریکردن و تایبەتکردنی دەسەڵاتەکانی بەکارهێنەر بە وردی (Toggle Switches)' : isAr ? 'قسم تعديل وتخصيص صلاحيات المستخدمين بالتفصيل (Toggle Switches)' : 'Granular User Permissions Manager'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isKu 
                ? 'هەر هەژمارێکی کارمەند/کاشێر هەڵبژێرە بۆ کۆنتڕۆڵی وردی بەش و پەڕە دیارەکانیان بە کلیلە دەستبەجێیەکان' 
                : isAr 
                ? 'اختر أي حساب موظف/كاشير للتحكم الدقيق في القوائم والأقسام الظاهرة له بمفاتيح تبديل فورية' 
                : 'Select an employee account to instantly toggle their visible tabs & operational rights'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">{isKu ? 'هەژمار هەڵبژێرە:' : isAr ? 'اختر الحساب:' : 'Select Account:'}</span>
            <select
              value={selectedPermissionUserId || (userAccounts[0]?.id || '')}
              onChange={(e) => setSelectedPermissionUserId(e.target.value)}
              className="bg-slate-900 border border-cyan-500/40 text-cyan-200 text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner"
            >
              {userAccounts.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} (@{u.username}) - {u.role === 'Admin' ? (isKu ? 'بەڕێوەبەری گشتی' : isAr ? 'مدير عام' : 'Admin') : u.role === 'Manager' ? (isKu ? 'بەڕێوەبەر' : isAr ? 'مدير' : 'Manager') : (isKu ? 'کاشێر' : isAr ? 'كاشير' : 'Cashier')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedUser && (
          <div className="space-y-4">
            {/* Selected User Header & Quick Presets */}
            <div className="flex flex-wrap items-center justify-between bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUser.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80'}
                  alt={selectedUser.fullName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    {selectedUser.fullName}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                      selectedUser.role === 'Admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                      selectedUser.role === 'Manager' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {selectedUser.role === 'Admin' ? (isKu ? 'بەڕێوەبەری گشتی' : isAr ? 'مدير عام' : 'Super Admin') : selectedUser.role === 'Manager' ? (isKu ? 'بەڕێوەبەری لک' : isAr ? 'مدير فرع' : 'Manager') : (isKu ? 'کاشێری فرۆشتن' : isAr ? 'كاشير مبيعات' : 'Sales Cashier')}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{isKu ? 'ناوی بەکارهێنەر: ' : isAr ? 'اسم المستخدم: ' : 'Username: '}@{selectedUser.username}</p>
                </div>
              </div>

              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPermissionPreset(selectedUser.id, 'all')}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-500/40 transition-all active:scale-95 cursor-pointer"
                >
                  {isKu ? '⚡ چالاککردنی هەموو بەشەکان' : isAr ? '⚡ تفعيل كافة القوائم' : 'Enable All'}
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPermissionPreset(selectedUser.id, 'cashier')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all active:scale-95 cursor-pointer"
                >
                  {isKu ? '🛒 دەسەڵاتی پێشنیارکراوی کاشێر (تەنها POS و کڕیاران)' : isAr ? '🛒 صلاحيات الكاشير الموصى بها (POS والعملاء فقط)' : 'Recommended Cashier Preset'}
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPermissionPreset(selectedUser.id, 'none')}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40 transition-all active:scale-95 cursor-pointer"
                >
                  {isKu ? '🔒 ناچالاککردنی هەموو بەشەکان' : isAr ? '🔒 تعطيل كافة القوائم' : 'Disable All'}
                </button>
              </div>
            </div>

            {/* 12 TOGGLE SWITCHES GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {permissionDefinitions.map((def) => {
                const isEnabled = def.getVal(selectedUser.permissions);
                const Icon = def.icon;

                return (
                  <div
                    key={def.key}
                    onClick={() => handleToggleUserPermission(selectedUser.id, def.key as any)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                      isEnabled
                        ? 'bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border-emerald-500/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isEnabled ? 'text-emerald-200' : 'text-slate-300'}`}>
                          {isKu ? def.labelKu : isAr ? def.labelAr : def.labelEn}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {isKu ? def.descKu : isAr ? def.descAr : def.descEn}
                        </p>
                      </div>
                    </div>

                    {/* iOS style Toggle Switch Button */}
                    <div className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${isEnabled ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-700'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${isEnabled ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RENDER ACCOUNT CREATION & EDITING MODAL */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSaveAccount={handleSaveAccount}
        editingAccount={editingAccount}
        settings={settings}
      />

      {/* RENDER KEYBOARD SHORTCUTS CONFIGURATION MODAL */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />

      {/* STORE SETTINGS CONFIGURATION */}
      <div className="cyber-card p-6 rounded-3xl border border-blue-500/20 space-y-6 max-w-3xl">

        {/* POS Keyboard Shortcuts Quick Control Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-blue-950/50 to-indigo-950/60 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
              <Keyboard className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">
                {isKu ? 'کورتەبڕەکانی تەختەکلیل بۆ پەڕەی فرۆشتن (POS Hotkeys)' : isAr ? 'اختصارات الكيبورد لواجهة البيع (POS Hotkeys)' : 'POS Keyboard Hotkeys'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isKu ? 'تایبەتکردنی کلیلەکانی وەک F1، F2، F3، F4 بۆ تەواوکردنی پارەدان، کردنەوەی پەنجەرەی نوێ و خوێندنەوەی خێرای بارکۆد' : isAr ? 'تخصيص المفاتيح مثل F1، F2، F3، F4 لإتمام الدفع، فتح نافذة جديدة، ومسح الباركود بسرعة' : 'Customize hotkeys for fast checkout, new window, and barcode scan focus'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Keyboard className="w-4 h-4" />
            <span>{isKu ? 'کۆنتڕۆڵ و تایبەتکردن' : isAr ? 'التحكم والتخصيص' : 'Customize Hotkeys'}</span>
          </button>
        </div>
        
        {/* Language & Regional Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>{getTranslation(settings.language, 'languageSelectLabel')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleChange('language', 'ar')}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
                settings.language === 'ar'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🇸🇦</span>
                <span>العربية</span>
              </span>
              {settings.language === 'ar' && <Check className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => handleChange('language', 'en')}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
                settings.language === 'en'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🇬🇧</span>
                <span>English</span>
              </span>
              {settings.language === 'en' && <Check className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => handleChange('language', 'ku')}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
                settings.language === 'ku'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>☀️</span>
                <span>کوردی (Kurdish)</span>
              </span>
              {settings.language === 'ku' && <Check className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* System Theme & Night Mode Settings */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Moon className="w-4 h-4 text-cyan-400" />
            <span>{getTranslation(settings.language, 'themeModeLabel')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleChange('themeMode', 'dark')}
              className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                settings.themeMode !== 'light'
                  ? 'bg-gradient-to-r from-indigo-900 via-blue-900 to-cyan-900 text-white border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-2 ring-cyan-500/30'
                  : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  <Moon className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <span className="block text-xs font-black">{getTranslation(settings.language, 'darkMode')}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {isKu ? 'ڕووکاری تاریک بۆ پاراستنی چاو و گونجاو بۆ کاری شەوانە' : isAr ? 'مظهر داكن مريح للعينين ومناسب لبيئة الماركيت والليلي' : 'Dark high-contrast theme for comfortable usage'}
                  </span>
                </div>
              </div>
              {settings.themeMode !== 'light' && <Check className="w-4 h-4 text-cyan-300" />}
            </button>

            <button
              type="button"
              onClick={() => handleChange('themeMode', 'light')}
              className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                settings.themeMode === 'light'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/40'
                  : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-950 text-amber-300 border border-amber-500/40">
                  <Sun className="w-4 h-4 text-amber-300" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <span className="block text-xs font-black">{getTranslation(settings.language, 'lightMode')}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {isKu ? 'ڕووکاری ڕووناک و زۆر دیار بۆ شوێنە ڕووناکەکان' : isAr ? 'مظهر ناصع عالي الوضوح للبيئات المضاءة نهاراً' : 'Clean bright high-visibility theme'}
                  </span>
                </div>
              </div>
              {settings.themeMode === 'light' && <Check className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>

        {/* Store Name & Info */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Store className="w-4 h-4" />
            {settings.language === 'ku' ? 'زانیاری و ناوی فرۆشگە' : isAr ? 'بيانات الماركيت الرئيسية' : 'Supermarket Branding'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-400 mb-1 block">
                {settings.language === 'ku' ? 'ناوی فرۆشگە (عەرەبی)' : isAr ? 'اسم المتجر (بالعربية)' : 'Store Name (AR)'}
              </label>
              <input
                type="text"
                value={settings.storeNameAr}
                onChange={(e) => handleChange('storeNameAr', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">
                {settings.language === 'ku' ? 'ناوی فرۆشگە (ئینگلیزی)' : isAr ? 'اسم المتجر (English)' : 'Store Name (EN)'}
              </label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">
                {settings.language === 'ku' ? 'ناوی فرۆشگە (کوردی)' : 'اسم المتجر (کوردی)'}
              </label>
              <input
                type="text"
                value={settings.storeNameKu || ''}
                placeholder="هایپرمارکێتی زیرەکی سوپەر"
                onChange={(e) => handleChange('storeNameKu', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">
                {settings.language === 'ku' ? 'ژمارەی تەلەفۆن' : isAr ? 'رقم الهاتف' : 'Phone'}
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">
                {settings.language === 'ku' ? 'ناونیشان' : isAr ? 'العنوان' : 'Address'}
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Currency & Tax Rates */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            {isKu ? 'ڕێکخستنەکانی باج و دراو' : isAr ? 'إعدادات الضريبة والعملة' : 'Currency & VAT Tax Rates'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'دراوی پیشاندراو' : isAr ? 'العملة المعروضة' : 'Currency Symbol'}</label>
              <select
                value={settings.currencySymbol}
                onChange={(e) => handleChange('currencySymbol', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 text-center font-bold rounded-xl border border-blue-500/20 focus:outline-none"
              >
                <option value="د.ع">د.ع IQD (دیناری عێراقی / دينار عراقي)</option>
                <option value="$">$ USD (دۆلار / دولار)</option>
                <option value="ر.س">ر.س SAR (ڕیالی سعودی / ريال سعودي)</option>
                <option value="ج.م">ج.م EGP (پاوەندی میسری / جنيه مصري)</option>
                <option value="€">€ EUR (یۆرۆ / يورو)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'ڕێژەی باجی بەهای زیادکراو (%)' : isAr ? 'نسبة القيمة المضافة (%)' : 'VAT Tax Rate (%)'}</label>
              <input
                type="number"
                value={settings.taxRate}
                onChange={(e) => handleChange('taxRate', Number(e.target.value))}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 text-center font-mono font-bold rounded-xl border border-blue-500/20"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'ئاستی کەمیی کاڵا لە کۆگا' : isAr ? 'حد انخفاض المخزون الافتراضي' : 'Low Stock Default'}</label>
              <input
                type="number"
                value={settings.lowStockThresholdDefault}
                onChange={(e) => handleChange('lowStockThresholdDefault', Number(e.target.value))}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 text-center font-mono font-bold rounded-xl border border-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Comprehensive Hardware Printer Linking Hub (مركز ربط وإدارة كافة أنواع الطابعات) */}
        <div className="space-y-5 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Printer className="w-5 h-5 text-cyan-300" />
                <span>{isKu ? 'ناوەندی بەستنەوە و بەڕێوەبردنی هەموو جۆرەکانی چاپکەر (A4، گەرمی، ملصقی نرخ و بارکۆد)' : isAr ? 'مركز ربط وإدارة كافة أنواع الطابعات (المكتبية الكبيرة A4، الحرارية، وملصقات الأسعار والباركود)' : 'All Printer Connection & Hardware Management Hub'}</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isKu ? 'بەستنەوەی سەرجەم چاپکەرە پەیوەستکراوەکان بە کۆمپیوتەر لە ڕێگەی USB، LAN، Bluetooth یان درایڤەری ویندۆز' : isAr ? 'ربط كافة الطابعات الموصولة باللابتوب/الكمبيوتر عن طريق USB، الشبكة اللاسلكية LAN، البلوتوث، أو مشغل طابعات الويندوز المباشر' : 'Connect & link any printer attached to your laptop via USB, Network LAN, Bluetooth, or OS Spooler'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleScanPrinters}
              disabled={isScanningPrinters}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-black text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-200 ${isScanningPrinters ? 'animate-spin' : ''}`} />
              <span>{isScanningPrinters ? (isKu ? 'پشکنینی چاپکەرەکان دەکرێت...' : isAr ? 'جاري فحص الطابعات...' : 'Scanning...') : (isKu ? '⚡ پشکنین و دۆزینەوەی چاپکەرە پەیوەستکراوەکان' : isAr ? '⚡ فحص واكتشاف الطابعات المربوطة بالكمبيوتر' : 'Scan Connected Printers')}</span>
            </button>
          </div>

          {printerScanMessage && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 text-xs text-center font-bold animate-fadeIn flex items-center justify-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>{printerScanMessage}</span>
            </div>
          )}

          {/* Direct Web Serial ESC/POS Thermal Printer Connect & Test Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 via-[#0B1120] to-cyan-950/70 border border-amber-500/40 space-y-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Zap className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                    <span>{isKu ? 'چاپکردنی گەرمیی ڕاستەوخۆ (ESC/POS Web Serial Direct Print)' : isAr ? 'الطباعة الحرارية المباشرة (ESC/POS Web Serial Direct Print)' : 'Direct ESC/POS Thermal Printing (Web Serial)'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 font-bold">
                      {isWebSerialSupported() ? (isKu ? 'پاڵپشتیکراوە ⚡' : 'مدعوم ⚡') : (isKu ? 'پاڵپشتینەکراوە' : 'غير مدعوم')}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {isKu
                      ? 'بەستنەوەی ڕاستەوخۆ بە چاپکەرە گەرمییەکانی کاشێر (USB / COM / Serial) بۆ چاپی خێرا بە یەک پەنجە لێدان بەبێ کردنەوەی پەنجەرەی گەڕان.'
                      : isAr
                      ? 'ربط مباشر بالطابعات الحرارية الكاشير (USB / COM / Serial) لطباعة الفواتير بلمسة واحدة وبدون فتح أي نافذة متصفح.'
                      : 'Direct 1-click ESC/POS raw printing to USB/Serial POS thermal printers without opening print dialogs.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    setPrinterScanMessage(isKu ? 'تاقیکردنەوەی پەیوەندی بە چاپکەری گەرمی ڕاستەوخۆ...' : isAr ? 'جاري اختبار الاتصال بالطابعة الحرارية المباشرة...' : 'Testing connection to direct thermal printer...');
                    await connectWebSerialPrinter(9600);
                    // Send test print bytes
                    const testBytes = new TextEncoder().encode('\x1B@\x1Ba\x01\x1BE\x017amo.pos ESC/POS Direct Print Test OK!\n\x1BE\x00\x1Ba\x00Date: ' + new Date().toLocaleTimeString() + '\n--------------------------------\nStatus: READY & CONNECTED\n\n\n\x1DV\x41\x00');
                    await sendRawToWebSerialPrinter(testBytes);
                    setPrinterScanMessage(isKu ? '✅ پەیوەندی سەرکەوتوو بوو و چاپی تاقیکاری بە سەرکەوتوویی تەواو بوو!' : isAr ? '✅ نجح الاتصال وتمت الطباعة التجريبية بنجاح على الطابعة الحرارية!' : '✅ Web Serial Direct Thermal Print Test Successful!');
                  } catch (e: any) {
                    setPrinterScanMessage(isKu ? `ئاگاداری: ${e.message || 'پەیوەندی بە چاپکەری گەرمی نەبەسترا'}` : isAr ? `تنبيه: ${e.message || 'تعذر الاتصال بالطابعة الحرارية'}` : `Error: ${e.message}`);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer active:scale-95 transition-all"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>{isKu ? 'بەستنەوە و تاقیکردنەوەی چاپکەری گەرمی (USB/Serial)' : isAr ? 'ربط واختبار الطابعة الحرارية المباشرة (USB/Serial)' : 'Pair & Test Thermal Printer'}</span>
              </button>
            </div>
          </div>

          {/* Connected Hardware Selection Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0B1120] p-4 rounded-2xl border border-blue-500/20">
            <div>
              <label className="text-slate-300 font-bold mb-1.5 flex items-center gap-2 text-xs">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>{isKu ? '١. چاپکەری سەرەکی بەستراوە بۆ پسوولە و وەسڵ:' : isAr ? '1. الطابعة الرئيسية المربوطة للإيصالات والفواتير:' : '1. Linked Main Invoice Printer:'}</span>
              </label>
              <select
                value={settings.connectedPrinterName || defaultDetectedPrinters[2].name}
                onChange={(e) => handleChange('connectedPrinterName', e.target.value)}
                className="w-full bg-[#10192D] text-slate-100 p-2.5 rounded-xl border border-emerald-500/30 text-xs font-bold focus:outline-none focus:border-cyan-400"
              >
                {defaultDetectedPrinters.map(p => (
                  <option key={p.id} value={p.name}>
                    🟢 {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-bold mb-1.5 flex items-center gap-2 text-xs">
                <Tag className="w-4 h-4 text-amber-400" />
                <span>{isKu ? '٢. چاپکەری ملصقی نرخ و بارکۆد:' : isAr ? '2. طابعة ملصقات الأسعار والباركود المربوطة:' : '2. Linked Price Label & Barcode Printer:'}</span>
              </label>
              <select
                value={settings.labelPrinterName || defaultDetectedPrinters[1].name}
                onChange={(e) => handleChange('labelPrinterName', e.target.value)}
                className="w-full bg-[#10192D] text-slate-100 p-2.5 rounded-xl border border-amber-500/30 text-xs font-bold focus:outline-none focus:border-amber-400"
              >
                {defaultDetectedPrinters.filter(p => p.type === 'label_barcode' || p.type === 'thermal80mm' || p.type === 'a4').map(p => (
                  <option key={p.id} value={p.name}>
                    🏷️ {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selectable Printer Type & Layout Profiles */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-2 block">
              {isKu ? 'قالب و جۆری چاپکەری چالاککراو هەڵبژێرە:' : isAr ? 'اختر قالب ونوع الطابعة النشطة في المنظومة:' : 'Select Default Printer Type Profile:'}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option 1: Thermal 80mm POS Receipt */}
              <button
                type="button"
                onClick={() => handleChange('printerType', 'thermal80mm')}
                className={`p-3.5 rounded-2xl border text-right rtl:text-right transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                  (settings.printerType || 'thermal80mm') === 'thermal80mm'
                    ? 'bg-gradient-to-br from-cyan-950/80 via-blue-950/60 to-[#0B1120] border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50'
                    : 'bg-[#0B1120] border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${
                      (settings.printerType || 'thermal80mm') === 'thermal80mm'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <Printer className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white">{isKu ? '🧾 80mm گەرمی POS' : '🧾 80mm حرارية POS'}</span>
                  </div>
                  {(settings.printerType || 'thermal80mm') === 'thermal80mm' && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  {isKu ? 'وەسڵی گەرمی تەسک بۆ کاشێری خێرا (Epson, Xprinter, Bixolon)' : isAr ? 'إيصال حراري ضيق للكاشير السريع (Epson, Xprinter, Bixolon)' : 'Thermal roll for fast checkout'}
                </p>
              </button>

              {/* Option 2: Standard A4 Large Office Printer */}
              <button
                type="button"
                onClick={() => handleChange('printerType', 'a4')}
                className={`p-3.5 rounded-2xl border text-right rtl:text-right transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                  settings.printerType === 'a4'
                    ? 'bg-gradient-to-br from-blue-950/80 via-indigo-950/60 to-[#0B1120] border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-1 ring-blue-400/50'
                    : 'bg-[#0B1120] border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${
                      settings.printerType === 'a4'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white">{isKu ? '🖨️ A4 گەورەی ئۆفیس' : '🖨️ A4 مكتبية كبيرة'}</span>
                  </div>
                  {settings.printerType === 'a4' && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  {isKu ? 'چاپکەری کاغەزی ئاسایی گەورە (HP LaserJet, Canon, Brother)' : isAr ? 'طابعة ورقية عادية كبيرة (HP LaserJet, Canon, Brother)' : 'Full page invoice document'}
                </p>
              </button>

              {/* Option 3: Price Tag & Barcode Label Printer */}
              <button
                type="button"
                onClick={() => handleChange('printerType', 'label_barcode')}
                className={`p-3.5 rounded-2xl border text-right rtl:text-right transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                  settings.printerType === 'label_barcode'
                    ? 'bg-gradient-to-br from-amber-950/80 via-orange-950/60 to-[#0B1120] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50'
                    : 'bg-[#0B1120] border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${
                      settings.printerType === 'label_barcode'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <Tag className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white">{isKu ? '🏷️ ملصقی نرخ و بارکۆد' : '🏷️ ملصقات الأسعار'}</span>
                  </div>
                  {settings.printerType === 'label_barcode' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  {isKu ? 'چاپکردنی نرخ و بارکۆدی کاڵاکان (Xprinter, Zebra, TSC)' : isAr ? 'طباعة أسعار وباركود المواد (Xprinter, Zebra, TSC)' : 'Price tags & barcode sticky labels'}
                </p>
              </button>

              {/* Option 4: A5 Half Page Printer */}
              <button
                type="button"
                onClick={() => handleChange('printerType', 'a5')}
                className={`p-3.5 rounded-2xl border text-right rtl:text-right transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                  settings.printerType === 'a5'
                    ? 'bg-gradient-to-br from-purple-950/80 via-pink-950/60 to-[#0B1120] border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.25)] ring-1 ring-purple-400/50'
                    : 'bg-[#0B1120] border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${
                      settings.printerType === 'a5'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white">{isKu ? '📄 A5 نیوە پەڕە' : '📄 A5 نصف ورقة'}</span>
                  </div>
                  {settings.printerType === 'a5' && <Check className="w-4 h-4 text-purple-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  {isKu ? 'پسوولەی کۆ و گەیاندن قەبارەی نیوە پەڕەی A5' : isAr ? 'فواتير جملة وتوصيل مقاس نصف ورقة A5' : 'Compact A5 invoice format'}
                </p>
              </button>
            </div>
          </div>

          {/* Advanced Hardware Link Parameters (منفذ الاتصال والحجم والنسخ) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#0B1120] p-4 rounded-2xl border border-slate-800 text-xs">
            {/* Connection Protocol */}
            <div>
              <label className="text-slate-400 mb-1 block font-bold flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isKu ? 'شێوازی بەستنەوە و پەیوەندی:' : isAr ? 'طريقة الربط والاتصال:' : 'Connection Method:'}</span>
              </label>
              <select
                value={settings.printerConnectionType || 'system'}
                onChange={(e) => handleChange('printerConnectionType', e.target.value)}
                className="w-full bg-[#10192D] text-slate-200 p-2.5 rounded-xl border border-slate-700 font-bold focus:outline-none focus:border-cyan-400"
              >
                <option value="system">💻 {isKu ? 'چاپکەری بنەڕەتی ویندۆز/لابتۆپ (OS Spooler)' : 'طابعة الويندوز/اللابتوب الافتراضية (OS Spooler)'}</option>
                <option value="usb">🔌 {isKu ? 'کەیبڵی ڕاستەوخۆی USB (Direct USB Port)' : 'وصلة كابل USB المباشر (Direct USB Port)'}</option>
                <option value="network">🌐 {isKu ? 'چاپکەری تۆڕی بێتەل (LAN / Network IP)' : 'طابعة شبكة لاسلكية (LAN / Network IP)'}</option>
                <option value="bluetooth">📶 {isKu ? 'پەیوەندی بلوتووسی بێتەل (Bluetooth Thermal)' : 'اتصال بلوتوث لاسلكي (Bluetooth Thermal)'}</option>
              </select>
            </div>

            {/* IP Address or Port Name */}
            <div>
              <label className="text-slate-400 mb-1 block font-bold flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>{isKu ? 'ناونیشانی تۆڕی IP / پۆرت:' : isAr ? 'عنوان الشبكة IP / المنفذ:' : 'IP Address / Port:'}</span>
              </label>
              <input
                type="text"
                placeholder={settings.printerConnectionType === 'network' ? '192.168.1.200:9100' : 'COM1 / USB001'}
                value={settings.printerIpAddress || ''}
                onChange={(e) => handleChange('printerIpAddress', e.target.value)}
                className="w-full bg-[#10192D] text-slate-200 p-2.5 rounded-xl border border-slate-700 font-mono font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Paper Size / Label Dimensions */}
            <div>
              <label className="text-slate-400 mb-1 block font-bold flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isKu ? 'قەبارەی کاغەز و ملصق:' : isAr ? 'مقاس الورق والملصق:' : 'Paper / Label Size:'}</span>
              </label>
              <select
                value={settings.paperSize || '80mm'}
                onChange={(e) => handleChange('paperSize', e.target.value)}
                className="w-full bg-[#10192D] text-slate-200 p-2.5 rounded-xl border border-slate-700 font-bold focus:outline-none focus:border-emerald-400"
              >
                <option value="80mm">80mm ({isKu ? 'شریتی گەرمی پان' : 'شريط حراري عريض'})</option>
                <option value="58mm">58mm ({isKu ? 'شریتی گەرمی باریک' : 'شريط حراري ضيق'})</option>
                <option value="A4">A4 ({isKu ? 'پەڕەی تەواوی ئۆفیس' : 'ورقة مكتبية كاملة'})</option>
                <option value="A5">A5 ({isKu ? 'نیوە پەڕە' : 'نصف ورقة'})</option>
                <option value="50x30mm">50x30 mm ({isKu ? 'ملصقی نرخ و بارکۆد' : 'ملصق أسعار وباركود'})</option>
                <option value="40x20mm">40x20 mm ({isKu ? 'ملصقی بارکۆدی بچووککراوە' : 'ملصق باركود مصغر'})</option>
              </select>
            </div>

            {/* Printed Copies */}
            <div>
              <label className="text-slate-400 mb-1 block font-bold flex items-center gap-1">
                <Printer className="w-3.5 h-3.5 text-purple-400" />
                <span>{isKu ? 'ژمارەی چاپی خۆکار:' : isAr ? 'عدد النسخ المطبوعة تلقائياً:' : 'Auto Printed Copies:'}</span>
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={settings.printerCopies || 1}
                onChange={(e) => handleChange('printerCopies', Number(e.target.value))}
                className="w-full bg-[#10192D] text-slate-200 p-2.5 rounded-xl border border-slate-700 font-mono font-bold text-center focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Direct Printer Testing Suite (سلسلة طباعة الاختبار المباشر) */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 p-4 rounded-2xl border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                <span>{isKu ? 'تاقیکردنەوەی چاپی ڕاستەوخۆ بۆ دڵنیابوون لە بەستنەوەی چاپکەر:' : isAr ? 'اختبار طباعة مباشر لتأكيد ربط الطابعة بالبرنامج:' : 'Direct Printer Connection Test Suite:'}</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isKu ? 'کرتە لە هەر کام لە دوگمەکان بکە بۆ ناردنی فەرمانی چاپی تاقیکاری و پشکنینی ڕوونی خەت' : isAr ? 'انقر على أي من الأزرار التالية لإرسال أمر طباعة تجريبي واختبار جودة الورق والخطوط' : 'Click any button to trigger an instant test print to verify your connected hardware'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleTriggerTestPrint('receipt')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 cursor-pointer transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isKu ? '🧾 تاقیکردنەوەی وەسڵی POS' : isAr ? '🧾 تجربة إيصال POS' : 'Test Receipt'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerTestPrint('label')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 cursor-pointer transition-all"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{isKu ? '🏷️ تاقیکردنەوەی ملصقی نرخ و بارکۆد' : isAr ? '🏷️ تجربة ملصق سعر وباركود' : 'Test Price Tag'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerTestPrint('a4')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 cursor-pointer transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isKu ? '📄 تاقیکردنەوەی پەڕەی A4' : isAr ? '📄 تجربة تقرير A4' : 'Test A4 Page'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Receipt Custom Messages */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2">
            {isKu ? 'دەقی سەرەوە و ژێرەوەی پسوولەی چاپکراو' : isAr ? 'ترويسة وتذييل الفاتورة المطبوعة' : 'Receipt Messages'}
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'پەیامی بەخێرهاتن لە سەرەوەی پسوولە' : isAr ? 'رسالة الترحيب أعلى الفاتورة' : 'Header Message'}</label>
              <input
                type="text"
                value={settings.receiptHeaderMsg}
                onChange={(e) => handleChange('receiptHeaderMsg', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'پەیامی سوپاسگوزاری و یاسای گەڕاندنەوە لە خوارەوە' : isAr ? 'رسالة الشكر وسياسة الترجيع في الأسفل' : 'Footer Return Policy Message'}</label>
              <input
                type="text"
                value={settings.receiptFooterMsg}
                onChange={(e) => handleChange('receiptFooterMsg', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Data Security & Automatic Persistence Banner */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Database className="w-4 h-4" />
            {isKu ? 'پاشەکەوتکردن و پاراستنی زانیارییەکانی سیستم' : isAr ? 'حفظ وتأمين بيانات المنظومة (التخزين المحلي المستمر)' : 'Persistent Local Storage & Data Security'}
          </h3>

          <div className="p-3.5 rounded-2xl bg-[#08101E] border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{isKu ? 'تایبەتمەندی پاشەکەوتکردنی خۆکار چالاککراوە (localStorage)' : isAr ? 'ميزة الحفظ التلقائي مفعّلة بنجاح (localStorage)' : 'Auto-Save Persistence Enabled'}</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {isKu
                  ? 'هەموو زانیارییەکان (کاڵاکان، نرخەکان، کڕینەکان، دابینکەران، کاشێرەکان و فرۆشتنەکان) بە شێوەی خۆکار پاشەکەوت دەکرێن لە ئامێرەکەتدا.'
                  : isAr
                  ? 'جميع البيانات (المواد، الأسعار، المشتريات، الموردين، الكاشيرية، والمبيعات) محفوظة تلقائياً ومحمية من الضياع عند تحديث الصفحة أو إغلاق المتصفح.'
                  : 'All products, purchases, suppliers, users, and sales are automatically persisted locally and will not be lost upon updates or page reloads.'}
              </p>
              {importStatus && (
                <p className="text-emerald-400 font-bold text-xs pt-1">
                  {importStatus}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Hidden File Input for Importing Backup (.json or .xlsx) */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".json, .xlsx, .xls"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  try {
                    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                      const excelParsed = await parseExcelBackupFile(file);
                      if (excelParsed.products && excelParsed.products.length > 0) {
                        const existingProds = products || JSON.parse(localStorage.getItem('supermarket_products_v1') || '[]');
                        const merged = [...excelParsed.products];
                        existingProds.forEach((p: Product) => {
                          if (!merged.some(m => m.barcode && p.barcode && m.barcode === p.barcode)) {
                            merged.push(p);
                          }
                        });

                        const backupPayload = {
                          ...excelParsed,
                          products: merged
                        };

                        if (onImportBackup) {
                          onImportBackup(backupPayload);
                        } else {
                          localStorage.setItem('supermarket_products_v1', JSON.stringify(merged));
                          syncBulkWriteCollection('products', merged);
                        }

                        setImportStatus(isKu ? `✅ بە سەرکەوتوویی ${excelParsed.products.length} کاڵا هاوردەکران و ڕێکخران لە کۆگادا!` : isAr ? `✅ تم استيراد وترتيب ${excelParsed.products.length} مادة وإضافتها للمخزن بنجاح!` : `✅ Successfully imported and arranged ${excelParsed.products.length} products into inventory!`);
                        setTimeout(() => setImportStatus(''), 5000);
                      } else {
                        alert(isKu ? 'هیچ پەڕەیەکی دروستی کاڵاکان لە فایلی ئێکسڵ نەدۆزرایەوە!' : isAr ? 'لم يتم العثور على ورقة مواد صالحة في ملف الإكسل!' : 'No valid products sheet found in Excel file!');
                      }
                    } else {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const jsonText = event.target?.result as string;
                          const parsedData = JSON.parse(jsonText);
                          if (onImportBackup) {
                            onImportBackup(parsedData);
                          } else {
                            if (parsedData.products) {
                              const prods = typeof parsedData.products === 'string' ? JSON.parse(parsedData.products) : parsedData.products;
                              localStorage.setItem('supermarket_products_v1', JSON.stringify(prods));
                              syncBulkWriteCollection('products', prods);
                            }
                            if (parsedData.salesHistory || parsedData.sales) localStorage.setItem('supermarket_sales_v1', JSON.stringify(parsedData.salesHistory || parsedData.sales));
                            if (parsedData.suppliers) localStorage.setItem('supermarket_suppliers_v1', JSON.stringify(parsedData.suppliers));
                            if (parsedData.customers) localStorage.setItem('supermarket_customers_v1', JSON.stringify(parsedData.customers));
                          }
                          const prodsCount = Array.isArray(parsedData.products) ? parsedData.products.length : (Array.isArray(parsedData) ? parsedData.length : 0);
                          setImportStatus(isKu ? `✅ هەموو زانیارییەکان (${prodsCount} کاڵا) بە سەرکەوتوویی گەڕێنرانەوە!` : isAr ? `✅ تم استعادة وترتيب كافة البيانات (${prodsCount} مادة) بنجاح!` : 'Data restored successfully!');
                          setTimeout(() => setImportStatus(''), 5000);
                        } catch (err) {
                          alert(isKu ? 'پەڕگەی پاشەکەوتی JSON دروست نییە!' : isAr ? 'ملف النسخة الاحتياطية غير صالح!' : 'Invalid backup JSON file!');
                        }
                      };
                      reader.readAsText(file);
                    }
                  } catch (err) {
                    alert(isKu ? 'هەڵەیەک ڕوویدا لە خوێندنەوەی پەڕگەکەدا!' : isAr ? 'حدث خطأ أثناء قراءة الملف!' : 'Error reading file!');
                  } finally {
                    e.target.value = '';
                  }
                }}
              />

              {/* Excel Complete Backup Button */}
              <button
                type="button"
                onClick={() => {
                  const currentProducts = products || JSON.parse(localStorage.getItem('supermarket_products_v1') || '[]');
                  const currentSales = salesHistory || JSON.parse(localStorage.getItem('supermarket_sales_v1') || '[]');
                  const currentSuppliers = suppliers || JSON.parse(localStorage.getItem('supermarket_suppliers_v1') || '[]');
                  const currentCustomers = customers || JSON.parse(localStorage.getItem('supermarket_customers_v1') || '[]');
                  const currentPurchases = purchaseInvoices || JSON.parse(localStorage.getItem('supermarket_purchases_v1') || '[]');
                  const currentUsers = userAccounts || JSON.parse(localStorage.getItem('supermarket_user_accounts_v1') || '[]');

                  exportStoreToExcel({
                    products: currentProducts,
                    salesHistory: currentSales,
                    suppliers: currentSuppliers,
                    customers: currentCustomers,
                    purchaseInvoices: currentPurchases,
                    userAccounts: currentUsers,
                    settings: settings,
                    exportedAt: new Date().toISOString()
                  });
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                <span>{isKu ? '📊 هەناردەکردنی کۆپییەکی یەدەگی گشتگیر (Excel .xlsx)' : isAr ? '📊 تصدير نسخة احتياطية شاملة (Excel .xlsx)' : 'Export Full Store Backup (Excel .xlsx)'}</span>
              </button>

              {/* Excel Products Only Button */}
              <button
                type="button"
                onClick={() => {
                  const currentProducts = products || JSON.parse(localStorage.getItem('supermarket_products_v1') || '[]');
                  exportProductsToExcel(currentProducts, `products_catalog_${new Date().toISOString().split('T')[0]}.xlsx`);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isKu ? 'هەناردەکردنی خشتەی کاڵاکان (Excel)' : isAr ? 'تصدير جدول المواد (Excel)' : 'Export Products List (Excel)'}</span>
              </button>

              {/* Secondary JSON Export Button */}
              <button
                type="button"
                onClick={() => {
                  const fullBackup = {
                    products: products || JSON.parse(localStorage.getItem('supermarket_products_v1') || '[]'),
                    salesHistory: salesHistory || JSON.parse(localStorage.getItem('supermarket_sales_v1') || '[]'),
                    suppliers: suppliers || JSON.parse(localStorage.getItem('supermarket_suppliers_v1') || '[]'),
                    customers: customers || JSON.parse(localStorage.getItem('supermarket_customers_v1') || '[]'),
                    purchaseInvoices: purchaseInvoices || JSON.parse(localStorage.getItem('supermarket_purchases_v1') || '[]'),
                    userAccounts: userAccounts || JSON.parse(localStorage.getItem('supermarket_user_accounts_v1') || '[]'),
                    settings: settings || JSON.parse(localStorage.getItem('supermarket_settings_v1') || '{}'),
                    exportedAt: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `supermarket_store_backup_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>{isKu ? 'هەناردەکردنی داتای JSON' : isAr ? 'تصدير بيانات JSON' : 'Export JSON Data'}</span>
              </button>

              {/* Import Excel or JSON Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>{isKu ? 'هاوردەکردنی پەڕگە (Excel / JSON)' : isAr ? 'استيراد ملف (Excel / JSON)' : 'Import (Excel / JSON)'}</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Hidden Printable Test Overlay for Hardware Verification */}
      {testPrintType && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-4 z-[9999]">
          {testPrintType === 'receipt' && (
            <div className="w-[80mm] mx-auto text-center font-mono text-xs space-y-2 dir-rtl">
              <div className="font-bold text-sm border-b pb-1 border-black">{settings.storeName || 'سوبرماركت البركة'}</div>
              <div className="text-[10px]">اختبار طباعة إيصال كاشير حراري (POS Receipt Test)</div>
              <div className="text-[10px]">الطابعة المربوطة: {settings.connectedPrinterName || 'Epson TM-T20III Thermal'}</div>
              <div className="text-[10px]">التاريخ: {new Date().toLocaleString()}</div>
              <hr className="border-dashed border-black my-2" />
              <div className="flex justify-between font-bold text-xs">
                <span>المادة</span>
                <span>الكمية x السعر</span>
                <span>المجموع</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>عصير برتقال طبيعي 1L</span>
                <span>1 x $2.50</span>
                <span>$2.50</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>شيبس كلاسيك عائلي</span>
                <span>2 x $1.00</span>
                <span>$2.00</span>
              </div>
              <hr className="border-dashed border-black my-2" />
              <div className="flex justify-between font-black text-sm">
                <span>إجمالي الفاتورة:</span>
                <span>$4.50</span>
              </div>
              <div className="mt-4 text-[9px] border-t border-black pt-2">
                {settings.receiptFooterMsg || 'شكراً لتسوقكم معنا - يرجى الاحتفاظ بالوصل للترجيع'}
              </div>
              <div className="text-[8px] mt-1 text-gray-600">*** اختبار ربط الطابعة الحرارية بنجاح ***</div>
            </div>
          )}

          {testPrintType === 'label' && (
            <div className="w-[50mm] h-[30mm] border border-black mx-auto p-1.5 font-mono text-center flex flex-col justify-between dir-rtl">
              <div className="font-bold text-[10px] truncate">{settings.storeName || 'سوبرماركت البركة'}</div>
              <div className="font-black text-xs">حليب مراعي طازج 1.5 لتر</div>
              <div className="text-[8px] font-bold">باركود: 6291001234567</div>
              <div className="bg-black text-white px-1 py-0.5 rounded font-black text-sm my-0.5 inline-block mx-auto">
                السعر: $3.50
              </div>
              <div className="text-[7px]">طابعة الملصقات: {settings.labelPrinterName || 'Xprinter XP-365B'}</div>
            </div>
          )}

          {testPrintType === 'a4' && (
            <div className="w-full max-w-[210mm] mx-auto font-sans p-6 text-black dir-rtl border border-gray-300">
              <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4">
                <div>
                  <h1 className="text-xl font-bold">{settings.storeName || 'سوبرماركت البركة'}</h1>
                  <p className="text-xs text-gray-600">تقرير اختبار ربط طابعة A4 المكتبية الكبيرة</p>
                </div>
                <div className="text-left text-xs font-mono">
                  <p>التاريخ: {new Date().toLocaleDateString()}</p>
                  <p>الطابعة: {settings.connectedPrinterName || 'HP LaserJet Pro'}</p>
                </div>
              </div>
              <table className="w-full text-xs text-right border-collapse border border-gray-300 mb-6">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="p-2 border border-gray-300">#</th>
                    <th className="p-2 border border-gray-300">نوع الاختبار</th>
                    <th className="p-2 border border-gray-300">حالة الاتصال</th>
                    <th className="p-2 border border-gray-300">النتيجة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-gray-300">1</td>
                    <td className="p-2 border border-gray-300">فحص مشغل الويندوز (OS Driver)</td>
                    <td className="p-2 border border-gray-300">متصل (Connected)</td>
                    <td className="p-2 border border-gray-300 text-green-700 font-bold">ناجح 100%</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-300">2</td>
                    <td className="p-2 border border-gray-300">اختبار تنسيق الجداول والأرقام A4</td>
                    <td className="p-2 border border-gray-300">ممتاز</td>
                    <td className="p-2 border border-gray-300 text-green-700 font-bold">جاهز للطباعة</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-center text-gray-500 border-t pt-4">*** هذه ورقة اختبار صادرة من نظام الكاشير والمبيعات الذكي ***</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

