import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Smartphone,
  Wifi,
  Copy,
  Check,
  QrCode,
  RefreshCw,
  Zap,
  Shield,
  Radio,
  CheckCircle2,
  Lock,
  Download,
  Key,
  ShieldAlert,
  Server,
  Sparkles,
  Laptop
} from 'lucide-react';
import { StoreSettings } from '../types';
import {
  getLaptopSecurityCredentials,
  regenerateLaptopSecurityCredentials,
  buildSecurePairingUrl,
  LaptopSecurityCredentials,
  getAuthorizedDevices,
  revokeAllAuthorizedDevices,
  AuthorizedMobileDevice,
  sendScannedBarcodeToLaptop
} from '../lib/mobileSyncSecurity';

interface MobileSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onTestBarcodeReceived?: (barcode: string) => void;
}

export const MobileSyncModal: React.FC<MobileSyncModalProps> = ({
  isOpen,
  onClose,
  settings,
  onTestBarcodeReceived
}) => {
  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

  const [creds, setCreds] = useState<LaptopSecurityCredentials>(() =>
    getLaptopSecurityCredentials(settings.storeNameAr || settings.storeName)
  );

  const [selectedMode, setSelectedMode] = useState<'scanner' | 'pos' | 'inventory'>('scanner');
  const [customHost, setCustomHost] = useState<string>('');
  const [useCustomHost, setUseCustomHost] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrGenerating, setQrGenerating] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [pinCopied, setPinCopied] = useState<boolean>(false);
  const [pinRegeneratedToast, setPinRegeneratedToast] = useState<boolean>(false);
  const [authorizedDevices, setAuthorizedDevices] = useState<AuthorizedMobileDevice[]>([]);
  const [testSent, setTestSent] = useState<boolean>(false);

  // Sync credentials and register with server
  useEffect(() => {
    if (!isOpen) return;

    const currentCreds = getLaptopSecurityCredentials(settings.storeNameAr || settings.storeName);
    setCreds(currentCreds);
    setAuthorizedDevices(getAuthorizedDevices());

    // Register active laptop pairing session with local server
    try {
      fetch('/api/mobile-sync/register-laptop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laptopId: currentCreds.laptopId,
          pin: currentCreds.securityPin,
          token: currentCreds.pairingToken,
          shopName: settings.storeNameAr || settings.storeName
        })
      }).catch(() => {});
    } catch {}
  }, [isOpen, settings.storeName, settings.storeNameAr]);

  // Compute Base Origin
  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://192.168.1.100:3000';

  // Build the complete, cryptographically secured pairing URL
  const securePairingUrl = useMemo(() => {
    const hostToUse = useCustomHost && customHost.trim() ? customHost.trim() : undefined;
    return buildSecurePairingUrl(baseOrigin, selectedMode, creds, hostToUse);
  }, [baseOrigin, selectedMode, creds, useCustomHost, customHost]);

  // Generate crisp, high-density QR Code with error correction level 'H'
  useEffect(() => {
    if (!isOpen || !securePairingUrl) return;

    setQrGenerating(true);
    QRCode.toDataURL(securePairingUrl, {
      width: 440,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#030712',
        light: '#FFFFFF'
      }
    })
      .then((url: string) => {
        setQrDataUrl(url);
        setQrGenerating(false);
      })
      .catch((err: any) => {
        console.error('QR code generation error:', err);
        setQrGenerating(false);
      });
  }, [isOpen, securePairingUrl]);

  // Copy Full Secure Link
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(securePairingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Copy PIN only
  const handleCopyPin = () => {
    navigator.clipboard.writeText(creds.securityPin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2500);
  };

  // Regenerate Security PIN & Revoke all devices
  const handleRegenerateCredentials = () => {
    const fresh = regenerateLaptopSecurityCredentials(settings.storeNameAr || settings.storeName);
    setCreds(fresh);
    setAuthorizedDevices([]);
    setPinRegeneratedToast(true);
    setTimeout(() => setPinRegeneratedToast(false), 3000);
  };

  // Revoke all authorized devices
  const handleRevokeAllDevices = () => {
    revokeAllAuthorizedDevices();
    setAuthorizedDevices([]);
    handleRegenerateCredentials();
  };

  // Download HD QR Code image (PNG)
  const handleDownloadQrImage = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR-Shop-Laptop-Security-${creds.securityPin}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Send a test barcode from modal to verify integration
  const handleSendTestBarcode = async () => {
    setTestSent(true);
    const sampleBarcode = '6281000100234';
    await sendScannedBarcodeToLaptop({
      id: `test-${Date.now()}`,
      barcode: sampleBarcode,
      laptopId: creds.laptopId,
      pin: creds.securityPin,
      deviceName: 'فحص تجريبي من اللابتوب',
      timestamp: Date.now(),
      scanMode: selectedMode
    });

    if (onTestBarcodeReceived) {
      onTestBarcodeReceived(sampleBarcode);
    }

    setTimeout(() => setTestSent(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl bg-[#090E1A] rounded-3xl border border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.3)] text-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800/80 bg-gradient-to-r from-[#0C1425] via-[#0E1A33] to-[#0A101D] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-400/40">
              <Laptop className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                  <span>{isKu ? 'بەستنەوەی پارێزراوی مۆبایل بە لابتۆپی فرۆشگا' : isAr ? 'ربط الموبايل الآمن بلابتوب ومحل الكاشير' : 'Secure Mobile POS & Scanner Pairing'}</span>
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span>{isAr ? 'حصري للمحل' : isKu ? 'تایبەت بە دووکان' : 'Shop Exclusive'}</span>
                </span>
              </div>
              <p className="text-[11px] text-cyan-300/90 font-medium mt-0.5">
                {isKu ? 'تەنها بۆ ئەم لابتۆپە و فرۆشگایە ڕێگەپێدراوە - کەس ناتوانێت بێ ڕەزامەندی بێتە ژوورەوە' : isAr ? 'الباركود مشفر ومقفل برمز أمان خاص بلابتوب هذا المحل لمنع أي دخول غير مصرح به' : 'Encrypted pairing locked with unique laptop security PIN to prevent unauthorized access'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700/60"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          
          {/* Security Banner & PIN Guard */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#121B2F] to-cyan-950/40 border border-amber-500/40 shadow-inner space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>{isAr ? 'رمز حماية وتفويض اللابتوب (PIN السري):' : isKu ? 'کۆدی پاراستنی لابتۆپ (PIN):' : 'Laptop Security PIN:'}</span>
                  </h4>
                  <p className="text-[10.5px] text-slate-300">
                    {isAr ? 'لا يمكن لأي هاتف الدخول أو المسح إلا بعد إدخال هذا الرمز أو مسح الكود المشفر أدناه' : isKu ? 'هیچ مۆبایلێک ناتوانێت دابەزێت یان سکان بکات بێ ئەم کۆدە' : 'Devices require this PIN or the encrypted QR code to pair'}
                  </p>
                </div>
              </div>

              {/* 6-Digit PIN Display & Actions */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="flex items-center gap-1 bg-black/80 px-3 py-1.5 rounded-xl border-2 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.3)] font-mono tracking-widest text-lg font-black text-amber-300">
                  <span>{creds.securityPin.slice(0, 3)}</span>
                  <span className="text-slate-500">-</span>
                  <span>{creds.securityPin.slice(3, 6)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPin}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                  title="نسخ الرمز"
                >
                  {pinCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                </button>

                <button
                  type="button"
                  onClick={handleRegenerateCredentials}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-bold text-[11px] transition-all cursor-pointer shadow-md active:scale-95"
                  title="تغيير الرمز وفسخ أي جهاز سابق"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isAr ? 'تجديد الرمز' : isKu ? 'نوێکردنەوەی کۆد' : 'Regenerate'}</span>
                </button>
              </div>
            </div>

            {pinRegeneratedToast && (
              <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold text-center flex items-center justify-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'تم إنشاء رمز أمان جديد بنجاح وفسخ أي أجهزة قديمة' : isKu ? 'کۆدی نوێ بە سەرکەوتوویی دروستکرا' : 'New security PIN generated; prior sessions revoked'}</span>
              </div>
            )}
          </div>

          {/* Mode Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isKu ? 'شێوازی کارکردنی مۆبایل دیاریبکە:' : isAr ? 'اختر وضع التشغيل للموبايل عند الربط:' : 'Select Mobile Operating Mode:'}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMode('scanner')}
                className={`p-3 rounded-2xl border text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                  selectedMode === 'scanner'
                    ? 'bg-gradient-to-br from-cyan-950/90 to-blue-950/90 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/40 shadow-lg'
                    : 'bg-[#10192D]/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-white">{isKu ? '📷 سکانەری بێ وایەر' : isAr ? '📷 قارئ باركود لاسلكي' : 'Wireless Scanner'}</span>
                </div>
                <span className="text-[10px] text-slate-300 block leading-tight">
                  {isKu ? 'سکانکردنی ڕاستەوخۆ بۆ سەبەتەی فرۆشتن' : isAr ? 'إرسال الباركود فوراً لسلة كاشير اللابتوب' : 'Instantly transmits barcodes to POS cart'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('pos')}
                className={`p-3 rounded-2xl border text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                  selectedMode === 'pos'
                    ? 'bg-gradient-to-br from-blue-950/90 to-indigo-950/90 border-blue-400 text-blue-200 ring-2 ring-blue-400/40 shadow-lg'
                    : 'bg-[#10192D]/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-white">{isKu ? '🛒 کاشێری گەڕۆک' : isAr ? '🛒 كاشير محمول كامل' : 'Mobile POS'}</span>
                </div>
                <span className="text-[10px] text-slate-300 block leading-tight">
                  {isKu ? 'ڕووکاری تەواوی فرۆشتن و دەرکردنی پسوولە' : isAr ? 'واجهة بيع متكاملة على شاشة الهاتف' : 'Complete checkout UI on mobile screen'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('inventory')}
                className={`p-3 rounded-2xl border text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                  selectedMode === 'inventory'
                    ? 'bg-gradient-to-br from-purple-950/90 to-pink-950/90 border-purple-400 text-purple-200 ring-2 ring-purple-400/40 shadow-lg'
                    : 'bg-[#10192D]/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-white">{isKu ? '📋 جردی کۆگا' : isAr ? '📋 جرد المخزن' : 'Inventory Audit'}</span>
                </div>
                <span className="text-[10px] text-slate-300 block leading-tight">
                  {isKu ? 'سکانکردنی کاڵاکان و نوێکردنەوەی ژمارەکان' : isAr ? 'تحديث ومطابقة كميات المخزن بالهاتف' : 'Count & update physical stock levels'}
                </span>
              </button>
            </div>
          </div>

          {/* REAL DYNAMIC HIGH-QUALITY QR CODE CONTAINER */}
          <div className="p-5 rounded-3xl bg-gradient-to-b from-[#101827] via-[#0C121F] to-[#0A0E18] border border-cyan-500/40 shadow-2xl flex flex-col items-center justify-center space-y-4 relative">
            
            {/* Target Header Banner */}
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs">
                  {isKu ? 'کۆدی QR ی باڵا (HD) بۆ کامێرای مۆبایل:' : isAr ? 'امسح كود الـ QR عالي الدقة (HD) بكاميرا الموبايل:' : 'Scan HD QR Code with Mobile Camera:'}
                </span>
              </div>
              <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30 font-mono">
                {isAr ? 'تصحيح أخطاء 100%' : 'High Error Correction'}
              </span>
            </div>

            {/* High-Resolution QR Card with Cyber Camera Frame Target Brackets */}
            <div className="relative p-4 bg-white rounded-3xl shadow-[0_0_35px_rgba(255,255,255,0.15)] flex items-center justify-center border-4 border-slate-900 group">
              {/* Target Corner Guides */}
              <div className="absolute top-2 left-2 w-5 h-5 border-t-4 border-l-4 border-cyan-600 rounded-tl-lg pointer-events-none" />
              <div className="absolute top-2 right-2 w-5 h-5 border-t-4 border-r-4 border-cyan-600 rounded-tr-lg pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-5 h-5 border-b-4 border-l-4 border-cyan-600 rounded-bl-lg pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-5 h-5 border-b-4 border-r-4 border-cyan-600 rounded-br-lg pointer-events-none" />

              {/* Dynamic QR Image Rendered via 'qrcode' engine */}
              {qrGenerating ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-800 gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-cyan-600" />
                  <span className="text-xs font-bold font-mono">Generating HD QR...</span>
                </div>
              ) : qrDataUrl ? (
                <div className="relative">
                  <img
                    src={qrDataUrl}
                    alt="POS Security QR Code"
                    className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-xl select-none"
                  />
                  {/* Center Store Security Badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-2xl bg-[#090E1A] border-2 border-cyan-400 flex items-center justify-center shadow-lg text-white font-black text-xs">
                      <Shield className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Quick Actions below QR: Download HD image & Copy encrypted link */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
              <button
                type="button"
                onClick={handleDownloadQrImage}
                disabled={!qrDataUrl}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 cursor-pointer disabled:opacity-50"
                title="تنزيل صورة الـ QR لطباعتها ولصقها على الكاشير"
              >
                <Download className="w-4 h-4 text-emerald-200" />
                <span>{isKu ? '💾 داگرتنی وێنەی QR (بۆ چاپکردن)' : isAr ? '💾 تنزيل الـ QR كصورة HD للطباعة' : 'Download HD QR Image'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-cyan-200" />}
                <span>{copied ? (isKu ? 'کۆپیکرا!' : isAr ? 'تم نسخ الرابط!' : 'Copied!') : (isKu ? '📋 کۆپیکردنی بەستەر' : isAr ? '📋 نسخ الرابط المشفر' : 'Copy Secure Link')}</span>
              </button>

              <button
                type="button"
                onClick={handleSendTestBarcode}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95 cursor-pointer"
                title="إرسال باركود تجريبي للتحقق من الاتصال باللابتوب"
              >
                <Radio className={`w-3.5 h-3.5 ${testSent ? 'text-emerald-400 animate-ping' : 'text-amber-400'}`} />
                <span>{testSent ? (isAr ? 'تم إرسال باركود تجريبي!' : 'Test Sent!') : (isAr ? 'فحص تجريبي للباركود' : 'Simulate Scan')}</span>
              </button>
            </div>

            {/* URL Display Bar */}
            <div className="w-full bg-[#060A14] p-2.5 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between gap-2">
              <span className="truncate text-cyan-400 max-w-[85%]">{securePairingUrl}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 font-sans">
                {isAr ? 'مشفر ومؤمن' : 'Encrypted'}
              </span>
            </div>
          </div>

          {/* Wi-Fi / Local Network IP Settings & Instructions */}
          <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h4 className="font-bold text-white text-xs">
                  {isKu ? 'تۆڕی ناوخۆیی و ڕێکخستنی ناونیشانی IP:' : isAr ? 'الشبكة المحلية وتخصيص عنوان الـ IP للابتوب:' : 'Local Network & Laptop IP Configuration:'}
                </h4>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomHost}
                  onChange={(e) => setUseCustomHost(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] text-slate-300 font-bold">
                  {isAr ? 'تخصيص IP محلي (Wi-Fi)' : isKu ? 'دیاریکردنی IP ی ناوخۆیی' : 'Custom Local IP'}
                </span>
              </label>
            </div>

            {useCustomHost ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400 shrink-0" />
                  <input
                    type="text"
                    value={customHost}
                    onChange={(e) => setCustomHost(e.target.value)}
                    placeholder="مثال: 192.168.1.15:3000"
                    className="flex-1 bg-black/60 border border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
                <p className="text-[10.5px] text-slate-400">
                  {isAr 
                    ? '💡 لمعرفة عنوان IP اللابتوب في شبكة المحل: افتح موجه الأوامر واكتب ipconfig ثم انسخ عنوان IPv4 وضع المنفذ :3000.'
                    : '💡 To find your laptop IP on the shop Wi-Fi: open terminal/cmd, run ipconfig, and copy the IPv4 address.'}
                </p>
              </div>
            ) : (
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                {isAr
                  ? '🔒 يعمل الاتصال تلقائياً عبر الشبكة المحلية (Wi-Fi). تأكد فقط أن هاتف الموبايل واللابتوب متصلان بنفس شبكة الراوتر الخاصة بالمحل.'
                  : isKu
                  ? 'دڵنیابە مۆبایل و لابتۆپ بە هەمان تۆڕی Wi-Fi ی دووکانەکە پەیوەستکراون.'
                  : 'Connection runs securely via local Wi-Fi. Ensure phone and laptop are connected to the same shop router.'}
              </p>
            )}
          </div>

          {/* Master Lockout / Revoke All Devices */}
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold text-white text-xs block">
                  {isAr ? 'حظر فوري وإلغاء تفويض كافة الأجهزة السابقة' : isKu ? 'هەڵوەشاندنەوەی هەموو ئامێرە پێشووەکان' : 'Master Lockout & Session Revocation'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isAr ? 'إذا شككت في اتصال جهاز غريب، اضغط هنا لفسخ كافة الجلسات وتجديد الرمز فوراً' : 'Instantly disconnects and blocks any previously paired mobile devices'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRevokeAllDevices}
              className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px] transition-all cursor-pointer shrink-0 border border-rose-400/40 active:scale-95"
            >
              {isAr ? 'فسخ وحظر الجميع' : isKu ? 'هەڵوەشاندنەوە' : 'Revoke All'}
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-800/80 bg-[#090E1A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{isKu ? 'پارێزراوە بە کۆدی PIN ی تایبەت' : isAr ? 'محمي ومقفل برمز أمان اللابتوب' : 'Locked with Laptop Security PIN'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-black text-xs shadow-md hover:brightness-110 active:scale-95 cursor-pointer border border-cyan-400/40"
          >
            {isKu ? 'تەواو / داخستن' : isAr ? 'تم / إغلاق' : 'Done / Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
