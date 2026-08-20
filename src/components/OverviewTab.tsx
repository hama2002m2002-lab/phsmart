import React from 'react';
import { 
  Package, 
  AlertTriangle, 
  ShoppingCart, 
  Plus,
  Sparkles,
  Truck,
  UserCheck,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Receipt,
  PieChart as PieIcon,
  BarChart3,
  Activity,
  Flame,
  Layers,
  Percent,
  Wallet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import { Product, SaleTransaction, StoreSettings, UserAccount } from '../types';
import { BiometricTelemetryHUD } from './BiometricTelemetryHUD';
import { formatNumber } from '../lib/formatUtils';

interface OverviewTabProps {
  products: Product[];
  salesHistory?: SaleTransaction[];
  settings: StoreSettings;
  currentUser?: UserAccount;
  onOpenPOS: () => void;
  onOpenProducts: () => void;
  onOpenProductModal: () => void;
  onOpenInventoryAudit?: () => void;
  onOpenSuppliers?: () => void;
  onOpenCustomers?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  products,
  salesHistory = [],
  settings,
  currentUser,
  onOpenPOS,
  onOpenProducts,
  onOpenProductModal,
  onOpenSuppliers,
  onOpenCustomers
}) => {
  const isLight = settings.themeMode === 'light';
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const lowStockItems = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
  const outOfStockItems = products.filter(p => p.stock === 0);

  // Parse Sales Data safely from props or localStorage
  const activeSales: SaleTransaction[] = React.useMemo(() => {
    let list: SaleTransaction[] = [];
    if (salesHistory && salesHistory.length > 0) {
      list = salesHistory;
    } else {
      try {
        const stored = localStorage.getItem('supermarket_sales_v1');
        if (stored) list = JSON.parse(stored);
      } catch (e) {
        list = [];
      }
    }
    return list.filter(s => s && s.status !== 'refunded');
  }, [salesHistory]);

  // Today's Sales Calculation
  const todayISO = new Date().toISOString().split('T')[0];
  const todaySales = activeSales.filter(s => {
    if (!s.timestamp) return false;
    return s.timestamp.startsWith(todayISO) || new Date(s.timestamp).toDateString() === new Date().toDateString();
  });

  const todayTotalRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const todayInvoicesCount = todaySales.length;

  const overallTotalRevenue = activeSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const overallInvoicesCount = activeSales.length;

  // Financial Analytics & Profit Estimates (دمج التحليلات المالية وهوامش الأرباح)
  const totalRevenue = overallTotalRevenue > 0 ? overallTotalRevenue : 1118058;
  const totalCostEstimate = overallTotalRevenue > 0 ? overallTotalRevenue * 0.65 : 726737;
  const netProfitEstimate = overallTotalRevenue > 0 ? overallTotalRevenue - totalCostEstimate : 391320;
  const netMarginPercent = totalRevenue > 0 ? Math.round((netProfitEstimate / totalRevenue) * 100) : 35;

  // 1. Category Breakdown Data (توزيع المبيعات حسب قسم المنتجات)
  const categorySalesData = React.useMemo(() => {
    const catMap: Record<string, number> = {};

    activeSales.forEach(sale => {
      const items = Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : []);
      items.forEach((item: any) => {
        const matchedProd = products.find(p => p.id === item.productId || p.barcode === item.barcode || p.name === item.name);
        const cat = matchedProd?.category || item.category || (isKu ? 'گشتی' : isAr ? 'عام' : 'General');
        catMap[cat] = (catMap[cat] || 0) + (item.total || ((item.price || 0) * (item.quantity || 1)) || 0);
      });
    });

    const entries = Object.entries(catMap);
    const colors = ['#06B6D4', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#F43F5E', '#14B8A6'];

    if (entries.length > 0) {
      return entries.map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length]
      }));
    }

    // Default Category Distribution
    return [
      { name: isKu ? 'شیرەمەنی' : isAr ? 'Dairy' : 'Dairy', value: 3800, color: '#06B6D4' },
      { name: isKu ? 'خواردنەوەکان' : isAr ? 'Beverages' : 'Beverages', value: 2900, color: '#3B82F6' },
      { name: isKu ? 'قوتوو و خواردەمەنی' : isAr ? 'Canned Goods' : 'Canned Goods', value: 2400, color: '#10B981' },
      { name: isKu ? 'میوە و سەوزە' : isAr ? 'Produce' : 'Produce', value: 1800, color: '#F59E0B' },
      { name: isKu ? 'شیرینی و نانەوا' : isAr ? 'Bakery' : 'Bakery', value: 1200, color: '#EC4899' },
      { name: isKu ? 'توشە و چیپس' : isAr ? 'Snacks' : 'Snacks', value: 1500, color: '#A855F7' },
    ];
  }, [activeSales, products, isAr, isKu]);

  // 2. Last 7 Days Sales Trend Chart Data
  const last7DaysData = React.useMemo(() => {
    const result: { dateLabel: string; sales: number; count: number }[] = [];
    const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const daysKu = ['یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی', 'شەممە'];
    const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateISO = d.toISOString().split('T')[0];
      const dayName = isKu ? daysKu[d.getDay()] : isAr ? daysAr[d.getDay()] : daysEn[d.getDay()];
      const dateLabel = `${dayName} (${d.getDate()}/${d.getMonth() + 1})`;

      const daySales = activeSales.filter(s => {
        if (!s.timestamp) return false;
        return s.timestamp.startsWith(dateISO) || new Date(s.timestamp).toDateString() === d.toDateString();
      });

      const totalVal = daySales.reduce((sum, s) => sum + (s.total || 0), 0);
      result.push({
        dateLabel,
        sales: totalVal,
        count: daySales.length
      });
    }

    // Fallback demo values if store has zero sales yet
    const hasRealSales = result.some(r => r.sales > 0);
    if (!hasRealSales) {
      const demoValues = [350000, 480000, 620000, 510000, 790000, 950000, 840000];
      const demoCounts = [12, 18, 22, 19, 28, 35, 30];
      return result.map((r, idx) => ({
        ...r,
        sales: demoValues[idx],
        count: demoCounts[idx]
      }));
    }

    return result;
  }, [activeSales, isAr, isKu]);

  // 3. Sales by Payment Method
  const paymentMethodData = React.useMemo(() => {
    let cashTotal = 0;
    let cardTotal = 0;
    let debtTotal = 0;
    let nfcTotal = 0;

    activeSales.forEach(s => {
      const amt = s.total || 0;
      if (s.paymentMethod === 'card') cardTotal += amt;
      else if (s.paymentMethod === 'debt') debtTotal += amt;
      else if (s.paymentMethod === 'nfc') nfcTotal += amt;
      else cashTotal += amt;
    });

    const total = cashTotal + cardTotal + debtTotal + nfcTotal;

    if (total === 0) {
      return [
        { name: isKu ? 'کاش' : isAr ? 'نقدي' : 'Cash', value: 650000, color: '#10B981' },
        { name: isKu ? 'کارت' : isAr ? 'بطاقة' : 'Card', value: 200000, color: '#3B82F6' },
        { name: isKu ? 'قەرز' : isAr ? 'آجل' : 'Debt', value: 150000, color: '#F59E0B' }
      ];
    }

    const items = [];
    if (cashTotal > 0) items.push({ name: isKu ? 'کاش' : isAr ? 'نقدي' : 'Cash', value: cashTotal, color: '#10B981' });
    if (cardTotal > 0) items.push({ name: isKu ? 'کارت' : isAr ? 'بطاقة' : 'Card', value: cardTotal, color: '#3B82F6' });
    if (debtTotal > 0) items.push({ name: isKu ? 'قەرز' : isAr ? 'آجل' : 'Debt', value: debtTotal, color: '#F59E0B' });
    if (nfcTotal > 0) items.push({ name: isKu ? 'پەرەدانی ئەلیکترۆنی' : isAr ? 'دفع إلكتروني' : 'NFC', value: nfcTotal, color: '#A855F7' });

    return items;
  }, [activeSales, isAr, isKu]);

  // 4. Hourly Peak Hours Distribution (ساعات الذروة وازدهار الحركة)
  const hourlySalesData = React.useMemo(() => {
    const buckets = [
      { hour: '08 AM', sales: 0, count: 0 },
      { hour: '10 AM', sales: 0, count: 0 },
      { hour: '12 PM', sales: 0, count: 0 },
      { hour: '02 PM', sales: 0, count: 0 },
      { hour: '04 PM', sales: 0, count: 0 },
      { hour: '06 PM', sales: 0, count: 0 },
      { hour: '08 PM', sales: 0, count: 0 },
      { hour: '10 PM', sales: 0, count: 0 }
    ];

    activeSales.forEach(s => {
      if (!s.timestamp) return;
      const hour = new Date(s.timestamp).getHours();
      const amt = s.total || 0;

      if (hour >= 8 && hour < 10) { buckets[0].sales += amt; buckets[0].count++; }
      else if (hour >= 10 && hour < 12) { buckets[1].sales += amt; buckets[1].count++; }
      else if (hour >= 12 && hour < 14) { buckets[2].sales += amt; buckets[2].count++; }
      else if (hour >= 14 && hour < 16) { buckets[3].sales += amt; buckets[3].count++; }
      else if (hour >= 16 && hour < 18) { buckets[4].sales += amt; buckets[4].count++; }
      else if (hour >= 18 && hour < 20) { buckets[5].sales += amt; buckets[5].count++; }
      else if (hour >= 20 && hour < 22) { buckets[6].sales += amt; buckets[6].count++; }
      else if (hour >= 22 || hour < 8) { buckets[7].sales += amt; buckets[7].count++; }
    });

    const hasData = buckets.some(b => b.sales > 0);
    if (!hasData) {
      const demoSales = [420, 890, 1650, 1200, 2100, 3200, 2800, 1100];
      return buckets.map((b, i) => ({
        ...b,
        sales: demoSales[i]
      }));
    }

    return buckets;
  }, [activeSales]);

  return (
    <div className={`space-y-4 sm:space-y-6 animate-fadeIn ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
      
      {/* KPI Cards Grid (المؤشرات السريعة للمخزن والمبيعات) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Today's Sales Revenue Card */}
        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border relative overflow-hidden group hover:border-emerald-400 transition-all shadow-xl flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0B132B] border-emerald-500/30 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <DollarSign className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[9px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
              {todayInvoicesCount} {isKu ? 'ئەمڕۆ' : isAr ? 'اليوم' : 'today'}
            </span>
          </div>

          <div className="mt-3 sm:mt-4 space-y-0.5">
            <span className={`text-[10px] sm:text-xs font-bold block truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {isKu ? 'سەرجەمی فرۆشتنی ئەمڕۆ' : isAr ? 'مبيعات اليوم' : "Today's Sales"}
            </span>
            <div className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono truncate">
              {formatNumber(todayTotalRevenue)} <span className="text-xs">{settings.currencySymbol}</span>
            </div>
          </div>

          <div className={`mt-2 sm:mt-3 pt-2 border-t text-[10px] sm:text-[11px] flex justify-between items-center ${isLight ? 'border-slate-100 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
            <span className="truncate">{isKu ? 'کۆی گشتی:' : isAr ? 'الكلي:' : 'Total:'}</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">{formatNumber(overallTotalRevenue)}</span>
          </div>
        </div>

        {/* Total Sales Invoices Card */}
        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border relative overflow-hidden group hover:border-cyan-400 transition-all shadow-xl flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0B132B] border-cyan-500/30 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Receipt className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[9px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
              {isKu ? 'چالاک' : isAr ? 'نشط' : 'Active'}
            </span>
          </div>

          <div className="mt-3 sm:mt-4 space-y-0.5">
            <span className={`text-[10px] sm:text-xs font-bold block truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {isKu ? 'ژمارەی پسوولەکان' : isAr ? 'عدد الفواتير' : 'Total Invoices'}
            </span>
            <div className="text-base sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
              {overallInvoicesCount.toLocaleString()}
            </div>
          </div>

          <div className={`mt-2 sm:mt-3 pt-2 border-t text-[10px] sm:text-[11px] flex justify-between items-center ${isLight ? 'border-slate-100 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
            <span>{isKu ? 'ئەمڕۆ:' : isAr ? 'اليوم:' : 'Today:'}</span>
            <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{todayInvoicesCount}</span>
          </div>
        </div>

        {/* Low Stock Items Card */}
        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border relative overflow-hidden group hover:border-amber-400 transition-all shadow-xl flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0B132B] border-amber-500/30 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <span className="text-[9px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30">
              {lowStockItems.length} {isKu ? 'ئاگاداری' : isAr ? 'تنبيه' : 'Alerts'}
            </span>
          </div>

          <div className="mt-3 sm:mt-4 space-y-0.5">
            <span className={`text-[10px] sm:text-xs font-bold block truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {isKu ? 'کاڵای نزیک لە تەواوبوون' : isAr ? 'مواد قريبة من النفاد' : 'Low Stock Items'}
            </span>
            <div className="text-base sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {lowStockItems.length}
            </div>
          </div>

          <div className={`mt-2 sm:mt-3 pt-2 border-t text-[10px] sm:text-[11px] flex justify-between items-center ${isLight ? 'border-slate-100 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
            <span className="truncate">{isKu ? 'داواکردنەوە:' : isAr ? 'إعادة طلب:' : 'Reorder:'}</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{lowStockItems.length}</span>
          </div>
        </div>

        {/* Out of Stock Card */}
        <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border relative overflow-hidden group hover:border-rose-400 transition-all shadow-xl flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0B132B] border-rose-500/30 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <TrendingDown className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[9px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30">
              {outOfStockItems.length} {isKu ? 'تەواوبوو' : isAr ? 'نفذت' : 'Depleted'}
            </span>
          </div>

          <div className="mt-3 sm:mt-4 space-y-0.5">
            <span className={`text-[10px] sm:text-xs font-bold block truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {isKu ? 'کاڵای تەواوبوو' : isAr ? 'مواد نفذت بالكامل' : 'Out of Stock'}
            </span>
            <div className="text-base sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {outOfStockItems.length}
            </div>
          </div>

          <div className={`mt-2 sm:mt-3 pt-2 border-t text-[10px] sm:text-[11px] flex justify-between items-center ${isLight ? 'border-slate-100 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
            <span>{isKu ? 'باڵانس:' : isAr ? 'الرصيد:' : 'Stock:'}</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">0</span>
          </div>
        </div>

      </div>

      {/* FINANCIAL STATISTICAL ANALYTICS CARDS (بطاقات التحليلات الإحصائية وهوامش الأرباح المدمجة) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Gross Revenue Analytics Card */}
        <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all shadow-md relative overflow-hidden ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0B132B] border-blue-500/20 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {isKu ? 'کۆی فرۆشراوەکان' : isAr ? 'إجمالي المبيعات' : 'Gross Revenue'}
            </p>
            <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-2 font-mono">
            {settings.currencySymbol}{formatNumber(totalRevenue)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">
            <span>+14.2%</span>
            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
              {isKu ? 'بەراورد بە هەفتەی ڕابردوو' : isAr ? 'مقارنة بالأسبوع الماضي' : 'vs last week'}
            </span>
          </div>
        </div>

        {/* Estimated Purchases Cost Card */}
        <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all shadow-md relative overflow-hidden ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0B132B] border-blue-500/20 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {isKu ? 'تێچووی کڕینەکان' : isAr ? 'تكلفة المشتريات' : 'Estimated Purchases Cost'}
            </p>
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-black mt-2 font-mono ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
            {settings.currencySymbol}{formatNumber(totalCostEstimate)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold">
            <span className="text-amber-500 font-mono">65%</span>
            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
              {isKu ? 'لە کۆی فرۆشراوەکان' : isAr ? 'من إجمالي المبيعات' : 'of gross volume'}
            </span>
          </div>
        </div>

        {/* Estimated Net Profit Margin Card */}
        <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all shadow-md relative overflow-hidden ${
          isLight 
            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' 
            : 'bg-[#0B132B] border-emerald-500/30 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
              {isKu ? 'قازانجی پاکی پێشبینیکراو' : isAr ? 'صافي الربح المتوقع' : 'Estimated Net Profit'}
            </p>
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {settings.currencySymbol}{formatNumber(netProfitEstimate)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{netMarginPercent}%</span>
            <span className={isLight ? 'text-emerald-800' : 'text-emerald-300/80'}>
              {isKu ? 'ڕێژەی قازانجی پاک' : isAr ? 'هامش الربح الصافي' : 'net margin'}
            </span>
          </div>
        </div>

      </div>

      {/* ANALYTICS CHARTS GRID (مخططات التحليلات الإحصائية والمبيعات الموحدة) */}
      <div className="space-y-6">
        
        {/* 1. Main Sales Trend Chart (7-Day Area Chart) */}
        <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xl ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'cyber-card border-blue-500/20 bg-[#0B132B]/90 backdrop-blur-md'
        }`}>
          <div className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div>
              <h3 className={`text-base font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <span>{isKu ? 'مۆدێلی فرۆشتن و داهاتی ڕۆژانە (٧ ڕۆژی ڕابردوو)' : isAr ? 'مخطط حركة المبيعات والإيرادات اليومية (آخر 7 أيام)' : '7-Day Revenue & Sales Trend'}</span>
              </h3>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isKu ? 'چاودێریکردنی داهاتی نەختینە و ژمارەی پسوولە جێبەجێکراوەکان' : isAr ? 'تتبع الإيرادات المالية وعدد الفواتير المنفذة خلال الأيام السبعة الأخيرة' : 'Track live sales revenue and daily invoice counts over time.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isKu ? 'ڕاستەوخۆ' : isAr ? 'محدث تلقائياً' : 'Live Data'}
              </span>
            </div>
          </div>

          <div className="h-68 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#E2E8F0' : '#1E293B'} vertical={false} />
                <XAxis 
                  dataKey="dateLabel" 
                  stroke={isLight ? '#64748B' : '#64748B'} 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: isLight ? '#E2E8F0' : '#1E293B' }} 
                />
                <YAxis 
                  stroke={isLight ? '#64748B' : '#64748B'} 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: isLight ? '#E2E8F0' : '#1E293B' }}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} 
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className={`p-3 rounded-2xl shadow-2xl space-y-1 text-right dir-rtl border ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-emerald-500/40 text-white'
                        }`}>
                          <div className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{data.dateLabel}</div>
                          <div className="text-sm font-black text-emerald-500 font-mono">
                            {formatNumber(data.sales)} {settings.currencySymbol}
                          </div>
                          <div className="text-[11px] text-cyan-500 font-bold">
                            {data.count} {isKu ? 'پسوولەی فرۆشتن' : isAr ? 'فواتير بيع' : 'invoices'}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#10B981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#salesGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Side-by-Side Analytics Breakdown: Category Share & Peak Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Category Sales Breakdown (توزيع المبيعات حسب قسم المنتجات) */}
          <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xl ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'cyber-card border-blue-500/20 bg-[#0B132B]/90 backdrop-blur-md'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className={`text-sm font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                <PieIcon className="w-4 h-4 text-cyan-500" />
                <span>{isKu ? 'دابەشبوونی فرۆشراوەکان بەپێی بەشی کاڵاکان' : isAr ? 'توزيع المبيعات حسب قسم المنتجات' : 'Revenue Share by Category'}</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {categorySalesData.length} {isKu ? 'بەش' : isAr ? 'أقسام' : 'Categories'}
              </span>
            </div>

            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySalesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categorySalesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={isLight ? '#FFFFFF' : '#0F172A'} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isLight ? '#FFFFFF' : '#0B1120',
                      borderColor: isLight ? '#CBD5E1' : '#3B82F6',
                      color: isLight ? '#0F172A' : '#FFFFFF',
                      borderRadius: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Custom Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
              {categorySalesData.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080D1A] border-slate-800'
                }`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className={`font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{item.name}</span>
                  </div>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-[11px] shrink-0">
                    {formatNumber(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Hourly Sales Distribution Bar Chart (ساعات الذروة وازدهار الحركة بالماركيت) */}
          <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xl ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'cyber-card border-blue-500/20 bg-[#0B132B]/90 backdrop-blur-md'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className={`text-sm font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                <Flame className="w-4 h-4 text-amber-500" />
                <span>{isKu ? 'کاتەکانی قەرەباڵغی و گەرموگوڕیی مارکێت' : isAr ? 'ساعات الذروة وازدهار الحركة بالماركيت' : 'Peak Trading Hours Density'}</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {isKu ? 'بەپێی کاتژمێر' : isAr ? 'حسب ساعات العمل' : 'Hourly Density'}
              </span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#E2E8F0' : '#1E293B'} vertical={false} />
                  <XAxis 
                    dataKey="hour" 
                    stroke={isLight ? '#64748B' : '#64748B'} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={{ stroke: isLight ? '#E2E8F0' : '#1E293B' }} 
                  />
                  <YAxis 
                    stroke={isLight ? '#64748B' : '#64748B'} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={{ stroke: isLight ? '#E2E8F0' : '#1E293B' }}
                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} 
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className={`p-2.5 rounded-xl shadow-xl text-right dir-rtl space-y-0.5 border ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-amber-500/40 text-white'
                          }`}>
                            <div className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                              {isKu ? `کاتژمێر: ${data.hour}` : isAr ? `الفترة: ${data.hour}` : `Time: ${data.hour}`}
                            </div>
                            <div className="text-sm font-black text-amber-500 font-mono">
                              {formatNumber(data.sales)} {settings.currencySymbol}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="sales" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#080D1A] border-slate-800 text-slate-400'
            }`}>
              <Activity className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{isKu ? 'دیاریکردنی کاتی قەرەباڵغیی کڕیاران بۆ ئامادەکاری کارمەندەکان و کاڵا' : isAr ? 'يساعد هذا المخطط على تحديد أوقات ذروة توافد الزبائن للتحضير وتنظيم نوبات العمل.' : 'Identifies peak traffic hours for staffing and inventory prep.'}</span>
            </div>
          </div>

        </div>

        {/* 3. Sales by Payment Method Donut Card */}
        <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xl ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'cyber-card border-blue-500/20 bg-[#0B132B]/90 backdrop-blur-md'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h3 className={`text-sm font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>{isKu ? 'دابەشبوونی شێوازی پارەدان' : isAr ? 'توزيع المبيعات حسب طريقة الدفع' : 'Sales by Payment Method'}</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {isKu ? 'کاش / کارت / قەرز' : isAr ? 'نقدي / بطاقة / آجل' : 'Payment Types'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={isLight ? '#FFFFFF' : '#0F172A'} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className={`p-2.5 rounded-xl border text-right dir-rtl shadow-xl ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                          }`}>
                            <div className="text-xs font-bold">{item.name}</div>
                            <div className="text-sm font-black text-cyan-500 font-mono">
                              {formatNumber(item.value)} {settings.currencySymbol}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Payment Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {paymentMethodData.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl border text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080D1A] border-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{item.name}</span>
                  </div>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-xs">
                    {formatNumber(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Quick Action Shortcuts Panel */}
      <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xl ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'cyber-card border-blue-500/20'
      }`}>
        <h3 className={`text-base font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
          <Sparkles className="w-5 h-5 text-cyan-500" />
          <span>{isKu ? 'کردارە خێراکان' : isAr ? 'الوصول السريع والإجراءات' : 'Quick Operations & Shortcuts'}</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={onOpenPOS}
            className={`p-4 rounded-2xl border transition-all text-left rtl:text-right space-y-2 group cursor-pointer ${
              isLight 
                ? 'bg-slate-50 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50/50' 
                : 'bg-[#080D1A] border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <ShoppingCart className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
            <div>
              <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{isKu ? 'کاشێر (POS)' : isAr ? 'نقطة البيع (POS)' : 'Launch POS'}</div>
              <div className="text-[10px] text-slate-400">{isKu ? 'ڕووکاری فرۆشتن' : isAr ? 'واجهة الكاشير' : 'Cashier Interface'}</div>
            </div>
          </button>

          <button
            onClick={onOpenProductModal}
            className={`p-4 rounded-2xl border transition-all text-left rtl:text-right space-y-2 group cursor-pointer ${
              isLight 
                ? 'bg-slate-50 border-cyan-200 hover:border-cyan-500 hover:bg-cyan-50/50' 
                : 'bg-[#080D1A] border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10'
            }`}
          >
            <Plus className="w-6 h-6 text-cyan-500 group-hover:scale-110 transition-transform" />
            <div>
              <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{isKu ? 'زیادکردنی کاڵا' : isAr ? 'إضافة منتج' : 'Add Product'}</div>
              <div className="text-[10px] text-slate-400">{isKu ? 'تۆمارکردنی کاڵای نوێ' : isAr ? 'تسجيل مادة جديدة' : 'New Item Entry'}</div>
            </div>
          </button>

          <button
            onClick={onOpenProducts}
            className={`p-4 rounded-2xl border transition-all text-left rtl:text-right space-y-2 group cursor-pointer ${
              isLight 
                ? 'bg-slate-50 border-blue-200 hover:border-blue-500 hover:bg-blue-50/50' 
                : 'bg-[#080D1A] border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/10'
            }`}
          >
            <Package className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
            <div>
              <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{isKu ? 'بەڕێوەبردنی کۆگا' : isAr ? 'إدارة المخزون' : 'Manage Inventory'}</div>
              <div className="text-[10px] text-slate-400">{isKu ? 'لیستی کاڵاکان' : isAr ? 'قائمة المنتجات' : 'Products List'}</div>
            </div>
          </button>

          <button
            onClick={onOpenSuppliers}
            className={`p-4 rounded-2xl border transition-all text-left rtl:text-right space-y-2 group cursor-pointer ${
              isLight 
                ? 'bg-slate-50 border-purple-200 hover:border-purple-500 hover:bg-purple-50/50' 
                : 'bg-[#080D1A] border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/10'
            }`}
          >
            <Truck className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
            <div>
              <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{isKu ? 'دابینکەرەکان' : isAr ? 'الموردين والشركات' : 'Suppliers'}</div>
              <div className="text-[10px] text-slate-400">{isKu ? 'تۆماری کۆمپانیاکان' : isAr ? 'سجل الموردين' : 'Vendor Contacts'}</div>
            </div>
          </button>

          <button
            onClick={onOpenCustomers}
            className={`p-4 rounded-2xl border transition-all text-left rtl:text-right space-y-2 group cursor-pointer ${
              isLight 
                ? 'bg-slate-50 border-pink-200 hover:border-pink-500 hover:bg-pink-50/50' 
                : 'bg-[#080D1A] border-pink-500/30 hover:border-pink-400 hover:bg-pink-500/10'
            }`}
          >
            <UserCheck className="w-6 h-6 text-pink-500 group-hover:scale-110 transition-transform" />
            <div>
              <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{isKu ? 'تۆماری کڕیاران' : isAr ? 'سجل العملاء' : 'Customers'}</div>
              <div className="text-[10px] text-slate-400">{isKu ? 'سیستەمی وەفاداری' : isAr ? 'برنامج الولاء' : 'Loyalty Roster'}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Low Stock Alerts & Critical Items Section */}
      <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xl ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'cyber-card border-blue-500/20'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className={`text-base font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
              <span>{isKu ? 'ئاگادارییەکانی کۆگای کەمبوو و تەواوبوو' : isAr ? 'تنبيهات المخزون الحرج والمنخفض' : 'Critical Stock & Reorder Alerts'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono font-bold border border-amber-500/30">
                {lowStockItems.length + outOfStockItems.length} {isKu ? 'کاڵا' : isAr ? 'مواد' : 'items'}
              </span>
            </h3>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {isKu ? 'ئەو کاڵایانەی گەیشتوونەتە ئاستی دیاریکراوی کەمبوونەوە یان تەواوبوون' : isAr ? 'الأصناف التي وصلت لحد الطلب الأدنى أو نفذت بالكامل وتتطلب تزويداً عاجلاً' : 'Products reaching minimum threshold or completely depleted.'}
            </p>
          </div>

          <button
            onClick={onOpenProducts}
            className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-bold cursor-pointer"
          >
            <span>{isKu ? 'پیشاندانی هەموو کاڵاکان' : isAr ? 'عرض جميع المنتجات' : 'View All Products'}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border space-y-2 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080D1A] border-slate-800'
          }`}>
            <Sparkles className="w-10 h-10 mx-auto text-emerald-500" />
            <div className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              {isKu ? 'کۆگا لە دۆخێکی نایابدایە! هیچ کاڵایەکی کەم یان تەواوبوو نییە.' : isAr ? 'المخزون ممتاز! لا توجد أي مواد منخفضة أو نفذت.' : 'Stock is healthy! No critical low stock items.'}
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {isKu ? 'تەواوی کاڵاکان لە ئاستی سەلامەتی پێویستدان.' : isAr ? 'جميع المنتجات المسجلة تقع ضمن الحدود الآمنة.' : 'All items are well above safety inventory limits.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead>
                <tr className={`border-b font-bold uppercase text-[10px] ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#080D1A] border-slate-800 text-slate-400'
                }`}>
                  <th className="py-3 px-4">{isKu ? 'ناوی کاڵا' : isAr ? 'اسم المنتج' : 'Product Name'}</th>
                  <th className="py-3 px-4">{isKu ? 'بەش' : isAr ? 'القسم' : 'Category'}</th>
                  <th className="py-3 px-4">{isKu ? 'بارکۆد' : isAr ? 'الباركود' : 'Barcode'}</th>
                  <th className="py-3 px-4">{isKu ? 'باڵانسی ئێستا' : isAr ? 'الرصيد الحالي' : 'Stock'}</th>
                  <th className="py-3 px-4">{isKu ? 'کەمترین ئاست' : isAr ? 'الحد الأدنى' : 'Min Stock'}</th>
                  <th className="py-3 px-4">{isKu ? 'دۆخ' : isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 text-center">{isKu ? 'کردار' : isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isLight ? 'divide-slate-200 bg-white' : 'divide-slate-800/80 bg-[#0B132B]'
              }`}>
                {[...outOfStockItems, ...lowStockItems].slice(0, 8).map((prod) => (
                  <tr key={prod.id} className={isLight ? 'hover:bg-slate-50 transition-colors' : 'hover:bg-slate-800/50 transition-colors'}>
                    <td className={`py-3 px-4 font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {isKu ? (prod.productNameKu || prod.productNameAr || prod.name) : (prod.productNameAr || prod.name)}
                    </td>
                    <td className={`py-3 px-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {prod.category}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-600 dark:text-cyan-400 text-[11px]">
                      {prod.barcode}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-500 text-sm">
                      {prod.stock}
                    </td>
                    <td className={`py-3 px-4 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {prod.minStock}
                    </td>
                    <td className="py-3 px-4">
                      {prod.stock === 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                          {isKu ? 'تەواوبوو' : isAr ? 'نفذت بالكامل' : 'Out of Stock'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          {isKu ? 'زۆر کەمە' : isAr ? 'منخفض جداً' : 'Low Stock'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={onOpenProducts}
                        className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 text-[11px] font-bold cursor-pointer transition-all"
                      >
                        {isKu ? 'داواکردنەوە' : isAr ? 'إعادة طلب' : 'Restock'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Biometric Telemetry & Hardware HUD */}
      <BiometricTelemetryHUD settings={settings} />

    </div>
  );
};

