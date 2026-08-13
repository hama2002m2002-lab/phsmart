import React from 'react';
import { FileText, RotateCcw, Vault, Printer, LogOut, Globe, Home, Sun, Moon } from 'lucide-react';
import { StoreSettings, UserAccount, Language } from '../types';
import { getTranslation } from '../lib/translations';

interface HeaderProps {
  activeTopTab: 'overview' | 'analytics' | 'reports' | 'notifications';
  setActiveTopTab: (tab: 'overview' | 'analytics' | 'reports' | 'notifications') => void;
  unreadNotifsCount: number;
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  onQuickPOS?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser: UserAccount | null;
  onLogout: () => void;
  isPOSMode?: boolean;
  onExitPOS?: () => void;
  onShowInventory?: () => void;
  inventoryCount?: number;
  onOpenInventoryAudit?: () => void;
  onOpenCompletedReceipts?: () => void;
  onOpenSalesReturn?: () => void;
  onOpenCashDrawer?: () => void;
  onOpenShiftReport?: () => void;
  onOpenMobileSync?: () => void;
  onOpenDesktopApp?: () => void;
  onOpenCSharpCode?: () => void;
  onOpenAccountsModal?: () => void;
  isFirebaseSynced?: boolean;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  setSettings,
  currentUser,
  isPOSMode = false,
  onExitPOS,
  onOpenCompletedReceipts,
  onOpenSalesReturn,
  onOpenCashDrawer,
  onOpenShiftReport,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const cashierName = currentUser?.fullName || currentUser?.username || (isAr ? 'الكاشير الرئيسي' : isKu ? 'کاشێری سەرەکی' : 'Main Cashier');
  const storeDisplayName = isKu ? (settings.storeNameKu || settings.storeNameAr || settings.storeName) : isAr ? (settings.storeNameAr || settings.storeName) : settings.storeName;

  const handleLanguageChange = (newLang: Language) => {
    setSettings(prev => ({
      ...prev,
      language: newLang
    }));
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B1120]/90 backdrop-blur-md border-b border-blue-500/20 px-4 lg:px-6 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Store Brand & Active Cashier */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-400/30 shrink-0">
            {cashierName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black text-slate-100 tracking-wide flex items-center gap-1.5">
                <span className="text-amber-400 font-bold text-[11px] sm:text-xs">
                  {isAr ? 'الكاشير:' : isKu ? 'کاشێر:' : 'Cashier:'}
                </span>
                <span>{cashierName}</span>
              </h1>
              {currentUser?.role && (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-950/90 text-cyan-300 border border-cyan-500/30 font-bold">
                  {currentUser.role === 'Admin' ? (isAr ? 'مدير' : 'Admin') : (isAr ? 'كاشير' : 'Cashier')}
                </span>
              )}
            </div>
            <p className="text-[10px] font-semibold text-cyan-400/80 flex items-center gap-1.5 mt-0.5">
              <span className="font-bold text-slate-300">{storeDisplayName}</span>
              <span>•</span>
              <span>{isKu ? 'سیستەمی فرۆشتن' : isAr ? 'نظام إدارة المبيعات' : 'Sales System'}</span>
            </p>
          </div>
        </div>

        {/* Center/Right: Language Switcher and POS buttons */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {/* Quick Language Switcher */}
          <div className="flex items-center bg-[#10192D] border border-cyan-500/30 rounded-xl p-1 gap-1">
            <Globe className="w-4 h-4 text-cyan-400 ml-1.5 mr-0.5 shrink-0 hidden sm:inline" />
            <button
              type="button"
              onClick={() => handleLanguageChange('ar')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                lang === 'ar'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="تغيير اللغة إلى العربية"
            >
              عربي
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('ku')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                lang === 'ku'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="گۆڕینی زمان بۆ کوردی"
            >
              کوردی
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Switch to English"
            >
              EN
            </button>
          </div>

          {/* Theme Switcher Button (Day / Night Mode - وضع ليلي و نهار) */}
          <div className="flex items-center bg-[#10192D] border border-cyan-500/30 rounded-xl p-1">
            <button
              type="button"
              onClick={() =>
                setSettings(prev => ({
                  ...prev,
                  themeMode: prev.themeMode === 'light' ? 'dark' : 'light'
                }))
              }
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                settings.themeMode === 'light'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]'
              }`}
              title={
                settings.themeMode === 'light'
                  ? (isAr ? 'التحويل إلى الوضع الليلي (الداكن)' : isKu ? 'دۆخی تاریک' : 'Switch to Dark Mode')
                  : (isAr ? 'التحويل إلى الوضع النهاري (الفاتح)' : isKu ? 'دۆخی ڕووناک' : 'Switch to Light Mode')
              }
            >
              {settings.themeMode === 'light' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-100 shrink-0 animate-spin-slow" />
                  <span>{isAr ? 'نهاري' : isKu ? 'ڕۆژ' : 'Day'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
                  <span>{isAr ? 'ليلي' : isKu ? 'شەو' : 'Night'}</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Actions when in POS mode */}
          {isPOSMode && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              {onOpenSalesReturn && (
                <button
                  onClick={onOpenSalesReturn}
                  className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:brightness-110 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.35)] border border-rose-400/40 active:scale-95 cursor-pointer shrink-0"
                  title={isAr ? 'استرجاع مواد مباعة بالباركود، رقم الوصل، أو الاسم' : 'Sales Return'}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-100" />
                  <span>{isAr ? 'استرجاع المواد' : isKu ? 'گەڕاندنەوەی کاڵاکان' : 'Sales Return'}</span>
                </button>
              )}

              {onOpenCashDrawer && (
                <button
                  onClick={onOpenCashDrawer}
                  className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] border border-emerald-400/40 active:scale-95 cursor-pointer shrink-0"
                  title={isAr ? 'واجهة حركة الخزنة وصندوق الكاشير' : 'Cash Safe & Treasury'}
                >
                  <Vault className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                  <span>{isAr ? 'واجهة الخزنة' : isKu ? 'سندوقی پارە' : 'Cash Safe'}</span>
                </button>
              )}

              {onOpenShiftReport && (
                <button
                  onClick={onOpenShiftReport}
                  className="flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-700 hover:brightness-110 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] border border-amber-400/40 active:scale-95 cursor-pointer shrink-0"
                  title={isAr ? 'طباعة تقرير ملخص وردية اليوم وإحصائيات الدرج' : 'Print Shift Report'}
                >
                  <Printer className="w-3.5 h-3.5 text-amber-100" />
                  <span>{isAr ? 'ملخص الورديات' : isKu ? 'ڕاپۆرتی نۆبەت' : 'Shift Report'}</span>
                </button>
              )}

              {onExitPOS && (
                <button
                  onClick={onExitPOS}
                  className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-900/80 via-slate-900 to-slate-800 hover:from-rose-800 hover:to-slate-700 text-rose-100 border border-rose-500/50 text-xs font-black transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] shrink-0 cursor-pointer active:scale-95"
                  title={isAr ? 'الخروج من المبيعات والعودة للواجهة الرئيسية' : isKu ? 'دەرچوون بۆ لاپەڕەی سەرەکی' : 'Exit to Main Dashboard'}
                >
                  <Home className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span>{isAr ? 'الخروج للرئيسية' : isKu ? 'گەڕانەوە بۆ سەرەکی' : getTranslation(lang, 'exitPOS')}</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};


