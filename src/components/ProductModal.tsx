import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Package, 
  Tag, 
  ShieldAlert, 
  Sparkles, 
  Plus, 
  Building2,
  Globe,
  Boxes,
  Info,
  AlertTriangle,
  Clock,
  MapPin,
  Barcode as BarcodeIcon,
  Thermometer,
  ShoppingBag,
  Store,
  Layers,
  ChevronDown,
  Trash2
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

export const MARKET_DEFAULT_CATEGORIES = [
  'المواد الغذائية والتموينية',
  'الألبان والأجبان والبيض',
  'المشروبات والعصائر والمياه',
  'السناكس والبسكويت والشوكولاتة',
  'المعلبات والزيوت والصلصات',
  'المنظفات ومستلزمات الغسيل',
  'العناية الشخصية والشامبو',
  'المجمدات واللحوم والدواجن',
  'المخبوزات والحلويات والخبز',
  'الخضار والفواكه الطازجة',
  'البقوليات والحبوب والأرز',
  'البهارات والتوابل والمكسرات',
  'مستلزمات وأدوات المنزل'
];

export const PHARMA_DEFAULT_CATEGORIES = MARKET_DEFAULT_CATEGORIES;

export const DEFAULT_PACKAGING_UNITS = [
  'قطعة (Piece)',
  'علبة / باكيت (Box/Packet)',
  'قنينة / بطل (Bottle)',
  'كيس / شيس (Bag)',
  'شدة / ربطة (Pack)',
  'كرتون (Carton)',
  'قوطية / صفيحة (Can/Tin)',
  'كيلوغرام (Kg)',
  'غرام (Gram)',
  'لتر (Liter)',
  'صندوق (Crate)',
  'رول (Roll)'
];

export const DEFAULT_DOSAGE_FORMS = DEFAULT_PACKAGING_UNITS;

export const DEFAULT_ORIGIN_COUNTRIES = [
  'العراق (Iraq)',
  'تركيا (Turkey)',
  'السعودية (Saudi Arabia)',
  'الأردن (Jordan)',
  'الإمارات (UAE)',
  'مصر (Egypt)',
  'إيران (Iran)',
  'ألمانيا (Germany)',
  'فرنسا (France)',
  'إيطاليا (Italy)',
  'إسبانيا (Spain)',
  'هولندا (Netherlands)',
  'بلجيكا (Belgium)',
  'أمريكا (USA)',
  'الهند (India)',
  'الصين (China)',
  'الكويت (Kuwait)',
  'لبنان (Lebanon)',
  'تونس (Tunisia)',
  'البرازيل (Brazil)'
];

export const DEFAULT_MANUFACTURERS = [
  'المراعي (Almarai)',
  'نستله (Nestlé)',
  'كوكاكولا (Coca-Cola)',
  'بيبسي (PepsiCo)',
  'يونيليفر (Unilever)',
  'برسيل (Henkel)',
  'تايد (P&G)',
  'ساديا (Sadia)',
  'ألتونسا (Altunsa)',
  'شيبس ليز (Lay\'s)',
  'دانون (Danone)',
  'لونا (Luna)',
  'الدرة (Al Durra)',
  'زيت عافية (Afia)',
  'نوتيلا (Ferrero)',
  'كيندر (Kinder)',
  'أندومي (Indomie)',
  'شاي أحمد (Ahmad Tea)',
  'شاي لبتون (Lipton)',
  'أرز محمود (Mahmood Rice)',
  'أرز كوهينور (Kohinoor)',
  'معكرونة قودي (Goody)',
  'كلوركس (Clorox)',
  'دوف (Dove)',
  'سنكرز (Mars)'
];

export const getSavedCategories = (): string[] => {
  try {
    const saved = localStorage.getItem('market_custom_categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...MARKET_DEFAULT_CATEGORIES, ...parsed]));
      }
    }
  } catch (e) {
    console.error('Failed to parse custom categories', e);
  }
  return MARKET_DEFAULT_CATEGORIES;
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

export const getSavedPackagingUnits = (): string[] => {
  try {
    const saved = localStorage.getItem('market_custom_units') || localStorage.getItem('pharma_custom_dosage_forms');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_PACKAGING_UNITS, ...parsed]));
      }
    }
  } catch (e) {
    console.error('Failed to parse custom units', e);
  }
  return DEFAULT_PACKAGING_UNITS;
};

export const getSavedDosageForms = getSavedPackagingUnits;

export const saveCustomPackagingUnitToStorage = (newUnit: string) => {
  if (!newUnit || !newUnit.trim()) return;
  const trimmed = newUnit.trim();
  const current = getSavedPackagingUnits();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem('market_custom_units', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom packaging unit', e);
    }
  }
};

export const saveCustomDosageFormToStorage = saveCustomPackagingUnitToStorage;

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
  const lang = settings?.language || 'ar';
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const currencySymbol = settings?.currencySymbol || 'د.ع';

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Guidance Banner Toggle State
  const [showGuidance, setShowGuidance] = useState<boolean>(false);

  // Dynamic Categories & Units lists
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    try {
      return getSavedCategories();
    } catch {
      return MARKET_DEFAULT_CATEGORIES;
    }
  });

  const [unitsList, setUnitsList] = useState<string[]>(() => {
    try {
      return getSavedPackagingUnits();
    } catch {
      return DEFAULT_PACKAGING_UNITS;
    }
  });

  // Modal for adding a new packaging unit
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [newUnitInput, setNewUnitInput] = useState('');

  // Basic Product State
  const [barcode, setBarcode] = useState('');
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState('');
  const [supplierDelegate, setSupplierDelegate] = useState('');
  const [categoryAr, setCategoryAr] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  // 🛒 Market Specific Fields
  const [variantWeight, setVariantWeight] = useState(''); // الوزن أو الحجم أو النكهة (e.g. 1L, 500g)
  const [packagingUnit, setPackagingUnit] = useState(DEFAULT_PACKAGING_UNITS[0]); // نوع الوحدة والتعبئة
  const [countryOfOrigin, setCountryOfOrigin] = useState(''); // بلد المنشأ
  const [brandManufacturer, setBrandManufacturer] = useState(''); // العلامة التجارية أو الشركة المصنعة
  const [displayCategory, setDisplayCategory] = useState<string>('مواد معبأة'); // تصنيف العرض بالمحل
  const [batchNumber, setBatchNumber] = useState(''); // رقم الوجبة / الدفعة
  const [expiryAlertMonths, setExpiryAlertMonths] = useState<number>(3); // تنبيه قبل 3 أشهر للماركت
  const [storageCondition, setStorageCondition] = useState<string>('dry_grocery'); // ظروف الحفظ والعرض
  const [storageLocation, setStorageLocation] = useState<string>('قاطع المواد الغذائية - رف A-1'); // مكان الرف / القاطع

  // Dates
  const [initialAddDate, setInitialAddDate] = useState(todayStr);
  const [lastEditDate, setLastEditDate] = useState(todayStr);
  const [expiryDate, setExpiryDate] = useState('');

  // Quantities & Packaging
  const [cartonsCount, setCartonsCount] = useState<number | ''>(''); // عدد الكراتين / الشدات
  const [unitsPerCarton, setUnitsPerCarton] = useState<number | ''>(12); // عدد القطع بالكرتونة

  // Prices
  const [cartonPurchasePrice, setCartonPurchasePrice] = useState<number | ''>('');
  const [singleRetailPrice, setSingleRetailPrice] = useState<number | ''>('');
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('');
  const [cartonSellingPrice, setCartonSellingPrice] = useState<number | ''>('');

  // Blurred / Touched states for price validation on exit
  const [singleRetailBlurred, setSingleRetailBlurred] = useState(false);
  const [wholesaleBlurred, setWholesaleBlurred] = useState(false);
  const [cartonSellBlurred, setCartonSellBlurred] = useState(false);

  // Lifecycle guard refs
  const prevIsOpenRef = useRef<boolean>(false);
  const prevEditIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const isOpeningNow = isOpen && !prevIsOpenRef.current;
    const currentEditId = productToEdit ? productToEdit.id : null;
    const isTargetProductChanged = currentEditId !== prevEditIdRef.current;

    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }

    if (isOpeningNow || isTargetProductChanged) {
      prevIsOpenRef.current = true;
      prevEditIdRef.current = currentEditId;

      const currentCategories = getSavedCategories();
      const currentUnits = getSavedPackagingUnits();
      setBarcodeError(null);
      setSingleRetailBlurred(false);
      setWholesaleBlurred(false);
      setCartonSellBlurred(false);

      if (productToEdit) {
        const prodCategory = productToEdit.categoryAr || productToEdit.category || MARKET_DEFAULT_CATEGORIES[0];
        if (prodCategory && !currentCategories.includes(prodCategory)) {
          currentCategories.push(prodCategory);
        }
        setCategoriesList(Array.from(new Set(currentCategories)));

        const prodUnit = productToEdit.dosageForm || productToEdit.unit || DEFAULT_PACKAGING_UNITS[0];
        if (prodUnit && !currentUnits.includes(prodUnit)) {
          currentUnits.push(prodUnit);
        }
        setUnitsList(Array.from(new Set(currentUnits)));

        setBarcode(productToEdit.barcode || '');
        setNameAr(productToEdit.nameAr || productToEdit.name || '');
        setSupplierDelegate(productToEdit.supplierDelegate || productToEdit.supplierName || '');
        setCategoryAr(prodCategory);

        // Market fields populate
        setVariantWeight(productToEdit.scientificName || '');
        setPackagingUnit(prodUnit);
        setCountryOfOrigin(productToEdit.countryOfOrigin || 'العراق (Iraq)');
        setBrandManufacturer(productToEdit.manufacturer || 'المراعي (Almarai)');
        setDisplayCategory(productToEdit.pharmaCategory || 'مواد معبأة');
        setBatchNumber(productToEdit.batchNumber || '');
        setExpiryAlertMonths(productToEdit.expiryAlertMonths || 3);
        setStorageCondition(productToEdit.storageCondition || 'dry_grocery');
        setStorageLocation(productToEdit.storageLocation || 'قاطع المواد الغذائية - رف A-1');

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
        setUnitsList(Array.from(new Set(currentUnits)));
        const uniqueBar = generateUniqueBarcode200245(existingProducts);
        const randBatch = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        setBarcode(uniqueBar);
        setNameAr('');
        setSupplierDelegate(initialSupplierName || '');
        setCategoryAr(currentCategories[0] || MARKET_DEFAULT_CATEGORIES[0]);
        
        setVariantWeight('');
        setPackagingUnit(currentUnits[0] || DEFAULT_PACKAGING_UNITS[0]);
        setCountryOfOrigin('العراق (Iraq)');
        setBrandManufacturer('المراعي (Almarai)');
        setDisplayCategory('مواد معبأة');
        setBatchNumber(randBatch);
        setExpiryAlertMonths(3);
        setStorageCondition('dry_grocery');
        setStorageLocation('قاطع المواد الغذائية - رف A-1');

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
    }
  }, [productToEdit, isOpen, initialSupplierName, todayStr, existingProducts]);

  // Derived Automatic Calculations
  const numCartons = Number(cartonsCount) || 0;
  const numUnitsPerCarton = Number(unitsPerCarton) || 1;
  const totalUnits = numCartons * numUnitsPerCarton;

  const cartonCost = Number(cartonPurchasePrice) || 0;
  const costPerUnit = numUnitsPerCarton > 0 ? cartonCost / numUnitsPerCarton : 0;

  const singleRetail = Number(singleRetailPrice) || 0;
  const singleProfit = singleRetail - costPerUnit;

  const wholesale = Number(wholesalePrice) || 0;
  const wholesaleProfit = wholesale - costPerUnit;

  const cartonSell = Number(cartonSellingPrice) || 0;
  const cartonProfit = cartonSell - cartonCost;

  // Validation flags: Selling price must not be lower than cost
  const isSingleRetailBelowCost = singleRetail > 0 && costPerUnit > 0 && singleRetail < costPerUnit;
  const isWholesaleBelowCost = wholesale > 0 && costPerUnit > 0 && wholesale < costPerUnit;
  const isCartonSellBelowCost = cartonSell > 0 && cartonCost > 0 && cartonSell < cartonCost;

  // Check Barcode Duplication in real-time
  const duplicateProduct = useMemo(() => {
    if (!barcode || !barcode.trim()) return null;
    return findDuplicateBarcodeProduct(barcode.trim(), existingProducts, productToEdit?.id);
  }, [barcode, existingProducts, productToEdit]);

  const handleBarcodeChange = (val: string) => {
    setBarcode(val);
    const dup = findDuplicateBarcodeProduct(val.trim(), existingProducts, productToEdit?.id);
    if (dup) {
      setBarcodeError(
        isKu 
          ? `❌ ئەم بارکۆدە پێشتر بۆ کاڵای (${dup.nameKu || dup.nameAr || dup.name}) بەکارهاتووە!` 
          : isAr 
          ? `❌ الباركود مستخدم بالفعل للمادة (${dup.nameAr || dup.name})! يرجى توليد باركود آخر.` 
          : `❌ Barcode already exists for (${dup.name})!`
      );
    } else {
      setBarcodeError(null);
    }
  };

  const handleGenerateBarcode = () => {
    const newBar = generateUniqueBarcode200245(existingProducts);
    setBarcode(newBar);
    setBarcodeError(null);
  };

  const handleGenerateBatch = () => {
    const year = new Date().getFullYear();
    const randCode = Math.floor(1000 + Math.random() * 9000);
    setBatchNumber(`LOT-${year}-${randCode}`);
  };

  // Add new custom packaging unit
  const handleAddNewUnit = () => {
    if (!newUnitInput.trim()) return;
    const unitName = newUnitInput.trim();
    saveCustomPackagingUnitToStorage(unitName);
    setUnitsList(prev => {
      if (prev.includes(unitName)) return prev;
      return [...prev, unitName];
    });
    setPackagingUnit(unitName);
    setNewUnitInput('');
    setShowAddUnitModal(false);
  };

  // Expiry alert preview
  const expiryStatusInfo = useMemo(() => {
    if (!expiryDate) return null;
    try {
      const parts = expiryDate.split('/');
      if (parts.length === 3) {
        const exp = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const now = new Date();
        const diffMonths = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
        
        if (diffMonths <= 0) {
          return { 
            label: isKu ? 'کاڵای بەسەرچوو' : isAr ? 'منتج منتهي الصلاحية' : 'Expired Product', 
            color: 'bg-rose-950/80 text-rose-300 border-rose-500/50' 
          };
        } else if (diffMonths <= (expiryAlertMonths || 3)) {
          return { 
            label: isKu ? `نزیکە لە بەسەرچوون (${Math.ceil(diffMonths)} مانگ)` : isAr ? `قريب من الانتهاء (${Math.ceil(diffMonths)} شهر)` : `Near Expiry (${Math.ceil(diffMonths)} mo)`, 
            color: 'bg-amber-950/80 text-amber-300 border-amber-500/50' 
          };
        } else {
          return { 
            label: isKu ? 'صلاحية دروست و باشە' : isAr ? 'صلاحية سارية وممتازة' : 'Fresh & Valid', 
            color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' 
          };
        }
      }
    } catch {
      return null;
    }
    return null;
  }, [expiryDate, expiryAlertMonths, isAr, isKu]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcode || !barcode.trim()) {
      alert(
        isKu
          ? '❌ پاشەکەوت ناکرێت! بەشی بارکۆد بەتاڵە. تکایە بارکۆدێک بنووسە یان دروستی بکە.'
          : isAr
          ? '❌ لا يمكن الحفظ! حقل الباركود فارغ. يرجى إدخال أو توليد باركود للمادة.'
          : 'Cannot save! Barcode is empty.'
      );
      return;
    }

    if (duplicateProduct) {
      alert(
        isKu
          ? `❌ پاشەکەوت ناکرێت! بارکۆدی (${barcode}) پێشتر بۆ کاڵای (${duplicateProduct.nameKu || duplicateProduct.nameAr || duplicateProduct.name}) بەکارهاتووە.`
          : isAr
          ? `❌ لا يمكن الحفظ! الباركود (${barcode}) مستخدم بالفعل للمادة (${duplicateProduct.nameAr || duplicateProduct.name}).`
          : `Cannot save! Barcode ${barcode} is already used.`
      );
      setBarcode('');
      return;
    }

    // Strict Validation: Selling Price must not be lower than Purchase Cost
    if (costPerUnit > 0 && singleRetail < costPerUnit) {
      setSingleRetailBlurred(true);
      alert(
        isKu
          ? `❌ پاشەکەوت ناکرێت!\n\nنرخی فرۆشتنی تاک (${formatNumber(singleRetail)} ${currencySymbol}) کەمترە لە نرخی تێچووی کڕین (${formatNumber(costPerUnit)} ${currencySymbol})!`
          : isAr
          ? `❌ لا يمكن حفظ المادة!\n\nسعر بيع المفرد (${formatNumber(singleRetail)} ${currencySymbol}) أقل من تكلفة الشراء (${formatNumber(costPerUnit)} ${currencySymbol})!`
          : `❌ Retail price cannot be lower than cost!`
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
        updatedBy: isAr ? 'مسؤول الماركت / الكاشير' : 'Market Manager / Cashier'
      });
    } else if (!productToEdit) {
      updatedHistory = [{
        date: new Date().toISOString(),
        oldPrice: singleRetail,
        newPrice: singleRetail,
        oldCost: Number(costPerUnit.toFixed(2)),
        newCost: Number(costPerUnit.toFixed(2)),
        updatedBy: isAr ? 'إضافة مادة للماركت' : 'Initial Product Entry'
      }];
    }

    const lastPriceUpdateDate = priceChanged 
      ? new Date().toISOString() 
      : (productToEdit?.lastPriceUpdate || productToEdit?.lastEditDate || new Date().toISOString());

    // Clean packaging unit name (e.g., 'قطعة (Piece)' -> 'قطعة')
    const unitClean = packagingUnit ? packagingUnit.split(' ')[0] : 'قطعة';

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
      lastEditDate: todayStr,
      lastPriceUpdate: lastPriceUpdateDate,
      priceHistory: updatedHistory,
      expiryDate: expiryDate,

      // 🛒 Market Specific Fields
      scientificName: variantWeight.trim(), // Stored here for compatibility (e.g. 1L, 500g, حجم عائلي)
      dosageForm: packagingUnit, // Unit/Packaging (قطعة، قنينة، كيس...)
      countryOfOrigin: countryOfOrigin.trim(),
      manufacturer: brandManufacturer.trim(), // Brand or Company
      pharmaCategory: displayCategory, // Shelf / Department mode
      batchNumber: batchNumber || `LOT-${Date.now().toString().slice(-6)}`,
      expiryAlertMonths: expiryAlertMonths,
      storageCondition: storageCondition,
      storageLocation: storageLocation,
      
      // POS Compatibility
      price: singleRetail,
      cost: Number(costPerUnit.toFixed(2)),
      stock: totalUnits,
      minStock: 10,
      unit: unitClean,
      supplierId: matchedSupplier ? matchedSupplier.id : (productToEdit?.supplierId || 'sup-1'),
      supplierName: supplierDelegate || (matchedSupplier ? matchedSupplier.nameAr : (isAr ? 'مورد الماركت المعتمد' : 'Market Supplier')),
      imageIcon: '🛒',
      status: totalUnits === 0 ? 'out_of_stock' : totalUnits <= 10 ? 'low_stock' : 'in_stock'
    };

    onSave(finalProduct);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-1.5 sm:p-3 overflow-y-auto" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {/* Modal Container */}
      <div className="cyber-card p-2.5 sm:p-3.5 rounded-2xl border border-emerald-500/40 w-full max-w-5xl max-h-[96vh] bg-[#0a131c] text-slate-100 relative animate-scaleUp shadow-2xl overflow-y-auto flex flex-col justify-between custom-scrollbar">
        
        {/* Header - Compact */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black bg-gradient-to-r from-emerald-300 via-white to-teal-300 bg-clip-text text-transparent leading-tight">
                {productToEdit
                  ? (isKu ? 'دەستکاریکردنی زانیاری کاڵای مارکێت' : isAr ? 'تعديل بيانات مادة ومنتج بالماركت' : 'Edit Market Product')
                  : (isKu ? 'تۆمارکردن و پێناسەکردنی کاڵای نوێ لە مارکێت' : isAr ? 'إضافة وتعريف مادة ومنتج جديد بالماركت' : 'Add New Market Product')}
              </h2>
              <p className="text-[10px] text-slate-400">
                {isKu ? 'بارکۆد، وڵاتی دروستکەر، براند، بەسەرچوون، پاکێج و نرخەکان' : isAr ? 'الباركود، بلد المنشأ، الشركة والعلامة التجارية، الصلاحية، والتعبئة والأسعار' : 'Barcode, Country of Origin, Brand, Expiry, Packaging & Prices'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowGuidance(prev => !prev)}
              className="p-1 px-2 rounded-lg bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Info className="w-3 h-3 text-emerald-400" />
              <span>{showGuidance ? (isAr ? 'إخفاء الدليل' : isKu ? 'شاردنەوە' : 'Hide Guide') : (isAr ? 'دليل الإدخال' : isKu ? 'ڕێنمایی' : 'Guide')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800/80 hover:bg-rose-900/50 hover:text-rose-300 text-slate-400 border border-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Guidance Accordion */}
        {showGuidance && (
          <div className="my-1.5 p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[10.5px] text-emerald-200 space-y-1 animate-fadeIn shrink-0">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isKu ? 'ڕێنمایی خێرای داخڵکردنی کاڵای مارکێت:' : isAr ? 'ضوابط إدخال مواد ومنتجات الماركت السريع:' : 'Quick Market Inventory Rules:'}</span>
            </div>
            <p className="text-slate-300 leading-snug">
              {isKu
                ? '• دەتوانیت وڵاتی دروستکەر، براندی بازرگانی، جۆری پاکێج (دانە، کیس، کارتۆن) و بەرواری بەسەرچوون دیاری بکەیت لەگەڵ دروستکردنی بارکۆدی خێرا.'
                : isAr
                ? '• يمكنك تحديد بلد المنشأ، العلامة التجارية أو الشركة الموردة، نوع التعبئة (قطعة، قنينة، كيس، كرتون)، وتاريخ الصلاحية مع حساب تكلفة المفرد وهوامش الربح تلقائياً.'
                : '• Specify Country of origin, Brand/Company, Package unit, Expiry date and let the system calculate retail unit cost and profits automatically.'}
            </p>
          </div>
        )}

        {/* MAIN FORM BODY */}
        <form onSubmit={handleSubmit} className="space-y-2.5 pt-1.5">

          {/* SECTION 1: BASIC PRODUCT & BRAND IDENTIFICATION */}
          <div className="bg-[#0e1927] p-2.5 rounded-xl border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <h3 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isKu ? '١. زانیارییە سەرەکییەکان، براند و وڵات' : isAr ? '1. البيانات الأساسية والعلامة التجارية والمنشأ' : '1. Basic Info, Brand & Origin'}</span>
              </h3>
              <span className="text-[9.5px] text-slate-400 font-mono">Market Inventory</span>
            </div>

            {/* Row 1: Barcode + Product Name + Variant / Weight */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
              
              {/* Barcode Field */}
              <div className="md:col-span-4">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'بارکۆدی نێودەوڵەتی یان ناوخۆیی' : isAr ? 'الباركود الدولي أو المحلي' : 'International or Local Barcode'} <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={(e) => handleBarcodeChange(e.target.value)}
                    placeholder="628... / 200245..."
                    className={`w-full bg-[#070e17] font-mono font-bold h-7 px-2 rounded-lg border focus:outline-none text-xs transition-colors ${
                      barcodeError || duplicateProduct
                        ? 'border-rose-500 text-rose-300 bg-rose-950/30 ring-1 ring-rose-500/50'
                        : 'border-emerald-500/30 text-emerald-300 focus:border-emerald-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="px-2 h-7 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-lg text-[10px] font-bold whitespace-nowrap border border-emerald-400/40 cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
                    title={isKu ? 'دروستکردنی بارکۆد' : isAr ? 'توليد باركود جديد للمادة' : 'Generate barcode'}
                  >
                    <Sparkles className="w-3 h-3 text-emerald-200" />
                    <span>{isKu ? 'تولید' : isAr ? 'توليد' : 'Gen'}</span>
                  </button>
                </div>
                {(barcodeError || duplicateProduct) && (
                  <div className="mt-1 text-[9px] font-bold text-rose-300 flex items-center gap-1 bg-rose-500/15 p-1 rounded border border-rose-500/40 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>
                      {barcodeError || (isKu ? `بۆ کاڵای (${duplicateProduct?.nameKu || duplicateProduct?.nameAr || duplicateProduct?.name}) تۆمارکراوە` : `مستخدم لمادة (${duplicateProduct?.nameAr || duplicateProduct?.name})`)}
                    </span>
                  </div>
                )}
              </div>

              {/* Trade Product Name */}
              <div className="md:col-span-4">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'ناوی کاڵا لە مارکێت' : isAr ? 'اسم المادة والمنتج (كما بالماركت)' : 'Product & Brand Name'} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder={isKu ? 'نموونە: شیری ئەلمەراعی ١ لیتر / چپس لێیز' : isAr ? 'مثال: حليب المراعي 1 لتر / شيبس ليز عائلي' : 'e.g. Almarai Milk 1L / Lay\'s Chips'}
                  className="w-full bg-[#070e17] text-slate-100 h-7 px-2 rounded-lg border border-emerald-500/30 focus:outline-none focus:border-emerald-400 text-xs font-semibold"
                />
              </div>

              {/* Weight / Volume / Variant */}
              <div className="md:col-span-4">
                <label className="text-emerald-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'قەبارە، کێش یان تایبەتمەندی (ئارەزوومەندانە)' : isAr ? 'الوصف والحجم / الوزن أو النكهة' : 'Variant / Weight / Volume'}
                </label>
                <input
                  type="text"
                  value={variantWeight}
                  onChange={(e) => setVariantWeight(e.target.value)}
                  placeholder={isKu ? 'نموونە: 1L ، 500g ، قەبارەی خێزانی' : isAr ? 'مثال: 1L ، 500g ، حجم عائلي ، خالي من السكر' : 'e.g. 1L, 500g, Family Pack'}
                  className="w-full bg-[#070e17] text-teal-300 font-mono h-7 px-2 rounded-lg border border-teal-500/40 focus:outline-none focus:border-teal-400 text-xs"
                />
              </div>

            </div>

            {/* Row 2: Country of Origin + Brand/Manufacturer + Packaging Unit + Display Type */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-0.5 items-start">
              
              {/* 🌍 بلد المنشأ (Country of Origin) */}
              <div className="md:col-span-3">
                <label className="text-emerald-300 mb-0.5 block font-bold text-[10px] flex items-center gap-1">
                  <Globe className="w-3 h-3 text-emerald-400" />
                  <span>{isKu ? 'وڵاتی دروستکەر / منشأ' : isAr ? 'بلد المنشأ / الصنع' : 'Country of Origin'}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="countries-datalist"
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    placeholder={isKu ? 'عێراق، تورکیا، سعودیە...' : isAr ? 'العراق، تركيا، السعودية...' : 'Iraq, Turkey, Saudi Arabia...'}
                    className="w-full bg-[#070e17] text-slate-100 h-7 px-2 rounded-lg border border-emerald-500/30 focus:outline-none focus:border-emerald-400 text-xs font-semibold"
                  />
                  <datalist id="countries-datalist">
                    {DEFAULT_ORIGIN_COUNTRIES.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 🏢 الشركة المصنعة أو العلامة التجارية (Brand / Manufacturer) */}
              <div className="md:col-span-3">
                <label className="text-emerald-300 mb-0.5 block font-bold text-[10px] flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-emerald-400" />
                  <span>{isKu ? 'کۆمپانیا یان براند' : isAr ? 'الشركة المصنعة أو العلامة (Brand)' : 'Brand / Manufacturer'}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="manufacturers-datalist"
                    value={brandManufacturer}
                    onChange={(e) => setBrandManufacturer(e.target.value)}
                    placeholder={isKu ? 'المراعي، بيبسي، نستله...' : isAr ? 'المراعي، بيبسي، نستله، ليز...' : 'Almarai, Pepsi, Nestle, Lays...'}
                    className="w-full bg-[#070e17] text-slate-100 h-7 px-2 rounded-lg border border-emerald-500/30 focus:outline-none focus:border-emerald-400 text-xs font-semibold"
                  />
                  <datalist id="manufacturers-datalist">
                    {DEFAULT_MANUFACTURERS.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 📦 نوع الوحدة والتعبئة (Packaging Unit) */}
              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-slate-300 font-bold text-[10px] flex items-center gap-1">
                    <Package className="w-3 h-3 text-emerald-400" />
                    <span>{isKu ? 'جۆری یەکە / پاکێج' : isAr ? 'نوع الوحدة / التعبئة' : 'Unit / Packaging'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddUnitModal(true)}
                    className="text-[9px] text-emerald-300 hover:text-emerald-200 font-bold flex items-center gap-0.5 bg-emerald-950/80 px-1 rounded border border-emerald-500/40 cursor-pointer"
                    title={isAr ? 'إضافة نوع تعبئة جديد للقائمة' : isKu ? 'زیادکردنی یەکەی نوێ' : 'Add new packaging unit'}
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{isAr ? 'جديد' : isKu ? 'نوێ' : 'New'}</span>
                  </button>
                </div>
                <select
                  value={packagingUnit}
                  onChange={(e) => setPackagingUnit(e.target.value)}
                  className="w-full bg-[#070e17] text-slate-100 h-7 px-1.5 rounded-lg border border-emerald-500/30 focus:outline-none focus:border-emerald-400 text-xs font-semibold cursor-pointer"
                >
                  {unitsList.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              {/* 🏷️ نوع المنتج بالمحل (تصنيف العرض) */}
              <div className="md:col-span-3">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'جۆری کاڵا لە دوکان' : isAr ? 'نوع المنتج وتصنيف العرض بالمحل' : 'Display Classification'}
                </label>
                <select
                  value={displayCategory}
                  onChange={(e) => setDisplayCategory(e.target.value)}
                  className="w-full bg-[#070e17] text-slate-100 h-7 px-1.5 rounded-lg border border-emerald-500/30 focus:outline-none focus:border-emerald-400 text-xs font-bold cursor-pointer"
                >
                  <option value="مواد معبأة">{isKu ? 'خۆراکی وشک و لەقوتوونراو' : isAr ? 'مواد غذائية معبأة (Grocery)' : 'Packaged Grocery'}</option>
                  <option value="مبرد وألبان">{isKu ? 'شیری و ساردکراوە (Chilled)' : isAr ? 'ألبان وأجبان مبردة (Dairy / Chilled)' : 'Dairy & Chilled'}</option>
                  <option value="مجمدات">{isKu ? 'بەستووەکان و گۆشت (Frozen)' : isAr ? 'مجمدات ولحوم (Frozen Foods)' : 'Frozen Foods'}</option>
                  <option value="مشروبات">{isKu ? 'خواردنەوە و شەربەت (Drinks)' : isAr ? 'مشروبات وعصائر ومياه (Beverages)' : 'Beverages & Drinks'}</option>
                  <option value="سناكس">{isKu ? 'شیرینی و بسکیت (Snacks)' : isAr ? 'سناكس وحلويات وبسكويت (Snacks)' : 'Snacks & Sweets'}</option>
                  <option value="منظفات">{isKu ? 'پاککەرەوە و پێداویستی ماڵ' : isAr ? 'منظفات ومستلزمات منزلية (Cleaning)' : 'Household & Cleaning'}</option>
                  <option value="عناية">{isKu ? 'چاودێری کەسی و شامپۆ' : isAr ? 'عناية شخصية وشامبو (Personal Care)' : 'Personal Care'}</option>
                  <option value="طازج">{isKu ? 'میوە و سەوزەی تازە (Fresh)' : isAr ? 'خضار وفواكه طازجة (Fresh Produce)' : 'Fresh Produce'}</option>
                </select>
              </div>

            </div>

            {/* Row 3: Market Category + Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-0.5 items-start">
              <div className="md:col-span-6">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'بەشی مارکێت / پۆلێن' : isAr ? 'قسم وتصنيف الماركت' : 'Market Category / Aisle'}
                </label>
                <select
                  value={categoryAr}
                  onChange={(e) => setCategoryAr(e.target.value)}
                  className="w-full bg-[#070e17] text-slate-200 h-7 px-2 rounded-lg border border-emerald-500/30 focus:outline-none focus:border-emerald-400 text-xs font-semibold cursor-pointer"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryName(cat, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-6">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'کۆمپانیای دابینکەر یان مەندوب' : isAr ? 'المورد أو الموزع المعتمد للماركت' : 'Market Supplier / Distributor'}
                </label>
                <input
                  type="text"
                  list="suppliers-datalist"
                  value={supplierDelegate}
                  onChange={(e) => setSupplierDelegate(e.target.value)}
                  placeholder={isKu ? 'ناوی کۆمپانیا یان مەندوب' : isAr ? 'اسم شركة التوزيع أو المندوب المورد' : 'Supplier or distributor company'}
                  className="w-full bg-[#070e17] text-slate-200 h-7 px-2 rounded-lg border border-emerald-500/30 focus:outline-none focus:border-emerald-400 text-xs"
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

          {/* SECTION 2: BATCH / LOT & EXPIRY SYSTEM */}
          <div className="bg-[#0e1927] p-2.5 rounded-xl border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 flex-wrap gap-2">
              <h3 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{isKu ? '٢. ژمارەی وەجبە و بەرواری بەسەرچوون و ئاگاداری' : isAr ? '2. رقم الوجبة / الدفعة وتاريخ انتهاء الصلاحية والتنبيه' : '2. Batch / Lot Number & Expiry Date'}</span>
              </h3>
              {expiryStatusInfo && (
                <div className={`p-0.5 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${expiryStatusInfo.color}`}>
                  <ShieldAlert className="w-3 h-3 shrink-0" />
                  <span>{expiryStatusInfo.label}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              {/* 1. Batch / Lot Number */}
              <div className="md:col-span-5">
                <label className="text-amber-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'ژمارەی وەجبە (Batch / Lot No)' : isAr ? 'رقم الوجبة / الدفعة (Batch / Lot Number)' : 'Batch / Lot Number'} <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="LOT-2026-X01"
                    className="w-full bg-[#070e17] text-amber-300 font-mono font-bold h-7 px-2 rounded-lg border border-amber-500/30 focus:outline-none focus:border-amber-400 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateBatch}
                    className="px-2 h-7 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-bold whitespace-nowrap border border-slate-700 cursor-pointer active:scale-95 transition-colors"
                  >
                    {isKu ? 'وەجبەی نوێ' : isAr ? 'توليد وجبة' : 'New Lot'}
                  </button>
                </div>
              </div>

              {/* 2. Expiry Date */}
              <div className="md:col-span-4">
                <label className="text-amber-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'بەرواری بەسەرچوون (ڕۆژ/مانگ/ساڵ)' : isAr ? 'تاريخ انتهاء الصلاحية (يوم/شهر/سنة)' : 'Expiry Date (DD/MM/YYYY)'} <span className="text-rose-400">*</span>
                </label>
                <DatePickerDDMMYYYY
                  value={expiryDate}
                  onChange={(dStr) => setExpiryDate(dStr)}
                  lang={isAr ? 'ar' : isKu ? 'ku' : 'en'}
                />
              </div>

              {/* 3. Alert Threshold */}
              <div className="md:col-span-3">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10px] whitespace-nowrap">
                  {isKu ? 'ئاگاداری پێشوەختە (مانگ)' : isAr ? 'مدة التنبيه المبكر قبل الانتهاء (بالأشهر)' : 'Alert Before Expiry (Months)'}
                </label>
                <div className="flex items-center gap-1 bg-[#070e17] border border-amber-500/30 rounded-lg px-2 h-7 focus-within:border-amber-400">
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={expiryAlertMonths}
                    onChange={(e) => setExpiryAlertMonths(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent text-amber-300 font-mono font-bold text-xs text-center focus:outline-none"
                    placeholder="3"
                  />
                  <span className="text-[10px] text-slate-400 font-bold shrink-0">{isKu ? 'مانگ' : isAr ? 'أشهر' : 'mo'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: QUANTITIES & PURCHASING (الكميات والتعبئة والتكلفة للماركت) */}
          <div className="bg-[#0e1927] p-2.5 rounded-xl border border-teal-500/30 space-y-2">
            <h3 className="text-xs font-black text-teal-300 flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Boxes className="w-3.5 h-3.5 text-teal-400" />
              <span>{isKu ? '٣. بڕی کارتۆن، پاکێج و تێچووی کڕین' : isAr ? '3. كميات الاستلام، التعبئة بالكرتون وتكلفة الشراء' : '3. Stock In, Packaging & Purchase Cost'}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
              <div>
                <label className="text-slate-300 mb-0.5 block text-[10px] font-semibold">
                  {isKu ? 'کارتۆنەکان / شدەکان' : isAr ? 'عدد الكراتين / الشدات بالمخزن' : 'Cartons / Packs'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={cartonsCount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCartonsCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#070e17] text-white font-bold h-7 px-2 text-center rounded-lg border border-teal-500/30 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 mb-0.5 block text-[10px] font-semibold">
                  {isKu ? 'دانە لەناو کارتۆندا' : isAr ? 'عدد القطع / المفرد داخل الكرتون' : 'Pieces / Units Per Carton'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={unitsPerCarton}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setUnitsPerCarton(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#070e17] text-white font-bold h-7 px-2 text-center rounded-lg border border-teal-500/30 text-xs"
                />
              </div>

              <div className="bg-teal-950/60 border border-teal-500/40 h-10 px-2 rounded-lg text-center flex flex-col justify-center">
                <span className="text-slate-400 text-[8.5px] font-semibold">
                  {isKu ? 'کۆی گشتی دانەکان' : isAr ? 'إجمالي القطع المتوفرة' : 'Total Individual Units'}
                </span>
                <span className="text-xs font-black text-teal-300 font-mono">
                  {totalUnits} <span className="text-[9px] font-normal text-slate-400">{isKu ? 'دانە' : isAr ? 'قطعة' : 'pcs'}</span>
                </span>
              </div>

              <div>
                <label className="text-slate-300 mb-0.5 block text-[10px] font-semibold">
                  {isKu ? 'تێچووی کڕینی کارتۆن' : isAr ? 'سعر شراء الكرتون / الشدة' : 'Carton Purchase Cost'} ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cartonPurchasePrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCartonPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#070e17] text-amber-300 font-bold h-7 px-2 text-center rounded-lg border border-amber-500/30 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-1 px-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[10.5px]">
              <span className="text-slate-300 font-semibold">
                {isKu ? 'تێچووی حیسابکراوی یەک دانە:' : isAr ? 'تكلفة شراء القطعة الواحدة للماركت (تلقائي):' : 'Calculated Cost Per Unit / Piece:'}
              </span>
              <span className="text-xs font-black text-amber-400 font-mono">
                {currencySymbol} {formatNumber(costPerUnit)}
              </span>
            </div>
          </div>

          {/* SECTION 4: SELLING PRICES & PROFIT CALCULATIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-slate-300 mb-0.5 block font-bold text-[10px]">
                {isKu ? 'نرخی فرۆشتنی تاک (بە کڕیار)' : isAr ? 'سعر بيع القطعة (مفرد للمستهلك)' : 'Retail Price (Per Piece)'} ({currencySymbol}) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={singleRetailPrice}
                onFocus={(e) => e.target.select()}
                onBlur={() => setSingleRetailBlurred(true)}
                onChange={(e) => setSingleRetailPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className={`w-full font-bold h-7 px-2 text-center rounded-lg text-xs transition-all focus:outline-none ${
                  isSingleRetailBelowCost && singleRetailBlurred
                    ? 'bg-rose-950/60 text-rose-300 border-2 border-rose-500 ring-1 ring-rose-500/40'
                    : 'bg-[#0e1927] text-emerald-400 border border-emerald-500/40 focus:border-emerald-400'
                }`}
              />
              {isSingleRetailBelowCost && singleRetailBlurred && (
                <div className="mt-1 p-0.5 px-1 rounded bg-rose-500/20 border border-rose-500/50 text-[9px] font-bold text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>{isAr ? `أقل من التكلفة (${formatNumber(costPerUnit)})!` : `Below cost!`}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-slate-300 mb-0.5 block font-bold text-[10px]">
                {isKu ? 'نرخی فرۆشتنی کۆ (بۆ دوکانەکان)' : isAr ? 'سعر بيع القطعة (بالجملة / للمحلات)' : 'Wholesale Price (Per Piece)'} ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={wholesalePrice}
                onFocus={(e) => e.target.select()}
                onBlur={() => setWholesaleBlurred(true)}
                onChange={(e) => setWholesalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                className={`w-full font-bold h-7 px-2 text-center rounded-lg text-xs transition-all focus:outline-none ${
                  isWholesaleBelowCost && wholesaleBlurred
                    ? 'bg-rose-950/60 text-rose-300 border-2 border-rose-500 ring-1 ring-rose-500/40'
                    : 'bg-[#0e1927] text-teal-300 border border-teal-500/30 focus:border-teal-400'
                }`}
              />
            </div>

            <div>
              <label className="text-slate-300 mb-0.5 block font-bold text-[10px]">
                {isKu ? 'نرخی فرۆشتنی کارتۆنی تەواو' : isAr ? 'سعر بيع الكرتون الكامل' : 'Carton Selling Price'} ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cartonSellingPrice}
                onFocus={(e) => e.target.select()}
                onBlur={() => setCartonSellBlurred(true)}
                onChange={(e) => setCartonSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className={`w-full font-bold h-7 px-2 text-center rounded-lg text-xs transition-all focus:outline-none ${
                  isCartonSellBelowCost && cartonSellBlurred
                    ? 'bg-rose-950/60 text-rose-300 border-2 border-rose-500 ring-1 ring-rose-500/40'
                    : 'bg-[#0e1927] text-purple-300 border border-purple-500/30 focus:border-purple-400'
                }`}
              />
            </div>
          </div>

          {/* THREE AUTOMATIC PROFIT CARDS */}
          <div className="bg-[#08101a] p-1.5 rounded-xl border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-0.5">
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {isKu ? 'قازانجی حیسابکراو بۆ مارکێت:' : isAr ? 'الأرباح المحسوبة تلقائياً:' : 'Real-time Profit Margins:'}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Real-time Margins</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <div className="bg-[#050a12] p-1 rounded-lg border border-emerald-500/20 text-center">
                <span className="text-[9px] text-slate-400 font-semibold block">
                  {isKu ? 'قازانجی تاک' : isAr ? 'ربح المفرد (للزبون)' : 'Single Retail Profit'}
                </span>
                <span className={`text-xs font-black font-mono block ${singleProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {currencySymbol}{formatNumber(singleProfit)}
                </span>
              </div>

              <div className="bg-[#050a12] p-1 rounded-lg border border-teal-500/20 text-center">
                <span className="text-[9px] text-slate-400 font-semibold block">
                  {isKu ? 'قازانجی کۆ' : isAr ? 'ربح الجملة' : 'Wholesale Profit'}
                </span>
                <span className={`text-xs font-black font-mono block ${wholesaleProfit >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                  {currencySymbol}{formatNumber(wholesaleProfit)}
                </span>
              </div>

              <div className="bg-[#050a12] p-1 rounded-lg border border-purple-500/20 text-center">
                <span className="text-[9px] text-slate-400 font-semibold block">
                  {isKu ? 'قازانجی کارتۆن' : isAr ? 'ربح الكرتون الكامل' : 'Carton Profit'}
                </span>
                <span className={`text-xs font-black font-mono block ${cartonProfit >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>
                  {currencySymbol}{formatNumber(cartonProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: STORAGE & DISPLAY LOCATION IN MARKET */}
          <div className="bg-[#0e1927] p-2 rounded-xl border border-purple-500/30 space-y-1.5">
            <h3 className="text-xs font-black text-purple-300 flex items-center gap-1.5 border-b border-slate-800 pb-0.5">
              <Thermometer className="w-3.5 h-3.5 text-purple-400" />
              <span>{isKu ? '٤. مەرجی پاراستن و شوێنی ڕەفە لە مارکێت' : isAr ? '4. ظروف الحفظ ومكان العرض والرف في الماركت' : '4. Storage, Display Section & Shelf Location'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-6">
                <label className="text-slate-300 mb-0.5 block font-semibold text-[10px]">
                  {isKu ? 'مەرجی پاراستن و ساردکردنەوە' : isAr ? 'شروط الحفظ والتبريد / العرض' : 'Storage / Chilling Condition'}
                </label>
                <select
                  value={storageCondition}
                  onChange={(e) => setStorageCondition(e.target.value)}
                  className="w-full bg-[#070e17] text-purple-300 h-7 px-2 rounded-lg border border-purple-500/30 focus:outline-none text-xs font-bold cursor-pointer"
                >
                  <option value="dry_grocery">{isKu ? '🌡️ پلەی گەرمی دوکان / ڕەفەی ئاسایی' : isAr ? '🌡️ حرارة المحل / رف جاف عادي (Dry Grocery)' : '🌡️ Room Temp / Dry Grocery'}</option>
                  <option value="chiller">{isKu ? '❄️ سەلاجەی عەرز (2°C - 8°C)' : isAr ? '❄️ ثلاجة عرض مبردة للألبان والعصائر (Chiller 2°C - 8°C)' : '❄️ Dairy/Juice Chiller (2°C - 8°C)'}</option>
                  <option value="freezer">{isKu ? '🧊 بەستەری فریزەر بۆ گۆشت و بەفر' : isAr ? '🧊 مجمدة فريزر لحوم ومثلجات (Freezer < -18°C)' : '🧊 Meat & Ice Cream Freezer (< -18°C)'}</option>
                  <option value="cool_dry">{isKu ? '🌬️ شوێنی فێنک و وشک دوور لە شێ' : isAr ? '🌬️ مكان بارد وجاف بعيداً عن الشمس والرطوبة' : '🌬️ Cool & Dry Place'}</option>
                  <option value="promo_basket">{isKu ? '🧺 سەبەتەی عەرز یان ستاندی ئۆفەر' : isAr ? '🧺 سلة عروض خاصة أو منصة أرضية (Promo Pallet)' : '🧺 Promo Basket / Floor Display'}</option>
                </select>
              </div>

              <div className="md:col-span-6">
                <label className="text-slate-300 mb-0.5 block font-semibold text-[10px]">
                  {isKu ? 'شوێنی ڕەفە یان سەلاجە لە مارکێت' : isAr ? 'قاطع الماركت ومكان الرف أو الثلاجة' : 'Aisle, Shelf or Chiller Location'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    placeholder={isKu ? 'نموونە: بەشی شیرییەکان - ڕەفەی ٢' : isAr ? 'مثال: قاطع الألبان - رف 2 / ممر البسكويت A-04' : 'e.g. Dairy Section - Shelf 2 / Aisle A-04'}
                    className="w-full bg-[#070e17] text-slate-100 h-7 px-2 pr-7 rounded-lg border border-purple-500/30 focus:outline-none focus:border-purple-400 text-xs font-semibold"
                  />
                  <MapPin className="w-3.5 h-3.5 text-purple-400 absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
            >
              {isKu ? 'پەشیمانبوونەوە' : isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              className="px-6 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:brightness-110 text-white font-black text-xs shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-400/40"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{isKu ? 'پاشەکەوتکردنی کاڵا لە مارکێت' : isAr ? 'حفظ وتأكيد بيانات المادة بالماركت' : 'Save Market Product'}</span>
            </button>
          </div>

        </form>

        {/* MODAL: ADD CUSTOM PACKAGING UNIT */}
        {showAddUnitModal && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
            <div className="bg-[#0b131f] p-4 rounded-2xl border border-emerald-500/50 max-w-sm w-full space-y-3 shadow-2xl animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'إضافة نوع وحدة وتعبئة جديدة' : isKu ? 'زیادکردنی جۆری یەکەی نوێ' : 'Add New Packaging Unit'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-semibold block">
                  {isAr ? 'اسم الوحدة / التعبئة الجديدة:' : isKu ? 'ناوی یەکە یان پاکێج:' : 'Packaging Unit Name:'}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newUnitInput}
                  onChange={(e) => setNewUnitInput(e.target.value)}
                  placeholder={isAr ? 'مثال: ربطة، سلة، قنينة بلاستيك، برميل' : isKu ? 'نموونە: بەستە، سەبەتە' : 'e.g. Bundle, Basket, Plastic Jug'}
                  className="w-full bg-[#070e17] text-slate-100 h-8 px-2.5 rounded-lg border border-emerald-500/40 text-xs focus:outline-none focus:border-emerald-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  {isAr ? 'إلغاء' : isKu ? 'داخستن' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleAddNewUnit}
                  className="px-4 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                >
                  {isAr ? 'إضافة واعتماد' : isKu ? 'زیادکردن' : 'Add & Select'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
