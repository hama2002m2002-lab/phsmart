import React, { useState, useMemo } from 'react';
import { 
  X, UserCheck, Printer, FileText, Search, ShieldCheck, CheckCircle2, 
  TrendingUp, DollarSign, Wallet, Users, RotateCcw, Eye, ShoppingBag, 
  PackageX, Calendar, Filter, ArrowUpRight, ArrowDownRight, Tag, 
  Trash2, AlertCircle, ShoppingCart, ArrowRight, Layers, Receipt, 
  ChevronRight, ArrowLeft, Download, CreditCard, Banknote, Clock, Sparkles
} from 'lucide-react';
import { UserAccount, StoreSettings, SaleTransaction, CartItem } from '../types';

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
  onViewReceipt?: (sale: SaleTransaction) => void;
  onOpenReturnForSale?: (sale: SaleTransaction) => void;
  onOpenSalesReturnModal?: () => void;
  onOpenCompletedReceiptsModal?: () => void;
}

type DetailModalViewType = 'sales' | 'refunds' | 'gross' | 'net' | 'sold_items' | 'returned_items' | 'statement';

export const CashierAccountsModal: React.FC<CashierAccountsModalProps> = ({
  isOpen,
  onClose,
  userAccounts,
  salesHistory,
  settings,
  onPrintAccountStatement,
  onViewReceipt,
  onOpenReturnForSale,
  onOpenSalesReturnModal,
  onOpenCompletedReceiptsModal,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const t = (ar: string, ku: string, en: string = ar) => isKu ? ku : isAr ? ar : en;
  const currency = settings.currencySymbol || (isAr ? 'د.ع' : isKu ? 'د.ع' : 'IQD');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'nosales'>('all');
  
  // Dedicated Sub-Interface Modal State for deep drilldown
  const [activeDetailModal, setActiveDetailModal] = useState<{
    cashierName: string;
    viewType: DetailModalViewType;
  } | null>(null);

  // Search inside detail sub-modal
  const [modalSearch, setModalSearch] = useState('');
  const [modalPaymentFilter, setModalPaymentFilter] = useState<'all' | 'cash' | 'card' | 'debt'>('all');

  // Compute cashier metrics
  const cashierAccountsData = useMemo(() => {
    const namesSet = new Set<string>();

    if (userAccounts && userAccounts.length > 0) {
      userAccounts.forEach(u => {
        const displayName = u.fullName || u.username || u.name;
        if (displayName && displayName.trim()) {
          namesSet.add(displayName.trim());
        }
      });
    }

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

  // Selected cashier for the open sub-interface modal
  const selectedCashierMetric = useMemo(() => {
    if (!activeDetailModal) return null;
    return cashierAccountsData.find(c => c.cashierName === activeDetailModal.cashierName) || null;
  }, [activeDetailModal, cashierAccountsData]);

  if (!isOpen) return null;

  const openSubInterface = (cashierName: string, viewType: DetailModalViewType) => {
    setModalSearch('');
    setModalPaymentFilter('all');
    setActiveDetailModal({ cashierName, viewType });
  };

  const handlePrintCashierStatement = (c: CashierAccountMetric) => {
    if (onPrintAccountStatement) {
      onPrintAccountStatement(c);
      return;
    }
    const win = window.open('', '_blank');
    if (!win) return;

    const title = isKu 
      ? `کەشفی ئەژماری کاشێر: ${c.cashierName}` 
      : isAr 
      ? `كشف حساب ومبيعات الكاشير: ${c.cashierName}` 
      : `Account Statement: ${c.cashierName}`;

    win.document.write(`
      <!DOCTYPE html>
      <html dir="${isAr || isKu ? 'rtl' : 'ltr'}">
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; padding: 25px; color: #111; direction: ${isAr || isKu ? 'rtl' : 'ltr'}; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; margin: 0 0 5px 0; }
          .sub { font-size: 14px; color: #444; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
          .box { border: 1px solid #ccc; padding: 10px; border-radius: 8px; }
          .label { font-size: 12px; color: #666; font-weight: bold; }
          .val { font-size: 16px; font-weight: bold; margin-top: 4px; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: ${isAr || isKu ? 'right' : 'left'}; font-size: 12px; }
          th { background: #f4f4f4; font-weight: bold; }
          .text-center { text-align: center; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #888; border-top: 1px dashed #ccc; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${settings.storeName || (isKu ? 'مارکێت' : 'المتجر')}</div>
          <div class="sub">${title}</div>
          <div style="font-size: 11px; color: #666; margin-top: 4px;">${new Date().toLocaleString(isKu ? 'ku' : isAr ? 'ar-IQ' : 'en-US')}</div>
        </div>

        <div class="grid">
          <div class="box">
            <div class="label">${isKu ? 'کۆی گشتی فرۆش (Gross)' : isAr ? 'إجمالي المبيعات الكلي' : 'Gross Sales'}:</div>
            <div class="val">${currency} ${c.grossSales.toLocaleString('en-US')}</div>
          </div>
          <div class="box">
            <div class="label">${isKu ? 'فرۆشتنی نەقد (کاش)' : isAr ? 'المبيعات النقدية' : 'Cash Sales'}:</div>
            <div class="val">${currency} ${c.cashSales.toLocaleString('en-US')}</div>
          </div>
          <div class="box">
            <div class="label">${isKu ? 'کۆی گەڕاوەکان (مرجوعات)' : isAr ? 'إجمالي المرتجعات' : 'Refunds & Returns'}:</div>
            <div class="val" style="color: #dc2626;">-${currency} ${c.refunds.toLocaleString('en-US')}</div>
          </div>
          <div class="box" style="background: #f0fdf4;">
            <div class="label">${isKu ? 'صافی فرۆشتن (Net Sales)' : isAr ? 'صافي المبيعات' : 'Net Sales'}:</div>
            <div class="val" style="color: #16a34a;">${currency} ${c.netSales.toLocaleString('en-US')}</div>
          </div>
        </div>

        <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">
          ${isKu ? 'سجلی وەسڵ و پسوولەکان' : isAr ? 'سجل الفواتير الصادرة' : 'Transactions Ledger'} (${c.transactions.length})
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${isKu ? 'ژمارەی وەسڵ' : isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
              <th>${isKu ? 'کات و بەروار' : isAr ? 'التاريخ والوقت' : 'Date & Time'}</th>
              <th>${isKu ? 'جۆری پارەدان' : isAr ? 'طريقة الدفع' : 'Payment'}</th>
              <th>${isKu ? 'دۆخ' : isAr ? 'الحالة' : 'Status'}</th>
              <th>${isKu ? 'بڕی پارە' : isAr ? 'المبلغ' : 'Amount'}</th>
            </tr>
          </thead>
          <tbody>
            ${c.transactions.map((tx, i) => `
              <tr>
                <td>${i + 1}</td>
                <td style="font-family: monospace; font-weight: bold;">${tx.invoiceNumber}</td>
                <td>${new Date(tx.timestamp).toLocaleString(isKu ? 'ku' : isAr ? 'ar-IQ' : 'en-US')}</td>
                <td>${tx.paymentMethod === 'cash' ? (isKu ? 'نەقد' : isAr ? 'نقد' : 'Cash') : tx.paymentMethod}</td>
                <td>${tx.status === 'refunded' ? (isKu ? 'گەڕاوە 🔴' : isAr ? 'مرتجع 🔴' : 'Refunded') : (isKu ? 'فرۆشراو 🟢' : isAr ? 'مكتمل 🟢' : 'Completed')}</td>
                <td style="font-family: monospace; font-weight: bold;">${currency} ${tx.total.toLocaleString('en-US')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          ${isKu ? 'سیستەمی ژمێریاری و فرۆشتن' : isAr ? 'نظام إدارة ومبيعات نقاط البيع' : 'POS Sales & Inventory Management System'}
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn" dir={isAr || isKu ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-6xl bg-[#0B1120] border-2 border-indigo-500/40 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.25)] flex flex-col max-h-[95vh] overflow-hidden text-slate-100">
        
        {/* Main Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-indigo-500/20 bg-gradient-to-r from-[#0F172A] via-[#10192D] to-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 text-slate-950 shadow-lg shrink-0">
              <UserCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-white tracking-wide flex items-center gap-2 flex-wrap">
                <span>{isKu ? 'کەشفی ئەژمار و مبیعاتی کاشێرەکان' : isAr ? 'كشف حسابات ومبيعات المستخدمين والكاشير' : 'Users & Cashiers Statement'}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-bold">
                  {cashierAccountsData.length} {isKu ? 'ئەژمار' : isAr ? 'حسابات' : 'Accounts'}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
                {isKu 
                  ? 'کلیک لەسەر هەر دوگمەیەک (فرۆشتن، مرجوعات، صافی، کاڵاکان) بکە بۆ کردنەوەی پەنجەرەی تایبەت و بینینی هەموو وردەکارییەکان'
                  : isAr 
                  ? 'اضغط على أي زر (مبيعات، مرجوعات، صافي، المواد) لفتح واجهة تفصيلية مخصصة وعرض كامل الوصلات' 
                  : 'Click any button (Sales, Returns, Net, Items) to open a dedicated sub-interface with complete details'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-all cursor-pointer shrink-0"
            title={isKu ? 'داخستن' : isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 sm:p-4 bg-[#0F172A]/90 border-b border-indigo-500/10 flex flex-wrap items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-indigo-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKu ? 'گەڕان بە ناوی ئەژمار یان کاشێر...' : isAr ? 'ابحث باسم الحساب أو الكاشير...' : 'Search cashier account name...'}
              className="w-full bg-[#070C18] text-xs text-slate-200 placeholder-slate-500 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl border border-indigo-500/30 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all font-medium"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs font-bold flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {isKu ? 'هەموو' : isAr ? 'الكل' : 'All'} ({cashierAccountsData.length})
            </button>
            <button
              onClick={() => setFilterType('active')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                filterType === 'active'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {isKu ? 'چالاک (فرۆشی هەیە)' : isAr ? 'نشط (له مبيعات)' : 'Active'} ({cashierAccountsData.filter(a => a.invoiceCount > 0).length})
            </button>
            <button
              onClick={() => setFilterType('nosales')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                filterType === 'nosales'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {isKu ? 'بێ فرۆش' : isAr ? 'بدون مبيعات' : 'No Sales'} ({cashierAccountsData.filter(a => a.invoiceCount === 0).length})
            </button>
          </div>
        </div>

        {/* Modal Body: Accounts Cards Grid */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 max-h-[72vh] custom-scrollbar">
          {filteredAccounts.length === 0 ? (
            <div className="p-10 text-center space-y-3 bg-[#070C18] rounded-2xl border border-slate-800">
              <Users className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
              <p className="text-sm text-slate-400 font-bold">
                {isKu ? 'هیچ ئەژمارێک بەم ناوە نەدۆزرایەوە' : isAr ? 'لا توجد حسابات مطابقة للبحث' : 'No matching accounts found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.map((c) => {
                const salesTxCount = c.transactions.filter(t => t.status !== 'refunded').length;
                const refundTxCount = c.transactions.filter(t => t.status === 'refunded').length;

                return (
                  <div
                    key={c.cashierName}
                    className="p-4 rounded-2xl bg-[#070C18] border border-indigo-500/30 hover:border-indigo-400/60 transition-all space-y-3 shadow-lg relative overflow-hidden group flex flex-col justify-between"
                  >
                    {/* Compact Card Header */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-slate-950 font-black flex items-center justify-center shadow-sm shrink-0">
                          <UserCheck className="w-5 h-5 text-slate-950" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs sm:text-sm font-black text-white tracking-wide truncate max-w-[140px] sm:max-w-[170px]">
                            {isKu ? `ئەژماری: ${c.cashierName}` : isAr ? `حساب: ${c.cashierName}` : `Account: ${c.cashierName}`}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {c.invoiceCount} {isKu ? 'وەسڵ دەرکراوە' : isAr ? 'فواتير صادرة' : 'invoices issued'}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold shrink-0 ${
                        c.invoiceCount > 0
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                      }`}>
                        {c.invoiceCount > 0 ? (isKu ? 'چالاک' : isAr ? 'نشط' : 'Active') : (isKu ? 'بێ فرۆش' : isAr ? 'بدون مبيعات' : 'No Sales')}
                      </span>
                    </div>

                    {/* INTERACTIVE CLICKABLE METRIC BUTTONS THAT OPEN SUB-INTERFACES */}
                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                      
                      {/* 1. بيع نقد / Cash Sales -> Opens Sales Sub-Interface */}
                      <button
                        type="button"
                        onClick={() => openSubInterface(c.cashierName, 'sales')}
                        className="p-2.5 rounded-xl border bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/40 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-95 text-right rtl:text-right ltr:text-left shadow-sm group/btn"
                        title={isKu ? 'کلیک بکە بۆ کردنەوەی واجیهەی فرۆشتنەکانی نەقد' : isAr ? 'اضغط لفتح واجهة كافة المبيعات النقدية وتفاصيلها' : 'Click to open cash sales interface'}
                      >
                        <div className="flex items-center justify-between w-full text-emerald-400 font-sans font-bold text-[10px]">
                          <span className="flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isKu ? 'فرۆشتنی نەقد' : isAr ? 'بيع نقد' : 'Cash Sales'}</span>
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-500/30">
                            {salesTxCount}
                          </span>
                        </div>
                        <span className="font-black text-emerald-300 text-xs mt-1 block">
                          {currency} {c.cashSales.toLocaleString('en-US')}
                        </span>
                        <span className="text-[9px] text-emerald-400/70 font-sans group-hover/btn:text-emerald-200 mt-0.5 flex items-center gap-0.5">
                          <span>{isKu ? 'کردنەوەی واجیهە' : isAr ? 'فتح الواجهة ↗' : 'Open View ↗'}</span>
                        </span>
                      </button>

                      {/* 2. مرجوعات / Refunds -> Opens Returns Sub-Interface */}
                      <button
                        type="button"
                        onClick={() => openSubInterface(c.cashierName, 'refunds')}
                        className="p-2.5 rounded-xl border bg-rose-950/40 hover:bg-rose-900/60 border-rose-500/40 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-95 text-right rtl:text-right ltr:text-left shadow-sm group/btn"
                        title={isKu ? 'کلیک بکە بۆ کردنەوەی واجیهەی مرجوعات و گەڕاوەکان' : isAr ? 'اضغط لفتح واجهة المرجوعات والمسترجعات وتفاصيلها' : 'Click to open refunds & returns interface'}
                      >
                        <div className="flex items-center justify-between w-full text-rose-400 font-sans font-bold text-[10px]">
                          <span className="flex items-center gap-1">
                            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                            <span>{isKu ? 'مرجوعات / گەڕاوە' : isAr ? 'مرجوعات' : 'Refunds'}</span>
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-300 border border-rose-500/30">
                            {refundTxCount}
                          </span>
                        </div>
                        <span className="font-black text-rose-300 text-xs mt-1 block">
                          -{currency} {c.refunds.toLocaleString('en-US')}
                        </span>
                        <span className="text-[9px] text-rose-400/70 font-sans group-hover/btn:text-rose-200 mt-0.5 flex items-center gap-0.5">
                          <span>{isKu ? 'کردنەوەی واجیهە' : isAr ? 'فتح الواجهة ↗' : 'Open View ↗'}</span>
                        </span>
                      </button>

                      {/* 3. صافي المبيعات / Net Sales -> Opens Net Financial Breakdown */}
                      <button
                        type="button"
                        onClick={() => openSubInterface(c.cashierName, 'net')}
                        className="p-2.5 rounded-xl border bg-gradient-to-r from-cyan-950/70 via-indigo-950/60 to-cyan-950/70 border-cyan-500/40 hover:border-cyan-400 flex items-center justify-between col-span-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 text-right rtl:text-right ltr:text-left shadow-md group/btn"
                        title={isKu ? 'کلیک بکە بۆ کردنەوەی واجیهەی صافی فرۆش' : isAr ? 'اضغط لفتح واجهة كشف صافي المبيعات والأرباح' : 'Click to open net revenue analysis'}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 text-cyan-300 font-sans font-bold text-xs">
                            <TrendingUp className="w-4 h-4 text-cyan-400" />
                            <span>{isKu ? 'صافی فرۆشتن (Net Sales)' : isAr ? 'صافي المبيعات الفعلي' : 'Net Realized Sales'}</span>
                          </div>
                          <p className="text-[9px] text-cyan-400/70 font-sans mt-0.5">
                            {isKu ? 'فرۆشی گشتی - داشکاندن - گەڕاوەکان' : isAr ? 'المجموع - الخصم - المرتجع' : 'Gross - Discounts - Refunds'}
                          </p>
                        </div>
                        <div className="text-right rtl:text-left">
                          <span className="font-black text-cyan-200 text-sm block">
                            {currency} {c.netSales.toLocaleString('en-US')}
                          </span>
                          <span className="text-[9px] text-cyan-400 font-sans group-hover/btn:text-white flex items-center justify-end gap-0.5 mt-0.5">
                            <span>{isKu ? 'پیشاندان' : isAr ? 'معاينة' : 'View'} ↗</span>
                          </span>
                        </div>
                      </button>

                      {/* 4. مجموع كل المبيعات / Gross Sales -> Opens Gross Details */}
                      <button
                        type="button"
                        onClick={() => openSubInterface(c.cashierName, 'gross')}
                        className="p-2 rounded-xl border bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/30 flex items-center justify-between col-span-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 text-right rtl:text-right ltr:text-left shadow-sm group/btn"
                        title={isKu ? 'کۆی گشتی هەموو فرۆشراوەکان' : isAr ? 'اضغط لعرض إجمالي كل الفواتير والمبيعات' : 'Click to open gross sales breakdown'}
                      >
                        <span className="text-amber-400 font-sans font-bold text-[11px] flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isKu ? 'کۆی گشتی فرۆش (Gross)' : isAr ? 'مجموع كل المبيعات' : 'Gross Total'}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-300 text-xs">{currency} {c.grossSales.toLocaleString('en-US')}</span>
                          <span className="text-[9px] text-amber-400/80 font-sans">↗</span>
                        </div>
                      </button>
                    </div>

                    {/* Quick Metrics Strip: Discounts, Card, Avg ticket */}
                    <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono space-y-1 bg-[#050914] p-2 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="font-sans">{isKu ? 'داشکاندن / کارتی بانک:' : isAr ? 'الخصومات / البطاقة:' : 'Discounts / Card:'}</span>
                        <span className="text-slate-200 font-bold">
                          {currency} {c.discounts.toLocaleString('en-US')} / {currency} {c.cardSales.toLocaleString('en-US')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-sans">{isKu ? 'تێکڕای وەسڵ:' : isAr ? 'متوسط الفاتورة:' : 'Avg Ticket:'}</span>
                        <span className="text-cyan-300 font-bold">{currency} {c.avgInvoice.toLocaleString('en-US')}</span>
                      </div>
                    </div>

                    {/* Secondary Navigation Buttons: Sold Items, Returned Items, Full Statement */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {/* Sold Items Button */}
                      <button
                        type="button"
                        onClick={() => openSubInterface(c.cashierName, 'sold_items')}
                        className="py-1.5 px-2 rounded-xl bg-purple-950/50 hover:bg-purple-900/70 text-purple-300 hover:text-white border border-purple-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                        title={isKu ? 'بینینی هەموو ئەو کاڵایانەی ئەم کاشێرە فرۆشتوویەتی' : isAr ? 'عرض قائمة المواد والأصناف المباعة بالتفصيل' : 'View Sold Products'}
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-purple-400" />
                        <span>{isKu ? 'کاڵا فرۆشراوەکان' : isAr ? 'المواد المباعة 🛒' : 'Sold Items'}</span>
                      </button>

                      {/* Returned Items Button */}
                      <button
                        type="button"
                        onClick={() => openSubInterface(c.cashierName, 'returned_items')}
                        className="py-1.5 px-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 hover:text-white border border-rose-500/40 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                        title={isKu ? 'بینینی هەموو ئەو کاڵایانەی گەڕێنراونەتەوە' : isAr ? 'عرض قائمة المواد المرجعة بالتفصيل' : 'View Returned Items'}
                      >
                        <PackageX className="w-3.5 h-3.5 text-rose-400" />
                        <span>{isKu ? 'کاڵا گەڕاوەکان' : isAr ? 'المواد المرجعة 🔄' : 'Returned Items'}</span>
                      </button>
                    </div>

                    {/* Primary Action Button */}
                    <div className="pt-1">
                      {/* Print Account Statement */}
                      <button
                        type="button"
                        onClick={() => handlePrintCashierStatement(c)}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md"
                        title={t('طباعة كشف حساب الكاشير', 'چاپکردنی کەشفی ئەژمار', 'Print Statement')}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{t('طباعة كشف الحساب والمبيعات', 'چاپی کەشفی ئەژمار و فرۆش', 'Print Account Statement')}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-indigo-500/20 bg-[#0A0F1D] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-300 font-mono flex items-center gap-2">
            <span>{isKu ? 'کۆی فرۆشی هەموو ئەژمارەکان:' : isAr ? 'إجمالي صافي المبيعات لجميع الحسابات:' : 'Total Net Sales across all accounts:'}</span>
            <strong className="text-cyan-300 font-black text-sm">
              {currency} {cashierAccountsData.reduce((acc, c) => acc + c.netSales, 0).toLocaleString('en-US')}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCompletedReceiptsModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCompletedReceiptsModal();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{isKu ? 'هەموو وەسڵەکان' : isAr ? 'واجهة الفواتير المكتملة' : 'All Receipts'}</span>
              </button>
            )}

            {onOpenSalesReturnModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSalesReturnModal();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isKu ? 'سیستەمی مرجوعات' : isAr ? 'واجهة استرجاع المبيعات' : 'Sales Returns'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            >
              {isKu ? 'داخستن' : isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DEDICATED SUB-INTERFACE MODAL (FOR SALES, RETURNS, ITEMS, & STATEMENTS)    */}
      {/* ========================================================================= */}
      {activeDetailModal && selectedCashierMetric && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn" dir={isAr || isKu ? 'rtl' : 'ltr'}>
          <div className="relative w-full max-w-5xl bg-[#090E1A] border-2 border-cyan-500/50 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.35)] flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-scaleUp">
            
            {/* Sub-modal Header */}
            <div className="p-4 sm:p-5 border-b border-cyan-500/30 bg-gradient-to-r from-[#0C1527] via-[#101E38] to-[#0C1527] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black shadow-lg shrink-0">
                  <Receipt className="w-6 h-6 text-slate-950" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-white truncate">
                      {isKu 
                        ? `وردەکاری ئەژماری: ${selectedCashierMetric.cashierName}` 
                        : isAr 
                        ? `تفاصيل حساب ومبيعات: ${selectedCashierMetric.cashierName}` 
                        : `Account Ledger: ${selectedCashierMetric.cashierName}`}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold">
                      {selectedCashierMetric.invoiceCount} {isKu ? 'وەسڵ' : isAr ? 'فواتير' : 'Invoices'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    {isKu ? 'کۆی صافی فرۆش:' : isAr ? 'صافي المبيعات المحققة:' : 'Realized Net Sales:'}{' '}
                    <strong className="text-emerald-400 font-mono">{currency} {selectedCashierMetric.netSales.toLocaleString('en-US')}</strong>
                    {' • '}
                    {isKu ? 'کۆی مرجوعات:' : isAr ? 'إجمالي المرتجعات:' : 'Total Refunds:'}{' '}
                    <strong className="text-rose-400 font-mono">{currency} {selectedCashierMetric.refunds.toLocaleString('en-US')}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handlePrintCashierStatement(selectedCashierMetric)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isKu ? 'چاپکردن' : isAr ? 'طباعة' : 'Print'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailModal(null)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-modal Tab Switcher Bar */}
            <div className="p-2 sm:p-3 bg-[#060A14] border-b border-cyan-500/20 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* 1. Sales Tab */}
                <button
                  type="button"
                  onClick={() => setActiveDetailModal(prev => prev ? { ...prev, viewType: 'sales' } : null)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeDetailModal.viewType === 'sales' || activeDetailModal.viewType === 'gross' || activeDetailModal.viewType === 'net'
                      ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{isKu ? 'وەسڵەکانی فرۆشتن' : isAr ? 'فواتير المبيعات' : 'Sales Invoices'}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold">
                    {selectedCashierMetric.transactions.filter(t => t.status !== 'refunded').length}
                  </span>
                </button>

                {/* 2. Returns Tab */}
                <button
                  type="button"
                  onClick={() => setActiveDetailModal(prev => prev ? { ...prev, viewType: 'refunds' } : null)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeDetailModal.viewType === 'refunds'
                      ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border border-rose-400'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-300" />
                  <span>{isKu ? 'وەسڵە گەڕاوەکان (مرجوعات)' : isAr ? 'فواتير المرجوعات والراجع' : 'Refunds & Returns'}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-300 text-[10px] font-mono font-bold">
                    {selectedCashierMetric.transactions.filter(t => t.status === 'refunded').length}
                  </span>
                </button>

                {/* 3. Sold Products Catalog */}
                <button
                  type="button"
                  onClick={() => setActiveDetailModal(prev => prev ? { ...prev, viewType: 'sold_items' } : null)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeDetailModal.viewType === 'sold_items'
                      ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-purple-300" />
                  <span>{isKu ? 'کاڵا فرۆشراوەکان' : isAr ? 'المواد المباعة' : 'Sold Products'}</span>
                </button>

                {/* 4. Returned Products Catalog */}
                <button
                  type="button"
                  onClick={() => setActiveDetailModal(prev => prev ? { ...prev, viewType: 'returned_items' } : null)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeDetailModal.viewType === 'returned_items'
                      ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <PackageX className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isKu ? 'کاڵا گەڕاوەکان' : isAr ? 'المواد المرجعة' : 'Returned Products'}</span>
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative min-w-[180px] max-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 text-cyan-400" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder={isKu ? 'گەڕان بە وەسڵ، کاڵا...' : isAr ? 'بحث برقم الفاتورة أو المادة...' : 'Search invoice or product...'}
                  className="w-full bg-[#080E1D] text-[11px] text-slate-200 placeholder-slate-500 pl-8 rtl:pl-2 rtl:pr-8 pr-2 py-1.5 rounded-xl border border-cyan-500/30 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            {/* Sub-modal Dynamic Content View */}
            <div className="p-3 sm:p-5 overflow-y-auto flex-1 max-h-[64vh] custom-scrollbar space-y-3">
              
              {/* VIEW 1: SALES & INVOICES LIST */}
              {(activeDetailModal.viewType === 'sales' || activeDetailModal.viewType === 'gross' || activeDetailModal.viewType === 'net') && (() => {
                const searchTxt = modalSearch.toLowerCase().trim();
                let salesList = selectedCashierMetric.transactions.filter(t => t.status !== 'refunded');

                if (searchTxt) {
                  salesList = salesList.filter(t => {
                    const inv = (t.invoiceNumber || '').toLowerCase();
                    const cust = (t.customerName || '').toLowerCase();
                    const hasItem = Array.isArray(t.items) && t.items.some(i => 
                      (i.productName || '').toLowerCase().includes(searchTxt) || 
                      (i.productNameAr || '').includes(searchTxt) ||
                      (i.barcode || '').includes(searchTxt)
                    );
                    return inv.includes(searchTxt) || cust.includes(searchTxt) || hasItem;
                  });
                }

                if (salesList.length === 0) {
                  return (
                    <div className="p-12 text-center space-y-2 bg-[#050A14] rounded-2xl border border-slate-800">
                      <ShoppingCart className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-bold">
                        {isKu ? 'هیچ وەسڵێکی فرۆشتن بەم مەرجانە نەدۆزرایەوە' : isAr ? 'لا توجد فواتير مبيعات مطابقة لبحثك' : 'No sales invoices found for this search'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-400 px-1">
                      <span>{isKu ? `کۆی وەسڵەکانی فرۆشتن (${salesList.length}):` : isAr ? `قائمة فواتير المبيعات (${salesList.length}):` : `Sales Invoices (${salesList.length}):`}</span>
                      <span className="font-mono">{currency} {salesList.reduce((acc, t) => acc + (t.total || 0), 0).toLocaleString('en-US')}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {salesList.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3 rounded-2xl bg-[#060B18] border border-emerald-500/30 hover:border-emerald-400 transition-all space-y-2 shadow-md relative"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs text-cyan-300">
                                #{tx.invoiceNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {tx.paymentMethod === 'cash' ? (isKu ? 'نەقد' : isAr ? 'نقد' : 'Cash') : tx.paymentMethod}
                              </span>
                            </div>

                            <span className="font-mono font-black text-sm text-emerald-400">
                              {currency} {tx.total.toLocaleString('en-US')}
                            </span>
                          </div>

                          {/* Items Preview */}
                          <div className="text-[11px] text-slate-300 space-y-1 bg-[#040812] p-2 rounded-xl border border-slate-800/60 max-h-24 overflow-y-auto custom-scrollbar">
                            {Array.isArray(tx.items) && tx.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[10px]">
                                <span className="truncate max-w-[170px]">{item.productNameAr || item.productName}</span>
                                <span className="font-mono font-bold text-slate-400">
                                  {item.quantity} × {currency}{item.price}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                            <span>{new Date(tx.timestamp).toLocaleString(isKu ? 'ku' : isAr ? 'ar-IQ' : 'en-US')}</span>
                            
                            <div className="flex items-center gap-1.5">
                              {onViewReceipt && (
                                <button
                                  type="button"
                                  onClick={() => onViewReceipt(tx)}
                                  className="p-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-500 text-cyan-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-cyan-500/40"
                                  title={isKu ? 'بینینی وەسڵ' : isAr ? 'معاينة وطباعة الوصل' : 'View Receipt'}
                                >
                                  <Eye className="w-3 h-3 text-cyan-300" />
                                  <span>{isKu ? 'وەسڵ' : isAr ? 'معاينة' : 'Receipt'}</span>
                                </button>
                              )}

                              {onOpenReturnForSale && (
                                <button
                                  type="button"
                                  onClick={() => onOpenReturnForSale(tx)}
                                  className="p-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-500 text-rose-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-rose-500/40"
                                  title={isKu ? 'گەڕاندنەوەی ئەم وەسڵە' : isAr ? 'استرجاع من هذه الفاتورة' : 'Process Return'}
                                >
                                  <RotateCcw className="w-3 h-3 text-rose-300" />
                                  <span>{isKu ? 'گەڕاندنەوە' : isAr ? 'إرجاع' : 'Return'}</span>
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* VIEW 2: REFUNDS & RETURNS LIST */}
              {activeDetailModal.viewType === 'refunds' && (() => {
                const searchTxt = modalSearch.toLowerCase().trim();
                let refundsList = selectedCashierMetric.transactions.filter(t => t.status === 'refunded');

                if (searchTxt) {
                  refundsList = refundsList.filter(t => {
                    const inv = (t.invoiceNumber || '').toLowerCase();
                    const cust = (t.customerName || '').toLowerCase();
                    const hasItem = Array.isArray(t.items) && t.items.some(i => 
                      (i.productName || '').toLowerCase().includes(searchTxt) || 
                      (i.productNameAr || '').includes(searchTxt) ||
                      (i.barcode || '').includes(searchTxt)
                    );
                    return inv.includes(searchTxt) || cust.includes(searchTxt) || hasItem;
                  });
                }

                if (refundsList.length === 0) {
                  return (
                    <div className="p-12 text-center space-y-2 bg-[#050A14] rounded-2xl border border-slate-800">
                      <RotateCcw className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-bold">
                        {isKu ? 'هیچ وەسڵێکی مرجوعات و گەڕاوە بۆ ئەم کاشێرە نییە' : isAr ? 'لا توجد فواتير مرجوعات لهذا الكاشير' : 'No refund transactions found for this cashier'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-rose-400 px-1">
                      <span>{isKu ? `سجلی وەسڵە گەڕاوەکان (${refundsList.length}):` : isAr ? `سجل فواتير المرتجعات (${refundsList.length}):` : `Returned Invoices (${refundsList.length}):`}</span>
                      <span className="font-mono">-{currency} {selectedCashierMetric.refunds.toLocaleString('en-US')}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {refundsList.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/50 hover:border-rose-400 transition-all space-y-2 shadow-md relative"
                        >
                          <div className="flex items-center justify-between border-b border-rose-900/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs text-rose-300">
                                #{tx.invoiceNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white">
                                {isKu ? 'گەڕاوە 🔴' : isAr ? 'مرتجع / مرجوع 🔴' : 'Refunded'}
                              </span>
                            </div>

                            <span className="font-mono font-black text-sm text-rose-300 line-through">
                              {currency} {tx.total.toLocaleString('en-US')}
                            </span>
                          </div>

                          {/* Items Preview */}
                          <div className="text-[11px] text-rose-200 space-y-1 bg-[#090407] p-2 rounded-xl border border-rose-800/40 max-h-24 overflow-y-auto custom-scrollbar">
                            {Array.isArray(tx.items) && tx.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[10px]">
                                <span className="truncate max-w-[170px]">{item.productNameAr || item.productName}</span>
                                <span className="font-mono font-bold text-rose-300">
                                  {item.quantity} {isKu ? 'دانە گەڕاوە' : isAr ? 'قطعة راجعة' : 'ret'}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[10px] text-rose-300/80 font-mono">
                            <span>{new Date(tx.timestamp).toLocaleString(isKu ? 'ku' : isAr ? 'ar-IQ' : 'en-US')}</span>
                            
                            {onViewReceipt && (
                              <button
                                type="button"
                                onClick={() => onViewReceipt(tx)}
                                className="p-1.5 rounded-lg bg-rose-600/40 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-rose-500/50"
                              >
                                <Eye className="w-3 h-3" />
                                <span>{isKu ? 'وەسڵی گەڕاوە' : isAr ? 'وصل المرتجع' : 'Receipt'}</span>
                              </button>
                            )}
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* VIEW 3: SOLD ITEMS CATALOG */}
              {activeDetailModal.viewType === 'sold_items' && (() => {
                const searchTxt = modalSearch.toLowerCase().trim();
                const soldItemsMap: { [id: string]: { name: string; barcode: string; qty: number; revenue: number } } = {};

                selectedCashierMetric.transactions.forEach(tx => {
                  if (tx.status !== 'refunded' && Array.isArray(tx.items)) {
                    tx.items.forEach(it => {
                      const id = it.productId || it.productName;
                      const name = it.productNameAr || it.productName;
                      const barcode = it.barcode || '';
                      const qty = it.quantity || 1;
                      const totalAmt = it.total || (it.price * qty);

                      if (!soldItemsMap[id]) {
                        soldItemsMap[id] = { name, barcode, qty: 0, revenue: 0 };
                      }
                      soldItemsMap[id].qty += qty;
                      soldItemsMap[id].revenue += totalAmt;
                    });
                  }
                });

                let soldList = Object.values(soldItemsMap);
                if (searchTxt) {
                  soldList = soldList.filter(it => it.name.toLowerCase().includes(searchTxt) || it.barcode.includes(searchTxt));
                }

                if (soldList.length === 0) {
                  return (
                    <div className="p-12 text-center space-y-2 bg-[#050A14] rounded-2xl border border-slate-800">
                      <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-bold">
                        {isKu ? 'هیچ کاڵایەکی فرۆشراو نەدۆزرایەوە' : isAr ? 'لا توجد مواد مباعة مسجلة لهذا الحساب' : 'No sold products found'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-300 px-1">
                      <span>{isKu ? `کۆی کاڵا فرۆشراوەکان (${soldList.length} جۆر):` : isAr ? `قائمة الأصناف والمواد المباعة (${soldList.length} مادة):` : `Sold Products (${soldList.length} items):`}</span>
                      <span className="font-mono text-emerald-400">{currency} {selectedCashierMetric.grossSales.toLocaleString('en-US')}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {soldList.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-[#060A18] border border-purple-500/30 hover:border-purple-400/60 transition-all flex flex-col justify-between space-y-2"
                        >
                          <div>
                            <h4 className="font-bold text-xs text-slate-100 line-clamp-2">{item.name}</h4>
                            {item.barcode && (
                              <p className="text-[10px] text-purple-300/80 font-mono mt-0.5">{item.barcode}</p>
                            )}
                          </div>

                          <div className="flex justify-between items-center border-t border-slate-800/80 pt-2 text-xs font-mono">
                            <span className="text-[10px] text-slate-400">
                              {isKu ? 'بڕی فرۆش:' : isAr ? 'الكمية المباعة:' : 'Sold Qty:'} <strong className="text-purple-300 text-xs">{item.qty}</strong>
                            </span>
                            <span className="font-black text-emerald-400">
                              {currency} {item.revenue.toLocaleString('en-US')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* VIEW 4: RETURNED ITEMS CATALOG */}
              {activeDetailModal.viewType === 'returned_items' && (() => {
                const searchTxt = modalSearch.toLowerCase().trim();
                const retItemsMap: { [id: string]: { name: string; barcode: string; qty: number; refunded: number; invoiceNo: string; timestamp: string } } = {};

                selectedCashierMetric.transactions.forEach(tx => {
                  if (tx.status === 'refunded' && Array.isArray(tx.items)) {
                    tx.items.forEach(it => {
                      const id = it.productId || it.productName;
                      const name = it.productNameAr || it.productName;
                      const barcode = it.barcode || '';
                      const qty = it.quantity || 1;
                      const totalAmt = it.total || (it.price * qty);

                      if (!retItemsMap[id]) {
                        retItemsMap[id] = { name, barcode, qty: 0, refunded: 0, invoiceNo: tx.invoiceNumber, timestamp: tx.timestamp };
                      }
                      retItemsMap[id].qty += qty;
                      retItemsMap[id].refunded += totalAmt;
                    });
                  }
                });

                let retList = Object.values(retItemsMap);
                if (searchTxt) {
                  retList = retList.filter(it => it.name.toLowerCase().includes(searchTxt) || it.barcode.includes(searchTxt) || it.invoiceNo.includes(searchTxt));
                }

                if (retList.length === 0) {
                  return (
                    <div className="p-12 text-center space-y-2 bg-[#050A14] rounded-2xl border border-slate-800">
                      <PackageX className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-bold">
                        {isKu ? 'هیچ کاڵایەکی گەڕاوە تۆمار نەکراوە' : isAr ? 'لا توجد مواد مرجعة مسجلة لهذا الكاشير' : 'No returned products found'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-rose-400 px-1">
                      <span>{isKu ? `کۆی کاڵا گەڕاوەکان (${retList.length}):` : isAr ? `قائمة المواد المرجعة (${retList.length}):` : `Returned Products (${retList.length}):`}</span>
                      <span className="font-mono">-{currency} {selectedCashierMetric.refunds.toLocaleString('en-US')}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {retList.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 hover:border-rose-400 transition-all flex flex-col justify-between space-y-2"
                        >
                          <div>
                            <h4 className="font-bold text-xs text-slate-100 line-clamp-2">{item.name}</h4>
                            <p className="text-[10px] text-rose-300/80 font-mono mt-0.5">#{item.invoiceNo}</p>
                          </div>

                          <div className="flex justify-between items-center border-t border-rose-900/60 pt-2 text-xs font-mono">
                            <span className="text-[10px] text-rose-300">
                              {isKu ? 'دانەی گەڕاوە:' : isAr ? 'الكمية المرجعة:' : 'Ret Qty:'} <strong className="text-white text-xs">{item.qty}</strong>
                            </span>
                            <span className="font-black text-rose-300">
                              -{currency} {item.refunded.toLocaleString('en-US')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Sub-modal Footer */}
            <div className="p-3 sm:p-4 border-t border-cyan-500/20 bg-[#070C18] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveDetailModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                <span>{isKu ? 'گەڕانەوە بۆ لیستی سەرەکی' : isAr ? 'الرجوع لكشف الحسابات' : 'Back to Accounts'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintCashierStatement(selectedCashierMetric)}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isKu ? 'چاپکردنی وەسڵ و کەشف' : isAr ? 'طباعة كشف هذا الحساب' : 'Print Statement'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
