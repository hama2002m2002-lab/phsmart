import React from 'react';
import { FileText, RotateCcw, Vault, Printer, LogOut, Globe, Home, Sun, Moon, Menu, X, Tv } from 'lucide-react';
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
  onOpenCustomerDisplay?: () => void;
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
  onLogout,
  isPOSMode = false,
  onExitPOS,
  onOpenCompletedReceipts,
  onOpenSalesReturn,
  onOpenCashDrawer,
  onOpenShiftReport,
  onOpenCustomerDisplay,
  onToggleSidebar,
  isSidebarOpen = false,
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
    <header className="sticky top-0 z-40 bg-[#0B1120]/95 backdrop-blur-md border-b border-blue-500/20 px-2 sm:px-4 lg:px-6 py-2 transition-all select-none">
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 max-w-full">
        
        {/* Left: Mobile Menu Toggle + Store Brand & Active Cashier */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 rtl:space-x-reverse min-w-0">
          {/* Mobile Hamburger Button */}
          {!isPOSMode && onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/90 border border-slate-700 text-cyan-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all cursor-pointer shrink-0 shadow-sm"
              title={isSidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة الجانبية'}
              aria-label="Toggle Navigation Menu"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-400/30 shrink-0">
            {cashierName.charAt(0)}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-amber-400 font-bold text-[10px] sm:text-xs shrink-0">
                {isAr ? 'الكاشير:' : isKu ? 'کاشێر:' : 'Cashier:'}
              </span>
              <h1 className="text-xs sm:text-sm font-black text-slate-100 tracking-wide truncate max-w-[95px] xs:max-w-[130px] sm:max-w-[200px]">
                {cashierName}
              </h1>
              {currentUser?.role && (
                <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded-md bg-cyan-950/90 text-cyan-300 border border-cyan-500/30 font-bold shrink-0">
                  {currentUser.role === 'Admin' ? (isAr ? 'مدير' : 'Admin') : (isAr ? 'كاشير' : 'Cashier')}
                </span>
              )}
            </div>
            <p className="text-[9px] sm:text-[10px] font-semibold text-cyan-400/80 flex items-center gap-1 truncate mt-0.5">
              <span className="font-bold text-slate-300 truncate max-w-[85px] xs:max-w-[120px] sm:max-w-[160px]">{storeDisplayName}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{isKu ? 'سیستەمی فرۆشتن' : isAr ? 'نظام إدارة المبيعات' : 'Sales System'}</span>
            </p>
          </div>
        </div>

        {/* Center/Right: Language Switcher, Theme and POS buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse shrink-0">
          {/* Quick Language Switcher */}
          <div className="flex items-center bg-[#10192D] border border-cyan-500/30 rounded-xl p-0.5 gap-0.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400 ml-1 mr-0.5 shrink-0 hidden md:inline" />
            <button
              type="button"
              onClick={() => handleLanguageChange('ar')}
              className={`px-1.5 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer active:scale-95 ${
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
              className={`px-1.5 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer active:scale-95 ${
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
              className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer active:scale-95 ${
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
          <div className="flex items-center bg-[#10192D] border border-cyan-500/30 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() =>
                setSettings(prev => ({
                  ...prev,
                  themeMode: prev.themeMode === 'light' ? 'dark' : 'light'
                }))
              }
              className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
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
                  <Sun className="w-3.5 h-3.5 text-amber-100 shrink-0" />
                  <span className="hidden md:inline">{isAr ? 'نهاري' : isKu ? 'ڕۆژ' : 'Day'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
                  <span className="hidden md:inline">{isAr ? 'ليلي' : isKu ? 'شەو' : 'Night'}</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Actions when in POS mode */}
          {isPOSMode && (
            <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse overflow-x-auto custom-scrollbar py-0.5">
              {onOpenSalesReturn && (
                <button
                  onClick={onOpenSalesReturn}
                  className="flex items-center space-x-1 rtl:space-x-reverse px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:brightness-110 text-white text-[11px] sm:text-xs font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.35)] border border-rose-400/40 active:scale-95 cursor-pointer shrink-0"
                  title={isAr ? 'استرجاع مواد مباعة بالباركود، رقم الوصل، أو الاسم' : 'Sales Return'}
                >
                  <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-100" />
                  <span className="hidden xs:inline">{isAr ? 'استرجاع' : isKu ? 'گەڕاندنەوە' : 'Return'}</span>
                </button>
              )}

              {onOpenCashDrawer && (
                <button
                  onClick={onOpenCashDrawer}
                  className="flex items-center space-x-1 rtl:space-x-reverse px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-[11px] sm:text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] border border-emerald-400/40 active:scale-95 cursor-pointer shrink-0"
                  title={isAr ? 'واجهة حركة الخزنة وصندوق الكاشير' : 'Cash Safe & Treasury'}
                >
                  <Vault className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-200" />
                  <span className="hidden xs:inline">{isAr ? 'الخزنة' : isKu ? 'سندوق' : 'Safe'}</span>
                </button>
              )}

              {onOpenShiftReport && (
                <button
                  onClick={onOpenShiftReport}
                  className="flex items-center space-x-1 rtl:space-x-reverse px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-700 hover:brightness-110 text-white text-[11px] sm:text-xs font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] border border-amber-400/40 active:scale-95 cursor-pointer shrink-0"
                  title={isAr ? 'طباعة تقرير ملخص وردية اليوم وإحصائيات الدرج' : 'Print Shift Report'}
                >
                  <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-100" />
                  <span className="hidden sm:inline">{isAr ? 'ملخص الورديات' : isKu ? 'ڕاپۆرت' : 'Report'}</span>
                </button>
              )}

              {onExitPOS && (
                <button
                  onClick={onExitPOS}
                  className="flex items-center space-x-1 rtl:space-x-reverse px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-900/80 via-slate-900 to-slate-800 hover:from-rose-800 hover:to-slate-700 text-rose-100 border border-rose-500/50 text-[11px] sm:text-xs font-black transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] shrink-0 cursor-pointer active:scale-95"
                  title={isAr ? 'الخروج من المبيعات والعودة للواجهة الرئيسية' : isKu ? 'دەرچوون بۆ لاپەڕەی سەرەکی' : 'Exit to Main Dashboard'}
                >
                  <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-300 shrink-0" />
                  <span>{isAr ? 'الرئيسية' : isKu ? 'سەرەکی' : 'Home'}</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};



