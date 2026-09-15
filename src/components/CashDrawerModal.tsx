import React, { useState } from 'react';
import { 
  X, 
  Vault, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw, 
  Banknote, 
  ArrowDownRight, 
  ArrowUpRight, 
  PlusCircle, 
  MinusCircle, 
  History,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Building2,
  Printer
} from 'lucide-react';
import { SaleTransaction, StoreSettings } from '../types';
import { formatNumber } from '../lib/formatUtils';

interface CashDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesHistory: SaleTransaction[];
  settings: StoreSettings;
  onOpenShiftReport?: () => void;
}

interface CashAdjustment {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  reason: string;
  timestamp: string;
  cashier: string;
}

export const CashDrawerModal: React.FC<CashDrawerModalProps> = ({
  isOpen,
  onClose,
  salesHistory,
  settings,
  onOpenShiftReport
}) => {
  if (!isOpen) return null;

  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const initialFloat = 250.00; // رصيد افتتاحي افتراضي للخزنة
  const [adjustments, setAdjustments] = useState<CashAdjustment[]>([
    {
      id: 'adj-1',
      type: 'deposit',
      amount: 100,
      reason: isKu ? 'باڵانسی سەرەتایی زیادکراوی خەزێنە' : isAr ? 'رصيد إضافي افتتاحي للخزنة' : 'Opening float deposit',
      timestamp: new Date().toLocaleDateString(isAr ? 'ar-SA' : isKu ? 'ckb-IQ' : 'en-US', { dateStyle: 'short' }) + ' 08:00 AM',
      cashier: isKu ? 'ئەحمەد ئیبراهیمی' : isAr ? 'أحمد الإبراهيمي' : 'Ahmed Al-Ibrahimi'
    }
  ]);

  const [showAddAdjustment, setShowAddAdjustment] = useState(false);
  const [adjType, setAdjType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Calculate Cash Totals
  const cashSales = salesHistory
    .filter(s => s.paymentMethod === 'cash' || !s.paymentMethod)
    .reduce((acc, s) => acc + s.total, 0);

  const totalRefundsFromCash = salesHistory.reduce((acc, s) => {
    const itemReturns = (s.returnedItems || []).reduce((rAcc, r) => rAcc + r.total, 0);
    return acc + itemReturns;
  }, 0);

  const totalDeposits = adjustments
    .filter(a => a.type === 'deposit')
    .reduce((acc, a) => acc + a.amount, 0);

  const totalWithdrawals = adjustments
    .filter(a => a.type === 'withdrawal')
    .reduce((acc, a) => acc + a.amount, 0);

  const netCashInDrawer = initialFloat + cashSales + totalDeposits - totalRefundsFromCash - totalWithdrawals;

  const handleAddAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(adjAmount);
    if (isNaN(num) || num <= 0) {
      setAlertMsg(isKu ? 'تکایە بڕە پارەیەکی دروست بنووسە' : isAr ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    const defaultReason = adjType === 'deposit' 
      ? (isKu ? 'دانانی نەقد' : isAr ? 'إيداع نقدي' : 'Cash Deposit') 
      : (isKu ? 'ڕاکێشانی نەقد / خەرجی' : isAr ? 'سحب نقدي / مصاريف' : 'Cash Withdrawal');

    const newAdj: CashAdjustment = {
      id: `adj-${Date.now()}`,
      type: adjType,
      amount: num,
      reason: adjReason.trim() || defaultReason,
      timestamp: new Date().toLocaleString(isAr ? 'ar-SA' : isKu ? 'ckb-IQ' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }),
      cashier: isKu ? 'کاشێری ئێستا' : isAr ? 'الكاشير الحالي' : 'Current Cashier'
    };

    setAdjustments(prev => [newAdj, ...prev]);
    setAdjAmount('');
    setAdjReason('');
    setShowAddAdjustment(false);
    setAlertMsg(isKu ? 'جوڵەی خەزێنە بە سەرکەوتوویی تۆمارکرا!' : isAr ? 'تم تسجيل الحركة في الخزنة بنجاح!' : 'Adjustment logged successfully!');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="cyber-card w-full max-w-4xl max-h-[92vh] rounded-3xl border border-emerald-500/40 bg-[#0A121E] text-slate-100 flex flex-col overflow-hidden shadow-[0_0_60px_rgba(16,185,129,0.25)] relative">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 bg-[#0F1929]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Vault className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                <span>{isKu ? 'سندوقی پارە و خەزێنە' : isAr ? 'واجهة الخزنة وحركة صندوق الكاشير' : 'Cash Drawer & Treasury Safe'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  LIVE VAULT
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isKu ? 'چاودێریکردنی باڵانسی ڕاستەقینەی خەزێنە، فرۆشتنی نەقد و بڕە گەڕێنراوەکان' : isAr ? 'متابعة الرصيد الفعلي بالصندوق، المبيعات النقدية، والمبالغ المسترجعة' : 'Track live safe balance, cash sales, and returns.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenShiftReport && (
              <button
                onClick={onOpenShiftReport}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-cyan-900/30 cursor-pointer active:scale-95"
                title={isKu ? 'چاپکردنی ڕاپۆرتی نۆبەت و وردەکاری سندوق' : isAr ? 'طباعة ملخص وردية اليوم وإحصائيات الدرج' : 'Print Shift Report'}
              >
                <Printer className="w-4 h-4 text-cyan-200" />
                <span>{isKu ? 'چاپکردنی ڕاپۆرتی نۆبەت' : isAr ? 'طباعة ملخص الوردية' : 'Print Shift Report'}</span>
              </button>
            )}

            <button
              onClick={() => setShowAddAdjustment(!showAddAdjustment)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/30 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isKu ? 'دانان / ڕاکێشانی ڕاستەوخۆ' : isAr ? 'إيداع / سحب مباشر' : 'Add Cash Adjustment'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {alertMsg && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{alertMsg}</span>
            </div>
            <button onClick={() => setAlertMsg(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* Main Balance Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Net Cash in Drawer (HIGHLIGHTED) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/90 via-[#0B1B17] to-teal-950/80 border-2 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.2)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
              <div className="flex items-center justify-between text-xs text-emerald-300 font-bold mb-1">
                <span>{isKu ? 'باڵانسی ماوەی ناو خەزێنە' : isAr ? 'الصافي المتبقي بالخزنة' : 'Net Cash in Drawer'}</span>
                <Banknote className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                {settings.currencySymbol}{formatNumber(netCashInDrawer)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isKu ? 'بڕی پارەی ڕاستەقینەی بەردەست لە دەستی کاشێردا' : isAr ? 'الرصيد الفعلي المتوفر داخل درج الكاشير' : 'Actual cash currently inside the cash register'}
              </p>
            </div>

            {/* 2. Total Cash Sales */}
            <div className="p-4 rounded-2xl bg-[#0F1829] border border-blue-500/30 shadow-md">
              <div className="flex items-center justify-between text-xs text-blue-300 font-bold mb-1">
                <span>{isKu ? 'کۆی فرۆشتنی نەقد (+)' : isAr ? 'إجمالي المبيعات النقدية (+)' : 'Cash Sales (+)'}</span>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-black text-blue-400 font-mono">
                +{settings.currencySymbol}{formatNumber(cashSales)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isKu ? 'بڕە پارەی کۆکراوە لە پسوڵە فرۆشراوەکانەوە' : isAr ? 'المبالغ المضافة من الفواتير المباعة' : 'Money collected from cash receipts'}
              </p>
            </div>

            {/* 3. Total Cash Refunds Paid */}
            <div className="p-4 rounded-2xl bg-[#1D0F18] border border-rose-500/40 shadow-md">
              <div className="flex items-center justify-between text-xs text-rose-300 font-bold mb-1">
                <span>{isKu ? 'بڕی گەڕێنراوە لە خەزێنە (-)' : isAr ? 'المبالغ المسترجعة من الخزنة (-)' : 'Refunds Paid (-)'}</span>
                <RotateCcw className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl font-black text-rose-400 font-mono">
                -{settings.currencySymbol}{formatNumber(totalRefundsFromCash)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isKu ? 'بڕی پارەی گەڕێنراوە لە سندوق' : isAr ? 'مبالغ الإرجاع المقتطعة من الصندوق' : 'Refunded amount paid out from drawer'}
              </p>
            </div>

            {/* 4. Initial Float & Adjustments */}
            <div className="p-4 rounded-2xl bg-[#121A28] border border-cyan-500/30 shadow-md">
              <div className="flex items-center justify-between text-xs text-cyan-300 font-bold mb-1">
                <span>{isKu ? 'باڵانسی سەرەتایی و دەستکارییەکان' : isAr ? 'رصيد افتتاحي وتعديلات' : 'Opening Float & Drops'}</span>
                <DollarSign className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-black text-cyan-400 font-mono">
                {settings.currencySymbol}{formatNumber(initialFloat + totalDeposits - totalWithdrawals)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isKu ? 'سەرەتایی:' : isAr ? 'افتتاحي:' : 'Float:'} {settings.currencySymbol}{formatNumber(initialFloat)} | {isKu ? 'دەستکاری:' : isAr ? 'إيداع/سحب:' : 'Adj:'} {settings.currencySymbol}{formatNumber(totalDeposits - totalWithdrawals)}
              </p>
            </div>
          </div>

          {/* Form to Add Adjustment (Deposit / Withdrawal) */}
          {showAddAdjustment && (
            <form onSubmit={handleAddAdjustment} className="p-4 rounded-2xl bg-[#101C2E] border border-emerald-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{isKu ? 'تۆمارکردنی دانان یان ڕاکێشانی ڕاستەوخۆی نەقد' : isAr ? 'تسجيل حركة إيداع أو سحب نقدي مباشر' : 'Record Direct Cash In / Cash Out'}</span>
                </span>
                <button type="button" onClick={() => setShowAddAdjustment(false)} className="text-slate-400 hover:text-white text-xs">
                  {isKu ? 'پەشیمانبوونەوە' : isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    {isKu ? 'جۆری جوڵە:' : isAr ? 'نوع الحركة:' : 'Movement Type:'}
                  </label>
                  <div className="flex rounded-xl bg-[#090F1B] p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setAdjType('deposit')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${adjType === 'deposit' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                    >
                      {isKu ? 'دانان (+)' : isAr ? 'إيداع (+)' : 'Deposit (+)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjType('withdrawal')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${adjType === 'withdrawal' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
                    >
                      {isKu ? 'ڕاکێشان (-)' : isAr ? 'سحب (-)' : 'Withdraw (-)'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    {isKu ? 'بڕی پارە:' : isAr ? 'المبلغ:' : 'Amount:'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#090F1B] text-xs font-mono font-bold text-white px-3 py-2 rounded-xl border border-slate-700 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                    {isKu ? 'هۆکار / وردەکاری:' : isAr ? 'السبب / التفاصيل:' : 'Reason / Note:'}
                  </label>
                  <input
                    type="text"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder={isKu ? 'بۆ نموونە: خەرجی ڕۆژانە، پڕکردنەوەی خەزێنە...' : isAr ? 'مثال: مصاريف نثريات، تغذية صندوق...' : 'e.g. Petty cash, bank deposit...'}
                    className="w-full bg-[#090F1B] text-xs text-white px-3 py-2 rounded-xl border border-slate-700 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md"
                >
                  {isKu ? 'پاشەکەوتکردنی جوڵە لە خەزێنەدا' : isAr ? 'حفظ الحركة بالخزنة' : 'Save Movement'}
                </button>
              </div>
            </form>
          )}

          {/* Detailed Movements History Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span>{isKu ? 'تۆماری سەرجەم جوڵە نەقدییەکان لە سندوقدا (فرۆشتن + گەڕاندنەوە + دانان):' : isAr ? 'سجل كافة الحركات النقدية بالصندوق (مبيعات + مرتجعات + إيداعات):' : 'All Cash Movements Log:'}</span>
            </h3>

            <div className="rounded-2xl border border-slate-800 bg-[#0A101D] overflow-hidden">
              <div className="divide-y divide-slate-800/60">
                
                {/* Manual Adjustments */}
                {adjustments.map(adj => (
                  <div key={adj.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${adj.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {adj.type === 'deposit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{adj.reason}</span>
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${adj.type === 'deposit' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950 text-rose-300 border border-rose-500/30'}`}>
                            {adj.type === 'deposit' ? (isKu ? 'دانانی دەستی' : isAr ? 'إيداع يدوي' : 'Manual In') : (isKu ? 'ڕاکێشانی دەستی' : isAr ? 'سحب يدوي' : 'Manual Out')}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {adj.timestamp} • {adj.cashier}
                        </p>
                      </div>
                    </div>

                    <div className={`text-xs font-mono font-black ${adj.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {adj.type === 'deposit' ? '+' : '-'}{settings.currencySymbol}{formatNumber(adj.amount)}
                    </div>
                  </div>
                ))}

                {/* Cash Returns */}
                {salesHistory
                  .filter(s => s.returnedItems && s.returnedItems.length > 0)
                  .map(sale => {
                    const refundAmt = sale.returnedItems!.reduce((acc, r) => acc + r.total, 0);
                    return (
                      <div key={`ret-${sale.id}`} className="p-3.5 flex items-center justify-between gap-3 bg-rose-950/20 hover:bg-rose-950/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                            <RotateCcw className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-rose-200 flex items-center gap-2">
                              <span>{isKu ? `گەڕاندنەوەی کاڵای پسوڵەی (${sale.invoiceNumber})` : isAr ? `إرجاع مواد الوصل (${sale.invoiceNumber})` : `Return Receipt (${sale.invoiceNumber})`}</span>
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-950 text-rose-300 border border-rose-500/30">
                                {isKu ? 'بڕینی گەڕێنراوە' : isAr ? 'اقتطاع مرتجع' : 'Cash Refund'}
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {sale.timestamp} • {isKu ? 'کاشێر:' : isAr ? 'الكاشير:' : 'Cashier:'} {sale.cashierName}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs font-mono font-black text-rose-400">
                          -{settings.currencySymbol}{formatNumber(refundAmt)}
                        </div>
                      </div>
                    );
                  })}

                {/* Cash Sales */}
                {salesHistory
                  .filter(s => s.paymentMethod === 'cash' || !s.paymentMethod)
                  .slice(0, 8)
                  .map(sale => (
                    <div key={`sale-${sale.id}`} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{isKu ? `فرۆشتنی پسوڵەی (${sale.invoiceNumber})` : isAr ? `بيع فاتورة (${sale.invoiceNumber})` : `Sale Receipt (${sale.invoiceNumber})`}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-950 text-blue-300 border border-blue-500/30">
                              {isKu ? 'فرۆشتنی نەقد' : isAr ? 'مبيعات كاش' : 'Cash Sale'}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {sale.timestamp} • {sale.customerName || (isKu ? 'کڕیاری گشتی' : isAr ? 'زبون عام' : 'Guest')}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs font-mono font-black text-blue-400">
                        +{settings.currencySymbol}{formatNumber(sale.total)}
                      </div>
                    </div>
                  ))}

              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0F1929] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>{isKu ? 'سیستەمی پاراستن و بەڕێوەبردنی ئەلیکترۆنی خەزێنەی نەقد' : isAr ? 'منظومة حماية وإدارة الخزنة النقدية الكترونياً' : 'Live Safe & Cash Management System'}</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenShiftReport && (
              <button
                onClick={onOpenShiftReport}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-bold cursor-pointer transition-all shadow-md flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>{isKu ? 'چاپکردنی ڕاپۆرتی نۆبەت' : isAr ? 'طباعة ملخص الوردية' : 'Print Shift Report'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition-all border border-slate-700"
            >
              {isKu ? 'داخستنی خەزێنە' : isAr ? 'إغلاق الواجهة' : 'Close Safe'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
