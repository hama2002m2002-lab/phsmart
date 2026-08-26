import React, { useState, useEffect, useMemo } from 'react';
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
  Info,
  Calendar,
  AlertTriangle,
  Clock,
  Boxes,
  Camera,
  Sparkles,
  Upload
} from 'lucide-react';
import { Product, Supplier, StoreSettings, PurchaseInvoice, PurchaseInvoiceItem, ProductBatch } from '../types';
import { formatDateDDMMYYYY, formatTime12Hour } from '../lib/dateUtils';
import { DatePickerDDMMYYYY } from './DatePickerDDMMYYYY';
import { generateUniqueBarcode200245 } from '../lib/barcodeUtils';

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
  onOpenAIInvoiceScanner?: () => void;
  initialDraftData?: {
    items: Array<{
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
      expiryDate?: string;
      productionDate?: string;
      batchNumber?: string;
      oldExpiryDate?: string;
      discountAmount?: number;
      discountPercent?: number;
    }>;
    supplierName?: string;
    supplierPhone?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    discountAmount?: number;
  } | null;
  onClearInitialDraftData?: () => void;
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
  onOpenAIInvoiceScanner,
  initialDraftData,
  onClearInitialDraftData
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const currency = settings.currencySymbol;

  const t = (ar: string, ku: string, en: string = ar) => isKu ? ku : isAr ? ar : en;

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

  // Expiry Date & Batch Tracking
  const [expiryDateInput, setExpiryDateInput] = useState<string>('');
  const [productionDateInput, setProductionDateInput] = useState<string>('');
  const [batchNumberInput, setBatchNumberInput] = useState<string>('');
  const [expiryAlertBanner, setExpiryAlertBanner] = useState<{
    show: boolean;
    productName: string;
    existingExpiry: string;
    existingStock: number;
    existingBatches?: ProductBatch[];
  } | null>(null);

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
    expiryDate?: string;
    productionDate?: string;
    batchNumber?: string;
    oldExpiryDate?: string;
    discountAmount?: number;
    discountPercent?: number;
  }

  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  // Listen to Transferred Scanned Items from AI Scanner Modal
  useEffect(() => {
    if (initialDraftData) {
      if (initialDraftData.supplierName) setSelectedSupplierName(initialDraftData.supplierName);
      if (initialDraftData.supplierPhone) setDelegatePhone(initialDraftData.supplierPhone);
      if (initialDraftData.invoiceNumber) setInvoiceNumber(`PUR-${initialDraftData.invoiceNumber}`);
      if (initialDraftData.invoiceDate) setInvoiceDate(initialDraftData.invoiceDate);
      if (initialDraftData.discountAmount) setInvoiceDiscount(initialDraftData.discountAmount);

      if (initialDraftData.items && initialDraftData.items.length > 0) {
        const formattedItems: DraftItem[] = initialDraftData.items.map((i, idx) => ({
          id: `draft-ai-${Date.now()}-${idx}`,
          productId: i.productId,
          productName: i.productName,
          barcode: i.barcode,
          purchaseUnitMode: i.purchaseUnitMode || 'carton',
          cartonsCount: i.cartonsCount || 0,
          piecesPerCarton: i.piecesPerCarton || 1,
          cartonPurchasePrice: i.cartonPurchasePrice || 0,
          totalPieces: i.totalPieces || 1,
          oldPurchasePrice: i.oldPurchasePrice || 0,
          newPiecePurchaseCost: i.newPiecePurchaseCost || 0,
          costUpdateMethod: i.costUpdateMethod || 'weighted_average',
          finalPieceCost: i.finalPieceCost || i.newPiecePurchaseCost || 0,
          retailSellingPrice: i.retailSellingPrice || 0,
          pieceProfit: i.pieceProfit || 0,
          profitMarginPercent: i.profitMarginPercent || 0,
          totalItemCost: i.totalItemCost || 0,
          totalItemExpectedProfit: i.totalItemExpectedProfit || 0,
          oldStockQty: i.oldStockQty || 0,
          expiryDate: i.expiryDate,
          productionDate: i.productionDate,
          batchNumber: i.batchNumber,
          oldExpiryDate: i.oldExpiryDate,
          discountAmount: i.discountAmount,
          discountPercent: i.discountPercent
        }));

        setDraftItems(formattedItems);
      }

      onClearInitialDraftData?.();
    }
  }, [initialDraftData]);

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

  // Weighted Average Cost calculation for accurate profit margins and reporting:
  // Inventory valuation combines existing inventory cost basis (prod.cost / prod.costPerUnit) with new purchase batch
  const existingStockCostPerUnit = selectedProduct?.cost || selectedProduct?.costPerUnit || oldPurchasePrice;
  const validOldQty = Math.max(0, oldStockQty);
  const combinedQty = validOldQty + currentTotalPieces;
  const combinedCostValue = (validOldQty * existingStockCostPerUnit) + (currentTotalPieces * currentNewPieceCost);
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

    // Get the actual real last purchase price (not diluted weighted cost)
    const actualLastPurchasePrice = prod.lastPurchasePrice 
      || (prod.cartonPurchasePrice && prod.cartonPurchasePrice > 0 ? Math.round(prod.cartonPurchasePrice / upc) : 0)
      || prod.costPerUnit 
      || prod.cost 
      || 500;

    const actualLastCartonPrice = prod.lastCartonPurchasePrice
      || (prod.cartonPurchasePrice && prod.cartonPurchasePrice > 0 ? prod.cartonPurchasePrice : actualLastPurchasePrice * upc);

    setOldPurchasePrice(actualLastPurchasePrice);
    setOldStockQty(prod.stock || 0);

    setSinglePiecePurchasePrice(actualLastPurchasePrice > 0 ? actualLastPurchasePrice : 500);
    setCartonPurchasePrice(actualLastCartonPrice > 0 ? actualLastCartonPrice : 12000);

    const retail = prod.singleRetailPrice || prod.price || 750;
    setRetailSellingPrice(retail);

    // Expiry Date & Batch check & alert for worker
    if (prod.expiryDate || (prod.stock > 0)) {
      setExpiryAlertBanner({
        show: true,
        productName: prod.nameAr || prod.name,
        existingExpiry: prod.expiryDate || t('غير محدد', 'دیاری نەکراوە', 'Not set'),
        existingStock: prod.stock || 0,
        existingBatches: prod.batches || []
      });
    } else {
      setExpiryAlertBanner(null);
    }

    // Pre-fill expiry with product's current expiry or keep empty for new batch
    setExpiryDateInput(prod.expiryDate || '');
    setProductionDateInput(prod.productionDate || '');
    setBatchNumberInput(prod.batchNumber || `B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);

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
      alert(t('برجاء إدخال اسم المادة', 'تکایە ناوی کاڵا بنووسە', 'Please enter product name'));
      return;
    }

    if (currentTotalPieces <= 0) {
      alert(t('برجاء إدخال كمية مشتراة أكبر من صفر', 'تکایە بڕی کڕدراو زیاتر لە سفر بنووسە', 'Please enter purchased quantity > 0'));
      return;
    }

    if (effectivePieceCost > 0 && retailSellingPrice < effectivePieceCost) {
      alert(
        t(
          `❌ لا يمكن إضافة المادة للفاتورة!\n\nسعر البيع للمفرد (${retailSellingPrice.toLocaleString()} ${currency}) أقل من سعر التكلفة/الشراء للقطعة (${effectivePieceCost.toLocaleString()} ${currency}).\n\nيرجى تعديل سعر البيع من زر (سعر البيع والأرباح) ليكون أعلى من التكلفة لتجنب الخسارة.`,
          `❌ پاشەکەوت ناکرێت!\n\nنرخی فرۆشتن (${retailSellingPrice.toLocaleString()} ${currency}) کەمترە لە نرخی کڕینی یەک دانە (${effectivePieceCost.toLocaleString()} ${currency})!\n\nتکایە نرخی فرۆشتن چاکبکە تاوەکوو تووشی زیانی دارایی نەبیت.`,
          `❌ Cannot add item! Retail selling price (${retailSellingPrice}) is lower than cost per piece (${effectivePieceCost}).`
        )
      );
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
      oldStockQty,
      expiryDate: expiryDateInput.trim() || undefined,
      productionDate: productionDateInput.trim() || undefined,
      batchNumber: batchNumberInput.trim() || undefined,
      oldExpiryDate: selectedProduct?.expiryDate || undefined
    };

    setDraftItems(prev => [...prev, newDraftItem]);

    // Reset current item form inputs
    setSelectedProduct(null);
    setProductNameInput('');
    setBarcodeInput('');
    setCartonsCount(1);
    setSinglePieceQty(12);
    setExpiryDateInput('');
    setProductionDateInput('');
    setBatchNumberInput('');
    setExpiryAlertBanner(null);
  };

  const handleRemoveItemFromGrid = (id: string) => {
    setDraftItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateDraftItemBarcode = (id: string, newBarcode: string) => {
    setDraftItems(prev => prev.map(item => item.id === id ? { ...item, barcode: newBarcode } : item));
  };

  const handleGenerateDraftItemBarcode = (id: string) => {
    const newBar = generateUniqueBarcode200245(products);
    setDraftItems(prev => prev.map(item => item.id === id ? { ...item, barcode: newBar } : item));
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
    setExpiryDateInput('');
    setProductionDateInput('');
    setBatchNumberInput('');
    setExpiryAlertBanner(null);
  };

  const handleSaveInvoice = () => {
    if (draftItems.length === 0) {
      alert(t('جدول الفاتورة فارغ! يرجى إضافة مادة واحدة على الأقل.', 'خشتەی پسوڵە بەتاڵە! تکایە لانیکەم کاڵایەک زیاد بکە.', 'Invoice grid is empty! Please add at least one item.'));
      return;
    }

    const timeStr = formatTime12Hour(new Date(), lang);

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
      unitsPerCarton: item.piecesPerCarton,
      expiryDate: item.expiryDate,
      productionDate: item.productionDate,
      batchNumber: item.batchNumber,
      oldExpiryDate: item.oldExpiryDate,
      discountAmount: item.discountAmount,
      discountPercent: item.discountPercent,
      totalCost: item.totalItemCost
    }));

    const newInvoiceRecord: PurchaseInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber,
      date: invoiceDate,
      time: timeStr,
      supplierName: selectedSupplierName || t('مورد غير مسمى', 'دابینکەری بێ ناو', 'Unnamed Supplier'),
      supplierPhone: delegatePhone || 'N/A',
      paymentType: paymentType,
      paidAmount: paidAmountCash,
      remainingAmount: remainingDebtAmount,
      totalInvoiceAmount: netTotalPayable,
      grossInvoiceAmount: totalInvoiceAmount,
      discountAmount: invoiceDiscount,
      discountPercent: totalInvoiceAmount > 0 ? Math.round((invoiceDiscount / totalInvoiceAmount) * 100) : 0,
      items: invoiceItemsToSave,
      status: 'completed',
      notes: invoiceNotes
    };

    setPurchaseInvoices(prev => [newInvoiceRecord, ...prev]);

    setProducts(prevProducts => {
      const updatedExisting = prevProducts.map(prod => {
        const matchedItem = draftItems.find(item => item.productId === prod.id || (item.barcode && prod.barcode && item.barcode.trim() === prod.barcode.trim()));
        if (!matchedItem) return prod;

        const oldStock = prod.stock || 0;
        const newTotalStock = oldStock + matchedItem.totalPieces;
        const upc = prod.unitsPerCarton || matchedItem.piecesPerCarton || 24;

        // The real new purchase price entered for this item
        const actualNewPurchasePiece = matchedItem.newPiecePurchaseCost;
        const actualNewCartonPurchase = matchedItem.purchaseUnitMode === 'carton' && matchedItem.cartonPurchasePrice > 0
          ? matchedItem.cartonPurchasePrice
          : matchedItem.newPiecePurchaseCost * upc;

        // Manage Batches (الدفعات وتواريخ الصلاحية)
        let updatedBatches: ProductBatch[] = Array.isArray(prod.batches) ? [...prod.batches] : [];
        
        // If product already had stock and an old expiry date but no batches registered yet, convert existing stock to first batch
        if (updatedBatches.length === 0 && oldStock > 0) {
          updatedBatches.push({
            id: `batch-initial-${prod.id}`,
            batchNumber: prod.batchNumber || `BATCH-OLD`,
            expiryDate: prod.expiryDate || 'N/A',
            productionDate: prod.productionDate || '',
            quantity: oldStock,
            purchasePrice: prod.costPerUnit || prod.cost,
            supplierName: prod.supplierDelegate || prod.supplierName || 'قديم',
            addedDate: prod.initialAddDate || invoiceDate
          });
        }

        // Add the new purchased batch
        const newBatchItem: ProductBatch = {
          id: `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          batchNumber: matchedItem.batchNumber || `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          expiryDate: matchedItem.expiryDate || prod.expiryDate || '',
          productionDate: matchedItem.productionDate || '',
          quantity: matchedItem.totalPieces,
          purchasePrice: actualNewPurchasePiece,
          supplierName: selectedSupplierName || prod.supplierName,
          addedDate: invoiceDate
        };
        updatedBatches.push(newBatchItem);

        // Determine effective primary expiry date (Earliest non-empty expiry date among active batches)
        const validExpiries = updatedBatches
          .filter(b => b.quantity > 0 && b.expiryDate && b.expiryDate !== 'N/A' && b.expiryDate !== '')
          .map(b => b.expiryDate)
          .sort();
        
        const effectiveExpiry = validExpiries.length > 0 
          ? validExpiries[0] 
          : (matchedItem.expiryDate || prod.expiryDate || '');

        return {
          ...prod,
          stock: newTotalStock,
          totalUnits: newTotalStock,
          cartonsCount: Math.floor(newTotalStock / upc),
          cost: matchedItem.finalPieceCost,
          costPerUnit: matchedItem.finalPieceCost,
          lastPurchasePrice: actualNewPurchasePiece,
          lastCartonPurchasePrice: actualNewCartonPurchase,
          cartonPurchasePrice: actualNewCartonPurchase,
          singleRetailPrice: matchedItem.retailSellingPrice,
          price: matchedItem.retailSellingPrice,
          lastEditDate: invoiceDate,
          supplierName: selectedSupplierName || prod.supplierName,
          expiryDate: effectiveExpiry,
          productionDate: matchedItem.productionDate || prod.productionDate,
          batchNumber: matchedItem.batchNumber || prod.batchNumber,
          batches: updatedBatches,
          status: (newTotalStock === 0 ? 'out_of_stock' : newTotalStock <= prod.minStock ? 'low_stock' : 'in_stock') as 'in_stock' | 'low_stock' | 'out_of_stock'
        };
      });

      // Find any draft items that didn't exist in warehouse products and create them
      const brandNewItems = draftItems.filter(item => 
        !prevProducts.some(prod => prod.id === item.productId || (item.barcode && prod.barcode && item.barcode.trim() === prod.barcode.trim()))
      );

      const createdProducts: Product[] = brandNewItems.map(item => {
        const upc = item.piecesPerCarton || 24;
        const pieceCost = item.finalPieceCost || item.newPiecePurchaseCost || 1000;
        const retailPrice = item.retailSellingPrice || Math.round(pieceCost * 1.3);
        const cartonCost = item.cartonPurchasePrice > 0 ? item.cartonPurchasePrice : (pieceCost * upc);
        const wholesalePrice = Math.round(pieceCost * 1.15);
        const cartonSellingPrice = Math.round(retailPrice * upc * 0.95);

        const initialBatch: ProductBatch = {
          id: `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          batchNumber: item.batchNumber || `BATCH-${new Date().getFullYear()}-001`,
          expiryDate: item.expiryDate || '',
          productionDate: item.productionDate || '',
          quantity: item.totalPieces,
          purchasePrice: pieceCost,
          supplierName: selectedSupplierName || 'مورد جديد',
          addedDate: invoiceDate
        };

        return {
          id: item.productId.startsWith('prod-') ? item.productId : `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: item.productName,
          nameAr: item.productName,
          category: 'عام',
          categoryAr: 'عام',
          price: retailPrice,
          singleRetailPrice: retailPrice,
          wholesalePrice,
          cartonSellingPrice,
          singleProfit: retailPrice - pieceCost,
          wholesaleProfit: wholesalePrice - pieceCost,
          cartonProfit: cartonSellingPrice - cartonCost,
          cost: pieceCost,
          costPerUnit: pieceCost,
          lastPurchasePrice: pieceCost,
          cartonPurchasePrice: cartonCost,
          lastCartonPurchasePrice: cartonCost,
          stock: item.totalPieces,
          totalUnits: item.totalPieces,
          unitsPerCarton: upc,
          cartonsCount: Math.floor(item.totalPieces / upc),
          minStock: 5,
          unit: 'قطعة',
          supplierId: 'sup-general',
          imageIcon: '📦',
          barcode: item.barcode || `2002${Date.now().toString().slice(-6)}`,
          status: item.totalPieces > 5 ? 'in_stock' : item.totalPieces > 0 ? 'low_stock' : 'out_of_stock',
          supplierName: selectedSupplierName || 'مورد الوصل',
          expiryDate: item.expiryDate || '',
          productionDate: item.productionDate || '',
          batchNumber: item.batchNumber || '',
          batches: [initialBatch],
          initialAddDate: invoiceDate,
          lastEditDate: invoiceDate
        };
      });

      return [...createdProducts, ...updatedExisting];
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

    alert(t(
      `✅ تمت إضافة وحفظ فاتورة المشتريات رقم (${invoiceNumber}) وتحديث أسعار المخزون والأرباح بنجاح!`,
      `✅ پسوڵەی کڕینی ژمارە (${invoiceNumber}) بە سەرکەوتوویی تۆمارکرا و کۆگا نوێکرایەوە!`,
      `Purchase invoice ${invoiceNumber} saved successfully!`
    ));

    handleResetForm();
  };

  const filteredSearchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const isDigits = /^\d+$/.test(q);
    const results: Product[] = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (isDigits) {
        if (p.barcode.includes(q)) {
          results.push(p);
          if (results.length >= 8) break;
        }
      } else {
        if (
          p.name.toLowerCase().includes(q) ||
          (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
          p.barcode.includes(q)
        ) {
          results.push(p);
          if (results.length >= 8) break;
        }
      }
    }
    return results;
  }, [products, searchQuery]);

  return (
    <div className="space-y-3 text-slate-100 max-w-full dir-rtl animate-fadeIn">

      {/* ULTRA-COMPACT HEADER BAR */}
      <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#0b1326] via-[#0e1a35] to-[#0a1122] border border-cyan-500/40 shadow-lg flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title={t('العودة', 'گەڕانەوە', 'Back')}
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
                {t('فاتورة شراء جديدة (Stock Entry)', 'پسوڵەی کڕینی نوێ (Stock Entry)', 'New Purchase Invoice')}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                PRO v2.5
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenAIInvoiceScanner && (
            <button
              onClick={onOpenAIInvoiceScanner}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white font-black text-xs border border-purple-400/40 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.35)] hover:brightness-110 active:scale-95 cursor-pointer"
            >
              <PackagePlus className="w-3.5 h-3.5 text-purple-200 animate-pulse" />
              <span>{t('مسح صورة الوصل (AI OCR)', 'خوێندنەوەی پسوولە (AI)', 'Scan Invoice (AI)')}</span>
            </button>
          )}

          <button
            onClick={handleResetForm}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('جديدة', 'نوێ', 'New')}</span>
          </button>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t(`السجل (${purchaseInvoices.length})`, `مێژوو (${purchaseInvoices.length})`, `History (${purchaseInvoices.length})`)}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* AI PHOTO & INVOICE FAST IMPORTER BANNER                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 via-indigo-950/50 to-[#0a1329] border border-purple-500/40 shadow-lg flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs text-purple-200">
                {t('إضافة مواد الشراء عبر تصوير الوصل بالذكاء الاصطناعي', 'زیادکردنی کڕین بە وێنەگرتنی پسوڵە بە AI', 'AI Invoice & Camera Smart Fast Importer')}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-[10px] font-bold text-purple-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-300 animate-spin" />
                {t('تعرف تلقائي فوري', 'خوێندنەوەی خێرا', 'Auto-Detection')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {t(
                'التقط صورة للوصل لحساب الأسعار القديمة والجديدة والخصومات وتواريخ الصلاحية وتحديث المخزون بنقرة واحدة.',
                'وێنەی پسوڵەکە بگرە بۆ حیسابکردنی نرخی کۆن و نوێ، داشکاندن، بەسەرچوون و نوێکردنەوەی کۆگا.',
                'Capture or upload an invoice photo to auto-extract items, expiry dates, compare old/new prices, and update stock.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAIInvoiceScanner && (
            <button
              onClick={onOpenAIInvoiceScanner}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs border border-purple-300/40 flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-purple-100" />
              <span>{t('📸 فتح كاميرا / رفع صورة الوصل', '📸 وێنەگرتن / بەرزکردنەوەی پسوڵە', '📸 Open Camera / Upload Photo')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. COMPACT INVOICE HEADER BAR                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-3.5 py-2.5 rounded-2xl bg-[#0a1120] border border-cyan-500/30 shadow-sm flex items-center justify-between gap-3 flex-wrap text-xs">
        
        {/* Supplier */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-slate-400 font-bold text-[11px] shrink-0">{t('المورد:', 'دابینکەر:', 'Supplier:')}</span>
          <input
            type="text"
            list="suppliers-dropdown-compact"
            value={selectedSupplierName}
            onChange={(e) => setSelectedSupplierName(e.target.value)}
            placeholder={t('اختر أو اكتب اسم المورد...', 'ناوی دابینکەر دیاری بکە یان بنووسە...', 'Select or enter supplier name...')}
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
          <span className="text-slate-400 font-bold text-[11px]">{t('الوصل:', 'پسوڵە:', 'Invoice:')}</span>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-28 bg-[#060b14] text-cyan-300 font-mono font-bold text-xs py-1.5 px-2 rounded-xl border border-cyan-500/30 text-center"
          />
        </div>

        {/* Invoice Date (DD/MM/YYYY) */}
        <div className="flex items-center gap-1.5 shrink-0 min-w-[170px]">
          <span className="text-slate-400 font-bold text-[11px]">{t('التاريخ:', 'بەروار:', 'Date:')}</span>
          <DatePickerDDMMYYYY
            value={invoiceDate}
            onChange={(dStr) => setInvoiceDate(dStr)}
            lang={lang}
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
            {t('نقداً', 'نەقد', 'Cash')}
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
            {t('آجل', 'قەرز', 'Credit')}
          </button>
        </div>

        {/* Button for More Header Info (Phone, Notes) */}
        <button
          type="button"
          onClick={() => setShowHeaderMoreModal(true)}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all shrink-0 cursor-pointer"
          title={t('تفاصيل إضافية والملاحظات', 'وردەکاری زیاتر و تێبینییەکان', 'More Details & Notes')}
        >
          <Settings className="w-4 h-4 text-cyan-400" />
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. MAIN COMPACT ITEM INPUT ROW                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-3 rounded-2xl bg-[#0a1120] border border-cyan-500/40 shadow-md space-y-2.5">
        
        {/* EXPIRY & EXISTING STOCK WARNING NOTIFICATION BANNER (تنبيه المخزون القديم وتاريخ الصلاحية السابق) */}
        {expiryAlertBanner && expiryAlertBanner.show && (
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/80 via-amber-900/50 to-orange-950/80 border border-amber-500/50 text-amber-200 text-xs shadow-lg flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-300 text-xs flex items-center gap-1">
                  <span>{t('تنبيه المخزون وتاريخ الصلاحية:', 'ئاگاداری کۆگا و بەرواری بەسەرچوون:', 'Stock & Expiry Alert:')}</span>
                  <span className="text-white underline">{expiryAlertBanner.productName}</span>
                </span>
                <button 
                  onClick={() => setExpiryAlertBanner(null)} 
                  className="text-slate-400 hover:text-white p-0.5 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11.5px] leading-relaxed text-amber-100 font-medium">
                {t(
                  `يوجد في المخزن حالياً كمية قديمة (${expiryAlertBanner.existingStock} قطعة) بتاريخ انتهاء صلاحية (${expiryAlertBanner.existingExpiry}). سيتم إضافة الشحنة الجديدة كدفعة إضافية مع الاحتفاظ بتواريخ كل دفعة وتنبيهك قبل انتهاء أي منها.`,
                  `لە کۆگادا ئێستا بڕی کۆن هەیە (${expiryAlertBanner.existingStock} دانە) بە بەرواری بەسەرچوونی (${expiryAlertBanner.existingExpiry}). باری نوێ زیاد دەکرێت بە جیاکردنەوەی بەرواری هەردووکیان.`,
                  `Warehouse currently has ${expiryAlertBanner.existingStock} pcs with expiry date (${expiryAlertBanner.existingExpiry}). New purchase will be tracked as a new batch.`
                )}
              </p>
              {expiryAlertBanner.existingBatches && expiryAlertBanner.existingBatches.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {expiryAlertBanner.existingBatches.map((b, idx) => (
                    <span key={b.id || idx} className="text-[10px] bg-black/40 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono text-amber-300">
                      📦 {t('دفعة', 'دەستە', 'Batch')} #{b.batchNumber || idx + 1}: {b.quantity} {t('قطعة', 'دانە', 'pcs')} (📅 {b.expiryDate || 'N/A'})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPACT INPUTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          
          {/* 1. اسم المادة / البحث */}
          <div className="md:col-span-3 relative">
            <label className="text-[10.5px] font-bold text-slate-300 block mb-1">
              • {t('اسم المادة:', 'ناوی کاڵا:', 'Item Name:')}
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
                placeholder={t('ابحث عن مادة أو اكتب اسمها...', 'بگەڕێ بۆ کاڵا یان ناوی بنووسە...', 'Search product or enter name...')}
                className="w-full bg-[#060b14] text-cyan-300 font-bold text-xs py-1.5 pr-8 pl-7 rounded-xl border border-cyan-500/40 focus:outline-none focus:border-cyan-400"
              />
              {productNameInput && (
                <button
                  type="button"
                  onClick={() => {
                    setProductNameInput('');
                    setSearchQuery('');
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* SEARCH DROPDOWN */}
            {isSearchFocused && searchQuery && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-[#0a1124] border border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden z-50 p-1.5 max-h-52 overflow-y-auto">
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800 text-[10px] text-slate-400">
                  <span>{t('نتائج البحث:', 'ئەنجامەکانی گەڕان:', 'Search Results:')}</span>
                  <button onClick={() => setIsSearchFocused(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {filteredSearchResults.length === 0 ? (
                  <div className="p-2 text-center text-slate-400 text-xs">
                    {t('مادة جديدة', 'کاڵای نوێ', 'New Item')}
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
                        <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 font-mono">
                          <span>{prod.barcode}</span>
                          {prod.expiryDate && (
                            <span className="text-amber-400 font-bold">• 📅 {prod.expiryDate}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-amber-300 font-mono font-bold shrink-0">
                        {t('الرصيد:', 'باڵانس:', 'Stock:')} {prod.stock}
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
              <label className="text-[10.5px] font-bold text-slate-300">• {t('العدد:', 'ژمارە / بڕ:', 'Quantity:')}</label>
              <div className="flex items-center gap-1 text-[10px] bg-[#060b14] p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPurchaseUnitMode('carton')}
                  className={`px-1.5 py-0.5 rounded ${purchaseUnitMode === 'carton' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                >
                  {t('كرتون', 'کارتۆن', 'Carton')}
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseUnitMode('piece')}
                  className={`px-1.5 py-0.5 rounded ${purchaseUnitMode === 'piece' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                >
                  {t('مفرد', 'دانە', 'Piece')}
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
                <span className="text-[10px] text-slate-400 shrink-0">{t(`كرتون (${currentTotalPieces} قطعة)`, `کارتۆن (${currentTotalPieces} دانە)`, `Carton (${currentTotalPieces} pcs)`)}</span>
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
                <span className="text-[10px] text-slate-400 shrink-0">{t('قطعة', 'دانە', 'Pieces')}</span>
              </div>
            )}
          </div>

          {/* 3. تاريخ انتهاء الصلاحية للمادة الجديدة (Expiry Date for the Batch) */}
          <div className="md:col-span-2">
            <label className="text-[10.5px] font-bold text-amber-300 block mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>{t('تاريخ الإنتهاء (للشحنة):', 'بەرواری بەسەرچوون:', 'Expiry Date:')}</span>
            </label>
            <DatePickerDDMMYYYY
              value={expiryDateInput}
              onChange={(d) => setExpiryDateInput(d)}
              lang={lang}
            />
          </div>

          {/* 4. سعر الشراء القديم */}
          <div className="md:col-span-2">
            <label className="text-[10.5px] font-bold text-slate-400 block mb-1">
              • {t(`الشراء القديم:`, `کڕینی پێشوو:`, `Old Cost:`)}
            </label>
            <div className="w-full bg-[#060b14] text-slate-300 font-mono font-bold text-xs py-1.5 px-2 rounded-xl border border-slate-800 text-center flex items-center justify-between">
              <span>{displayOldPurchasePrice.toLocaleString()}</span>
              <span className="text-[9px] text-slate-500">{currency}</span>
            </div>
          </div>

          {/* 5. سعر الشراء الجديد */}
          <div className="md:col-span-2">
            <label className="text-[10.5px] font-bold text-emerald-300 block mb-1">
              • {t(`الشراء الجديد:`, `کڕینی نوێ:`, `New Cost:`)}
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
            <span className="text-xs font-bold text-slate-300">{t('مجموع الشراء للمادة:', 'کۆی کڕینی کاڵاکە:', 'Item Purchase Total:')}</span>
            <span className="px-3 py-1 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-black text-xs">
              {currentTotalItemPurchaseAmount.toLocaleString()} {currency}
            </span>

            {/* Visual price change indicator */}
            {isPriceIncreased ? (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-rose-400" />
                <span>{t(`ارتفع (+${priceDifference.toLocaleString()})`, `بەرزبووەوە (+${priceDifference.toLocaleString()})`, `Increased (+${priceDifference.toLocaleString()})`)}</span>
              </span>
            ) : isPriceDecreased ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                <span>{t(`انخفض (${priceDifference.toLocaleString()})`, `داشکاوە (${priceDifference.toLocaleString()})`, `Decreased (${priceDifference.toLocaleString()})`)}</span>
              </span>
            ) : null}

            {/* Calculated cost indicator for reports and profits */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-[11px]">
              <span className="text-purple-300 font-bold">{t('التكلفة المحسوبة للأرباح والتقارير:', 'تێچووی حیسابکراو بۆ قازانج و ڕاپۆرت:', 'Calculated Cost (Profits/Reports):')}</span>
              <span className="font-mono font-black text-purple-200">{effectivePieceCost.toLocaleString()} {currency}</span>
            </div>
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
              <span>{t(`الباركود والعبوة (${piecesPerCarton})`, `بارکۆد و پاکەت (${piecesPerCarton})`, `Barcode & Pack (${piecesPerCarton})`)}</span>
            </button>

            {/* Button: Retail Price & Profit */}
            <button
              type="button"
              onClick={() => setShowProfitModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>{t(`سعر البيع والأرباح (${retailSellingPrice} ${currency})`, `نرخی فرۆشتن و قازانج (${retailSellingPrice} ${currency})`, `Sale Price & Profit (${retailSellingPrice} ${currency})`)}</span>
            </button>

            {/* Button: Cost Calculation Method */}
            <button
              type="button"
              onClick={() => setShowCostMethodModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>{t(`طريقة احتساب التكلفة (${costUpdateMethod === 'weighted_average' ? 'المتوسط المرجح' : 'السعر الجديد'})`, `شێوازی تێچوو (${costUpdateMethod === 'weighted_average' ? 'تێکڕای هاوسەنگ' : 'نرخی نوێ'})`, `Cost Method (${costUpdateMethod === 'weighted_average' ? 'Weighted Avg' : 'New Price'})`)}</span>
            </button>

            {/* 6. ADD ITEM BUTTON */}
            <button
              type="button"
              onClick={handleAddItemToGrid}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('إضافة للفاتورة', 'زیادکردن بۆ پسوڵە', 'Add to Invoice')}</span>
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
            {t('جدول المواد فارغ حالياً. استخدم الشريط أعلاه لإضافة المواد المشتراة.', 'خشتەی کاڵاکان ئێستا بەتاڵە. شریتی سەرەوە بەکاربهێنە بۆ زیادکردنی کاڵاکان.', 'Item grid is empty. Use the top bar to add items.')}
          </div>
        ) : (
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10.5px] bg-[#0a1120]">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">{t('اسم المادة', 'ناوی کاڵا', 'Product Name')}</th>
                <th className="py-2 px-3 text-center">{t('تاريخ الصلاحية', 'بەرواری بەسەرچوون', 'Expiry Date')}</th>
                <th className="py-2 px-3 text-center">{t('نوع ووحدة الشراء', 'جۆر و یەکەی کڕین', 'Unit Type')}</th>
                <th className="py-2 px-3 text-center">{t('الربط والكمية بالقطع', 'بڕ بە دانە', 'Total Qty (Pcs)')}</th>
                <th className="py-2 px-3 text-center">{t('التكلفة (قديم / جديد)', 'تێچوو (کۆن / نوێ)', 'Cost (Old / New)')}</th>
                <th className="py-2 px-3 text-center">{t('سعر البيع للمفرد', 'نرخی فرۆشتنی تاک', 'Retail Price')}</th>
                <th className="py-2 px-3 text-center">{t('مجموع الشراء', 'کۆی کڕین', 'Total Purchase')}</th>
                <th className="py-2 px-3 text-center">{t('الربح المتوقع', 'قازانجی پێشبینیکراو', 'Expected Profit')}</th>
                <th className="py-2 px-3 text-center">{t('حذف', 'سڕینەوە', 'Delete')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {draftItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-cyan-500/5 transition-all">
                  <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                  <td className="py-2 px-3 font-bold text-white">
                    <div className="text-xs">{item.productName}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="text"
                        value={item.barcode || ''}
                        placeholder={t('أدخل الباركود...', 'بارکۆد بنووسە...', 'Enter barcode...')}
                        onChange={(e) => handleUpdateDraftItemBarcode(item.id, e.target.value)}
                        className="bg-[#050B17] border border-cyan-500/40 focus:border-cyan-400 rounded px-1.5 py-0.5 text-center font-mono text-[10px] text-cyan-300 font-bold focus:outline-none w-28 placeholder:text-slate-600"
                        title={t('حقل إدخال أو تعديل الباركود يدوياً', 'دەستکاری بارکۆد', 'Manual Barcode Entry/Edit')}
                      />
                      <button
                        type="button"
                        onClick={() => handleGenerateDraftItemBarcode(item.id)}
                        className="p-1 px-1.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-[9.5px] font-bold border border-cyan-500/40 flex items-center gap-0.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-sm"
                        title={t('توليد باركود فريد يبدأ بـ 200245', 'دروستکردنی بارکۆدی نوێ', 'Generate unique barcode')}
                      >
                        <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                        <span>{t('توليد', 'دروستکردن', 'Gen')}</span>
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    {item.expiryDate ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 font-bold border border-amber-500/40 text-[10.5px] flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        <span>{item.expiryDate}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">
                        {t('غير محدد', 'دیاری نەکراوە', 'Not set')}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    {item.purchaseUnitMode === 'carton' ? (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30">
                        {item.cartonsCount} {t('كرتون', 'کارتۆن', 'Carton')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-bold">
                        {t('مفرد (قطع)', 'تاک (دانە)', 'Piece (Singles)')}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-amber-300">
                    {item.totalPieces} {t('قطعة', 'دانە', 'Pcs')}
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
                      title={t('حذف', 'سڕینەوە', 'Delete')}
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
            <span className="text-slate-400 font-bold">• {t('إجمالي الفاتورة:', 'کۆی پسوڵە:', 'Total Invoice:')}</span>
            <span className="text-lg font-mono font-black text-cyan-300">
              {totalInvoiceAmount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">{currency}</span>
            </span>
          </div>

          {/* TOTAL ITEMS & PIECES */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">• {t('المواد والقطع:', 'کاڵا و دانەکان:', 'Items & Pieces:')}</span>
            <span className="font-mono font-bold text-amber-300">
              {t(`${totalItemsCount} مواد (${totalPiecesCount} قطعة)`, `${totalItemsCount} کاڵا (${totalPiecesCount} دانە)`, `${totalItemsCount} items (${totalPiecesCount} pcs)`)}
            </span>
          </div>

          {/* TOTAL EXPECTED PROFIT */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">• {t('الأرباح المتوقعة:', 'قازانجی پێشبینیکراو:', 'Expected Profit:')}</span>
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
            <span>{t(`الخصم والتسوية (صافي: ${netTotalPayable.toLocaleString()} ${currency})`, `داشکاندن و یەکلاییکردنەوە (صافی: ${netTotalPayable.toLocaleString()} ${currency})`, `Discount & Net: ${netTotalPayable.toLocaleString()} ${currency}`)}</span>
          </button>

        </div>

        {/* ACTION SAVE BUTTONS */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
          <button
            onClick={handleSaveInvoice}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('[حفظ وتحديث المخزون والأسعار]', '[پاشەکەوتکردن و نوێکردنەوەی کۆگا و نرخ]', '[Save & Update Stock & Prices]')}</span>
          </button>

          <button
            onClick={handleResetForm}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
          >
            {t('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
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
                <span>{t('تفاصيل إضافية لفاتورة التوريد', 'وردەکاری زیاتری پسوڵەی کڕین', 'Extra Invoice Details')}</span>
              </h3>
              <button onClick={() => setShowHeaderMoreModal(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">{t('رقم هاتف المورد / المندوب:', 'ژمارەی تەلەفۆنی دابینکەر / نوێنەر:', 'Supplier Phone:')}</label>
                <input
                  type="text"
                  value={delegatePhone}
                  onChange={(e) => setDelegatePhone(e.target.value)}
                  placeholder="07700000000"
                  className="w-full bg-[#060b14] text-slate-200 py-1.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">{t('ملاحظات الفاتورة:', 'تێبینییەکانی پسوڵە:', 'Invoice Notes:')}</label>
                <textarea
                  rows={3}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder={t('ملاحظات حول حالة الشحنة أو تاريخ التوريد...', 'تێبینی لەسەر بار یان بەرواری گەیشتن...', 'Notes about shipment or date...')}
                  className="w-full bg-[#060b14] text-slate-200 py-1.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHeaderMoreModal(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white font-bold text-xs"
              >
                {t('تأكيد', 'پەسەندکردن', 'Confirm')}
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
                <span>{t('تفاصيل الباركود والعبوة للمادة', 'وردەکاری بارکۆد و پاکەتی کاڵا', 'Item Barcode & Pack Details')}</span>
              </h3>
              <button onClick={() => setShowItemDetailsModal(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">{t('الباركود الخاصة بالمادة:', 'بارکۆدی تایبەت بە کاڵا:', 'Item Barcode:')}</label>
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    const trimmed = val.trim();
                    if (trimmed) {
                      const dup = products.find(p => p.barcode.trim().toLowerCase() === trimmed.toLowerCase() && p.id !== selectedProduct?.id);
                      if (dup) {
                        alert(t(
                          `⚠️ الباركود (${trimmed}) مسجل مسبقاً لمادة أخرى (${dup.nameAr || dup.name})!\nتم منع تعبئة الباركود المكرر لتفادي التضارب في المخزون.`,
                          `⚠️ بارکۆدی (${trimmed}) پێشتر بۆ کاڵای تر تۆمارکراوە (${dup.nameAr || dup.name})!`,
                          `⚠️ Barcode (${trimmed}) is already registered to (${dup.name}).`
                        ));
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
                <label className="text-slate-300 font-bold block mb-1">{t('عدد القطع داخل الكرتون الواحد:', 'ژمارەی دانە لە یەک کارتۆندا:', 'Pieces per Carton:')}</label>
                <input
                  type="number"
                  min="1"
                  value={piecesPerCarton}
                  onChange={(e) => setPiecesPerCarton(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#060b14] text-cyan-300 font-mono font-bold py-1.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">{t('رقم الوجبة / الدفعة (Batch #):', 'ژمارەی دەستە:', 'Batch Number:')}</label>
                  <input
                    type="text"
                    value={batchNumberInput}
                    onChange={(e) => setBatchNumberInput(e.target.value)}
                    placeholder="BATCH-2025-01"
                    className="w-full bg-[#060b14] text-amber-300 font-mono py-1.5 px-2.5 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">{t('تاريخ الإنتاج (اختياري):', 'بەرواری دروستکردن:', 'Production Date:')}</label>
                  <DatePickerDDMMYYYY
                    value={productionDateInput}
                    onChange={(d) => setProductionDateInput(d)}
                    lang={lang}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowItemDetailsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white font-bold text-xs"
              >
                {t('حفظ الإعدادات', 'پاشەکەوتکردن', 'Save')}
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
                <span>{t('احتساب الأرباح وسعر البيع للمفرد', 'هەژمارکردنی قازانج و نرخی فرۆشتنی تاک', 'Profit & Retail Price Calculator')}</span>
              </h3>
              <button onClick={() => setShowProfitModal(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-emerald-300 font-bold block mb-1">{t('سعر البيع للمفرد للزبون:', 'نرخی فرۆشتنی تاک بۆ کڕیار:', 'Retail Sale Price:')}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={retailSellingPrice}
                    onChange={(e) => setRetailSellingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className={`w-full font-mono font-black py-2 px-3 rounded-xl border text-center transition-all ${
                      effectivePieceCost > 0 && retailSellingPrice < effectivePieceCost
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500 ring-2 ring-rose-500/40'
                        : 'bg-[#060b14] text-emerald-400 border-emerald-500/50'
                    }`}
                  />
                  <span className="text-slate-400 font-bold">{currency}</span>
                </div>
                {effectivePieceCost > 0 && retailSellingPrice < effectivePieceCost && (
                  <div className="mt-1.5 p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-[10.5px] font-bold text-rose-300 flex items-center gap-1.5">
                    <span>⚠️ {t(`تنبيه: سعر البيع أقل من سعر التكلفة (${effectivePieceCost.toLocaleString()} ${currency})!`, `ئاگاداری: نرخی فرۆشتن کەمترە لە تێچوو (${effectivePieceCost.toLocaleString()} ${currency})!`, `Warning: Sale price is lower than cost!`)}</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#060b14] border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('تكلفة الشراء للقطعة:', 'تێچووی کڕینی یەک دانە:', 'Cost per Piece:')}</span>
                  <span className="font-mono font-bold text-cyan-300">{effectivePieceCost.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('ربح القطعة الواحدة:', 'قازانجی یەک دانە:', 'Profit per Piece:')}</span>
                  <span className="font-mono font-bold text-amber-300">{currentPieceProfit.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('نسبة الربح %:', 'ڕێژەی قازانج ٪:', 'Profit Margin %:')}</span>
                  <span className="font-mono font-bold text-purple-300">{currentProfitMarginPercent}%</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-white font-bold">{t('إجمالي الربح المتوقع للمادة:', 'کۆی قازانجی پێشبینیکراو بۆ کاڵاکە:', 'Total Expected Profit:')}</span>
                  <span className="font-mono font-black text-emerald-400">+{currentTotalItemExpectedProfit.toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowProfitModal(false)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs"
              >
                {t('تطبيق', 'جێبەجێکردن', 'Apply')}
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
                <span>{t('طريقة تحديث تكلفة المخزون', 'شێوازی نوێکردنەوەی تێچووی کۆگا', 'Inventory Cost Method')}</span>
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
                  <span className="block font-bold text-white">1. {t('المتوسط المرجح (Weighted Average Cost)', 'تێکڕای هاوسەنگ (Weighted Average Cost)', 'Weighted Average Cost')}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {t('الدمج بين الكميات والتكلفة القديمة والجديدة.', 'تێکەڵکردنی بڕ و تێچووی کۆن و نوێ.', 'Blend old and new quantities and costs.')}
                  </span>
                  <span className="text-[10.5px] text-emerald-400 font-bold block mt-1">
                    =&gt; {t('التكلفة المحسوبة:', 'تێچووی هەژمارکراو:', 'Calculated Cost:')} {calculatedWeightedCost.toLocaleString()} {currency}
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
                  <span className="block font-bold text-white">2. {t('اعتماد السعر الجديد مباشرة', 'پشتڕاستکردنەوەی ڕاستەوخۆی نرخی نوێ', 'Direct New Price')}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {t('تحديث تكلفة كافة القطع الحالية لسعر الشراء الجديد.', 'نوێکردنەوەی تێچووی هەموو دانەکانی ئێستا بۆ نرخی نوێ.', 'Update cost of all current pieces to new purchase price.')}
                  </span>
                  <span className="text-[10.5px] text-cyan-400 font-bold block mt-1">
                    =&gt; {t('التكلفة المحسوبة:', 'تێچووی هەژمارکراو:', 'Calculated Cost:')} {currentNewPieceCost.toLocaleString()} {currency}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCostMethodModal(false)}
                className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs"
              >
                {t('حفظ الإختيار', 'پاشەکەوتکردنی هەڵبژاردن', 'Save Selection')}
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
                <span>{t('الخصم والتسوية المالي للفاتورة', 'داشکاندن و یەکلاییکردنەوەی دارایی پسوڵە', 'Financial Discount & Settlement')}</span>
              </h3>
              <button onClick={() => setShowSettlementModal(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">{t('الخصم المكتسب من المورد:', 'داشکاندنی بەدەستهاتوو لە دابینکەر:', 'Discount from Supplier:')}</label>
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
                <label className="text-slate-300 font-bold block mb-1">{t('الصافي النهائي للوصل:', 'کۆی صافی کۆتایی پسوڵە:', 'Net Final Total:')}</label>
                <div className="w-full bg-[#060b14] text-emerald-400 font-mono font-black py-2 px-3 rounded-xl border border-emerald-500/40 text-center text-sm">
                  {netTotalPayable.toLocaleString()} {currency}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">{t('المبلغ المدفوع نقدًا للمورد:', 'بڕی دراو بە نەقد بە دابینکەر:', 'Amount Paid in Cash:')}</label>
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
                  {t(`المبلغ المتبقي كدين على المحل: ${remainingDebtAmount.toLocaleString()} ${currency}`, `بڕی ماوە وەک قەرز لەسەر فرۆشگا: ${remainingDebtAmount.toLocaleString()} ${currency}`, `Remaining Debt Balance: ${remainingDebtAmount.toLocaleString()} ${currency}`)}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSettlementModal(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white font-bold text-xs"
              >
                {t('تم', 'تەواو', 'Done')}
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
                  {t(`سجل فواتير التوريد والمشتريات (${purchaseInvoices.length})`, `مێژووی پسوڵەکانی کڕین (${purchaseInvoices.length})`, `Purchase Invoices History (${purchaseInvoices.length})`)}
                </h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {purchaseInvoices.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">{t('لا توجد فواتير شراء سابقة مسجلة', 'هیچ پسوڵەیەکی کڕینی پێشوو تۆمار نەکراوە', 'No previous purchase invoices recorded')}</p>
              ) : (
                purchaseInvoices.map(inv => (
                  <div key={inv.id} className="p-3 rounded-xl bg-[#060b14] border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2 font-mono font-bold text-cyan-300">
                        <span>{inv.invoiceNumber}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {formatDateDDMMYYYY(inv.date)} {inv.time ? `• ${inv.time}` : ''}
                        </span>
                      </div>
                      <p className="font-bold text-white mt-0.5">{inv.supplierName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t(`${inv.items.length} مواد بالفاتورة`, `${inv.items.length} کاڵا لە پسوڵەدا`, `${inv.items.length} items in invoice`)}</p>
                    </div>

                    <div className="text-left rtl:text-right font-mono">
                      <span className="text-emerald-400 font-black text-sm block">
                        {currency}{inv.totalInvoiceAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {t('مدفوع:', 'دراو:', 'Paid:')} {currency}{inv.paidAmount.toLocaleString()}
                      </span>
                      {inv.remainingAmount > 0 && (
                        <span className="text-[10px] text-amber-400 font-bold block">
                          {t('متبقي (دين):', 'ماوە (قەرز):', 'Remaining:')} {currency}{inv.remainingAmount.toLocaleString()}
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
