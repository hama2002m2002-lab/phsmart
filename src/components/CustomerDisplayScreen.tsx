import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  ShoppingBag, 
  CreditCard, 
  Banknote, 
  Clock, 
  ShieldCheck, 
  ExternalLink, 
  X, 
  RotateCcw, 
  HeartPulse, 
  QrCode, 
  Smartphone, 
  Tag, 
  Info,
  Calendar,
  Layers,
  Sparkle
} from 'lucide-react';
import { CustomerDisplayPayload, CustomerDisplayItem, Language } from '../types';
import { subscribeCustomerDisplay, getInitialCustomerDisplayData } from '../lib/customerDisplayBroadcast';
import { formatNumber } from '../lib/formatUtils';
import { formatDisplayDate, formatDisplayTime } from '../lib/dateUtils';

interface CustomerDisplayScreenProps {
  initialData?: CustomerDisplayPayload | null;
  isStandalone?: boolean;
  onClose?: () => void;
  isEmbeddedSidePanel?: boolean;
}

const HEALTH_TIPS = [
  { ar: 'احرص دائماً على شرب كميات كافية من الماء يومياً للمحافظة على صحة ونشاط جسمك.', ku: 'ڕۆژانە بڕی پێویست لە ئاو بخۆرەوە بۆ پاراستنی تەندروستی لەشت.', en: 'Stay well-hydrated throughout the day for optimal body health and vitality.' },
  { ar: 'التزم بإكمال الكورس العلاجي للمضادات الحيوية وفق إرشادات الطبيب والصيدلي.', ku: 'کۆرسی دەرمانی دژە زیندەیی (ئەنتیبایۆتیک) بەپێی ڕێنماییەکان تەواو بکە.', en: 'Always complete prescribed antibiotic courses as directed by your physician.' },
  { ar: 'استشر الصيدلي دائماً حول طريقة الاستخدام والتداخلات الدوائية والغذائية.', ku: 'هەمیشە ڕاوێژ بە دەرمانساز بکە لەسەر شێوازی بەکارهێنان و تێکەڵبوونی دەرمان.', en: 'Always consult our pharmacist regarding medication timing and food interactions.' },
  { ar: 'احفظ الأدوية بعيداً عن متناول الأطفال وفي مكان جاف وبارد بعيداً عن الرطوبة.', ku: 'دەرمانەکان لە دەستی منداڵان و لە شوێنی فێنک و وشک دابنێ.', en: 'Keep medications out of reach of children in a cool, dry place.' },
  { ar: 'الفيتامينات والمكملات الغذائية تدعم مناعتك وصحتك العامة بعد استشارة الطبيب.', ku: 'ڤیتامین و تەواوکەرە خۆراکییەکان سیستەمی بەرگری بەهێز دەکەن.', en: 'Vitamins and dietary supplements support overall wellness and immune defense.' }
];

export const CustomerDisplayScreen: React.FC<CustomerDisplayScreenProps> = ({
  initialData,
  isStandalone = false,
  onClose,
  isEmbeddedSidePanel = false
}) => {
  const [data, setData] = useState<CustomerDisplayPayload | null>(initialData || getInitialCustomerDisplayData());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayLanguage, setDisplayLanguage] = useState<Language>('ar');
  const [showThankYouNotice, setShowThankYouNotice] = useState(false);

  const prevItemCountRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sound Chime Generator using Web Audio API (No external sound files required)
  const playItemChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current && AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio not permitted without gesture or muted
    }
  };

  // Subscribe to updates via BroadcastChannel & LocalStorage
  useEffect(() => {
    const unsubscribe = subscribeCustomerDisplay((incomingData) => {
      setData(incomingData);

      // Play chime when new item count increases
      if (incomingData.items && incomingData.items.length > prevItemCountRef.current) {
        playItemChime();
      }
      prevItemCountRef.current = incomingData.items?.length || 0;

      // Detect completed sale
      if (incomingData.completedSale) {
        setShowThankYouNotice(true);
      } else if (incomingData.items && incomingData.items.length > 0) {
        setShowThankYouNotice(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [soundEnabled]);

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cycle Health Tips in welcome mode
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setActiveTipIndex((prev) => (prev + 1) % HEALTH_TIPS.length);
    }, 7000);
    return () => clearInterval(tipTimer);
  }, []);

  // Auto-hide thank you screen after 10 seconds
  useEffect(() => {
    if (showThankYouNotice) {
      const thankYouTimer = setTimeout(() => {
        setShowThankYouNotice(false);
      }, 10000);
      return () => clearTimeout(thankYouTimer);
    }
  }, [showThankYouNotice]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const isAr = displayLanguage === 'ar';
  const isKu = displayLanguage === 'ku';

  const items = data?.items || [];
  const hasItems = items.length > 0;
  const isReturn = Boolean(data?.isReturnMode);
  const currency = data?.currencySymbol || 'د.ع';

  const storeName = isKu 
    ? (data?.storeNameKu || data?.storeNameAr || data?.storeName || 'دەرمانخانە')
    : isAr 
    ? (data?.storeNameAr || data?.storeName || 'صيدلية الشفاء التخصصية') 
    : (data?.storeName || 'Pharma Care');

  const activeTip = HEALTH_TIPS[activeTipIndex];

  return (
    <div 
      className={`flex flex-col h-full w-full bg-[#050A15] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black overflow-hidden relative ${
        displayLanguage === 'en' ? 'ltr' : 'rtl'
      }`} 
      dir={displayLanguage === 'en' ? 'ltr' : 'rtl'}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER: Store Identity, Live Time, Cashier Info & Display Controls */}
      <header className={`shrink-0 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[#091224]/95 border-b border-cyan-500/20 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-4 relative z-20 ${
        isReturn ? 'border-rose-500/40 bg-[#16080F]/95' : ''
      }`}>
        {/* Pharmacy Logo & Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 border transition-all ${
            isReturn
              ? 'bg-gradient-to-tr from-rose-600 to-amber-600 border-rose-400/50 shadow-rose-600/30'
              : 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-teal-500 border-cyan-300/40 shadow-cyan-500/30'
          }`}>
            {isReturn ? (
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-white" style={{ animationDuration: '6s' }} />
            ) : (
              <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
            )}
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-lg font-black text-white tracking-wide truncate">
                {storeName}
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border flex items-center gap-1 ${
                isReturn
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isReturn ? 'bg-rose-400' : 'bg-emerald-400'} animate-ping`} />
                {isReturn ? (isAr ? 'شاشة الإرجاع' : isKu ? 'شاشەی گەڕاندنەوە' : 'Returns Display') : (isAr ? 'شاشة العرض للزبون' : isKu ? 'شاشەی کڕیار' : 'Customer Display')}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-cyan-300/70 truncate flex items-center gap-2">
              <span>{isAr ? 'أهلاً وسهلاً بكم' : isKu ? 'بەخێربێن بۆ لای ئێمە' : 'Welcome to our pharmacy'}</span>
              {data?.cashierName && (
                <>
                  <span>•</span>
                  <span>{isAr ? `الكاشير: ${data.cashierName}` : isKu ? `کاشێر: ${data.cashierName}` : `Cashier: ${data.cashierName}`}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Live Clock & Screen Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Live Date & Time */}
          <div className="hidden md:flex flex-col items-end px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <div className="text-cyan-400 font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{formatDisplayTime(currentTime)}</span>
            </div>
            <div className="text-slate-400 text-[10px] flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              <span>{formatDisplayDate(currentTime)}</span>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => setDisplayLanguage('ar')}
              className={`px-2 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
                displayLanguage === 'ar' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              عربي
            </button>
            <button
              onClick={() => setDisplayLanguage('ku')}
              className={`px-2 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
                displayLanguage === 'ku' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              کوردی
            </button>
            <button
              onClick={() => setDisplayLanguage('en')}
              className={`px-1.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
                displayLanguage === 'en' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer ${
              soundEnabled 
                ? 'bg-slate-900/90 text-cyan-400 border-cyan-500/40 hover:bg-cyan-950/60' 
                : 'bg-slate-900/90 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title={soundEnabled ? (isAr ? 'كتم التنبيه الصوتي' : 'Mute sound') : (isAr ? 'تفعيل التنبيه الصوتي' : 'Enable sound')}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          {isStandalone && (
            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900/90 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title={isFullscreen ? (isAr ? 'إنهاء ملء الشاشة' : 'Exit fullscreen') : (isAr ? 'ملء الشاشة' : 'Fullscreen')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Close Button (if side drawer or modal) */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-rose-950/80 text-rose-300 border border-rose-500/40 hover:bg-rose-900 hover:text-white transition-all cursor-pointer"
              title={isAr ? 'إغلاق شاشة الزبون' : 'Close display'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative p-2.5 sm:p-4 gap-2.5 sm:gap-4">
        
        {/* VIEW STATE 1: COMPLETED SALE THANK YOU SCREEN */}
        {showThankYouNotice && data?.completedSale && (
          <div className="flex-1 flex items-center justify-center p-4 animate-fadeIn">
            <div className="max-w-xl w-full bg-gradient-to-b from-[#0C1A30] to-[#060D1E] border-2 border-emerald-400/50 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(16,185,129,0.25)] relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 animate-pulse" />
              
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full bg-emerald-500/20 border-2 border-emerald-400/60 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce">
                <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14" />
              </div>

              <h2 className="text-xl sm:text-3xl font-black text-white mb-2">
                {isAr ? 'تمت عملية البيع بنجاح!' : isKu ? 'فرۆشتنەکە بە سەرکەوتوویی ئەنجامدرا!' : 'Sale Completed Successfully!'}
              </h2>
              <p className="text-xs sm:text-base text-emerald-300/90 font-medium mb-6">
                {isAr ? 'شكراً لزيارتكم، نتمنى لكم دوام الصحة والعافية' : isKu ? 'سوپاس بۆ سەردانەکەتان، هیوای لەشساغیتان بۆ دەخوازین' : 'Thank you for your visit! Wishing you good health.'}
              </p>

              {/* Receipt Highlights */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 font-mono text-xs sm:text-sm text-slate-300">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">{isAr ? 'رقم الوصل:' : isKu ? 'ژمارەی پسوولە:' : 'Invoice No:'}</span>
                  <span className="text-cyan-400 font-bold">{data.completedSale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">{isAr ? 'المبلغ الإجمالي:' : isKu ? 'کۆی گشتی:' : 'Total Amount:'}</span>
                  <span className="text-emerald-400 font-bold text-base sm:text-lg">{currency}{formatNumber(data.completedSale.total)}</span>
                </div>
                {data.completedSale.amountTendered !== undefined && data.completedSale.amountTendered > 0 && (
                  <>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <span className="text-slate-400">{isAr ? 'المبلغ المستلم:' : isKu ? 'بڕی وەرگیراو:' : 'Amount Paid:'}</span>
                      <span className="text-slate-200">{currency}{formatNumber(data.completedSale.amountTendered)}</span>
                    </div>
                    {data.completedSale.changeDue !== undefined && data.completedSale.changeDue > 0 && (
                      <div className="flex justify-between items-center text-cyan-300 font-bold text-sm sm:text-base">
                        <span>{isAr ? 'المتبقي للمشتري (الباقي):' : isKu ? 'بڕی گەڕاوە بۆ کڕیار:' : 'Change Returned:'}</span>
                        <span className="text-cyan-400">{currency}{formatNumber(data.completedSale.changeDue)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>{isAr ? 'ستعود الشاشة تلقائياً للواجهة الترحيبية...' : isKu ? 'شاشەکە دەگەڕێتەوە بۆ سەرەتا...' : 'Returning to welcome screen...'}</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW STATE 2: IDLE / WELCOME SCREEN (When cart is empty and no completed sale popup) */}
        {!hasItems && !showThankYouNotice && (
          <div className="flex-1 flex flex-col justify-between items-center text-center p-4 sm:p-8 animate-fadeIn">
            {/* Upper Spacer */}
            <div />

            {/* Central Welcome Card */}
            <div className="max-w-2xl w-full bg-[#081226]/80 border border-cyan-500/30 rounded-3xl p-6 sm:p-10 shadow-[0_0_40px_rgba(6,182,212,0.15)] relative overflow-hidden backdrop-blur-md">
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-teal-500 p-0.5 shadow-[0_0_30px_rgba(6,182,212,0.35)] flex items-center justify-center">
                  <div className="w-full h-full bg-[#070D1C] rounded-[22px] flex items-center justify-center text-cyan-400">
                    <ShoppingBag className="w-10 h-10 sm:w-14 sm:h-14 animate-pulse" />
                  </div>
                </div>

                <h2 className="text-xl sm:text-3xl font-black text-white mb-2 tracking-wide">
                  {isAr ? 'أهلاً وسهلاً بكم في الصيدلية' : isKu ? 'بەخێربێن بۆ دەرمانخانەکەمان' : 'Welcome to our Pharmacy'}
                </h2>
                <p className="text-xs sm:text-base text-cyan-200/80 max-w-md mx-auto mb-6 leading-relaxed">
                  {isAr ? 'نظام العرض للزبون نشط • سيتم عرض المواد والأسعار فور تمريرها عبر الباركود' : isKu ? 'سیستەمی پیشاندانی کڕیار چالاکە • کاڵاکان ڕاستەوخۆ دەردەکەون' : 'Customer display active • Scanned items will appear here instantly'}
                </p>

                {/* Live Health Tip Card */}
                <div className="bg-[#050B18]/90 border border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm text-cyan-100 flex items-start gap-3 text-start shadow-inner">
                  <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-cyan-300 block mb-0.5 text-[11px] sm:text-xs">
                      {isAr ? '💡 نصيحة صحية صيدلانية:' : isKu ? '💡 ئامۆژگاری تەندروستی:' : '💡 Pharmacy Health Tip:'}
                    </span>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                      {isKu ? activeTip.ku : isAr ? activeTip.ar : activeTip.en}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Payment Capabilities Pill */}
            <div className="flex items-center flex-wrap justify-center gap-3 sm:gap-6 text-slate-400 text-xs mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-emerald-400 font-semibold">
                <Banknote className="w-4 h-4" />
                <span>{isAr ? 'الدفع النقدي' : isKu ? 'پارەی نەقد' : 'Cash'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-cyan-400 font-semibold">
                <CreditCard className="w-4 h-4" />
                <span>{isAr ? 'بطاقات فيزا وماستركارد' : isKu ? 'ڤیزا و ماستەرکارد' : 'Visa / MasterCard'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-indigo-400 font-semibold">
                <Smartphone className="w-4 h-4" />
                <span>{isAr ? 'دفع إلكتروني NFC & مدى' : isKu ? 'پارەدانی ئەلیکترۆنی' : 'Contactless NFC & Wallets'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-amber-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>{isAr ? 'أدوية موثوقة ومفحوصة' : isKu ? 'دەرمانی باوەڕپێکراو' : 'Verified Products'}</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW STATE 3: ACTIVE CART ITEMS LIST */}
        {hasItems && !showThankYouNotice && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#070D1C]/90 rounded-2xl border border-cyan-500/20 overflow-hidden shadow-xl">
            {/* Table Header */}
            <div className={`grid grid-cols-12 px-3 sm:px-5 py-2.5 text-[11px] sm:text-xs font-bold border-b shrink-0 ${
              isReturn ? 'bg-rose-950/70 border-rose-500/40 text-rose-200' : 'bg-[#0B152B] border-cyan-500/20 text-cyan-300'
            }`}>
              <div className="col-span-5 sm:col-span-6">{isAr ? 'المادة الدوائية / الصنف' : isKu ? 'ناوی دەرمان / کاڵا' : 'Item Name & Description'}</div>
              <div className="col-span-2 text-center">{isAr ? 'الكمية' : isKu ? 'بڕ' : 'Qty'}</div>
              <div className="col-span-2 sm:col-span-2 text-center">{isAr ? 'سعر الوحدة' : isKu ? 'نرخی دانە' : 'Unit Price'}</div>
              <div className="col-span-3 sm:col-span-2 text-end">{isAr ? 'المجموع' : isKu ? 'کۆی گشتی' : 'Total'}</div>
            </div>

            {/* Scrollable Items Table Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-1.5 sm:space-y-2">
              {items.map((item, idx) => {
                const isLatest = item.isNewlyAdded || idx === 0;
                const isCarton = item.saleType === 'carton';
                const isWholesale = item.saleType === 'wholesale';
                const isBlister = item.saleType === 'blister';

                const itemName = isKu
                  ? (item.nameKu || item.nameAr || item.name)
                  : isAr
                  ? (item.nameAr || item.name)
                  : item.name;

                return (
                  <div
                    key={item.id || `${item.productId}-${idx}`}
                    className={`grid grid-cols-12 items-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all ${
                      isReturn
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-100'
                        : isLatest
                        ? 'bg-gradient-to-r from-cyan-950/50 via-[#09152B] to-[#070D1C] border-cyan-400/70 shadow-[0_0_15px_rgba(6,182,212,0.2)] animate-pulse'
                        : 'bg-[#0B1325]/80 border-slate-800/90 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {/* Item Name & Details */}
                    <div className="col-span-5 sm:col-span-6 flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-base sm:text-xl shrink-0">
                        {item.imageIcon || '💊'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-white truncate">
                            {itemName}
                          </span>
                          {isLatest && (
                            <span className="px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300 text-[9px] font-bold border border-cyan-400/40 animate-pulse shrink-0">
                              {isAr ? 'جديد ✨' : isKu ? 'نوێ ✨' : 'New ✨'}
                            </span>
                          )}
                        </div>

                        {/* Secondary info / Scientific name / Unit */}
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 truncate mt-0.5">
                          {item.scientificName && (
                            <span className="text-cyan-400/90 font-mono italic truncate">
                              {item.scientificName}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.2 rounded font-semibold text-[9px] sm:text-[10px] ${
                            isCarton 
                              ? 'bg-purple-950 text-purple-300 border border-purple-500/30' 
                              : isWholesale
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : isBlister
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {isCarton 
                              ? (isAr ? '📦 كرتون' : isKu ? '📦 کارتۆن' : '📦 Carton')
                              : isWholesale
                              ? (isAr ? '🏷️ جملة' : isKu ? '🏷️ کۆ' : '🏷️ Wholesale')
                              : isBlister
                              ? (isAr ? '💊 شريط' : isKu ? '💊 شریت' : '💊 Blister')
                              : (isAr ? 'علبة / مفرد' : isKu ? 'دانە' : 'Unit')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 font-mono font-black text-xs sm:text-sm text-cyan-300">
                        {item.quantity}
                      </span>
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2 sm:col-span-2 text-center font-mono text-xs sm:text-sm text-slate-300">
                      <div>{currency}{formatNumber(item.unitPrice)}</div>
                      {item.originalPrice && item.originalPrice > item.unitPrice && (
                        <div className="text-[10px] text-slate-500 line-through">
                          {currency}{formatNumber(item.originalPrice)}
                        </div>
                      )}
                    </div>

                    {/* Total Price */}
                    <div className="col-span-3 sm:col-span-2 text-end font-mono font-black text-xs sm:text-base text-emerald-400">
                      {isReturn ? '-' : ''}{currency}{formatNumber(item.total)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* FIXED BOTTOM FINANCIAL TOTALS & PAYMENT HUD (Visible when there are items) */}
      {hasItems && !showThankYouNotice && (
        <footer className={`shrink-0 border-t p-3 sm:p-4 transition-all relative z-20 ${
          isReturn 
            ? 'bg-gradient-to-r from-[#17080E] via-[#200A15] to-[#17080E] border-rose-500/40 shadow-[0_-10px_30px_rgba(244,63,94,0.15)]' 
            : 'bg-gradient-to-r from-[#060D1E] via-[#09152B] to-[#060D1E] border-cyan-500/30 shadow-[0_-10px_30px_rgba(6,182,212,0.15)]'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            
            {/* Left/Middle Financial Breakdown: Subtotal, Discount, Tax */}
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap w-full md:w-auto justify-between md:justify-start">
              {/* Item Count */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">{isAr ? 'عدد المواد:' : isKu ? 'ژمارەی کاڵا:' : 'Items:'}</span>
                <span className="font-mono font-bold text-cyan-400">{data?.itemCount || items.length}</span>
              </div>

              {/* Subtotal */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">{isAr ? 'المجموع الفرعي:' : isKu ? 'کۆی سەرەتایی:' : 'Subtotal:'}</span>
                <span className="font-mono font-bold text-slate-200">{currency}{formatNumber(data?.subtotal || 0)}</span>
              </div>

              {/* Discount if present */}
              {Boolean(data?.discountAmount && data.discountAmount > 0) && (
                <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/50 flex items-center gap-1.5 text-xs animate-pulse">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-semibold">{isAr ? 'الخصم الممنوح:' : isKu ? 'داشکاندن:' : 'Discount:'}</span>
                  <span className="font-mono font-bold text-amber-400">-{currency}{formatNumber(data?.discountAmount || 0)}</span>
                </div>
              )}

              {/* Cash Paid / Change Due in Real-Time */}
              {Boolean(data?.cashTendered && data.cashTendered > 0) && (
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center gap-1.5 text-xs">
                    <span className="text-emerald-300">{isAr ? 'المستلم نقداً:' : isKu ? 'پارەی وەرگیراو:' : 'Paid:'}</span>
                    <span className="font-mono font-bold text-emerald-400">{currency}{formatNumber(data.cashTendered)}</span>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center gap-1.5 text-xs">
                    <span className="text-cyan-300 font-bold">{isAr ? 'الباقي للمشتري:' : isKu ? 'بڕی گەڕاوە:' : 'Change:'}</span>
                    <span className="font-mono font-bold text-cyan-400 text-sm">{currency}{formatNumber(data?.changeDue || 0)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: GRAND TOTAL DISPLAY (Ultra High Visibility) */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className={`w-full md:w-auto px-5 py-2.5 sm:py-3 rounded-2xl border-2 flex items-center justify-between md:justify-center gap-4 shadow-xl ${
                isReturn
                  ? 'bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-rose-400 shadow-rose-600/30'
                  : 'bg-gradient-to-r from-emerald-950 via-teal-950 to-cyan-950 border-emerald-400 shadow-emerald-500/30'
              }`}>
                <div className="text-start">
                  <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider block ${
                    isReturn ? 'text-rose-300' : 'text-emerald-300'
                  }`}>
                    {isReturn ? (isAr ? 'المبلغ المسترد للزبون' : isKu ? 'بڕی گەڕێندراوە' : 'Total Refund') : (isAr ? 'المبلغ الإجمالي المستحق' : isKu ? 'کۆی گشتی پێویست' : 'Grand Total Due')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {data?.paymentMethod === 'card' 
                      ? (isAr ? '💳 بطاقة بنكية' : 'Card') 
                      : data?.paymentMethod === 'debt' 
                      ? (isAr ? '📝 حساب آجل / دين' : 'Debt') 
                      : (isAr ? '💵 دفع نقدي' : 'Cash')}
                  </span>
                </div>

                <div className="font-mono font-black text-xl sm:text-3xl lg:text-4xl text-white tracking-tight flex items-baseline gap-1">
                  <span className="text-cyan-400 text-base sm:text-xl">{currency}</span>
                  <span className={isReturn ? 'text-rose-200' : 'text-emerald-300'}>
                    {formatNumber(data?.total || 0)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </footer>
      )}

    </div>
  );
};
