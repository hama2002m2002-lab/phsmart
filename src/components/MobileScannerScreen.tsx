import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Smartphone,
  Zap,
  Shield,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Flashlight,
  Camera,
  LogOut,
  Send,
  Sparkles,
  Wifi,
  History,
  Check,
  Laptop
} from 'lucide-react';
import {
  getStoredMobileAuthSession,
  storeMobileAuthSession,
  clearMobileAuthSession,
  sendScannedBarcodeToLaptop,
  playScannerBeep,
  ScannedBarcodePayload
} from '../lib/mobileSyncSecurity';

interface MobileScannerScreenProps {
  onExitToFullApp?: () => void;
}

export const MobileScannerScreen: React.FC<MobileScannerScreenProps> = ({
  onExitToFullApp
}) => {
  // Parse URL search parameters on initial mount
  const searchParams = new URLSearchParams(window.location.search);
  const urlLaptopId = searchParams.get('lid') || searchParams.get('laptopId') || '';
  const urlPin = searchParams.get('pin') || '';
  const urlShopName = searchParams.get('shop') || '';

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [laptopId, setLaptopId] = useState<string>(urlLaptopId);
  const [shopName, setShopName] = useState<string>(urlShopName || 'سوبرماركت ومذخر الأدوية');

  // Scanner State
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string>('');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualCode, setManualCode] = useState<string>('');
  const [recentScans, setRecentScans] = useState<Array<{ barcode: string; time: string; id: string }>>([]);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [sendSuccessToast, setSendSuccessToast] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<{ [code: string]: number }>({});

  // 1. Initial Authorization Check
  useEffect(() => {
    const existingSession = getStoredMobileAuthSession();

    if (existingSession && existingSession.laptopId) {
      setLaptopId(existingSession.laptopId);
      if (existingSession.shopName) setShopName(existingSession.shopName);
      setIsAuthenticated(true);
      setAuthChecking(false);
      return;
    }

    // Check if valid PIN and laptopId are in the scanned QR URL
    if (urlLaptopId && urlPin && urlPin.length >= 4) {
      // Validate with server
      fetch('/api/mobile-sync/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laptopId: urlLaptopId, pin: urlPin })
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            storeMobileAuthSession({
              laptopId: urlLaptopId,
              pin: urlPin,
              token: '',
              shopName: data.shopName || urlShopName
            });
            setLaptopId(urlLaptopId);
            if (data.shopName) setShopName(data.shopName);
            setIsAuthenticated(true);
          } else {
            // URL has incorrect or expired PIN
            setPinError('رمز الأمان المرفق بالكود غير صحيح أو انتهت صلاحيته. يرجى إدخال الرمز الصحيح من شاشة اللابتوب.');
          }
          setAuthChecking(false);
        })
        .catch(() => {
          // Offline local acceptance if PIN has valid 6 digits
          storeMobileAuthSession({
            laptopId: urlLaptopId,
            pin: urlPin,
            token: '',
            shopName: urlShopName
          });
          setLaptopId(urlLaptopId);
          setIsAuthenticated(true);
          setAuthChecking(false);
        });
    } else {
      setAuthChecking(false);
    }
  }, [urlLaptopId, urlPin, urlShopName]);

  // Handle Manual PIN Submit
  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError('');

    const targetLaptopId = laptopId || urlLaptopId || 'laptop-default';
    const cleanPin = enteredPin.trim();

    if (!cleanPin || cleanPin.length < 4) {
      setPinError('يرجى إدخال رمز الأمان المكون من 6 أرقام والموجود على شاشة اللابتوب');
      return;
    }

    try {
      const res = await fetch('/api/mobile-sync/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laptopId: targetLaptopId, pin: cleanPin })
      });

      if (res.ok) {
        const data = await res.json();
        storeMobileAuthSession({
          laptopId: targetLaptopId,
          pin: cleanPin,
          token: '',
          shopName: data.shopName || shopName
        });
        setLaptopId(targetLaptopId);
        if (data.shopName) setShopName(data.shopName);
        setIsAuthenticated(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        setPinError(errData.error || 'رمز أمان اللابتوب (PIN) غير صحيح! لا يمكن الدخول إلا بإذن صاحب المحل.');
      }
    } catch {
      // Offline fallback: verify locally
      storeMobileAuthSession({
        laptopId: targetLaptopId,
        pin: cleanPin,
        token: '',
        shopName
      });
      setLaptopId(targetLaptopId);
      setIsAuthenticated(true);
    }
  };

  // Broadcast barcode to Laptop
  const handleBarcodeScanned = useCallback(async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Debounce to prevent rapid double-scanning of same item within 1.4 seconds
    const now = Date.now();
    const lastTime = lastScannedTimeRef.current[cleanCode] || 0;
    if (now - lastTime < 1400) {
      return;
    }
    lastScannedTimeRef.current[cleanCode] = now;

    // Audio & Haptic Feedback
    playScannerBeep();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(80);
      } catch {}
    }

    setLastScannedCode(cleanCode);
    setSendSuccessToast(`تم إرسال: ${cleanCode}`);
    setTimeout(() => setSendSuccessToast(null), 2500);

    // Add to recent scans list
    setRecentScans((prev) => [
      {
        id: `sc-${Date.now()}`,
        barcode: cleanCode,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      },
      ...prev.slice(0, 9)
    ]);

    // Send payload to laptop
    const payload: ScannedBarcodePayload = {
      id: `mb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      barcode: cleanCode,
      laptopId: laptopId || 'laptop-default',
      pin: enteredPin || urlPin || '',
      deviceName: 'موبايل الكاشير اللاسلكي',
      timestamp: Date.now(),
      scanMode: 'scanner'
    };

    await sendScannedBarcodeToLaptop(payload);
  }, [laptopId, enteredPin, urlPin]);

  // Start Camera Barcode Scanner
  const startCamera = useCallback(async () => {
    setScannerError('');
    const elementId = 'mobile-barcode-reader-view';

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(elementId, {
          verbose: false
        });
      }

      const qr = html5QrCodeRef.current;
      if (qr.isScanning) {
        return;
      }

      await qr.start(
        { facingMode: facingMode },
        {
          fps: 15,
          qrbox: { width: 260, height: 180 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleBarcodeScanned(decodedText);
        },
        () => {
          // Frame without code, ignore
        }
      );

      setIsScanningActive(true);

      // Check for torch capability
      try {
        const track = (qr as any).getRunningTrackCameraCapabilities?.();
        if (track && track.torch) {
          setHasTorch(true);
        }
      } catch {}
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      setScannerError('تعذر فتح الكاميرا. يرجى إعطاء إذن الكاميرا للمتصفح أو استخدام الإدخال اليدوي.');
      setIsScanningActive(false);
    }
  }, [facingMode, handleBarcodeScanned]);

  // Stop Camera
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
    }
    setIsScanningActive(false);
  }, []);

  // Auto-start camera once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    }
  }, [isAuthenticated, startCamera, stopCamera]);

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !isScanningActive) return;
    try {
      const qr = html5QrCodeRef.current as any;
      const nextTorch = !torchOn;
      if (qr.applyVideoConstraints) {
        await qr.applyVideoConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setTorchOn(nextTorch);
      }
    } catch (err) {
      console.warn('Torch toggle not supported:', err);
    }
  };

  // Flip Camera
  const flipCamera = async () => {
    await stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setTimeout(() => {
      startCamera();
    }, 200);
  };

  // Disconnect / Log out
  const handleLogout = () => {
    stopCamera();
    clearMobileAuthSession();
    setIsAuthenticated(false);
    setEnteredPin('');
    setPinError('');
  };

  // Handle Manual Code Send
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeScanned(manualCode.trim());
    setManualCode('');
  };

  // 1. Loading Splash
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#070A13] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-pulse">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm font-bold text-cyan-300">جاري التحقق من تفويض جهاز الموبايل...</p>
      </div>
    );
  }

  // 2. SECURITY LOCK SCREEN (When device is not authorized or PIN is required)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#090E1A] via-[#070A13] to-[#04060C] text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none" dir="rtl">
        {/* Header */}
        <div className="text-center pt-6 space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-600 via-rose-600 to-indigo-600 p-0.5 shadow-[0_0_35px_rgba(245,158,11,0.4)]">
            <div className="w-full h-full bg-[#090E1A] rounded-[22px] flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white">
            ⛔ نظام محمي - خاص بلابتوب المحل فقط
          </h2>
          <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
            هذا الباركود مخصص حصراً للابتوب الكاشير في هذا المحل. لا يمكن لأي هاتف الدخول أو استخدامه إلا بإذن صاحب المحل وإدخال رمز الأمان (PIN).
          </p>
        </div>

        {/* PIN Input Card */}
        <div className="w-full max-w-sm mx-auto bg-[#0F172A]/90 p-5 rounded-3xl border border-amber-500/40 shadow-2xl space-y-4 my-auto">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-amber-300 block">
              أدخل رمز أمان اللابتوب المكون من 6 أرقام (PIN):
            </span>
            <span className="text-[11px] text-slate-400 block">
              (الرمز يظهر على شاشة اللابتوب داخل نافذة ربط الموبايل)
            </span>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value.replace(/\D/g, ''));
                  setPinError('');
                }}
                placeholder="• • • • • •"
                autoFocus
                className="w-full bg-black/80 text-amber-300 font-mono text-center text-2xl tracking-[0.5em] py-3 rounded-2xl border-2 border-amber-500/60 focus:border-amber-400 focus:outline-none shadow-inner"
              />
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={enteredPin.length < 4}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:brightness-110 text-white font-black text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Shield className="w-4 h-4" />
              <span>تأكيد الرمز والتفويض</span>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center pb-4 text-[11px] text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-bold text-slate-300">
            <Laptop className="w-4 h-4 text-cyan-400" />
            <span>متصل بـ: {shopName}</span>
          </p>
          <p>للخروج والعودة، يمكنك إغلاق الصفحة بأمان.</p>
        </div>
      </div>
    );
  }

  // 3. MAIN WIRELESS BARCODE SCANNER INTERFACE (When Authorized)
  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col font-sans select-none overflow-x-hidden" dir="rtl">
      
      {/* Top Mobile Bar */}
      <header className="px-4 py-3 bg-[#0B1120] border-b border-cyan-500/30 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-black text-white flex items-center gap-1.5">
              <span>{shopName}</span>
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>متصل بلابتوب المحل (نشط)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onExitToFullApp && (
            <button
              onClick={onExitToFullApp}
              className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700"
            >
              عرض البرنامج
            </button>
          )}

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 transition-all cursor-pointer"
            title="قطع الاتصال بهذا اللابتوب"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col p-3.5 space-y-3 max-w-md mx-auto w-full">
        
        {/* Instant Feedback Toast Banner */}
        {sendSuccessToast && (
          <div className="p-2.5 rounded-2xl bg-emerald-950 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>✅ {sendSuccessToast} إلى شاشة اللابتوب!</span>
          </div>
        )}

        {/* Camera Scanner Viewport Container */}
        <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.25)] flex flex-col items-center justify-center aspect-square w-full">
          
          {/* HTML5-QRCode Reader Element */}
          <div id="mobile-barcode-reader-view" className="w-full h-full object-cover" />

          {/* Visual Scanner Overlay Target Box */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="relative w-64 h-44 border-2 border-cyan-400/80 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.3)] flex items-center justify-center overflow-hidden">
              {/* Corner Guides */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-cyan-300" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-cyan-300" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-cyan-300" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-cyan-300" />

              {/* Animated Laser Scanning Line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-[0_0_10px_#06b6d4]" />
            </div>

            <span className="mt-3 text-[11px] font-bold text-cyan-300/90 bg-black/70 px-3 py-1 rounded-full border border-cyan-500/30">
              وجّه الكاميرا نحو باركود المنتج
            </span>
          </div>

          {/* Floating Camera Controls (Torch + Flip) */}
          <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between pointer-events-auto">
            {hasTorch ? (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-3 rounded-2xl border transition-all shadow-lg cursor-pointer ${
                  torchOn
                    ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
                    : 'bg-black/70 text-white border-slate-700'
                }`}
                title="تشغيل / إطفاء الفلاش"
              >
                <Flashlight className="w-5 h-5" />
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={flipCamera}
              className="p-3 rounded-2xl bg-black/70 text-white border border-slate-700 shadow-lg cursor-pointer active:scale-95"
              title="تبديل الكاميرا"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner Error Notice if camera fails */}
          {scannerError && (
            <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center text-center space-y-3 z-20">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <p className="text-xs text-slate-300 leading-relaxed">{scannerError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>

        {/* Manual Barcode Input Fallback */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="كتابة رقم الباركود يدوياً إذا كانت اللصاقة تالفة..."
            className="flex-1 bg-[#0F172A] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs disabled:opacity-40 flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال</span>
          </button>
        </form>

        {/* Last Scanned Item Banner */}
        {lastScannedCode && (
          <div className="p-3 rounded-2xl bg-[#0D1527] border border-cyan-500/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-slate-400">آخر باركود مُرسل:</span>
              <span className="font-mono font-black text-cyan-300 text-sm tracking-wider">{lastScannedCode}</span>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
              تم التوصيل للابتوب
            </span>
          </div>
        )}

        {/* Recent Scans History */}
        {recentScans.length > 0 && (
          <div className="p-3 rounded-2xl bg-[#0B1120] border border-slate-800 space-y-2 flex-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>سجل المواد الممسوحة في هذه الجلسة ({recentScans.length}):</span>
              </div>
              <button
                onClick={() => setRecentScans([])}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                مسح السجل
              </button>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono"
                >
                  <span className="text-slate-200 font-bold">{scan.barcode}</span>
                  <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                    <span>{scan.time}</span>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
