import React, { useState, useEffect } from 'react';
import { 
  Undo2, 
  X, 
  Search, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Calendar, 
  Package, 
  FileText, 
  DollarSign, 
  Clock, 
  Layers,
  Printer,
  History,
  Truck,
  User,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Download,
  RotateCcw
} from 'lucide-react';
import { Product, StoreSettings, Supplier } from '../types';
import { getTranslation, getProductName } from '../lib/translations';

export interface DelegateReturnRecord {
  id: string;
  voucherNumber: string;
  productId: string;
  productName: string;
  barcode: string;
  delegateName: string;
  supplierId?: string;
  supplierName?: string;
  returnUnitType: 'unit' | 'carton';
  quantity: number;
  unitsPerCarton?: number;
  totalUnitsCalculated: number;
  unitCost: number;
  totalRefundAmount: number;
  reasonType: 'EXPIRED' | 'DEFECTIVE' | 'OVERSTOCK' | 'EXCHANGE' | 'WRONG_DELIVERY' | 'OTHER';
  reasonNote: string;
  settlementMethod: 'cash_refund' | 'deduct_supplier_balance' | 'credit_exchange';
  recordedAt: string;
  cashierName?: string;
  stockDeducted: boolean;
  supplierBalanceUpdated?: boolean;
}

interface DelegateReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  suppliers?: Supplier[];
  setSuppliers?: React.Dispatch<React.SetStateAction<Supplier[]>>;
  settings: StoreSettings;
  cashierName?: string;
}

export const DelegateReturnsModal: React.FC<DelegateReturnsModalProps> = ({
  isOpen,
  onClose,
  products,
  setProducts,
  suppliers = [],
  setSuppliers,
  settings,
  cashierName
}) => {
  if (!isOpen) return null;

  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const t = (ar: string, ku: string, en: string) => isKu ? ku : isAr ? ar : en;

  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [delegateName, setDelegateName] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [returnUnitType, setReturnUnitType] = useState<'unit' | 'carton'>('unit');
  const [quantity, setQuantity] = useState<number>(1);
  const [reasonType, setReasonType] = useState<DelegateReturnRecord['reasonType']>('EXPIRED');
  const [reasonNote, setReasonNote] = useState('');
  const [settlementMethod, setSettlementMethod] = useState<DelegateReturnRecord['settlementMethod']>('cash_refund');
  const [customUnitCost, setCustomUnitCost] = useState<number | null>(null);
  const [autoDeductStock, setAutoDeductStock] = useState(true);
  const [autoUpdateSupplierBalance, setAutoUpdateSupplierBalance] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [printingRecord, setPrintingRecord] = useState<DelegateReturnRecord | null>(null);

  // History Search & Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyReasonFilter, setHistoryReasonFilter] = useState<string>('ALL');

  // Persistent Delegate Returns Logs
  const [delegateLogs, setDelegateLogs] = useState<DelegateReturnRecord[]>(() => {
    try {
      const saved = localStorage.getItem('pos_delegate_returns_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pos_delegate_returns_logs', JSON.stringify(delegateLogs));
    } catch (err) {
      console.warn('Failed to save delegate returns logs:', err);
    }
  }, [delegateLogs]);

  // When a product is selected, auto-fill delegate and costs
  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    setSearch('');
    
    // Auto populate delegate name
    if (p.supplierDelegate) {
      setDelegateName(p.supplierDelegate);
    } else if (p.supplierName) {
      setDelegateName(p.supplierName);
    }

    // Auto match supplier
    if (p.supplierId) {
      setSelectedSupplierId(p.supplierId);
    } else {
      const matched = suppliers.find(s => 
        s.name === p.supplierDelegate || 
        s.nameAr === p.supplierDelegate || 
        s.contactPerson === p.supplierDelegate ||
        s.name === p.supplierName ||
        s.nameAr === p.supplierName
      );
      if (matched) {
        setSelectedSupplierId(matched.id);
      }
    }

    const defaultUnitCost = p.costPerUnit || p.cost || (p.cartonPurchasePrice / (p.unitsPerCarton || 1)) || 0;
    setCustomUnitCost(defaultUnitCost);
  };

  // Filter products for search
  const filteredProducts = search.trim()
    ? products.filter(
        p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.nameAr && p.nameAr.toLowerCase().includes(search.toLowerCase())) ||
          (p.barcode && p.barcode.includes(search)) ||
          (p.supplierDelegate && p.supplierDelegate.toLowerCase().includes(search.toLowerCase())) ||
          (p.supplierName && p.supplierName.toLowerCase().includes(search.toLowerCase()))
      )
    : products.slice(0, 10);

  // Cost calculation
  const unitsPerCarton = selectedProduct?.unitsPerCarton || 1;
  const currentUnitCost = customUnitCost ?? (selectedProduct?.costPerUnit || selectedProduct?.cost || 0);
  const effectiveCostPerSelectedUnit = returnUnitType === 'carton' 
    ? (selectedProduct?.cartonPurchasePrice || currentUnitCost * unitsPerCarton) 
    : currentUnitCost;
  const totalUnitsCalculated = returnUnitType === 'carton' ? quantity * unitsPerCarton : quantity;
  const totalRefundAmount = effectiveCostPerSelectedUnit * quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert(isAr ? 'يرجى اختيار المادة المراد إرجاعها أولاً' : isKu ? 'تکایە سەرەتا کاڵا دیاری بکە' : 'Please select a product first');
      return;
    }
    if (quantity <= 0) {
      alert(isAr ? 'يرجى تحديد كمية إرجاع أكبر من الصفر' : isKu ? 'تکایە بڕی گەڕاندنەوە لە سفر زیاتر بێت' : 'Quantity must be greater than 0');
      return;
    }
    if (!delegateName.trim()) {
      alert(isAr ? 'يرجى كتابة أو تحديد اسم المندوب / المورد المستلم' : isKu ? 'تکایە ناوی مەندوب یان کۆمپانیا بنووسە' : 'Please specify delegate / vendor name');
      return;
    }

    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const voucherNumber = `DEL-RET-${Date.now().toString().slice(-6)}`;

    const newRecord: DelegateReturnRecord = {
      id: `del-ret-${Date.now()}`,
      voucherNumber,
      productId: selectedProduct.id,
      productName: getProductName(selectedProduct, lang),
      barcode: selectedProduct.barcode,
      delegateName: delegateName.trim(),
      supplierId: selectedSupplierId || undefined,
      supplierName: suppliers.find(s => s.id === selectedSupplierId)?.nameAr || selectedProduct.supplierName || delegateName.trim(),
      returnUnitType,
      quantity,
      unitsPerCarton,
      totalUnitsCalculated,
      unitCost: effectiveCostPerSelectedUnit,
      totalRefundAmount,
      reasonType,
      reasonNote: reasonNote.trim() || getDefaultReasonLabel(reasonType),
      settlementMethod,
      recordedAt: nowStr,
      cashierName: cashierName || (isAr ? 'المسؤول الحالي' : 'Store Keeper'),
      stockDeducted: autoDeductStock,
      supplierBalanceUpdated: autoUpdateSupplierBalance && settlementMethod === 'deduct_supplier_balance' && !!selectedSupplierId
    };

    // 1. Auto-deduct stock if enabled
    if (autoDeductStock) {
      setProducts(prevProducts =>
        prevProducts.map(p => {
          if (p.id === selectedProduct.id) {
            const currentStock = p.totalUnits || p.stock || 0;
            const updatedStock = Math.max(0, currentStock - totalUnitsCalculated);
            const pUnitsPerCarton = p.unitsPerCarton || 1;
            const updatedCartons = Math.floor(updatedStock / pUnitsPerCarton);

            return {
              ...p,
              stock: updatedStock,
              totalUnits: updatedStock,
              cartonsCount: updatedCartons,
              status: updatedStock === 0 ? 'out_of_stock' : updatedStock <= p.minStock ? 'low_stock' : 'in_stock'
            };
          }
          return p;
        })
      );
    }

    // 2. Auto update supplier ledger / balance if deduct_supplier_balance
    if (autoUpdateSupplierBalance && settlementMethod === 'deduct_supplier_balance' && selectedSupplierId && setSuppliers) {
      setSuppliers(prevSuppliers =>
        prevSuppliers.map(s => {
          if (s.id === selectedSupplierId) {
            const currentDue = s.balanceDue || 0;
            const newDue = Math.max(0, currentDue - totalRefundAmount);
            const newPayment = {
              id: `del-ret-pay-${Date.now()}`,
              date: nowStr.split(' ')[0],
              amount: totalRefundAmount,
              paymentMethod: 'cash' as const,
              note: `${isAr ? 'خصم مرتجع بضاعة للمندوب' : isKu ? 'داشکاندنی گەڕاندنەوەی کاڵا بۆ مەندوب' : 'Delegate Return Credit'} [${voucherNumber}] - ${getProductName(selectedProduct, lang)}`,
              invoiceNo: voucherNumber
            };

            return {
              ...s,
              balanceDue: newDue,
              payments: [newPayment, ...(s.payments || [])]
            };
          }
          return s;
        })
      );
    }

    // 3. Save Record
    setDelegateLogs(prev => [newRecord, ...prev]);

    // 4. Reset Form
    setSelectedProduct(null);
    setDelegateName('');
    setSelectedSupplierId('');
    setQuantity(1);
    setReasonNote('');
    setCustomUnitCost(null);
    setSuccessMsg(isAr 
      ? `تم توثيق إرجاع البضاعة للمندوب بنجاح! برقم سند: [${voucherNumber}]` 
      : isKu 
      ? `گەڕاندنەوەی کاڵا بۆ مەندوب بە سەرکەوتوویی تۆمارکرا! وەسڵ: [${voucherNumber}]` 
      : `Delegate return recorded successfully! Voucher: [${voucherNumber}]`
    );

    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleDeleteLog = (id: string) => {
    if (confirm(isAr ? 'هل أنت متأكد من رغبتك بحذف هذا السند من الأرشيف؟' : isKu ? 'ئایا دڵنیایت لە سڕینەوەی ئەم وەسڵە؟' : 'Are you sure you want to delete this return record?')) {
      setDelegateLogs(prev => prev.filter(item => item.id !== id));
    }
  };

  const getDefaultReasonLabel = (type: DelegateReturnRecord['reasonType']) => {
    switch (type) {
      case 'EXPIRED':
        return t('⏳ منتهي الصلاحية أو قرب الانتهاء', '⏳ بەسەرچوو یان نزیک بەسەرچوون', 'Expired or Near Expiry');
      case 'DEFECTIVE':
        return t('💥 عيب مصنعي أو متلف أو مكسور', '💥 عەیبی دروستکردن یان شکاو', 'Manufacturer Defect / Damaged');
      case 'OVERSTOCK':
        return t('📦 راكد أو فائض بالمخزون', '📦 کاڵای ڕاکاو یان زیادە لە کۆگا', 'Overstock / Slow Moving');
      case 'EXCHANGE':
        return t('🔁 استبدال بضاعة أو أصناف جديدة', '🔁 گۆڕینەوەی کاڵا لەگەڵ کاڵای نوێ', 'Goods Exchange');
      case 'WRONG_DELIVERY':
        return t('❌ خطأ في التوريد أو الشحنة', '❌ هەڵە لە ناردنی کاڵا', 'Wrong Delivery / Item');
      case 'OTHER':
        return t('📝 سبب آخر موثق', '📝 هۆکاری تر', 'Other Reason');
    }
  };

  const getSettlementBadge = (method: DelegateReturnRecord['settlementMethod']) => {
    switch (method) {
      case 'cash_refund':
        return {
          label: t('💵 استرداد نقدي فوري من المندوب', '💵 وەرگرتنەوەی پارەی نەختینە', 'Instant Cash Refund'),
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
      case 'deduct_supplier_balance':
        return {
          label: t('📉 خصم من حساب ورصيد المورد', '📉 داشکاندن لە قەرزی کۆمپانیا', 'Deduct from Supplier Balance'),
          color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
        };
      case 'credit_exchange':
        return {
          label: t('🔄 استبدال بنفس القيمة لاحقاً', '🔄 گۆڕینەوە بە کاڵای تر', 'Exchange Credit Pending'),
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        };
    }
  };

  // KPIs
  const totalRefundAmountAllTime = delegateLogs.reduce((sum, item) => sum + item.totalRefundAmount, 0);
  const totalUnitsReturnedAllTime = delegateLogs.reduce((sum, item) => sum + item.totalUnitsCalculated, 0);

  // History Filtering
  const filteredHistoryLogs = delegateLogs.filter(log => {
    const matchSearch = historySearch.trim() === '' ||
      log.productName.toLowerCase().includes(historySearch.toLowerCase()) ||
      log.delegateName.toLowerCase().includes(historySearch.toLowerCase()) ||
      log.barcode.includes(historySearch) ||
      log.voucherNumber.toLowerCase().includes(historySearch.toLowerCase());

    const matchReason = historyReasonFilter === 'ALL' || log.reasonType === historyReasonFilter;

    return matchSearch && matchReason;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn dir-rtl">
      <div className="bg-[#0B132B] text-slate-100 rounded-3xl border-2 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.25)] w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border-b border-amber-500/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Undo2 className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{isAr ? 'إرجاع واسترداد مواد إلى مندوب / مورد' : isKu ? 'گەڕاندنەوەی کاڵا بۆ مەندوب و کۆمپانیاکان' : 'Return Items to Supplier / Delegate'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  VENDOR RETURNS
                </span>
              </h2>
              <p className="text-xs text-amber-300/80 font-medium">
                {isAr ? 'توثيق بضائع المرتجعات للمندوبين، استرداد المبالغ، خصم المخزن، وتحديث حسابات الشركات' : 'Document vendor return slips, auto-deduct stock, and balance settlements'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white transition-all border border-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#070D1C] border-b border-slate-800 text-xs font-bold">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('NEW')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'NEW'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'تسجيل إرجاع جديد للمندوب' : isKu ? 'تۆمارکردنی گەڕاندنەوەی نوێ' : 'Record New Return'}</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{isAr ? 'سجل وأرشيف المرتجعات' : isKu ? 'ئەرشیفی گەڕاندنەوەکان' : 'Returns History Archive'} ({delegateLogs.length})</span>
            </button>
          </div>

          {delegateLogs.length > 0 && (
            <div className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950/60 px-3 py-1 rounded-xl border border-amber-500/30">
              {isAr ? 'إجمالي المرتجعات:' : 'Total Refunded:'} {totalRefundAmountAllTime.toLocaleString()} {settings.currencySymbol}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
          
          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'NEW' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* SECTION 1: Product Selection & Search */}
              <div className="p-4 rounded-2xl bg-[#070D1C] border border-amber-500/30 space-y-3 shadow-md">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>{isAr ? '1. اختر المادة المراد إرجاعها إلى المندوب (بحث بالاسم أو الباركود):' : isKu ? '١. کاڵاکە دیاری بکە (گەڕان بە ناو یان بارکۆد):' : '1. Select Product to Return (Search by Name/Barcode):'}</span>
                </label>

                {!selectedProduct ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={isAr ? 'ابحث باسم المادة، الباركود، أو اسم المندوب المسجل...' : isKu ? 'گەڕان بەپێی ناوی کاڵا، بارکۆد، ناوی مەندوب...' : 'Search product name, barcode or delegate...'}
                        className="w-full bg-[#0B132B] text-xs font-mono text-cyan-200 placeholder-slate-500 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2.5 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                      {filteredProducts.map(p => {
                        const unitCost = p.costPerUnit || p.cost || (p.cartonPurchasePrice / (p.unitsPerCarton || 1)) || 0;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProduct(p)}
                            className="p-2.5 rounded-xl bg-[#0B132B] hover:bg-[#132247] border border-slate-800 hover:border-amber-500/50 cursor-pointer flex items-center justify-between transition-all group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xl p-1 bg-slate-800 rounded-lg">{p.imageIcon || '📦'}</span>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                                  {getProductName(p, lang)}
                                </h4>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                                  <span>{p.barcode}</span>
                                  {p.supplierDelegate && (
                                    <span className="text-cyan-300 bg-cyan-950/60 px-1.5 py-0.2 rounded">👤 {p.supplierDelegate}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right rtl:text-right ltr:text-left shrink-0">
                              <span className="text-xs font-bold font-mono text-amber-300 block">
                                {settings.currencySymbol}{unitCost.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {isAr ? 'المتوفر:' : 'Stock:'} {p.stock}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-[#0B132B] border border-amber-500/40 flex items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-3xl p-2 bg-slate-800 rounded-2xl">{selectedProduct.imageIcon || '📦'}</span>
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="text-sm font-bold text-white truncate">
                          {getProductName(selectedProduct, lang)}
                        </h4>
                        <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-300">
                          <span className="bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                            {isAr ? 'باركود:' : 'Barcode:'} {selectedProduct.barcode}
                          </span>
                          <span className="bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            {isAr ? 'المخزون الحالي:' : 'Current Stock:'} {selectedProduct.stock} {isAr ? 'قطعة' : 'units'}
                          </span>
                          {selectedProduct.expiryDate && (
                            <span className="bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded-md border border-purple-500/30">
                              {isAr ? 'الصلاحية:' : 'Expiry:'} {selectedProduct.expiryDate}
                            </span>
                          )}
                          {selectedProduct.unitsPerCarton && selectedProduct.unitsPerCarton > 1 && (
                            <span className="bg-blue-950/80 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/30">
                              {isAr ? 'الكرتونة:' : 'Per Carton:'} {selectedProduct.unitsPerCarton} {isAr ? 'قطعة' : 'units'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold shrink-0 border border-slate-700 cursor-pointer"
                    >
                      {isAr ? 'تغيير المادة' : isKu ? 'گۆڕینی کاڵا' : 'Change Product'}
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 2: Delegate & Supplier Information */}
              <div className="p-4 rounded-2xl bg-[#070D1C] border border-amber-500/30 space-y-3">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{t('2. بيانات المندوب / الشركة المستلمة للبضاعة:', '٢. زانیاری مەندوب یان کۆمپانیای وەرگری کاڵا:', '2. Delegate & Supplier Info:')}</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-semibold">
                      {t('اسم المندوب / الشخص المستلم:', 'ناوی مەندوب / کەسی وەرگر:', 'Delegate Name / Receiver:')} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={delegateName}
                      onChange={(e) => setDelegateName(e.target.value)}
                      placeholder={t('مثال: مندوب شركة دجلة / علي أحمد', 'نموونە: مەندوبی کۆمپانیا / عەلی ئەحمەد', 'e.g. Vendor Representative')}
                      className="w-full bg-[#0B132B] text-xs text-slate-100 px-3 py-2 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none font-sans"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-semibold">
                      {t('الشركة / المورد المسجل بالنظام (اختياري للربط المالي):', 'کۆمپانیا / دابینکەری تۆمارکراو لە سیستم (ئارەزوومەندانە):', 'Linked Supplier (Optional):')}
                    </label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full bg-[#0B132B] text-xs text-slate-100 px-3 py-2 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="">{t('-- مندوب عام أو غير مسجل كشركة --', '-- مەندوبی گشتی یان تۆمارنەکراو --', '-- General Vendor / Unlinked --')}</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nameAr || s.name} {s.balanceDue ? `(${t('رصيد متبقي:', 'باڵانسی ماوە:', 'Due:')} ${s.balanceDue.toLocaleString()} ${settings.currencySymbol})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Return Quantities, Unit Types & Cost Calculations */}
              <div className="p-4 rounded-2xl bg-[#070D1C] border border-amber-500/30 space-y-3">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>{t('3. تفاصيل الكميات المرتجعة واحتساب قيمة الاسترداد:', '٣. وردەکاری بڕی گەڕاوە و بەهای وەرگرتنەوە:', '3. Return Quantity & Refund Value Calculations:')}</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Unit Type (Units vs Cartons) */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-semibold">
                      {t('نوع وحدة الإرجاع:', 'جۆری یەکەی گەڕاندنەوە:', 'Return Unit Type:')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setReturnUnitType('unit')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                          returnUnitType === 'unit'
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
                            : 'bg-[#0B132B] text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {t('بالقطعة المفردة', 'بە تاک / دانە', 'Per Unit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReturnUnitType('carton')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                          returnUnitType === 'carton'
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
                            : 'bg-[#0B132B] text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {t('بالكرتون الكامل', 'بە کارتۆنی تەواو', 'Per Carton')}
                      </button>
                    </div>
                  </div>

                  {/* Return Quantity */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-semibold">
                      {returnUnitType === 'carton' 
                        ? t('عدد الكراتين المرجعة:', 'ژمارەی کارتۆنی گەڕاوە:', 'Cartons Quantity:')
                        : t('عدد القطع المرجعة:', 'ژمارەی دانەی گەڕاوە:', 'Units Quantity:')} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-[#0B132B] text-xs font-mono font-bold text-center text-amber-300 px-3 py-2 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Unit Purchase / Cost Price */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-semibold">
                      {returnUnitType === 'carton' 
                        ? t('سعر شراء الكرتون:', 'نرخی کڕینی کارتۆن:', 'Carton Cost:')
                        : t('سعر تكلفة القطعة:', 'نرخی تێچوونی دانە:', 'Unit Cost:')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={effectiveCostPerSelectedUnit}
                      onChange={(e) => setCustomUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0B132B] text-xs font-mono font-bold text-center text-cyan-300 px-3 py-2 rounded-xl border border-slate-700 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Total Summary Banner */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>
                      {t('مجموع القطع المسترجعة:', 'کۆی گشتی دانەی گەڕاوە:', 'Total Units:')} <strong className="text-amber-300 font-mono">{totalUnitsCalculated}</strong> {t('قطعة', 'دانە', 'units')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>{t('إجمالي المبلغ المستحق من المندوب:', 'کۆی بڕی پارەی وەرگیراوە لە مەندوب:', 'Total Refund Amount:')}</span>
                    <strong className="text-sm sm:text-base font-black font-mono text-emerald-400">
                      {settings.currencySymbol}{totalRefundAmount.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Reason & Settlement Method */}
              <div className="p-4 rounded-2xl bg-[#070D1C] border border-amber-500/30 space-y-3">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{t('4. سبب الإرجاع وطريقة التسوية المالية مع المندوب:', '٤. هۆکاری گەڕاندنەوە و شێوازی پاکتاوکردنی دارایی لەگەڵ مەندوب:', '4. Return Reason & Settlement Method:')}</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Reason Type */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-semibold">
                      {t('سبب الإرجاع للمندوب:', 'هۆکاری گەڕاندنەوە بۆ مەندوب:', 'Return Reason:')}
                    </label>
                    <select
                      value={reasonType}
                      onChange={(e) => setReasonType(e.target.value as any)}
                      className="w-full bg-[#0B132B] text-xs text-slate-100 px-3 py-2 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="EXPIRED">⏳ {t('منتهي الصلاحية أو قرب الانتهاء', 'بەسەرچوو یان نزیک بەسەرچوون', 'Expired / Near Expiry')}</option>
                      <option value="DEFECTIVE">💥 {t('عيب مصنعي أو متلف أو مكسور', 'عەیبی دروستکردن یان شکاو', 'Manufacturer Defect / Damaged')}</option>
                      <option value="OVERSTOCK">📦 {t('راكد أو فائض بالمخزون', 'کاڵای ڕاکاو یان زیادە لە کۆگا', 'Overstock / Slow Moving')}</option>
                      <option value="EXCHANGE">🔁 {t('استبدال بضاعة أو أصناف جديدة', 'گۆڕینەوەی کاڵا بە کاڵای نوێ', 'Item Exchange')}</option>
                      <option value="WRONG_DELIVERY">❌ {t('خطأ في التوريد أو الشحنة', 'هەڵە لە ناردنی کاڵا', 'Wrong Delivery / Item')}</option>
                      <option value="OTHER">📝 {t('سبب آخر موثق', 'هۆکاری تر', 'Other Reason')}</option>
                    </select>
                  </div>

                  {/* Settlement Method */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 font-semibold">
                      {t('طريقة التسوية المالية:', 'شێوازی پاکتاوکردنی دارایی:', 'Settlement Method:')}
                    </label>
                    <select
                      value={settlementMethod}
                      onChange={(e) => setSettlementMethod(e.target.value as any)}
                      className="w-full bg-[#0B132B] text-xs text-slate-100 px-3 py-2 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="cash_refund">💵 {t('استرداد نقدي فوري من المندوب', 'وەرگرتنەوەی نەختینەی دەستبەجێ لە مەندوب', 'Instant Cash Refund')}</option>
                      <option value="deduct_supplier_balance">📉 {t('خصم من حساب ورصيد الشركة/المورد', 'داشکاندن لە باڵانس و قەرزی کۆمپانیا', 'Deduct from Supplier Balance')}</option>
                      <option value="credit_exchange">🔄 {t('استبدال بنفس القيمة لاحقاً (ذمة معلقة)', 'گۆڕینەوە بە هەمان بەها لە داهاتوودا', 'Credit for Future Exchange')}</option>
                    </select>
                  </div>

                  {/* Additional Note */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] text-slate-300 font-semibold">
                      {t('ملاحظات إضافية على سند الإرجاع (اختياري):', 'تێبینی زیاتر لەسەر وەسڵی گەڕاندنەوە (ئارەزوومەندانە):', 'Additional Notes (Optional):')}
                    </label>
                    <input
                      type="text"
                      value={reasonNote}
                      onChange={(e) => setReasonNote(e.target.value)}
                      placeholder={t('مثال: تم تسليم الكرتونة لمندوب الشركة مع وعد باستبدالها خلال أسبوع', 'نموونە: کارتۆنەکە ڕادەستی مەندوبی کۆمپانیا کرا بە بەڵێنی گۆڕینەوە لە ماوەی هەفتەیەکدا', 'e.g. Items returned to delegate with note for next delivery replacement')}
                      className="w-full bg-[#0B132B] text-xs text-slate-100 px-3 py-2 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none font-sans"
                    />
                  </div>
                </div>

                {/* Automation Toggles */}
                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoDeductStock}
                      onChange={(e) => setAutoDeductStock(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span>{t('خصم الكمية المرتجعة تلقائياً من مخزن المواد', 'داشکاندنی بڕی گەڕاوە بە شێوەی ئۆتۆماتیکی لە کۆگای کاڵاکان', 'Auto-deduct returned quantity from inventory')}</span>
                  </label>

                  {settlementMethod === 'deduct_supplier_balance' && selectedSupplierId && (
                    <label className="flex items-center gap-2 text-xs text-cyan-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoUpdateSupplierBalance}
                        onChange={(e) => setAutoUpdateSupplierBalance(e.target.checked)}
                        className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                      />
                      <span>{t('تسجيل سند تسديد / خصم في حساب الشركة تلقائياً', 'تۆمارکردنی وەسڵی پاکتاوکردن لە باڵانسی کۆمپانیا بە شێوەی ئۆتۆماتیکی', 'Auto-update supplier ledger balance')}</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
                >
                  {t('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                </button>

                <button
                  type="submit"
                  disabled={!selectedProduct}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>{t('اعتماد وحفظ سند إرجاع المواد للمندوب', 'پەسەندکردن و پاشەکەوتکردنی وەسڵی گەڕاندنەوە بۆ مەندوب', 'Submit & Save Return Voucher')}</span>
                </button>
              </div>

            </form>
          ) : (
            /* ARCHIVE & HISTORY VIEW */
            <div className="space-y-4">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-[#070D1C] border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>{t('إجمالي المبالغ المسترجعة', 'کۆی گشتی پارەی وەرگیراوە', 'Total Returned Value')}</span>
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-base sm:text-lg font-black font-mono text-amber-300">
                    {settings.currencySymbol}{totalRefundAmountAllTime.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#070D1C] border border-emerald-500/30 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>{t('مجموع القطع المرجعة', 'کۆی گشتی دانەی گەڕاوە', 'Total Returned Units')}</span>
                    <Package className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-300">
                    {totalUnitsReturnedAllTime.toLocaleString()} {t('قطعة', 'دانە', 'units')}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#070D1C] border border-cyan-500/30 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>{t('عدد سندات الإرجاع', 'ژمارەی وەسڵەکانی گەڕاندنەوە', 'Total Return Slips')}</span>
                    <FileText className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-base sm:text-lg font-black font-mono text-cyan-300">
                    {delegateLogs.length} {t('سند', 'وەسڵ', 'slips')}
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="p-3 rounded-2xl bg-[#070D1C] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder={t('بحث بالسند، المادة، المندوب...', 'گەڕان بەپێی وەسڵ، کاڵا، مەندوب...', 'Search returns...')}
                    className="w-full bg-[#0B132B] text-xs text-slate-200 placeholder-slate-500 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-1.5 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none font-sans"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={historyReasonFilter}
                    onChange={(e) => setHistoryReasonFilter(e.target.value)}
                    className="bg-[#0B132B] text-xs text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="ALL">{t('جميع أسباب الإرجاع', 'هەموو هۆکارەکانی گەڕاندنەوە', 'All Reasons')}</option>
                    <option value="EXPIRED">⏳ {t('منتهي الصلاحية', 'ماوە بەسەرچوو', 'Expired')}</option>
                    <option value="DEFECTIVE">💥 {t('عيب مصنعي', 'عەیبی دروستکردن', 'Defective')}</option>
                    <option value="OVERSTOCK">📦 {t('راكد وفائض', 'کاڵای ڕاکاو و زیادە', 'Overstock')}</option>
                    <option value="EXCHANGE">🔁 {t('استبدال', 'گۆڕینەوە', 'Exchange')}</option>
                  </select>
                </div>
              </div>

              {/* History Table */}
              {filteredHistoryLogs.length === 0 ? (
                <div className="p-8 text-center bg-[#070D1C] rounded-2xl border border-slate-800 space-y-2">
                  <Undo2 className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-300">{t('لا توجد سجلات لمرتجعات المندوبين حالياً', 'هیچ تۆمارێکی گەڕاندنەوە بۆ مەندوبان نییە', 'No delegate returns recorded yet')}</h4>
                  <p className="text-xs text-slate-500">{t('يمكنك تسجيل إرجاع بضاعة جديدة من التبويب أعلاه', 'دەتوانیت گەڕاندنەوەی نوێ لە تابی سەرەوە تۆمار بکەیت', 'You can log returns from the New Return tab')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#070D1C]">
                  <table className="w-full text-right rtl:text-right ltr:text-left text-xs">
                    <thead className="bg-[#0B132B] text-slate-400 border-b border-slate-800 font-bold">
                      <tr>
                        <th className="p-3">{t('رقم السند والتاريخ', 'ژمارەی وەسڵ و بەروار', 'Voucher & Date')}</th>
                        <th className="p-3">{t('المادة والباركود', 'کاڵا و بارکۆد', 'Product & Barcode')}</th>
                        <th className="p-3">{t('المندوب / الشركة', 'مەندوب / کۆمپانیا', 'Delegate / Vendor')}</th>
                        <th className="p-3">{t('الكمية والوحدة', 'بڕ و یەکە', 'Quantity')}</th>
                        <th className="p-3">{t('قيمة الاسترداد', 'بڕی وەرگیراوە', 'Refund Value')}</th>
                        <th className="p-3">{t('السبب وطريقة التسوية', 'هۆکار و شێوازی پاکتاوکردن', 'Reason & Settlement')}</th>
                        <th className="p-3 text-center">{t('إجراءات', 'کردارەکان', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                      {filteredHistoryLogs.map(log => {
                        const settlementBadge = getSettlementBadge(log.settlementMethod);
                        return (
                          <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 font-mono space-y-0.5">
                              <span className="font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 block w-max">
                                {log.voucherNumber}
                              </span>
                              <span className="text-[10px] text-slate-400 block">{log.recordedAt}</span>
                            </td>

                            <td className="p-3">
                              <div className="font-bold text-white">{log.productName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{log.barcode}</div>
                            </td>

                            <td className="p-3">
                              <div className="font-bold text-cyan-300 flex items-center gap-1">
                                <User className="w-3 h-3 text-cyan-400" />
                                <span>{log.delegateName}</span>
                              </div>
                              {log.supplierName && log.supplierName !== log.delegateName && (
                                <div className="text-[10px] text-slate-400">{log.supplierName}</div>
                              )}
                            </td>

                            <td className="p-3 font-mono">
                              <span className="font-bold text-white">{log.quantity}</span>{' '}
                              <span className="text-[10px] text-slate-400">
                                {log.returnUnitType === 'carton' ? t('كرتون', 'کارتۆن', 'cartons') : t('قطعة', 'دانە', 'units')}
                              </span>
                              {log.returnUnitType === 'carton' && (
                                <div className="text-[9px] text-slate-500">
                                  ({log.totalUnitsCalculated} {t('قطعة إجمالي', 'دانە بە کۆی گشتی', 'total units')})
                                </div>
                              )}
                            </td>

                            <td className="p-3 font-mono font-black text-emerald-400">
                              {settings.currencySymbol}{log.totalRefundAmount.toLocaleString()}
                            </td>

                            <td className="p-3 space-y-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 block w-max">
                                {log.reasonNote}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border block w-max ${settlementBadge.color}`}>
                                {settlementBadge.label}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPrintingRecord(log)}
                                  className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 cursor-pointer"
                                  title={t('طباعة سند الإرجاع', 'چاپکردنی وەسڵی گەڕاندنەوە', 'Print Return Slip')}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(log.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 cursor-pointer"
                                  title={t('حذف السجل', 'سڕینەوەی تۆمار', 'Delete Record')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-[#070D1C] flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 font-mono">
            {t('نظام المرتجعات الذكي متصل وموثق بالسجلات', 'سیستەمی گەڕاندنەوە چالاکە و بەڵگەنامە کراوە', 'Vendor returns engine active')}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
          >
            {t('إغلاق', 'داخستن', 'Close')}
          </button>
        </div>

      </div>

      {/* PRINT RETURN VOUCHER MODAL */}
      {printingRecord && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-3">
          <div className="bg-white text-slate-950 p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl dir-rtl">
            <div className="text-center border-b pb-3 space-y-1">
              <h3 className="text-base font-black">{settings.storeNameAr || settings.storeName || (isKu ? 'سیستەمی بەڕێوەبردنی فرۆش' : 'نظام إدارة المبيعات')}</h3>
              <p className="text-xs font-bold text-slate-700">{t('سند إرجاع واسترداد بضاعة إلى مندوب', 'وەسڵی گەڕاندنەوە و وەرگرتنەوەی کاڵا بۆ مەندوب', 'Vendor Return Voucher')}</p>
              <p className="text-[10px] font-mono text-slate-500">{t('رقم السند:', 'ژمارەی وەسڵ:', 'Voucher No:')} {printingRecord.voucherNumber}</p>
            </div>

            <div className="text-xs space-y-2 font-sans">
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500">{t('التاريخ والوقت:', 'بەروار و کات:', 'Date & Time:')}</span>
                <span className="font-mono font-bold">{printingRecord.recordedAt}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500">{t('اسم المندوب المستلم:', 'ناوی مەندوبی وەرگر:', 'Delegate Name:')}</span>
                <span className="font-bold">{printingRecord.delegateName}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500">{t('المادة المرجعة:', 'کاڵای گەڕاوە:', 'Returned Item:')}</span>
                <span className="font-bold">{printingRecord.productName}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500">{t('الباركود:', 'بارکۆد:', 'Barcode:')}</span>
                <span className="font-mono">{printingRecord.barcode}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500">{t('الكمية المرجعة:', 'بڕی گەڕاوە:', 'Quantity:')}</span>
                <span className="font-mono font-bold">
                  {printingRecord.quantity} {printingRecord.returnUnitType === 'carton' ? t('كرتون', 'کارتۆن', 'carton') : t('قطعة', 'دانە', 'unit')} ({printingRecord.totalUnitsCalculated} {t('قطعة إجمالي', 'دانە بە گشتی', 'units total')})
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500">{t('سعر الوحدة المرجعة:', 'نرخی یەکەی گەڕاوە:', 'Unit Cost:')}</span>
                <span className="font-mono font-bold">{printingRecord.unitCost.toLocaleString()} {settings.currencySymbol}</span>
              </div>
              <div className="flex justify-between border-b pb-1 bg-slate-100 p-2 rounded-lg">
                <span className="font-bold">{t('إجمالي المبلغ المستحق:', 'کۆی گشتی پارەی شایستە:', 'Total Refund:')}</span>
                <span className="font-mono font-black text-sm">{printingRecord.totalRefundAmount.toLocaleString()} {settings.currencySymbol}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500">{t('سبب الإرجاع:', 'هۆکاری گەڕاندنەوە:', 'Return Reason:')}</span>
                <span className="font-bold">{printingRecord.reasonNote}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t text-center text-xs">
              <div className="space-y-6">
                <span className="text-slate-500">{t('توقيع مسؤول المخزن / الكاشير', 'واژۆی بەڕێوەبەری کۆگا / کاشێر', 'Keeper / Cashier Signature')}</span>
                <div className="border-b border-dashed border-slate-400 h-6"></div>
              </div>
              <div className="space-y-6">
                <span className="text-slate-500">{t('توقيع واستلام المندوب', 'واژۆ و وەرگرتنی مەندوب', 'Delegate Signature')}</span>
                <div className="border-b border-dashed border-slate-400 h-6"></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPrintingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
              >
                {t('إغلاق', 'داخستن', 'Close')}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2 rounded-xl bg-slate-950 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{t('طباعة السند', 'چاپکردنی وەسڵ', 'Print Voucher')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
