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
  CheckCircle2,
  MapPin,
  Barcode as BarcodeIcon,
  Thermometer,
  Pill,
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

export const PHARMA_DEFAULT_CATEGORIES = [
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

export const DEFAULT_DOSAGE_FORMS = [
  'أقراص / حبوب (Tablets)',
  'كبسولات (Capsules)',
  'شراب / معلق (Syrup / Suspension)',
  'حقن أمبول (Injection Ampoule)',
  'حقن فيال (Injection Vial)',
  'مرهم / دهان (Ointment)',
  'كريم موضعي (Cream)',
  'قطرة عيون (Eye Drops)',
  'قطرة أذن / أنف (Ear/Nose Drops)',
  'بخاخ استنشاق (Inhaler / Spray)',
  'تحاميل / لبوس (Suppositories)',
  'أكياس فوار (Effervescent Sachets)',
  'لصقات طبية (Transdermal Patches)',
  'محلول وريدي (IV Infusion)',
  'جل موضعي (Topical Gel)',
  'مسحوق / بودرة (Powder)',
  'غسول / لوشن (Lotion / Wash)',
  'محلول مطهر (Antiseptic Solution)'
];

export const DEFAULT_ORIGIN_COUNTRIES = [
  'العراق (Iraq)',
  'تركيا (Turkey)',
  'الأردن (Jordan)',
  'مصر (Egypt)',
  'ألمانيا (Germany)',
  'بريطانيا (UK)',
  'فرنسا (France)',
  'سويسرا (Switzerland)',
  'الهند (India)',
  'إيطاليا (Italy)',
  'السعودية (Saudi Arabia)',
  'الإمارات (UAE)',
  'إسبانيا (Spain)',
  'الولايات المتحدة (USA)',
  'قبرص (Cyprus)',
  'لبنان (Lebanon)',
  'بلجيكا (Belgium)',
  'هولندا (Netherlands)',
  'النمسا (Austria)',
  'اليابان (Japan)'
];

export const DEFAULT_MANUFACTURERS = [
  'سامراء SDI (Samarra)',
  'بايونير Pioneer (السليمانية)',
  'أواميدیکا Awamedica (أربيل)',
  'الحكمة Hikma Pharmaceuticals',
  'جلفار Julphar',
  'نوفارتس Novartis',
  'سانوفي Sanofi',
  'غلاكسو سميث كلاين GSK',
  'فايزر Pfizer',
  'باير Bayer',
  'استرازينيكا AstraZeneca',
  'دار الدواء DAD',
  'سيرفييه Servier',
  'ميرك Merck',
  'روش Roche',
  'جونسون آند جونسون J&J',
  'ابوت Abbott',
  'تبوك Tabuk Pharma',
  'أكتافيس Actavis',
  'ايبيكو EIPICO'
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

export const getSavedDosageForms = (): string[] => {
  try {
    const saved = localStorage.getItem('pharma_custom_dosage_forms');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_DOSAGE_FORMS, ...parsed]));
      }
    }
  } catch (e) {
    console.error('Failed to parse custom dosage forms', e);
  }
  return DEFAULT_DOSAGE_FORMS;
};

export const saveCustomDosageFormToStorage = (newForm: string) => {
  if (!newForm || !newForm.trim()) return;
  const trimmed = newForm.trim();
  const current = getSavedDosageForms();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem('pharma_custom_dosage_forms', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom dosage form', e);
    }
  }
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
  const lang = settings?.language || 'ar';
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const currencySymbol = settings?.currencySymbol || 'د.ع';

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Guidance Banner Toggle State
  const [showGuidance, setShowGuidance] = useState<boolean>(false);

  // Dynamic Categories & Dosage Forms lists
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    try {
      return getSavedCategories();
    } catch {
      return PHARMA_DEFAULT_CATEGORIES;
    }
  });

  const [dosageFormsList, setDosageFormsList] = useState<string[]>(() => {
    try {
      return getSavedDosageForms();
    } catch {
      return DEFAULT_DOSAGE_FORMS;
    }
  });

  // Modal for adding a new dosage form
  const [showAddDosageModal, setShowAddDosageModal] = useState(false);
  const [newDosageFormInput, setNewDosageFormInput] = useState('');

  // Basic Product State
  const [barcode, setBarcode] = useState('');
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState('');
  const [supplierDelegate, setSupplierDelegate] = useState('');
  const [categoryAr, setCategoryAr] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  // 🏥 Pharmaceutical Fields
  const [scientificName, setScientificName] = useState(''); // الاسم العلمي (Active Ingredient)
  const [dosageForm, setDosageForm] = useState(DEFAULT_DOSAGE_FORMS[0]); // الشكل الدوائي
  const [dosageStrength, setDosageStrength] = useState('500mg'); // التركيز (e.g. 500mg, 100ml)
  const [countryOfOrigin, setCountryOfOrigin] = useState(''); // الدولة المصنعة للدواء
  const [manufacturer, setManufacturer] = useState(''); // الشركة المصنعة
  const [pharmaCategory, setPharmaCategory] = useState<'OTC' | 'Rx' | 'Controlled' | 'Supplies' | 'Cosmetics'>('OTC'); // الفئة والترميز
  const [batchNumber, setBatchNumber] = useState(''); // رقم التشغيلة (Batch/Lot No)
  const [expiryAlertMonths, setExpiryAlertMonths] = useState<number>(6); // تنبيه قبل 6 أشهر
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
      const currentDosageForms = getSavedDosageForms();
      setBarcodeError(null);
      setSingleRetailBlurred(false);
      setWholesaleBlurred(false);
      setCartonSellBlurred(false);

      if (productToEdit) {
        const prodCategory = productToEdit.categoryAr || productToEdit.category || 'أدوية ومسكنات (OTC / Rx)';
        if (prodCategory && !currentCategories.includes(prodCategory)) {
          currentCategories.push(prodCategory);
        }
        setCategoriesList(Array.from(new Set(currentCategories)));

        const prodDosageForm = productToEdit.dosageForm || DEFAULT_DOSAGE_FORMS[0];
        if (prodDosageForm && !currentDosageForms.includes(prodDosageForm)) {
          currentDosageForms.push(prodDosageForm);
        }
        setDosageFormsList(Array.from(new Set(currentDosageForms)));

        setBarcode(productToEdit.barcode || '');
        setNameAr(productToEdit.nameAr || productToEdit.name || '');
        setSupplierDelegate(productToEdit.supplierDelegate || productToEdit.supplierName || '');
        setCategoryAr(prodCategory);

        // Pharma fields populate
        setScientificName(productToEdit.scientificName || '');
        setDosageForm(prodDosageForm);
        setCountryOfOrigin(productToEdit.countryOfOrigin || '');
        setManufacturer(productToEdit.manufacturer || '');
        setPharmaCategory((productToEdit.pharmaCategory as any) || 'OTC');
        setBatchNumber(productToEdit.batchNumber || '');
        setExpiryAlertMonths(productToEdit.expiryAlertMonths || 6);
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
        setDosageFormsList(Array.from(new Set(currentDosageForms)));
        const uniqueBar = generateUniqueBarcode200245(existingProducts);
        const randBatch = `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        setBarcode(uniqueBar);
        setNameAr('');
        setSupplierDelegate(initialSupplierName || '');
        setCategoryAr(currentCategories[0] || 'أدوية ومسكنات (OTC / Rx)');
        
        setScientificName('');
        setDosageForm(currentDosageForms[0] || DEFAULT_DOSAGE_FORMS[0]);
        setCountryOfOrigin('العراق (Iraq)');
        setManufacturer('سامراء SDI (Samarra)');
        setPharmaCategory('OTC');
        setBatchNumber(randBatch);
        setExpiryAlertMonths(6);
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
    setBatchNumber(`BATCH-${year}-${randCode}`);
  };

  // Add new custom dosage form
  const handleAddNewDosageForm = () => {
    if (!newDosageFormInput.trim()) return;
    const formName = newDosageFormInput.trim();
    saveCustomDosageFormToStorage(formName);
    setDosageFormsList(prev => {
      if (prev.includes(formName)) return prev;
      return [...prev, formName];
    });
    setDosageForm(formName);
    setNewDosageFormInput('');
    setShowAddDosageModal(false);
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
          return { label: isKu ? 'دەرمانی بەسەرچوو' : isAr ? 'دواء منتهي الصلاحية' : 'Expired', color: 'bg-rose-950/80 text-rose-300 border-rose-500/50' };
        } else if (diffMonths <= (expiryAlertMonths || 6)) {
          return { label: isKu ? `نزیکە لە بەسەرچوون (${Math.ceil(diffMonths)} مانگ)` : isAr ? `قريب من الانتهاء (${Math.ceil(diffMonths)} شهر)` : `Near Expiry (${Math.ceil(diffMonths)} mo)`, color: 'bg-amber-950/80 text-amber-300 border-amber-500/50' };
        } else {
          return { label: isKu ? 'صلاحية دروستە' : isAr ? 'صلاحية ممتازة' : 'Valid', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' };
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
          ? `❌ پاشەکەوت ناکرێت! بارکۆدی (${barcode}) پێشتر بۆ دەرمانی (${duplicateProduct.nameKu || duplicateProduct.nameAr || duplicateProduct.name}) بەکارهاتووە.`
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
          ? `❌ لا يمكن حفظ المادة!\n\nسعر بيع المفرد (${formatNumber(singleRetail)} ${currencySymbol}) أقل من سعر التكلفة والشراء (${formatNumber(costPerUnit)} ${currencySymbol})!`
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
      lastEditDate: todayStr,
      lastPriceUpdate: lastPriceUpdateDate,
      priceHistory: updatedHistory,
      expiryDate: expiryDate,

      // 🏥 Pharmaceutical Specific Fields
      scientificName: scientificName.trim(),
      dosageForm: dosageForm,
      countryOfOrigin: countryOfOrigin.trim(),
      manufacturer: manufacturer.trim(),
      pharmaCategory: pharmaCategory,
      batchNumber: batchNumber || `BATCH-${Date.now().toString().slice(-6)}`,
      expiryAlertMonths: expiryAlertMonths,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-1.5 sm:p-3 overflow-y-auto" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {/* Modal Container */}
      <div className="cyber-card p-2.5 sm:p-3.5 rounded-2xl border border-cyan-500/40 w-full max-w-5xl max-h-[96vh] bg-[#0a1120] text-slate-100 relative animate-scaleUp shadow-2xl overflow-y-auto flex flex-col justify-between custom-scrollbar">
        
        {/* Header - Compact */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black bg-gradient-to-r from-cyan-300 via-white to-blue-300 bg-clip-text text-transparent leading-tight">
                {productToEdit
                  ? (isKu ? 'دەستکاریکردنی زانیاری دەرمان' : isAr ? 'تعديل بيانات الصنف الدوائي' : 'Edit Pharmaceutical Product')
                  : (isKu ? 'تۆمارکردن و پێناسەکردنی دەرمانی نوێ' : isAr ? 'إضافة وتعريف صنف دوائي ومادة جديدة' : 'Add New Pharmaceutical Product')}
              </h2>
              <p className="text-[10px] text-slate-400">
                {isKu ? 'دروستکەر، دەوڵەت، وەجبە، بەروار و نرخەکان' : isAr ? 'الدولة المصنعة، الشركة، رقم التشغيلة، الشكل الدوائي والأسعار' : 'Origin, Manufacturer, Batch No, Dosage Form & Pricing'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowGuidance(prev => !prev)}
              className="p-1 px-2 rounded-lg bg-cyan-950/70 text-cyan-300 hover:bg-cyan-900/80 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Info className="w-3 h-3 text-cyan-400" />
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
          <div className="my-1.5 p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[10.5px] text-cyan-200 space-y-1 animate-fadeIn shrink-0">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isKu ? 'ڕێنمایی خێرای داخڵکردنی دەرمان:' : isAr ? 'ضوابط الإدخال الدوائي السريع:' : 'Quick Pharma Rules:'}</span>
            </div>
            <p className="text-slate-300 leading-snug">
              {isKu
                ? '• دەتوانیت دەوڵەتی دروستکەر و ناوی کۆمپانیا و شێوازی دەرمان هەڵبژێریت یان جۆری نوێ زیاد بکەیت. بارکۆدی تایبەت بە 200245 دروست دەکرێت.'
                : isAr
                ? '• يمكنك تحديد الدولة المصنعة واسم الشركة المنتجة ورقم التشغيلة (Batch Number)، مع إضافة أشكال دوائية مخصصة وحفظها تلقائياً.'
                : '• Fill Country of origin, Manufacturer company, Batch number and select/add custom dosage forms.'}
            </p>
          </div>
        )}

        {/* MAIN FORM BODY */}
        <form onSubmit={handleSubmit} className="space-y-2.5 pt-1.5">

          {/* SECTION 1: BASIC & PHARMA IDENTIFICATION (بيانات الدواء والشركة والمصنع) */}
          <div className="bg-[#10192d] p-2.5 rounded-xl border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <h3 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isKu ? '١. ناسنامەی دەرمان و دروستکەر (Identification & Manufacturer)' : isAr ? '1. البيانات الأساسية والشركة المصنعة والدولة' : '1. Product & Manufacturer Data'}</span>
              </h3>
              <span className="text-[9.5px] text-slate-400 font-mono">Pharma Registry</span>
            </div>

            {/* Row 1: Barcode + Trade Name + Scientific Name */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
              
              {/* Barcode Field */}
              <div className="md:col-span-4">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'بارکۆد' : isAr ? 'الباركود الدولي أو المحلي' : 'Barcode'} <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={(e) => handleBarcodeChange(e.target.value)}
                    placeholder="200245..."
                    className={`w-full bg-[#0a1120] font-mono font-bold h-7 px-2 rounded-lg border focus:outline-none text-xs transition-colors ${
                      barcodeError || duplicateProduct
                        ? 'border-rose-500 text-rose-300 bg-rose-950/30 ring-1 ring-rose-500/50'
                        : 'border-cyan-500/30 text-cyan-300 focus:border-cyan-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="px-2 h-7 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white rounded-lg text-[10px] font-bold whitespace-nowrap border border-cyan-400/40 cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
                    title={isKu ? 'دروستکردنی بارکۆد' : isAr ? 'توليد باركود جديد' : 'Generate barcode'}
                  >
                    <Sparkles className="w-3 h-3 text-cyan-200" />
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
                  {isKu ? 'ناوی بازرگانی دەرمان' : isAr ? 'الاسم التجاري للمادة الدوائية' : 'Trade Name'} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder={isKu ? 'نموونە: Panadol Extra 500mg' : isAr ? 'مثال: بنادول اكسترا / Amoxil 500' : 'e.g. Panadol Extra 500mg'}
                  className="w-full bg-[#0a1120] text-slate-100 h-7 px-2 rounded-lg border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
                />
              </div>

              {/* Scientific Name (Active Ingredient) */}
              <div className="md:col-span-4">
                <label className="text-cyan-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'ناوی زانستی (Active Ingredient)' : isAr ? 'الاسم العلمي والمادة الفعالة' : 'Scientific Name'} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={scientificName}
                  onChange={(e) => setScientificName(e.target.value)}
                  placeholder={isKu ? 'Paracetamol + Caffeine' : isAr ? 'مثال: Paracetamol + Caffeine' : 'e.g. Paracetamol + Caffeine'}
                  className="w-full bg-[#0a1120] text-emerald-300 font-mono h-7 px-2 rounded-lg border border-emerald-500/40 focus:outline-none focus:border-emerald-400 text-xs"
                />
              </div>

            </div>

            {/* Row 2: Country of Origin + Manufacturer Name + Dosage Form + Pharma Category */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-0.5 items-start">
              
              {/* 🌍 الدولة المصنعة للدواء (Country of Origin) */}
              <div className="md:col-span-3">
                <label className="text-cyan-300 mb-0.5 block font-bold text-[10px] flex items-center gap-1">
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span>{isKu ? 'دەوڵەتی دروستکەر' : isAr ? 'الدولة المصنعة للدواء' : 'Country of Origin'}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="countries-datalist"
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    placeholder={isKu ? 'نموونە: عێراق، تورکیا، ئەڵمانیا' : isAr ? 'مثال: العراق، تركيا، ألمانيا' : 'e.g. Iraq, Germany, UK'}
                    className="w-full bg-[#0a1120] text-slate-100 h-7 px-2 rounded-lg border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
                  />
                  <datalist id="countries-datalist">
                    {DEFAULT_ORIGIN_COUNTRIES.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 🏢 اسم الشركة المصنعة (Manufacturer) */}
              <div className="md:col-span-3">
                <label className="text-cyan-300 mb-0.5 block font-bold text-[10px] flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-cyan-400" />
                  <span>{isKu ? 'ناوی کۆمپانیای دروستکەر' : isAr ? 'اسم الشركة المصنعة' : 'Manufacturer Name'}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="manufacturers-datalist"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder={isKu ? 'نموونە: SDI Samarra / Pioneer' : isAr ? 'مثال: سامراء SDI / Pioneer / Hikma' : 'e.g. SDI Samarra / Hikma'}
                    className="w-full bg-[#0a1120] text-slate-100 h-7 px-2 rounded-lg border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
                  />
                  <datalist id="manufacturers-datalist">
                    {DEFAULT_MANUFACTURERS.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 💊 الشكل الدوائي (Dosage Form) with Add Custom Option */}
              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-slate-300 font-bold text-[10px] flex items-center gap-1">
                    <Pill className="w-3 h-3 text-cyan-400" />
                    <span>{isKu ? 'شێوەی دەرمان' : isAr ? 'الشكل الدوائي' : 'Dosage Form'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddDosageModal(true)}
                    className="text-[9px] text-cyan-300 hover:text-cyan-200 font-bold flex items-center gap-0.5 bg-cyan-950/80 px-1 rounded border border-cyan-500/40"
                    title={isAr ? 'إضافة شكل دوائي جديد للقائمة' : isKu ? 'زیادکردنی شێوەی نوێ' : 'Add new dosage form'}
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{isAr ? 'جديد' : isKu ? 'نوێ' : 'New'}</span>
                  </button>
                </div>
                <select
                  value={dosageForm}
                  onChange={(e) => setDosageForm(e.target.value)}
                  className="w-full bg-[#0a1120] text-slate-100 h-7 px-1.5 rounded-lg border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs font-semibold cursor-pointer"
                >
                  {dosageFormsList.map(form => (
                    <option key={form} value={form}>{form}</option>
                  ))}
                </select>
              </div>

              {/* Pharma Classification (OTC / Rx / Controlled / Supplies) */}
              <div className="md:col-span-3">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'پۆلێن و کۆدی دەرمان' : isAr ? 'الفئة والترميز الدوائي' : 'Pharma Classification'}
                </label>
                <select
                  value={pharmaCategory}
                  onChange={(e) => setPharmaCategory(e.target.value as any)}
                  className="w-full bg-[#0a1120] text-slate-100 h-7 px-1.5 rounded-lg border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs font-bold"
                >
                  <option value="OTC">{isKu ? 'OTC - بێ ڕەچەتە' : isAr ? 'OTC - أدوية بدون وصفة' : 'OTC - Over The Counter'}</option>
                  <option value="Rx">{isKu ? 'Rx - بە ڕەچەتەی پزیشک' : isAr ? 'Rx - أدوية بوصفة طبية' : 'Rx - Prescription Only'}</option>
                  <option value="Controlled">{isKu ? 'Controlled - چاودێریکراو' : isAr ? 'Controlled - أدوية مراقبة' : 'Controlled Medicine'}</option>
                  <option value="Supplies">{isKu ? 'Supplies - پێداویستی پزیشکی' : isAr ? 'Supplies - مستلزمات طبية' : 'Medical Supplies'}</option>
                  <option value="Cosmetics">{isKu ? 'Cosmetics - چاودێری و جوانکاری' : isAr ? 'Cosmetics - عناية وتجميل' : 'Cosmetics'}</option>
                </select>
              </div>

            </div>

            {/* Row 3: Pharmacy Category + Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-0.5 items-start">
              <div className="md:col-span-6">
                <label className="text-slate-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'پۆلێنی ناو دەرمانخانە' : isAr ? 'التصنيف الدوائي بالصيدلية' : 'Pharmacy Category'}
                </label>
                <select
                  value={categoryAr}
                  onChange={(e) => setCategoryAr(e.target.value)}
                  className="w-full bg-[#0a1120] text-slate-200 h-7 px-2 rounded-lg border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
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
                  {isKu ? 'کۆگای دەرمان / کۆمپانیای دابینکەر' : isAr ? 'مذخر الأدوية / الشركة الموردة' : 'Supplier / Drug Store'}
                </label>
                <input
                  type="text"
                  list="suppliers-datalist"
                  value={supplierDelegate}
                  onChange={(e) => setSupplierDelegate(e.target.value)}
                  placeholder={isKu ? 'ناوی کۆگا یان کۆمپانیا' : isAr ? 'اسم المذخر أو الشركة' : 'Drug store or supplier'}
                  className="w-full bg-[#0a1120] text-slate-200 h-7 px-2 rounded-lg border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-xs"
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

          {/* SECTION 2: BATCH & EXPIRY SYSTEM (التشغيلات والتواريخ والباج نمبر) */}
          <div className="bg-[#10192d] p-2.5 rounded-xl border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 flex-wrap gap-2">
              <h3 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{isKu ? '٢. وەجبەکان و بەرواری بەسەرچوون (Batch & Expiry)' : isAr ? '2. رقم التشغيلة (Batch No) وتاريخ الصلاحية والتنبيه' : '2. Batch & Expiry Dates'}</span>
              </h3>
              {expiryStatusInfo && (
                <div className={`p-0.5 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${expiryStatusInfo.color}`}>
                  <ShieldAlert className="w-3 h-3 shrink-0" />
                  <span>{expiryStatusInfo.label}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              {/* 1. Batch Number / رقم التشغيلة */}
              <div className="md:col-span-5">
                <label className="text-amber-300 mb-0.5 block font-bold text-[10px]">
                  {isKu ? 'ژمارەی وەجبە (Batch No)' : isAr ? 'رقم التشغيلة / الوجبة (Batch Number)' : 'Batch Number'} <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="BATCH-2026-X01"
                    className="w-full bg-[#0a1120] text-amber-300 font-mono font-bold h-7 px-2 rounded-lg border border-amber-500/30 focus:outline-none focus:border-amber-400 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateBatch}
                    className="px-2 h-7 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-bold whitespace-nowrap border border-slate-700 cursor-pointer active:scale-95 transition-colors"
                  >
                    {isKu ? 'وەجبەی نوێ' : isAr ? 'توليد باج' : 'New Batch'}
                  </button>
                </div>
              </div>

              {/* 2. Expiry Date / تاريخ انقضاء الصلاحية */}
              <div className="md:col-span-4">
                <label className="text-amber-300 mb-0.5 block font-bold text-[10px]">
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
                <label className="text-slate-300 mb-0.5 block font-bold text-[10px] whitespace-nowrap">
                  {isKu ? 'ئاگاداری پێشوەختە (مانگ)' : isAr ? 'مدة التنبيه المبكر (بالأشهر)' : 'Alert (Months)'}
                </label>
                <div className="flex items-center gap-1 bg-[#0a1120] border border-amber-500/30 rounded-lg px-2 h-7 focus-within:border-amber-400">
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={expiryAlertMonths}
                    onChange={(e) => setExpiryAlertMonths(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent text-amber-300 font-mono font-bold text-xs text-center focus:outline-none"
                    placeholder="6"
                  />
                  <span className="text-[10px] text-slate-400 font-bold shrink-0">{isKu ? 'مانگ' : isAr ? 'أشهر' : 'mo'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: QUANTITIES & PURCHASING (الكميات والتعبئة والتكلفة) */}
          <div className="bg-[#10192d] p-2.5 rounded-xl border border-cyan-500/30 space-y-2">
            <h3 className="text-xs font-black text-cyan-300 flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Boxes className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isKu ? '٣. بڕی قوتووەکان، کارتۆن و تێچوو' : isAr ? '3. كميات العلب والتعبئة بالكرتون والتكلفة' : '3. Quantities, Packaging & Cost'}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
              <div>
                <label className="text-slate-300 mb-0.5 block text-[10px] font-semibold">
                  {isKu ? 'کارتۆنەکان' : isAr ? 'الكراتين / الشدات' : 'Cartons'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={cartonsCount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCartonsCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#0a1120] text-white font-bold h-7 px-2 text-center rounded-lg border border-cyan-500/30 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 mb-0.5 block text-[10px] font-semibold">
                  {isKu ? 'قوتوو / کارتۆن' : isAr ? 'علب / كرتونة' : 'Boxes/Carton'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={unitsPerCarton}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setUnitsPerCarton(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#0a1120] text-white font-bold h-7 px-2 text-center rounded-lg border border-cyan-500/30 text-xs"
                />
              </div>

              <div className="bg-cyan-950/60 border border-cyan-500/40 h-10 px-2 rounded-lg text-center flex flex-col justify-center">
                <span className="text-slate-400 text-[8.5px] font-semibold">
                  {isKu ? 'کۆی گشتی قوتووەکان' : isAr ? 'مجموع العلب' : 'Total Boxes'}
                </span>
                <span className="text-xs font-black text-cyan-300 font-mono">
                  {totalUnits} <span className="text-[9px] font-normal text-slate-400">{isKu ? 'قوتوو' : isAr ? 'علبة' : 'bxs'}</span>
                </span>
              </div>

              <div>
                <label className="text-slate-300 mb-0.5 block text-[10px] font-semibold">
                  {isKu ? 'تێچووی کڕینی کارتۆن' : isAr ? 'شراء الكرتون' : 'Carton Cost'} ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cartonPurchasePrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCartonPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#0a1120] text-amber-300 font-bold h-7 px-2 text-center rounded-lg border border-amber-500/30 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-1 px-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[10.5px]">
              <span className="text-slate-300 font-semibold">
                {isKu ? 'تێچووی حیسابکراوی یەک قوتوو:' : isAr ? 'تكلفة شراء العلبة الواحدة (تلقائي):' : 'Calculated Unit Box Cost:'}
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
                {isKu ? 'نرخی فرۆشتنی تاک (بە کڕیار)' : isAr ? 'سعر بيع العلبة (مفرد للزبون)' : 'Retail Box Price'} ({currencySymbol}) <span className="text-rose-400">*</span>
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
                    : 'bg-[#10192d] text-emerald-400 border border-emerald-500/40 focus:border-emerald-400'
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
                {isKu ? 'نرخی فرۆشتنی کۆ' : isAr ? 'سعر بيع العلبة (بالجملة)' : 'Wholesale Box Price'} ({currencySymbol})
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
                    : 'bg-[#10192d] text-cyan-300 border border-cyan-500/30 focus:border-cyan-400'
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
                    : 'bg-[#10192d] text-purple-300 border border-purple-500/30 focus:border-purple-400'
                }`}
              />
            </div>
          </div>

          {/* THREE AUTOMATIC PROFIT CARDS */}
          <div className="bg-[#0b1324] p-1.5 rounded-xl border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-0.5">
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {isKu ? 'قازانجی حیسابکراو:' : isAr ? 'الأرباح المحسوبة تلقائياً:' : 'Profit Margins:'}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Real-time Margins</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <div className="bg-[#050810] p-1 rounded-lg border border-emerald-500/20 text-center">
                <span className="text-[9px] text-slate-400 font-semibold block">
                  {isKu ? 'قازانجی تاک' : isAr ? 'ربح المفرد' : 'Single Profit'}
                </span>
                <span className={`text-xs font-black font-mono block ${singleProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {currencySymbol}{formatNumber(singleProfit)}
                </span>
              </div>

              <div className="bg-[#050810] p-1 rounded-lg border border-cyan-500/20 text-center">
                <span className="text-[9px] text-slate-400 font-semibold block">
                  {isKu ? 'قازانجی کۆ' : isAr ? 'ربح الجملة' : 'WS Profit'}
                </span>
                <span className={`text-xs font-black font-mono block ${wholesaleProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {currencySymbol}{formatNumber(wholesaleProfit)}
                </span>
              </div>

              <div className="bg-[#050810] p-1 rounded-lg border border-purple-500/20 text-center">
                <span className="text-[9px] text-slate-400 font-semibold block">
                  {isKu ? 'قازانجی کارتۆن' : isAr ? 'ربح الكرتون' : 'Carton Profit'}
                </span>
                <span className={`text-xs font-black font-mono block ${cartonProfit >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>
                  {currencySymbol}{formatNumber(cartonProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: STORAGE & SHELF LOCATION (الحفظ والتخزين والرف) */}
          <div className="bg-[#10192d] p-2 rounded-xl border border-purple-500/30 space-y-1.5">
            <h3 className="text-xs font-black text-purple-300 flex items-center gap-1.5 border-b border-slate-800 pb-0.5">
              <Thermometer className="w-3.5 h-3.5 text-purple-400" />
              <span>{isKu ? '٤. مەرجەکانی هەڵگرتن و شوێنی ڕەفە لە دەرمانخانە' : isAr ? '4. ظروف الحفظ والتخزين ومكان الرف بالصيدلية' : '4. Storage & Shelf Location'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-6">
                <label className="text-slate-300 mb-0.5 block font-semibold text-[10px]">
                  {isKu ? 'مەرجەکانی پاراستن' : isAr ? 'متطلبات التخزين والحفظ الحراري' : 'Temperature Standard'}
                </label>
                <select
                  value={storageCondition}
                  onChange={(e) => setStorageCondition(e.target.value)}
                  className="w-full bg-[#0a1120] text-purple-300 h-7 px-2 rounded-lg border border-purple-500/30 focus:outline-none text-xs font-bold cursor-pointer"
                >
                  <option value="room_temp">{isKu ? '🌡️ پلەی گەرمی ژوور (< 25°C)' : isAr ? '🌡️ حرارة الغرفة (أقل من 25°C)' : '🌡️ Room Temp (< 25°C)'}</option>
                  <option value="refrigerator">{isKu ? '❄️ سەلاجەی دەرمان (2°C - 8°C)' : isAr ? '❄️ ثلاجة دوائية (2°C - 8°C)' : '❄️ Medical Fridge (2°C - 8°C)'}</option>
                  <option value="protect_light">{isKu ? '🌙 دوور لە ڕووناکی و شێ' : isAr ? '🌙 بعيداً عن الضوء والرطوبة' : '🌙 Protect from Light & Moisture'}</option>
                  <option value="cool_dry">{isKu ? '🌬️ شوێنی فێنک و وشک (< 20°C)' : isAr ? '🌬️ مكان بارد وجاف (أقل من 20°C)' : '🌬️ Cool & Dry Place (< 20°C)'}</option>
                  <option value="freezer">{isKu ? '🧊 بەستەری پزیشکی (< 0°C)' : isAr ? '🧊 مجمدة طبية (أقل من 0°C)' : '🧊 Medical Freezer (< 0°C)'}</option>
                </select>
              </div>

              <div className="md:col-span-6">
                <label className="text-slate-300 mb-0.5 block font-semibold text-[10px]">
                  {isKu ? 'شوێنی هەڵگرتن و ژمارەی ڕەفە' : isAr ? 'مكان التخزين ورقم الرف' : 'Shelf Location'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    placeholder={isKu ? 'نموونە: رف A-03' : isAr ? 'مثال: رف الصيدلية A-03' : 'e.g. Shelf A-03'}
                    className="w-full bg-[#0a1120] text-slate-100 h-7 px-2 pr-7 rounded-lg border border-purple-500/30 focus:outline-none focus:border-purple-400 text-xs font-semibold"
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
              className="px-6 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs shadow-md shadow-cyan-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-cyan-400/40"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{isKu ? 'پاشەکەوتکردنی دەرمان' : isAr ? 'حفظ وتأكيد بيانات المادة الدوائية' : 'Save Medicine Record'}</span>
            </button>
          </div>

        </form>

        {/* MODAL: ADD CUSTOM DOSAGE FORM */}
        {showAddDosageModal && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
            <div className="bg-[#0B1120] p-4 rounded-2xl border border-cyan-500/50 max-w-sm w-full space-y-3 shadow-2xl animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-cyan-400" />
                  <span>{isAr ? 'إضافة شكل دوائي جديد' : isKu ? 'زیادکردنی شێوەی دەرمانی نوێ' : 'Add New Dosage Form'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddDosageModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-semibold block">
                  {isAr ? 'اسم الشكل الدوائي الجديد:' : isKu ? 'ناوی شێوەی دەرمان:' : 'Dosage Form Name:'}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newDosageFormInput}
                  onChange={(e) => setNewDosageFormInput(e.target.value)}
                  placeholder={isAr ? 'مثال: لصقات جلدية، غسول فموي، رغوة' : isKu ? 'نموونە: لەزگەی پێست' : 'e.g. Mouthwash, Foam spray'}
                  className="w-full bg-[#070D1C] text-slate-100 h-8 px-2.5 rounded-lg border border-cyan-500/40 text-xs focus:outline-none focus:border-cyan-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDosageModal(false)}
                  className="px-3 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  {isAr ? 'إلغاء' : isKu ? 'داخستن' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleAddNewDosageForm}
                  className="px-4 py-1 text-xs font-bold rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
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
