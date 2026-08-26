import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Crown, 
  Plus, 
  Gift, 
  Award, 
  Phone, 
  Mail, 
  Sparkles, 
  Search, 
  Receipt, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Printer, 
  X, 
  ArrowUpRight, 
  CreditCard, 
  Banknote, 
  TrendingUp, 
  Filter,
  Users,
  Eye,
  Percent,
  Calendar,
  Layers
} from 'lucide-react';
import { Customer, StoreSettings, SaleTransaction, CustomerDebtSettlement } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { formatDisplayDateTime, formatDisplayDate } from '../lib/dateUtils';
import { printSaleReceiptDirect } from '../lib/thermalPrinter';
import { syncWriteDocument } from '../lib/firestoreSync';

interface CustomersTabProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  settings: StoreSettings;
  salesHistory?: SaleTransaction[];
  setSalesHistory?: React.Dispatch<React.SetStateAction<SaleTransaction[]>>;
  onViewReceipt?: (sale: SaleTransaction) => void;
  onOpenPOS?: () => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  setCustomers,
  settings,
  salesHistory = [],
  setSalesHistory,
  onViewReceipt,
  onOpenPOS,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  // Active view filters
  const [filterMode, setFilterMode] = useState<'all' | 'debt_only' | 'orange_receipts'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', initialDebt: 0 });

  // Selected customer for viewing debt receipts modal
  const [selectedCustomerForReceipts, setSelectedCustomerForReceipts] = useState<Customer | null>(null);

  // Selected customer for settling debt modal
  const [selectedCustomerForSettle, setSelectedCustomerForSettle] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [settleNotes, setSettleNotes] = useState<string>('');

  // Loyalty points modal
  const [selectedCustomerForPoints, setSelectedCustomerForPoints] = useState<Customer | null>(null);
  const [pointsAdjustment, setPointsAdjustment] = useState<number>(50);

  // Helper to normalize arabic/kurdish text for robust matching
  const normalizeText = (text: string) => {
    return (text || '')
      .toLowerCase()
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ');
  };

  // Helper to get debt transactions for a specific customer
  const getCustomerDebtSales = (customer: Customer): SaleTransaction[] => {
    const custNameNorm = normalizeText(customer.name);
    const isGenericDebtCust =
      custNameNorm === 'عميل دين / اجل' ||
      custNameNorm === 'عميل دين / آجل' ||
      custNameNorm === 'زبون دين' ||
      custNameNorm === 'کڕیاری قەرز' ||
      custNameNorm === 'debt client' ||
      custNameNorm === 'عميل دين';

    const matched = salesHistory.filter(s => {
      const isDebt = s.paymentMethod === 'debt' || (s.debtAmount !== undefined && s.debtAmount > 0);
      if (!isDebt) return false;

      // 1. Exact Customer ID match
      if (s.customerId && customer.id && s.customerId === customer.id) return true;

      // 2. Customer Name match
      if (s.customerName) {
        const sNameNorm = normalizeText(s.customerName);
        if (sNameNorm === custNameNorm) return true;
        if (isGenericDebtCust && (
          sNameNorm === 'عميل دين / اجل' ||
          sNameNorm === 'عميل دين / آجل' ||
          sNameNorm === 'زبون دين' ||
          sNameNorm === 'کڕیاری قەرز' ||
          sNameNorm === 'debt client' ||
          sNameNorm === 'عميل دين'
        )) {
          return true;
        }
      }

      // 3. Generic fallback
      if (isGenericDebtCust && !s.customerId && (!s.customerName || isGenericDebtCust)) {
        return true;
      }

      return false;
    });

    // Fallback: If customer has recorded debtBalance > 0 but no SaleTransaction matched yet
    if (matched.length === 0 && customer.debtBalance && customer.debtBalance > 0) {
      const virtualVoucher: SaleTransaction = {
        id: `opening-debt-${customer.id}`,
        invoiceNumber: `DEBT-${customer.id.replace(/\D/g, '').slice(-4) || '101'}`,
        timestamp: customer.joinedDate ? `${customer.joinedDate}T12:00:00.000Z` : new Date().toISOString(),
        items: [
          {
            productId: 'opening-debt-item',
            productName: 'Recorded Outstanding Debt',
            productNameAr: 'وصل دين مسجل على الحساب',
            productNameKu: 'پسوولەی قەرزی تۆمارکراو',
            price: customer.debtBalance,
            quantity: 1,
            saleType: 'retail',
            total: customer.debtBalance,
            addedAtTime: '12:00 PM'
          }
        ],
        subtotal: customer.debtBalance,
        tax: 0,
        discount: 0,
        total: customer.debtBalance,
        paymentMethod: 'debt',
        customerId: customer.id,
        customerName: customer.name,
        debtAmount: customer.debtBalance,
        paidAmount: 0,
        amountTendered: 0,
        changeDue: 0,
        cashierName: isAr ? 'الكاشير / قيد آجل' : 'Debt Ledger',
        status: 'completed'
      };
      return [virtualVoucher];
    }

    return matched;
  };

  // All debt transactions across the system (including registered debt customers)
  const allDebtSales = useMemo(() => {
    const rawSales = salesHistory.filter(s => s.paymentMethod === 'debt' || (s.debtAmount && s.debtAmount > 0));

    // Also include any indebted customers whose transactions aren't in rawSales yet
    const standaloneDebtCustomers = customers.filter(c => {
      const balance = c.debtBalance || 0;
      if (balance <= 0) return false;
      const hasSale = rawSales.some(s => 
        (s.customerId && s.customerId === c.id) ||
        (s.customerName && normalizeText(s.customerName) === normalizeText(c.name))
      );
      return !hasSale;
    });

    const synthesizedVouchers: SaleTransaction[] = standaloneDebtCustomers.map(c => ({
      id: `virtual-debt-${c.id}`,
      invoiceNumber: `DEBT-${c.id.replace(/\D/g, '').slice(-4) || '101'}`,
      timestamp: c.joinedDate ? `${c.joinedDate}T12:00:00.000Z` : new Date().toISOString(),
      items: [
        {
          productId: 'opening-debt-item',
          productName: 'Recorded Outstanding Debt',
          productNameAr: 'وصل دين مسجل على الحساب',
          productNameKu: 'پسوولەی قەرزی تۆمارکراو',
          price: c.debtBalance || 0,
          quantity: 1,
          saleType: 'retail',
          total: c.debtBalance || 0,
          addedAtTime: '12:00 PM'
        }
      ],
      subtotal: c.debtBalance || 0,
      tax: 0,
      discount: 0,
      total: c.debtBalance || 0,
      paymentMethod: 'debt',
      customerId: c.id,
      customerName: c.name,
      debtAmount: c.debtBalance || 0,
      paidAmount: 0,
      amountTendered: 0,
      changeDue: 0,
      cashierName: isAr ? 'الكاشير / قيد آجل' : 'Debt Ledger',
      status: 'completed'
    }));

    return [...rawSales, ...synthesizedVouchers];
  }, [salesHistory, customers]);

  // Helper to compute live customer debt balance
  const getCustomerDebtBalance = (customer: Customer): number => {
    if (customer.debtBalance !== undefined && customer.debtBalance !== null) {
      return customer.debtBalance;
    }
    // Fallback computed from transactions
    const debtSales = getCustomerDebtSales(customer);
    const totalDebt = debtSales.reduce((sum, s) => sum + (s.debtAmount || s.total || 0), 0);
    const totalSettled = (customer.settlements || []).reduce((sum, st) => sum + st.amount, 0);
    return Math.max(0, totalDebt - totalSettled);
  };

  // Telemetry KPIs
  const totalDebtAllCustomers = useMemo(() => {
    return customers.reduce((sum, c) => sum + getCustomerDebtBalance(c), 0);
  }, [customers, salesHistory]);

  const indebtedCustomersCount = useMemo(() => {
    return customers.filter(c => getCustomerDebtBalance(c) > 0).length;
  }, [customers, salesHistory]);

  const totalLoyaltyPoints = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
  }, [customers]);

  const totalSpentAll = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  }, [customers]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const debt = getCustomerDebtBalance(c);
      if (filterMode === 'debt_only' && debt <= 0) return false;
      if (selectedTier !== 'ALL' && c.tier !== selectedTier) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = (c.phone || '').includes(q);
        const matchesEmail = (c.email || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail) return false;
      }
      return true;
    });
  }, [customers, filterMode, selectedTier, searchQuery, salesHistory]);

  // Add Customer Handler
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name.trim()) return;

    const created: Customer = {
      id: `cust-${Date.now()}`,
      name: newCust.name.trim(),
      phone: newCust.phone.trim() || '+964 750 000 0000',
      email: newCust.email.trim() || `${newCust.name.replace(/\s+/g, '_').toLowerCase()}@customer.iq`,
      loyaltyPoints: 100, // 100 Welcome Gift points
      totalSpent: newCust.initialDebt > 0 ? newCust.initialDebt : 0,
      debtBalance: newCust.initialDebt > 0 ? newCust.initialDebt : 0,
      visitsCount: 1,
      tier: 'Bronze',
      joinedDate: new Date().toISOString().split('T')[0]
    };

    setCustomers(prev => {
      const updated = [created, ...prev];
      try { localStorage.setItem('supermarket_customers_v1', JSON.stringify(updated)); } catch {}
      syncWriteDocument('customers', created.id, created);
      return updated;
    });

    if (newCust.initialDebt > 0 && setSalesHistory) {
      const initialTx: SaleTransaction = {
        id: `tx-init-${created.id}`,
        invoiceNumber: `DEBT-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString(),
        items: [
          {
            productId: 'init-debt-entry',
            productName: 'Initial Debt Balance',
            productNameAr: 'رصيد دين افتتاحي عند التسجيل',
            productNameKu: 'باڵانسی قەرزی سەرەتایی',
            price: newCust.initialDebt,
            quantity: 1,
            saleType: 'retail',
            total: newCust.initialDebt,
            addedAtTime: '12:00 PM'
          }
        ],
        subtotal: newCust.initialDebt,
        tax: 0,
        discount: 0,
        total: newCust.initialDebt,
        paymentMethod: 'debt',
        customerId: created.id,
        customerName: created.name,
        debtAmount: newCust.initialDebt,
        paidAmount: 0,
        amountTendered: 0,
        changeDue: 0,
        cashierName: isAr ? 'رصيد افتتاحي' : 'Initial Balance',
        status: 'completed'
      };
      setSalesHistory(prev => {
        const updatedSales = [initialTx, ...(prev || [])];
        try { localStorage.setItem('supermarket_sales_v1', JSON.stringify(updatedSales)); } catch {}
        syncWriteDocument('sales', initialTx.id, initialTx);
        return updatedSales;
      });
    }

    setShowAddModal(false);
    setNewCust({ name: '', phone: '', email: '', initialDebt: 0 });
  };

  // Settle Debt Handler
  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForSettle || settleAmount <= 0) return;

    const currentDebt = getCustomerDebtBalance(selectedCustomerForSettle);
    const newDebt = Math.max(0, currentDebt - settleAmount);

    const settlement: CustomerDebtSettlement = {
      id: `settle-${Date.now()}`,
      date: new Date().toISOString(),
      amount: settleAmount,
      paymentMethod: settleMethod,
      notes: settleNotes || (isAr ? 'سداد دفعة نقدية' : 'Debt payment settlement'),
      cashierName: isAr ? 'الكاشير' : 'Cashier'
    };

    setCustomers(prev => {
      return prev.map(c => {
        if (c.id === selectedCustomerForSettle.id) {
          const updated: Customer = {
            ...c,
            debtBalance: newDebt,
            settlements: [settlement, ...(c.settlements || [])],
            loyaltyPoints: (c.loyaltyPoints || 0) + Math.floor(settleAmount / 2000) // reward points on settling debt!
          };
          syncWriteDocument('customers', updated.id, updated);
          return updated;
        }
        return c;
      });
    });

    setSelectedCustomerForSettle(null);
    setSettleAmount(0);
    setSettleNotes('');
  };

  // Adjust Points Handler
  const handleConfirmPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForPoints) return;

    setCustomers(prev => {
      return prev.map(c => {
        if (c.id === selectedCustomerForPoints.id) {
          const updated: Customer = {
            ...c,
            loyaltyPoints: Math.max(0, (c.loyaltyPoints || 0) + pointsAdjustment)
          };
          syncWriteDocument('customers', updated.id, updated);
          return updated;
        }
        return c;
      });
    });

    setSelectedCustomerForPoints(null);
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn text-slate-100">
      
      {/* Top Header & Telemetry Banner */}
      <div className="bg-[#0B1222] p-4 sm:p-5 rounded-3xl border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 shrink-0">
            <UserCheck className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                {isKu ? 'بەرنامەی وەفاداری کڕیاران و تۆماری قەرزەکان (ئەژمێرەکان)' : isAr ? 'برنامج ولاء العملاء وسجلات البيع بالدين والآجل' : 'Customer Loyalty & Orange Debt Ledger'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-500 text-slate-950 shadow-sm animate-pulse">
                ORANGE DEBT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isKu 
                ? 'بەڕێوەبردنی خاڵەکانی وەفاداری، ئاستەکان، و بەدواداچوونی سەرجەم پسوولە و وصلەکانی فرۆشتن بە قەرز بە ڕەنگی پرتەقاڵی' 
                : isAr 
                ? 'متابعة نقاط المكافآت، مستويات العضوية، وعرض وإدارة وصولات البيع بالدين باللون البرتقالي وسدادها فورياً' 
                : 'Track loyalty rewards, membership tiers, and orange debt receipts with instant settlement'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          {onOpenPOS && (
            <button
              type="button"
              onClick={onOpenPOS}
              className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-95"
            >
              <Receipt className="w-4 h-4 text-cyan-400" />
              <span>{isKu ? 'فرۆشتنی نوێ (POS)' : isAr ? 'واجهة البيع (POS)' : 'Open POS'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 text-xs font-black shadow-[0_0_18px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>{isKu ? 'تۆمارکردنی کڕیاری نوێ' : isAr ? 'تسجيل عميل جديد' : 'Register Customer'}</span>
          </button>
        </div>
      </div>

      {/* 4 Financial & Loyalty Telemetry Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 1. Total Debt Across Store (Glowing Orange) */}
        <div className="p-3.5 rounded-2xl bg-[#0F172A] border-2 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] space-y-1 relative overflow-hidden group">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-amber-400" />
              {isKu ? 'کۆی گشتی قەرزی کڕیاران' : isAr ? 'إجمالي ديون العملاء المتبقية' : 'Total Customers Debt'}
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-300 font-mono tracking-tight">
            {settings.currencySymbol}{formatNumber(totalDebtAllCustomers)}
          </p>
          <p className="text-[10px] text-amber-400/80 font-mono">
            {indebtedCustomersCount} {isKu ? 'کڕیار قەرزیان لەسەرە' : isAr ? 'عملاء عليهم ديون حالياً' : 'indebted customers'}
          </p>
        </div>

        {/* 2. Indebted Customers Count */}
        <div className="p-3.5 rounded-2xl bg-[#0B1222] border border-orange-500/30 space-y-1">
          <div className="flex items-center justify-between text-orange-300 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-orange-400" />
              {isKu ? 'ژمارەی کڕیارانی قەرزدار' : isAr ? 'عدد العملاء المدينين' : 'Indebted Members'}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-orange-950 text-orange-300 text-[10px] font-mono border border-orange-500/40">
              {customers.length > 0 ? Math.round((indebtedCustomersCount / customers.length) * 100) : 0}%
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black text-orange-400 font-mono">
            {indebtedCustomersCount} <span className="text-xs font-sans text-slate-400">{isKu ? 'کڕیار' : isAr ? 'عميل' : 'clients'}</span>
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            {isKu ? 'لە کۆی گشتی هەژمارەکان' : isAr ? `من إجمالي ${customers.length} عميل مسجل` : `out of ${customers.length} registered`}
          </p>
        </div>

        {/* 3. Loyalty Points Distributed */}
        <div className="p-3.5 rounded-2xl bg-[#0B1222] border border-pink-500/30 space-y-1">
          <div className="flex items-center justify-between text-pink-300 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-pink-400" />
              {isKu ? 'کۆی خاڵەکانی وەفاداری' : isAr ? 'إجمالي نقاط الولاء الممنوحة' : 'Total Loyalty Points'}
            </span>
            <Gift className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <p className="text-lg sm:text-xl font-black text-pink-400 font-mono">
            {formatNumber(totalLoyaltyPoints)} <span className="text-xs font-sans text-pink-300">{isKu ? 'خاڵ' : isAr ? 'نقطة' : 'pts'}</span>
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            {isKu ? 'خەڵات و بەخششە چالاکەکان' : isAr ? 'قابلة للاستبدال والمكافآت' : 'Redeemable reward points'}
          </p>
        </div>

        {/* 4. Total Member Sales Volume */}
        <div className="p-3.5 rounded-2xl bg-[#0B1222] border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              {isKu ? 'کۆی گشتی کڕینەکان' : isAr ? 'إجمالي مشتريات العملاء' : 'Total Client Sales'}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-500/40">
              VIP
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
            {settings.currencySymbol}{formatNumber(totalSpentAll)}
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            {isKu ? 'سەرجەم سەردان و کڕینەکان' : isAr ? 'عبر برنامج الولاء والعضويات' : 'Cumulative revenue from members'}
          </p>
        </div>
      </div>

      {/* Control Bar: Filters, Search, and Tabs */}
      <div className="bg-[#0A101F] p-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        
        {/* Navigation Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#050914] p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isKu ? 'سەرجەم کڕیاران' : isAr ? 'جميع العملاء' : 'All Customers'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-500/30">
              {customers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('debt_only')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'debt_only'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)] font-black'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Banknote className="w-3.5 h-3.5 text-amber-300" />
            <span>{isKu ? 'کڕیارانی بە قەرز (ئەژمێر)' : isAr ? 'عملاء عليهم دين / آجل' : 'Customers with Debt'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-500/40">
              {indebtedCustomersCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('orange_receipts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'orange_receipts'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] font-black'
                : 'text-amber-400 hover:text-amber-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-amber-300" />
            <span>{isKu ? 'سەرجەم وصلەکانی قەرز (پرتەقاڵی)' : isAr ? 'كافة وصولات الدين (البرتقالية)' : 'Orange Debt Receipts'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-500/40">
              {allDebtSales.length}
            </span>
          </button>
        </div>

        {/* Search Bar & Tier Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKu ? 'گەڕان بەپێی ناوی کڕیار یان تەلەفۆن...' : isAr ? 'بحث بالاسم، رقم الهاتف أو رقم الحساب...' : 'Search by name, phone...'}
              className="w-full bg-[#050914] text-xs text-slate-200 placeholder-slate-500 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl border border-slate-800 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="bg-[#050914] text-xs font-bold text-slate-300 py-2 px-3 rounded-xl border border-slate-800 focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">{isKu ? 'سەرجەم ئاستەکان' : isAr ? 'كافة الفئات' : 'All Tiers'}</option>
            <option value="Bronze">Bronze Member</option>
            <option value="Silver">Silver Member</option>
            <option value="Gold">Gold Member</option>
            <option value="VIP">VIP Club</option>
          </select>
        </div>
      </div>

      {/* VIEW MODE 1: CUSTOMERS CARDS GRID */}
      {filterMode !== 'orange_receipts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-[#0A101F] rounded-3xl border border-slate-800 space-y-3">
              <UserCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">
                {isKu ? 'هیچ کڕیارێک بەم مەرجانە نەدۆزرایەوە' : isAr ? 'لا يوجد عملاء يطابقون خيارات البحث الحالية' : 'No customers match your criteria'}
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setFilterMode('all'); setSelectedTier('ALL'); }}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold"
              >
                {isKu ? 'پاککردنەوەی فلتەرەکان' : isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
              </button>
            </div>
          ) : (
            filteredCustomers.map(c => {
              const debt = getCustomerDebtBalance(c);
              const hasDebt = debt > 0;
              const debtSales = getCustomerDebtSales(c);

              const tierColor = 
                c.tier === 'VIP' ? 'from-purple-500 to-indigo-600 text-purple-300 border-purple-500/40' :
                c.tier === 'Gold' ? 'from-amber-500 to-yellow-600 text-amber-300 border-amber-500/40' :
                c.tier === 'Silver' ? 'from-slate-400 to-slate-500 text-slate-200 border-slate-500/40' :
                'from-orange-600 to-amber-700 text-orange-300 border-orange-500/40';

              return (
                <div 
                  key={c.id} 
                  className={`cyber-card p-4 sm:p-4.5 rounded-3xl border transition-all duration-200 space-y-3 relative group flex flex-col justify-between ${
                    hasDebt 
                      ? 'bg-[#0F172A] border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-400' 
                      : 'bg-[#0B1222] border-blue-500/20 hover:border-blue-500/40'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Avatar + Tier Badge + Debt Indicator */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md ${
                          hasDebt 
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950' 
                            : 'bg-gradient-to-br from-pink-500 to-rose-600 text-white'
                        }`}>
                          {c.name.charAt(0)}
                        </div>

                        <div>
                          <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors leading-tight">
                            {c.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{c.phone || '+964 750 000 0000'}</span>
                          </p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border bg-gradient-to-r ${tierColor} flex items-center gap-1 shrink-0`}>
                        <Crown className="w-3 h-3" />
                        <span>{c.tier}</span>
                      </span>
                    </div>

                    {/* VIBRANT ORANGE DEBT STATUS BANNER (If customer has debt) */}
                    {hasDebt ? (
                      <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-orange-950/70 to-amber-950/80 border-2 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.25)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                            <Banknote className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-300 font-bold block uppercase tracking-wider">
                              {isKu ? 'بڕی قەرزی داواکراو' : isAr ? 'رصيد الدين المستحق' : 'Outstanding Debt'}
                            </span>
                            <span className="text-sm sm:text-base font-black text-amber-300 font-mono drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                              {settings.currencySymbol}{formatNumber(debt)}
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black font-mono">
                          {debtSales.length} {isKu ? 'وصل' : isAr ? 'وصلات' : 'invoices'}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {isKu ? 'هیچ قەرزێکی لەسەر نییە' : isAr ? 'الحساب خالص / لا يوجد دين' : 'No Debt Balance'}
                        </span>
                        <span className="text-[10px] text-emerald-400/80 font-mono">0 {settings.currencySymbol}</span>
                      </div>
                    )}

                    {/* Quick Stats: Loyalty Points & Total Spent */}
                    <div className="p-2.5 rounded-2xl bg-[#070D1A] border border-slate-800/80 grid grid-cols-2 gap-2 text-center text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{isKu ? 'خاڵەکانی وەفاداری' : isAr ? 'نقاط الولاء' : 'Points'}</p>
                        <p className="font-bold text-pink-400 text-xs sm:text-sm flex items-center justify-center gap-1 mt-0.5 font-mono">
                          <Sparkles className="w-3.5 h-3.5" />
                          {formatNumber(c.loyaltyPoints || 0)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{isKu ? 'کۆی کڕینەکان' : isAr ? 'إجمالي المشتريات' : 'Total Spent'}</p>
                        <p className="font-mono font-black text-emerald-400 text-xs sm:text-sm mt-0.5">
                          {settings.currencySymbol}{formatNumber(c.totalSpent || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                      <span>{isKu ? `سەردانەکان: ${c.visitsCount || 1}` : isAr ? `الزيارات: ${c.visitsCount || 1}` : `Visits: ${c.visitsCount || 1}`}</span>
                      <span>{isKu ? `بەروار: ${c.joinedDate || '2026-01-01'}` : isAr ? `انضم: ${c.joinedDate || '2026-01-01'}` : `Joined: ${c.joinedDate || '2026-01-01'}`}</span>
                    </div>
                  </div>

                  {/* BOTTOM ACTION BUTTONS: 1) Orange Debt Receipts Button 2) Settle Debt Button 3) Add Points */}
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    
                    {/* Primary Button: View Orange Debt Receipts */}
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForReceipts(c)}
                      className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        hasDebt
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)] active:scale-98'
                          : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isKu 
                          ? `📄 بینینی وصلەکانی قەرز (${debtSales.length})` 
                          : isAr 
                          ? `📄 وصلات وفواتير الدين (${debtSales.length})` 
                          : `View Orange Debt Receipts (${debtSales.length})`}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Settle Debt Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerForSettle(c);
                          setSettleAmount(debt > 0 ? debt : 0);
                        }}
                        disabled={!hasDebt}
                        className="py-1 px-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 disabled:opacity-40 disabled:pointer-events-none text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title={isAr ? 'تسجيل سداد دفعة من الدين' : 'Settle Debt'}
                      >
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        <span>{isKu ? 'سداد قەرز' : isAr ? 'تسديد دين' : 'Settle'}</span>
                      </button>

                      {/* Gift Points Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerForPoints(c)}
                        className="py-1 px-2 rounded-xl bg-pink-950/50 hover:bg-pink-900/80 border border-pink-500/30 text-pink-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title={isAr ? 'منح نقاط ولاء إضافية' : 'Reward Points'}
                      >
                        <Gift className="w-3 h-3 text-pink-400" />
                        <span>{isKu ? 'پاداشت' : isAr ? 'نقاط مكافأة' : 'Bonus'}</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: ALL ORANGE DEBT RECEIPTS GALLERY */}
      {filterMode === 'orange_receipts' && (
        <div className="space-y-4">
          <div className="bg-[#0B1222] p-4 rounded-3xl border-2 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>{isKu ? 'سەرجەم پسوولە و وصلەکانی فرۆشتن بە قەرز' : isAr ? 'كافة وصولات وفواتير البيع بالدين المسجلة في النظام' : 'All Orange Debt Receipts & Vouchers'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500 text-slate-950 font-bold">
                    {allDebtSales.length} {isKu ? 'پسوولە' : isAr ? 'وصل' : 'receipts'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isKu 
                    ? 'هەموو ئەو وصلانەی کە بە قەرز دەرکراون بە دیزاینی پرتەقاڵی و وردەکاریی تەواوی کاڵاکان' 
                    : isAr 
                    ? 'جميع الفواتير والوصولات المؤجلة باللون البرتقالي مع تفاصيل المواد والمبالغ وإمكانية الطباعة والسداد' 
                    : 'All deferred credit transactions highlighted in orange with full breakdown and thermal print options'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              {isKu ? 'گەڕانەوە بۆ کڕیاران' : isAr ? 'العودة لقائمة العملاء' : 'Back to Customers'}
            </button>
          </div>

          {allDebtSales.length === 0 ? (
            <div className="p-12 text-center bg-[#0A101F] rounded-3xl border border-slate-800 space-y-3">
              <Receipt className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">
                {isKu ? 'هیچ پسوولەیەکی قەرز تا ئێستا تۆمار نەکراوە' : isAr ? 'لا توجد وصولات بيع بالدين مسجلة حتى الآن' : 'No debt receipts registered yet'}
              </p>
              {onOpenPOS && (
                <button
                  type="button"
                  onClick={onOpenPOS}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-lg hover:brightness-110"
                >
                  {isKu ? 'کردنەوەی POS و فرۆشتن بە قەرز' : isAr ? 'فتح واجهة البيع وإجراء بيع بالدين' : 'Open POS & Make Debt Sale'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDebtSales.map(sale => (
                <div
                  key={sale.id}
                  className="bg-[#0F172A] border-2 border-amber-500/70 rounded-3xl p-4.5 space-y-3.5 shadow-[0_0_20px_rgba(245,158,11,0.2)] relative overflow-hidden"
                >
                  {/* ORANGE THERMAL RECEIPT HEADER */}
                  <div className="border-b-2 border-dashed border-amber-500/40 pb-3 flex items-center justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-mono font-black">
                        ORANGE DEBT RECEIPT
                      </span>
                      <h4 className="text-sm font-black text-white mt-1">
                        #{sale.invoiceNumber}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {formatDisplayDateTime(sale.timestamp, settings.language)}
                      </p>
                    </div>

                    <div className="text-right rtl:text-left">
                      <span className="text-xs font-black text-amber-300 font-mono block">
                        {settings.currencySymbol}{formatNumber(sale.debtAmount || sale.total)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {sale.cashierName}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold">{isAr ? 'العميل / صاحب الدين:' : 'Customer:'}</span>
                    <span className="font-black text-amber-300 font-sans">{sale.customerName || (isAr ? 'زبون دين' : 'Debt Customer')}</span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1 text-xs">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? 'المواد داخل الوصل:' : 'Items in Voucher:'}</p>
                    <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-1 bg-[#070D18] p-2 rounded-xl border border-slate-800">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-300 border-b border-slate-800/40 pb-1">
                          <span className="font-bold truncate max-w-[140px]">{item.productNameAr || item.productName}</span>
                          <span className="font-mono text-amber-300">
                            {item.quantity}x • {settings.currencySymbol}{formatNumber(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="p-2.5 rounded-xl bg-[#070D18] border border-amber-500/30 text-xs space-y-1 font-mono">
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>{isAr ? 'إجمالي الفاتورة:' : 'Total Bill:'}</span>
                      <span className="text-white font-bold">{settings.currencySymbol}{formatNumber(sale.total)}</span>
                    </div>
                    <div className="flex justify-between text-amber-400 font-bold border-t border-slate-800 pt-1">
                      <span>{isAr ? 'المبلغ المؤجل بالدين:' : 'Debt Amount:'}</span>
                      <span>{settings.currencySymbol}{formatNumber(sale.debtAmount || sale.total)}</span>
                    </div>
                  </div>

                  {/* Actions: View / Print */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => onViewReceipt && onViewReceipt(sale)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isAr ? 'معاينة وطباعة الوصل' : 'View & Print'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        try { printSaleReceiptDirect(sale, settings); } catch {}
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                      title={isAr ? 'طباعة حرارية فورية' : 'Instant Print'}
                    >
                      <Printer className="w-4 h-4 text-cyan-300" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CUSTOMER'S ORANGE DEBT RECEIPTS MODAL */}
      {selectedCustomerForReceipts && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-[#0B1222] border-2 border-amber-500/70 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col justify-between shadow-[0_0_35px_rgba(245,158,11,0.3)] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-amber-500/30 flex items-center justify-between bg-[#070D1A]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>{isKu ? 'وصلات وفواتير الدين (البرتقالية)' : isAr ? 'وصلات وفواتير الدين (البرتقالية) للعميل' : 'Customer Orange Debt Receipts'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                      {selectedCustomerForReceipts.name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isKu ? `کۆی قەرزی ماوە: ${settings.currencySymbol}${formatNumber(getCustomerDebtBalance(selectedCustomerForReceipts))}` : isAr ? `إجمالي الرصيد المستحق على العميل: ${settings.currencySymbol}${formatNumber(getCustomerDebtBalance(selectedCustomerForReceipts))}` : `Outstanding Debt: ${settings.currencySymbol}${formatNumber(getCustomerDebtBalance(selectedCustomerForReceipts))}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomerForReceipts(null)}
                className="p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Customer Debt Receipts List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 custom-scrollbar text-xs">
              {getCustomerDebtSales(selectedCustomerForReceipts).length === 0 ? (
                <div className="p-8 text-center bg-[#070D1A] rounded-2xl border border-slate-800 space-y-2">
                  <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">
                    {isAr ? 'لا توجد فواتير دين مسجلة لهذا العميل حالياً' : 'No debt receipts for this customer'}
                  </p>
                </div>
              ) : (
                getCustomerDebtSales(selectedCustomerForReceipts).map(sale => (
                  <div
                    key={sale.id}
                    className="p-4 rounded-2xl bg-[#0F172A] border-2 border-amber-500/60 space-y-3 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                  >
                    <div className="flex items-center justify-between border-b border-dashed border-amber-500/30 pb-2">
                      <div>
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                          فاتورة دين برتقالية #{sale.invoiceNumber}
                        </span>
                        <p className="text-[11px] text-slate-400 font-mono mt-1">
                          {formatDisplayDateTime(sale.timestamp, settings.language)} • {sale.cashierName}
                        </p>
                      </div>

                      <div className="text-right rtl:text-left">
                        <span className="text-xs text-slate-400 block">{isAr ? 'المبلغ بالدين:' : 'Debt Amount:'}</span>
                        <span className="text-sm font-black text-amber-300 font-mono">
                          {settings.currencySymbol}{formatNumber(sale.debtAmount || sale.total)}
                        </span>
                      </div>
                    </div>

                    {/* Table of items */}
                    <div className="bg-[#070D18] p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? 'المواد المشتراة:' : 'Purchased Items:'}</p>
                      <div className="divide-y divide-slate-800/60">
                        {sale.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs py-1 text-slate-300">
                            <span className="font-bold">{it.productNameAr || it.productName} ({it.quantity} {it.saleType || 'مفرد'})</span>
                            <span className="font-mono text-emerald-400">{settings.currencySymbol}{formatNumber(it.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (onViewReceipt) onViewReceipt(sale);
                          setSelectedCustomerForReceipts(null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isAr ? 'عرض الفاتورة الكاملة والطباعة' : 'View & Print Receipt'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#070D1A] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCustomerForReceipts(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                {isKu ? 'داخستن' : isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: SETTLE DEBT MODAL */}
      {selectedCustomerForSettle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-[#0B1222] border-2 border-emerald-500/60 rounded-3xl w-full max-w-md shadow-[0_0_35px_rgba(16,185,129,0.25)] overflow-hidden">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-emerald-500/30 flex items-center justify-between bg-[#070D1A]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black shadow-md">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isKu ? 'سداد و دانەوەی قەرزی کڕیار' : isAr ? 'تسجيل سداد دفعة من الدين' : 'Settle Customer Debt'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedCustomerForSettle.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomerForSettle(null)}
                className="p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleConfirmSettle} className="p-4 sm:p-5 space-y-4 text-xs">
              {/* Current Debt Box */}
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between">
                <span className="text-amber-300 font-bold">{isAr ? 'إجمالي الدين الحالي المطلوب:' : 'Current Debt Balance:'}</span>
                <span className="text-base font-black text-amber-300 font-mono">
                  {settings.currencySymbol}{formatNumber(getCustomerDebtBalance(selectedCustomerForSettle))}
                </span>
              </div>

              {/* Settlement Amount Input */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">{isAr ? 'مبلغ السداد المدفوع الآن:' : 'Amount Paid Now:'}</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={settleAmount || ''}
                    onChange={(e) => setSettleAmount(Number(e.target.value))}
                    className="w-full bg-[#050914] text-emerald-300 font-mono font-black text-base p-3 rounded-xl border border-emerald-500/40 focus:border-emerald-400 focus:outline-none"
                    placeholder="0"
                  />
                  <span className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                    {settings.currencySymbol}
                  </span>
                </div>

                {/* Quick amount presets */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setSettleAmount(getCustomerDebtBalance(selectedCustomerForSettle))}
                    className="py-1 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold"
                  >
                    {isAr ? 'كامل الدين 100%' : 'Full 100%'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettleAmount(Math.round(getCustomerDebtBalance(selectedCustomerForSettle) / 2))}
                    className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold"
                  >
                    {isAr ? 'نصف الدين 50%' : 'Half 50%'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettleAmount(10000)}
                    className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold"
                  >
                    10,000 {settings.currencySymbol}
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">{isAr ? 'طريقة دفع السداد:' : 'Payment Method:'}</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSettleMethod('cash')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      settleMethod === 'cash'
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                        : 'bg-[#050914] border-slate-800 text-slate-400'
                    }`}
                  >
                    {isAr ? 'نقداً (كاش)' : 'Cash'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettleMethod('card')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      settleMethod === 'card'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                        : 'bg-[#050914] border-slate-800 text-slate-400'
                    }`}
                  >
                    {isAr ? 'بطاقة' : 'Card'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettleMethod('transfer')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      settleMethod === 'transfer'
                        ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                        : 'bg-[#050914] border-slate-800 text-slate-400'
                    }`}
                  >
                    {isAr ? 'حوالة / زين كاش' : 'Transfer'}
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-slate-400 block">{isAr ? 'ملاحظات وسند السداد (اختياري):' : 'Notes:'}</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: دفعة نقدية بيد الكاشير...' : 'Payment notes...'}
                  className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForSettle(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  {isKu ? 'پاشگەزبوونەوە' : isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black shadow-lg shadow-emerald-500/30 hover:brightness-110 cursor-pointer"
                >
                  {isKu ? 'تەواوکردنی سداد' : isAr ? 'تأكيد وحفظ السداد' : 'Confirm Settlement'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: ADD NEW CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="cyber-card p-5 sm:p-6 rounded-3xl border border-amber-500/40 w-full max-w-md space-y-4 bg-[#0B1222]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <span>{isKu ? 'تۆمارکردنی کڕیاری نوێ لە سیستەم' : isAr ? 'تسجيل عميل جديد وحساب ولاء / دين' : 'Register New Customer Account'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold mb-1 block">{isKu ? 'ناوی سیانیی کڕیار' : isAr ? 'اسم العميل الكامل (الاسم الثلاثي):' : 'Full Name:'}</label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: محمد علي حسن' : 'Full Name'}
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-slate-800 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold mb-1 block">{isKu ? 'ژمارەی تەلەفۆن' : isAr ? 'رقم الهاتف (لإضافة النقاط ومتابعة الدين):' : 'Phone Number:'}</label>
                <input
                  type="text"
                  required
                  placeholder="0750 000 0000"
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-slate-800 focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">{isKu ? 'قەرزی سەرەتایی (ئەگەر هەبێت)' : isAr ? 'رصيد دين سابق أولي (اختياري):' : 'Initial Debt Balance (optional):'}</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newCust.initialDebt || ''}
                  onChange={(e) => setNewCust({ ...newCust, initialDebt: Number(e.target.value) })}
                  className="w-full bg-[#050914] text-amber-300 font-mono p-2.5 rounded-xl border border-slate-800 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-300 text-[11px] flex items-center gap-2">
                <Gift className="w-4 h-4 shrink-0 text-pink-400" />
                <span>{isKu ? 'کڕیار ڕاستەوخۆ ١٠٠ خاڵی دیاری بەدەستدەهێنێت!' : isAr ? 'سيصل العميل فوراً 100 نقطة ولاء كهدية ترحيبية!' : 'Customer receives 100 bonus loyalty points upon sign up!'}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  {isKu ? 'پاشگەزبوونەوە' : isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30 hover:brightness-110"
                >
                  {isKu ? 'تەواوکردنی تۆمارکردن' : isAr ? 'حفظ وتثبيت العميل' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADJUST POINTS MODAL */}
      {selectedCustomerForPoints && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="cyber-card p-5 rounded-3xl border border-pink-500/40 w-full max-w-sm space-y-4 bg-[#0B1222]">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-400" />
              <span>{isAr ? 'منح نقاط ولاء ومكافأة' : 'Reward Loyalty Points'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {selectedCustomerForPoints.name} • {isAr ? 'النقاط الحالية:' : 'Current:'} {selectedCustomerForPoints.loyaltyPoints || 0}
            </p>

            <form onSubmit={handleConfirmPoints} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold mb-1 block">{isAr ? 'النقاط المراد إضافتها:' : 'Points to Add:'}</label>
                <input
                  type="number"
                  required
                  value={pointsAdjustment}
                  onChange={(e) => setPointsAdjustment(Number(e.target.value))}
                  className="w-full bg-[#050914] text-pink-400 font-mono font-bold text-base p-2.5 rounded-xl border border-pink-500/30 focus:border-pink-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForPoints(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-pink-600 text-white font-black shadow-lg hover:brightness-110"
                >
                  {isAr ? 'تأكيد المنح' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
