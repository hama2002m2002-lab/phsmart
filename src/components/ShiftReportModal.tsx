import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  TrendingUp, 
  RotateCcw, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  Vault, 
  Calendar, 
  Clock, 
  UserCheck, 
  ShoppingBag, 
  CheckCircle2, 
  DollarSign, 
  Layers,
  Sparkles,
  Award,
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  Search,
  Filter
} from 'lucide-react';
import { SaleTransaction, StoreSettings } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { isToday, parseDate, formatDisplayDate, formatDisplayTime, formatDisplayDateTime } from '../lib/dateUtils';
import { ReceiptModal } from './ReceiptModal';
import { DatePickerDDMMYYYY } from './DatePickerDDMMYYYY';

interface ShiftReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesHistory: SaleTransaction[];
  settings: StoreSettings;
  cashierName?: string;
  onViewReceipt?: (sale: SaleTransaction) => void;
  onOpenSalesReturn?: (invoiceNo?: string) => void;
}

interface CashAdjustmentItem {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  reason: string;
  time: string;
}

export const ShiftReportModal: React.FC<ShiftReportModalProps> = ({
  isOpen,
  onClose,
  salesHistory,
  settings,
  cashierName = 'الكاشير الرئيسي',
  onViewReceipt,
  onOpenSalesReturn
}) => {
  if (!isOpen) return null;

  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');
  
  // Date and Search Filtering (Default to 'all' so all cashier receipts are shown)
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [selectedCustomDate, setSelectedCustomDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cashierFilter, setCashierFilter] = useState<string>('all');
  
  // Selected Sale for viewing receipt details
  const [viewingSale, setViewingSale] = useState<SaleTransaction | null>(null);

  // Default initial float for cash register
  const initialFloat = 250.00;

  // Manual cash adjustments simulation/state
  const sampleAdjustments: CashAdjustmentItem[] = [
    { id: 'adj-1', type: 'deposit', amount: 100, reason: isAr ? 'رصيد إضافي افتتاحي للخزنة' : 'Initial float deposit', time: '08:00 AM' }
  ];

  // Extract unique Cashiers
  const uniqueCashiers = useMemo(() => {
    return Array.from(new Set(salesHistory.map(s => s.cashierName).filter(Boolean)));
  }, [salesHistory]);

  // Filter Sales based on mode, custom date, searchQuery and cashier filter
  const filteredSales = useMemo(() => {
    return salesHistory.filter(s => {
      if (!s) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInv = s.invoiceNumber?.toLowerCase().includes(q);
        const matchCust = s.customerName?.toLowerCase().includes(q);
        const matchDoctor = s.prescriptionInfo?.doctorName?.toLowerCase().includes(q);
        const matchPatient = s.prescriptionInfo?.patientName?.toLowerCase().includes(q);
        const itemsList = Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? JSON.parse(s.items || '[]') : []);
        const matchItem = itemsList.some((i: any) => i?.productName?.toLowerCase().includes(q) || i?.barcode?.includes(q));
        if (!matchInv && !matchCust && !matchDoctor && !matchPatient && !matchItem) {
          return false;
        }
      }

      // Cashier filter
      if (cashierFilter !== 'all') {
        if (s.cashierName !== cashierFilter) return false;
      }

      // Date Filter
      if (dateFilterMode === 'today') {
        return isToday(s.timestamp);
      } else if (dateFilterMode === 'yesterday') {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const parsed = parseDate(s.timestamp);
        return parsed.toDateString() === yest.toDateString();
      } else if (dateFilterMode === 'custom' && selectedCustomDate) {
        const parsed = parseDate(s.timestamp);
        const formattedSaleDate = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
        return String(s.timestamp).includes(selectedCustomDate) || formattedSaleDate === selectedCustomDate;
      }

      return true; // 'all'
    });
  }, [salesHistory, dateFilterMode, selectedCustomDate, searchQuery, cashierFilter]);

  const activeDisplayDateText = useMemo(() => {
    if (dateFilterMode === 'today') {
      return formatDisplayDate(new Date(), lang);
    } else if (dateFilterMode === 'yesterday') {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      return formatDisplayDate(yest, lang);
    } else if (dateFilterMode === 'custom') {
      return selectedCustomDate;
    }
    return isKu ? 'سەرجەم کاتەکان' : isAr ? 'كل الأوقات' : 'All Time';
  }, [dateFilterMode, selectedCustomDate, lang, isAr, isKu]);

  // Calculations based on filtered sales
  const invoiceCount = filteredSales.length;

  const grossSales = filteredSales.reduce((acc, s) => (s.status === 'refunded' || (s.total && s.total < 0) || (s.subtotal && s.subtotal < 0)) ? acc : acc + Math.max(0, s.subtotal || s.total || 0), 0);
  const totalDiscounts = filteredSales.reduce((acc, s) => (s.status === 'refunded' || (s.total && s.total < 0)) ? acc : acc + (s.discount || 0), 0);
  
  const totalRefunds = filteredSales.reduce((acc, s) => {
    const safeReturned = Array.isArray(s.returnedItems)
      ? s.returnedItems
      : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);
    const itemReturns = safeReturned.reduce((rAcc: number, r: any) => rAcc + Math.abs(Number(r?.total) || (Number(r?.price || 0) * Number(r?.quantity || 0))), 0);
    const fullRefund = (s.status === 'refunded' || (s.total && s.total < 0)) ? Math.abs(s.total || s.subtotal || 0) : 0;
    return acc + ((s.status === 'refunded' || (s.total && s.total < 0)) ? Math.max(itemReturns, fullRefund) : itemReturns);
  }, 0);

  const totalReturnedQty = filteredSales.reduce((acc, s) => {
    const safeReturned = Array.isArray(s.returnedItems)
      ? s.returnedItems
      : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);
    
    if (safeReturned.length > 0) {
      const itemQty = safeReturned.reduce((rAcc: number, r: any) => rAcc + Math.abs(Number(r?.quantity) || 0), 0);
      return acc + itemQty;
    } else if (s.status === 'refunded') {
      const itemsList = Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? (JSON.parse(s.items || '[]') || []) : []);
      const fullQty = itemsList.reduce((sum: number, i: any) => sum + Math.abs(Number(i?.quantity) || 0), 0);
      return acc + fullQty;
    }
    return acc;
  }, 0);

  const netSales = grossSales - totalDiscounts - totalRefunds;

  const totalItemsSold = filteredSales.reduce((acc, s) => {
    const itemsList = Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? (JSON.parse(s.items || '[]') || []) : []);
    return acc + itemsList.reduce((sum: number, i: any) => sum + (i?.quantity || 0), 0);
  }, 0);

  // Breakdown by payment method
  const cashSalesList = filteredSales.filter(s => (s.paymentMethod === 'cash' || !s.paymentMethod) && s.status !== 'refunded');
  const cashSalesTotal = cashSalesList.reduce((acc, s) => acc + (s.total || 0), 0);

  const cardSalesList = filteredSales.filter(s => s.paymentMethod === 'card' && s.status !== 'refunded');
  const cardSalesTotal = cardSalesList.reduce((acc, s) => acc + (s.total || 0), 0);

  const nfcSalesList = filteredSales.filter(s => s.paymentMethod === 'nfc' && s.status !== 'refunded');
  const nfcSalesTotal = nfcSalesList.reduce((acc, s) => acc + (s.total || 0), 0);

  const totalCashRefunds = filteredSales.reduce((acc, s) => {
    if (s.paymentMethod && s.paymentMethod !== 'cash') return acc;
    const safeReturned = Array.isArray(s.returnedItems)
      ? s.returnedItems
      : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);
    const itemReturns = safeReturned.reduce((rAcc: number, r: any) => rAcc + Math.abs(Number(r?.total) || (Number(r?.price || 0) * Number(r?.quantity || 0))), 0);
    const fullRefund = (s.status === 'refunded' || (s.total && s.total < 0)) ? Math.abs(s.total || s.subtotal || 0) : 0;
    return acc + ((s.status === 'refunded' || (s.total && s.total < 0)) ? Math.max(itemReturns, fullRefund) : itemReturns);
  }, 0);

  // Cash Drawer Movements calculation
  const totalDeposits = sampleAdjustments.filter(a => a.type === 'deposit').reduce((acc, a) => acc + a.amount, 0);
  const totalWithdrawals = sampleAdjustments.filter(a => a.type === 'withdrawal').reduce((acc, a) => acc + a.amount, 0);

  const expectedCashInDrawer = initialFloat + cashSalesTotal + totalDeposits - totalCashRefunds - totalWithdrawals;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
      
      {/* SCREEN VIEW (HIDDEN DURING PRINT) */}
      <div className="cyber-card w-full max-w-6xl max-h-[92vh] rounded-3xl border border-cyan-500/40 bg-[#0A1220] text-slate-100 flex flex-col overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.25)] relative print:hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 bg-[#0F192C]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <FileText className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
                <span>{isAr ? 'تقرير ملخص الورديات والصندوق (Shift Report)' : isKu ? 'ڕاپۆرتی کۆتایی نۆبەت و سندوق' : 'End of Shift & Cash Drawer Report'}</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
                  {new Date().toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isKu ? `پوختەی فرۆش، ژمارەی پسوڵەکان، و جوڵەی خەزێنە بۆ: ${activeDisplayDateText}` : isAr ? `ملخص المبيعات، عدد الفواتير، وحركة الخزنة للفترة: ${activeDisplayDateText}` : `Shift overview, sales breakdown & cash movements: ${activeDisplayDateText}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Format Selector */}
            <div className="flex bg-[#070D18] p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${printFormat === 'thermal' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {isKu ? 'وەسڵی گەرمی 80mm' : isAr ? 'وصل حراري 80mm' : 'Thermal 80mm'}
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${printFormat === 'a4' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {isKu ? 'ڕاپۆرتی A4' : isAr ? 'تقرير A4' : 'A4 Sheet'}
              </button>
            </div>

            {/* Sales Return Button */}
            {onOpenSalesReturn && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSalesReturn();
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:brightness-110 text-white text-xs font-black shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-rose-400/40 shrink-0"
                title={isKu ? 'گەڕاندنەوەی کاڵا و فرۆش' : isAr ? 'إرجاع مواد واسترجاع المبيعات' : 'Sales Return'}
              >
                <RotateCcw className="w-4 h-4 text-rose-100" />
                <span>{isKu ? 'گەڕاندنەوەی کاڵا' : isAr ? 'إرجاع مواد' : 'Sales Return'}</span>
              </button>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 text-white text-xs font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{isKu ? 'چاپکردنی ڕاپۆرتی نۆبەت' : isAr ? 'طباعة تقرير الوردية' : 'Print Shift Report'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* DATE SELECTOR CALENDAR & TOOLBAR */}
          <div className="p-3.5 rounded-2xl bg-[#0B1528] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5 ml-1">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>{isKu ? 'دیاریکردنی بەرواری نۆبەت:' : isAr ? 'تحديد تاريخ الوردية:' : 'Select Shift Date:'}</span>
              </span>

              <button
                type="button"
                onClick={() => setDateFilterMode('today')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all border cursor-pointer ${dateFilterMode === 'today' ? 'bg-cyan-600 text-white border-cyan-400 shadow-md' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              >
                {isKu ? 'مبیعاتی ئەمڕۆ' : isAr ? 'مبيعات اليوم' : 'Today'}
              </button>

              <button
                type="button"
                onClick={() => setDateFilterMode('yesterday')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all border cursor-pointer ${dateFilterMode === 'yesterday' ? 'bg-cyan-600 text-white border-cyan-400 shadow-md' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              >
                {isKu ? 'دوێنێ' : isAr ? 'الأمس' : 'Yesterday'}
              </button>

              <button
                type="button"
                onClick={() => setDateFilterMode('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all border cursor-pointer ${dateFilterMode === 'all' ? 'bg-cyan-600 text-white border-cyan-400 shadow-md' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
              >
                {isKu ? 'سەرجەم کاتەکان' : isAr ? 'جميع الأوقات' : 'All Time'}
              </button>

              {/* Custom Date Picker Calendar (DD/MM/YYYY) */}
              <div className="w-56">
                <DatePickerDDMMYYYY
                  value={selectedCustomDate}
                  onChange={(dateStr) => {
                    setSelectedCustomDate(dateStr);
                    setDateFilterMode('custom');
                  }}
                  lang={isAr ? 'ar' : isKu ? 'ku' : 'en'}
                />
              </div>
            </div>

            {/* Search + Cashier Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isKu ? 'گەڕان بەپێی ژمارەی پسوڵە، کڕیار...' : isAr ? 'بحث برقم الوصل، العميل...' : 'Search invoice, customer...'}
                  className="w-44 sm:w-52 bg-[#060B14] text-slate-100 text-xs rounded-xl pl-3 pr-8 py-1.5 border border-slate-700 focus:border-cyan-400 focus:outline-none placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
                    ✕
                  </button>
                )}
              </div>

              {uniqueCashiers.length > 0 && (
                <select
                  value={cashierFilter}
                  onChange={(e) => setCashierFilter(e.target.value)}
                  className="bg-[#060B14] text-slate-200 text-xs rounded-xl px-2.5 py-1.5 border border-slate-700 focus:border-cyan-400 focus:outline-none font-bold"
                >
                  <option value="all">{isKu ? 'سەرجەم کاشێرەکان' : isAr ? 'جميع الكاشيرين' : 'All Cashiers'}</option>
                  {uniqueCashiers.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Top Banner KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* 1. Net Sales */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-[#0C1B17] to-teal-950/70 border border-emerald-500/40 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-emerald-300 font-bold mb-1">
                <span>{isKu ? 'صافی فرۆشراو' : isAr ? 'صافي المبيعات' : 'Net Sales'}</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {settings.currencySymbol}{formatNumber(netSales)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isKu ? `لە کۆی فرۆشی گشتی: ${settings.currencySymbol}${formatNumber(grossSales)}` : isAr ? `من إجمالي مبيعات: ${settings.currencySymbol}${formatNumber(grossSales)}` : `Gross: ${settings.currencySymbol}${formatNumber(grossSales)}`}
              </p>
            </div>

            {/* 2. Total Invoices Count */}
            <div className="p-4 rounded-2xl bg-[#0F192B] border border-cyan-500/30 shadow-md">
              <div className="flex items-center justify-between text-xs text-cyan-300 font-bold mb-1">
                <span>{isKu ? 'ژمارەی پسوڵەکان' : isAr ? 'عدد الفواتير' : 'Invoices Count'}</span>
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-cyan-400 font-mono">
                {invoiceCount} <span className="text-xs text-slate-400 font-sans">{isKu ? 'پسوڵە' : isAr ? 'فاتورة' : 'invoices'}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isKu ? `کۆی کاڵای فرۆشراو: ${totalItemsSold} دانە` : isAr ? `إجمالي القطع المباعة: ${totalItemsSold} قطعة` : `Total items: ${totalItemsSold}`}
              </p>
            </div>

            {/* 3. Net Cash in Drawer */}
            <div className="p-4 rounded-2xl bg-[#111C2C] border border-blue-500/30 shadow-md">
              <div className="flex items-center justify-between text-xs text-blue-300 font-bold mb-1">
                <span>{isKu ? 'نەقدی چاوەڕوانکراوی خەزێنە' : isAr ? 'النقد المتوقع بالخزنة' : 'Expected Cash in Safe'}</span>
                <Vault className="w-4 h-4 text-blue-400 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-blue-400 font-mono">
                {settings.currencySymbol}{formatNumber(expectedCashInDrawer)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isKu ? 'باڵانسی سەرەتایی و فرۆشتنی نەقد دەگرێتەوە' : isAr ? 'يشمل الرصيد الافتتاحي والمبيعات النقدية' : 'Includes float & cash sales'}
              </p>
            </div>

            {/* 4. Refunds & Discounts */}
            <div className="p-4 rounded-2xl bg-[#1C111A] border border-rose-500/30 shadow-md">
              <div className="flex items-center justify-between text-xs text-rose-300 font-bold mb-1">
                <span>{isKu ? 'گەڕێنراوە و داشکاندنەکان' : isAr ? 'المرتجعات والخصومات' : 'Refunds & Discounts'}</span>
                <RotateCcw className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl font-black text-rose-400 font-mono">
                -{settings.currencySymbol}{formatNumber(totalRefunds + totalDiscounts)}
              </div>
              <p className="text-[10px] text-slate-300 mt-1 font-medium leading-relaxed">
                {isKu
                  ? `گەڕێنراوە: ${settings.currencySymbol}${formatNumber(totalRefunds)} (${totalReturnedQty} دانە) | داشکاندن: ${settings.currencySymbol}${formatNumber(totalDiscounts)}`
                  : isAr 
                  ? `مرتجع: ${settings.currencySymbol}${formatNumber(totalRefunds)} (${totalReturnedQty} قطعة) | خصم: ${settings.currencySymbol}${formatNumber(totalDiscounts)}` 
                  : `Refund: ${settings.currencySymbol}${formatNumber(totalRefunds)} (${totalReturnedQty} pcs) | Disc: ${settings.currencySymbol}${formatNumber(totalDiscounts)}`}
              </p>
            </div>

          </div>

          {/* Detailed Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Payment Method Distribution */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1525] border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>{isKu ? 'دابەشکردنی فرۆش بەپێی شێوازی پارەدان:' : isAr ? 'توزيع المبيعات حسب طريقة الدفع:' : 'Sales Breakdown by Payment Method:'}</span>
              </h3>

              <div className="space-y-3">
                {/* Cash */}
                <div className="p-3 rounded-xl bg-[#080E1B] border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{isKu ? 'فرۆشتنی نەقد (Cash)' : isAr ? 'مبيعات نقدية (Cash)' : 'Cash Sales'}</p>
                      <p className="text-[10px] text-slate-400">{cashSalesList.length} {isKu ? 'پسوڵە' : isAr ? 'فاتورة' : 'invoices'}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono text-emerald-400">
                    {settings.currencySymbol}{formatNumber(cashSalesTotal)}
                  </span>
                </div>

                {/* Card */}
                <div className="p-3 rounded-xl bg-[#080E1B] border border-blue-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{isKu ? 'کارت / پۆس (Card POS)' : isAr ? 'بطاقة/شبكة (Card POS)' : 'Card Sales'}</p>
                      <p className="text-[10px] text-slate-400">{cardSalesList.length} {isKu ? 'پسوڵە' : isAr ? 'فاتورة' : 'invoices'}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono text-blue-400">
                    {settings.currencySymbol}{formatNumber(cardSalesTotal)}
                  </span>
                </div>

                {/* NFC */}
                <div className="p-3 rounded-xl bg-[#080E1B] border border-purple-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{isKu ? 'پارەدانی زیرەک (NFC / Apple Pay)' : isAr ? 'دفع ذكي (NFC / Apple Pay)' : 'NFC Mobile Sales'}</p>
                      <p className="text-[10px] text-slate-400">{nfcSalesList.length} {isKu ? 'پسوڵە' : isAr ? 'فاتورة' : 'invoices'}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono text-purple-400">
                    {settings.currencySymbol}{formatNumber(nfcSalesTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cash Drawer Reconciliation Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1525] border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Vault className="w-4 h-4 text-cyan-400" />
                <span>{isKu ? 'جوڵە و لێکدانەوەی سندوقی پارە (Cash Drawer Audit):' : isAr ? 'حركة وتقريب درج النقود (Cash Drawer Audit):' : 'Cash Drawer Reconciliation:'}</span>
              </h3>

              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between p-2 rounded-lg bg-[#080E1B]">
                  <span className="text-slate-400">{isKu ? 'باڵانسی سەرەتایی سندوق:' : isAr ? 'الرصيد الافتتاحي للصندوق:' : 'Opening Float:'}</span>
                  <span className="font-mono font-bold text-slate-200">{settings.currencySymbol}{formatNumber(initialFloat)}</span>
                </div>

                <div className="flex justify-between p-2 rounded-lg bg-[#080E1B]">
                  <span className="text-slate-400">{isKu ? '(+) وەرگیراوی نەقد لە فرۆشتن:' : isAr ? '(+) المقبوضات النقدية:' : '(+) Cash Collected:'}</span>
                  <span className="font-mono font-bold text-emerald-400">+{settings.currencySymbol}{formatNumber(cashSalesTotal)}</span>
                </div>

                <div className="flex justify-between p-2 rounded-lg bg-[#080E1B]">
                  <span className="text-slate-400">{isKu ? '(+) دانانی دەستیی نەقد:' : isAr ? '(+) الإيداعات النقدية اليدوية:' : '(+) Cash Deposits:'}</span>
                  <span className="font-mono font-bold text-emerald-400">+{settings.currencySymbol}{formatNumber(totalDeposits)}</span>
                </div>

                <div className="flex justify-between p-2 rounded-lg bg-[#080E1B]">
                  <span className="text-slate-400">
                    {isKu ? `(-) بڕی گەڕێنراوی نەقد (${totalReturnedQty} دانە):` : isAr ? `(-) المبالغ المسترجعة نقداً (${totalReturnedQty} قطعة):` : `(-) Cash Refunds (${totalReturnedQty} pcs):`}
                  </span>
                  <span className="font-mono font-bold text-rose-400">-{settings.currencySymbol}{formatNumber(totalRefunds)}</span>
                </div>

                <div className="flex justify-between p-2 rounded-lg bg-[#080E1B]">
                  <span className="text-slate-400">{isKu ? '(-) ڕاکێشان و خەرجییەکان:' : isAr ? '(-) السحوبات والمصاريف:' : '(-) Withdrawals/Expenses:'}</span>
                  <span className="font-mono font-bold text-rose-400">-{settings.currencySymbol}{formatNumber(totalWithdrawals)}</span>
                </div>

                <div className="flex justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 font-bold text-emerald-300">
                  <span>{isKu ? '(=) باڵانسی صافی چاوەڕوانکراو لە سندوق:' : isAr ? '(=) الصافي المتوقع بالخزنة:' : '(=) Expected Net Cash:'}</span>
                  <span className="font-mono text-base font-black text-emerald-400">{settings.currencySymbol}{formatNumber(expectedCashInDrawer)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Transactions List with Open Receipt Action */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>{isKu ? `پسوڵە و فرۆشەکانی ئەم کاتە (${activeDisplayDateText}):` : isAr ? `فواتير ومبيعات الفترة المسجلة (${activeDisplayDateText}):` : `Shift Transactions (${activeDisplayDateText}):`}</span>
              </span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-bold">
                {filteredSales.length} {isKu ? 'کردار' : isAr ? 'عمليات' : 'Tx'}
              </span>
            </h3>

            <div className="rounded-2xl border border-slate-800 bg-[#080D18] overflow-hidden">
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
                {filteredSales.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs font-bold space-y-1">
                    <p>{isKu ? 'هیچ پسوڵەیەکی فرۆشتن لەم بەروارەدا تۆمار نەکراوە' : isAr ? 'لا توجد فواتير مبيعات مسجلة في هذا التاريخ أو للبحث المحدد' : 'No sales recorded for this date or search query.'}</p>
                    <p className="text-[10px] text-slate-600">{isKu ? 'دەتوانیت لە ڕێگەی ڕۆژژمێری سەرەوە هەر بەروارێکی تر هەڵبژێریت' : isAr ? 'يمكنك استخدام التقويم أعلاه لاختيار أي تاريخ آخر' : 'Use the calendar above to pick any date.'}</p>
                  </div>
                ) : (
                  filteredSales.map((sale) => {
                    const safeReturned = Array.isArray(sale.returnedItems) ? sale.returnedItems : (typeof sale.returnedItems === 'string' ? (JSON.parse(sale.returnedItems || '[]') || []) : []);
                    const isRefunded = sale.status === 'refunded' || safeReturned.length > 0;
                    return (
                      <div 
                        key={sale.id} 
                        onClick={() => setViewingSale(sale)}
                        className={`p-3 flex items-center justify-between text-xs transition-all cursor-pointer group ${
                          isRefunded ? 'bg-rose-950/20 hover:bg-rose-950/40' : 'hover:bg-cyan-950/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded border ${
                            isRefunded ? 'text-rose-400 bg-rose-950/80 border-rose-500/40' : 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30'
                          }`}>
                            #{sale.invoiceNumber}
                          </span>
                          {isRefunded && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                              🔴 {isKu ? 'گەڕێنراوە' : isAr ? 'مرتجع' : 'Refunded'}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatDisplayDateTime(sale.timestamp, lang)}
                          </span>
                          {sale.cashierName && (
                            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                              👤 {sale.cashierName}
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                            {sale.paymentMethod === 'card' ? (isKu ? 'کارت' : isAr ? 'بطاقة' : 'Card') : sale.paymentMethod === 'nfc' ? 'NFC' : (isKu ? 'نەقد' : isAr ? 'كاش' : 'Cash')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({(Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : [])).length} {isKu ? 'کاڵا' : isAr ? 'عناصر' : 'items'})
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className={`font-mono font-bold text-sm ${isRefunded ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isRefunded ? '-' : ''}{settings.currencySymbol}{formatNumber(sale.total)}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingSale(sale);
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all group-hover:scale-105 ${
                              isRefunded ? 'bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border-rose-500/40' : 'bg-cyan-500/10 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/30'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isKu ? 'بینینی پسوڵە' : isAr ? 'عرض الوصل' : 'View Receipt'}</span>
                          </button>

                          {onOpenSalesReturn && !isRefunded && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                onOpenSalesReturn(sale.invoiceNumber);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 transition-all hover:scale-105 cursor-pointer"
                              title={isKu ? `گەڕاندنەوەی کاڵا لە پسوڵەی #${sale.invoiceNumber}` : isAr ? `إرجاع مواد من الوصل #${sale.invoiceNumber}` : `Return items from receipt #${sale.invoiceNumber}`}
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                              <span>{isKu ? 'گەڕاندنەوەی کاڵا' : isAr ? 'إرجاع مواد' : 'Return Items'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0F192C] flex items-center justify-between text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>{isKu ? `کاشێری بەرپرسیار: ${cashierName}` : isAr ? `الكاشير المسؤول: ${cashierName}` : `Cashier: ${cashierName}`}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>{isKu ? 'چاپکردنی ڕاپۆرتی نۆبەت' : isAr ? 'طباعة تقرير الوردية' : 'Print Shift Report'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all border border-slate-700 cursor-pointer"
            >
              {isKu ? 'داخستن' : isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY CONTAINER (VISIBLE ONLY DURING PRINT window.print()) */}
      {/* ========================================================================= */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-4 text-left rtl:text-right font-sans leading-tight">
        
        {printFormat === 'thermal' ? (
          /* THERMAL 80MM RECEIPT FORMAT */
          <div className="w-[78mm] mx-auto text-[11px] font-mono space-y-2 border-b-2 border-dashed pb-4">
            
            {/* Header */}
            <div className="text-center space-y-1">
              <h1 className="text-base font-black uppercase tracking-wider">{settings.storeNameAr || settings.storeName}</h1>
              {settings.address && <p className="text-[10px]">{settings.address}</p>}
              {settings.phone && <p className="text-[10px]">Tel: {settings.phone}</p>}
              <div className="border-b-2 border-black my-1" />
              <h2 className="text-xs font-black uppercase">*** {isKu ? 'ڕاپۆرتی کۆتایی نۆبەت' : isAr ? 'تقرير ملخص الوردية' : 'SHIFT SUMMARY REPORT'} ***</h2>
              <h3 className="text-[10px]">DAILY SHIFT REPORT</h3>
            </div>

            {/* Info Table */}
            <div className="text-[10px] space-y-0.5 border-b border-black pb-1.5">
              <div className="flex justify-between">
                <span>{isKu ? 'بەروار Date:' : 'التاريخ Date:'}</span>
                <span>{new Date().toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? 'کات Time:' : 'الوقت Time:'}</span>
                <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? 'کاشێر Cashier:' : 'الكاشير Cashier:'}</span>
                <span>{cashierName}</span>
              </div>
            </div>

            {/* Sales Metrics */}
            <div className="space-y-1 border-b border-black pb-2">
              <div className="font-bold border-b border-dotted pb-0.5">--- {isKu ? 'پوختەی فرۆش Sales Summary' : 'ملخص المبيعات Sales Summary'} ---</div>
              <div className="flex justify-between">
                <span>{isKu ? 'ژمارەی پسوڵەکان Invoices Count:' : 'عدد الفواتير Invoices Count:'}</span>
                <span className="font-bold">{invoiceCount}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? 'کۆی کاڵای فرۆشراو Total Items:' : 'إجمالي القطع المباعة Total Items:'}</span>
                <span>{totalItemsSold}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? 'فرۆشی گشتی Gross Sales:' : 'المبيعات الإجمالية Gross Sales:'}</span>
                <span>{settings.currencySymbol}{formatNumber(grossSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? 'داشکاندن Discounts:' : 'الخصومات Discounts:'}</span>
                <span>-{settings.currencySymbol}{formatNumber(totalDiscounts)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? `گەڕێنراوەکان Refunds (${totalReturnedQty} دانە):` : `المرتجعات Refunds (${totalReturnedQty} قطعة):`}</span>
                <span>-{settings.currencySymbol}{formatNumber(totalRefunds)}</span>
              </div>
              <div className="flex justify-between font-black text-xs border-t border-black pt-1">
                <span>{isKu ? 'صافی فرۆش Net Sales:' : 'صافي المبيعات Net Sales:'}</span>
                <span>{settings.currencySymbol}{formatNumber(netSales)}</span>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="space-y-1 border-b border-black pb-2">
              <div className="font-bold border-b border-dotted pb-0.5">--- {isKu ? 'شێوازەکانی پارەدان Payments' : 'طرق الدفع Payments'} ---</div>
              <div className="flex justify-between">
                <span>{isKu ? 'نەقد (Cash):' : 'نقداً (Cash):'}</span>
                <span>{settings.currencySymbol}{formatNumber(cashSalesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? 'کارت (Card POS):' : 'بطاقة (Card POS):'}</span>
                <span>{settings.currencySymbol}{formatNumber(cardSalesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? 'پارەدانی زیرەک (NFC):' : 'دفع ذكي (NFC):'}</span>
                <span>{settings.currencySymbol}{formatNumber(nfcSalesTotal)}</span>
              </div>
            </div>

            {/* Cash Drawer Audit */}
            <div className="space-y-1 border-b border-black pb-2">
              <div className="font-bold border-b border-dotted pb-0.5">--- {isKu ? 'جوڵەی خەزێنە Cash Drawer' : 'حركات الخزنة Cash Drawer'} ---</div>
              <div className="flex justify-between">
                <span>{isKu ? 'باڵانسی سەرەتایی Opening Float:' : 'الرصيد الافتتاحي Opening Float:'}</span>
                <span>{settings.currencySymbol}{formatNumber(initialFloat)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? '(+) وەرگیراوی نەقد Cash In:' : '(+) المقبوضات النقدية Cash In:'}</span>
                <span>+{settings.currencySymbol}{formatNumber(cashSalesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? '(+) دانانی دەستی Deposits:' : '(+) الإيداعات النقدية Deposits:'}</span>
                <span>+{settings.currencySymbol}{formatNumber(totalDeposits)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? '(-) گەڕێنراوی نەقد Cash Refunds:' : '(-) المرتجعات النقدية Cash Refunds:'}</span>
                <span>-{settings.currencySymbol}{formatNumber(totalRefunds)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isKu ? '(-) ڕاکێشان و خەرجی Withdrawals:' : '(-) السحوبات والمصاريف Withdrawals:'}</span>
                <span>-{settings.currencySymbol}{formatNumber(totalWithdrawals)}</span>
              </div>
              <div className="flex justify-between font-black text-xs border-t border-black pt-1">
                <span>{isKu ? 'صافی نەقدی سندوق Net Cash:' : 'صافي النقد بالدرج Net Cash:'}</span>
                <span>{settings.currencySymbol}{formatNumber(expectedCashInDrawer)}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-4 space-y-6 text-[10px] text-center">
              <div className="flex justify-between px-2">
                <div>
                  <p>{isKu ? 'واژۆی کاشێر' : 'توقيع الكاشير'}</p>
                  <p className="mt-4 border-b border-black w-20 mx-auto" />
                </div>
                <div>
                  <p>{isKu ? 'واژۆی سەرپەرشتیار' : 'توقيع المشرف'}</p>
                  <p className="mt-4 border-b border-black w-20 mx-auto" />
                </div>
              </div>
              <p className="text-[9px]">{isKu ? 'ئەم ڕاپۆرتە بە شێوەی ئۆتۆماتیکی لە ڕێگەی سیستەمی POS چاپکراوە' : 'تم طباعة هذا التقرير تلقائياً عبر منظومة إدارة POS'}</p>
            </div>

          </div>
        ) : (
          /* STANDARD A4 REPORT FORMAT */
          <div className="max-w-3xl mx-auto p-6 space-y-6 border border-slate-300 rounded-lg">
            
            <div className="flex justify-between items-center border-b-2 border-black pb-4">
              <div>
                <h1 className="text-xl font-black">{settings.storeNameAr || settings.storeName}</h1>
                <p className="text-xs text-gray-600">{settings.address} | {isKu ? 'تەلەفۆن' : 'هاتف'}: {settings.phone}</p>
              </div>
              <div className="text-right rtl:text-left">
                <h2 className="text-lg font-black text-gray-800">{isKu ? 'ڕاپۆرتی پوختەی نۆبەتی ڕۆژانە' : 'تقرير ملخص الوردية اليومي'}</h2>
                <p className="text-xs text-gray-500">{isKu ? 'بەروار' : 'التاريخ'}: {activeDisplayDateText}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-3 rounded border">
              <div><strong>{isKu ? 'کاشێری بەرپرسیار:' : 'الكاشير المسؤول:'}</strong> {cashierName}</div>
              <div><strong>{isKu ? 'کاتی چاپکردنی ڕاپۆرت:' : 'وقت طباعة التقرير:'}</strong> {new Date().toLocaleTimeString(isKu ? 'ku' : 'ar-SA')}</div>
              <div><strong>{isKu ? 'کۆی گشتی پسوڵەکان:' : 'إجمالي عدد الفواتير:'}</strong> {invoiceCount} {isKu ? 'پسوڵە' : 'فاتورة'}</div>
              <div><strong>{isKu ? 'کۆی کاڵای فرۆشراو:' : 'إجمالي القطع المباعة:'}</strong> {totalItemsSold} {isKu ? 'دانە' : 'قطعة'}</div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-sm border-b pb-1">{isKu ? '١. بەیانی دارایی گشتی (Sales Overview)' : '1. البيان المالي العام (Sales Overview)'}</h3>
              <table className="w-full text-xs border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-right">{isKu ? 'بەیان' : 'البيان'}</th>
                    <th className="border p-2 text-center">{isKu ? 'بڕ' : 'المبلغ'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">{isKu ? 'فرۆشی گشتی (Gross Sales)' : 'إجمالي المبيعات (Gross Sales)'}</td>
                    <td className="border p-2 text-center font-bold">{settings.currencySymbol}{formatNumber(grossSales)}</td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-red-600">(-) {isKu ? 'داشکاندنەکان' : 'الخصومات الترويجية والتخفيضات'}</td>
                    <td className="border p-2 text-center font-bold text-red-600">-{settings.currencySymbol}{formatNumber(totalDiscounts)}</td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-red-600">(-) {isKu ? `بڕی گەڕێنراوە (Refunds) — ژمارە: ${totalReturnedQty} دانە` : `المبالغ المسترجعة (Refunds) — عدد: ${totalReturnedQty} قطعة`}</td>
                    <td className="border p-2 text-center font-bold text-red-600">-{settings.currencySymbol}{formatNumber(totalRefunds)}</td>
                  </tr>
                  <tr className="bg-emerald-50 font-bold">
                    <td className="border p-2 text-emerald-800">(=) {isKu ? 'صافی فرۆشی ڕاستەقینە (Net Sales)' : 'صافي المبيعات الفعلي (Net Sales)'}</td>
                    <td className="border p-2 text-center text-emerald-800 text-sm">{settings.currencySymbol}{formatNumber(netSales)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-sm border-b pb-1">{isKu ? '٢. جوڵە و لێکدانەوەی سندوق و خەزێنە (Cash Drawer Reconciliation)' : '2. حركات وتقريب الخزنة والصندوق (Cash Drawer Reconciliation)'}</h3>
              <table className="w-full text-xs border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-right">{isKu ? 'جۆری جوڵە' : 'نوع الحركة'}</th>
                    <th className="border p-2 text-center">{isKu ? 'بڕ' : 'المبلغ'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">{isKu ? 'باڵانسی سەرەتایی سندوق' : 'الرصيد الافتتاحي للصندوق'}</td>
                    <td className="border p-2 text-center">{settings.currencySymbol}{formatNumber(initialFloat)}</td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-emerald-700">(+) {isKu ? 'وەرگیراوی نەقد لە فرۆشتن' : 'المقبوضات النقدية من المبيعات'}</td>
                    <td className="border p-2 text-center text-emerald-700">+{settings.currencySymbol}{formatNumber(cashSalesTotal)}</td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-emerald-700">(+) {isKu ? 'دانانی نەقدی دەستی' : 'الإيداعات النقدية اليدوية'}</td>
                    <td className="border p-2 text-center text-emerald-700">+{settings.currencySymbol}{formatNumber(totalDeposits)}</td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-red-600">(-) {isKu ? 'گەڕێنراوەی نەقد' : 'المرتجعات النقدية المقتطعة'}</td>
                    <td className="border p-2 text-center text-red-600">-{settings.currencySymbol}{formatNumber(totalRefunds)}</td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-red-600">(-) {isKu ? 'ڕاکێشان و خەرجییە نەقدییەکان' : 'السحوبات والمصاريف النقدية'}</td>
                    <td className="border p-2 text-center text-red-600">-{settings.currencySymbol}{formatNumber(totalWithdrawals)}</td>
                  </tr>
                  <tr className="bg-blue-50 font-bold">
                    <td className="border p-2 text-blue-900">(=) {isKu ? 'صافی کۆتایی چاوەڕوانکراو لە خەزێنە' : 'الصافي النهائي الفعلي المتوقع بالخزنة'}</td>
                    <td className="border p-2 text-center text-blue-900 text-sm">{settings.currencySymbol}{formatNumber(expectedCashInDrawer)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-8 flex justify-between text-xs text-center">
              <div>
                <p className="font-bold">{isKu ? 'واژۆی کاشێری بەرپرسیار' : 'توقيع الكاشير المسؤول'}</p>
                <div className="mt-8 border-b border-black w-36 mx-auto" />
              </div>
              <div>
                <p className="font-bold">{isKu ? 'واژۆی سەرپەرشتیار / بەڕێوەبەر' : 'توقيع مشرف المحل / المدير'}</p>
                <div className="mt-8 border-b border-black w-36 mx-auto" />
              </div>
            </div>

          </div>
        )}

      </div>

      {/* RECEIPT PREVIEW MODAL FOR VIEWING RECEIPT DETAILS */}
      {viewingSale && (
        <ReceiptModal
          sale={viewingSale}
          onClose={() => setViewingSale(null)}
          settings={settings}
        />
      )}

    </div>
  );
};
