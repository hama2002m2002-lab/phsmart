import React, { useState, useRef } from 'react';
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

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [importBanner, setImportBanner] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const savedCats = getSavedCategories();
  const productCats = products.map(p => p.categoryAr || p.category).filter(Boolean);
  const categoriesList = Array.from(new Set([...CATEGORIES, ...savedCats, ...productCats]));

  const filteredProducts = products.filter(p => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(searchLower) ||
      p.nameAr.includes(search) ||
      p.barcode.includes(search) ||
      (p.supplierDelegate && p.supplierDelegate.includes(search));
    
    const matchesCat = selectedCat === 'ALL' || p.categoryAr === selectedCat || p.category === selectedCat;
    
    const matchesStock = 
      stockFilter === 'ALL' ? true :
      stockFilter === 'LOW' ? p.stock <= p.minStock && p.stock > 0 :
      p.stock === 0;

    return matchesSearch && matchesCat && matchesStock;
  });

  const handleDeleteProduct = (id: string) => {
    if (confirm(isAr ? 'هل أنت تأكد من حذف هذه المادة؟' : 'Are you sure you want to delete this product?')) {
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

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      
      {/* Compact High-Density Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#10192D] p-3 sm:p-4 rounded-2xl border border-blue-500/20 shadow-lg">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer shrink-0"
              title={t('الرجوع للقائمة الرئيسية', 'گەڕانەوە بۆ پێڕستی سەرەکی', 'Back to Main Menu')}
            >
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
              <span>{t('القائمة الرئيسية', 'پێڕستی سەرەکی', 'Main Menu')}</span>
            </button>
          )}

          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{t('سجل واجهة إدخال وتتبع المواد', 'تۆماری داخڵکردن و بەدواداچوونی کاڵاکان', 'Product Material Inventory Record')}</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
              {t('شاشة عرض شاملة لكل معلومات المواد، الباركود، التكاليف والأرباح', 'بینراوی گشتگیر بۆ زانیاری کاڵاکان، بارکۆد، تێچوو و قازانج', 'Full display interface for all product details, barcode, costs, and profits')}
            </p>
          </div>
        </div>

        {/* Action Buttons (Moved to Top Header as requested in Red Outline) */}
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(59,130,246,0.35)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
            title={t('استيراد مواد أو ملف إكسل للمخزن', 'هێنانی کاڵاکان لە فایلی ئێکسڵ', 'Import products from Excel / JSON file')}
          >
            <Upload className="w-3.5 h-3.5 text-blue-100" />
            <span>{t('استيراد مواد (Excel / JSON)', 'استيراد (Excel / JSON)', 'Import Products')}</span>
          </button>

          {onOpenPrintBarcode && (
            <button
              onClick={() => onOpenPrintBarcode(filteredProducts[0] || products[0] || null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 border border-amber-400/30"
              title={t('مولد وتصميم ملصقات الباركود والأسعار', 'دروستکەری ستیکەری بارکۆد و نرخ', 'Barcode & Price Tag Generator')}
            >
              <Printer className="w-3.5 h-3.5 text-amber-100" />
              <span>{t('مولد ملصقات الباركود', 'دروستکەری بارکۆد', 'Barcode Generator')}</span>
            </button>
          )}

          <button
            onClick={() => exportProductsToExcel(filteredProducts, `products_list_${new Date().toISOString().split('T')[0]}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
            title={t('تصدير المواد الحالية إلى ملف إكسل', 'ناردنی کاڵاکان بۆ فایلی ئێکسڵ', 'Export current products to Excel')}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
            <span>{t('تصدير إكسل (.xlsx)', 'ناردن بۆ ئێکسڵ (.xlsx)', 'Export Excel')}</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('واجهة إدخال مادة جديدة', 'زیادکردنی کاڵای نوێ', 'New Product Entry Form')}</span>
          </button>
        </div>
      </div>

      {/* Floating Success Banner */}
      {importBanner && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{importBanner}</span>
          </div>
          <button onClick={() => setImportBanner('')} className="text-xs text-emerald-400 hover:text-white underline cursor-pointer">
            {t('إغلاق', 'داخستن', 'Dismiss')}
          </button>
        </div>
      )}

      {/* Streamlined Search & Optional Category Filter Bar */}
      <div className="cyber-card p-3 rounded-2xl border border-blue-500/20 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('بحث بالباركود، اسم المادة، أو اسم المندوب...', 'گەڕان بە بارکۆد، ناوی کاڵا، یان ناوی مەندوب...', 'Search barcode, product name, or delegate...')}
              className="w-full bg-[#0B1120] text-xs text-slate-200 placeholder-slate-500 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl border border-blue-500/20 focus:outline-none focus:border-cyan-500/60 font-semibold"
            />
          </div>

          {/* OPTIONAL CATEGORY TOGGLE BUTTON (As requested in Yellow Outline) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowCategories(!showCategories)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border shadow-sm ${
                selectedCat !== 'ALL' || showCategories
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0B1120] text-slate-300 border-blue-500/20 hover:border-cyan-500/40'
              }`}
              title={t('إظهر / إخفاء قائمة التصنيفات', 'نیشاندان / شاردنەوەی پۆلەکان', 'Toggle Categories List')}
            >
              <Filter className="w-3.5 h-3.5 text-cyan-300" />
              <span>
                {selectedCat === 'ALL' 
                  ? t('جميع التصنيفات', 'هەموو پۆلەکان', 'All Categories') 
                  : `${t('تصنيف:', 'پۆل:', 'Cat:')} ${selectedCat}`}
              </span>
              <span className="text-[10px] text-cyan-300 font-extrabold">{showCategories ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* Stock Filter Pills */}
          <div className="flex items-center space-x-1 rtl:space-x-reverse bg-[#0B1120] p-1 rounded-xl border border-blue-500/20 text-xs shrink-0">
            <button
              onClick={() => setStockFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                stockFilter === 'ALL' ? 'bg-cyan-500 text-white shadow' : 'text-slate-400'
              }`}
            >
              {t('الكل', 'هەمووی', 'All')} ({products.length})
            </button>

            <button
              onClick={() => setStockFilter('LOW')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                stockFilter === 'LOW' ? 'bg-amber-500 text-white shadow' : 'text-slate-400'
              }`}
            >
              {t('منخفض', 'کەمبووەوە', 'Low')} ({products.filter(p => p.stock <= p.minStock && p.stock > 0).length})
            </button>

            <button
              onClick={() => setStockFilter('OUT')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                stockFilter === 'OUT' ? 'bg-rose-500 text-white shadow' : 'text-slate-400'
              }`}
            >
              {t('نفد', 'تەواوبوو', 'Out')} ({products.filter(p => p.stock === 0).length})
            </button>
          </div>

          {/* Table / Grid Toggle */}
          <div className="flex items-center space-x-1 rtl:space-x-reverse bg-[#0B1120] p-1 rounded-xl border border-blue-500/20 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-slate-400 ${viewMode === 'table' ? 'bg-blue-600 text-white' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-slate-400 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : ''}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* EXPANDABLE OPTIONAL CATEGORY CHIPS LIST (Shows only when toggle button is active) */}
        {showCategories && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 text-xs border-t border-slate-800/80 animate-fadeIn custom-scrollbar">
            <button
              onClick={() => setSelectedCat('ALL')}
              className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-all ${
                selectedCat === 'ALL'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border border-cyan-400/40 shadow'
                  : 'bg-[#0B1120] text-slate-400 border border-blue-500/10 hover:text-slate-200'
              }`}
            >
              🌟 {t('جميع التصنيفات', 'هەموو پۆلەکان', 'All Categories')}
            </button>

            {categoriesList.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                  selectedCat === cat
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border border-cyan-400/40 shadow'
                    : 'bg-[#0B1120] text-slate-400 border border-blue-500/10 hover:text-slate-200'
                }`}
              >
                <span>{cat}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Table with Detailed C# Specified Fields */}
      {viewMode === 'table' ? (
        <div className="cyber-card rounded-2xl border border-blue-500/20 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] bg-[#0B1120]/90 whitespace-nowrap">
                  <th className="py-2 px-1.5">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                  <th className="py-2 px-1.5">{t('اسم المادة', 'ناوی کاڵا', 'Product Name')}</th>
                  <th className="py-2 px-1.5">{t('المندوب', 'مەندوب', 'Delegate')}</th>
                  <th className="py-2 px-1.5">{t('التصنيف', 'پۆلێن', 'Category')}</th>
                  <th className="py-2 px-1.5 text-center">{t('الكراتين', 'کارتۆنەکان', 'Cartons')}</th>
                  <th className="py-2 px-1.5 text-center">{t('المجموع', 'کۆی گشتی', 'Total')}</th>
                  <th className="py-2 px-1.5 text-center">{t('سعر الكرتون/القطعة', 'نرخی کارتۆن/دانە', 'Carton/Unit Cost')}</th>
                  <th className="py-2 px-1.5 text-center">{t('أسعار البيع', 'نرخی فرۆشتن', 'Sell Prices')}</th>
                  <th className="py-2 px-1.5 text-center text-emerald-400">{t('الأرباح', 'قازانجەکان', 'Profits')}</th>
                  <th className="py-2 px-1.5">{t('التواريخ', 'بەروارەکان', 'Dates')}</th>
                  <th className="py-2 px-1.5 text-center">{t('إجراءات', 'کردارەکان', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 whitespace-nowrap">
                {filteredProducts.map((p) => {
                  const numCartons = p.cartonsCount || 1;
                  const numUnits = p.unitsPerCarton || 12;
                  const totalItems = p.totalUnits || (numCartons * numUnits);
                  const cartonCost = p.cartonPurchasePrice || (p.cost * numUnits);
                  const unitCost = p.costPerUnit || (numUnits > 0 ? cartonCost / numUnits : p.cost);

                  const singleSell = p.singleRetailPrice || p.price;
                  const wholesaleSell = p.wholesalePrice || (p.price * 0.85);
                  const cartonSell = p.cartonSellingPrice || (p.price * numUnits * 0.95);

                  const singleProfitVal = p.singleProfit !== undefined ? p.singleProfit : (singleSell - unitCost);
                  const wholesaleProfitVal = p.wholesaleProfit !== undefined ? p.wholesaleProfit : (wholesaleSell - unitCost);
                  const cartonProfitVal = p.cartonProfit !== undefined ? p.cartonProfit : (cartonSell - cartonCost);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* 1. Barcode */}
                      <td className="py-2 px-1.5 font-mono text-cyan-400 font-bold text-[11px]">
                        {p.barcode}
                      </td>

                      {/* 2. Product Name */}
                      <td className="py-2 px-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base p-1 bg-slate-800/80 rounded">{p.imageIcon || '💊'}</span>
                          <div>
                            <p className="font-bold text-slate-100 text-[11px] leading-tight">{p.nameAr || p.name}</p>
                            {p.scientificName ? (
                              <p className="text-[9.5px] text-cyan-300 font-mono leading-tight font-semibold">🧪 {p.scientificName}</p>
                            ) : (
                              <p className="text-[9px] text-slate-500 font-mono leading-none">{p.name}</p>
                            )}
                            {p.dosageForm && (
                              <span className="text-[8.5px] text-slate-400 font-sans">{p.dosageForm}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Delegate / Supplier & Batch */}
                      <td className="py-2 px-1.5 text-slate-300">
                        <div className="flex items-center gap-1 text-[10px]">
                          <UserCheck className="w-3 h-3 text-blue-400 shrink-0" />
                          <span>{p.supplierDelegate || p.supplierName || 'عام'}</span>
                        </div>
                        {p.batchNumber && (
                          <div className="text-[9px] text-amber-400 font-mono font-semibold">
                            Batch: {p.batchNumber}
                          </div>
                        )}
                      </td>

                      {/* 4. Category & Storage */}
                      <td className="py-2 px-1.5 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-cyan-300 text-[10px] block w-fit">
                          {p.categoryAr || p.category}
                        </span>
                        {p.storageCondition && (
                          <span className="text-[8.5px] text-purple-300 block mt-0.5">
                            {p.storageCondition === 'refrigerator' ? '❄️ ثلاجة (2-8°C)' : p.storageCondition === 'protect_light' ? '🌙 بعيداً عن الضوء' : '🌡️ حرارة الغرفة'}
                          </span>
                        )}
                      </td>

                      {/* 5. Cartons / Units per carton */}
                      <td className="py-2 px-1.5 text-center">
                        <span className="font-bold text-white text-[11px]">{numCartons}</span> <span className="text-slate-400 text-[10px]">كرتونة</span>
                        <div className="text-[9px] text-slate-500">({numUnits} ق/ك)</div>
                      </td>

                      {/* 6. Total Units */}
                      <td className="py-2 px-1.5 text-center">
                        <span className="px-1.5 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 font-bold font-mono border border-cyan-500/30 text-[10px]">
                          {totalItems} قطعة
                        </span>
                      </td>

                      {/* 7. Carton Cost & Unit Cost */}
                      <td className="py-2 px-1.5 text-center">
                        <div className="font-bold text-amber-300 font-mono text-[11px]">
                          {settings.currencySymbol}{formatNumber(cartonCost)}
                        </div>
                        <div className="text-[9px] text-amber-400/80 font-mono">
                          قطعة: {settings.currencySymbol}{formatNumber(unitCost)}
                        </div>
                      </td>

                      {/* 8. Selling Prices */}
                      <td className="py-2 px-1.5 text-center font-mono text-[10px]">
                        <PriceHistoryTooltip product={p} currency={settings.currencySymbol} isAr={isAr}>
                          <div className="text-emerald-400 font-bold hover:underline cursor-help">
                            علبة: {settings.currencySymbol}{formatNumber(singleSell)}
                          </div>
                        </PriceHistoryTooltip>
                        {p.blisterPrice !== undefined && p.blisterPrice > 0 && (
                          <div className="text-teal-300 text-[9px] font-bold">شريط: {settings.currencySymbol}{formatNumber(p.blisterPrice)}</div>
                        )}
                        <div className="text-cyan-400 text-[9px]">جملة: {settings.currencySymbol}{formatNumber(wholesaleSell)}</div>
                        <div className="text-purple-400 text-[9px]">كرتون: {settings.currencySymbol}{formatNumber(cartonSell)}</div>
                      </td>

                      {/* 9. Three Profits Fields */}
                      <td className="py-2 px-1.5 text-center font-mono bg-emerald-950/20 text-[10px]">
                        <div className="text-emerald-400 font-bold">
                          مفرد: +{settings.currencySymbol}{formatNumber(singleProfitVal)}
                        </div>
                        <div className="text-cyan-400 text-[9px]">
                          جملة: +{settings.currencySymbol}{formatNumber(wholesaleProfitVal)}
                        </div>
                        <div className="text-purple-400 text-[9px]">
                          كرتون: +{settings.currencySymbol}{formatNumber(cartonProfitVal)}
                        </div>
                      </td>

                      {/* 10. Dates */}
                      <td className="py-2 px-1.5 text-[9px] text-slate-400 space-y-0.5">
                        <div>إضافة: <span className="text-slate-200 font-mono">{p.initialAddDate || '2026-01-10'}</span></div>
                        <div className="text-cyan-300">تحديث السعر: <span className="font-mono font-bold">{p.lastPriceUpdate ? new Date(p.lastPriceUpdate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : (p.lastEditDate || '2026-07-31')}</span></div>
                        <div className="text-amber-400 font-semibold">انتهاء: <span className="font-mono">{p.expiryDate || 'N/A'}</span></div>
                      </td>

                      {/* 11. Actions */}
                      <td className="py-2 px-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onOpenPrintBarcode && (
                            <button
                              onClick={() => onOpenPrintBarcode(p)}
                              className="p-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                              title="طباعة وتخصيص الباركود والسعر"
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            onClick={() => onEditProduct(p)}
                            className="p-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30"
                            title="تعديل المادة"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30"
                            title="حذف"
                          >
                            <Trash2 className="w-3 h-3" />
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
            const totalItems = p.totalUnits || (numCartons * numUnits);
            const cartonCost = p.cartonPurchasePrice || (p.cost * numUnits);
            const unitCost = p.costPerUnit || (numUnits > 0 ? cartonCost / numUnits : p.cost);
            const singleSell = p.singleRetailPrice || p.price;
            const singleProfitVal = p.singleProfit !== undefined ? p.singleProfit : (singleSell - unitCost);

            return (
              <div key={p.id} className="cyber-card p-4 rounded-2xl border border-blue-500/20 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-3xl p-2 rounded-2xl bg-slate-800 border border-slate-700">{p.imageIcon || '📦'}</span>
                  <span className="font-mono text-cyan-400 text-xs font-bold bg-cyan-950/80 px-2.5 py-1 rounded-xl border border-cyan-500/30">
                    {p.barcode}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{p.nameAr || p.name}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <UserCheck className="w-3 h-3 text-cyan-400" />
                    المندوب: {p.supplierDelegate || p.supplierName || 'عام'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-[#0B1120] p-2.5 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[10px] block">الكراتين والقطع:</span>
                    <span className="font-bold text-white">{numCartons} كرتون ({totalItems} قطعة)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">سعر شراء الكرتون:</span>
                    <span className="font-bold text-amber-300 font-mono">{settings.currencySymbol}{formatNumber(cartonCost)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">سعر البيع المفرد:</span>
                    <PriceHistoryTooltip product={p} currency={settings.currencySymbol} isAr={isAr}>
                      <span className="font-black text-emerald-400 font-mono text-sm hover:underline cursor-help">{settings.currencySymbol}{formatNumber(singleSell)}</span>
                    </PriceHistoryTooltip>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">ربح القطعة:</span>
                    <span className="font-bold text-cyan-300 font-mono">+{settings.currencySymbol}{formatNumber(singleProfitVal)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-1.5 pt-1">
                  {onOpenPrintBarcode && (
                    <button
                      type="button"
                      onClick={() => onOpenPrintBarcode(p)}
                      className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1"
                      title="طباعة وتخصيص ملصق السعر"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة ملصق</span>
                    </button>
                  )}
                  <button
                    onClick={() => onEditProduct(p)}
                    className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1 hover:bg-blue-500"
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
