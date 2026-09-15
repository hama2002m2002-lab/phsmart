import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, 
  RotateCcw, 
  Search, 
  Barcode as BarcodeIcon, 
  Package, 
  CheckCircle2, 
  FileText, 
  DollarSign,
  Plus,
  Minus,
  Check,
  Printer,
  BarChart2,
  TrendingDown,
  AlertTriangle,
  Award,
  ShieldAlert
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Product, SaleTransaction, StoreSettings, SaleUnitType } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { getTranslation } from '../lib/translations';

interface SalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  salesHistory: SaleTransaction[];
  setSalesHistory: React.Dispatch<React.SetStateAction<SaleTransaction[]>>;
  settings: StoreSettings;
  preSelectedInvoiceNo?: string | null;
  onOpenCashDrawer?: () => void;
  onOpenInventory?: () => void;
  onViewReceipt?: (sale: SaleTransaction) => void;
}

interface DirectReturnItem {
  id: string; // unique item key
  productId: string;
  productName: string;
  productNameAr?: string;
  barcode: string;
  currentStock: number;
  quantity: number;
  price: number;
  saleType: SaleUnitType;
  unitsPerCarton?: number;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  isOpen,
  onClose,
  products,
  setProducts,
  salesHistory,
  setSalesHistory,
  settings,
  preSelectedInvoiceNo,
  onOpenCashDrawer,
  onOpenInventory,
  onViewReceipt
}) => {
  if (!isOpen) return null;

  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const t = (ar: string, ku: string, en: string) => isKu ? ku : isAr ? ar : en;

  // Return Mode: 'direct' = إرجاع مباشر, 'invoice' = إرجاع من فاتورة, 'analytics' = رسوم بيانية للنسب والمؤشرات
  const [returnMode, setReturnMode] = useState<'direct' | 'invoice' | 'analytics'>('direct');

  // Compute Daily Sales vs Returns chart data using Recharts
  const analyticsData = useMemo(() => {
    const dateMap: { [dateStr: string]: { date: string; totalSales: number; returnedAmount: number; ratio: number } } = {};

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'numeric', day: 'numeric' });
      dateMap[dateKey] = { date: dateKey, totalSales: 0, returnedAmount: 0, ratio: 0 };
    }

    // Process sales history
    salesHistory.forEach(tx => {
      const rawDate = tx.timestamp ? tx.timestamp.split(',')[0].trim() : 'اليوم';
      if (!dateMap[rawDate]) {
        dateMap[rawDate] = { date: rawDate, totalSales: 0, returnedAmount: 0, ratio: 0 };
      }
      if (tx.status === 'refunded' || tx.total < 0) {
        dateMap[rawDate].returnedAmount += Math.abs(tx.total);
      } else {
        dateMap[rawDate].totalSales += tx.total;
      }

      // Check for returned items in positive invoices
      if (Array.isArray(tx.returnedItems)) {
        tx.returnedItems.forEach(ri => {
          dateMap[rawDate].returnedAmount += ri.total || 0;
        });
      }
    });

    const list = Object.values(dateMap).map(item => {
      const ratio = item.totalSales > 0 ? (item.returnedAmount / item.totalSales) * 100 : 0;
      return {
        ...item,
        ratio: parseFloat(ratio.toFixed(1))
      };
    });

    // Provide default fallback demo points if history is sparse for visual clarity
    if (list.every(l => l.totalSales === 0 && l.returnedAmount === 0)) {
      const todayKey = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'numeric', day: 'numeric' });
      return [
        { date: 'الأحد', totalSales: 450000, returnedAmount: 12000, ratio: 2.6 },
        { date: 'الإثنين', totalSales: 520000, returnedAmount: 25000, ratio: 4.8 },
        { date: 'الثلاثاء', totalSales: 610000, returnedAmount: 18000, ratio: 2.9 },
        { date: 'الأربعاء', totalSales: 480000, returnedAmount: 42000, ratio: 8.7 },
        { date: 'الخميس', totalSales: 750000, returnedAmount: 31000, ratio: 4.1 },
        { date: 'الجمعة', totalSales: 890000, returnedAmount: 22000, ratio: 2.4 },
        { date: todayKey, totalSales: 380000, returnedAmount: 15000, ratio: 3.9 }
      ];
    }

    return list;
  }, [salesHistory, isAr]);

  const totalSalesOverall = useMemo(() => analyticsData.reduce((acc, d) => acc + d.totalSales, 0), [analyticsData]);
  const totalReturnsOverall = useMemo(() => analyticsData.reduce((acc, d) => acc + d.returnedAmount, 0), [analyticsData]);
  const overallReturnRatio = totalSalesOverall > 0 ? ((totalReturnsOverall / totalSalesOverall) * 100).toFixed(1) : '0.0';

  // Search Inputs
  const [directSearchInput, setDirectSearchInput] = useState('');
  const [invoiceSearchInput, setInvoiceSearchInput] = useState(preSelectedInvoiceNo || '');
  const [showDirectSearchResults, setShowDirectSearchResults] = useState(false);

  // Form selections matching the screenshot
  const [customerName, setCustomerName] = useState('عميل عام / زبون خارجي');
  const [returnReason, setReturnReason] = useState('non_matching');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'credit'>('cash');
  const [restockToInventory, setRestockToInventory] = useState<boolean>(true);

  // Direct Return items array (Default with 1 sample item matching screenshot if opened fresh for direct test, or empty)
  const [directItems, setDirectItems] = useState<DirectReturnItem[]>([]);

  // Invoice Return state: selected sale and line item quantities
  const [returnQuantities, setReturnQuantities] = useState<{ [key: string]: number }>({});

  // Alert State
  const [returnAlert, setReturnAlert] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastReturnTx, setLastReturnTx] = useState<SaleTransaction | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preSelectedInvoiceNo) {
      setReturnMode('invoice');
      setInvoiceSearchInput(preSelectedInvoiceNo);
    }
  }, [preSelectedInvoiceNo]);

  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  }, [isOpen, returnMode]);

  // Product search filter for Direct Return Mode
  const matchingProducts = products.filter(p => {
    if (!directSearchInput.trim()) return false;
    const q = directSearchInput.trim().toLowerCase();
    const matchName = p.name.toLowerCase().includes(q) || (p.nameAr && p.nameAr.toLowerCase().includes(q));
    const matchBarcode = p.barcode && p.barcode.toLowerCase().includes(q);
    return matchName || matchBarcode;
  });

  const handleAddProductToDirectReturn = (prod: Product) => {
    const prodName = isAr || isKu ? (prod.nameAr || prod.name) : prod.name;
    const existingIndex = directItems.findIndex(i => i.productId === prod.id || (i.barcode && prod.barcode && i.barcode === prod.barcode));
    if (existingIndex >= 0) {
      setDirectItems(prev => prev.map((item, idx) => {
        if (idx === existingIndex) {
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      }));
    } else {
      const newItem: DirectReturnItem = {
        id: `${prod.id}_${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        productNameAr: prod.nameAr,
        barcode: prod.barcode || '',
        currentStock: prod.stock,
        quantity: 1,
        price: prod.price,
        saleType: 'retail',
        unitsPerCarton: prod.unitsPerCarton
      };
      setDirectItems(prev => [...prev, newItem]);
    }

    // Show instant toast notification when product is added by barcode
    setReturnAlert({
      msg: isAr 
        ? `تمت إضافة المادة "${prodName}" إلى قائمة المرتجعات بنجاح 📦` 
        : `Added "${prodName}" to return list successfully 📦`,
      type: 'info'
    });

    setDirectSearchInput('');
    setShowDirectSearchResults(false);

    // Keep focus on barcode search input for continuous scanning
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Direct Return Barcode Scanner KeyDown Handler
  const handleDirectSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = directSearchInput.trim().toLowerCase();
      if (!query) return;

      // 1. Check if there are receipts in salesHistory containing this barcode or invoice or product
      const matchingSoldInvoices = allSoldItems.filter(item => {
        const matchesBarcode = item.barcode && item.barcode.trim().toLowerCase() === query;
        const matchesInvoice = item.invoiceNumber.toLowerCase() === query;
        const matchesName = item.productName.toLowerCase().includes(query) || 
                            (item.productNameAr && item.productNameAr.toLowerCase().includes(query));
        return matchesBarcode || matchesInvoice || matchesName;
      });

      if (matchingSoldInvoices.length > 0) {
        // Switch to invoice mode and fetch all matching receipts containing this barcode!
        setReturnMode('invoice');
        setInvoiceSearchInput(directSearchInput.trim());
        const uniqueInvoices = Array.from(new Set(matchingSoldInvoices.map(i => i.invoiceNumber)));
        setReturnAlert({
          msg: t(
            `تم جلب جميع الوصلات والفواتير (${uniqueInvoices.length}) التي تحتوي على الباركود الممسوح 📄`,
            `سەرجەمی پسوڵەکان (${uniqueInvoices.length}) هێنران کە ئەم بارکۆدە لەخۆدەگرن 📄`,
            `Fetched all receipts (${uniqueInvoices.length}) containing scanned barcode 📄`
          ),
          type: 'info'
        });
        return;
      }

      // 2. If no sold receipt found in sales history, handle as direct return product
      const exactBarcodeMatch = products.find(p => p.barcode && p.barcode.trim().toLowerCase() === query);
      if (exactBarcodeMatch) {
        handleAddProductToDirectReturn(exactBarcodeMatch);
        return;
      }

      if (matchingProducts.length > 0) {
        handleAddProductToDirectReturn(matchingProducts[0]);
        return;
      }

      // 3. If no match found
      setReturnAlert({
        msg: t(
          `لم يتم العثور على وصل مبيعات أو مادة تطابق الباركود: (${directSearchInput})`,
          `هیچ پسوڵەی فرۆشتن یان کاڵایەک نەدۆزرایەوە کە لەگەڵ ئەم بارکۆدە بگونجێت: (${directSearchInput})`,
          `No receipt or product found matching barcode: (${directSearchInput})`
        ),
        type: 'error'
      });
    }
  };

  const handleUpdateDirectQty = (id: string, delta: number) => {
    setDirectItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleUpdateDirectPrice = (id: string, newPrice: number) => {
    setDirectItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, price: Math.max(0, newPrice) };
      }
      return item;
    }));
  };

  const handleRemoveDirectItem = (id: string) => {
    setDirectItems(prev => prev.filter(item => item.id !== id));
  };

  // Direct Return Total
  const directTotalAmount = directItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // Process Direct Return and automatically increment stock in inventory
  const handleConfirmDirectReturn = () => {
    if (directItems.length === 0) {
      setReturnAlert({
        msg: t('يرجى اختيار مادة واحدة على الأقل للإرجاع المباشر!', 'تکایە لانیکەم یەک کاڵا دیاریبکە بۆ گەڕاندنەوەی ڕاستەوخۆ!', 'Please add at least one item for direct return!'),
        type: 'error'
      });
      return;
    }

    // 1. ALWAYS Restock products in inventory automatically
    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        const matchedReturnItem = directItems.find(i => 
          i.productId === prod.id || 
          (i.barcode && prod.barcode && i.barcode.trim() === prod.barcode.trim())
        );
        if (matchedReturnItem) {
          let unitsToAdd = matchedReturnItem.quantity;
          if (matchedReturnItem.saleType === 'carton') {
            unitsToAdd = matchedReturnItem.quantity * (prod.unitsPerCarton || 12);
          }
          const newStock = prod.stock + unitsToAdd;
          const newCartonsCount = Math.floor(newStock / (prod.unitsPerCarton || 12));
          const newStatus = newStock === 0 ? 'out_of_stock' : newStock <= prod.minStock ? 'low_stock' : 'in_stock';
          return {
            ...prod,
            stock: newStock,
            totalUnits: newStock,
            cartonsCount: newCartonsCount > 0 ? newCartonsCount : prod.cartonsCount,
            status: newStatus
          };
        }
        return prod;
      });
    });

    // 2. Log a return transaction in sales history
    const returnInvoiceNo = `RET-${Math.floor(100000 + Math.random() * 900000)}`;
    const returnTransaction: SaleTransaction = {
      id: `ret_${Date.now()}`,
      invoiceNumber: returnInvoiceNo,
      timestamp: new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }),
      items: [],
      subtotal: -directTotalAmount,
      discount: 0,
      tax: 0,
      total: -directTotalAmount,
      paymentMethod: refundMethod === 'credit' ? 'debt' : 'cash',
      customerName: customerName || t('عميل عام / زبون خارجي', 'کڕیاری گشتی', 'General Customer'),
      cashierName: t('الكاشير الرئيسية', 'کاشێری سەرەکی', 'Main Cashier'),
      status: 'refunded',
      returnedItems: directItems.map(i => ({
        productId: i.productId,
        productName: i.productName,
        productNameAr: i.productNameAr,
        price: i.price,
        quantity: i.quantity,
        saleType: i.saleType,
        total: i.price * i.quantity,
        returnedAt: new Date().toLocaleString()
      }))
    };

    setSalesHistory(prev => [returnTransaction, ...prev]);
    setLastReturnTx(returnTransaction);

    // Show printable return receipt modal immediately
    if (onViewReceipt) {
      onViewReceipt(returnTransaction);
    }

    // Reset list & show alert
    const count = directItems.length;
    const totalQtyReturned = directItems.reduce((acc, i) => acc + i.quantity, 0);
    setDirectItems([]);
    setTimeout(() => {
      setReturnAlert(null);
    }, 5000);
  };

  // Print Return Receipt button handler
  const handlePrintReturnReceipt = () => {
    // If in direct return mode with items, execute confirmation which generates receipt
    if (returnMode === 'direct' && directItems.length > 0) {
      handleConfirmDirectReturn();
      return;
    }

    // If a return transaction was recorded in this session
    if (lastReturnTx && onViewReceipt) {
      onViewReceipt(lastReturnTx);
      return;
    }

    // Find recent return or refund in sales history
    const recentRefund = salesHistory.find(s => s.status === 'refunded' || (Array.isArray(s.returnedItems) && s.returnedItems.length > 0));
    if (recentRefund && onViewReceipt) {
      onViewReceipt(recentRefund);
      return;
    }

    setReturnAlert({
      msg: t(
        'يرجى اختيار مادة واحدة على الأقل لإرجاعها ثم طباعة وصل المرتجعات!',
        'تکایە لانیکەم یەک کاڵا دیاریبکە بۆ گەڕاندنەوە پاشان چاپکردنی پسوڵە!',
        'Please select at least one item to return and print receipt!'
      ),
      type: 'error'
    });
  };

  // Build flattened list of sold item occurrences from sales history for Invoice Mode
  const allSoldItems = salesHistory.flatMap(sale => {
    const items = Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : []);
    return items.map((item: any, index: number) => {
      const productObj = products.find(p => p.id === item.productId);
      const barcode = productObj ? productObj.barcode : '';
      return {
        key: `${sale.id}_${item.productId}_${index}`,
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        timestamp: sale.timestamp,
        customerName: sale.customerName,
        productId: item.productId,
        productName: item.productName,
        productNameAr: item.productNameAr,
        barcode,
        price: item.price,
        quantitySold: item.quantity,
        saleType: (item.saleType || 'retail') as SaleUnitType,
        total: item.total,
        productObj
      };
    });
  });

  const filteredSoldItems = allSoldItems.filter(item => {
    if (!invoiceSearchInput.trim()) return true;
    const query = invoiceSearchInput.trim().toLowerCase();
    const matchesBarcode = item.barcode && item.barcode.toLowerCase().includes(query);
    const matchesInvoice = item.invoiceNumber.toLowerCase().includes(query);
    const matchesName = item.productName.toLowerCase().includes(query) || 
                        (item.productNameAr && item.productNameAr.toLowerCase().includes(query));
    
    return matchesBarcode || matchesInvoice || matchesName;
  });

  const handleProcessInvoiceReturnItem = (item: typeof allSoldItems[0]) => {
    const qtyToReturn = returnQuantities[item.key] || 1;
    if (qtyToReturn <= 0) {
      setReturnAlert({
        msg: t('يرجى تحديد كمية للمرتجع أكبر من صفر!', 'تکایە بڕێکی گەڕاندنەوەی زیاتر لە سفر دیاریبکە!', 'Please specify a return quantity greater than 0!'),
        type: 'error'
      });
      return;
    }

    // Always update inventory stock automatically
    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        if (prod.id === item.productId || (item.barcode && prod.barcode && item.barcode.trim() === prod.barcode.trim())) {
          let unitsToAdd = qtyToReturn;
          if (item.saleType === 'carton') {
            unitsToAdd = qtyToReturn * (prod.unitsPerCarton || 12);
          }
          const newStock = prod.stock + unitsToAdd;
          const newCartonsCount = Math.floor(newStock / (prod.unitsPerCarton || 12));
          const newStatus = newStock === 0 ? 'out_of_stock' : newStock <= prod.minStock ? 'low_stock' : 'in_stock';
          
          return {
            ...prod,
            stock: newStock,
            totalUnits: newStock,
            cartonsCount: newCartonsCount > 0 ? newCartonsCount : prod.cartonsCount,
            status: newStatus
          };
        }
        return prod;
      });
    });

    const totalRefundAmount = item.price * qtyToReturn;
    setSalesHistory(prevHistory => {
      return prevHistory.map(sale => {
        if (sale.id === item.saleId) {
          const existingReturned = sale.returnedItems || [];
          const newReturnRecord = {
            productId: item.productId,
            productName: item.productName,
            productNameAr: item.productNameAr,
            price: item.price,
            quantity: qtyToReturn,
            saleType: item.saleType,
            total: totalRefundAmount,
            returnedAt: new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })
          };

          const existingItems = Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : []);
          const updatedItems = existingItems.map((i: any) => {
            if (i.productId === item.productId && (i.saleType || 'retail') === item.saleType) {
              const newQty = Math.max(0, i.quantity - qtyToReturn);
              return {
                ...i,
                quantity: newQty,
                total: i.price * newQty
              };
            }
            return i;
          });

          const newSubtotal = Math.max(0, updatedItems.reduce((acc, it) => acc + it.total, 0));
          const newTax = Math.max(0, newSubtotal * (settings.taxRate / 100));
          const newTotal = Math.max(0, newSubtotal + newTax - sale.discount);

          return {
            ...sale,
            items: updatedItems,
            returnedItems: [...existingReturned, newReturnRecord],
            subtotal: newSubtotal,
            tax: newTax,
            total: newTotal,
            status: newTotal === 0 ? 'refunded' : sale.status
          };
        }
        return sale;
      });
    });

    setReturnQuantities(prev => ({ ...prev, [item.key]: 0 }));

    const prodDisplayName = isAr || isKu ? (item.productNameAr || item.productName) : item.productName;
    setReturnAlert({
      msg: t(
        `تم استرجاع (${qtyToReturn}) قطعة من "${prodDisplayName}" بقيمة ${settings.currencySymbol}${formatNumber(totalRefundAmount)} وتعديل كمية المخزن تلقائياً بنجاح! 📦`,
        `(${qtyToReturn}) دانە لە "${prodDisplayName}" بە بڕی ${settings.currencySymbol}${formatNumber(totalRefundAmount)} بە سەرکەوتوویی گەڕێندرایەوە و کۆگا نوێکرایەوە! 📦`,
        `Successfully returned ${qtyToReturn} units of "${prodDisplayName}" and updated stock in inventory! 📦`
      ),
      type: 'success'
    });

    setTimeout(() => {
      setReturnAlert(null);
    }, 5000);
  };

  // Invoice Return Barcode / Enter KeyDown Handler
  const handleInvoiceSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = invoiceSearchInput.trim().toLowerCase();
      if (!query) return;

      if (filteredSoldItems.length > 0) {
        const uniqueInvoices = Array.from(new Set(filteredSoldItems.map(i => i.invoiceNumber)));
        setReturnAlert({
          msg: t(
            `تم جلب جميع الوصلات والفواتير (${uniqueInvoices.length}) التي تحتوي على هذا الباركود / البحث 📄`,
            `سەرجەمی پسوڵەکان (${uniqueInvoices.length}) هێنران کە ئەم بارکۆدە / گەڕانە لەخۆدەگرن 📄`,
            `Fetched all receipts (${uniqueInvoices.length}) matching search 📄`
          ),
          type: 'info'
        });
      } else {
        setReturnAlert({
          msg: t(
            `لم يتم العثور على أي وصل مبيعات سابق يحتوي على الباركود: (${invoiceSearchInput})`,
            `هیچ پسوڵەیەکی پێشووی فرۆشتن نەدۆزرایەوە کە بارکۆدی (${invoiceSearchInput}) لەخۆبگرێت`,
            `No matching receipt found for barcode: (${invoiceSearchInput})`
          ),
          type: 'error'
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-3xl border border-slate-700/80 bg-[#1e293b] text-slate-100 flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-700/60 flex items-center justify-between bg-[#131c2e]">
          {/* Close button on Left (in RTL) */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title & Red Badge on Right (in RTL) */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <h2 className="text-base sm:text-xl font-black text-white flex items-center justify-end gap-2">
                {t('إرجاع المواد المباعة وإعادة استعادة المخزون', 'گەڕاندنەوەی کاڵا و نوێکردنەوەی کۆگا', 'Sales Return & Inventory Restock')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('يمكنك الإرجاع إما باختيار الفاتورة، أو بالبحث المباشر عن طريق اسم المادة والباركود', 'دەتوانیت کاڵاکان بگەڕێنیتەوە لە ڕێگەی دیاریکردنی پسوڵە یان گەڕانی ڕاستەوخۆ بە ناوی کاڵا و بارکۆد', 'Return items either by selecting an invoice, or by direct search via item name & barcode.')}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#9f2d3b] flex items-center justify-center text-white shadow-md shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs (3 Segmented Controls) */}
        <div className="p-3 bg-[#131c2e] border-b border-slate-700/60">
          <div className="grid grid-cols-3 gap-2 bg-[#0c121e] p-1 rounded-2xl border border-slate-800">
            {/* Tab 1: Direct Return */}
            <button
              type="button"
              onClick={() => setReturnMode('direct')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                returnMode === 'direct'
                  ? 'bg-[#ef4444] text-white shadow-md shadow-rose-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate">{getTranslation(lang, 'directReturn')}</span>
            </button>

            {/* Tab 2: Invoice Return */}
            <button
              type="button"
              onClick={() => setReturnMode('invoice')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                returnMode === 'invoice'
                  ? 'bg-[#ef4444] text-white shadow-md shadow-rose-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span className="truncate">{getTranslation(lang, 'invoiceReturn')}</span>
            </button>

            {/* Tab 3: Recharts Quality Analytics */}
            <button
              type="button"
              onClick={() => setReturnMode('analytics')}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                returnMode === 'analytics'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BarChart2 className="w-4 h-4 text-cyan-300 shrink-0" />
              <span className="truncate">{getTranslation(lang, 'returnsAnalytics')}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[#1a2536]">

          {/* Alert Banner / Toast Notification */}
          {returnAlert && (
            <div className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between shadow-xl backdrop-blur-md animate-fadeIn transition-all ${
              returnAlert.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200 ring-2 ring-emerald-500/30'
                : returnAlert.type === 'info'
                ? 'bg-sky-950/90 border-sky-500/80 text-sky-200 ring-2 ring-sky-500/30'
                : 'bg-rose-950/90 border-rose-500/80 text-rose-200 ring-2 ring-rose-500/30'
            }`}>
              <div className="flex items-center gap-3">
                {returnAlert.type === 'success' && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/40">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                  </div>
                )}
                {returnAlert.type === 'info' && (
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0 border border-sky-500/40">
                    <Package className="w-5 h-5 text-sky-400" />
                  </div>
                )}
                {returnAlert.type === 'error' && (
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/40">
                    <X className="w-5 h-5 text-rose-400" />
                  </div>
                )}
                <div>
                  <span className="block leading-relaxed">{returnAlert.msg}</span>
                  {returnAlert.type === 'success' && (
                    <span className="text-[11px] font-semibold text-emerald-400 block mt-0.5">
                      {t('✓ تم تحديث كميات المخزن تلقائياً وتسجيل العملية بنجاح', '✓ بڕی کاڵاکانی کۆگا بە خۆکاری نوێکرانەوە و کردارەکە تۆمارکرا', '✓ Inventory stock levels automatically updated & transaction saved')}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setReturnAlert(null)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ===================== MODE 1: DIRECT RETURN ===================== */}
          {returnMode === 'direct' && (
            <>
              {/* Search Bar matching screenshot */}
              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {t('ماسح الباركود نشط ⚡ (امسح الباركود واضغط Enter)', 'خوێنەری بارکۆد ئامادەیە ⚡ (بارکۆد لێبدە و Enter دابگرە)', 'Barcode Scanner Ready (Scan & Press Enter)')}
                  </span>
                  <label className="font-bold text-slate-200 block text-right">
                    {t('ابحث أو اكتب اسم المادة / الباركود المراد إرجاعها:', 'بگەڕێ یان ناوی کاڵا / بارکۆد بنووسە بۆ گەڕاندنەوە:', 'Search or type item name / barcode to return:')}
                  </label>
                </div>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={directSearchInput}
                    onChange={(e) => {
                      setDirectSearchInput(e.target.value);
                      setShowDirectSearchResults(true);
                    }}
                    onFocus={() => setShowDirectSearchResults(true)}
                    onKeyDown={handleDirectSearchKeyDown}
                    placeholder={
                      t(
                        'امسح الباركود هنا بالمجهزة مباشرة، أو اكتب اسم المادة واضغط Enter...',
                        'بارکۆدەکە لێرە بخوێنەرەوە یان ناوی کاڵا بنووسە و Enter دابگرە...',
                        'Scan barcode here directly or type item name & press Enter...'
                      )
                    }
                    className="w-full bg-[#0e1626] text-xs sm:text-sm text-slate-100 placeholder-slate-500 px-10 py-3 rounded-xl border border-slate-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all text-right font-medium"
                  />
                  <BarcodeIcon className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-400" />
                  
                  {directSearchInput && (
                    <button
                      onClick={() => setDirectSearchInput('')}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs bg-slate-800 p-1 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown List */}
                {showDirectSearchResults && directSearchInput.trim() !== '' && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#101827] border border-slate-700 rounded-xl max-h-56 overflow-y-auto shadow-2xl">
                    {matchingProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        {t('لا توجد مادة تطابق هذا البحث', 'هیچ کاڵایەک لەگەڵ ئەم گەڕانە نەدۆزرایەوە', 'No matching product found')}
                      </div>
                    ) : (
                      matchingProducts.map(prod => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleAddProductToDirectReturn(prod)}
                          className="w-full p-2.5 hover:bg-slate-800/80 text-right flex items-center justify-between border-b border-slate-800 text-xs transition-colors cursor-pointer"
                        >
                          <span className="text-emerald-400 font-mono font-bold">{settings.currencySymbol}{prod.price}</span>
                          <div className="space-x-2 rtl:space-x-reverse">
                            <span className="font-bold text-white">{isAr || isKu ? (prod.nameAr || prod.name) : prod.name}</span>
                            {prod.barcode && <span className="text-slate-400 text-[11px]">({prod.barcode})</span>}
                            <span className="text-amber-300 text-[11px]">| {t('المخزون الحالي:', 'کۆگای ئێستا:', 'Current Stock:')} {prod.stock}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Direct Items Table / Cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                  <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded">
                    {t('✓ إعادة المرجوعات للمخزون مفعّل تلقائياً', '✓ گەڕاندنەوە بۆ کۆگا بە شێوەی خۆکار چالاککراوە', '✓ Auto Stock Restock Enabled')}
                  </span>
                  <span className="font-bold text-white">
                    {t(
                      `المواد المحددة للإرجاع المباشر (${directItems.length}):`,
                      `کاڵا دیاریکراوەکان بۆ گەڕاندنەوەی ڕاستەوخۆ (${directItems.length}):`,
                      `Selected items for direct return (${directItems.length}):`
                    )}
                  </span>
                </div>

                {directItems.length === 0 ? (
                  <div className="py-10 text-center rounded-2xl bg-[#0e1626] border border-dashed border-slate-700/80 text-slate-400 text-xs space-y-2">
                    <Package className="w-8 h-8 mx-auto text-slate-500 animate-pulse" />
                    <p>{t('قم بمسح الباركود بالعدسة أو ابحث واختر المادة لإضافتها لقائمة المرتجعات', 'بارکۆد لێبدە یان لە سەرەوە بگەڕێ بۆ زیادکردنی کاڵا بۆ لیستی گەڕاندنەوە', 'Scan barcode or search above to add items to return list')}</p>
                  </div>
                ) : (
                  <div className="bg-[#0e1626] rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#131d30] text-slate-300 font-bold border-b border-slate-700/80">
                            <th className="py-3 px-3 text-center w-10">#</th>
                            <th className="py-3 px-3">{t('اسم المادة / الباركود', 'ناوی کاڵا / بارکۆد', 'Item / Barcode')}</th>
                            <th className="py-3 px-3 text-center">{t('المخزون بالمحل', 'کۆگای بەردەست', 'Store Stock')}</th>
                            <th className="py-3 px-3 text-center">{t('سعر المفرد', 'نرخی تاک', 'Unit Price')}</th>
                            <th className="py-3 px-3 text-center">{t('الكمية المرجعة', 'بڕی گەڕێنراوە', 'Return Qty')}</th>
                            <th className="py-3 px-3 text-center">{t('المجموع', 'سەرجەم', 'Total')}</th>
                            <th className="py-3 px-3 text-center w-12">{t('إجراء', 'کردار', 'Action')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {directItems.map((item, index) => {
                            const itemTotal = item.price * item.quantity;
                            return (
                              <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                                {/* Index */}
                                <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                                  {index + 1}
                                </td>

                                {/* Item Name & Barcode */}
                                <td className="py-3 px-3">
                                  <div className="font-bold text-white text-xs sm:text-sm">
                                    {isAr || isKu ? (item.productNameAr || item.productName) : item.productName}
                                  </div>
                                  {item.barcode && (
                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                      {item.barcode}
                                    </div>
                                  )}
                                </td>

                                {/* Current Stock */}
                                <td className="py-3 px-3 text-center font-mono">
                                  <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                                    {item.currentStock} {t('قطعة', 'دانە', 'pcs')}
                                  </span>
                                </td>

                                {/* Unit Price */}
                                <td className="py-3 px-3 text-center">
                                  <div className="inline-flex items-center gap-1 bg-[#182338] px-2 py-1 rounded-lg border border-slate-700">
                                    <span className="text-slate-400 text-[11px] font-bold">{settings.currencySymbol}</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.price}
                                      onChange={(e) => handleUpdateDirectPrice(item.id, parseFloat(e.target.value) || 0)}
                                      className="w-16 bg-transparent text-center font-mono font-bold text-slate-100 focus:outline-none focus:text-emerald-400"
                                    />
                                  </div>
                                </td>

                                {/* Quantity [-] qty [+] */}
                                <td className="py-3 px-3 text-center">
                                  <div className="inline-flex items-center gap-1.5 bg-[#182338] px-2 py-1 rounded-lg border border-slate-700">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDirectQty(item.id, -1)}
                                      className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center transition-all cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="w-6 text-center font-bold font-mono text-slate-100">{item.quantity}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDirectQty(item.id, 1)}
                                      className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center transition-all cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>

                                {/* Total Price */}
                                <td className="py-3 px-3 text-center font-mono font-bold text-rose-400 text-xs sm:text-sm">
                                  {settings.currencySymbol}{formatNumber(itemTotal)}
                                </td>

                                {/* Action Delete */}
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDirectItem(item.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all cursor-pointer"
                                    title={t('إزالة المادة', 'سڕینەوەی کاڵا', 'Remove item')}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-[#131d30] border-t border-slate-700/80 font-bold text-slate-200">
                          <tr>
                            <td colSpan={4} className="py-3 px-3 text-right">
                              <span className="text-emerald-400">
                                {t(
                                  `إجمالي المواد المحددة للإرجاع: (${directItems.length} صنف / ${directItems.reduce((acc, i) => acc + i.quantity, 0)} قطعة)`,
                                  `سەرجەمی کاڵا دیاریکراوەکان: (${directItems.length} جۆر / ${directItems.reduce((acc, i) => acc + i.quantity, 0)} دانە)`,
                                  `Total items for return: (${directItems.length} items / ${directItems.reduce((acc, i) => acc + i.quantity, 0)} pcs)`
                                )}
                              </span>
                            </td>
                            <td colSpan={3} className="py-3 px-3 text-center text-rose-400 font-mono text-sm sm:text-base font-black">
                              {settings.currencySymbol}{formatNumber(directTotalAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ===================== MODE 2: INVOICE RETURN ===================== */}
          {returnMode === 'invoice' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {t('ماسح الباركود مفعّل ⚡ (امسح باركود الوصل/المادة واضغط Enter)', 'بارکۆد چالاکە ⚡ (بارکۆدی پسوڵە یان کاڵا لێبدە و Enter دابگرە)', 'Barcode Active (Scan Invoice/Item & Press Enter)')}
                  </span>
                  <label className="font-bold text-slate-200 block text-right">
                    {t('ابحث عن الوصل أو الفاتورة المراد ترجيعها:', 'بگەڕێ بۆ پسوڵەی فرۆشراو بۆ گەڕاندنەوە:', 'Search invoice or sold receipt to return:')}
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={invoiceSearchInput}
                    onChange={(e) => setInvoiceSearchInput(e.target.value)}
                    onKeyDown={handleInvoiceSearchKeyDown}
                    placeholder={t('امسح الباركود، أدخل رقم الوصل (INV-...)، أو اسم المادة واضغط Enter...', 'بارکۆد لێبدە، ژمارەی پسوڵە (INV-...)، یان ناوی کاڵا بنووسە و Enter دابگرە...', 'Scan barcode or invoice # and press Enter...')}
                    className="w-full bg-[#0e1626] text-xs sm:text-sm text-slate-100 placeholder-slate-500 px-10 py-2.5 rounded-xl border border-slate-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-right font-medium"
                  />
                  <BarcodeIcon className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-400" />
                </div>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {filteredSoldItems.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-slate-500" />
                    <p>{t('لم يتم العثور على فواتير أو مواد مباعة متطابقة', 'هیچ پسوڵە یان کاڵایەکی فرۆشراو نەدۆزرایەوە', 'No matching invoice items found.')}</p>
                  </div>
                ) : (
                  filteredSoldItems.map((item) => {
                    const qtyToReturn = returnQuantities[item.key] !== undefined ? returnQuantities[item.key] : 1;
                    const refundAmount = item.price * qtyToReturn;
                    return (
                      <div 
                        key={item.key}
                        className="p-3.5 rounded-xl bg-[#25334d] border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <button
                          onClick={() => handleProcessInvoiceReturnItem(item)}
                          className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t('تأكيد الإرجاع', 'پشتڕاستکردنەوەی گەڕاندنەوە', 'Confirm Return')}</span>
                        </button>

                        <div className="text-rose-400 font-bold font-mono">
                          {settings.currencySymbol}{formatNumber(refundAmount)}
                        </div>

                        <div className="flex items-center gap-2 bg-[#0e1626] px-2 py-1 rounded-xl border border-slate-700">
                          <span className="text-[11px] text-slate-400">{t('كمية المرتجع:', 'بڕی گەڕاندنەوە:', 'Return Qty:')}</span>
                          <button
                            type="button"
                            onClick={() => setReturnQuantities(prev => ({ ...prev, [item.key]: Math.max(1, qtyToReturn - 1) }))}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold text-slate-100">{qtyToReturn}</span>
                          <button
                            type="button"
                            onClick={() => setReturnQuantities(prev => ({ ...prev, [item.key]: qtyToReturn + 1 }))}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right flex-1 min-w-[200px]">
                          <div className="font-bold text-white text-sm flex items-center justify-end gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">{item.invoiceNumber}</span>
                            <span>{isAr || isKu ? (item.productNameAr || item.productName) : item.productName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 space-x-2 rtl:space-x-reverse">
                            <span>{t('المباع:', 'فرۆشراو:', 'Sold:')} {item.quantitySold}</span>
                            <span>| {t('السعر:', 'نرخ:', 'Price:')} {settings.currencySymbol}{item.price}</span>
                            <span>| {t('التاريخ:', 'بەروار:', 'Date:')} {item.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ===================== MODE 3: RECHARTS QUALITY & RETURNS ANALYTICS ===================== */}
          {returnMode === 'analytics' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* KPI 1: Total Sales */}
                <div className="p-3.5 rounded-2xl bg-[#101a2e] border border-blue-500/30 text-right space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block">{getTranslation(lang, 'totalSales')}</span>
                  <p className="text-base sm:text-lg font-black text-cyan-400 font-mono">
                    {settings.currencySymbol}{formatNumber(totalSalesOverall)}
                  </p>
                </div>

                {/* KPI 2: Returned Amount */}
                <div className="p-3.5 rounded-2xl bg-[#101a2e] border border-rose-500/30 text-right space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block">{getTranslation(lang, 'returnedAmount')}</span>
                  <p className="text-base sm:text-lg font-black text-rose-400 font-mono">
                    {settings.currencySymbol}{formatNumber(totalReturnsOverall)}
                  </p>
                </div>

                {/* KPI 3: Return Ratio */}
                <div className="p-3.5 rounded-2xl bg-[#101a2e] border border-amber-500/30 text-right space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block">{getTranslation(lang, 'returnsRatio')}</span>
                  <div className="flex items-center justify-end gap-1.5">
                    <TrendingDown className="w-4 h-4 text-amber-400" />
                    <p className="text-base sm:text-lg font-black text-amber-400 font-mono">
                      %{overallReturnRatio}
                    </p>
                  </div>
                </div>

                {/* KPI 4: Quality Status */}
                <div className="p-3.5 rounded-2xl bg-[#101a2e] border border-emerald-500/30 text-right space-y-1">
                  <span className="text-[11px] text-slate-400 font-bold block">{getTranslation(lang, 'qualityIndicator')}</span>
                  <div className="flex items-center justify-end gap-1 text-emerald-400 font-bold text-xs">
                    <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {parseFloat(overallReturnRatio) < 3.0 
                        ? (isKu ? 'کوالێتی زۆر باش' : isAr ? 'جودة ممتازة' : 'Excellent Quality')
                        : parseFloat(overallReturnRatio) < 8.0 
                        ? (isKu ? 'کوالێتی ئاسایی' : isAr ? 'جودة مقبولة' : 'Acceptable Quality')
                        : (isKu ? 'پێویستی بە بڕیار هەیە' : isAr ? 'تحتاج مراجعة' : 'Quality Review Needed')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recharts BarChart: Daily Sales vs Returns */}
              <div className="p-4 rounded-2xl bg-[#0e1626] border border-slate-700/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <span className="text-[11px] text-slate-400 font-bold bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    Recharts v3.10 Powered
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                    <span>{getTranslation(lang, 'dailyReturnsVsSales')}</span>
                    <BarChart2 className="w-4 h-4 text-cyan-400" />
                  </h3>
                </div>

                <div className="h-64 sm:h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                        formatter={(value: any, name: any) => [
                          `${settings.currencySymbol}${formatNumber(Number(value) || 0)}`,
                          name === 'totalSales' ? (isAr ? 'المبيعات الكلية' : isKu ? 'سەرجەمی فرۆشتن' : 'Total Sales') : (isAr ? 'المرتجعات' : isKu ? 'گەڕێنراوەکان' : 'Returns')
                        ]}
                      />
                      <Legend
                        formatter={(value) => (
                          <span className="text-xs font-bold text-slate-300">
                            {value === 'totalSales' ? (isAr ? 'المبيعات الكلية' : isKu ? 'سەرجەمی فرۆشتن' : 'Total Sales') : (isAr ? 'المبلغ المرتجع' : isKu ? 'بڕی گەڕێنراوە' : 'Returned Amount')}
                          </span>
                        )}
                      />
                      <Bar dataKey="totalSales" fill="#06b6d4" radius={[6, 6, 0, 0]} name="totalSales" />
                      <Bar dataKey="returnedAmount" fill="#ef4444" radius={[6, 6, 0, 0]} name="returnedAmount" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quality Decision Recommendations */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/30 text-xs space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  <h4>{getTranslation(lang, 'qualityIndicator')}</h4>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {isKu
                    ? '• ڕێژەی گەڕاندنەوەی کەمتر لە ٪٣ ئاماژەیە بۆ کوالێتی بەرز و جێگیری جۆری کاڵاکان. ئەگەر بەرهەمێک ڕێژەی گەڕاندنەوەی سەرتر لە ٪٨ بێت، ڕاسپێردراوە پەیوەندی بە دابینکەر بكرێت بۆ گۆڕینی وەجبەکە.'
                    : isAr
                    ? '• نسبة المرتجعات الأقل من 3% تعكس جودة عالية للمنتجات وتوافقها مع رغبة الزبائن. وفي حال تجاوزت المرتجعات نسبة 8% لصنف معين، يُوصى بمراجعة المورد واستبدال الشحنة.'
                    : '• A return rate under 3% indicates high product quality. If returns exceed 8% for a product line, supplier review and restock replacement is recommended.'}
                </p>
              </div>

            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            {/* Column 3 (Left in RTL): Refund Payment Method */}
            <div className="space-y-1 text-right">
              <label className="text-slate-300 font-bold block">{getTranslation(lang, 'refundMethod')}</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as 'cash' | 'credit')}
                className="w-full bg-[#0e1626] text-slate-200 border border-slate-700 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-rose-500 text-right font-medium"
              >
                <option value="cash">{getTranslation(lang, 'cashRefund')}</option>
                <option value="credit">{getTranslation(lang, 'creditNote')}</option>
              </select>
            </div>

            {/* Column 2 (Center in RTL): Return Reason */}
            <div className="space-y-1 text-right">
              <label className="text-slate-300 font-bold block">{isKu ? 'هۆکاری گەڕاندنەوە:' : isAr ? 'سبب الإرجاع:' : 'Return Reason:'}</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full bg-[#0e1626] text-slate-200 border border-slate-700 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-rose-500 text-right font-medium"
              >
                <option value="non_matching">{getTranslation(lang, 'reasonNonMatching')}</option>
                <option value="defective">{getTranslation(lang, 'reasonDefective')}</option>
                <option value="wrong_item">{getTranslation(lang, 'reasonWrongItem')}</option>
                <option value="expired">{getTranslation(lang, 'reasonExpired')}</option>
              </select>
            </div>

            {/* Column 1 (Right in RTL): Customer Name */}
            <div className="space-y-1 text-right">
              <label className="text-slate-300 font-bold block">{isKu ? 'ناوی کڕیار:' : isAr ? 'اسم العميل / الزبون:' : 'Customer Name:'}</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={isKu ? 'کڕیاری گشتی' : isAr ? 'عميل عام / زبون خارجي' : 'General Customer'}
                className="w-full bg-[#0e1626] text-slate-200 border border-slate-700 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-rose-500 text-right font-medium"
              />
            </div>
          </div>

        </div>

        {/* Modal Footer Bar matching exact layout in photo */}
        <div className="p-4 bg-[#131c2e] border-t border-slate-700/60 flex flex-wrap justify-between items-center gap-3">
          
          {/* Action Buttons on Left (in RTL) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer border border-slate-700"
            >
              {getTranslation(lang, 'cancel')}
            </button>

            <button
              type="button"
              onClick={handlePrintReturnReceipt}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-cyan-400/30"
              title={isKu ? 'چاپکردنی پسوڵەی گەڕێنراوەکانی ئەمڕۆ' : isAr ? 'طباعة وصل المرتجعات المخصومة من مبيعات اليوم' : 'Print return receipt'}
            >
              <Printer className="w-4 h-4 text-cyan-200" />
              <span>{getTranslation(lang, 'printReturnReceipt')}</span>
            </button>

            <button
              onClick={handleConfirmDirectReturn}
              className="px-5 py-2.5 rounded-xl bg-[#ef4444] hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/50 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{getTranslation(lang, 'confirmReturnAndRestock')}</span>
            </button>
          </div>

          {/* Total Direct Return Amount Display on Right (in RTL) */}
          <div className="flex items-center gap-2 text-right">
            <span className="text-lg sm:text-2xl font-black text-rose-400 font-mono">
              {settings.currencySymbol}{formatNumber(directTotalAmount)}
            </span>
            <span className="text-xs text-slate-300 font-bold">
              {isKu ? 'کۆی بڕی گەڕێنراوەی ڕاستەوخۆ:' : isAr ? 'إجمالي مبلغ الإرجاع المباشر:' : 'Total Direct Return Amount:'}
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
