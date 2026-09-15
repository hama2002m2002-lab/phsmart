import React, { useState } from 'react';
import { Keyboard, X, RotateCcw, Check, Command, Sparkles } from 'lucide-react';
import { StoreSettings, POSKeyboardShortcuts } from '../types';
import { defaultPOSShortcuts } from '../data/mockData';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
}

interface ShortcutItem {
  keyName: keyof POSKeyboardShortcuts;
  titleAr: string;
  titleEn: string;
  titleKu: string;
  descriptionAr: string;
  descriptionKu: string;
  descriptionEn: string;
  icon: string;
}

const SHORTCUT_ITEMS: ShortcutItem[] = [
  {
    keyName: 'newWindow',
    titleAr: 'فتح نافذة بيع جديدة',
    titleEn: 'Open New Sales Window',
    titleKu: 'کردنەوەی پەنجەرەی نوێی فرۆشتن',
    descriptionAr: 'فتح شاشة بيع جديدة متعددة في نفس الوقت',
    descriptionKu: 'کردنەوەی پەنجەرەیەکی نوێی فرۆشتن لە هەمان کاتدا',
    descriptionEn: 'Open a new simultaneous multi-sales window',
    icon: '➕',
  },
  {
    keyName: 'completeSale',
    titleAr: 'إتمام العملية والدفع',
    titleEn: 'Complete Sale / Checkout',
    titleKu: 'تەواوکردنی فرۆشتن و دانانی پارە',
    descriptionAr: 'تأكيد عملية الدفع وطباعة الوصل فوراً',
    descriptionKu: 'پەسەندکردنی پارەدان و چاپکردنی یەکسەری پسوڵە',
    descriptionEn: 'Confirm checkout payment and print receipt immediately',
    icon: '💳',
  },
  {
    keyName: 'focusBarcode',
    titleAr: 'التركيز على ماسح الباركود',
    titleEn: 'Focus Barcode Scanner',
    titleKu: 'تەرکیز لەسەر بارکۆد',
    descriptionAr: 'توجيه المؤشر تلقائياً لإدخال الباركود أو البحث',
    descriptionKu: 'بردنە سەرەوەی نیشاندەر بۆ لێدانی بارکۆد یان گەڕان',
    descriptionEn: 'Auto-focus cursor to barcode input or search field',
    icon: '🔍',
  },
  {
    keyName: 'openInventory',
    titleAr: 'عرض مواد المخزن',
    titleEn: 'Show Store Inventory',
    titleKu: 'پیشاندانی کاڵاکانی کۆگا',
    descriptionAr: 'فتح قائمة المواد والتصفح المباشر للاختيار',
    descriptionKu: 'کردنەوەی لیستی کاڵاکان بۆ هەڵبژاردنی خێرا',
    descriptionEn: 'Open inventory item catalog for quick selection',
    icon: '📦',
  },
  {
    keyName: 'switchNextWindow',
    titleAr: 'الانتقال للنافذة التالية',
    titleEn: 'Switch to Next Window',
    titleKu: 'چوون بۆ پەنجەرەی دواتر',
    descriptionAr: 'التنقل السريع بين نوافذ البيع المفتوحة للأمام',
    descriptionKu: 'گواستنەوەی خێرا بۆ پەنجەرەی دواتری فرۆشتن',
    descriptionEn: 'Quick switch forward between open sales windows',
    icon: '➡️',
  },
  {
    keyName: 'switchPrevWindow',
    titleAr: 'الانتقال للنافذة السابقة',
    titleEn: 'Switch to Previous Window',
    titleKu: 'چوون بۆ پەنجەرەی پێشوو',
    descriptionAr: 'التنقل السريع بين نوافذ البيع للفي الخلف',
    descriptionKu: 'گواستنەوەی خێرا بۆ پەنجەرەی پێشووی فرۆشتن',
    descriptionEn: 'Quick switch backward between open sales windows',
    icon: '⬅️',
  },
  {
    keyName: 'clearCart',
    titleAr: 'تفريغ سلة المبيعات الحالية',
    titleEn: 'Clear Current Cart',
    titleKu: 'بەتاڵکردنەوەی سەبەتەی فرۆشتن',
    descriptionAr: 'مسح جميع المواد المضافة في النافذة النشطة',
    descriptionKu: 'سڕینەوەی هەموو کاڵا زیادکراوەکانی پەنجەرەی چالاک',
    descriptionEn: 'Clear all added items in the active window cart',
    icon: '🗑️',
  },
  {
    keyName: 'closeActiveWindow',
    titleAr: 'إغلاق نافذة البيع الحالية',
    titleEn: 'Close Active Window',
    titleKu: 'داخستنی پەنجەرەی فرۆشتنی چالاک',
    descriptionAr: 'إغلاق النافذة الحالية وإعادة التسلسل تلقائياً',
    descriptionKu: 'داخستنی پەنجەرەی ئێستا و ڕێکخستنەوەی زنجیرەیی',
    descriptionEn: 'Close active sales window and re-index open tabs',
    icon: '❌',
  },
];

const AVAILABLE_KEYS = [
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Alt+N', 'Alt+C', 'Alt+S', 'Alt+B', 'Alt+I', 'Alt+W', 'Alt+X', 'Alt+Enter',
  'Ctrl+Space', 'Ctrl+Enter', 'Ctrl+N', 'Ctrl+P', 'Space', 'Enter'
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
}) => {
  if (!isOpen) return null;

  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

  const currentShortcuts: POSKeyboardShortcuts = {
    ...defaultPOSShortcuts,
    ...(settings.posShortcuts || {}),
  };

  const [localShortcuts, setLocalShortcuts] = useState<POSKeyboardShortcuts>(currentShortcuts);
  const [activeListeningKey, setActiveListeningKey] = useState<keyof POSKeyboardShortcuts | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleShortcutChange = (keyName: keyof POSKeyboardShortcuts, newValue: string) => {
    setLocalShortcuts(prev => ({
      ...prev,
      [keyName]: newValue,
    }));
  };

  const handleKeyDownCapture = (e: React.KeyboardEvent, keyName: keyof POSKeyboardShortcuts) => {
    e.preventDefault();
    e.stopPropagation();

    let combo = '';
    if (e.ctrlKey) combo += 'Ctrl+';
    if (e.altKey) combo += 'Alt+';
    if (e.shiftKey) combo += 'Shift+';

    let key = e.key;
    if (key === ' ') key = 'Space';
    if (key === 'Control' || key === 'Alt' || key === 'Shift') return;

    combo += key.toUpperCase();

    handleShortcutChange(keyName, combo);
    setActiveListeningKey(null);
  };

  const handleResetDefaults = () => {
    setLocalShortcuts(defaultPOSShortcuts);
  };

  const handleSave = () => {
    setSettings(prev => ({
      ...prev,
      posShortcuts: localShortcuts,
    }));
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0A101D] border-2 border-cyan-500/40 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#0E172A] via-[#111C35] to-[#0E172A] border-b border-cyan-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Keyboard className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>{isKu ? 'ڕێکخستنی کورتەبڕەکانی کیبۆرد بۆ کاشێر' : isAr ? 'التحكم باختصارات لوحة المفاتيح' : 'Customize POS Keyboard Shortcuts'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  {isKu ? 'ڕووکاری فرۆشتنی خێرا' : isAr ? 'واجهة البيع السريعة' : 'POS System'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isKu
                  ? 'دیاریکردنی دوگمەکانی کیبۆرد بۆ کۆنترۆڵکردنی خێرای پەنجەرەکانی فرۆشتن، پارەدان و گەڕان'
                  : isAr 
                  ? 'خصص أزرار الكيبورد للتحكم السريع في نوافذ البيع والدفع والبحث بدون الحاجة للمسطرة أو الماوس'
                  : 'Assign keyboard hotkeys for instant checkout, window switching, and barcode scanner focus'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 border border-slate-700/60 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List Content */}
        <div className="p-5 space-y-3 overflow-y-auto custom-scrollbar flex-1">
          {saveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-400/60 text-emerald-300 text-xs text-center font-bold flex items-center justify-center gap-2 animate-bounce">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{isKu ? 'ڕێکخستنەکانی کورتەبڕی کیبۆرد بە سەرکەوتوویی پاشەکەوت کران!' : isAr ? 'تم حفظ إعدادات اختصارات الكيبورد بنجاح!' : 'Keyboard shortcuts saved successfully!'}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SHORTCUT_ITEMS.map((item) => {
              const currentVal = localShortcuts[item.keyName] || 'None';
              const isListening = activeListeningKey === item.keyName;

              return (
                <div
                  key={item.keyName}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isListening
                      ? 'bg-cyan-950/60 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : 'bg-[#10192D]/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <h4 className="text-xs font-black text-slate-100">
                          {isAr ? item.titleAr : isKu ? item.titleKu : item.titleEn}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                          {item.descriptionAr}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Keyboard Key Selector / Interactive Listener */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                    <div className="flex-1">
                      {isListening ? (
                        <div
                          tabIndex={0}
                          onKeyDown={(e) => handleKeyDownCapture(e, item.keyName)}
                          className="w-full px-3 py-1.5 rounded-xl bg-cyan-500/20 border-2 border-dashed border-cyan-400 text-cyan-200 text-xs font-bold text-center animate-pulse outline-none cursor-pointer"
                        >
                          {isAr ? 'اضغط على مفتاح الكيبورد الآن...' : 'Press any key on keyboard...'}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-3 py-1 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-black shadow-inner tracking-wider">
                            {currentVal}
                          </span>

                          <button
                            type="button"
                            onClick={() => setActiveListeningKey(item.keyName)}
                            className="px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-cyan-900/60 border border-blue-500/40 text-cyan-300 text-[11px] font-bold transition-all"
                          >
                            {isAr ? 'تغيير المفتاح' : 'Rebind'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick Preset Selector */}
                    <select
                      value={currentVal}
                      onChange={(e) => handleShortcutChange(item.keyName, e.target.value)}
                      className="bg-slate-900 text-slate-300 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:border-cyan-400 outline-none cursor-pointer font-mono"
                    >
                      {AVAILABLE_KEYS.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-[#080E1A] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'إعادة ضبط للافتراضي' : 'Reset to Defaults'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 text-cyan-200" />
              <span>{isAr ? 'حفظ الاختصارات' : 'Save Shortcuts'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
