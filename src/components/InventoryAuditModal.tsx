import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  X, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  RotateCcw,
  Package,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { getTranslation, getProductName } from '../lib/translations';

interface InventoryAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
}

export const InventoryAuditModal: React.FC<InventoryAuditModalProps> = ({
  isOpen,
  onClose,
  products,
  setProducts,
  settings,
}) => {
  if (!isOpen) return null;

  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const [search, setSearch] = useState('');
  const [filterDiscrepancy, setFilterDiscrepancy] = useState<'ALL' | 'DIFF_ONLY' | 'MATCH_ONLY'>('ALL');
  
  // Local state for total actual counted units per product ID
  const [actualUnits, setActualUnits] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    products.forEach(p => {
      initial[p.id] = p.totalUnits || (p.cartonsCount * (p.unitsPerCarton || 1));
    });
    return initial;
  });

  const handleCartonsChange = (p: Product, cartonsVal: number) => {
    const safeCartons = Math.max(0, cartonsVal);
    const unitsPerCarton = p.unitsPerCarton || 1;
    const currentTotal = actualUnits[p.id] ?? (p.cartonsCount * unitsPerCarton);
    const currentLoose = currentTotal % unitsPerCarton;
    const newTotal = (safeCartons * unitsPerCarton) + currentLoose;
    
    setActualUnits(prev => ({
      ...prev,
      [p.id]: newTotal
    }));
  };

  const handleUnitsChange = (p: Product, unitsVal: number) => {
    const safeUnits = Math.max(0, unitsVal);
    setActualUnits(prev => ({
      ...prev,
      [p.id]: safeUnits
    }));
  };

  const filteredProducts = products.filter(p => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(searchLower) ||
      (p.nameAr && p.nameAr.includes(search)) ||
      p.barcode.includes(search);

    const recordedTotalUnits = p.totalUnits || (p.cartonsCount * (p.unitsPerCarton || 1));
    const countedTotalUnits = actualUnits[p.id] ?? recordedTotalUnits;
    const diff = countedTotalUnits - recordedTotalUnits;

    if (filterDiscrepancy === 'DIFF_ONLY') return matchesSearch && diff !== 0;
    if (filterDiscrepancy === 'MATCH_ONLY') return matchesSearch && diff === 0;
    return matchesSearch;
  });

  const totalRecordedCartons = products.reduce((acc, p) => acc + p.cartonsCount, 0);
  const totalRecordedUnits = products.reduce((acc, p) => acc + (p.totalUnits || (p.cartonsCount * (p.unitsPerCarton || 1))), 0);
  
  const totalCountedUnits = products.reduce((acc, p) => acc + (actualUnits[p.id] ?? (p.totalUnits || (p.cartonsCount * (p.unitsPerCarton || 1)))), 0);
  const totalCountedCartons = products.reduce((acc, p) => {
    const counted = actualUnits[p.id] ?? (p.totalUnits || (p.cartonsCount * (p.unitsPerCarton || 1)));
    return acc + Math.floor(counted / (p.unitsPerCarton || 1));
  }, 0);

  const totalDiffUnits = totalCountedUnits - totalRecordedUnits;
  const totalDiffCartons = totalCountedCartons - totalRecordedCartons;

  const handleApplyAllAdjustments = () => {
    setProducts(prev => prev.map(p => {
      const unitsPerCarton = p.unitsPerCarton || 1;
      const recUnits = p.totalUnits || (p.cartonsCount * unitsPerCarton);
      const newTotalUnits = actualUnits[p.id] ?? recUnits;
      
      if (newTotalUnits !== recUnits) {
        const newCartons = Math.floor(newTotalUnits / unitsPerCarton);
        const status = newTotalUnits === 0 ? 'out_of_stock' : newTotalUnits <= p.minStock ? 'low_stock' : 'in_stock';
        return {
          ...p,
          cartonsCount: newCartons,
          totalUnits: newTotalUnits,
          stock: newTotalUnits,
          status,
          lastEditDate: new Date().toISOString().split('T')[0]
        };
      }
      return p;
    }));
    alert(isAr ? 'تم تحديث المخزون برقم الجرد الفعلي بالكرتون والعدد بنجاح!' : 'Stock updated with actual audit count by cartons and unit numbers successfully!');
    onClose();
  };

  const handlePrintAudit = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="cyber-card p-4 sm:p-5 rounded-2xl border border-amber-500/40 w-full max-w-[96vw] xl:max-w-6xl bg-[#0B1120] text-slate-100 relative animate-scaleUp shadow-2xl my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                {isKu ? 'واژەی پشکنین و جردی ڕاستەقینەی کۆگا' : isAr ? 'واجهة جرد المخزون والتدقيق الفعلي' : 'Physical Inventory Audit Interface'}
              </h2>
              <p className="text-xs text-slate-400">
                {isKu ? 'بەراوردکردنی بڕی تۆمارکراوی سیستم لەگەڵ بڕی ڕاستەقینە و نوێکردنەوەی جیاوازییەکان' : isAr ? 'مقارنة الكميات المسجلة بالنظام مع الكمية الفعلية وتحديث الفروقات بضغطة واحدة' : 'Compare system quantity vs actual physical count and resolve inventory discrepancies'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
          <div className="bg-[#10192D] p-3 rounded-xl border border-blue-500/20 text-center">
            <span className="text-[11px] text-slate-400 block font-semibold">
              {isAr ? 'كمية النظام المسجلة' : 'System Recorded Quantity'}
            </span>
            <span className="text-base font-black text-cyan-400 font-mono mt-0.5 block">
              {totalRecordedCartons} {isAr ? 'كرتونة' : 'cartons'} ({totalRecordedUnits} {isAr ? 'قطعة' : 'pcs'})
            </span>
          </div>

          <div className="bg-[#10192D] p-3 rounded-xl border border-amber-500/20 text-center">
            <span className="text-[11px] text-slate-400 block font-semibold">
              {isAr ? 'كمية الجرد الفعلي المحسوبة' : 'Actual Counted Quantity'}
            </span>
            <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">
              {totalCountedCartons} {isAr ? 'كرتونة' : 'cartons'} ({totalCountedUnits} {isAr ? 'قطعة' : 'pcs'})
            </span>
          </div>

          <div className={`p-3 rounded-xl border text-center ${
            totalDiffUnits === 0 ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' :
            totalDiffUnits > 0 ? 'bg-blue-950/30 border-blue-500/30 text-blue-400' :
            'bg-rose-950/30 border-rose-500/30 text-rose-400'
          }`}>
            <span className="text-[11px] text-slate-400 block font-semibold">
              {isAr ? 'إجمالي الفارق (بالعدد والكرتون)' : 'Total Discrepancy'}
            </span>
            <span className="text-base font-black font-mono mt-0.5 block">
              {totalDiffUnits > 0 ? `+${totalDiffUnits}` : totalDiffUnits} {isAr ? 'قطعة' : 'pcs'} ({totalDiffCartons > 0 ? `+${totalDiffCartons}` : totalDiffCartons} {isAr ? 'كرتون' : 'cartons'})
            </span>
          </div>
        </div>

        {/* Controls: Search & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو الباركود للجرد...' : 'Search item or barcode...'}
              className="w-full bg-[#10192D] text-xs text-slate-200 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl border border-blue-500/20 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterDiscrepancy('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                filterDiscrepancy === 'ALL'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {isAr ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setFilterDiscrepancy('DIFF_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                filterDiscrepancy === 'DIFF_ONLY'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {isAr ? 'الفروقات فقط' : 'Discrepancies Only'}
            </button>
            <button
              onClick={() => setFilterDiscrepancy('MATCH_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                filterDiscrepancy === 'MATCH_ONLY'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {isAr ? 'المتطابق فقط' : 'Matches Only'}
            </button>
          </div>
        </div>

        {/* Audit Table */}
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-800 bg-[#070C18]">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead className="bg-[#10192D] text-slate-400 text-[11px] font-bold sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">{isAr ? 'الباركود' : 'Barcode'}</th>
                <th className="py-2.5 px-3">{isAr ? 'اسم المادة' : 'Product Name'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'النظام (كرتون / قطع)' : 'System Recorded'}</th>
                <th className="py-2.5 px-3 text-center text-amber-400">{isAr ? 'جرد الكراتين' : 'Carton Count'}</th>
                <th className="py-2.5 px-3 text-center text-cyan-400">{isAr ? 'جرد بالعدد (القطع)' : 'Unit Count (Pieces)'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'الفارق (قطع / كرتون)' : 'Difference'}</th>
                <th className="py-2.5 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.map(p => {
                const unitsPerCarton = p.unitsPerCarton || 1;
                const recordedTotalUnits = p.totalUnits || (p.cartonsCount * unitsPerCarton);
                const recordedCartons = p.cartonsCount;

                const countedTotalUnits = actualUnits[p.id] ?? recordedTotalUnits;
                const countedCartons = Math.floor(countedTotalUnits / unitsPerCarton);

                const diffUnits = countedTotalUnits - recordedTotalUnits;
                const diffCartons = countedCartons - recordedCartons;

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-mono text-cyan-400 font-bold">{p.barcode}</td>
                    <td className="py-2 px-3">
                      <p className="font-bold text-slate-100">{p.nameAr || p.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">({unitsPerCarton} قطعة/كرتون)</p>
                    </td>
                    
                    {/* System Recorded */}
                    <td className="py-2 px-3 text-center font-bold font-mono text-slate-300">
                      <div>{recordedCartons} <span className="text-[10px] text-slate-500">كرتون</span></div>
                      <div className="text-[10px] text-cyan-400 font-normal">{recordedTotalUnits} قطعة</div>
                    </td>

                    {/* Input 1: Cartons Count */}
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={countedCartons}
                          onChange={(e) => handleCartonsChange(p, Number(e.target.value))}
                          className="w-20 bg-[#10192D] text-amber-300 font-bold font-mono text-center py-1 px-2 rounded-lg border border-amber-500/40 focus:outline-none focus:border-amber-400 text-xs"
                        />
                        <span className="text-[10px] text-slate-400">ك</span>
                      </div>
                    </td>

                    {/* Input 2: Units / Pieces Count (حقل الجرد بالعدد) */}
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={countedTotalUnits}
                          onChange={(e) => handleUnitsChange(p, Number(e.target.value))}
                          className="w-24 bg-[#10192D] text-cyan-300 font-bold font-mono text-center py-1 px-2 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 text-xs"
                        />
                        <span className="text-[10px] text-slate-400">قطعة</span>
                      </div>
                    </td>

                    {/* Discrepancy */}
                    <td className="py-2 px-3 text-center font-mono font-bold">
                      {diffUnits === 0 ? (
                        <span className="text-emerald-400 text-[11px]">0 (متطابق)</span>
                      ) : diffUnits > 0 ? (
                        <span className="text-blue-400 text-[11px]">+{diffUnits} قطعة (+{diffCartons} كرتون)</span>
                      ) : (
                        <span className="text-rose-400 text-[11px]">{diffUnits} قطعة ({diffCartons} كرتون)</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3 text-center">
                      {diffUnits === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          {isAr ? 'سليم' : 'Match'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          {isAr ? 'فارق' : 'Discrepancy'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-800">
          <button
            onClick={handlePrintAudit}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>{isAr ? 'طباعة كشف الجرد' : 'Print Audit Sheet'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleApplyAllAdjustments}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 text-white font-bold text-xs shadow-lg hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{isAr ? 'اعتماد نتائج الجرد وتحديث المخزون' : 'Apply Audit & Update Stock'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
