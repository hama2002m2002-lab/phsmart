import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Calculator, 
  Calendar, 
  Tag, 
  ShieldAlert, 
  Sparkles, 
  Plus, 
  Building2,
  Stethoscope,
  Pill,
  FlaskConical,
  Boxes,
  FileCheck,
  Info,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MapPin,
  Barcode as BarcodeIcon,
  Thermometer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Product, StoreSettings, Supplier } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { generateUniqueBarcode200245, findDuplicateBarcodeProduct } from '../lib/barcodeUtils';
import { DatePickerDDMMYYYY } from './DatePickerDDMMYYYY';
import { getCategoryName } from '../lib/translations';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: Product | null;
  onSave: (product: Product) => void;
  settings: StoreSettings;
  suppliers?: Supplier[];
  initialSupplierName?: string;
  existingProducts?: Product[];
}

const PHARMA_DEFAULT_CATEGORIES = [
  'أدوية ومسكنات (OTC / Rx)',
  'مضادات حيوية (Antibiotics)',
  'فيتامينات ومكملات (Vitamins & Supplements)',
  'أدوية الأمراض المزمنة (Chronic Care)',
  'العناية بالبشرة والتجميل (Skincare)',
  'صحة الأم والطفل (Mother & Baby)',
  'مستلزمات وأجهزة طبية (Medical Supplies)',
  'قطرات ومستحضرات عيون وأذن (Ophthalmic & ENT)',
  'أدوية الجهاز الهضمي (Gastrointestinal)',
  'الألبان والمغذيات الطبية',
  'المنظفات والعناية الشخصية'
];

export const getSavedCategories = (): string[] => {
  try {
    const saved = localStorage.getItem('market_custom_categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...PHARMA_DEFAULT_CATEGORIES, ...parsed]));
      }
    }
  } catch (e) {
    console.error('Failed to parse custom categories', e);
  }
  return PHARMA_DEFAULT_CATEGORIES;
};

export const saveCustomCategoryToStorage = (newCat: string) => {
  if (!newCat || !newCat.trim()) return;
  const trimmed = newCat.trim();
  const current = getSavedCategories();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem('market_custom_categories', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom category', e);
    }
  }
};

export const formatDateDMY = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSave,
  settings,
  suppliers = [],
  initialSupplierName = '',
  existingProducts = [],
}) => {
  if (!isOpen) return null;
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const todayStr = new Date().toISOString().split('T')[0];

  // Guidance Banner Toggle State
  const [showGuidance, setShowGuidance] = useState<boolean>(false);

  // Dynamic Categories list
  const [categoriesList, setCategoriesList] = useState<string[]>(getSavedCategories());

  // Basic Product State
  const [barcode, setBarcode] = useState('');
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState('');
  const [supplierDelegate, setSupplierDelegate] = useState('');
  const [categoryAr, setCategoryAr] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  // 🏥 Pharmaceutical Fields (تعليمات وضوابط الصيدلية)
  const [scientificName, setScientificName] = useState(''); // الاسم العلمي (Active Ingredient)
  const [dosageForm, setDosageForm] = useState('500mg - أقراص'); // التركيز والشكل الدوائي
  const [pharmaCategory, setPharmaCategory] = useState<'OTC' | 'Rx' | 'Controlled' | 'Supplies' | 'Cosmetics'>('OTC'); // الفئة والترميز
  const [batchNumber, setBatchNumber] = useState(''); // رقم التشغيلة (Batch/Lot No)
  const [expiryAlertMonths, setExpiryAlertMonths] = useState<number>(6); // تنبيه قبل 6 أشهر
  const [blistersPerBox, setBlistersPerBox] = useState<number | ''>(2); // عدد الأشرطة داخل العلبة
  const [customBlisterPrice, setCustomBlisterPrice] = useState<number | ''>(''); // سعر بيع الشريط
  const [storageCondition, setStorageCondition] = useState<string>('room_temp'); // ظروف الحفظ والتخزين
  const [storageLocation, setStorageLocation] = useState<string>('رف الصيدلية A-1'); // مكان التخزين

  // Dates
  const [initialAddDate, setInitialAddDate] = useState(todayStr);
  const [lastEditDate, setLastEditDate] = useState(todayStr);
  const [expiryDate, setExpiryDate] = useState('');

  // Quantities & Packaging
  const [cartonsCount, setCartonsCount] = useState<number | ''>(''); // عدد العلب/الكراتين
  const [unitsPerCarton, setUnitsPerCarton] = useState<number | ''>(12); // عدد العلب بالكرتونة

  // Prices
  const [cartonPurchasePrice, setCartonPurchasePrice] = useState<number | ''>('');
  const [singleRetailPrice, setSingleRetailPrice] = useState<number | ''>('');
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('');
  const [cartonSellingPrice, setCartonSellingPrice] = useState<number | ''>('');

  // Blurred / Touched states for price validation on exit
  const [singleRetailBlurred, setSingleRetailBlurred] = useState(false);
  const [wholesaleBlurred, setWholesaleBlurred] = useState(false);
  const [cartonSellBlurred, setCartonSellBlurred] = useState(false);
  const [customBlisterBlurred, setCustomBlisterBlurred] = useState(false);

  useEffect(() => {
    const currentCategories = getSavedCategories();
    setBarcodeError(null);
    setSingleRetailBlurred(false);
    setWholesaleBlurred(false);
    setCartonSellBlurred(false);
    setCustomBlisterBlurred(false);

    if (productToEdit) {
      const prodCategory = productToEdit.categoryAr || productToEdit.category || 'أدوية ومسكنات (OTC / Rx)';
      if (prodCategory && !currentCategories.includes(prodCategory)) {
        currentCategories.push(prodCategory);
      }
      setCategoriesList(Array.from(new Set(currentCategories)));

      setBarcode(productToEdit.barcode || '');
      setNameAr(productToEdit.nameAr || productToEdit.name || '');
      setSupplierDelegate(productToEdit.supplierDelegate || productToEdit.supplierName || '');
      setCategoryAr(prodCategory);

      // Pharma fields populate
      setScientificName(productToEdit.scientificName || '');
      setDosageForm(productToEdit.dosageForm || '500mg - أقراص');
      setPharmaCategory((productToEdit.pharmaCategory as any) || 'OTC');
      setBatchNumber(productToEdit.batchNumber || '');
      setExpiryAlertMonths(productToEdit.expiryAlertMonths || 6);
      setBlistersPerBox(productToEdit.blistersPerBox || 2);
      setCustomBlisterPrice(productToEdit.blisterPrice !== undefined ? productToEdit.blisterPrice : '');
      setStorageCondition(productToEdit.storageCondition || 'room_temp');
      setStorageLocation(productToEdit.storageLocation || 'رف الصيدلية A-1');

      setInitialAddDate(productToEdit.initialAddDate || todayStr);
      setLastEditDate(todayStr);
      setExpiryDate(productToEdit.expiryDate || '');
      
      setCartonsCount(productToEdit.cartonsCount || 1);
      setUnitsPerCarton(productToEdit.unitsPerCarton || 12);

      setCartonPurchasePrice(productToEdit.cartonPurchasePrice || (productToEdit.cost ? productToEdit.cost * (productToEdit.unitsPerCarton || 12) : ''));
      setSingleRetailPrice(productToEdit.singleRetailPrice || productToEdit.price || '');
      setWholesalePrice(productToEdit.wholesalePrice || '');
      setCartonSellingPrice(productToEdit.cartonSellingPrice || '');
    } else {
      setCategoriesList(Array.from(new Set(currentCategories)));
      const uniqueBar = generateUniqueBarcode200245(existingProducts);
      const randBatch = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      setBarcode(uniqueBar);
      setNameAr('');
      setSupplierDelegate(initialSupplierName || '');
      setCategoryAr(currentCategories[0] || 'أدوية ومسكنات (OTC / Rx)');
      
      setScientificName('');
      setDosageForm('500mg - أقراص');
      setPharmaCategory('OTC');
      setBatchNumber(randBatch);
      setExpiryAlertMonths(6);
      setBlistersPerBox(2);
      setCustomBlisterPrice('');
      setStorageCondition('room_temp');
      setStorageLocation('رف الصيدلية A-1');

      setInitialAddDate(todayStr);
      setLastEditDate(todayStr);
      setExpiryDate('');

      setCartonsCount('');
      setUnitsPerCarton(12);

      setCartonPurchasePrice('');
      setSingleRetailPrice('');
      setWholesalePrice('');
      setCartonSellingPrice('');
    }
  }, [productToEdit, isOpen]);

  // Derived Automatic Calculations
  const numCartons = Number(cartonsCount) || 0;
  const numUnitsPerCarton = Number(unitsPerCarton) || 1;
  const totalUnits = numCartons * numUnitsPerCarton; // مجموع العلب الكلية

  const cartonCost = Number(cartonPurchasePrice) || 0;
  const costPerUnit = numUnitsPerCarton > 0 ? cartonCost / numUnitsPerCarton : 0; // سعر تكلفة العلبة الواحدة

  const singleRetail = Number(singleRetailPrice) || 0; // سعر بيع العلبة مفرد
  const singleProfit = singleRetail - costPerUnit; // ربح بيع العلبة

  const wholesale = Number(wholesalePrice) || 0;
  const wholesaleProfit = wholesale - costPerUnit;

  const cartonSell = Number(cartonSellingPrice) || 0;
  const cartonProfit = cartonSell - cartonCost;

  // Validation flags: Selling price must not be lower than cost
  const isSingleRetailBelowCost = costPerUnit > 0 && singleRetailPrice !== '' && singleRetail < costPerUnit;
  const isWholesaleBelowCost = costPerUnit > 0 && wholesalePrice !== '' && wholesale > 0 && wholesale < costPerUnit;
  const isCartonSellBelowCost = cartonCost > 0 && cartonSellingPrice !== '' && cartonSell > 0 && cartonSell < cartonCost;

  // 🏥 Sub-unit / Blister calculations (تجزئة العلبة بالأشرطة)
  const numBlisters = Number(blistersPerBox) || 1;
  const calculatedBlisterPrice = numBlisters > 0 ? singleRetail / numBlisters : 0;
  const finalBlisterPrice = customBlisterPrice !== '' ? Number(customBlisterPrice) : calculatedBlisterPrice;
  const blisterCost = numBlisters > 0 ? costPerUnit / numBlisters : costPerUnit;
  const blisterProfit = finalBlisterPrice - blisterCost;
  const isBlisterBelowCost = blisterCost > 0 && customBlisterPrice !== '' && Number(customBlisterPrice) < blisterCost;

  // 🏥 Expiry Date Warning Calculation (تنبيه 6 أشهر)
  const getExpiryStatus = () => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    const today = new Date();
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);

    if (diffDays <= 0) {
      return { 
        status: 'expired', 
        label: isKu ? 'بەسەرچووە! (ئاگاداری گرنگ)' : isAr ? 'منتهي الصلاحية! (تنبيه حرِج)' : 'Expired! (Critical)', 
        color: 'bg-rose-500/20 text-rose-300 border-rose-500/50' 
      };
    }
    if (diffMonths <= expiryAlertMonths) {
      return { 
        status: 'warning', 
        label: isKu ? `ئاگاداری بەسەرچوونی نزیک: ${diffMonths} مانگ ماوە (${diffDays} ڕۆژ)` : isAr ? `تنبيه صلاحية قريبة: متبقي ${diffMonths} شهر (${diffDays} يوم)` : `Expiry Warning: ${diffMonths} months remaining (${diffDays} days)`, 
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
      };
    }
    return { 
      status: 'valid', 
      label: isKu ? `بەروار دروستە: ${diffMonths} مانگ ماوە` : isAr ? `الصلاحية سارية: متبقي ${diffMonths} شهر` : `Valid: ${diffMonths} months remaining`, 
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
    };
  };

  const expiryStatusInfo = getExpiryStatus();

  // Real-time duplicate barcode detection
  const duplicateProduct = findDuplicateBarcodeProduct(barcode, existingProducts, productToEdit?.id);

  const handleBarcodeChange = (newVal: string) => {
    setBarcodeError(null);
    const trimmed = newVal.trim();

    if (!trimmed) {
      setBarcode('');
      return;
    }

    // Check if barcode belongs to an existing product
    const existingDuplicate = findDuplicateBarcodeProduct(trimmed, existingProducts, productToEdit?.id);

    if (existingDuplicate) {
      const existingName = existingDuplicate.nameKu || existingDuplicate.nameAr || existingDuplicate.name;
      const errorMsg = isKu
        ? `⚠️ بارکۆدی (${trimmed}) پێشتر بۆ کاڵای (${existingName}) تۆمارکراوە - ڕێگری لێکرا!`
        : isAr
        ? `⚠️ الباركود (${trimmed}) مسجل مسبقاً لمادة (${existingName}) - تم حظر التعبئة!`
        : `⚠️ Barcode (${trimmed}) is already used by (${existingName}) - Blocked!`;

      setBarcodeError(errorMsg);

      // Alert immediately
      alert(
        isKu
          ? `⚠️ ئاگاداری ڕێگریکردن لە دووبارەبوونەوە:\n\nبارکۆدی (${trimmed}) پێشتر بۆ دەرمانێکی تر لە سیستمدا تۆمارکراوە:\n📦 دەرمان: ${existingName}\n🏷️ پۆل: ${existingDuplicate.categoryAr || existingDuplicate.category}\n\n❌ ڕێگری لە پڕکردنەوەی ئەم بارکۆدە کرا بۆ پاراستنی داتابەیس.`
          : isAr
          ? `⚠️ تنبيه حظر التكرار:\n\nالباركود (${trimmed}) مسجل بالفعل لمادة أخرى في المنظومة:\n📦 المادة: ${existingName}\n🏷️ الفئة: ${existingDuplicate.categoryAr || existingDuplicate.category}\n\n❌ تم منع تعبئة حقل الباركود بهذا الباركود لمنع التكرار في قاعدة البيانات.`
          : `⚠️ Duplicate Barcode Blocked:\n\nBarcode (${trimmed}) is assigned to (${existingName}).\n\n❌ Blocked from filling duplicate barcode!`
      );

      // Refuse to fill the duplicate barcode!
      setBarcode('');
      return;
    }

    setBarcode(newVal);
  };

  const handleGenerateBarcode = () => {
    const newBar = generateUniqueBarcode200245(existingProducts, barcode);
    setBarcode(newBar);
    setBarcodeError(null);
  };

  const handleGenerateBatch = () => {
    const newBatch = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setBatchNumber(newBatch);
  };

  const handleAddCategory = () => {
    if (!customCategory.trim()) return;
    const newCat = customCategory.trim();
    saveCustomCategoryToStorage(newCat);
    if (!categoriesList.includes(newCat)) {
      setCategoriesList(prev => [...prev, newCat]);
    }
    setCategoryAr(newCat);
    setCustomCategory('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;

    if (!barcode.trim()) {
      alert(
        isKu
          ? '❌ پاشەکەوت ناکرێت! بەشی بارکۆد بەتاڵە. تکایە دوو کرتە بکە بۆ دروستکردنی بارکۆدی نوێ.'
          : isAr
          ? '❌ لا يمكن الحفظ! حقل الباركود فارغ. يرجى توليد باركود تلقائي أو إدخال باركود غير مكرر.'
          : 'Cannot save! Barcode is empty.'
      );
      return;
    }

    if (duplicateProduct) {
      alert(
        isKu
          ? `❌ پاشەکەوت ناکرێت! بارکۆدی (${barcode}) پێشتر بۆ دەرمانی (${duplicateProduct.nameKu || duplicateProduct.nameAr || duplicateProduct.name}) بەکارهاتووە.\nتکایە بارکۆدێکی تر بنووسە یان کرتە لەسەر "دروستکردن" بکە.`
          : isAr
          ? `❌ لا يمكن الحفظ! الباركود (${barcode}) مستخدم بالفعل للمادة (${duplicateProduct.nameAr || duplicateProduct.name}).\nيرجى إدخال باركود آخر أو الضغط على "توليد" لإنشاء باركود جديد يبدأ بـ 200245.`
          : `Cannot save! Barcode ${barcode} is already used for ${duplicateProduct.name}.`
      );
      setBarcode('');
      return;
    }

    // 🛡️ Strict Validation: Selling Price must not be lower than Purchase Cost
    if (costPerUnit > 0 && singleRetail < costPerUnit) {
      setSingleRetailBlurred(true);
      alert(
        isKu
          ? `❌ پاشەکەوت ناکرێت!\n\nنرخی فرۆشتنی تاک (${formatNumber(singleRetail)} ${settings.currencySymbol}) کەمترە لە نرخی تێچووی کڕین (${formatNumber(costPerUnit)} ${settings.currencySymbol})!\n\nتکایە نرخی فرۆشتن بکە بە زیاتر لە نرخی تێچوو بۆ ڕێگریکردن لە تۆمارکردنی زیانی دارایی.`
          : isAr
          ? `❌ لا يمكن حفظ المادة!\n\nسعر بيع المفرد (${formatNumber(singleRetail)} ${settings.currencySymbol}) أقل من سعر التكلفة والشراء (${formatNumber(costPerUnit)} ${settings.currencySymbol})!\n\nيرجى تعديل سعر البيع ليكون مساوياً أو أعلى من سعر التكلفة لمنع تسجيل خسائر في الحسابات والأرباح.`
          : `❌ Cannot save product!\n\nRetail selling price (${formatNumber(singleRetail)}) is lower than cost (${formatNumber(costPerUnit)}).\n\nPlease increase the selling price to be equal to or higher than the purchase cost.`
      );
      return;
    }

    if (cartonCost > 0 && cartonSell > 0 && cartonSell < cartonCost) {
      setCartonSellBlurred(true);
      alert(
        isKu
          ? `❌ پاشەکەوت ناکرێت!\n\nنرخی فرۆشتنی کارتۆن (${formatNumber(cartonSell)} ${settings.currencySymbol}) کەمترە لە نرخی کڕینی کارتۆن (${formatNumber(cartonCost)} ${settings.currencySymbol})!`
          : isAr
          ? `❌ لا يمكن حفظ المادة!\n\nسعر بيع الكرتون الكامل (${formatNumber(cartonSell)} ${settings.currencySymbol}) أقل من سعر شراء الكرتون (${formatNumber(cartonCost)} ${settings.currencySymbol})!`
          : `❌ Cannot save product! Carton selling price is lower than carton purchase cost.`
      );
      return;
    }

    if (costPerUnit > 0 && wholesale > 0 && wholesale < costPerUnit) {
      setWholesaleBlurred(true);
      alert(
        isKu
          ? `❌ پاشەکەوت ناکرێت!\n\nنرخی فرۆشتنی کۆ (${formatNumber(wholesale)} ${settings.currencySymbol}) کەمترە لە نرخی تێچووی کڕین (${formatNumber(costPerUnit)} ${settings.currencySymbol})!`
          : isAr
          ? `❌ لا يمكن حفظ المادة!\n\nسعر بيع الجملة (${formatNumber(wholesale)} ${settings.currencySymbol}) أقل من سعر التكلفة (${formatNumber(costPerUnit)} ${settings.currencySymbol})!`
          : `❌ Cannot save product! Wholesale price is lower than unit cost.`
      );
      return;
    }

    if (blisterCost > 0 && customBlisterPrice !== '' && Number(customBlisterPrice) < blisterCost) {
      setCustomBlisterBlurred(true);
      alert(
        isKu
          ? `❌ پاشەکەوت ناکرێت!\n\nنرخی فرۆشتنی شریت کەمترە لە تێچووی کڕینی شریت!`
          : isAr
          ? `❌ لا يمكن حفظ المادة!\n\nسعر بيع الشريط (${Number(customBlisterPrice)}) أقل من تكلفة الشريط (${formatNumber(blisterCost)})!`
          : `❌ Cannot save product! Blister price is lower than blister cost.`
      );
      return;
    }

    let finalCategory = categoryAr;
    if (customCategory.trim()) {
      finalCategory = customCategory.trim();
      saveCustomCategoryToStorage(finalCategory);
      if (!categoriesList.includes(finalCategory)) {
        setCategoriesList(prev => [...prev, finalCategory]);
      }
    }

    const matchedSupplier = suppliers.find(s => 
      s.name === supplierDelegate || 
      s.nameAr === supplierDelegate || 
      s.contactPerson === supplierDelegate ||
      (supplierDelegate && (
        s.name.toLowerCase().includes(supplierDelegate.toLowerCase()) ||
        s.nameAr.includes(supplierDelegate) ||
        s.contactPerson.includes(supplierDelegate)
      ))
    );

    const priceChanged = productToEdit
      ? (productToEdit.singleRetailPrice !== singleRetail || productToEdit.costPerUnit !== Number(costPerUnit.toFixed(2)))
      : true;

    const existingHistory = productToEdit?.priceHistory || [];
    let updatedHistory = [...existingHistory];

    if (priceChanged && productToEdit) {
      updatedHistory.unshift({
        date: new Date().toISOString(),
        oldPrice: productToEdit.singleRetailPrice,
        newPrice: singleRetail,
        oldCost: productToEdit.costPerUnit,
        newCost: Number(costPerUnit.toFixed(2)),
        updatedBy: 'الصيدلي / الكاشير'
      });
    } else if (!productToEdit) {
      updatedHistory = [{
        date: new Date().toISOString(),
        oldPrice: singleRetail,
        newPrice: singleRetail,
        oldCost: Number(costPerUnit.toFixed(2)),
        newCost: Number(costPerUnit.toFixed(2)),
        updatedBy: 'إضافة أولية'
      }];
    }

    const lastPriceUpdateDate = priceChanged 
      ? new Date().toISOString() 
      : (productToEdit?.lastPriceUpdate || productToEdit?.lastEditDate || new Date().toISOString());

    const finalProduct: Product = {
      id: productToEdit ? productToEdit.id : `prod-${Date.now()}`,
      name: nameAr,
      nameAr: nameAr,
      category: finalCategory,
      categoryAr: finalCategory,
      barcode: barcode || `6281007${Date.now().toString().slice(-6)}`,
      supplierDelegate: supplierDelegate,
      cartonsCount: numCartons,
      unitsPerCarton: numUnitsPerCarton,
      totalUnits: totalUnits,
      cartonPurchasePrice: cartonCost,
      lastPurchasePrice: productToEdit?.lastPurchasePrice || Number(costPerUnit.toFixed(2)),
      lastCartonPurchasePrice: productToEdit?.lastCartonPurchasePrice || cartonCost,
      costPerUnit: Number(costPerUnit.toFixed(2)),
      singleRetailPrice: singleRetail,
      wholesalePrice: wholesale,
      cartonSellingPrice: cartonSell,
      singleProfit: Number(singleProfit.toFixed(2)),
      wholesaleProfit: Number(wholesaleProfit.toFixed(2)),
      cartonProfit: Number(cartonProfit.toFixed(2)),
      initialAddDate: productToEdit?.initialAddDate || initialAddDate || todayStr,
      lastEditDate: todayStr, // Automatically updates to today's date upon saving any modification!
      lastPriceUpdate: lastPriceUpdateDate,
      priceHistory: updatedHistory,
      expiryDate: expiryDate,

      // 🏥 Pharmaceutical Specific Fields
      scientificName: scientificName.trim(),
      dosageForm: dosageForm,
      pharmaCategory: pharmaCategory,
      batchNumber: batchNumber || `BATCH-${Date.now().toString().slice(-6)}`,
      expiryAlertMonths: expiryAlertMonths,
      blistersPerBox: numBlisters,
      blisterPrice: Number(finalBlisterPrice.toFixed(2)),
      storageCondition: storageCondition,
      storageLocation: storageLocation,
      
      // POS Compatibility
      price: singleRetail,
      cost: Number(costPerUnit.toFixed(2)),
      stock: totalUnits,
      minStock: 10,
      unit: 'علبة',
      supplierId: matchedSupplier ? matchedSupplier.id : (productToEdit?.supplierId || 'sup-1'),
      supplierName: supplierDelegate || (matchedSupplier ? matchedSupplier.nameAr : 'مذخر الأدوية الرئيسي'),
      imageIcon: '💊',
      status: totalUnits === 0 ? 'out_of_stock' : totalUnits <= 10 ? 'low_stock' : 'in_stock'
    };

    onSave(finalProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-1 sm:p-2 overflow-y-auto" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {/* Modal Container - Full Screen */}
      <div className="cyber-card p-3 sm:p-4 rounded-2xl border border-cyan-500/40 w-full h-full max-w-[99vw] max-h-[98vh] bg-[#0a1120] text-slate-100 relative animate-scaleUp shadow-2xl my-auto overflow-y-auto flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
                <span>
                  {isKu 
                    ? 'سیستەمی تۆمارکردنی دەرمان و ماددە پزیشکییەکان' 
                    : isAr 
                    ? 'واجهة إدخال وتدقيق المواد الدوائية والطبية' 
                    : 'Pharmaceutical Product Entry Interface'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                  {isKu ? 'سیستەمی ستانداردی دەرمانخانە' : isAr ? 'نظام الصيدلية المعياري' : 'Pharmacy POS Standard'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isKu
                  ? 'تۆمارکردنی ورد بۆ پێکهاتەی دەرمانی، ژمارەی وەجبە (Batch)، بڕی کارتۆن و قوتوو، تێچوو و مەرجەکانی هەڵگرتن'
                  : isAr
                  ? 'إدخال دقيق للبيانات الطبية، رقم التشغيلة، كميات العلب والكراتين، التكلفة وظروف التخزين'
                  : 'Precision entry for active ingredients, batch tracking, carton & box breakdown & storage parameters'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuidance(!showGuidance)}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Info className="w-4 h-4 text-cyan-400" />
              <span>{isKu ? 'ڕێنمایی و کۆنتڕۆڵی دەرمانسازی' : isAr ? 'ضوابط التدقيق الدوائي' : 'Pharma Controls'}</span>
              {showGuidance ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
              title={isKu ? 'داخستن' : isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 🏥 COLLAPSIBLE PHARMACIST GUIDANCE BANNER (تعليمات ضوابط وتدقيق إدخال المواد الدوائية) */}
        {showGuidance && (
          <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-[#0e1c38] to-cyan-950/80 border border-cyan-500/30 text-xs space-y-2 animate-fadeIn shadow-inner">
            <div className="flex items-center justify-between border-b border-cyan-800/40 pb-2">
              <span className="font-black text-cyan-300 text-xs sm:text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                {isKu ? '🏥 ڕێنمایی و کۆنتڕۆڵی دەرمانساز بۆ تۆمارکردنی دەرمان:' : isAr ? '🏥 تعليمات ضوابط وتدقيق إدخال المواد الدوائية للصيدلي:' : '🏥 Pharmacy Standard Operating Protocol (SOP):'}
              </span>
              <span className="text-[11px] text-cyan-400/80 font-mono">Pharmacy Standard Operating Protocol (SOP)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-1 text-[11px] leading-relaxed">
              {/* 1. البيانات الطبية */}
              <div className="bg-[#0b1324]/80 p-2.5 rounded-xl border border-blue-500/20 space-y-1">
                <div className="font-bold text-cyan-300 flex items-center gap-1">
                  <Pill className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isKu ? '١. زانیارییە پزیشکی و دەرمانسازییەکان:' : isAr ? '1. البيانات الطبية والدوائية:' : '1. Scientific & Medical Data:'}</span>
                </div>
                <ul className="text-slate-300 space-y-0.5 list-disc list-inside text-[10.5px]">
                  <li>{isKu ? 'ناوی زانستی (Active Ingredient) زۆرەملێیە.' : isAr ? 'الاسم العلمي (Active Ingredient) إجباري.' : 'Active Ingredient is required.'}</li>
                  <li>{isKu ? 'خەستی و شێوە (500mg - حەب / شرووب).' : isAr ? 'التركيز والشكل (500mg - أقراص / شراب).' : 'Strength & form (500mg - Tablets / Syrup).'}</li>
                  <li>{isKu ? 'پۆلێن و کۆد (OTC / Rx / چاودێریکراو).' : isAr ? 'الفئة والترميز (OTC / Rx / مراقبة).' : 'Category (OTC / Rx / Controlled).'}</li>
                </ul>
              </div>

              {/* 2. التشغيلات والصلاحية */}
              <div className="bg-[#0b1324]/80 p-2.5 rounded-xl border border-amber-500/20 space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isKu ? '٢. وەجبە و بەسەرچوون (Batch):' : isAr ? '2. التشغيلات والصلاحية (Batch):' : '2. Batch & Expiry:'}</span>
                </div>
                <ul className="text-slate-300 space-y-0.5 list-disc list-inside text-[10.5px]">
                  <li>{isKu ? 'ژمارەی وەجبە (Batch No) گرنگە.' : isAr ? 'رقم التشغيلة (Batch/Lot No) إجباري.' : 'Batch/Lot number is tracked.'}</li>
                  <li>{isKu ? 'بەرواری بەسەرچوون پەیوەستە بە Batch.' : isAr ? 'تاريخ الصلاحية يربط بالـ Batch.' : 'Expiry date linked to batch.'}</li>
                  <li>{isKu ? 'ئاگاداری ڕەنگاوڕەنگ ٦ مانگ پێش بەسەرچوون.' : isAr ? 'تنبيه تلقائي ملون قبل 6 أشهر من الانتهاء.' : 'Color-coded alert 6 months before expiry.'}</li>
                </ul>
              </div>

              {/* 3. الوحدات والتعبئة */}
              <div className="bg-[#0b1324]/80 p-2.5 rounded-xl border border-emerald-500/20 space-y-1">
                <div className="font-bold text-emerald-300 flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isKu ? '٣. یەکە و پاکێجی کارتۆن:' : isAr ? '3. الوحدات والتعبئة بالكرتون:' : '3. Units & Packaging:'}</span>
                </div>
                <ul className="text-slate-300 space-y-0.5 list-disc list-inside text-[10.5px]">
                  <li>{isKu ? 'جیاکردنەوەی قوتوو و کارتۆن.' : isAr ? 'العبوة والكرتون (علبة / كرتون).' : 'Box & Carton breakdowns.'}</li>
                  <li>{isKu ? 'دیاریکردنی ژمارەی قوتوو لە کارتۆندا.' : isAr ? 'تحديد عدد العلب بالكرتونة والشدات.' : 'Boxes per carton count.'}</li>
                  <li>{isKu ? 'حیسابکردنی ئۆتۆماتیکی تێچوو و قازانج.' : isAr ? 'حساب تلقائي لتكلفة العلبة وربح الكرتون.' : 'Auto unit cost & carton margin.'}</li>
                </ul>
              </div>

              {/* 4. ظروف التخزين */}
              <div className="bg-[#0b1324]/80 p-2.5 rounded-xl border border-purple-500/20 space-y-1">
                <div className="font-bold text-purple-300 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-purple-400" />
                  <span>{isKu ? '٤. مەرجەکانی هەڵگرتن:' : isAr ? '4. ظروف الحفظ والتخزين:' : '4. Storage & Shelf:'}</span>
                </div>
                <ul className="text-slate-300 space-y-0.5 list-disc list-inside text-[10.5px]">
                  <li>{isKu ? 'شوێنی هەڵگرتن (ڕەفەی دەرمانخانە / کۆگا).' : isAr ? 'مكان التخزين (رف الصيدلية / المخزن).' : 'Shelf location in pharmacy/store.'}</li>
                  <li>{isKu ? 'مەرجی پلەی گەرمی (سەلاجە 2°C-8°C / ژوور).' : isAr ? 'متطلبات التبريد (ثلاجة 2°C-8°C / غرف).' : 'Refrigeration (2°C-8°C / room temp).'}</li>
                  <li>{isKu ? 'پاراستن لە ڕووناکی و شێ.' : isAr ? 'الحماية من الضوء والحرارة المرتفعة.' : 'Protect from light and heat.'}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5 text-xs pt-2">

          {/* SECTION 1: MEDICAL & PHARMACEUTICAL DATA (البيانات الطبية والدوائية الأساسية) */}
          <div className="bg-[#10192d] p-2.5 rounded-2xl border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 flex-wrap gap-2">
              <h3 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-cyan-400" />
                {isKu ? '١. زانیارییە سەرەکییە پزیشکی و دەرمانسازییەکان' : isAr ? '1. البيانات الطبية والدوائية الأساسية' : '1. Scientific & Medical Information'}
              </h3>
              
              {/* Read-only Entry & Last Edit Dates */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0a1120] border border-slate-700/80 text-[11px] select-none shadow-sm" title={isKu ? 'بەرواری تۆمارکردنی دەرمان' : isAr ? 'تاريخ إضافة المادة (للقراءة فقط)' : 'Creation Date (Read-only)'}>
                  <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-slate-400 font-bold">{isKu ? 'تۆمارکردن:' : isAr ? 'الإدخال:' : 'Entry:'}</span>
                  <span className="font-mono font-bold text-cyan-300 tracking-wide">{formatDateDMY(initialAddDate)}</span>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0a1120] border border-slate-700/80 text-[11px] select-none shadow-sm" title={isKu ? 'بەرواری دوا دەستکاری - لە کاتی پاشەکەوتکردندا نوێ دەبێتەوە' : isAr ? 'تاريخ آخر تعديل - يتم تحديثه تلقائياً عند حفظ التعديلات' : 'Last Edit Date - updates automatically on save'}>
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-slate-400 font-bold">{isKu ? 'دوا دەستکاری:' : isAr ? 'آخر تعديل:' : 'Last Edit:'}</span>
                  <span className="font-mono font-bold text-amber-300 tracking-wide">{formatDateDMY(lastEditDate || todayStr)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              
              {/* Barcode */}
              <div className="md:col-span-4">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10.5px]">
                  {isKu ? 'بارکۆدی نێودەوڵەتی دەرمان' : isAr ? 'الباركود الدولي للمادة' : 'Barcode'} <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={(e) => handleBarcodeChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (barcode) handleBarcodeChange(barcode);
                      }
                    }}
                    onBlur={() => {
                      if (barcode) handleBarcodeChange(barcode);
                    }}
                    onDoubleClick={handleGenerateBarcode}
                    title={isKu ? 'دوو کرتە لەناو خانەکە بکە یان دوگمەی دروستکردن دابگرە بۆ دروستکردنی بارکۆدی تایبەت' : isAr ? 'انقر مرتين داخل الحقل أو اضغط زر توليد لإنشاء باركود جديد غير مكرر' : 'Double click or press generate for new unique barcode'}
                    placeholder={isKu ? 'بپشکنە یان دوو کرتە بکە بۆ دروستکردنی بارکۆد' : isAr ? 'امسح أو انقر مرتين لتوليد باركود' : 'Scan or double click to generate'}
                    className={`w-full bg-[#0a1120] font-mono font-bold py-1 px-2 rounded-xl border focus:outline-none text-xs transition-colors cursor-pointer ${
                      barcodeError || duplicateProduct
                        ? 'border-rose-500 text-rose-300 bg-rose-950/30 ring-2 ring-rose-500/50'
                        : 'border-cyan-500/30 text-cyan-300 focus:border-cyan-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="px-2 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-[10px] font-bold whitespace-nowrap border border-cyan-400/40 cursor-pointer flex items-center gap-1 shrink-0 shadow-sm active:scale-95"
                    title={isKu ? 'دروستکردنی بارکۆدی تایبەتی نوێ' : isAr ? 'توليد باركود جديد كاملاً وغير مكرر مع حظر المحفوظات' : 'Generate unique barcode'}
                  >
                    <Sparkles className="w-3 h-3 text-cyan-200" />
                    <span>{isKu ? 'دروستکردن' : isAr ? 'توليد' : 'Generate'}</span>
                  </button>
                </div>
                {(barcodeError || duplicateProduct) && (
                  <div className="mt-1 text-[9.5px] font-bold text-rose-300 flex items-center gap-1 bg-rose-500/15 p-1 rounded-lg border border-rose-500/40 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>
                      {barcodeError || (isKu ? `بۆ کاڵای (${duplicateProduct?.nameKu || duplicateProduct?.nameAr || duplicateProduct?.name}) تۆمارکراوە` : `مستخدم لمادة (${duplicateProduct?.nameAr || duplicateProduct?.name}) - تم حظر التكرار`)}
                    </span>
                  </div>
                )}
              </div>

              {/* Trade Product Name */}
              <div className="md:col-span-4">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10.5px]">
                  {isKu ? 'ناوی بازرگانی دەرمان' : isAr ? 'الاسم التجاري للمادة الدوائية' : 'Product Trade Name'} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder={isKu ? 'نموونە: پانادۆڵ ئێکسترا / Amoxil 500' : isAr ? 'مثال: بندول اكسترا / Amoxil 500' : 'e.g. Panadol Extra / Amoxil 500'}
                  className="w-full bg-[#0a1120] text-slate-100 py-1 px-2 rounded-xl border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
                />
              </div>

              {/* Scientific Name (Active Ingredient) */}
              <div className="md:col-span-4">
                <label className="text-cyan-300 mb-0.5 block font-bold text-[10.5px]">
                  {isKu ? 'ناوی زانستی (Active Ingredient)' : isAr ? 'الاسم العلمي (Active Ingredient)' : 'Scientific Name'} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={scientificName}
                  onChange={(e) => setScientificName(e.target.value)}
                  placeholder={isKu ? 'نموونە: Paracetamol + Caffeine' : isAr ? 'مثال: Paracetamol + Caffeine' : 'e.g. Paracetamol + Caffeine'}
                  className="w-full bg-[#0a1120] text-emerald-300 font-mono py-1 px-2 rounded-xl border border-emerald-500/40 focus:outline-none focus:border-emerald-400 text-xs"
                />
              </div>

            </div>

            {/* Classification & Category */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-0.5">
              
              {/* Dosage Form & Strength */}
              <div className="md:col-span-3">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10.5px]">
                  {isKu ? 'خەستی و شێوەی دەرمان' : isAr ? 'التركيز والشكل الدوائي' : 'Strength & Dosage Form'}
                </label>
                <input
                  type="text"
                  value={dosageForm}
                  onChange={(e) => setDosageForm(e.target.value)}
                  placeholder={isKu ? 'نموونە: 500mg - حەب / شرووب' : isAr ? 'مثال: 500mg - أقراص' : 'e.g. 500mg - Tablets'}
                  className="w-full bg-[#0a1120] text-slate-200 py-1 px-2 rounded-xl border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs"
                />
              </div>

              {/* Pharma Classification (OTC / Rx / Controlled / Supplies) */}
              <div className="md:col-span-3">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10.5px]">
                  {isKu ? 'پۆلێن و کۆدی دەرمان' : isAr ? 'الفئة والترميز الدوائي' : 'Pharma Classification'}
                </label>
                <select
                  value={pharmaCategory}
                  onChange={(e) => setPharmaCategory(e.target.value as any)}
                  className="w-full bg-[#0a1120] text-slate-200 py-1 px-2 rounded-xl border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs font-bold"
                >
                  <option value="OTC">{isKu ? 'OTC - دەرمانی بێ ڕەچەتە' : isAr ? 'OTC - أدوية بدون وصفة' : 'OTC - Over The Counter'}</option>
                  <option value="Rx">{isKu ? 'Rx - دەرمانی بە ڕەچەتەی پزیشک' : isAr ? 'Rx - أدوية بوصفة طبية' : 'Rx - Prescription Only'}</option>
                  <option value="Controlled">{isKu ? 'Controlled - دەرمانی چاودێریکراو' : isAr ? 'Controlled - أدوية مراقبة' : 'Controlled Medicine'}</option>
                  <option value="Supplies">{isKu ? 'Medical Supplies - پێداویستی پزیشکی' : isAr ? 'Medical Supplies - مستلزمات طبية' : 'Medical Supplies'}</option>
                  <option value="Cosmetics">{isKu ? 'Cosmetics - چاودێری و جوانکاری' : isAr ? 'Cosmetics - منتجات عناية' : 'Cosmetics & Skincare'}</option>
                </select>
              </div>

              {/* Pharmacy Category */}
              <div className="md:col-span-3">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10.5px]">
                  {isKu ? 'پۆلێنی ناو دەرمانخانە' : isAr ? 'التصنيف الدوائي بالصيدلية' : 'Pharmacy Category'}
                </label>
                <div className="flex gap-1">
                  <select
                    value={categoryAr}
                    onChange={(e) => setCategoryAr(e.target.value)}
                    className="w-full bg-[#0a1120] text-slate-200 py-1 px-1.5 rounded-xl border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryName(cat, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Supplier / Agent */}
              <div className="md:col-span-3">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10.5px]">
                  {isKu ? 'کۆگای دەرمان / کۆمپانیای دابینکەر' : isAr ? 'مذخر الأدوية / الشركة الموردة' : 'Supplier / Drug Store'}
                </label>
                <input
                  type="text"
                  list="suppliers-datalist"
                  value={supplierDelegate}
                  onChange={(e) => setSupplierDelegate(e.target.value)}
                  placeholder={isKu ? 'ناوی کۆگا یان کۆمپانیا' : isAr ? 'اسم المذخر أو الشركة' : 'Drug store or supplier'}
                  className="w-full bg-[#0a1120] text-slate-200 py-1 px-2 rounded-xl border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs"
                />
                <datalist id="suppliers-datalist">
                  {suppliers.map(s => (
                    <React.Fragment key={s.id}>
                      <option value={s.nameAr} />
                      <option value={s.name} />
                      <option value={s.contactPerson} />
                    </React.Fragment>
                  ))}
                </datalist>
              </div>

            </div>
          </div>

          {/* SECTION 2: BATCH & EXPIRY SYSTEM (التشغيلات والتواريخ) */}
          <div className="bg-[#10192d] p-2.5 rounded-2xl border border-amber-500/30 space-y-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 flex-wrap gap-2">
              <h3 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{isKu ? '٢. وەجبەکان و بەرواری بەسەرچوون (Batch & Expiry)' : isAr ? '2. التشغيلات والتواريخ (Batch & Expiry)' : '2. Batch & Expiry Dates'}</span>
              </h3>
              {expiryStatusInfo && (
                <div className={`p-1 px-2.5 rounded-xl border text-[10.5px] font-bold flex items-center gap-1.5 ${expiryStatusInfo.color}`}>
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{expiryStatusInfo.label}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
              {/* 1. Batch Number / رقم التشغيلة */}
              <div className="md:col-span-5">
                <label className="text-amber-300 mb-0.5 block font-bold text-[10.5px]">
                  {isKu ? 'ژمارەی وەجبە (Batch No)' : isAr ? 'رقم التشغيلة / الوجبة (Batch No)' : 'Batch Number'} <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="BATCH-2026-X01"
                    className="w-full bg-[#0a1120] text-amber-300 font-mono font-bold py-1 px-2 rounded-xl border border-amber-500/30 focus:outline-none focus:border-amber-400 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateBatch}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-[10px] font-bold whitespace-nowrap border border-slate-700 cursor-pointer active:scale-95 transition-colors"
                  >
                    {isKu ? 'وەجبەی نوێ' : isAr ? 'وجبة جديدة' : 'New Batch'}
                  </button>
                </div>
              </div>

              {/* 2. Expiry Date / تاريخ انقضاء الصلاحية */}
              <div className="md:col-span-4">
                <label className="text-amber-300 mb-0.5 block font-bold text-[10.5px]">
                  {isKu ? 'بەرواری بەسەرچوون (ڕۆژ/مانگ/ساڵ)' : isAr ? 'تاريخ انقضاء الصلاحية (يوم/شهر/سنة)' : 'Expiry Date (DD/MM/YYYY)'} <span className="text-rose-400">*</span>
                </label>
                <DatePickerDDMMYYYY
                  value={expiryDate}
                  onChange={(dStr) => setExpiryDate(dStr)}
                  lang={isAr ? 'ar' : isKu ? 'ku' : 'en'}
                />
              </div>

              {/* 3. Alert Threshold / مدة التنبيه المبكر */}
              <div className="md:col-span-3">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10.5px] whitespace-nowrap">
                  {isKu ? 'ئاگاداری پێشوەختە (مانگ)' : isAr ? 'مدة التنبيه المبكر (بالأشهر)' : 'Alert (Months)'}
                </label>
                <div className="flex items-center gap-1.5 bg-[#0a1120] border border-amber-500/30 rounded-xl px-2 py-1 focus-within:border-amber-400">
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={expiryAlertMonths}
                    onChange={(e) => setExpiryAlertMonths(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent text-amber-300 font-mono font-bold text-[14px] text-center focus:outline-none"
                    placeholder="6"
                  />
                  <span className="text-[11px] text-slate-400 font-bold shrink-0">{isKu ? 'مانگ' : isAr ? 'أشهر' : 'mo'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: QUANTITIES & PURCHASING (كميات العلب والتعبئة بالكرتون) */}
          <div className="w-full">
            {/* Box & Carton Calculations */}
            <div className="bg-[#10192d] p-3 rounded-2xl border border-cyan-500/30 space-y-2">
              <h3 className="text-xs font-black text-cyan-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <Boxes className="w-4 h-4 text-cyan-400" />
                {isKu ? '٣. بڕی قوتووەکان، کارتۆن و تێچوو' : isAr ? 'كميات العلب والتعبئة بالكرتون والتكلفة' : 'Box Quantity, Packaging & Cost Breakdown'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <div>
                  <label className="text-slate-300 mb-1 block text-[10px] font-semibold">
                    {isKu ? 'کارتۆنەکان' : isAr ? 'الكراتين / الشدات' : 'Cartons'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cartonsCount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCartonsCount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#0a1120] text-white font-bold py-1.5 px-2 text-center rounded-xl border border-cyan-500/30 text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 mb-1 block text-[10px] font-semibold">
                    {isKu ? 'قوتوو / کارتۆن' : isAr ? 'علب / كرتونة' : 'Boxes/Carton'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={unitsPerCarton}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setUnitsPerCarton(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#0a1120] text-white font-bold py-1.5 px-2 text-center rounded-xl border border-cyan-500/30 text-xs"
                  />
                </div>

                <div className="bg-cyan-950/60 border border-cyan-500/40 py-2 px-2 rounded-xl text-center flex flex-col justify-center">
                  <span className="text-slate-400 text-[9px] font-semibold">
                    {isKu ? 'کۆی گشتی قوتووەکان' : isAr ? 'مجموع العلب' : 'Total Boxes'}
                  </span>
                  <span className="text-sm font-black text-cyan-300 font-mono">
                    {totalUnits} <span className="text-[10px] font-normal text-slate-400">{isKu ? 'قوتوو' : isAr ? 'علبة' : 'bxs'}</span>
                  </span>
                </div>
              </div>

              {/* Purchase Cost per Box & Carton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="text-slate-300 mb-1 block text-[10px] font-semibold">
                    {isKu ? 'تێچووی کڕینی کارتۆن' : isAr ? 'شراء الكرتون الكامل' : 'Carton Cost'} ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cartonPurchasePrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCartonPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#0a1120] text-amber-300 font-bold py-1.5 px-2 text-center rounded-xl border border-amber-500/30 text-xs"
                  />
                </div>

                <div className="bg-amber-950/50 border border-amber-500/40 py-1.5 px-2 rounded-xl text-center flex flex-col justify-center">
                  <span className="text-slate-300 text-[9px] font-semibold">
                    {isKu ? 'تێچووی یەک قوتوو' : isAr ? 'تكلفة العلبة الواحدة' : 'Box Cost'}
                  </span>
                  <span className="text-sm font-black text-amber-400 font-mono">
                    {settings.currencySymbol}{formatNumber(costPerUnit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SELLING PRICES & PROFIT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-slate-300 mb-0.5 block font-bold text-[10.5px]" style={{ fontSize: '12.5px', lineHeight: '26px' }}>
                {isKu ? 'نرخی فرۆشتنی تاک (بە کڕیار)' : isAr ? 'سعر بيع العلبة (مفرد للزبون)' : 'Retail Box Price'} ({settings.currencySymbol}) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                style={{ fontSize: '16px' }}
                value={singleRetailPrice}
                onFocus={(e) => e.target.select()}
                onBlur={() => setSingleRetailBlurred(true)}
                onChange={(e) => setSingleRetailPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className={`w-full font-bold py-1 px-2 text-center rounded-xl text-xs transition-all focus:outline-none ${
                  isSingleRetailBelowCost && singleRetailBlurred
                    ? 'bg-rose-950/60 text-rose-300 border-2 border-rose-500 ring-2 ring-rose-500/40'
                    : 'bg-[#10192d] text-emerald-400 border border-emerald-500/40 focus:border-emerald-400'
                }`}
              />
              {isSingleRetailBelowCost && singleRetailBlurred && (
                <div className="mt-1 p-1 px-1.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-[10px] font-bold text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    {isKu
                      ? `سعر کەمترە لە تێچوو (${formatNumber(costPerUnit)})!`
                      : isAr
                      ? `أقل من سعر التكلفة (${formatNumber(costPerUnit)})!`
                      : `Below cost (${formatNumber(costPerUnit)})!`}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-slate-300 mb-0.5 block font-bold text-[10.5px]" style={{ fontSize: '14.5px', lineHeight: '26px' }}>
                {isKu ? 'نرخی فرۆشتنی کۆ' : isAr ? 'سعر بيع العلبة (بالجملة)' : 'Wholesale Box Price'} ({settings.currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={wholesalePrice}
                onFocus={(e) => e.target.select()}
                onBlur={() => setWholesaleBlurred(true)}
                onChange={(e) => setWholesalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                className={`w-full font-bold py-1 px-2 text-center rounded-xl text-xs transition-all focus:outline-none ${
                  isWholesaleBelowCost && wholesaleBlurred
                    ? 'bg-rose-950/60 text-rose-300 border-2 border-rose-500 ring-2 ring-rose-500/40'
                    : 'bg-[#10192d] text-cyan-300 border border-cyan-500/30 focus:border-cyan-400'
                }`}
              />
              {isWholesaleBelowCost && wholesaleBlurred && (
                <div className="mt-1 p-1 px-1.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-[10px] font-bold text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    {isKu
                      ? `سعر کەمترە لە تێچوو (${formatNumber(costPerUnit)})!`
                      : isAr
                      ? `أقل من التكلفة (${formatNumber(costPerUnit)})!`
                      : `Below cost (${formatNumber(costPerUnit)})!`}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-slate-300 mb-0.5 block font-bold text-[10.5px]" style={{ fontSize: '14.5px', lineHeight: '26px' }}>
                {isKu ? 'نرخی فرۆشتنی کارتۆنی تەواو' : isAr ? 'سعر بيع الكرتون الكامل' : 'Carton Selling Price'} ({settings.currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cartonSellingPrice}
                onFocus={(e) => e.target.select()}
                onBlur={() => setCartonSellBlurred(true)}
                onChange={(e) => setCartonSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className={`w-full font-bold py-1 px-2 text-center rounded-xl text-xs transition-all focus:outline-none ${
                  isCartonSellBelowCost && cartonSellBlurred
                    ? 'bg-rose-950/60 text-rose-300 border-2 border-rose-500 ring-2 ring-rose-500/40'
                    : 'bg-[#10192d] text-purple-300 border border-purple-500/30 focus:border-purple-400'
                }`}
              />
              {isCartonSellBelowCost && cartonSellBlurred && (
                <div className="mt-1 p-1 px-1.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-[10px] font-bold text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    {isKu
                      ? `سعر کەمترە لە تێچووی کڕین (${formatNumber(cartonCost)})!`
                      : isAr
                      ? `أقل من كلفة الشراء (${formatNumber(cartonCost)})!`
                      : `Below cost (${formatNumber(cartonCost)})!`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* THREE AUTOMATIC PROFIT CALCULATION CARDS */}
          <div className="bg-[#0b1324] p-2 rounded-2xl border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-0.5">
              <span className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                {isKu ? 'قازانجی حیسابکراو بەشێوەی ئۆتۆماتیکی:' : isAr ? 'الأرباح المحسوبة تلقائياً:' : 'Automated Profit Breakdown:'}
              </span>
              <span className="text-[9.5px] text-slate-400 font-mono">Real-time Net Margins</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <div className="bg-[#050810] p-1.5 rounded-xl border border-emerald-500/20 text-center">
                <span className="text-[9.5px] text-slate-400 font-semibold block">
                  {isKu ? 'قازانجی تاکی قوتوو' : isAr ? 'ربح العلبة المفرد' : 'Single Profit'}
                </span>
                <span className={`text-xs font-black font-mono block ${singleProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {settings.currencySymbol}{formatNumber(singleProfit)}
                </span>
              </div>

              <div className="bg-[#050810] p-1.5 rounded-xl border border-cyan-500/20 text-center">
                <span className="text-[9.5px] text-slate-400 font-semibold block">
                  {isKu ? 'قازانجی کۆی قوتوو' : isAr ? 'ربح العلبة بالجملة' : 'Wholesale Profit'}
                </span>
                <span className={`text-xs font-black font-mono block ${wholesaleProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {settings.currencySymbol}{formatNumber(wholesaleProfit)}
                </span>
              </div>

              <div className="bg-[#050810] p-1.5 rounded-xl border border-purple-500/20 text-center">
                <span className="text-[9.5px] text-slate-400 font-semibold block">
                  {isKu ? 'قازانجی کارتۆنی تەواو' : isAr ? 'ربح الكرتون الكامل' : 'Carton Profit'}
                </span>
                <span className={`text-xs font-black font-mono block ${cartonProfit >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>
                  {settings.currencySymbol}{formatNumber(cartonProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: STORAGE & SHELF LOCATION (ظروف الحفظ والتخزين والمكان بالصيدلية) */}
          <div className="bg-[#10192d] p-2.5 rounded-2xl border border-purple-500/30 space-y-2 shadow-sm">
            <h3 className="text-xs font-black text-purple-300 flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Thermometer className="w-4 h-4 text-purple-400" />
              <span>{isKu ? '٤. مەرجەکانی هەڵگرتن و شوێنی ڕەفە لە دەرمانخانە' : isAr ? '4. ظروف الحفظ والتخزين ورقم الرف بالصيدلية' : '4. Storage Conditions & Shelf Location'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              {/* Storage Condition Option */}
              <div className="md:col-span-6">
                <label className="text-slate-300 mb-0.5 block font-semibold text-[10.5px]">
                  {isKu ? 'مەرجەکانی پاراستن و پلەی گەرمی' : isAr ? 'متطلبات التخزين والحفظ الحراري' : 'Temperature Standard'}
                </label>
                <select
                  value={storageCondition}
                  onChange={(e) => setStorageCondition(e.target.value)}
                  className="w-full bg-[#0a1120] text-purple-300 py-1 px-2 rounded-xl border border-purple-500/30 focus:outline-none text-xs font-bold"
                >
                  <option value="room_temp">{isKu ? '🌡️ پلەی گەرمی ژوور (کەمتر لە 25°C)' : isAr ? '🌡️ حرارة الغرفة (أقل من 25°C)' : '🌡️ Room Temp (< 25°C)'}</option>
                  <option value="refrigerator">{isKu ? '❄️ سەلاجەی دەرمان (2°C - 8°C)' : isAr ? '❄️ ثلاجة دوائية (2°C - 8°C)' : '❄️ Medical Refrigerator (2°C - 8°C)'}</option>
                  <option value="protect_light">{isKu ? '🌙 دوور لە ڕووناکی و شێ' : isAr ? '🌙 بعيداً عن الضوء والرطوبة' : '🌙 Protect from Light & Moisture'}</option>
                  <option value="cool_dry">{isKu ? '🌬️ شوێنی فێنک و وشک (کەمتر لە 20°C)' : isAr ? '🌬️ مكان بارد وجاف (أقل من 20°C)' : '🌬️ Cool & Dry Place (< 20°C)'}</option>
                  <option value="freezer">{isKu ? '🧊 بەستەری پزیشکی (کەمتر لە 0°C)' : isAr ? '🧊 مجمد طبية (أقل من 0°C)' : '🧊 Medical Freezer (< 0°C)'}</option>
                </select>
              </div>

              {/* Pharmacy Shelf / Location */}
              <div className="md:col-span-6">
                <label className="text-slate-300 mb-0.5 block font-semibold text-[10.5px]">
                  {isKu ? 'شوێنی هەڵگرتن و ژمارەی ڕەفە' : isAr ? 'مكان التخزين ورقم الرف' : 'Shelf Location'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    placeholder={isKu ? 'نموونە: ڕەفەی دەرمانخانە A-03' : isAr ? 'مثال: رف الصيدلية A-03' : 'e.g. Shelf A-03'}
                    className="w-full bg-[#0a1120] text-slate-100 py-1 px-2 pr-7 rounded-xl border border-purple-500/30 focus:outline-none focus:border-purple-400 text-xs font-semibold"
                  />
                  <MapPin className="w-3.5 h-3.5 text-purple-400 absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
            >
              {isKu ? 'پەشیمانبوونەوە' : isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              className="px-7 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-cyan-400/40"
            >
              <Package className="w-4 h-4" />
              <span>{isKu ? 'پاشەکەوتکردن و پشتڕاستکردنەوەی دەرمان' : isAr ? 'حفظ وتأكيد بيانات المادة الدوائية' : 'Save Pharmaceutical Record'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
