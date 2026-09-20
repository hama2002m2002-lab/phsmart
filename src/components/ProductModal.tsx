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

  // Quantities & Packaging (Pharmacy tailored)
  const [pharmacyUnit, setPharmacyUnit] = useState<string>('باكت'); // باكت / علبة / شيت / أمبول / شراب / قرص
  const [packetsCount, setPacketsCount] = useState<number | ''>(''); // باكت (عدد الباكتات / الكمية)
  const [blistersPerBox, setBlistersPerBox] = useState<number | ''>(2); // شيت (عدد الشيتات داخل الباكت الواحد)
  const [purchasePrice, setPurchasePrice] = useState<number | ''>(''); // سعر شراء الباكت
  const [singleRetailPrice, setSingleRetailPrice] = useState<number | ''>(''); // سعر بيع الباكت للزبون
  const [blisterPrice, setBlisterPrice] = useState<number | ''>(''); // سعر بيع الشيت / الشريط الواحد

  // Blurred / Touched states for price validation on exit
  const [singleRetailBlurred, setSingleRetailBlurred] = useState(false);
  const [blisterPriceBlurred, setBlisterPriceBlurred] = useState(false);

  // Fullscreen state (default: true for filling entire screen)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);

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
      setBlisterPriceBlurred(false);

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
        
        setPharmacyUnit(productToEdit.unit || 'باكت');
        setPacketsCount(productToEdit.totalUnits ?? productToEdit.stock ?? 1);
        setBlistersPerBox(productToEdit.blistersPerBox || 2);
        setPurchasePrice(productToEdit.costPerUnit ?? productToEdit.cost ?? (productToEdit.cartonPurchasePrice && productToEdit.unitsPerCarton ? productToEdit.cartonPurchasePrice / productToEdit.unitsPerCarton : ''));
        setSingleRetailPrice(productToEdit.singleRetailPrice || productToEdit.price || '');
        setBlisterPrice(productToEdit.blisterPrice || '');
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

        setPharmacyUnit('باكت');
        setPacketsCount('');
        setBlistersPerBox(2);
        setPurchasePrice('');
        setSingleRetailPrice('');
        setBlisterPrice('');
      }
    }
  }, [productToEdit, isOpen, initialSupplierName, todayStr, existingProducts]);

  // Derived Automatic Calculations
  const totalUnits = Number(packetsCount) || 0;
  const numBlistersPerBox = Math.max(1, Number(blistersPerBox) || 1);
  const totalBlisters = totalUnits * numBlistersPerBox;

  const costPerUnit = Number(purchasePrice) || 0;
  const costPerBlister = numBlistersPerBox > 0 ? costPerUnit / numBlistersPerBox : 0;

  const singleRetail = Number(singleRetailPrice) || 0;
  const singleProfit = singleRetail - costPerUnit;

  const singleBlisterPrice = Number(blisterPrice) || 0;
  const blisterProfit = singleBlisterPrice - costPerBlister;

  // Profit Margins in Percentage
  const packetProfitPercent = costPerUnit > 0 ? Math.round((singleProfit / costPerUnit) * 100) : 0;
  const blisterProfitPercent = costPerBlister > 0 ? Math.round((blisterProfit / costPerBlister) * 100) : 0;

  // Validation flags: Selling price must not be lower than cost
  const isSingleRetailBelowCost = singleRetail > 0 && costPerUnit > 0 && singleRetail < costPerUnit;
  const isBlisterPriceBelowCost = singleBlisterPrice > 0 && costPerBlister > 0 && singleBlisterPrice < costPerBlister;

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
      cartonsCount: Math.ceil(totalUnits / 12) || 1,
      unitsPerCarton: productToEdit?.unitsPerCarton || 12,
      blistersPerBox: numBlistersPerBox,
      blisterPrice: singleBlisterPrice,
      totalUnits: totalUnits,
      cartonPurchasePrice: costPerUnit * (productToEdit?.unitsPerCarton || 12),
      lastPurchasePrice: productToEdit?.lastPurchasePrice || Number(costPerUnit.toFixed(2)),
      lastCartonPurchasePrice: productToEdit?.lastCartonPurchasePrice || (costPerUnit * (productToEdit?.unitsPerCarton || 12)),
      costPerUnit: Number(costPerUnit.toFixed(2)),
      singleRetailPrice: singleRetail,
      wholesalePrice: singleRetail,
      cartonSellingPrice: singleRetail * (productToEdit?.unitsPerCarton || 12),
      singleProfit: Number(singleProfit.toFixed(2)),
      wholesaleProfit: Number(singleProfit.toFixed(2)),
      cartonProfit: Number((singleProfit * (productToEdit?.unitsPerCarton || 12)).toFixed(2)),
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
      unit: pharmacyUnit || 'باكت',
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
    <div 
      className="fixed inset-0 z-50 bg-[#070c18] w-screen h-screen flex flex-col overflow-hidden text-slate-100" 
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      {/* Top Header Bar - Full Width & High Contrast */}
      <header className="bg-[#0b1329] border-b border-cyan-500/30 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-lg shadow-black/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 shrink-0">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black bg-gradient-to-r from-cyan-300 via-white to-blue-200 bg-clip-text text-transparent leading-none">
                {productToEdit
                  ? (isKu ? 'دەستکاریکردنی زانیاری دەرمان' : isAr ? 'تعديل بيانات الصنف الدوائي والمادة' : 'Edit Pharmaceutical Product')
                  : (isKu ? 'تۆمارکردن و پێناسەکردنی دەرمانی نوێ' : isAr ? 'إضافة وتعريف صنف دوائي ومادة جديدة بالصيدلية' : 'Add New Pharmaceutical Product')}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold">
                {productToEdit ? (isAr ? 'تعديل مادة' : 'Edit Mode') : (isAr ? 'شاشة كاملة للبيانات' : 'Full Screen Entry')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isKu ? 'دروستکەر، دەوڵەت، وەجبە، شیت و باکەت، بەروار و نرخەکان' : isAr ? 'الاسم العلمي، الدولة، المصنع، التشغيلة، التعبئة الصيدلانية (باكت / شيت / كرتونة) والأسعار والأرباح' : 'Scientific Name, Batch, Pharmacy Packaging (Packet/Sheet), Expiry & Pricing'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuidance(prev => !prev)}
            className="px-3 h-8 rounded-lg bg-cyan-950/70 text-cyan-300 hover:bg-cyan-900/80 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showGuidance ? (isAr ? 'إخفاء الدليل' : isKu ? 'شاردنەوە' : 'Hide Guide') : (isAr ? 'دليل الإدخال الصيدلاني' : isKu ? 'ڕێنمایی' : 'Pharma Guide')}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title={isAr ? 'إغلاق النافذة' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Guidance Alert (Collapsible) */}
      {showGuidance && (
        <div className="mx-4 mt-2 p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-xs text-cyan-200 space-y-1 animate-fadeIn shrink-0 shadow-md">
          <div className="flex items-center gap-2 font-bold text-cyan-300">
            <Sparkles className="w-4 h-4" />
            <span>{isKu ? 'ڕێنمایی خێرای داخڵکردنی دەرمانخانە:' : isAr ? 'ضوابط ونظام الإدخال الصيدلاني والتعبئة:' : 'Pharmacy Data Entry Rules:'}</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[13px]">
            {isKu
              ? '• دەتوانیت جۆری یەکە هەڵبژێریت (باکەت / شیت / کارتۆن) و ژمارەی شیت لەناو باکەت دیاری بکەیت تا سیستەم بە شێوەی ئۆتۆماتیکی قازانج و تێچووی باکەت و شیت حیساب بکات.'
              : isAr
              ? '• يدعم النظام وحدات الصيدلية بدقة: اختر الوحدة الأساسية (باكت / علبة / شيت / أمبول / شراب / قرص)، وحدد عدد الباكتات بالكرتونة وعدد الشيتات داخل الباكت، ليقوم النظام باحتساب تكلفة وسعر وربح الباكت والشيت تلقائياً.'
              : '• Supports pharmacy units: Box, Sheet/Blister, Carton, Ampoule, Syrup. Automatically computes unit cost and blister margins.'}
          </p>
        </div>
      )}

      {/* Main Scrollable Form Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar flex flex-col justify-between">
        <div className="space-y-3">
          
          {/* TOP SPLIT ROW: Yellow Region (Pharma details) & Red Region (Batch, Expiry & Alert) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
            
            {/* 🟡 YELLOW CONTAINER: Pharma & Product Details (البيانات الأساسية للصنف، المادة الفعالة والمصنع) */}
            <div className="lg:col-span-8 bg-[#0f172a] p-3 rounded-xl border border-yellow-500/40 space-y-2.5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <h3 className="text-sm font-black text-yellow-300 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-yellow-400" />
                  <span>{isKu ? '١. ناسنامەی دەرمان، دروستکەر و پۆلێن' : isAr ? '1. البيانات الأساسية للصنف، المادة الفعالة والشركة المصنعة' : '1. Product & Medicine Information'}</span>
                </h3>
                <span className="text-xs text-yellow-400/80 font-mono font-bold bg-yellow-950/50 px-2 py-0.5 rounded border border-yellow-500/30">
                  {isAr ? 'تفاصيل المادة الدوائية' : 'Pharma Registry'}
                </span>
              </div>

              {/* Row 1: Barcode + Trade Name + Scientific Name */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
                {/* Barcode Field */}
                <div className="md:col-span-4">
                  <label className="text-slate-200 mb-1 block font-bold text-[14px]">
                    {isKu ? 'بارکۆد' : isAr ? 'الباركود الدولي أو المحلي' : 'Barcode'} <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      required
                      value={barcode}
                      onChange={(e) => handleBarcodeChange(e.target.value)}
                      placeholder="200245..."
                      className={`w-full bg-[#0a1120] font-mono font-bold h-8 px-2 rounded-lg border focus:outline-none text-xs transition-colors ${
                        barcodeError || duplicateProduct
                          ? 'border-rose-500 text-rose-300 bg-rose-950/40 ring-1 ring-rose-500/50'
                          : 'border-cyan-500/40 text-cyan-300 focus:border-cyan-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="px-2 h-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white rounded-lg text-xs font-bold whitespace-nowrap border border-cyan-400/40 cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 transition-all"
                      title={isKu ? 'دروستکردنی بارکۆد' : isAr ? 'توليد باركود جديد' : 'Generate barcode'}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                      <span>{isKu ? 'تولید' : isAr ? 'توليد' : 'Gen'}</span>
                    </button>
                  </div>
                  {(barcodeError || duplicateProduct) && (
                    <div className="mt-1 text-xs font-bold text-rose-300 flex items-center gap-1 bg-rose-500/20 p-1 rounded border border-rose-500/40 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>
                        {barcodeError || (isKu ? `بۆ کاڵای (${duplicateProduct?.nameKu || duplicateProduct?.nameAr || duplicateProduct?.name}) تۆمارکراوە` : `مستخدم لمادة (${duplicateProduct?.nameAr || duplicateProduct?.name})`)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Trade Product Name */}
                <div className="md:col-span-4">
                  <label className="text-slate-200 mb-1 block font-bold text-[14px]">
                    {isKu ? 'ناوی بازرگانی دەرمان' : isAr ? 'الاسم التجاري للمادة الدوائية' : 'Trade Name'} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder={isKu ? 'نموونە: Panadol Extra 500mg' : isAr ? 'مثال: بنادول اكسترا / Amoxil 500' : 'e.g. Panadol Extra 500mg'}
                    className="w-full bg-[#0a1120] text-slate-100 h-8 px-2.5 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
                  />
                </div>

                {/* Scientific Name (Active Ingredient) */}
                <div className="md:col-span-4">
                  <label className="text-emerald-300 mb-1 block font-bold text-[14px]">
                    {isKu ? 'ناوی زانستی (Active Ingredient)' : isAr ? 'الاسم العلمي والمادة الفعالة' : 'Scientific Name'} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={scientificName}
                    onChange={(e) => setScientificName(e.target.value)}
                    placeholder={isKu ? 'Paracetamol + Caffeine' : isAr ? 'مثال: Paracetamol + Caffeine' : 'e.g. Paracetamol + Caffeine'}
                    className="w-full bg-[#0a1120] text-emerald-300 font-mono h-8 px-2.5 rounded-lg border border-emerald-500/40 focus:outline-none focus:border-emerald-400 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Row 2: Origin + Manufacturer + Dosage Form + Pharma Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-start">
                {/* 🌍 الدولة المصنعة للدواء (Country of Origin) */}
                <div>
                  <label className="text-cyan-200 mb-1 block font-bold text-[14px] flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isKu ? 'دەوڵەتی دروستکەر' : isAr ? 'الدولة المصنعة للدواء' : 'Origin'}</span>
                  </label>
                  <input
                    type="text"
                    list="countries-datalist"
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    placeholder={isKu ? 'عێراق، تورکیا...' : isAr ? 'العراق، تركيا...' : 'Origin'}
                    className="w-full bg-[#0a1120] text-slate-100 h-8 px-2 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
                  />
                  <datalist id="countries-datalist">
                    {DEFAULT_ORIGIN_COUNTRIES.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                {/* 🏢 اسم الشركة المصنعة (Manufacturer) */}
                <div>
                  <label className="text-cyan-200 mb-1 block font-bold text-[14px] flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isKu ? 'کۆمپانیای دروستکەر' : isAr ? 'الشركة المصنعة' : 'Manufacturer'}</span>
                  </label>
                  <input
                    type="text"
                    list="manufacturers-datalist"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder={isKu ? 'سامراء SDI / Pioneer' : isAr ? 'سامراء SDI / Pioneer' : 'Manufacturer'}
                    className="w-full bg-[#0a1120] text-slate-100 h-8 px-2 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
                  />
                  <datalist id="manufacturers-datalist">
                    {DEFAULT_MANUFACTURERS.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                {/* 💊 الشكل الدوائي (Dosage Form) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-200 font-bold text-[14px] flex items-center gap-1">
                      <Pill className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isKu ? 'شێوەی دەرمان' : isAr ? 'الشكل الدوائي' : 'Dosage'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddDosageModal(true)}
                      className="text-[11px] text-cyan-300 hover:text-cyan-200 font-bold flex items-center gap-0.5 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/40"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAr ? 'جديد' : 'New'}</span>
                    </button>
                  </div>
                  <select
                    value={dosageForm}
                    onChange={(e) => setDosageForm(e.target.value)}
                    className="w-full bg-[#0a1120] text-slate-100 h-8 px-2 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 text-xs font-semibold cursor-pointer"
                  >
                    {dosageFormsList.map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>

                {/* Pharma Classification */}
                <div>
                  <label className="text-slate-200 mb-1 block font-bold text-[14px]">
                    {isKu ? 'پۆلێن و کۆد' : isAr ? 'الفئة والترميز الدوائي' : 'Pharma Class'}
                  </label>
                  <select
                    value={pharmaCategory}
                    onChange={(e) => setPharmaCategory(e.target.value as any)}
                    className="w-full bg-[#0a1120] text-slate-100 h-8 px-2 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 text-xs font-bold cursor-pointer"
                  >
                    <option value="OTC">OTC - بدون وصفة (مباشر)</option>
                    <option value="Rx">Rx - بوصفة طبية فقط</option>
                    <option value="Controlled">Controlled - أدوية مراقبة</option>
                    <option value="Supplies">Supplies - مستلزمات طبية</option>
                    <option value="Cosmetics">Cosmetics - عناية وتجميل</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Category + Supplier + Storage & Shelf */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-start">
                {/* Pharmacy Category */}
                <div>
                  <label className="text-slate-200 mb-1 block font-bold text-[14px]">
                    {isKu ? 'پۆلێنی ناو دەرمانخانە' : isAr ? 'التصنيف والقسم بالصيدلية' : 'Category'}
                  </label>
                  <select
                    value={categoryAr}
                    onChange={(e) => setCategoryAr(e.target.value)}
                    className="w-full bg-[#0a1120] text-slate-200 h-8 px-2 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryName(cat, lang)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supplier / Drug Store */}
                <div>
                  <label className="text-slate-200 mb-1 block font-bold text-[14px]">
                    {isKu ? 'کۆگای دەرمان / دابینکەر' : isAr ? 'مذخر الأدوية / المورد المعتمد' : 'Supplier'}
                  </label>
                  <input
                    type="text"
                    list="suppliers-datalist"
                    value={supplierDelegate}
                    onChange={(e) => setSupplierDelegate(e.target.value)}
                    placeholder={isKu ? 'ناوی کۆگا یان کۆمپانیا' : isAr ? 'اسم المذخر أو شركة التوزيع' : 'Supplier'}
                    className="w-full bg-[#0a1120] text-slate-200 h-8 px-2 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
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

                {/* Storage condition */}
                <div>
                  <label className="text-purple-200 mb-1 block font-bold text-[14px] flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isKu ? 'پلەی گەرمی' : isAr ? 'شروط الحفظ والتخزين' : 'Storage'}</span>
                  </label>
                  <select
                    value={storageCondition}
                    onChange={(e) => setStorageCondition(e.target.value)}
                    className="w-full bg-[#0a1120] text-purple-300 h-8 px-1.5 rounded-lg border border-purple-500/40 focus:outline-none text-xs font-bold cursor-pointer"
                  >
                    <option value="room_temp">🌡️ حرارة الغرفة (أقل من 25°C)</option>
                    <option value="refrigerator">❄️ ثلاجة أدوية (2°C - 8°C)</option>
                    <option value="protect_light">🌙 بعيداً عن الضوء والرطوبة</option>
                    <option value="cool_dry">🌬️ مكان بارد وجاف (&lt;20°C)</option>
                    <option value="freezer">🧊 مجمدة طبية (&lt;0°C)</option>
                  </select>
                </div>

                {/* Shelf Location */}
                <div>
                  <label className="text-slate-200 mb-1 block font-bold text-[14px] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isKu ? 'شوێنی ڕەفە' : isAr ? 'مكان الرف بالصيدلية' : 'Shelf Location'}</span>
                  </label>
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    placeholder={isKu ? 'ڕەف A-03' : isAr ? 'رف A-03 / خزانة' : 'Shelf A-03'}
                    className="w-full bg-[#0a1120] text-slate-100 h-8 px-2 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 text-xs font-semibold"
                  />
                </div>
              </div>

            </div>

            {/* 🔴 RED CONTAINER: Batch, Expiry & Alert (رقم التشغيلة، تاريخ الصلاحية والتنبيه المبكر) */}
            <div className="lg:col-span-4 bg-[#0f172a] p-3 rounded-xl border border-rose-500/40 space-y-2.5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <h3 className="text-sm font-black text-rose-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-400" />
                  <span>{isKu ? '٢. وەجبە و بەرواری بەسەرچوون' : isAr ? '2. التشغيلة وتاريخ الصلاحية والتنبيه' : '2. Batch & Expiry System'}</span>
                </h3>
                {expiryStatusInfo && (
                  <div className={`py-0.5 px-2 rounded-md border text-[11px] font-bold flex items-center gap-1 ${expiryStatusInfo.color}`}>
                    <ShieldAlert className="w-3 h-3 shrink-0" />
                    <span>{expiryStatusInfo.label}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1 flex flex-col justify-around">
                {/* 1. Batch Number / رقم التشغيلة */}
                <div>
                  <label className="text-amber-200 mb-1 block font-bold text-[14px]">
                    {isKu ? 'ژمارەی وەجبە (Batch No)' : isAr ? 'رقم التشغيلة / الوجبة (Batch Number)' : 'Batch Number'} <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="BATCH-2026-X01"
                      className="w-full bg-[#0a1120] text-amber-300 font-mono font-bold h-8 px-2.5 rounded-lg border border-amber-500/40 focus:outline-none focus:border-amber-400 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateBatch}
                      className="px-2.5 h-8 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold whitespace-nowrap border border-slate-700 cursor-pointer active:scale-95 transition-colors"
                      title={isAr ? 'توليد رقم تشغيلة تلقائي' : 'Gen Batch'}
                    >
                      {isKu ? 'وەجبەی نوێ' : isAr ? 'توليد باج' : 'Gen'}
                    </button>
                  </div>
                </div>

                {/* 2. Expiry Date / تاريخ انقضاء الصلاحية */}
                <div>
                  <label className="text-amber-200 mb-1 block font-bold text-[14px]">
                    {isKu ? 'بەرواری بەسەرچوون (ڕۆژ/مانگ/ساڵ)' : isAr ? 'تاريخ انتهاء الصلاحية (يوم/شهر/سنة)' : 'Expiry Date (DD/MM/YYYY)'} <span className="text-rose-400">*</span>
                  </label>
                  <DatePickerDDMMYYYY
                    value={expiryDate}
                    onChange={(dStr) => setExpiryDate(dStr)}
                    lang={isAr ? 'ar' : isKu ? 'ku' : 'en'}
                  />
                </div>

                {/* 3. Alert Threshold / مدة التنبيه المبكر */}
                <div>
                  <label className="text-slate-200 mb-1 block font-bold text-[14px] whitespace-nowrap">
                    {isKu ? 'ئاگاداری پێشوەختە (مانگ)' : isAr ? 'مدة التنبيه المبكر قبل الانتهاء (بالأشهر)' : 'Alert Before (Months)'}
                  </label>
                  <div className="flex items-center gap-1 bg-[#0a1120] border border-amber-500/40 rounded-lg px-2.5 h-8 focus-within:border-amber-400">
                    <input
                      type="number"
                      min="1"
                      max="36"
                      value={expiryAlertMonths}
                      onChange={(e) => setExpiryAlertMonths(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-transparent text-amber-300 font-mono font-bold text-xs text-center focus:outline-none"
                      placeholder="6"
                    />
                    <span className="text-xs text-slate-400 font-bold shrink-0">{isKu ? 'مانگ' : isAr ? 'أشهر' : 'mo'}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 🟢 GREEN CONTAINER: Full-Width Quantities, Packaging Units, Selling Prices & Real-Time Profits */}
          <div className="bg-[#0f172a] p-3 rounded-xl border border-emerald-500/40 space-y-2.5 shadow-md">
            
            {/* Header with Base Unit Selector */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 flex-wrap gap-2">
              <h3 className="text-sm font-black text-emerald-300 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-400" />
                <span>{isKu ? '٣. ژمارە و بڕی دەرمان، نرخەکان و قازانج (باکەت / شیت)' : isAr ? '3. إدخال الأعداد، أسعار الشراء والبيع واحتساب الأرباح (باكت / شيت)' : '3. Quantities, Pricing & Margins (Box / Sheet)'}</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 font-bold">{isAr ? 'الوحدة الأساسية:' : 'Base Unit:'}</span>
                <select
                  value={pharmacyUnit}
                  onChange={(e) => setPharmacyUnit(e.target.value)}
                  className="bg-[#0a1120] text-cyan-300 border border-cyan-500/50 rounded-lg px-2.5 h-7 text-xs font-bold cursor-pointer focus:outline-none"
                >
                  <option value="باكت">باكت (Packet/Box)</option>
                  <option value="شيت">شيت / شريط (Sheet/Blister)</option>
                  <option value="علبة">علبة (Box)</option>
                  <option value="أمبول">أمبول / فيال (Ampoule/Vial)</option>
                  <option value="شراب">شراب / زجاجة (Syrup/Bottle)</option>
                  <option value="قرص">قرص / كبسولة (Tablet/Capsule)</option>
                  <option value="أنبوب">أنبوب / مرهم (Tube/Ointment)</option>
                  <option value="كرتونة">كرتونة / شدة (Carton/Master)</option>
                  <option value="كيس">كيس / ساشيت (Sachet)</option>
                  <option value="بخاخ">بخاخ / قطرة (Spray/Drops)</option>
                </select>
              </div>
            </div>

            {/* ROW 1: 5 INPUT FIELDS (باكت, شيت, سعر شراء الباكت, سعر بيع الباكت, سعر بيع الشيت) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 items-end">
              {/* 1. باكت (عدد الباكتات / الكمية) */}
              <div>
                <label className="text-emerald-300 mb-1 block text-[14px] font-black">
                  {isKu ? 'باکەت (ژمارەی باکەت)' : isAr ? 'باكت (عدد الباكتات / الكمية)' : 'Box / Packets'} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={packetsCount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPacketsCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#0a1120] text-emerald-400 font-black h-8 px-2 text-center rounded-lg border border-emerald-500/40 text-xs focus:outline-none focus:border-emerald-300"
                />
              </div>

              {/* 2. شيت (عدد الشيتات داخل الباكت) */}
              <div>
                <label className="text-cyan-300 mb-1 block text-[14px] font-black">
                  {isKu ? 'شیت (ژمارەی شیت لە باکەت)' : isAr ? 'شيت (عدد الشيت بالباكت)' : 'Sheets / Box'} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="2"
                  value={blistersPerBox}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setBlistersPerBox(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#0a1120] text-cyan-300 font-black h-8 px-2 text-center rounded-lg border border-cyan-500/50 text-xs focus:outline-none focus:border-cyan-300"
                />
              </div>

              {/* 3. سعر شراء الباكت */}
              <div>
                <label className="text-amber-200 mb-1 block text-[14px] font-bold">
                  {isKu ? 'کڕینی باکەت' : isAr ? 'سعر شراء الباكت' : 'Box Cost'} ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={purchasePrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-[#0a1120] text-amber-300 font-bold h-8 px-2 text-center rounded-lg border border-amber-500/40 text-xs focus:outline-none focus:border-amber-300"
                />
              </div>

              {/* 4. سعر بيع الباكت للزبون */}
              <div>
                <label className="text-emerald-300 mb-1 block font-bold text-[14px]">
                  {isKu ? 'فرۆشتنی باکەت' : isAr ? 'سعر بيع الباكت' : 'Box Sale Price'} ({currencySymbol}) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={singleRetailPrice}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => setSingleRetailBlurred(true)}
                  onChange={(e) => setSingleRetailPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full font-bold h-8 px-2.5 text-center rounded-lg text-xs transition-all focus:outline-none ${
                    isSingleRetailBelowCost && singleRetailBlurred
                      ? 'bg-rose-950/60 text-rose-300 border-2 border-rose-500 ring-1 ring-rose-500/40'
                      : 'bg-[#0a1120] text-emerald-400 border border-emerald-500/40 focus:border-emerald-400'
                  }`}
                />
                {isSingleRetailBelowCost && singleRetailBlurred && (
                  <div className="mt-1 p-1 rounded bg-rose-500/25 border border-rose-500/50 text-[11px] font-bold text-rose-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{isAr ? `أقل من التكلفة (${formatNumber(costPerUnit)})!` : `Below cost!`}</span>
                  </div>
                )}
              </div>

              {/* 5. سعر بيع الشيت / الشريط */}
              <div>
                <label className="text-cyan-200 mb-1 block font-bold text-[14px]">
                  {isKu ? 'فرۆشتنی شیت (شریت)' : isAr ? 'سعر بيع الشيت' : 'Sheet Sale Price'} ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={costPerBlister > 0 ? (costPerBlister * 1.3).toFixed(2) : '0.00'}
                  value={blisterPrice}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => setBlisterPriceBlurred(true)}
                  onChange={(e) => setBlisterPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full font-bold h-8 px-2.5 text-center rounded-lg text-xs transition-all focus:outline-none ${
                    isBlisterPriceBelowCost && blisterPriceBlurred
                      ? 'bg-rose-950/60 text-rose-300 border-2 border-rose-500 ring-1 ring-rose-500/40'
                      : 'bg-[#0a1120] text-cyan-300 border border-cyan-500/40 focus:border-cyan-400'
                  }`}
                />
                {isBlisterPriceBelowCost && blisterPriceBlurred && (
                  <div className="mt-1 p-1 rounded bg-rose-500/25 border border-rose-500/50 text-[11px] font-bold text-rose-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{isAr ? `أقل من تكلفة الشيت (${formatNumber(costPerBlister)})!` : `Below sheet cost!`}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ROW 2: AUTOMATIC METRICS & REAL-TIME PROFIT DISPLAY CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              {/* 1. تكلفة الشيت التلقائية */}
              <div className="bg-[#070e1c] p-2 rounded-xl border border-cyan-500/30 flex flex-col justify-center items-center text-center">
                <span className="text-[12px] text-slate-300 font-bold block mb-0.5">
                  {isKu ? 'تێچووی شیت' : isAr ? 'تكلفة الشيت التلقائية' : 'Sheet Cost'}
                </span>
                <span className="text-xs font-black text-cyan-300 font-mono">
                  {currencySymbol} {formatNumber(costPerBlister)}
                </span>
              </div>

              {/* 2. إجمالي المخزون */}
              <div className="bg-[#070e1c] p-2 rounded-xl border border-blue-500/30 flex flex-col justify-center items-center text-center">
                <span className="text-[12px] text-slate-300 font-bold block mb-0.5">
                  {isKu ? 'کۆی کۆگا' : isAr ? 'إجمالي المخزون' : 'Total Stock'}
                </span>
                <span className="text-xs font-black text-blue-300 font-mono">
                  {totalUnits} <span className="text-[11px] text-slate-300 font-normal">{pharmacyUnit}</span>
                  {numBlistersPerBox > 1 && (
                    <span className="text-[11px] text-amber-300 font-bold mr-1">({totalBlisters} شيت)</span>
                  )}
                </span>
              </div>

              {/* 3. صافي ربح الباكت */}
              <div className="bg-[#070e1c] p-2 rounded-xl border border-emerald-500/30 flex flex-col justify-center items-center text-center">
                <span className="text-[12px] text-slate-300 font-bold block mb-0.5">
                  {isKu ? 'قازانجی باکەت' : isAr ? 'صافي ربح الباكت' : 'Box Profit'}
                </span>
                <span className={`text-xs font-black font-mono block ${singleProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {currencySymbol} {formatNumber(singleProfit)}
                  {singleProfit > 0 && costPerUnit > 0 && (
                    <span className="text-[10px] text-emerald-300/80 mr-1 font-normal">({packetProfitPercent}%)</span>
                  )}
                </span>
              </div>

              {/* 4. صافي ربح الشيت */}
              <div className="bg-[#070e1c] p-2 rounded-xl border border-cyan-500/30 flex flex-col justify-center items-center text-center">
                <span className="text-[12px] text-slate-300 font-bold block mb-0.5">
                  {isKu ? 'قازانجی شیت' : isAr ? 'صافي ربح الشيت' : 'Sheet Profit'}
                </span>
                <span className={`text-xs font-black font-mono block ${blisterProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {currencySymbol} {formatNumber(blisterProfit)}
                  {blisterProfit > 0 && costPerBlister > 0 && (
                    <span className="text-[10px] text-cyan-300/80 mr-1 font-normal">({blisterProfitPercent}%)</span>
                  )}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* PINNED BOTTOM ACTION FOOTER */}
        <div className="sticky bottom-0 bg-[#0b1329]/95 backdrop-blur-md p-2.5 rounded-xl border border-cyan-500/30 flex items-center justify-between flex-wrap gap-2.5 mt-3 shadow-xl shrink-0">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 font-bold">{isAr ? 'ملخص الإدخال:' : 'Entry Summary:'}</span>
            <span className="text-cyan-300 font-bold font-mono">{totalUnits} {pharmacyUnit}</span>
            {numBlistersPerBox > 1 && (
              <span className="text-amber-300 font-bold font-mono">({totalBlisters} شيت)</span>
            )}
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">{isAr ? 'البيع:' : 'Sell:'}</span>
            <span className="text-emerald-400 font-black font-mono">{currencySymbol} {formatNumber(singleRetail)}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 h-8.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
            >
              {isKu ? 'پەشیمانبوونەوە' : isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              className="px-8 h-8.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-cyan-400/50"
            >
              <Package className="w-4 h-4" />
              <span>{isKu ? 'پاشەکەوتکردنی دەرمان' : isAr ? 'حفظ وتأكيد بيانات الصنف الدوائي' : 'Save Medicine Record'}</span>
            </button>
          </div>
        </div>

      </form>

      {/* MODAL: ADD CUSTOM DOSAGE FORM */}
      {showAddDosageModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1120] p-4 rounded-2xl border border-cyan-500/50 max-w-sm w-full space-y-3.5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
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
                className="px-3.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                {isAr ? 'إلغاء' : isKu ? 'داخستن' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAddNewDosageForm}
                className="px-4 py-1 text-xs font-bold rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 cursor-pointer"
              >
                {isAr ? 'إضافة واعتماد' : isKu ? 'زیادکردن' : 'Add & Select'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
