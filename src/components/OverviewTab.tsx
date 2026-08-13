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
  Activity
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

  // 1. Last 7 Days Sales Trend Chart Data
  const last7DaysData = React.useMemo(() => {
    const result: { dateLabel: string; sales: number; count: number }[] = [];
    const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateISO = d.toISOString().split('T')[0];
      const dayName = isAr ? daysAr[d.getDay()] : daysEn[d.getDay()];
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
  }, [activeSales, isAr]);

  // 2. Sales by Payment Method
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
        { name: isAr ? 'نقدي' : 'Cash', value: 650000, color: '#10B981' },
        { name: isAr ? 'بطاقة' : 'Card', value: 200000, color: '#3B82F6' },
        { name: isAr ? 'آجل' : 'Debt', value: 150000, color: '#F59E0B' }
      ];
    }

    const items = [];
    if (cashTotal > 0) items.push({ name: isAr ? 'نقدي' : 'Cash', value: cashTotal, color: '#10B981' });
    if (cardTotal > 0) items.push({ name: isAr ? 'بطاقة' : 'Card', value: cardTotal, color: '#3B82F6' });
    if (debtTotal > 0) items.push({ name: isAr ? 'آجل' : 'Debt', value: debtTotal, color: '#F59E0B' });
    if (nfcTotal > 0) items.push({ name: isAr ? 'دفع إلكتروني' : 'NFC', value: nfcTotal, color: '#A855F7' });

    return items;
  }, [activeSales, isAr]);

  // 3. Hourly Sales Distribution
  const hourlySalesData = React.useMemo(() => {
    const buckets = [
      { hour: '08 - 10', sales: 0, count: 0 },
      { hour: '10 - 12', sales: 0, count: 0 },
      { hour: '12 - 14', sales: 0, count: 0 },
      { hour: '14 - 16', sales: 0, count: 0 },
      { hour: '16 - 18', sales: 0, count: 0 },
      { hour: '18 - 20', sales: 0, count: 0 },
      { hour: '20 - 22', sales: 0, count: 0 },
      { hour: '22 - 24', sales: 0, count: 0 }
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
      const demoSales = [120000, 280000, 450000, 310000, 620000, 890000, 540000, 210000];
      return buckets.map((b, i) => ({
        ...b,
        sales: demoSales[i]
      }));
    }

    return buckets;
  }, [activeSales]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Banner Hero Section for Dashboard */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#13203C] to-[#0A101D] border border-blue-500/30 p-6 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4 max-w-xl">
            {/* CASHIER AVATAR CARD */}
            <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md p-2.5 px-3.5 rounded-2xl border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)] shrink-0">
              <div className="relative">
                <img
                  src={
                    currentUser?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
                  }
                  alt={currentUser?.fullName || 'Cashier Avatar'}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-cyan-400 object-cover p-0.5 bg-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0F172A] shadow-md animate-pulse" title={isAr ? 'كاشير متصل' : 'Active Cashier'} />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {currentUser?.role === 'Admin' ? (isAr ? 'مدير النظام' : 'Admin') : currentUser?.role === 'Manager' ? (isAr ? 'مدير' : 'Manager') : (isAr ? 'كاشير مبيعات' : 'Cashier')}
                  </span>
                </div>
                <div className="text-sm font-black text-white tracking-tight leading-tight">
                  {currentUser?.fullName || currentUser?.username || (isAr ? 'كاشير نوبة العمل' : 'Active Cashier')}
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{isAr ? 'متصل - جاهز للبيع' : 'Online & Active'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-2 rtl:space-x-reverse px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isKu ? 'داشبۆردی سەرەکی بەڕێوەبردن' : isAr ? 'لوحة التحكم والمراقبة المركزية' : 'Central Store Control Center'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isKu ? 'نظرة عامة ومخططات المبيعات' : isAr ? 'لوحة المبيعات والتحليلات العامة' : 'Sales Dashboard & Analytics'}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenPOS}
              className="flex items-center space-x-2 rtl:space-x-reverse px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{isKu ? 'کردنەوەی کاشێر (POS)' : isAr ? 'فتح الكاشير (POS)' : 'Launch POS'}</span>
            </button>

            <button
              onClick={onOpenProductModal}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isKu ? 'زیادکردنی کاڵا' : isAr ? 'إضافة منتج جديد' : 'Add Product'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (Updated: Replaced Total System Products & System Status with Sales Revenue & Invoices) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Sales Revenue Card */}
        <div className="p-5 rounded-3xl bg-[#0B132B] border border-emerald-500/30 relative overflow-hidden group hover:border-emerald-400 transition-all shadow-xl">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              {todayInvoicesCount} {isAr ? 'فاتورة اليوم' : 'invoices today'}
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-400 block">
              {isKu ? 'سەرجەمی فرۆشتنی ئەمڕۆ' : isAr ? 'إجمالي مبيعات اليوم' : "Today's Sales Revenue"}
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {formatNumber(todayTotalRevenue)} {settings.currencySymbol}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
            <span>{isAr ? 'إجمالي المبيعات الكلي:' : 'Overall Sales:'}</span>
            <span className="font-mono font-bold text-emerald-400">{formatNumber(overallTotalRevenue)} {settings.currencySymbol}</span>
          </div>
        </div>

        {/* Total Sales Invoices Card */}
        <div className="p-5 rounded-3xl bg-[#0B132B] border border-cyan-500/30 relative overflow-hidden group hover:border-cyan-400 transition-all shadow-xl">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Receipt className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {isAr ? 'نشط' : 'Active'}
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-400 block">
              {isKu ? 'ژمارەی پسوولەکانی فرۆشتن' : isAr ? 'إجمالي عدد الفواتير' : 'Total Sales Invoices'}
            </span>
            <div className="text-2xl font-black text-cyan-400 font-mono">
              {overallInvoicesCount.toLocaleString()}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
            <span>{isAr ? 'فواتير اليوم:' : "Today's Count:"}</span>
            <span className="font-mono font-bold text-cyan-400">{todayInvoicesCount}</span>
          </div>
        </div>

        {/* Low Stock Items Card */}
        <div className="p-5 rounded-3xl bg-[#0B132B] border border-amber-500/30 relative overflow-hidden group hover:border-amber-400 transition-all shadow-xl">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {lowStockItems.length} {isAr ? 'تنبيه' : 'Alerts'}
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-400 block">
              {isKu ? 'کاڵای نزیک لە تەواوبوون' : isAr ? 'مواد قريبة من النفاد' : 'Low Stock Items'}
            </span>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {lowStockItems.length}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
            <span>{isAr ? 'تتطلب إعادة طلب:' : 'Needs Reorder:'}</span>
            <span className="font-mono font-bold text-amber-400">{lowStockItems.length} {isAr ? 'أصناف' : 'items'}</span>
          </div>
        </div>

        {/* Out of Stock Card */}
        <div className="p-5 rounded-3xl bg-[#0B132B] border border-rose-500/30 relative overflow-hidden group hover:border-rose-400 transition-all shadow-xl">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
              {outOfStockItems.length} {isAr ? 'نفذت' : 'Depleted'}
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-xs font-bold text-slate-400 block">
              {isKu ? 'کاڵای تەواوبوو (صفر)' : isAr ? 'مواد نفذت بالكامل' : 'Out of Stock Items'}
            </span>
            <div className="text-2xl font-black text-rose-400 font-mono">
              {outOfStockItems.length}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
            <span>{isAr ? 'مستويات الرصيد:' : 'Stock Level:'}</span>
            <span className="font-mono font-bold text-rose-400">0</span>
          </div>
        </div>

      </div>

      {/* SALES ANALYTICS & CHARTS SECTION (قسم جارتات المبيعات) */}
      <div className="space-y-6">
        
        {/* 1. Main Sales Trend Chart (7-Day Area Chart) */}
        <div className="cyber-card p-6 rounded-3xl border border-blue-500/20 space-y-4 bg-[#0B132B]/90 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>{isKu ? 'ڕاپۆرتی ڕۆژانەی فرۆشتن' : isAr ? 'مخطط حركة المبيعات والإيرادات اليومية (آخر 7 أيام)' : '7-Day Revenue & Sales Trend'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'تتبع الإيرادات المالية وعدد الفواتير المنفذة خلال الأيام السبعة الأخيرة' : 'Track live sales revenue and daily invoice counts over time.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isAr ? 'محدث تلقائياً' : 'Live Data'}
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis 
                  dataKey="dateLabel" 
                  stroke="#64748B" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: '#1E293B' }} 
                />
                <YAxis 
                  stroke="#64748B" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: '#1E293B' }}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} 
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-emerald-500/40 p-3 rounded-2xl shadow-2xl space-y-1 text-right dir-rtl">
                          <div className="text-xs font-bold text-slate-300">{data.dateLabel}</div>
                          <div className="text-sm font-black text-emerald-400 font-mono">
                            {formatNumber(data.sales)} {settings.currencySymbol}
                          </div>
                          <div className="text-[11px] text-cyan-400 font-bold">
                            {data.count} {isAr ? 'فواتير بيع' : 'invoices'}
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

        {/* 2. Side-by-Side Sales Breakdown Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Sales by Payment Method Donut Chart */}
          <div className="cyber-card p-6 rounded-3xl border border-blue-500/20 space-y-4 bg-[#0B132B]/90 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-cyan-400" />
                <span>{isKu ? 'دابەشبوونی شێوازی پەردانت' : isAr ? 'توزيع المبيعات حسب طريقة الدفع' : 'Sales by Payment Method'}</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {isAr ? 'نقدي / بطاقة / آجل' : 'Payment Types'}
              </span>
            </div>

            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0F172A" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-right dir-rtl shadow-xl">
                            <div className="text-xs font-bold text-slate-200">{item.name}</div>
                            <div className="text-sm font-black text-cyan-400 font-mono">
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

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
              {paymentMethodData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-[#080D1A] border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 font-bold">{item.name}</span>
                  </div>
                  <span className="font-mono text-cyan-400 font-bold text-[11px]">
                    {formatNumber(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Hourly Sales Distribution Bar Chart */}
          <div className="cyber-card p-6 rounded-3xl border border-blue-500/20 space-y-4 bg-[#0B132B]/90 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>{isKu ? 'تەقینەوەی فرۆشتن لە کاتژمێرەکاندا' : isAr ? 'أوقات الذروة وحركة المبيعات خلال ساعات اليوم' : 'Peak Hourly Sales Distribution'}</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {isAr ? 'حسب ساعات العمل' : 'Hourly Buckets'}
              </span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#64748B" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={{ stroke: '#1E293B' }} 
                  />
                  <YAxis 
                    stroke="#64748B" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={{ stroke: '#1E293B' }}
                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} 
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-purple-500/40 p-2.5 rounded-xl shadow-xl text-right dir-rtl space-y-0.5">
                            <div className="text-xs font-bold text-slate-300">{isAr ? `الفترة: ${data.hour}` : `Time: ${data.hour}`}</div>
                            <div className="text-sm font-black text-purple-400 font-mono">
                              {formatNumber(data.sales)} {settings.currencySymbol}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="sales" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="p-2.5 rounded-xl bg-[#080D1A] border border-slate-800 text-slate-400 text-[11px] flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{isAr ? 'يساعد هذا المخطط على تحديد أوقات ذروة توافد الزبائن للتحضير وتنظيم نوبات العمل.' : 'Identifies peak traffic hours for staffing and inventory prep.'}</span>
            </div>
          </div>

        </div>

      </div>

      {/* Quick Action Shortcuts Panel */}
      <div className="cyber-card p-6 rounded-3xl border border-blue-500/20 space-y-4">
        <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <span>{isKu ? 'کردارە خێراکان' : isAr ? 'الوصول السريع والإجراءات' : 'Quick Operations & Shortcuts'}</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={onOpenPOS}
            className="p-4 rounded-2xl bg-[#080D1A] border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10 transition-all text-left rtl:text-right space-y-2 group cursor-pointer"
          >
            <ShoppingCart className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-bold text-white">{isAr ? 'نقطة البيع (POS)' : 'Launch POS'}</div>
              <div className="text-[10px] text-slate-400">{isAr ? 'واجهة الكاشير' : 'Cashier Interface'}</div>
            </div>
          </button>

          <button
            onClick={onOpenProductModal}
            className="p-4 rounded-2xl bg-[#080D1A] border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all text-left rtl:text-right space-y-2 group cursor-pointer"
          >
            <Plus className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-bold text-white">{isAr ? 'إضافة منتج' : 'Add Product'}</div>
              <div className="text-[10px] text-slate-400">{isAr ? 'تسجيل مادة جديدة' : 'New Item Entry'}</div>
            </div>
          </button>

          <button
            onClick={onOpenProducts}
            className="p-4 rounded-2xl bg-[#080D1A] border border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/10 transition-all text-left rtl:text-right space-y-2 group cursor-pointer"
          >
            <Package className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-bold text-white">{isAr ? 'إدارة المخزون' : 'Manage Inventory'}</div>
              <div className="text-[10px] text-slate-400">{isAr ? 'قائمة المنتجات' : 'Products List'}</div>
            </div>
          </button>

          <button
            onClick={onOpenSuppliers}
            className="p-4 rounded-2xl bg-[#080D1A] border border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/10 transition-all text-left rtl:text-right space-y-2 group cursor-pointer"
          >
            <Truck className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-bold text-white">{isAr ? 'الموردين والشركات' : 'Suppliers'}</div>
              <div className="text-[10px] text-slate-400">{isAr ? 'سجل الموردين' : 'Vendor Contacts'}</div>
            </div>
          </button>

          <button
            onClick={onOpenCustomers}
            className="p-4 rounded-2xl bg-[#080D1A] border border-pink-500/30 hover:border-pink-400 hover:bg-pink-500/10 transition-all text-left rtl:text-right space-y-2 group cursor-pointer"
          >
            <UserCheck className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-bold text-white">{isAr ? 'سجل العملاء' : 'Customers'}</div>
              <div className="text-[10px] text-slate-400">{isAr ? 'برنامج الولاء' : 'Loyalty Roster'}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Low Stock Alerts & Critical Items Section */}
      <div className="cyber-card p-6 rounded-3xl border border-blue-500/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
              <span>{isKu ? 'تنبيهات المخزون الحرجة' : isAr ? 'تنبيهات المخزون الحرج والمنخفض' : 'Critical Stock & Reorder Alerts'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                {lowStockItems.length + outOfStockItems.length} {isAr ? 'مواد' : 'items'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? 'الأصناف التي وصلت لحد الطلب الأدنى أو نفذت بالكامل وتتطلب تزويداً عاجلاً' : 'Products reaching minimum threshold or completely depleted.'}
            </p>
          </div>

          <button
            onClick={onOpenProducts}
            className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
          >
            <span>{isAr ? 'عرض جميع المنتجات' : 'View All Products'}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
          <div className="p-8 text-center bg-[#080D1A] rounded-2xl border border-slate-800 space-y-2">
            <Sparkles className="w-10 h-10 mx-auto text-emerald-400" />
            <div className="text-sm font-bold text-slate-200">
              {isAr ? 'المخزون ممتاز! لا توجد أي مواد منخفضة أو نفذت.' : 'Stock is healthy! No critical low stock items.'}
            </div>
            <p className="text-xs text-slate-400">
              {isAr ? 'جميع المنتجات المسجلة تقع ضمن الحدود الآمنة.' : 'All items are well above safety inventory limits.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead>
                <tr className="bg-[#080D1A] border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">{isAr ? 'اسم المنتج' : 'Product Name'}</th>
                  <th className="py-3 px-4">{isAr ? 'القسم' : 'Category'}</th>
                  <th className="py-3 px-4">{isAr ? 'الباركود' : 'Barcode'}</th>
                  <th className="py-3 px-4">{isAr ? 'الرصيد الحالي' : 'Stock'}</th>
                  <th className="py-3 px-4">{isAr ? 'الحد الأدنى' : 'Min Stock'}</th>
                  <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-[#0B132B]">
                {[...outOfStockItems, ...lowStockItems].slice(0, 8).map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-100">
                      {prod.productNameAr || prod.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {prod.category}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400 text-[11px]">
                      {prod.barcode}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                      {prod.stock}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {prod.minStock}
                    </td>
                    <td className="py-3 px-4">
                      {prod.stock === 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                          {isAr ? 'نفذت بالكامل' : 'Out of Stock'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          {isAr ? 'منخفض جداً' : 'Low Stock'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={onOpenProducts}
                        className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 text-[11px] font-bold cursor-pointer transition-all"
                      >
                        {isAr ? 'إعادة طلب' : 'Restock'}
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
