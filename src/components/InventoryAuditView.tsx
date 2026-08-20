import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  RotateCcw,
  Package,
  FileSpreadsheet,
  Zap,
  TrendingDown,
  TrendingUp,
  Boxes,
  Save,
  Check,
  Plus,
  Minus,
  Barcode,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Product, StoreSettings, UserAccount, InventoryAuditSession, InventoryAuditItem } from '../types';
import { exportDataToExcel } from '../lib/excelExport';
import { syncBulkWriteCollection } from '../lib/firestoreSync';

interface InventoryAuditViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
  currentUser?: UserAccount | null;
  onBackToWarehouse?: () => void;
  onNavigateToReports?: () => void;
}

export const InventoryAuditView: React.FC<InventoryAuditViewProps> = ({
  products,
  setProducts,
  settings,
  currentUser,
  onBackToWarehouse,
  onNavigateToReports
}) => {
  const lang = settings.language || 'ar';
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const isLight = settings.themeMode === 'light';
  const currency = settings.currencySymbol || 'د.ع';

  const t = (ar: string, ku: string, en: string = ar) => isKu ? ku : isAr ? ar : en;

  // Search & Barcode Scan State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [scanFeedbackMessage, setScanFeedbackMessage] = useState<{ text: string; type: 'success' | 'warn' | 'error' } | null>(null);
  
  // Scanned Product IDs in current audit session
  const [scannedProductIds, setScannedProductIds] = useState<Set<string>>(() => new Set());
  const [showAllProductsTable, setShowAllProductsTable] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterDiscrepancy, setFilterDiscrepancy] = useState<'ALL' | 'DIFF_ONLY' | 'MATCH_ONLY' | 'DEFICIT_ONLY' | 'SURPLUS_ONLY'>('ALL');
  const [auditorName, setAuditorName] = useState(currentUser?.fullName || (isAr ? 'مسؤول الجرد والمخزن' : 'Inventory Auditor'));
  const [auditNotes, setAuditNotes] = useState('');
  const [isSuccessToast, setIsSuccessToast] = useState(false);
  const [savedSessionNumber, setSavedSessionNumber] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Auto focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // State: Actual Count for each product in Market (العدد الفعلي المدخل يدوياً بالجرد)
  // Initially we start empty or with empty actual counts for unscanned items
  const [actualUnits, setActualUnits] = useState<Record<string, number>>({});

  // Helper: System Recorded Units (رصيد النظام المسجل في المخزن/الماركت - للقراءة فقط)
  const getSystemRecordedUnits = (p: Product) => {
    const uPerC = Math.max(1, p.unitsPerCarton || 1);
    if (p.totalUnits !== undefined && p.totalUnits !== null) {
      return p.totalUnits;
    }
    if (p.stock !== undefined && p.stock !== null) {
      return p.stock;
    }
    return (p.cartonsCount || 0) * uPerC;
  };

  const getSystemRecordedCartons = (p: Product) => {
    const uPerC = Math.max(1, p.unitsPerCarton || 1);
    const units = getSystemRecordedUnits(p);
    return Math.floor(units / uPerC);
  };

  // Helper: Actual Units counted in Audit
  const getProductActualCount = (p: Product) => {
    if (actualUnits[p.id] !== undefined) {
      return actualUnits[p.id];
    }
    // If not manually entered yet, check if scanned or default to 0
    return 0;
  };

  // Unit Cost calculation
  const getProductUnitCost = (p: Product) => {
    const uPerC = Math.max(1, p.unitsPerCarton || 1);
    if (p.costPerUnit && p.costPerUnit > 0) return p.costPerUnit;
    if (p.cost && p.cost > 0) return p.cost;
    if (p.lastPurchasePrice && p.lastPurchasePrice > 0) return p.lastPurchasePrice;
    if (p.cartonPurchasePrice && p.cartonPurchasePrice > 0) return p.cartonPurchasePrice / uPerC;
    return p.price > 0 ? (p.price * 0.75) : 0;
  };

  // Distinct categories
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.categoryAr) cats.add(p.categoryAr);
      else if (p.category) cats.add(p.category);
    });
    return ['ALL', ...Array.from(cats)];
  }, [products]);

  // Handle manual count updates (الحقل القابل للإدخال اليدوي)
  const handleUpdateActualCount = (id: string, val: number) => {
    const finalVal = Math.max(0, val);
    setActualUnits(prev => ({ ...prev, [id]: finalVal }));
    setScannedProductIds(prev => new Set(prev).add(id));
  };

  const handleQuickMatch = (p: Product) => {
    const recUnits = getSystemRecordedUnits(p);
    setActualUnits(prev => ({ ...prev, [p.id]: recUnits }));
    setScannedProductIds(prev => new Set(prev).add(p.id));
  };

  // Barcode Scanning Handler
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    // Lookup product by exact barcode or name
    const found = products.find(p => 
      p.barcode === code || 
      p.barcode.toLowerCase() === code.toLowerCase() ||
      (p.sku && p.sku === code) ||
      p.name.toLowerCase() === code.toLowerCase() ||
      (p.nameAr && p.nameAr.toLowerCase() === code.toLowerCase())
    );

    if (found) {
      setLastScannedProduct(found);
      setScannedProductIds(prev => new Set(prev).add(found.id));
      
      // If product was not in actualUnits yet, increment count by 1 or initialize
      setActualUnits(prev => {
        const currentVal = prev[found.id];
        const newVal = currentVal !== undefined ? currentVal + 1 : 1;
        return { ...prev, [found.id]: newVal };
      });

      setScanFeedbackMessage({
        text: isAr 
          ? `✅ تم مسح: ${found.nameAr || found.name} (الباركود: ${found.barcode})`
          : `✅ Scanned: ${found.nameAr || found.name} (Barcode: ${found.barcode})`,
        type: 'success'
      });
      setBarcodeInput('');
    } else {
      setScanFeedbackMessage({
        text: isAr ? `⚠️ لم يتم العثور على مادة بالباركود: ${code}` : `⚠️ Product not found with barcode: ${code}`,
        type: 'error'
      });
    }

    setTimeout(() => {
      setScanFeedbackMessage(null);
    }, 4000);

    barcodeInputRef.current?.focus();
  };

  // Quick Preset Actions
  const handleResetToSystem = () => {
    if (!confirm(t('هل تريد ضبط جميع المواد لتطابق رصيد النظام المسجل؟', 'دڵنیایت لە هاوتاکردنەوەی هەموو بڕەکان بەپێی سیستەم؟', 'Match all actual counts to system balance?'))) return;
    const newActual: Record<string, number> = {};
    const newIds = new Set<string>();
    products.forEach(p => {
      newActual[p.id] = getSystemRecordedUnits(p);
      newIds.add(p.id);
    });
    setActualUnits(newActual);
    setScannedProductIds(newIds);
  };

  const handleZeroAll = () => {
    if (!confirm(t('هل تريد تصفير قائمة الجرد والبدء من جديد؟', 'دڵنیایت لە بەتاڵکردنەوە و دەستپێکردن لە سفرەوە؟', 'Clear audit list to start fresh scanning?'))) return;
    setActualUnits({});
    setScannedProductIds(new Set());
    setLastScannedProduct(null);
  };

  // Active products list for audit:
  // If showAllProductsTable is false: ONLY show products that have been scanned or manually counted!
  // If showAllProductsTable is true: show all products filtered by search/category.
  const auditActiveProducts = useMemo(() => {
    return products.filter(p => {
      // If we are in scan-only mode, only show scanned products
      if (!showAllProductsTable && !scannedProductIds.has(p.id)) {
        return false;
      }

      // Search
      const q = barcodeInput.toLowerCase().trim();
      const matchesSearch = !barcodeInput || (
        p.name.toLowerCase().includes(q) ||
        (p.nameAr && p.nameAr.includes(barcodeInput)) ||
        p.barcode.includes(barcodeInput)
      );
      if (!matchesSearch) return false;

      // Category
      if (selectedCategory !== 'ALL') {
        const cat = p.categoryAr || p.category;
        if (cat !== selectedCategory) return false;
      }

      // Discrepancy status
      const systemUnits = getSystemRecordedUnits(p);
      const actUnits = actualUnits[p.id] !== undefined ? actualUnits[p.id] : (scannedProductIds.has(p.id) ? 0 : systemUnits);
      const diff = actUnits - systemUnits;

      if (filterDiscrepancy === 'DIFF_ONLY' && diff === 0) return false;
      if (filterDiscrepancy === 'MATCH_ONLY' && diff !== 0) return false;
      if (filterDiscrepancy === 'DEFICIT_ONLY' && diff >= 0) return false;
      if (filterDiscrepancy === 'SURPLUS_ONLY' && diff <= 0) return false;

      return true;
    });
  }, [products, showAllProductsTable, scannedProductIds, barcodeInput, selectedCategory, filterDiscrepancy, actualUnits]);

  // Live Statistics for Audited Products
  const stats = useMemo(() => {
    // We compute stats on scanned/audited products (or all if user configured)
    const auditedList = products.filter(p => scannedProductIds.has(p.id));
    const totalAudited = auditedList.length;

    let matchedCount = 0;
    let deficitCount = 0;
    let surplusCount = 0;
    let totalSystemUnits = 0;
    let totalActualUnits = 0;
    let netFinancialVariance = 0;
    let deficitFinancialLoss = 0;
    let surplusFinancialGain = 0;

    auditedList.forEach(p => {
      const sysUnits = getSystemRecordedUnits(p);
      const actUnits = actualUnits[p.id] !== undefined ? actualUnits[p.id] : 0;
      const diff = actUnits - sysUnits;
      const unitCost = getProductUnitCost(p);

      totalSystemUnits += sysUnits;
      totalActualUnits += actUnits;

      if (diff === 0) {
        matchedCount++;
      } else if (diff < 0) {
        deficitCount++;
        const val = Math.abs(diff) * unitCost;
        deficitFinancialLoss += val;
        netFinancialVariance -= val;
      } else {
        surplusCount++;
        const val = diff * unitCost;
        surplusFinancialGain += val;
        netFinancialVariance += val;
      }
    });

    const accuracyRate = totalAudited > 0 ? Math.round((matchedCount / totalAudited) * 100) : 100;

    return {
      totalAudited,
      totalCatalogItems: products.length,
      matchedCount,
      deficitCount,
      surplusCount,
      discrepancyCount: deficitCount + surplusCount,
      totalSystemUnits,
      totalActualUnits,
      accuracyRate,
      netFinancialVariance,
      deficitFinancialLoss,
      surplusFinancialGain
    };
  }, [products, scannedProductIds, actualUnits]);

  // Apply Audit and Commit changes to database
  const handleApplyAudit = () => {
    if (scannedProductIds.size === 0) {
      alert(t('لم تقم بقراءة أو جرد أي مادة بعد! يرجى قراءة باركود المواد لجردها أولاً.', 'هیچ کاڵایەکت جرد نەکردووە! تکایە بارکۆدی کاڵاکان بخوێنەوە.', 'No products scanned for audit yet! Please scan barcodes first.'));
      return;
    }

    const auditedCount = scannedProductIds.size;
    const msg = t(
      `اعتماد الجرد لـ (${auditedCount}) مادة مدققة.\n` +
      `- أصناف مطابقة: ${stats.matchedCount}\n` +
      `- أصناف بها عجز: ${stats.deficitCount}\n` +
      `- أصناف بها زيادة: ${stats.surplusCount}\n` +
      `- الأثر المالي الصافي: ${currency} ${stats.netFinancialVariance.toLocaleString('en-US')}\n\n` +
      `هل تريد تأكيد اعتماد الجرد وتحديث أرصدة المخزن والمواد التي تم تدقيقها الآن؟`,
      `پەسەندکردنی جرد بۆ (${auditedCount}) کاڵا.\n` +
      `- هاوتا: ${stats.matchedCount}\n` +
      `- کەم: ${stats.deficitCount}\n` +
      `- زیاد: ${stats.surplusCount}\n` +
      `- پوختەی دارایی: ${currency} ${stats.netFinancialVariance.toLocaleString('en-US')}\n\n` +
      `دڵنیایت لە نوێکردنەوەی کۆگا؟`,
      `Commit audit for (${auditedCount}) audited products?\n` +
      `Financial impact: ${currency} ${stats.netFinancialVariance.toLocaleString('en-US')}`
    );

    if (!confirm(msg)) return;

    const sessionNum = `AUD-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // Generate Itemized records for audit session (for scanned products)
    const auditItems: InventoryAuditItem[] = products
      .filter(p => scannedProductIds.has(p.id))
      .map(p => {
        const uPerC = Math.max(1, p.unitsPerCarton || 1);
        const sysUnits = getSystemRecordedUnits(p);
        const sysCartons = Math.floor(sysUnits / uPerC);
        const actUnits = actualUnits[p.id] !== undefined ? actualUnits[p.id] : 0;
        const actCartons = Math.floor(actUnits / uPerC);
        const diffUnits = actUnits - sysUnits;
        const diffCartons = actCartons - sysCartons;
        const unitCost = getProductUnitCost(p);
        const financialVariance = diffUnits * unitCost;
        const status = diffUnits === 0 ? 'match' : diffUnits < 0 ? 'deficit' : 'surplus';

        return {
          productId: p.id,
          barcode: p.barcode,
          productName: p.nameAr || p.name,
          unitsPerCarton: uPerC,
          systemUnits: sysUnits,
          systemCartons: sysCartons,
          marketUnits: actUnits,
          warehouseUnits: 0,
          actualUnits: actUnits,
          actualCartons: actCartons,
          diffUnits,
          diffCartons,
          unitCost,
          financialVariance,
          status
        };
      });

    const nowIso = new Date().toISOString();
    const auditSession: InventoryAuditSession = {
      id: `audit_${Date.now()}`,
      sessionNumber: sessionNum,
      timestamp: nowIso,
      date: dateStr,
      time: timeStr,
      auditorName: auditorName || 'مسؤول الجرد',
      notes: auditNotes,
      totalProductsAudited: auditedCount,
      matchedCount: stats.matchedCount,
      discrepancyCount: stats.discrepancyCount,
      deficitCount: stats.deficitCount,
      surplusCount: stats.surplusCount,
      totalSystemUnits: stats.totalSystemUnits,
      totalActualUnits: stats.totalActualUnits,
      totalSystemCartons: Math.floor(stats.totalSystemUnits / 12),
      totalActualCartons: Math.floor(stats.totalActualUnits / 12),
      totalFinancialVariance: stats.netFinancialVariance,
      netUnitVariance: stats.totalActualUnits - stats.totalSystemUnits,
      netCartonVariance: Math.floor((stats.totalActualUnits - stats.totalSystemUnits) / 12),
      items: auditItems
    };

    // Save session to history in localStorage
    try {
      const existing = localStorage.getItem('pos_inventory_audit_sessions_v1');
      const sessions: InventoryAuditSession[] = existing ? JSON.parse(existing) : [];
      sessions.unshift(auditSession);
      localStorage.setItem('pos_inventory_audit_sessions_v1', JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save audit history session', e);
    }

    // Update actual products state in DB for the scanned items
    const updatedProducts = products.map(p => {
      if (!scannedProductIds.has(p.id)) return p;
      const uPerC = Math.max(1, p.unitsPerCarton || 1);
      const actUnits = actualUnits[p.id] !== undefined ? actualUnits[p.id] : 0;
      const actCartons = Math.floor(actUnits / uPerC);

      return {
        ...p,
        stock: actUnits,
        totalUnits: actUnits,
        cartonsCount: actCartons
      };
    });

    setProducts(updatedProducts);
    syncBulkWriteCollection('products', updatedProducts);

    setSavedSessionNumber(sessionNum);
    setIsSuccessToast(true);
    setTimeout(() => setIsSuccessToast(false), 6000);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const listToExport = auditActiveProducts;
    if (listToExport.length === 0) {
      alert(t('لا توجد مواد في الكشف لتصديرها!', 'هیچ کاڵایەک نییە بۆ ناردن!', 'No products to export!'));
      return;
    }

    const data = listToExport.map(p => {
      const uPerC = Math.max(1, p.unitsPerCarton || 1);
      const sysUnits = getSystemRecordedUnits(p);
      const sysCartons = Math.floor(sysUnits / uPerC);
      const actUnits = actualUnits[p.id] !== undefined ? actualUnits[p.id] : 0;
      const actCartons = Math.floor(actUnits / uPerC);
      const diffUnits = actUnits - sysUnits;
      const unitCost = getProductUnitCost(p);
      const financialVariance = diffUnits * unitCost;

      return {
        'الباركود': p.barcode,
        'اسم المادة': p.nameAr || p.name,
        'التصنيف': p.categoryAr || p.category || '',
        'سعة الكرتون': uPerC,
        'رصيد المخزن المسجل (قراءة فقط)': sysUnits,
        'رصيد النظام (كراتين)': sysCartons,
        'العدد الفعلي المدخل للجرد': actUnits,
        'الجرد الفعلي (كراتين)': actCartons,
        'فارق القطع (+/-)': diffUnits,
        'تكلفة القطعة': unitCost,
        'الأثر المالي للتسوية': financialVariance,
        'حالة الجرد': diffUnits === 0 ? 'مطابق ✅' : diffUnits < 0 ? 'عجز 🔻' : 'فائض 🔺'
      };
    });

    exportDataToExcel(data, `inventory_audit_${new Date().toISOString().split('T')[0]}.xlsx`, 'جرد المخزون الفعلي');
  };

  // Print Official Inventory Audit Sheet
  const handlePrintAuditSheet = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>محضر جرد وتدقيق المخزون الفعلي - ${new Date().toLocaleDateString('ar-EG')}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 0; direction: rtl; font-size: 11px; }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 18px; font-weight: bold; color: #0369a1; }
            .meta { font-size: 11px; color: #475569; line-height: 1.6; text-align: left; }
            .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 12px; }
            .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; text-align: center; background: #f8fafc; }
            .kpi-title { font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .kpi-val { font-size: 14px; font-weight: bold; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background: #0f172a; color: white; padding: 6px; text-align: right; border: 1px solid #1e293b; }
            td { border: 1px solid #cbd5e1; padding: 5px; text-align: right; }
            .text-center { text-align: center; }
            .match { color: #16a34a; font-weight: bold; }
            .deficit { color: #dc2626; font-weight: bold; background: #fef2f2; }
            .surplus { color: #0284c7; font-weight: bold; background: #f0f9ff; }
            .signatures { margin-top: 20px; display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px dashed #94a3b8; }
            .sig-box { width: 220px; text-align: center; font-weight: bold; line-height: 2; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">📋 كشف ومحضر جرد وتدقيق المخزون الفعلي</div>
              <div style="font-size: 13px; font-weight: bold; color: #334155;">${settings.storeName || 'المتجر'}</div>
            </div>
            <div class="meta">
              <div>تاريخ الجرد: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</div>
              <div>المسؤول / المدقق: <strong>${auditorName}</strong></div>
              <div>الأصناف المدققة: <strong>${auditActiveProducts.length} صنف</strong></div>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi"><div class="kpi-title">المواد المدققة بالجرد</div><div class="kpi-val">${stats.totalAudited}</div></div>
            <div class="kpi"><div class="kpi-title">مطابق تماماً</div><div class="kpi-val" style="color:#16a34a">${stats.matchedCount} (${stats.accuracyRate}%)</div></div>
            <div class="kpi"><div class="kpi-title">أصناف بها عجز</div><div class="kpi-val" style="color:#dc2626">${stats.deficitCount}</div></div>
            <div class="kpi"><div class="kpi-title">أصناف بها زيادة</div><div class="kpi-val" style="color:#0284c7">${stats.surplusCount}</div></div>
            <div class="kpi"><div class="kpi-title">صافي الأثر المالي</div><div class="kpi-val" style="color:${stats.netFinancialVariance < 0 ? '#dc2626' : '#16a34a'}">${currency} ${stats.netFinancialVariance.toLocaleString('en-US')}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;" class="text-center">#</th>
                <th>الباركود</th>
                <th>اسم المادة</th>
                <th class="text-center">رصيد المخزن المسجل (قراءة فقط)</th>
                <th class="text-center">العدد الفعلي المدخل للجرد</th>
                <th class="text-center">فارق القطع</th>
                <th class="text-center">الفارق المالي</th>
                <th class="text-center">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${auditActiveProducts.map((p, idx) => {
                const uPerC = Math.max(1, p.unitsPerCarton || 1);
                const sysUnits = getSystemRecordedUnits(p);
                const sysCartons = Math.floor(sysUnits / uPerC);
                const actUnits = actualUnits[p.id] !== undefined ? actualUnits[p.id] : 0;
                const actCartons = Math.floor(actUnits / uPerC);
                const diff = actUnits - sysUnits;
                const cost = getProductUnitCost(p);
                const variance = diff * cost;
                const cls = diff === 0 ? 'match' : diff < 0 ? 'deficit' : 'surplus';
                const statusTxt = diff === 0 ? 'مطابق' : diff < 0 ? 'عجز' : 'زيادة';

                return `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td style="font-family: monospace;">${p.barcode}</td>
                    <td><strong>${p.nameAr || p.name}</strong></td>
                    <td class="text-center">${sysUnits} قط (${sysCartons} ك)</td>
                    <td class="text-center"><strong>${actUnits} قط (${actCartons} ك)</strong></td>
                    <td class="text-center ${cls}">${diff > 0 ? `+${diff}` : diff}</td>
                    <td class="text-center ${cls}" style="font-family: monospace;">${currency} ${variance.toLocaleString('en-US')}</td>
                    <td class="text-center ${cls}">${statusTxt}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-box">
              مسؤول الجرد والمطابقة<br/><br/>
              ............................................
            </div>
            <div class="sig-box">
              أمين المخزن والماركت<br/><br/>
              ............................................
            </div>
            <div class="sig-box">
              إدارة الفرع / الاعتماد<br/><br/>
              ............................................
            </div>
          </div>
        </body>
      </html>
    `);

    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 350);
  };

  return (
    <div className="space-y-4 animate-fadeIn w-full">
      
      {/* Toast Alert */}
      {isSuccessToast && (
        <div className="p-4 bg-emerald-600 border border-emerald-400 text-white rounded-2xl shadow-xl flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-black text-sm">{t('تم اعتماد محضر الجرد وتحديث أرصدة المخزن بنجاح! 🎉', 'جردەکە پەسەندکرا و کۆگا نوێکرایەوە! 🎉', 'Audit committed & stock updated successfully! 🎉')}</p>
              <p className="text-xs text-emerald-100">{t('رقم الجلسة المسجلة في الأرشيف:', 'ژمارەی دانیشتن لە ئەرشیف:', 'Session Number:')} <span className="font-mono font-bold text-yellow-300">{savedSessionNumber}</span></p>
            </div>
          </div>
          {onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 text-xs font-black hover:bg-emerald-50 transition-all cursor-pointer"
            >
              {t('عرض سجل الجلسة بالتقارير ←', 'پشاندانی ڕاپۆرت ←', 'View in Reports →')}
            </button>
          )}
        </div>
      )}

      {/* Main Barcode Scanner & Header Card */}
      <div className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-xl ${
        isLight
          ? 'bg-gradient-to-r from-amber-50 via-white to-orange-50 border-amber-300 text-slate-900'
          : 'bg-gradient-to-r from-[#121829] via-[#0E1526] to-[#1A1208] border-amber-500/40 text-white'
      }`}>
        
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-600 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 shrink-0">
              <Barcode className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>{t('جرد المخزون بقارئ الباركود والإدخال المباشر', 'جردی کۆگا بە بارکۆد و داخلکردنی دەستی', 'Barcode Inventory Audit & Reconciliation')}</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-sm">
                  {scannedProductIds.size} {t('مادة مجرودة', 'کاڵای جردکراو', 'Audited')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('امسح الباركود لجلب تفاصيل المادة فوراً، يظهر رصيد المخزن تلقائياً وثابتاً للقراءة، مع حقل لإدخال العدد الفعلي للجرد',
                   'بارکۆد بخوێنەوە بۆ هێنانی کاڵاکە، باڵانسی کۆگا نەگۆڕە و حەقڵی تەنیشتی بۆ جردی فعلییە',
                   'Scan barcode to pull product details with fixed recorded stock & manual actual count entry')}
              </p>
            </div>
          </div>

          {/* Top Control Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAllProductsTable(!showAllProductsTable)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border ${
                showAllProductsTable
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={t('إظهار كامل دليل المواد أو فقط المواد التي يتم مسح باركودها', 'پشاندانی هەموو کاڵاکان یان تەنها جردکراوەکان', 'Toggle scan-only vs all products')}
            >
              {showAllProductsTable ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{showAllProductsTable ? t('إخفاء باقي المواد (الممسوح فقط)', 'تەنها جردکراوەکان', 'Scanned Only') : t('إظهار كل المواد بالجرد', 'هەموو کاڵاکان', 'Show All Products')}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border border-emerald-400/30 active:scale-95"
              title={t('تصدير كشف الجرد إلى إكسل', 'ناردن بۆ ئێکسڵ', 'Export Excel')}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{t('تصدير إكسل', 'ئێکسڵ', 'Excel')}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAuditSheet}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border border-slate-700 active:scale-95"
              title={t('طباعة محضر وكشف الجرد الرسمي', 'چاپکردنی ڕاپۆرت', 'Print Audit')}
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('طباعة الكشف', 'چاپ', 'Print')}</span>
            </button>

            <button
              type="button"
              onClick={handleApplyAudit}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:brightness-110 text-white text-xs font-black shadow-lg shadow-amber-900/30 cursor-pointer transition-all active:scale-95 flex items-center gap-2 border border-amber-400/40"
            >
              <Save className="w-4 h-4" />
              <span>{t('اعتماد الجرد وتحديث المخزن 💾', 'پەسەندکردن و نوێکردنەوەی کۆگا 💾', 'Commit & Update Stock 💾')}</span>
            </button>
          </div>
        </div>

        {/* PRIMARY BARCODE SCANNING INPUT FORM */}
        <form onSubmit={handleBarcodeSubmit} className="relative w-full">
          <div className={`p-2 sm:p-2.5 rounded-2xl border-2 transition-all flex items-center gap-2 shadow-inner ${
            isLight
              ? 'bg-amber-100/50 border-amber-400 focus-within:border-amber-600 focus-within:bg-white'
              : 'bg-[#060A14] border-amber-500/60 focus-within:border-amber-400 focus-within:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
          }`}>
            
            <div className="pl-2 rtl:pl-0 rtl:pr-2 text-amber-500 shrink-0 flex items-center gap-1.5">
              <Barcode className="w-6 h-6 animate-pulse" />
              <span className="text-xs font-black hidden sm:inline">{t('امسح الباركود هنا:', 'بارکۆد لێرە لێبدە:', 'Scan Barcode:')}</span>
            </div>

            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder={t('وجه القارئ نحو الباركود أو اكتب الباركود / اسم المادة واضغط Enter...', 'بارکۆد بخوێنەوە یان لێرە بنووسە و ئینتەر داگرە...', 'Scan barcode with scanner gun or type barcode & hit Enter...')}
              className={`flex-1 bg-transparent font-mono font-bold text-sm sm:text-base outline-none px-2 ${
                isLight ? 'text-slate-900 placeholder:text-slate-500' : 'text-amber-300 placeholder:text-slate-500'
              }`}
            />

            {barcodeInput && (
              <button
                type="button"
                onClick={() => {
                  setBarcodeInput('');
                  barcodeInputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 shadow flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
              <span>{t('جلب المادة للجرد', 'هێنان', 'Find & Count')}</span>
            </button>

          </div>
        </form>

        {/* Scan Feedback Banner */}
        {scanFeedbackMessage && (
          <div className={`mt-2.5 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn ${
            scanFeedbackMessage.type === 'success'
              ? 'bg-emerald-900/80 border border-emerald-500 text-emerald-200'
              : scanFeedbackMessage.type === 'warn'
                ? 'bg-amber-900/80 border border-amber-500 text-amber-200'
                : 'bg-rose-900/80 border border-rose-500 text-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{scanFeedbackMessage.text}</span>
            </div>
            <button onClick={() => setScanFeedbackMessage(null)} className="text-slate-300 hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* LAST SCANNED QUICK SPOTLIGHT CARD */}
        {lastScannedProduct && (
          <div className={`mt-3 p-3 sm:p-4 rounded-2xl border transition-all animate-fadeIn ${
            isLight
              ? 'bg-white border-amber-300 shadow-md'
              : 'bg-gradient-to-r from-[#141C2E] to-[#1F170A] border-amber-500/50 shadow-lg'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              
              {/* Product Info */}
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-mono font-bold shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-sm text-white flex items-center gap-2">
                    <span>{lastScannedProduct.nameAr || lastScannedProduct.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 font-mono">
                      {lastScannedProduct.barcode}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {t('سعة الكرتون:', 'کارتۆن:', 'Carton size:')} <strong className="text-amber-400 font-mono">{lastScannedProduct.unitsPerCarton || 1} {t('قطعة', 'دانە', 'pcs')}</strong>
                    {lastScannedProduct.categoryAr && <span> • {lastScannedProduct.categoryAr}</span>}
                  </div>
                </div>
              </div>

              {/* Two Direct Fields: 1. System Fixed Stock (Read-Only) | 2. Manual Actual Count Input */}
              <div className="flex items-center gap-3 flex-wrap">
                
                {/* FIELD 1: Fixed System Stock (رصيد المخزن في الماركت - للقراءة فقط) */}
                <div className="p-2 sm:px-3 rounded-xl bg-slate-900 border border-slate-700 text-center min-w-[130px]">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {t('رصيد المخزن بالماركت', 'باڵانسی سیستم لە مارکێت', 'Market Stock (System)')}
                  </span>
                  <span className="text-xs text-amber-400/80 font-bold block">
                    🔒 ({t('ثابت للقراءة فقط', 'تەنها بۆ خوێندنەوە', 'Read-Only')})
                  </span>
                  <div className="font-mono font-black text-base text-cyan-300 mt-0.5">
                    {getSystemRecordedUnits(lastScannedProduct)} <span className="text-[11px] text-slate-400 font-normal">{t('قطعة', 'دانە', 'pcs')}</span>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="text-slate-500 hidden sm:block">
                  <ArrowRight className="w-5 h-5 rtl:rotate-180" />
                </div>

                {/* FIELD 2: Editable Manual Count Input (حقل إضافة العدد يدوياً للجرد) */}
                <div className="p-2 sm:px-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/50 text-center">
                  <span className="text-[10px] font-black text-amber-400 block">
                    ✍️ {t('العدد الفعلي بالجرد (يدوي)', 'جردی فعلی (دەستی)', 'Audit Count (Editable)')}
                  </span>
                  
                  <div className="inline-flex items-center justify-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateActualCount(lastScannedProduct.id, (actualUnits[lastScannedProduct.id] || 0) - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-amber-600 text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    
                    <input
                      type="number"
                      min="0"
                      value={actualUnits[lastScannedProduct.id] !== undefined ? actualUnits[lastScannedProduct.id] : 0}
                      onChange={(e) => handleUpdateActualCount(lastScannedProduct.id, Number(e.target.value))}
                      className="w-20 text-center font-mono font-black text-sm sm:text-base py-1 rounded-lg border-2 border-amber-400 bg-slate-950 text-amber-300 outline-none focus:ring-2 focus:ring-amber-400"
                    />

                    <button
                      type="button"
                      onClick={() => handleUpdateActualCount(lastScannedProduct.id, (actualUnits[lastScannedProduct.id] || 0) + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-amber-600 text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Variance Badge */}
                {(() => {
                  const sys = getSystemRecordedUnits(lastScannedProduct);
                  const act = actualUnits[lastScannedProduct.id] !== undefined ? actualUnits[lastScannedProduct.id] : 0;
                  const diff = act - sys;
                  const cost = getProductUnitCost(lastScannedProduct);
                  const val = diff * cost;
                  return (
                    <div className="p-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-center min-w-[110px]">
                      <span className="text-[10px] font-bold text-slate-400 block">{t('فارق الجرد', 'جیاوازی', 'Variance')}</span>
                      <span className={`font-mono font-black text-sm block mt-0.5 ${
                        diff === 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-cyan-400'
                      }`}>
                        {diff === 0 ? t('مطابق ✅', 'هاوتا ✅', 'Match') : diff > 0 ? `+${diff} (${currency} ${val.toLocaleString('en-US')})` : `${diff} (${currency} ${val.toLocaleString('en-US')})`}
                      </span>
                    </div>
                  );
                })()}

              </div>

            </div>
          </div>
        )}

      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        
        {/* Total Products Scanned */}
        <div className={`p-3 rounded-2xl border transition-all ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0A0F1D] border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>{t('المواد المجرودة', 'کاڵای جردکراو', 'Audited Items')}</span>
            <Boxes className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className={`text-xl font-black font-mono mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {stats.totalAudited} <span className="text-xs text-slate-500 font-normal">/ {stats.totalCatalogItems}</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {stats.totalActualUnits} {t('قطعة فعلية بالجرد', 'دانەی فعلی', 'actual counted pcs')}
          </p>
        </div>

        {/* Matched Count */}
        <div className={`p-3 rounded-2xl border transition-all ${
          isLight ? 'bg-white border-emerald-200 shadow-sm' : 'bg-[#0A0F1D] border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-500">
            <span>{t('المطابق تماماً', 'هاوتا', '100% Match')}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-black font-mono mt-1 text-emerald-400">
            {stats.matchedCount}
          </p>
          <p className="text-[10px] text-emerald-500 font-bold mt-0.5">
            {stats.accuracyRate}% {t('نسبة الدقة', 'ڕێژەی هاوتایی', 'accuracy')}
          </p>
        </div>

        {/* Discrepancies Count */}
        <div className={`p-3 rounded-2xl border transition-all ${
          isLight ? 'bg-white border-amber-200 shadow-sm' : 'bg-[#0A0F1D] border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-500">
            <span>{t('إجمالي الفروقات', 'کۆی جیاوازی', 'Discrepancies')}</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-black font-mono mt-1 text-amber-400">
            {stats.discrepancyCount}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {t('أصناف تحتاج تسوية', 'پێویستی بە چاککردنە', 'need adjustment')}
          </p>
        </div>

        {/* Deficits */}
        <div className={`p-3 rounded-2xl border transition-all ${
          isLight ? 'bg-white border-rose-200 shadow-sm' : 'bg-[#0A0F1D] border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-500">
            <span>{t('أصناف بها عجز', 'کەم / نوقسانی', 'Deficit Items')}</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-xl font-black font-mono mt-1 text-rose-400">
            {stats.deficitCount}
          </p>
          <p className="text-[10px] text-rose-400 font-mono mt-0.5">
            -{currency} {stats.deficitFinancialLoss.toLocaleString('en-US')}
          </p>
        </div>

        {/* Surplus */}
        <div className={`p-3 rounded-2xl border transition-all ${
          isLight ? 'bg-white border-blue-200 shadow-sm' : 'bg-[#0A0F1D] border-blue-500/30'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400">
            <span>{t('أصناف بها زيادة', 'زیادە لە کۆگا', 'Surplus Items')}</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-xl font-black font-mono mt-1 text-cyan-400">
            {stats.surplusCount}
          </p>
          <p className="text-[10px] text-cyan-400 font-mono mt-0.5">
            +{currency} {stats.surplusFinancialGain.toLocaleString('en-US')}
          </p>
        </div>

        {/* Net Financial Impact */}
        <div className={`p-3 rounded-2xl border transition-all ${
          isLight ? 'bg-white border-purple-200 shadow-sm' : 'bg-[#0A0F1D] border-purple-500/30'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-bold text-purple-400">
            <span>{t('الأثر المالي الصافي', 'پوختەی دارایی', 'Net Variance')}</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className={`text-base font-black font-mono mt-1 truncate ${
            stats.netFinancialVariance === 0 ? 'text-emerald-400' : stats.netFinancialVariance < 0 ? 'text-rose-400' : 'text-cyan-400'
          }`}>
            {currency} {stats.netFinancialVariance.toLocaleString('en-US')}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {t('قيمة التكلفة للتسوية', 'بەهای تێچووی جیاوازی', 'cost impact')}
          </p>
        </div>

      </div>

      {/* Filter and Details Bar */}
      <div className={`p-3.5 rounded-2xl border space-y-3 transition-all ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0A0F1D] border-slate-800'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Status Filter Buttons */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs flex-wrap ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#050914] border-slate-800'
          }`}>
            <button
              type="button"
              onClick={() => setFilterDiscrepancy('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterDiscrepancy === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('الكل', 'هەمووی', 'All')} ({auditActiveProducts.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterDiscrepancy('DIFF_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterDiscrepancy === 'DIFF_ONLY'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-amber-500 hover:brightness-125'
              }`}
            >
              ⚠️ {t('الفروقات فقط', 'تەنها جیاوازییەکان', 'Discrepancies')} ({stats.discrepancyCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterDiscrepancy('DEFICIT_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterDiscrepancy === 'DEFICIT_ONLY'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              🔻 {t('العجز فقط', 'کەمەکان', 'Deficits')} ({stats.deficitCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterDiscrepancy('SURPLUS_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterDiscrepancy === 'SURPLUS_ONLY'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-cyan-400 hover:text-cyan-300'
              }`}
            >
              🔺 {t('الزيادة فقط', 'زیادەکان', 'Surplus')} ({stats.surplusCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterDiscrepancy('MATCH_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterDiscrepancy === 'MATCH_ONLY'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              ✅ {t('المطابق', 'هاوتا', 'Matched')} ({stats.matchedCount})
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`text-xs font-bold rounded-xl px-3 py-2 border outline-none cursor-pointer transition-all ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-[#050914] border-slate-700 text-slate-200'
              }`}
            >
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? t('جميع التصنيفات', 'هەموو پۆلەکان', 'All Categories') : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Bulk Presets */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResetToSystem}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700 flex items-center gap-1"
              title={t('مطابقة جميع المواد مع رصيد النظام', 'هاوتاکردنەوە بەپێی سیستەم', 'Match System')}
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('مطابقة النظام', 'سیستەم', 'Match System')}</span>
            </button>

            <button
              type="button"
              onClick={handleZeroAll}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer border border-slate-700"
              title={t('مسح قائمة الجرد للبدء من جديد بالمسح', 'سفرکردنەوەی هەمووی', 'Clear Audit')}
            >
              <span>{t('تفريغ القائمة', 'بەتاڵکردنەوە', 'Clear List')}</span>
            </button>
          </div>

        </div>

        {/* Auditor & Notes Input Sub-bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">{t('المسؤول عن الجرد:', 'بەرپرسی جرد:', 'Auditor:')}</span>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              placeholder={t('اسم مسؤول الجرد...', 'ناوی بەرپرس...', 'Auditor name')}
              className={`rounded-lg px-2.5 py-1 border text-xs outline-none font-bold ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#050914] border-slate-700 text-cyan-300'
              }`}
            />
          </div>

          <div className="flex-1 min-w-[200px] flex items-center gap-2">
            <span className="text-slate-400 font-bold">{t('ملاحظات المحضر:', 'تێبینی:', 'Notes:')}</span>
            <input
              type="text"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder={t('أي ملاحظات على محضر الجرد والتسوية (اختياري)...', 'تێبینی لەسەر ئەم جردە...', 'Audit session notes...')}
              className={`w-full rounded-lg px-2.5 py-1 border text-xs outline-none ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#050914] border-slate-700 text-slate-200'
              }`}
            />
          </div>
        </div>

      </div>

      {/* Main Audit Data Table */}
      <div className={`rounded-3xl border overflow-hidden transition-all shadow-md ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0A0F1D] border-slate-800'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left rtl:text-right border-collapse">
            
            <thead className={`font-bold uppercase tracking-wider text-[11px] ${
              isLight ? 'bg-slate-100 text-slate-700 border-b border-slate-200' : 'bg-[#050914] text-slate-400 border-b border-slate-800'
            }`}>
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3">{t('المادة والباركود', 'کاڵا و بارکۆد', 'Product & Barcode')}</th>
                <th className="py-3 px-3 text-center bg-blue-950/40 text-cyan-300 border-x border-slate-800">
                  <span className="block">{t('1. رصيد المخزن بالماركت', 'باڵانسی سیستم لە مارکێت', 'Market Stock (System)')}</span>
                  <span className="text-[9px] text-slate-400 normal-case block">🔒 {t('ثابت للقراءة فقط', 'تەنها خوێندنەوە', 'Fixed Read-Only')}</span>
                </th>
                <th className="py-3 px-3 text-center bg-amber-500/20 text-amber-300 border-x border-amber-500/40">
                  <span className="block">{t('2. العدد الفعلي بالجرد', 'جردی فعلی', 'Actual Audit Count')}</span>
                  <span className="text-[9px] text-amber-400 normal-case block">✍️ {t('حقل الإدخال اليدوي', 'دەستی', 'Manual Entry')}</span>
                </th>
                <th className="py-3 px-3 text-center">{t('فارق القطع', 'جیاوازی دانە', 'Unit Diff')}</th>
                <th className="py-3 px-3 text-center">{t('الأثر المالي بالتكلفة', 'بەهای دارایی', 'Financial Variance')}</th>
                <th className="py-3 px-3 text-center">{t('الحالة', 'دۆخ', 'Status')}</th>
                <th className="py-3 px-3 text-center w-20">{t('إجراء', 'کردار', 'Action')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {auditActiveProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-3">
                      <Barcode className="w-8 h-8 animate-pulse" />
                    </div>
                    <p className="font-black text-sm text-white">{t('لم يتم مسح أي مادة بعد للبدء في الجرد', 'هیچ کاڵایەک نەخوێنراوەتەوە', 'No products scanned yet for audit')}</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {t('وجه قارئ الباركود نحو المنتج ليتم جلبه فوراً وعرض رصيد المخزن المسجل بجانب حقل إدخال العدد الفعلي.',
                         'بارکۆدی کاڵا لێبدە بۆ هێنانی و پشاندانی باڵانس بە نەگۆڕی و داخلکردنی بڕی نوێ.',
                         'Scan product barcode to instantly load details, show fixed system balance, and input actual count.')}
                    </p>
                    {!showAllProductsTable && (
                      <button
                        type="button"
                        onClick={() => setShowAllProductsTable(true)}
                        className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-700"
                      >
                        {t('إظهار قائمة كل المواد بدلاً من ذلك', 'پشاندانی هەموو کاڵاکان', 'Show all products list instead')}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                auditActiveProducts.map((p, idx) => {
                  const uPerC = Math.max(1, p.unitsPerCarton || 1);
                  const sysUnits = getSystemRecordedUnits(p);
                  const sysCartons = Math.floor(sysUnits / uPerC);
                  const actUnits = actualUnits[p.id] !== undefined ? actualUnits[p.id] : 0;
                  const actCartons = Math.floor(actUnits / uPerC);
                  const diffUnits = actUnits - sysUnits;
                  const unitCost = getProductUnitCost(p);
                  const financialVariance = diffUnits * unitCost;
                  const isMatch = diffUnits === 0;
                  const isDeficit = diffUnits < 0;

                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors hover:bg-slate-800/30 ${
                        !isMatch 
                          ? isDeficit 
                            ? 'bg-rose-950/20' 
                            : 'bg-blue-950/20' 
                          : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3 px-3 text-center text-slate-500 font-mono text-[10px]">
                        {idx + 1}
                      </td>

                      {/* Product Name & Barcode */}
                      <td className="py-3 px-3">
                        <div className="font-black text-xs text-white max-w-[240px] truncate">
                          {p.nameAr || p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                          <span className="font-mono text-cyan-400 font-bold">{p.barcode}</span>
                          {p.categoryAr && (
                            <span className="text-slate-400 font-semibold">• {p.categoryAr}</span>
                          )}
                          <span className="text-amber-400/80 font-mono">({uPerC} {t('قطعة/كرتون', 'دانە/کارتۆن', 'pcs/ctn')})</span>
                        </div>
                      </td>

                      {/* FIELD 1: Fixed System Balance (Read-Only) */}
                      <td className="py-3 px-3 text-center font-mono bg-blue-950/20 border-x border-slate-800/80">
                        <div className="font-black text-sm text-cyan-300">{sysUnits} <span className="text-[10px] text-slate-400 font-normal">{t('قطعة', 'دانە', 'pcs')}</span></div>
                        <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">
                          ({sysCartons} {t('كرتون', 'کارتۆن', 'ctn')} {sysUnits % uPerC > 0 ? `+ ${sysUnits % uPerC} ${t('قطعة', 'دانە', 'pcs')}` : ''})
                        </span>
                      </td>

                      {/* FIELD 2: Manual Actual Count Input (Editable) */}
                      <td className="py-3 px-3 text-center bg-amber-500/10 border-x border-amber-500/30">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateActualCount(p.id, actUnits - 1)}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-amber-600 text-white flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <input
                            type="number"
                            min="0"
                            value={actUnits}
                            onChange={(e) => handleUpdateActualCount(p.id, Number(e.target.value))}
                            className={`w-20 text-center font-mono font-black text-sm py-1 rounded-lg border-2 outline-none ${
                              isLight 
                                ? 'bg-white border-amber-400 text-slate-900 focus:ring-2 focus:ring-amber-500' 
                                : 'bg-[#050914] border-amber-500 text-amber-300 focus:ring-2 focus:ring-amber-400'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() => handleUpdateActualCount(p.id, actUnits + 1)}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-amber-600 text-white flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-semibold mt-1">
                          ({actCartons} {t('كرتون', 'کارتۆن', 'ctn')})
                        </span>
                      </td>

                      {/* Discrepancy Unit Diff */}
                      <td className="py-3 px-3 text-center font-mono font-black">
                        {isMatch ? (
                          <span className="text-emerald-400 font-bold">0</span>
                        ) : diffUnits > 0 ? (
                          <span className="text-cyan-400 text-sm">+{diffUnits}</span>
                        ) : (
                          <span className="text-rose-400 text-sm">{diffUnits}</span>
                        )}
                      </td>

                      {/* Financial Variance */}
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={
                          isMatch ? 'text-slate-500' : diffUnits > 0 ? 'text-cyan-400' : 'text-rose-400'
                        }>
                          {currency} {financialVariance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {isMatch ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black inline-flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {t('مطابق', 'هاوتا', 'Matched')}
                          </span>
                        ) : isDeficit ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black inline-flex items-center gap-1 animate-pulse">
                            <TrendingDown className="w-3 h-3" />
                            {t('عجز', 'کەم / نوقسان', 'Deficit')}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black inline-flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {t('زيادة', 'زیادە', 'Surplus')}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
                        {!isMatch ? (
                          <button
                            type="button"
                            onClick={() => handleQuickMatch(p)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer border border-slate-700"
                            title={t('مطابقة هذا الصنف فوراً مع رصيد النظام', 'هاوتاکردنەوەی ئەم کاڵایە', 'Match with system')}
                          >
                            {t('مطابقة', 'هاوتا', 'Match')}
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[10px]">✓</span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className={`p-4 rounded-3xl border flex flex-wrap items-center justify-between gap-3 shadow-lg ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0A0F1D] border-amber-500/30'
      }`}>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-xs text-slate-300">
            {t('تم جرد', 'جردکراوە', 'Audited')}: <strong className="text-white">{stats.totalAudited}</strong> {t('صنف', 'کاڵا', 'items')} | {t('المطابق', 'هاوتا', 'Matched')}: <strong className="text-emerald-400">{stats.matchedCount}</strong> | {t('الفروقات', 'جیاوازی', 'Discrepancies')}: <strong className="text-amber-400">{stats.discrepancyCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onBackToWarehouse && (
            <button
              type="button"
              onClick={onBackToWarehouse}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              {t('الرجوع لدليل المواد', 'گەڕانەوە بۆ کاڵاکان', 'Back to Catalog')}
            </button>
          )}

          <button
            type="button"
            onClick={handleApplyAudit}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:brightness-110 text-white text-xs font-black shadow-lg shadow-amber-900/30 cursor-pointer transition-all active:scale-95 flex items-center gap-2 border border-amber-400/40"
          >
            <Save className="w-4 h-4" />
            <span>{t('اعتماد الجرد وتحديث أرصدة المخزن رسمياً 💾', 'پەسەندکردن و نوێکردنەوەی کۆگا 💾', 'Commit & Update Stock Now 💾')}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
