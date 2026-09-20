import React, { useState, useMemo, useDeferredValue } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Trash2, 
  Edit3, 
  Printer, 
  Search, 
  FileSpreadsheet, 
  Package, 
  Layers, 
  ShieldAlert, 
  ArrowUpDown, 
  RefreshCw, 
  Check, 
  X,
  Sparkles,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, StoreSettings, UserAccount, ProductBatch } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { parseDate } from '../lib/dateUtils';
import { syncWriteDocument } from '../lib/firestoreSync';

interface ExpiryManagementViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
  currentUser?: UserAccount | null;
  onEditProduct: (product: Product) => void;
  onOpenPrintBarcode?: (product?: Product) => void;
  onOpenDamagedItems?: () => void;
  onBackToWarehouseMenu: () => void;
}

export type ExpiryFilterType = 'ALL_WITH_EXPIRY' | 'EXPIRED' | 'CRITICAL' | 'NEAR' | 'EARLY' | 'VALID' | 'ALL_PRODUCTS';

export interface ProcessedExpiryItem {
  product: Product;
  batch?: ProductBatch;
  batchNumber: string;
  expiryDateStr: string;
  expiryDateObj: Date;
  daysUntil: number;
  status: 'EXPIRED' | 'CRITICAL' | 'NEAR' | 'EARLY' | 'VALID' | 'NONE';
  quantity: number;
  unitCost: number;
  lossValue: number;
  singlePrice: number;
  supplier: string;
}

export const ExpiryManagementView: React.FC<ExpiryManagementViewProps> = ({
  products,
  setProducts,
  settings,
  currentUser,
  onEditProduct,
  onOpenPrintBarcode,
  onOpenDamagedItems,
  onBackToWarehouseMenu,
}) => {
  const isLight = settings.themeMode === 'light';
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const t = (ar: string, ku: string, en: string) => isKu ? ku : isAr ? ar : en;

  const isAdmin = !currentUser || currentUser.role === 'Admin';
  const perms = currentUser?.permissions;
  const canEditProducts = isAdmin || (currentUser?.role === 'Manager' && Boolean(perms?.canManageProducts));
  const canViewPurchasePrice = isAdmin || (currentUser?.role === 'Manager' && Boolean(perms?.canManageProducts)) || Boolean(perms?.canViewPurchasePriceInPOS);

  const [activeFilter, setActiveFilter] = useState<ExpiryFilterType>('ALL_WITH_EXPIRY');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DAYS_ASC' | 'DAYS_DESC' | 'STOCK_DESC' | 'LOSS_DESC'>('DAYS_ASC');
  const [showDiscardModal, setShowDiscardModal] = useState<ProcessedExpiryItem | null>(null);
  const [discardQty, setDiscardQty] = useState<number>(1);
  const [discardReason, setDiscardReason] = useState<string>('انتهاء تاريخ الصلاحية');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  const deferredSearch = useDeferredValue(search);

  // Process all products and their batches into a structured expiry list
  const processedItems = useMemo(() => {
    const list: ProcessedExpiryItem[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    products.forEach((p) => {
      const unitCost = p.costPerUnit || p.lastPurchasePrice || p.cartonPurchasePrice || p.cost || 0;
      const singlePrice = p.singleRetailPrice || p.price || 0;
      const supplier = p.supplierDelegate || p.supplierName || 'عام';

      // 1. If product has batches
      if (Array.isArray(p.batches) && p.batches.length > 0) {
        p.batches.forEach((b) => {
          if (b.expiryDate && b.expiryDate.trim() !== '' && b.expiryDate !== 'N/A') {
            const expDate = parseDate(b.expiryDate);
            const diffTime = expDate.getTime() - now.getTime();
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let status: ProcessedExpiryItem['status'] = 'VALID';
            if (days < 0) status = 'EXPIRED';
            else if (days <= 30) status = 'CRITICAL';
            else if (days <= 90) status = 'NEAR';
            else if (days <= 180) status = 'EARLY';

            const qty = b.quantity > 0 ? b.quantity : 0;
            list.push({
              product: p,
              batch: b,
              batchNumber: b.batchNumber || '—',
              expiryDateStr: b.expiryDate,
              expiryDateObj: expDate,
              daysUntil: days,
              status,
              quantity: qty,
              unitCost,
              lossValue: qty * unitCost,
              singlePrice,
              supplier,
            });
          }
        });
      } 
      
      // 2. If product has direct expiryDate field (and wasn't already covered by a single matching batch)
      if (p.expiryDate && p.expiryDate.trim() !== '' && p.expiryDate !== 'N/A') {
        const hasBatches = Array.isArray(p.batches) && p.batches.length > 0;
        if (!hasBatches) {
          const expDate = parseDate(p.expiryDate);
          const diffTime = expDate.getTime() - now.getTime();
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let status: ProcessedExpiryItem['status'] = 'VALID';
          if (days < 0) status = 'EXPIRED';
          else if (days <= 30) status = 'CRITICAL';
          else if (days <= 90) status = 'NEAR';
          else if (days <= 180) status = 'EARLY';

          const qty = p.stock > 0 ? p.stock : 0;
          list.push({
            product: p,
            batchNumber: '—',
            expiryDateStr: p.expiryDate,
            expiryDateObj: expDate,
            daysUntil: days,
            status,
            quantity: qty,
            unitCost,
            lossValue: qty * unitCost,
            singlePrice,
            supplier,
          });
        }
      }
    });

    return list;
  }, [products]);

  // Overall Statistics
  const stats = useMemo(() => {
    let expiredCount = 0;
    let expiredLoss = 0;
    let criticalCount = 0;
    let nearCount = 0;
    let earlyCount = 0;
    let validCount = 0;

    processedItems.forEach((item) => {
      if (item.status === 'EXPIRED') {
        expiredCount++;
        expiredLoss += item.lossValue;
      } else if (item.status === 'CRITICAL') {
        criticalCount++;
      } else if (item.status === 'NEAR') {
        nearCount++;
      } else if (item.status === 'EARLY') {
        earlyCount++;
      } else if (item.status === 'VALID') {
        validCount++;
      }
    });

    return {
      totalMonitored: processedItems.length,
      expiredCount,
      expiredLoss,
      criticalCount,
      nearCount,
      earlyCount,
      validCount,
    };
  }, [processedItems]);

  // Categories extraction
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      const c = p.categoryAr || p.category;
      if (c) cats.add(c);
    });
    return Array.from(cats);
  }, [products]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let result = processedItems;

    // Filter by Expiry Status
    if (activeFilter === 'EXPIRED') {
      result = result.filter(i => i.status === 'EXPIRED');
    } else if (activeFilter === 'CRITICAL') {
      result = result.filter(i => i.status === 'CRITICAL');
    } else if (activeFilter === 'NEAR') {
      result = result.filter(i => i.status === 'NEAR');
    } else if (activeFilter === 'EARLY') {
      result = result.filter(i => i.status === 'EARLY');
    } else if (activeFilter === 'VALID') {
      result = result.filter(i => i.status === 'VALID');
    } else if (activeFilter === 'ALL_WITH_EXPIRY') {
      result = result.filter(i => i.status !== 'NONE');
    }

    // Filter by Category
    if (selectedCategory !== 'ALL') {
      result = result.filter(i => (i.product.categoryAr || i.product.category) === selectedCategory);
    }

    // Filter by Search
    if (deferredSearch.trim() !== '') {
      const q = deferredSearch.toLowerCase().trim();
      result = result.filter(i => 
        (i.product.nameAr && i.product.nameAr.toLowerCase().includes(q)) ||
        (i.product.name && i.product.name.toLowerCase().includes(q)) ||
        (i.product.barcode && i.product.barcode.toLowerCase().includes(q)) ||
        (i.batchNumber && i.batchNumber.toLowerCase().includes(q)) ||
        (i.supplier && i.supplier.toLowerCase().includes(q))
      );
    }

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'DAYS_ASC') return a.daysUntil - b.daysUntil;
      if (sortBy === 'DAYS_DESC') return b.daysUntil - a.daysUntil;
      if (sortBy === 'STOCK_DESC') return b.quantity - a.quantity;
      if (sortBy === 'LOSS_DESC') return b.lossValue - a.lossValue;
      return 0;
    });

    return result;
  }, [processedItems, activeFilter, selectedCategory, deferredSearch, sortBy]);

  // Export Expiry Report to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredItems.map((item, idx) => {
      let statusText = 'صالح';
      if (item.status === 'EXPIRED') statusText = `منتهي الصلاحية (${Math.abs(item.daysUntil)} يوم مضت)`;
      else if (item.status === 'CRITICAL') statusText = `وشيك الانتهاء جداً (متبقي ${item.daysUntil} يوم)`;
      else if (item.status === 'NEAR') statusText = `قريب من الانتهاء (متبقي ${item.daysUntil} يوم)`;
      else if (item.status === 'EARLY') statusText = `تنبيه مبكر (متبقي ${item.daysUntil} يوم)`;

      return {
        'ت': idx + 1,
        'الباركود': item.product.barcode || '',
        'اسم المادة': item.product.nameAr || item.product.name || '',
        'القسم': item.product.categoryAr || item.product.category || '',
        'تاريخ الصلاحية': item.expiryDateStr,
        'رقم الوجبة / الباتش': item.batchNumber,
        'الأيام المتبقية / المنقضية': item.daysUntil,
        'حالة الصلاحية': statusText,
        'الكمية المتوفرة': item.quantity,
        'سعر الشراء ($)': item.unitCost,
        'سعر البيع المفرد ($)': item.singlePrice,
        'قيمة الخسارة التقديرية ($)': item.lossValue,
        'المورد / المندوب': item.supplier,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير تواريخ الصلاحية');
    
    const fileName = `تقرير_صلاحية_المواد_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Quick Action: Discard/Move to Damaged Items
  const handleConfirmDiscard = () => {
    if (!showDiscardModal) return;
    const item = showDiscardModal;
    const qtyToDiscard = Math.max(1, Math.min(discardQty, item.quantity || 1));

    // 1. Create damaged log record
    const record = {
      id: `dmg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      productId: item.product.id,
      productName: item.product.nameAr || item.product.name,
      barcode: item.product.barcode,
      quantity: qtyToDiscard,
      damageType: 'EXPIRED' as const,
      reason: discardReason || 'انتهاء الصلاحية',
      costPerUnit: item.unitCost,
      totalLossAmount: qtyToDiscard * item.unitCost,
      recordedAt: new Date().toISOString(),
      cashierName: currentUser?.fullName || currentUser?.username || 'المدير العام',
      stockDeducted: true,
    };

    try {
      const savedLogs = localStorage.getItem('pos_damaged_items_logs');
      const logs = savedLogs ? JSON.parse(savedLogs) : [];
      logs.unshift(record);
      localStorage.setItem('pos_damaged_items_logs', JSON.stringify(logs));
    } catch (e) {}

    // 2. Deduct product stock and update product batch if present
    const updatedProducts = products.map((p) => {
      if (p.id !== item.product.id) return p;

      const newStock = Math.max(0, (p.stock || 0) - qtyToDiscard);
      let updatedBatches = p.batches;

      if (Array.isArray(p.batches) && item.batch) {
        updatedBatches = p.batches.map((b) => {
          if (b.batchNumber === item.batch?.batchNumber && b.expiryDate === item.batch?.expiryDate) {
            return { ...b, quantity: Math.max(0, (b.quantity || 0) - qtyToDiscard) };
          }
          return b;
        });
      }

      const updated = {
        ...p,
        stock: newStock,
        totalUnits: newStock,
        batches: updatedBatches,
      };

      // Sync updated product
      syncWriteDocument('products', updated.id, updated);
      return updated;
    });

    setProducts(updatedProducts);
    localStorage.setItem('supermarket_products_v1', JSON.stringify(updatedProducts));

    setShowDiscardModal(null);
    setActionSuccessMsg(
      isAr 
        ? `✅ تم سحب وإتلاف (${qtyToDiscard}) قطعة من (${item.product.nameAr || item.product.name}) وتوثيقها بسجل المواد المنتهية!`
        : `✅ Successfully moved ${qtyToDiscard} expired units to damaged records!`
    );

    setTimeout(() => setActionSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      {/* Top Header Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border transition-all duration-300 shadow-md ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#10192D] border-blue-500/20 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToWarehouseMenu}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer shadow ${
              isLight
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border-cyan-500/30'
            }`}
            title={t('الرجوع لأقسام المخزن', 'گەڕانەوە بۆ بەشەکانی کۆگا', 'Back to Warehouse Sections')}
          >
            <span>←</span>
            <span>{t('أقسام المخزن', 'بەشەکانی کۆگا', 'Warehouse Hub')}</span>
          </button>

          <div>
            <h2 className={`text-base sm:text-lg font-black flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <Clock className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{t('المواد المنتهية والصلاحيات (نظام تتبع الصلاحية)', 'کاڵا بەسەرچووەکان و بەرواری کۆتایی', 'Expiry & Expiration Management')}</span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('متابعة دقيقة لتواريخ انتهاء الصلاحية، الدفعات والباتشات، وتفادي الخسائر وتصفية البضائع', 'چاودێری وردی بەرواری بەسەرچوونی کاڵاکان و ڕێگری لە زەرەر', 'Track product expiry dates, active batches, and prevent inventory losses')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenDamagedItems && (
            <button
              onClick={onOpenDamagedItems}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                isLight
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-500/30'
              }`}
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>{t('سجل المواد المتلفة والمكسورة', 'تۆماری کاڵای تێکچوو', 'Damaged Items Log')}</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer ${
              isLight
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm'
                : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
            }`}
            title={t('تصدير التقرير إلى ملف إكسل', 'هەناردەکردن بۆ ئیکسڵ', 'Export Expiry to Excel')}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{t('تصدير إكسل', 'هەناردەی Excel', 'Export Excel')}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg('')} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* 1. Expired Items */}
        <div 
          onClick={() => setActiveFilter('EXPIRED')}
          className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
            activeFilter === 'EXPIRED' ? 'ring-2 ring-rose-500 shadow-lg scale-[1.01]' : 'hover:border-rose-400/80'
          } ${
            isLight ? 'bg-white border-rose-200' : 'bg-gradient-to-br from-[#200A10] to-[#2D0F18] border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>
              {t('منتهية الصلاحية ⛔', 'بەسەرچووەکان ⛔', 'Expired Items ⛔')}
            </span>
            <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 font-mono text-rose-600 dark:text-rose-400">
            {stats.expiredCount}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-rose-700/80 dark:text-rose-300/80">
            <span>{t('خسارة محتملة:', 'زەرەری خەمڵێنراو:', 'Loss at risk:')}</span>
            <span className="font-mono font-bold">{settings.currencySymbol}{formatNumber(stats.expiredLoss)}</span>
          </div>
        </div>

        {/* 2. Critical Alert (<= 30 Days) */}
        <div 
          onClick={() => setActiveFilter('CRITICAL')}
          className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
            activeFilter === 'CRITICAL' ? 'ring-2 ring-orange-500 shadow-lg scale-[1.01]' : 'hover:border-orange-400/80'
          } ${
            isLight ? 'bg-white border-orange-200' : 'bg-gradient-to-br from-[#241206] to-[#341B0A] border-orange-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? 'text-orange-700' : 'text-orange-300'}`}>
              {t('وشيكة جداً (خلال شهر) 🚨', 'زۆر نزیک (لە مانگێکدا) 🚨', 'Critical (≤ 30 Days) 🚨')}
            </span>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 font-mono text-orange-600 dark:text-orange-400">
            {stats.criticalCount}
          </p>
          <p className="text-[10.5px] text-orange-600/80 dark:text-orange-300/80 font-medium mt-1">
            {t('تتطلب تصريفاً وعروضاً فورية', 'پێویستی بە فرۆشتنی خێرایە', 'Needs immediate clearance sale')}
          </p>
        </div>

        {/* 3. Near Expiry (30 - 90 Days) */}
        <div 
          onClick={() => setActiveFilter('NEAR')}
          className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
            activeFilter === 'NEAR' ? 'ring-2 ring-amber-500 shadow-lg scale-[1.01]' : 'hover:border-amber-400/80'
          } ${
            isLight ? 'bg-white border-amber-200' : 'bg-gradient-to-br from-[#1C1507] to-[#2B200C] border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
              {t('قريبة من الانتهاء (1-3 أشهر) ⚠️', 'نزیک لە بەسەرچوون (١-٣ مانگ) ⚠️', 'Near Expiry (30-90 Days) ⚠️')}
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 font-mono text-amber-600 dark:text-amber-400">
            {stats.nearCount}
          </p>
          <p className="text-[10.5px] text-amber-600/80 dark:text-amber-300/80 font-medium mt-1">
            {t('أولوية البيع أولاً بأول (FEFO)', 'پێشینەی فرۆشتن', 'FEFO priority selling')}
          </p>
        </div>

        {/* 4. Total Monitored Products */}
        <div 
          onClick={() => setActiveFilter('ALL_WITH_EXPIRY')}
          className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
            activeFilter === 'ALL_WITH_EXPIRY' ? 'ring-2 ring-blue-500 shadow-lg scale-[1.01]' : 'hover:border-blue-400/80'
          } ${
            isLight ? 'bg-white border-blue-200' : 'bg-gradient-to-br from-[#0B1528] to-[#0F1D38] border-cyan-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? 'text-blue-700' : 'text-cyan-300'}`}>
              {t('إجمالي المواد المراقبة 📦', 'کۆی گشتی کاڵا چاودێریکراوەکان 📦', 'Total Monitored 📦')}
            </span>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black mt-1 font-mono text-blue-700 dark:text-cyan-300">
            {stats.totalMonitored}
          </p>
          <p className="text-[10.5px] text-blue-600/80 dark:text-cyan-400/80 font-medium mt-1">
            {t(`منها ${stats.validCount} صالحة وسارية`, `لەوانە ${stats.validCount} بەسەرنەچووە`, `${stats.validCount} valid & safe`)}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F172A] border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Filter Pill Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter('ALL_WITH_EXPIRY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeFilter === 'ALL_WITH_EXPIRY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>{t('الكل', 'هەموو', 'All')}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-white font-bold">{stats.totalMonitored}</span>
            </button>

            <button
              onClick={() => setActiveFilter('EXPIRED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeFilter === 'EXPIRED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : isLight ? 'bg-rose-50 text-rose-800 hover:bg-rose-100' : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60'
              }`}
            >
              <span>{t('⛔ منتهية الصلاحية', '⛔ بەسەرچوو', '⛔ Expired')}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-rose-700 text-white font-bold">{stats.expiredCount}</span>
            </button>

            <button
              onClick={() => setActiveFilter('CRITICAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeFilter === 'CRITICAL'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : isLight ? 'bg-orange-50 text-orange-800 hover:bg-orange-100' : 'bg-orange-950/40 text-orange-300 hover:bg-orange-900/60'
              }`}
            >
              <span>{t('🚨 وشيكة (≤ 30 يوم)', '🚨 کەمتر لە مانگێک', '🚨 ≤ 30 Days')}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-orange-700 text-white font-bold">{stats.criticalCount}</span>
            </button>

            <button
              onClick={() => setActiveFilter('NEAR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeFilter === 'NEAR'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isLight ? 'bg-amber-50 text-amber-800 hover:bg-amber-100' : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/60'
              }`}
            >
              <span>{t('⚠️ قريبة (30-90 يوم)', '⚠️ ١-٣ مانگ', '⚠️ 30-90 Days')}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-700 text-white font-bold">{stats.nearCount}</span>
            </button>

            <button
              onClick={() => setActiveFilter('EARLY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeFilter === 'EARLY'
                  ? 'bg-yellow-600 text-white shadow-sm'
                  : isLight ? 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100' : 'bg-yellow-950/40 text-yellow-300 hover:bg-yellow-900/60'
              }`}
            >
              <span>{t('🟡 تنبيه (3-6 أشهر)', '🟡 ٣-٦ مانگ', '🟡 3-6 Months')}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-yellow-700 text-white font-bold">{stats.earlyCount}</span>
            </button>

            <button
              onClick={() => setActiveFilter('VALID')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                activeFilter === 'VALID'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isLight ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60'
              }`}
            >
              <span>{t('🟢 صالحة وسارية', '🟢 بەسەرنەچوو', '🟢 Valid')}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-700 text-white font-bold">{stats.validCount}</span>
            </button>
          </div>

          {/* Search and Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3 ltr:left-3 ltr:right-auto ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('بحث بالاسم، الباركود، الباتش أو المورد...', 'گەڕان بەپێی ناو، بارکۆد، دابینکەر...', 'Search by name, barcode, batch...')}
                className={`w-full text-xs rounded-xl py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 border transition-all ${
                  isLight 
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-500' 
                    : 'bg-[#0B1120] border-slate-700 text-white focus:border-cyan-500'
                }`}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 -translate-y-1/2 rtl:left-2.5 ltr:right-2.5 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            {availableCategories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`text-xs rounded-xl py-2 px-2.5 border font-semibold ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : 'bg-[#0B1120] border-slate-700 text-slate-200'
                }`}
              >
                <option value="ALL">{t('جميع الأقسام', 'هەموو بەشەکان', 'All Categories')}</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className={`text-xs rounded-xl py-2 px-2.5 border font-semibold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800'
                  : 'bg-[#0B1120] border-slate-700 text-slate-200'
              }`}
            >
              <option value="DAYS_ASC">{t('الأقرب انتهاءً أولاً', 'نزیکترین بەسەرچوون لەسەرەتا', 'Earliest Expiry First')}</option>
              <option value="DAYS_DESC">{t('الأبعد انتهاءً أولاً', 'دوورترین بەسەرچوون', 'Furthest Expiry First')}</option>
              <option value="LOSS_DESC">{t('الأعلى قيمة خسارة', 'بەرزترین زیان', 'Highest Loss Value')}</option>
              <option value="STOCK_DESC">{t('الأعلى رصيداً وكمية', 'زۆرترین بڕ', 'Highest Quantity')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className={`rounded-2xl border overflow-hidden shadow-lg transition-all ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0F172A] border-slate-800'
      }`}>
        <div className={`p-3 border-b flex items-center justify-between flex-wrap gap-2 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B1120] border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-500" />
            <span className={`text-xs sm:text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {t('جدول تتبع تواريخ الصلاحية والدفعات', 'خشتەی بەدواداچوونی بەرواری بەسەرچوون', 'Expiry & Batch Tracking Table')}
            </span>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {filteredItems.length}
            </span>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className={`text-base font-black ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              {t('لا توجد مواد تطابق هذا الفلتر حالياً', 'هیچ کاڵایەک نەدۆزرایەوە', 'No products matching this filter')}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {activeFilter === 'EXPIRED' 
                ? t('ممتاز! لا توجد مواد منتهية الصلاحية في المخزن حالياً.', 'نایابە! هیچ کاڵایەکی بەسەرچوو نییە.', 'Great! No expired items in inventory right now.')
                : t('جرّب تغيير خيارات البحث أو التصفية بالأعلى.', 'تکایە فلتەرەکە بگۆڕە.', 'Try adjusting the search or filter options.')
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-[11px]">
              <thead>
                <tr className={`border-b font-bold uppercase text-[10px] whitespace-nowrap ${
                  isLight ? 'bg-slate-100/80 border-slate-200 text-slate-700' : 'bg-[#0B1120] border-slate-800 text-slate-400'
                }`}>
                  <th className="py-3 px-3 text-center">{t('الحالة والأيام', 'دۆخ و ڕۆژەکان', 'Status & Days')}</th>
                  <th className="py-3 px-3">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                  <th className="py-3 px-3">{t('اسم المادة', 'ناوی کاڵا', 'Product Name')}</th>
                  <th className="py-3 px-3 text-center">{t('تاريخ الانتهاء', 'بەرواری بەسەرچوون', 'Expiry Date')}</th>
                  <th className="py-3 px-3 text-center">{t('رقم الوجبة (Batch)', 'ژمارەی باچ', 'Batch #')}</th>
                  <th className="py-3 px-3 text-center">{t('الكمية المتبقية', 'بڕی ماوە', 'Remaining Stock')}</th>
                  {canViewPurchasePrice && (
                    <th className="py-3 px-3 text-center">{t('سعر الشراء والخسارة', 'نرخی کڕین و زیان', 'Cost & Loss Value')}</th>
                  )}
                  <th className="py-3 px-3">{t('المورد / المندوب', 'دابینکەر', 'Supplier')}</th>
                  <th className="py-3 px-3 text-center">{t('إجراءات سريعة', 'کردارە خێراکان', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y whitespace-nowrap ${
                isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/60 text-slate-200'
              }`}>
                {filteredItems.map((item, idx) => {
                  const isExp = item.status === 'EXPIRED';
                  const isCrit = item.status === 'CRITICAL';
                  const isNear = item.status === 'NEAR';
                  const isEarly = item.status === 'EARLY';

                  return (
                    <tr 
                      key={`${item.product.id}_${item.batchNumber}_${idx}`}
                      className={`transition-colors ${
                        isExp
                          ? isLight ? 'bg-rose-50/80 hover:bg-rose-100/80' : 'bg-rose-950/20 hover:bg-rose-900/30'
                          : isCrit
                          ? isLight ? 'bg-orange-50/80 hover:bg-orange-100/80' : 'bg-orange-950/20 hover:bg-orange-900/30'
                          : isNear
                          ? isLight ? 'bg-amber-50/60 hover:bg-amber-100/60' : 'bg-amber-950/15 hover:bg-amber-900/25'
                          : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* 1. Status Badge with Days Counter */}
                      <td className="py-2.5 px-3 text-center">
                        {isExp ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-sm animate-pulse">
                            <ShieldAlert className="w-3 h-3 shrink-0" />
                            <span>{t(`منتهي منذ ${Math.abs(item.daysUntil)} يوم`, `${Math.abs(item.daysUntil)} ڕۆژە بەسەرچووە`, `Expired ${Math.abs(item.daysUntil)}d ago`)}</span>
                          </span>
                        ) : isCrit ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-600 text-white shadow-sm">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{t(`متبقي ${item.daysUntil} يوم فقط!`, `تەنها ${item.daysUntil} ڕۆژ ماوە!`, `${item.daysUntil} days left!`)}</span>
                          </span>
                        ) : isNear ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{t(`متبقي ${item.daysUntil} يوم`, `${item.daysUntil} ڕۆژ ماوە`, `${item.daysUntil} days left`)}</span>
                          </span>
                        ) : isEarly ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isLight ? 'bg-yellow-100 text-yellow-900 border border-yellow-300' : 'bg-yellow-950/60 text-yellow-300 border border-yellow-600/40'
                          }`}>
                            <Info className="w-3 h-3 shrink-0" />
                            <span>{t(`متبقي ${item.daysUntil} يوم`, `${item.daysUntil} ڕۆژ`, `${item.daysUntil} days`)}</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isLight ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/40'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>{t(`صالح (${item.daysUntil} يوم)`, `بەسەرنەچوو (${item.daysUntil})`, `Valid (${item.daysUntil}d)`)}</span>
                          </span>
                        )}
                      </td>

                      {/* 2. Barcode */}
                      <td className={`py-2.5 px-3 font-mono font-bold ${
                        isLight ? 'text-blue-700' : 'text-cyan-400'
                      }`}>
                        {item.product.barcode || '—'}
                      </td>

                      {/* 3. Product Name */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className={`font-black text-xs ${
                            isExp ? 'text-rose-700 dark:text-rose-300' : isLight ? 'text-slate-900' : 'text-white'
                          }`}>
                            {item.product.nameAr || item.product.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {item.product.categoryAr || item.product.category || 'عام'}
                          </span>
                        </div>
                      </td>

                      {/* 4. Expiry Date */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          isExp 
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40' 
                            : isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-800 text-slate-200'
                        }`}>
                          {item.expiryDateStr}
                        </span>
                      </td>

                      {/* 5. Batch # */}
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500">
                        {item.batchNumber}
                      </td>

                      {/* 6. Current Stock */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-mono font-black text-xs px-2 py-0.5 rounded ${
                          item.quantity <= 0
                            ? 'bg-slate-100 text-slate-400'
                            : isExp
                            ? 'bg-rose-600 text-white'
                            : isLight ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'bg-slate-800 text-cyan-300'
                        }`}>
                          {item.quantity} {t('قطعة', 'دانە', 'pcs')}
                        </span>
                      </td>

                      {/* 7. Cost & Loss Value */}
                      {canViewPurchasePrice && (
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-mono font-bold text-[11px] text-slate-600 dark:text-slate-300">
                              {settings.currencySymbol}{formatNumber(item.unitCost)}
                            </span>
                            {item.quantity > 0 && (
                              <span className={`font-mono font-black text-[10px] ${
                                isExp ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                              }`}>
                                {isExp ? t('خسارة: ', 'زیان: ', 'Loss: ') : ''}{settings.currencySymbol}{formatNumber(item.lossValue)}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 8. Supplier */}
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[120px]">
                        {item.supplier}
                      </td>

                      {/* 9. Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Discard Button (For Expired or Critical items with stock) */}
                          {canEditProducts && item.quantity > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowDiscardModal(item);
                                setDiscardQty(item.quantity);
                                setDiscardReason(isExp ? 'انتهاء تاريخ الصلاحية' : 'تلف وقرب انتهاء الصلاحية');
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                                isExp
                                  ? 'bg-rose-600 hover:bg-rose-500 text-white ring-1 ring-rose-400'
                                  : isLight 
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' 
                                  : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30'
                              }`}
                              title={t('سحب وإتلاف المادة وتوثيقها بسجل التالف', 'سڕینەوە و خستنە لیستی تێکچوو', 'Discard & log to damaged')}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{t('إتلاف وسحب', 'تێکچوو', 'Discard')}</span>
                            </button>
                          )}

                          {/* Print Barcode */}
                          {onOpenPrintBarcode && (
                            <button
                              type="button"
                              onClick={() => onOpenPrintBarcode(item.product)}
                              className={`p-1.5 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                                isLight
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                              title={t('طباعة باركود وملصق السعر', 'چاپکردنی بارکۆد', 'Print Barcode')}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Product */}
                          {canEditProducts && (
                            <button
                              type="button"
                              onClick={() => onEditProduct(item.product)}
                              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                              title={t('تعديل المادة أو تحديث تاريخ الصلاحية', 'دەستکاری کاڵا', 'Edit Product')}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md p-5 rounded-2xl border shadow-2xl transition-all ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#10192D] border-rose-500/30 text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-black">
                  {t('إتلاف وسحب مادة منتهية الصلاحية', 'تێکچوون و سڕینەوەی کاڵای بەسەرچوو', 'Discard Expired Item')}
                </h3>
              </div>
              <button 
                onClick={() => setShowDiscardModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              <div className={`p-3 rounded-xl border ${
                isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/30 border-rose-500/30'
              }`}>
                <p className="font-black text-sm text-rose-700 dark:text-rose-300">
                  {showDiscardModal.product.nameAr || showDiscardModal.product.name}
                </p>
                <div className="flex items-center justify-between text-xs mt-1 text-slate-600 dark:text-slate-300 font-mono">
                  <span>الباركود: {showDiscardModal.product.barcode}</span>
                  <span>الصلاحية: {showDiscardModal.expiryDateStr}</span>
                </div>
                <div className="text-xs mt-1 text-slate-500">
                  الكمية المتوفرة بالمخزن: <strong className="text-rose-600">{showDiscardModal.quantity} قطعة</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  {t('الكمية المراد سحبها وإتلافها (قطعة):', 'بڕی سڕینەوە (دانە):', 'Quantity to discard (pcs):')}
                </label>
                <input
                  type="number"
                  min="1"
                  max={showDiscardModal.quantity}
                  value={discardQty}
                  onChange={(e) => setDiscardQty(parseInt(e.target.value) || 1)}
                  className={`w-full text-base font-bold font-mono rounded-xl p-2.5 border transition-all ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0B1120] border-slate-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  {t('سبب الإتلاف / الملاحظة:', 'هۆکاری تێکچوون:', 'Reason for discard:')}
                </label>
                <input
                  type="text"
                  value={discardReason}
                  onChange={(e) => setDiscardReason(e.target.value)}
                  className={`w-full text-xs rounded-xl p-2.5 border transition-all ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0B1120] border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800/80 text-slate-300'
              }`}>
                ℹ️ {t(
                  'سيقوم النظام بخصم الكمية فورياً من المخزن وتسجيلها في تقارير وسجل المواد المتلفة لحساب الخسائر بدقة.',
                  'سیستەمەکە بڕەکە لە کۆگا دەبڕێت و لە لیستی تێکچوو تۆماری دەکات.',
                  'System will deduct quantity from inventory and log into Damaged Items report.'
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDiscardModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                {t('إلغاء', 'پەشیمانبوونەوە', 'Cancel')}
              </button>

              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('تأكيد الإتلاف والخصم من المخزن', 'تەئکیدکردنی تێکچوون', 'Confirm Discard & Deduct')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
