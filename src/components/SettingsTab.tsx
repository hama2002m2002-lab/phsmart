import React, { useState, useRef } from 'react';
import { Settings as SettingsIcon, Store, Globe, DollarSign, Percent, Save, CheckCircle2, Database, Download, Upload, RefreshCw, Keyboard, FileText, Wifi, Moon, Sun, Zap, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { StoreSettings, Product, SaleTransaction, Supplier, Customer, MarketOrder, MarketNotification, PurchaseInvoice, UserAccount } from '../types';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { getTranslation } from '../lib/translations';
import { exportStoreToExcel, exportProductsToExcel, parseExcelBackupFile } from '../lib/excelExport';
import { syncBulkWriteCollection } from '../lib/firestoreSync';

interface SettingsTabProps {
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  userAccounts?: UserAccount[];
  setUserAccounts?: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  products?: Product[];
  salesHistory?: SaleTransaction[];
  suppliers?: Supplier[];
  customers?: Customer[];
  orders?: MarketOrder[];
  notifications?: MarketNotification[];
  purchaseInvoices?: PurchaseInvoice[];
  onImportBackup?: (backupData: any) => number | void;
  onlyPermissionsAndAccounts?: boolean;
  initialSubTab?: 'general';
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  settings, 
  setSettings,
  userAccounts = [],
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
  const [isSavedMessage, setIsSavedMessage] = useState<string>('');

  // POS Keyboard Shortcuts Modal State
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const handleChange = (field: keyof StoreSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleManualSave = () => {
    localStorage.setItem('supermarket_settings_v3', JSON.stringify(settings));
    setIsSavedMessage(isKu ? 'ڕێکخستنەکان بە سەرکەوتوویی پاشەکەوت کران!' : isAr ? 'تم حفظ كافة الإعدادات بنجاح!' : 'Settings saved successfully!');
    setTimeout(() => setIsSavedMessage(''), 3500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-[#10192D] p-5 rounded-3xl border border-blue-500/20 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
            {isKu ? 'ڕێکخستنەکانی گشتی و زانیاری فرۆشگە' : isAr ? 'الإعدادات العامة وبيانات المتجر' : 'General Store Settings'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isKu 
              ? 'ڕێکخستنی زانیارییەکانی باجی پسوولە، دراو، زمان، ڕووکاری سیستم و باکئەپی داتاکان' 
              : isAr 
              ? 'تخصيص بيانات الفواتير الضريبية، العملة، اللغة، مظهر النظام والنسخ الاحتياطي' 
              : 'Configure VAT tax rates, currency, language, system theme, and full backups'}
          </p>
        </div>

        {/* ACTION BUTTONS: KEYBOARD SHORTCUTS & SAVE SETTINGS */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white text-xs font-black shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-cyan-400/30"
          >
            <Keyboard className="w-4 h-4 text-cyan-300" />
            <span>{isKu ? '⌨️ کورتەبڕەکانی تەختەکلیل (Hotkeys)' : isAr ? '⌨️ اختصارات لوحة المفاتيح' : '⌨️ POS Keyboard Shortcuts'}</span>
          </button>

          <button
            onClick={handleManualSave}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white text-xs font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isKu ? 'پاشەکەوتکردنی ڕێکخستنەکان' : isAr ? 'حفظ التغييرات' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {isSavedMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs text-center font-bold animate-bounce flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{isSavedMessage}</span>
        </div>
      )}

      {/* RENDER KEYBOARD SHORTCUTS CONFIGURATION MODAL */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />

      {/* STORE SETTINGS CONFIGURATION */}
      <div className="cyber-card p-6 rounded-3xl border border-blue-500/20 space-y-6 max-w-4xl">

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
              className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                settings.language === 'ar'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🇸🇦</span>
                <span>العربية</span>
              </span>
              {settings.language === 'ar' && <CheckCircle2 className="w-4 h-4 text-cyan-200" />}
            </button>

            <button
              type="button"
              onClick={() => handleChange('language', 'en')}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                settings.language === 'en'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🇬🇧</span>
                <span>English</span>
              </span>
              {settings.language === 'en' && <CheckCircle2 className="w-4 h-4 text-cyan-200" />}
            </button>

            <button
              type="button"
              onClick={() => handleChange('language', 'ku')}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                settings.language === 'ku'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0B1120] text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>☀️</span>
                <span>کوردی (Kurdish)</span>
              </span>
              {settings.language === 'ku' && <CheckCircle2 className="w-4 h-4 text-cyan-200" />}
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
              {settings.themeMode !== 'light' && <CheckCircle2 className="w-4 h-4 text-cyan-300" />}
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
              {settings.themeMode === 'light' && <CheckCircle2 className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>

        {/* Store Profile Information */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Store className="w-4 h-4 text-cyan-400" />
            {isKu ? 'زانیارییە سەرەکییەکانی فرۆشگە و پەڕگەی بازرگانی' : isAr ? 'المعلومات الأساسية للمتجر والسجل التجاري' : 'Store Information'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'ناوی فەرمی فرۆشگە / سوپەرمارکێت' : isAr ? 'اسم المتجر / السوبرماركت' : 'Store Name'}</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'ناونیشانی لک / شوێن' : isAr ? 'عنوان الفرع أو الموقع' : 'Store Address'}</label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'ژمارەی مۆبایل / پەیوەندی' : isAr ? 'رقم هاتف المتجر / خدمة العملاء' : 'Store Phone'}</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:border-cyan-400 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'ناوی عەرەبی بۆ پسوولە' : isAr ? 'اسم المتجر بالعربي' : 'Store Name (Arabic)'}</label>
              <input
                type="text"
                value={settings.storeNameAr || ''}
                onChange={(e) => handleChange('storeNameAr', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Currency and Financial Parameters */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cyan-400" />
            {isKu ? 'دراوی سەرەکی، باج و ئاستی کەمبوونەوەی کاڵا' : isAr ? 'العملة الأساسية والنسب الضريبية وحد التنبيه' : 'Currency & Financial Settings'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'دراوی سیستەم' : isAr ? 'العملة المعتمدة' : 'Currency'}</label>
              <select
                value={settings.currencySymbol}
                onChange={(e) => handleChange('currencySymbol', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:border-cyan-400 focus:outline-none font-bold"
              >
                <option value="د.ع">د.ع IQD (دیناری عێراقی / دينار عراقي)</option>
                <option value="$">$ USD (دۆلار / دولار أمريكي)</option>
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
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 text-center font-mono font-bold rounded-xl border border-blue-500/20 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'ئاستی کەمیی کاڵا لە کۆگا' : isAr ? 'حد انخفاض المخزون الافتراضي' : 'Low Stock Default'}</label>
              <input
                type="number"
                value={settings.lowStockThresholdDefault}
                onChange={(e) => handleChange('lowStockThresholdDefault', Number(e.target.value))}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 text-center font-mono font-bold rounded-xl border border-blue-500/20 focus:border-cyan-400 focus:outline-none"
              />
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
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block">{isKu ? 'پەیامی سوپاسگوزاری و یاسای گەڕاندنەوە لە خوارەوە' : isAr ? 'رسالة الشكر وسياسة الترجيع في الأسفل' : 'Footer Return Policy Message'}</label>
              <input
                type="text"
                value={settings.receiptFooterMsg}
                onChange={(e) => handleChange('receiptFooterMsg', e.target.value)}
                className="w-full bg-[#0B1120] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Data Security & Automatic Persistence Banner */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>{isKu ? 'پاشەکەوتکردن و هاوردە/هەناردەی گشتی داتاکان' : isAr ? 'النسخ الاحتياطي وإدارة تصدير واستيراد بيانات المنظومة' : 'Data Backup, Export & Import Management'}</span>
            </h3>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isKu ? 'سیستەمی پاراستنی داتا' : isAr ? 'نظام الحفظ المتكامل' : 'Safe Storage'}</span>
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0B1528] to-[#070D18] border border-blue-500/30 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isKu ? 'پاشەکەوتکردنی خۆکار چالاککراوە (localStorage & Firestore)' : isAr ? 'ميزة الحفظ والتخزين التلقائي مفعّلة بنجاح' : 'Auto-Save Persistence Active'}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed max-w-2xl">
                  {isKu
                    ? 'هەموو زانیارییەکان (کاڵاکان، نرخەکان، کڕینەکان، دابینکەران، فرۆشتنەکان، مەندوب، قەرزارەکان، و ڕاپۆرتەکان) پارێزراون و دەتوانی لە یەک پەڕگەدا هەناردە و هاوردەیان بکەیت.'
                    : isAr
                    ? 'جميع بيانات المنظومة (المواد، الأسعار، المبيعات، المشتريات، الموردين والشركات، المندوبين، العملاء، المصاريف، التقارير وحركات الصندوق) تُحفظ تلقائياً ومجهزة للتصدير والاستيراد الشامل بنقرة واحدة.'
                    : 'All system data (products, sales, purchases, suppliers, delegates, customers, expenses, and financial reports) are persisted and exportable.'}
                </p>
              </div>

              {importStatus && (
                <div className="px-3.5 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 font-bold text-xs shrink-0 animate-pulse flex items-center gap-1.5 shadow-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{importStatus}</span>
                </div>
              )}
            </div>

            {/* Organized Export & Import Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              
              {/* Primary Action Card: Comprehensive All-In-One Export */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/60 border border-emerald-500/40 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>{isKu ? 'هەناردەکردنی گشتگیری هەموو داتاکان' : isAr ? 'تصدير شامل لكافة بيانات البرنامج والتقارير' : 'Master Export (All Program Data)'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isKu
                      ? 'هەناردەی (کاڵاکان، نرخ، فرۆشتن، کڕین، مەندوب، دابینکەران، کڕیاران، خەرجی، و تەواوی ڕاپۆرتە داراییەکان) بۆ ناو فایلی Excel .xlsx'
                      : isAr
                      ? 'تصدير (المواد، الأسعار، المبيعات، المشتريات، الموردين، المندوب، ديون العملاء، المصاريف، والتفاصيل المالية الشاملة) في ملف Excel .xlsx واحد منظم.'
                      : 'Exports products, prices, sales, purchases, suppliers, delegates, expenses, and full reports into multi-sheet Excel.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const currentProducts = products || JSON.parse(localStorage.getItem('supermarket_products_v1') || '[]');
                      const currentSales = salesHistory || JSON.parse(localStorage.getItem('supermarket_sales_v1') || '[]');
                      const currentSuppliers = suppliers || JSON.parse(localStorage.getItem('supermarket_suppliers_v1') || '[]');
                      const currentCustomers = customers || JSON.parse(localStorage.getItem('supermarket_customers_v1') || '[]');
                      const currentPurchases = purchaseInvoices || JSON.parse(localStorage.getItem('supermarket_purchases_v1') || '[]');
                      const currentUsers = userAccounts || JSON.parse(localStorage.getItem('supermarket_user_accounts_v3') || localStorage.getItem('supermarket_user_accounts_v1') || '[]');
                      const currentOrders = orders || JSON.parse(localStorage.getItem('supermarket_orders_v1') || '[]');
                      const currentNotifs = notifications || JSON.parse(localStorage.getItem('supermarket_notifications_v1') || '[]');
                      const currentDamaged = JSON.parse(localStorage.getItem('pos_damaged_items_logs') || '[]');
                      const currentDelegateReturns = JSON.parse(localStorage.getItem('pos_delegate_returns_logs') || '[]');
                      const currentExpenses = JSON.parse(localStorage.getItem('pos_custom_operating_expenses') || '[]');
                      const currentExpenseTypes = JSON.parse(localStorage.getItem('pos_custom_expense_types') || '[]');
                      const currentCashAdjustments = JSON.parse(localStorage.getItem('pos_cash_adjustments') || '[]');
                      const currentInventoryAudits = JSON.parse(localStorage.getItem('pos_inventory_audits_v1') || '[]');

                      exportStoreToExcel({
                        products: currentProducts,
                        salesHistory: currentSales,
                        suppliers: currentSuppliers,
                        customers: currentCustomers,
                        purchaseInvoices: currentPurchases,
                        userAccounts: currentUsers,
                        orders: currentOrders,
                        notifications: currentNotifs,
                        damagedLogs: currentDamaged,
                        delegateReturns: currentDelegateReturns,
                        operatingExpenses: currentExpenses,
                        customExpenseTypes: currentExpenseTypes,
                        cashAdjustments: currentCashAdjustments,
                        inventoryAudits: currentInventoryAudits,
                        settings: settings,
                        exportedAt: new Date().toISOString()
                      });
                    }}
                    className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-95 border border-emerald-400/40"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-100 shrink-0" />
                    <span>{isKu ? 'تصدير هەموو داتاکان و ڕاپۆرتەکان (Excel)' : isAr ? 'تصدير كافة البيانات والتقارير الشاملة (Excel .xlsx)' : 'Export Full Store & Reports (Excel)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const fullBackup = {
                        products: products || JSON.parse(localStorage.getItem('supermarket_products_v1') || '[]'),
                        salesHistory: salesHistory || JSON.parse(localStorage.getItem('supermarket_sales_v1') || '[]'),
                        suppliers: suppliers || JSON.parse(localStorage.getItem('supermarket_suppliers_v1') || '[]'),
                        customers: customers || JSON.parse(localStorage.getItem('supermarket_customers_v1') || '[]'),
                        purchaseInvoices: purchaseInvoices || JSON.parse(localStorage.getItem('supermarket_purchases_v1') || '[]'),
                        userAccounts: userAccounts || JSON.parse(localStorage.getItem('supermarket_user_accounts_v3') || localStorage.getItem('supermarket_user_accounts_v1') || '[]'),
                        orders: orders || JSON.parse(localStorage.getItem('supermarket_orders_v1') || '[]'),
                        notifications: notifications || JSON.parse(localStorage.getItem('supermarket_notifications_v1') || '[]'),
                        damagedLogs: JSON.parse(localStorage.getItem('pos_damaged_items_logs') || '[]'),
                        delegateReturns: JSON.parse(localStorage.getItem('pos_delegate_returns_logs') || '[]'),
                        operatingExpenses: JSON.parse(localStorage.getItem('pos_custom_operating_expenses') || '[]'),
                        customExpenseTypes: JSON.parse(localStorage.getItem('pos_custom_expense_types') || '[]'),
                        cashAdjustments: JSON.parse(localStorage.getItem('pos_cash_adjustments') || '[]'),
                        inventoryAudits: JSON.parse(localStorage.getItem('pos_inventory_audits_v1') || '[]'),
                        settings: settings || JSON.parse(localStorage.getItem('supermarket_settings_v3') || localStorage.getItem('supermarket_settings_v1') || '{}'),
                        exportedAt: new Date().toISOString()
                      };
                      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `supermarket_store_full_backup_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    title={isKu ? 'هەناردەی پەڕگەی JSON بۆ گواستنەوەی تەواو' : isAr ? 'تصدير نسخة احتياطية تقنية JSON' : 'Export JSON Backup'}
                    className="px-3 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              {/* Secondary Actions Card: Selective Products & Import Backup */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/60 border border-blue-500/40 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>{isKu ? 'هاوردەکردن و هەناردەکردنی تایبەتی کاڵاکان' : isAr ? 'استيراد نسخة احتياطية وتصدير جدول المواد' : 'Restore Backup & Export Products'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isKu
                      ? 'دەتوانیت تەنها خشتەی کاڵاکان هەناردە بکەیت یان پەڕگەی پێشووت (Excel / JSON) هاوردە بکەیتەوە ناو سیستم.'
                      : isAr
                      ? 'يمكنك استيراد نسخة احتياطية سابقة لاستعادة كافة البيانات، أو تصدير جدول المواد والأسعار فقط لتعديلها.'
                      : 'Restore your database from any previously exported Excel/JSON file or export products list only.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
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
                          const hasData = (excelParsed.products && excelParsed.products.length > 0) ||
                            (excelParsed.suppliers && excelParsed.suppliers.length > 0) ||
                            (excelParsed.customers && excelParsed.customers.length > 0) ||
                            (excelParsed.purchaseInvoices && excelParsed.purchaseInvoices.length > 0);

                          if (hasData) {
                            let mergedProducts = excelParsed.products;
                            if (excelParsed.products && excelParsed.products.length > 0) {
                              const existingProds = products || JSON.parse(localStorage.getItem('supermarket_products_v1') || '[]');
                              const merged = [...excelParsed.products];
                              existingProds.forEach((p: Product) => {
                                if (!merged.some(m => m.barcode && p.barcode && m.barcode === p.barcode)) {
                                  merged.push(p);
                                }
                              });
                              mergedProducts = merged;
                            }

                            const backupPayload = {
                              ...excelParsed,
                              products: mergedProducts
                            };

                            if (onImportBackup) {
                              onImportBackup(backupPayload);
                            } else {
                              if (mergedProducts) {
                                localStorage.setItem('supermarket_products_v1', JSON.stringify(mergedProducts));
                                syncBulkWriteCollection('products', mergedProducts);
                              }
                              if (excelParsed.suppliers) {
                                localStorage.setItem('supermarket_suppliers_v1', JSON.stringify(excelParsed.suppliers));
                                syncBulkWriteCollection('suppliers', excelParsed.suppliers);
                              }
                              if (excelParsed.customers) {
                                localStorage.setItem('supermarket_customers_v1', JSON.stringify(excelParsed.customers));
                                syncBulkWriteCollection('customers', excelParsed.customers);
                              }
                              if (excelParsed.purchaseInvoices) {
                                localStorage.setItem('supermarket_purchases_v1', JSON.stringify(excelParsed.purchaseInvoices));
                                syncBulkWriteCollection('purchases', excelParsed.purchaseInvoices);
                              }
                            }

                            const prodCount = excelParsed.products?.length || 0;
                            const supCount = excelParsed.suppliers?.length || 0;
                            const custCount = excelParsed.customers?.length || 0;
                            setImportStatus(isKu ? `✅ بە سەرکەوتوویی هەموو داتاکان (${prodCount} کاڵا، ${supCount} دابینکەر، ${custCount} کڕیار) هاوردەکران!` : isAr ? `✅ تم استيراد واستعادة كافة البيانات بنجاح (${prodCount} مادة، ${supCount} مورد، ${custCount} عميل)!` : `✅ Successfully imported all data (${prodCount} products, ${supCount} suppliers, ${custCount} customers)!`);
                            setTimeout(() => setImportStatus(''), 6000);
                          } else {
                            alert(isKu ? 'هیچ داتایەکی دروست لە فایلی ئێکسڵ نەدۆزرایەوە!' : isAr ? 'لم يتم العثور على أوراق بيانات صالحة في ملف الإكسل!' : 'No valid data sheets found in Excel file!');
                          }
                        } else {
                          const text = await file.text();
                          const parsed = JSON.parse(text);
                          if (onImportBackup) {
                            onImportBackup(parsed);
                            setImportStatus(isKu ? '✅ داتاکان بە سەرکەوتوویی هاوردەکران لە JSON!' : isAr ? '✅ تم استيراد النسخة الاحتياطية بنجاح من JSON!' : '✅ Backup restored successfully from JSON!');
                            setTimeout(() => setImportStatus(''), 6000);
                          }
                        }
                      } catch (err) {
                        console.error('Import error:', err);
                        alert(isKu ? 'هەڵە ڕوویدا لە کاتی هاوردەکردنی پەڕگەکە!' : isAr ? 'حدث خطأ أثناء قراءة ملف النسخ الاحتياطي!' : 'Error parsing backup file!');
                      }
                    }}
                  />

                  {/* Import Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:brightness-110 active:scale-95 border border-amber-400/40"
                  >
                    <Upload className="w-4 h-4 text-amber-100 shrink-0" />
                    <span>{isKu ? '📥 هاوردەکردنی فایل (Excel / JSON)' : isAr ? '📥 استيراد نسخة احتياطية (Excel / JSON)' : '📥 Import Backup (Excel / JSON)'}</span>
                  </button>

                  {/* Products Only Export */}
                  <button
                    type="button"
                    onClick={() => {
                      const currentProducts = products || JSON.parse(localStorage.getItem('supermarket_products_v1') || '[]');
                      exportProductsToExcel(currentProducts, `products_catalog_${new Date().toISOString().split('T')[0]}.xlsx`);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                    title={isKu ? 'هەناردەی تەنها خشتەی کاڵاکان بۆ ئێکسڵ' : isAr ? 'تصدير جدول المواد والأسعار فقط' : 'Export Products List'}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{isKu ? 'خشتەی کاڵاکان' : isAr ? 'جدول المواد' : 'Products List'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
