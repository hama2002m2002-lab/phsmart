import React, { useState } from 'react';
import { 
  Users, UserPlus, Shield, Trash2, Key, Check, X, ShieldAlert, Edit3, 
  ShieldCheck, CheckCircle2, UserCheck, Search, Filter
} from 'lucide-react';
import { StoreSettings, UserAccount, UserPermissions } from '../types';
import { AccountModal } from './AccountModal';

interface PermissionsManagerTabProps {
  settings: StoreSettings;
  userAccounts: UserAccount[];
  setUserAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
}

export const PermissionsManagerTab: React.FC<PermissionsManagerTabProps> = ({
  settings,
  userAccounts,
  setUserAccounts,
}) => {
  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState('');
  const [selectedPermissionUserId, setSelectedPermissionUserId] = useState<string>(userAccounts[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedUser = userAccounts.find(u => u.id === selectedPermissionUserId) || userAccounts[0];

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

    setFormSuccessMessage(isKu ? 'هەژمار و دەسەڵاتەکان بە سەرکەوتوویی پاشەکەوت کران!' : isAr ? 'تم حفظ الحساب وتحديث الصلاحيات بنجاح!' : 'Account & permissions saved successfully!');
    setTimeout(() => setFormSuccessMessage(''), 4000);
  };

  const handleToggleUserStatus = (id: string) => {
    setUserAccounts(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  const handleDeleteUser = (id: string) => {
    if (confirm(isKu ? 'ئایا دڵنیایت لە سڕینەوەی ئەم هەژمارە؟' : isAr ? 'هل أنت متأكد من حذف هذا الحساب؟' : 'Are you sure you want to delete this account?')) {
      setUserAccounts(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleToggleUserPermission = (userId: string, permKey: keyof UserPermissions) => {
    setUserAccounts(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const currentVal = !!u.permissions?.[permKey];
      return {
        ...u,
        permissions: {
          ...u.permissions,
          [permKey]: !currentVal
        }
      };
    }));
  };

  const handleApplyPermissionPreset = (userId: string, preset: 'all' | 'cashier' | 'none') => {
    setUserAccounts(prev => prev.map(u => {
      if (u.id !== userId) return u;

      if (preset === 'all') {
        return {
          ...u,
          permissions: {
            canAccessDashboard: true,
            canAccessPOS: true,
            canManageProducts: true,
            canViewWarehouse: true,
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
          }
        };
      } else if (preset === 'cashier') {
        return {
          ...u,
          permissions: {
            canAccessDashboard: false,
            canAccessPOS: true,
            canManageProducts: false,
            canViewWarehouse: true,
            canManageInventoryAudit: false,
            canManagePurchases: false,
            canManageSuppliers: false,
            canManageCustomers: true,
            canManageOrders: false,
            canViewInvoices: true,
            canViewAnalytics: false,
            canViewReports: false,
            canManageSettings: false,
            canViewPurchasePriceInPOS: false,
          }
        };
      } else {
        return {
          ...u,
          permissions: {
            canAccessDashboard: false,
            canAccessPOS: false,
            canManageProducts: false,
            canViewWarehouse: false,
            canManageInventoryAudit: false,
            canManagePurchases: false,
            canManageSuppliers: false,
            canManageCustomers: false,
            canManageOrders: false,
            canViewInvoices: false,
            canViewAnalytics: false,
            canViewReports: false,
            canManageSettings: false,
            canViewPurchasePriceInPOS: false,
          }
        };
      }
    }));

    setFormSuccessMessage(isKu ? 'دەسەڵاتە پێشوەختەکان بە سەرکەوتوویی جێبەجێ کران!' : isAr ? 'تم تطبيق نموذج الصلاحيات بنجاح!' : 'Permission preset applied successfully!');
    setTimeout(() => setFormSuccessMessage(''), 3000);
  };

  const permissionDefinitions = [
    { key: 'pos', labelAr: 'نقطة البيع والكاشير السريع (POS)', labelKu: 'پەڕەی فرۆشتن و کاشێری خێرا (POS)', labelEn: 'POS Sales Register', descAr: 'إمكانية فتح واجهة المبيعات وإصدار الفواتير للزبائن', descKu: 'توانای کردنەوەی پەڕەی فرۆشتن و پسوولەدان بە کڕیاران', descEn: 'Open POS terminal & checkout invoices', icon: Users },
    { key: 'products', labelAr: 'إدارة المخزن والمواد', labelKu: 'بەڕێوەبردنی کۆگا و کاڵاکان', labelEn: 'Products & Inventory Catalog', descAr: 'عرض، إضافة، تعديل وحذف أصناف المواد والأسعار', descKu: 'بینین، زیادکردن و دەستکاریکردنی کاڵاکان و نرخەکان', descEn: 'Add, update & manage products catalog', icon: ShieldCheck },
    { key: 'purchases', labelAr: 'فواتير المشتريات والتوريد', labelKu: 'پسوولەکانی کڕین و دابینکردن', labelEn: 'Purchases Invoices & Stock In', descAr: 'تسجيل بضاعة جديدة وإدخال فواتير المشتريات من المندوبين', descKu: 'تۆمارکردنی کڕینی نوێ و هاوردەکردنی بار لە مەندوبەکانەوە', descEn: 'Log stock receiving & purchase bills', icon: ShieldCheck },
    { key: 'invoices', labelAr: 'سجل فواتير المبيعات والأرشيف', labelKu: 'ئەرشیف و پسوولەکانی فرۆشتن', labelEn: 'Sales History & Archives', descAr: 'مراجعة كافة فواتير المبيعات السابقة والترجيع', descKu: 'پێداچوونەوە بە هەموو پسوولەکانی فرۆشتن و گەڕاندنەوە', descEn: 'Access past receipts and return history', icon: ShieldCheck },
    { key: 'suppliers', labelAr: 'قائمة الموردين والشركات', labelKu: 'لیستی دابینکەران و کۆمپانیاکان', labelEn: 'Suppliers & Vendors', descAr: 'إدارة حسابات الشركات الموردة وديون المشتريات', descKu: 'بەڕێوەبردنی هەژمار و قەرزەکانی کۆمپانیاکان', descEn: 'Manage suppliers, balances & debt accounts', icon: ShieldCheck },
    { key: 'customers', labelAr: 'حسابات العملاء والديون', labelKu: 'هەژمارەکانی کڕیاران و قەرز', labelEn: 'Customers & Receivables', descAr: 'إدارة سجلات العملاء، البيع الآجل وتسديد الديون', descKu: 'بەڕێوەبردنی ناوی کڕیاران و قەرزی فرۆشتن', descEn: 'Manage customer tabs and credit balance', icon: ShieldCheck },
    { key: 'reports', labelAr: 'التقارير والأرباح المالية', labelKu: 'ڕاپۆرتە داراییەکان و قازانج', labelEn: 'Financial Reports & Profits', descAr: 'الاطلاع على الأرباح، تقارير الضرائب والتدقيق المالي', descKu: 'بینینی قازانج و ڕاپۆرتە داراییەکان و باج', descEn: 'View revenue, net profit & analytics', icon: ShieldCheck },
    { key: 'shifts', labelAr: 'إغلاق ورديات الكاشير وتقارير الشفت', labelKu: 'داخستنی شفتەکانی کاشێر', labelEn: 'Cashier Shift Reports', descAr: 'فتح وإغلاق اليوميات وجرد الصندوق النقدي لكل كاشير', descKu: 'کردنەوە و داخستنی خولی ڕۆژانە و جەردی قاصە', descEn: 'Close daily cashier shifts and cash drawers', icon: ShieldCheck },
    { key: 'settings', labelAr: 'إعدادات المتجر والنظام العام', labelKu: 'ڕێکخستنەکانی فرۆشگە و سیستم', labelEn: 'Store Configuration Settings', descAr: 'تغيير اسم المحل، العملة، نسب الضرائب والنسخ الاحتياطي', descKu: 'گۆڕینی ناوی مارکێت، دراو، ڕێژەی باج و باکئەپ', descEn: 'Configure store profile, VAT tax and backups', icon: ShieldCheck },
  ];

  const filteredAccounts = userAccounts.filter(acc => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      acc.fullName?.toLowerCase().includes(q) ||
      acc.username?.toLowerCase().includes(q) ||
      acc.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-[#10192D] p-5 rounded-3xl border border-blue-500/20 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>{isKu ? 'بەڕێوەبردنی هەژمارەکانی بەکارهێنەران و پێدانی دەسەڵاتەکان' : isAr ? 'إدارة حسابات المستخدمين وتخصيص الصلاحيات' : 'User Accounts & Granular Permissions Hub'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isKu 
              ? 'دروستکردن، دەستکاریکردن و دیاریکردنی وردی بەشە ڕێگەپێدراوەکانی هەر کاشێر و بەڕێوەبەرێک' 
              : isAr 
              ? 'إنشاء وتعديل ملفات الكاشير والمشرفين والتحكم الدقيق في كافة الصلاحيات والأقسام التشغيلية' 
              : 'Create user profiles, assign roles, and toggle granular operational permissions'}
          </p>
        </div>

        <button
          onClick={handleOpenNewAccountModal}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white text-xs font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4 stroke-[3]" />
          <span>{isKu ? '➕ دروستکردنی هەژماری نوێ' : isAr ? '➕ إنشاء حساب مستخدم جديد' : 'Create New Account'}</span>
        </button>
      </div>

      {formSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs text-center font-bold animate-bounce flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{formSuccessMessage}</span>
        </div>
      )}

      {/* USER ACCOUNTS LIST TABLE */}
      <div className="cyber-card p-6 rounded-3xl border border-blue-500/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black text-white">
              {isKu ? `لیستی هەژمارە چالاکەکان (${userAccounts.length})` : isAr ? `قائمة الحسابات المعرفة في النظام (${userAccounts.length})` : `Registered System Accounts (${userAccounts.length})`}
            </h3>
          </div>

          <div className="relative w-64 max-w-full">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKu ? 'گەڕان بەپێی ناو یان یوزەر...' : isAr ? 'بحث بالاسم أو اسم المستخدم...' : 'Search accounts...'}
              className="w-full bg-[#0B1120] text-slate-200 text-xs ps-8 pe-3 py-2 rounded-xl border border-slate-800 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#0B1120] text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5 text-start">{isKu ? 'بەکارهێنەر' : isAr ? 'المستخدم' : 'User'}</th>
                <th className="p-3.5 text-start">{isKu ? 'ڕۆڵ' : isAr ? 'الدور / الرتبة' : 'Role'}</th>
                <th className="p-3.5 text-start">{isKu ? 'وشەی تێپەڕبوون (PIN)' : isAr ? 'رمز الدخول (PIN)' : 'PIN'}</th>
                <th className="p-3.5 text-start">{isKu ? 'دۆخ' : isAr ? 'الحالة' : 'Status'}</th>
                <th className="p-3.5 text-end">{isKu ? 'کردارەکان' : isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#0E1628]/60">
              {filteredAccounts.map((usr) => (
                <tr key={usr.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={usr.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                        alt={usr.fullName}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-cyan-500/50 shrink-0"
                      />
                      <div>
                        <span className="font-bold text-slate-200 block">{usr.fullName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">@{usr.username}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border inline-block ${
                      usr.role === 'Admin'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : usr.role === 'Manager'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {usr.role === 'Admin' ? (isKu ? 'بەڕێوەبەری گشتی' : isAr ? 'مدير عام' : 'Admin') : usr.role === 'Manager' ? (isKu ? 'بەڕێوەبەری لک' : isAr ? 'مدير فرع' : 'Manager') : (isKu ? 'کاشێری فرۆشتن' : isAr ? 'كاشير مبيعات' : 'Cashier')}
                    </span>
                  </td>

                  <td className="p-3.5 font-mono text-slate-400">
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-[11px] text-cyan-300 font-bold">
                      {usr.pinCode ? `PIN: ${usr.pinCode}` : '••••'}
                    </span>
                  </td>

                  <td className="p-3.5">
                    <button
                      onClick={() => handleToggleUserStatus(usr.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                        usr.active
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {usr.active ? (isKu ? 'چالاکە' : isAr ? 'مفعل' : 'Active') : (isKu ? 'ناچالاکە' : isAr ? 'معطل' : 'Disabled')}
                    </button>
                  </td>

                  <td className="p-3.5 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedPermissionUserId(usr.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                          selectedPermissionUserId === usr.id 
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                            : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>{isKu ? 'دەسەڵاتەکان' : isAr ? 'الصلاحيات' : 'Permissions'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditAccountModal(usr)}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isKu ? 'دەستکاری' : isAr ? 'تعديل' : 'Edit'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteUser(usr.id)}
                        className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 transition-colors"
                        title={isKu ? 'سڕینەوە' : isAr ? 'حذف' : 'Delete'}
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

      {/* DETAILED PERMISSIONS TOGGLE SWITCHES SECTION */}
      {selectedUser && (
        <div className="cyber-card p-6 rounded-3xl border border-cyan-500/30 space-y-5 bg-[#0E1628]/90 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-3">
            <div>
              <h3 className="text-base font-black text-cyan-300 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>{isKu ? 'بەشی دەستکاریکردن و تایبەتکردنی دەسەڵاتەکانی بەکارهێنەر (Toggle Switches)' : isAr ? 'قسم تعديل وتخصيص صلاحيات المستخدمين بالتفصيل (Toggle Switches)' : 'Granular User Permissions Manager'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isKu 
                  ? `دەستکاری دەسەڵاتەکانی پەڕە و بەشەکان بۆ (${selectedUser.fullName})`
                  : isAr 
                  ? `التحكم في القوائم والأقسام المصرح بها للمستخدم (${selectedUser.fullName}) بمفاتيح تبديل فورية` 
                  : `Toggle operational rights for ${selectedUser.fullName}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">{isKu ? 'هەژمار:' : isAr ? 'المستخدم المختار:' : 'Selected:'}</span>
              <select
                value={selectedUser.id}
                onChange={(e) => setSelectedPermissionUserId(e.target.value)}
                className="bg-slate-900 border border-cyan-500/40 text-cyan-200 text-xs font-bold rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner"
              >
                {userAccounts.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} (@{u.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                  {isKu ? '🛒 دەسەڵاتی پێشنیارکراوی کاشێر' : isAr ? '🛒 صلاحيات الكاشير الموصى بها (POS والعملاء فقط)' : 'Cashier Preset'}
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

            {/* TOGGLE SWITCHES GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {permissionDefinitions.map((def) => {
                const isEnabled = !!(selectedUser.permissions as any)?.[def.key];
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

                    {/* iOS style Toggle Switch */}
                    <div className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${isEnabled ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-700'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${isEnabled ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RENDER ACCOUNT CREATION & EDITING MODAL */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSaveAccount={handleSaveAccount}
        editingAccount={editingAccount}
        settings={settings}
      />
    </div>
  );
};
