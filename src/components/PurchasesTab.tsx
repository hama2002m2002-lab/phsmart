import React, { useState, useEffect } from 'react';
import { 
  PackagePlus, 
  Search, 
  Plus, 
  Trash2, 
  History, 
  X, 
  CreditCard, 
  ArrowRight,
  Building2,
  CheckCircle2,
  RefreshCw,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Package,
  Layers,
  Settings,
  DollarSign,
  Tag,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { Product, Supplier, StoreSettings, PurchaseInvoice, PurchaseInvoiceItem } from '../types';

interface PurchasesTabProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  settings: StoreSettings;
  onOpenAddProduct?: () => void;
  onBackToDashboard?: () => void;
}

export const PurchasesTab: React.FC<PurchasesTabProps> = ({
  products,
  setProducts,
  suppliers,
  setSuppliers,
  purchaseInvoices,
  setPurchaseInvoices,
  settings,
  onOpenAddProduct,
  onBackToDashboard,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const currency = settings.currencySymbol;

  // ------------------------------------------------------------------
  // 1. HEADER INFO (بيانات الفاتورة الرئيسية)
  // ------------------------------------------------------------------
  const [invoiceNumber, setInvoiceNumber] = useState<string>(`#INV-${Math.floor(10000 + Math.random() * 90000)}`);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'part'>('cash');
  const [paidAmountCash, setPaidAmountCash] = useState<number>(0);
  const [delegatePhone, setDelegatePhone] = useState<string>('');
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');

  // Modals / Popups for Compact UI
  const [showHeaderMoreModal, setShowHeaderMoreModal] = useState(false);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [showCostMethodModal, setShowCostMethodModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // ------------------------------------------------------------------
  // 2. MAIN COMPACT ITEM FORM (المادة الحالية)
  // ------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Core visible fields
  const [productNameInput, setProductNameInput] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [purchaseUnitMode, setPurchaseUnitMode] = useState<'carton' | 'piece'>('carton');

  // Quantity inputs
  const [cartonsCount, setCartonsCount] = useState<number>(1);
  const [piecesPerCarton, setPiecesPerCarton] = useState<number>(24);
  const [singlePieceQty, setSinglePieceQty] = useState<number>(12);

  // Price inputs
  const [cartonPurchasePrice, setCartonPurchasePrice] = useState<number>(12000);
  const [singlePiecePurchasePrice, setSinglePiecePurchasePrice] = useState<number>(500);

  // Comparison & Cost
  const [oldPurchasePrice, setOldPurchasePrice] = useState<number>(500);
  const [oldStockQty, setOldStockQty] = useState<number>(0);
  const [retailSellingPrice, setRetailSellingPrice] = useState<number>(750);
  const [costUpdateMethod, setCostUpdateMethod] = useState<'weighted_average' | 'direct_new_price'>('weighted_average');

  // ------------------------------------------------------------------
  // DRAFT ITEMS IN INVOICE GRID
  // ------------------------------------------------------------------
  interface DraftItem {
    id: string;
    productId: string;
    productName: string;
    barcode: string;
    purchaseUnitMode: 'carton' | 'piece';
    cartonsCount: number;
    piecesPerCarton: number;
    cartonPurchasePrice: number;
    totalPieces: number;
    oldPurchasePrice: number;
    newPiecePurchaseCost: number;
    costUpdateMethod: 'weighted_average' | 'direct_new_price';
    finalPieceCost: number;
    retailSellingPrice: number;
    pieceProfit: number;
    profitMarginPercent: number;
    totalItemCost: number;
    totalItemExpectedProfit: number;
    oldStockQty: number;
  }

  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  // ------------------------------------------------------------------
  // CALCULATIONS FOR CURRENT ITEM IN FORM
  // ------------------------------------------------------------------
  const currentTotalPieces = purchaseUnitMode === 'carton'
    ? cartonsCount * piecesPerCarton
    : singlePieceQty;

  const currentNewPieceCost = purchaseUnitMode === 'carton'
    ? (piecesPerCarton > 0 ? cartonPurchasePrice / piecesPerCarton : 0)
    : singlePiecePurchasePrice;

  const displayOldPurchasePrice = purchaseUnitMode === 'carton'
    ? oldPurchasePrice * (piecesPerCarton || 1)
    : oldPurchasePrice;

  const currentUnitNewPrice = purchaseUnitMode === 'carton'
    ? cartonPurchasePrice
    : singlePiecePurchasePrice;

  const priceDifference = currentUnitNewPrice - displayOldPurchasePrice;
  const isPriceIncreased = priceDifference > 0;
  const isPriceDecreased = priceDifference < 0;

  // Weighted Average Cost calculation
  const combinedQty = oldStockQty + currentTotalPieces;
  const combinedCostValue = (oldStockQty * oldPurchasePrice) + (currentTotalPieces * currentNewPieceCost);
  const calculatedWeightedCost = combinedQty > 0
    ? Math.round(combinedCostValue / combinedQty)
    : currentNewPieceCost;

  const effectivePieceCost = costUpdateMethod === 'weighted_average'
    ? calculatedWeightedCost
    : currentNewPieceCost;

  const currentPieceProfit = retailSellingPrice - effectivePieceCost;
  const currentProfitMarginPercent = effectivePieceCost > 0
    ? parseFloat(((currentPieceProfit / effectivePieceCost) * 100).toFixed(1))
    : 0;

  const currentTotalItemExpectedProfit = currentPieceProfit * currentTotalPieces;
  const currentTotalItemPurchaseAmount = currentNewPieceCost * currentTotalPieces;

  // Select item from search dropdown
  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setProductNameInput(prod.nameAr || prod.name);
    setBarcodeInput(prod.barcode);

    const upc = prod.unitsPerCarton && prod.unitsPerCarton > 0 ? prod.unitsPerCarton : 24;
    setPiecesPerCarton(upc);

    const oldCost = prod.cost || (prod.cartonPurchasePrice ? Math.round(prod.cartonPurchasePrice / upc) : 500);
    setOldPurchasePrice(oldCost);
    setOldStockQty(prod.stock || 0);

    setSinglePiecePurchasePrice(oldCost > 0 ? oldCost : 500);
    setCartonPurchasePrice(oldCost > 0 ? oldCost * upc : 12000);

    const retail = prod.singleRetailPrice || prod.price || 750;
    setRetailSellingPrice(retail);

    setSearchQuery('');
    setIsSearchFocused(false);
  };

  // ------------------------------------------------------------------
  // TOTALS & SETTLEMENT
  // ------------------------------------------------------------------
  const totalInvoiceAmount = draftItems.reduce((sum, item) => sum + item.totalItemCost, 0);
  const totalItemsCount = draftItems.length;
  const totalPiecesCount = draftItems.reduce((sum, item) => sum + item.totalPieces, 0);
  const totalInvoiceExpectedProfit = draftItems.reduce((sum, item) => sum + item.totalItemExpectedProfit, 0);

  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const netTotalPayable = Math.max(0, totalInvoiceAmount - invoiceDiscount);

  useEffect(() => {
    if (paymentType === 'cash') {
      setPaidAmountCash(netTotalPayable);
    }
  }, [netTotalPayable, paymentType]);

  const remainingDebtAmount = Math.max(0, netTotalPayable - paidAmountCash);

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------
  const handleAddItemToGrid = () => {
    if (!productNameInput.trim()) {
      alert(isAr ? 'برجاء إدخال اسم المادة' : 'Please enter product name');
      return;
    }

    if (currentTotalPieces <= 0) {
      alert(isAr ? 'برجاء إدخال كمية مشتراة أكبر من صفر' : 'Please enter purchased quantity > 0');
      return;
    }

    const newDraftItem: DraftItem = {
      id: `draft-${Date.now()}-${Math.random()}`,
      productId: selectedProduct?.id || `prod-custom-${Date.now()}`,
      productName: productNameInput,
      barcode: barcodeInput || `200245${Math.floor(100000 + Math.random() * 900000)}`,
      purchaseUnitMode,
      cartonsCount: purchaseUnitMode === 'carton' ? cartonsCount : 0,
      piecesPerCarton,
      cartonPurchasePrice: purchaseUnitMode === 'carton' ? cartonPurchasePrice : 0,
      totalPieces: currentTotalPieces,
      oldPurchasePrice,
      newPiecePurchaseCost: currentNewPieceCost,
      costUpdateMethod,
      finalPieceCost: effectivePieceCost,
      retailSellingPrice,
      pieceProfit: currentPieceProfit,
      profitMarginPercent: currentProfitMarginPercent,
      totalItemCost: currentTotalItemPurchaseAmount,
      totalItemExpectedProfit: currentTotalItemExpectedProfit,
      oldStockQty
    };

    setDraftItems(prev => [...prev, newDraftItem]);

    // Reset current item form inputs
    setSelectedProduct(null);
    setProductNameInput('');
    setBarcodeInput('');
    setCartonsCount(1);
    setSinglePieceQty(12);
  };

  const handleRemoveItemFromGrid = (id: string) => {
    setDraftItems(prev => prev.filter(item => item.id !== id));
  };

  const handleResetForm = () => {
    setInvoiceNumber(`#INV-${Math.floor(10000 + Math.random() * 90000)}`);
    setDraftItems([]);
    setSelectedSupplierName('');
    setInvoiceDiscount(0);
    setPaidAmountCash(0);
    setInvoiceNotes('');
    setSelectedProduct(null);
    setProductNameInput('');
    setBarcodeInput('');
  };

  const handleSaveInvoice = () => {
    if (draftItems.length === 0) {
      alert(isAr ? 'جدول الفاتورة فارغ! يرجى إضافة مادة واحدة على الأقل.' : 'Invoice grid is empty! Please add at least one item.');
      return;
    }

    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const invoiceItemsToSave: PurchaseInvoiceItem[] = draftItems.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productNameAr: item.productName,
      barcode: item.barcode,
      imageIcon: '📦',
      currentStockInWarehouse: item.oldStockQty,
      purchasedQuantity: item.totalPieces,
      oldPurchasePrice: item.oldPurchasePrice,
      newPurchasePrice: item.newPiecePurchaseCost,
      oldRetailPrice: item.retailSellingPrice,
      newRetailPrice: item.retailSellingPrice,
      unitsPerCarton: item.piecesPerCarton
    }));

    const newInvoiceRecord: PurchaseInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber,
      date: invoiceDate,
      time: timeStr,
      supplierName: selectedSupplierName || (isAr ? 'مورد غير مسمى' : 'Unnamed Supplier'),
      supplierPhone: delegatePhone || 'N/A',
      paymentType: paymentType,
      paidAmount: paidAmountCash,
      remainingAmount: remainingDebtAmount,
      totalInvoiceAmount: netTotalPayable,
      items: invoiceItemsToSave,
      status: 'completed',
      notes: invoiceNotes
    };

    setPurchaseInvoices(prev => [newInvoiceRecord, ...prev]);

    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        const matchedItem = draftItems.find(item => item.productId === prod.id || item.barcode === prod.barcode);
        if (!matchedItem) return prod;

        const oldStock = prod.stock || 0;
        const newTotalStock = oldStock + matchedItem.totalPieces;
        const upc = prod.unitsPerCarton || matchedItem.piecesPerCarton || 24;

        return {
          ...prod,
          stock: newTotalStock,
          totalUnits: newTotalStock,
          cartonsCount: Math.floor(newTotalStock / upc),
          cost: matchedItem.finalPieceCost,
          costPerUnit: matchedItem.finalPieceCost,
          cartonPurchasePrice: matchedItem.finalPieceCost * upc,
          singleRetailPrice: matchedItem.retailSellingPrice,
          price: matchedItem.retailSellingPrice,
          lastEditDate: invoiceDate,
          supplierName: selectedSupplierName || prod.supplierName,
          status: newTotalStock === 0 ? 'out_of_stock' : newTotalStock <= prod.minStock ? 'low_stock' : 'in_stock'
        };
      });
    });

    if (selectedSupplierName.trim()) {
      setSuppliers(prevSuppliers => {
        const supplierExists = prevSuppliers.some(s => s.nameAr === selectedSupplierName || s.name === selectedSupplierName);
        if (supplierExists) {
          return prevSuppliers.map(s => {
            if (s.nameAr === selectedSupplierName || s.name === selectedSupplierName) {
              return {
                ...s,
                totalInvoiced: (s.totalInvoiced || 0) + netTotalPayable,
                totalPaid: (s.totalPaid || 0) + paidAmountCash,
                balanceDue: (s.balanceDue || 0) + remainingDebtAmount
              };
            }
            return s;
          });
        } else {
          const newSupplierRecord: Supplier = {
            id: `sup-${Date.now()}`,
            name: selectedSupplierName,
            nameAr: selectedSupplierName,
            contactPerson: 'مندوب المورد',
            phone: delegatePhone || '07700000000',
            email: 'supplier@market.com',
            categorySupplied: 'مورد بضائع ومستلزمات',
            activeOrders: 1,
            balanceDue: remainingDebtAmount,
            totalInvoiced: netTotalPayable,
            totalPaid: paidAmountCash,
            rating: 5,
            avatar: '🏢',
            isSaved: true
          };
          return [newSupplierRecord, ...prevSuppliers];
        }
      });
    }

    alert(isAr 
      ? `✅ تمت إضافة وحفظ فاتورة المشتريات رقم (${invoiceNumber}) وتحديث أسعار المخزون والأرباح بنجاح!` 
      : `Purchase invoice ${invoiceNumber} saved successfully!`
    );

    handleResetForm();
  };

  const filteredSearchResults = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return false;
    return (
      p.name.toLowerCase().includes(q) ||
      p.nameAr.toLowerCase().includes(q) ||
      p.barcode.includes(q)
    );
  }).slice(0, 6);

  return (
    <div className="space-y-3 text-slate-100 max-w-full dir-rtl animate-fadeIn">

      {/* ULTRA-COMPACT HEADER BAR */}
      <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#0b1326] via-[#0e1a35] to-[#0a1122] border border-cyan-500/40 shadow-lg flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="العودة"
            >
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          )}

          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
            <PackagePlus className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-white">
                فاتورة شراء جديدة (Stock Entry)
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                PRO v2.5
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetForm}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>جديدة</span>
          </button>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>السجل ({purchaseInvoices.length})</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. COMPACT INVOICE HEADER BAR                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-3.5 py-2.5 rounded-2xl bg-[#0a1120] border border-cyan-500/30 shadow-sm flex items-center justify-between gap-3 flex-wrap text-xs">
        
        {/* Supplier */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-slate-400 font-bold text-[11px] shrink-0">المورد:</span>
          <input
            type="text"
            list="suppliers-dropdown-compact"
            value={selectedSupplierName}
            onChange={(e) => setSelectedSupplierName(e.target.value)}
            placeholder="اختر أو اكتب اسم المورد..."
            className="w-full bg-[#060b14] text-white font-bold text-xs py-1.5 px-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
          />
          <datalist id="suppliers-dropdown-compact">
            {suppliers.map(s => (
              <option key={s.id} value={s.nameAr || s.name} />
            ))}
          </datalist>
        </div>

        {/* Invoice Number */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-400 font-bold text-[11px]">الوصل:</span>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-28 bg-[#060b14] text-cyan-300 font-mono font-bold text-xs py-1.5 px-2 rounded-xl border border-cyan-500/30 text-center"
          />
        </div>

        {/* Invoice Date */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-400 font-bold text-[11px]">التاريخ:</span>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-32 bg-[#060b14] text-slate-200 font-mono text-xs py-1.5 px-2 rounded-xl border border-slate-700 text-center"
          />
        </div>

        {/* Payment Status Toggle */}
        <div className="flex items-center gap-1 shrink-0 bg-[#060b14] p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setPaymentType('cash')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              paymentType === 'cash'
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            نقداً
          </button>
          <button
            type="button"
            onClick={() => setPaymentType('credit')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              paymentType === 'credit'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            آجل
          </button>
        </div>

        {/* Button for More Header Info (Phone, Notes) */}
        <button
          type="button"
          onClick={() => setShowHeaderMoreModal(true)}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all shrink-0 cursor-pointer"
          title="تفاصيل إضافية والملاحظات"
        >
          <Settings className="w-4 h-4 text-cyan-400" />
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. MAIN COMPACT ITEM INPUT ROW                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-3 rounded-2xl bg-[#0a1120] border border-cyan-500/40 shadow-md space-y-2.5">
        
        {/* COMPACT INPUTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          
          {/* 1. اسم المادة / البحث */}
          <div className="md:col-span-4 relative">
            <label className="text-[10.5px] font-bold text-slate-300 block mb-1">
              • اسم المادة:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productNameInput}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setProductNameInput(e.target.value);
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder="ابحث عن مادة أو اكتب اسمها..."
                className="w-full bg-[#060b14] text-cyan-300 font-bold text-xs py-1.5 pr-8 pl-2.5 rounded-xl border border-cyan-500/40 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* SEARCH DROPDOWN */}
            {isSearchFocused && searchQuery && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-[#0a1124] border border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden z-50 p-1.5 max-h-52 overflow-y-auto">
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800 text-[10px] text-slate-400">
                  <span>نتائج البحث:</span>
                  <button onClick={() => setIsSearchFocused(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {filteredSearchResults.length === 0 ? (
                  <div className="p-2 text-center text-slate-400 text-xs">
                    مادة جديدة
                  </div>
                ) : (
                  filteredSearchResults.map(prod => (
                    <div
                      key={prod.id}
                      onClick={() => handleSelectProduct(prod)}
                      className="p-1.5 hover:bg-cyan-500/10 rounded-lg transition-all flex items-center justify-between gap-2 cursor-pointer text-xs"
                    >
                      <div>
                        <h4 className="font-bold text-white">{prod.nameAr || prod.name}</h4>
                        <span className="text-[9.5px] text-slate-400 font-mono">{prod.barcode}</span>
                      </div>
                      <span className="text-[10px] text-amber-300 font-mono font-bold shrink-0">
                        الرصيد: {prod.stock}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. العدد بالكرتون أو بالمفرد */}
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10.5px] font-bold text-slate-300">• العدد:</label>
              <div className="flex items-center gap-1 text-[10px] bg-[#060b14] p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPurchaseUnitMode('carton')}
                  className={`px-1.5 py-0.5 rounded ${purchaseUnitMode === 'carton' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                >
                  كرتون
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseUnitMode('piece')}
                  className={`px-1.5 py-0.5 rounded ${purchaseUnitMode === 'piece' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                >
                  مفرد
                </button>
              </div>
            </div>

            {purchaseUnitMode === 'carton' ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  value={cartonsCount}
                  onChange={(e) => setCartonsCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#060b14] text-amber-300 font-mono font-bold text-xs py-1.5 px-2 rounded-xl border border-slate-700 text-center"
                />
                <span className="text-[10px] text-slate-400 shrink-0">كرتون ({currentTotalPieces} قطعة)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  value={singlePieceQty}
                  onChange={(e) => setSinglePieceQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#060b14] text-amber-300 font-mono font-bold text-xs py-1.5 px-2 rounded-xl border border-slate-700 text-center"
                />
                <span className="text-[10px] text-slate-400 shrink-0">قطعة</span>
              </div>
            )}
          </div>

          {/* 3. سعر الشراء القديم */}
          <div className="md:col-span-2">
            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">
              • الشراء القديم ({purchaseUnitMode === 'carton' ? 'للكرتون' : 'للفرادي'}):
            </label>
            <div className="w-full bg-[#060b14] text-slate-300 font-mono font-bold text-xs py-1.5 px-2 rounded-xl border border-slate-800 text-center flex items-center justify-between">
              <span>{displayOldPurchasePrice.toLocaleString()}</span>
              <span className="text-[9px] text-slate-500">{currency}</span>
            </div>
          </div>

          {/* 4. سعر الشراء الجديد */}
          <div className="md:col-span-3">
            <label className="text-[10.5px] font-bold text-emerald-300 block mb-1">
              • سعر الشراء الجديد ({purchaseUnitMode === 'carton' ? 'للكرتون' : 'للفرادي'}):
            </label>
            <div className="flex items-center gap-1">
              {purchaseUnitMode === 'carton' ? (
                <input
                  type="number"
                  min="0"
                  value={cartonPurchasePrice}
                  onChange={(e) => setCartonPurchasePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-[#060b14] text-emerald-400 font-mono font-black text-xs py-1.5 px-2 rounded-xl border border-emerald-500/50 text-center"
                />
              ) : (
                <input
                  type="number"
                  min="0"
                  value={singlePiecePurchasePrice}
                  onChange={(e) => setSinglePiecePurchasePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-[#060b14] text-emerald-400 font-mono font-black text-xs py-1.5 px-2 rounded-xl border border-emerald-500/50 text-center"
                />
              )}
              <span className="text-[10px] text-slate-400 font-bold shrink-0">{currency}</span>
            </div>
          </div>

        </div>

        {/* SECOND ROW: TOTAL + BUTTON MODALS FOR EXTRA DETAILS */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          
          {/* 5. مجموع الشراء + مؤشر تغير السعر */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">مجموع الشراء للمادة:</span>
            <span className="px-3 py-1 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-black text-xs">
              {currentTotalItemPurchaseAmount.toLocaleString()} {currency}
            </span>

            {/* Visual price change indicator */}
            {isPriceIncreased ? (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-rose-400" />
                <span>ارتفع (+{priceDifference.toLocaleString()})</span>
              </span>
            ) : isPriceDecreased ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                <span>انخفض ({priceDifference.toLocaleString()})</span>
              </span>
            ) : null}
          </div>

          {/* ACTION BUTTONS FOR EXTRA OPTIONS (الباركود، الأرباح، طريقة احتساب التكلفة) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            
            {/* Button: Barcode & Packaging */}
            <button
              type="button"
              onClick={() => setShowItemDetailsModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span>الباركود والعبوة ({piecesPerCarton})</span>
            </button>

            {/* Button: Retail Price & Profit */}
            <button
              type="button"
              onClick={() => setShowProfitModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>سعر البيع والأرباح ({retailSellingPrice} {currency})</span>
            </button>

            {/* Button: Cost Calculation Method */}
            <button
              type="button"
              onClick={() => setShowCostMethodModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>طريقة احتساب التكلفة ({costUpdateMethod === 'weighted_average' ? 'المتوسط المرجح' : 'السعر الجديد'})</span>
            </button>

            {/* 6. ADD ITEM BUTTON */}
            <button
              type="button"
              onClick={handleAddItemToGrid}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة للفاتورة</span>
            </button>

          </div>

        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. DRAFT ITEMS TABLE GRID                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl border border-slate-800 bg-[#060b14] overflow-x-auto shadow-md">
        {draftItems.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Package className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            جدول المواد فارغ حالياً. استخدم الشريط أعلاه لإضافة المواد المشتراة.
          </div>
        ) : (
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10.5px] bg-[#0a1120]">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">اسم المادة</th>
                <th className="py-2 px-3 text-center">نوع ووحدة الشراء</th>
                <th className="py-2 px-3 text-center">الربط والكمية بالقطع</th>
                <th className="py-2 px-3 text-center">التكلفة (قديم / جديد)</th>
                <th className="py-2 px-3 text-center">سعر البيع للمفرد</th>
                <th className="py-2 px-3 text-center">مجموع الشراء</th>
                <th className="py-2 px-3 text-center">الربح المتوقع</th>
                <th className="py-2 px-3 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {draftItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-cyan-500/5 transition-all">
                  <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                  <td className="py-2 px-3 font-bold text-white">
                    <div>{item.productName}</div>
                    <div className="text-[9.5px] text-slate-500 font-mono">{item.barcode}</div>
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    {item.purchaseUnitMode === 'carton' ? (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30">
                        {item.cartonsCount} كرتون
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-bold">
                        مفرد (قطع)
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-amber-300">
                    {item.totalPieces} قطعة
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    <div className="text-[9.5px] text-slate-500 line-through">
                      {item.purchaseUnitMode === 'carton' 
                        ? (item.oldPurchasePrice * item.piecesPerCarton).toLocaleString() 
                        : item.oldPurchasePrice.toLocaleString()} {currency}
                    </div>
                    <div className="font-bold text-cyan-300">
                      {item.purchaseUnitMode === 'carton' 
                        ? (item.finalPieceCost * item.piecesPerCarton).toLocaleString() 
                        : item.finalPieceCost.toLocaleString()} {currency}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-emerald-400">
                    {item.retailSellingPrice} {currency}
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-white">
                    {item.totalItemCost.toLocaleString()} {currency}
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-emerald-300">
                    {item.totalItemExpectedProfit.toLocaleString()} {currency}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => handleRemoveItemFromGrid(item.id)}
                      className="p-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. COMPACT FOOTER SUMMARY & FINAL SAVE BUTTON                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-3 rounded-2xl bg-[#0a1120] border border-cyan-500/40 shadow-lg space-y-2.5">
        
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* TOTAL INVOICE AMOUNT */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">• إجمالي الفاتورة:</span>
            <span className="text-lg font-mono font-black text-cyan-300">
              {totalInvoiceAmount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">{currency}</span>
            </span>
          </div>

          {/* TOTAL ITEMS & PIECES */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">• المواد والقطع:</span>
            <span className="font-mono font-bold text-amber-300">
              {totalItemsCount} مواد ({totalPiecesCount} قطعة)
            </span>
          </div>

          {/* TOTAL EXPECTED PROFIT */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">• الأرباح المتوقعة:</span>
            <span className="font-mono font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
              +{totalInvoiceExpectedProfit.toLocaleString()} {currency}
            </span>
          </div>

          {/* DISCOUNT & SETTLEMENT BUTTON */}
          <button
            type="button"
            onClick={() => setShowSettlementModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5 text-cyan-400" />
            <span>الخصم والتسوية (صافي: {netTotalPayable.toLocaleString()} {currency})</span>
          </button>

        </div>

        {/* ACTION SAVE BUTTONS */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
          <button
            onClick={handleSaveInvoice}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>[حفظ وتحديث المخزون والأسعار]</span>
          </button>

          <button
            onClick={handleResetForm}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
          >
            إلغاء
          </button>
        </div>

      </div>

      {/* ================================================================== */}
      {/* MODALS FOR EXTRA / SECONDARY OPTIONS                               */}
      {/* ================================================================== */}

      {/* MODAL 1: HEADER EXTRA DETAILS (الهاتف والملاحظات) */}
      {showHeaderMoreModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="p-4 rounded-2xl border border-cyan-500/40 w-full max-w-md bg-[#0a1120] text-slate-100 space-y-3 shadow-2xl relative dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>تفاصيل إضافية لفاتورة التوريد</span>
              </h3>
              <button onClick={() => setShowHeaderMoreModal(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">رقم هاتف المورد / المندوب:</label>
                <input
                  type="text"
                  value={delegatePhone}
                  onChange={(e) => setDelegatePhone(e.target.value)}
                  placeholder="07700000000"
                  className="w-full bg-[#060b14] text-slate-200 py-1.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">ملاحظات الفاتورة:</label>
                <textarea
                  rows={3}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="ملاحظات حول حالة الشحنة أو تاريخ التوريد..."
                  className="w-full bg-[#060b14] text-slate-200 py-1.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHeaderMoreModal(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white font-bold text-xs"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ITEM BARCODE & PACKAGING DETAILS */}
      {showItemDetailsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="p-4 rounded-2xl border border-cyan-500/40 w-full max-w-md bg-[#0a1120] text-slate-100 space-y-3 shadow-2xl relative dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                <span>تفاصيل الباركود والعبوة للمادة</span>
              </h3>
              <button onClick={() => setShowItemDetailsModal(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">الباركود الخاصة بالمادة:</label>
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    const trimmed = val.trim();
                    if (trimmed) {
                      const dup = products.find(p => p.barcode.trim().toLowerCase() === trimmed.toLowerCase() && p.id !== selectedProduct?.id);
                      if (dup) {
                        alert(isAr ? `⚠️ الباركود (${trimmed}) مسجل مسبقاً لمادة أخرى (${dup.nameAr || dup.name})!\nتم منع تعبئة الباركود المكرر لتفادي التضارب في المخزون.` : `⚠️ Barcode (${trimmed}) is already registered to (${dup.name}).`);
                        setBarcodeInput('');
                        return;
                      }
                    }
                    setBarcodeInput(val);
                  }}
                  placeholder="628100xxxxxx"
                  className="w-full bg-[#060b14] text-slate-200 font-mono py-1.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">عدد القطع داخل الكرتون الواحد:</label>
                <input
                  type="number"
                  min="1"
                  value={piecesPerCarton}
                  onChange={(e) => setPiecesPerCarton(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#060b14] text-cyan-300 font-mono font-bold py-1.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowItemDetailsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white font-bold text-xs"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RETAIL SELLING PRICE & PROFIT CALCULATOR */}
      {showProfitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="p-4 rounded-2xl border border-amber-500/40 w-full max-w-md bg-[#0a1120] text-slate-100 space-y-3 shadow-2xl relative dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>احتساب الأرباح وسعر البيع للمفرد</span>
              </h3>
              <button onClick={() => setShowProfitModal(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-emerald-300 font-bold block mb-1">سعر البيع للمفرد للزبون:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={retailSellingPrice}
                    onChange={(e) => setRetailSellingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-[#060b14] text-emerald-400 font-mono font-black py-2 px-3 rounded-xl border border-emerald-500/50 text-center"
                  />
                  <span className="text-slate-400 font-bold">{currency}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#060b14] border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">تكلفة الشراء للقطعة:</span>
                  <span className="font-mono font-bold text-cyan-300">{effectivePieceCost.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ربح القطعة الواحدة:</span>
                  <span className="font-mono font-bold text-amber-300">{currentPieceProfit.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">نسبة الربح %:</span>
                  <span className="font-mono font-bold text-purple-300">{currentProfitMarginPercent}%</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-white font-bold">إجمالي الربح المتوقع للمادة:</span>
                  <span className="font-mono font-black text-emerald-400">+{currentTotalItemExpectedProfit.toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowProfitModal(false)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: COST CALCULATION METHOD */}
      {showCostMethodModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="p-4 rounded-2xl border border-purple-500/40 w-full max-w-md bg-[#0a1120] text-slate-100 space-y-3 shadow-2xl relative dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-purple-300 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                <span>طريقة تحديث تكلفة المخزون</span>
              </h3>
              <button onClick={() => setShowCostMethodModal(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label
                onClick={() => setCostUpdateMethod('weighted_average')}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                  costUpdateMethod === 'weighted_average'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                    : 'bg-[#060b14] border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="modalCostMethod"
                  checked={costUpdateMethod === 'weighted_average'}
                  onChange={() => {}}
                  className="mt-0.5 accent-purple-400"
                />
                <div>
                  <span className="block font-bold text-white">1. المتوسط المرجح (Weighted Average Cost)</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    الدمج بين الكميات والتكلفة القديمة والجديدة.
                  </span>
                  <span className="text-[10.5px] text-emerald-400 font-bold block mt-1">
                    =&gt; التكلفة المحسوبة: {calculatedWeightedCost.toLocaleString()} {currency}
                  </span>
                </div>
              </label>

              <label
                onClick={() => setCostUpdateMethod('direct_new_price')}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                  costUpdateMethod === 'direct_new_price'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                    : 'bg-[#060b14] border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="modalCostMethod"
                  checked={costUpdateMethod === 'direct_new_price'}
                  onChange={() => {}}
                  className="mt-0.5 accent-purple-400"
                />
                <div>
                  <span className="block font-bold text-white">2. اعتماد السعر الجديد مباشرة</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    تحديث تكلفة كافة القطع الحالية لسعر الشراء الجديد.
                  </span>
                  <span className="text-[10.5px] text-cyan-400 font-bold block mt-1">
                    =&gt; التكلفة المحسوبة: {currentNewPieceCost.toLocaleString()} {currency}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCostMethodModal(false)}
                className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs"
              >
                حفظ الإختيار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SETTLEMENT & DISCOUNT */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="p-4 rounded-2xl border border-cyan-500/40 w-full max-w-md bg-[#0a1120] text-slate-100 space-y-3 shadow-2xl relative dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <span>الخصم والتسوية المالي للفاتورة</span>
              </h3>
              <button onClick={() => setShowSettlementModal(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">الخصم المكتسب من المورد:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={invoiceDiscount}
                    onChange={(e) => setInvoiceDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-[#060b14] text-amber-300 font-mono font-bold py-1.5 px-3 rounded-xl border border-slate-700 text-center"
                  />
                  <span className="text-slate-400 font-bold">{currency}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">الصافي النهائي للوصل:</label>
                <div className="w-full bg-[#060b14] text-emerald-400 font-mono font-black py-2 px-3 rounded-xl border border-emerald-500/40 text-center text-sm">
                  {netTotalPayable.toLocaleString()} {currency}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">المبلغ المدفوع نقدًا للمورد:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={paidAmountCash}
                    onChange={(e) => setPaidAmountCash(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-[#060b14] text-emerald-300 font-mono font-bold py-1.5 px-3 rounded-xl border border-slate-700 text-center"
                  />
                  <span className="text-slate-400 font-bold">{currency}</span>
                </div>
              </div>

              {remainingDebtAmount > 0 && (
                <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 font-bold text-[11px] text-center">
                  المبلغ المتبقي كدين على المحل: {remainingDebtAmount.toLocaleString()} {currency}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSettlementModal(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white font-bold text-xs"
              >
                تم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: INVOICES HISTORY */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
          <div className="p-4 rounded-2xl border border-cyan-500/40 w-full max-w-4xl bg-[#0a1120] text-slate-100 space-y-3 shadow-2xl relative my-auto dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">
                  سجل فواتير التوريد والمشتريات ({purchaseInvoices.length})
                </h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {purchaseInvoices.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">لا توجد فواتير شراء سابقة مسجلة</p>
              ) : (
                purchaseInvoices.map(inv => (
                  <div key={inv.id} className="p-3 rounded-xl bg-[#060b14] border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2 font-mono font-bold text-cyan-300">
                        <span>{inv.invoiceNumber}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{inv.date}</span>
                      </div>
                      <p className="font-bold text-white mt-0.5">{inv.supplierName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{inv.items.length} مواد بالفاتورة</p>
                    </div>

                    <div className="text-left rtl:text-right font-mono">
                      <span className="text-emerald-400 font-black text-sm block">
                        {currency}{inv.totalInvoiceAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        مدفوع: {currency}{inv.paidAmount.toLocaleString()}
                      </span>
                      {inv.remainingAmount > 0 && (
                        <span className="text-[10px] text-amber-400 font-bold block">
                          متبقي (دين): {currency}{inv.remainingAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
