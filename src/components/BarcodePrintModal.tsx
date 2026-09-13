import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  X, Printer, Sliders, Tag, Palette, Type, Check, RefreshCw, Barcode as BarcodeIcon,
  Layers, FileText, CheckCircle2, BookmarkCheck, Save, Sparkles, Grid, Eye, AlertCircle,
  Search, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move, RotateCw, AlignLeft, AlignCenter,
  AlignRight, HelpCircle, Info, Compass
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { BarcodeGraphic } from './BarcodeGraphic';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  initialProduct?: Product | null;
  products?: Product[];
  settings: StoreSettings;
  mode?: 'barcode' | 'price' | 'no_barcode';
}

export type PricePrintOption = 'single' | 'carton' | 'wholesale' | 'blister' | 'all_three' | 'none' | 'custom_multi' | 'custom';
export type LabelLayoutMode = '1-up' | '2-up' | 'a4_grid';

const DEFAULT_CONFIG_KEY = '7amo_barcode_print_config_v2';

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  onClose,
  product,
  initialProduct,
  products = [],
  settings,
  mode = 'barcode'
}) => {
  const targetInitialProduct = initialProduct || product;
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(targetInitialProduct || null);

  // Price Option selection
  const [priceOption, setPriceOption] = useState<PricePrintOption>(mode === 'barcode' ? 'none' : 'single');
  const [customPriceVal, setCustomPriceVal] = useState<number>(0);

  // Multi-type price selections (e.g. Single + Carton, Single + Wholesale, etc.)
  const [selectedPriceTypes, setSelectedPriceTypes] = useState<{
    single: boolean;
    carton: boolean;
    wholesale: boolean;
    blister: boolean;
  }>({
    single: mode !== 'barcode',
    carton: false,
    wholesale: false,
    blister: false
  });

  // Copies count
  const [copiesCount, setCopiesCount] = useState<number>(1);

  // Layout mode
  const [layoutMode, setLayoutMode] = useState<LabelLayoutMode>('1-up');

  // Manual Styling Controls
  const [storeFontSize, setStoreFontSize] = useState<number>(11);
  const [titleFontSize, setTitleFontSize] = useState<number>(14);
  const [priceFontSize, setPriceFontSize] = useState<number>(18);
  const [barcodeFontSize, setBarcodeFontSize] = useState<number>(11);
  const [barcodeHeightPx, setBarcodeHeightPx] = useState<number>(32);

  // Colors
  const [labelBgColor, setLabelBgColor] = useState<string>('#ffffff');
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [priceColor, setPriceColor] = useState<string>('#059669');
  const [borderColor, setBorderColor] = useState<string>('#cbd5e1');

  // Sticker Dimensions (mm)
  const [labelWidthMm, setLabelWidthMm] = useState<number>(50);
  const [labelHeightMm, setLabelHeightMm] = useState<number>(30);
  const [borderWidthPx, setBorderWidthPx] = useState<number>(1);
  const [paddingPx, setPaddingPx] = useState<number>(6);

  // Printer Alignment & Positioning Controls (Xprinter / Thermal alignment)
  const [printAlignX, setPrintAlignX] = useState<'left' | 'center' | 'right'>('left');
  const [printAlignY, setPrintAlignY] = useState<'top' | 'center' | 'bottom'>('top');
  const [offsetXmm, setOffsetXmm] = useState<number>(0);
  const [offsetYmm, setOffsetYmm] = useState<number>(0);
  const [rotationDeg, setRotationDeg] = useState<0 | 90 | 180 | 270>(0);
  const [printerPaperWidthMm, setPrinterPaperWidthMm] = useState<number>(80);
  const [showXprinterGuide, setShowXprinterGuide] = useState<boolean>(false);

  // Field Toggles
  const [showStoreName, setShowStoreName] = useState<boolean>(true);
  const [showProductName, setShowProductName] = useState<boolean>(true);
  const [showScientificName, setShowScientificName] = useState<boolean>(false);
  const [showDosageForm, setShowDosageForm] = useState<boolean>(false);
  const [showBatchNumber, setShowBatchNumber] = useState<boolean>(false);
  const [showExpiryDate, setShowExpiryDate] = useState<boolean>(true);
  const [showCurrencySymbol, setShowCurrencySymbol] = useState<boolean>(true);
  const [showPriceLabel, setShowPriceLabel] = useState<boolean>(true);
  const [showBarcodeText, setShowBarcodeText] = useState<boolean>(true);

  // Feedback states
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Pre-indexed products cache
  const printIndexedProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const len = products.length;
    const list = new Array(len);
    for (let i = 0; i < len; i++) {
      const p = products[i];
      const barcodeClean = (p.barcode || '').trim().toLowerCase();
      const nameClean = (p.name || '').trim().toLowerCase();
      const nameArClean = (p.nameAr || '').trim().toLowerCase();
      const nameKuClean = (p.nameKu || '').trim().toLowerCase();
      const sciClean = (p.scientificName || '').trim().toLowerCase();
      list[i] = {
        product: p,
        barcode: barcodeClean,
        searchStr: `${barcodeClean} ${nameClean} ${nameArClean} ${nameKuClean} ${sciClean}`
      };
    }
    return list;
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const q = deferredSearchQuery.trim().toLowerCase();
    if (!q) {
      // Return first 100 products for super fast select rendering
      return products.slice(0, 100);
    }
    const isDigits = /^\d+$/.test(q);
    const matched = [];
    const len = printIndexedProducts.length;

    for (let i = 0; i < len; i++) {
      const item = printIndexedProducts[i];
      if (isDigits) {
        if (item.barcode.includes(q)) {
          matched.push(item.product);
          if (matched.length >= 100) break;
        }
      } else {
        if (item.searchStr.includes(q)) {
          matched.push(item.product);
          if (matched.length >= 100) break;
        }
      }
    }
    return matched;
  }, [products, printIndexedProducts, deferredSearchQuery]);

  // Sync selected product whenever modal opens or props change
  useEffect(() => {
    const p = initialProduct || product;
    if (p) {
      setSelectedProduct(p);
    } else if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[0]);
    }
  }, [product, initialProduct, products, isOpen]);

  // Adjust defaults based on mode when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'barcode' || mode === 'no_barcode') {
        setPriceOption('none');
        setBarcodeHeightPx(36);
      } else if (mode === 'price') {
        if (priceOption === 'none') {
          setPriceOption('single');
          setSelectedPriceTypes(prev => ({ ...prev, single: true }));
        }
      }
    }
  }, [mode, isOpen]);

  // Load saved configuration from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DEFAULT_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.labelWidthMm) setLabelWidthMm(parsed.labelWidthMm);
        if (parsed.labelHeightMm) setLabelHeightMm(parsed.labelHeightMm);
        if (parsed.storeFontSize) setStoreFontSize(parsed.storeFontSize);
        if (parsed.titleFontSize) setTitleFontSize(parsed.titleFontSize);
        if (parsed.priceFontSize) setPriceFontSize(parsed.priceFontSize);
        if (parsed.barcodeFontSize) setBarcodeFontSize(parsed.barcodeFontSize);
        if (parsed.barcodeHeightPx) setBarcodeHeightPx(parsed.barcodeHeightPx);
        if (parsed.labelBgColor) setLabelBgColor(parsed.labelBgColor);
        if (parsed.textColor) setTextColor(parsed.textColor);
        if (parsed.priceColor) setPriceColor(parsed.priceColor);
        if (parsed.borderColor) setBorderColor(parsed.borderColor);
        if (parsed.borderWidthPx !== undefined) setBorderWidthPx(parsed.borderWidthPx);
        if (parsed.paddingPx !== undefined) setPaddingPx(parsed.paddingPx);
        if (parsed.showStoreName !== undefined) setShowStoreName(parsed.showStoreName);
        if (parsed.showProductName !== undefined) setShowProductName(parsed.showProductName);
        if (parsed.showScientificName !== undefined) setShowScientificName(parsed.showScientificName);
        if (parsed.showDosageForm !== undefined) setShowDosageForm(parsed.showDosageForm);
        if (parsed.showBatchNumber !== undefined) setShowBatchNumber(parsed.showBatchNumber);
        if (parsed.showExpiryDate !== undefined) setShowExpiryDate(parsed.showExpiryDate);
        if (parsed.showCurrencySymbol !== undefined) setShowCurrencySymbol(parsed.showCurrencySymbol);
        if (parsed.showPriceLabel !== undefined) setShowPriceLabel(parsed.showPriceLabel);
        if (parsed.showBarcodeText !== undefined) setShowBarcodeText(parsed.showBarcodeText);
        if (parsed.priceOption) setPriceOption(parsed.priceOption);
        if (parsed.layoutMode) setLayoutMode(parsed.layoutMode);
        if (parsed.printAlignX) setPrintAlignX(parsed.printAlignX);
        if (parsed.printAlignY) setPrintAlignY(parsed.printAlignY);
        if (parsed.offsetXmm !== undefined) setOffsetXmm(parsed.offsetXmm);
        if (parsed.offsetYmm !== undefined) setOffsetYmm(parsed.offsetYmm);
        if (parsed.rotationDeg !== undefined) setRotationDeg(parsed.rotationDeg);
        if (parsed.printerPaperWidthMm !== undefined) setPrinterPaperWidthMm(parsed.printerPaperWidthMm);
      }
    } catch (e) {
      console.warn('Could not load saved barcode config:', e);
    } finally {
      isInitialLoadedRef.current = true;
    }
  }, []);

  const isInitialLoadedRef = React.useRef(false);

  // Auto-save changes so the user's printer alignment is always preserved
  useEffect(() => {
    if (!isInitialLoadedRef.current) return;
    try {
      const config = {
        labelWidthMm,
        labelHeightMm,
        storeFontSize,
        titleFontSize,
        priceFontSize,
        barcodeFontSize,
        barcodeHeightPx,
        labelBgColor,
        textColor,
        priceColor,
        borderColor,
        borderWidthPx,
        paddingPx,
        showStoreName,
        showProductName,
        showScientificName,
        showDosageForm,
        showBatchNumber,
        showExpiryDate,
        showCurrencySymbol,
        showPriceLabel,
        showBarcodeText,
        priceOption,
        layoutMode,
        printAlignX,
        printAlignY,
        offsetXmm,
        offsetYmm,
        rotationDeg,
        printerPaperWidthMm,
      };
      localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      // ignore
    }
  }, [
    printAlignX, printAlignY, offsetXmm, offsetYmm, rotationDeg, printerPaperWidthMm,
    labelWidthMm, labelHeightMm, storeFontSize, titleFontSize, priceFontSize,
    barcodeFontSize, barcodeHeightPx, labelBgColor, textColor, priceColor, borderColor,
    borderWidthPx, paddingPx, showStoreName, showProductName, showScientificName,
    showDosageForm, showBatchNumber, showExpiryDate, showCurrencySymbol, showPriceLabel,
    showBarcodeText, priceOption, layoutMode
  ]);

  // Helper to nudge offset in millimeters
  const nudge = (dx: number, dy: number) => {
    setOffsetXmm((prev) => Math.round((prev + dx) * 10) / 10);
    setOffsetYmm((prev) => Math.round((prev + dy) * 10) / 10);
  };

  const resetPosition = () => {
    setOffsetXmm(0);
    setOffsetYmm(0);
    setRotationDeg(0);
    setPrintAlignX('right');
    setPrintAlignY('top');
  };

  if (!isOpen) return null;

  const activeProduct = selectedProduct || initialProduct || product || products[0];

  if (!activeProduct) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="bg-[#0B1120] p-6 rounded-2xl border border-rose-500/30 text-center max-w-sm">
          <p className="text-sm font-bold text-rose-400 mb-4">الرجاء اختيار مادة لطباعة ملصق السعر والباركود</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-bold text-white">إغلاق</button>
        </div>
      </div>
    );
  }

  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

  const singlePrice = activeProduct.singleRetailPrice || activeProduct.price || 0;
  const cartonPrice = activeProduct.cartonSellingPrice || (activeProduct.price * (activeProduct.unitsPerCarton || 12));
  const wholesalePrice = activeProduct.wholesalePrice || activeProduct.price || 0;
  const blisterPrice = activeProduct.blisterPrice || 0;

  const getDisplayPrice = () => {
    if (priceOption === 'single') return singlePrice;
    if (priceOption === 'carton') return cartonPrice;
    if (priceOption === 'wholesale') return wholesalePrice;
    if (priceOption === 'blister') return blisterPrice;
    if (priceOption === 'custom') return customPriceVal;
    return singlePrice;
  };

  const currency = showCurrencySymbol ? (settings.currencySymbol || '$') : '';

  const saveCurrentConfigAsDefault = () => {
    try {
      const config = {
        labelWidthMm,
        labelHeightMm,
        storeFontSize,
        titleFontSize,
        priceFontSize,
        barcodeFontSize,
        barcodeHeightPx,
        labelBgColor,
        textColor,
        priceColor,
        borderColor,
        borderWidthPx,
        paddingPx,
        showStoreName,
        showProductName,
        showScientificName,
        showDosageForm,
        showBatchNumber,
        showExpiryDate,
        showCurrencySymbol,
        showPriceLabel,
        showBarcodeText,
        priceOption,
        layoutMode,
        printAlignX,
        printAlignY,
        offsetXmm,
        offsetYmm,
        rotationDeg,
        printerPaperWidthMm,
      };
      localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(config));
      setSavedSuccessMsg(true);
      setTimeout(() => setSavedSuccessMsg(false), 3000);
    } catch (e) {
      console.error('Failed to save barcode print settings:', e);
    }
  };

  // Helper to generate vector SVG barcode string for printed labels
  const generateBarcodeSVGString = (text: string, height: number = 30) => {
    const bars: { width: number; isSpace: boolean }[] = [];
    bars.push({ width: 2, isSpace: false });
    bars.push({ width: 1, isSpace: true });
    bars.push({ width: 2, isSpace: false });
    bars.push({ width: 2, isSpace: true });

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const b1 = (code % 3) + 1;
      const s1 = ((code >> 1) % 2) + 1;
      const b2 = ((code >> 2) % 3) + 1;
      const s2 = ((code >> 3) % 2) + 1;

      bars.push({ width: b1, isSpace: false });
      bars.push({ width: s1, isSpace: true });
      bars.push({ width: b2, isSpace: false });
      bars.push({ width: s2, isSpace: true });
    }

    bars.push({ width: 2, isSpace: false });
    bars.push({ width: 1, isSpace: true });
    bars.push({ width: 3, isSpace: false });
    bars.push({ width: 2, isSpace: true });
    bars.push({ width: 2, isSpace: false });

    const totalWidth = bars.reduce((acc, b) => acc + b.width * 2, 0) + 20;
    let currentX = 10;
    let rectsHTML = '';

    bars.forEach((bar) => {
      const w = bar.width * 2;
      const x = currentX;
      currentX += w;
      if (!bar.isSpace) {
        rectsHTML += `<rect x="${x}" y="1" width="${w}" height="${height - 2}" fill="black" />`;
      }
    });

    return `<svg viewBox="0 0 ${totalWidth} ${height}" style="width: 88%; max-width: 100%; height: ${height}px; display: block; margin: 0 auto;" preserveAspectRatio="none"><rect width="${totalWidth}" height="${height}" fill="white" />${rectsHTML}</svg>`;
  };

  // Generate single label HTML block
  const buildSingleLabelHTML = () => {
    const barcodeSVGMarkup = generateBarcodeSVGString(activeProduct.barcode || '123456789', barcodeHeightPx);
    const displayedPrice = getDisplayPrice();

    const priceLabelText =
      priceOption === 'single' ? (isAr ? 'سعر المفرد' : 'Retail Price') :
      priceOption === 'carton' ? (isAr ? `سعر الكرتون (${activeProduct.unitsPerCarton || 12} قطعة)` : 'Carton Price') :
      priceOption === 'wholesale' ? (isAr ? 'سعر الجملة' : 'Wholesale Price') :
      priceOption === 'blister' ? (isAr ? 'سعر الشريط' : 'Blister Price') :
      priceOption === 'custom' ? (isAr ? 'سعر خاص' : 'Custom Price') : '';

    return `
      <div class="print-carrier-page">
        <div class="label-page">
          ${showStoreName ? `<div class="store-title">${settings.storeNameAr || settings.storeName}</div>` : ''}
          
          ${showProductName ? `<div class="prod-title">${activeProduct.nameAr || activeProduct.name}</div>` : ''}

          ${showScientificName && activeProduct.scientificName ? `<div class="sci-name">🧪 ${activeProduct.scientificName}</div>` : ''}
          ${showDosageForm && activeProduct.dosageForm ? `<div class="dosage-form">${activeProduct.dosageForm}</div>` : ''}

          ${priceOption !== 'none' ? `
          <div class="prices-container">
            ${priceOption !== 'all_three' ? `
              <div class="price-badge">${currency}${formatNumber(displayedPrice)}</div>
              ${showPriceLabel ? `<div class="price-label">${priceLabelText}</div>` : ''}
            ` : `
              <div class="three-prices-grid">
                <div><span>مفرد</span><span style="color:${priceColor}">${currency}${formatNumber(singlePrice)}</span></div>
                <div><span>جملة</span><span style="color:${priceColor}">${currency}${formatNumber(wholesalePrice)}</span></div>
                <div><span>كرتون</span><span style="color:${priceColor}">${currency}${formatNumber(cartonPrice)}</span></div>
              </div>
            `}
          </div>
          ` : ''}

          ${barcodeSVGMarkup}
          ${showBarcodeText ? `<div class="barcode-text">${activeProduct.barcode}</div>` : ''}

          ${showBatchNumber && activeProduct.batchNumber ? `<div class="batch-text">Batch: ${activeProduct.batchNumber}</div>` : ''}
          ${showExpiryDate && activeProduct.expiryDate ? `<div class="expiry-text">تاريخ الانتهاء: ${activeProduct.expiryDate}</div>` : ''}
        </div>
      </div>
    `;
  };

  const effectivePageWidth = printerPaperWidthMm > 0 ? Math.max(labelWidthMm, printerPaperWidthMm) : labelWidthMm;

  const getLabelStyles = () => `
    @page {
      size: ${effectivePageWidth}mm ${labelHeightMm}mm;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      direction: ltr !important;
    }
    .print-carrier-page {
      width: ${effectivePageWidth}mm;
      max-width: 100%;
      height: ${labelHeightMm}mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      justify-content: ${
        printAlignX === 'left' ? 'flex-start' :
        printAlignX === 'right' ? 'flex-end' : 'center'
      };
      align-items: ${
        printAlignY === 'top' ? 'flex-start' :
        printAlignY === 'bottom' ? 'flex-end' : 'center'
      };
      overflow: visible;
      page-break-after: always;
      break-after: page;
      margin: 0;
      ${printAlignX === 'right' ? 'margin-left: auto !important; margin-right: 0 !important;' : printAlignX === 'center' ? 'margin-left: auto !important; margin-right: auto !important;' : 'margin-left: 0 !important; margin-right: auto !important;'}
      padding: 0;
      position: relative;
      direction: ltr !important;
    }
    .label-page {
      width: ${labelWidthMm}mm;
      height: ${labelHeightMm}mm;
      box-sizing: border-box;
      padding: ${paddingPx}px;
      background-color: ${labelBgColor};
      border: ${borderWidthPx}px solid ${borderColor};
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      overflow: hidden;
      margin: 0;
      position: relative;
      transform: translate(${offsetXmm}mm, ${offsetYmm}mm) rotate(${rotationDeg}deg);
      transform-origin: center center;
      direction: rtl;
    }
    .store-title {
      font-size: ${storeFontSize}px;
      font-weight: 800;
      color: ${textColor};
      margin-bottom: 1px;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .prod-title {
      font-size: ${titleFontSize}px;
      font-weight: 900;
      color: ${textColor};
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .sci-name {
      font-size: ${Math.max(8, titleFontSize - 5)}px;
      color: #0284c7;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
    }
    .dosage-form {
      font-size: ${Math.max(7, titleFontSize - 6)}px;
      color: #64748b;
    }
    .prices-container {
      margin: 1px 0;
      width: 100%;
    }
    .price-badge {
      font-size: ${priceFontSize}px;
      font-weight: 900;
      color: ${priceColor};
      line-height: 1;
      font-family: monospace, monospace;
    }
    .price-label {
      font-size: ${Math.max(8, priceFontSize - 7)}px;
      font-weight: bold;
      color: ${textColor};
      opacity: 0.85;
    }
    .three-prices-grid {
      display: flex;
      justify-content: space-around;
      align-items: center;
      width: 100%;
      font-size: ${Math.max(8, priceFontSize - 7)}px;
      font-weight: bold;
      color: ${textColor};
      border-top: 1px dashed #cbd5e1;
      border-bottom: 1px dashed #cbd5e1;
      padding: 1px 0;
    }
    .three-prices-grid div {
      display: flex;
      flex-direction: column;
    }
    .barcode-text {
      font-family: monospace, monospace;
      font-size: ${barcodeFontSize}px;
      font-weight: bold;
      color: ${textColor};
      letter-spacing: 1px;
      margin-top: 1px;
      line-height: 1;
    }
    .batch-text, .expiry-text {
      font-size: 8px;
      color: #64748b;
      line-height: 1;
    }
  `;

  // Trigger Direct In-Browser Printing (guaranteed to work in iframe & cloud preview)
  const handleDirectInAppPrint = () => {
    // 1. Remove old print container if any
    const oldContainer = document.getElementById('barcode-direct-print-root');
    if (oldContainer) oldContainer.remove();
    const oldStyle = document.getElementById('barcode-direct-print-style');
    if (oldStyle) oldStyle.remove();

    // 2. Create Print Style Tag
    const styleEl = document.createElement('style');
    styleEl.id = 'barcode-direct-print-style';
    styleEl.innerHTML = `
      @media print {
        body > *:not(#barcode-direct-print-root) {
          display: none !important;
        }
        #barcode-direct-print-root {
          display: flex !important;
          flex-direction: column !important;
          align-items: ${printAlignX === 'right' ? 'flex-end' : printAlignX === 'center' ? 'center' : 'flex-start'} !important;
          width: 100% !important;
          position: absolute;
          left: 0;
          top: 0;
          background: #ffffff;
        }
        ${getLabelStyles()}
      }
      @media screen {
        #barcode-direct-print-root {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    // 3. Create Print Root Container
    const printRoot = document.createElement('div');
    printRoot.id = 'barcode-direct-print-root';

    const singleHTML = buildSingleLabelHTML();
    const itemsArr = Array.from({ length: copiesCount });

    if (layoutMode === '2-up') {
      // 2 labels side by side
      printRoot.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 2mm; justify-content: center;">
          ${itemsArr.map(() => singleHTML).join('')}
        </div>
      `;
    } else {
      printRoot.innerHTML = itemsArr.map(() => singleHTML).join('');
    }

    document.body.appendChild(printRoot);

    // 4. Trigger print
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        if (printRoot) printRoot.remove();
        if (styleEl) styleEl.remove();
      }, 1000);
    }, 150);
  };

  // Popup Window Print option
  const handlePopupWindowPrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      // Fallback to direct in-app print if popup blocked
      handleDirectInAppPrint();
      return;
    }

    const singleHTML = buildSingleLabelHTML();
    const itemsArr = Array.from({ length: copiesCount });

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="ltr">
        <head>
          <title>طباعة ملصق - ${activeProduct.nameAr || activeProduct.name}</title>
          <style>${getLabelStyles()}</style>
        </head>
        <body style="margin: 0; padding: 0; display: flex; flex-direction: column; align-items: ${printAlignX === 'right' ? 'flex-end' : printAlignX === 'center' ? 'center' : 'flex-start'};">
          ${itemsArr.map(() => singleHTML).join('')}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full h-full max-w-[99vw] max-h-[98vh] my-auto bg-gradient-to-b from-[#0F172A] via-[#0B1120] to-[#070A13] rounded-2xl border border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.25)] text-slate-100 overflow-hidden flex flex-col">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B1120]/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>
                  {mode === 'no_barcode'
                    ? (isKu ? '🏷️ چاپکردنی بارکۆد بۆ ئەو کاڵایانەی بێ بارکۆدن' : isAr ? '🏷️ طباعة وتوليد باركود للمواد التي لا يوجد لديها باركود' : '🏷️ Print Barcode for Items Without Barcode')
                    : mode === 'barcode'
                    ? (isKu ? '🏷️ چاپکردن و ڕێکخستنی بارکۆدی کاڵاکان' : isAr ? '🏷️ طباعة وتخصيص باركود المواد' : '🏷️ Print & Customize Product Barcodes')
                    : mode === 'price'
                    ? (isKu ? '💲 چاپکردن و ڕێکخستنی نرخی کاڵاکان (ملصقی ڕەفەکان)' : isAr ? '💲 طباعة وتخصيص أسعار المواد (ملصقات الرفوف)' : '💲 Print & Customize Product Price Tags')
                    : (isKu ? 'دەستکاریکردن و چاپکردنی لەزگەی بارکۆد و نرخ' : isAr ? 'تخصيص وطباعة ملصقات الباركود والأسعار' : 'Customize & Print Barcode Price Tags')
                  }
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
                  {activeProduct.barcode || 'NO-BARCODE'}
                </span>
              </h3>
              <p className="text-[11px] text-amber-300 font-medium">
                {mode === 'no_barcode'
                  ? (isKu ? 'تولید و چاپکردنی بارکۆدی ستاندارد بۆ ئەو کاڵایانەی لە سیستەمدا بێ بارکۆد بوون بۆ خوێندنەوە بە سکانەر' : isAr ? 'توليد وطباعة باركودات قياسية للمواد التي لا تحتوي على باركود لمسحها ضوئياً بنجاح' : 'Generate and print scannable barcodes for items without existing barcodes')
                  : mode === 'barcode'
                  ? (isKu ? 'چاپکردنی لەزگەی بارکۆد بۆ خوێندنەوەی خێرا بە سکانەری بارکۆد لەگەڵ ناوی مادە' : isAr ? 'توليد وطباعة ملصقات الباركود للمنتجات ومسحها عبر أجهزة وقارئات الباركود' : 'Configure and print barcode labels optimized for barcode scanners')
                  : mode === 'price'
                  ? (isKu ? 'چاپکردنی نرخی دیار بۆ ڕەفەکان، کارتۆن، مفرد و کۆ بە قەبارەی گەورە' : isAr ? 'طباعة بطاقات وملصقات الأسعار الكبيرة للرفوف وعرض أسعار البيع والكرتون' : 'Configure high-visibility shelf price tags, retail, wholesale, and carton prices')
                  : (isKu ? 'کۆنترۆڵی تەواوی قەبارەی فۆنت، ڕەنگەکان، قەبارەی لەزگە و جۆری نرخی پیشاندراو' : isAr ? 'التحكم الشامل بأحجام الخطوط، الألوان، أبعاد الملصق، ونوع السعر المعروض' : 'Full manual control over fonts, colors, label dimensions, and price tags')
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={saveCurrentConfigAsDefault}
              type="button"
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                savedSuccessMsg
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-amber-500/30'
              }`}
            >
              {savedSuccessMsg ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4 text-amber-400" />}
              <span>{savedSuccessMsg ? (isKu ? 'ڕێکخستنەکان پاشەکەوت کران!' : isAr ? 'تم حفظ الإعدادات!' : 'Saved!') : (isKu ? 'پاشەکەوتکردن وەک بنەڕەت' : isAr ? 'حفظ كإعداد افتراضي' : 'Save Default')}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - 2 Columns (Controls vs Live Sticker Preview) */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto flex-1">

          {/* Left Controls Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">

            {/* 1. Product Picker with Live Search */}
            <div className="p-3.5 rounded-2xl bg-[#10192D] border border-blue-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <BarcodeIcon className="w-4 h-4 text-cyan-400" />
                  <span>{isKu ? 'هەڵبژاردنی کاڵا بۆ چاپکردن:' : isAr ? 'اختيار المادة المراد طباعتها:' : 'Select Product:'}</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {filteredProducts.length} {isKu ? 'کاڵای بەردەست' : isAr ? 'مادة متاحة' : 'products'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isKu ? '🔍 گەڕانی خێرا بەپێی ناو، بارکۆد...' : isAr ? '🔍 بحث فوري بالاسم، الباركود، التركيبة...' : '🔍 Fast search name, barcode...'}
                    className="w-full bg-[#0B1120] text-xs text-slate-200 placeholder-slate-500 p-2.5 pl-3 rtl:pl-8 rtl:pr-3 pr-8 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/60 font-semibold"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={activeProduct.id}
                  onChange={(e) => {
                    const found = products.find(p => p.id === e.target.value);
                    if (found) setSelectedProduct(found);
                  }}
                  className="w-full bg-[#0B1120] text-xs font-bold text-white p-2.5 rounded-xl border border-cyan-500/30 focus:outline-none focus:border-cyan-400"
                >
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {isKu ? (p.nameKu || p.nameAr || p.name) : (p.nameAr || p.name)} — [{p.barcode || (isKu ? 'بێ بارکۆد' : isAr ? 'بدون باركود' : 'No Barcode')}] — {settings.currencySymbol}{p.singleRetailPrice || p.price}
                    </option>
                  ))}
                  {filteredProducts.length === 0 && (
                    <option value="">{isKu ? 'هیچ کاڵایەک نەدۆزرایەوە' : 'لا توجد مادة تطابق كلمة البحث'}</option>
                  )}
                </select>
              </div>
            </div>

            {/* 2. PRINTER ALIGNMENT & POSITIONING (يمين / يسار / وسط / فوق / تحت) - بارز في المقدمة */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#131E35] to-[#0D1527] border-2 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.2)] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    <Move className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                      <span>{isKu ? 'شوێن و ئاراستەی دەرچوونی چاپ لەسەر طابيعە:' : isAr ? 'موضع ومحاذاة طباعة الباركود على الطابعة:' : 'Barcode Printer Position & Alignment:'}</span>
                    </h4>
                    <p className="text-[10.5px] text-slate-300">
                      {isAr ? 'التحكم بمكان خروج الملصق (أقصى اليمين ➡️ / الوسط ⏺️ / أقصى اليسار ⬅️ / فوق وتحت ↕️)' : 'Control print exit location (Right / Center / Left / Up & Down)'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowXprinterGuide(prev => !prev)}
                  className="px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-bold hover:bg-amber-900 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{isAr ? 'دليل طابعات Xprinter' : 'Xprinter Guide'}</span>
                </button>
              </div>

              {/* Xprinter Troubleshooting Guide Accordion */}
              {showXprinterGuide && (
                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-slate-200 space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 text-amber-300 font-black">
                    <Info className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{isAr ? 'إرشادات ضبط الرول والطباعة لطابعة Xprinter:' : 'Xprinter Setup Tips:'}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 leading-relaxed">
                    <li>
                      <strong className="text-amber-200">{isAr ? 'موضع الرول داخل الطابعة:' : 'Roll Position:'}</strong> {isAr ? 'إذا كان الرول على اليمين اختر زر «➡️ أقصى اليمين»، وإذا كان على اليسار اختر «⬅️ أقصى اليسار».' : 'Select Left or Right alignment based on your physical roll slot.'}
                    </li>
                    <li>
                      <strong className="text-amber-200">{isAr ? 'مسارات الرول الخضراء:' : 'Roll Guides:'}</strong> {isAr ? 'اضبط الدليلين البلاستيكيين داخل الطابعة حول الرول لمنع انزلاقه أثناء السحب السريع.' : 'Snug plastic roll guides against the roll.'}
                    </li>
                    <li>
                      <strong className="text-amber-200">{isAr ? 'معايرة حساس المسافات (Calibration):' : 'Calibration:'}</strong> {isAr ? 'أطفئ الطابعة ثم اضغط زر FEED أو PAUSE واستمر بالضغط وشغل الطابعة حتى تقف على فاصل الملصقات.' : 'Hold FEED/PAUSE while turning on to calibrate label gap.'}
                    </li>
                    <li>
                      <strong className="text-amber-200">{isAr ? 'التحريك الدقيق بالملمتر:' : 'Nudge Offsets:'}</strong> {isAr ? 'استخدم أزرار الأسهم أدناه لتحريك الملصق بالملم حتى يقع الباركود في منتصف الورقة تماماً ويحفظ تلقائياً.' : 'Use the directional D-Pad below to fine-tune in millimeters.'}
                    </li>
                  </ul>
                </div>
              )}

              {/* Quick Horizontal Alignment (يسار / وسط / يمين) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>{isKu ? 'ئاراستەی ئاسۆیی (چەپ، ناوەڕاست، ڕاستی طابيعە):' : isAr ? 'جهة الخروج الأفقية على رول الطابعة (يمين / وسط / يسار):' : 'Horizontal Alignment on Printer Roll:'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-amber-300">
                    {printAlignX === 'right' ? (isAr ? '➡️ يمين الطابعة' : 'Right') : printAlignX === 'left' ? (isAr ? '⬅️ يسار الطابعة' : 'Left') : (isAr ? '⏺️ وسط' : 'Center')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Right Button (Requested by user: عند طباعة فقط يطبع على يمين طابعة) */}
                  <button
                    type="button"
                    onClick={() => setPrintAlignX('right')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      printAlignX === 'right'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] ring-2 ring-amber-300 scale-[1.02]'
                        : 'bg-[#0B1120] text-slate-300 border-slate-700 hover:border-amber-500/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlignRight className="w-4 h-4" />
                      <span className="text-sm font-black">{isAr ? '➡️ أقصى اليمين' : 'Right'}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      printAlignX === 'right' ? 'bg-black/30 text-amber-950 font-black' : 'bg-amber-950/40 text-amber-300'
                    }`}>
                      {isAr ? 'يطبع على يمين الطابعة' : 'Print on Right'}
                    </span>
                  </button>

                  {/* Center Button */}
                  <button
                    type="button"
                    onClick={() => setPrintAlignX('center')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      printAlignX === 'center'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] ring-2 ring-amber-300 scale-[1.02]'
                        : 'bg-[#0B1120] text-slate-300 border-slate-700 hover:border-amber-500/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlignCenter className="w-4 h-4" />
                      <span className="text-sm font-black">{isAr ? '⏺️ في المنتصف' : 'Center'}</span>
                    </div>
                    <span className="text-[9px] opacity-75">{isAr ? 'منتصف الرول' : 'Center Roll'}</span>
                  </button>

                  {/* Left Button */}
                  <button
                    type="button"
                    onClick={() => setPrintAlignX('left')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      printAlignX === 'left'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] ring-2 ring-amber-300 scale-[1.02]'
                        : 'bg-[#0B1120] text-slate-300 border-slate-700 hover:border-amber-500/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlignLeft className="w-4 h-4" />
                      <span className="text-sm font-black">{isAr ? '⬅️ أقصى اليسار' : 'Left'}</span>
                    </div>
                    <span className="text-[9px] opacity-75">{isAr ? 'يسار الرول' : 'Left Roll'}</span>
                  </button>
                </div>
              </div>

              {/* Vertical Alignment (فوق وتحت) & Rotation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-slate-300 block mb-1 font-bold">
                    {isKu ? 'ئاراستەی ستوونی (سەرەوە، ناوەڕاست، خوارەوە):' : isAr ? 'المحاذاة الرأسية (فوق وتحت):' : 'Vertical Alignment (Up / Down):'}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPrintAlignY('top')}
                      className={`py-2 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        printAlignY === 'top'
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                          : 'bg-[#0B1120] text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>{isAr ? 'أعلى (فوق)' : 'Top'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintAlignY('center')}
                      className={`py-2 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        printAlignY === 'center'
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                          : 'bg-[#0B1120] text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{isAr ? 'وسط' : 'Mid'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintAlignY('bottom')}
                      className={`py-2 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        printAlignY === 'bottom'
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                          : 'bg-[#0B1120] text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>{isAr ? 'أسفل (تحت)' : 'Bottom'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-300 block mb-1 font-bold">
                    {isKu ? 'سوڕاندنی چاپ (پلە):' : isAr ? 'تدوير زاوية الطباعة:' : 'Rotation Angle:'}
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => setRotationDeg(deg as any)}
                        className={`py-2 px-1 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                          rotationDeg === deg
                            ? 'bg-cyan-600 text-white border-cyan-400 font-black'
                            : 'bg-[#0B1120] text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Printer Carrier Roll Width Presets */}
              <div className="p-2.5 rounded-xl bg-[#080D1A] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-bold">
                    {isKu ? 'پانی ڕوڵی طابيعە (Printer Roll Width):' : isAr ? 'عرض رول ورق الطابعة الحرارية:' : 'Printer Paper Roll Width:'}
                  </span>
                  <span className="text-xs font-mono font-black text-amber-400">
                    {printerPaperWidthMm > 0 ? `${printerPaperWidthMm} mm` : `${labelWidthMm} mm (تلقائي)`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPrinterPaperWidthMm(80)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      printerPaperWidthMm === 80
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                        : 'bg-[#0B1120] text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    80mm (Xprinter)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrinterPaperWidthMm(58)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      printerPaperWidthMm === 58
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                        : 'bg-[#0B1120] text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    58mm (كاشير صغير)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrinterPaperWidthMm(100)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      printerPaperWidthMm === 100
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                        : 'bg-[#0B1120] text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    100mm (باركود عريض)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrinterPaperWidthMm(labelWidthMm)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      printerPaperWidthMm === labelWidthMm
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                        : 'bg-[#0B1120] text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {isAr ? 'مطابق للملصق' : 'Auto'}
                  </button>
                </div>
              </div>

              {/* Directional Nudge D-Pad (Fine mm adjustment) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isAr ? 'التحريك الدقيق بالملمتر (فوق / تحت / يمين / يسار):' : 'Fine Nudge D-Pad (mm):'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={resetPosition}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-bold border border-slate-700 transition-all cursor-pointer"
                  >
                    {isAr ? '🔄 تصفير الإزاحة' : 'Reset 0,0'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Interactive D-Pad Cross */}
                  <div className="flex flex-col items-center justify-center p-2.5 bg-[#080D1A] rounded-xl border border-slate-800/80 select-none">
                    {/* Top Arrow */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <button
                        type="button"
                        onClick={() => nudge(0, -5)}
                        title="إزاحة للأعلى -5mm"
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-600 text-cyan-300 hover:text-white text-[10px] font-black font-mono transition-all cursor-pointer"
                      >
                        -5mm فوق
                      </button>
                      <button
                        type="button"
                        onClick={() => nudge(0, -1)}
                        title="إزاحة للأعلى -1mm"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-cyan-600 text-cyan-300 hover:text-white transition-all active:scale-90 cursor-pointer shadow"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Left - Center - Right */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => nudge(-5, 0)}
                        title="إزاحة لليسار -5mm"
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-cyan-600 text-cyan-300 hover:text-white text-[10px] font-black font-mono transition-all cursor-pointer"
                      >
                        -5 يسار
                      </button>
                      <button
                        type="button"
                        onClick={() => nudge(-1, 0)}
                        title="إزاحة لليسار -1mm"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-cyan-600 text-cyan-300 hover:text-white transition-all active:scale-90 cursor-pointer shadow"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      <div className="w-14 h-12 rounded-xl bg-slate-950 border border-cyan-500/40 flex flex-col items-center justify-center text-[10px] font-mono font-black text-cyan-300 shadow-inner">
                        <span>X: {offsetXmm > 0 ? `+${offsetXmm}` : offsetXmm}</span>
                        <span>Y: {offsetYmm > 0 ? `+${offsetYmm}` : offsetYmm}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => nudge(1, 0)}
                        title="إزاحة لليمين +1mm"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-cyan-600 text-cyan-300 hover:text-white transition-all active:scale-90 cursor-pointer shadow"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => nudge(5, 0)}
                        title="إزاحة لليمين +5mm"
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-cyan-600 text-cyan-300 hover:text-white text-[10px] font-black font-mono transition-all cursor-pointer"
                      >
                        +5 يمين
                      </button>
                    </div>

                    {/* Bottom Arrow */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => nudge(0, 1)}
                        title="إزاحة للأسفل +1mm"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-cyan-600 text-cyan-300 hover:text-white transition-all active:scale-90 cursor-pointer shadow"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => nudge(0, 5)}
                        title="إزاحة للأسفل +5mm"
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-600 text-cyan-300 hover:text-white text-[10px] font-black font-mono transition-all cursor-pointer"
                      >
                        +5mm تحت
                      </button>
                    </div>
                  </div>

                  {/* Direct Numeric Range Sliders */}
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between text-[10.5px] text-slate-300 mb-1">
                        <span className="font-bold">{isAr ? 'الإزاحة الأفقية X (يسار / يمين):' : 'Horizontal X (Left / Right):'}</span>
                        <span className="font-mono text-cyan-400 font-bold">{offsetXmm} mm</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={-50}
                          max={50}
                          step={1}
                          value={offsetXmm}
                          onChange={(e) => setOffsetXmm(Number(e.target.value))}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <input
                          type="number"
                          min={-50}
                          max={50}
                          value={offsetXmm}
                          onChange={(e) => setOffsetXmm(Number(e.target.value))}
                          className="w-16 bg-[#080D1A] text-xs font-mono font-bold text-center text-white py-1 rounded-lg border border-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10.5px] text-slate-300 mb-1">
                        <span className="font-bold">{isAr ? 'الإزاحة الرأسية Y (فوق / تحت):' : 'Vertical Y (Up / Down):'}</span>
                        <span className="font-mono text-cyan-400 font-bold">{offsetYmm} mm</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={-40}
                          max={40}
                          step={1}
                          value={offsetYmm}
                          onChange={(e) => setOffsetYmm(Number(e.target.value))}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <input
                          type="number"
                          min={-40}
                          max={40}
                          value={offsetYmm}
                          onChange={(e) => setOffsetYmm(Number(e.target.value))}
                          className="w-16 bg-[#080D1A] text-xs font-mono font-bold text-center text-white py-1 rounded-lg border border-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Price Option Selection Buttons */}
            <div className="p-3.5 rounded-2xl bg-[#10192D] border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  <span>{isKu ? 'جۆری نرخی پیشاندراو لەسەر لەزگە:' : isAr ? 'نوع السعر المعروض على الملصق:' : 'Price Option on Tag:'}</span>
                </label>
                {priceOption === 'custom' && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-amber-300 font-bold">{isKu ? 'نرخی تایبەت:' : isAr ? 'سعر مخصص:' : 'Custom:'}</span>
                    <input
                      type="number"
                      value={customPriceVal}
                      onChange={(e) => setCustomPriceVal(Number(e.target.value))}
                      className="w-24 bg-[#0B1120] text-xs font-mono font-bold text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/40 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                {/* Barcode Only / None */}
                <button
                  type="button"
                  onClick={() => setPriceOption('none')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    priceOption === 'none'
                      ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] block font-black">{isKu ? 'تەنها بارکۆد' : isAr ? 'باركود فقط' : 'Barcode Only'}</span>
                  <span className="text-[9.5px] opacity-80">{isKu ? 'بێ نرخ' : isAr ? 'بدون سعر' : 'No Price'}</span>
                </button>

                {/* Single Retail */}
                <button
                  type="button"
                  onClick={() => setPriceOption('single')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    priceOption === 'single'
                      ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] block font-black">{isKu ? 'تاک' : isAr ? 'المفرد' : 'Retail'}</span>
                  <span className="text-[9.5px] opacity-80 font-mono">{currency}{formatNumber(singlePrice)}</span>
                </button>

                {/* Carton */}
                <button
                  type="button"
                  onClick={() => setPriceOption('carton')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    priceOption === 'carton'
                      ? 'bg-purple-600 text-white border-purple-400 font-bold shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] block font-black">{isKu ? 'کارتۆن' : isAr ? 'الكرتون' : 'Carton'}</span>
                  <span className="text-[9.5px] opacity-80 font-mono">{currency}{formatNumber(cartonPrice)}</span>
                </button>

                {/* Wholesale */}
                <button
                  type="button"
                  onClick={() => setPriceOption('wholesale')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    priceOption === 'wholesale'
                      ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] block font-black">{isKu ? 'کۆ' : isAr ? 'الجملة' : 'Wholesale'}</span>
                  <span className="text-[9.5px] opacity-80 font-mono">{currency}{formatNumber(wholesalePrice)}</span>
                </button>

                {/* Blister / Strip */}
                <button
                  type="button"
                  onClick={() => setPriceOption('blister')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    priceOption === 'blister'
                      ? 'bg-teal-600 text-white border-teal-400 font-bold shadow-[0_0_12px_rgba(20,184,166,0.4)]'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] block font-black">{isKu ? 'شریت' : isAr ? 'الشريط' : 'Blister'}</span>
                  <span className="text-[9.5px] opacity-80 font-mono">{currency}{formatNumber(blisterPrice)}</span>
                </button>

                {/* Custom */}
                <button
                  type="button"
                  onClick={() => {
                    setPriceOption('custom');
                    if (!customPriceVal) setCustomPriceVal(singlePrice);
                  }}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    priceOption === 'custom'
                      ? 'bg-amber-600 text-white border-amber-400 font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] block font-black">{isKu ? 'دیاریکراو' : isAr ? 'مخصص' : 'Custom'}</span>
                  <span className="text-[9.5px] opacity-80">{isKu ? 'دەستی' : isAr ? 'إدخال يدوي' : 'Manual'}</span>
                </button>

                {/* All Three */}
                <button
                  type="button"
                  onClick={() => setPriceOption('all_three')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    priceOption === 'all_three'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-300 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] block font-black">{isKu ? 'هەر سێکیان' : isAr ? 'ثلاثتهم' : 'All 3'}</span>
                  <span className="text-[8.5px] opacity-90">{isKu ? 'تاک+کۆ+کارتۆن' : isAr ? 'مفرد+جملة+كرتون' : 'Full Tag'}</span>
                </button>
              </div>
            </div>

            {/* 3. Sticker Dimension Presets & Controls */}
            <div className="p-3.5 rounded-2xl bg-[#10192D] border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>{isKu ? 'ئەندازەکانی کاغەز و قەبارەی لەزگە:' : isAr ? 'أبعاد الورق وحجم الملصق:' : 'Label Dimensions & Size:'}</span>
                </label>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400">{isKu ? 'قەبارەی ئامادەکراو:' : isAr ? 'أحجام جاهزة:' : 'Presets:'}</span>
                <button
                  type="button"
                  onClick={() => { setLabelWidthMm(50); setLabelHeightMm(30); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                    labelWidthMm === 50 && labelHeightMm === 30
                      ? 'bg-cyan-600 text-white border-cyan-400'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  50×30 mm ({isKu ? 'ستاندارد' : isAr ? 'قياسي' : 'Standard'})
                </button>
                <button
                  type="button"
                  onClick={() => { setLabelWidthMm(40); setLabelHeightMm(25); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                    labelWidthMm === 40 && labelHeightMm === 25
                      ? 'bg-cyan-600 text-white border-cyan-400'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  40×25 mm ({isKu ? 'پاکەتی بچووک' : isAr ? 'علبة دواء' : 'Small Box'})
                </button>
                <button
                  type="button"
                  onClick={() => { setLabelWidthMm(38); setLabelHeightMm(25); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                    labelWidthMm === 38 && labelHeightMm === 25
                      ? 'bg-cyan-600 text-white border-cyan-400'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  38×25 mm ({isKu ? 'بچووک' : isAr ? 'مصغر' : 'Mini'})
                </button>
                <button
                  type="button"
                  onClick={() => { setLabelWidthMm(58); setLabelHeightMm(40); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                    labelWidthMm === 58 && labelHeightMm === 40
                      ? 'bg-cyan-600 text-white border-cyan-400'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  58×40 mm ({isKu ? 'پاکەتی گەورە' : isAr ? 'تغليف كبير' : 'Package'})
                </button>
                <button
                  type="button"
                  onClick={() => { setLabelWidthMm(70); setLabelHeightMm(50); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                    labelWidthMm === 70 && labelHeightMm === 50
                      ? 'bg-cyan-600 text-white border-cyan-400'
                      : 'bg-[#0B1120] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  70×50 mm ({isKu ? 'کارتی ڕەفە' : isAr ? 'بطاقة رف' : 'Shelf Tag'})
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">{isKu ? 'پانی (mm):' : isAr ? 'العرض (mm):' : 'Width (mm):'}</span>
                  <input
                    type="number"
                    value={labelWidthMm}
                    onChange={(e) => setLabelWidthMm(Number(e.target.value))}
                    className="w-full bg-[#0B1120] text-xs font-mono font-bold text-white p-2 rounded-xl border border-slate-700"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">{isKu ? 'بەرزی (mm):' : isAr ? 'الارتفاع (mm):' : 'Height (mm):'}</span>
                  <input
                    type="number"
                    value={labelHeightMm}
                    onChange={(e) => setLabelHeightMm(Number(e.target.value))}
                    className="w-full bg-[#0B1120] text-xs font-mono font-bold text-white p-2 rounded-xl border border-slate-700"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">{isKu ? 'بۆشایی ناوەوە (px):' : isAr ? 'الهامش الداخلي (px):' : 'Padding (px):'}</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={paddingPx}
                    onChange={(e) => setPaddingPx(Number(e.target.value))}
                    className="w-full bg-[#0B1120] text-xs font-mono font-bold text-white p-2 rounded-xl border border-slate-700"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">{isKu ? 'ژمارەی لەبەرگیراوەکان:' : isAr ? 'عدد النسخ:' : 'Copies Count:'}</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={copiesCount}
                    onChange={(e) => setCopiesCount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-[#0B1120] text-xs font-mono font-bold text-cyan-300 p-2 rounded-xl border border-cyan-500/40"
                  />
                </div>
              </div>
            </div>

            {/* 5. Manual Font Sizes & Barcode Height */}
            
            <div className="p-3.5 rounded-2xl bg-[#10192D] border border-cyan-500/20 space-y-3">
              <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-cyan-400" />
                <span>{isKu ? 'کۆنترۆڵی دەستی قەبارەی فۆنت و بەرزی بارکۆد:' : isAr ? 'التحكم اليدوي بأحجام الخطوط وارتفاع الباركود:' : 'Manual Font & Barcode Sizes:'}</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* Store Font Size */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                    <span>{isKu ? 'فۆنتی فرۆشگا:' : isAr ? 'خط المحل:' : 'Store Font:'}</span>
                    <span className="font-mono text-cyan-400 font-bold">{storeFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={20}
                    value={storeFontSize}
                    onChange={(e) => setStoreFontSize(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Product Name Font Size */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                    <span>{isKu ? 'فۆنتی ناو:' : isAr ? 'خط الاسم:' : 'Title Size:'}</span>
                    <span className="font-mono text-cyan-400 font-bold">{titleFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={9}
                    max={28}
                    value={titleFontSize}
                    onChange={(e) => setTitleFontSize(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Price Font Size */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                    <span>{isKu ? 'فۆنتی نرخ:' : isAr ? 'خط السعر:' : 'Price Size:'}</span>
                    <span className="font-mono text-emerald-400 font-bold">{priceFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={11}
                    max={36}
                    value={priceFontSize}
                    onChange={(e) => setPriceFontSize(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Barcode Graphic Height */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                    <span>{isKu ? 'بەرزی بارکۆد:' : isAr ? 'ارتفاع الباركود:' : 'Barcode Height:'}</span>
                    <span className="font-mono text-amber-400 font-bold">{barcodeHeightPx}px</span>
                  </div>
                  <input
                    type="range"
                    min={16}
                    max={50}
                    value={barcodeHeightPx}
                    onChange={(e) => setBarcodeHeightPx(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 5. Custom Palette & Colors */}
            <div className="p-3.5 rounded-2xl bg-[#10192D] border border-purple-500/20 space-y-2.5">
              <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-purple-400" />
                <span>{isKu ? 'دەستکاریکردنی تەواوی ڕەنگەکانی لەزگە:' : isAr ? 'تخصيص ألوان الملصق بالإتاحة الكاملة:' : 'Custom Sticker Palette:'}</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* Background Color */}
                <div>
                  <span className="text-[10px] text-slate-300 block mb-1">{isKu ? 'پاشبنەمای لەزگە:' : isAr ? 'خلفية الملصق:' : 'Background:'}</span>
                  <div className="flex items-center gap-2 bg-[#0B1120] p-1.5 rounded-xl border border-slate-800">
                    <input
                      type="color"
                      value={labelBgColor}
                      onChange={(e) => setLabelBgColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-300">{labelBgColor}</span>
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <span className="text-[10px] text-slate-300 block mb-1">{isKu ? 'ڕەنگی دەق:' : isAr ? 'لون النص:' : 'Text Color:'}</span>
                  <div className="flex items-center gap-2 bg-[#0B1120] p-1.5 rounded-xl border border-slate-800">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-300">{textColor}</span>
                  </div>
                </div>

                {/* Price Color */}
                <div>
                  <span className="text-[10px] text-slate-300 block mb-1">{isKu ? 'ڕەنگی نرخ:' : isAr ? 'لون السعر:' : 'Price Color:'}</span>
                  <div className="flex items-center gap-2 bg-[#0B1120] p-1.5 rounded-xl border border-slate-800">
                    <input
                      type="color"
                      value={priceColor}
                      onChange={(e) => setPriceColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-300">{priceColor}</span>
                  </div>
                </div>

                {/* Border Color */}
                <div>
                  <span className="text-[10px] text-slate-300 block mb-1">{isKu ? 'ڕەنگی چێوە:' : isAr ? 'لون الإطار:' : 'Border Color:'}</span>
                  <div className="flex items-center gap-2 bg-[#0B1120] p-1.5 rounded-xl border border-slate-800">
                    <input
                      type="color"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-300">{borderColor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Display Element Checkbox Toggles */}
            <div className="p-3.5 rounded-2xl bg-[#10192D] border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 block mb-1">
                {isKu ? 'پیشاندان و شاردنەوەی بەشەکانی لەزگە:' : isAr ? 'إظهار وإخفاء عناصر الملصق:' : 'Toggle Label Elements:'}
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 bg-[#0B1120] p-2 rounded-xl border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={showProductName}
                    onChange={(e) => setShowProductName(e.target.checked)}
                    className="accent-cyan-500 w-3.5 h-3.5 rounded"
                  />
                  <span className="font-bold text-white">{isKu ? 'ناوی کاڵا' : isAr ? 'اسم المادة' : 'Product Name'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 bg-[#0B1120] p-2 rounded-xl border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={(e) => setShowStoreName(e.target.checked)}
                    className="accent-cyan-500 w-3.5 h-3.5 rounded"
                  />
                  <span>{isKu ? 'ناوی فرۆشگا' : isAr ? 'اسم المحل' : 'Store Name'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 bg-[#0B1120] p-2 rounded-xl border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={showScientificName}
                    onChange={(e) => setShowScientificName(e.target.checked)}
                    className="accent-cyan-500 w-3.5 h-3.5 rounded"
                  />
                  <span>{isKu ? 'ناوی زانستی' : isAr ? 'الاسم العلمي' : 'Sci Name'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 bg-[#0B1120] p-2 rounded-xl border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={showDosageForm}
                    onChange={(e) => setShowDosageForm(e.target.checked)}
                    className="accent-cyan-500 w-3.5 h-3.5 rounded"
                  />
                  <span>{isKu ? 'شێوازی دەرمان' : isAr ? 'الشكل الدوائي' : 'Dosage Form'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 bg-[#0B1120] p-2 rounded-xl border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={showBatchNumber}
                    onChange={(e) => setShowBatchNumber(e.target.checked)}
                    className="accent-cyan-500 w-3.5 h-3.5 rounded"
                  />
                  <span>{isKu ? 'ژمارەی باچ' : isAr ? 'رقم Batch' : 'Batch No'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 bg-[#0B1120] p-2 rounded-xl border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={showExpiryDate}
                    onChange={(e) => setShowExpiryDate(e.target.checked)}
                    className="accent-cyan-500 w-3.5 h-3.5 rounded"
                  />
                  <span>{isKu ? 'بەرواری بەسەرچوون' : isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 bg-[#0B1120] p-2 rounded-xl border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={showCurrencySymbol}
                    onChange={(e) => setShowCurrencySymbol(e.target.checked)}
                    className="accent-cyan-500 w-3.5 h-3.5 rounded"
                  />
                  <span>{isKu ? 'هێمای دراو' : isAr ? 'رمز العملة' : 'Currency'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 bg-[#0B1120] p-2 rounded-xl border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={showPriceLabel}
                    onChange={(e) => setShowPriceLabel(e.target.checked)}
                    className="accent-cyan-500 w-3.5 h-3.5 rounded"
                  />
                  <span>{isKu ? 'ناونیشانی نرخ' : isAr ? 'تسمية السعر' : 'Price Label'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 bg-[#0B1120] p-2 rounded-xl border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={showBarcodeText}
                    onChange={(e) => setShowBarcodeText(e.target.checked)}
                    className="accent-cyan-500 w-3.5 h-3.5 rounded"
                  />
                  <span>{isKu ? 'دەقی بارکۆد' : isAr ? 'الباركود الرقمي' : 'Barcode Text'}</span>
                </label>
              </div>
            </div>

          </div>

          {/* Right Live Preview Column (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">

            <div className="p-5 rounded-3xl bg-[#10192D] border border-cyan-500/30 space-y-4 flex flex-col items-center justify-center min-h-[320px]">
              <div className="w-full flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>{isKu ? 'پێشبینینی ڕاستەوخۆی لەزگە:' : isAr ? 'معاينة الملصق المباشرة:' : 'Live Tag Preview:'}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {labelWidthMm}×{labelHeightMm} mm
                </span>
              </div>

              {/* The Live Rendered Label Card inside simulated printer bed */}
              <div className="w-full flex flex-col items-center">
                {/* Simulated Thermal Printer Head Frame */}
                <div className="w-full bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-xl p-2.5 border border-slate-700 border-b-2 border-b-amber-500/50 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                    <span className="text-[11px] font-mono font-black text-slate-200 tracking-wider">
                      {printerPaperWidthMm > 0 ? `XPRINTER THERMAL (${printerPaperWidthMm}mm)` : 'THERMAL PRINTER'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      printAlignX === 'right'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                        : printAlignX === 'left'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-400/50'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                    }`}>
                      {printAlignX === 'right' ? (isAr ? '➡️ يمين الطابعة' : 'Right') : printAlignX === 'left' ? (isAr ? '⬅️ يسار الطابعة' : 'Left') : (isAr ? '⏺️ في الوسط' : 'Center')}
                    </span>
                    <span className="text-[9.5px] font-mono text-cyan-400 font-bold">
                      {printAlignY === 'top' ? (isAr ? '⬆️ أعلى' : 'Top') : printAlignY === 'bottom' ? (isAr ? '⬇️ أسفل' : 'Bottom') : (isAr ? '⏺️ وسط' : 'Mid')}
                    </span>
                  </div>
                </div>

                {/* Simulated Printer Paper Ejection Slot */}
                <div className="w-full h-2 bg-black border-x border-slate-700 shadow-inner flex items-center justify-between px-3">
                  <span className="text-[8px] font-mono text-slate-500">⬅️ يسار (0mm)</span>
                  <div className="h-0.5 w-16 bg-slate-700 rounded-full" />
                  <span className="text-[8px] font-mono text-slate-500">يمين ({printerPaperWidthMm || labelWidthMm}mm) ➡️</span>
                </div>

                <div
                  style={{
                    width: '100%',
                    minHeight: '260px',
                    backgroundColor: '#0a0f1d',
                    backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
                    backgroundSize: '12px 12px',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: printAlignX === 'left' ? 'flex-start' : printAlignX === 'right' ? 'flex-end' : 'center',
                    alignItems: printAlignY === 'top' ? 'flex-start' : printAlignY === 'bottom' ? 'flex-end' : 'center',
                    padding: '12px',
                    borderBottomLeftRadius: '16px',
                    borderBottomRightRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    direction: 'ltr',
                    border: '1px dashed rgba(245, 158, 11, 0.4)',
                    borderTop: 'none',
                  }}
                  className="shadow-inner"
                >
                  <div
                    style={{
                      backgroundColor: labelBgColor,
                      borderColor: borderColor,
                      borderWidth: `${borderWidthPx}px`,
                      borderStyle: 'solid',
                      width: `${Math.min(300, Math.max(140, labelWidthMm * 4.2))}px`,
                      height: `${Math.min(220, Math.max(110, labelHeightMm * 4.2))}px`,
                      padding: `${paddingPx}px`,
                      transform: `translate(${offsetXmm * 2}px, ${offsetYmm * 2}px) rotate(${rotationDeg}deg)`,
                      transformOrigin: 'center center',
                    }}
                    className="rounded-xl flex flex-col justify-between items-center text-center shadow-2xl transition-all relative overflow-hidden select-none"
                  >
                    {/* Store Title */}
                    {showStoreName && (
                      <span
                        style={{ color: textColor, fontSize: `${storeFontSize}px` }}
                        className="font-extrabold block tracking-tight leading-none truncate max-w-full"
                      >
                        {isKu ? (settings.storeNameKu || settings.storeNameAr || settings.storeName) : (settings.storeNameAr || settings.storeName)}
                      </span>
                    )}

                    {/* Product Name */}
                    {showProductName && (
                      <h4
                        style={{ color: textColor, fontSize: `${titleFontSize}px` }}
                        className="font-black leading-tight truncate max-w-full px-1 my-0.5"
                      >
                        {isKu ? (activeProduct.nameKu || activeProduct.nameAr || activeProduct.name) : (activeProduct.nameAr || activeProduct.name)}
                      </h4>
                    )}

                    {/* Optional Scientific Name */}
                    {showScientificName && activeProduct.scientificName && (
                      <span
                        style={{ fontSize: `${Math.max(8, titleFontSize - 5)}px` }}
                        className="text-cyan-600 font-bold block truncate max-w-full leading-none"
                      >
                        🧪 {activeProduct.scientificName}
                      </span>
                    )}

                    {/* Optional Dosage Form */}
                    {showDosageForm && activeProduct.dosageForm && (
                      <span style={{ fontSize: '9px' }} className="text-slate-500 block leading-none">
                        {activeProduct.dosageForm}
                      </span>
                    )}

                    {/* Price Display */}
                    {priceOption !== 'none' && (
                      <div className="w-full my-0.5">
                        {priceOption !== 'all_three' ? (
                          <div>
                            <span style={{ color: priceColor, fontSize: `${priceFontSize}px` }} className="font-black block font-mono leading-none">
                              {currency}{formatNumber(getDisplayPrice())}
                            </span>
                            {showPriceLabel && (
                              <span style={{ color: textColor, fontSize: `${Math.max(8, priceFontSize - 7)}px` }} className="font-bold opacity-80">
                                {priceOption === 'single' ? (isKu ? 'نرخی تاک' : 'سعر المفرد') :
                                 priceOption === 'carton' ? (isKu ? `نرخی کارتۆن (${activeProduct.unitsPerCarton || 12} دانە)` : `سعر الكرتون (${activeProduct.unitsPerCarton || 12} قطعة)`) :
                                 priceOption === 'wholesale' ? (isKu ? 'نرخی کۆ' : 'سعر الجملة') :
                                 priceOption === 'blister' ? (isKu ? 'نرخی شریت' : 'سعر الشريط') : (isKu ? 'نرخی دیاریکراو' : 'سعر مخصص')}
                              </span>
                            )}
                          </div>
                        ) : (
                          /* All Three Prices */
                          <div className="flex items-center justify-around w-full py-1 border-y border-slate-300 text-[10px]" style={{ color: textColor }}>
                            <div className="flex flex-col">
                              <span className="text-[8.5px] font-bold opacity-75">{isKu ? 'تاک' : 'مفرد'}</span>
                              <span className="font-mono font-black text-emerald-600">{currency}{formatNumber(singlePrice)}</span>
                            </div>
                            <div className="flex flex-col border-x border-slate-300 px-1.5">
                              <span className="text-[8.5px] font-bold opacity-75">{isKu ? 'کۆ' : 'جملة'}</span>
                              <span className="font-mono font-black text-blue-600">{currency}{formatNumber(wholesalePrice)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8.5px] font-bold opacity-75">{isKu ? 'کارتۆن' : 'كرتون'}</span>
                              <span className="font-mono font-black text-purple-600">{currency}{formatNumber(cartonPrice)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Graphic Barcode */}
                    <div className="w-full flex flex-col items-center justify-center">
                      <BarcodeGraphic value={activeProduct.barcode || '123456789'} height={barcodeHeightPx} showText={false} />
                      {showBarcodeText && (
                        <span
                          style={{ color: textColor, fontSize: `${barcodeFontSize}px` }}
                          className="font-mono font-bold tracking-widest mt-0.5 leading-none"
                        >
                          {activeProduct.barcode}
                        </span>
                      )}
                    </div>

                    {/* Batch & Expiry */}
                    <div className="flex items-center justify-center gap-2 text-[8px] text-slate-500 font-mono">
                      {showBatchNumber && activeProduct.batchNumber && (
                        <span>Batch: {activeProduct.batchNumber}</span>
                      )}
                      {showExpiryDate && activeProduct.expiryDate && (
                        <span>Exp: {activeProduct.expiryDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-[11px] text-slate-400">
                {isKu ? 'گونجاوە لەگەڵ سەرجەم چاپکەرە گەرمییەکان و لەزگەکانی Xprinter, Zebra, Bixolon' : isAr ? 'متوافق مع طابعات الباركود والحرارية Xprinter, Zebra, Bixolon' : 'Compatible with all label & thermal printers'}
              </div>
            </div>

            {/* Dual Print Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDirectInAppPrint}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:brightness-110 text-white font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Printer className="w-5 h-5 text-amber-100 animate-bounce" />
                <span>{isKu ? `چاپکردنی ڕاستەوخۆ (${copiesCount} لەزگە)` : isAr ? `طباعة مباشرة الآن (${copiesCount} ملصق)` : `Direct Print Now (${copiesCount} Copies)`}</span>
              </button>

              <button
                type="button"
                onClick={handlePopupWindowPrint}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>{isKu ? 'چاپکردن لە پەنجەرەیەکی نوێدا' : isAr ? 'طباعة في نافذة منبثقة جديدة' : 'Print in New Popup Window'}</span>
              </button>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0B1120] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isKu ? 'ئامادەیە بۆ چاپ بە ڕوونی 203dpi / 300dpi' : isAr ? 'جاهز للطباعة بدقة 203dpi / 300dpi' : 'Ready for 203dpi / 300dpi printing'}</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
          >
            {isKu ? 'داخستن' : isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
