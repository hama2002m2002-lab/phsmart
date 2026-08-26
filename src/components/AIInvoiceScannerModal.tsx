import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Check, 
  AlertCircle, 
  X, 
  Trash2, 
  Plus, 
  Calendar, 
  DollarSign, 
  Building2, 
  Package, 
  FileText, 
  ScanLine, 
  TrendingUp, 
  TrendingDown,
  Hash, 
  ShieldCheck, 
  Zap, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight, 
  Boxes, 
  Layers, 
  Percent, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Copy, 
  Clock, 
  RefreshCw, 
  Barcode 
} from 'lucide-react';
import { Product, Supplier, PurchaseInvoice, StoreSettings, ProductBatch } from '../types';
import { generateUniqueBarcode200245 } from '../lib/barcodeUtils';

export interface ScannedInvoiceData {
  supplier: {
    name: string;
    nameKu?: string;
    phone?: string;
    address?: string;
  };
  invoice: {
    invoiceNumber: string;
    date: string;
    customerName?: string;
    totalItemsCount?: number;
    grossInvoiceAmount?: number;
    discountAmount?: number;
    discountPercent?: number;
    netInvoiceAmount: number;
    previousBalance?: number;
    totalBalance?: number;
    currency?: string;
  };
  items: Array<{
    name: string;
    nameAr?: string;
    nameKu?: string;
    category?: string;
    dosageForm?: string;
    manufacturer?: string;
    barcode?: string;
    expiryDate: string;
    batchNumber: string;
    quantity: number;
    bonus?: number;
    originalPrice?: number;
    discountAmount?: number;
    discountPercent?: number;
    unitPurchasePrice: number;
    totalPrice: number;
    suggestedRetailPrice: number;
    unitsPerPack?: number;
    unit?: string;
  }>;
}

interface AIInvoiceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  existingProducts: Product[];
  existingSuppliers: Supplier[];
  onConfirmImport: (data: {
    newProducts: Product[];
    updatedProducts: Product[];
    newSupplier?: Supplier;
    newPurchaseInvoice?: PurchaseInvoice;
  }) => void;
  onTransferToDraft?: (data: {
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
  }) => void;
}

export const AIInvoiceScannerModal: React.FC<AIInvoiceScannerModalProps> = ({
  isOpen,
  onClose,
  settings,
  existingProducts,
  existingSuppliers,
  onConfirmImport,
  onTransferToDraft
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const currency = settings.currencySymbol || 'د.ع';

  const t = (ar: string, ku: string, en: string = ar) => isKu ? ku : isAr ? ar : en;

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<ScannedInvoiceData | null>(null);

  // Profit markup multiplier state (default 25%)
  const [defaultProfitMargin, setDefaultProfitMargin] = useState<number>(25);

  // Active filter tab for manager review: 'all' | 'existing' | 'new' | 'price_changed'
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'existing' | 'new' | 'price_changed'>('all');

  // Selected item indices
  const [selectedItemIndices, setSelectedItemIndices] = useState<Set<number>>(new Set());
  const [createPurchaseInvoice, setCreatePurchaseInvoice] = useState(true);
  const [updateSupplierBalance, setUpdateSupplierBalance] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Manager Success Summary Modal state
  const [savedSummaryReport, setSavedSummaryReport] = useState<{
    invoiceNumber: string;
    supplierName: string;
    totalItemsCount: number;
    totalPiecesCount: number;
    existingUpdatedCount: number;
    brandNewCount: number;
    grossTotal: number;
    discountTotal: number;
    netTotal: number;
    expectedProfitTotal: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Clean up camera media stream tracks when closing modal or unmounting
  useEffect(() => {
    if (!isOpen && mediaStreamRef.current) {
      console.log('[AIInvoiceScannerModal] Modal closed -> stopping active camera stream tracks');
      mediaStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) { console.warn('Error stopping track:', e); }
      });
      mediaStreamRef.current = null;
      setIsCameraActive(false);
    }
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch (e) { console.warn('Error stopping track:', e); }
        });
        mediaStreamRef.current = null;
      }
    };
  }, [isOpen]);

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[AIInvoiceScannerModal] File selected:', { name: file.name, size: file.size, type: file.type });
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImageSrc(result);
        processInvoiceImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Live Camera Handlers with progressive constraints for mobile browsers
  const startCamera = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera API (getUserMedia) is not supported in this browser context (HTTPS required).');
      }
      setIsCameraActive(true);

      let stream: MediaStream | null = null;
      try {
        // Try high-resolution back-facing camera first
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
      } catch (e1) {
        console.warn('High-res camera constraints failed, attempting fallback to basic environment camera:', e1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
        } catch (e2) {
          console.warn('Facing environment failed, attempting any available video camera:', e2);
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      if (stream) {
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          videoRef.current.play().catch(e => console.warn('Video play warning:', e));
        }
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      alert(t('تعذر تشغيل الكاميرا! يرجى رفع ملف صورة من الجهاز أو التحقق من أذونات الكاميرا.', 'نەتوانرا کامێرا بکرێتەوە! تکایە وێنەی پسوولەکە بە فایل دابنێ یان مۆڵەتی کامێرا بدە.', 'Could not access camera. Please upload an image file or check camera permissions.'));
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        stopCamera();
        setImageSrc(dataUrl);
        processInvoiceImage(dataUrl);
      }
    }
  };

  // Compress and resize image helper
  const compressImage = (dataUrl: string, maxWidth = 1400, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
      if (dataUrl.startsWith('demo_')) return resolve(dataUrl);
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // AI Invoice Scanner Execution
  const processInvoiceImage = async (base64Image: string) => {
    setIsScanning(true);
    setScanError(null);
    setScannedData(null);
    setSavedSummaryReport(null);

    try {
      const optimizedImage = await compressImage(base64Image);
      const response = await fetch('/api/gemini/scan-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: optimizedImage })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Server returned ${response.status}`);
      }

      const result: ScannedInvoiceData = await response.json();
      
      // Auto adjust suggested prices based on default margin if needed
      if (result.items) {
        result.items.forEach(item => {
          if (!item.suggestedRetailPrice || item.suggestedRetailPrice <= item.unitPurchasePrice) {
            item.suggestedRetailPrice = Math.round((item.unitPurchasePrice * (1 + defaultProfitMargin / 100)) / 250) * 250;
          }
        });
      }

      setScannedData(result);
      setSelectedItemIndices(new Set(result.items.map((_, i) => i)));
    } catch (err: any) {
      console.error('Invoice scanning error:', err);
      setScanError(err.message || t('فشل تحليل صورة الوصل بالذكاء الاصطناعي', 'هەڵە لە سکانکردنی وێنەکە بە زیرەکی دەستکرد', 'AI Invoice analysis failed'));
    } finally {
      setIsScanning(false);
    }
  };

  // Load Preset / Demo Collagen Drug Store Invoice
  const handleLoadDemoInvoice = () => {
    processInvoiceImage('demo_collagen_invoice');
  };

  // Item field change
  const updateItemField = (index: number, field: string, value: any) => {
    if (!scannedData) return;
    const newItems = [...scannedData.items];
    const item = { ...newItems[index], [field]: value };

    // Auto recalculate row total or suggested retail
    if (field === 'unitPurchasePrice' || field === 'quantity') {
      item.totalPrice = Number(item.unitPurchasePrice || 0) * Number(item.quantity || 1);
      if (!item.suggestedRetailPrice || item.suggestedRetailPrice <= item.unitPurchasePrice) {
        item.suggestedRetailPrice = Math.round((Number(item.unitPurchasePrice || 0) * (1 + defaultProfitMargin / 100)) / 250) * 250;
      }
    }

    newItems[index] = item;
    
    // Recalculate net invoice amount
    const newNet = newItems.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);

    setScannedData({
      ...scannedData,
      invoice: {
        ...scannedData.invoice,
        netInvoiceAmount: newNet
      },
      items: newItems
    });
  };

  const removeItem = (index: number) => {
    if (!scannedData) return;
    const newItems = scannedData.items.filter((_, i) => i !== index);
    setScannedData({
      ...scannedData,
      items: newItems
    });
    const newSelected = new Set<number>();
    newItems.forEach((_, i) => newSelected.add(i));
    setSelectedItemIndices(newSelected);
  };

  const toggleItemSelection = (index: number) => {
    const next = new Set(selectedItemIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedItemIndices(next);
  };

  // ------------------------------------------------------------------
  // INTELLIGENT MATCHING & PRICE/STOCK COMPARISON ENGINE
  // ------------------------------------------------------------------
  const enhancedItems = useMemo(() => {
    if (!scannedData?.items) return [];

    return scannedData.items.map((item, index) => {
      // 1. Search existing product in inventory by exact or normalized name / barcode
      const cleanName = item.name.trim().toLowerCase();
      const cleanNameAr = (item.nameAr || '').trim().toLowerCase();
      const cleanBarcode = (item.barcode || '').trim();

      const matchedProd = existingProducts.find(p => {
        if (cleanBarcode && p.barcode === cleanBarcode) return true;
        if (p.name && p.name.trim().toLowerCase() === cleanName) return true;
        if (item.nameAr && p.nameAr && p.nameAr.trim().toLowerCase() === cleanNameAr) return true;
        if (cleanName.length > 4 && p.name.toLowerCase().includes(cleanName)) return true;
        if (cleanNameAr.length > 4 && p.nameAr && p.nameAr.toLowerCase().includes(cleanNameAr)) return true;
        return false;
      });

      const isExisting = Boolean(matchedProd);
      const oldStock = matchedProd?.stock || 0;
      const unitsPerPack = Number(item.unitsPerPack) || (matchedProd?.unitsPerCarton && matchedProd.unitsPerCarton > 0 ? matchedProd.unitsPerCarton : 1);
      const totalUnitsBought = (Number(item.quantity) || 1) * unitsPerPack;
      const expectedNewStock = oldStock + totalUnitsBought;

      const oldPurchasePrice = matchedProd 
        ? (matchedProd.lastPurchasePrice || matchedProd.costPerUnit || matchedProd.cost || 0)
        : 0;

      const newUnitCost = Number(item.unitPurchasePrice) || 0;
      const priceDifference = isExisting ? (newUnitCost - oldPurchasePrice) : 0;
      const priceDifferencePercent = isExisting && oldPurchasePrice > 0 
        ? parseFloat(((priceDifference / oldPurchasePrice) * 100).toFixed(1))
        : 0;

      const isPriceIncreased = isExisting && priceDifference > 0;
      const isPriceDecreased = isExisting && priceDifference < 0;

      const retailPrice = Number(item.suggestedRetailPrice) || Math.round(newUnitCost * (1 + defaultProfitMargin / 100));
      const profitPerPiece = retailPrice - newUnitCost;
      const expectedTotalProfit = profitPerPiece * totalUnitsBought;

      return {
        rawItem: item,
        originalIndex: index,
        matchedProduct: matchedProd,
        isExisting,
        oldStock,
        totalUnitsBought,
        expectedNewStock,
        oldPurchasePrice,
        newUnitCost,
        priceDifference,
        priceDifferencePercent,
        isPriceIncreased,
        isPriceDecreased,
        oldExpiry: matchedProd?.expiryDate || 'N/A',
        newExpiry: item.expiryDate || '2028-12-31',
        newBatch: item.batchNumber || `B-${new Date().getFullYear()}`,
        retailPrice,
        profitPerPiece,
        expectedTotalProfit,
        unitsPerPack,
        discountAmount: Number(item.discountAmount) || 0,
        discountPercent: Number(item.discountPercent) || 0
      };
    });
  }, [scannedData, existingProducts, defaultProfitMargin]);

  // Filtered items for display
  const filteredEnhancedItems = useMemo(() => {
    if (activeTabFilter === 'existing') return enhancedItems.filter(i => i.isExisting);
    if (activeTabFilter === 'new') return enhancedItems.filter(i => !i.isExisting);
    if (activeTabFilter === 'price_changed') return enhancedItems.filter(i => i.isPriceIncreased || i.isPriceDecreased);
    return enhancedItems;
  }, [enhancedItems, activeTabFilter]);

  // Financial Metric Totals for Manager Review
  const managerAuditSummary = useMemo(() => {
    if (!scannedData) return null;

    const selectedItems = enhancedItems.filter(i => selectedItemIndices.has(i.originalIndex));
    const totalItems = selectedItems.length;
    const totalPieces = selectedItems.reduce((acc, i) => acc + i.totalUnitsBought, 0);
    const existingCount = selectedItems.filter(i => i.isExisting).length;
    const newCount = selectedItems.filter(i => !i.isExisting).length;
    const priceIncreasedCount = selectedItems.filter(i => i.isPriceIncreased).length;
    const priceDecreasedCount = selectedItems.filter(i => i.isPriceDecreased).length;

    const grossTotal = selectedItems.reduce((acc, i) => {
      const original = (Number(i.rawItem.originalPrice) || Number(i.rawItem.unitPurchasePrice)) * Number(i.rawItem.quantity);
      return acc + original;
    }, 0);

    const netInvoiceTotal = selectedItems.reduce((acc, i) => acc + (Number(i.rawItem.totalPrice) || (Number(i.rawItem.unitPurchasePrice) * Number(i.rawItem.quantity))), 0);
    const totalDiscountSaved = Math.max(0, grossTotal - netInvoiceTotal) + (Number(scannedData.invoice.discountAmount) || 0);
    const totalExpectedProfit = selectedItems.reduce((acc, i) => acc + i.expectedTotalProfit, 0);

    return {
      totalItems,
      totalPieces,
      existingCount,
      newCount,
      priceIncreasedCount,
      priceDecreasedCount,
      grossTotal,
      netInvoiceTotal,
      totalDiscountSaved,
      totalExpectedProfit
    };
  }, [scannedData, enhancedItems, selectedItemIndices]);

  // ------------------------------------------------------------------
  // ACTION 1: TRANSFER ALL SCANNED ITEMS TO PURCHASES TAB DRAFT GRID
  // ------------------------------------------------------------------
  const handleTransferToDraftGrid = () => {
    if (!scannedData || !onTransferToDraft || selectedItemIndices.size === 0) return;

    const invoiceDate = scannedData.invoice.date || new Date().toISOString().split('T')[0];
    const supplierName = scannedData.supplier.name || 'مورد وصل كولاجين';

    const draftItemsList = enhancedItems
      .filter(i => selectedItemIndices.has(i.originalIndex))
      .map(i => {
        const item = i.rawItem;
        const upc = i.unitsPerPack || 1;
        const qty = Number(item.quantity) || 1;
        const totalPcs = qty * upc;
        const unitCost = Number(item.unitPurchasePrice) || 0;
        const retail = Number(item.suggestedRetailPrice) || Math.round(unitCost * 1.25);
        const profit = retail - unitCost;
        const marginPct = unitCost > 0 ? parseFloat(((profit / unitCost) * 100).toFixed(1)) : 0;

        const effectiveBarcode = (item.barcode && item.barcode.trim()) 
          ? item.barcode.trim() 
          : (i.matchedProduct?.barcode || (6280000000000 + Math.floor(Math.random() * 900000000)).toString());

        return {
          productId: i.matchedProduct?.id || `prod-ocr-${Date.now()}-${i.originalIndex}`,
          productName: item.nameAr || item.name,
          barcode: effectiveBarcode,
          purchaseUnitMode: (upc > 1 ? 'carton' : 'piece') as 'carton' | 'piece',
          cartonsCount: upc > 1 ? qty : 0,
          piecesPerCarton: upc,
          cartonPurchasePrice: upc > 1 ? unitCost * upc : 0,
          totalPieces: totalPcs,
          oldPurchasePrice: i.oldPurchasePrice,
          newPiecePurchaseCost: unitCost,
          costUpdateMethod: 'weighted_average' as 'weighted_average',
          finalPieceCost: unitCost,
          retailSellingPrice: retail,
          pieceProfit: profit,
          profitMarginPercent: marginPct,
          totalItemCost: qty * unitCost,
          totalItemExpectedProfit: profit * totalPcs,
          oldStockQty: i.oldStock,
          expiryDate: item.expiryDate,
          productionDate: '',
          batchNumber: item.batchNumber,
          oldExpiryDate: i.oldExpiry,
          discountAmount: Number(item.discountAmount) || 0,
          discountPercent: Number(item.discountPercent) || 0
        };
      });

    onTransferToDraft({
      items: draftItemsList,
      supplierName: scannedData.supplier.name,
      supplierPhone: scannedData.supplier.phone,
      invoiceNumber: scannedData.invoice.invoiceNumber,
      invoiceDate: invoiceDate,
      discountAmount: Number(scannedData.invoice.discountAmount) || 0
    });

    stopCamera();
    onClose();
  };

  // ------------------------------------------------------------------
  // ACTION 2: CONFIRM & INSTANT INVENTORY INGESTION & BATCH UPDATE
  // ------------------------------------------------------------------
  const handleConfirmAndSaveInstant = () => {
    if (!scannedData || !scannedData.items.length) return;

    const supplierName = scannedData.supplier.name || 'كۆگای كۆلاجین';
    const supplierPhone = scannedData.supplier.phone || '';
    const invoiceNum = scannedData.invoice.invoiceNumber || `${Date.now()}`;
    const invoiceDate = scannedData.invoice.date || new Date().toISOString().split('T')[0];

    // 1. Find or create supplier
    let targetSupplier = existingSuppliers.find(s => 
      s.name.toLowerCase().includes(supplierName.toLowerCase()) || 
      (s.nameAr && s.nameAr.toLowerCase().includes(supplierName.toLowerCase()))
    );

    let newSupplierObj: Supplier | undefined;
    const invoiceTotal = scannedData.invoice.netInvoiceAmount || 0;

    if (!targetSupplier && updateSupplierBalance) {
      targetSupplier = {
        id: `sup-${Date.now()}`,
        name: supplierName,
        nameAr: supplierName,
        contactPerson: supplierName,
        phone: supplierPhone,
        email: '',
        categorySupplied: 'أدوية ومستلزمات طبية',
        activeOrders: 1,
        totalInvoiced: invoiceTotal,
        totalPaid: 0,
        balanceDue: invoiceTotal,
        rating: 5.0,
        avatar: '🏥',
        taxNumber: '',
        address: scannedData.supplier.address || 'العراق',
        isSaved: true,
        payments: []
      };
      newSupplierObj = targetSupplier;
    }

    // 2. Prepare Products
    const newProductsList: Product[] = [];
    const updatedProductsList: Product[] = [];
    const purchaseInvoiceItems: any[] = [];

    let totalPiecesCount = 0;
    let existingUpdatedCount = 0;
    let brandNewCount = 0;

    enhancedItems.forEach((info) => {
      if (!selectedItemIndices.has(info.originalIndex)) return;

      const item = info.rawItem;
      const qty = Number(item.quantity) || 1;
      const unitCost = Number(item.unitPurchasePrice) || 0;
      const retailPrice = Number(item.suggestedRetailPrice) || Math.round(unitCost * 1.25);
      const unitsPerPack = info.unitsPerPack || 1;
      const totalUnits = qty * unitsPerPack;
      const expiry = item.expiryDate || '2028-12-31';
      const batch = item.batchNumber || `BATCH-${new Date().getFullYear()}`;

      totalPiecesCount += totalUnits;

      if (info.isExisting && info.matchedProduct) {
        existingUpdatedCount++;
        const existing = info.matchedProduct;
        const oldStock = existing.stock || 0;
        const newTotalStock = oldStock + totalUnits;

        // Multi-Batch FEFO Management:
        let updatedBatches: ProductBatch[] = Array.isArray(existing.batches) ? [...existing.batches] : [];

        // If existing had stock with an old expiry but no batches array yet, save it as old batch
        if (updatedBatches.length === 0 && oldStock > 0) {
          updatedBatches.push({
            id: `batch-old-${existing.id}`,
            batchNumber: existing.batchNumber || 'BATCH-OLD',
            expiryDate: existing.expiryDate || 'N/A',
            productionDate: existing.productionDate || '',
            quantity: oldStock,
            purchasePrice: existing.costPerUnit || existing.cost || unitCost,
            supplierName: existing.supplierDelegate || existing.supplierName || 'قديم',
            addedDate: existing.initialAddDate || invoiceDate
          });
        }

        // Add the new purchased batch
        updatedBatches.push({
          id: `batch-${Date.now()}-${info.originalIndex}`,
          batchNumber: batch,
          expiryDate: expiry,
          productionDate: '',
          quantity: totalUnits,
          purchasePrice: unitCost,
          supplierName: targetSupplier?.nameAr || supplierName,
          addedDate: invoiceDate
        });

        // Determine effective primary expiry (earliest active date)
        const validExpiries = updatedBatches
          .filter(b => b.quantity > 0 && b.expiryDate && b.expiryDate !== 'N/A' && b.expiryDate !== '')
          .map(b => b.expiryDate)
          .sort();

        const effectiveExpiry = validExpiries.length > 0 ? validExpiries[0] : expiry;

        const effectiveItemBarcode = (item.barcode && item.barcode.trim()) ? item.barcode.trim() : existing.barcode;

        const updated: Product = {
          ...existing,
          barcode: effectiveItemBarcode,
          stock: newTotalStock,
          totalUnits: newTotalStock,
          cartonsCount: Math.floor(newTotalStock / unitsPerPack),
          costPerUnit: unitCost,
          cost: unitCost,
          lastPurchasePrice: unitCost,
          singleRetailPrice: retailPrice,
          price: retailPrice,
          batchNumber: batch,
          expiryDate: effectiveExpiry,
          batches: updatedBatches,
          lastEditDate: invoiceDate,
          status: 'in_stock'
        };
        updatedProductsList.push(updated);

        purchaseInvoiceItems.push({
          id: `pur-item-${Date.now()}-${info.originalIndex}`,
          productId: existing.id,
          productName: existing.name,
          productNameAr: existing.nameAr || existing.name,
          barcode: effectiveItemBarcode,
          imageIcon: '💊',
          currentStockInWarehouse: oldStock,
          purchasedQuantity: totalUnits,
          oldPurchasePrice: info.oldPurchasePrice,
          newPurchasePrice: unitCost,
          oldRetailPrice: existing.singleRetailPrice || existing.price,
          newRetailPrice: retailPrice,
          unitsPerCarton: unitsPerPack,
          discountAmount: info.discountAmount,
          discountPercent: info.discountPercent,
          totalCost: qty * unitCost,
          expiryDate: expiry,
          batchNumber: batch,
          oldExpiryDate: info.oldExpiry
        });
      } else {
        brandNewCount++;
        const newProdId = `prod-ocr-${Date.now()}-${info.originalIndex}`;
        const autoBarcode = (item.barcode && item.barcode.trim()) 
          ? item.barcode.trim() 
          : (6280000000000 + Math.floor(Math.random() * 900000000)).toString();

        const initialBatches: ProductBatch[] = [{
          id: `batch-${Date.now()}-${info.originalIndex}`,
          batchNumber: batch,
          expiryDate: expiry,
          productionDate: '',
          quantity: totalUnits,
          purchasePrice: unitCost,
          supplierName: targetSupplier?.nameAr || supplierName,
          addedDate: invoiceDate
        }];

        const newProd: Product = {
          id: newProdId,
          name: item.name,
          nameAr: item.nameAr || item.name,
          nameKu: item.nameKu || item.name,
          category: item.category || 'أدوية ومستلزمات',
          categoryAr: item.category || 'أدوية ومستلزمات طبية',
          categoryKu: 'دەرمان و پێداویستی پزیشکی',
          barcode: autoBarcode,
          supplierId: targetSupplier?.id || '',
          supplierName: targetSupplier?.nameAr || supplierName,
          supplierDelegate: targetSupplier?.contactPerson || supplierName,
          cartonsCount: Math.floor(totalUnits / unitsPerPack),
          unitsPerCarton: unitsPerPack,
          totalUnits: totalUnits,
          cartonPurchasePrice: unitCost * unitsPerPack,
          lastPurchasePrice: unitCost,
          lastCartonPurchasePrice: unitCost * unitsPerPack,
          costPerUnit: unitCost,
          singleRetailPrice: retailPrice,
          wholesalePrice: Math.round(unitCost * 1.1),
          cartonSellingPrice: retailPrice * unitsPerPack,
          singleProfit: retailPrice - unitCost,
          wholesaleProfit: Math.round(unitCost * 1.1) - unitCost,
          cartonProfit: (retailPrice * unitsPerPack) - (unitCost * unitsPerPack),
          initialAddDate: invoiceDate,
          lastEditDate: invoiceDate,
          expiryDate: expiry,
          batchNumber: batch,
          batches: initialBatches,
          price: retailPrice,
          cost: unitCost,
          stock: totalUnits,
          minStock: 5,
          unit: item.unit || 'علبة',
          imageIcon: '💊',
          status: 'in_stock'
        };

        newProductsList.push(newProd);

        purchaseInvoiceItems.push({
          id: `pur-item-${Date.now()}-${info.originalIndex}`,
          productId: newProdId,
          productName: newProd.name,
          productNameAr: newProd.nameAr,
          barcode: autoBarcode,
          imageIcon: '💊',
          currentStockInWarehouse: 0,
          purchasedQuantity: totalUnits,
          oldPurchasePrice: 0,
          newPurchasePrice: unitCost,
          oldRetailPrice: retailPrice,
          newRetailPrice: retailPrice,
          unitsPerCarton: unitsPerPack,
          discountAmount: info.discountAmount,
          discountPercent: info.discountPercent,
          totalCost: qty * unitCost,
          expiryDate: expiry,
          batchNumber: batch,
          oldExpiryDate: 'N/A'
        });
      }
    });

    // 3. Purchase Invoice Record
    let newPurchaseInvoiceObj: PurchaseInvoice | undefined;
    if (createPurchaseInvoice && purchaseInvoiceItems.length > 0) {
      newPurchaseInvoiceObj = {
        id: `pur-inv-${invoiceNum}`,
        invoiceNumber: `PUR-${invoiceNum}`,
        date: invoiceDate,
        time: new Date().toLocaleTimeString(),
        supplierName: targetSupplier?.nameAr || supplierName,
        supplierPhone: targetSupplier?.phone || supplierPhone,
        paymentType: 'credit',
        paidAmount: 0,
        remainingAmount: invoiceTotal,
        grossInvoiceAmount: managerAuditSummary?.grossTotal || invoiceTotal,
        discountAmount: managerAuditSummary?.totalDiscountSaved || 0,
        totalInvoiceAmount: invoiceTotal,
        items: purchaseInvoiceItems,
        status: 'completed',
        notes: `تم الإدخال والتحقق عبر مسح صورة الوصل بالذكاء الاصطناعي (Gemini Vision) - تشمل مقارنة الأسعار والتواريخ والخصومات`
      };
    }

    onConfirmImport({
      newProducts: newProductsList,
      updatedProducts: updatedProductsList,
      newSupplier: newSupplierObj,
      newPurchaseInvoice: newPurchaseInvoiceObj
    });

    // Display celebratory manager summary modal
    setSavedSummaryReport({
      invoiceNumber: invoiceNum,
      supplierName: targetSupplier?.nameAr || supplierName,
      totalItemsCount: selectedItemIndices.size,
      totalPiecesCount,
      existingUpdatedCount,
      brandNewCount,
      grossTotal: managerAuditSummary?.grossTotal || invoiceTotal,
      discountTotal: managerAuditSummary?.totalDiscountSaved || 0,
      netTotal: invoiceTotal,
      expectedProfitTotal: managerAuditSummary?.totalExpectedProfit || 0
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none overflow-y-auto dir-rtl">
      <div className="relative w-full max-w-6xl bg-[#090F1E] border-2 border-emerald-500/50 rounded-3xl p-4 sm:p-6 shadow-[0_0_60px_rgba(16,185,129,0.25)] space-y-4 my-auto max-h-[96vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/30 text-emerald-300 border border-emerald-500/40 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {t('إضافة المواد المشتراة بمسح صورة الوصل (Smart AI OCR)', 'زیادکردنی خۆکاری کڕین بە وێنەی پسوولە (AI Scanner)', 'Smart AI Invoice & Image Scanner')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
                  Gemini Vision Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  'التقط صورة الوصل مباشرة؛ يقوم الذكاء الاصطناعي بحساب الشراء، الخصومات، تواريخ الصلاحية الجديدة، مقارنة الأسعار القديمة والجديدة، وجلبها لسلة المدير للمراجعة والحفظ.',
                  'وێنەی پسوولەکە بگرە؛ سیستمەکە بڕ، داشکاندن، بەسەرچوونی نوێ، جیاوازی نرخی کۆن و نوێ دەردەهێنێت و دەیهێنێتە سەبەتەی بەڕێوەبەر بۆ پەسەندکردن.',
                  'Capture invoice photo; AI extracts items, discounts, expiries, old vs new prices and loads manager confirmation basket.'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar: Upload, Camera, or Sample */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#0B1528] border border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* Standard file/image picker */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*,.pdf" 
              onChange={handleFileChange} 
              className="hidden" 
            />

            {/* Native Mobile Camera direct capture input */}
            <input 
              type="file" 
              ref={mobileCameraInputRef} 
              accept="image/*" 
              capture="environment"
              onChange={handleFileChange} 
              className="hidden" 
            />

            <button
              type="button"
              onClick={isCameraActive ? stopCamera : startCamera}
              disabled={isScanning}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                isCameraActive 
                  ? 'bg-rose-600 text-white hover:bg-rose-500' 
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{isCameraActive ? t('إيقاف الكاميرا', 'داخستنی کامێرا', 'Stop Camera') : t('📸 فتح كاميرا الفيديو المباشرة', '📸 کردنەوەی کامێرای ڕاستەوخۆ', 'Live Video Camera')}</span>
            </button>

            {/* Direct Mobile Photo Snap Button */}
            <button
              type="button"
              onClick={() => mobileCameraInputRef.current?.click()}
              disabled={isScanning}
              className="px-4 py-2.5 rounded-xl bg-teal-600/90 hover:bg-teal-500 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>{t('📱 تصوير سريع بكاميرا الموبايل', '📱 وێنەگرتنی خێرا بە مۆبایل', 'Snap Photo (Mobile)')}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="px-4 py-2.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{t('📁 اختيار صورة من المعرض', '📁 هەڵبژاردنی وێنە لە گەلەری', 'Upload from Gallery')}</span>
            </button>

            <button
              type="button"
              onClick={handleLoadDemoInvoice}
              disabled={isScanning}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-current text-amber-400" />
              <span>{t('⚡ تجربة وصل صيدلية كولاجين النموذجي', '⚡ تاقیکردنەوە بە نموونەی کۆلاجین', '⚡ Test Collagen Invoice')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#060b14] px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-bold">{t('هامش الربح المقترح:', 'ڕێژەی قازانجی پێشنیارکراو:', 'Suggested Margin:')}</span>
            <input
              type="number"
              value={defaultProfitMargin}
              onChange={(e) => setDefaultProfitMargin(Math.max(0, Number(e.target.value)))}
              className="w-14 bg-[#050B17] border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              min={0}
              max={200}
            />
            <span className="font-bold text-emerald-400">%</span>
          </div>
        </div>

        {/* Live Camera View (if active) */}
        {isCameraActive && (
          <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-black flex flex-col items-center p-3 space-y-3 shrink-0">
            <video ref={videoRef} className="w-full max-h-64 rounded-xl object-contain shadow-2xl" autoPlay playsInline />
            <button
              type="button"
              onClick={capturePhoto}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>{t('التقاط صورة الوصل وتحليلها بالذكاء الاصطناعي', 'وێنەی پسوولەکە بگرە و بینێرە بۆ شیکردنەوە', 'Capture & Analyze Invoice')}</span>
            </button>
          </div>
        )}

        {/* Scanning Spinner */}
        {isScanning && (
          <div className="p-8 rounded-2xl bg-[#0B1528] border border-cyan-500/40 text-center space-y-3 animate-fadeIn my-auto">
            <div className="inline-block p-4 rounded-full bg-cyan-500/20 text-cyan-400 animate-spin">
              <ScanLine className="w-10 h-10" />
            </div>
            <h4 className="text-base font-black text-white">
              {t('جاري استخراج وقراءة المواد والأسعار والخصومات والتواريخ...', 'زیرەکی دەستکرد خەریکی شیکردنەوە و خوێندنەوەی پسوولەکەیە...', 'Gemini Vision AI is extracting items, discounts, expiries & costs...')}
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {t(
                'مطابقة المواد مع المخزن، حساب فارق الأسعار القديمة والجديدة، تسجيل الدفعات الجديدة، وحساب الأرباح المتوقعة للمدير',
                'بەراوردکردنی کاڵاکان لەگەڵ کۆگا، حیسابکردنی جیاوازی نرخی کۆن و نوێ، و تۆمارکردنی بەسەرچوونی نوێ',
                'Matching items against warehouse inventory, computing price differences & projecting profit margins'
              )}
            </p>
          </div>
        )}

        {scanError && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}

        {/* MANAGER REVIEW WORKSPACE & CONFIRMATION BASKET */}
        {scannedData && !isScanning && (
          <div className="flex-1 overflow-y-auto space-y-3.5 custom-scrollbar pr-1">
            
            {/* 1. Header Invoice & Supplier Meta Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              <div className="p-2.5 rounded-xl bg-[#0B1528] border border-slate-800 space-y-0.5">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('المورد / المذخر:', 'دابینکەر / کۆگا:', 'Supplier:')}</span>
                </div>
                <input
                  type="text"
                  value={scannedData.supplier.name || ''}
                  onChange={(e) => setScannedData({
                    ...scannedData,
                    supplier: { ...scannedData.supplier, name: e.target.value }
                  })}
                  className="w-full bg-transparent text-xs font-bold text-white focus:outline-none border-b border-transparent focus:border-cyan-400"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-[#0B1528] border border-slate-800 space-y-0.5">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('رقم الوصل:', 'ژمارەی پسوولە:', 'Invoice No:')}</span>
                </div>
                <input
                  type="text"
                  value={scannedData.invoice.invoiceNumber || ''}
                  onChange={(e) => setScannedData({
                    ...scannedData,
                    invoice: { ...scannedData.invoice, invoiceNumber: e.target.value }
                  })}
                  className="w-full bg-transparent text-xs font-bold text-white focus:outline-none border-b border-transparent focus:border-purple-400 font-mono"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-[#0B1528] border border-slate-800 space-y-0.5">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('تاريخ الوصل:', 'بەرواری پسوولە:', 'Invoice Date:')}</span>
                </div>
                <input
                  type="date"
                  value={scannedData.invoice.date || ''}
                  onChange={(e) => setScannedData({
                    ...scannedData,
                    invoice: { ...scannedData.invoice, date: e.target.value }
                  })}
                  className="w-full bg-transparent text-xs font-bold text-white focus:outline-none border-b border-transparent focus:border-amber-400 font-mono"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-0.5">
                <div className="text-[11px] text-emerald-300 flex items-center gap-1 font-bold">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('صافي مبلغ الوصل:', 'کۆی گشتی پسوولە:', 'Net Invoice Total:')}</span>
                </div>
                <div className="text-xs font-mono font-black text-emerald-300">
                  {scannedData.invoice.netInvoiceAmount.toLocaleString()} {currency}
                </div>
              </div>

            </div>

            {/* 2. Manager Audit KPI Summary Strip */}
            {managerAuditSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-2xl bg-gradient-to-r from-[#0b162e] via-[#09142b] to-[#0b162e] border border-cyan-500/30 text-xs">
                
                <div className="space-y-0.5">
                  <span className="text-[10.5px] text-slate-400 block">{t('عدد المواد المحددة:', 'ژمارەی کاڵاکان:', 'Items Selected:')}</span>
                  <div className="text-sm font-mono font-black text-white flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-cyan-400" />
                    <span>{managerAuditSummary.totalItems} {t('مادة', 'مادە', 'items')}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({managerAuditSummary.totalPieces} {t('قطعة', 'دانە', 'pcs')})</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10.5px] text-slate-400 block">{t('حالة المخزن (قديم / جديد):', 'کۆگا (کۆن / نوێ):', 'Stock Status:')}</span>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">
                      {managerAuditSummary.existingCount} {t('بالمخزن', 'لە کۆگادا', 'existing')}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">
                      {managerAuditSummary.newCount} {t('جديدة', 'نوێ', 'new')}
                    </span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10.5px] text-slate-400 block">{t('إجمالي الخصومات المحققة:', 'کۆی داشکاندن:', 'Total Discounts:')}</span>
                  <div className="text-xs font-mono font-black text-amber-300 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    <span>{managerAuditSummary.totalDiscountSaved.toLocaleString()} {currency}</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10.5px] text-slate-400 block">{t('تنبيهات تغير الأسعار:', 'گۆڕانی نرخەکان:', 'Price Changes:')}</span>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    {managerAuditSummary.priceIncreasedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] flex items-center gap-0.5">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{managerAuditSummary.priceIncreasedCount} {t('ارتفاع', 'بەرزبوون', 'up')}</span>
                      </span>
                    )}
                    {managerAuditSummary.priceDecreasedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] flex items-center gap-0.5">
                        <ArrowDownRight className="w-3 h-3" />
                        <span>{managerAuditSummary.priceDecreasedCount} {t('انخفاض', 'دابەزین', 'down')}</span>
                      </span>
                    )}
                    {managerAuditSummary.priceIncreasedCount === 0 && managerAuditSummary.priceDecreasedCount === 0 && (
                      <span className="text-[10.5px] text-slate-400">⚖️ {t('الأسعار ثابتة', 'نرخەکان جێگیرن', 'Prices stable')}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10.5px] text-slate-400 block">{t('الأرباح المتوقعة للمدير:', 'قازانجی پێشبینیکراو:', 'Projected Profit:')}</span>
                  <div className="text-xs font-mono font-black text-emerald-300 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{managerAuditSummary.totalExpectedProfit.toLocaleString()} {currency}</span>
                  </div>
                </div>

              </div>
            )}

            {/* 3. Items Basket & Filter Tabs */}
            <div className="rounded-2xl border border-slate-800 bg-[#0B1528] overflow-hidden space-y-0">
              
              {/* Basket Toolbar */}
              <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-[#081020]">
                
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-black text-white">
                    {t('سلة تدقيق وتأكيد المشتريات للمدير', 'سەبەتەی پێداچوونەوە و پەسەندکردنی بەڕێوەبەر', 'Manager Purchases Verification & Audit Basket')}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10.5px] font-mono font-bold">
                    {selectedItemIndices.size} / {enhancedItems.length}
                  </span>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-[#050B17] p-1 rounded-xl border border-slate-800 text-[10.5px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTabFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeTabFilter === 'all' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('الكل', 'هەموو', 'All')} ({enhancedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabFilter('existing')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeTabFilter === 'existing' ? 'bg-blue-600 text-white font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('موجود بالمخزن', 'لە کۆگادا هەیە', 'In Warehouse')} ({enhancedItems.filter(i => i.isExisting).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabFilter('new')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeTabFilter === 'new' ? 'bg-purple-600 text-white font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('مواد جديدة', 'کاڵای نوێ', 'New Items')} ({enhancedItems.filter(i => !i.isExisting).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabFilter('price_changed')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeTabFilter === 'price_changed' ? 'bg-amber-600 text-white font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('تغير الأسعار ⚠️', 'گۆڕانی نرخ ⚠️', 'Price Alerts')} ({enhancedItems.filter(i => i.isPriceIncreased || i.isPriceDecreased).length})
                  </button>
                </div>

              </div>

              {/* Table of Items */}
              <div className="overflow-x-auto max-h-80 custom-scrollbar">
                <table className="w-full text-right text-[11px] border-collapse">
                  <thead className="bg-[#050B17] text-slate-400 sticky top-0 z-10 border-b border-slate-800 text-[10.5px]">
                    <tr>
                      <th className="p-2.5 text-center w-10">
                        <input
                          type="checkbox"
                          checked={selectedItemIndices.size === enhancedItems.length && enhancedItems.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedItemIndices(new Set(enhancedItems.map(i => i.originalIndex)));
                            else setSelectedItemIndices(new Set());
                          }}
                          className="rounded text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="p-2.5 text-start">{t('اسم المادة وحالتها بالمخزن', 'ناوی کاڵا و باڵانس لە کۆگا', 'Product & Warehouse Match')}</th>
                      <th className="p-2.5 text-center">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                      <th className="p-2.5 text-center">{t('الكمية والعبوة', 'بڕ و دانە', 'Qty / Pack')}</th>
                      <th className="p-2.5 text-center">{t('مقارنة الشراء (قديم ⬅️ جديد)', 'بەراوردی کڕین (کۆن ⬅️ نوێ)', 'Cost (Old vs New)')}</th>
                      <th className="p-2.5 text-center">{t('الخصم', 'داشکاندن', 'Discount')}</th>
                      <th className="p-2.5 text-center">{t('مجموع الشراء', 'کۆی کڕین', 'Total Net')}</th>
                      <th className="p-2.5 text-center">{t('الصلاحية والوجبة (FEFO)', 'بەسەرچوون و باچ', 'Expiry & Batch')}</th>
                      <th className="p-2.5 text-center">{t('سعر البيع المقترح', 'نرخی فرۆشتنی پێشنیارکراو', 'Selling Price')}</th>
                      <th className="p-2.5 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {filteredEnhancedItems.map((info) => {
                      const idx = info.originalIndex;
                      const item = info.rawItem;
                      const isSelected = selectedItemIndices.has(idx);

                      return (
                        <tr 
                          key={idx} 
                          className={`hover:bg-slate-800/40 transition-all ${
                            isSelected ? 'bg-emerald-950/10' : 'opacity-40'
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(idx)}
                              className="rounded text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* 1. Item Name & Warehouse Match Status */}
                          <td className="p-2.5 font-medium max-w-[220px]">
                            <input
                              type="text"
                              value={item.nameAr || item.name}
                              onChange={(e) => updateItemField(idx, 'nameAr', e.target.value)}
                              className="w-full bg-transparent text-white font-bold focus:outline-none border-b border-transparent focus:border-cyan-400 text-xs"
                            />
                            <div className="text-[10px] text-slate-400 font-mono truncate">{item.name}</div>
                            
                            {/* Warehouse status badge */}
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {info.isExisting ? (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[9.5px] border border-blue-500/30 flex items-center gap-1">
                                  <span>📦 {t('متوفر:', 'لە کۆگا:', 'Stock:')} {info.oldStock}</span>
                                  <span>+ {info.totalUnitsBought} ⬅️ {info.expectedNewStock} {t('قطعة', 'دانە', 'pcs')}</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[9.5px] border border-purple-500/30">
                                  ✨ {t('مادة جديدة ستُسجل بالمخزن', 'کاڵای نوێ تۆمار دەکرێت', 'New Product to Register')}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Barcode (Auto Extracted, From Stock, or Manual Input / Generator) */}
                          <td className="p-2.5 text-center">
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  value={item.barcode || ''}
                                  placeholder={info.matchedProduct?.barcode || t('أدخل الباركود...', 'بارکۆد بنووسە...', 'Enter barcode...')}
                                  onChange={(e) => updateItemField(idx, 'barcode', e.target.value)}
                                  className={`w-28 bg-[#050B17] border rounded px-1.5 py-0.5 text-center font-mono text-[10.5px] focus:outline-none transition-all ${
                                    item.barcode 
                                      ? 'text-cyan-300 border-cyan-500/50 font-bold' 
                                      : 'text-slate-400 border-dashed border-slate-700 hover:border-slate-500 focus:border-cyan-400'
                                  }`}
                                />
                              </div>
                              <button
                                type="button"
                                title={t('توليد باركود فريد يبدأ بـ 200245', 'دروستکردنی بارکۆد بە خۆکاری', 'Generate unique barcode')}
                                onClick={() => updateItemField(idx, 'barcode', generateUniqueBarcode200245(existingProducts))}
                                className="text-[9.5px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer py-0.5"
                              >
                                ⚡ {t('توليد باركود', 'تولیدی خۆکار', 'Auto Barcode')}
                              </button>
                              {(item.barcode || info.matchedProduct?.barcode) && (
                                <div className="text-[9px] font-mono text-slate-500 flex items-center gap-1">
                                  {item.barcode ? (
                                    <span className="text-cyan-400 font-bold">✓ {t('مُخصص', 'تایبەت', 'Custom')}</span>
                                  ) : (
                                    <span className="text-slate-400">📦 {t('المخزن', 'کۆگا', 'From Store')}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 3. Quantity & Pack */}
                          <td className="p-2.5 text-center font-mono">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemField(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                                className="w-12 bg-[#050B17] border border-slate-700 rounded px-1 py-0.5 text-center font-bold text-white focus:outline-none focus:border-emerald-400"
                                min={1}
                              />
                              <span className="text-[10px] text-slate-400">{item.unit || t('علبة', 'پاکەت', 'pk')}</span>
                            </div>
                            {info.unitsPerPack > 1 && (
                              <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                                ({info.totalUnitsBought} {t('قطعة', 'دانە', 'pcs')})
                              </div>
                            )}
                          </td>

                          {/* 3. Old vs New Purchase Cost with Indicator */}
                          <td className="p-2.5 text-center font-mono">
                            <div className="flex items-center justify-center gap-1.5">
                              {info.isExisting && (
                                <span className="text-[10px] text-slate-500 line-through">
                                  {info.oldPurchasePrice.toLocaleString()}
                                </span>
                              )}
                              <input
                                type="number"
                                value={item.unitPurchasePrice}
                                onChange={(e) => updateItemField(idx, 'unitPurchasePrice', Number(e.target.value))}
                                className="w-20 bg-[#050B17] border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                                step={250}
                              />
                              <span className="text-[9px] text-slate-400">{currency}</span>
                            </div>

                            {/* Price difference banner */}
                            {info.isPriceIncreased && (
                              <span className="mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9.5px] font-bold">
                                <ArrowUpRight className="w-2.5 h-2.5" />
                                <span>+{info.priceDifference.toLocaleString()} ({info.priceDifferencePercent}%)</span>
                              </span>
                            )}
                            {info.isPriceDecreased && (
                              <span className="mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9.5px] font-bold">
                                <ArrowDownRight className="w-2.5 h-2.5" />
                                <span>{info.priceDifference.toLocaleString()} ({info.priceDifferencePercent}%)</span>
                              </span>
                            )}
                          </td>

                          {/* 4. Discount */}
                          <td className="p-2.5 text-center font-mono text-amber-300">
                            {info.discountAmount > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                                -{info.discountAmount.toLocaleString()} {currency}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </td>

                          {/* 5. Total Net Row Cost */}
                          <td className="p-2.5 text-center font-mono font-bold text-white">
                            {item.totalPrice.toLocaleString()} <span className="text-[9px] text-slate-500 font-normal">{currency}</span>
                          </td>

                          {/* 6. Expiry Date & Batch (FEFO) */}
                          <td className="p-2.5 text-center">
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => updateItemField(idx, 'expiryDate', e.target.value)}
                              className="bg-[#050B17] border border-amber-500/40 rounded px-1.5 py-0.5 text-[10.5px] font-mono text-amber-300 focus:outline-none"
                            />
                            <div className="flex items-center justify-center gap-1 mt-0.5 font-mono text-[9.5px] text-slate-400">
                              <span>#{item.batchNumber || 'Batch'}</span>
                              {info.isExisting && info.oldExpiry !== 'N/A' && (
                                <span className="text-slate-500 text-[9px]">({t('القديم:', 'کۆن:', 'Old:')} {info.oldExpiry})</span>
                              )}
                            </div>
                          </td>

                          {/* 7. Suggested Retail Price */}
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              value={item.suggestedRetailPrice}
                              onChange={(e) => updateItemField(idx, 'suggestedRetailPrice', Number(e.target.value))}
                              className="w-20 bg-[#050B17] border border-emerald-500/40 rounded px-1.5 py-0.5 text-center font-mono font-black text-emerald-300 focus:outline-none focus:border-emerald-400"
                              step={250}
                            />
                            <div className="text-[9.5px] text-emerald-400 font-mono mt-0.5 font-bold">
                              +{info.profitPerPiece.toLocaleString()} {currency} {t('ربح', 'قازانج', 'profit')}
                            </div>
                          </td>

                          {/* 8. Delete Row */}
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>

            {/* 4. Automated Recording Options */}
            <div className="flex flex-wrap items-center gap-5 p-3 rounded-xl bg-[#050B17] border border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createPurchaseInvoice}
                  onChange={(e) => setCreatePurchaseInvoice(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                <span className="text-slate-200 font-bold">
                  {t('تسجيل فاتورة شراء رسمية في أرشيف الفواتير', 'تۆمارکردنی پسوولەی کڕین لە ئەرشیفی پسوولەکاندا', 'Register official Purchase Invoice')}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateSupplierBalance}
                  onChange={(e) => setUpdateSupplierBalance(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                <span className="text-slate-200 font-bold">
                  {t('تحديث حساب ومديونية المورد آلياً في سجل الموردين', 'نوێکردنەوەی هەژمار و قەرزی دابینکەر بە شێوەی خۆکار', 'Update Supplier ledger & balance automatically')}
                </span>
              </label>
            </div>

          </div>
        )}

        {/* 5. Footer Actions: Dual Action for Manager (Transfer to Draft OR Instant Confirm) */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {t(
                'يتم تحديث دفعات الصلاحية (FEFO) والمخزون وحساب الأسعار والأرباح تلقائياً.',
                'بەرواری بەسەرچوون (FEFO) و کۆگا و قازانج بە شێوەی خۆکار نوێ دەکرێنەوە.',
                'Batches (FEFO), stock, purchase costs & profits are updated automatically.'
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              {t('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
            </button>

            {/* ACTION 1: TRANSFER TO ACTIVE INVOICE GRID IN PURCHASES TAB */}
            {onTransferToDraft && (
              <button
                type="button"
                onClick={handleTransferToDraftGrid}
                disabled={!scannedData || selectedItemIndices.size === 0}
                className="px-4 py-2.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-bold text-xs border border-cyan-500/50 flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              >
                <ArrowRight className="w-4 h-4 rtl:rotate-180 text-cyan-400" />
                <span>{t('📥 نقل إلى جدول فاتورة الشراء', '📥 گواستنەوە بۆ خشتەی کڕین', 'Transfer to Invoice Draft Grid')}</span>
              </button>
            )}

            {/* ACTION 2: INSTANT CONFIRM & SAVE TO WAREHOUSE */}
            <button
              type="button"
              onClick={handleConfirmAndSaveInstant}
              disabled={!scannedData || selectedItemIndices.size === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:brightness-110 text-white font-black text-xs flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {t(
                  `⚡ تأكيد وحفظ (${selectedItemIndices.size}) مادة وتحديث المخزن`,
                  `⚡ پەسەندکردن و زیادکردنی (${selectedItemIndices.size}) مادە بۆ کۆگا`,
                  `Confirm & Ingest (${selectedItemIndices.size}) Items to Warehouse`
                )}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 6. CELEBRATORY MANAGER AUDIT CONFIRMATION MODAL                     */}
      {/* ------------------------------------------------------------------ */}
      {savedSummaryReport && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0a1224] border-2 border-emerald-500 rounded-3xl p-6 shadow-[0_0_80px_rgba(16,185,129,0.4)] space-y-4 text-center">
            
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                {t('✅ تم تأكيد وحفظ الوصل وتحديث المخزن بنجاح!', '✅ پسوولە و کۆگا بە سەرکەوتوویی نوێکرانەوە!', 'Invoice Saved & Stock Updated Successfully!')}
              </h3>
              <p className="text-xs text-slate-300">
                {t(
                  `تم إدخال فاتورة الشراء رقم (${savedSummaryReport.invoiceNumber}) للمورد (${savedSummaryReport.supplierName})`,
                  `پسوولەی کڕینی ژمارە (${savedSummaryReport.invoiceNumber}) بۆ دابینکەر (${savedSummaryReport.supplierName}) تۆمارکرا`,
                  `Purchase invoice ${savedSummaryReport.invoiceNumber} recorded for supplier ${savedSummaryReport.supplierName}`
                )}
              </p>
            </div>

            {/* Stats Audit Box */}
            <div className="p-4 rounded-2xl bg-[#060b16] border border-slate-800 text-xs space-y-2.5 text-right font-medium">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">• {t('إجمالي عدد المواد المضافة:', 'کۆی ژمارەی کاڵاکان:', 'Total Items Extracted:')}</span>
                <span className="font-mono font-bold text-white">{savedSummaryReport.totalItemsCount} {t('مادة', 'مادە', 'items')} ({savedSummaryReport.totalPiecesCount} {t('قطعة', 'دانە', 'pcs')})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">• {t('المواد المحدثة بالمخزن:', 'کاڵا نوێکراوەکان لە کۆگا:', 'Warehouse Stock Updated:')}</span>
                <span className="font-mono font-bold text-blue-300">{savedSummaryReport.existingUpdatedCount} {t('مادة (تجديد رصيد)', 'کاڵا (نوێکردنەوە)', 'updated')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">• {t('مواد جديدة أضيفت للنظام:', 'کاڵا تازە تۆمارکراوەکان:', 'New Products Registered:')}</span>
                <span className="font-mono font-bold text-purple-300">{savedSummaryReport.brandNewCount} {t('مادة جديدة', 'کاڵای نوێ', 'new items')}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span className="text-slate-400">• {t('إجمالي الخصم المحقق:', 'کۆی داشکاندن:', 'Discounts Saved:')}</span>
                <span className="font-mono font-bold text-amber-300">{savedSummaryReport.discountTotal.toLocaleString()} {currency}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span className="text-emerald-400 font-bold">• {t('صافي قيمة الفاتورة:', 'کۆی پسوولە:', 'Net Invoice Amount:')}</span>
                <span className="font-mono font-black text-emerald-300 text-sm">{savedSummaryReport.netTotal.toLocaleString()} {currency}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSavedSummaryReport(null);
                stopCamera();
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
            >
              {t('إغلاق والعودة لواجهة الشراء والمخزن', 'داخستن و گەڕانەوە', 'Close & Return to Purchases')}
            </button>

          </div>
        </div>
      )}

    </div>
  );
};
