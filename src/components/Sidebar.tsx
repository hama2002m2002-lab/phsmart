import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  UserCheck, 
  Receipt, 
  Settings as SettingsIcon,
  Store,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lock,
  FileText,
  LogOut,
  User,
  Users,
  X
} from 'lucide-react';
import { StoreSettings, UserAccount } from '../types';
import { getTranslation } from '../lib/translations';

export type MainNavTab = 
  | 'dashboard' 
  | 'products' 
  | 'inventoryAudit'
  | 'damagedItems'
  | 'delegateReturns'
  | 'purchases'
  | 'pos' 
  | 'vouchers'
  | 'accountsHub'
  | 'permissions'
  | 'suppliers' 
  | 'customers' 
  | 'orders' 
  | 'invoices' 
  | 'analytics'
  | 'reports'
  | 'cashierAccounts'
  | 'settings';

interface SidebarProps {
  activeTab: MainNavTab;
  setActiveTab: (tab: MainNavTab) => void;
  settings: StoreSettings;
  lowStockCount: number;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  lowStockCount,
  currentUser,
  onLogout,
  onClose,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const checkHasPermission = (tabId: MainNavTab): boolean => {
    if (!currentUser || currentUser.role === 'Admin') return true;
    const perms = currentUser.permissions;
    if (!perms) return true;

    switch (tabId) {
      case 'dashboard': return perms.canAccessDashboard !== false;
      case 'vouchers': return perms.canAccessPOS || (perms.canManagePurchases ?? perms.canManageProducts) || perms.canManageProducts;
      case 'pos': return perms.canAccessPOS;
      case 'products': return Boolean(perms.canManageProducts || perms.canViewWarehouse);
      case 'inventoryAudit': return perms.canManageInventoryAudit ?? perms.canManageProducts;
      case 'damagedItems': return perms.canManageProducts;
      case 'delegateReturns': return perms.canManageProducts || perms.canManageSuppliers;
      case 'purchases': return perms.canManagePurchases ?? perms.canManageProducts;
      case 'accountsHub': return perms.canAccessPOS || perms.canManageSuppliers || perms.canManageCustomers || perms.canManageOrders || perms.canViewReports || perms.canManageSettings;
      case 'permissions': return perms.canManageSettings;
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

  const isVouchersActive = ['vouchers', 'pos', 'purchases', 'delegateReturns', 'invoices'].includes(activeTab);
  const isAccountsHubActive = ['accountsHub', 'suppliers', 'customers', 'orders', 'permissions'].includes(activeTab);

  const navItems = [
    {
      id: 'dashboard' as MainNavTab,
      labelKey: 'dashboard',
      icon: LayoutDashboard,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'reports' as MainNavTab,
      labelKey: 'reports',
      icon: FileText,
      color: 'from-cyan-600 to-blue-600',
    },
    {
      id: 'cashierAccounts' as MainNavTab,
      labelKey: 'cashierAccounts',
      icon: UserCheck,
      color: 'from-cyan-500 via-blue-600 to-indigo-600',
      badge: isKu ? 'کاشێر' : isAr ? 'كاشير' : 'Cashier',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.25)]',
    },
    {
      id: 'vouchers' as MainNavTab,
      labelKey: 'vouchers',
      icon: Receipt,
      color: 'from-emerald-500 via-teal-500 to-cyan-600',
      badge: isKu ? 'وصلات' : isAr ? 'وصلات' : 'Vouchers',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]',
    },
    {
      id: 'products' as MainNavTab,
      labelKey: 'products',
      icon: Package,
      color: 'from-cyan-500 to-blue-600',
      badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse',
    },
    {
      id: 'accountsHub' as MainNavTab,
      labelKey: 'accountsHub',
      icon: Users,
      color: 'from-purple-500 via-indigo-500 to-pink-500',
      badge: isKu ? 'هەژمارەکان' : isAr ? 'الحسابات' : 'Accounts',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.25)]',
    },
    {
      id: 'settings' as MainNavTab,
      labelKey: 'settings',
      icon: SettingsIcon,
      color: 'from-slate-500 to-slate-700',
    }
  ];

  const handleTabClick = (tabId: MainNavTab, labelText?: string) => {
    const allowed = checkHasPermission(tabId);
    if (!allowed) {
      const tabName = labelText || getTranslation(lang, tabId);
      alert(isKu
        ? `ببوورە، دەستگەیشتن بەم بەشە (${tabName}) بۆ هەژمارەکەت (${currentUser?.fullName}) ڕێگەپێنەدراوە.`
        : isAr 
        ? `عذراً، هذا القسم (${tabName}) غير مسموح لحسابك (${currentUser?.fullName}). يرجى مراجعة مدير المنظومة لمنح الصلاحية.` 
        : `Access Restricted. Please ask your Admin for permission to view ${tabName}.`
      );
      return;
    }
    setActiveTab(tabId);
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className="w-full h-full bg-[#0B1120] border-r border-blue-500/20 rtl:border-r-0 rtl:border-l p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar">
      
      {/* Upper Navigation List */}
      <div className="space-y-4 sm:space-y-6">
        
        {/* Mobile Header with Close Button */}
        {onClose && (
          <div className="lg:hidden flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-xs">
                {settings.storeName.charAt(0)}
              </div>
              <span className="text-xs font-bold text-slate-200">
                {isKu ? 'تەواوی بەشەکان' : isAr ? 'قائمة أقسام النظام' : 'Main Menu'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer active:scale-95"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Category Label */}
        <div>
          <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mb-2 sm:mb-3 px-2">
            {getTranslation(lang, 'mainMenu')}
          </p>

          <nav className="space-y-1 sm:space-y-1.5">
            {navItems
              .filter((item) => {
                // For non-Admin users (like Cashiers), display only the permitted menu lists
                if (currentUser && currentUser.role !== 'Admin') {
                  return checkHasPermission(item.id);
                }
                return true;
              })
              .map((item) => {
                const Icon = item.icon;
                const isActive = item.id === 'vouchers' 
                  ? isVouchersActive 
                  : item.id === 'accountsHub' 
                  ? isAccountsHubActive 
                  : activeTab === item.id;
                const isAllowed = checkHasPermission(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id, getTranslation(lang, item.labelKey))}
                    className={`w-full flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/25 to-cyan-600/20 border border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-[1.01]'
                        : !isAllowed
                        ? 'text-slate-600 hover:bg-[#0E1526] opacity-70 cursor-not-allowed'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#10192D]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
                      <div
                        className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 ${
                          isActive
                            ? `bg-gradient-to-br ${item.color} text-white shadow-md`
                            : !isAllowed
                            ? 'bg-slate-900 text-slate-600'
                            : 'bg-slate-800/60 text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-right rtl:text-right font-medium truncate">
                        {getTranslation(lang, item.labelKey)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isAllowed ? (
                        <Lock className="w-3.5 h-3.5 text-rose-500/70 shrink-0" />
                      ) : item.badge ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
          </nav>
        </div>

        {/* Quick System Status Card */}
        {lowStockCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs font-bold">
                {isKu ? 'ئاگاداری کەمی کۆگا' : isAr ? 'تنبيه النقص' : 'Low Stock Warning'}
              </p>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              {isKu
                ? `${lowStockCount} کاڵا نزیکن لە تەواوبوون، تکایە ڕێژەکەی زیاد بکە.`
                : isAr
                ? `يوجد ${lowStockCount} أصناف قاربت على النفاد، يرجى التزويد.`
                : `${lowStockCount} items are near low threshold.`}
            </p>
            <button
              onClick={() => {
                setActiveTab('products');
                if (onClose) onClose();
              }}
              className="mt-2 text-[11px] text-amber-400 underline font-semibold hover:text-amber-300 cursor-pointer"
            >
              {isKu ? 'پشکنینی کاڵاکان ←' : isAr ? 'مراجعة الأصناف ←' : 'Review Items →'}
            </button>
          </div>
        )}

      </div>

      {/* Logged in User Profile Card & Logout Button */}
      {currentUser && (
        <div className="mt-4 p-3 rounded-2xl bg-[#0F172A] border border-slate-700/80 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{currentUser.fullName}</p>
              <p className="text-[10px] text-cyan-400 font-mono font-semibold">{currentUser.role} (@{currentUser.username})</p>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                if (onClose) onClose();
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:brightness-110 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-rose-400/30"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-100" />
              <span>{getTranslation(lang, 'logout')}</span>
            </button>
          )}
        </div>
      )}

      {/* Bottom Cyber Trophy / Store Branding Banner */}
      <div className="mt-6 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-[#131F37] to-[#0A101D] border border-blue-500/20 text-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
        <div className="relative z-10 space-y-1.5 sm:space-y-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-200">
            {isKu ? 'سیستەمی زیرەکی مارکێت ٢.٥' : isAr ? 'محرك الماركيت الذكي 2.5' : 'SuperMarket Engine 2.5'}
          </p>
          <p className="text-[10px] text-slate-400">
            {isKu ? 'پاسپاردار و هاوئاهەنگکراو' : isAr ? 'حماية مشفرة ومزامنة فورية' : 'Encrypted & Realtime Synced'}
          </p>
          <div className="pt-1 flex items-center justify-center space-x-2 rtl:space-x-reverse text-[10px] text-emerald-400 font-semibold">
            <TrendingUp className="w-3 h-3" />
            <span>{isKu ? 'ئاستی کارکردن ١٠٠٪' : isAr ? 'الأداء ممتاز 100%' : '100% Performance'}</span>
          </div>
        </div>
      </div>

    </aside>
  );
};
