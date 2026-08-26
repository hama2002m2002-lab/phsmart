import { Product, SaleTransaction, Supplier, PurchaseInvoice } from '../types';

export interface StressGenerationOptions {
  productCount: number;
  salesCount: number;
  suppliersCount: number;
  purchasesCount: number;
  includeReturns: boolean;
  onProgress?: (percent: number, message: string) => void;
}

const CATEGORIES_DATA = [
  { ar: 'الألبان والأجبان', ku: 'شیرەمەنی و پەنیر', en: 'Dairy & Milk', prefix: 'DAI', unit: 'قطعة' },
  { ar: 'المشروبات والعصائر', ku: 'خواردنەوە و شەربەت', en: 'Beverages & Juices', prefix: 'BEV', unit: 'علبة' },
  { ar: 'المعلبات والمواد الغذائية', ku: 'قوتوو و خواردەمەنی', en: 'Canned Goods', prefix: 'CAN', unit: 'علبة' },
  { ar: 'المنظفات والعناية المنزلية', ku: 'پاککەرەوە و پێداویستی', en: 'Household & Care', prefix: 'HOU', unit: 'عبوة' },
  { ar: 'المخبوزات والحلويات', ku: 'شیرینی و هەویرکاری', en: 'Bakery & Bread', prefix: 'BAK', unit: 'كيس' },
  { ar: 'المجمدات واللحوم', ku: 'بەستوو و گۆشت', en: 'Frozen Foods', prefix: 'FRO', unit: 'كيلو' },
  { ar: 'السناكات والمقرمشات', ku: 'چپس و پسکیت', en: 'Snacks & Sweets', prefix: 'SNK', unit: 'باكيت' },
  { ar: 'الفواكه والخضار الطازجة', ku: 'میوە و سەوزەی فرێش', en: 'Fresh Produce', prefix: 'FRE', unit: 'كيلو' }
];

const BRAND_PREFIXES = [
  'المراعي', 'نادك', 'صافي', 'دانون', 'الروابي', 'العلالي', 'كنور', 'ماجي', 'ليبتون', 'نسكافيه',
  'أوريو', 'كيت كات', 'سنكرز', 'ليز', 'دوريتوس', 'برينجلز', 'تايد', 'أريال', 'فيري', 'داك',
  'بندول', 'كولجيت', 'دوف', 'نيسلي', 'الضحى', 'الرجا', 'الفاروق', 'الزوراء', 'دجلة', 'الفرات'
];

const ITEM_NOUNS = [
  'حليب كامل الدسم', 'زبادي طبيعي', 'جبنة شيدر', 'جبنة موزاريلا', 'عصير برتقال طبيعي', 'شاي أحمر فاخر',
  'قهوة سريعة التحضير', 'أرز بسمتي درجة أولى', 'زيت نباتي نقي', 'سكر ناعم', 'معجون طماطم مركز',
  'تونة بزيت الزيتون', 'فاصولياء معلبة', 'مسحوق غسيل أوتوماتيك', 'سائل غسيل الأطباق', 'مناديل ورقية فاخرة',
  'بسكويت بالشوكولاتة', 'رقائق بطاطس مقرمشة', 'شوكولاتة بالحليب', 'مياه معدنية نقية'
];

const CITIES = ['بغداد', 'أربيل', 'البصرة', 'السليمانية', 'الموصل', 'دهوك', 'كركوك', 'النجف', 'كربلاء', 'الحلة'];
const SUPPLIER_NAMES = ['شركة الرافدين للتجارة', 'مجموعة النور للتوزيع', 'شركة الشروق للمواد الغذائية', 'مؤسسة البركة العالمية', 'شركة الهلال للتوريدات', 'مجموعة الفرات للتجارة'];

/**
 * High-performance, memory-safe data generator for mass stress-testing
 */
export async function generateStressTestData(options: StressGenerationOptions): Promise<{
  products: Product[];
  salesHistory: SaleTransaction[];
  suppliers: Supplier[];
  purchaseInvoices: PurchaseInvoice[];
}> {
  const {
    productCount = 100000,
    salesCount = 50000,
    suppliersCount = 1000,
    purchasesCount = 5000,
    includeReturns = true,
    onProgress
  } = options;

  onProgress?.(5, 'جاري تهيئة وتوليد قاعدة بيانات الموردين...');
  await new Promise(r => setTimeout(r, 20));

  // 1. Generate Suppliers (e.g. 1,000 - 10,000 in memory)
  const suppliers: Supplier[] = new Array(suppliersCount);
  for (let i = 0; i < suppliersCount; i++) {
    const sId = `sup-${(i + 1).toString().padStart(6, '0')}`;
    const baseName = SUPPLIER_NAMES[i % SUPPLIER_NAMES.length];
    const city = CITIES[i % CITIES.length];
    const nameAr = `${baseName} - فرع ${city} #${i + 1}`;
    const contactPerson = `مندوب ${['علي', 'محمد', 'أحمد', 'عمر', 'حسين', 'سردار', 'آزاد', 'يوسف'][i % 8]} ${i + 1}`;
    const cat = CATEGORIES_DATA[i % CATEGORIES_DATA.length].ar;
    
    // Balanced realistic numbers
    const totalInvoiced = (i % 20 + 1) * 250000 + (i * 1000);
    const totalPaid = Math.floor(totalInvoiced * (i % 3 === 0 ? 1 : 0.65));
    const balanceDue = totalInvoiced - totalPaid;

    suppliers[i] = {
      id: sId,
      name: nameAr,
      nameAr: nameAr,
      contactPerson,
      phone: `077${(10000000 + i).toString().slice(0, 8)}`,
      email: `supplier${i + 1}@trade-iq.com`,
      categorySupplied: cat,
      activeOrders: (i % 5),
      totalInvoiced,
      totalPaid,
      balanceDue,
      rating: 4.5 + (i % 6) * 0.1,
      avatar: '🏭',
      taxNumber: `TAX-${(9000000 + i)}`,
      address: `العراق - ${city} - المنطقة الصناعية`,
      isSaved: i % 10 === 0,
      payments: totalPaid > 0 ? [
        {
          id: `pay-${sId}-1`,
          date: '2026-08-15',
          amount: totalPaid,
          paymentMethod: 'transfer',
          note: 'تسوية حساب عبر الحوالة المصرفية'
        }
      ] : []
    };
  }

  onProgress?.(25, `تم إنشاء الموردين! جاري توليد ${productCount.toLocaleString()} نوعية مادة...`);
  await new Promise(r => setTimeout(r, 20));

  // 2. Generate Products
  const products: Product[] = new Array(productCount);
  const nowStr = '2026-08-22';

  for (let i = 0; i < productCount; i++) {
    const catObj = CATEGORIES_DATA[i % CATEGORIES_DATA.length];
    const brand = BRAND_PREFIXES[i % BRAND_PREFIXES.length];
    const noun = ITEM_NOUNS[i % ITEM_NOUNS.length];
    const itemNum = i + 1;
    
    const nameAr = `${noun} ${brand} #${itemNum}`;
    const nameKu = `${noun} ${brand} ژمارە ${itemNum}`;
    const nameEn = `${catObj.prefix} ${brand} Item #${itemNum}`;
    
    // Barcode: 13-digit EAN style
    const barcode = (6281000000000 + itemNum).toString();
    
    const supplierIndex = i % suppliersCount;
    const sup = suppliers[supplierIndex];

    const costPerUnit = 500 + ((i * 13) % 25000);
    const profitMargin = 1.25 + ((i % 10) * 0.03);
    const singleRetailPrice = Math.round((costPerUnit * profitMargin) / 250) * 250;
    const wholesalePrice = Math.round((costPerUnit * 1.12) / 250) * 250;
    const unitsPerCarton = [6, 12, 24, 36][i % 4];
    const cartonPurchasePrice = costPerUnit * unitsPerCarton;
    const cartonSellingPrice = Math.round((wholesalePrice * unitsPerCarton * 0.98) / 250) * 250;
    
    const cartonsCount = 10 + (i % 90);
    const stock = cartonsCount * unitsPerCarton + (i % unitsPerCarton);
    const minStock = 15;

    products[i] = {
      id: `prod-gen-${itemNum}`,
      name: nameEn,
      nameAr: nameAr,
      nameKu: nameKu,
      category: catObj.en,
      categoryAr: catObj.ar,
      categoryKu: catObj.ku,
      barcode: barcode,
      supplierId: sup.id,
      supplierName: sup.nameAr,
      supplierDelegate: sup.contactPerson,
      cartonsCount,
      unitsPerCarton,
      totalUnits: stock,
      cartonPurchasePrice,
      lastPurchasePrice: costPerUnit,
      lastCartonPurchasePrice: cartonPurchasePrice,
      costPerUnit,
      singleRetailPrice,
      wholesalePrice,
      cartonSellingPrice,
      singleProfit: singleRetailPrice - costPerUnit,
      wholesaleProfit: wholesalePrice - costPerUnit,
      cartonProfit: cartonSellingPrice - cartonPurchasePrice,
      initialAddDate: '2026-01-10',
      lastEditDate: nowStr,
      expiryDate: '2027-12-31',
      price: singleRetailPrice,
      cost: costPerUnit,
      stock,
      minStock,
      unit: catObj.unit,
      imageIcon: '📦',
      status: stock === 0 ? 'out_of_stock' : stock <= minStock ? 'low_stock' : 'in_stock'
    };
  }

  onProgress?.(60, `تم إنشاء المواد بنجاح! جاري توليد فواتير الشراء...`);
  await new Promise(r => setTimeout(r, 20));

  // 3. Generate Purchase Invoices
  const purchaseInvoices: PurchaseInvoice[] = new Array(purchasesCount);
  for (let i = 0; i < purchasesCount; i++) {
    const invNum = (100000 + i + 1).toString();
    const sup = suppliers[i % suppliersCount];
    const itemsCount = 2 + (i % 4);
    const items = [];
    let invoiceTotal = 0;

    for (let k = 0; k < itemsCount; k++) {
      const prod = products[(i * 5 + k) % productCount];
      const qtyCartons = 2 + (k % 5);
      const totalUnits = qtyCartons * prod.unitsPerCarton;
      const unitCost = prod.costPerUnit;
      const cartonCost = prod.cartonPurchasePrice;
      const totalCost = qtyCartons * cartonCost;
      invoiceTotal += totalCost;

      items.push({
        productId: prod.id,
        productName: prod.nameAr,
        barcode: prod.barcode,
        cartonsCount: qtyCartons,
        unitsPerCarton: prod.unitsPerCarton,
        totalUnits: totalUnits,
        unitCost: unitCost,
        cartonPurchasePrice: cartonCost,
        totalCost: totalCost,
        sellingPrice: prod.singleRetailPrice
      });
    }

    const paidAmount = i % 2 === 0 ? invoiceTotal : Math.floor(invoiceTotal * 0.5);
    const remainingAmount = invoiceTotal - paidAmount;

    purchaseInvoices[i] = {
      id: `pur-${invNum}`,
      invoiceNumber: `PUR-${invNum}`,
      date: `2026-08-${((i % 22) + 1).toString().padStart(2, '0')}`,
      time: '10:30 AM',
      supplierName: sup.nameAr,
      supplierPhone: sup.phone,
      items,
      totalInvoiceAmount: invoiceTotal,
      paidAmount,
      remainingAmount,
      paymentType: remainingAmount === 0 ? 'cash' : paidAmount === 0 ? 'credit' : 'part',
      status: 'completed',
      notes: 'شحنة توريد مواد أسبوعية منتظمة'
    };
  }

  onProgress?.(80, `جاري توليد سجلات المبيعات والمرجوعات (${salesCount.toLocaleString()} حركة)...`);
  await new Promise(r => setTimeout(r, 20));

  // 4. Generate Sales History with realistic returns
  const salesHistory: SaleTransaction[] = new Array(salesCount);
  const paymentMethods: ('cash' | 'card' | 'debt')[] = ['cash', 'cash', 'cash', 'card', 'debt'];
  const cashiers = ['أحمد الكاشير (وردية 1)', 'سارة (وردية 2)', 'المدير العام (Admin)'];

  for (let i = 0; i < salesCount; i++) {
    const saleId = `sale-${(1000000 + i + 1)}`;
    const invoiceNumber = `INV-${(1000000 + i + 1)}`;
    const cashier = cashiers[i % cashiers.length];
    const paymentMethod = paymentMethods[i % paymentMethods.length];
    
    // Pick 1 to 4 items
    const numItems = 1 + (i % 3);
    const items = [];
    let subtotal = 0;

    for (let k = 0; k < numItems; k++) {
      const prod = products[(i * 3 + k) % productCount];
      const qty = 1 + (k % 3);
      const price = prod.singleRetailPrice;
      const total = price * qty;
      subtotal += total;

      items.push({
        productId: prod.id,
        productName: prod.name,
        productNameAr: prod.nameAr,
        productNameKu: prod.nameKu,
        price,
        quantity: qty,
        saleType: 'retail' as const,
        total,
        addedAtTime: '14:30'
      });
    }

    // Add returns to ~10% of sales if requested
    const hasReturn = includeReturns && (i % 10 === 0);
    const returnedItems = hasReturn ? [
      {
        productId: items[0].productId,
        productName: items[0].productName,
        productNameAr: items[0].productNameAr,
        price: items[0].price,
        quantity: 1,
        saleType: 'retail' as const,
        total: items[0].price,
        returnedAt: '2026-08-22T16:00:00.000Z'
      }
    ] : undefined;

    const discount = (i % 15 === 0) ? 500 : 0;
    const total = Math.max(0, subtotal - discount);

    // Distribution across current month and past months for rich charts & reports
    const day = (i % 22) + 1;
    const hour = (8 + (i % 14)).toString().padStart(2, '0');
    const minute = ((i * 7) % 60).toString().padStart(2, '0');
    const timestamp = `2026-08-${day.toString().padStart(2, '0')}T${hour}:${minute}:00.000Z`;

    salesHistory[i] = {
      id: saleId,
      invoiceNumber,
      timestamp,
      customerName: (i % 4 === 0) ? `عميل كاش #${(i % 50) + 1}` : undefined,
      items,
      returnedItems,
      subtotal,
      tax: 0,
      discount,
      total,
      paymentMethod,
      amountTendered: total + (paymentMethod === 'cash' ? 1000 : 0),
      changeDue: paymentMethod === 'cash' ? 1000 : 0,
      cashierName: cashier,
      status: 'completed'
    };
  }

  onProgress?.(100, 'تم توليد وتجهيز كافة السجلات بنجاح!');
  return {
    products,
    salesHistory,
    suppliers,
    purchaseInvoices
  };
}
