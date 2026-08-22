import React, { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  CheckCircle2, 
  Barcode as BarcodeIcon, 
  Package,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  Box,
  Tag,
  Printer,
  RotateCcw,
  User,
  XCircle,
  PauseCircle,
  PlayCircle,
  Stethoscope,
  FileText,
  Pill,
  AlertTriangle,
  HeartPulse,
  Activity,
  Check,
  HelpCircle,
  Info,
  Clock,
  ShieldAlert,
  Lightbulb,
  Send,
  Copy,
  DollarSign,
  Undo2,
  Home,
  LogOut,
  Tv,
  ExternalLink,
  Cast,
  PanelRightClose,
  PanelRightOpen,
  Monitor,
  Zap,
  Usb,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Product, CartItem, Category, SaleTransaction, Customer, StoreSettings, SaleUnitType, PrescriptionInfo, UserAccount, CustomerDisplayPayload, CustomerDisplayItem } from '../types';
import { getTranslation, getProductName, getCategoryName } from '../lib/translations';
import { defaultPOSShortcuts } from '../data/mockData';
import { printSaleReceiptDirect } from '../lib/thermalPrinter';
import { formatNumber } from '../lib/formatUtils';
import { formatDisplayTime, formatDisplayDateTime, formatDisplayDate } from '../lib/dateUtils';
import { DamagedItemsModal } from './DamagedItemsModal';
import { KioskPrintModal } from './KioskPrintModal';
import { broadcastCustomerDisplay, openCustomerDisplayWindow } from '../lib/customerDisplayBroadcast';
import { CustomerDisplayScreen } from './CustomerDisplayScreen';

interface POSWindowTab {
  id: string;
  cart: CartItem[];
  discountAmount: number;
  customTaxAmount?: number | null;
  paymentMethod: 'cash' | 'card' | 'nfc' | 'debt';
  cashTendered: number;
  lastAddedId: string | null;
  prescriptionInfo?: PrescriptionInfo;
  isReturnMode?: boolean;
}

interface POSTabProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  customers: Customer[];
  settings: StoreSettings;
  onSaleCompleted: (sale: SaleTransaction) => void;
  showInventory?: boolean;
  setShowInventory?: (show: boolean) => void;
  showYellowLineModal?: boolean;
  setShowYellowLineModal?: (show: boolean) => void;
  isAnyModalOpen?: boolean;
  salesHistory?: SaleTransaction[];
  onViewReceipt?: (sale: SaleTransaction) => void;
  onOpenMobileSync?: () => void;
  onExitPOS?: () => void;
  onBackToDashboard?: () => void;
  onOpenPrintBarcode?: (product?: Product) => void;
  onOpenSalesReturn?: () => void;
  onOpenDelegateReturns?: () => void;
  onOpenCustomerDisplay?: () => void;
  currentUser?: UserAccount | null;
}

const CATEGORIES: { labelEn: string; labelAr: string; icon: string }[] = [
  { labelEn: 'المسكنات وخافضات الحرارة', labelAr: 'المسكنات والخافضات', icon: '💊' },
  { labelEn: 'المضادات الحيوية', labelAr: 'المضادات الحيوية', icon: '🧪' },
  { labelEn: 'الأدوية والعقاقير', labelAr: 'أدوية ومزمنة', icon: '🩺' },
  { labelEn: 'الفيتامينات والمكملات', labelAr: 'الفيتامينات والمكملات', icon: '🌿' },
  { labelEn: 'المستلزمات الطبية', labelAr: 'المستلزمات الطبية', icon: '🩹' },
  { labelEn: 'العناية والتجميل', labelAr: 'الأجهزة والتجميل', icon: '🧴' },
];

const Cart3DGraphic = ({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const isLarge = size === 'lg';
  return (
    <div className={`relative flex items-center justify-center select-none ${isLarge ? 'w-44 h-44 my-1' : 'w-9 h-9'}`}>
      {/* 3D Floor Shadow & Glow */}
      <div className={`absolute bottom-1 rounded-full bg-emerald-500/35 blur-xl animate-pulse ${isLarge ? 'w-36 h-10' : 'w-7 h-2.5'}`} />
      
      {/* 3D Isometric Container */}
      <div className={`relative transition-all duration-500 hover:scale-105 ${isLarge ? '[transform:rotateX(12deg)_rotateY(-12deg)] hover:[transform:rotateX(6deg)_rotateY(-6deg)]' : ''}`}>
        <svg
          viewBox="0 0 200 200"
          className={isLarge ? 'w-40 h-40 drop-shadow-[0_15px_25px_rgba(16,185,129,0.55)]' : 'w-9 h-9 drop-shadow-[0_4px_8px_rgba(16,185,129,0.4)]'}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cartBody3D" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="cartWire3D" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="boxGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="boxGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6b21a8" />
            </linearGradient>
            <filter id="neonGlow3D" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 3D Metallic Shopping Cart Frame */}
          <path d="M50 70 L150 70 L135 125 L65 125 Z" fill="url(#cartBody3D)" fillOpacity="0.25" stroke="url(#cartWire3D)" strokeWidth="4" strokeLinejoin="round" />
          
          {/* Internal 3D Grid Wires */}
          <path d="M60 85 L145 85 M65 100 L140 100 M80 70 L87 125 M100 70 L100 125 M120 70 L113 125" stroke="url(#cartWire3D)" strokeWidth="2.5" strokeOpacity="0.75" />

          {/* 3D Floating Glowing Packages inside Cart */}
          {isLarge && (
            <>
              {/* Box 1 (Gold/Amber 3D Cube) */}
              <g className="animate-bounce" style={{ animationDuration: '3s' }}>
                <path d="M85 55 L110 42 L135 55 L110 68 Z" fill="#fef08a" />
                <path d="M85 55 L110 68 L110 90 L85 77 Z" fill="url(#boxGradient1)" />
                <path d="M110 68 L135 55 L135 77 L110 90 Z" fill="#b45309" />
              </g>
              {/* Box 2 (Purple 3D Cube) */}
              <g className="animate-pulse" style={{ animationDuration: '2.5s' }}>
                <path d="M60 65 L80 55 L100 65 L80 75 Z" fill="#e9d5ff" />
                <path d="M60 65 L80 75 L80 92 L60 82 Z" fill="url(#boxGradient2)" />
                <path d="M80 75 L100 65 L100 82 L80 92 Z" fill="#581c87" />
              </g>
            </>
          )}

          {/* Front Rim */}
          <path d="M45 65 L155 65 L138 130 L62 130 Z" fill="none" stroke="url(#cartWire3D)" strokeWidth="5" strokeLinejoin="round" filter="url(#neonGlow3D)" />

          {/* Handlebar & Rear Tubes */}
          <path d="M30 45 L50 65 M30 45 L45 45" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

          {/* Bottom Chassis & Legs */}
          <path d="M65 130 L75 155 M135 130 L125 155 M75 155 L125 155" stroke="url(#cartWire3D)" strokeWidth="5" strokeLinecap="round" />

          {/* 3D Wheels with Chrome Rim & Glow */}
          <circle cx="75" cy="162" r="10" fill="#090d16" stroke="#34d399" strokeWidth="4" />
          <circle cx="75" cy="162" r="4" fill="#67e8f9" />
          
          <circle cx="125" cy="162" r="10" fill="#090d16" stroke="#34d399" strokeWidth="4" />
          <circle cx="125" cy="162" r="4" fill="#67e8f9" />
        </svg>
      </div>
    </div>
  );
};

export const POSTab: React.FC<POSTabProps> = ({
  products,
  setProducts,
  customers,
  settings,
  onSaleCompleted,
  showInventory: externalShowInventory,
  setShowInventory: externalSetShowInventory,
  showYellowLineModal: externalShowYellowLineModal,
  setShowYellowLineModal: externalSetShowYellowLineModal,
  isAnyModalOpen = false,
  salesHistory = [],
  onViewReceipt,
  onOpenMobileSync,
  onExitPOS,
  onBackToDashboard,
  onOpenPrintBarcode,
  onOpenSalesReturn,
  onOpenDelegateReturns,
  onOpenCustomerDisplay: externalOnOpenCustomerDisplay,
  currentUser,
}) => {
  const isLight = settings.themeMode === 'light';
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  // Customer display side panel state
  const [showCustomerDisplaySidePanel, setShowCustomerDisplaySidePanel] = useState<boolean>(false);
  const [customerDisplayCopiedToast, setCustomerDisplayCopiedToast] = useState<boolean>(false);

  // Check if current logged-in user or cashier has permission to view purchase price
  const canViewPurchasePrice = Boolean(
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'Manager' ||
    currentUser?.permissions?.canViewPurchasePriceInPOS === true
  );

  // Multi-window sales tabs state
  const [windows, setWindows] = useState<POSWindowTab[]>([
    {
      id: 'win-1',
      cart: [],
      discountAmount: 0,
      customTaxAmount: null,
      paymentMethod: 'cash',
      cashTendered: 0,
      lastAddedId: null,
      isReturnMode: false,
    }
  ]);
  const [activeWindowId, setActiveWindowId] = useState<string>('win-1');
  const [mobilePosTab, setMobilePosTab] = useState<'cart' | 'checkout' | 'inventory'>('cart');
  const [localShowYellowLineModal, setLocalShowYellowLineModal] = useState<boolean>(false);
  const showYellowLineModal = externalShowYellowLineModal !== undefined ? externalShowYellowLineModal : localShowYellowLineModal;
  const setShowYellowLineModal = externalSetShowYellowLineModal || setLocalShowYellowLineModal;

  // Active window object & derived states
  const activeWindowIndex = Math.max(0, windows.findIndex(w => w.id === activeWindowId));
  const activeWindow = windows[activeWindowIndex] || windows[0] || {
    id: 'win-1',
    cart: [],
    discountAmount: 0,
    customTaxAmount: null,
    paymentMethod: 'cash' as const,
    cashTendered: 0,
    lastAddedId: null,
    isReturnMode: false,
  };

  const cart = activeWindow.cart;
  const discountAmount = activeWindow.discountAmount;
  const customTaxAmount = activeWindow.customTaxAmount ?? null;
  const paymentMethod = activeWindow.paymentMethod;
  const cashTendered = activeWindow.cashTendered;
  const lastAddedId = activeWindow.lastAddedId;
  const isReturnMode = Boolean(activeWindow.isReturnMode);

  // Window cart & control state setters
  const setCart = (action: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setWindows(prevWindows => {
      const targetId = activeWindowId;
      return prevWindows.map(w => {
        if (w.id === targetId) {
          const nextCart = typeof action === 'function' ? action(w.cart) : action;
          return { ...w, cart: nextCart };
        }
        return w;
      });
    });
  };

  const setIsReturnMode = (action: boolean | ((prev: boolean) => boolean)) => {
    setWindows(prevWindows => {
      const targetId = activeWindowId;
      return prevWindows.map(w => {
        if (w.id === targetId) {
          const currentVal = Boolean(w.isReturnMode);
          const nextVal = typeof action === 'function' ? action(currentVal) : action;
          return { ...w, isReturnMode: nextVal };
        }
        return w;
      });
    });
  };

  const setDiscountAmount = (action: number | ((prev: number) => number)) => {
    setWindows(prevWindows => {
      const targetId = activeWindowId;
      return prevWindows.map(w => {
        if (w.id === targetId) {
          const nextVal = typeof action === 'function' ? action(w.discountAmount) : action;
          return { ...w, discountAmount: nextVal };
        }
        return w;
      });
    });
  };

  const setCustomTaxAmount = (action: number | null | ((prev: number | null) => number | null)) => {
    setWindows(prevWindows => {
      const targetId = activeWindowId;
      return prevWindows.map(w => {
        if (w.id === targetId) {
          const nextVal = typeof action === 'function' ? action(w.customTaxAmount ?? null) : action;
          return { ...w, customTaxAmount: nextVal };
        }
        return w;
      });
    });
  };

  const setPaymentMethod = (method: 'cash' | 'card' | 'nfc' | 'debt') => {
    setWindows(prevWindows => {
      const targetId = activeWindowId;
      return prevWindows.map(w => {
        if (w.id === targetId) {
          return { ...w, paymentMethod: method };
        }
        return w;
      });
    });
  };

  const setCashTendered = (action: number | ((prev: number) => number)) => {
    setWindows(prevWindows => {
      const targetId = activeWindowId;
      return prevWindows.map(w => {
        if (w.id === targetId) {
          const nextVal = typeof action === 'function' ? action(w.cashTendered) : action;
          return { ...w, cashTendered: nextVal };
        }
        return w;
      });
    });
  };

  const setLastAddedId = (id: string | null) => {
    setWindows(prevWindows => {
      const targetId = activeWindowId;
      return prevWindows.map(w => {
        if (w.id === targetId) {
          return { ...w, lastAddedId: id };
        }
        return w;
      });
    });
  };

  // Add new sales window tab - ALWAYS ready for standard sale (isReturnMode: false)
  const handleAddWindow = () => {
    const newId = `win-${Date.now()}`;
    const newWin: POSWindowTab = {
      id: newId,
      cart: [],
      discountAmount: 0,
      customTaxAmount: null,
      paymentMethod: 'cash',
      cashTendered: 0,
      lastAddedId: null,
      isReturnMode: false,
    };
    setWindows(prev => [...prev, newWin]);
    setActiveWindowId(newId);
    setScanAlert({
      msg: isKu ? '✨ پەنجەرەیەکی نوێی فرۆشتن کرایەوە (ئامادەیە بۆ فرۆشتن)' : isAr ? '✨ تم فتح نافذة بيع جديدة (جاهزة للبيع العادي)' : '✨ New sales window ready for selling',
      type: 'success'
    });
  };

  // Remove sales window tab (Auto re-indexes sequence for remaining windows)
  const handleRemoveWindow = (e?: React.MouseEvent, targetId?: string) => {
    if (e) e.stopPropagation();
    const idToRemove = targetId || activeWindowId;

    if (windows.length <= 1) {
      clearCart();
      return;
    }

    const targetIndex = windows.findIndex(w => w.id === idToRemove);
    const nextWindows = windows.filter(w => w.id !== idToRemove);
    setWindows(nextWindows);

    if (activeWindowId === idToRemove) {
      const newActiveIndex = Math.min(targetIndex, nextWindows.length - 1);
      setActiveWindowId(nextWindows[newActiveIndex].id);
    }
  };

  const [selectedCat, setSelectedCat] = useState<Category | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [alternativeSearch, setAlternativeSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const deferredAltSearch = useDeferredValue(alternativeSearch);
  const [inventoryPage, setInventoryPage] = useState(1);
  const INVENTORY_PAGE_SIZE = 40;

  // Reset inventory page when filters change
  useEffect(() => {
    setInventoryPage(1);
  }, [deferredSearch, selectedCat]);

  // Pre-indexed products for ultra-fast POS search and O(1) Barcode lookup
  const { barcodeMap, posIndexedProducts } = useMemo(() => {
    const bMap = new Map<string, Product>();
    const len = products.length;
    const indexed = new Array(len);

    for (let i = 0; i < len; i++) {
      const p = products[i];
      const barcodeClean = (p.barcode || '').trim().toLowerCase();
      const idClean = (p.id || '').trim().toLowerCase();
      const nameClean = (p.name || '').trim().toLowerCase();
      const nameArClean = (p.nameAr || '').trim().toLowerCase();
      const nameKuClean = (p.nameKu || '').trim().toLowerCase();
      const sciClean = (p.scientificName || '').trim().toLowerCase();

      if (barcodeClean) bMap.set(barcodeClean, p);
      if (idClean) bMap.set(idClean, p);

      indexed[i] = {
        product: p,
        barcode: barcodeClean,
        category: p.category,
        categoryAr: p.categoryAr,
        fullSearchStr: `${barcodeClean} ${nameClean} ${nameArClean} ${nameKuClean} ${sciClean}`,
        altSearchStr: `${sciClean} ${nameClean} ${nameArClean} ${nameKuClean}`
      };
    }

    return { barcodeMap: bMap, posIndexedProducts: indexed };
  }, [products]);

  // Barcode scanner input state & auto focus
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanAlert, setScanAlert] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isBarcodePaused, setIsBarcodePaused] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const shiftQtyBufferRef = useRef<{ val: number; time: number } | null>(null);

  // Toggle modal/panel for viewing inventory products in stock
  const [internalShowInventory, setInternalShowInventory] = useState(false);
  const showInventory = externalShowInventory !== undefined ? externalShowInventory : internalShowInventory;
  const setShowInventory = externalSetShowInventory || setInternalShowInventory;

  // Pharmacy specifics state
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionInfo, setPrescriptionInfo] = useState<PrescriptionInfo>({
    doctorName: '',
    patientName: '',
    patientAge: '',
    patientPhone: '',
    prescriptionNotes: ''
  });

  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [selectedProdForAlternative, setSelectedProdForAlternative] = useState<Product | null>(null);
  const [isDamagedModalOpen, setIsDamagedModalOpen] = useState(false);
  const [showKioskModal, setShowKioskModal] = useState(false);

  const isBarcodeDisabled = Boolean(
    isAnyModalOpen ||
    showInventory ||
    isBarcodePaused ||
    showPrescriptionModal ||
    showAlternativesModal ||
    isDamagedModalOpen ||
    showKioskModal
  );

  const focusBarcodeIfEnabled = (delay = 50) => {
    setTimeout(() => {
      if (!isBarcodeDisabled && !isBarcodePaused) {
        barcodeRef.current?.focus();
      }
    }, delay);
  };

  // KEYBOARD SHORTCUTS LISTENER FOR POS INTERFACE
  const posShortcuts = settings.posShortcuts || defaultPOSShortcuts;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Helper function to match shortcut key combos (e.g. 'F1', 'F2', 'Alt+N', 'Ctrl+Space', etc.)
      const matchShortcut = (shortcutStr: string | undefined) => {
        if (!shortcutStr) return false;
        const parts = shortcutStr.split('+').map(p => p.trim().toLowerCase());
        const needsCtrl = parts.includes('ctrl') || parts.includes('control');
        const needsAlt = parts.includes('alt');
        const needsShift = parts.includes('shift');
        const mainKey = parts.filter(p => !['ctrl', 'control', 'alt', 'shift'].includes(p))[0];

        if (needsCtrl !== (e.ctrlKey || e.metaKey)) return false;
        if (needsAlt !== e.altKey) return false;
        if (needsShift !== e.shiftKey) return false;

        if (!mainKey) return false;
        const keyLower = e.key.toLowerCase();
        const codeLower = e.code.toLowerCase();

        if (mainKey === 'space') return keyLower === ' ' || codeLower === 'space';
        if (mainKey === 'enter') return keyLower === 'enter';

        return keyLower === mainKey || codeLower === mainKey;
      };

      // Check for Shift + Number key shortcut to set quantity of the active/latest item in the cart
      if (e.shiftKey && cart.length > 0 && !isBarcodeDisabled) {
        let digit: number | null = null;
        if (e.code >= 'Digit0' && e.code <= 'Digit9') {
          digit = parseInt(e.code.replace('Digit', ''), 10);
        } else if (e.code >= 'Numpad0' && e.code <= 'Numpad9') {
          digit = parseInt(e.code.replace('Numpad', ''), 10);
        } else if (/^[0-9]$/.test(e.key)) {
          digit = parseInt(e.key, 10);
        } else {
          const shiftMap: Record<string, number> = {
            '!': 1, '@': 2, '#': 3, '$': 4, '%': 5, '^': 6, '&': 7, '*': 8, '(': 9, ')': 0,
            '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9, '٠': 0
          };
          if (shiftMap[e.key] !== undefined) {
            digit = shiftMap[e.key];
          }
        }

        if (digit !== null) {
          e.preventDefault();
          const targetItem = cart.find(item => item.product.id === lastAddedId) || cart[0];
          let targetQty = digit === 0 ? 10 : digit;
          
          const now = Date.now();
          if (shiftQtyBufferRef.current && (now - shiftQtyBufferRef.current.time < 1200)) {
            const combined = parseInt(`${shiftQtyBufferRef.current.val}${digit}`, 10);
            if (combined > 0) {
              targetQty = combined;
            }
            shiftQtyBufferRef.current = { val: targetQty, time: now };
          } else {
            shiftQtyBufferRef.current = { val: targetQty, time: now };
          }

          // Always allow setting any quantity directly in cart, even if massive or stock is zero/negative
          setDirectQuantity(targetItem.product.id, targetItem.saleType, targetQty);
          setBarcodeInput('');

          const itemName = isAr ? (targetItem.product.nameAr || targetItem.product.name) : isKu ? (targetItem.product.nameAr || targetItem.product.name) : targetItem.product.name;

          setScanAlert({
            msg: isKu 
              ? `⚡ بڕی (${itemName}) دیاریکرا بە [ ${targetQty} ] دانە (Shift+${digit})` 
              : isAr 
              ? `⚡ تم تعديل كمية (${itemName}) إلى [ ${targetQty} ] قطعة (Shift+${digit})` 
              : `⚡ Updated (${itemName}) quantity to [ ${targetQty} ] items (Shift+${digit})`,
            type: 'success'
          });
          return;
        }
      }

      if (matchShortcut(posShortcuts.newWindow)) {
        e.preventDefault();
        handleAddWindow();
      } else if (matchShortcut(posShortcuts.completeSale)) {
        e.preventDefault();
        if (cart.length > 0) {
          handleCompleteCheckout();
        }
      } else if (matchShortcut(posShortcuts.focusBarcode)) {
        e.preventDefault();
        setIsBarcodePaused(false);
        focusBarcodeIfEnabled(50);
      } else if (matchShortcut(posShortcuts.openInventory)) {
        e.preventDefault();
        setShowInventory(true);
      } else if (matchShortcut(posShortcuts.clearCart)) {
        e.preventDefault();
        if (cart.length > 0) {
          clearCart();
        }
      } else if (matchShortcut(posShortcuts.switchNextWindow)) {
        e.preventDefault();
        if (windows.length > 1) {
          const nextIdx = (activeWindowIndex + 1) % windows.length;
          setActiveWindowId(windows[nextIdx].id);
        }
      } else if (matchShortcut(posShortcuts.switchPrevWindow)) {
        e.preventDefault();
        if (windows.length > 1) {
          const prevIdx = (activeWindowIndex - 1 + windows.length) % windows.length;
          setActiveWindowId(windows[prevIdx].id);
        }
      } else if (matchShortcut(posShortcuts.closeActiveWindow)) {
        e.preventDefault();
        if (windows.length > 1) {
          handleRemoveWindow(undefined, activeWindow.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, windows, activeWindowIndex, activeWindow.id, posShortcuts, isBarcodeDisabled, lastAddedId]);

  useEffect(() => {
    // If any modal is open or barcode is paused (e.g. typing discount or interacting with UI), blur and stop focus
    if (isBarcodeDisabled) {
      if (document.activeElement === barcodeRef.current) {
        barcodeRef.current?.blur();
      }
      return;
    }

    if (!isBarcodePaused) {
      const active = document.activeElement;
      if (!active || active === document.body || active === barcodeRef.current) {
        barcodeRef.current?.focus();
      }
    }

    const handleGlobalClick = (e: MouseEvent) => {
      if (isBarcodeDisabled || isBarcodePaused) return;

      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
         target.tagName === 'BUTTON' ||
         target.tagName === 'TEXTAREA' ||
         target.tagName === 'SELECT' ||
         target.closest('button') ||
         target.closest('input') ||
         target.closest('select') ||
         target.closest('textarea') ||
         target.closest('[role="dialog"]') ||
         target.closest('.modal'))
      ) {
        return;
      }
      barcodeRef.current?.focus();
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [isBarcodeDisabled, activeWindowId, cart, isBarcodePaused]);

  // Helper to calculate exact price depending on unit type (مفرد, جملة, كرتون)
  const getItemUnitPrice = (item: CartItem): number => {
    if (item.saleType === 'wholesale') {
      return item.product.wholesalePrice || (item.product.price * 0.85);
    }
    if (item.saleType === 'carton') {
      return item.product.cartonSellingPrice || (item.product.price * 10);
    }
    return item.product.singleRetailPrice || item.product.price;
  };

  const playErrorBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, audioCtx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.22);
    } catch {
      // Ignore audio policy blocking
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBarcodeDisabled) return;

    const rawInput = barcodeInput.trim();
    if (!rawInput) return;

    // First check if scanned input matches a sale invoice number (e.g., INV-...)
    const foundInvoice = salesHistory.find(s => s.invoiceNumber.toLowerCase() === rawInput.toLowerCase());
    if (foundInvoice && onViewReceipt) {
      onViewReceipt(foundInvoice);
      setScanAlert({
        msg: isKu ? `پسوولە دۆزرایەوە (${foundInvoice.invoiceNumber})` : isAr ? `تم العثور على الوصل (${foundInvoice.invoiceNumber})` : `Found receipt (${foundInvoice.invoiceNumber})`,
        type: 'success'
      });
      setBarcodeInput('');
      return;
    }

    // Check for Multiplier Pattern in barcode input: e.g. "5*62810023", "62810023*5", "*5", "100*..."
    let parsedQty = 1;
    let cleanCode = rawInput;

    if (rawInput.includes('*')) {
      const parts = rawInput.split('*').map(p => p.trim());
      if (parts.length === 2) {
        if (parts[0] === '' && /^\d+$/.test(parts[1])) {
          // "*5" pattern -> Update quantity of the last added item in cart directly
          const targetQty = parseInt(parts[1], 10);
          if (targetQty > 0 && cart.length > 0) {
            const targetItem = cart.find(item => item.product.id === lastAddedId) || cart[0];
            setDirectQuantity(targetItem.product.id, targetItem.saleType, targetQty);
            setBarcodeInput('');
            const itemName = isAr ? (targetItem.product.nameAr || targetItem.product.name) : isKu ? (targetItem.product.nameAr || targetItem.product.name) : targetItem.product.name;

            setScanAlert({
              msg: isKu 
                ? `⚡ بڕی (${itemName}) دیاریکرا بە [ ${targetQty} ] دانە` 
                : isAr 
                ? `⚡ تم تعديل كمية (${itemName}) إلى [ ${targetQty} ] قطعة` 
                : `⚡ Updated (${itemName}) quantity to [ ${targetQty} ] items`,
              type: 'success'
            });
            return;
          }
        } else if (/^\d+$/.test(parts[0]) && parts[1] !== '') {
          // "5*barcode" pattern
          parsedQty = parseInt(parts[0], 10);
          cleanCode = parts[1];
        } else if (/^\d+$/.test(parts[1]) && parts[0] !== '') {
          // "barcode*5" pattern
          parsedQty = parseInt(parts[1], 10);
          cleanCode = parts[0];
        }
      }
    }

    const cleanKey = cleanCode.trim().toLowerCase();
    const found = barcodeMap.get(cleanKey) || products.find(p => p.barcode === cleanCode || p.id === cleanCode);
    if (found) {
      addToCart(found, 'retail', parsedQty > 0 ? parsedQty : 1);
    } else {
      playErrorBeep();
      setScanAlert({
        msg: isKu ? 'ئەم بارکۆدە لە کۆگادا نییە!' : isAr ? 'الباركود غير موجود في المخزن!' : 'This barcode does not exist in inventory!',
        type: 'error'
      });
    }

    // Always clear/erase the barcode field immediately so it is ready for the next barcode
    setBarcodeInput('');

    setTimeout(() => {
      if (!isBarcodeDisabled) {
        barcodeRef.current?.focus();
      }
    }, 20);

    setTimeout(() => {
      setScanAlert(prev => prev?.type === 'error' ? null : prev);
    }, 4000);
  };

  const addToCart = (product: Product, initialSaleType: SaleUnitType = 'retail', quantityToAdd: number = 1) => {
    setIsBarcodePaused(false);

    setLastAddedId(product.id);
    const addedAtTime = formatDisplayTime(new Date(), settings.language);

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id && item.saleType === initialSaleType);
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const updatedItem = { ...existing, quantity: existing.quantity + quantityToAdd };
        // Bring updated item to the VERY TOP of the cart
        const filtered = prev.filter((_, idx) => idx !== existingIndex);
        return [updatedItem, ...filtered];
      }
      // New item added at index 0 (Top of cart)
      return [{ product, quantity: quantityToAdd, saleType: initialSaleType, addedAtTime }, ...prev];
    });

    const itemName = isAr ? (product.nameAr || product.name) : isKu ? (product.nameAr || product.name) : product.name;

    setScanAlert({
      msg: isKu 
        ? `✅ [ ${quantityToAdd} ] دانە لە (${itemName}) زیادکرا بۆ سەبەتە` 
        : isAr 
        ? `✅ تم إضافة [ ${quantityToAdd} ] قطعة من (${itemName}) للسلة` 
        : `✅ Added [ ${quantityToAdd} ] of (${itemName}) to cart`,
      type: 'success'
    });
  };

  const updateSaleType = (productId: string, oldSaleType: SaleUnitType, newSaleType: SaleUnitType) => {
    if (oldSaleType === newSaleType) return;

    setCart(prev => {
      const oldIndex = prev.findIndex(item => item.product.id === productId && item.saleType === oldSaleType);
      if (oldIndex === -1) return prev;

      const oldItem = prev[oldIndex];
      const targetExistingIndex = prev.findIndex(item => item.product.id === productId && item.saleType === newSaleType);

      if (targetExistingIndex !== -1) {
        // Merge oldItem quantity into existing item with newSaleType
        const targetExisting = prev[targetExistingIndex];
        const mergedQty = targetExisting.quantity + oldItem.quantity;
        const updatedItem = { ...targetExisting, quantity: mergedQty };

        // Filter out both old & targetExisting, then prepend updatedItem
        const filtered = prev.filter((_, idx) => idx !== oldIndex && idx !== targetExistingIndex);
        return [updatedItem, ...filtered];
      } else {
        // Just update saleType of the item cleanly
        const updatedCart = [...prev];
        updatedCart[oldIndex] = { ...oldItem, saleType: newSaleType };
        return updatedCart;
      }
    });
  };

  const updateDosageInstruction = (productId: string, saleType: SaleUnitType, instruction: string) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId && item.saleType === saleType) {
        return { ...item, dosageInstruction: instruction };
      }
      return item;
    }));
  };

  const updateQuantity = (productId: string, saleType: SaleUnitType, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId && item.saleType === saleType) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null; // delete item if <= 0
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const setDirectQuantity = (productId: string, saleType: SaleUnitType, targetQty: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId && item.saleType === saleType) {
            if (targetQty <= 0) return null; // delete item if <= 0
            return { ...item, quantity: targetQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string, saleType: SaleUnitType) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.saleType === saleType)));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setCustomTaxAmount(null);
    setCashTendered(0);
    setLastAddedId(null);
    setIsBarcodePaused(false);
    focusBarcodeIfEnabled(50);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (getItemUnitPrice(item) * item.quantity), 0);
  const calculatedTax = Math.max(0, (subtotal - discountAmount) * (settings.taxRate / 100));
  const taxAmount = customTaxAmount !== null ? customTaxAmount : calculatedTax;
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);
  const changeDue = cashTendered > 0 ? Math.max(0, cashTendered - grandTotal) : 0;

  // Real-time synchronization with Customer Display (شاشة عرض الزبون)
  useEffect(() => {
    const displayItems: CustomerDisplayItem[] = cart.map((item, index) => {
      const unitPrice = getItemUnitPrice(item);
      const retailPrice = item.product.singleRetailPrice || item.product.price;
      const discountPerUnit = retailPrice > unitPrice ? (retailPrice - unitPrice) : 0;

      return {
        id: `${item.product.id}-${item.saleType}-${index}`,
        productId: item.product.id,
        name: item.product.name,
        nameAr: item.product.nameAr,
        nameKu: item.product.nameKu,
        scientificName: item.product.scientificName,
        barcode: item.product.barcode,
        quantity: item.quantity,
        saleType: item.saleType,
        unitPrice,
        total: unitPrice * item.quantity,
        originalPrice: retailPrice > unitPrice ? retailPrice : undefined,
        discountPerUnit: discountPerUnit > 0 ? discountPerUnit : undefined,
        dosageInstruction: item.dosageInstruction,
        imageIcon: item.product.imageIcon,
        isNewlyAdded: item.product.id === lastAddedId,
      };
    });

    const payload: CustomerDisplayPayload = {
      activeWindowId,
      windowIndex: activeWindowIndex + 1,
      items: displayItems,
      itemCount: cart.length,
      totalUnitsCount: cart.reduce((acc, c) => acc + c.quantity, 0),
      subtotal,
      discountAmount,
      tax: taxAmount,
      total: isReturnMode ? -Math.abs(grandTotal) : grandTotal,
      paymentMethod,
      cashTendered,
      changeDue,
      isReturnMode: Boolean(isReturnMode),
      storeName: settings.storeName,
      storeNameAr: settings.storeNameAr,
      storeNameKu: settings.storeNameKu,
      currencySymbol: settings.currencySymbol || 'د.ع',
      phone: settings.phone,
      address: settings.address,
      cashierName: currentUser?.fullName || currentUser?.username || (isAr ? 'الكاشير المسؤول' : 'Sales Cashier'),
      lastUpdated: Date.now(),
    };

    broadcastCustomerDisplay(payload);
  }, [
    cart,
    subtotal,
    discountAmount,
    customTaxAmount,
    taxAmount,
    grandTotal,
    paymentMethod,
    cashTendered,
    changeDue,
    isReturnMode,
    activeWindowId,
    activeWindowIndex,
    lastAddedId,
    settings,
    currentUser,
    isAr
  ]);

  const handleOpenCustomerDisplayExternal = () => {
    if (externalOnOpenCustomerDisplay) {
      externalOnOpenCustomerDisplay();
    } else {
      openCustomerDisplayWindow();
    }
  };

  const handleCopyCustomerDisplayLink = () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}?view=customer-display#customer-display`;
      navigator.clipboard.writeText(url);
      setCustomerDisplayCopiedToast(true);
      setTimeout(() => setCustomerDisplayCopiedToast(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCompleteCheckout = (options?: { shouldPrintReceipt?: boolean }) => {
    if (cart.length === 0) return;

    if (!isReturnMode && paymentMethod === 'cash' && cashTendered > 0 && cashTendered < grandTotal) {
      alert(isAr ? 'المبلغ النقدي المستلم أقل من إجمالي الفاتورة!' : 'Cash tendered is less than bill total!');
      return;
    }

    if (isReturnMode) {
      // 1. Restock inventory for returned items
      setProducts(prevProducts => {
        return prevProducts.map(prod => {
          const cartItemsForProd = cart.filter(c => c.product.id === prod.id);
          if (cartItemsForProd.length > 0) {
            let totalAddition = 0;
            cartItemsForProd.forEach(c => {
              if (c.saleType === 'carton') {
                const cartonMultiplier = (prod.unitsPerCarton && prod.unitsPerCarton > 0) ? prod.unitsPerCarton : 1;
                totalAddition += c.quantity * cartonMultiplier;
              } else {
                totalAddition += c.quantity;
              }
            });
            const newStock = prod.stock + totalAddition;
            const newStatus = newStock === 0 ? 'out_of_stock' : newStock <= prod.minStock ? 'low_stock' : 'in_stock';
            return { ...prod, stock: newStock, totalUnits: newStock, status: newStatus };
          }
          return prod;
        });
      });

      // 2. Create return transaction
      const returnInvoiceNo = `RET-${Math.floor(100000 + Math.random() * 900000)}`;
      const returnSale: SaleTransaction = {
        id: `tx-ret-${Date.now()}`,
        invoiceNumber: returnInvoiceNo,
        timestamp: new Date().toISOString(),
        prescriptionInfo: (prescriptionInfo.doctorName || prescriptionInfo.patientName) ? { ...prescriptionInfo } : undefined,
        items: cart.map(i => {
          const itemUnitPrice = getItemUnitPrice(i);
          return {
            productId: i.product.id,
            productName: i.product.name,
            productNameAr: i.product.nameAr,
            productNameKu: i.product.nameKu || i.product.nameAr,
            price: itemUnitPrice,
            quantity: i.quantity,
            saleType: i.saleType,
            total: itemUnitPrice * i.quantity,
            addedAtTime: i.addedAtTime || formatDisplayTime(new Date(), settings.language),
            dosageInstruction: i.dosageInstruction
          };
        }),
        returnedItems: cart.map(i => {
          const itemUnitPrice = getItemUnitPrice(i);
          return {
            productId: i.product.id,
            productName: i.product.name,
            productNameAr: i.product.nameAr,
            productNameKu: i.product.nameKu || i.product.nameAr,
            price: itemUnitPrice,
            quantity: i.quantity,
            saleType: i.saleType,
            total: itemUnitPrice * i.quantity,
            returnedAt: formatDisplayDateTime(new Date(), settings.language)
          };
        }),
        subtotal: -Math.abs(subtotal),
        tax: taxAmount,
        discount: discountAmount,
        total: -Math.abs(grandTotal),
        paymentMethod,
        customerName: prescriptionInfo.patientName || (isKu ? 'کڕیاری گەڕاندنەوە' : isAr ? 'زبون إرجاع (مرتجع)' : 'Return Customer'),
        amountTendered: 0,
        changeDue: 0,
        cashierName: currentUser?.fullName || currentUser?.username || (isKu ? 'کاشێر' : isAr ? 'الكاشير المسؤول' : 'Sales Cashier'),
        status: 'refunded'
      };

      onSaleCompleted(returnSale);

      // Broadcast return completion to customer display
      broadcastCustomerDisplay({
        activeWindowId,
        windowIndex: activeWindowIndex + 1,
        items: [],
        itemCount: 0,
        totalUnitsCount: 0,
        subtotal: 0,
        discountAmount: 0,
        tax: 0,
        total: 0,
        paymentMethod,
        cashTendered: 0,
        changeDue: 0,
        isReturnMode: false,
        storeName: settings.storeName,
        storeNameAr: settings.storeNameAr,
        storeNameKu: settings.storeNameKu,
        currencySymbol: settings.currencySymbol || 'د.ع',
        phone: settings.phone,
        address: settings.address,
        cashierName: currentUser?.fullName || currentUser?.username || (isKu ? 'کاشێر' : isAr ? 'الكاشير المسؤول' : 'Sales Cashier'),
        completedSale: {
          invoiceNumber: returnInvoiceNo,
          total: -Math.abs(grandTotal),
          amountTendered: 0,
          changeDue: 0,
          paymentMethod,
          itemsCount: cart.length,
          timestamp: returnSale.timestamp,
        },
        lastUpdated: Date.now(),
      });

      if (options?.shouldPrintReceipt) {
        try {
          printSaleReceiptDirect(returnSale, settings);
        } catch (err) {
          console.warn('Silent print return fallback:', err);
        }
      }

      clearCart();
      setPrescriptionInfo({ doctorName: '', patientName: '', patientAge: '', patientPhone: '', prescriptionNotes: '' });
      setIsBarcodePaused(false);
      setIsReturnMode(false);
      setScanAlert({
        msg: isKu 
          ? 'کاڵاکان گەڕێنرانەوە، بڕی کۆگا زیادکرایەوە و پارەکە لە قاسییە دەرکرا! 📦' 
          : isAr 
          ? 'تم إرجاع المواد وإعادة كميتها للمخزن وخصم المبلغ من الصندوق بنجاح! 📦' 
          : 'Items returned, inventory restocked, and cash refunded successfully! 📦',
        type: 'success'
      });
      return;
    }

    // Normal Sale Flow
    // Deduct stock in real time according to unit types (allows negative stock / overdraft loan)
    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        const cartItemsForProd = cart.filter(c => c.product.id === prod.id);
        if (cartItemsForProd.length > 0) {
          let totalDeduction = 0;
          cartItemsForProd.forEach(c => {
            if (c.saleType === 'carton') {
              const cartonMultiplier = (prod.unitsPerCarton && prod.unitsPerCarton > 0) ? prod.unitsPerCarton : 1;
              totalDeduction += c.quantity * cartonMultiplier;
            } else {
              totalDeduction += c.quantity;
            }
          });
          const newStock = prod.stock - totalDeduction;
          const status = newStock < 0 ? 'out_of_stock' : newStock === 0 ? 'out_of_stock' : newStock <= prod.minStock ? 'low_stock' : 'in_stock';
          return { ...prod, stock: newStock, totalUnits: newStock, status };
        }
        return prod;
      });
    });

    // Calculate sequential invoice number starting at 1 (pure numbers, no letters/dashes)
    const existingNumIds = salesHistory
      .map(s => parseInt(s.invoiceNumber, 10))
      .filter(n => !isNaN(n) && n > 0);
    const nextSeqNum = existingNumIds.length > 0 
      ? Math.max(...existingNumIds) + 1 
      : (salesHistory.length + 1);
    const invoiceNumber = nextSeqNum.toString();

    const newSale: SaleTransaction = {
      id: `tx-${Date.now()}`,
      invoiceNumber,
      timestamp: new Date().toISOString(),
      prescriptionInfo: (prescriptionInfo.doctorName || prescriptionInfo.patientName) ? { ...prescriptionInfo } : undefined,
      items: cart.map(i => {
        const itemUnitPrice = getItemUnitPrice(i);
        return {
          productId: i.product.id,
          productName: i.product.name,
          productNameAr: i.product.nameAr,
          productNameKu: i.product.nameKu || i.product.nameAr,
          price: itemUnitPrice,
          quantity: i.quantity,
          saleType: i.saleType,
          total: itemUnitPrice * i.quantity,
          addedAtTime: i.addedAtTime || formatDisplayTime(new Date(), settings.language),
          dosageInstruction: i.dosageInstruction
        };
      }),
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      total: grandTotal,
      paymentMethod,
      customerName: prescriptionInfo.patientName || (isKu ? 'کڕیاری گشتی (نەقد)' : isAr ? 'زبون عام (كاش)' : 'Walk-in Customer'),
      amountTendered: paymentMethod === 'cash' && cashTendered > 0 ? cashTendered : grandTotal,
      changeDue: paymentMethod === 'cash' && cashTendered > grandTotal ? changeDue : 0,
      cashierName: currentUser?.fullName || currentUser?.username || (isKu ? 'کاشێر' : isAr ? 'الكاشير المسؤول' : 'Sales Cashier'),
      status: 'completed'
    };

    onSaleCompleted(newSale);

    // Broadcast completed sale celebration & summary to customer display
    broadcastCustomerDisplay({
      activeWindowId,
      windowIndex: activeWindowIndex + 1,
      items: [],
      itemCount: 0,
      totalUnitsCount: 0,
      subtotal: 0,
      discountAmount: 0,
      tax: 0,
      total: 0,
      paymentMethod,
      cashTendered: 0,
      changeDue: 0,
      isReturnMode: false,
      storeName: settings.storeName,
      storeNameAr: settings.storeNameAr,
      storeNameKu: settings.storeNameKu,
      currencySymbol: settings.currencySymbol || 'د.ع',
      phone: settings.phone,
      address: settings.address,
      cashierName: currentUser?.fullName || currentUser?.username || (isKu ? 'کاشێر' : isAr ? 'الكاشير المسؤول' : 'Sales Cashier'),
      completedSale: {
        invoiceNumber,
        total: grandTotal,
        amountTendered: newSale.amountTendered,
        changeDue: newSale.changeDue,
        paymentMethod,
        itemsCount: cart.length,
        timestamp: newSale.timestamp,
      },
      lastUpdated: Date.now(),
    });

    // If print requested, trigger direct receipt print quietly
    if (options?.shouldPrintReceipt) {
      try {
        printSaleReceiptDirect(newSale, settings);
      } catch (err) {
        console.warn('Silent print fallback:', err);
      }
    }

    clearCart();
    setPrescriptionInfo({ doctorName: '', patientName: '', patientAge: '', patientPhone: '', prescriptionNotes: '' });
    setIsBarcodePaused(false);
    focusBarcodeIfEnabled(50);
  };

  const filteredProducts = useMemo(() => {
    const searchLower = deferredSearch.trim().toLowerCase();
    const isDigitsOnly = /^\d+$/.test(searchLower);

    const result: Product[] = [];
    const len = posIndexedProducts.length;

    for (let i = 0; i < len; i++) {
      const item = posIndexedProducts[i];
      if (selectedCat !== 'ALL' && item.category !== selectedCat && item.categoryAr !== selectedCat) {
        continue;
      }
      if (searchLower) {
        if (isDigitsOnly) {
          if (!item.barcode.includes(searchLower)) continue;
        } else {
          if (!item.fullSearchStr.includes(searchLower)) continue;
        }
      }
      result.push(item.product);
    }
    return result;
  }, [posIndexedProducts, deferredSearch, selectedCat]);

  const totalInventoryPages = Math.max(1, Math.ceil(filteredProducts.length / INVENTORY_PAGE_SIZE));
  const safeInventoryPage = Math.min(Math.max(1, inventoryPage), totalInventoryPages);

  const paginatedInventoryProducts = useMemo(() => {
    const start = (safeInventoryPage - 1) * INVENTORY_PAGE_SIZE;
    return filteredProducts.slice(start, start + INVENTORY_PAGE_SIZE);
  }, [filteredProducts, safeInventoryPage]);

  // Fast Memoized Drug Alternatives search limited to top 30 items
  const filteredAlternatives = useMemo(() => {
    const query = deferredAltSearch.trim().toLowerCase();
    if (!query) return products.slice(0, 30);
    const result: Product[] = [];
    const len = posIndexedProducts.length;
    for (let i = 0; i < len; i++) {
      const item = posIndexedProducts[i];
      if (item.altSearchStr.includes(query)) {
        result.push(item.product);
        if (result.length >= 30) break;
      }
    }
    return result;
  }, [products, posIndexedProducts, deferredAltSearch]);

  return (
    <div 
      className="h-full flex flex-col justify-between overflow-hidden animate-fadeIn w-full space-y-2 min-h-0 pos-tab-times-font"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      
      {/* Mobile View Switcher (Visible only on < lg screens) */}
      <div className="lg:hidden flex items-center bg-[#070D1C] p-1 rounded-2xl border border-cyan-500/30 gap-1 shrink-0 shadow-lg">
        <button
          type="button"
          onClick={() => setMobilePosTab('cart')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobilePosTab === 'cart'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>{isAr ? 'السلة والماسح' : isKu ? 'سەبەتە و بارکۆد' : 'Cart & Scanner'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-900/90 text-cyan-300 text-[10px] font-mono border border-cyan-500/40">
            {cart.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobilePosTab('checkout')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobilePosTab === 'checkout'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>{isAr ? 'الدفع والمجموع' : isKu ? 'پارەدان و کۆی گشتی' : 'Checkout & Total'}</span>
          <span className="px-1.5 py-0.2 rounded-md bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
            {settings.currencySymbol}{formatNumber(grandTotal)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobilePosTab('inventory')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobilePosTab === 'inventory'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>{isAr ? 'المخزن' : isKu ? 'کۆگا' : 'Catalog'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-900/90 text-amber-300 text-[10px] font-mono border border-amber-500/40">
            {products.length}
          </span>
        </button>
      </div>

      {/* MOBILE DEDICATED INVENTORY VIEW (When on mobile and inventory tab is active) */}
      {mobilePosTab === 'inventory' && (
        <div className="lg:hidden flex-1 cyber-card p-3 rounded-3xl border border-amber-500/30 bg-[#0B1120] flex flex-col justify-between overflow-hidden min-h-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white">
                {isAr ? 'تصفح مخزن المواد السريع' : isKu ? 'گەڕان لە کۆگای کاڵاکان' : 'Quick Stock Catalog'}
              </h3>
            </div>
            <span className="text-[11px] text-amber-300 font-mono font-bold bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
              {filteredProducts.length} {isAr ? 'مادة متوفرة' : isKu ? 'کاڵا' : 'items'}
            </span>
          </div>

          {/* Search & Categories */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isAr ? 'ابحث باسم المادة أو الباركود...' : isKu ? 'گەڕان بەپێی ناو یان بارکۆد...' : 'Search item name or barcode...'}
                className="w-full bg-[#070D1C] text-xs text-slate-200 placeholder-slate-500 pl-9 rtl:pl-8 rtl:pr-9 pr-8 py-2 rounded-xl border border-amber-500/30 focus:outline-none focus:border-amber-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] custom-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCat('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                  selectedCat === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-[#070D1C] text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'الكل' : isKu ? 'هەموو' : 'All'}
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.labelEn}
                  type="button"
                  onClick={() => setSelectedCat(cat.labelEn)}
                  className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all flex items-center gap-1 ${
                    selectedCat === cat.labelEn
                      ? 'bg-amber-500 text-slate-950 shadow font-bold'
                      : 'bg-[#070D1C] text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{isAr ? cat.labelAr : isKu ? cat.labelAr : cat.labelEn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid on Mobile */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 custom-scrollbar pr-0.5">
            {paginatedInventoryProducts.map(p => {
              const retailP = p.singleRetailPrice || p.price;
              const inCartCount = cart
                .filter(c => c.product.id === p.id)
                .reduce((sum, item) => {
                  if (item.saleType === 'carton') {
                    const upc = (p.unitsPerCarton && p.unitsPerCarton > 0) ? p.unitsPerCarton : 1;
                    return sum + (item.quantity * upc);
                  }
                  return sum + item.quantity;
                }, 0);
              const remainingStock = p.stock - inCartCount;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    addToCart(p, 'retail');
                    setMobilePosTab('cart');
                  }}
                  className="bg-[#070D1C] hover:bg-[#0E172E] p-2.5 rounded-2xl border border-slate-800 hover:border-amber-500/50 flex flex-col justify-between gap-2 cursor-pointer active:scale-95 transition-all shadow-md relative group"
                >
                  <div className="absolute top-1.5 left-1.5 rtl:left-auto rtl:right-1.5 flex items-center gap-1">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      remainingStock <= 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {remainingStock <= 0 ? (isAr ? '0' : isKu ? '0' : '0') : `${remainingStock} ${p.unit}`}
                    </span>
                    {inCartCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono font-black text-[9px] shadow">
                        +{inCartCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-2 pt-4">
                    <span className="text-xl p-1 rounded-xl bg-slate-800/80">{p.imageIcon || '📦'}</span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{isAr ? p.nameAr : isKu ? p.nameAr : p.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{p.barcode}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5">
                    <span className="text-xs font-mono font-black text-amber-300">
                      {settings.currencySymbol}{formatNumber(retailP)}
                    </span>
                    <button
                      type="button"
                      className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAr ? 'إضافة' : isKu ? 'زیادکردن' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Inventory Pagination Controls */}
          {totalInventoryPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                disabled={safeInventoryPage <= 1}
                onClick={() => setInventoryPage(prev => Math.max(1, prev - 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 flex items-center gap-1"
              >
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-0 rotate-180" />
                <span>{isAr ? 'السابق' : isKu ? 'پێشوو' : 'Prev'}</span>
              </button>
              <span className="text-[11px] text-slate-400 font-mono font-bold">
                {safeInventoryPage} / {totalInventoryPages}
              </span>
              <button
                type="button"
                disabled={safeInventoryPage >= totalInventoryPages}
                onClick={() => setInventoryPage(prev => Math.min(totalInventoryPages, prev + 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 flex items-center gap-1"
              >
                <span>{isAr ? 'التالي' : isKu ? 'دواتر' : 'Next'}</span>
                <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0 rotate-180" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* SALES CART INTERFACE (MAIN SCREEN GRID) */}
      <div className={`flex-1 grid grid-cols-1 ${showCustomerDisplaySidePanel ? 'lg:grid-cols-12 xl:grid-cols-12' : 'lg:grid-cols-12'} gap-2.5 overflow-hidden min-h-0 h-full ${mobilePosTab === 'inventory' ? 'hidden lg:grid' : ''}`}>
        
        {/* RIGHT SIDE PANEL IN RTL: Grand Total at Top Edge, Payment & Checkout */}
        <div className={`${showCustomerDisplaySidePanel ? 'lg:col-span-4 xl:col-span-3.5 2xl:col-span-3' : 'lg:col-span-4'} ${mobilePosTab === 'checkout' ? 'flex' : 'hidden lg:flex'} cyber-card p-2 sm:p-2.5 rounded-3xl border flex-col justify-between shadow-2xl h-full overflow-hidden select-none min-h-0 ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0B1120] border-emerald-500/40 text-slate-100'
        }`}>
          
          {/* Top Section: Grand Total Box at Very Top (Elevated to Top Row Edge) + Payment Methods */}
          <div className="space-y-1.5 flex-1 flex flex-col justify-start overflow-y-auto custom-scrollbar">
            {/* Centered Green Grand Total Box - Prominent, Long & Elevated at Top */}
            <div className={`relative p-[2px] rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 via-amber-400 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.45)] shrink-0 w-full`}>
              <div className={`py-2.5 px-3 rounded-[14px] flex flex-col items-center justify-center text-center border space-y-0.5 ${
                isLight 
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-xl' 
                  : 'bg-[#031810] text-emerald-300 border-emerald-400/60'
              }`}>
                <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest block ${
                  isLight ? 'text-emerald-100' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                }`}>
                  {isAr ? 'إجمالي ومجموع السلة النهائي' : isKu ? 'کۆی گشتی ماوە بۆ دان' : 'Grand Total Due'}
                </span>
                
                <span className={`text-[50px] leading-tight font-black tracking-tight font-mono my-1 block ${
                  isLight ? 'text-white drop-shadow-md' : 'text-emerald-300 drop-shadow-[0_0_20px_rgba(52,211,153,0.95)]'
                }`}>
                  {settings.currencySymbol}{formatNumber(grandTotal)}
                </span>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-inner ${
                  isLight 
                    ? 'bg-emerald-800 text-emerald-100 border-emerald-400/50' 
                    : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
                }`}>
                  {cart.length} {isAr ? 'أصناف مختارة في السلة' : isKu ? 'کاڵا لە سەبەتەدا' : 'items in cart'}
                </span>
              </div>
            </div>

            <h3 className={`text-xs font-bold border-b pb-0.5 flex items-center gap-2 shrink-0 pt-0.5 ${
              isLight ? 'text-slate-800 border-slate-200' : 'text-slate-300 border-slate-800/80'
            }`}>
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isAr ? 'وسيلة وتفاصيل الدفع' : isKu ? 'شێواز و وردەکاری پارەدان' : 'Payment & Checkout'}</span>
            </h3>

            {/* Payment Method Selector - 4 Clear Unhidden Buttons (نقد، دين / آجل، بطاقة، NFC/مدى) */}
            <div className="space-y-0.5 shrink-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                {isAr ? 'اختيار طريقة الدفع:' : isKu ? 'شێوازی پارەدان:' : 'Payment Method:'}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {/* Cash - نقد */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-102'
                      : 'bg-[#070D1C] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>{isAr ? 'نقداً' : isKu ? 'نەختینە (کاش)' : 'Cash'}</span>
                </button>

                {/* Debt / Account - دين / آجل */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('debt')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                    paymentMethod === 'debt'
                      ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)] scale-102'
                      : 'bg-[#070D1C] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{isAr ? 'دين / آجل' : isKu ? 'قەرز / ئەژمێر' : 'Debt/Account'}</span>
                </button>

                {/* Card - بطاقة */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)] scale-102'
                      : 'bg-[#070D1C] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>{isAr ? 'بطاقة' : isKu ? 'کارت' : 'Card'}</span>
                </button>

                {/* NFC / Mada */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('nfc')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                    paymentMethod === 'nfc'
                      ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-102'
                      : 'bg-[#070D1C] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                  <span>{isAr ? 'NFC / مدى' : isKu ? 'NFC / بێ بەرکەوتن' : 'NFC / Contactless'}</span>
                </button>
              </div>
            </div>

            {/* Cash Tendered Calculator (if Cash) */}
            {paymentMethod === 'cash' && (
              <div className="p-1.5 rounded-xl bg-[#070D1C] border border-emerald-500/30 space-y-1.5 shrink-0 shadow-sm">
                <div className="flex items-center justify-between gap-1.5 text-xs">
                  <span className="text-slate-300 font-semibold text-[11px] shrink-0 whitespace-nowrap">
                    {isAr ? 'المبلغ المستلم:' : isKu ? 'بڕی وەرگیراو:' : 'Tendered Cash:'}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-emerald-400 font-bold text-xs">{settings.currencySymbol}</span>
                    <input
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Number(e.target.value))}
                      onFocus={(e) => {
                        setIsBarcodePaused(true);
                        e.target.select();
                      }}
                      onClick={(e) => {
                        setIsBarcodePaused(true);
                        (e.target as HTMLInputElement).select();
                      }}
                      onBlur={() => {
                        setIsBarcodePaused(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="0"
                      className="w-24 bg-slate-900 text-emerald-400 font-bold font-mono px-2 py-0.5 text-center rounded-lg border border-emerald-500/40 text-xs focus:outline-none focus:border-emerald-400 placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Quick Cash Buttons (1000, 5000, 10000, 15000, 20000, 25000, 50000) */}
                <div className="grid grid-cols-7 gap-1">
                  {[1000, 5000, 10000, 15000, 20000, 25000, 50000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashTendered(amt)}
                      className={`py-1 px-0.5 rounded-md text-[9.5px] font-bold font-mono transition-all border active:scale-95 cursor-pointer text-center whitespace-nowrap ${
                        cashTendered === amt
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : 'bg-slate-800/90 text-slate-300 border-slate-700/80 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-500/50'
                      }`}
                      title={isAr ? `تحديد المبلغ: ${formatNumber(amt)}` : isKu ? `دیاریکردنی بڕ: ${formatNumber(amt)}` : `Set cash: ${formatNumber(amt)}`}
                    >
                      {formatNumber(amt)}
                    </button>
                  ))}
                </div>

                {cashTendered > 0 && (
                  <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-800 text-cyan-400">
                    <span>{isAr ? 'الباقي للمشتري:' : isKu ? 'بڕی گەڕاوە بۆ کڕیار:' : 'Change Due:'}</span>
                    <span className="font-mono text-xs">{settings.currencySymbol}{formatNumber(changeDue)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Debt Info Notice (if Debt) */}
            {paymentMethod === 'debt' && (
              <div className="p-1.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between shrink-0">
                <span className="text-[11px]">{isAr ? 'بيع بالدين / حساب العميل' : isKu ? 'فرۆشتن بە قەرز / حیسابی کڕیار' : 'On Account / Customer Debt Sale'}</span>
                <span className="font-bold text-amber-400 font-mono text-xs">{settings.currencySymbol}{formatNumber(grandTotal)}</span>
              </div>
            )}
          </div>

          {/* FIXED BOTTOM CONTAINER: Bill Breakdown, Large Sale Button & Extra Action Buttons */}
          <div className={`shrink-0 pt-1 border-t space-y-1 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B1120] border-slate-800/80'}`}>
            
            {/* Bill Summary Breakdown */}
            <div className={`space-y-0.5 text-xs p-1.5 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-[#070D1C] border-slate-800 text-slate-300'}`}>
              <div className="flex justify-between items-center">
                <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{isAr ? 'المجموع الفرعي:' : isKu ? 'کۆی سەرەتایی:' : 'Subtotal:'}</span>
                <span className={`font-mono font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{settings.currencySymbol}{formatNumber(subtotal)}</span>
              </div>

              <div className={`flex justify-between items-center pt-0.5 border-t ${isLight ? 'border-slate-300' : 'border-slate-800/60'}`}>
                <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{isAr ? 'خصم خاص:' : isKu ? 'داشکاندنی تایبەت:' : 'Discount:'}</span>
                <div className="flex items-center gap-1">
                  <span className="text-amber-500 font-bold text-xs">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountAmount === 0 ? '' : discountAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDiscountAmount(val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                    }}
                    onFocus={(e) => {
                      setIsBarcodePaused(true);
                      e.target.select();
                    }}
                    onClick={(e) => {
                      setIsBarcodePaused(true);
                      (e.target as HTMLInputElement).select();
                    }}
                    onBlur={() => {
                      setIsBarcodePaused(false);
                      focusBarcodeIfEnabled(50);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className={`w-20 text-xs font-mono font-bold px-2 py-0.5 text-center rounded-lg border focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 ${
                      isLight ? 'bg-white text-slate-900 border-slate-300 placeholder:text-slate-400' : 'bg-[#0B1120] text-amber-400 border-slate-700 placeholder:text-slate-600'
                    }`}
                  />
                </div>
              </div>

              <div className={`flex justify-between items-center pt-0.5 border-t ${isLight ? 'border-slate-300' : 'border-slate-800/60'}`}>
                <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{isAr ? `الضريبة (${settings.taxRate}%):` : isKu ? `باج (${settings.taxRate}%):` : `VAT (${settings.taxRate}%):`}</span>
                <div className="flex items-center gap-1">
                  <span className="text-cyan-400 font-bold text-xs">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={customTaxAmount !== null ? (customTaxAmount === 0 ? '' : customTaxAmount) : (calculatedTax === 0 ? '' : Math.round(calculatedTax))}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomTaxAmount(val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                    }}
                    onFocus={(e) => {
                      setIsBarcodePaused(true);
                      e.target.select();
                    }}
                    onClick={(e) => {
                      setIsBarcodePaused(true);
                      (e.target as HTMLInputElement).select();
                    }}
                    onBlur={() => {
                      setIsBarcodePaused(false);
                      focusBarcodeIfEnabled(50);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className={`w-20 text-xs font-mono font-bold px-2 py-0.5 text-center rounded-lg border focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 ${
                      isLight ? 'bg-white text-slate-900 border-slate-300 placeholder:text-slate-400' : 'bg-[#0B1120] text-cyan-300 border-slate-700 placeholder:text-slate-600'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="space-y-1.5 pt-1">
              {/* TWO DISTINCT BUTTONS: 1) Without Receipt 2) With Direct Print */}
              <div className="grid grid-cols-2 gap-1.5">
                {/* 1. Without Receipt */}
                <button
                  type="button"
                  onClick={() => {
                    setIsBarcodePaused(false);
                    handleCompleteCheckout({ shouldPrintReceipt: false });
                  }}
                  disabled={cart.length === 0}
                  className={`py-2 px-2 rounded-xl text-white font-black text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isReturnMode
                      ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 border border-rose-400/60 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                      : isLight 
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/30' 
                      : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }`}
                  title={isReturnMode ? (isAr ? 'تأكيد إرجاع المواد بدون وصل' : isKu ? 'پشتڕاستکردنەوەی گەڕاندنەوە بێ پسوولە' : 'Return without receipt') : (isAr ? 'حفظ المبيعات فوراً بدون إظهار أو طباعة وصل (سريع جداً)' : isKu ? 'فرۆشتنی خێرا بێ پسوولە' : 'Fast Sale without receipt')}
                >
                  {isReturnMode ? <RotateCcw className="w-4 h-4 text-rose-100 shrink-0 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />}
                  <span className="truncate">
                    {isReturnMode 
                      ? (isAr ? 'تأكيد إرجاع (بدون وصل)' : isKu ? 'پشتڕاستکردنەوە (بێ پسوولە)' : 'Confirm Return') 
                      : (isAr ? 'بيع (بدون وصل)' : isKu ? 'فرۆشتن (بێ پسوولە)' : 'Sale (No Receipt)')}
                  </span>
                </button>

                {/* 2. With Direct Print */}
                <button
                  type="button"
                  onClick={() => {
                    setIsBarcodePaused(false);
                    handleCompleteCheckout({ shouldPrintReceipt: true });
                  }}
                  disabled={cart.length === 0}
                  className={`py-2 px-2 rounded-xl text-white font-black text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isReturnMode
                      ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 border border-rose-300/80 shadow-[0_0_18px_rgba(244,63,94,0.5)]'
                      : isLight 
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 shadow-cyan-600/30' 
                      : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  }`}
                  title={isReturnMode ? (isAr ? 'تأكيد إرجاع المواد وطباعة وصل مرتجع' : isKu ? 'گەڕاندنەوە و چاپی پسوولە' : 'Return & print receipt') : (isAr ? 'إتمام البيع وطباعة الوصل مباشرة بدون إظهار شاشة الطباعة' : isKu ? 'فرۆشتن و چاپی ڕاستەوخۆی پسوولە' : 'Sale with direct print')}
                >
                  <Printer className="w-4 h-4 text-cyan-200 shrink-0" />
                  <span className="truncate">
                    {isReturnMode 
                      ? (isAr ? 'إرجاع وطباعة وصل' : isKu ? 'گەڕاندنەوە و چاپ' : 'Return & Print') 
                      : (isAr ? 'بيع وطباعة وصل' : isKu ? 'فرۆشتن و چاپ' : 'Sale & Print')}
                  </span>
                </button>
              </div>

              {/* Added Quick Action Buttons Row */}
              <div className="flex items-center gap-1.5">
                {/* Clear Cart Button */}
                <button
                  type="button"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="flex-1 py-1 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title={isAr ? `تفريغ السلة (${posShortcuts.clearCart})` : isKu ? `بەتاڵکردنی سەبەتە (${posShortcuts.clearCart})` : `Clear Cart (${posShortcuts.clearCart})`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isAr ? 'تفريغ السلة' : isKu ? 'بەتاڵکردنی سەبەتە' : 'Clear Cart'}</span>
                  <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 font-mono text-[9px] border border-rose-500/40">
                    [{posShortcuts.clearCart}]
                  </span>
                </button>

                {/* Silent POS Printing Guide Button */}
                <button
                  type="button"
                  onClick={() => setShowKioskModal(true)}
                  className="py-1 px-2.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  title={isAr ? 'إعداد وتفعيل الطباعة الصامتة الفورية وإلغاء نافذة المتصفح' : isKu ? 'ڕێکخستنی چاپی خێرا و بێ پەنجەرە' : 'Instant Silent Printing Setup'}
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  <span>{isAr ? 'الطباعة الصامتة' : isKu ? 'چاپی صامت' : 'Silent Print'}</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* LEFT SIDE PANEL IN RTL: Sales Windows + Barcode Entry + Cart Items List */}
        <div className={`${showCustomerDisplaySidePanel ? 'lg:col-span-8 xl:col-span-4.5 2xl:col-span-5' : 'lg:col-span-8'} ${mobilePosTab === 'cart' ? 'flex' : 'hidden lg:flex'} flex-col gap-2 h-full min-h-0 overflow-hidden`}>
          
          {/* MULTI-WINDOW SALES TABS BAR (شريط نوافذ البيع المتعددة - أعلى حقل الباركود) */}
          <div className="cyber-card px-2 sm:px-3 py-1.5 rounded-2xl border border-blue-500/30 bg-[#0A101D]/90 shadow-lg shrink-0 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar z-20">
            
            {/* Windows List + Add New Window Button */}
            <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto py-0.5 custom-scrollbar w-full">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-bold shrink-0">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isAr ? 'نوافذ البيع:' : isKu ? 'پەنجەرەکانی فرۆشتن:' : 'Sales Windows:'}</span>
              </div>

              {/* Window Tabs */}
              {windows.map((win, index) => {
                const hasItems = win.cart.length > 0;
                const isActive = win.id === activeWindow.id;
                const isWinReturn = Boolean(win.isReturnMode);
                const itemCount = win.cart.reduce((sum, item) => sum + item.quantity, 0);
                const windowTitle = isAr ? `نافذة ${index + 1}` : isKu ? `پەنجەرە ${index + 1}` : `Window ${index + 1}`;

                return (
                  <button
                    key={win.id}
                    type="button"
                    onClick={() => setActiveWindowId(win.id)}
                    className={`group relative px-3 py-1 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer border ${
                      isWinReturn
                        ? isActive
                          ? 'bg-rose-500/30 border-2 border-rose-400 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.45)] ring-2 ring-rose-400/50 backdrop-blur-md font-black'
                          : 'bg-rose-500/20 border-rose-400/70 text-rose-300 hover:bg-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.25)] backdrop-blur-md'
                        : hasItems
                        ? isActive
                          ? 'bg-emerald-500/30 border-2 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.45)] ring-2 ring-emerald-400/50 backdrop-blur-md font-black'
                          : 'bg-emerald-500/20 border-emerald-400/70 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)] backdrop-blur-md'
                        : isActive
                          ? 'bg-cyan-500/20 border-2 border-cyan-400/80 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)] font-bold'
                          : 'bg-[#070D1C]/80 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                  >
                    {/* Glowing Dot if window has items or is in return mode */}
                    {isWinReturn ? (
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_#fb7185]" />
                    ) : hasItems ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    ) : null}

                    <span className="truncate max-w-[90px]">{windowTitle}</span>

                    {/* Return Mode Tag if window is in return mode */}
                    {isWinReturn && (
                      <span className="px-1.5 py-0.2 rounded-md bg-rose-950 text-rose-300 text-[10px] font-bold border border-rose-500/50">
                        {isAr ? 'مرتجع' : isKu ? 'گەڕاندنەوە' : 'Return'}
                      </span>
                    )}

                    {/* Badge count for items */}
                    {hasItems && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        isWinReturn
                          ? 'bg-rose-950 text-rose-200 border border-rose-400/60'
                          : isActive 
                          ? 'bg-emerald-950 text-emerald-200 border border-emerald-400/60' 
                          : 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {itemCount}
                      </span>
                    )}

                    {/* Close Window Button (x) */}
                    <span
                      onClick={(e) => handleRemoveWindow(e, win.id)}
                      title={isAr ? 'إغلاق النافذة' : isKu ? 'داخستنی پەنجەرە' : 'Close window'}
                      className={`p-0.5 rounded-md transition-colors ${
                        hasItems 
                          ? 'hover:bg-rose-500/30 text-emerald-200 hover:text-rose-300' 
                          : 'hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </span>
                  </button>
                );
              })}

              {/* Add New Window Button (نافذة جديدة) */}
              <button
                type="button"
                onClick={handleAddWindow}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_18px_rgba(6,182,212,0.5)] cursor-pointer active:scale-95 shrink-0"
                title={isAr ? `إضافة نافذة بيع جديدة (${posShortcuts.newWindow})` : isKu ? `زیادکردنی پەنجەرەی نوێ (${posShortcuts.newWindow})` : `Add new sales window (${posShortcuts.newWindow})`}
              >
                <Plus className="w-3.5 h-3.5 text-cyan-200" />
                <span>{isAr ? 'نافذة جديدة' : isKu ? 'پەنجەرەی نوێ' : 'New Window'}</span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 font-mono text-[10px] border border-cyan-400/40">
                  {posShortcuts.newWindow}
                </span>
              </button>
            </div>
          </div>

          {/* BARCODE SCANNER & STORE INVENTORY ENTRY BAR (Yellow Line Container) */}
          <div className="cyber-card p-1 sm:p-1.5 rounded-2xl border-2 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0 flex items-center justify-between gap-1.5 sm:gap-2 relative z-20 bg-[#070D1C]/95">
            
            {/* BARCODE INPUT FORM (Inside Yellow Line Box) */}
            <form onSubmit={handleBarcodeSubmit} className="flex-1 w-full flex items-center relative">
              <div className="relative w-full">
                <div 
                  onClick={() => setShowYellowLineModal(true)}
                  className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-400 cursor-pointer hover:scale-110 transition-all z-10"
                  title={isAr ? 'انقر لعرض تفاصيل وميزات الخط الأصفر' : isKu ? 'کلیک بکە بۆ بینینی وردەکاریەکانی هێڵی زەرد' : 'Click to inspect yellow line hub'}
                >
                  <BarcodeIcon className="w-4 h-4 animate-pulse" />
                  <Sparkles className="w-3 h-3 text-amber-300 hidden sm:inline" />
                </div>
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    if (scanAlert?.type === 'error') {
                      setScanAlert(null);
                    }
                  }}
                  onClick={() => {
                    if (isBarcodePaused) {
                      setIsBarcodePaused(false);
                      focusBarcodeIfEnabled(50);
                    }
                  }}
                  disabled={isBarcodeDisabled}
                  onBlur={() => {
                    if (!isBarcodeDisabled && !isBarcodePaused) {
                      focusBarcodeIfEnabled(100);
                    }
                  }}
                  autoFocus={!isBarcodeDisabled}
                  placeholder={
                    isBarcodePaused
                      ? (isAr ? 'الباركود متوقف مؤقتاً عند كتابة الخصم...' : isKu ? 'بارکۆد ڕاوەستاوە کاتی داشکاندن...' : 'Barcode paused while typing discount...')
                      : isBarcodeDisabled 
                      ? (isAr ? 'الباركود متوقف مؤقتاً عند فتح النوافذ...' : isKu ? 'بارکۆد ڕاوەستاوە کاتی کردنەوەی پەنجەرە...' : 'Barcode paused while modal open...')
                      : (isAr ? `[${posShortcuts.focusBarcode}] امسح الباركود هنا (نشط)...` : isKu ? `[${posShortcuts.focusBarcode}] لێرە بارکۆد لێبدە (چالاک)...` : `[${posShortcuts.focusBarcode}] Scan barcode here...`)
                  }
                  className={`w-full text-xs font-mono text-center px-9 py-1.5 sm:py-2 rounded-xl border-2 transition-all ${
                    isBarcodeDisabled
                      ? 'bg-[#050B18] text-cyan-200 border-slate-800 opacity-60 cursor-pointer shadow-none placeholder-slate-500'
                      : scanAlert?.type === 'error'
                      ? 'bg-rose-950/90 text-rose-100 border-rose-500 ring-4 ring-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.85)] animate-pulse placeholder-rose-300'
                      : 'bg-[#050B18] text-cyan-200 border-amber-400/90 focus:border-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.3)] placeholder-slate-500'
                  }`}
                />

                {/* Floating Error Alert Banner */}
                {scanAlert && scanAlert.type === 'error' && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+4px)] z-30 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-rose-950/95 border border-rose-500/80 text-rose-200 shadow-[0_4px_25px_rgba(244,63,94,0.6)] animate-fadeIn">
                    <XCircle className="w-4 h-4 shrink-0 text-rose-400 animate-pulse" />
                    <span>{scanAlert.msg}</span>
                  </div>
                )}
              </div>
            </form>

            {/* ACTION BUTTONS INSIDE YELLOW LINE CONTAINER */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* RETURN MODE / RETURNS HUB BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setIsReturnMode(prev => {
                    const nextState = !prev;
                    setScanAlert({
                      msg: nextState
                        ? (isKu 
                            ? '⚡ دۆخی گەڕاندنەوە چالاککرا (هەر بارکۆدێک یان کاڵایەک هەڵبژێری دەگەڕێندرێتەوە بۆ کۆگا)' 
                            : isAr 
                            ? '⚡ تم تفعيل وضع الإرجاع (امسح الباركود أو أضف المواد لإرجاعها للمخزن)' 
                            : '⚡ Return mode enabled (Scan barcode or select item to restock & refund)')
                        : (isKu 
                            ? '✅ دۆخی فرۆشتنی ئاسایی چالاککرایەوە' 
                            : isAr 
                            ? '✅ تم العودة إلى وضع البيع العادي' 
                            : '✅ Normal sale mode restored'),
                      type: nextState ? 'error' : 'success'
                    });
                    focusBarcodeIfEnabled(50);
                    return nextState;
                  });
                }}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border ${
                  isReturnMode
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 ring-2 ring-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                    : 'bg-[#0B1120] hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:border-slate-600'
                }`}
                title={isAr ? 'تفعيل / إيقاف وضع إرجاع المواد' : isKu ? 'چالاککردن / ناچالاککردنی دۆخی گەڕاندنەوەی کاڵا' : 'Toggle Return Mode'}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isReturnMode ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {isReturnMode ? (isAr ? 'وضع المرتجعات (نشط)' : isKu ? 'دۆخی گەڕاندنەوە (چالاک)' : 'Returns Mode (Active)') : (isAr ? 'إرجاع مواد' : isKu ? 'گەڕاندنەوەی کاڵا' : 'Returns')}
                </span>
                <span className="sm:hidden">{isAr ? 'مرتجع' : isKu ? 'گەڕاندنەوە' : 'Return'}</span>
              </button>

              {/* STORE INVENTORY BUTTON */}
              <button
                type="button"
                onClick={() => setShowInventory(true)}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.35)] border border-emerald-400/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title={isAr ? `عرض مواد المخزن (${posShortcuts.openInventory})` : isKu ? `پیشاندانی کۆگا (${posShortcuts.openInventory})` : `Show Store Inventory (${posShortcuts.openInventory})`}
              >
                <Package className="w-3.5 h-3.5 text-emerald-200" />
                <span className="hidden sm:inline">{isAr ? 'المخزن' : isKu ? 'کۆگا' : getTranslation(lang, 'showInventory')}</span>
                <span className="sm:hidden">{isAr ? 'المخزن' : isKu ? 'کۆگا' : 'Inventory'}</span>
                <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-emerald-500/40">
                  {posShortcuts.openInventory}
                </span>
                <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-mono border" style={{ borderColor: '#ff05b8' }}>
                  {products?.length ?? 0}
                </span>
              </button>

              {/* DIRECT SILENT PRINT SETUP BUTTON */}
              <button
                type="button"
                onClick={() => setShowKioskModal(true)}
                className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/60 text-cyan-300 font-bold text-xs shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title={isAr ? 'إعداد الطباعة الصامتة الفورية وإلغاء نافذة المتصفح' : isKu ? 'ڕێکخستنی چاپی صامت' : 'Silent Printing Setup'}
              >
                <Zap className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                <span className="hidden md:inline">{isAr ? 'الطباعة الفورية' : isKu ? 'چاپی خێرا' : 'Silent Print'}</span>
              </button>

            </div>
          </div>

          {/* CART ITEMS CONTAINER */}
          <div className={`flex-1 cyber-card p-2 sm:p-2.5 rounded-3xl border transition-all flex flex-col justify-between h-full min-h-0 overflow-hidden space-y-2 ${
            isReturnMode
              ? 'bg-[#12080D] border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
              : 'bg-[#0B1120] border-blue-500/20'
          }`}>
          
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            {/* Active Return Mode Banner */}
            {isReturnMode && (
              <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs font-bold flex items-center justify-between gap-2 shadow-md animate-fadeIn shrink-0">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-400 animate-spin" />
                  <span>
                    {isAr 
                      ? '⚡ وضع الإرجاع نشط: امسح الباركود أو اختر المادة لإرجاعها وإعادة كميتها للمخزن تلقائياً.' 
                      : isKu
                      ? '⚡ دۆخی گەڕاندنەوە چالاکە: بارکۆد لێبدە یان دەرمان هەڵبژێرە بۆ گەڕاندنەوەی بڕەکەی بۆ کۆگا.'
                      : '⚡ Return mode active: Scan barcode or select item to restock & process refund.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReturnMode(false)}
                  className="px-2 py-0.5 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-100 text-[10px] font-bold border border-rose-400/40"
                >
                  {isAr ? 'إلغاء المرتجع' : isKu ? 'هەڵوەشاندنەوەی گەڕاندنەوە' : 'Cancel Return'}
                </button>
              </div>
            )}

            {/* Cart Items List & Raised Top Table */}
            <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-0 flex flex-col">
              {cart.length === 0 ? (
                <div className="py-12 sm:py-16 text-center text-slate-500 space-y-3 flex flex-col items-center justify-center m-auto">
                  {/* 3D Shopping Cart Visual Asset */}
                  <Cart3DGraphic size="lg" />
                  <p className="text-xs text-slate-400 font-medium">
                    {isAr ? 'السلة فارغة، اختر أو امسح باركود لإضافة أدوية' : isKu ? 'سەبەتە بەتاڵە، بارکۆد لێبدە یان دەرمان هەڵبژێرە' : 'Cart is empty, scan or select items'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Blue Column Headers Bar (ترويسة الأعمدة التوضيحية فوق السلة مباشرة في الأعلى) */}
                  <div className="hidden lg:flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#091124] border border-cyan-500/30 text-[10.5px] font-bold text-slate-300 shadow-sm shrink-0">
                    <div className="flex-1 min-w-0">
                      <span className="text-cyan-300">{isAr ? 'المادة الدوائية / الصنف' : isKu ? 'ناوی دەرمان / کاڵا' : 'Product / Medicine'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 rtl:space-x-reverse">
                      {/* Optional Purchase Price Column for authorized users */}
                      {canViewPurchasePrice && (
                        <span className="w-20 text-center text-purple-300">{isAr ? 'سعر الشراء' : isKu ? 'نرخی کڕین' : 'Cost Price'}</span>
                      )}
                      <span className="w-22 text-center text-cyan-300">{isAr ? 'السعر' : isKu ? 'نرخ' : 'Price'}</span>
                      <span className="w-28 text-center text-slate-300">{isAr ? 'نوع البيع' : isKu ? 'جۆری فرۆشتن' : 'Sale Type'}</span>
                      <span className="w-18 text-center text-emerald-300">{isAr ? 'العدد' : isKu ? 'ژمارە' : 'Qty'}</span>
                      <span className="w-24 text-center text-emerald-400 text-[15px] font-bold">{isAr ? 'المجموع' : isKu ? 'کۆی گشتی' : 'Total'}</span>
                      <div className="w-6 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={clearCart}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                          title={isAr ? 'تفريغ السلة بالكامل' : isKu ? 'بەتاڵکردنی سەبەتە' : 'Clear Cart'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {cart.map((item, idx) => {
                    const isFirstNewlyAdded = (idx === 0) && (item.product.id === lastAddedId);
                    const isWholesaleOrCarton = item.saleType === 'wholesale' || item.saleType === 'carton';
                    const unitPrice = getItemUnitPrice(item);

                    let cardStyles = 'bg-[#070D1C] border border-blue-500/20 hover:border-cyan-500/30';
                    if (isReturnMode) {
                      cardStyles = 'bg-[#180A10] border border-rose-500/40 hover:border-rose-400/60 shadow-[0_0_8px_rgba(244,63,94,0.15)]';
                    } else if (isWholesaleOrCarton) {
                      cardStyles = 'bg-gradient-to-r from-emerald-950/40 via-[#051417] to-[#070D1C] border border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.2)]';
                    } else if (isFirstNewlyAdded) {
                      cardStyles = 'bg-gradient-to-r from-cyan-950/40 via-[#061826] to-[#070D1C] border border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.2)] animate-fadeIn';
                    }

                    return (
                      <div
                        key={`${item.product.id}-${item.saleType}`}
                        className={`p-1.5 sm:p-2 rounded-xl transition-all flex flex-col gap-1.5 ${cardStyles}`}
                      >
                        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 w-full">
                          {/* 1. Product Info */}
                          <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0 flex-1">
                            <span className="text-lg p-1.5 rounded-lg bg-slate-800/80 shrink-0 leading-none">
                              {item.product.imageIcon}
                            </span>
                            <div className="min-w-0 flex-1 leading-tight">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-bold text-slate-100 truncate">
                                  {isAr ? item.product.nameAr : isKu ? (item.product.nameAr || item.product.name) : item.product.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5 flex-wrap">
                                {item.product.dosageForm && (
                                  <span className="text-cyan-400 font-semibold">{item.product.dosageForm}</span>
                                )}
                                <span>•</span>
                                <span className="font-mono text-slate-400">{item.product.barcode}</span>
                              </div>
                            </div>
                          </div>

                          {/* Controls Row on right side */}
                          <div className="flex items-center gap-2 rtl:space-x-reverse shrink-0 w-full lg:w-auto justify-between lg:justify-end flex-wrap sm:flex-nowrap pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-800/60">
                            
                            {/* Purchase / Cost Price (سعر الشراء) - Displayed if cashier/user has permission */}
                            {canViewPurchasePrice && (
                              <div className="w-20 text-center shrink-0 flex flex-col items-center">
                                <span className="lg:hidden text-[8.5px] text-purple-400 mb-0.5 font-bold">{isAr ? 'سعر الشراء' : isKu ? 'نرخی کڕین' : 'Cost Price'}</span>
                                <div className="px-1.5 py-0.5 rounded-lg bg-purple-950/40 border border-purple-500/30 text-purple-300 text-[10.5px] font-mono font-bold flex items-center justify-center gap-1 w-full shadow-inner" title={isAr ? 'سعر شراء وتكلفة المادة' : isKu ? 'نرخی کڕینی دەرمان' : 'Purchase / Cost Price'}>
                                  <span className="text-[11px] font-black text-purple-300 font-mono tracking-tight">
                                    {settings.currencySymbol}{formatNumber(
                                      item.saleType === 'carton'
                                        ? (item.product.cartonPurchasePrice || (item.product.costPerUnit * (item.product.unitsPerCarton || 1)) || 0)
                                        : (item.product.costPerUnit || item.product.cost || 0)
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* السعر (Unit Price) - تم نقله مكان داخل الكرتون المحذوف */}
                            <div className="w-22 text-center shrink-0 flex flex-col items-center">
                              <span className="lg:hidden text-[8.5px] text-cyan-400 mb-0.5 font-bold">{isAr ? 'السعر' : isKu ? 'نرخ' : 'Price'}</span>
                              <div className="px-1.5 py-0.5 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-center w-full shadow-inner">
                                <span className="text-[13px] font-black text-amber-300 font-mono tracking-tight leading-none block">
                                  {settings.currencySymbol}{formatNumber(unitPrice)}
                                </span>
                              </div>
                            </div>

                            {/* 4. Sale Type Pills (مفرد / جملة / كرتون - يدعم الكردي) */}
                            <div className="w-24 shrink-0 flex flex-col items-center">
                              <span className="lg:hidden text-[8.5px] text-slate-400 mb-0.5 font-bold">{isAr ? 'نوع البيع' : isKu ? 'جۆری فرۆشتن' : 'Sale Type'}</span>
                              <div className="flex items-center gap-0.5 bg-[#0B1120] p-0.5 rounded-lg border border-slate-800 w-full justify-center">
                                <button
                                  type="button"
                                  onClick={() => updateSaleType(item.product.id, item.saleType, 'retail')}
                                  className={`px-1 py-0.5 text-[8.5px] font-bold rounded transition-all flex-1 text-center whitespace-nowrap ${
                                    item.saleType === 'retail'
                                      ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                  title={isAr ? 'بيع بالعلبة (مفرد)' : isKu ? 'فرۆشتن بە قوتی (تاک)' : 'Box'}
                                >
                                  {isAr ? 'علبة' : isKu ? 'قوتی' : 'Box'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => updateSaleType(item.product.id, item.saleType, 'wholesale')}
                                  className={`px-1 py-0.5 text-[8.5px] font-bold rounded transition-all flex-1 text-center whitespace-nowrap ${
                                    item.saleType === 'wholesale'
                                      ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                  title={isAr ? 'بيع بسعر الجملة' : isKu ? 'فرۆشتن بە کۆ' : 'Wholesale'}
                                >
                                  {isAr ? 'جملة' : isKu ? 'کۆ' : 'WS'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => updateSaleType(item.product.id, item.saleType, 'carton')}
                                  className={`px-1 py-0.5 text-[8.5px] font-bold rounded transition-all flex-1 text-center whitespace-nowrap ${
                                    item.saleType === 'carton'
                                      ? 'bg-emerald-600 text-slate-950 font-extrabold shadow-sm'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                  title={isAr ? 'بيع بالكرتون' : isKu ? 'فرۆشتن بە کارتۆن' : 'Carton'}
                                >
                                  {isAr ? 'كرتون' : isKu ? 'کارتۆن' : 'CT'}
                                </button>
                              </div>
                            </div>

                            {/* 5. Quantity Controls */}
                            <div className="w-18 shrink-0 flex flex-col items-center">
                              <span className="lg:hidden text-[8.5px] text-emerald-400 mb-0.5 font-bold">{isAr ? 'العدد' : isKu ? 'ژمارە' : 'Qty'}</span>
                              <div className="flex items-center space-x-0.5 rtl:space-x-reverse bg-slate-900 border border-slate-800 rounded-lg p-0.5 w-full justify-between">
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.saleType, -1)}
                                  className="p-0.5 hover:bg-slate-800 rounded text-slate-300 active:scale-95"
                                  title={isAr ? 'إنقاص العدد' : isKu ? 'کەمکردنەوەی ژمارە' : 'Decrease'}
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="text-[11px] font-bold text-white px-0.5 font-mono">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.saleType, 1)}
                                  className="p-0.5 hover:bg-slate-800 rounded text-slate-300 active:scale-95"
                                  title={isAr ? 'زيادة العدد' : isKu ? 'زیادکردنی ژمارە' : 'Increase'}
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>

                            {/* 6. Total for this line */}
                            <div className="w-24 shrink-0 flex flex-col items-center">
                              <span className="lg:hidden text-[10px] text-emerald-400 mb-0.5 font-bold">{isAr ? 'المجموع' : isKu ? 'کۆی گشتی' : 'Total'}</span>
                              <div className="px-1.5 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-center w-full">
                                <p className="text-[15px] font-black text-emerald-400 font-mono truncate leading-none">
                                  {settings.currencySymbol}{formatNumber(unitPrice * item.quantity)}
                                </p>
                              </div>
                            </div>

                            {/* 7. Remove Button */}
                            <div className="w-6 shrink-0 flex items-center justify-center">
                              <button
                                onClick={() => removeFromCart(item.product.id, item.saleType)}
                                className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                                title={isAr ? 'حذف من السلة' : isKu ? 'سڕینەوە لە سەبەتە' : 'Remove item'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Mobile Quick Proceed to Payment Button */}
            {cart.length > 0 && (
              <div className="lg:hidden shrink-0 pt-1">
                <button
                  type="button"
                  onClick={() => setMobilePosTab('checkout')}
                  className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-black text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-between cursor-pointer active:scale-95 transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    <span>{isAr ? 'متابعة للدفع وإنهاء البيع' : isKu ? 'تەواوکردنی پارەدان' : 'Proceed to Payment'}</span>
                  </span>
                  <span className="font-mono text-sm font-black bg-emerald-950/80 px-2.5 py-0.5 rounded-xl border border-emerald-300/40">
                    {settings.currencySymbol}{formatNumber(grandTotal)}
                  </span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* CUSTOMER DISPLAY EMBEDDED SIDE PANEL (Visible when side panel toggled on xl+ screens) */}
        {showCustomerDisplaySidePanel && (
          <div className="hidden xl:flex xl:col-span-4 flex-col h-full min-h-0 overflow-hidden rounded-3xl border border-cyan-500/40 shadow-2xl bg-[#080D1A] animate-fadeIn relative">
            <CustomerDisplayScreen
              isStandalone={false}
              isEmbeddedSidePanel={true}
              onClose={() => setShowCustomerDisplaySidePanel(false)}
            />
          </div>
        )}

      </div>

    </div>

      {/* STORE INVENTORY MODAL / OVERLAY (REVEALED WHEN BUTTON CLICKED) */}
      {showInventory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0B1120] border border-emerald-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col justify-between shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#070D1C]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <Package className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isAr ? 'مواد المخزن المتوفرة للبيع' : isKu ? 'کاڵا بەردەستەکانی کۆگا بۆ فرۆشتن' : 'Store Stock Inventory Catalog'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'تصفح كافة السلع والمنتجات وانقر لإضافتها مباشرة إلى سلة المبيعات' : isKu ? 'گەڕان لە هەموو دەرمانەکان و کلیک بکە بۆ زیادکردن بۆ سەبەتە' : 'Browse products and tap to add straight to sales cart'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowInventory(false)}
                className="p-2 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls (Search & Category Chips) */}
            <div className="p-4 border-b border-slate-800 bg-[#0B1120] space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isAr ? 'بحث فوري باسم المنتج، الفئة، أو رقم الباركود...' : isKu ? 'گەڕانی خێرا بە ناوی دەرمان، بەش، یان بارکۆد...' : 'Fast search product name, category, or barcode...'}
                  className="w-full bg-[#070D1C] text-xs text-slate-200 placeholder-slate-500 pl-10 rtl:pl-8 rtl:pr-10 pr-8 py-2.5 rounded-xl border border-blue-500/20 focus:outline-none focus:border-emerald-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setSelectedCat('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
                    selectedCat === 'ALL'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow'
                      : 'bg-[#070D1C] text-slate-400 hover:text-white'
                  }`}
                >
                  🔥 {isAr ? 'الكل' : isKu ? 'هەموو' : 'All'}
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.labelEn}
                    onClick={() => setSelectedCat(cat.labelEn)}
                    className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-all flex items-center gap-1 ${
                      selectedCat === cat.labelEn
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow'
                        : 'bg-[#070D1C] text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{isAr ? cat.labelAr : isKu ? cat.labelAr : cat.labelEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Grid List (Compact & Responsive Grid) */}
            <div className="p-3 sm:p-4 overflow-y-auto max-h-[60vh] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5">
              {paginatedInventoryProducts.map(p => {
                const totalUnitsInCart = cart
                  .filter(c => c.product.id === p.id)
                  .reduce((sum, item) => {
                    if (item.saleType === 'carton') {
                      const upc = (p.unitsPerCarton && p.unitsPerCarton > 0) ? p.unitsPerCarton : 1;
                      return sum + (item.quantity * upc);
                    }
                    return sum + item.quantity;
                  }, 0);
                const remainingStock = p.stock - totalUnitsInCart;
                const retailP = p.singleRetailPrice || p.price;
                const wholesaleP = p.wholesalePrice || (p.price * 0.85);
                const cartonP = p.cartonSellingPrice || (p.price * 10);

                return (
                  <div
                    key={p.id}
                    className={`p-2 sm:p-2.5 rounded-2xl text-right rtl:text-right border transition-all flex flex-col justify-between space-y-2 ${
                      remainingStock <= 0
                        ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400'
                        : 'bg-[#070D1C] border-blue-500/20 hover:border-emerald-500/60'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xl p-1 rounded-lg bg-slate-800/80">{p.imageIcon}</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full ${
                          remainingStock <= 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {remainingStock <= 0 ? (isAr ? 'نفد (متاح)' : isKu ? 'تەواوبوو' : '0 left') : `${remainingStock} ${p.unit}`}
                        </span>
                        {totalUnitsInCart > 0 && (
                          <span className="bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full">
                            +{totalUnitsInCart} {isAr ? 'بالسلة' : isKu ? 'لە سەبەتەدا' : 'in cart'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-200 line-clamp-1" title={isAr ? p.nameAr : isKu ? p.nameAr : p.name}>
                        {isAr ? p.nameAr : isKu ? p.nameAr : p.name}
                      </p>
                      <p className="text-[9.5px] text-slate-400 font-mono truncate">
                        {p.barcode}
                      </p>
                    </div>

                    {/* Prices Breakdown: Retail / Wholesale / Carton */}
                    <div className="bg-[#0B1120] p-1.5 rounded-xl border border-slate-800/80 text-[9.5px] space-y-0.5">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-cyan-400 font-semibold">{isAr ? 'مفرد:' : isKu ? 'تاک:' : 'Ret:'}</span>
                        <span className="font-mono font-bold text-slate-100">{settings.currencySymbol}{formatNumber(retailP)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-amber-400 font-semibold">{isAr ? 'جملة:' : isKu ? 'کۆ:' : 'WS:'}</span>
                        <span className="font-mono font-bold text-slate-100">{settings.currencySymbol}{formatNumber(wholesaleP)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-purple-400 font-semibold">{isAr ? 'كرتون:' : isKu ? 'کارتۆن:' : 'Ctn:'}</span>
                        <span className="font-mono font-bold text-slate-100">{settings.currencySymbol}{formatNumber(cartonP)}</span>
                      </div>
                    </div>

                    {/* Quick Add Buttons (Always Enabled Even If Stock is 0) */}
                    <div className="grid grid-cols-3 gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => addToCart(p, 'retail')}
                        className="py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-[9.5px] font-bold border border-cyan-500/30 transition-all flex items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isAr ? 'مفرد' : isKu ? 'تاک' : 'Ret'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => addToCart(p, 'wholesale')}
                        className="py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[9.5px] font-bold border border-amber-500/30 transition-all flex items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isAr ? 'جملة' : isKu ? 'کۆ' : 'WS'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => addToCart(p, 'carton')}
                        className="py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-slate-950 text-[9.5px] font-bold border border-purple-500/30 transition-all flex items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isAr ? 'كرتون' : isKu ? 'کارتۆن' : 'Ctn'}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Modal Footer with Pagination Controls */}
            <div className="p-4 border-t border-slate-800 bg-[#070D1C] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-semibold">
                  {isAr ? `إجمالي المواد المطابقة: ${filteredProducts.length}` : isKu ? `کۆی گشتی کاڵاکان: ${filteredProducts.length}` : `Total items: ${filteredProducts.length}`}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({(safeInventoryPage - 1) * INVENTORY_PAGE_SIZE + 1} - {Math.min(safeInventoryPage * INVENTORY_PAGE_SIZE, filteredProducts.length)})
                </span>
              </div>

              {totalInventoryPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeInventoryPage <= 1}
                    onClick={() => setInventoryPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
                    <span>{isAr ? 'السابق' : isKu ? 'پێشوو' : 'Prev'}</span>
                  </button>

                  <span className="px-3 py-1 bg-slate-900 border border-slate-700/60 rounded-xl text-xs font-mono font-bold text-emerald-400">
                    {safeInventoryPage} / {totalInventoryPages}
                  </span>

                  <button
                    type="button"
                    disabled={safeInventoryPage >= totalInventoryPages}
                    onClick={() => setInventoryPage(prev => Math.min(totalInventoryPages, prev + 1))}
                    className="p-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isAr ? 'التالي' : isKu ? 'دواتر' : 'Next'}</span>
                    <ChevronLeft className="w-4 h-4 rtl:rotate-0 rotate-180" />
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowInventory(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5"
              >
                <span>{isAr ? 'العودة إلى سلة المبيعات' : isKu ? 'گەڕانەوە بۆ سەبەتەی فرۆشتن' : 'Return to Sales Cart'}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PHARMACY PRESCRIPTION & PATIENT MODAL */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0B1120] border border-cyan-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'بيانات الوصفة الدوائية والمريض' : isKu ? 'زانیاری ڕەچەتەی پزیشکی و نەخۆش' : 'Prescription & Patient Info'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'تسجيل اسم الطبيب المعالج والمعلومات لإضافتها للفاتورة' : isKu ? 'تۆمارکردنی ناوی پزیشک و نەخۆش بۆ پسوولە' : 'Record doctor and patient details for this transaction'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">{isAr ? 'اسم الطبيب المعالج / العيادة:' : isKu ? 'ناوی پزیشک / کلینیک:' : 'Doctor / Clinic Name:'}</label>
                <input
                  type="text"
                  value={prescriptionInfo.doctorName}
                  onChange={(e) => setPrescriptionInfo(prev => ({ ...prev, doctorName: e.target.value }))}
                  placeholder={isAr ? 'مثال: د. أحمد السامرائي - اختصاص باطنية' : isKu ? 'نموونە: د. ئارام علی - پسپۆڕی هەناوی' : 'e.g. Dr. John Smith'}
                  className="w-full bg-[#070D1C] text-slate-100 p-2.5 rounded-xl border border-slate-700 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">{isAr ? 'اسم المريض:' : isKu ? 'ناوی نەخۆش:' : 'Patient Name:'}</label>
                  <input
                    type="text"
                    value={prescriptionInfo.patientName}
                    onChange={(e) => setPrescriptionInfo(prev => ({ ...prev, patientName: e.target.value }))}
                    placeholder={isAr ? 'اسم المريض الثلاثي' : isKu ? 'ناوی سیانی نەخۆش' : 'Patient full name'}
                    className="w-full bg-[#070D1C] text-slate-100 p-2.5 rounded-xl border border-slate-700 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">{isAr ? 'عمر المريض / هاتف:' : isKu ? 'تەمەن / مۆبایل:' : 'Age / Phone:'}</label>
                  <input
                    type="text"
                    value={prescriptionInfo.patientAge}
                    onChange={(e) => setPrescriptionInfo(prev => ({ ...prev, patientAge: e.target.value }))}
                    placeholder={isAr ? 'مثال: 34 سنة' : isKu ? 'نموونە: 34 ساڵ' : 'e.g. 34 yrs'}
                    className="w-full bg-[#070D1C] text-slate-100 p-2.5 rounded-xl border border-slate-700 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">{isAr ? 'تشخيص / ملاحظات التناوب والتحذيرات:' : isKu ? 'تێبینی دەرمانساز و ڕێنمایی بەکارهێنان:' : 'Diagnosis / Special Precautions:'}</label>
                <textarea
                  rows={2}
                  value={prescriptionInfo.prescriptionNotes}
                  onChange={(e) => setPrescriptionInfo(prev => ({ ...prev, prescriptionNotes: e.target.value }))}
                  placeholder={isAr ? 'ملاحظات الصيدلي (مثل: يمنع مع مرضى الضغط، تؤخذ الحبة بعد الأكل)' : isKu ? 'ڕێنمایی دەرمانساز (وەک: دوای نان بخورێت، بۆ پەستانی خوێن نابێت)' : 'Pharmacist precautions...'}
                  className="w-full bg-[#070D1C] text-slate-100 p-2.5 rounded-xl border border-slate-700 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all"
              >
                {isAr ? 'حفظ وإغلاق' : isKu ? 'پاشەکەوت و داخستن' : 'Save & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHARMACY DRUG ALTERNATIVES MODAL */}
      {showAlternativesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0B1120] border border-cyan-500/40 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'محرك البحث عن بدائل الأدوية بالمادة الفعالة' : isKu ? 'بزوێنەری گەڕان بۆ بەدیلی دەرمانەکان' : 'Drug Alternatives Finder'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'ابحث باسم المادة الفعالة (Scientific Name) لإيجاد الأدوية البديلة المتوفرة بالمخزن' : isKu ? 'گەڕان بە ناوی زانستی بۆ دۆزینەوەی دەرمانی بەدیل لە کۆگادا' : 'Find alternative medicines sharing the active ingredient in inventory'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAlternativesModal(false);
                  setAlternativeSearch('');
                }}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alternative Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                value={alternativeSearch}
                onChange={(e) => setAlternativeSearch(e.target.value)}
                placeholder={isAr ? 'اكتب المادة الفعالة (مثلاً: Paracetamol, Ibuprofen, Amoxicillin)...' : isKu ? 'ناوی مادەی چالاک بنووسە (وەک: Paracetamol, Ibuprofen, Amoxicillin)...' : 'Search active ingredient (e.g. Paracetamol, Amoxicillin)...'}
                className="w-full bg-[#070D1C] text-xs font-mono text-cyan-200 placeholder-slate-500 pl-9 rtl:pl-8 rtl:pr-9 pr-8 py-2.5 rounded-xl border border-cyan-500/40 focus:border-cyan-300 focus:outline-none"
              />
              {alternativeSearch && (
                <button
                  type="button"
                  onClick={() => setAlternativeSearch('')}
                  className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Active Ingredient Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-400 font-bold shrink-0">{isAr ? 'المواد الأكثر تداولاً:' : isKu ? 'مادە باوەکان:' : 'Common:'}</span>
              {['Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Omeprazole', 'Cetirizine'].map(ing => (
                <button
                  key={ing}
                  type="button"
                  onClick={() => setAlternativeSearch(ing)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950 text-cyan-300 border border-cyan-500/30 shrink-0 font-mono font-bold"
                >
                  🧪 {ing}
                </button>
              ))}
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredAlternatives.map(p => {
                const retailP = p.singleRetailPrice || p.price;
                  const inCartCount = cart
                    .filter(c => c.product.id === p.id)
                    .reduce((sum, item) => {
                      if (item.saleType === 'carton') {
                        const upc = (p.unitsPerCarton && p.unitsPerCarton > 0) ? p.unitsPerCarton : 1;
                        return sum + (item.quantity * upc);
                      }
                      return sum + item.quantity;
                    }, 0);
                  const remainingStock = p.stock - inCartCount;

                  return (
                    <div
                      key={p.id}
                      className="bg-[#070D1C] p-3 rounded-2xl border border-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-xl bg-slate-800/80">{p.imageIcon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">{isAr ? p.nameAr : p.name}</h4>
                            {p.scientificName && (
                              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono">
                                🧪 {p.scientificName}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{p.dosageForm || (isAr ? 'عقار طبي' : isKu ? 'دەرمان' : 'Medicine')}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-mono font-bold">{settings.currencySymbol}{formatNumber(retailP)}</span>
                            <span>•</span>
                            <span className={remainingStock > 0 ? 'text-cyan-300 font-bold' : 'text-rose-400 font-bold'}>
                              {isAr ? `المتوفر: ${remainingStock}` : isKu ? `بەردەست: ${remainingStock}` : `Stock: ${remainingStock}`}
                            </span>
                            {inCartCount > 0 && (
                              <span className="text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-500/30 text-[9px]">
                                +{inCartCount} {isAr ? 'بالسلة' : isKu ? 'لە سەبەتەدا' : 'in cart'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          addToCart(p, 'retail');
                          setShowAlternativesModal(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs border border-cyan-400/40 shadow-lg cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إضافة للسلة' : isKu ? 'بۆ سەبەتە' : 'Add to Cart'}</span>
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* DAMAGED / BROKEN / EXPIRED ITEMS MODAL */}
      <DamagedItemsModal
        isOpen={isDamagedModalOpen}
        onClose={() => setIsDamagedModalOpen(false)}
        products={products}
        setProducts={setProducts}
        settings={settings}
      />

      {/* YELLOW LINE DETAILS & DIAGNOSTICS HUB MODAL */}
      {showYellowLineModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-[#0B1120] border-2 border-amber-500/60 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col justify-between shadow-[0_0_35px_rgba(245,158,11,0.25)] overflow-hidden">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-amber-500/30 flex items-center justify-between bg-[#070D1C]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{isAr ? 'مركز تفاصيل وميزات الخط الأصفر' : isKu ? 'ناوەندی وردەکاری و تایبەتمەندیەکانی هێڵی زەرد' : 'Yellow Line Hub & Diagnostics'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-500 text-slate-950">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr 
                      ? 'تفاصيل محرك الباركود، رصيد المخزن الفوري، النوافذ النشطة والإجراءات السريعة' 
                      : isKu 
                      ? 'وردەکاری بزوێنەری بارکۆد، ئاماری ڕاستەوخۆی کۆگا و پەنجەرە چالاکەکان' 
                      : 'Live barcode engine telemetry, store stock status, active carts, and quick actions'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowYellowLineModal(false)}
                className="p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar text-xs">
              
              {/* Telemetry Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-[#070D1C] p-3 rounded-2xl border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>{isAr ? 'حالة الماسح' : isKu ? 'دۆخی سکانەر' : 'Scanner State'}</span>
                    <BarcodeIcon className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-sm font-black text-emerald-400 flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {isAr ? 'متصل وجاهز' : isKu ? 'پەیوەستە و ئامادەیە' : 'Ready / Active'}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {isAr ? `اختصار: [${posShortcuts.focusBarcode}]` : isKu ? `کورتکراوە: [${posShortcuts.focusBarcode}]` : `Shortcut: [${posShortcuts.focusBarcode}]`}
                  </p>
                </div>

                <div className="bg-[#070D1C] p-3 rounded-2xl border border-emerald-500/30 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>{isAr ? 'أصناف المخزن' : isKu ? 'جۆری کاڵاکان' : 'Total SKUs'}</span>
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-sm font-black text-emerald-300 font-mono">
                    {products.length} {isAr ? 'صنف' : isKu ? 'کاڵا' : 'items'}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {isAr ? 'إجمالي المواد المسجلة' : isKu ? 'کۆی کاڵا تۆمارکراوەکان' : 'Registered in catalog'}
                  </p>
                </div>

                <div className="bg-[#070D1C] p-3 rounded-2xl border border-cyan-500/30 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>{isAr ? 'نوافذ البيع المفتوحة' : isKu ? 'پەنجەرە کراوەکان' : 'Active Windows'}</span>
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-sm font-black text-cyan-300 font-mono">
                    {windows.length} {isAr ? 'نافذة' : isKu ? 'پەنجەرە' : 'tabs'}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {windows.reduce((sum, w) => sum + w.cart.length, 0)} {isAr ? 'مواد بالسلال' : isKu ? 'کاڵا لە سەبەتەدا' : 'items in carts'}
                  </p>
                </div>

                <div className="bg-[#070D1C] p-3 rounded-2xl border border-rose-500/30 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>{isAr ? 'وضع المرتجعات' : isKu ? 'دۆخی گەڕاندنەوە' : 'Return Mode'}</span>
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className={`text-sm font-black font-mono ${isReturnMode ? 'text-rose-400' : 'text-slate-400'}`}>
                    {isReturnMode ? (isAr ? 'نشط ومفعل' : isKu ? 'چالاکە' : 'Active') : (isAr ? 'غير مفعل' : isKu ? 'ناچالاکە' : 'Inactive')}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {isReturnMode ? (isAr ? 'السلة تقبل المرتجع' : isKu ? 'گەڕاندنەوە کاردەکات' : 'Restocking mode') : (isAr ? 'وضع البيع العادي' : isKu ? 'دۆخی فرۆشتنی ئاسایی' : 'Standard sale')}
                  </p>
                </div>
              </div>

              {/* Quick Barcode Scanner Tester */}
              <div className="bg-[#070D1C] p-3.5 sm:p-4 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarcodeIcon className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-white text-xs">
                      {isAr ? 'فاحص الباركود وباحث الأسعار الفوري' : isKu ? 'تاقیکەرەوەی بارکۆد و بینەری خێرای نرخ' : 'Quick Barcode & Price Lookup'}
                    </h4>
                  </div>
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30">
                    {isAr ? 'جرّب كتابة أو قراءة أي باركود' : isKu ? 'تاقیبکەرەوە بە خوێندنەوەی بارکۆد' : 'Type or scan barcode'}
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={isAr ? 'اكتب اسم المادة أو الباركود لعرض تفاصيلها الكاملة وأسعارها...' : isKu ? 'ناوی کاڵا یان بارکۆد بنووسە بۆ بینینی وردەکاری و نرخەکان...' : 'Search barcode or name...'}
                    className="w-full bg-[#0B1120] text-xs font-mono text-cyan-200 placeholder-slate-500 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl border border-amber-500/30 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Match Preview Card */}
                {search.trim() && filteredProducts.length > 0 && (
                  <div className="p-3 rounded-2xl bg-[#0B1120] border border-emerald-500/40 flex items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl p-1.5 rounded-xl bg-slate-800">{filteredProducts[0].imageIcon || '📦'}</span>
                      <div className="min-w-0">
                        <h5 className="font-bold text-white text-xs truncate">
                          {isAr ? filteredProducts[0].nameAr : isKu ? filteredProducts[0].nameAr : filteredProducts[0].name}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {isAr ? 'باركود:' : isKu ? 'بارکۆد:' : 'Barcode:'} {filteredProducts[0].barcode} • {isAr ? 'المتوفر:' : isKu ? 'بەردەست:' : 'Stock:'} {filteredProducts[0].stock}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right rtl:text-right ltr:text-left">
                        <span className="text-xs font-black font-mono text-emerald-400 block">
                          {settings.currencySymbol}{formatNumber(filteredProducts[0].singleRetailPrice || filteredProducts[0].price)}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {isAr ? 'سعر المفرد' : isKu ? 'نرخی تاک' : 'Retail Price'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          addToCart(filteredProducts[0], 'retail');
                          setShowYellowLineModal(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إضافة للسلة' : isKu ? 'بۆ سەبەتە' : 'Add to Cart'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Instant Quick Actions */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isAr ? 'الإجراءات السريعة الفورية' : isKu ? 'کردارە خێراکان' : 'Instant Quick Actions'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowYellowLineModal(false);
                      setShowInventory(true);
                    }}
                    className="p-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-2.5 transition-all text-right rtl:text-right ltr:text-left cursor-pointer"
                  >
                    <Package className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs text-white">{isAr ? 'فتح المخزن الشامل' : isKu ? 'کردنەوەی کۆگای گشتی' : 'Open Store Catalog'}</div>
                      <div className="text-[10px] text-slate-400">{isAr ? 'تصفح كل المواد وإضافتها' : isKu ? 'گەڕان لە هەموو کاڵاکان' : 'Browse & add all items'}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowYellowLineModal(false);
                      if (onOpenSalesReturn) {
                        onOpenSalesReturn();
                      } else {
                        setIsReturnMode(!isReturnMode);
                      }
                    }}
                    className="p-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-bold flex items-center gap-2.5 transition-all text-right rtl:text-right ltr:text-left cursor-pointer"
                  >
                    <RotateCcw className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <div className="text-xs text-white">{isAr ? 'واجهة إرجاع الفواتير' : isKu ? 'واژەی گەڕاندنەوەی پسوولەکان' : 'Sales Return Hub'}</div>
                      <div className="text-[10px] text-slate-400">{isAr ? 'استرجاع الفواتير السابقة' : isKu ? 'گەڕاندنەوە لە وەسڵە کۆنەکان' : 'Refund from receipts'}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowYellowLineModal(false);
                      handleAddWindow();
                    }}
                    className="p-3 rounded-2xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-2.5 transition-all text-right rtl:text-right ltr:text-left cursor-pointer"
                  >
                    <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-xs text-white">{isAr ? 'إضافة نافذة بيع جديدة' : isKu ? 'زیادکردنی پەنجەرەی نوێ' : 'Add Sales Window'}</div>
                      <div className="text-[10px] text-slate-400">{isAr ? 'فتح كاشير متعدد متزامن' : isKu ? 'پەنجەرەی هاوکات' : 'Parallel cart window'}</div>
                    </div>
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-[#070D1C] flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                {isAr ? 'نظام الباركود الذكي نشط وجاهز للعمل' : isKu ? 'سیستەمی بارکۆدی زیرەک چالاکە' : 'Barcode engine online & active'}
              </span>
              <button
                type="button"
                onClick={() => setShowYellowLineModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all"
              >
                {isAr ? 'إغلاق النافذة' : isKu ? 'داخستن' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Customer Display Copied Toast Notification */}
      {customerDisplayCopiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-cyan-950/95 border-2 border-cyan-400 text-cyan-100 px-4 py-3 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-2.5 animate-fadeIn text-xs font-bold backdrop-blur-md">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <Check className="w-4 h-4 text-cyan-300 shrink-0" />
          <span>{isAr ? 'تم نسخ رابط شاشة الزبون بنجاح! يمكنك فتحه على شاشة ثانية، آيباد أو هاتف محمول.' : 'Customer display link copied! Open on secondary monitor or tablet.'}</span>
        </div>
      )}

      {/* KIOSK / SILENT PRINTING CONFIGURATION MODAL */}
      <KioskPrintModal
        isOpen={showKioskModal}
        onClose={() => setShowKioskModal(false)}
        lang={lang}
        settings={settings}
      />

    </div>
  );
};
