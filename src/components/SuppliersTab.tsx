import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, Phone, Mail, Star, Plus, DollarSign, Calendar, PackageCheck, AlertCircle,
  Bookmark, CheckCircle2, FileText, Search, Eye, CreditCard, X, MapPin, Receipt,
  Building2, ArrowDownLeft, ArrowUpRight, ShieldCheck, Wallet, RefreshCw,
  RotateCcw, AlertTriangle, Printer, Layers, ChevronDown, ChevronUp, Clock, Tag, UserCheck,
  TrendingUp, TrendingDown, ArrowDownRight, Percent, BarChart3, Activity, Info
} from 'lucide-react';
import { Supplier, StoreSettings, Product, SupplierPayment, PurchaseInvoice, PurchaseInvoiceItem } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { DelegateReturnRecord } from './DelegateReturnsModal';

interface SuppliersTabProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  products?: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  purchaseInvoices?: PurchaseInvoice[];
  setPurchaseInvoices?: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  settings: StoreSettings;
  onOpenAddProductForSupplier?: (supplierName: string) => void;
}

export const SuppliersTab: React.FC<SuppliersTabProps> = ({
  suppliers,
  setSuppliers,
  products = [],
  setProducts,
  purchaseInvoices = [],
  setPurchaseInvoices,
  settings,
  onOpenAddProductForSupplier,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const t = (ar: string, ku: string, en: string = ar) => isKu ? ku : isAr ? ar : en;

  // Filter States
  const [filterTab, setFilterTab] = useState<'all' | 'saved' | 'paid' | 'remaining'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierProductSearch, setSupplierProductSearch] = useState('');
  const [invoicesSearch, setInvoicesSearch] = useState('');
  const [productPriceFilter, setProductPriceFilter] = useState<'all' | 'increased' | 'decreased' | 'stable'>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'invoices' | 'products' | 'returns' | 'history' | 'pay'>('invoices');

  // Expanded Invoice in Details Modal
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Quick Payment Modal for a supplier
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'check'>('transfer');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentInvoiceNo, setPaymentInvoiceNo] = useState<string>('');

  // Return to Delegate Form State inside Supplier Details Modal
  const [returnProductId, setReturnProductId] = useState<string>('');
  const [returnUnitType, setReturnUnitType] = useState<'unit' | 'carton'>('carton');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnCustomCost, setReturnCustomCost] = useState<string>('');
  const [returnReason, setReturnReason] = useState<'EXPIRED' | 'DEFECTIVE' | 'OVERSTOCK' | 'EXCHANGE' | 'WRONG_DELIVERY' | 'OTHER'>('EXPIRED');
  const [returnNote, setReturnNote] = useState<string>('');
  const [returnDeductDebt, setReturnDeductDebt] = useState<boolean>(true);
  const [returnDeductStock, setReturnDeductStock] = useState<boolean>(true);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState<string>('');
  const [printingReturnRecord, setPrintingReturnRecord] = useState<DelegateReturnRecord | null>(null);

  // Delegate Returns Logs (shared from localStorage)
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
      note: paymentNote || t('دفعة تسوية حسـاب للمندوب', 'پارەدانی پاکتاوی قەرز بۆ مەندووب', 'Account settlement payment'),
      invoiceNo: paymentInvoiceNo || `INV-${Math.floor(1000 + Math.random() * 9000)}`
    };

    setSuppliers(prev => prev.map(s => {
      if (s.id === supplierId) {
        const currentInvoiced = s.totalInvoiced ?? s.balanceDue;
        const currentPaid = s.totalPaid ?? 0;
        const updatedPaid = currentPaid + amountNum;
        const updatedBalance = Math.max(0, s.balanceDue - amountNum);
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
      contactPerson: newSupplier.contactPerson || t('المندوب / قسم المبيعات', 'مەندووب / بەشی فرۆشتن', 'Sales Dept / Delegate'),
      phone: newSupplier.phone || '+964 750 000 0000',
      email: newSupplier.email.trim() || '',
      categorySupplied: newSupplier.categorySupplied || t('توريدات عامة', 'دابینکردنی گشتی', 'General'),
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
        note: t('دفعة افتتاحية', 'پارەدانی دەستپێکی', 'Initial payment')
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
      (p.nameKu && p.nameKu.toLowerCase().includes(q)) ||
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

  // Matched products for currently selected supplier
  const matchedSupplierProducts = useMemo(() => {
    if (!selectedSupplier) return [];
    return products.filter(p => {
      const belongsToSupplier = 
        p.supplierId === selectedSupplier.id ||
        (selectedSupplier.name && p.supplierName?.toLowerCase().includes(selectedSupplier.name.toLowerCase())) ||
        (selectedSupplier.nameAr && p.supplierName?.includes(selectedSupplier.nameAr)) ||
        (selectedSupplier.contactPerson && p.supplierDelegate?.toLowerCase().includes(selectedSupplier.contactPerson.toLowerCase())) ||
        (selectedSupplier.nameAr && p.supplierDelegate?.includes(selectedSupplier.nameAr)) ||
        (selectedSupplier.name && p.supplierDelegate?.includes(selectedSupplier.name));
      
      if (!belongsToSupplier) return false;

      if (!supplierProductSearch.trim()) return true;
      const q = supplierProductSearch.toLowerCase().trim();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
        (p.nameKu && p.nameKu.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.categoryAr && p.categoryAr.includes(q))
      );
    });
  }, [selectedSupplier, products, supplierProductSearch]);

  // Purchase Invoices (وصلات الشراء) for selected supplier
  const matchedSupplierInvoices = useMemo(() => {
    if (!selectedSupplier) return [];
    return purchaseInvoices.filter(inv => {
      const supName = inv.supplierName || '';
      const matchesSupplier = 
        supName.toLowerCase().includes(selectedSupplier.name.toLowerCase()) ||
        (selectedSupplier.nameAr && supName.includes(selectedSupplier.nameAr)) ||
        (selectedSupplier.contactPerson && supName.toLowerCase().includes(selectedSupplier.contactPerson.toLowerCase())) ||
        (inv.supplierPhone && selectedSupplier.phone && inv.supplierPhone.includes(selectedSupplier.phone)) ||
        (inv.supplierPhone && selectedSupplier.phone && selectedSupplier.phone.includes(inv.supplierPhone));

      if (!matchesSupplier) return false;

      if (!invoicesSearch.trim()) return true;
      const q = invoicesSearch.toLowerCase().trim();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.date.includes(q) ||
        (inv.notes && inv.notes.toLowerCase().includes(q))
      );
    });
  }, [selectedSupplier, purchaseInvoices, invoicesSearch]);

  // Returns for selected supplier
  const matchedSupplierReturns = useMemo(() => {
    if (!selectedSupplier) return [];
    return delegateLogs.filter(ret => {
      return (
        ret.supplierId === selectedSupplier.id ||
        (ret.supplierName && (
          ret.supplierName.toLowerCase().includes(selectedSupplier.name.toLowerCase()) ||
          (selectedSupplier.nameAr && ret.supplierName.includes(selectedSupplier.nameAr))
        )) ||
        (ret.delegateName && (
          ret.delegateName.toLowerCase().includes(selectedSupplier.contactPerson.toLowerCase()) ||
          (selectedSupplier.nameAr && ret.delegateName.includes(selectedSupplier.nameAr))
        ))
      );
    });
  }, [selectedSupplier, delegateLogs]);

  // Total returns deduction sum for selected supplier
  const totalSupplierReturnsDeductions = useMemo(() => {
    return matchedSupplierReturns.reduce((acc, r) => acc + (r.totalRefundAmount || 0), 0);
  }, [matchedSupplierReturns]);

  // Helper to extract the actual latest purchase price vs previous price and determine price fluctuations (نزلت / ارتفعت)
  const getProductPurchasePricing = (prod: Product) => {
    const upc = prod.unitsPerCarton && prod.unitsPerCarton > 0 ? prod.unitsPerCarton : 12;
    
    // Find the latest purchase invoice for this product
    let latestInvoiceItem: PurchaseInvoiceItem | null = null;
    let latestInvoice: PurchaseInvoice | null = null;
    
    for (const inv of purchaseInvoices) {
      const found = inv.items?.find(it => it.productId === prod.id || (it.barcode && it.barcode === prod.barcode));
      if (found) {
        latestInvoiceItem = found;
        latestInvoice = inv;
        break;
      }
    }

    // 1. Piece Purchase Price (سعر الشراء الجديد للمفرد)
    let latestPiecePrice = 0;
    let oldPiecePrice = 0;

    if (latestInvoiceItem && latestInvoiceItem.newPurchasePrice > 0) {
      latestPiecePrice = latestInvoiceItem.newPurchasePrice;
      oldPiecePrice = latestInvoiceItem.oldPurchasePrice > 0 ? latestInvoiceItem.oldPurchasePrice : (prod.costPerUnit || prod.cost || latestPiecePrice);
    } else if (prod.lastPurchasePrice && prod.lastPurchasePrice > 0) {
      latestPiecePrice = prod.lastPurchasePrice;
      oldPiecePrice = prod.costPerUnit || prod.cost || latestPiecePrice;
    } else if (prod.cartonPurchasePrice && prod.cartonPurchasePrice > 0) {
      latestPiecePrice = Math.round((prod.cartonPurchasePrice / upc) * 100) / 100;
      oldPiecePrice = prod.costPerUnit || prod.cost || latestPiecePrice;
    } else {
      latestPiecePrice = prod.costPerUnit || prod.cost || 0;
      oldPiecePrice = latestPiecePrice;
    }

    // 2. Carton Purchase Price (سعر الشراء الجديد للكرتون)
    let latestCartonPrice = 0;
    let oldCartonPrice = 0;

    if (latestInvoiceItem && latestInvoiceItem.newPurchasePrice > 0) {
      const invUpc = latestInvoiceItem.unitsPerCarton || upc;
      latestCartonPrice = latestInvoiceItem.newPurchasePrice * invUpc;
      oldCartonPrice = (latestInvoiceItem.oldPurchasePrice > 0 ? latestInvoiceItem.oldPurchasePrice : oldPiecePrice) * invUpc;
    } else if (prod.lastCartonPurchasePrice && prod.lastCartonPurchasePrice > 0) {
      latestCartonPrice = prod.lastCartonPurchasePrice;
      oldCartonPrice = (prod.costPerUnit || prod.cost || 0) * upc;
    } else if (prod.cartonPurchasePrice && prod.cartonPurchasePrice > 0) {
      latestCartonPrice = prod.cartonPurchasePrice;
      oldCartonPrice = (prod.costPerUnit || prod.cost || 0) * upc;
    } else {
      latestCartonPrice = latestPiecePrice * upc;
      oldCartonPrice = oldPiecePrice * upc;
    }

    const diffPiece = latestPiecePrice - oldPiecePrice;
    const diffCarton = latestCartonPrice - oldCartonPrice;
    const percentChange = oldPiecePrice > 0 ? ((diffPiece / oldPiecePrice) * 100) : 0;

    let trend: 'up' | 'down' | 'same' = 'same';
    if (diffPiece > 0.001) trend = 'up';
    else if (diffPiece < -0.001) trend = 'down';

    return {
      latestPiecePrice,
      oldPiecePrice,
      latestCartonPrice,
      oldCartonPrice,
      diffPiece,
      diffCarton,
      percentChange: parseFloat(percentChange.toFixed(1)),
      trend,
      latestInvoiceNumber: latestInvoice?.invoiceNumber,
      latestInvoiceDate: latestInvoice?.date,
      upc
    };
  };

  // Price analytics for matched supplier products (مواد ارتفع سعرها / انخفض سعرها / مستقرة)
  const supplierPriceAnalytics = useMemo(() => {
    let increasedCount = 0;
    let decreasedCount = 0;
    let stableCount = 0;

    matchedSupplierProducts.forEach(p => {
      const pricing = getProductPurchasePricing(p);
      if (pricing.trend === 'up') increasedCount++;
      else if (pricing.trend === 'down') decreasedCount++;
      else stableCount++;
    });

    return { increasedCount, decreasedCount, stableCount, totalCount: matchedSupplierProducts.length };
  }, [matchedSupplierProducts, purchaseInvoices]);

  // Filtered supplier products based on search & price fluctuation filter
  const displayedSupplierProducts = useMemo(() => {
    return matchedSupplierProducts.filter(p => {
      if (productPriceFilter === 'all') return true;
      const pricing = getProductPurchasePricing(p);
      return pricing.trend === productPriceFilter;
    });
  }, [matchedSupplierProducts, productPriceFilter, purchaseInvoices]);

  // Selected Product for Return
  const currentReturnProduct = useMemo(() => {
    if (!returnProductId) return matchedSupplierProducts[0] || products[0] || null;
    return products.find(p => p.id === returnProductId) || null;
  }, [returnProductId, matchedSupplierProducts, products]);

  // Pricing analysis for current return product
  const currentReturnPricing = useMemo(() => {
    if (!currentReturnProduct) return null;
    return getProductPurchasePricing(currentReturnProduct);
  }, [currentReturnProduct, purchaseInvoices]);

  // Calculated return unit cost (يحسب سعر الشراء الجديد من آخر وصل شراء وليس سعر التكلفة)
  const activeReturnUnitCost = useMemo(() => {
    if (returnCustomCost !== '' && !isNaN(parseFloat(returnCustomCost))) {
      return parseFloat(returnCustomCost);
    }
    if (!currentReturnProduct || !currentReturnPricing) return 0;
    
    // Always calculate using latest new purchase price (سعر الشراء الجديد في آخر وصل)
    if (returnUnitType === 'carton') {
      return currentReturnPricing.latestCartonPrice || 0;
    } else {
      return currentReturnPricing.latestPiecePrice || 0;
    }
  }, [returnCustomCost, currentReturnProduct, currentReturnPricing, returnUnitType]);

  const activeTotalRefundAmount = (returnQty || 0) * activeReturnUnitCost;

  // Handle Delegate Return Submission (Deducts from supplier debt if chosen)
  const handleExecuteDelegateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !currentReturnProduct || returnQty <= 0 || activeTotalRefundAmount <= 0) {
      alert(t('يرجى تحديد المادة والكمية وتكلفة الإرجاع بشكل صحيح', 'تکایە کاڵا، بڕ و تێچووی گەڕاندنەوە بە دروستی دیاری بکە', 'Please specify valid product, quantity, and cost'));
      return;
    }

    const unitsPerCarton = currentReturnProduct.unitsPerCarton || 12;
    const totalUnitsCalculated = returnUnitType === 'carton' ? returnQty * unitsPerCarton : returnQty;

    const voucherNumber = `RET-DEL-${Math.floor(10000 + Math.random() * 90000)}`;

    const returnRecord: DelegateReturnRecord = {
      id: `ret-${Date.now()}`,
      voucherNumber,
      productId: currentReturnProduct.id,
      productName: currentReturnProduct.nameAr || currentReturnProduct.name,
      barcode: currentReturnProduct.barcode,
      delegateName: selectedSupplier.contactPerson || selectedSupplier.nameAr || selectedSupplier.name,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.nameAr || selectedSupplier.name,
      returnUnitType,
      quantity: returnQty,
      unitsPerCarton,
      totalUnitsCalculated,
      unitCost: activeReturnUnitCost,
      totalRefundAmount: activeTotalRefundAmount,
      reasonType: returnReason,
      reasonNote: returnNote.trim(),
      settlementMethod: returnDeductDebt ? 'deduct_supplier_balance' : 'cash_refund',
      recordedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      stockDeducted: returnDeductStock,
      supplierBalanceUpdated: returnDeductDebt
    };

    // 1. Update Supplier Debt / Balance Due
    if (returnDeductDebt) {
      const deduction = activeTotalRefundAmount;
      const newPaymentLog: SupplierPayment = {
        id: `ret-pay-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount: deduction,
        paymentMethod: 'transfer',
        note: `${t('إرجاع مواد لمندوب', 'گەڕاندنەوەی کاڵا بۆ مەندووب', 'Delegate Return')}: ${currentReturnProduct.nameAr || currentReturnProduct.name} (${returnReason === 'EXPIRED' ? t('منتهي الصلاحية', 'بەسەرچوو', 'Expired') : t('تالف/عيب', 'تێکچوو', 'Damaged')}) [${voucherNumber}]`,
        invoiceNo: voucherNumber
      };

      setSuppliers(prev => prev.map(s => {
        if (s.id === selectedSupplier.id) {
          const currentBal = s.balanceDue || 0;
          const updatedBal = Math.max(0, currentBal - deduction);
          const updatedPayments = [newPaymentLog, ...(s.payments || [])];
          const updated = {
            ...s,
            balanceDue: updatedBal,
            payments: updatedPayments
          };
          setSelectedSupplier(updated);
          return updated;
        }
        return s;
      }));
    }

    // 2. Deduct inventory stock if requested
    if (returnDeductStock && setProducts) {
      setProducts(prev => prev.map(p => {
        if (p.id === currentReturnProduct.id) {
          const newStock = Math.max(0, p.stock - totalUnitsCalculated);
          const cartonsDeducted = returnUnitType === 'carton' ? returnQty : Math.floor(returnQty / unitsPerCarton);
          const newCartons = Math.max(0, p.cartonsCount - cartonsDeducted);
          return {
            ...p,
            stock: newStock,
            totalUnits: newStock,
            cartonsCount: newCartons,
            lastEditDate: new Date().toISOString().split('T')[0],
            status: newStock === 0 ? 'out_of_stock' : newStock <= p.minStock ? 'low_stock' : 'in_stock'
          };
        }
        return p;
      }));
    }

    // 3. Save to delegate logs
    setDelegateLogs(prev => [returnRecord, ...prev]);

    // 4. Success alert and reset
    setReturnSuccessMsg(t(
      `تم إرجاع البضاعة بنجاح وخصم مبلغ (${settings.currencySymbol}${formatNumber(activeTotalRefundAmount)}) من حساب دين المندوب!`,
      `کاڵاکان بە سەرکەوتوویی گەڕێنرانەوە و بڕی (${settings.currencySymbol}${formatNumber(activeTotalRefundAmount)}) لە قەرزی مەندووب کەمکرایەوە!`,
      `Items returned successfully and (${settings.currencySymbol}${formatNumber(activeTotalRefundAmount)}) deducted from delegate balance!`
    ));

    setReturnQty(1);
    setReturnNote('');
    setReturnCustomCost('');

    setTimeout(() => {
      setReturnSuccessMsg('');
    }, 5000);
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-12" dir={isKu || isAr ? 'rtl' : 'ltr'}>
      
      {/* Page Main Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#0C1427] via-[#101A33] to-[#0D1222] p-4 rounded-2xl border border-blue-500/20 shadow-md">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-purple-400" />
            <span>{t('دليل الموردين والمندوبين وشركات التوريد', 'ڕێبەری دابینکەران، مەندووبان و کۆمپانیاکان', 'Suppliers & Delegates Directory')}</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {t(
              'إدارة حسابات المندوبين، وصلات الشراء (نقد ودين)، إرجاع المواد منتهية الصلاحية مع الخصم التلقائي من الدين، وسجل الدفعات',
              'بەڕێوەبردنی هەژماری مەندووبان، پسوولەکانی کڕین (نەقد و قەرز)، گەڕاندنەوەی کاڵای بەسەرچوو بە کەمکردنەوەی ڕاستەوخۆ لە قەرز',
              'Manage supplier accounts, purchase receipts (cash & debt), expired item returns with debt deductions, and payment ledger'
            )}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('إضافة مندوب / شركة توريد', 'زیادکردنی مەندووب / کۆمپانیای دابینکەر', 'Add Supplier / Delegate')}</span>
        </button>
      </div>

      {/* Top Financial Stats & Quick Action Bar (Compact) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        
        {/* Stat 1: Total Saved Companies */}
        <div 
          onClick={() => setFilterTab('saved')}
          className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
            filterTab === 'saved' 
              ? 'border-amber-500/80 bg-gradient-to-br from-amber-950/40 via-[#12192C] to-[#0A0F1D] shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
              : 'border-amber-500/20 bg-[#0A0F1D] hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                {t('شركات محفوظة', 'کۆمپانیا هەڵگیراوەکان', 'Saved')}
              </p>
              <h3 className="text-lg font-black text-white mt-0.5 font-mono flex items-baseline gap-1">
                <span>{totalSavedCount}</span>
                <span className="text-[10px] font-normal text-slate-400">{t('شركة', 'کۆمپانیا', 'vendors')}</span>
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <Bookmark className="w-4 h-4 fill-amber-400/20" />
            </div>
          </div>
        </div>

        {/* Stat 2: Total Invoiced */}
        <div className="p-3 rounded-xl border border-blue-500/20 bg-[#0A0F1D]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                {t('إجمالي التوريدات', 'کۆی کڕین و دابینکردن', 'Total Invoiced')}
              </p>
              <h3 className="text-sm sm:text-base font-black text-white mt-0.5 font-mono">
                {settings.currencySymbol}{formatNumber(totalInvoicedSum)}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Stat 3: Fully Paid */}
        <div 
          onClick={() => setFilterTab('paid')}
          className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
            filterTab === 'paid' 
              ? 'border-emerald-500/80 bg-gradient-to-br from-emerald-950/40 via-[#12192C] to-[#0A0F1D] shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
              : 'border-emerald-500/20 bg-[#0A0F1D] hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                {t('إجمالي المدفوع', 'کۆی پارەی دراو', 'Total Paid')}
              </p>
              <h3 className="text-sm sm:text-base font-black text-emerald-400 mt-0.5 font-mono">
                {settings.currencySymbol}{formatNumber(totalPaidSum)}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Stat 4: Remaining Balance Due */}
        <div 
          onClick={() => setFilterTab('remaining')}
          className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
            filterTab === 'remaining' 
              ? 'border-rose-500/80 bg-gradient-to-br from-rose-950/40 via-[#12192C] to-[#0A0F1D] shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
              : 'border-rose-500/20 bg-[#0A0F1D] hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                {t('الباقي / ديون الموردين', 'ماوە / قەرزی دابینکەران', 'Debt / Due Balance')}
              </p>
              <h3 className="text-sm sm:text-base font-black text-rose-400 mt-0.5 font-mono">
                {settings.currencySymbol}{formatNumber(totalRemainingSum)}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-[#0A0F1D] p-2.5 rounded-xl border border-slate-800">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filterTab === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{t('جميع الشركات', 'هەموو کۆمپانیاکان', 'All')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {suppliers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('saved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filterTab === 'saved'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{t('محفوظة', 'هەڵگیراوەکان', 'Saved')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-amber-300">
              {totalSavedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filterTab === 'paid'
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('مدفوع بالكامل', 'تەواوی دراوە', 'Paid')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-emerald-300">
              {fullyPaidCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('remaining')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filterTab === 'remaining'
                ? 'bg-rose-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t('عليها متبقي (دين)', 'قەرزدار (ماوە)', 'Debt')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-rose-300">
              {remainingDebtCount}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('البحث باسم المندوب، الشركة، الباركود، الهاتف...', 'گەڕان بە ناوی مەندووب، کۆمپانیا، بارکۆد، ژمارە مۆبایل...', 'Search delegate, company, barcode, phone...')}
            className="w-full bg-[#050914] text-slate-200 text-xs py-1.5 px-8 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Barcode Search Match Notification Banner */}
      {barcodeMatchedProd && (
        <div className="bg-gradient-to-r from-cyan-950 via-[#0C1E38] to-[#0A0F1D] border border-cyan-500/50 p-2.5 rounded-xl flex items-center justify-between text-xs text-cyan-200 animate-fadeIn shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-sm border border-cyan-500/30">📦</span>
            <div>
              <p className="font-bold text-white text-xs">
                {t('نتيجة مطابقة الباركود:', 'ئەنجامی گەڕانی بارکۆد:', 'Barcode Match:')} <span className="font-mono text-cyan-300 bg-cyan-900/60 px-1.5 py-0.5 rounded border border-cyan-500/40 font-bold">{barcodeMatchedProd.barcode}</span> - <strong className="text-amber-300">{isKu ? (barcodeMatchedProd.nameKu || barcodeMatchedProd.nameAr) : (barcodeMatchedProd.nameAr || barcodeMatchedProd.name)}</strong>
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>👤 {t('المندوب:', 'مەندووب:', 'Delegate:')} <strong className="text-cyan-300">{barcodeMatchedProd.supplierDelegate || t('غير محدد', 'دیاری نەکراو', 'N/A')}</strong></span>
                <span>•</span>
                <span>🏭 {t('شركة التوريد:', 'کۆمپانیای دابینکەر:', 'Supplier:')} <strong className="text-purple-300">{barcodeMatchedProd.supplierName}</strong></span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Grid Display */}
      {filteredSuppliers.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-slate-800 space-y-2 bg-[#0A0F1D]">
          <Truck className="w-10 h-10 text-slate-600 mx-auto opacity-50" />
          <h3 className="text-xs font-bold text-slate-300">
            {t('لا توجد شركات أو مندوبين مطابقين للتصفية', 'هیچ کۆمپانیا یان مەندووبێک نەدۆزرایەوە', 'No suppliers match current filter')}
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  setModalActiveTab('invoices');
                }}
                className={`p-3.5 rounded-2xl border transition-all space-y-2.5 relative group cursor-pointer hover:-translate-y-0.5 ${
                  s.isSaved 
                    ? 'border-amber-500/30 bg-gradient-to-b from-[#0F172A] to-[#0A0F1D] shadow-[0_0_12px_rgba(245,158,11,0.06)]' 
                    : 'border-blue-500/20 bg-[#090E1A] hover:border-cyan-500/40'
                }`}
              >
                
                {/* Top Header Card Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl p-2 rounded-xl bg-slate-800/90 border border-slate-700/80 shrink-0 shadow-inner">
                      {s.avatar}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-black text-white truncate group-hover:text-cyan-300 transition-colors">
                          {isKu ? (s.nameAr || s.name) : (isAr ? s.nameAr : s.name)}
                        </h3>
                        {isFullyPaid ? (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold shrink-0 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>{t('خالص', 'پاکتاو', 'Paid')}</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold shrink-0 flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>{t('عليه دين', 'قەرزدار', 'Debt')}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-purple-400 font-semibold truncate">
                        {s.categorySupplied}
                      </p>
                    </div>
                  </div>

                  {/* Bookmark Save Action Toggle */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => toggleSaveSupplier(s.id, e)}
                      title={s.isSaved ? t('إزالة من المفضلة', 'لابردن لە دڵخوازەکان', 'Unbookmark') : t('حفظ في المفضلة', 'زیادکردن بۆ دڵخوازەکان', 'Bookmark')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        s.isSaved
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-slate-800/60 text-slate-500 hover:text-amber-300 hover:bg-slate-800'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${s.isSaved ? 'fill-amber-400' : ''}`} />
                    </button>

                    <span className="flex items-center text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-lg border border-amber-500/20">
                      <Star className="w-2.5 h-2.5 fill-amber-400 mr-0.5 rtl:ml-0.5" />
                      {s.rating}
                    </span>
                  </div>
                </div>

                {/* Contact Delegate Info */}
                <div className="space-y-0.5 text-[11px] text-slate-300 pt-1.5 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <span>👤</span>
                      <span>{t('المندوب:', 'مەندووب:', 'Contact:')}</span>
                    </span>
                    <span className="font-semibold text-cyan-300">{s.contactPerson}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      <span>{t('الهاتف:', 'مۆبایل:', 'Phone:')}</span>
                    </span>
                    <span className="font-mono text-slate-300">{s.phone}</span>
                  </div>
                </div>

                {/* Financial Summary Card Box */}
                <div className="bg-[#050914] p-2 rounded-xl border border-slate-800/90 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase">{t('إجمالي', 'کۆی کڕین', 'Invoiced')}</p>
                    <p className="text-[11px] font-mono font-bold text-blue-300 mt-0.5">
                      {settings.currencySymbol}{formatNumber(invoiced)}
                    </p>
                  </div>
                  <div className="border-x border-slate-800">
                    <p className="text-[8px] font-bold text-slate-500 uppercase">{t('المدفوع', 'دراو', 'Paid')}</p>
                    <p className="text-[11px] font-mono font-bold text-emerald-400 mt-0.5">
                      {settings.currencySymbol}{formatNumber(paid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase">{t('الباقي', 'ماوە', 'Debt')}</p>
                    <p className={`text-[11px] font-mono font-black mt-0.5 ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {settings.currencySymbol}{formatNumber(balance)}
                    </p>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSupplier(s);
                      setModalActiveTab('invoices');
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-all border border-slate-700/60 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t('فتح الوصلات والتفاصيل', 'کردنەوەی پسوولە و زانیاری', 'Details & Invoices')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaymentSupplier(s);
                      setPaymentAmount(s.balanceDue > 0 ? s.balanceDue.toString() : '');
                    }}
                    className="py-1.5 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{t('تسديد', 'دانەوە', 'Pay')}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* COMPACT & NEAT SUPPLIER / DELEGATE DETAILS MODAL */}
      {/* ======================================================== */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-3 animate-fadeIn">
          <div className="w-full max-w-5xl max-h-[94vh] h-[94vh] bg-[#0A0F1D] border border-cyan-500/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Top Header (Compact) */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-[#0C152B] via-[#0F1C3B] to-[#0A0F1D] border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl p-1.5 rounded-xl bg-slate-800/90 border border-slate-700 shrink-0">
                  {selectedSupplier.avatar}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white truncate">
                      {isKu ? (selectedSupplier.nameAr || selectedSupplier.name) : (isAr ? selectedSupplier.nameAr : selectedSupplier.name)}
                    </h2>
                    <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      👤 {selectedSupplier.contactPerson}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSaveSupplier(selectedSupplier.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                        selectedSupplier.isSaved
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <Bookmark className={`w-3 h-3 ${selectedSupplier.isSaved ? 'fill-amber-300' : ''}`} />
                      <span>{selectedSupplier.isSaved ? t('محفوظة', 'هەڵگیراوە', 'Saved') : t('حفظ', 'هەڵگرتن', 'Save')}</span>
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-purple-400 font-semibold">{selectedSupplier.categorySupplied}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-slate-300">
                      <Phone className="w-2.5 h-2.5 text-cyan-400" />
                      {selectedSupplier.phone}
                    </span>
                    {selectedSupplier.email && (
                      <>
                        <span>•</span>
                        <span className="text-slate-400">{selectedSupplier.email}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onOpenAddProductForSupplier && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAddProductForSupplier(selectedSupplier.nameAr || selectedSupplier.name);
                    }}
                    className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[11px] shadow-sm items-center gap-1 border border-cyan-400/30 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('إدخال مادة جديدة لهذا المندوب', 'زیادکردنی کاڵای نوێ بۆ ئەم مەندووبە', 'Add Product')}</span>
                  </button>
                )}
                
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-all cursor-pointer"
                  title={t('إغلاق', 'داخستن', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Financial Banner (4 Compact Balanced Metric Boxes + Price Trend Indicator) */}
            <div className="px-3 py-2 bg-[#050914] border-b border-slate-800 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                
                {/* 1. Total Purchases */}
                <div className="bg-[#090E1A] p-2 rounded-xl border border-blue-500/20">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('إجمالي الفواتير والتوريد', 'کۆی گشتی پسوولە و کڕین', 'Total Invoiced')}</p>
                  <p className="text-sm sm:text-base font-mono font-black text-blue-400 mt-0.5">
                    {settings.currencySymbol}{formatNumber(selectedSupplier.totalInvoiced ?? selectedSupplier.balanceDue)}
                  </p>
                </div>

                {/* 2. Total Paid */}
                <div className="bg-[#090E1A] p-2 rounded-xl border border-emerald-500/20">
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">{t('إجمالي المدفوع', 'کۆی پارەی دراو', 'Total Paid')}</p>
                  <p className="text-sm sm:text-base font-mono font-black text-emerald-400 mt-0.5">
                    {settings.currencySymbol}{formatNumber(selectedSupplier.totalPaid ?? 0)}
                  </p>
                </div>

                {/* 3. Total Returns Deductions */}
                <div className="bg-[#090E1A] p-2 rounded-xl border border-amber-500/20">
                  <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">{t('المرتجعات والخصومات', 'گەڕاندنەوە و کەمکراوە', 'Returns Deductions')}</p>
                  <p className="text-sm sm:text-base font-mono font-black text-amber-400 mt-0.5">
                    {settings.currencySymbol}{formatNumber(totalSupplierReturnsDeductions)}
                  </p>
                </div>

                {/* 4. Net Remaining Debt */}
                <div className={`p-2 rounded-xl border ${selectedSupplier.balanceDue > 0 ? 'border-rose-500/40 bg-rose-950/20' : 'border-emerald-500/40 bg-emerald-950/20'}`}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('الباقي / دين المندوب المستحق', 'ماوە / قەرزی مەندووب', 'Remaining Debt')}</p>
                  <p className={`text-sm sm:text-base font-mono font-black mt-0.5 ${selectedSupplier.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {settings.currencySymbol}{formatNumber(selectedSupplier.balanceDue)}
                  </p>
                </div>

              </div>

              {/* Price Fluctuation Summary Bar (مؤشر الأسعار التي نزلت أو ارتفعت لدى هذا المندوب) */}
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#080D1A] border border-slate-800 text-[11px] flex-wrap">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('مؤشر تغير أسعار مواد هذا المندوب:', 'ئاماری گۆڕانکاری نرخەکانی ئەم مەندووبە:', 'Price Fluctuations Indicator:')}</span>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Prices Increased */}
                  <button
                    type="button"
                    onClick={() => {
                      setProductPriceFilter('increased');
                      setModalActiveTab('products');
                    }}
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      productPriceFilter === 'increased' && modalActiveTab === 'products'
                        ? 'bg-rose-500/30 text-rose-200 border-rose-500'
                        : 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:border-rose-500/60'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3 text-rose-400" />
                    <span>{supplierPriceAnalytics.increasedCount} {t('أسعار ارتفعت', 'نرخی بەرزبووەوە', 'Prices Increased')}</span>
                  </button>

                  {/* Prices Decreased */}
                  <button
                    type="button"
                    onClick={() => {
                      setProductPriceFilter('decreased');
                      setModalActiveTab('products');
                    }}
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      productPriceFilter === 'decreased' && modalActiveTab === 'products'
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500'
                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/60'
                    }`}
                  >
                    <TrendingDown className="w-3 h-3 text-emerald-400" />
                    <span>{supplierPriceAnalytics.decreasedCount} {t('أسعار انخفضت', 'نرخی دابەزی', 'Prices Decreased')}</span>
                  </button>

                  {/* Prices Stable */}
                  <button
                    type="button"
                    onClick={() => {
                      setProductPriceFilter('stable');
                      setModalActiveTab('products');
                    }}
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      productPriceFilter === 'stable' && modalActiveTab === 'products'
                        ? 'bg-slate-700 text-white border-slate-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>⚖️</span>
                    <span>{supplierPriceAnalytics.stableCount} {t('أسعار ثابتة', 'نرخی جێگیر', 'Prices Stable')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Navigation Sub-tabs (Compact & Clean) */}
            <div className="flex items-center justify-between px-3 pt-2 border-b border-slate-800 bg-[#0A0F1D] overflow-x-auto">
              <div className="flex items-center gap-1 sm:gap-2">
                
                {/* TAB 1: Purchased Invoices */}
                <button
                  onClick={() => setModalActiveTab('invoices')}
                  className={`pb-2 px-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    modalActiveTab === 'invoices'
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('وصلات وفواتير الشراء', 'پسوولەکانی کڕین', 'Purchased Invoices')}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 border border-cyan-500/30 text-[9px] text-cyan-300 font-mono font-bold">
                    {matchedSupplierInvoices.length}
                  </span>
                </button>

                {/* TAB 2: Delegate Supplied Products */}
                <button
                  onClick={() => setModalActiveTab('products')}
                  className={`pb-2 px-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    modalActiveTab === 'products'
                      ? 'border-blue-400 text-blue-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t('المواد الموردة (دليل المندوب)', 'کاڵاکانی مەندووب', 'Supplied Products')}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-950 border border-blue-500/30 text-[9px] text-blue-300 font-mono font-bold">
                    {matchedSupplierProducts.length}
                  </span>
                </button>

                {/* TAB 3: Return Items to Delegate (خصم من الدين عند انتهاء الصلاحية) */}
                <button
                  onClick={() => setModalActiveTab('returns')}
                  className={`pb-2 px-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    modalActiveTab === 'returns'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('إرجاع مواد للمندوب (خصم من الدين)', 'گەڕاندنەوەی کاڵا بۆ مەندووب (کەمکردنەوە لە قەرز)', 'Returns & Debt Deductions')}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-950 border border-amber-500/30 text-[9px] text-amber-300 font-mono font-bold">
                    {matchedSupplierReturns.length}
                  </span>
                </button>

                {/* TAB 4: Payment Ledger */}
                <button
                  onClick={() => setModalActiveTab('history')}
                  className={`pb-2 px-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    modalActiveTab === 'history'
                      ? 'border-indigo-400 text-indigo-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('سجل الدفعات والحركات', 'مێژووی پارەدان', 'Payment Ledger')}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[9px] text-slate-300 font-mono font-bold">
                    {selectedSupplier.payments?.length || 0}
                  </span>
                </button>

                {/* TAB 5: Add Payment */}
                <button
                  onClick={() => setModalActiveTab('pay')}
                  className={`pb-2 px-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    modalActiveTab === 'pay'
                      ? 'border-emerald-400 text-emerald-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('تسجيل دفعة جديدة', 'تۆمارکردنی پارەدان', 'Add Payment')}</span>
                </button>

              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1">
              
              {/* ======================================================== */}
              {/* TAB 1: PURCHASED INVOICES (وصلات الشراء: نقد / دين / جزئي) */}
              {/* ======================================================== */}
              {modalActiveTab === 'invoices' && (
                <div className="space-y-3">
                  
                  {/* Search Bar for Invoices */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#050914] p-2 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-slate-200">
                        {t('قائمة وصلات وفواتير التوريد من هذا المندوب', 'لیستی پسوولە و فاکتۆری کڕین لەم مەندووبە', 'Purchased Invoices from this Delegate')}
                      </h4>
                    </div>

                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-400 absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={invoicesSearch}
                        onChange={(e) => setInvoicesSearch(e.target.value)}
                        placeholder={t('بحث برقم الوصل أو التاريخ...', 'گەڕان بە ژمارەی پسوولە یان بەروار...', 'Search invoice # or date...')}
                        className="bg-[#0A0F1D] text-slate-200 text-[11px] py-1 px-7 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 w-44 sm:w-56"
                      />
                    </div>
                  </div>

                  {matchedSupplierInvoices.length === 0 ? (
                    <div className="p-6 text-center bg-[#050914] rounded-xl border border-slate-800 space-y-2">
                      <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-slate-400 text-xs font-semibold">
                        {t(
                          'لا توجد وصلات شراء مسجلة حالياً باسم هذا المندوب',
                          'هیچ پسوولەیەکی کڕین بە ناوی ئەم مەندووبە تۆمار نەکراوە',
                          'No purchase invoices found for this delegate'
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {t('يمكنك إنشاء وصل شراء جديد من تبويب المشتريات واختيار هذا المندوب', 'دەتوانیت لە بەشی کڕین پسوولەی نوێ دروست بکەیت بە ناوی ئەم مەندووبە', 'You can create a new purchase invoice in Purchases tab')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {matchedSupplierInvoices.map((inv) => {
                        const isExpanded = expandedInvoiceId === inv.id;
                        
                        // Payment method badge styling
                        const isCash = inv.paymentType === 'cash';
                        const isCredit = inv.paymentType === 'credit';
                        const isPart = inv.paymentType === 'part';

                        const paymentBadgeColor = isCash 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                          : isCredit 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                        const paymentBadgeText = isCash 
                          ? t('نقد (كاش)', 'نەقد (کاش)', 'Cash') 
                          : isCredit 
                          ? t('دين (آجل)', 'قەرز (دین)', 'Credit (Debt)') 
                          : t('دفعة جزئية (نقد + دين)', 'پارچەیی (نەقد + قەرز)', 'Partial');

                        return (
                          <div 
                            key={inv.id} 
                            className="bg-[#050914] rounded-xl border border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
                          >
                            {/* Invoice Summary Row */}
                            <div className="p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                              
                              {/* Invoice Number & Date */}
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  <Receipt className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <strong className="text-white font-mono text-xs">{inv.invoiceNumber}</strong>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${paymentBadgeColor}`}>
                                      {paymentBadgeText}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    <span className="flex items-center gap-1 font-mono text-cyan-400">
                                      <Calendar className="w-2.5 h-2.5" />
                                      {inv.date} {inv.time || ''}
                                    </span>
                                    <span>•</span>
                                    <span>{inv.items?.length || 0} {t('مواد مشتراة', 'کاڵای کڕاو', 'items')}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Financial Breakdown of Invoice */}
                              <div className="flex items-center gap-3 font-mono text-xs">
                                
                                {/* Total Amount */}
                                <div className="text-center sm:text-right rtl:sm:text-left">
                                  <span className="text-[9px] text-slate-500 block">{t('الإجمالي', 'کۆی گشتی', 'Total')}</span>
                                  <strong className="text-white font-bold">
                                    {settings.currencySymbol}{formatNumber(inv.totalInvoiceAmount)}
                                  </strong>
                                </div>

                                {/* Paid Amount */}
                                <div className="text-center sm:text-right rtl:sm:text-left">
                                  <span className="text-[9px] text-emerald-400 block">{t('المدفوع', 'دراو', 'Paid')}</span>
                                  <strong className="text-emerald-400 font-bold">
                                    {settings.currencySymbol}{formatNumber(inv.paidAmount || 0)}
                                  </strong>
                                </div>

                                {/* Remaining Debt */}
                                <div className="text-center sm:text-right rtl:sm:text-left">
                                  <span className="text-[9px] text-rose-400 block">{t('المتبقي (دين)', 'ماوە (قەرز)', 'Remaining')}</span>
                                  <strong className={`font-bold ${(inv.remainingAmount || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {settings.currencySymbol}{formatNumber(inv.remainingAmount || 0)}
                                  </strong>
                                </div>

                                {/* Expand Toggle Button */}
                                <button
                                  type="button"
                                  onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                                  title={isExpanded ? t('طي التفاصيل', 'شاردنەوە', 'Collapse') : t('عرض محتويات الوصل', 'پیشاندانی کاڵاکان', 'Expand')}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>

                              </div>

                            </div>

                            {/* Expanded Item List Inside Invoice */}
                            {isExpanded && (
                              <div className="p-3 bg-[#080D1A] border-t border-slate-800/80 space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                                  <span>{t('المواد والأصناف المسجلة داخل هذا الوصل:', 'کاڵاکانی ناو ئەم پسوولەیە:', 'Items in this Invoice:')}</span>
                                  {inv.notes && (
                                    <span className="text-[10px] text-slate-400 font-normal italic">
                                      📝 {inv.notes}
                                    </span>
                                  )}
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-[10px] text-slate-300 text-right rtl:text-right ltr:text-left">
                                    <thead className="bg-[#050914] text-slate-400 font-bold border-b border-slate-800">
                                      <tr>
                                        <th className="p-1.5">#</th>
                                        <th className="p-1.5">{t('المادة', 'کاڵا', 'Product')}</th>
                                        <th className="p-1.5">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                                        <th className="p-1.5 text-center">{t('الكمية المشتراة', 'بڕی کڕاو', 'Qty')}</th>
                                        <th className="p-1.5 text-center">{t('سعر الشراء الجديد', 'نرخی نوێی کڕین', 'New Buy Price')}</th>
                                         <th className="p-1.5 text-center">{t('تغير السعر', 'گۆڕانی نرخ', 'Price Trend')}</th>
                                        <th className="p-1.5 text-center">{t('سعر البيع', 'نرخی فرۆشتن', 'Sell Price')}</th>
                                        <th className="p-1.5 text-center">{t('الإجمالي', 'کۆی گشتی', 'Subtotal')}</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 font-mono">
                                      {inv.items?.map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-slate-800/40">
                                          <td className="p-1.5 text-slate-500 font-sans">{idx + 1}</td>
                                          <td className="p-1.5 font-sans font-bold text-white flex items-center gap-1.5">
                                            <span>{item.imageIcon || '📦'}</span>
                                            <span>{isKu ? (item.productNameAr || item.productName) : (item.productNameAr || item.productName)}</span>
                                          </td>
                                          <td className="p-1.5 text-cyan-400">{item.barcode}</td>
                                          <td className="p-1.5 text-center font-bold text-white">
                                            {item.purchasedQuantity}
                                          </td>
                                          <td className="p-1.5 text-center text-amber-300 font-bold">
                                            {settings.currencySymbol}{item.newPurchasePrice}
                                          </td>
                                          <td className="p-1.5 text-center font-sans">
                                            {(item.oldPurchasePrice && item.newPurchasePrice > item.oldPurchasePrice) ? (
                                              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold inline-flex items-center gap-0.5 font-mono">
                                                <TrendingUp className="w-2.5 h-2.5" />
                                                <span>+{settings.currencySymbol}{formatNumber(item.newPurchasePrice - item.oldPurchasePrice)}</span>
                                              </span>
                                            ) : (item.oldPurchasePrice && item.newPurchasePrice < item.oldPurchasePrice) ? (
                                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold inline-flex items-center gap-0.5 font-mono">
                                                <TrendingDown className="w-2.5 h-2.5" />
                                                <span>{settings.currencySymbol}{formatNumber(item.newPurchasePrice - item.oldPurchasePrice)}</span>
                                              </span>
                                            ) : (
                                              <span className="text-[9px] text-slate-500">⚖️ {t('مستقر', 'جێگیر', 'Stable')}</span>
                                            )}
                                          </td>
                                          <td className="p-1.5 text-center text-emerald-400">
                                            {settings.currencySymbol}{item.newRetailPrice}
                                          </td>
                                          <td className="p-1.5 text-center font-bold text-white">
                                            {settings.currencySymbol}{formatNumber(item.purchasedQuantity * item.newPurchasePrice)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 2: SUPPLIED PRODUCTS (المواد والأصناف الموردة + أسعار نزلت أو ارتفعت) */}
              {/* ======================================================== */}
              {modalActiveTab === 'products' && (
                <div className="space-y-3">
                  
                  {/* Filter Bar */}
                  <div className="bg-[#050914] p-2.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-bold text-slate-200">
                          {t('دليل المواد وتتبع تقلبات وتغيرات الأسعار', 'ڕێبەری کاڵاکان و چاودێری گۆڕانکاری نرخەکان', 'Products Catalog & Price Fluctuations')}
                        </h4>
                      </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3 h-3 text-slate-400 absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={supplierProductSearch}
                          onChange={(e) => setSupplierProductSearch(e.target.value)}
                          placeholder={t('بحث في المواد...', 'گەڕان لە کاڵاکان...', 'Search items...')}
                          className="bg-[#0A0F1D] text-slate-200 text-[11px] py-1 px-7 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 w-44 sm:w-56"
                        />
                      </div>

                      {onOpenAddProductForSupplier && (
                        <button
                          type="button"
                          onClick={() => onOpenAddProductForSupplier(selectedSupplier.nameAr || selectedSupplier.name)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{t('إضافة مادة', 'زیادکردنی کاڵا', 'Add Item')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Price Fluctuation Filter Tabs */}
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/80 overflow-x-auto">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                      <BarChart3 className="w-3 h-3 text-purple-400" />
                      <span>{t('تصفية حسب حركة السعر:', 'فلتەرکردن بەپێی نرخ:', 'Filter by Price Trend:')}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setProductPriceFilter('all')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        productPriceFilter === 'all'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-[#0A0F1D] text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {t('جميع المواد', 'هەموو کاڵاکان', 'All Items')} ({matchedSupplierProducts.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setProductPriceFilter('increased')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                        productPriceFilter === 'increased'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-[#0A0F1D] text-rose-400 hover:text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      <TrendingUp className="w-2.5 h-2.5" />
                      <span>{t('أسعار ارتفعت', 'نرخی بەرزبووەوە', 'Prices Increased')} ({supplierPriceAnalytics.increasedCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProductPriceFilter('decreased')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                        productPriceFilter === 'decreased'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-[#0A0F1D] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      <TrendingDown className="w-2.5 h-2.5" />
                      <span>{t('أسعار انخفضت / نزلت', 'نرخی دابەزی', 'Prices Decreased')} ({supplierPriceAnalytics.decreasedCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProductPriceFilter('stable')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        productPriceFilter === 'stable'
                          ? 'bg-slate-300 text-slate-950 shadow-sm'
                          : 'bg-[#0A0F1D] text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>⚖️ {t('أسعار مستقرة', 'نرخی جێگیر', 'Prices Stable')} ({supplierPriceAnalytics.stableCount})</span>
                    </button>
                  </div>
                </div>

                  {displayedSupplierProducts.length === 0 ? (
                    <div className="p-6 text-center bg-[#050914] rounded-xl border border-slate-800 space-y-2">
                      <PackageCheck className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-slate-400 text-xs font-semibold">
                        {t('لا توجد مواد مسجلة باسم هذا المندوب حالياً', 'هیچ کاڵایەک بە ناوی ئەم مەندووبە تۆمار نەکراوە', 'No products currently linked to this delegate')}
                      </p>
                      {onOpenAddProductForSupplier && (
                        <button
                          type="button"
                          onClick={() => onOpenAddProductForSupplier(selectedSupplier.nameAr || selectedSupplier.name)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow hover:brightness-110 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('إدخال مادة جديدة الآن', 'زیادکردنی کاڵای نوێ ئێستا', 'Add Product Now')}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {displayedSupplierProducts.map(item => {
                        const pricing = getProductPurchasePricing(item);
                        const stockStatusColor = item.stock === 0 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                          : item.stock <= item.minStock 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                        const stockStatusText = item.stock === 0
                          ? t('نفذ بالمخزن', 'نەماوە لە کۆگا', 'Out of Stock')
                          : item.stock <= item.minStock
                          ? t('مخزون منخفض', 'کەم ماوە', 'Low Stock')
                          : t('متوفر بالمخزن', 'بەردەستە لە کۆگا', 'In Stock');

                        return (
                          <div key={item.id} className="p-2.5 bg-[#050914] rounded-xl border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xl p-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 shrink-0">
                                    {item.imageIcon}
                                  </span>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-slate-100 text-xs truncate">
                                      {isKu ? (item.nameKu || item.nameAr) : (isAr ? item.nameAr : item.name)}
                                    </h5>
                                    <span className="text-[10px] text-cyan-400 font-mono block">
                                      {item.barcode}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${stockStatusColor}`}>
                                    {stockStatusText}
                                  </span>

                                  {/* Price Trend Badge */}
                                  {pricing.trend === 'up' ? (
                                    <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold flex items-center gap-0.5 font-mono" title={t('ارتفع سعر الشراء في آخر وصل', 'نرخی کڕین لە دوایین پسوولە بەرزبووەوە', 'Price increased')}>
                                      <TrendingUp className="w-2.5 h-2.5" />
                                      <span>+{pricing.percentChange}%</span>
                                    </span>
                                  ) : pricing.trend === 'down' ? (
                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold flex items-center gap-0.5 font-mono" title={t('انخفض سعر الشراء في آخر وصل', 'نرخی کڕین لە دوایین پسوولە دابەزی', 'Price decreased')}>
                                      <TrendingDown className="w-2.5 h-2.5" />
                                      <span>{pricing.percentChange}%</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-500">
                                      ⚖️ {t('سعر ثابت', 'نرخ جێگیر', 'Stable')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Product Specifications & Financial Grid */}
                              <div className="grid grid-cols-2 gap-1 mt-2 pt-1.5 border-t border-slate-800/80 text-[10px]">
                                <div className="bg-[#090E1A] p-1 rounded-lg border border-slate-800">
                                  <span className="text-slate-500 block">{t('إجمالي القطع:', 'کۆی دانەکان:', 'Total Units:')}</span>
                                  <strong className="text-white font-mono">{item.stock} {t('قطعة', 'دانە', 'u')}</strong>
                                </div>

                                <div className="bg-[#090E1A] p-1 rounded-lg border border-slate-800">
                                  <span className="text-slate-500 block">{t('الكراتين:', 'کارتۆن:', 'Cartons:')}</span>
                                  <strong className="text-cyan-300 font-mono">{item.cartonsCount} {t('كرتونة', 'کارتۆن', 'cartons')}</strong>
                                </div>

                                <div className="bg-[#090E1A] p-1 rounded-lg border border-amber-500/30">
                                  <span className="text-amber-400/90 font-bold block">{t('شراء جديد كرتون:', 'کڕینی نوێی کارتۆن:', 'New Buy Carton:')}</span>
                                  <div className="flex items-center justify-between font-mono">
                                    <strong className="text-amber-300 font-black">{settings.currencySymbol}{formatNumber(pricing.latestCartonPrice)}</strong>
                                    {pricing.diffCarton !== 0 && (
                                      <span className={`text-[8px] font-bold ${pricing.diffCarton > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        {pricing.diffCarton > 0 ? `+${pricing.diffCarton}` : pricing.diffCarton}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-[#090E1A] p-1 rounded-lg border border-slate-800">
                                  <span className="text-slate-500 block">{t('سعر البيع مفرد:', 'فرۆشتنی دانە:', 'Retail Price:')}</span>
                                  <strong className="text-emerald-400 font-mono">{settings.currencySymbol}{item.singleRetailPrice}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Dates & Quick Return / Reorder Actions */}
                            <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                              <span className="text-slate-500">
                                {t('انتهاء:', 'بەسەرچوون:', 'Exp:')} <strong className="text-amber-400 font-mono">{item.expiryDate || 'N/A'}</strong>
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReturnProductId(item.id);
                                    setModalActiveTab('returns');
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-0.5 transition-all cursor-pointer"
                                  title={t('إرجاع مواد للمندوب بسبب انتهاء الصلاحية أو التلف', 'گەڕاندنەوە بۆ مەندووب بەهۆی بەسەرچوون یان تێکچوون', 'Return item to delegate')}
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>{t('إرجاع للمندوب', 'گەڕاندنەوە', 'Return')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const cartonsToAdd = prompt(
                                      t(
                                        `إعادة توريد مادة (${item.nameAr}): أدخل عدد الكراتين المطلوبة:`,
                                        `داواکردنی کاڵای (${item.nameAr || item.name}): ژمارەی کارتۆنەکان بنووسە:`,
                                        `Restock (${item.name}): Enter number of cartons:`
                                      ),
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

                                        alert(t(
                                          `تم توريد ${count} كرتون (${addedUnits} قطعة) بنجاح وإضافتها للمخزن!`,
                                          `بڕی ${count} کارتۆن (${addedUnits} دانە) بە سەرکەوتوویی بارکرا و زیادکرا بۆ کۆگا!`,
                                          `Restocked ${count} cartons successfully!`
                                        ));
                                      }
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-0.5 transition-all cursor-pointer"
                                >
                                  <RefreshCw className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>{t('طلب شحنة', 'داواکردن', 'Restock')}</span>
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 3: DELEGATE RETURNS & DEBT DEDUCTIONS (إرجاع مواد للمندوب وخصم من الدين) */}
              {/* ======================================================== */}
              {modalActiveTab === 'returns' && (
                <div className="space-y-3">
                  
                  {/* Alert Banner / Success Message */}
                  {returnSuccessMsg && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{returnSuccessMsg}</span>
                    </div>
                  )}

                  {/* Return Input Form */}
                  <form onSubmit={handleExecuteDelegateReturn} className="p-3.5 bg-[#050914] rounded-xl border border-amber-500/30 space-y-3">
                    
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4" />
                        <span>{t('تسجيل إرجاع مواد للمندوب (خصم مباشر من رصيد الدين)', 'تۆمارکردنی گەڕاندنەوەی کاڵا بۆ مەندووب (کەمکردنەوەی ڕاستەوخۆ لە قەرز)', 'Record Goods Return to Delegate & Deduct from Debt')}</span>
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {t('رصيد الدين الحالي:', 'قەرزی ئێستای مەندووب:', 'Current Debt:')} <strong className="text-rose-400 font-mono">{settings.currencySymbol}{formatNumber(selectedSupplier.balanceDue)}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      
                      {/* Product Selector */}
                      <div className="sm:col-span-2">
                        <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('اختر المادة المراد إرجاعها', 'کاڵای دیاریکراو بۆ گەڕاندنەوە', 'Select Product to Return')}</label>
                        <select
                          value={returnProductId || (matchedSupplierProducts[0]?.id || '')}
                          onChange={(e) => {
                            setReturnProductId(e.target.value);
                            setReturnCustomCost('');
                          }}
                          className="w-full bg-[#0A0F1D] text-slate-200 p-2 rounded-lg border border-slate-700 text-xs focus:border-amber-500 focus:outline-none"
                        >
                          {matchedSupplierProducts.length > 0 ? (
                            <optgroup label={t('مواد هذا المندوب', 'کاڵاکانی ئەم مەندووبە', 'Delegate Items')}>
                              {matchedSupplierProducts.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.imageIcon} {isKu ? (p.nameKu || p.nameAr) : (p.nameAr || p.name)} - ({p.barcode}) [{t('المخزن:', 'کۆگا:', 'Stock:')} {p.stock}]
                                </option>
                              ))}
                            </optgroup>
                          ) : null}
                          <optgroup label={t('جميع أصناف المخزن', 'هەموو کاڵاکانی کۆگا', 'All Store Products')}>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.imageIcon} {isKu ? (p.nameKu || p.nameAr) : (p.nameAr || p.name)} - ({p.barcode})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Reason Type (انتهاء صلاحية / تالف / إلخ) */}
                      <div>
                        <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('سبب الإرجاع للمندوب', 'هۆکاری گەڕاندنەوە بۆ مەندووب', 'Return Reason')}</label>
                        <select
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value as any)}
                          className="w-full bg-[#0A0F1D] text-amber-300 p-2 rounded-lg border border-amber-500/40 text-xs font-bold focus:outline-none"
                        >
                          <option value="EXPIRED">⏳ {t('انتهاء تاريخ الصلاحية (Expired)', 'بەسەرچوونی بەروار (Expired)', 'Expired Date')}</option>
                          <option value="DEFECTIVE">⚠️ {t('تالف / كسر / عيب مصنعي', 'تێکچوو / کەم و کوڕی', 'Damaged / Defective')}</option>
                          <option value="OVERSTOCK">📦 {t('فائض عن حاجة المخزن', 'زیادی کۆگا', 'Overstock')}</option>
                          <option value="EXCHANGE">🔄 {t('استبدال بصنف آخر', 'گۆڕینەوە بە کاڵای تر', 'Exchange')}</option>
                          <option value="WRONG_DELIVERY">❌ {t('صنف غير مطابق للطلب', 'کاڵای نادروست و هەڵە', 'Wrong Delivery')}</option>
                          <option value="OTHER">📝 {t('سبب آخر', 'هۆکاری تر', 'Other')}</option>
                        </select>
                      </div>

                      {/* Return Unit Type (كرتون / قطعة) */}
                      <div>
                        <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('وحدة الإرجاع', 'یەکەی گەڕاندنەوە', 'Return Unit')}</label>
                        <div className="grid grid-cols-2 gap-1 bg-[#0A0F1D] p-1 rounded-lg border border-slate-700">
                          <button
                            type="button"
                            onClick={() => {
                              setReturnUnitType('carton');
                              setReturnCustomCost('');
                            }}
                            className={`py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              returnUnitType === 'carton' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {t('كرتون', 'کارتۆن', 'Carton')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReturnUnitType('unit');
                              setReturnCustomCost('');
                            }}
                            className={`py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              returnUnitType === 'unit' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {t('قطعة مفرد', 'دانە', 'Piece')}
                          </button>
                        </div>
                      </div>

                      {/* Quantity to Return */}
                      <div>
                        <label className="text-slate-400 mb-1 block font-bold text-[11px]">
                          {t('الكمية المرتجعة', 'بڕی گەڕاوە', 'Quantity')} ({returnUnitType === 'carton' ? t('كرتون', 'کارتۆن', 'cartons') : t('قطعة', 'دانە', 'pieces')})
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={returnQty}
                          onChange={(e) => setReturnQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-[#0A0F1D] text-white font-mono font-bold p-2 rounded-lg border border-slate-700 text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      {/* Unit Purchase Cost (Auto-filled / Custom) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-amber-400 block font-black text-[11px]">
                            {t('سعر الشراء الجديد للمادة', 'دوایین نرخی کڕینی کاڵا لە وصل', 'Latest Purchase Price')} ({settings.currencySymbol})
                          </label>
                          {returnCustomCost !== '' && (
                            <button
                              type="button"
                              onClick={() => setReturnCustomCost('')}
                              className="text-[9px] text-cyan-400 hover:underline cursor-pointer"
                              title={t('استعادة السعر التلقائي', 'گەڕانەوە بۆ نرخی خۆکار', 'Reset to Auto Price')}
                            >
                              🔄 {t('تلقائي', 'خۆکار', 'Auto')}
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={returnCustomCost !== '' ? returnCustomCost : activeReturnUnitCost}
                          onChange={(e) => setReturnCustomCost(e.target.value)}
                          className="w-full bg-[#0A0F1D] text-amber-300 font-mono font-black p-2 rounded-lg border border-amber-500/60 text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                        />
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {t('محسوب تلقائياً من آخر وصل شراء للمادة', 'بەپێی دوایین نرخی کڕینی کاڵا لە وصل هەژمار دەکرێت', 'Auto-calculated using latest invoice price')}
                        </span>
                      </div>

                      {/* Total Deduction Display */}
                      <div className="bg-[#0A0F1D] p-2 rounded-lg border border-amber-500/40 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-amber-400 uppercase">
                          {t('مبلغ الخصم الإجمالي من الدين', 'کۆی بڕی کەمکراوە لە قەرز', 'Total Debt Deduction')}
                        </span>
                        <span className="text-base font-mono font-black text-amber-300">
                          {settings.currencySymbol}{formatNumber(activeTotalRefundAmount)}
                        </span>
                      </div>

                      {/* Return Notes */}
                      <div>
                        <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('ملاحظات إضافية', 'تێبینی زیاتر', 'Notes')}</label>
                        <input
                          type="text"
                          value={returnNote}
                          onChange={(e) => setReturnNote(e.target.value)}
                          placeholder={t('مثال: تم تسليمها لسائق المندوب', 'بۆ نموونە: رادەستی شۆفێری مەندووب کرا', 'e.g. Handed to delegate driver')}
                          className="w-full bg-[#0A0F1D] text-slate-200 p-2 rounded-lg border border-slate-700 text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                    </div>

                    {/* Price Trend Comparison Box for Selected Item */}
                    {currentReturnPricing && (
                      <div className="p-2.5 rounded-xl bg-[#080D1A] border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-slate-800 text-slate-300">
                            {currentReturnProduct?.imageIcon || '📦'}
                          </span>
                          <div>
                            <span className="font-bold text-slate-200 block">
                              {isKu ? (currentReturnProduct?.nameKu || currentReturnProduct?.nameAr) : (currentReturnProduct?.nameAr || currentReturnProduct?.name)}:
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {t('سعر الشراء الجديد', 'نرخی نوێی کڕین', 'Latest Buy')}: <strong className="text-amber-300 font-mono">{settings.currencySymbol}{formatNumber(returnUnitType === 'carton' ? currentReturnPricing.latestCartonPrice : currentReturnPricing.latestPiecePrice)}</strong>
                              {' | '}
                              {t('سعر الشراء السابق', 'نرخی پێشووی کڕین', 'Previous Buy')}: <strong className="text-slate-300 font-mono">{settings.currencySymbol}{formatNumber(returnUnitType === 'carton' ? currentReturnPricing.oldCartonPrice : currentReturnPricing.oldPiecePrice)}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {currentReturnPricing.trend === 'up' ? (
                            <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 font-mono">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>{t('ارتفع السعر بمقدار', 'نرخ بەرزبووەتەوە بە', 'Price increased by')} +{settings.currencySymbol}{formatNumber(returnUnitType === 'carton' ? currentReturnPricing.diffCarton : currentReturnPricing.diffPiece)} (+{currentReturnPricing.percentChange}%)</span>
                            </span>
                          ) : currentReturnPricing.trend === 'down' ? (
                            <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 font-mono">
                              <TrendingDown className="w-3.5 h-3.5" />
                              <span>{t('انخفض السعر بمقدار', 'نرخ دابەزیوە بە', 'Price decreased by')} {settings.currencySymbol}{formatNumber(returnUnitType === 'carton' ? currentReturnPricing.diffCarton : currentReturnPricing.diffPiece)} ({currentReturnPricing.percentChange}%)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1">
                              <span>⚖️</span>
                              <span>{t('سعر الشراء مستقر ومطابق للشراء السابق', 'نرخی کڕین جێگیرە و وەک پێشووە', 'Purchase price is stable')}</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setReturnCustomCost('');
                            }}
                            className="px-2 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                            title={t('تطبيق أحدث سعر شراء للمادة تلقائياً', 'دانانی دوایین نرخی کڕینی کاڵاکە بە شێوەی خۆکار', 'Apply latest purchase price')}
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>{t('تطبيق أحدث سعر', 'دانانی نوێترین نرخ', 'Use Latest Price')}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Checkboxes & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
                      <div className="flex items-center gap-4 flex-wrap">
                        
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                          <input
                            type="checkbox"
                            checked={returnDeductDebt}
                            onChange={(e) => setReturnDeductDebt(e.target.checked)}
                            className="rounded bg-[#0A0F1D] border-slate-700 text-rose-500 focus:ring-rose-500"
                          />
                          <span className="font-bold text-rose-300">
                            {t('خصم مباشر من رصيد دين المندوب (المتبقي)', 'کەمکردنەوەی ڕاستەوخۆ لە قەرزی مەندووب (ماوە)', 'Deduct directly from Delegate Debt')}
                          </span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                          <input
                            type="checkbox"
                            checked={returnDeductStock}
                            onChange={(e) => setReturnDeductStock(e.target.checked)}
                            className="rounded bg-[#0A0F1D] border-slate-700 text-cyan-500 focus:ring-cyan-500"
                          />
                          <span className="text-slate-300">
                            {t('خصم الكمية من مخزون المستودع', 'کەمکردنەوەی بڕ لە کۆگای مەخزەن', 'Deduct from Inventory Stock')}
                          </span>
                        </label>

                      </div>

                      <button
                        type="submit"
                        disabled={activeTotalRefundAmount <= 0}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 text-slate-950 font-black text-xs shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t('تأكيد الإرجاع والخصم من الدين', 'پەسەندکردنی گەڕاندنەوە و کەمکردنەوە لە قەرز', 'Confirm Return & Deduct')}</span>
                      </button>
                    </div>

                  </form>

                  {/* Return Records History for this Delegate */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('سجل بضائع المرتجعات السابقة لهذا المندوب', 'مێژووی کاڵا گەڕێنراوەکانی پێشوو بۆ ئەم مەندووبە', 'Returned Goods History for this Delegate')}</span>
                      </h5>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {t('المجموع:', 'کۆی گشتی:', 'Total:')} <strong className="text-amber-400 font-bold">{settings.currencySymbol}{formatNumber(totalSupplierReturnsDeductions)}</strong>
                      </span>
                    </div>

                    {matchedSupplierReturns.length === 0 ? (
                      <div className="p-4 text-center bg-[#050914] rounded-xl border border-slate-800 text-slate-500 text-xs">
                        {t('لا توجد عمليات إرجاع مواد سابقة لهذا المندوب', 'هیچ کاڵایەکی گەڕێنراوەی پێشوو بۆ ئەم مەندووبە نییە', 'No previous return logs for this delegate')}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {matchedSupplierReturns.map(ret => (
                          <div key={ret.id} className="p-2.5 bg-[#050914] rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <strong className="text-white font-bold truncate">{ret.productName}</strong>
                                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono text-[9px]">
                                    {ret.quantity} {ret.returnUnitType === 'carton' ? t('كرتون', 'کارتۆن', 'carton') : t('قطعة', 'دانە', 'u')}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                    {ret.reasonType === 'EXPIRED' ? t('منتهي الصلاحية', 'بەسەرچوو', 'Expired') : ret.reasonType === 'DEFECTIVE' ? t('تالف', 'تێکچوو', 'Damaged') : t('إرجاع', 'گەڕاندنەوە', 'Return')}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-cyan-400">{ret.recordedAt}</span>
                                  <span>•</span>
                                  <span className="font-mono text-slate-400">{ret.voucherNumber}</span>
                                  {ret.reasonNote && (
                                    <>
                                      <span>•</span>
                                      <span className="italic truncate">{ret.reasonNote}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right rtl:text-left shrink-0">
                              <span className="text-xs font-mono font-black text-rose-400 block">
                                -{settings.currencySymbol}{formatNumber(ret.totalRefundAmount)}
                              </span>
                              <span className="text-[9px] text-slate-500">
                                {ret.supplierBalanceUpdated ? t('تم الخصم من الدين', 'لە قەرز کەمکرایەوە', 'Deducted from debt') : t('استرداد كاش', 'کاش وەرگیرا', 'Cash refund')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 4: PAYMENT LEDGER (سجل الدفعات) */}
              {/* ======================================================== */}
              {modalActiveTab === 'history' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('سجل عمليات السداد والدفعات', 'مێژووی پارەدان و پاکتاوکردن', 'Payment Transactions Ledger')}</span>
                    </h4>

                    <button
                      onClick={() => {
                        setPaymentAmount(selectedSupplier.balanceDue > 0 ? selectedSupplier.balanceDue.toString() : '');
                        setModalActiveTab('pay');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t('تسجيل دفعة سداد', 'تۆمارکردنی پارەدان', 'Record Payment')}</span>
                    </button>
                  </div>

                  {!selectedSupplier.payments || selectedSupplier.payments.length === 0 ? (
                    <div className="p-6 text-center bg-[#050914] rounded-xl border border-slate-800 text-slate-500 text-xs">
                      {t('لا توجد دفعات سابقة مسجلة لهذه الشركة حتى الآن', 'هیچ پارەدانێکی پێشوو تۆمار نەکراوە', 'No previous payments recorded for this vendor')}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedSupplier.payments.map((p) => (
                        <div key={p.id} className="p-2.5 bg-[#050914] rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-200 text-[11px]">
                                {p.note || t('دفعة سداد حساب', 'پارەدانی پاکتاو', 'Payment')}
                              </p>
                              <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-0.5">
                                <span className="font-mono text-cyan-400">{p.date}</span>
                                <span>•</span>
                                <span className="capitalize text-slate-300">
                                  {p.paymentMethod === 'transfer' ? t('تحويل بنكي', 'حەواڵەی بانکی', 'Bank Transfer') : p.paymentMethod === 'cash' ? t('نقدي (كاش)', 'نەقد (کاش)', 'Cash') : t('شيك', 'چەک', 'Check')}
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
                            <span className="text-xs font-black text-emerald-400">
                              +{settings.currencySymbol}{formatNumber(p.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 5: ADD PAYMENT FORM (تسجيل دفعة سداد جديدة) */}
              {/* ======================================================== */}
              {modalActiveTab === 'pay' && (
                <div className="space-y-3 bg-[#050914] p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>{t('تسجيل دفعة سداد جديدة لحساب المندوب / الشركة', 'تۆمارکردنی پارەدانی نوێ بۆ هەژماری مەندووب / کۆمپانیا', 'Record New Payment to Vendor')}</span>
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {t('المتبقي الحالي:', 'قەرزی ماوە:', 'Current Balance:')} <strong className="text-rose-400 font-mono">{settings.currencySymbol}{formatNumber(selectedSupplier.balanceDue)}</strong>
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-400 font-bold text-[11px]">{t('المبلغ المدفوع', 'بڕی پارەی دراو', 'Payment Amount')}</label>
                        {selectedSupplier.balanceDue > 0 && (
                          <button
                            type="button"
                            onClick={() => setPaymentAmount(selectedSupplier.balanceDue.toString())}
                            className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                          >
                            {t('سداد كامل المبلغ المتبقي', 'دانەوەی تەواوی قەرزەکە', 'Pay Full Remaining Balance')}
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold text-xs">
                          {settings.currencySymbol}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#0A0F1D] text-white font-mono font-bold text-xs py-2 px-7 rounded-lg border border-slate-700 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('طريقة الدفع', 'شێوازی پارەدان', 'Payment Method')}</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full bg-[#0A0F1D] text-slate-200 p-2 rounded-lg border border-slate-700 text-xs focus:outline-none"
                        >
                          <option value="transfer">{t('تحويل بنكي / حوالة', 'حەواڵەی بانکی', 'Bank Transfer')}</option>
                          <option value="cash">{t('نقدي (كاش)', 'نەقد (کاش)', 'Cash')}</option>
                          <option value="check">{t('شيك مصرفي', 'چەکی بانکی', 'Check')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('رقم الوصل / المرجع', 'ژمارەی پسوولە / ئاماژە', 'Invoice / Ref No')}</label>
                        <input
                          type="text"
                          value={paymentInvoiceNo}
                          onChange={(e) => setPaymentInvoiceNo(e.target.value)}
                          placeholder="INV-1002"
                          className="w-full bg-[#0A0F1D] text-slate-200 p-2 rounded-lg border border-slate-700 text-xs focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('ملاحظات / بيان الدفعة', 'تێبینی / ڕوونکردنەوە', 'Notes / Description')}</label>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder={t('مثال: تسوية دفعة الشحنة الأخيرة', 'بۆ نموونە: پاکتاوی باری پێشوو', 'e.g. Settlement for recent shipment')}
                        className="w-full bg-[#0A0F1D] text-slate-200 p-2 rounded-lg border border-slate-700 text-xs focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRecordPayment(selectedSupplier.id)}
                      disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-50 text-white font-bold text-xs shadow hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 mt-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('تأكيد وحفظ الدفعة في الحساب', 'پەسەندکردن و تۆمارکردنی پارەدان', 'Confirm & Save Payment')}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Bottom Actions (Compact) */}
            <div className="px-4 py-2 bg-[#080D1A] border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                ID: {selectedSupplier.id}
              </span>
              
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                {t('إغلاق', 'داخستن', 'Close')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK PAYMENT MODAL (for direct card action) */}
      {/* ======================================================== */}
      {paymentSupplier && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="p-4 rounded-2xl border border-emerald-500/40 bg-[#0A0F1D] w-full max-w-md space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>{t('تسجيل دفعة سداد:', 'تۆمارکردنی پارەدان:', 'Payment:')} {paymentSupplier.nameAr || paymentSupplier.name}</span>
              </h3>
              <button onClick={() => setPaymentSupplier(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 bg-[#050914] rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">{t('المتبقي الحالي:', 'قەرزی ماوە:', 'Current Balance:')}</span>
              <strong className="text-rose-400 font-mono text-sm font-black">
                {settings.currencySymbol}{formatNumber(paymentSupplier.balanceDue)}
              </strong>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('المبلغ المدفوع', 'بڕی پارە', 'Amount')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#050914] text-white font-mono font-bold p-2 rounded-lg border border-slate-700 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('طريقة الدفع', 'شێوازی پارەدان', 'Payment Method')}</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-[#050914] text-slate-200 p-2 rounded-lg border border-slate-700 text-xs focus:outline-none"
                >
                  <option value="transfer">{t('تحويل بنكي / حوالة', 'حەواڵەی بانکی', 'Bank Transfer')}</option>
                  <option value="cash">{t('نقدي (كاش)', 'نەقد (کاش)', 'Cash')}</option>
                  <option value="check">{t('شيك', 'چەک', 'Check')}</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('ملاحظة', 'تێبینی', 'Note')}</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder={t('دفعة تسوية', 'پارەدانی پاکتاو', 'Payment note')}
                  className="w-full bg-[#050914] text-slate-200 p-2 rounded-lg border border-slate-700 text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentSupplier(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  {t('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => handleRecordPayment(paymentSupplier.id)}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
                >
                  {t('تأكيد الدفعة', 'پەسەندکردنی پارەدان', 'Confirm')}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="p-4 sm:p-5 rounded-2xl border border-purple-500/40 bg-[#0A0F1D] w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>{t('إضافة مندوب / شركة توريد جديدة', 'زیادکردنی مەندووب / کۆمپانیای دابینکەری نوێ', 'Add New Supplier / Delegate')}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('اسم الشركة / المعمل', 'ناوی کۆمپانیا / کارگە', 'Company Name')}</label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value, nameAr: e.target.value })}
                  placeholder={t('أدخل اسم شركة التوريد...', 'ناوی کۆمپانیای دابینکەر بنووسە...', 'Enter company name...')}
                  className="w-full bg-[#050914] text-slate-200 p-2 rounded-lg border border-blue-500/20 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('اسم المندوب / المسؤول', 'ناوی مەندووب / بەرپرس', 'Delegate / Contact')}</label>
                  <input
                    type="text"
                    value={newSupplier.contactPerson}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                    placeholder={t('اسم المندوب', 'ناوی مەندووب', 'Delegate name')}
                    className="w-full bg-[#050914] text-slate-200 p-2 rounded-lg border border-blue-500/20 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('التصنيف الرئيسي', 'پۆلێنکردنی سەرەکی', 'Category')}</label>
                  <input
                    type="text"
                    value={newSupplier.categorySupplied}
                    onChange={(e) => setNewSupplier({ ...newSupplier, categorySupplied: e.target.value })}
                    className="w-full bg-[#050914] text-slate-200 p-2 rounded-lg border border-blue-500/20 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('رقم الهاتف', 'ژمارەی مۆبایل', 'Phone')}</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    className="w-full bg-[#050914] text-slate-200 p-2 rounded-lg border border-blue-500/20 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('البريد الإلكتروني (اختياري)', 'ئیمەیڵ (ئارەزوومەندانە)', 'Email (Optional)')}</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full bg-[#050914] text-slate-200 p-2 rounded-lg border border-blue-500/20 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('الرقم الضريبي', 'ژمارەی باج', 'Tax Number')}</label>
                  <input
                    type="text"
                    value={newSupplier.taxNumber}
                    onChange={(e) => setNewSupplier({ ...newSupplier, taxNumber: e.target.value })}
                    className="w-full bg-[#050914] text-slate-200 p-2 rounded-lg border border-blue-500/20 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1 block font-bold text-[11px]">{t('العنوان', 'ناونیشان', 'Address')}</label>
                  <input
                    type="text"
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                    className="w-full bg-[#050914] text-slate-200 p-2 rounded-lg border border-blue-500/20 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Financial Initial Setup */}
              <div className="pt-2 border-t border-slate-800">
                <p className="text-[10px] font-bold text-amber-400 mb-1.5">{t('الرصيد المالي المبدئي (اختياري)', 'باڵانسی دارایی سەرەتایی (ئارەزوومەندانە)', 'Initial Financial Balance (Optional)')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 mb-0.5 block text-[10px]">{t('إجمالي الفواتير السابقة', 'کۆی پسوولە پێشووەکان', 'Total Invoiced')}</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={newSupplier.totalInvoiced}
                      onChange={(e) => setNewSupplier({ ...newSupplier, totalInvoiced: e.target.value })}
                      className="w-full bg-[#050914] text-slate-200 p-2 rounded-lg border border-blue-500/20 font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 mb-0.5 block text-[10px]">{t('إجمالي المدفوع سلفاً', 'کۆی دراو لەپێشتر', 'Total Paid')}</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={newSupplier.totalPaid}
                      onChange={(e) => setNewSupplier({ ...newSupplier, totalPaid: e.target.value })}
                      className="w-full bg-[#050914] text-slate-200 p-2 rounded-lg border border-blue-500/20 font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="saveSupplier"
                  checked={newSupplier.isSaved}
                  onChange={(e) => setNewSupplier({ ...newSupplier, isSaved: e.target.checked })}
                  className="rounded bg-[#050914] border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="saveSupplier" className="text-slate-300 font-bold text-[11px] cursor-pointer">
                  {t('حفظ الشركة في قائمة المحفوظة مباشرةً', 'هەڵگرتنی کۆمپانیا لە دڵخوازەکان ڕاستەوخۆ', 'Add directly to bookmarked saved companies')}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  {t('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
                >
                  {t('حفظ شركة التوريد', 'پاشەکەوتکردنی کۆمپانیا', 'Save Supplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
