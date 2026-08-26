import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  X, 
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
  FileText,
  Save,
  Layers,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { Product, StoreSettings, UserAccount, InventoryAuditSession, InventoryAuditItem } from '../types';
import { exportDataToExcel } from '../lib/excelExport';

interface InventoryAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
  currentUser?: UserAccount | null;
  onNavigateToReports?: () => void;
}

export const InventoryAuditModal: React.FC<InventoryAuditModalProps> = ({
  isOpen,
  onClose,
  products,
  setProducts,
  settings,
  currentUser,
  onNavigateToReports,
}) => {
  if (!isOpen) return null;

  const lang = settings.language || 'ar';
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const isLight = settings.themeMode === 'light';
  const currency = settings.currencySymbol || 'د.ع';

  const t = (ar: string, ku: string, en: string = ar) => isKu ? ku : isAr ? ar : en;

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterDiscrepancy, setFilterDiscrepancy] = useState<'ALL' | 'DIFF_ONLY' | 'MATCH_ONLY' | 'DEFICIT_ONLY' | 'SURPLUS_ONLY'>('ALL');
  const [auditorName, setAuditorName] = useState(currentUser?.fullName || (isAr ? 'مدير الفرع / مسؤول الجرد' : 'Inventory Auditor'));
  const [auditNotes, setAuditNotes] = useState('');
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  // Local state for:
  // 1. In-Market count in units (جرد صالة العرض والماركت بالقطع)
  // 2. In-Warehouse count in units (جرد المخزن والمستودع بالقطع)
  const [marketUnits, setMarketUnits] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.forEach(p => {
      const uPerC = Math.max(1, p.unitsPerCarton || 1);
      const recUnits = p.totalUnits !== undefined ? p.totalUnits : ((p.cartonsCount || 0) * uPerC);
      // Initialize with loose units in market
      const loose = recUnits % uPerC;
      initial[p.id] = loose;
    });
    return initial;
  });

  const [warehouseUnits, setWarehouseUnits] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.forEach(p => {
      const uPerC = Math.max(1, p.unitsPerCarton || 1);
      const recUnits = p.totalUnits !== undefined ? p.totalUnits : ((p.cartonsCount || 0) * uPerC);
      // Initialize with cartons converted to units in warehouse
      const inWarehouse = recUnits - (recUnits % uPerC);
      initial[p.id] = inWarehouse;
    });
    return initial;
  });

  // Calculate actual total units for a product
  const getProductActualTotalUnits = (p: Product) => {
    const mUnits = Number(marketUnits[p.id]) || 0;
    const wUnits = Number(warehouseUnits[p.id]) || 0;
    return Math.max(0, mUnits + wUnits);
  };

  const getSystemRecordedUnits = (p: Product) => {
    const uPerC = Math.max(1, p.unitsPerCarton || 1);
    if (p.totalUnits !== undefined && p.totalUnits !== null) {
      return p.totalUnits;
    }
    return (p.cartonsCount || 0) * uPerC;
  };

  const handleMarketUnitsChange = (p: Product, val: number) => {
    const safeVal = isNaN(val) ? 0 : Math.max(0, val);
    setMarketUnits(prev => ({
      ...prev,
      [p.id]: safeVal
    }));
  };

  const handleWarehouseUnitsChange = (p: Product, val: number) => {
    const safeVal = isNaN(val) ? 0 : Math.max(0, val);
    setWarehouseUnits(prev => ({
      ...prev,
      [p.id]: safeVal
    }));
  };

  // Quick preset: Pre-fill all with recorded system values
  const handlePrefillWithSystem = () => {
    const newMarket: Record<string, number> = {};
    const newWarehouse: Record<string, number> = {};
    products.forEach(p => {
      const uPerC = Math.max(1, p.unitsPerCarton || 1);
      const total = getSystemRecordedUnits(p);
      const loose = total % uPerC;
      newMarket[p.id] = loose;
      newWarehouse[p.id] = total - loose;
    });
    setMarketUnits(newMarket);
    setWarehouseUnits(newWarehouse);
  };

  // Quick preset: Reset all inputs to 0
  const handleResetToZero = () => {
    if (confirm(t('هل أنت متأكد من تصفير كافة خانات الجرد والبدء من الصفر؟', 'دڵنیایت لە سفرکردنەوەی هەموو خانەکان؟', 'Are you sure you want to reset all counts to 0?'))) {
      const newMarket: Record<string, number> = {};
      const newWarehouse: Record<string, number> = {};
      products.forEach(p => {
        newMarket[p.id] = 0;
        newWarehouse[p.id] = 0;
      });
      setMarketUnits(newMarket);
      setWarehouseUnits(newWarehouse);
    }
  };

  // Quick set match for a single product
  const handleMatchSingleProduct = (p: Product) => {
    const uPerC = Math.max(1, p.unitsPerCarton || 1);
    const total = getSystemRecordedUnits(p);
    const loose = total % uPerC;
    setMarketUnits(prev => ({ ...prev, [p.id]: loose }));
    setWarehouseUnits(prev => ({ ...prev, [p.id]: total - loose }));
  };

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      const cat = p.categoryAr || p.category || 'عام';
      set.add(cat);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        !search ||
        p.name.toLowerCase().includes(searchLower) ||
        (p.nameAr && p.nameAr.toLowerCase().includes(searchLower)) ||
        (p.nameKu && p.nameKu.toLowerCase().includes(searchLower)) ||
        p.barcode.includes(search);

      const matchesCat = selectedCategory === 'ALL' || (p.categoryAr || p.category) === selectedCategory;

      const recordedTotalUnits = getSystemRecordedUnits(p);
      const countedTotalUnits = getProductActualTotalUnits(p);
      const diff = countedTotalUnits - recordedTotalUnits;

      let matchesDiscrepancy = true;
      if (filterDiscrepancy === 'DIFF_ONLY') matchesDiscrepancy = diff !== 0;
      if (filterDiscrepancy === 'MATCH_ONLY') matchesDiscrepancy = diff === 0;
      if (filterDiscrepancy === 'DEFICIT_ONLY') matchesDiscrepancy = diff < 0;
      if (filterDiscrepancy === 'SURPLUS_ONLY') matchesDiscrepancy = diff > 0;

      return matchesSearch && matchesCat && matchesDiscrepancy;
    });
  }, [products, search, selectedCategory, filterDiscrepancy, marketUnits, warehouseUnits]);

  // Calculation Metrics
  const auditMetrics = useMemo(() => {
    let totalSysUnits = 0;
    let totalActUnits = 0;
    let totalSysCartons = 0;
    let totalActCartons = 0;
    let matchCount = 0;
    let deficitCount = 0;
    let surplusCount = 0;
    let totalFinancialVariance = 0;

    products.forEach(p => {
      const uPerC = Math.max(1, p.unitsPerCarton || 1);
      const sysUnits = getSystemRecordedUnits(p);
      const actUnits = getProductActualTotalUnits(p);
      const sysCartons = Math.floor(sysUnits / uPerC);
      const actCartons = Math.floor(actUnits / uPerC);
      const diffUnits = actUnits - sysUnits;
      const unitCost = p.costPerUnit || p.cost || 0;

      totalSysUnits += sysUnits;
      totalActUnits += actUnits;
      totalSysCartons += sysCartons;
      totalActCartons += actCartons;

      if (diffUnits === 0) {
        matchCount++;
      } else if (diffUnits < 0) {
        deficitCount++;
        totalFinancialVariance += (diffUnits * unitCost);
      } else {
        surplusCount++;
        totalFinancialVariance += (diffUnits * unitCost);
      }
    });

    const netUnitVariance = totalActUnits - totalSysUnits;
    const netCartonVariance = totalActCartons - totalSysCartons;
    const totalDiscrepancies = deficitCount + surplusCount;
    const accuracyRate = products.length > 0 
      ? Math.round((matchCount / products.length) * 100) 
      : 100;

    return {
      totalSysUnits,
      totalActUnits,
      totalSysCartons,
      totalActCartons,
      netUnitVariance,
      netCartonVariance,
      matchCount,
      deficitCount,
      surplusCount,
      totalDiscrepancies,
      totalFinancialVariance,
      accuracyRate
    };
  }, [products, marketUnits, warehouseUnits]);

  // Apply and Commit Audit to Database & Session History
  const handleApplyAllAdjustments = () => {
    const auditDate = new Date().toISOString().split('T')[0];
    const auditTime = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const sessionId = `audit-${Date.now()}`;
    const sessionNumber = `AUD-${Date.now().toString().slice(-6)}`;

    const auditItems: InventoryAuditItem[] = [];

    // 1. Update Products in State
    const updatedProducts = products.map(p => {
      const unitsPerCarton = Math.max(1, p.unitsPerCarton || 1);
      const recUnits = getSystemRecordedUnits(p);
      const actUnits = getProductActualTotalUnits(p);
      const mUnits = Number(marketUnits[p.id]) || 0;
      const wUnits = Number(warehouseUnits[p.id]) || 0;
      
      const diffUnits = actUnits - recUnits;
      const sysCartons = Math.floor(recUnits / unitsPerCarton);
      const actCartons = Math.floor(actUnits / unitsPerCarton);
      const diffCartons = actCartons - sysCartons;
      const unitCost = p.costPerUnit || p.cost || 0;
      const unitPrice = p.singleRetailPrice || p.price || 0;
      const finVar = diffUnits * unitCost;

      const status: 'match' | 'deficit' | 'surplus' = 
        diffUnits === 0 ? 'match' : diffUnits < 0 ? 'deficit' : 'surplus';

      auditItems.push({
        productId: p.id,
        productName: p.nameAr || p.name,
        barcode: p.barcode,
        unitsPerCarton,
        systemUnits: recUnits,
        systemCartons: sysCartons,
        marketUnits: mUnits,
        warehouseUnits: wUnits,
        actualUnits: actUnits,
        actualCartons: actCartons,
        diffUnits,
        diffCartons,
        unitCost,
        unitPrice,
        financialVariance: finVar,
        status
      });

      if (actUnits !== recUnits) {
        const prodStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = actUnits === 0 ? 'out_of_stock' : actUnits <= p.minStock ? 'low_stock' : 'in_stock';
        return {
          ...p,
          cartonsCount: actCartons,
          totalUnits: actUnits,
          stock: actUnits,
          status: prodStatus,
          lastEditDate: auditDate
        };
      }
      return p;
    });

    setProducts(updatedProducts);

    // 2. Save Session to localStorage archive
    const sessionRecord: InventoryAuditSession = {
      id: sessionId,
      sessionNumber,
      timestamp: new Date().toISOString(),
      date: auditDate,
      time: auditTime,
      auditorName,
      totalProductsAudited: products.length,
      matchedCount: auditMetrics.matchCount,
      discrepancyCount: auditMetrics.totalDiscrepancies,
      deficitCount: auditMetrics.deficitCount,
      surplusCount: auditMetrics.surplusCount,
      totalSystemUnits: auditMetrics.totalSysUnits,
      totalActualUnits: auditMetrics.totalActUnits,
      totalSystemCartons: auditMetrics.totalSysCartons,
      totalActualCartons: auditMetrics.totalActCartons,
      netUnitVariance: auditMetrics.netUnitVariance,
      netCartonVariance: auditMetrics.netCartonVariance,
      totalFinancialVariance: auditMetrics.totalFinancialVariance,
      items: auditItems,
      notes: auditNotes
    };

    try {
      const existing = localStorage.getItem('pos_inventory_audit_sessions_v1');
      const list: InventoryAuditSession[] = existing ? JSON.parse(existing) : [];
      list.unshift(sessionRecord);
      localStorage.setItem('pos_inventory_audit_sessions_v1', JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save audit session:', e);
    }

    setIsSuccessToast(true);
    setTimeout(() => {
      setIsSuccessToast(false);
      onClose();
    }, 1200);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredProducts.map(p => {
      const uPerC = Math.max(1, p.unitsPerCarton || 1);
      const recUnits = getSystemRecordedUnits(p);
      const actUnits = getProductActualTotalUnits(p);
      const mUnits = Number(marketUnits[p.id]) || 0;
      const wUnits = Number(warehouseUnits[p.id]) || 0;
      const diffUnits = actUnits - recUnits;
      const unitCost = p.costPerUnit || p.cost || 0;

      return {
        'الباركود': p.barcode,
        'اسم المادة': p.nameAr || p.name,
        'القسم': p.categoryAr || p.category,
        'تعبئة الكرتون (قطع)': uPerC,
        'كمية النظام (قطع)': recUnits,
        'كمية النظام (كرتون)': Math.floor(recUnits / uPerC),
        'جرد الماركت (قطع)': mUnits,
        'جرد المخزن (قطع)': wUnits,
        'إجمالي الجرد الفعلي (قطع)': actUnits,
        'إجمالي الجرد الفعلي (كرتون)': Math.floor(actUnits / uPerC),
        'فارق القطع': diffUnits > 0 ? `+${diffUnits}` : diffUnits,
        'فارق الكراتين': Math.floor(actUnits / uPerC) - Math.floor(recUnits / uPerC),
        'سعر التكلفة للقطعة': unitCost,
        'الأثر المالي للتكلفة': diffUnits * unitCost,
        'الحالة': diffUnits === 0 ? 'مطابق' : diffUnits < 0 ? 'عجز نقص' : 'زيادة فائض'
      };
    });

    exportDataToExcel(exportData, `inventory_audit_report_${new Date().toISOString().split('T')[0]}.xlsx`, 'جرد المخزون');
  };

  // Print Official Audit Sheet
  const handlePrintAudit = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>تقرير جرد المخزون والتدقيق الفعلي - ${new Date().toLocaleDateString('ar-EG')}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 0; direction: rtl; font-size: 11px; }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 20px; font-weight: 900; color: #0369a1; }
            .meta { font-size: 11px; color: #475569; line-height: 1.6; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
            .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc; }
            .kpi-title { font-size: 10px; color: #64748b; font-weight: bold; }
            .kpi-val { font-size: 16px; font-weight: 900; margin-top: 4px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background: #0f172a; color: white; padding: 6px; text-align: right; }
            td { border-bottom: 1px solid #e2e8f0; padding: 6px; }
            .match { color: #16a34a; font-weight: bold; }
            .deficit { color: #dc2626; font-weight: bold; }
            .surplus { color: #0284c7; font-weight: bold; }
            .footer { margin-top: 25px; display: flex; justify-content: space-between; border-top: 1px dashed #94a3b8; padding-top: 15px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">📋 بيان محضر جرد المخزون الفعلي (Physical Inventory Audit Sheet)</div>
              <div style="font-size: 13px; font-weight: bold; color: #334155; margin-top: 4px;">${settings.storeName || 'سوبرماركت'}</div>
            </div>
            <div class="meta">
              <div><strong>تاريخ الجرد:</strong> ${new Date().toLocaleDateString('ar-EG')}</div>
              <div><strong>المسؤول / المدقق:</strong> ${auditorName}</div>
              <div><strong>إجمالي الأصناف المدققة:</strong> ${products.length} صنف</div>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi">
              <div class="kpi-title">إجمالي رصيد النظام</div>
              <div class="kpi-val">${auditMetrics.totalSysUnits.toLocaleString('en-US')} قطعة (${auditMetrics.totalSysCartons} كرتون)</div>
            </div>
            <div class="kpi">
              <div class="kpi-title">إجمالي الجرد الفعلي المحسوب</div>
              <div class="kpi-val">${auditMetrics.totalActUnits.toLocaleString('en-US')} قطعة (${auditMetrics.totalActCartons} كرتون)</div>
            </div>
            <div class="kpi">
              <div class="kpi-title">صافي فارق الكمية</div>
              <div class="kpi-val" style="color: ${auditMetrics.netUnitVariance === 0 ? '#16a34a' : auditMetrics.netUnitVariance < 0 ? '#dc2626' : '#0284c7'}">
                ${auditMetrics.netUnitVariance > 0 ? `+${auditMetrics.netUnitVariance}` : auditMetrics.netUnitVariance} قطعة (${auditMetrics.totalDiscrepancies} فارق)
              </div>
            </div>
            <div class="kpi">
              <div class="kpi-title">الفارق المالي بالتكلفة</div>
              <div class="kpi-val" style="color: ${auditMetrics.totalFinancialVariance === 0 ? '#16a34a' : auditMetrics.totalFinancialVariance < 0 ? '#dc2626' : '#0284c7'}">
                ${currency} ${auditMetrics.totalFinancialVariance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>الباركود</th>
                <th>اسم المادة والتعبئة</th>
                <th style="text-align: center;">كمية النظام</th>
                <th style="text-align: center;">جرد الماركت</th>
                <th style="text-align: center;">جرد المخزن</th>
                <th style="text-align: center;">إجمالي الفعلي</th>
                <th style="text-align: center;">الفارق (قطع)</th>
                <th style="text-align: center;">الفارق المالي</th>
                <th style="text-align: center;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProducts.map(p => {
                const uPerC = Math.max(1, p.unitsPerCarton || 1);
                const recUnits = getSystemRecordedUnits(p);
                const actUnits = getProductActualTotalUnits(p);
                const mUnits = Number(marketUnits[p.id]) || 0;
                const wUnits = Number(warehouseUnits[p.id]) || 0;
                const diffUnits = actUnits - recUnits;
                const unitCost = p.costPerUnit || p.cost || 0;
                const finDiff = diffUnits * unitCost;

                return `
                  <tr>
                    <td style="font-family: monospace;">${p.barcode}</td>
                    <td><strong>${p.nameAr || p.name}</strong> <span style="color:#64748b;">(${uPerC} قط/ك)</span></td>
                    <td style="text-align: center;">${recUnits} قط (${Math.floor(recUnits / uPerC)} ك)</td>
                    <td style="text-align: center;">${mUnits}</td>
                    <td style="text-align: center;">${wUnits}</td>
                    <td style="text-align: center; font-weight: bold;">${actUnits} قط (${Math.floor(actUnits / uPerC)} ك)</td>
                    <td style="text-align: center;" class="${diffUnits === 0 ? 'match' : diffUnits < 0 ? 'deficit' : 'surplus'}">
                      ${diffUnits > 0 ? `+${diffUnits}` : diffUnits}
                    </td>
                    <td style="text-align: center; font-family: monospace;">${currency} ${finDiff.toLocaleString('en-US')}</td>
                    <td style="text-align: center;" class="${diffUnits === 0 ? 'match' : diffUnits < 0 ? 'deficit' : 'surplus'}">
                      ${diffUnits === 0 ? 'مطابق' : diffUnits < 0 ? 'عجز نقص' : 'زيادة فائض'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>توقيع مسؤول الجرد: ................................</div>
            <div>توقيع أمين المخزن: ................................</div>
            <div>اعتماد إدارة الفرع: ................................</div>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 350);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      
      {/* Toast Notification */}
      {isSuccessToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[60] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{t('تم تثبيت نتائج الجرد وتحديث المخزون بنجاح!', 'ئەنجامی جردەکە بە سەرکەوتوویی نوێکرایەوە!', 'Audit completed and stock updated successfully!')}</span>
        </div>
      )}

      <div className={`cyber-card p-4 sm:p-5 rounded-3xl border w-full max-w-[98vw] xl:max-w-7xl max-h-[95vh] flex flex-col justify-between relative shadow-2xl my-auto transition-all ${
        isLight 
          ? 'bg-slate-50 border-slate-300 text-slate-900 shadow-cyan-900/10' 
          : 'bg-[#0A101E] border-cyan-500/30 text-slate-100 shadow-black/80'
      }`}>
        
        {/* ======================================================== */}
        {/* 1. TOP HEADER BAR */}
        {/* ======================================================== */}
        <div className={`flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-600 text-white shadow-lg shadow-amber-500/20 shrink-0">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-base sm:text-lg font-black tracking-wide truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {t('مركز جرد وتدقيق المخزون الفعلي', 'ناوەندی پشکنین و جردی ڕاستەقینەی کۆگا', 'Physical Inventory Audit Hub')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 text-[10px] font-bold shrink-0">
                  {t('الماركت + المخزن', 'مارکێت + کۆگا', 'Store + Warehouse')}
                </span>
              </div>
              <p className={`text-xs mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('فحص ومطابقة كميات الصالة والمخزن مع رصيد النظام واكتشاف العجز والفائض واعتماد التعديلات فورياً',
                   'بەراوردکردنی بڕی مارکێت و کۆگا لەگەڵ سیستم و نوێکردنەوەی ڕاستەوخۆ',
                   'Verify physical stock on shelves & backroom against recorded system counts')}
              </p>
            </div>
          </div>

          {/* Quick Action Navigation & Controls */}
          <div className="flex items-center gap-2">
            {onNavigateToReports && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToReports();
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                title={t('الانتقال إلى تقارير وسجلات الجرد', 'چوون بۆ ڕاپۆرتەکانی جرد', 'Go to Inventory Reports')}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t('سجلات وتقارير الجرد 📊', 'ڕاپۆرتەکانی جرد 📊', 'Audit Reports 📊')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintAudit}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all active:scale-95 shadow-sm"
              title={t('طباعة بيان الجرد', 'چاپکردن', 'Print Audit')}
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('طباعة 📄', 'چاپ 📄', 'Print 📄')}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
              title={t('تصدير إكسل', 'تۆمار لە ئێکسڵ', 'Export Excel')}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('إكسل 📥', 'ئێکسڵ 📥', 'Excel 📥')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-600 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. SUMMARY KPI STATS CARDS */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 my-3">
          
          {/* Card 1: System Recorded Quantity */}
          <div className={`p-3 rounded-2xl border transition-all ${
            isLight ? 'bg-white border-blue-200 shadow-sm' : 'bg-[#0E172B] border-blue-500/30'
          }`}>
            <span className="text-[10px] text-blue-500 dark:text-blue-400 block font-bold uppercase tracking-wider">
              {t('١. رصيد النظام المسجل', '١. بڕی تۆمارکراوی سیستم', '1. System Recorded Stock')}
            </span>
            <div className="text-sm sm:text-base font-black text-cyan-600 dark:text-cyan-300 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{auditMetrics.totalSysUnits.toLocaleString('en-US')} {t('قطعة', 'دانە', 'pcs')}</span>
              <span className="text-slate-400 text-xs font-normal">({auditMetrics.totalSysCartons} {t('كرتون', 'کارتۆن', 'ctn')})</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {t('إجمالي المخزون الحالي بالبرنامج', 'کۆی گشتی لە سیستمدا', 'Total registered units in system')}
            </p>
          </div>

          {/* Card 2: Actual Physical Count */}
          <div className={`p-3 rounded-2xl border transition-all ${
            isLight ? 'bg-white border-amber-200 shadow-sm' : 'bg-[#19140C] border-amber-500/30'
          }`}>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold uppercase tracking-wider">
              {t('٢. إجمالي الجرد الفعلي المحسوب', '٢. کۆی ژمێردراوی ڕاستەقینە', '2. Actual Counted Total')}
            </span>
            <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-300 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{auditMetrics.totalActUnits.toLocaleString('en-US')} {t('قطعة', 'دانە', 'pcs')}</span>
              <span className="text-slate-400 text-xs font-normal">({auditMetrics.totalActCartons} {t('كرتون', 'کارتۆن', 'ctn')})</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {t('مجموع (قطع الماركت + قطع المخزن)', 'کۆی (مارکێت + کۆگا)', 'Market pieces + Warehouse pieces')}
            </p>
          </div>

          {/* Card 3: Net Discrepancy (Units & Cartons) */}
          <div className={`p-3 rounded-2xl border transition-all ${
            auditMetrics.netUnitVariance === 0 
              ? (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300')
              : auditMetrics.netUnitVariance < 0
              ? (isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/40 border-rose-500/40 text-rose-300')
              : (isLight ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-blue-950/40 border-blue-500/40 text-blue-300')
          }`}>
            <span className="text-[10px] font-bold block uppercase tracking-wider opacity-80">
              {t('٣. صافي الفارق (عجز / زيادة)', '٣. کۆی جیاوازی (کەم / زیاد)', '3. Net Discrepancy')}
            </span>
            <div className="text-sm sm:text-base font-black font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>
                {auditMetrics.netUnitVariance > 0 ? `+${auditMetrics.netUnitVariance}` : auditMetrics.netUnitVariance} {t('قطعة', 'دانە', 'pcs')}
              </span>
              <span className="text-xs font-normal opacity-80">
                ({auditMetrics.netCartonVariance > 0 ? `+${auditMetrics.netCartonVariance}` : auditMetrics.netCartonVariance} {t('كرتون', 'کارتۆن', 'ctn')})
              </span>
            </div>
            <p className="text-[10px] opacity-80 mt-1">
              {auditMetrics.totalDiscrepancies} {t('أصناف بها فروقات', 'کاڵا جیاوازی هەیە', 'items with variance')}
            </p>
          </div>

          {/* Card 4: Financial Cost Discrepancy */}
          <div className={`p-3 rounded-2xl border transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0D1525] border-cyan-500/30'
          }`}>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 block font-bold uppercase tracking-wider">
              {t('٤. الفارق المالي بالتكلفة', '٤. جیاوازی دارایی بە تێچوو', '4. Financial Variance')}
            </span>
            <div className={`text-sm sm:text-base font-black font-mono mt-0.5 ${
              auditMetrics.totalFinancialVariance === 0 ? 'text-emerald-500' : auditMetrics.totalFinancialVariance < 0 ? 'text-rose-500' : 'text-blue-500'
            }`}>
              {currency} {auditMetrics.totalFinancialVariance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {t('نسبة دقة المخزون:', 'ڕێژەی دروستی:', 'Accuracy:')} <strong className="text-cyan-500 font-mono">{auditMetrics.accuracyRate}%</strong>
            </p>
          </div>

        </div>

        {/* ======================================================== */}
        {/* 3. CONTROLS: SEARCH, CATEGORY, FILTER TABS & PRESETS */}
        {/* ======================================================== */}
        <div className={`p-2.5 rounded-2xl border mb-2.5 flex flex-wrap items-center justify-between gap-2.5 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#070D19] border-slate-800'
        }`}>
          
          {/* Search & Category Filter */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute right-3 rtl:right-3 rtl:left-auto left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('بحث بالاسم أو الباركود...', 'گەڕان بەپێی ناو یان بارکۆد...', 'Search product or barcode...')}
                className={`w-full text-xs rounded-xl py-1.5 px-8 border outline-none transition-all ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500' : 'bg-[#0B132B] border-slate-700 text-white focus:border-cyan-400'
                }`}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`text-xs font-bold py-1.5 px-2.5 rounded-xl border outline-none cursor-pointer ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-[#0B132B] border-slate-700 text-cyan-300'
              }`}
            >
              <option value="ALL">{t('كافة الأقسام (الكل)', 'هەموو بەشەکان', 'All Categories')}</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterDiscrepancy('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                filterDiscrepancy === 'ALL'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                  : isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
            >
              {t('الكل', 'هەموو', 'All')} ({products.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterDiscrepancy('DIFF_ONLY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                filterDiscrepancy === 'DIFF_ONLY'
                  ? 'bg-rose-600 text-white border-rose-400 font-black shadow-sm'
                  : isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
            >
              ⚠️ {t('الفروقات فقط', 'تەنها جیاوازییەکان', 'Discrepancies')} ({auditMetrics.totalDiscrepancies})
            </button>

            <button
              type="button"
              onClick={() => setFilterDiscrepancy('MATCH_ONLY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                filterDiscrepancy === 'MATCH_ONLY'
                  ? 'bg-emerald-600 text-white border-emerald-400 font-black shadow-sm'
                  : isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
            >
              ✅ {t('المتطابق', 'هاوتا', 'Matches')} ({auditMetrics.matchCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterDiscrepancy('DEFICIT_ONLY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                filterDiscrepancy === 'DEFICIT_ONLY'
                  ? 'bg-rose-500/30 text-rose-300 border-rose-500 font-black shadow-sm'
                  : isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
            >
              🔻 {t('عجز ونقص', 'کەمی', 'Deficits')} ({auditMetrics.deficitCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterDiscrepancy('SURPLUS_ONLY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                filterDiscrepancy === 'SURPLUS_ONLY'
                  ? 'bg-blue-500/30 text-blue-300 border-blue-500 font-black shadow-sm'
                  : isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
            >
              🔺 {t('فائض وزيادة', 'زیادە', 'Surplus')} ({auditMetrics.surplusCount})
            </button>
          </div>

          {/* Quick Helper Tools */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrefillWithSystem}
              className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              title={t('تعبئة خانات الجرد تلقائياً بأرصدة النظام للبدء في تدقيق الاستثناءات', 'پڕکردنەوەی خۆکار بە باڵانسی سیستم', 'Pre-fill with recorded system quantities')}
            >
              <Zap className="w-3 h-3 text-blue-400" />
              <span>{t('تعبئة برصيد النظام ⚡', 'باڵانسی سیستم ⚡', 'Pre-fill System ⚡')}</span>
            </button>

            <button
              type="button"
              onClick={handleResetToZero}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              title={t('تصفير كافة الخانات لبدء الجرد يدوياً من الصفر', 'سفرکردنەوەی هەمووی', 'Reset all fields to zero')}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('تصفير 🔄', 'سفر 🔄', 'Reset 🔄')}</span>
            </button>
          </div>

        </div>

        {/* ======================================================== */}
        {/* 4. MAIN AUDIT DATA TABLE */}
        {/* ======================================================== */}
        <div className={`flex-1 overflow-y-auto rounded-2xl border min-h-[350px] max-h-[50vh] custom-scrollbar ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#060B16] border-slate-800'
        }`}>
          <table className="w-full text-right rtl:text-right text-xs">
            <thead className={`sticky top-0 z-20 text-[11px] font-bold border-b ${
              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#0B1326] text-slate-300 border-slate-800'
            }`}>
              <tr>
                <th className="py-2.5 px-3">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                <th className="py-2.5 px-3">{t('اسم المادة والتعبئة', 'ناوی کاڵا و پاکەت', 'Product Name & Pack')}</th>
                <th className="py-2.5 px-3 text-center bg-blue-950/20 text-cyan-300 border-x border-slate-800/60">
                  {t('كمية النظام (المسجلة)', 'بڕی تۆمارکراوی سیستم', 'System Quantity')}
                </th>
                <th className="py-2.5 px-3 text-center bg-amber-950/20 text-amber-300 border-r border-slate-800/60">
                  {t('جرد الماركت (بالعدد / قطع)', 'جردی مارکێت (بە دانە)', 'Market (Pieces)')}
                </th>
                <th className="py-2.5 px-3 text-center bg-indigo-950/20 text-indigo-300 border-r border-slate-800/60">
                  {t('جرد المخزن (بالعدد / قطع)', 'جردی کۆگا (بە دانە)', 'Warehouse (Pieces)')}
                </th>
                <th className="py-2.5 px-3 text-center bg-cyan-950/20 text-cyan-300 border-r border-slate-800/60">
                  {t('إجمالي العدد الفعلي', 'کۆی دانەی ڕاستەقینە', 'Total Actual Units')}
                </th>
                <th className="py-2.5 px-3 text-center bg-emerald-950/20 text-emerald-300 border-r border-slate-800/60">
                  {t('المحسوب بالكرتون', 'ئەژمارکراو بە کارتۆن', 'Calculated Cartons')}
                </th>
                <th className="py-2.5 px-3 text-center border-r border-slate-800/60">
                  {t('الفارق والأثر المالي', 'جیاوازی و بەهای دارایی', 'Variance & Financial Impact')}
                </th>
                <th className="py-2.5 px-3 text-center">{t('الحالة', 'دۆخ', 'Status')}</th>
                <th className="py-2.5 px-3 text-center">{t('إجراء', 'کردار', 'Action')}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    <p className="font-bold text-sm">{t('لا توجد أصناف مطابقة لخيارات البحث والفلتر', 'هیچ کاڵایەک نەدۆزرایەوە', 'No matching items found')}</p>
                    <p className="text-xs mt-1 text-slate-400">{t('جرّب تعديل نص البحث أو اختيار قسم آخر', 'گەڕانەکەت بگۆڕە', 'Try adjusting search term or category filter')}</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const unitsPerCarton = Math.max(1, p.unitsPerCarton || 1);
                  const recordedTotalUnits = getSystemRecordedUnits(p);
                  const recordedCartons = Math.floor(recordedTotalUnits / unitsPerCarton);

                  const mUnits = Number(marketUnits[p.id]) || 0;
                  const wUnits = Number(warehouseUnits[p.id]) || 0;

                  const countedTotalUnits = getProductActualTotalUnits(p);
                  const countedCartons = Math.floor(countedTotalUnits / unitsPerCarton);
                  const countedLooseUnits = countedTotalUnits % unitsPerCarton;

                  const diffUnits = countedTotalUnits - recordedTotalUnits;
                  const diffCartons = countedCartons - recordedCartons;
                  const unitCost = p.costPerUnit || p.cost || 0;
                  const finDiff = diffUnits * unitCost;

                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors ${
                        diffUnits === 0 
                          ? 'hover:bg-slate-800/30' 
                          : diffUnits < 0 
                          ? 'bg-rose-500/5 hover:bg-rose-500/10' 
                          : 'bg-blue-500/5 hover:bg-blue-500/10'
                      }`}
                    >
                      {/* 1. Barcode */}
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                        {p.barcode}
                      </td>

                      {/* 2. Product Name & Pack Size */}
                      <td className="py-2.5 px-3 max-w-[200px]">
                        <p className={`font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {p.nameAr || p.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-bold">
                            {unitsPerCarton} {t('قطعة / كرتون', 'دانە / کارتۆن', 'pcs/ctn')}
                          </span>
                          <span className="text-slate-500 truncate">{p.categoryAr || p.category}</span>
                        </div>
                      </td>

                      {/* 3. System Recorded Quantity */}
                      <td className="py-2.5 px-3 text-center font-mono bg-blue-950/10 border-x border-slate-800/60">
                        <div className="font-black text-cyan-400 text-xs">
                          {recordedTotalUnits} <span className="text-[10px] text-slate-400 font-normal">{t('قطعة', 'دانە', 'pcs')}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ({recordedCartons} {t('كرتون', 'کارتۆن', 'ctn')})
                        </div>
                      </td>

                      {/* 4. In-Market Count (بالعدد) */}
                      <td className="py-2.5 px-3 text-center bg-amber-950/10 border-r border-slate-800/60">
                        <div className="inline-flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={mUnits === 0 ? '' : mUnits}
                            placeholder="0"
                            onChange={(e) => handleMarketUnitsChange(p, e.target.value === '' ? 0 : Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className={`w-20 font-bold font-mono text-center py-1.5 px-2 rounded-xl border text-xs shadow-inner focus:outline-none transition-all ${
                              isLight 
                                ? 'bg-amber-50/80 border-amber-300 text-amber-900 focus:border-amber-500' 
                                : 'bg-[#10192D] border-amber-500/40 text-amber-300 focus:border-amber-400'
                            }`}
                          />
                          <span className="text-[10px] text-amber-500 font-bold">{t('قطعة', 'دانە', 'pcs')}</span>
                        </div>
                      </td>

                      {/* 5. In-Warehouse Count (بالعدد) */}
                      <td className="py-2.5 px-3 text-center bg-indigo-950/10 border-r border-slate-800/60">
                        <div className="inline-flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={wUnits === 0 ? '' : wUnits}
                            placeholder="0"
                            onChange={(e) => handleWarehouseUnitsChange(p, e.target.value === '' ? 0 : Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className={`w-20 font-bold font-mono text-center py-1.5 px-2 rounded-xl border text-xs shadow-inner focus:outline-none transition-all ${
                              isLight 
                                ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 focus:border-indigo-500' 
                                : 'bg-[#10192D] border-indigo-500/40 text-indigo-300 focus:border-indigo-400'
                            }`}
                          />
                          <span className="text-[10px] text-indigo-500 font-bold">{t('قطعة', 'دانە', 'pcs')}</span>
                        </div>
                      </td>

                      {/* 6. Total Actual Units (إجمالي العدد الفعلي) */}
                      <td className="py-2.5 px-3 text-center font-mono bg-cyan-950/10 border-r border-slate-800/60">
                        <div className="font-black text-cyan-300 text-xs">
                          {countedTotalUnits} <span className="text-[10px] text-slate-400 font-normal">{t('قطعة', 'دانە', 'pcs')}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          ({mUnits} + {wUnits})
                        </div>
                      </td>

                      {/* 7. Calculated Cartons (المحسوب بالكرتون) */}
                      <td className="py-2.5 px-3 text-center font-mono bg-emerald-950/10 border-r border-slate-800/60">
                        <div className="font-black text-emerald-400 text-xs">
                          {countedCartons} <span className="text-[10px] text-slate-400 font-normal">{t('كرتون', 'کارتۆن', 'ctn')}</span>
                        </div>
                        {countedLooseUnits > 0 ? (
                          <div className="text-[10px] text-amber-400 font-bold">
                            + {countedLooseUnits} {t('قطعة متبقية', 'دانەی ماوە', 'loose')}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500">
                            {t('كراتين كاملة', 'کارتۆنی تەواو', 'Full')}
                          </div>
                        )}
                      </td>

                      {/* 8. Discrepancy & Value Variance (الفارق والأثر المالي) */}
                      <td className="py-2.5 px-3 text-center font-mono border-r border-slate-800/60">
                        {diffUnits === 0 ? (
                          <span className="text-emerald-500 font-bold text-xs">0 ({t('مطابق', 'هاوتا', 'Match')})</span>
                        ) : diffUnits > 0 ? (
                          <div>
                            <div className="text-blue-400 font-black text-xs">+{diffUnits} {t('قطعة زيادة', 'دانە زیاد', 'pcs extra')}</div>
                            <div className="text-[10px] text-blue-300 font-bold">+{currency} {finDiff.toLocaleString('en-US')}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-rose-500 font-black text-xs">{diffUnits} {t('قطعة عجز', 'دانە کەم', 'pcs deficit')}</div>
                            <div className="text-[10px] text-rose-400 font-bold">-{currency} {Math.abs(finDiff).toLocaleString('en-US')}</div>
                          </div>
                        )}
                      </td>

                      {/* 9. Status Badge */}
                      <td className="py-2.5 px-3 text-center">
                        {diffUnits === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            {t('مطابق سليم', 'هاوتا', 'Match')}
                          </span>
                        ) : diffUnits < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold animate-pulse">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            {t('عجز ونقص', 'کەمی هەیە', 'Deficit')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-bold">
                            <TrendingUp className="w-3 h-3 text-cyan-400" />
                            {t('فائض وزيادة', 'زیادە هەیە', 'Surplus')}
                          </span>
                        )}
                      </td>

                      {/* 10. Quick Action */}
                      <td className="py-2.5 px-3 text-center">
                        {diffUnits !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleMatchSingleProduct(p)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                            title={t('مطابقة هذا الصنف برصيد النظام', 'هاوتاکردنەوەی ئەم کاڵایە', 'Match with system count')}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ======================================================== */}
        {/* 5. FOOTER & AUDIT CONFIRMATION CONTROLS */}
        {/* ======================================================== */}
        <div className={`mt-3 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          
          {/* Auditor Name & Session Notes Input */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold text-[11px] whitespace-nowrap">{t('المسؤول / المدقق:', 'بەرپرسی جرد:', 'Auditor:')}</span>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                className={`py-1 px-2.5 rounded-xl border text-xs outline-none ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-cyan-300'
                }`}
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs flex-1 min-w-[200px]">
              <span className="text-slate-400 font-bold text-[11px] whitespace-nowrap">{t('ملاحظات:', 'تێبینی:', 'Notes:')}</span>
              <input
                type="text"
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                placeholder={t('أضف أي ملاحظات أو أسباب الفروقات...', 'تێبینی بنووسە...', 'Add audit notes...')}
                className={`py-1 px-2.5 rounded-xl border text-xs outline-none w-full ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              {t('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
            </button>

            <button
              type="button"
              onClick={handleApplyAllAdjustments}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-amber-900/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95 border border-amber-400/40"
            >
              <Save className="w-4 h-4" />
              <span>{t('اعتماد الجرد وتحديث المخزون وحفظ الجلسة', 'پەسەندکردنی جرد و نوێکردنەوەی کۆگا', 'Apply & Save Audit Session')}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
