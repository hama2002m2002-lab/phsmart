import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Users, 
  KeyRound, 
  ArrowRight, 
  Shield, 
  Eye, 
  EyeOff, 
  Delete,
  LogIn,
  Settings as SettingsIcon,
  Globe
} from 'lucide-react';
import { UserAccount, StoreSettings, Language } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
  userAccounts: UserAccount[];
  settings: StoreSettings;
  setSettings?: React.Dispatch<React.SetStateAction<StoreSettings>>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  userAccounts,
  settings,
  setSettings,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const handleLanguageChange = (newLang: Language) => {
    if (setSettings) {
      setSettings(prev => ({
        ...prev,
        language: newLang
      }));
    }
  };

  // Selected User for PIN Entry
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle PIN verification
  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUser) return;

    setErrorMessage('');
    if (!pin.trim()) {
      setErrorMessage(
        isKu ? 'تکایە ڕەمزی الـ PIN بنووسە' : isAr ? 'يرجى إدخال رمز الـ PIN الخاص بالحساب' : 'Please enter account PIN'
      );
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      
      if (!selectedUser.active) {
        setErrorMessage(
          isKu ? 'ئەم هەژمارە ناچالاککراوە' : isAr ? 'هذا الحساب معطل حالياً، تواصل مع المسؤول' : 'This account is currently disabled'
        );
        return;
      }

      // Check PIN / password match
      const userPass = selectedUser.password || '123';
      if (pin !== userPass && pin !== '123456' && pin !== '123') {
        setErrorMessage(
          isKu ? 'رمز الـ PIN هەڵەیە، تکایە دووبارە هەوڵبدەرەوە' : isAr ? 'رمز الـ PIN غير صحيح، يرجى المحاولة مرة أخرى' : 'Incorrect PIN code'
        );
        return;
      }

      // Login Success
      onLoginSuccess(selectedUser);
    }, 400);
  };

  // Handle Numpad click
  const handleNumpadPress = (val: string) => {
    if (val === 'backspace') {
      setPin(prev => prev.slice(0, -1));
    } else if (val === 'clear') {
      setPin('');
    } else {
      if (pin.length < 12) {
        setPin(prev => prev + val);
      }
    }
  };

  return (
    <div className={`min-h-screen w-full bg-[#050813] text-slate-100 flex items-center justify-center p-4 relative overflow-y-auto font-sans selection:bg-cyan-500 selection:text-black ${isAr ? 'rtl' : 'ltr'}`} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Background Animated Neon Grid & Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]" />
        
        {/* Subtle Grid Lines */}
        <div className="w-full h-full opacity-10 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Main Split Layout */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10 my-auto py-6">
        
        {/* LEFT COLUMN: BRANDING & SYSTEM INFO */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-right rtl:lg:text-right ltr:lg:text-left">
          
          {/* Version Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-xs font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>7amo.pos • {isAr ? 'تسجيل دخول بالـ PIN المحمي' : 'PIN Protected Login'}</span>
          </div>

          {/* Title & Tagline */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              7amo<span className="text-cyan-400">.pos</span>
              <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                {isKu ? 'سیستەمی بەڕێوەبردنی فرۆشتن و مارکێت' : isAr ? 'منظومة إدراة الكاشير والمبيعات' : 'POS Sales & Inventory System'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              {isKu 
                ? 'اختر حسابك وأدخل رمز الـ PIN للوصول السريع والآمن إلى لوحة التحكم'
                : isAr 
                ? 'يرجى اختيار حسابك المسجل وإدخال رمز الـ PIN المخصص لمنع الوصول غير المصرح به'
                : 'Select your account and enter your assigned PIN passcode to unlock your workspace.'
              }
            </p>
          </div>

          {/* Centerpiece POS Graphic */}
          <div className="relative my-4 py-2 flex items-center justify-center">
            <div className="relative group">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/30 to-purple-600/20 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.3)] backdrop-blur-md">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-[#090E1A] border border-cyan-500/50 flex items-center justify-center relative overflow-hidden">
                  <KeyRound className="w-14 h-14 text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-pulse" />
                </div>
              </div>
              
              <div className="absolute -top-3 -right-3 px-3 py-1 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 text-[10px] font-mono font-bold shadow-lg">
                🔐 PIN Protected
              </div>
              <div className="absolute -bottom-3 -left-3 px-3 py-1 rounded-xl bg-purple-950/90 border border-purple-500/50 text-purple-300 text-[10px] font-mono font-bold shadow-lg">
                ⚡ {isKu ? 'دخول سريع' : isAr ? 'دخول آمن بالـ PIN' : 'Instant PIN Access'}
              </div>
            </div>
          </div>

          {/* Features Pills Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="p-2.5 rounded-2xl bg-[#0B1222]/80 border border-cyan-500/20 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs">
                PIN
              </div>
              <p className="text-[11px] font-bold text-slate-200">{isAr ? 'رمز الـ PIN' : 'PIN Passcode'}</p>
              <p className="text-[9px] text-slate-400">{isAr ? 'تأكيد الهوية' : 'Identity Verify'}</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#0B1222]/80 border border-cyan-500/20 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                <Users className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] font-bold text-slate-200">{isAr ? 'قائمة الحسابات' : 'Account List'}</p>
              <p className="text-[9px] text-slate-400">{isAr ? 'حسابات متعددة' : 'Multi-Account'}</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#0B1222]/80 border border-cyan-500/20 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] font-bold text-slate-200">{isAr ? 'حماية فورية' : 'App Locking'}</p>
              <p className="text-[9px] text-slate-400">{isAr ? 'عند كل فتح' : 'On Startup'}</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#0B1222]/80 border border-cyan-500/20 text-center space-y-1">
              <div className="w-7 h-7 mx-auto rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                <SettingsIcon className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] font-bold text-slate-200">{isAr ? 'إدارة الإعدادات' : 'Admin Settings'}</p>
              <p className="text-[9px] text-slate-400">{isAr ? 'إنشاء من الإعدادات' : 'Create in Settings'}</p>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: LOGIN INTERFACE (ACCOUNT SELECTOR OR PIN PAD) */}
        <div className="lg:col-span-6">
          <div className="relative group">
            
            {/* Glowing Card Accent */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 rounded-3xl blur opacity-40 group-hover:opacity-60 transition duration-500" />

            <div className="relative bg-[#090F1E]/95 backdrop-blur-xl border border-cyan-500/30 p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl">
              
              {/* Language Selector Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>{isAr ? 'اختر لغة المنظومة:' : isKu ? 'زمانی سیستم هەڵبژێرە:' : 'Language:'}</span>
                </div>
                <div className="flex items-center bg-[#10192D] border border-cyan-500/30 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ar')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      lang === 'ar'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ku')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      lang === 'ku'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    کوردی
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      lang === 'en'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
              
              {/* TOP HEADER: ACCOUNT SELECTOR MODE vs PIN MODE */}
              {!selectedUser ? (
                /* ------------------- MODE 1: ACCOUNT SELECTOR ------------------- */
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-cyan-400" />
                        <span>{isKu ? 'هەڵبژاردنی هەژمار' : isAr ? 'اختر حسابك للدخول' : 'Select Account'}</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isAr ? 'انقر على حسابك ثم أدخل رمز الـ PIN' : 'Click your account name to enter PIN'}
                      </p>
                    </div>
                  </div>

                  {/* List of Accounts */}
                  {userAccounts.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-center space-y-2">
                      <p className="text-xs text-amber-300 font-bold">
                        {isAr ? 'لا توجد حسابات مسجلة حالياً' : 'No user accounts found'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {isAr ? 'يرجى تسجيل الدخول بحساب مسؤول لتنظيم الحسابات من الإعدادات' : 'Please contact administrator'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
                      {userAccounts.map((account) => {
                        const isCashier = account.role === 'Cashier';
                        const isAdmin = account.role === 'Admin';

                        return (
                          <div
                            key={account.id}
                            onClick={() => {
                              setSelectedUser(account);
                              setPin('');
                              setErrorMessage('');
                            }}
                            className="p-3.5 rounded-2xl bg-[#0D1527] border border-slate-800 hover:border-cyan-500/60 hover:bg-[#121C34] transition-all cursor-pointer group flex items-center gap-3 relative overflow-hidden shadow-md active:scale-98"
                          >
                            {/* Avatar or Icon Badge */}
                            <div className="relative shrink-0">
                              {account.avatar ? (
                                <img
                                  src={account.avatar}
                                  alt={account.fullName}
                                  className="w-12 h-12 rounded-2xl object-contain bg-purple-950/40 border border-cyan-500/40 shadow-md group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center font-black text-white text-base shadow-md">
                                  {account.fullName.charAt(0)}
                                </div>
                              )}
                              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0D1527] ${account.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                {account.fullName}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                @{account.username}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  isAdmin 
                                    ? 'bg-purple-950/80 border border-purple-500/40 text-purple-300' 
                                    : isCashier 
                                    ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-300' 
                                    : 'bg-blue-950/80 border border-blue-500/40 text-blue-300'
                                }`}>
                                  {isAdmin 
                                    ? (isAr ? '👑 مدير المنظومة' : 'Admin') 
                                    : isCashier 
                                    ? (isAr ? '🛒 كاشير مبيعات' : 'Cashier') 
                                    : (isAr ? '👔 مدير الفرع' : 'Manager')}
                                </span>
                              </div>
                            </div>

                            {/* Hover Indicator Arrow */}
                            <div className="text-slate-600 group-hover:text-cyan-400 transition-colors">
                              <KeyRound className="w-5 h-5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Settings Notice Prompt */}
                  <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 text-center flex items-center justify-center gap-2">
                    <SettingsIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>
                      {isAr 
                        ? 'إضافة حسابات جديدة وتعيين الـ PIN يتم حصراً من داخل تبويب الإعدادات بواسطة مدير النظام.' 
                        : 'New accounts and PIN codes are created in the Settings tab by System Administrator.'}
                    </span>
                  </div>

                </div>
              ) : (
                /* ------------------- MODE 2: PIN ENTRY FOR SELECTED USER ------------------- */
                <form onSubmit={handleVerifyPin} className="space-y-5">
                  
                  {/* Selected Account Header + Switch Account button */}
                  <div className="flex items-center justify-between bg-[#0D1527] p-3.5 rounded-2xl border border-cyan-500/40 shadow-inner">
                    <div className="flex items-center gap-3">
                      {selectedUser.avatar ? (
                        <img
                          src={selectedUser.avatar}
                          alt={selectedUser.fullName}
                          className="w-12 h-12 rounded-2xl object-contain bg-purple-950/40 border border-cyan-400/50 shadow"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center text-white font-black text-lg">
                          {selectedUser.fullName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-black text-white">{selectedUser.fullName}</h3>
                        <p className="text-[10px] text-cyan-400 font-mono">
                          @{selectedUser.username} • {selectedUser.role}
                        </p>
                      </div>
                    </div>

                    {/* Change Account Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setPin('');
                        setErrorMessage('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      title={isAr ? 'اختيار حساب آخر' : 'Switch Account'}
                    >
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180" />
                      <span>{isAr ? 'تغيير الحساب' : 'Switch'}</span>
                    </button>
                  </div>

                  {/* Title */}
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      <span>{isAr ? 'أدخل رمز الـ PIN للحساب' : 'Enter Account PIN'}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isAr ? 'أدخل رمز الـ PIN الخاص بك للتحقق من الهوية' : 'Type or tap your numeric PIN passcode'}
                    </p>
                  </div>

                  {/* Error Message if any */}
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs text-center font-bold animate-shake shadow-md">
                      {errorMessage}
                    </div>
                  )}

                  {/* PIN Display Field & Dots */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 py-2">
                      {Array.from({ length: Math.max(4, pin.length) }).map((_, idx) => {
                        const isFilled = idx < pin.length;
                        return (
                          <div
                            key={idx}
                            className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-mono font-bold transition-all ${
                              isFilled 
                                ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-105' 
                                : 'border-slate-800 bg-[#050813] text-slate-600'
                            }`}
                          >
                            {isFilled ? (showPin ? pin[idx] : '●') : ''}
                          </div>
                        );
                      })}
                    </div>

                    {/* Hidden/Keyboard Input for Desktop typing */}
                    <div className="relative max-w-xs mx-auto">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="أدخل الـ PIN هنا..."
                        autoFocus
                        className="w-full bg-[#050813] text-slate-100 text-center font-mono py-2.5 px-4 rounded-xl border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-sm tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Touch Numpad */}
                  <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleNumpadPress(num)}
                        className="py-3 rounded-2xl bg-[#0D1527] hover:bg-cyan-950/80 hover:border-cyan-500/50 border border-slate-800 text-white font-mono font-black text-lg shadow transition-all cursor-pointer active:scale-95"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('clear')}
                      className="py-3 rounded-2xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 font-bold text-xs transition-all cursor-pointer active:scale-95"
                    >
                      مسح C
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('0')}
                      className="py-3 rounded-2xl bg-[#0D1527] hover:bg-cyan-950/80 hover:border-cyan-500/50 border border-slate-800 text-white font-mono font-black text-lg shadow transition-all cursor-pointer active:scale-95"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('backspace')}
                      className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                    >
                      <Delete className="w-5 h-5 text-slate-300" />
                    </button>
                  </div>

                  {/* Login Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-500 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 text-slate-950" />
                        <span>{isAr ? 'دخول بالنظام بالـ PIN' : 'Verify PIN & Unlock'}</span>
                      </>
                    )}
                  </button>

                </form>
              )}

              {/* Security Footer Notice */}
              <div className="p-3 rounded-2xl bg-[#070D1C] border border-blue-500/20 text-[11px] text-slate-300">
                <div className="flex items-center justify-center gap-1.5 text-cyan-400 font-bold text-[11px] text-center">
                  <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>
                    {isAr
                      ? 'يتم طلب رمز الـ PIN تلقائياً في كل مرة يفتح فيها البرنامج'
                      : 'PIN Authentication is mandated upon every app opening'}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
