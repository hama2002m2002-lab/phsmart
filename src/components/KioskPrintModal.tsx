import React, { useState } from 'react';
import { 
  Printer, 
  Zap, 
  Download, 
  CheckCircle2, 
  HelpCircle, 
  ExternalLink, 
  Usb, 
  X, 
  Sparkles, 
  AlertCircle,
  FileCode,
  Laptop
} from 'lucide-react';
import { StoreSettings } from '../types';
import { 
  connectWebSerialPrinter, 
  disconnectWebSerialPrinter, 
  isSerialConnected, 
  isWebSerialSupported, 
  testPrintSerial, 
  downloadKioskPrintingBatchFile 
} from '../lib/thermalPrinter';

interface KioskPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'ku' | 'en';
  settings: StoreSettings;
}

export const KioskPrintModal: React.FC<KioskPrintModalProps> = ({
  isOpen,
  onClose,
  lang,
  settings,
}) => {
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const [isConnected, setIsConnected] = useState(isSerialConnected());
  const [isConnecting, setIsConnecting] = useState(false);
  const [testPrintStatus, setTestPrintStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'kiosk' | 'usb' | 'guide'>('kiosk');

  if (!isOpen) return null;

  const handleConnectUsb = async () => {
    setIsConnecting(true);
    setTestPrintStatus(null);
    try {
      await connectWebSerialPrinter(9600);
      setIsConnected(true);
      setTestPrintStatus(isKu ? '✅ پەیوەندی بە سەرکەوتوویی بەسترا بە پرنتەری حەراری!' : isAr ? '✅ تم الاتصال بالطابعة الحرارية بنجاح!' : '✅ Connected to thermal printer successfully!');
    } catch (err: any) {
      setTestPrintStatus(`❌ ${err.message || 'فشل الاتصال'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectUsb = async () => {
    await disconnectWebSerialPrinter();
    setIsConnected(false);
    setTestPrintStatus(isKu ? 'پەیوەندی پچڕا' : isAr ? 'تم فصل الطابعة' : 'Disconnected');
  };

  const handleTestPrint = async () => {
    try {
      await testPrintSerial(settings);
      setTestPrintStatus(isKu ? '✅ وەسڵی تاقیکردنەوە چاپکرا!' : isAr ? '✅ تم إرسال وصل الاختبار للطابعة بنجاح!' : '✅ Test receipt printed!');
    } catch (err: any) {
      setTestPrintStatus(`❌ ${err.message || 'فشل الاختبار'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl rounded-3xl bg-[#091122] border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.3)] flex flex-col max-h-[90vh] overflow-hidden text-slate-100"
        dir={isAr || isKu ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-950/60 via-[#071328] to-blue-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Zap className="w-6 h-6 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>
                  {isKu 
                    ? 'ڕێبەری چاپی خێرا و ڕاستەوخۆ (لابردنی پەنجەرەی پرێنتەر)' 
                    : isAr 
                    ? 'دليل الطباعة الصامتة الفورية (إلغاء نافذة معاينة المتصفح)' 
                    : 'Instant Silent Printing Guide (Bypass Print Dialog)'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono">
                  100% Silent POS
                </span>
              </h2>
              <p className="text-xs text-cyan-200/80 mt-0.5">
                {isKu
                  ? 'چۆنیەتی چاپکردنی پسوولە ڕاستەوخۆ لە 0.1 چرکەدا بەبێ ئەوەی پەنجەرەی گۆگڵ کرۆم بکرێتەوە'
                  : isAr
                  ? 'كيفية طباعة الوصل فوراً في 0.1 ثانية مباشرة إلى الطابعة دون ظهور نافذة المتصفح'
                  : 'How to print receipts instantly in 0.1s directly without the Chrome print preview window'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700 text-slate-400 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-[#060C18] px-4 gap-2 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('kiosk')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'kiosk'
                ? 'border-cyan-400 text-cyan-300 shadow-[0_2px_10px_rgba(6,182,212,0.3)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>{isKu ? '١. پەڕگەی کارپێکردنی خێرا (داگرتنی .bat)' : isAr ? '١. مشغل الطباعة الصامتة بنقرة واحدة (.bat)' : '1. 1-Click Silent Launcher (.bat)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('usb')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'usb'
                ? 'border-emerald-400 text-emerald-300 shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Usb className="w-4 h-4" />
            <span>{isKu ? '٢. بەستنەوە بە USB / Serial' : isAr ? '٢. ربط الطابعة الحرارية المباشر (USB)' : '2. Direct USB/Serial Connection'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'border-amber-400 text-amber-300 shadow-[0_2px_10px_rgba(245,158,11,0.3)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>{isKu ? '٣. ڕێنمایی دەستکاری Chrome' : isAr ? '٣. تعديل اختصار Google Chrome يدوياً' : '3. Manual Chrome Shortcut'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1 custom-scrollbar">
          
          {/* Explanation Alert */}
          <div className="p-3 sm:p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-slate-200 leading-relaxed text-xs sm:text-sm">
              <strong className="text-cyan-300 block mb-1">
                {isKu ? 'بۆچی پەنجەرەی چاپ لەسەر شاشەی لابتۆپەکەت دەکرێتەوە؟' : isAr ? 'لماذا تظهر نافذة معاينة الطباعة على شاشة اللابتوب؟' : 'Why does the print preview window appear?'}
              </strong>
              <span>
                {isKu
                  ? 'گۆگڵ کرۆم و ویندۆز بە شێوەیەکی بنەڕەتی ئەم پەنجەرەیە پیشان دەدەن بۆ دڵنیابوونەوە لە چاپ، بەڵام بۆ سیستمەکانی کاشێر (POS)، کرۆم تایبەتمەندی (--kiosk-printing)ی داناوە کە ڕێگە دەدات فەرمانەکان بەبێ هیچ پەنجەرەیەک ڕاستەوخۆ بنێردرێن بۆ پرنتەر لە کەمتر لە چرکەیەکدا!'
                  : isAr
                  ? 'يقوم متصفح Google Chrome و Microsoft Edge بإظهار نافذة المعاينة افتراضياً لتأكيد الطباعة. ولكن في أنظمة نقاط البيع والكاشير، وفرت شركة Google وضعاً خاصاً يدعى (--kiosk-printing) يقوم بإلغاء هذه النافذة نهائياً والطباعة الفورية في 0.1 ثانية!'
                  : 'Browsers show the print dialog by default. However, for POS systems, Chrome provides the --kiosk-printing flag to eliminate this dialog and print directly to the receipt printer in 0.1s!'}
              </span>
            </div>
          </div>

          {/* TAB 1: 1-Click .BAT LAUNCHER */}
          {activeTab === 'kiosk' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#0B152A] border border-cyan-500/40 space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <Download className="w-5 h-5" />
                  <span>
                    {isKu ? 'داگرتنی پەڕگەی دەستپێکردنی خێرای POS بۆ ویندۆز' : isAr ? 'تحميل ملف التشغيل الفوري للطباعة الصامتة لنظام Windows' : 'Download Windows 1-Click Silent POS Launcher'}
                  </span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  {isKu
                    ? 'تەنها کلیک لەسەر دوگمەی خوارەوە بکە، پەڕگەیەکی بچووک بە ناوی (7amo-POS-Silent-Print.bat) دادەبەزێت. پەڕگەکە لەسەر شاشەی سەرەکی (Desktop) لابتۆپەکەت دابنێ و لێی بدە بۆ کردنەوەی پرۆگرامەکە بە دۆخی چاپی صامت.'
                    : isAr
                    ? 'انقر على الزر أدناه لتحميل ملف تشغيل فوري باسم (7amo-POS-Silent-Print.bat). ضعه على سطح مكتب اللابتوب لديك وشغل البرنامج منه دائماً، وسيتم إلغاء نافذة المعاينة والطباعة مباشرة فور ضغطك على زر بيع وطباعة!'
                    : 'Download the .bat file, put it on your desktop and launch the POS from it. Print preview will never show up again!'}
                </p>

                <div className="pt-2 flex flex-wrap gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => downloadKioskPrintingBatchFile()}
                    className="py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isKu ? 'داگرتنی 7amo-POS-Silent-Print.bat' : isAr ? 'تحميل مشغل 7amo-POS-Silent-Print.bat' : 'Download 7amo-POS-Silent-Print.bat'}
                    </span>
                  </button>

                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isKu ? 'کار دەکات لەگەڵ Chrome & Edge' : isAr ? 'متوافق مع جميع أجهزة اللابتوب وWindows' : 'Works with Chrome & Edge on Windows'}
                  </span>
                </div>
              </div>

              {/* Instructions steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs border border-cyan-400/40">1</span>
                  <h4 className="font-bold text-white text-xs">{isKu ? 'دایبەزێنە' : isAr ? '١. حمّل الملف' : '1. Download'}</h4>
                  <p className="text-[11px] text-slate-400">{isKu ? 'کلیک لە دوگمەی سەرەوە بکە' : isAr ? 'انقر على زر التحميل الأخضر أعلاه' : 'Click the download button above'}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs border border-cyan-400/40">2</span>
                  <h4 className="font-bold text-white text-xs">{isKu ? 'بیخە سەر Desktop' : isAr ? '٢. ضعه على سطح المكتب' : '2. Put on Desktop'}</h4>
                  <p className="text-[11px] text-slate-400">{isKu ? 'بیگوازەرەوە بۆ سەر شاشەی لابتۆپ' : isAr ? 'انقل الملف المحمل لسطح مكتب اللابتوب' : 'Move the file to your desktop'}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs border border-cyan-400/40">3</span>
                  <h4 className="font-bold text-white text-xs">{isKu ? 'پرۆگرامەکە بکەرەوە' : isAr ? '٣. افتح البرنامج منه' : '3. Launch POS'}</h4>
                  <p className="text-[11px] text-slate-400">{isKu ? 'لەمەودوا چاپکردن دەبێتە خێرا و صامت' : isAr ? 'واستمتع بالطباعة الصامتة الفورية بدون نوافذ' : 'Enjoy zero-click silent printing'}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USB / SERIAL DIRECT CONNECTION */}
          {activeTab === 'usb' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#091522] border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <Usb className="w-5 h-5" />
                    <span>{isKu ? 'بەستنەوەی ڕاستەوخۆ بە پرنتەری حەراری (USB / Web Serial)' : isAr ? 'الاتصال المباشر بالطابعة الحرارية (USB / Web Serial API)' : 'Direct Web Serial Thermal Printer Driver'}</span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                    isConnected 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                    {isConnected 
                      ? (isKu ? 'متصل بە سەرکەوتوویی' : isAr ? 'متصل بالطابعة' : 'Connected') 
                      : (isKu ? 'پەیوەندی نەبەستراوە' : isAr ? 'غير متصل' : 'Not Connected')}
                  </span>
                </div>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  {isKu
                    ? 'ئەم شێوازە ڕاستەوخۆ پەیوەندی دەکات بە پۆرتی USB یان کێبڵی پرنتەرەکە لەسەر لابتۆپەکەت. کاتێک بەستراوە، داتاکان بە شێوەی باینەری (ESC/POS) ڕەوانە دەکرێن بەبێ پێویستی بە هیچ پەنجەرەیەکی وێبگەڕ.'
                    : isAr
                    ? 'تتيح هذه الخاصية إرسال أوامر ESC/POS مباشرة إلى منفذ USB أو Serial الخاص بالطابعة الحرارية. عند الربط، تتم الطباعة فوراً دون تدخل متصفح الويب نهائياً.'
                    : 'Sends raw ESC/POS commands directly to the USB/Serial thermal printer port.'}
                </p>

                {/* Connect / Disconnect Buttons */}
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {!isConnected ? (
                    <button
                      type="button"
                      disabled={isConnecting}
                      onClick={handleConnectUsb}
                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.35)] cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Usb className="w-4 h-4" />
                      <span>
                        {isConnecting 
                          ? (isKu ? 'چاوەڕوانبە...' : isAr ? 'جاري الاتصال...' : 'Connecting...') 
                          : (isKu ? 'بەستنەوە بە پرنتەر (USB)' : isAr ? 'اتصال بالطابعة الحرارية عبر USB' : 'Connect Thermal Printer USB')}
                      </span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleTestPrint}
                        className="py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.35)] cursor-pointer active:scale-95 transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        <span>{isKu ? 'چاپی تاقیکردنەوە' : isAr ? 'طباعة وصل اختبار' : 'Print Test Receipt'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnectUsb}
                        className="py-2.5 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{isKu ? 'پچڕانی پەیوەندی' : isAr ? 'فصل الطابعة' : 'Disconnect'}</span>
                      </button>
                    </>
                  )}
                </div>

                {testPrintStatus && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold font-mono">
                    {testPrintStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL CHROME SHORTCUT CONFIGURATION */}
          {activeTab === 'guide' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#091522] border border-amber-500/40 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <FileCode className="w-5 h-5" />
                  <span>{isKu ? 'دەستکاری کردنی ئایکۆنی Google Chrome لە ویندۆز (لە ٢٠ چرکەدا)' : isAr ? 'طريقة تعديل اختصار Google Chrome على سطح المكتب (خلال 20 ثانية)' : 'Manual Chrome Shortcut Configuration'}</span>
                </div>

                <div className="space-y-2.5 text-slate-300 text-xs sm:text-sm leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">1</span>
                    <span>{isKu ? 'کلیکی لای ڕاست لەسەر ئایکۆنی Google Chrome لەسەر شاشەی لابتۆپەکەت بکە و (Properties / خصائص) هەڵبژێرە.' : isAr ? 'انقر بالزر الأيمن للفأرة على أيقونة Google Chrome على سطح المكتب واختر (Properties / خصائص).' : 'Right click your Google Chrome desktop icon and select Properties.'}</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">2</span>
                    <div className="space-y-1">
                      <span>{isKu ? 'لە بەشی (Target / الهدف)، لە کۆتایی دێڕەکەدا ئەم دەقە زیاد بکە:' : isAr ? 'في خانة (Target / الهدف)، في نهاية السطر اترك مسافة وأضف الكود التالي:' : 'In the Target field, add a space and append:'}</span>
                      <div className="p-2 rounded-lg bg-slate-950 text-cyan-300 font-mono text-xs border border-cyan-500/40 select-all">
                        --kiosk-printing
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">3</span>
                    <span>{isKu ? 'کلیک لەسەر (OK / موافق) بکە و پرۆگرامەکە بکەرەوە. ئێستا هەموو وەسڵەکان بەبێ پەنجەرە چاپ دەبن!' : isAr ? 'اضغط (OK / موافق) وافتح المتصفح. من الآن فصاعداً ستتم الطباعة الصامتة الفورية بنقرة واحدة فقط دون أي نافذة!' : 'Click Apply/OK and open Chrome. Done!'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* POS Quick Tip */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>{isKu ? 'تێبینی فرۆشتنی خێرا:' : isAr ? 'ملاحظة البيع السريع:' : 'Quick Tip:'}</span>
            </span>
            <span className="text-slate-300">
              {isKu
                ? 'دەتوانیت دوگمەی سەوزی (فرۆشتن بێ پسوولە) بەکاربهێنیت کاتێک کڕیار پێویستی بە پسوولەی کاغەزی نییە.'
                : isAr
                ? 'يمكنك دائماً الضغط على الزر الأخضر (بيع بدون وصل) لحفظ البيع فوراً في 0 ثانية دون طباعة.'
                : 'You can use "Sale (No Receipt)" button to record sales instantly without printing.'}
            </span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#060C18] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-all"
          >
            {isKu ? 'داخستن' : isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
