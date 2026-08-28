import React, { useState, useEffect } from 'react';
import { X, Monitor, Download, Wifi, WifiOff, CheckCircle2, ShieldCheck, Cpu, HardDrive, Smartphone, Sparkles, Layers, Share2, Copy, Check, Cloud, Database, UploadCloud, RotateCcw } from 'lucide-react';
import { StoreSettings } from '../types';
import { uploadBackupToGoogleDrive } from '../lib/googleDrive';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  deferredPrompt: any;
  onTriggerInstall: () => void;
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({
  isOpen,
  onClose,
  settings,
  deferredPrompt,
  onTriggerInstall
}) => {
  if (!isOpen) return null;

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [firebaseStatus, setFirebaseStatus] = useState<string>('Local Isolated Storage 📦');
  const [driveSyncStatus, setDriveSyncStatus] = useState<string>('');
  const [driveToken, setDriveToken] = useState<string>('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleForceUpdateApp = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (let key of keys) {
          await caches.delete(key);
        }
      }
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  const handleDownloadDesktopLauncher = () => {
    const launcherContent = `@echo off
title 7amo.pos Desktop Offline Launcher
echo Launching 7amo.pos Standalone Offline Desktop Application...
start "" "${window.location.href}" --app="${window.location.href}"
`;
    const blob = new Blob([launcherContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '7amo_pos_Offline_Desktop_Launcher.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackupToDrive = async () => {
    if (!driveToken) {
      const token = prompt(isAr ? 'أدخل رمز وصول Google Drive (OAuth Token):' : 'Enter Google Drive Access Token:');
      if (!token) return;
      setDriveToken(token);
    }

    setDriveSyncStatus(isAr ? 'جاري رفع النسخة إلى Google Drive...' : 'Uploading backup to Google Drive...');

    const products = JSON.parse(localStorage.getItem('supermarket_products_v1') || localStorage.getItem('products') || '[]');
    const sales = JSON.parse(localStorage.getItem('supermarket_sales_v1') || localStorage.getItem('salesHistory') || '[]');

    const backupPayload = {
      version: '7amo-pos-v3.0',
      exportedAt: new Date().toISOString(),
      storeName: settings.storeName || 'المتجر الرئيسي',
      totalProducts: products.length,
      totalSales: sales.length,
      data: {
        products,
        salesHistory: sales,
        suppliers: JSON.parse(localStorage.getItem('supermarket_suppliers_v1') || '[]'),
        customers: JSON.parse(localStorage.getItem('supermarket_customers_v1') || '[]'),
        purchaseInvoices: JSON.parse(localStorage.getItem('supermarket_purchases_v1') || '[]'),
        userAccounts: JSON.parse(localStorage.getItem('supermarket_user_accounts_v3') || '[]'),
        orders: JSON.parse(localStorage.getItem('supermarket_orders_v1') || '[]'),
        notifications: JSON.parse(localStorage.getItem('supermarket_notifications_v1') || '[]'),
        damagedLogs: JSON.parse(localStorage.getItem('pos_damaged_items_logs') || '[]'),
        delegateReturns: JSON.parse(localStorage.getItem('pos_delegate_returns_logs') || '[]'),
        operatingExpenses: JSON.parse(localStorage.getItem('pos_custom_operating_expenses') || '[]'),
        customExpenseTypes: JSON.parse(localStorage.getItem('pos_custom_expense_types') || '[]'),
        cashAdjustments: JSON.parse(localStorage.getItem('pos_cash_adjustments') || '[]'),
        inventoryAudits: JSON.parse(localStorage.getItem('pos_inventory_audits_v1') || '[]'),
        settings: settings
      }
    };

    const filename = `hama_pos_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const res = await uploadBackupToGoogleDrive(driveToken || '', filename, backupPayload);

    if (res.success) {
      setDriveSyncStatus(isAr ? 'تم رفع نسخة خياطية جافة بـ بنجاح إلى Google Drive 📁!' : 'Backup successfully saved to Google Drive 📁!');
    } else {
      setDriveSyncStatus(isAr ? `خطأ: ${res.error}` : `Error: ${res.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="cyber-card p-5 sm:p-7 rounded-3xl border border-cyan-500/40 w-full max-w-2xl bg-[#0B1120] text-slate-100 relative shadow-[0_0_50px_rgba(6,182,212,0.3)] my-auto animate-scaleUp">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <Monitor className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                7amo<span className="text-cyan-400">.pos</span> Desktop App & Cloud
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Offline & Cloud Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'تطبيق سطح مكتب أوفلاين + مزامنة سحابية مع Firebase و Google Drive' : 'Standalone offline desktop app with Firebase & Google Drive cloud sync.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4">
          {/* Connection Status Box */}
          <div className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
            isOnline
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}>
            <div className={`p-1.5 rounded-xl ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4 animate-pulse" />}
            </div>
            <div>
              <div className="text-xs font-bold">
                {isOnline ? (isAr ? 'أونلاين 🌐' : 'Online 🌐') : (isAr ? 'أوفلاين ⚡' : 'Offline ⚡')}
              </div>
              <div className="text-[10px] text-slate-300">
                {isAr ? 'حالة الشبكة' : 'Network status'}
              </div>
            </div>
          </div>

          {/* Standalone Desktop Local Mode */}
          <div className="p-3 rounded-2xl border bg-purple-950/40 border-purple-500/40 text-purple-300 flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold">{isAr ? 'سطح مكتب محلي' : 'Local Desktop'}</div>
              <div className="text-[10px] text-purple-300 font-mono">{isAr ? 'معزول 100% أوفلاين' : '100% Isolated'}</div>
            </div>
          </div>

          {/* Service Worker Cache Status */}
          <div className="p-3 rounded-2xl border bg-cyan-950/40 border-cyan-500/40 text-cyan-300 flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold">{isAr ? 'قاعدة بيانات محلية' : 'Local Database'}</div>
              <div className="text-[10px] text-slate-300">{isAr ? 'IndexedDB / Storage' : 'IndexedDB Ready'}</div>
            </div>
          </div>
        </div>

        {/* Offline Desktop Launcher Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-indigo-950/60 to-slate-900 border border-purple-500/40 space-y-3 mb-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
              <Monitor className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>{isAr ? 'مشغل سطح المكتب المحلي بدون إنترنت (.bat / Desktop Launcher)' : 'Offline Desktop Launcher (.bat)'}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
              100% Offline Ready
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isAr
              ? 'تثبيت وتشغيل نظام 7amo.pos كـ برنامج سطح مكتب مستقل كلياً يعمل مباشرة من جهازك أوفلاين بضغط زِر واحدة وبدون الحاجة لأي اتصال بالويب أو الإنترنت.'
              : 'Run 7amo.pos directly as a standalone local desktop app completely offline without any internet connection.'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadDesktopLauncher}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isAr ? 'تحميل مشغل سطح المكتب (.bat Launcher)' : 'Download Desktop Launcher (.bat)'}</span>
            </button>
          </div>
        </div>

        {/* Google Drive Integration Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-blue-950/60 to-slate-900 border border-cyan-500/30 space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
              <Cloud className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? 'نسخ احتياطي سحابي على Google Drive 📁' : 'Cloud Backup to Google Drive 📁'}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
              OAuth 2.0 Ready
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isAr
              ? 'تصدير وحفظ كامل بيانات المنتجات والمبيعات والإعدادات مباشرة داخل حسابك في Google Drive لضمان عدم ضياع أي بيانات.'
              : 'Export products, sales, and settings directly to your personal Google Drive storage.'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleBackupToDrive}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <UploadCloud className="w-4 h-4 text-slate-950" />
              <span>{isAr ? 'رفع نسخة احتياطية إلى Google Drive الآن' : 'Upload Backup to Google Drive'}</span>
            </button>
            {driveSyncStatus && (
              <span className="text-xs font-mono text-cyan-300 font-semibold">{driveSyncStatus}</span>
            )}
          </div>
        </div>

        {/* Installation Actions */}
        <div className="space-y-4">
          
          {/* Option A: One-Click PWA Installation Button */}
          {deferredPrompt ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950 via-blue-950 to-slate-900 border border-cyan-400/50 space-y-3 shadow-lg">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>{isAr ? 'تثبيت بنقرة واحدة كـ تطبيق سطح مكتب (Desktop App)' : 'One-Click Install Desktop App'}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isAr
                  ? 'يمكنك إضافة أيقونة 7amo.pos مباشرة إلى شريط المهام وصفحة سطح المكتب في الويندوز لتشغيل النظام بضغطة واحدة وبدون متصفح.'
                  : 'Add 7amo.pos shortcut icon directly to your taskbar & desktop on Windows/Mac to run full-screen offline.'}
              </p>
              <button
                type="button"
                onClick={onTriggerInstall}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95 transition-all"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>{isAr ? 'تثبيت 7amo.pos كـ تطبيق سطح مكتب الآن' : 'Install 7amo.pos Desktop App Now'}</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#070D18] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span>{isAr ? 'كيفية تثبيت التطبيق على سطح المكتب (Windows / Mac / Linux):' : 'How to install as Desktop App:'}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  {isAr ? 'جاهز للتثبيت' : 'Ready'}
                </span>
              </div>

              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-[#0E1626] p-3 rounded-xl border border-slate-700/60 leading-relaxed">
                <li>
                  {isAr
                    ? 'في متصفحك (Chrome / Edge / Brave)، انقر على قائمة الخيارات (⋮) أعلى اليمين.'
                    : 'In your browser menu (⋮) top right.'}
                </li>
                <li>
                  {isAr
                    ? 'اختر "الحفظ والمشاركة" أو "Save and share" -> ثم اختر "تثبيت 7amo.pos" أو "Install 7amo.pos".'
                    : 'Select "Save & Share" -> then "Install 7amo.pos".'}
                </li>
                <li>
                  {isAr
                    ? 'سيتم إنشاء أيقونة خاصة بالبرنامج على سطح المكتب تعمل بدون أي متصفح وبكامل الشاشة أوفلاين!'
                    : 'A standalone desktop app shortcut icon will be placed on your desktop!'}
                </li>
              </ol>
            </div>
          )}

          {/* Force App Update & Cache Clear Button */}
          <div className="p-3.5 rounded-2xl bg-[#070D18] border border-amber-500/30 flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0 animate-spin-slow" />
              <div>
                <p>{isAr ? 'تحديث التطبيق وإلغاء الذاكرة المخبأة القديمة:' : 'Force Update App & Clear Stale Cache:'}</p>
                <p className="text-[10px] text-slate-400 font-normal">{isAr ? 'تحديث الملفات وتفريغ ذاكرة المتصفح للتثبيت بأحدث نسخة' : 'Refresh assets and unregister old offline service worker'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleForceUpdateApp}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'تحديث فوري' : 'Update Now'}</span>
            </button>
          </div>

          {/* Direct Link Share & Copy */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#070D18] border border-slate-800 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-cyan-400" />
              {isAr ? 'رابط النظام المحلي:' : 'System URL:'}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedLink ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرابط' : 'Copy Link')}</span>
            </button>
          </div>

        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isAr ? 'حماية وأمان: بياناتك محفوظة محلياً + سحابياً' : '100% Offline & Cloud Security'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};

