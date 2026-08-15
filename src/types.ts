export type Language = 'ar' | 'en' | 'ku';

export type Category = 
  | 'Dairy & Milk'
  | 'Beverages & Juices'
  | 'Snacks & Sweets'
  | 'Bakery & Bread'
  | 'Meat & Poultry'
  | 'Fresh Produce'
  | 'Frozen Foods'
  | 'Canned Goods'
  | 'Household & Care';

export interface Product {
  id: string;
  name: string;
  nameAr: string;
  nameKu?: string;
  category: Category | string;
  categoryAr: string;
  categoryKu?: string;
  barcode: string;
  supplierDelegate?: string; // اسم المندوب
  cartonsCount: number; // عدد الكراتين
  unitsPerCarton: number; // عدد المواد داخل الكرتونة
  totalUnits: number; // مجموع المواد كلها (عدد الكراتين * عدد المواد داخل الكرتونة)
  cartonPurchasePrice: number; // سعر شراء كرتون واحد
  costPerUnit: number; // سعر تكلفة المادة الواحدة (سعر شراء الكرتون / عدد المواد داخل الكرتون)
  singleRetailPrice: number; // سعر البيع مفرد
  wholesalePrice: number; // سعر البيع بالجملة
  cartonSellingPrice: number; // سعر البيع بالكرتون
  singleProfit: number; // ارباح البيع المفرد (سعر البيع المفرد - سعر تكلفة القطعة)
  wholesaleProfit: number; // ارباح البيع بالجملة (سعر البيع بالجملة - سعر تكلفة القطعة)
  cartonProfit: number; // ارباح بيع الكرتون (سعر بيع الكرتون - سعر شراء الكرتون)
  initialAddDate: string; // تاريخ أول إضافة مواد
  lastEditDate: string; // تاريخ آخر تعديل مواد
  lastPriceUpdate?: string; // تاريخ ووقت آخر تغيير بسعر المادة
  priceHistory?: Array<{
    date: string;
    oldPrice: number;
    newPrice: number;
    oldCost?: number;
    newCost?: number;
    updatedBy?: string;
  }>;
  expiryDate: string; // تاريخ انتهاء صلاحية المواد
  price: number; // standard single retail price for POS compatibility
  cost: number; // standard cost per unit
  stock: number; // total units in stock
  minStock: number;
  unit: string;
  supplierId: string;
  supplierName: string;
  imageIcon: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  
  // 🏥 Pharmacy Specific Fields (البيانات الدوائية والصيدلانية)
  scientificName?: string; // الاسم العلمي (Active Ingredient)
  dosageForm?: string; // التركيز والشكل الدوائي (e.g. 500mg - أقراص)
  pharmaCategory?: string; // الفئة والترميز (OTC / Rx / أدوية مراقبة / مستلزمات)
  batchNumber?: string; // رقم التشغيلة (Batch/Lot No)
  expiryAlertMonths?: number; // الأشهر المتبقية للتنبيه (Default 6)
  blistersPerBox?: number; // عدد الأشرطة / التجزئة داخل العلبة
  blisterPrice?: number; // سعر بيع الشريط / القطعة التجزئة
  storageCondition?: string; // ظروف الحفظ (ثلاجة / حرارة الغرفة / بعيداً عن الضوء)
  storageLocation?: string; // مكان التخزين والرف
}

export type SaleUnitType = 'retail' | 'wholesale' | 'carton' | 'blister';

export interface PrescriptionInfo {
  doctorName?: string;
  patientName?: string;
  patientAge?: string;
  patientPhone?: string;
  prescriptionNotes?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  saleType: SaleUnitType;
  addedAtTime?: string;
  dosageInstruction?: string;
}

export interface ReturnedSaleItem {
  productId: string;
  productName: string;
  productNameAr?: string;
  price: number;
  quantity: number;
  saleType?: SaleUnitType;
  total: number;
  returnedAt: string;
}

export interface SaleTransaction {
  id: string;
  invoiceNumber: string;
  timestamp: string;
  customerName?: string;
  prescriptionInfo?: PrescriptionInfo;
  items: {
    productId: string;
    productName: string;
    productNameAr: string;
    price: number;
    quantity: number;
    saleType?: SaleUnitType;
    total: number;
    addedAtTime?: string;
    dosageInstruction?: string;
  }[];
  returnedItems?: ReturnedSaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'nfc' | 'debt' | 'loyalty';
  amountTendered?: number;
  changeDue?: number;
  cashierName: string;
  status: 'completed' | 'refunded' | 'pending';
}

export interface SupplierPayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'check';
  note?: string;
  invoiceNo?: string;
}

export interface Supplier {
  id: string;
  name: string;
  nameAr: string;
  contactPerson: string;
  phone: string;
  email: string;
  categorySupplied: string;
  activeOrders: number;
  totalInvoiced?: number; // إجمالي قيمة الشحنات والتوريدات
  totalPaid?: number;     // إجمالي المبلغ المدفوع
  balanceDue: number;     // الباقي / المتبقي
  rating: number;
  avatar: string;
  taxNumber?: string;
  address?: string;
  isSaved?: boolean;      // الشركات المحفوظة / المفضلة
  payments?: SupplierPayment[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitsCount: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'VIP';
  joinedDate: string;
}

export interface MarketOrder {
  id: string;
  orderNumber: string;
  type: 'supplier_restock' | 'customer_delivery';
  partyName: string;
  date: string;
  time: string;
  itemsCount: number;
  totalAmount: number;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  venueOrAddress: string;
}

export interface MarketNotification {
  id: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  time: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'inventory' | 'sales' | 'system' | 'supplier';
  read: boolean;
}

export interface POSKeyboardShortcuts {
  newWindow: string;        // Default: 'F1'
  completeSale: string;     // Default: 'F2'
  focusBarcode: string;     // Default: 'F3'
  openInventory: string;    // Default: 'F4'
  switchNextWindow: string; // Default: 'F6'
  switchPrevWindow: string; // Default: 'F7'
  clearCart: string;        // Default: 'F8'
  printReceipt: string;     // Default: 'F9'
  closeActiveWindow: string; // Default: 'F10'
}

export interface CustomerDisplayItem {
  id: string;
  productId: string;
  name: string;
  nameAr?: string;
  nameKu?: string;
  scientificName?: string;
  barcode: string;
  quantity: number;
  saleType: SaleUnitType;
  unitPrice: number;
  total: number;
  originalPrice?: number;
  discountPerUnit?: number;
  dosageInstruction?: string;
  imageIcon?: string;
  isNewlyAdded?: boolean;
}

export interface CustomerDisplayPayload {
  activeWindowId: string;
  windowIndex?: number;
  items: CustomerDisplayItem[];
  itemCount: number;
  totalUnitsCount: number;
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'nfc' | 'debt';
  cashTendered: number;
  changeDue: number;
  isReturnMode: boolean;
  storeName: string;
  storeNameAr?: string;
  storeNameKu?: string;
  currencySymbol: string;
  phone?: string;
  address?: string;
  welcomeMessageAr?: string;
  welcomeMessageKu?: string;
  welcomeMessageEn?: string;
  completedSale?: {
    invoiceNumber: string;
    total: number;
    amountTendered?: number;
    changeDue?: number;
    paymentMethod: string;
    itemsCount: number;
    timestamp: string;
  } | null;
  cashierName?: string;
  lastUpdated: number;
}

export interface StoreSettings {
  storeName: string;
  storeNameAr: string;
  storeNameKu?: string;
  taxRate: number; // e.g. 15 for 15%
  currency: string;
  currencySymbol: string;
  phone: string;
  address: string;
  receiptHeaderMsg: string;
  receiptFooterMsg: string;
  autoPrintReceipt: boolean;
  lowStockThresholdDefault: number;
  language: Language;
  themeMode?: 'dark' | 'light';
  printerType?: 'thermal80mm' | 'thermal58mm' | 'a4' | 'a5' | 'label_barcode';
  connectedPrinterName?: string;
  printerConnectionType?: 'system' | 'usb' | 'network' | 'bluetooth';
  printerIpAddress?: string;
  labelPrinterName?: string;
  paperSize?: '80mm' | '58mm' | 'A4' | 'A5' | '50x30mm' | '40x20mm';
  autoPrintPriceLabels?: boolean;
  printerCopies?: number;
  posShortcuts?: POSKeyboardShortcuts;
}

export interface UserPermissions {
  canAccessDashboard?: boolean;
  canAccessPOS: boolean;
  canManageProducts: boolean;
  canManageInventoryAudit?: boolean;
  canManagePurchases?: boolean;
  canManageSuppliers: boolean;
  canManageCustomers: boolean;
  canManageOrders: boolean;
  canViewInvoices?: boolean;
  canViewAnalytics?: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canViewPurchasePriceInPOS?: boolean; // إظهار سعر الشراء والتكلفة في واجهة الكاشير وسلة البيع
}

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  username: string;
  password?: string;
  role: 'Admin' | 'Manager' | 'Cashier';
  active: boolean;
  createdAt: string;
  phone?: string;
  address?: string;
  bio?: string;
  gender?: string;
  specialization?: string; // التخصص أو المسمى الوظيفي
  nationalIdFile?: string;
  avatar?: string;
  permissions: UserPermissions;
}

export interface PurchaseInvoiceItem {
  id: string;
  productId: string;
  productName: string;
  productNameAr: string;
  barcode: string;
  imageIcon: string;
  categoryAr?: string;
  currentStockInWarehouse: number; // الكمية المتوفرة بالمخزن حالياً (قديم)
  purchasedQuantity: number; // عدد المواد التي تم شرائها حديثاً
  oldPurchasePrice: number; // سعر الشراء القديم
  newPurchasePrice: number; // سعر الشراء الجديد
  oldRetailPrice: number; // سعر البيع القديم
  newRetailPrice: number; // سعر البيع الجديد
  unitsPerCarton?: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  supplierName: string;
  supplierPhone: string;
  paymentType: 'cash' | 'credit' | 'part'; // نقداً / آجل / جزئي
  paidAmount: number;
  remainingAmount: number;
  totalInvoiceAmount: number;
  items: PurchaseInvoiceItem[];
  status: 'completed' | 'draft';
  notes?: string;
}

export interface OperatingExpenseItem {
  id: string;
  name: string;
  category: string;
  categoryName?: string;
  amount: number;
  note?: string;
  date?: string;
  createdBy?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  nameAr: string;
  nameKu?: string;
  nameEn?: string;
  icon?: string;
  isCustom?: boolean;
}


