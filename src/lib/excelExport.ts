import * as XLSX from 'xlsx';
import { Product, SaleTransaction, Supplier, Customer, PurchaseInvoice, UserAccount, StoreSettings } from '../types';

export interface FullStoreBackup {
  products: Product[];
  salesHistory: SaleTransaction[];
  suppliers: Supplier[];
  customers: Customer[];
  purchaseInvoices: PurchaseInvoice[];
  userAccounts: UserAccount[];
  settings: StoreSettings;
  exportedAt?: string;
}

/**
 * Exports the complete store database into an organized multi-sheet Excel (.xlsx) file.
 */
export function exportStoreToExcel(data: FullStoreBackup, fileNamePrefix = 'supermarket_backup'): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Products (المواد والمنتجات)
  const productsSheetData = (data.products || []).map((p, index) => ({
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
    'اسم المندوب': p.supplierDelegate || ''
  }));
  const wsProducts = XLSX.utils.json_to_sheet(productsSheetData);
  XLSX.utils.book_append_sheet(wb, wsProducts, 'المواد والمنتجات');

  // 2. Sheet: Sales History (سجل المبيعات)
  const salesSheetData = (data.salesHistory || []).map((s, index) => ({
    'ت': index + 1,
    'رقم الفاتورة': s.invoiceNumber || s.id || '',
    'التاريخ والوقت': s.timestamp ? new Date(s.timestamp).toLocaleString('ar-IQ') : '',
    'اسم العميل': s.customerName || 'عميل نقدي',
    'عدد المواد': (s.items || []).reduce((acc, item) => acc + item.quantity, 0),
    'الإجمالي الفرعي ($)': s.subtotal || s.total || 0,
    'الخصم ($)': s.discount || 0,
    'المبلغ الإجمالي ($)': s.total || 0,
    'المدفوع ($)': s.amountTendered || s.total || 0,
    'المتبقي ($)': s.changeDue || 0,
    'طريقة الدفع': s.paymentMethod === 'card' ? 'بطاقة إلكترونية' : s.paymentMethod === 'nfc' ? 'دفع إلكتروني NFC' : 'نقدي',
    'الكاشير': s.cashierName || 'الرئيسي'
  }));
  const wsSales = XLSX.utils.json_to_sheet(salesSheetData);
  XLSX.utils.book_append_sheet(wb, wsSales, 'سجل المبيعات');

  // 3. Sheet: Suppliers (الموردين)
  const suppliersSheetData = (data.suppliers || []).map((sup, index) => ({
    'ت': index + 1,
    'رمز المورد': sup.id,
    'اسم المورد': sup.nameAr || sup.name,
    'الشخص المسؤول': sup.contactPerson || '',
    'رقم الهاتف': sup.phone || '',
    'البريد الإلكتروني': sup.email || '',
    'العنوان': sup.address || '',
    'الرصيد المتبقي / الديون ($)': sup.balanceDue || 0
  }));
  const wsSuppliers = XLSX.utils.json_to_sheet(suppliersSheetData);
  XLSX.utils.book_append_sheet(wb, wsSuppliers, 'الموردين والمكاتب');

  // 4. Sheet: Customers (العملاء)
  const customersSheetData = (data.customers || []).map((c, index) => ({
    'ت': index + 1,
    'رمز العميل': c.id,
    'اسم العميل': c.name,
    'رقم الهاتف': c.phone || '',
    'البريد الإلكتروني': c.email || '',
    'الفئة': c.tier || 'Bronze',
    'نقاط الولاء': c.loyaltyPoints || 0,
    'إجمالي المشتريات ($)': c.totalSpent || 0
  }));
  const wsCustomers = XLSX.utils.json_to_sheet(customersSheetData);
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'سجل العملاء');

  // 5. Sheet: Purchase Invoices (فواتير المشتريات)
  const purchasesSheetData = (data.purchaseInvoices || []).map((p, index) => ({
    'ت': index + 1,
    'رقم الفاتورة': p.invoiceNumber || p.id,
    'المورد': p.supplierName || '',
    'التاريخ': p.date || '',
    'إجمالي الفاتورة ($)': p.totalInvoiceAmount || 0,
    'المبلغ المدفوع ($)': p.paidAmount || 0,
    'المبلغ المتبقي ($)': p.remainingAmount || 0,
    'طريقة الدفع': p.paymentType === 'credit' ? 'آجل' : p.paymentType === 'part' ? 'دفعة جزئية' : 'نقداً',
    'عدد الأصناف': (p.items || []).length
  }));
  const wsPurchases = XLSX.utils.json_to_sheet(purchasesSheetData);
  XLSX.utils.book_append_sheet(wb, wsPurchases, 'فواتير المشتريات');

  // 6. Sheet: User Accounts (المستخدمين)
  const usersSheetData = (data.userAccounts || []).map((u, index) => ({
    'ت': index + 1,
    'اسم المستخدم': u.username,
    'الاسم الكامل': u.fullName,
    'الدور الوظيفي': u.role === 'Admin' ? 'مدير عام' : u.role === 'Manager' ? 'مدير فرع' : 'كاشير',
    'الحالة': u.active ? 'نشط' : 'معطل',
    'رقم الهاتف': u.phone || '',
    'تاريخ الإنشاء': u.createdAt || ''
  }));
  const wsUsers = XLSX.utils.json_to_sheet(usersSheetData);
  XLSX.utils.book_append_sheet(wb, wsUsers, 'حسابات المستخدمين');

  // 7. Sheet: Store Settings (إعدادات المتجر)
  if (data.settings) {
    const settingsRows = [
      { 'الخاصية': 'اسم المحل / السوبرماركت', 'القيمة': data.settings.storeName || '' },
      { 'الخاصية': 'العنوان', 'القيمة': data.settings.address || '' },
      { 'الخاصية': 'رقم الهاتف', 'القيمة': data.settings.phone || '' },
      { 'الخاصية': 'العملة الرئيسية', 'القيمة': data.settings.currency || 'USD' },
      { 'الخاصية': 'نسبة الضريبة (%)', 'القيمة': data.settings.taxRate || 0 },
      { 'الخاصية': 'نوع الطابعة', 'القيمة': data.settings.printerType || 'thermal80mm' },
      { 'الخاصية': 'اسم الطابعة المربوطة', 'القيمة': data.settings.connectedPrinterName || '' },
      { 'الخاصية': 'تاريخ النسخ الاحتياطي', 'القيمة': new Date().toLocaleString('ar-IQ') }
    ];
    const wsSettings = XLSX.utils.json_to_sheet(settingsRows);
    XLSX.utils.book_append_sheet(wb, wsSettings, 'إعدادات النظام');
  }

  // Generate filename with current date
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${fileNamePrefix}_${dateStr}.xlsx`;

  // Save Excel file
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
    'القسم': p.categoryAr || p.category || '',
    'سعر الشراء للقطعة ($)': p.costPerUnit || p.cost || 0,
    'سعر البيع المفرد ($)': p.singleRetailPrice || p.price || 0,
    'سعر البيع الجملة ($)': p.wholesalePrice || p.price || 0,
    'سعر بيع الكرتون ($)': p.cartonSellingPrice || 0,
    'الكمية بالمخزن': p.stock || p.totalUnits || 0,
    'الحد الأدنى': p.minStock || 5,
    'عدد الكراتين': p.cartonsCount || 0,
    'القطع بالكرتون': p.unitsPerCarton || 1,
    'تاريخ انتهاء الصلاحية': p.expiryDate || '',
    'اسم المندوب': p.supplierDelegate || ''
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
 * Reads an Excel file (.xlsx, .xls) uploaded by user and attempts to parse Products or Store Backup.
 */
export async function parseExcelBackupFile(file: File): Promise<Partial<FullStoreBackup>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const wb = XLSX.read(buffer, { type: 'binary' });

        const result: Partial<FullStoreBackup> = {};

        // 1. Find Products sheet or fallback to first available sheet
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
                row['اسم المادة'] || row['اسم المنتوج'] || row['اسم المنتج'] || row['الاسم بالعربي'] || row['الاسم'] || row['Name'] || row['name'] || `مادة ${idx + 1}`
              ).trim();

              const name = String(
                row['اسم المادة (إنجليزي)'] || row['English Name'] || row['Title'] || nameAr
              ).trim();

              const price = Number(
                row['سعر البيع المفرد ($)'] || row['سعر المفرد'] || row['سعر البيع'] || row['السعر'] || row['Price'] || row['price'] || row['Retail'] || 0
              );

              const cost = Number(
                row['سعر الشراء للقطعة ($)'] || row['سعر الشراء'] || row['التكلفة'] || row['سعر الكلفة'] || row['Cost'] || row['cost'] || 0
              );

              const wholesalePrice = Number(
                row['سعر البيع الجملة ($)'] || row['سعر الجملة'] || row['الجملة'] || row['Wholesale'] || price
              );

              const stock = Number(
                row['إجمالي الكمية بالمخزن'] || row['الكمية بالمخزن'] || row['الكمية'] || row['العدد'] || row['Stock'] || row['stock'] || row['Qty'] || row['Quantity'] || 0
              );

              const categoryAr = String(
                row['القسم'] || row['القسم / الصنف'] || row['الصنف'] || row['التصنيف'] || row['Category'] || row['category'] || 'عام'
              ).trim();

              const unitsPerCarton = Number(
                row['القطع بالكرتون'] || row['القطع في الكرتون'] || row['الشدة'] || row['UnitsPerCarton'] || 1
              ) || 1;

              const cartonsCount = Number(
                row['عدد الكراتين'] || (unitsPerCarton > 0 ? Math.floor(stock / unitsPerCarton) : stock)
              );

              const cartonSellingPrice = Number(
                row['سعر بيع الكرتون ($)'] || row['سعر الكرتون'] || price * unitsPerCarton
              );

              const supplierDelegate = String(
                row['اسم المندوب'] || row['المندوب'] || row['المورد'] || row['اسم المورد'] || row['Supplier'] || row['Delegate'] || ''
              ).trim();

              const expiryDate = String(
                row['تاريخ انتهاء الصلاحية'] || row['تاريخ الانتهاء'] || row['المنتهي'] || row['Expiry'] || ''
              ).trim();

              return {
                id: `prod-xl-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                barcode,
                name,
                nameAr,
                price,
                cost,
                costPerUnit: cost,
                cartonPurchasePrice: cost * unitsPerCarton,
                singleRetailPrice: price,
                wholesalePrice,
                cartonSellingPrice,
                singleProfit: price - cost,
                wholesaleProfit: wholesalePrice - cost,
                cartonProfit: cartonSellingPrice - (cost * unitsPerCarton),
                initialAddDate: new Date().toISOString().split('T')[0],
                lastEditDate: new Date().toISOString().split('T')[0],
                stock,
                totalUnits: stock,
                cartonsCount,
                unitsPerCarton,
                minStock: Number(row['الحد الأدنى'] || row['MinStock'] || 5),
                unit: String(row['الوحدة'] || 'قطعة'),
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

        // 2. Parse Suppliers sheet if present
        const suppliersSheetName = wb.SheetNames.find(s => s.includes('الموردين') || s.includes('Suppliers') || s.toLowerCase().includes('supplier'));
        if (suppliersSheetName) {
          const sheet = wb.Sheets[suppliersSheetName];
          const rawData = XLSX.utils.sheet_to_json<any>(sheet);
          if (Array.isArray(rawData) && rawData.length > 0) {
            result.suppliers = rawData.map((row, idx) => ({
              id: String(row['رمز المورد'] || `sup-${Date.now()}-${idx}`),
              name: String(row['اسم المورد'] || `مورد ${idx + 1}`),
              nameAr: String(row['اسم المورد'] || `مورد ${idx + 1}`),
              contactPerson: String(row['الشخص المسؤول'] || row['المندوب'] || ''),
              phone: String(row['رقم الهاتف'] || ''),
              email: String(row['البريد الإلكتروني'] || ''),
              address: String(row['العنوان'] || ''),
              categorySupplied: 'عام',
              activeOrders: 0,
              totalInvoiced: 0,
              totalPaid: 0,
              balanceDue: Number(row['الرصيد المتبقي / الديون ($)'] || row['الديون'] || 0),
              rating: 5,
              avatar: ''
            }));
          }
        }

        // 3. Parse Customers sheet if present
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
              tier: (row['الفئة'] || 'Bronze') as any,
              loyaltyPoints: Number(row['نقاط الولاء'] || 0),
              totalSpent: Number(row['إجمالي المشتريات ($)'] || 0),
              debtBalance: Number(row['الديون'] || 0),
              maxDebtLimit: 1000,
              purchaseCount: 1,
              visitsCount: 1,
              joinedDate: new Date().toISOString().split('T')[0],
              lastVisit: new Date().toISOString().split('T')[0],
              avatar: ''
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
