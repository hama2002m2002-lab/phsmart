import React, { useState } from 'react';
import { Clock, TrendingUp, TrendingDown, Minus, Info, History } from 'lucide-react';
import { Product } from '../types';
import { formatNumber } from '../lib/formatUtils';

interface PriceHistoryTooltipProps {
  product: Product;
  currency?: string;
  isAr?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const PriceHistoryTooltip: React.FC<PriceHistoryTooltipProps> = ({
  product,
  currency = '$',
  isAr = true,
  children,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const lastUpdate = product.lastPriceUpdate || product.lastEditDate || product.initialAddDate;
  const history = product.priceHistory || [];

  const formattedDate = lastUpdate
    ? new Date(lastUpdate).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : isAr ? 'غير مسجل' : 'N/A';

  let lastDiff = 0;
  if (history.length > 0) {
    const latest = history[0];
    lastDiff = latest.newPrice - latest.oldPrice;
  }

  return (
    <div className={`relative inline-block ${className}`} onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <div className="cursor-help flex items-center gap-1 group">
        {children}
        <span className="p-0.5 rounded hover:bg-cyan-500/20 text-cyan-400 opacity-70 group-hover:opacity-100 transition-opacity">
          <Clock className="w-3 h-3" />
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-[#080E1C] border border-cyan-500/40 rounded-xl shadow-2xl text-slate-100 text-xs space-y-2 animate-fadeIn pointer-events-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-cyan-300 flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'تاريخ وسجل تعديل السعر' : 'Price Change History'}</span>
            </span>
            {lastDiff > 0 ? (
              <span className="text-[10px] font-bold text-rose-400 flex items-center gap-0.5 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/30">
                <TrendingUp className="w-3 h-3" /> +{currency}{formatNumber(lastDiff)} (تضخم)
              </span>
            ) : lastDiff < 0 ? (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                <TrendingDown className="w-3 h-3" /> {currency}{formatNumber(lastDiff)} (تخفيض)
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                <Minus className="w-3 h-3" /> مستقر
              </span>
            )}
          </div>

          {/* Last Update Date */}
          <div className="bg-[#0B1224] p-2 rounded-lg border border-slate-800 text-[11px] space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>{isAr ? 'تاريخ آخر تحديث للسعر:' : 'Last Price Update:'}</span>
              <span className="font-mono font-bold text-white">{formattedDate}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{isAr ? 'السعر الحالي مفرد:' : 'Current Unit Price:'}</span>
              <span className="font-mono font-bold text-emerald-400">{currency}{formatNumber(product.singleRetailPrice || product.price)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{isAr ? 'سعر التكلفة الحالية:' : 'Current Cost:'}</span>
              <span className="font-mono font-bold text-amber-300">{currency}{formatNumber(product.costPerUnit || product.cost)}</span>
            </div>
          </div>

          {/* Recent History Entries */}
          {history.length > 0 ? (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'سجل التعديلات السابقة:' : 'Past Modifications:'}</span>
              <div className="max-h-28 overflow-y-auto space-y-1 text-[10px]">
                {history.slice(0, 4).map((h, i) => (
                  <div key={i} className="p-1.5 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between font-mono">
                    <div>
                      <p className="text-slate-300 font-sans font-semibold">{h.updatedBy || (isAr ? 'الصيدلي / الكاشير' : 'Staff')}</p>
                      <p className="text-[9px] text-slate-500">{new Date(h.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</p>
                    </div>
                    <div className="text-right">
                      <span className="line-through text-slate-500 mr-1">{currency}{formatNumber(h.oldPrice)}</span>
                      <span className="font-bold text-cyan-300">➔ {currency}{formatNumber(h.newPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 text-center py-0.5">
              {isAr ? 'لا يوجد سجل تعديلات سابقة لهذا السعر' : 'No previous price adjustments logged'}
            </p>
          )}

          {/* Arrow indicator */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#080E1C]" />
        </div>
      )}
    </div>
  );
};
