import React, { useState } from 'react';
import { 
  X, 
  Search, 
  FileText, 
  Printer, 
  RotateCcw, 
  Calendar, 
  User, 
  ShoppingBag, 
  CheckCircle2, 
  Sparkles,
  CreditCard,
  Banknote,
  Smartphone,
  Vault,
  UserCog,
  UserCheck,
  Check,
  PackageX,
  Wallet
} from 'lucide-react';
import { SaleTransaction, StoreSettings, UserAccount } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { formatDisplayDateTime, formatDisplayDate, formatDisplayTime } from '../lib/dateUtils';
import { DatePickerDDMMYYYY } from './DatePickerDDMMYYYY';

interface CompletedReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesHistory: SaleTransaction[];
  setSalesHistory?: React.Dispatch<React.SetStateAction<SaleTransaction[]>>;
  userAccounts?: UserAccount[];
  onUpdateSaleCashier?: (saleId: string, newCashierName: string) => void;
  settings: StoreSettings;
  onViewReceipt: (sale: SaleTransaction) => void;
  onOpenReturnForSale?: (sale: SaleTransaction) => void;
  onOpenCashDrawer?: () => void;
}

export const CompletedReceiptsModal: React.FC<CompletedReceiptsModalProps> = ({
  isOpen,
  onClose,
  salesHistory,
  setSalesHistory,
  userAccounts = [],
  onUpdateSaleCashier,
  settings,
  onViewReceipt,
  onOpenReturnForSale,
  onOpenCashDrawer
}) => {
  if (!isOpen) return null;

  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const t = (ar: string, ku: string, en: string = ar) => isKu ? ku : isAr ? ar : en;

  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [dateRangeMode, setDateRangeMode] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Cashier editing state
  const [editingSaleCashier, setEditingSaleCashier] = useState<SaleTransaction | null>(null);
  const [selectedNewCashier, setSelectedNewCashier] = useState<string>('');
  const [customCashierInput, setCustomCashierInput] = useState<string>('');

  const handleSaveNewCashier = () => {
    if (!editingSaleCashier) return;
    const finalCashier = selectedNewCashier === 'custom' ? customCashierInput.trim() : (selectedNewCashier || customCashierInput.trim());

    if (!finalCashier) return;

    if (onUpdateSaleCashier) {
      onUpdateSaleCashier(editingSaleCashier.id, finalCashier);
    } else if (setSalesHistory) {
      setSalesHistory(prev => prev.map(s => s.id === editingSaleCashier.id ? { ...s, cashierName: finalCashier } : s));
    }

    setEditingSaleCashier(null);
    setSelectedNewCashier('');
    setCustomCashierInput('');
  };

  const filteredSales = salesHistory.filter(sale => {
    if (!sale) return false;

    // Text search (Invoice #, Cashier, Item Name)
    const matchesSearch = 
      !search.trim() ||
      sale.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(search.toLowerCase())) ||
      sale.cashierName.toLowerCase().includes(search.toLowerCase()) ||
      (Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : [])).some((i: any) => i?.productName?.toLowerCase().includes(search.toLowerCase()) || (i?.productNameAr && i?.productNameAr?.includes(search)));
    
    // Customer filter
    const matchesCustomer = 
      !customerFilter.trim() || 
      (sale.customerName && sale.customerName.toLowerCase().includes(customerFilter.toLowerCase()));

    // Payment filter
    const matchesPayment = filterPayment === 'all' || sale.paymentMethod === filterPayment;

    // Date / Range filter
    let matchesDate = true;
    if (dateRangeMode === 'today') {
      const todayStr = new Date().toDateString();
      matchesDate = new Date(sale.timestamp).toDateString() === todayStr;
    } else if (dateRangeMode === 'yesterday') {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      matchesDate = new Date(sale.timestamp).toDateString() === yest.toDateString();
    } else if (dateRangeMode === 'week') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = new Date(sale.timestamp) >= sevenDaysAgo;
    } else if (dateRangeMode === 'month') {
      const now = new Date();
      const sDate = new Date(sale.timestamp);
      matchesDate = sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
    } else if (dateRangeMode === 'custom') {
      if (startDate) {
        const startTs = new Date(`${startDate}T00:00:00`).getTime();
        const saleTs = new Date(sale.timestamp).getTime();
        if (!isNaN(startTs) && !isNaN(saleTs) && saleTs < startTs) matchesDate = false;
      }
      if (endDate) {
        const endTs = new Date(`${endDate}T23:59:59`).getTime();
        const saleTs = new Date(sale.timestamp).getTime();
        if (!isNaN(endTs) && !isNaN(saleTs) && saleTs > endTs) matchesDate = false;
      }
    }

    return matchesSearch && matchesCustomer && matchesPayment && matchesDate;
  });

  const totalGrossSalesSum = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);

  const totalRefundedSum = filteredSales.reduce((acc, s) => {
    const safeReturned = Array.isArray(s.returnedItems)
      ? s.returnedItems
      : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);
    const itemReturns = safeReturned.reduce((rAcc: number, r: any) => rAcc + (r.total || 0), 0);
    const fullRefund = s.status === 'refunded' ? (s.total || 0) : 0;
    return acc + Math.max(itemReturns, fullRefund);
  }, 0);

  const returnedItemsCountSum = filteredSales.reduce((acc, s) => {
    const safeReturned = Array.isArray(s.returnedItems)
      ? s.returnedItems
      : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);
    const countInSale = safeReturned.reduce((rSum: number, r: any) => rSum + (r.quantity || 1), 0);

    if (s.status === 'refunded' && countInSale === 0) {
      const safeItems = Array.isArray(s.items)
        ? s.items
        : (typeof s.items === 'string' ? (JSON.parse(s.items || '[]') || []) : []);
      return acc + safeItems.reduce((iSum: number, i: any) => iSum + (i.quantity || 1), 0);
    }
    return acc + countInSale;
  }, 0);

  const totalNetSalesSum = Math.max(0, totalGrossSalesSum - totalRefundedSum);

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'card': return <CreditCard className="w-3.5 h-3.5 text-blue-400" />;
      case 'nfc': return <Smartphone className="w-3.5 h-3.5 text-purple-400" />;
      default: return <Banknote className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'card': return isKu ? 'کارت' : isAr ? 'بطاقة' : 'Card';
      case 'nfc': return 'NFC';
      default: return isKu ? 'نەقد' : isAr ? 'نقداً' : 'Cash';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="cyber-card w-full max-w-4xl max-h-[90vh] rounded-3xl border border-cyan-500/40 bg-[#0B1120] text-slate-100 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)] relative">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 bg-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <FileText className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                {t('سجل الفواتير والوصلات المباعة', 'تۆماری پسوڵە فرۆشراوەکان', 'Completed Sales Receipts')}
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  {filteredSales.length} {t('وصل', 'پسوڵە', 'Receipts')}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t('استعراض كافة عمليات البيع المكتملة وطباعة أو عرض الوصل كاملاً مع تفاصيل الوقت والمواد المرجوعة', 'بینینی هەموو پسوڵەکانی فرۆشتن و چاپکردنەوە یان پیشاندانی وردەکارییەکان', 'View sold receipts, view full details, or reprint.')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Total Refunded Display */}
            {totalRefundedSum > 0 && (
              <div className="bg-rose-950/80 border border-rose-500/50 px-3 py-1.5 rounded-2xl text-xs flex items-center gap-2 text-rose-300 font-mono font-bold shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>{t('المبلغ المسترجع من الخزنة:', 'بڕی گەڕێنراوە لە سندوق:', 'Total Refunded:')}</span>
                <span className="text-sm font-black text-rose-400">-{settings.currencySymbol}{formatNumber(totalRefundedSum)}</span>
              </div>
            )}

            {/* Net Cash in Drawer Display with Safe Modal Trigger */}
            {onOpenCashDrawer ? (
              <button
                onClick={onOpenCashDrawer}
                className="bg-emerald-950/80 hover:bg-emerald-900 border-2 border-emerald-500/50 px-3.5 sm:px-4 py-2 rounded-2xl text-xs flex items-center gap-2 text-emerald-300 font-mono font-bold shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all cursor-pointer hover:scale-105"
                title={t('اضغط لفتح واجهة تفاصيل الخزنة وحركة الصندوق', 'کرتە بکە بۆ کردنەوەی سندوق و خەزنە', 'Click to open Safe & Cash Drawer')}
              >
                <Vault className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>{t('الصافي المتبقي بالخزنة:', 'داهاتی پاکی سندوق:', 'Net Cash in Safe:')}</span>
                <span className="text-base font-black text-emerald-400">{settings.currencySymbol}{formatNumber(totalNetSalesSum)}</span>
              </button>
            ) : (
              <div className="bg-emerald-950/80 border-2 border-emerald-500/50 px-3.5 sm:px-4 py-2 rounded-2xl text-xs flex items-center gap-2 text-emerald-300 font-mono font-bold shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>{t('الصافي المتبقي بالخزنة:', 'داهاتی پاکی سندوق:', 'Net Cash in Drawer:')}</span>
                <span className="text-base font-black text-emerald-400">{settings.currencySymbol}{formatNumber(totalNetSalesSum)}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 sm:p-4 bg-[#080D1A] border-b border-slate-800 space-y-3">
          
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 border-b border-slate-800/80 pb-2.5">
            <div className="bg-[#0F172A] p-2 rounded-xl border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">{t('مجموع البيع', 'کۆی گشتی فرۆش', 'Gross Sales')}</span>
                <strong className="text-emerald-400 font-mono text-xs sm:text-sm font-black">{settings.currencySymbol}{formatNumber(totalGrossSalesSum)}</strong>
              </div>
              <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>

            <div className="bg-[#0F172A] p-2 rounded-xl border border-rose-500/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-rose-300 font-bold block">{t('مجموع المرجوعات', 'کۆی گشتی گەڕاوەکان', 'Total Refunds')}</span>
                <strong className="text-rose-400 font-mono text-xs sm:text-sm font-black">-{settings.currencySymbol}{formatNumber(totalRefundedSum)}</strong>
              </div>
              <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
            </div>

            <div className="bg-[#0F172A] p-2 rounded-xl border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-300 font-bold block">{t('عدد المواد المرجوعة', 'ژمارەی کاڵای گەڕاوە', 'Returned Qty')}</span>
                <strong className="text-amber-400 font-mono text-xs sm:text-sm font-black">{formatNumber(returnedItemsCountSum)} {t('مادة', 'کاڵا', 'items')}</strong>
              </div>
              <PackageX className="w-4 h-4 text-amber-400 shrink-0" />
            </div>

            <div className="bg-[#0F172A] p-2 rounded-xl border border-cyan-500/40 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 to-[#0F172A]">
              <div>
                <span className="text-[10px] text-cyan-300 font-bold block">{t('صافي المبيعات', 'فرۆشی پاکتاوکراو', 'Net Sales')}</span>
                <strong className="text-cyan-300 font-mono text-xs sm:text-sm font-black">{settings.currencySymbol}{formatNumber(totalNetSalesSum)}</strong>
              </div>
              <Wallet className="w-4 h-4 text-cyan-400 shrink-0" />
            </div>
          </div>

          {/* Row 1: Search Inputs (Invoice/Item Search + Customer Filter) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* General Search bar */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('بحث برقم الوصل (INV-...)، الكاشير، أو اسم المادة...', 'گەڕان بەپێی ژمارەی پسوڵە، کاشێر، یان ناوی کاڵا...', 'Search invoice #, cashier, or item...')}
                className="w-full bg-[#0F172A] text-xs text-slate-100 placeholder-slate-500 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl border border-cyan-500/30 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-sans shadow-inner"
              />
            </div>

            {/* Customer Search input */}
            <div className="relative flex-1 min-w-[180px]">
              <User className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-amber-400" />
              <input
                type="text"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                placeholder={t('فلترة حسب اسم العميل...', 'پاڵاوتن بەپێی ناوی کڕیار...', 'Filter by customer name...')}
                className="w-full bg-[#0F172A] text-xs text-slate-100 placeholder-slate-500 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl border border-amber-500/30 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-sans shadow-inner"
              />
            </div>

            {/* Payment filter pill */}
            <div className="flex items-center gap-1 bg-[#0F172A] p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setFilterPayment('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterPayment === 'all' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {t('الكل', 'هەموو', 'All')}
              </button>
              <button
                onClick={() => setFilterPayment('cash')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterPayment === 'cash' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {t('نقداً', 'نەقد', 'Cash')}
              </button>
              <button
                onClick={() => setFilterPayment('card')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterPayment === 'card' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {t('بطاقة', 'کارت', 'Card')}
              </button>
            </div>
          </div>

          {/* Row 2: Advanced Date Range Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-1.5 bg-[#0F172A] p-1 rounded-xl border border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('التاريخ:', 'بەروار:', 'Date:')}</span>
              </span>
              <button
                onClick={() => setDateRangeMode('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${dateRangeMode === 'all' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {t('الكل', 'هەموو', 'All')}
              </button>
              <button
                onClick={() => setDateRangeMode('today')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${dateRangeMode === 'today' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {t('اليوم', 'ئەمڕۆ', 'Today')}
              </button>
              <button
                onClick={() => setDateRangeMode('yesterday')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${dateRangeMode === 'yesterday' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {t('أمس', 'دوێنێ', 'Yesterday')}
              </button>
              <button
                onClick={() => setDateRangeMode('week')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${dateRangeMode === 'week' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {t('هذا الأسبوع', 'ئەم هەفتەیە', 'This Week')}
              </button>
              <button
                onClick={() => setDateRangeMode('month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${dateRangeMode === 'month' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {t('هذا الشهر', 'ئەم مانگە', 'This Month')}
              </button>
              <button
                onClick={() => setDateRangeMode('custom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${dateRangeMode === 'custom' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {t('نطاق مخصص 📅', 'دیاریکردنی بەروار 📅', 'Custom Range 📅')}
              </button>
            </div>

            {/* Custom Date Inputs (if custom selected) */}
            {dateRangeMode === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 bg-[#0F172A] px-3 py-1.5 rounded-xl border border-cyan-500/40 animate-fadeIn">
                <span className="text-[11px] text-slate-300 font-medium">{t('من:', 'لە:', 'From:')}</span>
                <div className="w-44">
                  <DatePickerDDMMYYYY
                    value={startDate}
                    onChange={(dStr) => setStartDate(dStr)}
                    lang={isAr ? 'ar' : isKu ? 'ku' : 'en'}
                  />
                </div>
                <span className="text-[11px] text-slate-300 font-medium">{t('إلى:', 'بۆ:', 'To:')}</span>
                <div className="w-44">
                  <DatePickerDDMMYYYY
                    value={endDate}
                    onChange={(dStr) => setEndDate(dStr)}
                    lang={isAr ? 'ar' : isKu ? 'ku' : 'en'}
                  />
                </div>
              </div>
            )}

            {/* Reset Filters button */}
            {(search || customerFilter || filterPayment !== 'all' || dateRangeMode !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setCustomerFilter('');
                  setFilterPayment('all');
                  setDateRangeMode('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-rose-400 hover:text-rose-300 underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t('إعادة ضبط الفلاتر', 'ڕێکخستنەوەی فلتەرەکان', 'Reset Filters')}</span>
              </button>
            )}
          </div>

        </div>

        {/* Receipts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {filteredSales.length === 0 ? (
            <div className="py-16 text-center space-y-3 text-slate-500">
              <FileText className="w-12 h-12 mx-auto text-slate-600 animate-bounce" />
              <p className="text-sm font-bold text-slate-400">
                {t('لا توجد فواتير أو وصلات مبيعات مسبقة تطابق البحث', 'هیچ پسوڵەیەکی فرۆشتن بەپێی ئەم گەڕانە نەدۆزرایەوە', 'No sales receipts match your search.')}
              </p>
            </div>
          ) : (
            filteredSales.map((sale) => {
              const isReturned = sale.status === 'refunded' || (sale.returnedItems && sale.returnedItems.length > 0);
              const saleItems = Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : []);
              return (
                <div 
                  key={sale.id}
                  className={`p-4 rounded-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group shadow-md ${
                    isReturned
                      ? 'bg-rose-950/40 border-2 border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                      : 'bg-[#0F172A] border border-slate-800 hover:border-cyan-500/40'
                  }`}
                >
                  {/* Sale Main Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-mono text-sm font-black transition-colors ${isReturned ? 'text-rose-400' : 'text-cyan-400 group-hover:text-cyan-300'}`}>
                        {sale.invoiceNumber}
                      </span>

                      <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${isReturned ? 'bg-rose-900/80 text-rose-200 border-rose-700' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                        {getPaymentIcon(sale.paymentMethod)}
                        <span>{getPaymentLabel(sale.paymentMethod)}</span>
                      </span>

                      <span className={`text-[11px] flex items-center gap-1 ${isReturned ? 'text-rose-200' : 'text-slate-400'}`}>
                        <Calendar className={`w-3 h-3 ${isReturned ? 'text-rose-400' : 'text-slate-500'}`} />
                        <span className="font-mono">{formatDisplayDateTime(sale.timestamp, lang)}</span>
                      </span>

                      {sale.status === 'refunded' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white border border-rose-400 shadow-sm animate-pulse">
                          {t('مسترجع بالكامل', 'بە تەواوی گەڕێندراوەتەوە', 'Refunded')}
                        </span>
                      )}

                      {sale.returnedItems && sale.returnedItems.length > 0 && sale.status !== 'refunded' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-900 text-rose-200 border border-rose-500 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 text-rose-400" />
                          <span>{t('تم اقتطاع مرجع:', 'بڕی گەڕێنراوە:', 'Refunded:')} -{settings.currencySymbol}{formatNumber(sale.returnedItems.reduce((acc, r) => acc + r.total, 0))}</span>
                        </span>
                      )}
                    </div>

                  {/* Items summary */}
                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1 text-slate-400">
                      <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{saleItems.reduce((acc: number, i: any) => acc + (i?.quantity || 0), 0)} {t('قطع', 'دانە', 'items')} ({saleItems.length} {t('أصناف', 'جۆر', 'products')})</span>
                    </span>

                    {sale.customerName && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        <span>{t('الزبون:', 'کڕیار:', 'Customer:')} <strong className="text-slate-200">{sale.customerName}</strong></span>
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <span>{t('الكاشير:', 'کاشێر:', 'Cashier:')} <strong className="text-slate-300">{sale.cashierName || t('غير محدد', 'دیارینەکراو', 'Unassigned')}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSaleCashier(sale);
                          setSelectedNewCashier(sale.cashierName || '');
                          setCustomCashierInput('');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-bold transition-all cursor-pointer"
                        title={t('تغيير كاشير الوصل', 'گۆڕینی کاشێری پسوڵە', 'Change Cashier')}
                      >
                        <UserCog className="w-3 h-3 text-indigo-400" />
                        <span>{t('تغيير', 'گۆڕین', 'Edit')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Mini preview of items */}
                  <div className="text-[11px] text-slate-400 bg-[#080D1A] px-3 py-1.5 rounded-xl border border-slate-800/80 truncate">
                    {(Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : [])).map((i: any) => `${isAr || isKu ? (i.productNameAr || i.productName) : i.productName} (${i.quantity})`).join(' ، ')}
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="text-left rtl:text-right">
                    <span className="text-xs text-slate-400 block">{t('إجمالي الوصل:', 'کۆی پسوڵە:', 'Grand Total:')}</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {settings.currencySymbol}{formatNumber(sale.total)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Return / Refund button */}
                    {onOpenReturnForSale && sale.status !== 'refunded' && (
                      <button
                        onClick={() => {
                          onOpenReturnForSale(sale);
                          onClose();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-900/40 active:scale-95"
                        title={t('ترجيع مواد من هذا الوصل', 'گەڕاندنەوەی کاڵا لەم پسوڵەیە', 'Return items from this receipt')}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t('ترجيع مواد هذا الوصل', 'گەڕاندنەوەی پسوڵە', 'Return Items')}</span>
                      </button>
                    )}

                    {/* View full receipt button */}
                    <button
                      onClick={() => onViewReceipt(sale)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-900/40 active:scale-95"
                    >
                      <FileText className="w-4 h-4" />
                      <span>{t('عرض الوصل كاملاً', 'پیشاندانی تەواوی پسوڵە', 'View Full Receipt')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0F172A] border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>{t('منظومة إدارة المبيعات والفواتير', 'سیستەمی بەڕێوەبردنی فرۆش و پسوڵەکان', 'Supermarket Receipts Log')}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer"
          >
            {t('إغلاق', 'داخستن', 'Close')}
          </button>
        </div>

      </div>

      {/* MODAL: CHANGE CASHIER */}
      {editingSaleCashier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0F172A] border-2 border-indigo-500/50 rounded-3xl p-6 space-y-5 shadow-2xl relative">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {t(`تغيير الكاشير للفاتورة #${editingSaleCashier.invoiceNumber}`, `گۆڕینی کاشێری پسوڵەی #${editingSaleCashier.invoiceNumber}`, `Change Cashier for #${editingSaleCashier.invoiceNumber}`)}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('تعديل اسم الكاشير المسجل للعملية', 'دەستکاریکردنی ناوی کاشێری تۆمارکراو بۆ ئەم پسوڵەیە', 'Reassign the cashier for this receipt')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingSaleCashier(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-[#080D1A] p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">{t('تاريخ ووقت الوصل:', 'بەروار و کاتی پسوڵە:', 'Timestamp:')}</span>
                <span className="font-mono text-slate-200 font-bold">{editingSaleCashier.timestamp}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">{t('قيمة الفاتورة:', 'بڕی پسوڵە:', 'Total:')}</span>
                <span className="font-mono font-black text-emerald-400 text-sm">{settings.currencySymbol}{formatNumber(editingSaleCashier.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{t('الكاشير الحالي:', 'کاشێری ئێستا:', 'Current Cashier:')}</span>
                <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {editingSaleCashier.cashierName || t('غير محدد', 'دیارینەکراو', 'Unassigned')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-200 block">
                {t('اختر الكاشير الجديد:', 'کاشێری نوێ هەڵبژێرە:', 'Select New Cashier:')}
              </label>

              <select
                value={selectedNewCashier}
                onChange={(e) => {
                  setSelectedNewCashier(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomCashierInput('');
                  }
                }}
                className="w-full bg-[#080D1A] text-slate-100 text-xs p-3 rounded-xl border border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              >
                <option value="">-- {t('اختر اسم كاشير', 'ناوی کاشێر هەڵبژێرە', 'Select Cashier')} --</option>
                {userAccounts.map(u => (
                  <option key={u.id} value={u.fullName}>
                    👤 {u.fullName} ({u.role === 'Admin' ? t('مدير', 'بەڕێوەبەر', 'Admin') : t('كاشير', 'کاشێر', 'Cashier')})
                  </option>
                ))}
                <option value="custom">✍️ {t('كتابة اسم كاشير آخر...', 'نووسینی ناوی کاشێری تر...', 'Type custom name...')}</option>
              </select>

              {(selectedNewCashier === 'custom' || userAccounts.length === 0) && (
                <div className="space-y-1.5 animate-fadeIn pt-1">
                  <label className="text-[11px] font-bold text-indigo-300 block">
                    {t('أدخل اسم الكاشير الجديد:', 'ناوی کاشێری نوێ بنووسە:', 'Enter Custom Name:')}
                  </label>
                  <input
                    type="text"
                    value={customCashierInput}
                    onChange={(e) => setCustomCashierInput(e.target.value)}
                    placeholder={t('مثال: أحمد الكاشير', 'نموونە: کاشێر ئەحمەد', 'e.g. Alex Smith')}
                    className="w-full bg-[#080D1A] text-slate-100 text-xs p-3 rounded-xl border border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-slate-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingSaleCashier(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                {t('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
              </button>

              <button
                type="button"
                onClick={handleSaveNewCashier}
                disabled={!selectedNewCashier && !customCashierInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-900/50 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{t('حفظ التغيير', 'پاشەکەوتکردنی گۆڕانکاری', 'Save')}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
