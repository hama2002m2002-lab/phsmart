import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Upload,
  Camera,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Calendar,
  Building,
  DollarSign,
  Barcode as BarcodeIcon,
  Search,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  FileSpreadsheet,
  ArrowRight,
  Database,
  Monitor,
  Eye,
  Info,
  Check,
  Edit2
} from 'lucide-react';
import { Product, StoreSettings, UserAccount } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { exportProductsToExcel } from '../lib/excelExport';

export interface LegacyScannedItem {
  id: string;
  barcode: string;
  name: string;
  englishName: string;
  nameAr: string;
  nameKu: string;
  quantityPieces: number;
  unitsInPack: number;
  sheetPurchasePrice: number;
  packPurchasePrice: number;
  sheetSellingPrice: number;
  packSellingPrice: number;
  dosageForm: string;
  manufacturer: string;
  expiryDate: string;
  category: string;
  unit: string;
  selected: boolean;
  matchStatus: 'new' | 'existing_update';
  existingProductId?: string;
}

interface AILegacySystemMigratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  existingProducts: Product[];
  currentUser?: UserAccount | null;
  onConfirmMigration: (importedProducts: Product[]) => void;
}

export const AILegacySystemMigratorModal: React.FC<AILegacySystemMigratorModalProps> = ({
  isOpen,
  onClose,
  settings,
  existingProducts,
  currentUser,
  onConfirmMigration
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const t = (ar: string, ku: string, en: string) => isKu ? ku : isAr ? ar : en;

  // File and Camera states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [extractedItems, setExtractedItems] = useState<LegacyScannedItem[]>([]);
  const [systemTitle, setSystemTitle] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [previewZoomImage, setPreviewZoomImage] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Close camera on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      stopCamera();
      const constraints = {
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Camera error:', err);
      setErrorMsg(t('تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الصلاحيات.', 'نەتوانرا کامێرا بکرێتەوە. تکایە مۆڵەت بدە.', 'Could not access camera.'));
    }
  };

  const captureCameraFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      stopCamera();
      processScreenImage(dataUrl);
    }
  };

  // Helper to normalize Eastern Arabic / Kurdish digits to standard digits
  const normalizeDigits = (str: string = '') => {
    return str
      .replace(/[٠۰]/g, '0')
      .replace(/[١۱]/g, '1')
      .replace(/[٢۲]/g, '2')
      .replace(/[٣۳]/g, '3')
      .replace(/[٤۴]/g, '4')
      .replace(/[٥۵]/g, '5')
      .replace(/[٦۶]/g, '6')
      .replace(/[٧۷]/g, '7')
      .replace(/[٨۸]/g, '8')
      .replace(/[٩۹]/g, '9')
      .trim();
  };

  // Image compressor for high OCR accuracy
  const compressImage = (dataUrl: string, maxWidth = 2560, quality = 0.92): Promise<string> => {
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

  // Process the screen image via server endpoint
  const processScreenImage = async (base64Image: string) => {
    setSelectedImage(base64Image);
    setIsProcessing(true);
    setErrorMsg(null);
    setProgressStage(t('جاري تحسين صورة الشاشة بدقة فائقة للذكاء الاصطناعي...', 'وێنەکە ئامادە دەکرێت بە کوالێتی بەرز بۆ AI...', 'Optimizing screen image for AI...'));

    try {
      const optimizedImage = await compressImage(base64Image);
      setProgressStage(t('الذكاء الاصطناعي يقرأ جدول المواد، الباركود، والأسعار بدقة...', 'AI خشتە و بارکۆد و نرخەکان دەخوێنێتەوە...', 'AI scanning database table and columns...'));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000);

      const response = await fetch('/api/gemini/migrate-legacy-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: optimizedImage, mimeType: 'image/jpeg' }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      const rawItems = Array.isArray(result.items) ? result.items : [];
      setSystemTitle(result.systemTitle || t('جدول المواد المستخرجة من شاشة النظام السابق', 'خشتەی کاڵا دەرهێنراوەکان لە سیستەمی کۆن', 'Extracted Legacy System Items'));

      if (rawItems.length === 0) {
        setErrorMsg(t('لم يتم العثور على أدوية أو مواد في الصورة. يرجى تصوير الشاشة بوضوح وبإضاءة جيدة.', 'هیچ دەرمانێک نەدۆزرایەوە لە وێنەکەدا. تکایە بە ڕوونی وێنەکە بگرە.', 'No items detected. Please take a clearer photo of the screen.'));
        return;
      }

      // Map raw items into LegacyScannedItem with duplicate detection against existing catalog
      const mappedItems: LegacyScannedItem[] = rawItems.map((raw: any, index: number) => {
        const cleanBarcode = normalizeDigits((raw.barcode || '').toString());
        const rawName = (raw.name || raw.englishName || `Medicine Item ${index + 1}`).trim();

        // Check if barcode matches any existing product
        const matchedExisting = cleanBarcode
          ? existingProducts.find(p => p.barcode && normalizeDigits(p.barcode) === cleanBarcode)
          : existingProducts.find(p => p.name.toLowerCase() === rawName.toLowerCase() || p.nameAr === raw.nameAr);

        return {
          id: `legacy-item-${Date.now()}-${index}`,
          barcode: cleanBarcode || (matchedExisting?.barcode || `LEGACY-${Math.floor(10000000 + Math.random() * 90000000)}`),
          name: rawName,
          englishName: raw.englishName || rawName,
          nameAr: raw.nameAr || rawName,
          nameKu: raw.nameKu || rawName,
          quantityPieces: Number(raw.quantityPieces ?? raw.quantity ?? 0),
          unitsInPack: Math.max(1, Number(raw.unitsInPack ?? raw.unitsPerPack ?? 1)),
          sheetPurchasePrice: Number(raw.sheetPurchasePrice || 0),
          packPurchasePrice: Number(raw.packPurchasePrice ?? raw.cartonPurchasePrice ?? raw.originalPrice ?? 0),
          sheetSellingPrice: Number(raw.sheetSellingPrice || 0),
          packSellingPrice: Number(raw.packSellingPrice ?? raw.singleRetailPrice ?? raw.price ?? 0),
          dosageForm: raw.dosageForm || 'Tablet',
          manufacturer: raw.manufacturer || 'General Pharma',
          expiryDate: raw.expiryDate || '2027-12-31',
          category: raw.category || 'أدوية ومستلزمات',
          unit: raw.unit || 'علبة',
          selected: true,
          matchStatus: matchedExisting ? 'existing_update' : 'new',
          existingProductId: matchedExisting?.id
        };
      });

      setExtractedItems(mappedItems);
    } catch (err: any) {
      console.error('Migration error:', err);
      setErrorMsg(err.message || t('حدث خطأ أثناء معالجة صورة الشاشة. يرجى المحاولة مرة أخرى أو اختيار صورة أوضح.', 'هەڵەیەک ڕوویدا لە خوێندنەوەی وێنەی شاشەکە.', 'Error processing screen image.'));
    } finally {
      setIsProcessing(false);
      setProgressStage('');
    }
  };

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processScreenImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Clipboard Paste Support (Ctrl+V)
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                processScreenImage(reader.result);
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Bulk selection controls
  const toggleSelectAll = () => {
    const allSelected = extractedItems.every(item => item.selected);
    setExtractedItems(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  const updateItemField = (id: string, field: keyof LegacyScannedItem, value: any) => {
    setExtractedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const deleteItem = (id: string) => {
    setExtractedItems(prev => prev.filter(item => item.id !== id));
  };

  // Filtered extracted items
  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return extractedItems;
    const q = searchFilter.toLowerCase();
    return extractedItems.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q) ||
      item.manufacturer.toLowerCase().includes(q) ||
      item.nameAr.toLowerCase().includes(q) ||
      item.nameKu.toLowerCase().includes(q)
    );
  }, [extractedItems, searchFilter]);

  // Totals
  const selectedCount = extractedItems.filter(i => i.selected).length;
  const totalPiecesCount = extractedItems.filter(i => i.selected).reduce((acc, i) => acc + (i.quantityPieces || 0), 0);
  const totalPackPurchaseValue = extractedItems.filter(i => i.selected).reduce((acc, i) => {
    const packs = i.unitsInPack > 0 ? (i.quantityPieces / i.unitsInPack) : 0;
    return acc + (packs * i.packPurchasePrice);
  }, 0);
  const totalPackSellingValue = extractedItems.filter(i => i.selected).reduce((acc, i) => {
    const packs = i.unitsInPack > 0 ? (i.quantityPieces / i.unitsInPack) : 0;
    return acc + (packs * i.packSellingPrice);
  }, 0);

  // Convert to real Product objects and execute migration
  const handleFinalSave = () => {
    const selected = extractedItems.filter(i => i.selected);
    if (selected.length === 0) {
      alert(t('يرجى اختيار مادة واحدة على الأقل للاستيراد!', 'تکایە بەلایەنی کەم یەک کاڵا هەڵبژێرە!', 'Please select at least one item!'));
      return;
    }

    const newProductsList: Product[] = selected.map((item) => {
      const unitsInPack = Math.max(1, item.unitsInPack);
      const packsCount = Math.floor(item.quantityPieces / unitsInPack);
      const costPerUnit = item.packPurchasePrice > 0 ? item.packPurchasePrice / unitsInPack : item.sheetPurchasePrice;
      const singlePrice = item.packSellingPrice > 0 ? item.packSellingPrice : (item.sheetSellingPrice * unitsInPack);
      const blisterPrice = item.sheetSellingPrice > 0 ? item.sheetSellingPrice : (singlePrice / unitsInPack);

      return {
        id: item.existingProductId || `prod-legacy-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        name: item.name || item.englishName,
        nameAr: item.nameAr || item.name,
        nameKu: item.nameKu || item.name,
        category: item.category || 'أدوية ومستلزمات',
        categoryAr: item.category || 'أدوية ومستلزمات',
        categoryKu: item.category || 'دەرمان و پێداویستی',
        barcode: item.barcode,
        sku: item.barcode,
        supplierDelegate: item.manufacturer,
        cartonsCount: packsCount,
        unitsPerCarton: unitsInPack,
        totalUnits: item.quantityPieces,
        cartonPurchasePrice: item.packPurchasePrice,
        lastPurchasePrice: costPerUnit,
        lastCartonPurchasePrice: item.packPurchasePrice,
        costPerUnit: costPerUnit,
        singleRetailPrice: singlePrice,
        wholesalePrice: singlePrice * 0.95,
        cartonSellingPrice: singlePrice,
        singleProfit: Math.max(0, singlePrice - (costPerUnit * unitsInPack)),
        wholesaleProfit: Math.max(0, (singlePrice * 0.95) - (costPerUnit * unitsInPack)),
        cartonProfit: Math.max(0, singlePrice - item.packPurchasePrice),
        initialAddDate: new Date().toISOString().split('T')[0],
        lastEditDate: new Date().toISOString().split('T')[0],
        lastPriceUpdate: new Date().toISOString(),
        expiryDate: item.expiryDate || '2027-12-31',
        price: singlePrice,
        cost: costPerUnit,
        stock: item.quantityPieces,
        minStock: 5,
        unit: item.unit || 'علبة',
        supplierId: 'supplier-legacy-import',
        supplierName: item.manufacturer || 'مورد النظام السابق',
        imageIcon: '💊',
        status: item.quantityPieces > 0 ? 'in_stock' : 'out_of_stock',
        dosageForm: item.dosageForm,
        manufacturer: item.manufacturer,
        blistersPerBox: unitsInPack,
        blisterPrice: blisterPrice,
        pharmaCategory: 'OTC',
        batches: [
          {
            id: `batch-${Date.now()}-${Math.random()}`,
            expiryDate: item.expiryDate || '2027-12-31',
            quantity: item.quantityPieces,
            purchasePrice: costPerUnit,
            supplierName: item.manufacturer
          }
        ]
      };
    });

    onConfirmMigration(newProductsList);
    onClose();
  };

  // Export current extracted table to Excel
  const handleExportExcel = () => {
    const selected = extractedItems.filter(i => i.selected);
    if (selected.length === 0) return;
    const excelReadyProds = selected.map(i => ({
      id: i.id,
      name: i.name,
      nameAr: i.nameAr,
      barcode: i.barcode,
      stock: i.quantityPieces,
      unitsPerCarton: i.unitsInPack,
      cartonPurchasePrice: i.packPurchasePrice,
      cost: i.packPurchasePrice / Math.max(1, i.unitsInPack),
      price: i.packSellingPrice,
      singleRetailPrice: i.packSellingPrice,
      blisterPrice: i.sheetSellingPrice,
      expiryDate: i.expiryDate,
      manufacturer: i.manufacturer,
      dosageForm: i.dosageForm,
      category: i.category,
      categoryAr: i.category,
      cartonsCount: Math.floor(i.quantityPieces / Math.max(1, i.unitsInPack)),
      totalUnits: i.quantityPieces,
      costPerUnit: i.packPurchasePrice / Math.max(1, i.unitsInPack),
      wholesalePrice: i.packSellingPrice * 0.95,
      cartonSellingPrice: i.packSellingPrice,
      singleProfit: 0,
      wholesaleProfit: 0,
      cartonProfit: 0,
      initialAddDate: new Date().toISOString().split('T')[0],
      lastEditDate: new Date().toISOString().split('T')[0],
      minStock: 5,
      unit: i.unit,
      supplierId: 'legacy',
      supplierName: i.manufacturer,
      imageIcon: '💊',
      status: 'in_stock' as const
    }));
    exportProductsToExcel(excelReadyProds as any, `legacy_migrated_items_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div
      id="ai-legacy-migrator-modal-backdrop"
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="ai-legacy-migrator-modal-container"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-7xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        dir={isKu || isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {t('نقل المواد من شاشات وجداول البرامج القديمة (AI)', 'هاوردەی کاڵا لە شاشەی سیستەمی کۆن بە AI', 'Legacy POS Screen AI Migrator')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                  {t('استيراد شامل للأسعار والباركود والشيت', 'خوێندنەوەی پاکەت و شیت و بارکۆد', 'Full Sheet/Pack/Barcode OCR')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  'التقط صورة لشاشة أي برنامج صيدلية قديم أو جدول داتا لنقل أسماء الأدوية، الباركود، رصيد القطع، أسعار الشراء والبيع (بالشيت والباكيت)، والشركات والتواريخ فوراً.',
                  'وێنەی شاشەی هەر سیستەمێکی کۆن بگرە بۆ هاوردەکردنی هەموو دەرمانەکان، بارکۆد، نرخی کڕین و فرۆشتنی پاکەت و شیت، کۆمپانیا و بەسەرچوون.',
                  'Capture a photo of any legacy pharmacy software screen to extract all items, barcodes, sheet/pack prices, stock, companies, and expiry dates.'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title={t('إغلاق', 'داخستن', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Upload & Camera Control Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Input Action Cards */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Upload File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-cyan-500/60 hover:bg-slate-800 transition-all text-center cursor-pointer group disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-cyan-500/15 group-hover:bg-cyan-500/25 flex items-center justify-center mb-1.5 transition-colors">
                  <Upload className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-xs font-black text-slate-200 group-hover:text-cyan-300">
                  {t('رفع صورة الشاشة / الجدول', 'بارکردنی وێنەی شاشە', 'Upload Screen Photo')}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {t('JPG, PNG أو لصق Ctrl+V', 'وێنە یان Ctrl+V', 'Image or Ctrl+V')}
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* 2. Camera Button */}
              <button
                type="button"
                onClick={startCamera}
                disabled={isProcessing || isCameraActive}
                className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-blue-500/60 hover:bg-slate-800 transition-all text-center cursor-pointer group disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 group-hover:bg-blue-500/25 flex items-center justify-center mb-1.5 transition-colors">
                  <Camera className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs font-black text-slate-200 group-hover:text-blue-300">
                  {t('تصوير الشاشة بالكاميرا', 'گرتنی وێنە بە کامێرا', 'Capture from Camera')}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {t('تصوير مباشر لشاشة اللابتوب القديم', 'ڕاستەوخۆ لە شاشە', 'Direct laptop screen snap')}
                </span>
              </button>

              {/* 3. Demo Preset Button (Exact User Photo Database) */}
              <button
                type="button"
                onClick={() => processScreenImage('demo_legacy_pharmacy_screen')}
                disabled={isProcessing}
                className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 hover:border-indigo-400 transition-all text-center cursor-pointer group disabled:opacity-50 shadow-md shadow-indigo-950/40"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 group-hover:bg-indigo-500/35 flex items-center justify-center mb-1.5 transition-colors">
                  <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
                </div>
                <span className="text-xs font-black text-indigo-200 group-hover:text-white">
                  {t('شاشة تجريبية (الصورة المرفوعة)', 'شاشەی نموونەیی (دەرمانەکان)', 'Load Sample Screen')}
                </span>
                <span className="text-[10px] text-indigo-300/80 mt-0.5">
                  {t('24 دواء بأسعار الشيت والباكيت والباركود', '٢٤ دەرمان بە هەموو نرخەکان', '24 items with full pricing')}
                </span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="lg:col-span-4 bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">
                  {t('المواد المحددة للنقل', 'کاڵا دیاریکراوەکان بۆ هاوردە', 'Items to Migrate')}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-black text-cyan-300">{selectedCount}</span>
                  <span className="text-[11px] text-slate-400 font-medium">/ {extractedItems.length} {t('مادة', 'کاڵا', 'items')}</span>
                </div>
              </div>

              <div className="text-left border-s border-slate-700/80 ps-3">
                <span className="text-[10px] font-semibold text-slate-400 block">
                  {t('مجموع رصيد القطع', 'کۆی گشتی بڕی دانەکان', 'Total Units')}
                </span>
                <span className="text-sm font-black text-emerald-400">
                  {formatNumber(totalPiecesCount)} {t('قطعة', 'دانە', 'pcs')}
                </span>
              </div>
            </div>
          </div>

          {/* Active Camera View */}
          {isCameraActive && (
            <div className="relative rounded-2xl overflow-hidden border border-blue-500/50 bg-black aspect-video max-h-[380px] mx-auto shadow-2xl flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-dashed border-cyan-400/60 pointer-events-none m-6 rounded-xl flex items-center justify-center">
                <span className="bg-black/70 px-4 py-1.5 rounded-full text-xs font-bold text-cyan-300 shadow">
                  {t('وجّه الكاميرا نحو جدول الأدوية على شاشة الكمبيوتر', 'کامێراکە ڕێکبخە لەسەر خشتەی دەرمانەکان', 'Align camera with the computer table')}
                </span>
              </div>
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3 z-10">
                <button
                  type="button"
                  onClick={captureCameraFrame}
                  className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/40 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t('التقاط ومسح الشاشة الآن', 'وێنە بگرە و بیخوێنەرەوە', 'Capture & Scan Now')}</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  {t('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-8 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center animate-spin">
                  <RefreshCw className="w-6 h-6 text-cyan-400" />
                </div>
                <Sparkles className="w-5 h-5 text-indigo-400 absolute -top-1 -right-1 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  {t('جاري استخراج المواد والأسعار والباركود بالذكاء الاصطناعي...', 'AI خشتەی دەرمانەکان دەردەهێنێت...', 'AI Extracting Medicine Database...')}
                </h3>
                <p className="text-xs text-cyan-300 font-medium mt-1">{progressStage}</p>
              </div>
            </div>
          )}

          {/* Extracted Data Table View */}
          {extractedItems.length > 0 && !isProcessing && (
            <div className="space-y-3">
              {/* Table Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/70 p-3 rounded-xl border border-slate-700/70">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-200 transition-colors"
                  >
                    {extractedItems.every(i => i.selected) ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t('إلغاء تحديد الكل', 'لابردنی هەموو', 'Deselect All')}</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>{t('تحديد الكل', 'دیاریکردنی هەموو', 'Select All')}</span>
                      </>
                    )}
                  </button>

                  <span className="text-xs font-semibold text-slate-300">
                    {systemTitle}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 start-2.5" />
                    <input
                      type="text"
                      placeholder={t('بحث بالاسم أو الباركود أو الشركة...', 'گەڕان بە ناو، بارکۆد، کۆمپانیا...', 'Search medicine, barcode, company...')}
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg ps-8 pe-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Export Excel */}
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shrink-0"
                    title={t('تصدير الجدول إلى Excel', 'ناردن بۆ ئێکسڵ', 'Export Table to Excel')}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('تصدير Excel', 'ناردن بۆ ئێکسڵ', 'Excel')}</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-slate-950/60 shadow-inner">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-900 border-b border-slate-700 text-slate-300 font-bold z-10">
                      <tr>
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5 text-start min-w-[120px]">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                        <th className="p-2.5 text-start min-w-[200px]">{t('اسم المادة الدوائية', 'ناوی دەرمان', 'Medicine Name')}</th>
                        <th className="p-2.5 text-center min-w-[70px]">{t('الرصيد (عدد)', 'بڕ(عدد)', 'Stock Qty')}</th>
                        <th className="p-2.5 text-center min-w-[80px]">{t('داخل الباكيت', 'بڕی پاکەت', 'Pack In')}</th>
                        <th className="p-2.5 text-center min-w-[90px]">{t('شراء شيت', 'کڕینی شیت', 'Buy Sheet')}</th>
                        <th className="p-2.5 text-center min-w-[100px]">{t('شراء باكيت', 'کڕینی پاکەت', 'Buy Pack')}</th>
                        <th className="p-2.5 text-center min-w-[90px]">{t('بيع شيت', 'فرۆشتنی شیت', 'Sell Sheet')}</th>
                        <th className="p-2.5 text-center min-w-[100px]">{t('بيع باكيت', 'نرخی فرۆشتن', 'Sell Pack')}</th>
                        <th className="p-2.5 text-start min-w-[90px]">{t('الشكل الدوائي', 'جۆری دەرمان', 'Form')}</th>
                        <th className="p-2.5 text-start min-w-[100px]">{t('الشركة المصنعة', 'کۆمپانیا', 'Company')}</th>
                        <th className="p-2.5 text-center min-w-[100px]">{t('تاريخ الصلاحية', 'بەسەرچوون', 'Expiry')}</th>
                        <th className="p-2.5 text-center min-w-[80px]">{t('الحالة', 'دۆخ', 'Status')}</th>
                        <th className="p-2.5 text-center w-12">{t('حذف', 'سڕینەوە', 'Del')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredItems.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-800/50 transition-colors ${
                            item.selected ? 'bg-slate-900/30' : 'opacity-40 bg-slate-950/80'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) => updateItemField(item.id, 'selected', e.target.checked)}
                              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                            />
                          </td>

                          {/* Barcode */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.barcode}
                              onChange={(e) => updateItemField(item.id, 'barcode', e.target.value)}
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded px-2 py-1 text-[11px] font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
                            />
                          </td>

                          {/* Name */}
                          <td className="p-2">
                            <div className="space-y-0.5">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItemField(item.id, 'name', e.target.value)}
                                className="w-full bg-slate-900/90 border border-slate-700/80 rounded px-2 py-1 text-xs font-bold text-white focus:border-cyan-500 focus:outline-none"
                              />
                              {(item.nameAr || item.nameKu) && (
                                <span className="text-[10px] text-slate-400 block truncate px-1">
                                  {item.nameAr || item.nameKu}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Quantity Pieces */}
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.quantityPieces}
                              onChange={(e) => updateItemField(item.id, 'quantityPieces', Number(e.target.value))}
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded px-1.5 py-1 text-xs text-center font-bold text-emerald-300 focus:border-cyan-500 focus:outline-none"
                            />
                          </td>

                          {/* Units In Pack */}
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.unitsInPack}
                              onChange={(e) => updateItemField(item.id, 'unitsInPack', Math.max(1, Number(e.target.value)))}
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded px-1.5 py-1 text-xs text-center font-medium text-slate-300 focus:border-cyan-500 focus:outline-none"
                            />
                          </td>

                          {/* Sheet Purchase Price */}
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.sheetPurchasePrice}
                              onChange={(e) => updateItemField(item.id, 'sheetPurchasePrice', Number(e.target.value))}
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded px-1.5 py-1 text-xs text-center font-mono text-amber-300 focus:border-cyan-500 focus:outline-none"
                            />
                          </td>

                          {/* Pack Purchase Price */}
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.packPurchasePrice}
                              onChange={(e) => updateItemField(item.id, 'packPurchasePrice', Number(e.target.value))}
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded px-1.5 py-1 text-xs text-center font-mono font-bold text-amber-400 focus:border-cyan-500 focus:outline-none"
                            />
                          </td>

                          {/* Sheet Selling Price */}
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.sheetSellingPrice}
                              onChange={(e) => updateItemField(item.id, 'sheetSellingPrice', Number(e.target.value))}
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded px-1.5 py-1 text-xs text-center font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
                            />
                          </td>

                          {/* Pack Selling Price */}
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.packSellingPrice}
                              onChange={(e) => updateItemField(item.id, 'packSellingPrice', Number(e.target.value))}
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded px-1.5 py-1 text-xs text-center font-mono font-bold text-cyan-400 focus:border-cyan-500 focus:outline-none"
                            />
                          </td>

                          {/* Dosage Form */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.dosageForm}
                              onChange={(e) => updateItemField(item.id, 'dosageForm', e.target.value)}
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded px-2 py-1 text-xs text-purple-300 focus:border-cyan-500 focus:outline-none"
                            />
                          </td>

                          {/* Manufacturer */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.manufacturer}
                              onChange={(e) => updateItemField(item.id, 'manufacturer', e.target.value)}
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                            />
                          </td>

                          {/* Expiry Date */}
                          <td className="p-2">
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => updateItemField(item.id, 'expiryDate', e.target.value)}
                              className="w-full bg-slate-900/90 border border-slate-700/80 rounded px-1.5 py-1 text-[11px] font-mono text-slate-300 focus:border-cyan-500 focus:outline-none"
                            />
                          </td>

                          {/* Match Status Badge */}
                          <td className="p-2 text-center">
                            {item.matchStatus === 'new' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                {t('جديدة', 'نوێ', 'New')}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                {t('تحديث', 'نوێکردنەوە', 'Update')}
                              </span>
                            )}
                          </td>

                          {/* Delete Row */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => deleteItem(item.id)}
                              className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                              title={t('حذف هذا الصف', 'سڕینەوەی ئەم دێڕە', 'Delete row')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>
              {t('إجمالي قيمة الشراء المقدرة:', 'کۆی گشتی بەهای کڕین:', 'Total Purchase Est:')}{' '}
              <strong className="text-amber-400 font-mono font-bold">
                {formatNumber(totalPackPurchaseValue)} {settings.currency || 'IQD'}
              </strong>
            </span>
            <span className="hidden md:inline">|</span>
            <span className="hidden md:inline">
              {t('إجمالي قيمة البيع المقدرة:', 'کۆی گشتی بەهای فرۆشتن:', 'Total Retail Est:')}{' '}
              <strong className="text-cyan-400 font-mono font-bold">
                {formatNumber(totalPackSellingValue)} {settings.currency || 'IQD'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              {t('إلغاء', 'داخستن', 'Cancel')}
            </button>

            <button
              type="button"
              onClick={handleFinalSave}
              disabled={selectedCount === 0 || isProcessing}
              className="flex-1 sm:flex-none px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 active:scale-95 text-white text-xs font-black shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-cyan-200" />
              <span>
                {t(
                  `حفظ وإدراج ${selectedCount} مادة في المخزن`,
                  `پاشەکەوتکردنی ${selectedCount} کاڵا لە کۆگا`,
                  `Save & Migrate ${selectedCount} Items to Inventory`
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
