import React from 'react';
import { BarChart3, TrendingUp, PieChart as PieIcon, DollarSign, Layers, Flame } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Product, SaleTransaction, StoreSettings } from '../types';
import { formatNumber } from '../lib/formatUtils';

interface AnalyticsTabProps {
  products: Product[];
  salesHistory: SaleTransaction[];
  settings: StoreSettings;
}

const categorySalesData = [
  { name: 'Dairy', value: 3800, color: '#06B6D4' },
  { name: 'Beverages', value: 2900, color: '#3B82F6' },
  { name: 'Canned Goods', value: 2400, color: '#10B981' },
  { name: 'Produce', value: 1800, color: '#F59E0B' },
  { name: 'Bakery', value: 1200, color: '#EC4899' },
  { name: 'Snacks', value: 1500, color: '#A855F7' },
];

const peakHoursData = [
  { hour: '08 AM', sales: 420 },
  { hour: '10 AM', sales: 890 },
  { hour: '12 PM', sales: 1650 },
  { hour: '02 PM', sales: 1200 },
  { hour: '04 PM', sales: 2100 },
  { hour: '06 PM', sales: 3200 }, // Peak
  { hour: '08 PM', sales: 2800 },
  { hour: '10 PM', sales: 1100 },
];

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  products,
  salesHistory,
  settings,
}) => {
  const isLight = settings.themeMode === 'light';
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const totalRevenue = salesHistory.reduce((acc, s) => acc + s.total, 0);
  const totalCostEstimate = totalRevenue * 0.65;
  const netProfitEstimate = totalRevenue - totalCostEstimate;

  return (
    <div className={`space-y-6 animate-fadeIn ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
      
      {/* Header */}
      <div className={`p-5 rounded-3xl border ${
        isLight ? 'bg-white border-slate-200 text-slate-900 shadow-md' : 'bg-[#10192D] border-blue-500/20 text-white'
      }`}>
        <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <BarChart3 className="w-5 h-5 text-cyan-500" />
          {isKu ? 'شیکاری دارایی و ڕێژەی ئاستی کارکردن' : isAr ? 'التحليلات المالية ومؤشرات الأداء' : 'Financial & Performance Analytics'}
        </h2>
        <p className={`text-xs mt-1 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
          {isKu ? 'شیکاری پەیکەری قازانج، پرفرۆشترین کاڵاکان و کاتەکانی قەرەباڵغی مارکێت' : isAr ? 'تحليل هيكل الأرباح، الأصناف الأعلى مبيعاً، وساعات الذروة المزدحمة' : 'Analyze revenue margins, top grossing departments, and rush hour peaks'}
        </p>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'cyber-card border-blue-500/20'
        }`}>
          <p className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{isKu ? 'کۆی فرۆشراوەکان' : isAr ? 'إجمالي المبيعات' : 'Gross Revenue'}</p>
          <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1 font-mono">
            {settings.currencySymbol}{formatNumber(totalRevenue)}
          </p>
          <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-500 font-medium' : 'text-slate-500'}`}>+14.2% {isKu ? 'بەراورد بە هەفتەی ڕابردوو' : isAr ? 'مقارنة بالأسبوع الماضي' : 'vs last week'}</p>
        </div>

        <div className={`p-5 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'cyber-card border-blue-500/20'
        }`}>
          <p className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{isKu ? 'تێچووی کڕینەکان' : isAr ? 'تكلفة المشتريات' : 'Estimated Cost'}</p>
          <p className={`text-2xl font-black mt-1 font-mono ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
            {settings.currencySymbol}{formatNumber(totalCostEstimate)}
          </p>
          <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-500 font-medium' : 'text-slate-500'}`}>65% {isKu ? 'لە کۆی فرۆشراوەکان' : isAr ? 'من إجمالي المبيعات' : 'of gross volume'}</p>
        </div>

        <div className={`p-5 rounded-2xl border ${
          isLight ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-sm' : 'cyber-card border-emerald-500/30 bg-emerald-500/5'
        }`}>
          <p className={`text-xs font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>{isKu ? 'قازانجی پاکی پێشبینیکراو' : isAr ? 'صافي الربح المتوقع' : 'Estimated Net Profit'}</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {settings.currencySymbol}{formatNumber(netProfitEstimate)}
          </p>
          <p className={`text-[10px] mt-1 ${isLight ? 'text-emerald-800 font-semibold' : 'text-emerald-300/80'}`}>35% {isKu ? 'ڕێژەی قازانجی پاک' : isAr ? 'هامش الربح الصافي' : 'net margin'}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Share Breakdown (Pie/Donut) */}
        <div className={`p-6 rounded-3xl border space-y-4 ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-md' : 'cyber-card border-blue-500/20'
        }`}>
          <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
            <PieIcon className="w-4 h-4 text-cyan-500" />
            {isKu ? 'دابەشبوونی فرۆشراوەکان بەپێی بەشی کاڵاکان' : isAr ? 'توزيع المبيعات حسب قسم المنتجات' : 'Revenue Share by Category'}
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorySalesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categorySalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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

          <div className={`grid grid-cols-3 gap-2 text-[11px] font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            {categorySalesData.map(c => (
              <div key={c.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rush Hour Traffic Heatmap Bar Chart */}
        <div className={`p-6 rounded-3xl border space-y-4 ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-md' : 'cyber-card border-blue-500/20'
        }`}>
          <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
            <Flame className="w-4 h-4 text-amber-500" />
            {isKu ? 'کاتەکانی قەرەباڵغی و گەرموگوڕیی مارکێت' : isAr ? 'ساعات الذروة وازدهار الحركة بالماركيت' : 'Peak Trading Hours Density'}
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#E2E8F0' : '#1E293B'} />
                <XAxis dataKey="hour" stroke={isLight ? '#64748B' : '#64748B'} fontSize={10} />
                <YAxis stroke={isLight ? '#64748B' : '#64748B'} fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isLight ? '#FFFFFF' : '#0B1120', 
                    borderColor: isLight ? '#CBD5E1' : '#3B82F6', 
                    color: isLight ? '#0F172A' : '#FFFFFF',
                    borderRadius: '12px' 
                  }}
                />
                <Bar dataKey="sales" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
