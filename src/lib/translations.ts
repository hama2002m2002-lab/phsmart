import { Language } from '../types';

export interface TranslationDict {
  [key: string]: {
    ar: string;
    en: string;
    ku: string;
  };
}

export const uiTranslations: TranslationDict = {
  // Navigation & Tabs
  dashboard: { ar: 'لوحة التحكم', en: 'Dashboard', ku: 'پێڕست / داشبۆرد' },
  analytics: { ar: 'التحليلات الإحصائية', en: 'Analytics', ku: 'شیکاری و ئامار' },
  reports: { ar: 'التقارير المالية', en: 'Reports', ku: 'ڕاپۆرتە داراییەکان' },
  cashierAccounts: { ar: 'كشف حسابات الكاشيرية', en: 'Cashier Accounts', ku: 'کەشف حیسابی کاشێرەکان' },
  pos: { ar: 'الكاشير والبيع السريع (POS)', en: 'POS & Cashier', ku: 'کاشێر و فرۆشتنی خێرا (POS)' },
  products: { ar: 'المخزن', en: 'Warehouse & Inventory', ku: 'کۆگا' },
  purchases: { ar: 'قسم الشراء وتوريد البضائع', en: 'Purchases & Restock', ku: 'کڕین و دابینکردن' },
  suppliers: { ar: 'الموردين والشركات', en: 'Suppliers & Vendors', ku: 'دابینکەران و کۆمپانیاکان' },
  customers: { ar: 'العملاء وبرنامج الولاء', en: 'Customers & Loyalty', ku: 'کڕیاران و بەرنامەی دڵسۆزی' },
  orders: { ar: 'الطلبات والتوصيل', en: 'Orders & Deliveries', ku: 'داواکارییەکان و گەیاندن' },
  invoices: { ar: 'الفواتير والمبيعات', en: 'Invoices & History', ku: 'پسوڵەکان و فرۆشتن' },
  settings: { ar: 'إعدادات المنظومة', en: 'Settings', ku: 'ڕێکخستنەکانی سیستم' },
  notifications: { ar: 'الإشعارات', en: 'Notifications', ku: 'ئاگادارییەکان' },
  overview: { ar: 'نظرة عامة', en: 'Overview', ku: 'تێڕوانینی گشتی' },

  // Buttons & Actions
  quickPOS: { ar: 'الكاشير السريع', en: 'Quick POS', ku: 'کاشێری خێرا' },
  stockAudit: { ar: 'جرد وتدقيق المخزون', en: 'Inventory Audit', ku: 'پشکنین و جردی کۆگا' },
  damagedItems: { ar: 'مواد متلفة / مكسورة / منتهية', en: 'Damaged & Expired Items', ku: 'کاڵای تێکچوو / بەسەرچوو' },
  delegateReturns: { ar: 'إرجاع مواد إلى مندوب', en: 'Return Items to Delegate', ku: 'گەڕاندنەوەی کاڵا بۆ مەندوب' },
  showInventory: { ar: 'عرض مواد المخزن', en: 'Show Inventory', ku: 'نیشاندانی کاڵاکانی کۆگا' },
  exitPOS: { ar: 'خروج للقائمة الرئيسية', en: 'Exit POS View', ku: 'دەرچوون بۆ لاپەڕەی سەرەکی' },
  logout: { ar: 'تسجيل الخروج', en: 'Logout', ku: 'چوونه‌ده‌ره‌وه' },
  login: { ar: 'تسجيل الدخول', en: 'Login', ku: 'چوونه‌ژووره‌وه' },
  searchPlaceholder: { ar: 'بحث سريع عن صنف...', en: 'Quick search items...', ku: 'گەڕانی خێرا بۆ کاڵا...' },
  createAccount: { ar: 'إنشاء حساب جديد', en: 'Create New Account', ku: 'دروستکردنی ئەژماری نوێ' },
  saveSettings: { ar: 'حفظ الإعدادات', en: 'Save Settings', ku: 'پاشەکەوتکردنی ڕێکخستنەکان' },
  save: { ar: 'حفظ', en: 'Save', ku: 'پاشەکەوتکردن' },
  cancel: { ar: 'إلغاء', en: 'Cancel', ku: 'هەڵوەشاندنەوە' },
  close: { ar: 'إغلاق', en: 'Close', ku: 'داخستن' },
  delete: { ar: 'حذف', en: 'Delete', ku: 'سڕینەوە' },
  edit: { ar: 'تعديل', en: 'Edit', ku: 'دەستکاری' },
  add: { ar: 'إضافة', en: 'Add', ku: 'زیادکردن' },
  filter: { ar: 'تصفية', en: 'Filter', ku: 'فلتەر' },
  export: { ar: 'تصدير', en: 'Export', ku: 'ڕەوانەکردن' },
  import: { ar: 'استيراد', en: 'Import', ku: 'هێنانەژوورەوە' },
  print: { ar: 'طباعة', en: 'Print', ku: 'چاپکردن' },
  back: { ar: 'رجوع', en: 'Back', ku: 'گەڕانەوە' },
  confirm: { ar: 'تأكيد', en: 'Confirm', ku: 'پشتڕاستکردنەوە' },
  clearCart: { ar: 'تفريغ السلة', en: 'Clear Cart', ku: 'خاڵیکردنی سەبەتە' },
  payNow: { ar: 'دفع الآن', en: 'Pay Now', ku: 'ئێستا بیدە' },

  // System Header & Subtitles
  systemTitle: { ar: 'نظام إدارة الماركيت والمبيعات الذكي', en: 'Smart Supermarket & POS System', ku: 'سیستەمی زیرەکی بەڕێوەبردنی مارکێت' },
  mainMenu: { ar: 'القائمة الرئيسية', en: 'MAIN MENU', ku: 'پێڕستی سەرەکی' },
  fastBadge: { ar: 'سريع', en: 'FAST', ku: 'خێرا' },
  newBadge: { ar: 'جديد', en: 'NEW', ku: 'نوێ' },

  // Languages & Themes
  languageSelectLabel: { ar: 'لغة المنظومة', en: 'System Language', ku: 'زمانی سیستم' },
  arabicLang: { ar: 'العربية (Arabic)', en: 'Arabic (العربية)', ku: 'عەرەبی (العربية)' },
  englishLang: { ar: 'الإنجليزية (English)', en: 'English', ku: 'ئینگلیزی (English)' },
  kurdishLang: { ar: 'الكردية (کوردی)', en: 'Kurdish (کوردی)', ku: 'کوردی (Kurdish)' },
  themeModeLabel: { ar: 'مظهر المنظومة والوضع الليلي', en: 'System Theme & Night Mode', ku: 'ڕوکاری سیستم و دۆخی شەو' },
  darkMode: { ar: 'الوضع الليلي (داكن)', en: 'Night Mode (Dark)', ku: 'دۆخی شەو (تاریک)' },
  lightMode: { ar: 'الوضع النهاري (فاتح)', en: 'Day Mode (Light)', ku: 'دۆخی ڕۆژ (ڕووناک)' },

  // Categories (English, Arabic & Kurdish keys)
  allCategories: { ar: 'جميع الأقسام', en: 'All Categories', ku: 'هەموو بەشەکان' },
  'أدوية ومسكنات (OTC / Rx)': { ar: 'أدوية ومسكنات (OTC / Rx)', en: 'Medicines & Pain Relief (OTC / Rx)', ku: 'دەرمان و ئازارشکێنەکان (OTC / Rx)' },
  'مضادات حيوية (Antibiotics)': { ar: 'مضادات حيوية (Antibiotics)', en: 'Antibiotics', ku: 'دژە بەکتریا و هەوکردن (Antibiotics)' },
  'فيتامينات ومكملات (Vitamins & Supplements)': { ar: 'فيتامينات ومكملات (Vitamins & Supplements)', en: 'Vitamins & Supplements', ku: 'ڤیتامین و تەواوکەری خۆراکی' },
  'أدوية الأمراض المزمنة (Chronic Care)': { ar: 'أدوية الأمراض المزمنة (Chronic Care)', en: 'Chronic Care Medicines', ku: 'دەرمانی نەخۆشییە درێژخایەنەکان' },
  'العناية بالبشرة والتجميل (Skincare)': { ar: 'العناية بالبشرة والتجميل (Skincare)', en: 'Skincare & Cosmetics', ku: 'چاودێری پێست و جوانکاری (Skincare)' },
  'صحة الأم والطفل (Mother & Baby)': { ar: 'صحة الأم والطفل (Mother & Baby)', en: 'Mother & Baby Care', ku: 'تەندروستی دایک و منداڵ' },
  'مستلزمات وأجهزة طبية (Medical Supplies)': { ar: 'مستلزمات وأجهزة طبية (Medical Supplies)', en: 'Medical Supplies & Devices', ku: 'پێداویستی و ئامێری پزیشکی' },
  'قطرات ومستحضرات عيون وأذن (Ophthalmic & ENT)': { ar: 'قطرات ومستحضرات عيون وأذن (Ophthalmic & ENT)', en: 'Eye & Ear Drops (Ophthalmic & ENT)', ku: 'دڵۆپێنەری چاو و گوێ (ENT)' },
  'أدوية الجهاز الهضمي (Gastrointestinal)': { ar: 'أدوية الجهاز الهضمي (Gastrointestinal)', en: 'Gastrointestinal Medicines', ku: 'دەرمانی کۆئەندامی هەرس' },
  'الألبان والمغذيات الطبية': { ar: 'الألبان والمغذيات الطبية', en: 'Medical Nutrition & Milk', ku: 'شیری پزیشکی و خۆراکی پێویست' },
  'المنظفات والعناية الشخصية': { ar: 'المنظفات والعناية الشخصية', en: 'Hygiene & Personal Care', ku: 'پاککەرەوە و چاودێری کەسی' },
  'Dairy & Milk': { ar: 'الألبان والحليب', en: 'Dairy & Milk', ku: 'بەرهەمەکانی شیر / شیرەمەنی' },
  'Beverages & Juices': { ar: 'المشروبات والعصائر', en: 'Beverages & Juices', ku: 'خواردنەوەکان و شەربەت' },
  'Snacks & Sweets': { ar: 'الحلويات والسناكات', en: 'Snacks & Sweets', ku: 'شیرینی و گەستن' },
  'Bakery & Bread': { ar: 'المخبوزات والمعجنات', en: 'Bakery & Bread', ku: 'نان و سەموون / مەخبوزات' },
  'Meat & Poultry': { ar: 'اللحوم والدواجن', en: 'Meat & Poultry', ku: 'گوشت و مریشک' },
  'Fresh Produce': { ar: 'الخضار والفواكه', en: 'Fresh Produce', ku: 'سەوزە و میوەکان' },
  'Frozen Foods': { ar: 'المجمدات', en: 'Frozen Foods', ku: 'خواردنی بەستوو' },
  'Canned Goods': { ar: 'المعلبات والأغذية', en: 'Canned Goods', ku: 'قوتووبەندکراوەکان' },
  'Household & Care': { ar: 'المنظفات والعناية', en: 'Household & Care', ku: 'پاککەرەوەکان و پێداویستی' },
  'الألبان والحليب': { ar: 'الألبان والحليب', en: 'Dairy & Milk', ku: 'بەرهەمەکانی شیر / شیرەمەنی' },
  'المشروبات والقهوة': { ar: 'المشروبات والقهوة', en: 'Beverages & Juices', ku: 'خواردنەوەکان و شەربەت' },
  'السلع والحلويات': { ar: 'السلع والحلويات', en: 'Snacks & Sweets', ku: 'شیرینی و گەستن' },
  'المخبوزات والخبز': { ar: 'المخبوزات والخبز', en: 'Bakery & Bread', ku: 'نان و سەموون / مەخبوزات' },
  'اللحوم والدواجن': { ar: 'اللحوم والدواجن', en: 'Meat & Poultry', ku: 'گوشت و مریشک' },
  'الخضار والفواكه': { ar: 'الخضار والفواكه', en: 'Fresh Produce', ku: 'سەوزە و میوەکان' },
  'الأغذية المجمدة': { ar: 'الأغذية المجمدة', en: 'Frozen Foods', ku: 'خواردنی بەستوو' },
  'المعلبات والزيوت': { ar: 'المعلبات والزيوت', en: 'Canned Goods', ku: 'قوتووبەندکراوەکان' },

  // POS Terms
  cartTitle: { ar: 'سلة المشتريات', en: 'Shopping Cart', ku: 'سەبەتەی کڕین' },
  total: { ar: 'الإجمالي', en: 'Total', ku: 'سەرجەم' },
  subtotal: { ar: 'المبلغ الفرعي', en: 'Subtotal', ku: 'کۆی لاوەکی' },
  tax: { ar: 'الضريبة', en: 'Tax (VAT)', ku: 'باج' },
  discount: { ar: 'الخصم', en: 'Discount', ku: 'داشکاندن' },
  checkout: { ar: 'إتمام البيع وطباعة الفاتورة', en: 'Complete & Print Receipt', ku: 'تەواوکردنی فرۆشتن و چاپکردن' },
  cash: { ar: 'نقداً', en: 'Cash', ku: 'نەقد' },
  card: { ar: 'بطاقة', en: 'Card', ku: 'کارت' },
  nfc: { ar: 'NFC', en: 'NFC', ku: 'NFC' },
  loyalty: { ar: 'محفظة الولاء', en: 'Loyalty Wallet', ku: 'جزدانی دڵسۆزی' },
  customer: { ar: 'الزبون', en: 'Customer', ku: 'کڕیار' },
  selectCustomer: { ar: 'اختر الزبون (اختياري)', en: 'Select Customer (Optional)', ku: 'کڕیار هەڵبژێرە (ئارەزوومەندانە)' },
  barcodeScan: { ar: 'امسح الباركود هنا (نشط دائماً)...', en: 'Scan barcode here...', ku: 'بارکۆد لێرە بخوێنەرەوە...' },
  holdBill: { ar: 'تعليق الفاتورة', en: 'Hold Invoice', ku: 'ڕاگرتنی پسوڵە' },
  heldBills: { ar: 'الفواتير المعلقة', en: 'Held Invoices', ku: 'پسوڵە ڕاگێراوەکان' },
  refund: { ar: 'استرجاع فاتورة', en: 'Refund Invoice', ku: 'گەڕاندنەوەی پسوڵە' },
  cashTendered: { ar: 'المبلغ المدفوع', en: 'Cash Tendered', ku: 'بڕی پارەی دراو' },
  changeDue: { ar: 'الباقي للزبون', en: 'Change Due', ku: 'بڕی پارەی گەڕاوە' },
  saleUnit: { ar: 'نوع البيع', en: 'Sale Unit', ku: 'جۆری فرۆشتن' },
  retailUnit: { ar: 'مفرد', en: 'Single Unit', ku: 'تاک' },
  wholesaleUnit: { ar: 'جملة', en: 'Wholesale', ku: 'کۆ' },
  cartonUnit: { ar: 'كرتون', en: 'Carton', ku: 'کارتۆن' },

  // Products & Inventory
  productsTitle: { ar: 'إدارة المنتجات والمخزون', en: 'Products & Inventory Management', ku: 'بەڕێوەبردنی کاڵاکان و کۆگا' },
  addProduct: { ar: 'إضافة منتج جديد', en: 'Add New Product', ku: 'زیادکردنی کاڵای نوێ' },
  editProduct: { ar: 'تعديل المنتج', en: 'Edit Product', ku: 'دەستکاری کاڵا' },
  productName: { ar: 'اسم المنتج', en: 'Product Name', ku: 'ناوی کاڵا' },
  productNameAr: { ar: 'اسم المنتج (عربي)', en: 'Product Name (AR)', ku: 'ناوی کاڵا (عەرەبی)' },
  productNameKu: { ar: 'اسم المنتج (کوردی)', en: 'Product Name (Kurdish)', ku: 'ناوی کاڵا (کوردی)' },
  category: { ar: 'القسم / الفئة', en: 'Category', ku: 'پۆل / بەش' },
  stock: { ar: 'المخزون', en: 'Stock', ku: 'کۆگا' },
  costPrice: { ar: 'سعر التكلفة', en: 'Cost Price', ku: 'نرخی تێچوو' },
  retailPrice: { ar: 'سعر المفرد', en: 'Retail Price', ku: 'نرخی تاک' },
  wholesalePrice: { ar: 'سعر الجملة', en: 'Wholesale Price', ku: 'نرخی کۆ' },
  cartonPrice: { ar: 'سعر الكرتون', en: 'Carton Price', ku: 'نرخی کارتۆن' },
  cartonsCount: { ar: 'عدد الكراتين', en: 'Cartons Count', ku: 'ژمارەی کارتۆنەکان' },
  unitsPerCarton: { ar: 'قطع داخل الكرتون', en: 'Units Per Carton', ku: 'دانە لە کارتۆنێکدا' },
  supplierDelegate: { ar: 'اسم المندوب / المورد', en: 'Delegate / Supplier', ku: 'ناوی مەندوب / دابینکەر' },
  expiryDate: { ar: 'تاريخ انتهاء الصلاحية', en: 'Expiry Date', ku: 'بەرواری بەسەرچوون' },
  barcode: { ar: 'الباركود', en: 'Barcode', ku: 'بارکۆد' },

  // Purchases
  purchasesTitle: { ar: 'قسم الشراء وتوريد البضائع', en: 'Purchases & Restock Management', ku: 'بەشی کڕین و دابینکردنی بضاعة' },
  newPurchaseInvoice: { ar: 'فاتورة شراء جديدة', en: 'New Restock Invoice', ku: 'پسوڵەی کڕینی نوێ' },
  supplier: { ar: 'المورد', en: 'Supplier', ku: 'دابینکەر' },
  allSuppliers: { ar: 'جميع الموردين', en: 'All Suppliers', ku: 'هەموو دابینکەران' },
  purchaseCost: { ar: 'تكلفة الشراء', en: 'Purchase Cost', ku: 'تێچووی کڕین' },
  paid: { ar: 'المدفوع', en: 'Paid', ku: 'دراو' },
  remaining: { ar: 'المتبقي', en: 'Remaining', ku: 'ماوە' },

  // Suppliers
  suppliersTitle: { ar: 'إدارة الموردين والشركات', en: 'Suppliers & Vendors', ku: 'بەڕێوەبردنی دابینکەران و کۆمپانیاکان' },
  addSupplier: { ar: 'إضافة مورد جديد', en: 'Add New Supplier', ku: 'زیادکردنی دابینکەری نوێ' },
  supplierName: { ar: 'اسم المورد / الشركة', en: 'Supplier Name', ku: 'ناوی دابینکەر / کۆمپانیا' },
  delegateName: { ar: 'اسم المندوب', en: 'Delegate Name', ku: 'ناوی مەندوب' },
  phone: { ar: 'رقم الهاتف', en: 'Phone Number', ku: 'ژمارەی تلفۆن' },
  address: { ar: 'العنوان', en: 'Address', ku: 'ناونیشان' },
  totalPurchases: { ar: 'إجمالي المشتريات', en: 'Total Purchases', ku: 'کۆی کڕینەکان' },
  debt: { ar: 'الديون المستحقة', en: 'Balance Due', ku: 'قەرزی لەسەربوو' },

  // Customers
  customersTitle: { ar: 'إدارة العملاء والولاء', en: 'Customers & Loyalty Program', ku: 'بەڕێوەبردنی کڕیاران و دڵسۆزی' },
  addCustomer: { ar: 'إضافة عميل جديد', en: 'Add New Customer', ku: 'زیادکردنی کڕیاری نوێ' },
  customerName: { ar: 'اسم العميل', en: 'Customer Name', ku: 'ناوی کڕیار' },
  loyaltyPoints: { ar: 'نقاط الولاء', en: 'Loyalty Points', ku: 'خاڵەکانی دڵسۆزی' },
  walletBalance: { ar: 'رصيد المحفظة', en: 'Wallet Balance', ku: 'بڕی پارەی جزدان' },
  totalDebts: { ar: 'إجمالي الديون', en: 'Total Debts', ku: 'کۆی قەرزەکان' },

  // Orders & Deliveries
  ordersTitle: { ar: 'إدارة الطلبات والتوصيل', en: 'Orders & Deliveries Management', ku: 'بەڕێوەبردنی داواکارییەکان و گەیاندن' },
  newOrder: { ar: 'طلب توصيل جديد', en: 'New Delivery Order', ku: 'داواکاری گەیاندنی نوێ' },
  driverName: { ar: 'اسم السائق', en: 'Driver Name', ku: 'ناوی شۆفێر' },
  deliveryAddress: { ar: 'عنوان التوصيل', en: 'Delivery Address', ku: 'ناونیشانی گەیاندن' },
  deliveryFee: { ar: 'أجرة التوصيل', en: 'Delivery Fee', ku: 'تێچووی گەیاندن' },

  // Invoices & History
  invoicesTitle: { ar: 'سجل الفواتير والمبيعات', en: 'Invoices & Sales History', ku: 'سجلی پسوڵەکان و فرۆشتن' },
  invoiceNumber: { ar: 'رقم الفاتورة', en: 'Invoice #', ku: 'ژمارەی پسوڵە' },
  cashier: { ar: 'الكاشير', en: 'Cashier', ku: 'کاشێر' },
  paymentMethod: { ar: 'طريقة الدفع', en: 'Payment Method', ku: 'جۆری دانی پارە' },
  itemsCount: { ar: 'عدد المواد', en: 'Items Count', ku: 'ژمارەی کاڵاکان' },

  // Reports & Analytics
  reportsTitle: { ar: 'التقارير المالية والإحصائية', en: 'Financial Reports & Analytics', ku: 'ڕاپۆرتە داراییەکان و ئامار' },
  dailySales: { ar: 'المبيعات اليومية', en: 'Daily Sales', ku: 'فرۆشتنی ڕۆژانە' },
  monthlySales: { ar: 'المبيعات الشهرية', en: 'Monthly Sales', ku: 'فرۆشتنی مانگانە' },
  netProfit: { ar: 'صافي الأرباح', en: 'Net Profit', ku: 'قازانجی پاک' },
  inventoryValue: { ar: 'قيمة المخزون', en: 'Inventory Value', ku: 'بەهای کۆگا' },
  topSelling: { ar: 'الأكثر مبيعاً', en: 'Top Selling', ku: 'پڕفرۆشترین کاڵاکان' },

  // Inventory Audit Modal
  auditTitle: { ar: 'جرد وتدقيق المخزون', en: 'Inventory Audit & Physical Count', ku: 'پشکنین و جردکردنی کۆگا' },
  auditSubtitle: { ar: 'مطابقة الكميات المسجلة في النظام مع العدد الفعلي بالمخزن', en: 'Reconcile system quantities with physical warehouse counts', ku: 'یەکسانکردنی بڕی تۆمارکراو لە سیستمدا لەگەڵ ژمارەی ڕاستەقینەی کۆگا' },
  systemStock: { ar: 'العدد بالنظام', en: 'System Count', ku: 'ژمارە لە سیستمدا' },
  actualStock: { ar: 'العدد الفعلي', en: 'Actual Count', ku: 'ژمارەی ڕاستەقینە' },
  variance: { ar: 'الفارق', en: 'Variance', ku: 'جیاوازی' },
  saveAudit: { ar: 'حفظ وتطبيق الجرد', en: 'Apply Audit Reconcile', ku: 'پاشەکەوتکردن و جێبەجێکردنی جرد' },

  // Login Screen
  loginTitle: { ar: 'تسجيل الدخول للمنظومة', en: 'System Login', ku: 'چوونه‌ژووره‌وه بۆ سیستم' },
  selectUser: { ar: 'اختر اسم المستخدم', en: 'Select User Account', ku: 'بەکارهێنەر هەڵبژێرە' },
  passwordPlaceholder: { ar: 'كلمة المرور', en: 'Password', ku: 'وشەی نهێنی' },
  roleAdmin: { ar: 'مدير النظام (Admin)', en: 'System Admin', ku: 'بەڕێوەبەری سیستم' },
  roleCashier: { ar: 'كاشير (Cashier)', en: 'Cashier', ku: 'کاشێر' },

  // General Status
  inStock: { ar: 'متوفر', en: 'In Stock', ku: 'بەردەستە' },
  lowStock: { ar: 'مخزون منخفض', en: 'Low Stock', ku: 'کۆگای کەم' },
  outOfStock: { ar: 'نفدت الكمية', en: 'Out of Stock', ku: 'نەماوە' },
  completed: { ar: 'مكتمل', en: 'Completed', ku: 'تەواوبوو' },
  pending: { ar: 'قيد الانتظار', en: 'Pending', ku: 'لە چاوەڕوانیدا' },
  refunded: { ar: 'مسترجع', en: 'Refunded', ku: 'گەڕێنراوەتەوە' },
  delivered: { ar: 'تم التوصيل', en: 'Delivered', ku: 'گەیەندراوە' },
  onTheWay: { ar: 'في الطريق', en: 'On The Way', ku: 'لە ڕێگادایە' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', ku: 'هەڵوەشێنراوە' },

  // Modal Common
  actions: { ar: 'الإجراءات', en: 'Actions', ku: 'کردارەکان' },
  date: { ar: 'التاريخ', en: 'Date', ku: 'بەروار' },
  details: { ar: 'التفاصيل', en: 'Details', ku: 'وردەکارییەکان' },
  notes: { ar: 'الملاحظات', en: 'Notes', ku: 'تێبینییەکان' },
  noData: { ar: 'لا توجد بيانات للعرض', en: 'No data available', ku: 'هیچ زانیارییەک بۆ نیشاندان نییە' },

  // Returns & Quality Analytics
  returnsAnalytics: { ar: 'تحليل المرتجعات وجودة المواد', en: 'Returns & Material Quality Analytics', ku: 'شیکاری ڕێژەی گەڕاندنەوە و کوالێتی کاڵاکان' },
  dailyReturnsVsSales: { ar: 'نسبة المرتجعات اليومية مقارنة بالمبيعات الكلية', en: 'Daily Returns vs Total Sales', ku: 'ڕێژەی گەڕێنراوەکانی ڕۆژانە بەراورد بە سەرجەمی فرۆشتن' },
  directReturn: { ar: 'إرجاع مباشر باسم المادة / الباركود', en: 'Direct Return by Name / Barcode', ku: 'گەڕاندنەوەی ڕاستەوخۆ بە ناوی کاڵا / بارکۆد' },
  invoiceReturn: { ar: 'إرجاع من فاتورة مسجلة', en: 'Return from Registered Invoice', ku: 'گەڕاندنەوە لە پسوڵەی تۆمارکراو' },
  returnsChartTitle: { ar: 'مقارنة المبيعات اليومية مع المرتجعات (Recharts)', en: 'Daily Sales vs Returns Comparison', ku: 'بەراوردی فرۆشتنی ڕۆژانە لەگەڵ گەڕێنراوەکان' },
  qualityIndicator: { ar: 'مؤشر جودة المواد والتوريد', en: 'Material Quality & Supply Health', ku: 'نیشاندەری کوالێتی کاڵاکان و دابینکردن' },
  excellentQuality: { ar: 'ممتاز: نسبة مرتجعات ألماني منخفضة جداً (< 3%)', en: 'Excellent: Very Low Return Rate (< 3%)', ku: 'زۆر باش: ڕێژەی گەڕاندنەوە زۆر کەمە (< ٪٣)' },
  acceptableQuality: { ar: 'مقبول: نسبة مرتجعات ضمن الحد الطبيعي (3% - 8%)', en: 'Acceptable: Normal Return Rate (3% - 8%)', ku: 'پەسەندکراو: ڕێژەی گەڕاندنەوە لە ئاستی ئاساییدایە (٪٣ - ٪٨)' },
  actionRequired: { ar: 'يحتاج مراجعة جودة الموردين والبضائع (> 8%)', en: 'Attention: Review Supplier & Item Quality (> 8%)', ku: 'پێویستی بە پێداچوونەوەی کوالێتی کاڵا و دابینکەران هەیە (> ٪٨)' },
  reasonNonMatching: { ar: 'غير مطابق / رغبة الزبون', en: 'Non-matching / Customer Choice', ku: 'نەگونجاو / بە ئارەزووی کڕیار' },
  reasonDefective: { ar: 'تالف / عيب تصنيع', en: 'Defective / Manufacturing Fault', ku: 'تێکچوو / کەموکوڕی دروستکردن' },
  reasonWrongItem: { ar: 'خطأ في البيع / الفاتورة', en: 'Wrong Item Selected', ku: 'هەڵە لە هەڵبژاردنی کاڵا' },
  reasonExpired: { ar: 'منتهي الصلاحية', en: 'Expired Product', ku: 'بەسەرچوو' },
  confirmReturnAndRestock: { ar: 'تأكيد الإرجاع وتعديل المخزون', en: 'Confirm Return & Restock', ku: 'پشتڕاستکردنەوەی گەڕاندنەوە و نوێکردنەوەی کۆگا' },
  printReturnReceipt: { ar: 'طباعة وصل المرتجعات 📄', en: 'Print Return Receipt 📄', ku: 'چاپکردنی پسوڵەی گەڕاندنەوە 📄' },
  refundMethod: { ar: 'طريقة التسديد:', en: 'Refund Method:', ku: 'جۆری گەڕاندنەوەی پارە:' },
  cashRefund: { ar: 'إرجاع نقدي كاش للزبون', en: 'Cash Refund', ku: 'گەڕاندنەوەی پارەی نەقد بۆ کڕیار' },
  creditNote: { ar: 'إصدار رصيد محفظة للزبون', en: 'Customer Credit Note', ku: 'زیادکردن بۆ ڕەسیدی کڕیار' }
};

export function getTranslation(lang: Language, key: string, fallbackAr?: string): string {
  if (uiTranslations[key]) {
    return uiTranslations[key][lang] || uiTranslations[key]['ar'];
  }
  return fallbackAr || key;
}

export function getProductName(product: { name: string; nameAr?: string; nameKu?: string }, lang: Language): string {
  if (lang === 'ku' && product.nameKu) return product.nameKu;
  if (lang === 'ku' && product.nameAr) return product.nameAr;
  if (lang === 'ar' && product.nameAr) return product.nameAr;
  return product.name || product.nameAr || '';
}

export function getCategoryName(category: string, lang: Language): string {
  if (uiTranslations[category]) {
    return uiTranslations[category][lang] || uiTranslations[category]['ar'] || category;
  }
  return category;
}
