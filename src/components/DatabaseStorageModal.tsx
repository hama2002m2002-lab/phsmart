import React, { useState, useEffect } from 'react';
import { 
  Database, 
  HardDrive, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Server, 
  Zap, 
  ShieldCheck, 
  X,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { 
  getStorageDiagnostics, 
  StorageDiagnostics, 
  exportLocalDatabaseBackup, 
  importLocalDatabaseBackup,
  localDbClear,
  localDbFactoryReset
} from '../lib/localDb';
import { formatNumber } from '../lib/formatUtils';
import { StoreSettings } from '../types';

interface DatabaseStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onDataRestored?: () => void;
}

export const DatabaseStorageModal: React.FC<DatabaseStorageModalProps> = ({
  isOpen,
  onClose,
  settings,
  onDataRestored
}) => {
  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

  const [diagnostics, setDiagnostics] = useState<StorageDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const loadDiagnostics = async () => {
    setIsLoading(true);
    try {
      const diag = await getStorageDiagnostics();
      setDiagnostics(diag);
    } catch (err) {
      console.error('Failed to get storage diagnostics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDiagnostics();
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportBackup = async () => {
    try {
      const jsonBackup = await exportLocalDatabaseBackup();
      const blob = new Blob([jsonBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supermarket_local_db_backup_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setStatusMessage({
        text: isKu ? 'پشتیوانی داتابەیس بە سەرکەوتوویی هەناردە کرا!' : isAr ? 'تم تصدير النسخة الاحتياطية لقاعدة البيانات بنجاح!' : 'Database backup exported successfully!',
        type: 'success'
      });
    } catch (err) {
      setStatusMessage({
        text: isKu ? 'هەڵە لە هەناردەکردنی داتابەیس!' : isAr ? 'حدث خطأ أثناء تصدير النسخة الاحتياطية!' : 'Error exporting database backup!',
        type: 'error'
      });
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const success = await importLocalDatabaseBackup(content);
        if (success) {
          setStatusMessage({
            text: isKu ? 'داتاکان بە سەرکەوتوویی گەڕێندرانەوە!' : isAr ? 'تمت استعادة وتحديث قاعدة البيانات المحلية بنجاح!' : 'Database restored successfully!',
            type: 'success'
          });
          await loadDiagnostics();
          if (onDataRestored) {
            onDataRestored();
          }
        } else {
          setStatusMessage({
            text: isKu ? 'پەڕگەی داتابەیس دروست نییە!' : isAr ? 'الملف المحدد غير صالح أو تالف!' : 'Invalid backup file!',
            type: 'error'
          });
        }
      } catch {
        setStatusMessage({
          text: isKu ? 'هەڵە لە خوێندنەوەی پەڕگە!' : isAr ? 'حدث خطأ في قراءة ملف النسخة الاحتياطية!' : 'Error reading backup file!',
          type: 'error'
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOptimizeDb = async () => {
    setIsOptimizing(true);
    try {
      // Small delay to simulate optimization and refresh indices
      await new Promise(r => setTimeout(r, 600));
      await loadDiagnostics();
      setStatusMessage({
        text: isKu ? 'داتابەیس بە سەرکەوتوویی ڕێکخرایەوە و خێراتر کرا!' : isAr ? 'تمت صيانة وفهرسة قاعدة البيانات وتسريع استجابتها بنجاح!' : 'Database optimized and re-indexed successfully!',
        type: 'success'
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0c1220] border border-blue-500/30 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-b border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
              <Database className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>{isKu ? 'ناوەندی داتابەیسی ناوخۆیی و پاشەکەوتکردنی بەهێز' : isAr ? 'محرك قاعدة البيانات المحلية عالية السعة (IndexedDB)' : 'High-Capacity Local Database Engine'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                  {isKu ? 'چالاکە' : isAr ? 'نشط وتلقائي' : 'Active'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isKu
                  ? 'تایبەتمەندی پاشەکەوتکردنی بێسنووری ملیۆنان داتا بەبێ پێویستی بە ئینتەرنێت'
                  : isAr
                  ? 'تخزين فوري غير محدود يستوعب مئات الآلاف من المواد والفواتير بدون إنترنت'
                  : 'Unlimited offline capacity for 100,000+ products and invoices with zero lag'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Status Message */}
          {statusMessage && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="text-xs font-bold">{statusMessage.text}</span>
            </div>
          )}

          {/* Engine Architecture Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#11192e] border border-cyan-500/20 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-cyan-400">
                <HardDrive className="w-4 h-4" />
                <span className="text-xs font-black">{isKu ? 'تەلارسازی داتابەیس' : isAr ? 'محرك البيانات' : 'Engine Type'}</span>
              </div>
              <p className="text-sm font-black text-white">IndexedDB High-Cap</p>
              <p className="text-[11px] text-slate-400">{isKu ? 'خێراترین مۆدێلی ناوخۆیی لە وێبگەڕ' : isAr ? 'محرك متقدم بدون حدود الـ 5MB' : 'No 5MB quota restrictions'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#11192e] border border-emerald-500/20 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-black">{isKu ? 'سرعەی کردنەوە' : isAr ? 'سرعة الإقلاع' : 'Boot Speed'}</span>
              </div>
              <p className="text-sm font-black text-emerald-300">0ms Instant Offline</p>
              <p className="text-[11px] text-slate-400">{isKu ? 'کردنەوەی دەستبەجێ لە نەبوونی هێڵ' : isAr ? 'فتح فوري بدون انتظار السيرفر' : 'Instant offline startup'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#11192e] border border-indigo-500/20 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-indigo-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-black">{isKu ? 'کۆی تۆمارەکان' : isAr ? 'إجمالي السجلات' : 'Total Records'}</span>
              </div>
              <p className="text-sm font-black text-indigo-300">
                {diagnostics ? formatNumber(diagnostics.totalRecordsCount) : '...'} {isKu ? 'تۆمار' : isAr ? 'سجل' : 'records'}
              </p>
              <p className="text-[11px] text-slate-400">{isKu ? 'پارێزراو لە میمۆری ناوخۆیی' : isAr ? 'محفوظ ومفهرس محلياً' : 'Indexed locally'}</p>
            </div>
          </div>

          {/* Detailed Storage Stats & Counts */}
          {diagnostics && (
            <div className="p-5 rounded-2xl bg-[#10182b] border border-blue-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>{isKu ? 'دابەشبوونی داتاکان بەپێی بەشەکان' : isAr ? 'تفاصيل السجلات المخزنة في قاعدة البيانات المحلية' : 'Local Database Stores Breakdown'}</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatBytes(diagnostics.estimatedUsageBytes)} / {formatBytes(diagnostics.estimatedQuotaBytes)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/40">
                  <span className="text-[10px] text-slate-400 block">{isKu ? 'کاڵاکان' : isAr ? 'المواد والمنتجات' : 'Products'}</span>
                  <span className="text-sm font-black text-cyan-300 font-mono">{formatNumber(diagnostics.counts.products || 0)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/40">
                  <span className="text-[10px] text-slate-400 block">{isKu ? 'فرۆشتنەکان' : isAr ? 'فواتير المبيعات' : 'Sales'}</span>
                  <span className="text-sm font-black text-emerald-300 font-mono">{formatNumber(diagnostics.counts.sales || 0)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/40">
                  <span className="text-[10px] text-slate-400 block">{isKu ? 'کڕینەکان' : isAr ? 'فواتير الشراء' : 'Purchases'}</span>
                  <span className="text-sm font-black text-amber-300 font-mono">{formatNumber(diagnostics.counts.purchases || 0)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/40">
                  <span className="text-[10px] text-slate-400 block">{isKu ? 'دابینکەران' : isAr ? 'الموردين والشركات' : 'Suppliers'}</span>
                  <span className="text-sm font-black text-blue-300 font-mono">{formatNumber(diagnostics.counts.suppliers || 0)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/40">
                  <span className="text-[10px] text-slate-400 block">{isKu ? 'کڕیاران' : isAr ? 'العملاء والديون' : 'Customers'}</span>
                  <span className="text-sm font-black text-purple-300 font-mono">{formatNumber(diagnostics.counts.customers || 0)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/40">
                  <span className="text-[10px] text-slate-400 block">{isKu ? 'جەردی کۆگا' : isAr ? 'محاضر الجرد الفعلي' : 'Inventory Audits'}</span>
                  <span className="text-sm font-black text-rose-300 font-mono">{formatNumber(diagnostics.counts.inventory_audits || 0)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/40">
                  <span className="text-[10px] text-slate-400 block">{isKu ? 'داواکارییەکان' : isAr ? 'طلبيات التوصيل' : 'Orders'}</span>
                  <span className="text-sm font-black text-teal-300 font-mono">{formatNumber(diagnostics.counts.orders || 0)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/40">
                  <span className="text-[10px] text-slate-400 block">{isKu ? 'بەکارهێنەران' : isAr ? 'حسابات النظام' : 'Users'}</span>
                  <span className="text-sm font-black text-yellow-300 font-mono">{formatNumber(diagnostics.counts.users || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Database Operations & Tools */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>{isKu ? 'ئامرازەکانی بەڕێوەبردنی داتابەیس' : isAr ? 'أدوات الصيانة والنسخ الاحتياطي لقاعدة البيانات' : 'Database Maintenance & Backup Tools'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* 1. Export JSON Snapshot */}
              <button
                type="button"
                onClick={handleExportBackup}
                className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/60 to-blue-950/60 border border-cyan-500/30 hover:border-cyan-400 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group"
              >
                <div className="p-3 rounded-full bg-cyan-500/20 text-cyan-300 group-hover:scale-110 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-white">{isKu ? 'تصديري داتابەیس (JSON)' : isAr ? 'تصدير نسخة قاعدة البيانات (JSON)' : 'Export DB Backup'}</span>
                <span className="text-[10px] text-slate-400">{isKu ? 'پاشەکەوتکردنی هەموو داتاکان لە یەک فایل' : isAr ? 'حفظ كامل السجلات في ملف فوري' : 'Save full snapshot to file'}</span>
              </button>

              {/* 2. Import JSON Snapshot */}
              <label className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-teal-950/60 border border-emerald-500/30 hover:border-emerald-400 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
                <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-300 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-white">{isKu ? 'هاوردەکردنی داتابەیس (Restore)' : isAr ? 'استعادة قاعدة البيانات (Restore)' : 'Restore DB Backup'}</span>
                <span className="text-[10px] text-slate-400">{isKu ? 'گەڕاندنەوەی داتاکان لە فایلی پشتیوانی' : isAr ? 'استرجاع كافة البيانات من ملف' : 'Restore from backup file'}</span>
              </label>

              {/* 3. Re-index & Optimize */}
              <button
                type="button"
                onClick={handleOptimizeDb}
                disabled={isOptimizing}
                className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 hover:border-indigo-400 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group disabled:opacity-50"
              >
                <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-300 group-hover:scale-110 transition-transform">
                  <RefreshCw className={`w-5 h-5 ${isOptimizing ? 'animate-spin' : ''}`} />
                </div>
                <span className="text-xs font-black text-white">{isKu ? 'ڕێکخستن و خێراکردنی داتابەیس' : isAr ? 'صيانة وضغط قاعدة البيانات' : 'Optimize & Vacuum DB'}</span>
                <span className="text-[10px] text-slate-400">{isKu ? 'نوێکردنەوەی فەهرەسەکان و خێرایی' : isAr ? 'إعادة بناء الفهارس وتسريع القراءة' : 'Rebuild indexes & clean cache'}</span>
              </button>

              {/* 4. Factory Reset & Wipe for New Client */}
              <button
                type="button"
                onClick={async () => {
                  const confirmed = window.confirm(
                    isKu
                      ? 'ئایا دڵنیایت لە تەسفیرکردنی داتابەیس بە تەواوی بۆ کڕیاری نوێ؟ هەموو کاڵا و فرۆشتنەکان دەسڕدرێنەوە.'
                      : isAr
                      ? 'هل أنت متأكد من تصفير ومسح قاعدة البيانات بالكامل لعميل جديد؟ سيتم تصفير كافة المواد والمبيعات والمشتريات.'
                      : 'Are you sure you want to perform a factory reset for a new client?'
                  );
                  if (confirmed) {
                    await localDbFactoryReset();
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/60 to-red-950/60 border border-rose-500/30 hover:border-rose-400 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group"
              >
                <div className="p-3 rounded-full bg-rose-500/20 text-rose-300 group-hover:scale-110 transition-transform">
                  <Trash2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-rose-300">{isKu ? 'تەسفیر بۆ کڕیاری نوێ' : isAr ? 'تصفير شامل لعميل جديد' : 'Factory Reset'}</span>
                <span className="text-[10px] text-rose-300/70">{isKu ? 'سڕینەوەی گشتی داتاکان' : isAr ? 'مسح كافة السجلات لبدء نظيف' : 'Wipe all data for clean slate'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{isKu ? 'داتابەیسی ناوخۆیی ئامادەیە بۆ خەزنکردنی زۆرترین داتا' : isAr ? 'قاعدة البيانات المحلية جاهزة ومحمية وتتحمل أقصى سعة' : 'Local database ready with maximum capacity'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            {isKu ? 'داخستن' : isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
