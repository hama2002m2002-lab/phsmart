import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wifi, 
  WifiOff, 
  HardDrive, 
  Smartphone, 
  ArrowLeftRight, 
  CheckCircle2, 
  Sparkles, 
  Share2, 
  Copy, 
  Check, 
  ShieldCheck, 
  AlertCircle, 
  Cpu, 
  HelpCircle,
  QrCode,
  Download,
  Upload
} from 'lucide-react';
import { StoreSettings } from '../types';

interface LocalDataNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onOpenMobileSync?: () => void;
  onOpenAIInvoiceScanner?: () => void;
  onOpenLegacyMigrator?: () => void;
}

export const LocalDataNetworkModal: React.FC<LocalDataNetworkModalProps> = ({
  isOpen,
  onClose,
  settings,
  onOpenMobileSync,
  onOpenAIInvoiceScanner,
  onOpenLegacyMigrator
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'photoAi' | 'transfer'>('overview');

  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

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

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0F172A] via-[#0B1120] to-[#070A13] rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-[#0B1120]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {isKu ? 'سیستەمی کارکردنی سەربەخۆی ناوخۆیی (Offline-First)' : isAr ? 'نظام العمل المحلي المستقل بدون إنترنت' : 'Offline-First Local Storage Architecture'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold font-mono border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>100% Local DB</span>
                </span>
              </div>
              <p className="text-xs text-cyan-300/90 font-medium mt-0.5">
                {isKu 
                  ? 'هەموو داتاکان تەنها لەناو ئەم ئامێرە پاشەکەوت دەبن و بێ ئینتەرنێت کاردەکەن' 
                  : isAr 
                  ? 'البيانات تُخزن وتُعالج بالكامل محلياً داخل جهازك، والإنترنت مطلوب فقط للذكاء الاصطناعي والمزامنة' 
                  : 'All data is stored locally in your browser/device database with zero external dependencies'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pt-3 pb-2 border-b border-slate-800/60 bg-[#0B1222]/50 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{isKu ? 'تێڕوانینی گشتی و پاشەکەوت' : isAr ? 'حفظ البيانات المحلي' : 'Local Storage'}</span>
          </button>

          <button
            onClick={() => setActiveTab('photoAi')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'photoAi'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isKu ? 'خوێندنەوەی وێنە (AI)' : isAr ? 'إدخال المواد بالصور (AI)' : 'AI Image OCR'}</span>
          </button>

          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'transfer'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{isKu ? 'گواستنەوە و بەستنەوەی ئامێرەکان' : isAr ? 'النقل والربط بين الأجهزة' : 'Device Transfer & Sync'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs leading-relaxed custom-scrollbar">

          {/* Current Connection Status Ribbon */}
          <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
            isOnline 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <div className="relative">
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
              ) : (
                <WifiOff className="w-4 h-4 text-amber-400" />
              )}
              <div>
                <span className="font-black block text-[13px]">
                  {isOnline 
                    ? (isKu ? 'ئامێرەکە پەیوەستە بە ئینتەرنێت' : isAr ? 'الجهاز متصل بالإنترنت حالياً' : 'Internet Connected')
                    : (isKu ? 'ئامێرەکە لە دۆخی ئۆفلایندایە (بێ ئینتەرنێت)' : isAr ? 'الجهاز في وضع الأوفلاين (بدون إنترنت)' : 'Working Offline')}
                </span>
                <span className="text-[11px] opacity-80">
                  {isOnline
                    ? (isKu ? 'دەتوانیت زیرەکی دەستکرد بەکاربهێنیت بۆ خوێندنەوەی وێنە و بەستنەوە' : isAr ? 'جميع مزايا الذكاء الاصطناعي لقراءة الصور والمزامنة بين الأجهزة متاحة فوراً' : 'AI vision OCR and multi-device connection are fully available')
                    : (isKu ? 'فرۆشتن، کۆگا، پسوولە و قەرز بە تەواوی ئۆفلاین کاردەکەن' : isAr ? 'المبيعات، الكاشير، الطباعة، المخزن والديون تعمل 100% بدون إنترنت وبأمان تام' : 'All sales, warehouse, POS, printing & accounting work 100% offline')}
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono uppercase border border-current bg-black/30">
              {isOnline ? 'Online Ready' : 'Offline Mode'}
            </span>
          </div>

          {/* TAB 1: OVERVIEW & LOCAL STORAGE */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fadeIn">
              
              <div className="p-4 rounded-2xl bg-[#10192D] border border-blue-500/20 space-y-2.5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{isKu ? 'چۆن داتاکان تەنها لەناو ئامێرەکەت دەمێننەوە؟' : isAr ? 'كيف يتم تخزين وحماية بياناتك محلياً داخل جهازك؟' : 'How Local Data Isolation Works'}</span>
                </div>
                <p className="text-slate-300">
                  {isKu
                    ? 'بەرنامەکە لەسەر بزوێنەری خەزنی ناوخۆیی خێرا (IndexedDB + LocalStorage) کاردەکات. هەر فرۆشتنێک، کاڵایەک، یان پسوولەیەک دەستبەجێ لەناو هاردی ئامێرەکەت لە وێبگەڕ پاشەکەوت دەبێت و نانێردرێت بۆ هیچ سێرڤەرێکی دەرەکی بێ مۆڵەتی تۆ.'
                    : isAr
                    ? 'يعمل البرنامج بمحرك تخزين محلي فائق السرعة داخل متصفح جهازك (IndexedDB غير المحدودة + LocalStorage). كافة حركات البيع، والمخزن، وفواتير الشراء، والأسعار، والحسابات تُخزن مباشرة على القرص الصلب لجهازك ولا يتم رفعها أو مشاركتها خارجياً.'
                    : 'The software uses browser IndexedDB & high-capacity local storage. All inventory, sales, purchases, and customer debts reside directly on this computer with zero cloud telemetry.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{isKu ? 'سفر ئینتەرنێت پێویستە بۆ فرۆشتن' : isAr ? 'بيع وطباعة بدون إنترنت 100%' : '0 Internet for POS & Print'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{isKu ? 'پارێزراو و تایبەت بەم ئامێرە' : isAr ? 'عزل تام عن باقي الأجهزة' : 'Strict Device Isolation'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{isKu ? 'خێرایی دەستبەجێ (0.01 چرکە)' : isAr ? 'سرعة فائقة واستجابة فورية' : 'Sub-millisecond speed'}</span>
                  </div>
                </div>
              </div>

              {/* Three Simple Rules */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/30 space-y-3">
                <h4 className="font-black text-white text-xs flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>{isKu ? 'ڕێساکانی بەکارهێنانی ئۆفلاین و ئۆنلاین:' : isAr ? 'قواعد عمل البرنامج محلياً ومع الإنترنت:' : 'System Offline & Online Rules:'}</span>
                </h4>
                
                <div className="space-y-2 text-[11.5px]">
                  <div className="flex items-start gap-2 text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px] border border-emerald-500/30">1</span>
                    <p>
                      <strong className="text-white">{isKu ? 'کارکردنی ڕۆژانەی مارکێت (بە تەواوی ناوخۆیی):' : isAr ? 'العمليات اليومية (محلياً بالكامل بدون إنترنت):' : 'Daily Operations (100% Offline):'}</strong>{' '}
                      {isKu 
                        ? 'فرۆشتن بە بارکۆد، لێدانی پسوولەی کاشێر، ڕاپۆرتی ڕۆژانە، ژمێریاری و گۆڕینی نرخ هیچ ئینتەرنێتی ناوێت.'
                        : isAr
                        ? 'إجراء عمليات البيع بالباركود، طباعة الوصل الحراري، حساب الأرباح، تعديل أسعار المخزن، وجرد المواد تعمل دون اتصال بالشبكة.'
                        : 'Barcode scanning, receipt printing, daily shift settlement, and inventory auditing run entirely offline.'}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center shrink-0 text-[10px] border border-purple-500/30">2</span>
                    <p>
                      <strong className="text-white">{isKu ? 'خوێندنەوەی وێنەی پسوولە (پێویستی بە ئینتەرنێت هەیە):' : isAr ? 'إدخال المواد بالصور (يتطلب الإنترنت مؤقتاً):' : 'Photo Item Entry (Requires Internet):'}</strong>{' '}
                      {isKu
                        ? 'تەنها کاتێک وێنەی پسوولەی کڕین یان شاشەی بەرنامەی کۆن دەگریت، ئینتەرنێت بەکاردێت بۆ بەستنەوە بە Google Gemini.'
                        : isAr
                        ? 'عند الرغبة في التقاط صورة فاتورة ورقية أو تصوير شاشة كمبيوتر قديمة، يتصل الذكاء الاصطناعي بالإنترنت لثوانٍ لقراءة الأسماء والأسعار ثم يحفظها مباشرة محلياً داخل جهازك.'
                        : 'Only when capturing photos of invoices or legacy screens does Gemini AI connect online to parse items into local memory.'}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px] border border-blue-500/30">3</span>
                    <p>
                      <strong className="text-white">{isKu ? 'گواستنەوە بۆ ئامێری تر (ئینتەرنێت یان Wi-Fi ناوخۆیی):' : isAr ? 'النقل إلى جهاز أو لابتوب آخر (عبر ملف أو شبكة Wi-Fi):' : 'Transferring to another device:'}</strong>{' '}
                      {isKu
                        ? 'دەتوانیت فایلی Excel یان JSON لە بەشی پاشەکەوت دەربهێنیت و بیخەیتە ناو لابتۆپی نوێ، یان لە ڕێگەی هەمان Wi-Fi ببەستیتەوە.'
                        : isAr
                        ? 'يمكنك تصدير نسخة احتياطية شاملة (Excel أو JSON) بضغطة زر ونقلها بفلاش USB، أو فتح نفس الرابط عبر شبكة الواي فاي المحلية.'
                        : 'Export a complete Excel or JSON backup to a USB stick, or connect devices via your local Wi-Fi router.'}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: AI PHOTO OCR (WHEN INTERNET IS USED) */}
          {activeTab === 'photoAi' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/30 space-y-3">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>{isKu ? 'تایبەتمەندی زیرەکی دەستکرد بۆ هاوردەی مادەکان لە وێنە' : isAr ? 'ميزة الذكاء الاصطناعي لقراءة فواتير وشاشات المواد' : 'AI Multimodal Vision Processing'}</span>
                </div>
                <p className="text-slate-300">
                  {isKu
                    ? 'کاتێک ئینتەرنێت هەبێت، دەتوانیت وێنەی پسوولەی کۆمپانیاکان یان شاشەی سیستەمی پێشوو بگریت، و مۆدێلی Gemini Vision بە وردی خوێندنەوەی بۆ دەکات و دەستبەجێ بە شێوەیەکی ناوخۆیی دەخرێتە ناو کۆگاکەت.'
                    : isAr
                    ? 'عندما يكون الإنترنت متصلاً، يتيح لك النظام استخدام تقنية Gemini Vision لقراءة وتفريغ محتويات فواتير الموردين الورقية أو شاشات الجداول القديمة وإدخال الأدوية والأسعار مباشرة إلى المخزن المحلي.'
                    : 'When online, utilize Gemini Vision to OCR wholesale paper invoices or legacy inventory tables into your local store.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {onOpenAIInvoiceScanner && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAIInvoiceScanner();
                      }}
                      className="p-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-400/40 text-purple-200 text-left rtl:text-right flex items-center justify-between gap-2 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-300 group-hover:scale-110 transition-transform" />
                        <div>
                          <span className="font-black text-xs block text-white">{isKu ? 'سکانەری وێنەی پسوولە (AI)' : isAr ? 'سكانر فواتير الشراء بالصور' : 'AI Invoice Scanner'}</span>
                          <span className="text-[10px] text-purple-300/80">{isKu ? 'خوێندنەوەی نرخی کڕین و فرۆشتن' : isAr ? 'قراءة الأصناف والتواريخ والأسعار' : 'Extract items & prices'}</span>
                        </div>
                      </div>
                      <span className="text-xs">←</span>
                    </button>
                  )}

                  {onOpenLegacyMigrator && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenLegacyMigrator();
                      }}
                      className="p-3 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-400/40 text-cyan-200 text-left rtl:text-right flex items-center justify-between gap-2 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                        <div>
                          <span className="font-black text-xs block text-white">{isKu ? 'هاوردەی شاشەی سیستەمی کۆن' : isAr ? 'نقل شاشات البرامج القديمة' : 'Legacy Screen Migrator'}</span>
                          <span className="text-[10px] text-cyan-300/80">{isKu ? 'وێنەی خشتەی کۆمپیوتەر' : isAr ? 'تحويل الجداول والشاشات لقاعدة بيانات' : 'Migrate old POS tables'}</span>
                        </div>
                      </div>
                      <span className="text-xs">←</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSFER BETWEEN DEVICES */}
          {activeTab === 'transfer' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#10192D] border border-cyan-500/20 space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                  <span>{isKu ? 'چۆن داتاکان دەگوازیتەوە بۆ ئامێرێکی تر؟' : isAr ? 'طرق نقل البيانات ومشاركتها مع أجهزة أخرى' : 'Transferring Data Across Computers'}</span>
                </div>
                <p className="text-slate-300">
                  {isKu
                    ? 'چونکە سیستەمەکە ناوخۆیی کاردەکات و داتاکان بێ مۆڵەت ناچنە سەر ئینتەرنێت، دەتوانیت بە یەکێک لەم ڕێگایانە داتاکان بگوازیتەوە:'
                    : isAr
                    ? 'نظراً لأن النظام يعمل محلياً للحفاظ على خصوصيتك وسرعتك الفائقة، يمكنك نقل المواد والفواتير إلى أي لابتوب أو هاتف آخر بالطرق التالية:'
                    : 'To maintain full speed and privacy, you can easily transfer your data between devices using these offline/LAN options:'}
                </p>

                <div className="space-y-2 pt-1 text-[11.5px]">
                  
                  {/* Option A: Master Backup File */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <span className="font-black text-white text-xs flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isKu ? '١. هەناردەکردنی فایلی تەواو (Excel یان JSON)' : isAr ? '1. تصدير ملف النسخة الاحتياطية الشامل (Excel / JSON)' : '1. Full Database Export (Excel / JSON)'}</span>
                      </span>
                      <p className="text-slate-400 text-[11px]">
                        {isKu 
                          ? 'لە بەشی ڕێکخستنەکان كلیك لەسەر (تصدير) بکە و فایلەکە بە فلاش USB ببە بۆ لابتۆپەکەی تر و هاوردەی بکە.'
                          : isAr
                          ? 'من تبويب (الإعدادات) اضغط (تصدير شامل Excel أو JSON) ثم انسخ الملف عبر فلاش USB إلى اللابتوب الآخر واضغط (استيراد).'
                          : 'From Settings Tab, export Excel/JSON to a USB flash drive and restore it on the other computer.'}
                      </p>
                    </div>
                  </div>

                  {/* Option B: Local Wi-Fi Pairing */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <span className="font-black text-white text-xs flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isKu ? '٢. بەستنەوەی مۆبایل و لابتۆپ بە Wi-Fi ناوخۆیی (LAN)' : isAr ? '2. ربط الهاتف أو اللابتوب الآخر عبر شبكة Wi-Fi المحلية (LAN)' : '2. Connect via Local Wi-Fi (LAN)'}</span>
                      </span>
                      <p className="text-slate-400 text-[11px]">
                        {isKu
                          ? 'هەردوو ئامێرەکە بخەرە سەر هەمان ڕاوتەری وایفای مارکێتەکە، و ئەم ناونیشانە لە وێبگەڕی مۆبایلەکە بکەرەوە.'
                          : isAr
                          ? 'اربط الجهازين على نفس راوتر شبكة السوبرماركت (بدون الحاجة لإنترنت خارجي) وافتح الرابط التالي في الجهاز الثاني:'
                          : 'Connect both devices to your store router and open this local address in the other browser:'}
                      </p>
                      <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded-lg bg-black/60 text-cyan-300 font-bold border border-cyan-500/30 select-all">
                          {currentOrigin}
                        </span>
                        <button
                          onClick={handleCopyLink}
                          className="px-2 py-0.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-[10px] font-sans flex items-center gap-1 cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLink ? (isKu ? 'کۆپیکرا' : isAr ? 'تم النسخ' : 'Copied') : (isKu ? 'کۆپیکردن' : isAr ? 'نسخ الرابط' : 'Copy')}</span>
                        </button>
                      </div>
                    </div>

                    {onOpenMobileSync && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenMobileSync();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{isKu ? 'پیشاندانی QR Code' : isAr ? 'فتح نافذة الربط و QR' : 'Open QR & Wi-Fi Sync'}</span>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-slate-800 bg-[#0B1120] text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{isKu ? 'داتاکانت سەلامەتن و تەنها لەم ئامێرەدان' : isAr ? 'بياناتك محفوظة محلياً بأمان ومستقلة تماماً' : 'Your data is strictly stored on this device'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {isKu ? 'تێگەیشتم / داخستن' : isAr ? 'فهمت ذلك / إغلاق' : 'Got it / Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
