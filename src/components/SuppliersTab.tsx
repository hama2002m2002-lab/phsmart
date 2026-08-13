import React, { useState, useMemo } from 'react';
import { 
  Truck, Phone, Mail, Star, Plus, DollarSign, Calendar, PackageCheck, AlertCircle,
  Bookmark, CheckCircle2, FileText, Search, Eye, CreditCard, X, MapPin, Receipt,
  Building2, ArrowDownLeft, ArrowUpRight, ShieldCheck, Wallet, RefreshCw
} from 'lucide-react';
import { Supplier, StoreSettings, Product, SupplierPayment } from '../types';
import { formatNumber } from '../lib/formatUtils';

interface SuppliersTabProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  products?: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
  onOpenAddProductForSupplier?: (supplierName: string) => void;
}

export const SuppliersTab: React.FC<SuppliersTabProps> = ({
  suppliers,
  setSuppliers,
  products = [],
  setProducts,
  settings,
  onOpenAddProductForSupplier,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const t = (ar: string, ku: string, en: string) => isKu ? ku : isAr ? ar : en;

  // Filter States
  const [filterTab, setFilterTab] = useState<'all' | 'saved' | 'paid' | 'remaining'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierProductSearch, setSupplierProductSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'history' | 'products' | 'pay'>('history');

  // Quick Payment Modal for a supplier
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'check'>('transfer');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentInvoiceNo, setPaymentInvoiceNo] = useState<string>('');

  // New Supplier Form State
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    nameAr: '',
    contactPerson: '',
    phone: '',
    email: '',
    categorySupplied: 'Dairy & Cheese',
    taxNumber: '',
    address: '',
    totalInvoiced: '',
    totalPaid: '',
    isSaved: false
  });

  // Toggle Save/Bookmark Company
  const toggleSaveSupplier = (supplierId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSuppliers(prev => prev.map(s => {
      if (s.id === supplierId) {
        return { ...s, isSaved: !s.isSaved };
      }
      return s;
    }));
    if (selectedSupplier && selectedSupplier.id === supplierId) {
      setSelectedSupplier(prev => prev ? { ...prev, isSaved: !prev.isSaved } : null);
    }
  };

  // Record a payment to supplier
  const handleRecordPayment = (supplierId: string) => {
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const newPayment: SupplierPayment = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: amountNum,
      paymentMethod,
      note: paymentNote || (isAr ? 'دفعة تسوية حسـاب' : 'Account settlement payment'),
      invoiceNo: paymentInvoiceNo || `INV-${Math.floor(1000 + Math.random() * 9000)}`
    };

    setSuppliers(prev => prev.map(s => {
      if (s.id === supplierId) {
        const currentInvoiced = s.totalInvoiced || s.balanceDue;
        const currentPaid = s.totalPaid || 0;
        const updatedPaid = currentPaid + amountNum;
        const updatedBalance = Math.max(0, currentInvoiced - updatedPaid);
        const updatedPayments = [newPayment, ...(s.payments || [])];

        const updated = {
          ...s,
          totalPaid: updatedPaid,
          balanceDue: updatedBalance,
          payments: updatedPayments
        };

        if (selectedSupplier?.id === supplierId) {
          setSelectedSupplier(updated);
        }
        return updated;
      }
      return s;
    }));

    // Reset payment fields
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentInvoiceNo('');
    setPaymentSupplier(null);
  };

  // Add New Supplier Handler
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const companyName = (newSupplier.name || newSupplier.nameAr).trim();
    if (!companyName) return;

    const invoiced = parseFloat(newSupplier.totalInvoiced) || 0;
    const paid = parseFloat(newSupplier.totalPaid) || 0;
    const balance = Math.max(0, invoiced - paid);

    const created: Supplier = {
      id: `sup-${Date.now()}`,
      name: companyName,
      nameAr: companyName,
      contactPerson: newSupplier.contactPerson || (isAr ? 'قسم المبيعات / المندوب' : 'Sales Dept / Delegate'),
      phone: newSupplier.phone || '+966 50 000 0000',
      email: newSupplier.email.trim() || '',
      categorySupplied: newSupplier.categorySupplied || (isAr ? 'توريدات عامة' : 'General'),
      activeOrders: 0,
      totalInvoiced: invoiced,
      totalPaid: paid,
      balanceDue: balance,
      rating: 5.0,
      avatar: '🏭',
      taxNumber: newSupplier.taxNumber,
      address: newSupplier.address,
      isSaved: newSupplier.isSaved,
      payments: paid > 0 ? [{
        id: `pay-init-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount: paid,
        paymentMethod: 'transfer',
        note: isAr ? 'دفعة افتتاحيـة' : 'Initial payment'
      }] : []
    };

    setSuppliers(prev => [created, ...prev]);
    setShowAddModal(false);
    setNewSupplier({
      name: '',
      nameAr: '',
      contactPerson: '',
      phone: '',
      email: '',
      categorySupplied: 'Dairy & Cheese',
      taxNumber: '',
      address: '',
      totalInvoiced: '',
      totalPaid: '',
      isSaved: false
    });
  };

  // Global Financial Metrics
  const totalSavedCount = suppliers.filter(s => s.isSaved).length;
  const totalInvoicedSum = suppliers.reduce((acc, s) => acc + (s.totalInvoiced ?? s.balanceDue), 0);
  const totalPaidSum = suppliers.reduce((acc, s) => acc + (s.totalPaid ?? 0), 0);
  const totalRemainingSum = suppliers.reduce((acc, s) => acc + s.balanceDue, 0);

  const fullyPaidCount = suppliers.filter(s => s.balanceDue === 0).length;
  const remainingDebtCount = suppliers.filter(s => s.balanceDue > 0).length;

  // Filtered Suppliers list with Barcode & Product Search capabilities
  const filteredSuppliers = suppliers.filter(s => {
    const q = searchQuery.toLowerCase().trim();

    // Check if query matches a barcode or product name in products array
    const matchedProducts = q ? products.filter(p => 
      p.barcode.toLowerCase() === q ||
      p.barcode.toLowerCase().includes(q) ||
      (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.supplierDelegate && p.supplierDelegate.toLowerCase().includes(q))
    ) : [];

    const productSupplierMatches = matchedProducts.some(matchedProduct => 
      matchedProduct.supplierId === s.id ||
      s.name.toLowerCase().includes(matchedProduct.supplierName.toLowerCase()) ||
      s.nameAr.includes(matchedProduct.supplierName) ||
      (matchedProduct.supplierDelegate && (
        s.contactPerson.toLowerCase().includes(matchedProduct.supplierDelegate.toLowerCase()) ||
        s.nameAr.includes(matchedProduct.supplierDelegate) ||
        s.name.toLowerCase().includes(matchedProduct.supplierDelegate.toLowerCase())
      )) ||
      (s.contactPerson && matchedProduct.supplierDelegate && (
        matchedProduct.supplierDelegate.toLowerCase().includes(s.contactPerson.toLowerCase())
      ))
    );

    const matchesQuery = !q || (
      s.name.toLowerCase().includes(q) ||
      s.nameAr.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      s.categorySupplied.toLowerCase().includes(q) ||
      productSupplierMatches
    );

    if (!matchesQuery) return false;

    if (filterTab === 'saved') return s.isSaved;
    if (filterTab === 'paid') return s.balanceDue === 0;
    if (filterTab === 'remaining') return s.balanceDue > 0;

    return true;
  });

  const barcodeSearchQuery = searchQuery.toLowerCase().trim();
  const barcodeMatchedProd = useMemo(() => {
    if (!barcodeSearchQuery) return null;
    return products.find(p => p.barcode && (p.barcode.toLowerCase() === barcodeSearchQuery || p.barcode.toLowerCase().includes(barcodeSearchQuery)));
  }, [barcodeSearchQuery, products]);

  const matchedSupplierProducts = useMemo(() => {
    if (!selectedSupplier) return [];
    return products.filter(p => {
      const belongsToSupplier = 
        p.supplierId === selectedSupplier.id ||
        (selectedSupplier.name && p.supplierName?.toLowerCase().includes(selectedSupplier.name.toLowerCase())) ||
        (selectedSupplier.nameAr && p.supplierName?.includes(selectedSupplier.nameAr)) ||
        (selectedSupplier.contactPerson && p.supplierDelegate?.includes(selectedSupplier.contactPerson)) ||
        (selectedSupplier.nameAr && p.supplierDelegate?.includes(selectedSupplier.nameAr)) ||
        (selectedSupplier.name && p.supplierDelegate?.includes(selectedSupplier.name));
      
      if (!belongsToSupplier) return false;

      if (!supplierProductSearch.trim()) return true;
      const q = supplierProductSearch.toLowerCase().trim();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.categoryAr && p.categoryAr.includes(q))
      );
    });
  }, [selectedSupplier, products, supplierProductSearch]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Page Main Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#0C1427] via-[#101A33] to-[#0D1222] p-5 rounded-3xl border border-blue-500/20 shadow-lg">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-purple-400" />
            <span>{isAr ? 'دليل الموردين وشركات التوريد' : 'Suppliers & Vendors Directory'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAr 
              ? 'متابعة تفاصيل الشركات، الشركات المحفوظة، إجمالي التوريدات، المدفوع بالكامل، والباقي المستحق' 
              : 'Manage vendor accounts, saved companies, total invoices, payments, and balance due'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('إضافة شركة توريد', 'زیادکردنی کۆمپانیای دابینکەر', 'Add Supplier')}</span>
        </button>
      </div>

      {/* Top Financial Stats & Quick Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Stat 1: Total Saved Companies */}
        <div 
          onClick={() => setFilterTab('saved')}
          className={`cyber-card p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            filterTab === 'saved' 
              ? 'border-amber-500/80 bg-gradient-to-br from-amber-950/40 via-[#12192C] to-[#0A0F1D] shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
              : 'border-amber-500/20 bg-[#0A0F1D] hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider">
                {t('شركات محفوظة', 'کۆمپانیا هەڵگیراوەکان', 'Saved Companies')}
              </p>
              <h3 className="text-2xl font-black text-white mt-1 font-mono flex items-baseline gap-1.5">
                <span>{totalSavedCount}</span>
                <span className="text-xs font-normal text-slate-400">{t('شركة', 'کۆمپانیا', 'companies')}</span>
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <Bookmark className="w-6 h-6 fill-amber-400/20" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>{t('المفضلة للمتابعة السريعة', 'دڵخواهەکان بۆ بەدواداچوونی خێرا', 'Bookmarked for quick view')}</span>
            <span className="text-amber-400 font-bold">{t('عرض الكل ←', 'پیشاندانی هەمووی ←', 'View →')}</span>
          </div>
        </div>

        {/* Stat 2: Total Invoiced */}
        <div className="cyber-card p-4 rounded-2xl border border-blue-500/20 bg-[#0A0F1D]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-blue-400/90 uppercase tracking-wider">
                {t('إجمالي التوريدات', 'کۆی دابینکردن', 'Total Invoiced')}
              </p>
              <h3 className="text-[18px] font-black text-white mt-1 font-mono">
                {settings.currencySymbol}{formatNumber(totalInvoicedSum, 2)}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>{t('مجموع قيمة الشحنات الفواتير', 'کۆی بەهای باارکردن و پسوڵەکان', 'Total value of all restock orders')}</span>
            <span className="text-blue-400 font-mono font-bold">{suppliers.length} {t('شركات', 'کۆمپانیا', 'vendors')}</span>
          </div>
        </div>

        {/* Stat 3: Fully Paid (الكل مدفوع) */}
        <div 
          onClick={() => setFilterTab('paid')}
          className={`cyber-card p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            filterTab === 'paid' 
              ? 'border-emerald-500/80 bg-gradient-to-br from-emerald-950/40 via-[#12192C] to-[#0A0F1D] shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
              : 'border-emerald-500/20 bg-[#0A0F1D] hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-400/90 uppercase tracking-wider">
                {t('الكل مدفوع', 'تەواوی دراوە', 'Total Paid')}
              </p>
              <h3 className="text-[18px] font-black text-emerald-400 mt-1 font-mono">
                {settings.currencySymbol}{formatNumber(totalPaidSum, 2)}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">{t('شركات بدون أي ديون', 'کۆمپانیا بێ قەرزەکان', 'Fully settled accounts')}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              {fullyPaidCount} {t('شركات', 'کۆمپانیا', 'settled')}
            </span>
          </div>
        </div>

        {/* Stat 4: Remaining Balance Due (الباقي) */}
        <div 
          onClick={() => setFilterTab('remaining')}
          className={`cyber-card p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            filterTab === 'remaining' 
              ? 'border-rose-500/80 bg-gradient-to-br from-rose-950/40 via-[#12192C] to-[#0A0F1D] shadow-[0_0_20px_rgba(244,63,94,0.2)]' 
              : 'border-rose-500/20 bg-[#0A0F1D] hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-rose-400/90 uppercase tracking-wider">
                {t('الباقي / المستحق', 'ماوە / قەرزی دابینکەر', 'Remaining Balance')}
              </p>
              <h3 className="text-[18px] font-black text-rose-400 mt-1 font-mono">
                {settings.currencySymbol}{formatNumber(totalRemainingSum, 2)}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">{t('ديون مستحقة للدفع', 'قەرزی ماوە بۆ دان', 'Outstanding balances')}</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
              {remainingDebtCount} {t('شركات', 'کۆمپانیا', 'pending')}
            </span>
          </div>
        </div>

      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0A0F1D] p-3 rounded-2xl border border-slate-800">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              filterTab === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{t('جميع الشركات', 'هەموو کۆمپانیاکان', 'All Companies')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {suppliers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('saved')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              filterTab === 'saved'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{t('شركات محفوظة', 'کۆمپانیا هەڵگیراوەکان', 'Saved Companies')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-amber-300">
              {totalSavedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('paid')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              filterTab === 'paid'
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('الكل مدفوع', 'تەواوی دراوە', 'Fully Paid')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-emerald-300">
              {fullyPaidCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('remaining')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              filterTab === 'remaining'
                ? 'bg-rose-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t('الباقي / المستحق', 'ماوە / قەرز', 'Balance Due')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-rose-300">
              {remainingDebtCount}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('البحث باسم الشركة، الباركود، المسؤول، المندوب...', 'گەڕان بە ناوی کۆمپانیا، بارکۆد، بەرپرس...', 'Search by company, barcode, contact, delegate...')}
            className="w-full bg-[#050914] text-slate-200 text-xs py-2 px-9 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Barcode Search Match Notification Banner */}
      {barcodeMatchedProd && (
        <div className="bg-gradient-to-r from-cyan-950 via-[#0C1E38] to-[#0A0F1D] border border-cyan-500/50 p-3.5 rounded-2xl flex items-center justify-between text-xs text-cyan-200 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-lg border border-cyan-500/30">📦</span>
            <div>
              <p className="font-bold text-white text-xs">
                {isAr ? 'نتيجة مطابقة الباركود:' : 'Barcode Search Result:'} <span className="font-mono text-cyan-300 bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-500/40 font-bold">{barcodeMatchedProd.barcode}</span> - <strong className="text-amber-300">{barcodeMatchedProd.nameAr || barcodeMatchedProd.name}</strong>
              </p>
              <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
                <span>👤 {isAr ? 'اسم المندوب / المسؤول:' : 'Delegate / Contact:'} <strong className="text-cyan-300">{barcodeMatchedProd.supplierDelegate || (isAr ? 'غير محدد' : 'N/A')}</strong></span>
                <span>•</span>
                <span>🏭 {isAr ? 'شركة التوريد:' : 'Supplier:'} <strong className="text-purple-300">{barcodeMatchedProd.supplierName}</strong></span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Grid Display */}
      {filteredSuppliers.length === 0 ? (
        <div className="cyber-card p-12 text-center rounded-3xl border border-slate-800 space-y-3">
          <Truck className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-slate-300">
            {isAr ? 'لا يوجد شركات مطابقة للتصفية الحالية' : 'No suppliers match current filter'}
          </h3>
          <p className="text-xs text-slate-500">
            {isAr ? 'جرّب تغيير عبارة البحث أو اختيار تبويب آخر' : 'Try resetting search or switching filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map(s => {
            const invoiced = s.totalInvoiced ?? s.balanceDue;
            const paid = s.totalPaid ?? 0;
            const balance = s.balanceDue;
            const isFullyPaid = balance === 0;

            return (
              <div 
                key={s.id} 
                onClick={() => {
                  setSelectedSupplier(s);
                  setModalActiveTab('history');
                }}
                className={`cyber-card p-4 rounded-3xl border transition-all space-y-3.5 relative group cursor-pointer hover:-translate-y-1 ${
                  s.isSaved 
                    ? 'border-amber-500/30 bg-gradient-to-b from-[#0F172A] to-[#0A0F1D] shadow-[0_0_15px_rgba(245,158,11,0.08)]' 
                    : 'border-blue-500/20 bg-[#090E1A] hover:border-cyan-500/40'
                }`}
              >
                
                {/* Top Header Card Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
                    <span className="text-3xl p-2.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shrink-0 shadow-inner">
                      {s.avatar}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-black text-white truncate group-hover:text-cyan-300 transition-colors">
                          {isAr ? s.nameAr : s.name}
                        </h3>
                        {isFullyPaid ? (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>{isAr ? 'مدفوع بالكامل' : 'Paid'}</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold shrink-0 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>{isAr ? 'عليها متبقي' : 'Debt'}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-purple-400 font-semibold mt-0.5 truncate">
                        {s.categorySupplied}
                      </p>
                    </div>
                  </div>

                  {/* Bookmark Save Action Toggle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => toggleSaveSupplier(s.id, e)}
                      title={s.isSaved ? (isAr ? 'إزالة من المحفوظة' : 'Unbookmark') : (isAr ? 'حفظ الشركة' : 'Bookmark')}
                      className={`p-2 rounded-xl transition-all ${
                        s.isSaved
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-slate-800/60 text-slate-500 hover:text-amber-300 hover:bg-slate-800'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${s.isSaved ? 'fill-amber-400' : ''}`} />
                    </button>

                    <span className="flex items-center text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                      <Star className="w-3 h-3 fill-amber-400 mr-0.5 rtl:ml-0.5" />
                      {s.rating}
                    </span>
                  </div>
                </div>

                {/* Contact Delegate Info */}
                <div className="space-y-1 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <span>👤</span>
                      <span>{isAr ? 'المسؤول:' : 'Contact:'}</span>
                    </span>
                    <span className="font-semibold text-slate-200">{s.contactPerson}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      <span>{isAr ? 'الهاتف:' : 'Phone:'}</span>
                    </span>
                    <span className="font-mono text-slate-300">{s.phone}</span>
                  </div>
                </div>

                {/* Financial Summary Card Box (إجمالي، مدفوع، الباقي) */}
                <div className="bg-[#050914] p-2.5 rounded-2xl border border-slate-800/90 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">{isAr ? 'إجمالي التعامل' : 'Invoiced'}</p>
                    <p className="text-xs font-mono font-bold text-blue-300 mt-0.5">
                      {settings.currencySymbol}{formatNumber(invoiced)}
                    </p>
                  </div>
                  <div className="border-x border-slate-800">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">{isAr ? 'المدفوع' : 'Paid'}</p>
                    <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                      {settings.currencySymbol}{formatNumber(paid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">{isAr ? 'الباقي' : 'Remaining'}</p>
                    <p className={`text-xs font-mono font-black mt-0.5 ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {settings.currencySymbol}{formatNumber(balance)}
                    </p>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSupplier(s);
                      setModalActiveTab('history');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700/60"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isAr ? 'فتح التفاصيل' : 'View Details'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaymentSupplier(s);
                      setPaymentAmount(s.balanceDue > 0 ? s.balanceDue.toString() : '');
                    }}
                    className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تسجيل دفعة' : 'Add Payment'}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* COMPANY DETAILS MODAL (فتح تفاصيل الشركات) */}
      {/* ======================================================== */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="cyber-card w-full max-w-6xl xl:max-w-7xl max-h-[92vh] h-[92vh] bg-[#0A0F1D] border border-cyan-500/40 rounded-3xl flex flex-col overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.2)]">
            
            {/* Modal Top Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0C152B] via-[#0F1C3B] to-[#0A0F1D] border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-center space-x-3.5 rtl:space-x-reverse min-w-0">
                <span className="text-4xl p-3 rounded-2xl bg-slate-800/90 border border-slate-700 shrink-0 shadow-inner">
                  {selectedSupplier.avatar}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-white">
                      {isAr ? selectedSupplier.nameAr : selectedSupplier.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => toggleSaveSupplier(selectedSupplier.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        selectedSupplier.isSaved
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${selectedSupplier.isSaved ? 'fill-amber-300' : ''}`} />
                      <span>{selectedSupplier.isSaved ? (isAr ? 'محفوظة في المفضلة' : 'Saved') : (isAr ? 'حفظ الشركة' : 'Save')}</span>
                    </button>
                  </div>
                  <p className="text-xs text-purple-400 font-semibold mt-1 flex items-center gap-2">
                    <span>{selectedSupplier.categorySupplied}</span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">★ {selectedSupplier.rating}</span>
                    <span>•</span>
                    <span className="text-cyan-300">👤 {selectedSupplier.contactPerson}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSupplier(null)}
                className="p-2.5 rounded-2xl bg-slate-800/90 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-all cursor-pointer"
                title={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Supplier Financial Ledger Banner */}
            <div className="p-3.5 sm:p-4 bg-[#050914] border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#090E1A] p-3.5 rounded-2xl border border-blue-500/20">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isAr ? 'إجمالي التعاملات / التوريدات' : 'Total Invoiced'}</p>
                <p className="text-xl font-mono font-black text-blue-400 mt-1">
                  {settings.currencySymbol}{formatNumber(selectedSupplier.totalInvoiced ?? selectedSupplier.balanceDue)}
                </p>
              </div>

              <div className="bg-[#090E1A] p-3.5 rounded-2xl border border-emerald-500/20">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{isAr ? 'إجمالي المدفوع' : 'Total Paid'}</p>
                <p className="text-xl font-mono font-black text-emerald-400 mt-1">
                  {settings.currencySymbol}{formatNumber(selectedSupplier.totalPaid ?? 0)}
                </p>
              </div>

              <div className={`bg-[#090E1A] p-3.5 rounded-2xl border ${selectedSupplier.balanceDue > 0 ? 'border-rose-500/40 bg-rose-950/10' : 'border-emerald-500/40 bg-emerald-950/10'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isAr ? 'المتبقي (الباقي المستحق)' : 'Remaining Balance'}</p>
                <p className={`text-xl font-mono font-black mt-1 ${selectedSupplier.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {settings.currencySymbol}{formatNumber(selectedSupplier.balanceDue)}
                </p>
              </div>
            </div>

            {/* Modal Info Metadata Bar */}
            <div className="px-5 py-2 bg-[#080D1A] border-b border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <span className="text-slate-500">👤 {isAr ? 'مندوب الشركة:' : 'Contact:'}</span>
                <strong className="text-white font-semibold">{selectedSupplier.contactPerson}</strong>
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-200">{selectedSupplier.phone}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-slate-200">{selectedSupplier.email}</span>
              </span>
              {selectedSupplier.taxNumber && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>{isAr ? 'الرقم الضريبي:' : 'Tax ID:'}</span>
                  <span className="font-mono text-amber-300 font-bold">{selectedSupplier.taxNumber}</span>
                </span>
              )}
            </div>

            {/* Modal Navigation Sub-tabs */}
            <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-800 bg-[#0A0F1D]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModalActiveTab('products')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    modalActiveTab === 'products'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <PackageCheck className="w-4 h-4 text-cyan-400" />
                  <span>{isAr ? 'المواد والأصناف الموردة (دليل المندوب)' : 'Supplied Products'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-[10px] text-cyan-300 font-mono font-bold">
                    {products.filter(p => 
                      p.supplierId === selectedSupplier.id ||
                      p.supplierName?.toLowerCase().includes(selectedSupplier.name.toLowerCase()) ||
                      p.supplierName?.includes(selectedSupplier.nameAr) ||
                      p.supplierDelegate?.includes(selectedSupplier.contactPerson) ||
                      p.supplierDelegate?.includes(selectedSupplier.nameAr) ||
                      p.supplierDelegate?.includes(selectedSupplier.name)
                    ).length}
                  </span>
                </button>

                <button
                  onClick={() => setModalActiveTab('history')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    modalActiveTab === 'history'
                      ? 'border-blue-400 text-blue-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>{isAr ? 'سجل الدفعات والحركات' : 'Payment Ledger'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono font-bold">
                    {selectedSupplier.payments?.length || 0}
                  </span>
                </button>

                <button
                  onClick={() => setModalActiveTab('pay')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    modalActiveTab === 'pay'
                      ? 'border-emerald-400 text-emerald-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'تسجيل دفعة جديدة' : 'Add Payment'}</span>
                </button>
              </div>

              {/* Action Button to Add New Material Directly for this Supplier */}
              {onOpenAddProductForSupplier && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAddProductForSupplier(selectedSupplier.nameAr || selectedSupplier.name);
                  }}
                  className="mb-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 border border-cyan-400/30 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'إدخال مادة جديدة لهذا المندوب' : 'Add Product for Delegate'}</span>
                </button>
              )}
            </div>

            {/* Modal Body Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* TAB 1: Supplied Products (المواد والأصناف الموردة) */}
              {modalActiveTab === 'products' && (
                <div className="space-y-4">
                  
                  {/* Top Products Filter Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050914] p-3 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <PackageCheck className="w-4 h-4 text-cyan-400" />
                        <span>{isAr ? 'قائمة المواد المتوفرة لدى هذا المندوب' : 'Supplier Products Catalog'}</span>
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={supplierProductSearch}
                          onChange={(e) => setSupplierProductSearch(e.target.value)}
                          placeholder={isAr ? 'بحث في مواد هذا المندوب...' : 'Search supplier products...'}
                          className="bg-[#0A0F1D] text-slate-200 text-xs py-1.5 px-8 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 w-48 sm:w-60"
                        />
                      </div>

                      {onOpenAddProductForSupplier && (
                        <button
                          type="button"
                          onClick={() => onOpenAddProductForSupplier(selectedSupplier.nameAr || selectedSupplier.name)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isAr ? 'إضافة مادة' : 'Add Item'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {matchedSupplierProducts.length === 0 ? (
                    <div className="p-10 text-center bg-[#050914] rounded-2xl border border-slate-800/80 space-y-3">
                      <PackageCheck className="w-12 h-12 text-slate-600 mx-auto" />
                      <p className="text-slate-400 text-xs font-semibold">
                        {isAr 
                          ? 'لا يوجد مواد مسجلة باسم هذا المندوب حالياً' 
                          : 'No products currently linked to this delegate'}
                      </p>
                      {onOpenAddProductForSupplier && (
                        <button
                          type="button"
                          onClick={() => onOpenAddProductForSupplier(selectedSupplier.nameAr || selectedSupplier.name)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow hover:brightness-110 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{isAr ? 'إدخال مادة جديدة لهذا المندوب الآن' : 'Add Product for Delegate Now'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {matchedSupplierProducts.map(item => {
                          const stockStatusColor = item.stock === 0 
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                            : item.stock <= item.minStock 
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                          const stockStatusText = item.stock === 0
                            ? (isAr ? 'نفذ من المخزن' : 'Out of Stock')
                            : item.stock <= item.minStock
                            ? (isAr ? 'مخزون منخفض' : 'Low Stock')
                            : (isAr ? 'متوفر بالمخزن' : 'In Stock');

                          return (
                            <div key={item.id} className="p-3.5 bg-[#050914] rounded-2xl border border-slate-800/90 hover:border-cyan-500/40 transition-all space-y-2.5 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl p-2 rounded-xl bg-slate-800/90 border border-slate-700/80 shrink-0">
                                      {item.imageIcon}
                                    </span>
                                    <div className="min-w-0">
                                      <h5 className="font-bold text-slate-100 text-xs truncate">
                                        {isAr ? item.nameAr : item.name}
                                      </h5>
                                      <span className="text-[10px] text-cyan-400 font-mono block">
                                        {item.barcode}
                                      </span>
                                    </div>
                                  </div>

                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${stockStatusColor}`}>
                                    {stockStatusText}
                                  </span>
                                </div>

                                {/* Product Specifications & Financial Grid */}
                                <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-slate-800/80 text-[10px]">
                                  <div className="bg-[#090E1A] p-1.5 rounded-lg border border-slate-800">
                                    <span className="text-slate-500 block">{isAr ? 'إجمالي القطع:' : 'Total Units:'}</span>
                                    <strong className="text-white font-mono">{item.stock} {isAr ? 'قطعة' : 'u'}</strong>
                                  </div>

                                  <div className="bg-[#090E1A] p-1.5 rounded-lg border border-slate-800">
                                    <span className="text-slate-500 block">{isAr ? 'عدد الكراتين:' : 'Cartons:'}</span>
                                    <strong className="text-cyan-300 font-mono">{item.cartonsCount} {isAr ? 'كرتونة' : 'cartons'}</strong>
                                  </div>

                                  <div className="bg-[#090E1A] p-1.5 rounded-lg border border-slate-800">
                                    <span className="text-slate-500 block">{isAr ? 'شراء الكرتون:' : 'Carton Cost:'}</span>
                                    <strong className="text-amber-300 font-mono">{settings.currencySymbol}{item.cartonPurchasePrice}</strong>
                                  </div>

                                  <div className="bg-[#090E1A] p-1.5 rounded-lg border border-slate-800">
                                    <span className="text-slate-500 block">{isAr ? 'سعر البيع مفرد:' : 'Retail Price:'}</span>
                                    <strong className="text-emerald-400 font-mono">{settings.currencySymbol}{item.singleRetailPrice}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Dates & Quick Restock Button */}
                              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                                <span className="text-slate-500">
                                  {isAr ? 'انتهاء:' : 'Exp:'} <strong className="text-amber-400 font-mono">{item.expiryDate || 'N/A'}</strong>
                                </span>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const cartonsToAdd = prompt(
                                      isAr 
                                        ? `إعادة توريد مادة (${item.nameAr}): أدخل عدد الكراتين الإضافية المطلوبة:` 
                                        : `Restock (${item.name}): Enter number of cartons to order:`,
                                      '5'
                                    );
                                    if (cartonsToAdd && !isNaN(Number(cartonsToAdd))) {
                                      const count = parseInt(cartonsToAdd);
                                      if (count > 0 && setProducts) {
                                        const addedUnits = count * (item.unitsPerCarton || 12);
                                        const addedCost = count * (item.cartonPurchasePrice || 24);

                                        setProducts(prev => prev.map(p => {
                                          if (p.id === item.id) {
                                            const newTotal = p.stock + addedUnits;
                                            return {
                                              ...p,
                                              cartonsCount: p.cartonsCount + count,
                                              stock: newTotal,
                                              totalUnits: newTotal,
                                              lastEditDate: new Date().toISOString().split('T')[0],
                                              status: newTotal === 0 ? 'out_of_stock' : newTotal <= p.minStock ? 'low_stock' : 'in_stock'
                                            };
                                          }
                                          return p;
                                        }));

                                        setSuppliers(prev => prev.map(s => {
                                          if (s.id === selectedSupplier.id) {
                                            const newInvoiced = (s.totalInvoiced ?? s.balanceDue) + addedCost;
                                            const newBalance = s.balanceDue + addedCost;
                                            const updated = { ...s, totalInvoiced: newInvoiced, balanceDue: newBalance };
                                            setSelectedSupplier(updated);
                                            return updated;
                                          }
                                          return s;
                                        }));

                                        alert(isAr ? `تم توريد ${count} كرتون (${addedUnits} قطعة) بنجاح وإضافتها للمخزن!` : `Restocked ${count} cartons successfully!`);
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3 text-emerald-400" />
                                  <span>{isAr ? 'طلب شحنة' : 'Restock'}</span>
                                </button>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                  )}
                </div>
              )}

              {/* TAB 2: Payment History */}
              {modalActiveTab === 'history' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-cyan-400" />
                      <span>{isAr ? 'سجل عمليات السداد والدفعات' : 'Payment Transactions Ledger'}</span>
                    </h4>

                    <button
                      onClick={() => {
                        setPaymentAmount(selectedSupplier.balanceDue > 0 ? selectedSupplier.balanceDue.toString() : '');
                        setModalActiveTab('pay');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تسجيل دفعة سداد' : 'Record Payment'}</span>
                    </button>
                  </div>

                  {!selectedSupplier.payments || selectedSupplier.payments.length === 0 ? (
                    <div className="p-8 text-center bg-[#050914] rounded-2xl border border-slate-800 text-slate-500 text-xs">
                      {isAr ? 'لا يوجد دفعات سابقة مسجلة لهذه الشركة حتى الآن' : 'No previous payments recorded for this vendor'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedSupplier.payments.map((p) => (
                        <div key={p.id} className="p-3 bg-[#050914] rounded-2xl border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ArrowDownLeft className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-200">
                                {p.note || (isAr ? 'دفعة سداد حساب' : 'Payment')}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span className="font-mono text-cyan-400">{p.date}</span>
                                <span>•</span>
                                <span className="capitalize text-slate-300">
                                  {p.paymentMethod === 'transfer' ? (isAr ? 'تحويل بنكي' : 'Bank Transfer') : p.paymentMethod === 'cash' ? (isAr ? 'نقدي' : 'Cash') : (isAr ? 'شيك' : 'Check')}
                                </span>
                                {p.invoiceNo && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-amber-300">{p.invoiceNo}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right rtl:text-left font-mono">
                            <span className="text-sm font-black text-emerald-400">
                              +{settings.currencySymbol}{formatNumber(p.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Add New Payment Form */}
              {modalActiveTab === 'pay' && (
                <div className="space-y-4 bg-[#050914] p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>{isAr ? 'تسجيل دفعة سداد جديدة لحساب الشركة' : 'Record New Vendor Payment'}</span>
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 mb-1 block">{isAr ? 'المبلغ المدفوع' : 'Payment Amount'}</label>
                      <div className="relative">
                        <span className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">
                          {settings.currencySymbol}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#0A0F1D] text-white font-mono font-bold text-sm py-2.5 px-8 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 mb-1 block">{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full bg-[#0A0F1D] text-slate-200 p-2.5 rounded-xl border border-slate-700"
                        >
                          <option value="transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                          <option value="cash">{isAr ? 'نقدي (كاش)' : 'Cash'}</option>
                          <option value="check">{isAr ? 'شيك مصرفي' : 'Check'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 mb-1 block">{isAr ? 'رقم الفاتورة / المرجع' : 'Invoice / Ref No'}</label>
                        <input
                          type="text"
                          value={paymentInvoiceNo}
                          onChange={(e) => setPaymentInvoiceNo(e.target.value)}
                          placeholder="INV-1002"
                          className="w-full bg-[#0A0F1D] text-slate-200 p-2.5 rounded-xl border border-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 mb-1 block">{isAr ? 'ملاحظات / بيان الدفعة' : 'Notes / Description'}</label>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder={isAr ? 'مثال: تسوية الشحنة الأخيرة' : 'e.g. Settlement for recent shipment'}
                        className="w-full bg-[#0A0F1D] text-slate-200 p-2.5 rounded-xl border border-slate-700"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRecordPayment(selectedSupplier.id)}
                      disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-50 text-white font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'تأكيد وحفظ الدفعة' : 'Confirm & Save Payment'}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-[#080D1A] border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                {isAr ? 'إغلاق النافذة' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK PAYMENT MODAL (for direct card action) */}
      {/* ======================================================== */}
      {paymentSupplier && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="cyber-card p-6 rounded-3xl border border-emerald-500/40 bg-[#0A0F1D] w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? `تسجيل دفعة: ${paymentSupplier.nameAr}` : `Payment: ${paymentSupplier.name}`}</span>
              </h3>
              <button onClick={() => setPaymentSupplier(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#050914] rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">{isAr ? 'المتبقي الحالي:' : 'Current Balance:'}</span>
              <strong className="text-rose-400 font-mono text-sm">
                {settings.currencySymbol}{formatNumber(paymentSupplier.balanceDue)}
              </strong>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">{isAr ? 'المبلغ' : 'Amount'}</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#050914] text-white font-mono font-bold p-2.5 rounded-xl border border-slate-700"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-slate-700"
                >
                  <option value="transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  <option value="cash">{isAr ? 'نقدي' : 'Cash'}</option>
                  <option value="check">{isAr ? 'شيك' : 'Check'}</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">{isAr ? 'ملاحظة' : 'Note'}</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder={isAr ? 'دفعة سداد' : 'Payment note'}
                  className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentSupplier(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRecordPayment(paymentSupplier.id)}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 disabled:opacity-50 text-white font-bold"
                >
                  {isAr ? 'تأكيد الدفعة' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD SUPPLIER MODAL */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="cyber-card p-6 rounded-3xl border border-purple-500/40 bg-[#0A0F1D] w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <span>{isAr ? 'إضافة شركة توريد جديدة' : 'Add New Supply Partner'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">{isAr ? 'اسم الشركة' : 'Company Name'}</label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value, nameAr: e.target.value })}
                  placeholder={isAr ? 'أدخل اسم شركة التوريد...' : 'Enter company name...'}
                  className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block">{isAr ? 'المسؤول / المندوب' : 'Contact Person'}</label>
                  <input
                    type="text"
                    value={newSupplier.contactPerson}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                    placeholder={isAr ? 'اسم المندوب أو مسؤول المبيعات' : 'Delegate or Sales Rep'}
                    className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1 block">{isAr ? 'التصنيف الرئيسي' : 'Category'}</label>
                  <input
                    type="text"
                    value={newSupplier.categorySupplied}
                    onChange={(e) => setNewSupplier({ ...newSupplier, categorySupplied: e.target.value })}
                    className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block">{isAr ? 'رقم الهاتف' : 'Phone'}</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1 block">{isAr ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder={isAr ? 'يمكن تركه فارغاً' : 'Optional'}
                    className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block">{isAr ? 'الرقم الضريبي' : 'Tax Number'}</label>
                  <input
                    type="text"
                    value={newSupplier.taxNumber}
                    onChange={(e) => setNewSupplier({ ...newSupplier, taxNumber: e.target.value })}
                    className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1 block">{isAr ? 'العنوان' : 'Address'}</label>
                  <input
                    type="text"
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                    className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-blue-500/20"
                  />
                </div>
              </div>

              {/* Financial Initial Setup */}
              <div className="pt-2 border-t border-slate-800">
                <p className="text-[11px] font-bold text-amber-400 mb-2">{isAr ? 'الرصيد المالي المبدئي (اختياري)' : 'Initial Balance (Optional)'}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 mb-1 block">{isAr ? 'إجمالي الفواتير الشحنات' : 'Total Invoiced'}</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={newSupplier.totalInvoiced}
                      onChange={(e) => setNewSupplier({ ...newSupplier, totalInvoiced: e.target.value })}
                      className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 mb-1 block">{isAr ? 'إجمالي المدفوع سلفاً' : 'Total Paid'}</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={newSupplier.totalPaid}
                      onChange={(e) => setNewSupplier({ ...newSupplier, totalPaid: e.target.value })}
                      className="w-full bg-[#050914] text-slate-200 p-2.5 rounded-xl border border-blue-500/20 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="saveSupplier"
                  checked={newSupplier.isSaved}
                  onChange={(e) => setNewSupplier({ ...newSupplier, isSaved: e.target.checked })}
                  className="rounded bg-[#050914] border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="saveSupplier" className="text-slate-300 font-bold">
                  {isAr ? 'حفظ الشركة في قائمة المحفوظة مباشرةً' : 'Add to bookmarked saved companies'}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  {isAr ? 'حفظ شركة التوريد' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
