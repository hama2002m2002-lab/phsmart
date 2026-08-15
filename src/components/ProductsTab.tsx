import React, { useState, useRef, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Filter, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Barcode as BarcodeIcon, 
  LayoutGrid, 
  List, 
  Calendar,
  Layers,
  Sparkles,
  Calculator,
  UserCheck,
  LayoutDashboard,
  ClipboardCheck,
  FileSpreadsheet,
  Printer,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { Product, Category, StoreSettings } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { getSavedCategories } from './ProductModal';
import { InventoryAuditModal } from './InventoryAuditModal';
import { PriceHistoryTooltip } from './PriceHistoryTooltip';
import { exportProductsToExcel, parseExcelBackupFile } from '../lib/excelExport';
import { syncBulkWriteCollection } from '../lib/firestoreSync';

interface ProductsTabProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
  onOpenAddModal: () => void;
  onEditProduct: (product: Product) => void;
  onBackToDashboard?: () => void;
  onOpenPrintBarcode?: (product?: Product) => void;
}

const CATEGORIES = [
  'الألبان والحليب',
  'المشروبات والقهوة',
  'السلع والحلويات',
  'المخبوزات والخبز',
  'اللحوم والدواجن',
  'الخضار والفواكه',
  'الأغذية المجمدة',
  'المعلبات والزيوت',
  'المنظفات والعناية',
];

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  setProducts,
  settings,
  onOpenAddModal,
  onEditProduct,
  onBackToDashboard,
  onOpenPrintBarcode,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const t = (ar: string, ku: string, en: string) => isKu ? ku : isAr ? ar : en;

  // Retain active subview in session so updates and hot reloads don't kick user out of their open warehouse view
  const [activeSubView, setActiveSubView] = useState<'catalog' | 'stockStatus' | null>(() => {
    try {
      const saved = sessionStorage.getItem('supermarket_warehouse_subview');
      if (saved === 'catalog' || saved === 'stockStatus') return saved;
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    try {
      if (activeSubView) {
        sessionStorage.setItem('supermarket_warehouse_subview', activeSubView);
      } else {
        sessionStorage.removeItem('supermarket_warehouse_subview');
      }
    } catch (e) {}
  }, [activeSubView]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW' | 'OUT' | 'DEBT'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [importBanner, setImportBanner] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const savedCats = getSavedCategories();
  const productCats = products.map(p => p.categoryAr || p.category).filter(Boolean);
  const categoriesList = Array.from(new Set([...CATEGORIES, ...savedCats, ...productCats]));

  // Stats calculation
  const totalProductsCount = products.length;
  const inStockCount = products.filter(p => p.stock > p.minStock).length;
  const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const debtStockProducts = products.filter(p => p.stock < 0);

  const filteredProducts = products.filter(p => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(searchLower) ||
      p.nameAr.includes(search) ||
      p.barcode.includes(search) ||
      (p.supplierDelegate && p.supplierDelegate.includes(search));
    
    const matchesCat = selectedCat === 'ALL' || p.categoryAr === selectedCat || p.category === selectedCat;
    
    let matchesStock = true;
    if (stockFilter === 'IN_STOCK') {
      matchesStock = p.stock > p.minStock;
    } else if (stockFilter === 'LOW') {
      matchesStock = p.stock <= p.minStock && p.stock > 0;
    } else if (stockFilter === 'OUT') {
      matchesStock = p.stock === 0;
    } else if (stockFilter === 'DEBT') {
      matchesStock = p.stock < 0;
    }

    return matchesSearch && matchesCat && matchesStock;
  });

  const handleDeleteProduct = (id: string) => {
    if (confirm(isAr ? 'هل أنت متأكد من حذف هذه المادة؟' : isKu ? 'دڵنیایت لە سڕینەوەی ئەم کاڵایە؟' : 'Are you sure you want to delete this product?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleStockAdjustment = (id: string, delta: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const newCartons = Math.max(0, p.cartonsCount + delta);
        const newTotalUnits = newCartons * p.unitsPerCarton;
        const status = newTotalUnits === 0 ? 'out_of_stock' : newTotalUnits <= p.minStock ? 'low_stock' : 'in_stock';
        return { 
          ...p, 
          cartonsCount: newCartons,
          totalUnits: newTotalUnits,
          stock: newTotalUnits, 
          status 
        };
      }
      return p;
    }));
  };

  const isLight = settings.themeMode === 'light';

  // 1. Initial State: Show the THREE main dedicated buttons/cards when opening Warehouse
  if (activeSubView === null) {
    return (
      <div className="space-y-6 animate-fadeIn w-full max-w-6xl mx-auto py-4 px-2">
        {/* Header Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
          isLight
            ? 'bg-white border-slate-200 shadow-md text-slate-900'
            : 'bg-[#10192D] border-blue-500/20 shadow-xl text-white'
        }`}>
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer shadow ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                }`}
                title={t('الرجوع للقائمة الرئيسية', 'گەڕانەوە بۆ پێڕستی سەرەکی', 'Back to Main Menu')}
              >
                <LayoutDashboard className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-cyan-400'}`} />
                <span>{t('القائمة الرئيسية', 'پێڕستی سەرەکی', 'Main Menu')}</span>
              </button>
            )}

            <div>
              <h2 className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                <Package className={`w-5 h-5 shrink-0 ${isLight ? 'text-blue-600' : 'text-cyan-400'}`} />
                <span>{t('إدارة وأقسام المخزن', 'بەشەکانی کۆگا و کاڵاکان', 'Warehouse & Inventory Hub')}</span>
              </h2>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('يرجى اختيار القسم المطلوب للمتابعة والإدارة السريعة', 'تکایە بەشێک هەڵبژێرە بۆ بەڕێوەبردن و بەدواداچوونی خێرا', 'Please select a section to manage')}
              </p>
            </div>
          </div>
        </div>

        {/* The THREE Main Dedicated Buttons / Cards (All equal size & theme reactive) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          
          {/* Button 1: إدخال مادة جديدة (زیادکردنی کاڵای نوێ) */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className={`group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl border-2 transition-all duration-300 text-left rtl:text-right cursor-pointer active:scale-[0.98] ${
              isLight
                ? 'bg-white border-emerald-200 hover:border-emerald-500 shadow-md hover:shadow-xl'
                : 'bg-gradient-to-br from-[#061C14] via-[#0B2E21] to-[#04160F] border-emerald-500/40 hover:border-emerald-400 hover:shadow-[0_0_35px_rgba(16,185,129,0.35)]'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
                  <Plus className="w-7 h-7 text-white stroke-[2.5]" />
                </div>
                <span className={`px-3.5 py-1.5 rounded-xl font-mono font-black text-xs sm:text-sm shadow border ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                }`}>
                  + {t('مادة جديدة', 'کاڵای نوێ', 'New Item')}
                </span>
              </div>

              <div>
                <h3 className={`text-lg sm:text-xl font-black transition-colors flex items-center gap-2 ${
                  isLight
                    ? 'text-slate-900 group-hover:text-emerald-700'
                    : 'text-white group-hover:text-emerald-300'
                }`}>
                  <span>{t('إدخال مادة جديدة', 'زیادکردنی کاڵای نوێ', 'New Product Entry')}</span>
                </h3>
                <p className={`text-xs sm:text-sm mt-2 leading-relaxed ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {t(
                    'تسجيل مادة جديدة، إدخال الباركود، الاسم التجاري والعلمي، كلفة الكرتون، أسعار البيع، والكميات.',
                    'تۆمارکردنی کاڵای نوێ، بارکۆد، ناوی بازرگانی و زانستی، تێچووی کارتۆن، نرخی فرۆشتن و بڕی سەرەتایی.',
                    'Register new products, enter barcodes, trade/scientific names, carton costs, sell prices, and initial stock.'
                  )}
                </p>
              </div>
            </div>

            <div className={`mt-6 pt-4 border-t flex items-center justify-between font-bold text-xs ${
              isLight
                ? 'border-slate-100 text-emerald-700'
                : 'border-slate-800/80 text-emerald-400'
            }`}>
              <span>{t('فتح نافذة إدخال مادة جديدة ←', 'کردنەوەی فۆڕمی زیادکردن ←', 'Open Product Entry Form →')}</span>
              <span className={`px-2.5 py-1 rounded-lg font-mono text-[11px] ${
                isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/10 text-emerald-300'
              }`}>
                {t('نموذج جديد', 'فۆڕمی نوێ', 'New Form')}
              </span>
            </div>
          </button>

          {/* Button 2: دليل وسجل المواد والأسعار (ڕێبەری کاڵاکان و نرخەکان) */}
          <button
            type="button"
            onClick={() => setActiveSubView('catalog')}
            className={`group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl border-2 transition-all duration-300 text-left rtl:text-right cursor-pointer active:scale-[0.98] ${
              isLight
                ? 'bg-white border-blue-200 hover:border-blue-500 shadow-md hover:shadow-xl'
                : 'bg-gradient-to-br from-[#0B1528] via-[#0F1D38] to-[#0A1224] border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_35px_rgba(6,182,212,0.35)]'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:scale-110 transition-transform">
                  <Package className="w-7 h-7 text-white" />
                </div>
                <span className={`px-3.5 py-1.5 rounded-xl font-mono font-black text-xs sm:text-sm shadow border ${
                  isLight
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                }`}>
                  {products.length} {t('مادة', 'کاڵا', 'Items')}
                </span>
              </div>

              <div>
                <h3 className={`text-lg sm:text-xl font-black transition-colors flex items-center gap-2 ${
                  isLight
                    ? 'text-slate-900 group-hover:text-blue-700'
                    : 'text-white group-hover:text-cyan-300'
                }`}>
                  <span>{t('دليل وسجل المواد والأسعار', 'ڕێبەری کاڵاکان و نرخەکان', 'Products & Price Catalog')}</span>
                </h3>
                <p className={`text-xs sm:text-sm mt-2 leading-relaxed ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {t(
                    'شاشة عرض شاملة لكل معلومات المواد، الباركود، تكاليف الشراء، أسعار البيع المفرد والجملة، والأرباح مع إمكانية التعديل والإضافة.',
                    'بینراوی گشتگیر بۆ زانیاری کاڵاکان، بارکۆد، تێچووی کڕین، نرخی فرۆشتنی تاک و کۆ، و قازانجەکان لەگەڵ دەستکاری و زیادکردن.',
                    'Full display interface for all product details, barcodes, costs, retail/wholesale selling prices, and profits.'
                  )}
                </p>
              </div>
            </div>

            <div className={`mt-6 pt-4 border-t flex items-center justify-between font-bold text-xs ${
              isLight
                ? 'border-slate-100 text-blue-700'
                : 'border-slate-800/80 text-cyan-400'
            }`}>
              <span>{t('فتح دليل وسجل المواد ←', 'کردنەوەی ڕێبەری کاڵاکان ←', 'Open Products Catalog →')}</span>
              <span className={`px-2.5 py-1 rounded-lg font-mono text-[11px] ${
                isLight ? 'bg-blue-100 text-blue-800' : 'bg-cyan-500/10 text-cyan-300'
              }`}>
                {t('عرض شامل', 'بینراوی تەواو', 'Full View')}
              </span>
            </div>
          </button>

          {/* Button 3: المواد المتبقية والنافذة - حالة المخزون (کاڵا ماوەکان و تەواوبووەکان) */}
          <button
            type="button"
            onClick={() => setActiveSubView('stockStatus')}
            className={`group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl border-2 transition-all duration-300 text-left rtl:text-right cursor-pointer active:scale-[0.98] ${
              isLight
                ? 'bg-white border-amber-200 hover:border-amber-500 shadow-md hover:shadow-xl'
                : 'bg-gradient-to-br from-[#1A1208] via-[#24170A] to-[#120D06] border-amber-500/50 hover:border-amber-400 hover:shadow-[0_0_35px_rgba(245,158,11,0.35)]'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
                {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) ? (
                  <span className={`px-3.5 py-1.5 rounded-xl font-mono font-black text-xs sm:text-sm shadow border animate-pulse ${
                    isLight
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-amber-950/90 border-amber-500/50 text-amber-300'
                  }`}>
                    {lowStockProducts.length + outOfStockProducts.length} {t('تنبيه', 'ئاگاداری', 'Alerts')}
                  </span>
                ) : (
                  <span className={`px-3.5 py-1.5 rounded-xl font-mono font-bold text-xs shadow border ${
                    isLight
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                  }`}>
                    {t('المخزون آمن', 'کۆگا ئارامە', 'Stock Safe')}
                  </span>
                )}
              </div>

              <div>
                <h3 className={`text-lg sm:text-xl font-black transition-colors flex items-center gap-2 ${
                  isLight
                    ? 'text-slate-900 group-hover:text-amber-700'
                    : 'text-white group-hover:text-amber-300'
                }`}>
                  <span>{t('المواد المتبقية والنافذة (حالة المخزون)', 'کاڵا ماوەکان و تەواوبووەکان (دۆخی کۆگا)', 'Remaining & Out of Stock Items')}</span>
                </h3>
                <p className={`text-xs sm:text-sm mt-2 leading-relaxed ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {t(
                    'جدول تتبع الكميات المتبقية، المواد القريبة من النفاد، المنتهية، وعدد الكراتين والمحتوى مع إمكانية التعديل الفوري للكميات.',
                    'خشتەی بەدواداچوونی بڕی ماوە، کاڵا کەمبووەکان، تەواوبووەکان، ژمارەی کارتۆن و دەستکاری خێرای کۆگا.',
                    'Inventory tracking table for remaining units, low stock alerts, zero units, carton counts, and quick adjustments.'
                  )}
                </p>
              </div>
            </div>

            <div className={`mt-6 pt-4 border-t flex items-center justify-between font-bold text-xs ${
              isLight
                ? 'border-slate-100 text-amber-700'
                : 'border-slate-800/80 text-amber-400'
            }`}>
              <span>{t('فتح حالة المخزون والنواقص ←', 'کردنەوەی دۆخی کۆگا و کەمییەکان ←', 'Open Stock Status →')}</span>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className={isLight ? 'text-amber-700' : 'text-amber-400'}>⚠️ {lowStockProducts.length} {t('منخفض', 'کەم', 'Low')}</span>
                <span className={isLight ? 'text-rose-700' : 'text-rose-400'}>🚫 {outOfStockProducts.length} {t('نفد', 'نەما', 'Out')}</span>
              </div>
            </div>
          </button>

        </div>
      </div>
    );
  }

  // 2. Render Selected View with Header & Return Option
  return (
    <div className="space-y-4 animate-fadeIn w-full">
      
      {/* Top Navigation & Sub-View Switcher Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl border transition-all duration-300 shadow-md ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#10192D] border-blue-500/20 text-white'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Back to Warehouse Selection (The 3 Buttons) */}
          <button
            onClick={() => setActiveSubView(null)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer shadow ${
              isLight
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border-cyan-500/30'
            }`}
            title={t('الرجوع لأزرار المخزن الرئيسية', 'گەڕانەوە بۆ دوگمەکانی کۆگا', 'Back to Warehouse Menu')}
          >
            <span>←</span>
            <span>{t('أقسام المخزن', 'دوگمەکانی کۆگا', 'Warehouse Sections')}</span>
          </button>

          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer shrink-0 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
              title={t('الرجوع للقائمة الرئيسية', 'گەڕانەوە بۆ پێڕستی سەرەکی', 'Back to Main Menu')}
            >
              <LayoutDashboard className={`w-3.5 h-3.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{t('الرئيسية', 'سەرەکی', 'Dashboard')}</span>
            </button>
          )}

          {/* Direct Switch Buttons */}
          <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${
            isLight
              ? 'bg-slate-100 border-slate-200'
              : 'bg-[#070D1A] border-blue-500/30'
          }`}>
            <button
              onClick={() => setActiveSubView('catalog')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubView === 'catalog'
                  ? isLight
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{t('دليل وسجل المواد والأسعار', 'ڕێبەری کاڵاکان و نرخەکان', 'Products & Prices')}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isLight ? 'bg-blue-100 text-blue-800' : 'bg-black/40 text-cyan-200'
              }`}>{products.length}</span>
            </button>

            <button
              onClick={() => setActiveSubView('stockStatus')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubView === 'stockStatus'
                  ? isLight
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${activeSubView === 'stockStatus' ? 'text-white' : 'text-amber-500'}`} />
              <span>{t('المواد المتبقية والنافذة (حالة المخزون)', 'کاڵا ماوەکان و تەواوبووەکان (دۆخی کۆگا)', 'Stock Status')}</span>
              {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-rose-500 text-white rounded font-bold">
                  {lowStockProducts.length + outOfStockProducts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons for Catalog View */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input for Importing Products / Backup */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".json, .xlsx, .xls"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              try {
                if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                  const excelParsed = await parseExcelBackupFile(file);
                  if (excelParsed.products && excelParsed.products.length > 0) {
                    const merged = [...excelParsed.products];
                    products.forEach((p) => {
                      if (!merged.some(m => m.barcode && p.barcode && m.barcode === p.barcode)) {
                        merged.push(p);
                      }
                    });
                    setProducts(merged);
                    localStorage.setItem('supermarket_products_v1', JSON.stringify(merged));
                    syncBulkWriteCollection('products', merged);
                    setImportBanner(isAr ? `✅ تم استيراد وترتيب ${excelParsed.products.length} مادة وإضافتها للمخزن بنجاح!` : `✅ Successfully imported and arranged ${excelParsed.products.length} products!`);
                    setTimeout(() => setImportBanner(''), 6000);
                  } else {
                    alert(isAr ? 'لم يتم العثور على ورقة مواد صالحة في ملف الإكسل!' : 'No valid products sheet found in Excel file!');
                  }
                } else {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const jsonText = event.target?.result as string;
                      const parsedData = JSON.parse(jsonText);
                      const importedProds: Product[] = Array.isArray(parsedData)
                        ? parsedData
                        : (parsedData.products && Array.isArray(parsedData.products) ? parsedData.products : []);

                      if (importedProds.length > 0) {
                        const merged = [...importedProds];
                        products.forEach((p) => {
                          if (!merged.some(m => m.barcode && p.barcode && m.barcode === p.barcode)) {
                            merged.push(p);
                          }
                        });
                        setProducts(merged);
                        localStorage.setItem('supermarket_products_v1', JSON.stringify(merged));
                        syncBulkWriteCollection('products', merged);
                        setImportBanner(isAr ? `✅ تم استيراد وترتيب ${importedProds.length} مادة وإضافتها للمخزن بنجاح!` : `✅ Successfully imported and arranged ${importedProds.length} products!`);
                        setTimeout(() => setImportBanner(''), 6000);
                      } else {
                        alert(isAr ? 'لم يتم العثور على قائمة مواد صالحة في ملف JSON!' : 'No valid products list found in JSON!');
                      }
                    } catch (err) {
                      alert(isAr ? 'ملف JSON غير صالح!' : 'Invalid JSON file!');
                    }
                  };
                  reader.readAsText(file);
                }
              } catch (err) {
                alert(isAr ? 'حدث خطأ أثناء قراءة الملف!' : 'Error reading file!');
              } finally {
                e.target.value = '';
              }
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs font-bold shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
            title={t('استيراد مواد أو ملف إكسل للمخزن', 'هێنانی کاڵاکان لە فایلی ئێکسڵ', 'Import products from Excel / JSON file')}
          >
            <Upload className="w-3.5 h-3.5 text-blue-100" />
            <span>{t('استيراد مواد (Excel / JSON)', 'استيراد (Excel / JSON)', 'Import Products')}</span>
          </button>

          {onOpenPrintBarcode && (
            <button
              onClick={() => onOpenPrintBarcode(filteredProducts[0] || products[0] || null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 text-white text-xs font-bold shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 border border-amber-400/30"
              title={t('مولد وتصميم ملصقات الباركود والأسعار', 'دروستکەری ستیکەری بارکۆد و نرخ', 'Barcode & Price Tag Generator')}
            >
              <Printer className="w-3.5 h-3.5 text-amber-100" />
              <span>{t('مولد ملصقات الباركود', 'دروستکەری بارکۆد', 'Barcode Generator')}</span>
            </button>
          )}

          <button
            onClick={() => exportProductsToExcel(filteredProducts, `products_list_${new Date().toISOString().split('T')[0]}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white text-xs font-bold shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
            title={t('تصدير المواد الحالية إلى ملف إكسل', 'ناردنی کاڵاکان بۆ فایلی ئێکسڵ', 'Export current products to Excel')}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
            <span>{t('تصدير إكسل (.xlsx)', 'ناردن بۆ ئێکسڵ (.xlsx)', 'Export Excel')}</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white text-xs font-bold shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('إدخال مادة جديدة', 'زیادکردنی کاڵای نوێ', 'New Product Entry')}</span>
          </button>
        </div>
      </div>

      {/* Import Notification Banner */}
      {importBanner && (
        <div className="p-3 bg-emerald-900/60 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <span>{importBanner}</span>
          <button onClick={() => setImportBanner('')} className="text-emerald-400 font-black hover:text-white">✕</button>
        </div>
      )}

      {/* Streamlined Search & Optional Category Filter Bar */}
      <div className={`p-3.5 rounded-2xl border space-y-2.5 transition-all ${
        isLight
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-[#10192D] border-blue-500/20 shadow-md'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className={`w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 ${
              isLight ? 'text-slate-400' : 'text-slate-400'
            }`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('بحث بالباركود، اسم المادة، أو اسم المندوب...', 'گەڕان بە بارکۆد، ناوی کاڵا، یان ناوی مەندوب...', 'Search barcode, product name, or delegate...')}
              className={`w-full text-xs pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl border font-semibold focus:outline-none transition-all ${
                isLight
                  ? 'bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-300 focus:border-blue-500 focus:bg-white'
                  : 'bg-[#0B1120] text-slate-200 placeholder-slate-500 border-blue-500/20 focus:border-cyan-500/60'
              }`}
            />
          </div>

          {/* OPTIONAL CATEGORY TOGGLE BUTTON */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowCategories(!showCategories)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border shadow-sm ${
                selectedCat !== 'ALL' || showCategories
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400/50 shadow-sm'
                  : isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    : 'bg-[#0B1120] text-slate-300 border-blue-500/20 hover:border-cyan-500/40'
              }`}
              title={t('إظهر / إخفاء قائمة التصنيفات', 'نیشاندان / شاردنەوەی پۆلەکان', 'Toggle Categories List')}
            >
              <Filter className={`w-3.5 h-3.5 ${selectedCat !== 'ALL' || showCategories ? 'text-white' : isLight ? 'text-blue-600' : 'text-cyan-300'}`} />
              <span>
                {selectedCat === 'ALL' 
                  ? t('جميع التصنيفات', 'هەموو پۆلەکان', 'All Categories') 
                  : `${t('تصنيف:', 'پۆل:', 'Cat:')} ${selectedCat}`}
              </span>
              <span className="text-[10px] font-extrabold">{showCategories ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* Stock Filter Pills */}
          <div className={`flex items-center space-x-1 rtl:space-x-reverse p-1 rounded-xl border text-xs shrink-0 flex-wrap sm:flex-nowrap gap-1 sm:gap-0 ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0B1120] border-blue-500/20'
          }`}>
            <button
              onClick={() => setStockFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                stockFilter === 'ALL'
                  ? isLight ? 'bg-blue-600 text-white shadow-sm' : 'bg-cyan-500 text-white shadow'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('الكل', 'هەمووی', 'All')} ({products.length})
            </button>

            <button
              onClick={() => setStockFilter('LOW')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                stockFilter === 'LOW'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : isLight ? 'text-amber-700 hover:text-amber-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('منخفض', 'کەمبووەوە', 'Low')} ({products.filter(p => p.stock <= p.minStock && p.stock > 0).length})
            </button>

            <button
              onClick={() => setStockFilter('OUT')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                stockFilter === 'OUT'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : isLight ? 'text-rose-700 hover:text-rose-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('نفد', 'تەواوبوو', 'Out')} ({products.filter(p => p.stock === 0).length})
            </button>

            <button
              onClick={() => setStockFilter('DEBT')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                stockFilter === 'DEBT' 
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow ring-2 ring-rose-400/40' 
                  : isLight ? 'text-rose-700 hover:text-rose-900' : 'text-rose-400 hover:text-rose-300'
              }`}
              title={t('عرض المواد المسحوبة على المكشوف / قيد بالسالب', 'پیشاندانی دەرمانە قەرزکراوەکانی کۆگا', 'Show Overdraft/Negative Stock Items')}
            >
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{t('قرض/سالب', 'قەرزی کۆگا (سالب)', 'Deficit / Loan')}</span>
              <span className="font-mono text-[10px]">({products.filter(p => p.stock < 0).length})</span>
            </button>
          </div>

          {/* Table / Grid Toggle */}
          <div className={`flex items-center space-x-1 rtl:space-x-reverse p-1 rounded-xl border shrink-0 ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0B1120] border-blue-500/20'
          }`}>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
              title={t('عرض جدول تفصيلي', 'پیشاندانی خشتە', 'Table View')}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
              title={t('عرض بطاقات شبكية', 'پیشاندانی کارتەکان', 'Grid View')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Categories Pills (Expanded) */}
        {showCategories && (
          <div className={`flex items-center gap-1.5 flex-wrap pt-2.5 border-t ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <button
              onClick={() => setSelectedCat('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCat === 'ALL'
                  ? 'bg-blue-600 text-white shadow'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t('الكل', 'هەمووی', 'All')}
            </button>
            {categoriesList.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCat === cat
                    ? 'bg-blue-600 text-white shadow'
                    : isLight
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-slate-800 text-cyan-300 border border-blue-500/20 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View 1: Catalog & Pricing Sub-View (دليل وسجل المواد والأسعار) */}
      {activeSubView === 'catalog' && (
        <>
          {viewMode === 'table' ? (
            <div className={`rounded-2xl border overflow-hidden shadow-lg transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'cyber-card border-blue-500/20'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-[11px]">
                  <thead>
                    <tr className={`border-b font-semibold uppercase text-[10px] whitespace-nowrap transition-colors ${
                      isLight
                        ? 'border-slate-200 bg-slate-100/90 text-slate-700'
                        : 'border-slate-800 text-slate-400 bg-[#0B1120]/90'
                    }`}>
                      <th className="py-2.5 px-2">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                      <th className="py-2.5 px-2">{t('اسم المادة', 'ناوی کاڵا', 'Product Name')}</th>
                      <th className="py-2.5 px-2">{t('المندوب', 'مەندوب', 'Delegate')}</th>
                      <th className="py-2.5 px-2">{t('التصنيف', 'پۆلێن', 'Category')}</th>
                      <th className="py-2.5 px-2 text-center">{t('سعر الكرتون/القطعة', 'نرخی کارتۆن/دانە', 'Carton/Unit Cost')}</th>
                      <th className="py-2.5 px-2 text-center">{t('أسعار البيع', 'نرخی فرۆشتن', 'Sell Prices')}</th>
                      <th className="py-2.5 px-2 text-center text-emerald-600 dark:text-emerald-400">{t('الأرباح', 'قازانجەکان', 'Profits')}</th>
                      <th className="py-2.5 px-2">{t('التواريخ', 'بەروارەکان', 'Dates')}</th>
                      <th className="py-2.5 px-2 text-center">{t('إجراءات', 'کردارەکان', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y whitespace-nowrap ${
                    isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/60 text-slate-200'
                  }`}>
                    {filteredProducts.map((p) => {
                      const numCartons = p.cartonsCount || 1;
                      const numUnits = p.unitsPerCarton || 12;
                      const cartonCost = p.cartonPurchasePrice || (p.cost * numUnits);
                      const unitCost = p.costPerUnit || (numUnits > 0 ? cartonCost / numUnits : p.cost);

                      const singleSell = p.singleRetailPrice || p.price;
                      const wholesaleSell = p.wholesalePrice || (p.price * 0.85);
                      const cartonSell = p.cartonSellingPrice || (p.price * numUnits * 0.95);

                      const singleProfitVal = p.singleProfit !== undefined ? p.singleProfit : (singleSell - unitCost);
                      const wholesaleProfitVal = p.wholesaleProfit !== undefined ? p.wholesaleProfit : (wholesaleSell - unitCost);
                      const cartonProfitVal = p.cartonProfit !== undefined ? p.cartonProfit : (cartonSell - cartonCost);

                      return (
                        <tr key={p.id} className={`transition-colors ${
                          isLight ? 'hover:bg-blue-50/50' : 'hover:bg-slate-800/40'
                        }`}>
                          {/* 1. Barcode */}
                          <td className={`py-2 px-2 font-mono font-bold text-[11px] ${
                            isLight ? 'text-blue-700' : 'text-cyan-400'
                          }`}>
                            {p.barcode}
                          </td>

                          {/* 2. Product Name */}
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-base p-1 rounded ${
                                isLight ? 'bg-slate-100' : 'bg-slate-800/80'
                              }`}>{p.imageIcon || '💊'}</span>
                              <div>
                                <p className={`font-bold text-[11px] leading-tight ${
                                  isLight ? 'text-slate-900' : 'text-slate-100'
                                }`}>{p.nameAr || p.name}</p>
                                {p.scientificName ? (
                                  <p className={`text-[9.5px] font-mono leading-tight font-semibold ${
                                    isLight ? 'text-blue-600' : 'text-cyan-300'
                                  }`}>🧪 {p.scientificName}</p>
                                ) : (
                                  <p className="text-[9px] text-slate-500 font-mono leading-none">{p.name}</p>
                                )}
                                {p.dosageForm && (
                                  <span className={`text-[8.5px] font-sans ${
                                    isLight ? 'text-slate-500' : 'text-slate-400'
                                  }`}>{p.dosageForm}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. Delegate / Supplier & Batch */}
                          <td className={`py-2 px-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            <div className="flex items-center gap-1 text-[10px]">
                              <UserCheck className={`w-3 h-3 ${isLight ? 'text-blue-600' : 'text-blue-400'} shrink-0`} />
                              <span>{p.supplierDelegate || p.supplierName || 'عام'}</span>
                            </div>
                            {p.batchNumber && (
                              <div className={`text-[9px] font-mono font-semibold ${
                                isLight ? 'text-amber-700' : 'text-amber-400'
                              }`}>
                                Batch: {p.batchNumber}
                              </div>
                            )}
                          </td>

                          {/* 4. Category */}
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              isLight ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {p.categoryAr || p.category}
                            </span>
                          </td>

                          {/* 5. Cost Breakdown */}
                          <td className="py-2 px-2 text-center font-mono">
                            <div className={`font-bold text-xs ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
                              {settings.currencySymbol}{formatNumber(cartonCost)} <span className={`text-[9px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>/ كرتون</span>
                            </div>
                            <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              ({settings.currencySymbol}{formatNumber(unitCost)} / قطعة)
                            </div>
                          </td>

                          {/* 6. Selling Prices */}
                          <td className="py-2 px-2 text-center font-mono">
                            <PriceHistoryTooltip product={p} currency={settings.currencySymbol} isAr={isAr}>
                              <div className={`font-bold text-xs hover:underline cursor-help ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                                {settings.currencySymbol}{formatNumber(singleSell)} <span className={`text-[9px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>/ مفرد</span>
                              </div>
                            </PriceHistoryTooltip>
                            <div className={`text-[9.5px] font-semibold ${isLight ? 'text-blue-700' : 'text-cyan-300'}`}>
                              {settings.currencySymbol}{formatNumber(wholesaleSell)} / جملة
                            </div>
                          </td>

                          {/* 7. Profit Breakdown */}
                          <td className="py-2 px-2 text-center font-mono">
                            <span className={`px-1.5 py-0.5 rounded border font-bold text-[10px] ${
                              isLight
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                            }`}>
                              +{settings.currencySymbol}{formatNumber(singleProfitVal)}
                            </span>
                            <span className={`block text-[8.5px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              (كرتون: +{settings.currencySymbol}{formatNumber(cartonProfitVal)})
                            </span>
                          </td>

                          {/* 8. Production & Expiry Dates */}
                          <td className={`py-2 px-2 text-[10px] font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            {p.expiryDate ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>{p.expiryDate}</span>
                              </div>
                            ) : (
                              <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>-</span>
                            )}
                            {p.productionDate && (
                              <span className={`text-[9px] block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>P: {p.productionDate}</span>
                            )}
                          </td>

                          {/* 9. Actions */}
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {onOpenPrintBarcode && (
                                <button
                                  type="button"
                                  onClick={() => onOpenPrintBarcode(p)}
                                  className={`p-1 rounded border cursor-pointer transition-all ${
                                    isLight
                                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                                      : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/30'
                                  }`}
                                  title="طباعة ملصق الباركود"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => onEditProduct(p)}
                                className={`p-1 rounded border cursor-pointer transition-all ${
                                  isLight
                                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                                    : 'bg-blue-600/30 text-cyan-300 hover:bg-blue-600/50 border-blue-500/30'
                                }`}
                                title="تعديل"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className={`p-1 rounded border cursor-pointer transition-all ${
                                  isLight
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                                    : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border-rose-500/30'
                                }`}
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const numCartons = p.cartonsCount || 1;
                const numUnits = p.unitsPerCarton || 12;
                const cartonCost = p.cartonPurchasePrice || (p.cost * numUnits);
                const unitCost = p.costPerUnit || (numUnits > 0 ? cartonCost / numUnits : p.cost);
                const singleSell = p.singleRetailPrice || p.price;
                const singleProfitVal = p.singleProfit !== undefined ? p.singleProfit : (singleSell - unitCost);

                return (
                  <div key={p.id} className={`p-4 rounded-2xl border space-y-3 transition-all ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-sm text-slate-800'
                      : 'cyber-card border-blue-500/20 text-white'
                  }`}>
                    <div className="flex items-start justify-between">
                      <span className={`text-3xl p-2 rounded-2xl border ${
                        isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
                      }`}>{p.imageIcon || '📦'}</span>
                      <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-xl border ${
                        isLight
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30'
                      }`}>
                        {p.barcode}
                      </span>
                    </div>

                    <div>
                      <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{p.nameAr || p.name}</h4>
                      <p className={`text-xs flex items-center gap-1 mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        <UserCheck className={`w-3 h-3 ${isLight ? 'text-blue-600' : 'text-cyan-400'}`} />
                        المندوب: {p.supplierDelegate || p.supplierName || 'عام'}
                      </p>
                    </div>

                    <div className={`grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B1120] border-slate-800'
                    }`}>
                      <div>
                        <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t('التصنيف:', 'پۆلێن:', 'Category:')}</span>
                        <span className={`font-bold ${isLight ? 'text-blue-700' : 'text-cyan-300'}`}>{p.categoryAr || p.category}</span>
                      </div>
                      <div>
                        <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t('سعر شراء الكرتون:', 'نرخی کڕینی کارتۆن:', 'Carton Cost:')}</span>
                        <span className={`font-bold font-mono ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>{settings.currencySymbol}{formatNumber(cartonCost)}</span>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between text-xs pt-2 border-t ${
                      isLight ? 'border-slate-200' : 'border-slate-800'
                    }`}>
                      <div>
                        <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>سعر البيع المفرد:</span>
                        <PriceHistoryTooltip product={p} currency={settings.currencySymbol} isAr={isAr}>
                          <span className={`font-black font-mono text-sm hover:underline cursor-help ${
                            isLight ? 'text-emerald-700' : 'text-emerald-400'
                          }`}>{settings.currencySymbol}{formatNumber(singleSell)}</span>
                        </PriceHistoryTooltip>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ربح القطعة:</span>
                        <span className={`font-bold font-mono ${isLight ? 'text-blue-700' : 'text-cyan-300'}`}>+{settings.currencySymbol}{formatNumber(singleProfitVal)}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1">
                      {onOpenPrintBarcode && (
                        <button
                          type="button"
                          onClick={() => onOpenPrintBarcode(p)}
                          className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            isLight
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30'
                          }`}
                          title="طباعة وتخصيص ملصق السعر"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة ملصق</span>
                        </button>
                      )}
                      <button
                        onClick={() => onEditProduct(p)}
                        className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1 hover:bg-blue-500 cursor-pointer shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل وحساب المادة</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* View 2: Stock Status & Remaining/Out of Stock View (المواد المتبقية والنافذة) */}
      {activeSubView === 'stockStatus' && (
        <div className="space-y-4 animate-fadeIn">
          {/* 5 KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* Total Items */}
            <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0B1120] border-blue-500/20'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{t('إجمالي المواد', 'کۆی گشتی کاڵاکان', 'Total Items')}</span>
                <Package className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              </div>
              <p className={`text-lg sm:text-2xl font-black mt-1 font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalProductsCount}</p>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{t('جميع المواد بالمخزن', 'هەموو کاڵاکانی کۆگا', 'All catalog items')}</span>
            </div>

            {/* In Stock */}
            <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-emerald-200 shadow-sm' : 'bg-[#0B1120] border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{t('مواد متوفرة', 'کاڵای بەردەست', 'In Stock')}</span>
                <CheckCircle2 className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              </div>
              <p className={`text-lg sm:text-2xl font-black mt-1 font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>{inStockCount}</p>
              <span className={`text-[10px] ${isLight ? 'text-emerald-600' : 'text-emerald-500/80'}`}>{t('كمية آمنة فوق الحد الأدنى', 'بڕی پێویست لە سەرووی کەمترینە', 'Safe stock quantity')}</span>
            </div>

            {/* Low Stock */}
            <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-amber-200 shadow-sm' : 'bg-[#0B1120] border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{t('قارب على النفاد', 'کەمبووەتەوە', 'Low Stock')}</span>
                <AlertTriangle className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              </div>
              <p className={`text-lg sm:text-2xl font-black mt-1 font-mono ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>{lowStockProducts.length}</p>
              <span className={`text-[10px] ${isLight ? 'text-amber-600' : 'text-amber-500/80'}`}>{t('تحتاج إعادة طلب وتوريد', 'پێویستی بە داواکردنەوەیە', 'Needs reordering')}</span>
            </div>

            {/* Out of Stock */}
            <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-rose-200 shadow-sm' : 'bg-[#0B1120] border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>{t('مواد نفدت بالكامل', 'تەواوبوو / نەماوە', 'Out of Stock')}</span>
                <Trash2 className={`w-4 h-4 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
              </div>
              <p className={`text-lg sm:text-2xl font-black mt-1 font-mono ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>{outOfStockProducts.length}</p>
              <span className={`text-[10px] ${isLight ? 'text-rose-600' : 'text-rose-500/80'}`}>{t('الكمية الحالية 0 قطعة', 'بڕی ئێستا 0 دانەیە', '0 units available')}</span>
            </div>

            {/* Deficit / Negative */}
            <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-purple-200 shadow-sm' : 'bg-[#0B1120] border-purple-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>{t('سحب بالسالب / عجز', 'قەرزی کۆگا (سالب)', 'Stock Deficit')}</span>
                <AlertTriangle className={`w-4 h-4 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
              </div>
              <p className={`text-lg sm:text-2xl font-black mt-1 font-mono ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>{debtStockProducts.length}</p>
              <span className={`text-[10px] ${isLight ? 'text-purple-600' : 'text-purple-400/80'}`}>{t('مبيعات على المكشوف', 'فرۆشتنی سەربەست', 'Negative stock count')}</span>
            </div>
          </div>

          {/* Stock Tracking Table */}
          <div className={`rounded-2xl border overflow-hidden shadow-lg transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'cyber-card border-blue-500/20'
          }`}>
            <div className={`p-3 border-b flex items-center justify-between flex-wrap gap-2 transition-colors ${
              isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-[#0B1120] border-slate-800'
            }`}>
              <div className="flex items-center gap-2">
                <Package className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                <span className={`text-xs sm:text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {t('جدول تتبع الكميات المتبقية وحالة النفاذ', 'خشتەی بەدواداچوونی بڕی ماوە و دۆخی کۆگا', 'Inventory Remaining & Out-of-Stock Table')}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-[11px]">
                <thead>
                  <tr className={`border-b font-semibold uppercase text-[10px] whitespace-nowrap ${
                    isLight
                      ? 'border-slate-200 bg-slate-50 text-slate-700'
                      : 'border-slate-800 text-slate-400 bg-[#0B1120]/90'
                  }`}>
                    <th className="py-2.5 px-3">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                    <th className="py-2.5 px-3">{t('اسم المادة', 'ناوی کاڵا', 'Product Name')}</th>
                    <th className="py-2.5 px-3">{t('المندوب / المورد', 'مەندوب / دابینکەر', 'Delegate / Supplier')}</th>
                    <th className="py-2.5 px-3 text-center">{t('الكراتين والمحتوى', 'کارتۆن و دانەکان', 'Packaging')}</th>
                    <th className="py-2.5 px-3 text-center">{t('الكمية المتبقية الحالية', 'بڕی ماوەی ئێستا', 'Current Remaining Units')}</th>
                    <th className="py-2.5 px-3 text-center">{t('الحد الأدنى للطلب', 'کەمترین ڕێژە', 'Min Stock')}</th>
                    <th className="py-2.5 px-3 text-center">{t('حالة المخزون', 'دۆخی کۆگا', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y whitespace-nowrap ${
                  isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/60 text-slate-200'
                }`}>
                  {filteredProducts.map((p) => {
                    const numCartons = p.cartonsCount || 0;
                    const numUnits = p.unitsPerCarton || 12;
                    const totalUnits = p.totalUnits || p.stock || (numCartons * numUnits);
                    const isLow = p.stock <= p.minStock && p.stock > 0;
                    const isOut = p.stock === 0;
                    const isDebt = p.stock < 0;

                    return (
                      <tr key={p.id} className={`transition-colors ${
                        isDebt
                          ? isLight ? 'bg-purple-50 hover:bg-purple-100/60' : 'bg-purple-950/20 hover:bg-purple-900/30'
                          : isOut
                            ? isLight ? 'bg-rose-50 hover:bg-rose-100/60' : 'bg-rose-950/10 hover:bg-slate-800/40'
                            : isLow
                              ? isLight ? 'bg-amber-50 hover:bg-amber-100/60' : 'bg-amber-950/10 hover:bg-slate-800/40'
                              : isLight ? 'hover:bg-blue-50/40' : 'hover:bg-slate-800/40'
                      }`}>
                        {/* Barcode */}
                        <td className={`py-2.5 px-3 font-mono font-bold ${
                          isLight ? 'text-blue-700' : 'text-cyan-400'
                        }`}>
                          {p.barcode}
                        </td>

                        {/* Name */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg p-1 rounded ${
                              isLight ? 'bg-slate-100' : 'bg-slate-800'
                            }`}>{p.imageIcon || '📦'}</span>
                            <div>
                              <p className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{p.nameAr || p.name}</p>
                              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{p.categoryAr || p.category}</span>
                            </div>
                          </div>
                        </td>

                        {/* Supplier */}
                        <td className={`py-2.5 px-3 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          <span className="text-xs">{p.supplierDelegate || p.supplierName || 'عام'}</span>
                          {p.batchNumber && (
                            <span className={`text-[9px] font-mono block ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                              Batch: {p.batchNumber}
                            </span>
                          )}
                        </td>

                        {/* Packaging info */}
                        <td className="py-2.5 px-3 text-center">
                          <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{numCartons} {t('كرتون', 'کارتۆن', 'ctn')}</span>
                          <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>({numUnits} {t('قطعة بالكرتون', 'دانە لە کارتۆن', 'pcs/ctn')})</span>
                        </td>

                        {/* Remaining Stock Units */}
                        <td className="py-2.5 px-3 text-center">
                          {isDebt ? (
                            <span className={`px-3 py-1 rounded-xl font-black font-mono border text-xs animate-pulse inline-flex items-center gap-1 ${
                              isLight
                                ? 'bg-purple-100 border-purple-300 text-purple-900 shadow-sm'
                                : 'bg-rose-950 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                            }`}>
                              <AlertTriangle className="w-3 h-3 text-purple-600 dark:text-rose-400" />
                              {t(`عجز (${p.stock} قطعة)`, `قەرز (${p.stock} دانە)`, `Deficit (${p.stock} pcs)`)}
                            </span>
                          ) : isOut ? (
                            <span className={`px-3 py-1 rounded-xl font-black font-mono border text-xs inline-flex items-center gap-1 shadow-sm ${
                              isLight
                                ? 'bg-rose-100 border-rose-300 text-rose-900'
                                : 'bg-rose-900/60 text-rose-200 border-rose-500/50'
                            }`}>
                              <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-300" />
                              {t('0 قطعة (نفد بالكامل)', '0 دانە (تەواوبوو)', '0 pcs (Out of Stock)')}
                            </span>
                          ) : isLow ? (
                            <span className={`px-3 py-1 rounded-xl font-black font-mono border text-xs inline-flex items-center gap-1 ${
                              isLight
                                ? 'bg-amber-100 border-amber-300 text-amber-900'
                                : 'bg-amber-950 text-amber-300 border-amber-500/50'
                            }`}>
                              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              {p.stock} {t('قطعة (منخفض)', 'دانە (کەمبووە)', 'pcs (Low)')}
                            </span>
                          ) : (
                            <span className={`px-3 py-1 rounded-xl font-black font-mono border text-xs ${
                              isLight
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                            }`}>
                              {p.stock} {t('قطعة متوفرة', 'دانەی بەردەست', 'pcs available')}
                            </span>
                          )}
                        </td>

                        {/* Min Stock */}
                        <td className={`py-2.5 px-3 text-center font-mono font-bold ${
                          isLight ? 'text-slate-800' : 'text-slate-300'
                        }`}>
                          {p.minStock} {t('قطعة', 'دانە', 'pcs')}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-3 text-center">
                          {isDebt ? (
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                              isLight ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            }`}>
                              {t('سالب / عجز', 'سالب / قەرز', 'Deficit')}
                            </span>
                          ) : isOut ? (
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                              isLight ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}>
                              {t('نافد تماماً', 'تەواوبووە', 'Out of Stock')}
                            </span>
                          ) : isLow ? (
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                              isLight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}>
                              {t('قارب على النفاد', 'کەمبووەتەوە', 'Low Stock')}
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                              isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}>
                              {t('متوفر وآمن', 'بەردەستە', 'In Stock')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Audit Modal */}
      <InventoryAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        products={products}
        setProducts={setProducts}
        settings={settings}
      />

    </div>
  );
};

