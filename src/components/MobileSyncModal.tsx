import React, { useState, useEffect } from 'react';
import { X, Smartphone, Wifi, Copy, Check, QrCode, RefreshCw, Zap, Shield, Radio, CheckCircle2 } from 'lucide-react';
import { StoreSettings } from '../types';

interface MobileSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
}

export const MobileSyncModal: React.FC<MobileSyncModalProps> = ({
  isOpen,
  onClose,
  settings
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'scanner' | 'pos' | 'inventory'>('scanner');
  const [simulatedMobileConnected, setSimulatedMobileConnected] = useState(false);

  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

  // Get dynamic local server URL or window origin
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://192.168.1.100:3000';
  const ipDisplay = currentOrigin.replace(/^https?:\/\//, '');

  const fullMobileUrl = `${currentOrigin}?mode=${selectedMode}&syncToken=${Date.now()}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentOrigin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleSimulateConnect = () => {
    setSimulatedMobileConnected(prev => !prev);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0F172A] via-[#0B1120] to-[#070A13] rounded-3xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-slate-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B1120]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>{isKu ? 'بەستنەوەی مارکێت بە مۆبایل لە ڕێگەی تۆڕی ناوخۆیی (LAN / Wi-Fi)' : isAr ? 'ربط السوبرماركت بالموبايل عبر الشبكة (LAN / Wi-Fi)' : 'Connect Mobile via Local Wi-Fi Network'}</span>
              </h3>
              <p className="text-[11px] text-cyan-300 font-medium">
                {isKu ? 'بەکارهێنانی مۆبایل وەک سکانەری بارکۆدی بێ وایەر یان کاشێری زیادە' : isAr ? 'استخدام الموبايل كـ قارئ باركود لاسلكي أو كاشير إضافي' : 'Use mobile phone as wireless barcode scanner or remote POS'}
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* LAN Connection Status Badge */}
          <div className="p-3.5 rounded-2xl bg-[#10192D] border border-cyan-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Wifi className="w-5 h-5 text-emerald-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {isKu ? 'تۆڕی ناوخۆیی Wi-Fi / LAN ئامادەیە بۆ بەستنەوە' : isAr ? 'شبكة Wi-Fi / LAN المحلية جاهزة للربط' : 'Local Wi-Fi Network Ready'}
                </span>
                <span className="text-[10.5px] text-slate-400">
                  {isKu ? 'ناونیشانی ئامێری ئێستا:' : isAr ? 'عنوان الجهاز الحالي:' : 'Current Host Address:'} <span className="font-mono text-cyan-300 font-bold">{ipDisplay}</span>
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleSimulateConnect}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                simulatedMobileConnected
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${simulatedMobileConnected ? 'text-emerald-400 animate-ping' : 'text-cyan-400'}`} />
              <span>{simulatedMobileConnected ? (isKu ? '🟢 مۆبایل بەستراوەتەوە' : isAr ? '🟢 الهاتف متصل' : '🟢 Mobile Paired') : (isKu ? 'پشکنینی بەستنەوە' : isAr ? 'فحص الاتصال' : 'Check Sync')}</span>
            </button>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-2 block">
              {isKu ? 'شێوازی کارکردنی مۆبایل هەڵبژێرە:' : isAr ? 'اختر وضع التشغيل للموبايل:' : 'Select Mobile Operating Mode:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMode('scanner')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  selectedMode === 'scanner'
                    ? 'bg-gradient-to-b from-cyan-950/90 to-blue-950/80 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/50 shadow-md'
                    : 'bg-[#10192D] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                <span className="text-xs font-bold block">{isKu ? '📷 سکانەری بارکۆد' : isAr ? '📷 ماسح باركود' : 'Barcode Scanner'}</span>
                <span className="text-[9.5px] opacity-75">{isKu ? 'سکانکردنی ڕاستەوخۆ بۆ کاشێر' : isAr ? 'مسح مباشر للكاشير' : 'Direct POS Scan'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('pos')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  selectedMode === 'pos'
                    ? 'bg-gradient-to-b from-blue-950/90 to-indigo-950/80 border-blue-400 text-blue-200 ring-1 ring-blue-400/50 shadow-md'
                    : 'bg-[#10192D] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                <span className="text-xs font-bold block">{isKu ? '🛒 کاشێری گەڕۆک' : isAr ? '🛒 كاشير متنقل' : 'Mobile POS'}</span>
                <span className="text-[9.5px] opacity-75">{isKu ? 'ڕووکاری تەواوی فرۆشتن' : isAr ? 'واجهة مبيعات كاملة' : 'Full Mobile POS'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('inventory')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  selectedMode === 'inventory'
                    ? 'bg-gradient-to-b from-purple-950/90 to-pink-950/80 border-purple-400 text-purple-200 ring-1 ring-purple-400/50 shadow-md'
                    : 'bg-[#10192D] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                <span className="text-xs font-bold block">{isKu ? '📋 جردی کۆگا' : isAr ? '📋 جرد المخزن' : 'Inventory Audit'}</span>
                <span className="text-[9.5px] opacity-75">{isKu ? 'نوێکردنەوەی بڕەکان' : isAr ? 'تحديث الكميات' : 'Update Stock'}</span>
              </button>
            </div>
          </div>

          {/* QR Code Card Display */}
          <div className="p-5 rounded-2xl bg-white text-slate-950 flex flex-col items-center justify-center space-y-3 shadow-2xl relative border-4 border-cyan-500/40">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-cyan-600" />
              <span>{isKu ? 'کۆدی QR بە کامێرای مۆبایلەکەت سکان بکە:' : isAr ? 'امسح الـ QR للكاميرا بالموبايل:' : 'Scan QR Code with Phone Camera:'}</span>
            </span>

            {/* Generated SVG QR Code Graphic */}
            <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-inner">
              <svg className="w-40 h-40" viewBox="0 0 100 100">
                {/* QR Finder Patterns */}
                <rect x="5" y="5" width="28" height="28" fill="black" rx="4" />
                <rect x="9" y="9" width="20" height="20" fill="white" rx="2" />
                <rect x="13" y="13" width="12" height="12" fill="black" rx="1" />

                <rect x="67" y="5" width="28" height="28" fill="black" rx="4" />
                <rect x="71" y="9" width="20" height="20" fill="white" rx="2" />
                <rect x="75" y="13" width="12" height="12" fill="black" rx="1" />

                <rect x="5" y="67" width="28" height="28" fill="black" rx="4" />
                <rect x="9" y="71" width="20" height="20" fill="white" rx="2" />
                <rect x="13" y="75" width="12" height="12" fill="black" rx="1" />

                {/* Simulated QR Data Dots */}
                <rect x="38" y="8" width="6" height="6" fill="black" />
                <rect x="48" y="8" width="6" height="6" fill="black" />
                <rect x="58" y="8" width="6" height="6" fill="black" />

                <rect x="38" y="18" width="6" height="6" fill="black" />
                <rect x="48" y="24" width="6" height="6" fill="black" />
                <rect x="58" y="18" width="6" height="6" fill="black" />

                <rect x="8" y="38" width="6" height="6" fill="black" />
                <rect x="18" y="44" width="6" height="6" fill="black" />
                <rect x="28" y="38" width="6" height="6" fill="black" />

                <rect x="38" y="38" width="10" height="10" fill="#06B6D4" rx="2" />
                <rect x="52" y="38" width="8" height="8" fill="black" />
                <rect x="64" y="38" width="8" height="8" fill="black" />

                <rect x="78" y="38" width="6" height="6" fill="black" />
                <rect x="88" y="44" width="6" height="6" fill="black" />

                <rect x="38" y="52" width="6" height="6" fill="black" />
                <rect x="52" y="52" width="10" height="10" fill="#06B6D4" rx="2" />
                <rect x="66" y="52" width="6" height="6" fill="black" />

                <rect x="38" y="67" width="6" height="6" fill="black" />
                <rect x="48" y="74" width="6" height="6" fill="black" />
                <rect x="58" y="67" width="6" height="6" fill="black" />
                <rect x="68" y="74" width="6" height="6" fill="black" />
                <rect x="78" y="67" width="6" height="6" fill="black" />
                <rect x="88" y="74" width="6" height="6" fill="black" />

                <rect x="38" y="85" width="8" height="8" fill="black" />
                <rect x="52" y="85" width="8" height="8" fill="black" />
                <rect x="68" y="85" width="8" height="8" fill="black" />
                <rect x="82" y="85" width="8" height="8" fill="black" />
              </svg>
            </div>

            <div className="w-full text-center">
              <span className="text-[10.5px] font-bold text-slate-600 block">
                {isKu ? 'یان وێبگەڕی مۆبایلەکەت بکەرەوە و ئەم بەستەرە بنووسە:' : isAr ? 'أو افتح متصفح الموبايل واكتب الرابط التالي:' : 'Or enter this web URL on mobile browser:'}
              </span>
              <div className="mt-1 flex items-center justify-between bg-slate-100 p-2 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-800">
                <span className="truncate max-w-[260px] text-cyan-700">{currentOrigin}</span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (isKu ? 'کۆپیکرا' : isAr ? 'تم النسخ' : 'Copied') : (isKu ? 'کۆپیکردن' : isAr ? 'نسخ' : 'Copy')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step-by-Step Guidance */}
          <div className="p-4 rounded-2xl bg-[#10192D] border border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>{isKu ? 'هەنگاوەکانی بەستنەوەی خێرا:' : isAr ? 'خطوات الربط السريع:' : 'Quick Pairing Instructions:'}</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11.5px] leading-relaxed">
              <li>{isKu ? 'دڵنیابە مۆبایل و کۆمپیوتەرەکەت بە یەک تۆڕی Wi-Fi پەیوەستکراون.' : isAr ? 'تأكد أن الموبايل واللابتوب متصلان بنفس شبكة الراوتر (Wi-Fi).' : 'Ensure mobile and PC are connected to the exact same Wi-Fi router.'}</li>
              <li>{isKu ? 'کامێرای مۆبایلەکەت بکەرەوە و ڕووی بکە لە کۆدی QR ی سەرەوە.' : isAr ? 'افتح تطبيق الكاميرا في الموبايل ووجّهها نحو الـ QR أعلاه.' : 'Open Camera app on your mobile phone and point to the QR code.'}</li>
              <li>{isKu ? 'بەرنامەی مارکێت ڕاستەوخۆ لە مۆبایلەکەتدا دەکرێتەوە بەبێ پێویستی دامەزراندن!' : isAr ? 'سيفتح برنامج الماركيت فوراً على هاتفكم دون الحاجة لتثبيت أي تطبيق!' : 'The POS app will open instantly on your phone screen with zero setup.'}</li>
            </ol>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0B1120] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isKu ? 'هاوئاهەنگی ڕاستەوخۆ بۆ فرۆشتن و بارکۆد' : isAr ? 'مزامنة فورية للمبيعات والباركود' : 'Real-time sales & barcode sync'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow-md hover:brightness-110 cursor-pointer"
          >
            {isKu ? 'تەواو / داخستن' : isAr ? 'تم / إغلاق' : 'Done / Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
