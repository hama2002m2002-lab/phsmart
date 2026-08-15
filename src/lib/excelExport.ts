import * as XLSX from 'xlsx';
import { 
  Product, 
  SaleTransaction, 
  Supplier, 
  Customer, 
  PurchaseInvoice, 
  UserAccount, 
  StoreSettings, 
  MarketOrder, 
  MarketNotification, 
  OperatingExpenseItem 
} from '../types';
import { getItemUnitCost, getItemTotalCost, getItemTotalProfit } from './financialUtils';

export interface FullStoreBackup {
  products: Product[];
  salesHistory: SaleTransaction[];
  suppliers: Supplier[];
  customers: Customer[];
  purchaseInvoices: PurchaseInvoice[];
  userAccounts: UserAccount[];
  settings: StoreSettings;
  orders?: MarketOrder[];
  notifications?: MarketNotification[];
  damagedLogs?: any[];
  delegateReturns?: any[];
  operatingExpenses?: OperatingExpenseItem[];
  customExpenseTypes?: string[];
  cashAdjustments?: any[];
  inventoryAudits?: any[];
  exportedAt?: string;
}

/**
 * Helper to get products map for fast lookup
 */
function createProductsMap(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  products.forEach(p => {
    if (p.id) map.set(p.id, p);
    if (p.barcode) map.set(p.barcode, p);
  });
  return map;
}

/**
 * Exports the complete store database and comprehensive reports into an organized multi-sheet Excel (.xlsx) file.
 */
export function exportStoreToExcel(data: FullStoreBackup, fileNamePrefix = 'supermarket_full_backup'): void {
  const wb = XLSX.utils.book_new();
  const products = data.products || [];
  const sales = data.salesHistory || [];
  const suppliers = data.suppliers || [];
  const customers = data.customers || [];
  const purchases = data.purchaseInvoices || [];
  const users = data.userAccounts || [];
  const orders = data.orders || [];
  const notifications = data.notifications || [];
  const damaged = data.damagedLogs || [];
  const delegateReturns = data.delegateReturns || [];
  const expenses = data.operatingExpenses || [];
  const cashAdjustments = data.cashAdjustments || [];
  const settings = data.settings;

  const prodMap = createProductsMap(products);

  // ----------------------------------------------------
  // 1. Sheet: Financial & Profit Summary Report (ملخص التقارير والأرباح)
  // ----------------------------------------------------
  const totalGrossSales = sales.reduce((acc, s) => acc + (s.subtotal || s.total || 0), 0);
  const totalNetSales = sales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalDiscounts = sales.reduce((acc, s) => acc + (s.discount || 0), 0);
  const totalTax = sales.reduce((acc, s) => acc + (s.tax || 0), 0);
  
  // Calculate total Cost of Goods Sold (COGS) & Gross Profit
  let totalCOGS = 0;
  let totalSalesProfit = 0;
  let totalItemsSoldQty = 0;

  sales.forEach(sale => {
    (sale.items || []).forEach(item => {
      const prod = prodMap.get(item.productId);
      const cost = getItemTotalCost(item, prod);
      const profit = getItemTotalProfit(item, prod);
      totalCOGS += cost;
      totalSalesProfit += profit;
      totalItemsSoldQty += (item.quantity || 0);
    });
  });

  const totalExpensesAmount = expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  const netOperationalProfit = totalSalesProfit - totalExpensesAmount;
  const profitMarginPercent = totalNetSales > 0 ? ((totalSalesProfit / totalNetSales) * 100).toFixed(2) : '0';

  // Inventory Valuations
  const totalInventoryCostValue = products.reduce((acc, p) => acc + ((p.stock || p.totalUnits || 0) * (p.costPerUnit || p.cost || 0)), 0);
  const totalInventoryRetailValue = products.reduce((acc, p) => acc + ((p.stock || p.totalUnits || 0) * (p.singleRetailPrice || p.price || 0)), 0);
  const totalExpectedInventoryProfit = totalInventoryRetailValue - totalInventoryCostValue;

  const totalSupplierDebts = suppliers.reduce((acc, sup) => acc + (sup.balanceDue || 0), 0);
  const totalCustomerLoyaltyPoints = customers.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0);
  const lowStockProductsCount = products.filter(p => (p.stock || p.totalUnits || 0) <= (p.minStock || 5)).length;

  const summarySheetData = [
    { 'المؤشر المالي / الإحصائي': '📊 إجمالي المبيعات الإجمالية', 'القيمة ($)': totalGrossSales, 'ملاحظات وتفاصيل': 'مجموع مبالغ الفواتير قبل الخصومات' },
    { 'المؤشر المالي / الإحصائي': '💵 إجمالي صافي المبيعات المحصلة', 'القيمة ($)': totalNetSales, 'ملاحظات وتفاصيل': 'المبالغ النهائية بعد الخصومات والضرائب' },
    { 'المؤشر المالي / الإحصائي': '📦 إجمالي تكلفة البضاعة المباعة (COGS)', 'القيمة ($)': totalCOGS, 'ملاحظات وتفاصيل': 'تكلفة شراء المواد المباعة من الموردين' },
    { 'المؤشر المالي / الإحصائي': '📈 إجمالي الأرباح الإجمالية (Gross Profit)', 'القيمة ($)': totalSalesProfit, 'ملاحظات وتفاصيل': 'أرباح المبيعات = الإيرادات - سعر الشراء' },
    { 'المؤشر المالي / الإحصائي': '📉 إجمالي المصاريف التشغيلية والنثريات', 'القيمة ($)': totalExpensesAmount, 'ملاحظات وتفاصيل': 'مجموع مصاريف الإيجار، الرواتب، النثريات، والكهرباء' },
    { 'المؤشر المالي / الإحصائي': '✨ صافي الربح التشغيلي الصافي (Net Profit)', 'القيمة ($)': netOperationalProfit, 'ملاحظات وتفاصيل': 'الأرباح الصافية بعد خصم كافة المصاريف التشغيلية' },
    { 'المؤشر المالي / الإحصائي': '🎯 نسبة هامش الربح الإجمالي', 'القيمة ($)': `${profitMarginPercent}%`, 'ملاحظات وتفاصيل': 'نسبة الربح مقارنة بصافي المبيعات' },
    { 'المؤشر المالي / الإحصائي': '🏷️ إجمالي الخصومات الممنوحة للعملاء', 'القيمة ($)': totalDiscounts, 'ملاحظات وتفاصيل': 'قيمة التخفيضات والكوبونات الممنوحة' },
    { 'المؤشر المالي / الإحصائي': '🏛️ إجمالي الضريبة المحصلة', 'القيمة ($)': totalTax, 'ملاحظات وتفاصيل': 'مجموع الضرائب المحسوبة' },
    { 'المؤشر المالي / الإحصائي': '🛒 إجمالي عدد الفواتير الصادرة', 'القيمة ($)': sales.length, 'ملاحظات وتفاصيل': 'عدد عمليات البيع المسجلة في النظام' },
    { 'المؤشر المالي / الإحصائي': '🔢 إجمالي عدد القطع والمواد المباعة', 'القيمة ($)': totalItemsSoldQty, 'ملاحظات وتفاصيل': 'مجموع الكميات المفرغة والمباعة من المخزن' },
    { 'المؤشر المالي / الإحصائي': '🏬 القيمة الإجمالية للمخزون الحالي (بسعر الكلفة)', 'القيمة ($)': totalInventoryCostValue, 'ملاحظات وتفاصيل': 'رأس المال المستثمر في البضائع الموجودة حالياً بالمخزن' },
    { 'المؤشر المالي / الإحصائي': '🏷️ القيمة البيعية المتوقعة للمخزون (بسعر المفرد)', 'القيمة ($)': totalInventoryRetailValue, 'ملاحظات وتفاصيل': 'إجمالي الإيراد المتوقع عند بيع كامل البضائع المتوفرة' },
    { 'المؤشر المالي / الإحصائي': '💰 الأرباح المتوقعة من كامل المخزون المتوفر', 'القيمة ($)': totalExpectedInventoryProfit, 'ملاحظات وتفاصيل': 'الربح المتوقع تحقيقه من بضائع المخزن الحالية' },
    { 'المؤشر المالي / الإحصائي': '🚚 إجمالي ديون ومستحقات الموردين والشركات', 'القيمة ($)': totalSupplierDebts, 'ملاحظات وتفاصيل': 'المبالغ الآجلة المتبقية للشركات والموردين' },
    { 'المؤشر المالي / الإحصائي': '👥 إجمالي نقاط ولاء العملاء المكتسبة', 'القيمة ($)': totalCustomerLoyaltyPoints, 'ملاحظات وتفاصيل': 'مجموع نقاط الولاء في حسابات الزبائن' },
    { 'المؤشر المالي / الإحصائي': '⚠️ عدد المواد في حالة النقص (وصلت للحد الأدنى)', 'القيمة ($)': lowStockProductsCount, 'ملاحظات وتفاصيل': 'المواد التي بحاجة لإعادة طلب وتوريد' },
    { 'المؤشر المالي / الإحصائي': '📅 تاريخ ووقت استخراج هذا التقرير الشامل', 'القيمة ($)': new Date().toLocaleString('ar-IQ'), 'ملاحظات وتفاصيل': 'تاريخ إنشاء النسخة الاحتياطية' }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'تقرير الأرباح والمؤشرات المالية');

  // ----------------------------------------------------
  // 2. Sheet: Products & Inventory (المواد والمنتجات والمخزون)
  // ----------------------------------------------------
  const productsSheetData = products.map((p, index) => {
    const stockUnits = p.stock ?? p.totalUnits ?? 0;
    const unitCost = p.costPerUnit || p.cost || 0;
    const retailPrice = p.singleRetailPrice || p.price || 0;
    const wholesalePrice = p.wholesalePrice || retailPrice;
    const unitsPerCarton = p.unitsPerCarton || 1;
    const cartonsCount = p.cartonsCount || (unitsPerCarton > 0 ? Math.floor(stockUnits / unitsPerCarton) : 0);
    const cartonSellPrice = p.cartonSellingPrice || (retailPrice * unitsPerCarton);
    const cartonCost = p.cartonPurchasePrice || (unitCost * unitsPerCarton);

    return {
      'ت': index + 1,
      'الباركود': p.barcode || '',
      'اسم المادة (عربي)': p.nameAr || p.name || '',
      'اسم المادة (إنجليزي)': p.name || '',
      'القسم / الصنف': p.categoryAr || p.category || '',
      'اسم المندوب / الشركة': p.supplierDelegate || p.supplierName || '',
      'عدد الكراتين': cartonsCount,
      'القطع داخل الكرتونة': unitsPerCarton,
      'إجمالي الكمية بالمخزن (قطع)': stockUnits,
      'وحدة القياس': p.unit || 'قطعة',
      'سعر شراء الكرتون ($)': cartonCost,
      'سعر شراء القطعة (التكلفة) ($)': unitCost,
      'سعر بيع المفرد ($)': retailPrice,
      'سعر بيع الجملة ($)': wholesalePrice,
      'سعر بيع الكرتون ($)': cartonSellPrice,
      'ربح بيع المفرد ($)': p.singleProfit || (retailPrice - unitCost),
      'ربح بيع الجملة ($)': p.wholesaleProfit || (wholesalePrice - unitCost),
      'ربح بيع الكرتون ($)': p.cartonProfit || (cartonSellPrice - cartonCost),
      'إجمالي قيمة المخزون (تكلفة) ($)': stockUnits * unitCost,
      'إجمالي قيمة المخزون (مفرد) ($)': stockUnits * retailPrice,
      'الحد الأدنى للتنبيه': p.minStock || 5,
      'تاريخ انتهاء الصلاحية': p.expiryDate || '',
      'تاريخ أول إضافة': p.initialAddDate || '',
      'تاريخ آخر تعديل': p.lastEditDate || '',
      'حالة المخزون': stockUnits === 0 ? 'نفذت الكمية' : stockUnits <= (p.minStock || 5) ? 'منخفض / نواقص' : 'متوفر',
      'الاسم العلمي والتركيز': p.scientificName ? `${p.scientificName} ${p.dosageForm || ''}` : '',
      'مكان التخزين والرف': p.storageLocation || ''
    };
  });
  const wsProducts = XLSX.utils.json_to_sheet(productsSheetData);
  XLSX.utils.book_append_sheet(wb, wsProducts, 'المواد والمنتجات');

  // ----------------------------------------------------
  // 3. Sheet: Sales History & Invoices Detailed (سجل المبيعات والفواتير)
  // ----------------------------------------------------
  const salesSheetData = sales.map((s, index) => {
    const itemsSummary = (s.items || []).map(i => `${i.productNameAr || i.productName} (${i.quantity} ${i.saleType === 'carton' ? 'كرتون' : 'قطعة'} x $${i.price})`).join(' + ');
    
    // Calculate profit for this invoice
    let invoiceProfit = 0;
    (s.items || []).forEach(item => {
      const prod = prodMap.get(item.productId);
      invoiceProfit += getItemTotalProfit(item, prod);
    });

    return {
      'ت': index + 1,
      'رقم الفاتورة': s.invoiceNumber || s.id || '',
      'التاريخ والوقت': s.timestamp ? new Date(s.timestamp).toLocaleString('ar-IQ') : '',
      'اسم العميل': s.customerName || 'عميل نقدي',
      'اسم الكاشير': s.cashierName || 'الرئيسي',
      'عدد المواد': (s.items || []).reduce((acc, item) => acc + (item.quantity || 0), 0),
      'الإجمالي الفرعي ($)': s.subtotal || s.total || 0,
      'الخصم ($)': s.discount || 0,
      'المبلغ الإجمالي النهائي ($)': s.total || 0,
      'أرباح الفاتورة المحققة ($)': invoiceProfit,
      'المدفوع ($)': s.amountTendered || s.total || 0,
      'المتبقي / الصرف ($)': s.changeDue || 0,
      'طريقة الدفع': s.paymentMethod === 'card' ? 'بطاقة إلكترونية' : s.paymentMethod === 'nfc' ? 'دفع إلكتروني NFC' : s.paymentMethod === 'debt' ? 'آجل / ذمة' : 'نقدي',
      'حالة الفاتورة': s.status === 'refunded' ? 'مسترجعة' : s.status === 'pending' ? 'معلقة' : 'مكتملة',
      'المواد المباعة بالتفصيل': itemsSummary
    };
  });
  const wsSales = XLSX.utils.json_to_sheet(salesSheetData);
  XLSX.utils.book_append_sheet(wb, wsSales, 'سجل المبيعات والفواتير');

  // ----------------------------------------------------
  // 4. Sheet: Daily Sales & Profits Report (مبيعات وأرباح الأيام)
  // ----------------------------------------------------
  const dailyAgg: Record<string, { date: string; invoiceCount: number; itemsCount: number; totalRevenue: number; totalCost: number; totalProfit: number; returnsCount: number }> = {};
  
  sales.forEach(sale => {
    const dStr = sale.timestamp ? sale.timestamp.split('T')[0] : 'غير محدد';
    if (!dailyAgg[dStr]) {
      dailyAgg[dStr] = {
        date: dStr,
        invoiceCount: 0,
        itemsCount: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        returnsCount: 0
      };
    }
    dailyAgg[dStr].invoiceCount += 1;
    dailyAgg[dStr].totalRevenue += (sale.total || 0);

    if (sale.status === 'refunded') {
      dailyAgg[dStr].returnsCount += 1;
    }

    (sale.items || []).forEach(item => {
      const prod = prodMap.get(item.productId);
      const cost = getItemTotalCost(item, prod);
      const profit = getItemTotalProfit(item, prod);
      dailyAgg[dStr].itemsCount += (item.quantity || 0);
      dailyAgg[dStr].totalCost += cost;
      dailyAgg[dStr].totalProfit += profit;
    });
  });

  const dailyReportData = Object.values(dailyAgg)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((day, idx) => ({
      'ت': idx + 1,
      'التاريخ': day.date,
      'عدد الفواتير': day.invoiceCount,
      'إجمالي القطع المباعة': day.itemsCount,
      'إجمالي المبيعات ($)': day.totalRevenue,
      'إجمالي التكلفة ($)': day.totalCost,
      'إجمالي الأرباح المحققة ($)': day.totalProfit,
      'نسبة الربح (%)': day.totalRevenue > 0 ? `${((day.totalProfit / day.totalRevenue) * 100).toFixed(2)}%` : '0%',
      'عدد الفواتير المرتجعة': day.returnsCount,
      'الصافي النهائي ($)': day.totalRevenue
    }));
  const wsDaily = XLSX.utils.json_to_sheet(dailyReportData);
  XLSX.utils.book_append_sheet(wb, wsDaily, 'تقرير مبيعات وأرباح الأيام');

  // ----------------------------------------------------
  // 5. Sheet: Cashier Accounts & Performance (حسابات وإنتاجية الكاشيرية)
  // ----------------------------------------------------
  const cashierAgg: Record<string, { cashier: string; invoices: number; totalSales: number; refundsTotal: number; profit: number; itemsCount: number }> = {};
  
  sales.forEach(sale => {
    const cName = sale.cashierName || 'الكاشير العام';
    if (!cashierAgg[cName]) {
      cashierAgg[cName] = {
        cashier: cName,
        invoices: 0,
        totalSales: 0,
        refundsTotal: 0,
        profit: 0,
        itemsCount: 0
      };
    }
    cashierAgg[cName].invoices += 1;
    cashierAgg[cName].totalSales += (sale.total || 0);

    if (sale.status === 'refunded') {
      cashierAgg[cName].refundsTotal += (sale.total || 0);
    }

    (sale.items || []).forEach(item => {
      const prod = prodMap.get(item.productId);
      cashierAgg[cName].itemsCount += (item.quantity || 0);
      cashierAgg[cName].profit += getItemTotalProfit(item, prod);
    });
  });

  const cashierSheetData = Object.values(cashierAgg).map((c, idx) => ({
    'ت': idx + 1,
    'اسم الكاشير': c.cashier,
    'عدد الفواتير المنفذة': c.invoices,
    'إجمالي عدد القطع المباعة': c.itemsCount,
    'إجمالي المبيعات الصادرة ($)': c.totalSales,
    'إجمالي المرتجعات ($)': c.refundsTotal,
    'صافي المبيعات المحققة ($)': c.totalSales - c.refundsTotal,
    'الأرباح المحققة ($)': c.profit,
    'متوسط قيمة الفاتورة ($)': c.invoices > 0 ? (c.totalSales / c.invoices).toFixed(2) : 0
  }));
  const wsCashiers = XLSX.utils.json_to_sheet(cashierSheetData);
  XLSX.utils.book_append_sheet(wb, wsCashiers, 'حسابات وإنتاجية الكاشيرية');

  // ----------------------------------------------------
  // 6. Sheet: Product Velocity Report (حركة المواد الأكثر مبيعاً والراكدة)
  // ----------------------------------------------------
  const prodSalesAgg: Record<string, { barcode: string; name: string; category: string; soldQty: number; revenue: number; cost: number; profit: number }> = {};
  
  sales.forEach(sale => {
    (sale.items || []).forEach(item => {
      const pId = item.productId;
      const prod = prodMap.get(pId);
      const barcode = prod?.barcode || pId;
      const name = item.productNameAr || item.productName || prod?.nameAr || prod?.name || 'مادة';
      const category = prod?.categoryAr || prod?.category || 'عام';
      const cost = getItemTotalCost(item, prod);
      const profit = getItemTotalProfit(item, prod);
      const rev = item.total ?? (item.price * item.quantity);

      if (!prodSalesAgg[pId]) {
        prodSalesAgg[pId] = {
          barcode,
          name,
          category,
          soldQty: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        };
      }
      prodSalesAgg[pId].soldQty += (item.quantity || 0);
      prodSalesAgg[pId].revenue += rev;
      prodSalesAgg[pId].cost += cost;
      prodSalesAgg[pId].profit += profit;
    });
  });

  const velocitySheetData = Object.values(prodSalesAgg)
    .sort((a, b) => b.soldQty - a.soldQty)
    .map((p, idx) => {
      const prodInStock = Array.from(prodMap.values()).find(x => x.barcode === p.barcode);
      const curStock = prodInStock ? (prodInStock.stock || prodInStock.totalUnits || 0) : 0;
      return {
        'ت': idx + 1,
        'الباركود': p.barcode,
        'اسم المادة': p.name,
        'القسم': p.category,
        'إجمالي الكمية المباعة': p.soldQty,
        'إجمالي إيرادات المادة ($)': p.revenue,
        'تكلفة الكميات المباعة ($)': p.cost,
        'صافي أرباح المادة ($)': p.profit,
        'الكمية المتبقية بالمخزن': curStock,
        'تصنيف الحركة': idx < 10 ? '🔥 الأكثر طلباً ومبيعاً' : p.soldQty > 5 ? '⚡ حركة نشطة' : '⚠️ حركة بطيئة'
      };
    });
  const wsVelocity = XLSX.utils.json_to_sheet(velocitySheetData);
  XLSX.utils.book_append_sheet(wb, wsVelocity, 'تقرير حركة المواد والأرباح');

  // ----------------------------------------------------
  // 7. Sheet: Low Stock & Expirations (تقرير النواقص وتواريخ الصلاحية)
  // ----------------------------------------------------
  const lowStockAndExpiryData = products
    .filter(p => (p.stock || p.totalUnits || 0) <= (p.minStock || 5) || Boolean(p.expiryDate))
    .map((p, idx) => {
      const stock = p.stock || p.totalUnits || 0;
      const min = p.minStock || 5;
      return {
        'ت': idx + 1,
        'الباركود': p.barcode || '',
        'اسم المادة': p.nameAr || p.name || '',
        'القسم': p.categoryAr || p.category || '',
        'الكمية الحالية': stock,
        'الحد الأدنى': min,
        'مقدار النقص': stock < min ? min - stock : 0,
        'حالة المخزون': stock === 0 ? 'نفذ بالكامل' : stock <= min ? 'ناقص / يحتاج طلب' : 'مكتمل',
        'تاريخ انتهاء الصلاحية': p.expiryDate || 'غير محدد',
        'المورد / المندوب': p.supplierDelegate || p.supplierName || 'عام'
      };
    });
  const wsLowStock = XLSX.utils.json_to_sheet(lowStockAndExpiryData);
  XLSX.utils.book_append_sheet(wb, wsLowStock, 'تقرير النواقص وتواريخ الصلاحية');

  // ----------------------------------------------------
  // 8. Sheet: Purchase Invoices (فواتير المشتريات والتوريد)
  // ----------------------------------------------------
  const purchasesSheetData = purchases.map((p, index) => ({
    'ت': index + 1,
    'رقم الفاتورة': p.invoiceNumber || p.id,
    'اسم المورد / الشركة': p.supplierName || '',
    'رقم هاتف المورد': p.supplierPhone || '',
    'التاريخ': p.date || '',
    'الوقت': p.time || '',
    'إجمالي الفاتورة ($)': p.totalInvoiceAmount || 0,
    'المبلغ المدفوع ($)': p.paidAmount || 0,
    'المبلغ المتبقي (آجل) ($)': p.remainingAmount || 0,
    'طريقة الدفع': p.paymentType === 'credit' ? 'آجل' : p.paymentType === 'part' ? 'دفعة جزئية' : 'نقداً',
    'عدد الأصناف': (p.items || []).length,
    'حالة الفاتورة': p.status === 'completed' ? 'مكتملة' : 'مسودة',
    'ملاحظات': p.notes || ''
  }));
  const wsPurchases = XLSX.utils.json_to_sheet(purchasesSheetData);
  XLSX.utils.book_append_sheet(wb, wsPurchases, 'فواتير المشتريات والتوريد');

  // ----------------------------------------------------
  // 9. Sheet: Suppliers & Balances (الموردين وحسابات الديون)
  // ----------------------------------------------------
  const suppliersSheetData = suppliers.map((sup, index) => ({
    'ت': index + 1,
    'رمز المورد': sup.id,
    'اسم المورد / الشركة': sup.nameAr || sup.name,
    'المندوب / الشخص المسؤول': sup.contactPerson || '',
    'رقم الهاتف': sup.phone || '',
    'البريد الإلكتروني': sup.email || '',
    'العنوان': sup.address || '',
    'التصنيف المورد': sup.categorySupplied || 'عام',
    'إجمالي قيمة التوريدات ($)': sup.totalInvoiced || 0,
    'إجمالي المبلغ المدفوع ($)': sup.totalPaid || 0,
    'الرصيد المتبقي والديون ($)': sup.balanceDue || 0,
    'التقييم': sup.rating || 5
  }));
  const wsSuppliers = XLSX.utils.json_to_sheet(suppliersSheetData);
  XLSX.utils.book_append_sheet(wb, wsSuppliers, 'الموردين وحسابات الديون');

  // ----------------------------------------------------
  // 10. Sheet: Customers & Loyalty (العملاء ونقاط الولاء)
  // ----------------------------------------------------
  const customersSheetData = customers.map((c, index) => ({
    'ت': index + 1,
    'رمز العميل': c.id,
    'اسم العميل': c.name,
    'رقم الهاتف': c.phone || '',
    'البريد الإلكتروني': c.email || '',
    'فئة العضوية': c.tier || 'Bronze',
    'نقاط الولاء': c.loyaltyPoints || 0,
    'إجمالي المشتريات ($)': c.totalSpent || 0,
    'عدد الزيارات': c.visitsCount || 1,
    'تاريخ الانضمام': c.joinedDate || ''
  }));
  const wsCustomers = XLSX.utils.json_to_sheet(customersSheetData);
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'العملاء ونقاط الولاء');

  // ----------------------------------------------------
  // 11. Sheet: Operating Expenses (سجل المصاريف والنثريات)
  // ----------------------------------------------------
  const expensesSheetData = expenses.map((exp, index) => ({
    'ت': index + 1,
    'بند المصروف': exp.name || '',
    'نوع المصروف / التصنيف': exp.categoryName || exp.category || 'نثريات',
    'المبلغ ($)': exp.amount || 0,
    'التاريخ': exp.date || '',
    'اسم المسجل / الكاشير': exp.createdBy || 'الرئيسي',
    'ملاحظات': exp.note || ''
  }));
  const wsExpenses = XLSX.utils.json_to_sheet(expensesSheetData);
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'سجل المصاريف والنثريات');

  // ----------------------------------------------------
  // 12. Sheet: Damaged / Expired Items Logs (سجل التوالف والمنتهية الصلاحية)
  // ----------------------------------------------------
  const damagedSheetData = damaged.map((d, index) => ({
    'ت': index + 1,
    'اسم المادة': d.productName || '',
    'الباركود': d.barcode || '',
    'الكمية التالفة': d.quantity || 0,
    'نوع التلف': d.damageType === 'EXPIRED' ? 'منتهي الصلاحية' : d.damageType === 'BROKEN' ? 'مكسور' : d.damageType === 'DEFECTIVE' ? 'عيب مصنعي' : 'تالف',
    'سبب التلف': d.reason || '',
    'سعر التكلفة للقطعة ($)': d.costPerUnit || 0,
    'إجمالي الخسارة المالية ($)': d.totalLossAmount || 0,
    'تاريخ التسجيل': d.recordedAt ? new Date(d.recordedAt).toLocaleString('ar-IQ') : '',
    'الكاشير المسؤول': d.cashierName || 'الرئيسي'
  }));
  const wsDamaged = XLSX.utils.json_to_sheet(damagedSheetData);
  XLSX.utils.book_append_sheet(wb, wsDamaged, 'سجل التوالف والمنتهية');

  // ----------------------------------------------------
  // 13. Sheet: Delegate Returns (مرتجعات المندوبين والشركات)
  // ----------------------------------------------------
  const delegateReturnsSheetData = delegateReturns.map((r, index) => ({
    'ت': index + 1,
    'رقم السند': r.voucherNumber || r.id || '',
    'اسم المادة': r.productName || '',
    'الباركود': r.barcode || '',
    'اسم المندوب / الشركة': r.delegateName || r.supplierName || '',
    'نوع الوحدة': r.returnUnitType === 'carton' ? 'كرتون' : 'قطعة',
    'الكمية': r.quantity || 0,
    'إجمالي القطع المسترجعة': r.totalUnitsCalculated || r.quantity || 0,
    'سعر التكلفة ($)': r.unitCost || 0,
    'إجمالي المبلغ المسترد ($)': r.totalRefundAmount || 0,
    'سبب الإرجاع': r.reasonType === 'EXPIRED' ? 'منتهي الصلاحية' : r.reasonType === 'DEFECTIVE' ? 'عيب مصنعي' : r.reasonType === 'OVERSTOCK' ? 'فائض مخزون' : r.reasonType === 'EXCHANGE' ? 'استبدال بضاعة' : 'أخرى',
    'ملاحظة السبب': r.reasonNote || '',
    'طريقة التسوية': r.settlementMethod === 'cash_refund' ? 'استرداد نقدي فوري' : r.settlementMethod === 'deduct_supplier_balance' ? 'خصم من رصيد المورد' : 'استبدال ببضاعة أخرى',
    'تاريخ الإرجاع': r.recordedAt ? new Date(r.recordedAt).toLocaleString('ar-IQ') : '',
    'الكاشير': r.cashierName || 'الرئيسي'
  }));
  const wsDelegateReturns = XLSX.utils.json_to_sheet(delegateReturnsSheetData);
  XLSX.utils.book_append_sheet(wb, wsDelegateReturns, 'مرتجعات المندوبين والشركات');

  // ----------------------------------------------------
  // 14. Sheet: Cash Drawer Adjustments (حركات الصندوق والخزنة)
  // ----------------------------------------------------
  const cashAdjustmentsSheetData = cashAdjustments.map((adj, index) => ({
    'ت': index + 1,
    'نوع الحركة': adj.type === 'deposit' ? 'إيداع نقدي' : 'سحب نقدي',
    'المبلغ ($)': adj.amount || 0,
    'البيان / السبب': adj.reason || '',
    'التاريخ والوقت': adj.timestamp || '',
    'الكاشير': adj.cashier || 'الرئيسي'
  }));
  const wsCashAdjustments = XLSX.utils.json_to_sheet(cashAdjustmentsSheetData);
  XLSX.utils.book_append_sheet(wb, wsCashAdjustments, 'حركات الصندوق والخزنة');

  // ----------------------------------------------------
  // 15. Sheet: Market Orders (طلبيات التوريد والشحنات)
  // ----------------------------------------------------
  const ordersSheetData = orders.map((o, index) => ({
    'ت': index + 1,
    'رقم الطلبية': o.orderNumber || o.id,
    'نوع الطلب': o.type === 'supplier_restock' ? 'طلب توريد من مورد' : 'توصيل لعميل',
    'الجهة المعنية': o.partyName || '',
    'التاريخ': o.date || '',
    'الوقت': o.time || '',
    'عدد الأصناف': o.itemsCount || 0,
    'المبلغ الإجمالي ($)': o.totalAmount || 0,
    'حالة الطلب': o.status === 'delivered' ? 'تم التسليم' : o.status === 'in_transit' ? 'قيد التوصيل' : o.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار',
    'العنوان والوجهة': o.venueOrAddress || ''
  }));
  const wsOrders = XLSX.utils.json_to_sheet(ordersSheetData);
  XLSX.utils.book_append_sheet(wb, wsOrders, 'طلبيات التوريد والشحنات');

  // ----------------------------------------------------
  // 16. Sheet: User Accounts (حسابات المستخدمين والصلاحيات)
  // ----------------------------------------------------
  const usersSheetData = users.map((u, index) => ({
    'ت': index + 1,
    'اسم المستخدم': u.username,
    'الاسم الكامل': u.fullName,
    'الدور الوظيفي': u.role === 'Admin' ? 'مدير عام (Admin)' : u.role === 'Manager' ? 'مدير فرع (Manager)' : 'كاشير (Cashier)',
    'الحالة': u.active ? 'نشط ومفعل' : 'معطل',
    'رقم الهاتف': u.phone || '',
    'البريد الإلكتروني': u.email || '',
    'التخصص / المسمى الوظيفي': u.specialization || '',
    'تاريخ الإنشاء': u.createdAt || ''
  }));
  const wsUsers = XLSX.utils.json_to_sheet(usersSheetData);
  XLSX.utils.book_append_sheet(wb, wsUsers, 'حسابات المستخدمين والصلاحيات');

  // ----------------------------------------------------
  // 17. Sheet: System Notifications (سجل الإشعارات والتنبيهات)
  // ----------------------------------------------------
  const notifsSheetData = notifications.map((n, index) => ({
    'ت': index + 1,
    'عنوان الإشعار': n.titleAr || n.title,
    'نص الإشعار': n.messageAr || n.message,
    'القسم': n.category || 'عام',
    'مستوى الأهمية': n.priority === 'critical' ? 'حرج جداً' : n.priority === 'high' ? 'عالي' : 'عادي',
    'الوقت': n.time || '',
    'حالة القراءة': n.read ? 'تمت القراءة' : 'جديد وغير مقروء'
  }));
  const wsNotifs = XLSX.utils.json_to_sheet(notifsSheetData);
  XLSX.utils.book_append_sheet(wb, wsNotifs, 'سجل الإشعارات والتنبيهات');

  // ----------------------------------------------------
  // 18. Sheet: Store Settings (إعدادات النظام والمتجر)
  // ----------------------------------------------------
  if (settings) {
    const settingsRows = [
      { 'الخاصية / الإعداد': 'اسم المحل / السوبرماركت', 'القيمة': settings.storeName || '' },
      { 'الخاصية / الإعداد': 'الاسم بالعربية', 'القيمة': settings.storeNameAr || '' },
      { 'الخاصية / الإعداد': 'العنوان والفرع', 'القيمة': settings.address || '' },
      { 'الخاصية / الإعداد': 'رقم هاتف المتجر', 'القيمة': settings.phone || '' },
      { 'الخاصية / الإعداد': 'العملة الرئيسية', 'القيمة': settings.currency || 'USD' },
      { 'الخاصية / الإعداد': 'رمز العملة', 'القيمة': settings.currencySymbol || '$' },
      { 'الخاصية / الإعداد': 'نسبة الضريبة (%)', 'القيمة': settings.taxRate || 0 },
      { 'الخاصية / الإعداد': 'اللغة الافتراضية', 'القيمة': settings.language || 'ar' },
      { 'الخاصية / الإعداد': 'المظهر والسمة', 'القيمة': settings.themeMode || 'dark' },
      { 'الخاصية / الإعداد': 'نوع الطابعة الموصولة', 'القيمة': settings.printerType || 'thermal80mm' },
      { 'الخاصية / الإعداد': 'اسم الطابعة المحددة', 'القيمة': settings.connectedPrinterName || '' },
      { 'الخاصية / الإعداد': 'عنوان IP لطابعة الشبكة', 'القيمة': settings.printerIpAddress || '' },
      { 'الخاصية / الإعداد': 'حجم الورق', 'القيمة': settings.paperSize || '80mm' },
      { 'الخاصية / الإعداد': 'طباعة الإيصال تلقائياً', 'القيمة': settings.autoPrintReceipt ? 'نعم' : 'لا' },
      { 'الخاصية / الإعداد': 'الحد الأدنى الافتراضي للنواقص', 'القيمة': settings.lowStockThresholdDefault || 5 },
      { 'الخاصية / الإعداد': 'ترويسة الفاتورة (Header)', 'القيمة': settings.receiptHeaderMsg || '' },
      { 'الخاصية / الإعداد': 'تذييل الفاتورة (Footer)', 'القيمة': settings.receiptFooterMsg || '' },
      { 'الخاصية / الإعداد': 'تاريخ النسخ الاحتياطي الشامل', 'القيمة': new Date().toLocaleString('ar-IQ') }
    ];
    const wsSettings = XLSX.utils.json_to_sheet(settingsRows);
    XLSX.utils.book_append_sheet(wb, wsSettings, 'إعدادات النظام والمتجر');
  }

  // Generate filename with current date and time
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${fileNamePrefix}_${dateStr}.xlsx`;

  // Write Excel file
  XLSX.writeFile(wb, filename);
}

/**
 * Exports single Products array to Excel spreadsheet.
 */
export function exportProductsToExcel(products: Product[], filename = 'products_list.xlsx'): void {
  const wb = XLSX.utils.book_new();
  const productsSheetData = products.map((p, index) => ({
    'ت': index + 1,
    'الباركود': p.barcode || '',
    'اسم المادة': p.nameAr || p.name || '',
    'اسم المادة (إنجليزي)': p.name || '',
    'القسم / الصنف': p.categoryAr || p.category || '',
    'سعر الشراء للقطعة ($)': p.costPerUnit || p.cost || 0,
    'سعر بيع المفرد ($)': p.singleRetailPrice || p.price || 0,
    'سعر بيع الجملة ($)': p.wholesalePrice || p.price || 0,
    'سعر بيع الكرتون ($)': p.cartonSellingPrice || 0,
    'إجمالي الكمية بالمخزن': p.stock || p.totalUnits || 0,
    'الحد الأدنى': p.minStock || 5,
    'عدد الكراتين': p.cartonsCount || 0,
    'القطع بالكرتون': p.unitsPerCarton || 1,
    'تاريخ انتهاء الصلاحية': p.expiryDate || '',
    'اسم المندوب': p.supplierDelegate || p.supplierName || ''
  }));

  const ws = XLSX.utils.json_to_sheet(productsSheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'قائمة المواد والأسعار');
  XLSX.writeFile(wb, filename);
}

/**
 * Exports arbitrary array of JSON objects to an Excel spreadsheet file.
 */
export function exportDataToExcel(data: Record<string, any>[], filename = 'export.xlsx', sheetName = 'البيانات'): void {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

/**
 * Reads an Excel file (.xlsx, .xls) uploaded by user and parses all store sheets (Products, Sales, Suppliers, Customers, Purchases, Expenses, Damaged, Users, Settings).
 */
export async function parseExcelBackupFile(file: File): Promise<Partial<FullStoreBackup>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const wb = XLSX.read(buffer, { type: 'binary' });

        const result: Partial<FullStoreBackup> = {};

        // 1. Find Products sheet
        let productsSheetName = wb.SheetNames.find(s => 
          s.includes('المواد') || 
          s.includes('المنتجات') || 
          s.includes('البضائع') || 
          s.includes('المخزن') || 
          s.includes('Products') || 
          s.toLowerCase().includes('product')
        );

        if (!productsSheetName && wb.SheetNames.length > 0) {
          productsSheetName = wb.SheetNames[0];
        }

        if (productsSheetName) {
          const sheet = wb.Sheets[productsSheetName];
          const rawData = XLSX.utils.sheet_to_json<any>(sheet);
          
          if (Array.isArray(rawData) && rawData.length > 0) {
            const importedProducts: Product[] = rawData.map((row, idx) => {
              const barcode = String(
                row['الباركود'] || row['بار كود'] || row['الرمز'] || row['Barcode'] || row['barcode'] || row['Code'] || row['SKU'] || `BAR-${Date.now()}-${idx}`
              ).trim();

              const nameAr = String(
                row['اسم المادة (عربي)'] || row['اسم المادة'] || row['اسم المنتوج'] || row['اسم المنتج'] || row['الاسم بالعربي'] || row['الاسم'] || row['Name'] || row['name'] || `مادة ${idx + 1}`
              ).trim();

              const name = String(
                row['اسم المادة (إنجليزي)'] || row['اسم المادة'] || row['English Name'] || row['Title'] || nameAr
              ).trim();

              const price = Number(
                row['سعر بيع المفرد ($)'] || row['سعر المفرد'] || row['سعر البيع'] || row['السعر'] || row['Price'] || row['price'] || row['Retail'] || 0
              );

              const cost = Number(
                row['سعر شراء القطعة (التكلفة) ($)'] || row['سعر الشراء للقطعة ($)'] || row['سعر الشراء'] || row['التكلفة'] || row['سعر الكلفة'] || row['Cost'] || row['cost'] || 0
              );

              const wholesalePrice = Number(
                row['سعر بيع الجملة ($)'] || row['سعر الجملة'] || row['الجملة'] || row['Wholesale'] || price
              );

              const stock = Number(
                row['إجمالي الكمية بالمخزن (قطع)'] || row['إجمالي الكمية بالمخزن'] || row['الكمية بالمخزن'] || row['الكمية'] || row['العدد'] || row['Stock'] || row['stock'] || row['Qty'] || row['Quantity'] || 0
              );

              const categoryAr = String(
                row['القسم / الصنف'] || row['القسم'] || row['الصنف'] || row['التصنيف'] || row['Category'] || row['category'] || 'عام'
              ).trim();

              const unitsPerCarton = Number(
                row['القطع داخل الكرتونة'] || row['القطع بالكرتون'] || row['القطع في الكرتون'] || row['الشدة'] || row['UnitsPerCarton'] || 1
              ) || 1;

              const cartonsCount = Number(
                row['عدد الكراتين'] || (unitsPerCarton > 0 ? Math.floor(stock / unitsPerCarton) : stock)
              );

              const cartonSellingPrice = Number(
                row['سعر بيع الكرتون ($)'] || row['سعر الكرتون'] || price * unitsPerCarton
              );

              const cartonPurchasePrice = Number(
                row['سعر شراء الكرتون ($)'] || (cost * unitsPerCarton)
              );

              const supplierDelegate = String(
                row['اسم المندوب / الشركة'] || row['اسم المندوب'] || row['المندوب'] || row['المورد'] || row['اسم المورد'] || row['Supplier'] || row['Delegate'] || ''
              ).trim();

              const expiryDate = String(
                row['تاريخ انتهاء الصلاحية'] || row['تاريخ الانتهاء'] || row['المنتهي'] || row['Expiry'] || ''
              ).trim();

              const initialAddDate = String(
                row['تاريخ أول إضافة'] || new Date().toISOString().split('T')[0]
              );

              const lastEditDate = String(
                row['تاريخ آخر تعديل'] || new Date().toISOString().split('T')[0]
              );

              return {
                id: `prod-xl-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                barcode,
                name,
                nameAr,
                price,
                cost,
                costPerUnit: cost,
                cartonPurchasePrice,
                singleRetailPrice: price,
                wholesalePrice,
                cartonSellingPrice,
                singleProfit: price - cost,
                wholesaleProfit: wholesalePrice - cost,
                cartonProfit: cartonSellingPrice - cartonPurchasePrice,
                initialAddDate,
                lastEditDate,
                stock,
                totalUnits: stock,
                cartonsCount,
                unitsPerCarton,
                minStock: Number(row['الحد الأدنى للتنبيه'] || row['الحد الأدنى'] || row['MinStock'] || 5),
                unit: String(row['وحدة القياس'] || row['الوحدة'] || 'قطعة'),
                supplierId: '',
                supplierName: supplierDelegate || 'عام',
                imageIcon: 'Package',
                category: categoryAr,
                categoryAr: categoryAr,
                expiryDate,
                supplierDelegate,
                status: stock === 0 ? 'out_of_stock' : stock <= 5 ? 'low_stock' : 'in_stock'
              };
            });

            if (importedProducts.length > 0) {
              result.products = importedProducts;
            }
          }
        }

        // 2. Parse Suppliers sheet
        const suppliersSheetName = wb.SheetNames.find(s => s.includes('الموردين') || s.includes('Suppliers') || s.toLowerCase().includes('supplier'));
        if (suppliersSheetName) {
          const sheet = wb.Sheets[suppliersSheetName];
          const rawData = XLSX.utils.sheet_to_json<any>(sheet);
          if (Array.isArray(rawData) && rawData.length > 0) {
            result.suppliers = rawData.map((row, idx) => ({
              id: String(row['رمز المورد'] || `sup-${Date.now()}-${idx}`),
              name: String(row['اسم المورد / الشركة'] || row['اسم المورد'] || `مورد ${idx + 1}`),
              nameAr: String(row['اسم المورد / الشركة'] || row['اسم المورد'] || `مورد ${idx + 1}`),
              contactPerson: String(row['المندوب / الشخص المسؤول'] || row['الشخص المسؤول'] || row['المندوب'] || ''),
              phone: String(row['رقم الهاتف'] || ''),
              email: String(row['البريد الإلكتروني'] || ''),
              address: String(row['العنوان'] || ''),
              categorySupplied: String(row['التصنيف المورد'] || 'عام'),
              activeOrders: 0,
              totalInvoiced: Number(row['إجمالي قيمة التوريدات ($)'] || 0),
              totalPaid: Number(row['إجمالي المبلغ المدفوع ($)'] || 0),
              balanceDue: Number(row['الرصيد المتبقي والديون ($)'] || row['الرصيد المتبقي / الديون ($)'] || row['الديون'] || 0),
              rating: Number(row['التقييم'] || 5),
              avatar: ''
            }));
          }
        }

        // 3. Parse Customers sheet
        const customersSheetName = wb.SheetNames.find(s => s.includes('العملاء') || s.includes('Customers') || s.toLowerCase().includes('customer'));
        if (customersSheetName) {
          const sheet = wb.Sheets[customersSheetName];
          const rawData = XLSX.utils.sheet_to_json<any>(sheet);
          if (Array.isArray(rawData) && rawData.length > 0) {
            result.customers = rawData.map((row, idx) => ({
              id: String(row['رمز العميل'] || `cust-${Date.now()}-${idx}`),
              name: String(row['اسم العميل'] || `عميل ${idx + 1}`),
              phone: String(row['رقم الهاتف'] || ''),
              email: String(row['البريد الإلكتروني'] || ''),
              tier: (row['فئة العضوية'] || row['الفئة'] || 'Bronze') as any,
              loyaltyPoints: Number(row['نقاط الولاء'] || 0),
              totalSpent: Number(row['إجمالي المشتريات ($)'] || 0),
              visitsCount: Number(row['عدد الزيارات'] || 1),
              joinedDate: String(row['تاريخ الانضمام'] || new Date().toISOString().split('T')[0])
            }));
          }
        }

        // 4. Parse Purchase Invoices sheet
        const purchasesSheetName = wb.SheetNames.find(s => s.includes('فواتير المشتريات') || s.includes('Purchases'));
        if (purchasesSheetName) {
          const sheet = wb.Sheets[purchasesSheetName];
          const rawData = XLSX.utils.sheet_to_json<any>(sheet);
          if (Array.isArray(rawData) && rawData.length > 0) {
            result.purchaseInvoices = rawData.map((row, idx) => ({
              id: String(row['رقم الفاتورة'] || `pur-${Date.now()}-${idx}`),
              invoiceNumber: String(row['رقم الفاتورة'] || `PINV-${Date.now()}-${idx}`),
              supplierName: String(row['اسم المورد / الشركة'] || row['اسم المورد'] || ''),
              supplierPhone: String(row['رقم هاتف المورد'] || ''),
              date: String(row['التاريخ'] || new Date().toISOString().split('T')[0]),
              time: String(row['الوقت'] || '12:00 PM'),
              totalInvoiceAmount: Number(row['إجمالي الفاتورة ($)'] || 0),
              paidAmount: Number(row['المبلغ المدفوع ($)'] || 0),
              remainingAmount: Number(row['المبلغ المتبقي (آجل) ($)'] || row['المبلغ المتبقي ($)'] || 0),
              paymentType: (row['طريقة الدفع'] === 'آجل' ? 'credit' : row['طريقة الدفع'] === 'دفعة جزئية' ? 'part' : 'cash') as any,
              items: [],
              status: 'completed',
              notes: String(row['ملاحظات'] || '')
            }));
          }
        }

        // 5. Parse Operating Expenses sheet
        const expensesSheetName = wb.SheetNames.find(s => s.includes('المصاريف') || s.includes('Expenses'));
        if (expensesSheetName) {
          const sheet = wb.Sheets[expensesSheetName];
          const rawData = XLSX.utils.sheet_to_json<any>(sheet);
          if (Array.isArray(rawData) && rawData.length > 0) {
            result.operatingExpenses = rawData.map((row, idx) => ({
              id: `exp-${Date.now()}-${idx}`,
              name: String(row['بند المصروف'] || `مصروف ${idx + 1}`),
              category: 'custom',
              categoryName: String(row['نوع المصروف / التصنيف'] || 'نثريات'),
              amount: Number(row['المبلغ ($)'] || 0),
              date: String(row['التاريخ'] || new Date().toISOString().split('T')[0]),
              createdBy: String(row['اسم المسجل / الكاشير'] || 'الرئيسي'),
              note: String(row['ملاحظات'] || '')
            }));
          }
        }

        // 6. Parse Damaged Items sheet
        const damagedSheetName = wb.SheetNames.find(s => s.includes('التوالف') || s.includes('Damaged'));
        if (damagedSheetName) {
          const sheet = wb.Sheets[damagedSheetName];
          const rawData = XLSX.utils.sheet_to_json<any>(sheet);
          if (Array.isArray(rawData) && rawData.length > 0) {
            result.damagedLogs = rawData.map((row, idx) => ({
              id: `dmg-${Date.now()}-${idx}`,
              productId: '',
              productName: String(row['اسم المادة'] || ''),
              barcode: String(row['الباركود'] || ''),
              quantity: Number(row['الكمية التالفة'] || row['الكمية'] || 1),
              damageType: row['نوع التلف'] === 'منتهي الصلاحية' ? 'EXPIRED' : row['نوع التلف'] === 'مكسور' ? 'BROKEN' : row['نوع التلف'] === 'عيب مصنعي' ? 'DEFECTIVE' : 'DAMAGED',
              reason: String(row['سبب التلف'] || ''),
              costPerUnit: Number(row['سعر التكلفة للقطعة ($)'] || 0),
              totalLossAmount: Number(row['إجمالي الخسارة المالية ($)'] || 0),
              recordedAt: new Date().toISOString(),
              cashierName: String(row['الكاشير المسؤول'] || 'الرئيسي'),
              stockDeducted: true
            }));
          }
        }

        // 7. Parse Delegate Returns sheet
        const delegateSheetName = wb.SheetNames.find(s => s.includes('مرتجعات المندوبين') || s.includes('Delegate'));
        if (delegateSheetName) {
          const sheet = wb.Sheets[delegateSheetName];
          const rawData = XLSX.utils.sheet_to_json<any>(sheet);
          if (Array.isArray(rawData) && rawData.length > 0) {
            result.delegateReturns = rawData.map((row, idx) => ({
              id: `ret-${Date.now()}-${idx}`,
              voucherNumber: String(row['رقم السند'] || `RET-${Date.now()}-${idx}`),
              productId: '',
              productName: String(row['اسم المادة'] || ''),
              barcode: String(row['الباركود'] || ''),
              delegateName: String(row['اسم المندوب / الشركة'] || ''),
              returnUnitType: row['نوع الوحدة'] === 'كرتون' ? 'carton' : 'unit',
              quantity: Number(row['الكمية'] || 1),
              totalUnitsCalculated: Number(row['إجمالي القطع المسترجعة'] || 1),
              unitCost: Number(row['سعر التكلفة ($)'] || 0),
              totalRefundAmount: Number(row['إجمالي المبلغ المسترد ($)'] || 0),
              reasonType: 'EXPIRED',
              reasonNote: String(row['ملاحظة السبب'] || ''),
              settlementMethod: 'cash_refund',
              recordedAt: new Date().toISOString(),
              cashierName: String(row['الكاشير'] || 'الرئيسي'),
              stockDeducted: true
            }));
          }
        }

        // 8. Parse Users sheet
        const usersSheetName = wb.SheetNames.find(s => s.includes('المستخدمين') || s.includes('Users'));
        if (usersSheetName) {
          const sheet = wb.Sheets[usersSheetName];
          const rawData = XLSX.utils.sheet_to_json<any>(sheet);
          if (Array.isArray(rawData) && rawData.length > 0) {
            result.userAccounts = rawData.map((row, idx) => ({
              id: `user-${Date.now()}-${idx}`,
              username: String(row['اسم المستخدم'] || `user${idx + 1}`),
              fullName: String(row['الاسم الكامل'] || `مستخدم ${idx + 1}`),
              email: String(row['البريد الإلكتروني'] || 'user@market.com'),
              role: row['الدور الوظيفي']?.includes('مدير عام') ? 'Admin' : row['الدور الوظيفي']?.includes('مدير') ? 'Manager' : 'Cashier',
              active: String(row['الحالة']).includes('نشط'),
              phone: String(row['رقم الهاتف'] || ''),
              specialization: String(row['التخصص / المسمى الوظيفي'] || ''),
              createdAt: String(row['تاريخ الإنشاء'] || new Date().toISOString().split('T')[0]),
              permissions: {
                canAccessPOS: true,
                canManageProducts: true,
                canViewReports: true,
                canManageSuppliers: true,
                canManageCustomers: true,
                canManageOrders: true,
                canManageSettings: true
              }
            }));
          }
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}
