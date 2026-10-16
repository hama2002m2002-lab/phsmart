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
  Printer,
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
  | 'print'
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
    },
    {
      id: 'vouchers' as MainNavTab,
      labelKey: 'vouchers',
      icon: Receipt,
      color: 'from-emerald-500 via-teal-500 to-cyan-600',
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
    },
    {
      id: 'print' as MainNavTab,
      labelKey: 'print',
      icon: Printer,
      color: 'from-amber-500 via-orange-500 to-cyan-500',
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
    <aside className="w-full h-full bg-[#0B1120] border-r border-blue-500/20 rtl:border-r-0 rtl:border-l px-2.5 py-3 flex flex-col justify-between overflow-y-auto custom-scrollbar select-none">
      
      {/* Upper Navigation List */}
      <div className="space-y-3 sm:space-y-4">
        
        {/* Mobile Header with Close Button */}
        {onClose && (
          <div className="lg:hidden flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-xs">
                {settings.storeName.charAt(0)}
              </div>
              <span className="text-xs font-bold text-slate-200">
                {isKu ? 'تەواوی بەشەکان' : isAr ? 'قائمة أقسام النظام' : 'Main Menu'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer active:scale-95"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Category Label */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 sm:mb-2 px-1.5 whitespace-nowrap">
            {getTranslation(lang, 'mainMenu')}
          </p>

          <nav className="space-y-1">
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
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/25 to-cyan-600/20 border border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-[1.01]'
                        : !isAllowed
                        ? 'text-slate-600 hover:bg-[#0E1526] opacity-70 cursor-not-allowed'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#10192D]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
                      <div
                        className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 shrink-0 ${
                          isActive
                            ? `bg-gradient-to-br ${item.color} text-white shadow-md`
                            : !isAllowed
                            ? 'bg-slate-900 text-slate-600'
                            : 'bg-slate-800/60 text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-right rtl:text-right font-bold whitespace-nowrap">
                        {getTranslation(lang, item.labelKey)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isAllowed ? (
                        <Lock className="w-3.5 h-3.5 text-rose-500/70 shrink-0" />
                      ) : item.badge ? (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${item.badgeColor}`}
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
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <p className="text-[11px] font-bold whitespace-nowrap">
                {isKu ? 'ئاگاداری کەمی کۆگا' : isAr ? 'تنبيه النقص' : 'Low Stock'}
              </p>
            </div>
            <p className="text-[10px] text-amber-200/80 leading-tight">
              {isKu
                ? `${lowStockCount} کاڵا نزیکن لە تەواوبوون.`
                : isAr
                ? `${lowStockCount} أصناف قاربت النفاد.`
                : `${lowStockCount} items low.`}
            </p>
            <button
              onClick={() => {
                setActiveTab('products');
                if (onClose) onClose();
              }}
              className="mt-1.5 text-[10px] text-amber-400 underline font-semibold hover:text-amber-300 cursor-pointer block"
            >
              {isKu ? 'پشکنین ←' : isAr ? 'مراجعة الأصناف ←' : 'Review →'}
            </button>
          </div>
        )}

      </div>

      {/* Logged in User Profile Card & Logout Button */}
      {currentUser && (
        <div className="mt-3 p-2 rounded-xl bg-[#0F172A] border border-slate-700/80 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white truncate">{currentUser.fullName}</p>
              <p className="text-[9px] text-cyan-400 font-mono font-semibold truncate">{currentUser.role} (@{currentUser.username})</p>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                if (onClose) onClose();
              }}
              className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-700 hover:brightness-110 text-white text-[11px] font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border border-rose-400/30 whitespace-nowrap"
            >
              <LogOut className="w-3 h-3 text-rose-100" />
              <span>{getTranslation(lang, 'logout')}</span>
            </button>
          )}
        </div>
      )}

    </aside>
  );
};
