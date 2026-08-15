import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  User, 
  Check, 
  X, 
  Calendar,
  Sparkles,
  Home,
  ShoppingBag,
  PackageX,
  Wallet
} from 'lucide-react';
import { Product, SaleTransaction, StoreSettings, UserAccount } from '../types';
import { parseDate, isToday, formatDisplayDateTime } from '../lib/dateUtils';
import { formatNumber } from '../lib/formatUtils';
import { DatePickerDDMMYYYY } from './DatePickerDDMMYYYY';

interface InvoicesTabProps {
  products: Product[];
  salesHistory: SaleTransaction[];
  setSalesHistory?: React.Dispatch<React.SetStateAction<SaleTransaction[]>>;
  settings: StoreSettings;
  userAccounts?: UserAccount[];
  onUpdateSaleCashier?: (saleId: string, newCashierName: string) => void;
  onUpdateSaleDate?: (saleId: string, newTimestamp: string) => void;
  onOpenPOS: () => void;
  onBackToDashboard?: () => void;
  onViewReceipt: (sale: SaleTransaction) => void;
  onOpenReturnForSale?: (sale: SaleTransaction) => void;
}

export const InvoicesTab: React.FC<InvoicesTabProps> = ({
  salesHistory,
  setSalesHistory,
  settings,
  onUpdateSaleDate,
  onOpenPOS,
  onBackToDashboard,
  onViewReceipt,
  onOpenReturnForSale
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  // Filters State for Invoices
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | string>('all');
  const [cashierFilter, setCashierFilter] = useState<'all' | string>('all');
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [customCalendarDate, setCustomCalendarDate] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter sales history
  const filteredSales = salesHistory.filter(sale => {
    if (!sale) return false;

    // Search filter
    const matchesSearch = !searchTerm.trim() ||
      sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sale.cashierName && sale.cashierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : [])).some((i: any) => i?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) || (i?.productNameAr && i?.productNameAr?.includes(searchTerm)));

    // Payment method filter
    const matchesPayment = paymentFilter === 'all' || sale.paymentMethod === paymentFilter;

    // Cashier filter
    const matchesCashier = cashierFilter === 'all' || sale.cashierName === cashierFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilterMode === 'today') {
      matchesDate = isToday(sale.timestamp);
    } else if (dateFilterMode === 'yesterday') {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const parsed = parseDate(sale.timestamp);
      matchesDate = parsed.toDateString() === yest.toDateString();
    } else if (dateFilterMode === 'custom' && customCalendarDate) {
      const saleDate = parseDate(sale.timestamp);
      const formattedSaleDate = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(saleDate.getDate()).padStart(2, '0')}`;
      matchesDate = sale.timestamp.includes(customCalendarDate) || formattedSaleDate === customCalendarDate;
    }

    return matchesSearch && matchesPayment && matchesCashier && matchesDate;
  });

  // Extract unique cashier names from sales history
  const uniqueCashiersFromSales = Array.from(new Set(salesHistory.map(s => s.cashierName).filter(Boolean)));

  // Summary Metrics calculations
  const totalGrossSales = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);

  const totalRefunds = filteredSales.reduce((acc, s) => {
    const safeReturned = Array.isArray(s.returnedItems)
      ? s.returnedItems
      : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);
    const itemReturnsTotal = safeReturned.reduce((rAcc: number, r: any) => rAcc + (r.total || 0), 0);
    const fullRefundTotal = s.status === 'refunded' ? (s.total || 0) : 0;
    return acc + Math.max(itemReturnsTotal, fullRefundTotal);
  }, 0);

  const returnedItemsCount = filteredSales.reduce((acc, s) => {
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

  const netSales = Math.max(0, totalGrossSales - totalRefunds);

  return (
    <div className="space-y-3 animate-fadeIn">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-2.5 font-bold text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP COMPACT CONTROL & SUMMARY BAR */}
      <div className="cyber-card p-3 rounded-2xl border border-blue-500/20 space-y-3 bg-[#0B132B]">
        
        {/* Title + Stats + Quick Reset & EXIT BUTTON Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-black text-slate-100 flex items-center gap-1.5">
              <span>{isKu ? 'نوێترین پسوڵەکان و فرۆشتن' : isAr ? 'جميع الفواتير والمبيعات' : 'All Invoices & Sales'}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
                {filteredSales.length} {isAr ? 'فاتورة' : 'invoices'}
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {(searchTerm || paymentFilter !== 'all' || cashierFilter !== 'all' || dateFilterMode !== 'all' || customCalendarDate) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setPaymentFilter('all');
                  setCashierFilter('all');
                  setDateFilterMode('all');
                  setCustomCalendarDate('');
                }}
                className="text-rose-400 hover:text-rose-300 font-bold text-[11px] underline flex items-center gap-1 cursor-pointer mr-2"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isAr ? 'إعادة ضبط الفلاتر' : isKu ? 'پاكکردنەوەی فلتەر' : 'Reset Filters'}</span>
              </button>
            )}

            {/* EXIT / BACK TO DASHBOARD BUTTON */}
            <button
              type="button"
              onClick={onBackToDashboard || onOpenPOS}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 hover:from-rose-800 hover:to-rose-900 text-rose-100 hover:text-white border border-rose-500/60 text-xs font-black transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.35)] cursor-pointer active:scale-95 shrink-0"
              title={isAr ? 'الخروج من واجهة الفواتير والعودة إلى الواجهة الرئيسية' : isKu ? 'دەرچوون بۆ سەرەکی' : 'Exit to Dashboard'}
            >
              <Home className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span className="font-extrabold">{isAr ? 'الخروج للرئيسية' : isKu ? 'گەڕانەوە بۆ سەرەکی' : 'Exit View'}</span>
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS AT THE TOP */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Card 1: Total Gross Sales */}
          <div className="bg-[#080D1A] p-2.5 rounded-xl border border-emerald-500/30 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">
                {isKu ? 'کۆی گشتی فرۆشتن' : isAr ? 'مجموع المبيعات' : 'Gross Sales'}
              </span>
              <strong className="text-emerald-400 font-mono text-sm font-black">
                {settings.currencySymbol}{formatNumber(totalGrossSales)}
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Total Refunds */}
          <div className="bg-[#080D1A] p-2.5 rounded-xl border border-rose-500/40 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] text-rose-300 font-bold block">
                {isKu ? 'کۆی گشتی گەڕێنراوەکان' : isAr ? 'مجموع المرجوعات' : 'Total Refunds'}
              </span>
              <strong className="text-rose-400 font-mono text-sm font-black">
                -{settings.currencySymbol}{formatNumber(totalRefunds)}
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Returned Items Count */}
          <div className="bg-[#080D1A] p-2.5 rounded-xl border border-amber-500/30 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] text-amber-300 font-bold block">
                {isKu ? 'ژمارەی کاڵا گەڕێنراوەکان' : isAr ? 'عدد المواد المرجوعة' : 'Returned Items Qty'}
              </span>
              <strong className="text-amber-400 font-mono text-sm font-black">
                {formatNumber(returnedItemsCount)} {isAr ? 'قطعة/مادة' : 'items'}
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <PackageX className="w-4 h-4" />
            </div>
          </div>

          {/* Card 4: Net Sales */}
          <div className="bg-[#080D1A] p-2.5 rounded-xl border border-cyan-500/40 flex items-center justify-between shadow-sm bg-gradient-to-r from-cyan-950/30 to-[#080D1A]">
            <div>
              <span className="text-[10px] text-cyan-300 font-bold block">
                {isKu ? 'فرۆشتنی باڵانس (خاوێن)' : isAr ? 'صافي المبيعات (البيع الصافي)' : 'Net Sales'}
              </span>
              <strong className="text-cyan-300 font-mono text-sm font-black">
                {settings.currencySymbol}{formatNumber(netSales)}
              </strong>
              <span className="text-[9px] text-cyan-400/70 block font-semibold">
                {isAr ? '(المبيعات - المرجوعات)' : '(Gross - Refunds)'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ALL FILTERS AT THE TOP ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isAr ? 'بحث برقم الفاتورة، العميل...' : isKu ? 'گەڕان بە پسوڵە، کڕیار...' : 'Search invoice #, customer...'}
              className="w-full bg-[#080D1A] text-xs text-slate-100 placeholder-slate-500 pl-8 rtl:pl-2 rtl:pr-8 pr-2 py-1.5 rounded-xl border border-slate-700 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="relative">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full bg-[#080D1A] text-xs text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-700 focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">💳 {isAr ? 'جميع طرق الدفع' : isKu ? 'هەموو شێوازەکانی دان' : 'All Payment Methods'}</option>
              <option value="cash">💵 {isAr ? 'نقداً (Cash)' : 'Cash'}</option>
              <option value="card">💳 {isAr ? 'بطاقة (Card)' : 'Card'}</option>
              <option value="nfc">📱 {isAr ? 'NFC / دفع إلكتروني' : 'NFC'}</option>
              <option value="debt">📝 {isAr ? 'آجل / ديون (Debt)' : 'Debt'}</option>
            </select>
          </div>

          {/* Cashier Filter */}
          <div className="relative">
            <select
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value)}
              className="w-full bg-[#080D1A] text-xs text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-700 focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">👤 {isAr ? 'جميع الكاشيرية' : isKu ? 'هەموو کاشێرەکان' : 'All Cashiers'}</option>
              {uniqueCashiersFromSales.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Date Mode Filter */}
          <div className="relative">
            <select
              value={dateFilterMode}
              onChange={(e) => {
                const val = e.target.value as any;
                setDateFilterMode(val);
                if (val !== 'custom') setCustomCalendarDate('');
              }}
              className="w-full bg-[#080D1A] text-xs text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-700 focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">📅 {isAr ? 'كل التواريخ' : isKu ? 'هەموو بەروارەکان' : 'All Dates'}</option>
              <option value="today">☀️ {isAr ? 'مبيعات اليوم' : 'Today'}</option>
              <option value="yesterday">🌙 {isAr ? 'مبيعات الأمس' : 'Yesterday'}</option>
              <option value="custom">📆 {isAr ? 'تاريخ محدد من التقويم' : 'Calendar Pick'}</option>
            </select>
          </div>

          {/* INTERACTIVE CALENDAR DATE PICKER (DD/MM/YYYY) */}
          <div className="relative flex items-center gap-1.5 min-w-[170px]">
            <DatePickerDDMMYYYY
              value={customCalendarDate}
              onChange={(dateStr) => {
                setCustomCalendarDate(dateStr);
                if (dateStr) setDateFilterMode('custom');
              }}
              lang={isAr ? 'ar' : isKu ? 'ku' : 'en'}
            />
          </div>

        </div>
      </div>

      {/* ULTRA DENSE MATERIALS & INVOICES TABLE (MAX VISIBILITY) */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0B132B]">
        <table className="w-full text-left rtl:text-right text-[11px] leading-tight">
          <thead>
            <tr className="bg-[#080D1A] border-b border-slate-800 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
              <th className="py-2 px-3">{isKu ? 'ژمارەی پسوڵە' : isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
              <th className="py-2 px-3">{isKu ? 'کات و بەروار' : isAr ? 'التاريخ والوقت' : 'Date & Time'}</th>
              <th className="py-2 px-3">{isKu ? 'کڕیار' : isAr ? 'العميل' : 'Customer'}</th>
              <th className="py-2 px-3">{isKu ? 'کاڵاکان' : isAr ? 'الأصناف' : 'Items'}</th>
              <th className="py-2 px-3">{isKu ? 'شێوازی دان' : isAr ? 'طريقة الدفع' : 'Payment'}</th>
              <th className="py-2 px-3">{isKu ? 'کۆی گشتی' : isAr ? 'الإجمالي' : 'Total'}</th>
              <th className="py-2 px-3">{isKu ? 'کاشێر' : isAr ? 'الكاشير' : 'Cashier'}</th>
              <th className="py-2 px-3">{isKu ? 'دۆخ' : isAr ? 'الحالة' : 'Status'}</th>
              <th className="py-2 px-3 text-center">{isKu ? 'کردار' : isAr ? 'إجراء' : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 space-y-1.5">
                  <FileText className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-bold text-slate-400">
                    {isAr ? 'لا توجد فواتير مبيعات تطابق شروط البحث' : 'No sales invoices match your search filters'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => {
                const isReturned = sale.status === 'refunded' || (sale.returnedItems && sale.returnedItems.length > 0);
                const isFullyRefunded = sale.status === 'refunded';
                const saleItems = Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : []);

                return (
                  <tr 
                    key={sale.id} 
                    onClick={() => onViewReceipt(sale)}
                    className={
                      isReturned
                        ? 'bg-rose-950/45 hover:bg-rose-900/60 text-rose-100 transition-colors group cursor-pointer border-l-4 rtl:border-r-4 rtl:border-l-0 border-rose-500'
                        : 'hover:bg-cyan-950/40 transition-colors group cursor-pointer'
                    }
                  >
                    
                    {/* Invoice # */}
                    <td className={`py-1.5 px-3 font-mono font-bold whitespace-nowrap ${isReturned ? 'text-rose-400 font-extrabold' : 'text-cyan-400'}`}>
                      <div className="flex items-center gap-1">
                        <FileText className={`w-3 h-3 shrink-0 ${isReturned ? 'text-rose-400' : 'text-cyan-500'}`} />
                        <span>{sale.invoiceNumber}</span>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className={`py-1.5 px-3 font-mono text-[10px] whitespace-nowrap ${isReturned ? 'text-rose-200' : 'text-slate-300'}`}>
                      <span className="font-semibold">{formatDisplayDateTime(sale.timestamp, lang)}</span>
                    </td>

                    {/* Customer */}
                    <td className={`py-1.5 px-3 font-medium whitespace-nowrap ${isReturned ? 'text-rose-100' : 'text-slate-200'}`}>
                      {sale.customerName || (isKu ? 'کڕیاری نەقد' : isAr ? 'عميل نقدي' : 'Cash Customer')}
                    </td>

                    {/* Items Count & Preview */}
                    <td className="py-1.5 px-3 text-slate-300">
                      <div className="flex items-center gap-1.5 max-w-[200px] truncate">
                        <span className={`font-bold font-mono text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${isReturned ? 'bg-rose-950 text-rose-300 border-rose-700' : 'bg-cyan-950 text-cyan-300 border-cyan-800/60'}`}>
                          {saleItems.reduce((acc: number, i: any) => acc + (i?.quantity || 0), 0)}x
                        </span>
                        <span className={`text-[10px] truncate ${isReturned ? 'text-rose-200' : 'text-slate-300'}`}>
                          {saleItems.map((i: any) => i?.productNameAr || i?.productName).join(', ')}
                        </span>
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      <span className={`uppercase font-mono text-[9px] font-bold px-2 py-0.5 rounded border ${isReturned ? 'bg-rose-900/80 text-rose-200 border-rose-700' : 'bg-slate-800/90 text-slate-200 border-slate-700'}`}>
                        {sale.paymentMethod}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className={`py-1.5 px-3 font-black text-xs font-mono whitespace-nowrap ${isReturned ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}`}>
                      {isFullyRefunded ? (
                        <span className="line-through opacity-80">{settings.currencySymbol}{formatNumber(sale.total)}</span>
                      ) : (
                        <span>{settings.currencySymbol}{formatNumber(sale.total)}</span>
                      )}
                    </td>

                    {/* Cashier */}
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      <div className={`flex items-center gap-1 font-semibold text-[10px] ${isReturned ? 'text-rose-200' : 'text-slate-300'}`}>
                        <User className={`w-3 h-3 shrink-0 ${isReturned ? 'text-rose-400' : 'text-cyan-400'}`} />
                        <span>{sale.cashierName || (isAr ? 'غير محدد' : 'N/A')}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      {isFullyRefunded ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-2 py-0.5 rounded bg-rose-600 text-white border border-rose-400 shadow-sm animate-pulse">
                          <RotateCcw className="w-2.5 h-2.5" />
                          {isAr ? 'مسترجع بالكامل' : 'Refunded'}
                        </span>
                      ) : sale.returnedItems && sale.returnedItems.length > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-2 py-0.5 rounded bg-rose-900/90 text-rose-200 border border-rose-500 shadow-sm">
                          <RotateCcw className="w-2.5 h-2.5 text-rose-400" />
                          {isAr ? 'مسترجع جزئياً' : 'Partial Return'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {isKu ? 'دراوە' : isAr ? 'مكتملة' : 'Paid'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-1.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewReceipt(sale);
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer border ${isReturned ? 'text-rose-200 bg-rose-600/30 hover:bg-rose-600/50 border-rose-400' : 'text-cyan-300 hover:text-white bg-cyan-500/15 hover:bg-cyan-500/35 border-cyan-500/40'}`}
                        >
                          {isKu ? 'بینین' : isAr ? 'معاينة' : 'Receipt'}
                        </button>

                        {onOpenReturnForSale && sale.status !== 'refunded' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenReturnForSale(sale);
                            }}
                            className="px-1.5 py-0.5 text-[10px] text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/35 border border-rose-500/40 rounded transition-all font-bold cursor-pointer"
                            title={isAr ? 'ترجيع فاتورة' : 'Refund Invoice'}
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

