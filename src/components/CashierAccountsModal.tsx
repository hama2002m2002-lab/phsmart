import React, { useState, useMemo } from 'react';
import { X, UserCheck, Printer, FileText, Search, ShieldCheck, CheckCircle2, TrendingUp, DollarSign, Wallet, Users } from 'lucide-react';
import { UserAccount, StoreSettings, SaleTransaction } from '../types';

export interface CashierAccountMetric {
  cashierName: string;
  cashSales: number;
  cardSales: number;
  refunds: number;
  discounts: number;
  grossSales: number;
  netSales: number;
  invoiceCount: number;
  avgInvoice: number;
  transactions: SaleTransaction[];
}

interface CashierAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAccounts: UserAccount[];
  salesHistory: SaleTransaction[];
  settings: StoreSettings;
  onPrintAccountStatement?: (accountData: CashierAccountMetric) => void;
}

export const CashierAccountsModal: React.FC<CashierAccountsModalProps> = ({
  isOpen,
  onClose,
  userAccounts,
  salesHistory,
  settings,
  onPrintAccountStatement,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const currency = settings.currencySymbol || (isAr ? 'د.ع' : 'IQD');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'nosales'>('all');
  const [expandedCashier, setExpandedCashier] = useState<string | null>(null);

  // Compute cashier metrics ONLY for created accounts & actual cashiers from salesHistory (NO fake accounts)
  const cashierAccountsData = useMemo(() => {
    const namesSet = new Set<string>();

    // 1. Collect names from userAccounts (ONLY real created user accounts)
    if (userAccounts && userAccounts.length > 0) {
      userAccounts.forEach(u => {
        const displayName = u.fullName || u.username || u.name;
        if (displayName && displayName.trim()) {
          namesSet.add(displayName.trim());
        }
      });
    }

    // 2. Collect names from sales history
    salesHistory.forEach(s => {
      if (s.cashierName && s.cashierName.trim()) {
        namesSet.add(s.cashierName.trim());
      }
    });

    return Array.from(namesSet).map(name => {
      const cashierTx = salesHistory.filter(s => {
        if (!s.cashierName) return false;
        const sName = s.cashierName.trim().toLowerCase();
        const targetName = name.trim().toLowerCase();
        return sName === targetName || sName.includes(targetName) || targetName.includes(sName);
      });

      let cashSales = 0;
      let cardSales = 0;
      let refunds = 0;
      let discounts = 0;
      let grossSales = 0;

      cashierTx.forEach(s => {
        const isRefunded = s.status === 'refunded';
        const tot = s.total || 0;
        const sub = s.subtotal || tot;
        const disc = s.discount || 0;

        if (isRefunded) {
          refunds += tot;
        } else {
          grossSales += sub;
          discounts += disc;

          if (s.paymentMethod === 'cash') {
            cashSales += tot;
          } else {
            cardSales += tot;
          }
        }
      });

      const netSales = grossSales - discounts - refunds;
      const invoiceCount = cashierTx.length;

      return {
        cashierName: name,
        cashSales,
        cardSales,
        refunds,
        discounts,
        grossSales,
        netSales,
        invoiceCount,
        avgInvoice: invoiceCount > 0 ? Math.round(netSales / invoiceCount) : 0,
        transactions: cashierTx
      };
    });
  }, [salesHistory, userAccounts]);

  const filteredAccounts = useMemo(() => {
    return cashierAccountsData.filter(acc => {
      const matchesSearch = acc.cashierName.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterType === 'active') return acc.invoiceCount > 0;
      if (filterType === 'nosales') return acc.invoiceCount === 0;
      return true;
    });
  }, [cashierAccountsData, searchQuery, filterType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-[#0B1120] border-2 border-indigo-500/40 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.25)] flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-indigo-500/20 bg-gradient-to-r from-[#0F172A] via-[#10192D] to-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 text-slate-950 shadow-lg">
              <UserCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
                <span>{isAr ? 'كشف حسابات المستخدمين والكاشير' : isKu ? 'کەشفی ئەژمارەکانی کاشێر' : 'Users & Cashiers Statement'}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-bold">
                  {cashierAccountsData.length} {isAr ? 'حسابات مسجلة' : 'Accounts'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {isAr ? 'يعرض فقط الحسابات التي تم إنشاؤها مسبقاً وسجل مبيعاتها الحقيقي' : 'Displays created accounts and their actual sales metrics'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 sm:p-4 bg-[#0F172A]/80 border-b border-indigo-500/10 flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-indigo-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث باسم الحساب...' : 'Search account name...'}
              className="w-full bg-[#070C18] text-xs text-slate-200 placeholder-slate-500 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl border border-indigo-500/30 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all font-medium"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {isAr ? 'الكل' : 'All'} ({cashierAccountsData.length})
            </button>
            <button
              onClick={() => setFilterType('active')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                filterType === 'active'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {isAr ? 'نشط (له مبيعات)' : 'Active'} ({cashierAccountsData.filter(a => a.invoiceCount > 0).length})
            </button>
            <button
              onClick={() => setFilterType('nosales')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                filterType === 'nosales'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {isAr ? 'بدون مبيعات' : 'No Sales'} ({cashierAccountsData.filter(a => a.invoiceCount === 0).length})
            </button>
          </div>
        </div>

        {/* Modal Body: Compact Grid of Accounts */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[68vh] custom-scrollbar">
          {filteredAccounts.length === 0 ? (
            <div className="p-10 text-center space-y-3 bg-[#070C18] rounded-2xl border border-slate-800">
              <Users className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
              <p className="text-sm text-slate-400 font-bold">
                {isAr ? 'لا توجد حسابات مطابقة للبحث' : 'No matching accounts found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAccounts.map((c) => {
                const isExpanded = expandedCashier === c.cashierName;

                return (
                  <div
                    key={c.cashierName}
                    className="p-3 rounded-2xl bg-[#070C18] border border-indigo-500/30 hover:border-indigo-400/60 transition-all space-y-2.5 shadow-lg relative overflow-hidden group"
                  >
                    {/* Compact Card Header */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-slate-950 font-black shadow-sm">
                          <UserCheck className="w-4 h-4 text-slate-950" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black text-white tracking-wide truncate max-w-[150px]">
                            {isAr ? `حساب ${c.cashierName}` : `Account: ${c.cashierName}`}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {c.invoiceCount} {isAr ? 'فواتير صادر' : 'invoices'}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold ${
                        c.invoiceCount > 0
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                      }`}>
                        {c.invoiceCount > 0 ? (isAr ? 'نشط' : 'Active') : (isAr ? 'بدون مبيعات' : 'No Sales')}
                      </span>
                    </div>

                    {/* 4 CORE MINI STATS (2x2 Compact Grid) */}
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                      {/* 1. بيع نقد */}
                      <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                        <span className="text-emerald-400 font-sans font-bold">{isAr ? 'بيع نقد' : 'Cash'}</span>
                        <span className="font-bold text-emerald-300">{currency} {c.cashSales.toLocaleString('en-US')}</span>
                      </div>

                      {/* 2. مرجوع */}
                      <div className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-center justify-between">
                        <span className="text-rose-400 font-sans font-bold">{isAr ? 'مرجوع' : 'Refund'}</span>
                        <span className="font-bold text-rose-300">{currency} {c.refunds.toLocaleString('en-US')}</span>
                      </div>

                      {/* 3. صافي المبيعات */}
                      <div className="p-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-between col-span-2 bg-gradient-to-r from-cyan-950/40 to-indigo-950/40">
                        <span className="text-cyan-300 font-sans font-bold">{isAr ? 'صافي المبيعات' : 'Net Sales'}</span>
                        <span className="font-extrabold text-cyan-200 text-xs">{currency} {c.netSales.toLocaleString('en-US')}</span>
                      </div>

                      {/* 4. مجموع كل المبيعات */}
                      <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-center justify-between col-span-2">
                        <span className="text-amber-400 font-sans font-bold">{isAr ? 'مجموع كل المبيعات' : 'Gross'}</span>
                        <span className="font-bold text-amber-300">{currency} {c.grossSales.toLocaleString('en-US')}</span>
                      </div>
                    </div>

                    {/* Additional Details row */}
                    <div className="pt-1 text-[10px] space-y-0.5 border-t border-slate-800/80 text-slate-400 font-mono">
                      <div className="flex justify-between">
                        <span>{isAr ? 'الخصومات / البطاقة:' : 'Discounts/Card:'}</span>
                        <span className="text-slate-200 font-bold">{currency} {c.discounts.toLocaleString('en-US')} / {currency} {c.cardSales.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isAr ? 'متوسط الفاتورة:' : 'Avg Ticket:'}</span>
                        <span className="text-cyan-300 font-bold">{currency} {c.avgInvoice.toLocaleString('en-US')}</span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center gap-1.5 pt-1.5">
                      <button
                        onClick={() => onPrintAccountStatement && onPrintAccountStatement(c)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:brightness-110 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <Printer className="w-3 h-3" />
                        <span>{isAr ? 'طباعة الكشف' : 'Print Statement'}</span>
                      </button>

                      <button
                        onClick={() => setExpandedCashier(isExpanded ? null : c.cashierName)}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-700"
                      >
                        <FileText className="w-3 h-3 text-cyan-400" />
                        <span>{isExpanded ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'الفواتير' : 'Invoices')}</span>
                      </button>
                    </div>

                    {/* Detailed Transactions List Accordion */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-800 space-y-1.5 animate-fadeIn">
                        <p className="text-[10px] font-bold text-slate-300">
                          {isAr ? `سجل فواتير ${c.cashierName}:` : `Invoices log for ${c.cashierName}:`}
                        </p>
                        {c.transactions.length === 0 ? (
                          <p className="text-[10px] text-slate-500 py-1.5 text-center">{isAr ? 'لا توجد فواتير صادرة لهذا الحساب' : 'No invoices issued'}</p>
                        ) : (
                          <div className="max-h-36 overflow-y-auto space-y-1 text-[10px] custom-scrollbar">
                            {c.transactions.map((tx) => (
                              <div key={tx.id} className="p-1.5 rounded-lg bg-[#040810] border border-slate-800 flex items-center justify-between">
                                <div>
                                  <span className="font-mono font-bold text-cyan-300">#{tx.invoiceNumber}</span>
                                  <span className="text-[9px] text-slate-500 block font-mono">
                                    {new Date(tx.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="text-right rtl:text-left font-mono">
                                  <span className={`font-bold ${tx.status === 'refunded' ? 'text-rose-400 line-through' : 'text-emerald-400'}`}>
                                    {currency} {tx.total.toLocaleString('en-US')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-indigo-500/20 bg-[#0A0F1D] flex items-center justify-between">
          <p className="text-xs text-slate-400 font-mono">
            {isAr ? 'إجمالي المبيعات لجميع الحسابات:' : 'Total Sales across all accounts:'}{' '}
            <strong className="text-cyan-300 font-bold">
              {currency} {cashierAccountsData.reduce((acc, c) => acc + c.netSales, 0).toLocaleString('en-US')}
            </strong>
          </p>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
