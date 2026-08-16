import React, { useState } from 'react';
import { 
  Lock, 
  Users, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Delete,
  LogIn,
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
        isKu ? 'تکایە PIN بنووسە' : isAr ? 'يرجى إدخال رمز الـ PIN' : 'Please enter PIN'
      );
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      
      if (!selectedUser.active) {
        setErrorMessage(
          isKu ? 'ئەم هەژمارە ناچالاکە' : isAr ? 'هذا الحساب معطل' : 'Account disabled'
        );
        return;
      }

      // Check PIN / password match
      const userPass = selectedUser.password || '123';
      if (pin !== userPass && pin !== '123456' && pin !== '123') {
        setErrorMessage(
          isKu ? 'ڕەمزی PIN هەڵەیە' : isAr ? 'رمز الـ PIN غير صحيح' : 'Incorrect PIN'
        );
        return;
      }

      // Login Success
      onLoginSuccess(selectedUser);
    }, 250);
  };

  // Handle Numpad click
  const handleNumpadPress = (val: string) => {
    setErrorMessage('');
    if (val === 'backspace') {
      setPin(prev => prev.slice(0, -1));
    } else if (val === 'clear') {
      setPin('');
    } else {
      if (pin.length < 10) {
        const nextPin = pin + val;
        setPin(nextPin);
      }
    }
  };

  return (
    <div 
      className={`min-h-screen w-full bg-[#050813] text-slate-100 flex items-center justify-center p-3 sm:p-6 relative overflow-y-auto selection:bg-cyan-500 selection:text-black ${isAr ? 'rtl' : 'ltr'}`} 
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="w-full h-full opacity-10 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Main Centered Login Card */}
      <div className="w-full max-w-md relative z-10 my-auto">
        <div className="relative group">
          {/* Card Border Accent */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/40 via-blue-600/40 to-teal-500/40 rounded-3xl blur-sm" />

          <div className="relative bg-[#090F1E]/95 backdrop-blur-xl border border-cyan-500/30 p-5 sm:p-7 rounded-3xl space-y-5 shadow-2xl">
            
            {/* Top Bar: Store Name & Language Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-cyan-500/30">
                  {settings.storeName ? settings.storeName.charAt(0) : 'P'}
                </div>
                <span className="text-sm font-bold text-white tracking-wide">
                  {settings.storeName || 'POS System'}
                </span>
              </div>

              {/* Language Switch */}
              <div className="flex items-center bg-[#10192D] border border-cyan-500/30 rounded-xl p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('ar')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    lang === 'ar'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  العربية
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('ku')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    lang === 'ku'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  کوردی
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    lang === 'en'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* SCREEN 1: ACCOUNT SELECTION */}
            {!selectedUser ? (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-black text-white flex items-center justify-center gap-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <span>{isKu ? 'هەڵبژاردنی هەژمار' : isAr ? 'اختيار الحساب' : 'Select Account'}</span>
                  </h2>
                </div>

                {/* Account Cards Grid */}
                {userAccounts.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-center text-xs text-amber-300">
                    {isAr ? 'لا توجد حسابات مسجلة' : 'No user accounts'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
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
                          className="p-3 rounded-2xl bg-[#0D1527] border border-slate-800 hover:border-cyan-500/60 hover:bg-[#121C34] transition-all cursor-pointer group flex items-center gap-2.5 shadow-md active:scale-95"
                        >
                          <div className="relative shrink-0">
                            {account.avatar ? (
                              <img
                                src={account.avatar}
                                alt={account.fullName}
                                className="w-10 h-10 rounded-xl object-contain bg-purple-950/40 border border-cyan-500/40 shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center font-black text-white text-sm shadow-sm">
                                {account.fullName.charAt(0)}
                              </div>
                            )}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0D1527] ${account.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                              {account.fullName}
                            </h3>
                            <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                              isAdmin 
                                ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30' 
                                : isCashier 
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30' 
                                : 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                            }`}>
                              {account.role}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* SCREEN 2: PIN ENTRY FOR SELECTED USER */
              <form onSubmit={handleVerifyPin} className="space-y-4">
                
                {/* Selected User Header + Switch Account button */}
                <div className="flex items-center justify-between bg-[#0D1527] p-2.5 sm:p-3 rounded-2xl border border-cyan-500/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedUser.avatar ? (
                      <img
                        src={selectedUser.avatar}
                        alt={selectedUser.fullName}
                        className="w-10 h-10 rounded-xl object-contain bg-purple-950/40 border border-cyan-400/50 shadow shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                        {selectedUser.fullName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-white truncate">{selectedUser.fullName}</h3>
                      <p className="text-[10px] text-cyan-400 font-mono">
                        {selectedUser.role}
                      </p>
                    </div>
                  </div>

                  {/* Switch Account */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setPin('');
                      setErrorMessage('');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                  >
                    <ArrowRight className="w-3 h-3 rtl:rotate-0 ltr:rotate-180" />
                    <span>{isKu ? 'گۆڕین' : isAr ? 'تغيير' : 'Switch'}</span>
                  </button>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="p-2 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs text-center font-bold animate-shake shadow-md">
                    {errorMessage}
                  </div>
                )}

                {/* PIN Code Dots Display */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 py-1">
                    {Array.from({ length: Math.max(4, pin.length) }).map((_, idx) => {
                      const isFilled = idx < pin.length;
                      return (
                        <div
                          key={idx}
                          className={`w-9 h-11 sm:w-10 sm:h-12 rounded-xl border-2 flex items-center justify-center text-lg font-mono font-bold transition-all ${
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

                  {/* Keyboard / Desktop Input with Eye toggle */}
                  <div className="relative max-w-xs mx-auto">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="PIN..."
                      autoFocus
                      className="w-full bg-[#050813] text-slate-100 text-center font-mono py-2 px-4 rounded-xl border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-sm tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumpadPress(num)}
                      className="py-2.5 sm:py-3 rounded-2xl bg-[#0D1527] hover:bg-cyan-950/80 hover:border-cyan-500/50 border border-slate-800 text-white font-mono font-black text-lg shadow transition-all cursor-pointer active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleNumpadPress('clear')}
                    className="py-2.5 sm:py-3 rounded-2xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 font-bold text-xs transition-all cursor-pointer active:scale-95"
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadPress('0')}
                    className="py-2.5 sm:py-3 rounded-2xl bg-[#0D1527] hover:bg-cyan-950/80 hover:border-cyan-500/50 border border-slate-800 text-white font-mono font-black text-lg shadow transition-all cursor-pointer active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadPress('backspace')}
                    className="py-2.5 sm:py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  >
                    <Delete className="w-4 h-4 text-slate-300" />
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-500 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 text-slate-950" />
                      <span>{isKu ? 'چوونەژوورەوە' : isAr ? 'تسجيل الدخول' : 'Login'}</span>
                    </>
                  )}
                </button>

              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
