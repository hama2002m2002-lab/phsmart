import React, { useState } from 'react';
import { 
  Zap, 
  Database, 
  Package, 
  ShoppingCart, 
  Truck, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Play, 
  RotateCcw,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { Product, SaleTransaction, Supplier, PurchaseInvoice, StoreSettings } from '../types';
import { generateStressTestData } from '../lib/stressDataGenerator';
import { localDbSetKV } from '../lib/localDb';

interface StressTestDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onDataLoaded: (data: {
    products: Product[];
    salesHistory: SaleTransaction[];
    suppliers: Supplier[];
    purchaseInvoices: PurchaseInvoice[];
  }) => void;
}

export const StressTestDataModal: React.FC<StressTestDataModalProps> = ({
  isOpen,
  onClose,
  settings,
  onDataLoaded
}) => {
  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

  const [productCount, setProductCount] = useState<number>(100000);
  const [salesCount, setSalesCount] = useState<number>(50000);
  const [suppliersCount, setSuppliersCount] = useState<number>(1000);
  const [purchasesCount, setPurchasesCount] = useState<number>(2000);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [generationDone, setGenerationDone] = useState(false);

  if (!isOpen) return null;

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setProgressPercent(0);
    setProgressMessage(isKu ? 'دەستپێکردنی دروستکردنی داتاکان...' : isAr ? 'جاري بدء تهيئة البيانات الضخمة...' : 'Starting stress test generation...');
    setGenerationDone(false);

    try {
      const generated = await generateStressTestData({
        productCount,
        salesCount,
        suppliersCount,
        purchasesCount,
        includeReturns: true,
        onProgress: (percent, msg) => {
          setProgressPercent(percent);
          setProgressMessage(msg);
        }
      });

      // Save directly to high-capacity IndexedDB storage & update state
      await localDbSetKV('supermarket_products_v1', generated.products);
      await localDbSetKV('supermarket_sales_v1', generated.salesHistory);
      await localDbSetKV('supermarket_suppliers_v1', generated.suppliers);
      await localDbSetKV('supermarket_purchases_v1', generated.purchaseInvoices);

      onDataLoaded(generated);
      setGenerationDone(true);
    } catch (err) {
      console.error('Error generating stress test data:', err);
      alert(isKu ? 'هەڵە لە دروستکردنی داتا!' : isAr ? 'حدث خطأ أثناء توليد البيانات!' : 'Error during data generation!');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl bg-[#090F1E] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.3)] space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{isKu ? 'تۆمارکردن و تاقیکردنەوەی داتای گەورە (Stress Testing)' : isAr ? 'مولد البيانات الضخمة وفحص الأداء الفائق (Stress Test)' : 'Massive Stress-Test Data Generator'}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                  {isKu ? '100 هەزار+ مۆدێل' : isAr ? '100 ألف مادة+' : '100k+ Items'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isKu
                  ? 'دروستکردنی سەدان هەزار کاڵا، مێژووی فرۆشتن، پسوولەی گەڕاندنەوە، و دابینکەر بۆ تاقیکردنەوەی توانای بەرنامە'
                  : isAr
                  ? 'توليد 100,000 مادة، مبيعات، مرجوعات، موردين ووصلات شراء للتجربة واختبار كفاءة التقارير والتنقل بين الصفحات'
                  : 'Generate 100,000 products, sales, returns, suppliers, and purchase vouchers for benchmark testing'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          
          {/* Products Count */}
          <div className="p-3.5 rounded-2xl bg-[#0B1528] border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Package className="w-4 h-4 text-cyan-400" />
                <span>{isKu ? 'ژمارەی کاڵاکان لە کۆگا:' : isAr ? 'عدد المواد في المخزن:' : 'Products in Warehouse:'}</span>
              </span>
              <span className="font-mono text-cyan-300 font-black">{productCount.toLocaleString()}</span>
            </div>
            <select
              value={productCount}
              onChange={(e) => setProductCount(Number(e.target.value))}
              disabled={isGenerating}
              className="w-full bg-[#050B17] border border-blue-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value={10000}>10,000 مادة (خفيف وسريع)</option>
              <option value={50000}>50,000 مادة (متوسط)</option>
              <option value={100000}>100,000 مادة (100 ألف مادة كاملة - موصى به)</option>
              <option value={200000}>200,000 مادة (200 ألف مادة)</option>
            </select>
          </div>

          {/* Sales Transactions */}
          <div className="p-3.5 rounded-2xl bg-[#0B1528] border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <span>{isKu ? 'سەودای فرۆشتن و گەڕانەوە:' : isAr ? 'حركات البيع والمرجوعات:' : 'Sales & Returns Count:'}</span>
              </span>
              <span className="font-mono text-emerald-300 font-black">{salesCount.toLocaleString()}</span>
            </div>
            <select
              value={salesCount}
              onChange={(e) => setSalesCount(Number(e.target.value))}
              disabled={isGenerating}
              className="w-full bg-[#050B17] border border-blue-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value={5000}>5,000 حركة بيع ومرتجع</option>
              <option value={25000}>25,000 حركة بيع</option>
              <option value={50000}>50,000 حركة بيع (موصى به لتجربة التقارير)</option>
              <option value={100000}>100,000 حركة بيع</option>
            </select>
          </div>

          {/* Suppliers Count */}
          <div className="p-3.5 rounded-2xl bg-[#0B1528] border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-purple-300">
                <Truck className="w-4 h-4 text-purple-400" />
                <span>{isKu ? 'ژمارەی دابینکەر و کۆمپانیاکان:' : isAr ? 'حسابات الموردين والشركات:' : 'Suppliers Accounts:'}</span>
              </span>
              <span className="font-mono text-purple-300 font-black">{suppliersCount.toLocaleString()}</span>
            </div>
            <select
              value={suppliersCount}
              onChange={(e) => setSuppliersCount(Number(e.target.value))}
              disabled={isGenerating}
              className="w-full bg-[#050B17] border border-blue-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
            >
              <option value={100}>100 مورد وشركة</option>
              <option value={500}>500 مورد وشركة</option>
              <option value={1000}>1,000 مورد وشركة مندوب (موصى به)</option>
              <option value={5000}>5,000 مورد</option>
            </select>
          </div>

          {/* Purchase Invoices Count */}
          <div className="p-3.5 rounded-2xl bg-[#0B1528] border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-300">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>{isKu ? 'پسوولەکانی کڕین (نەقد و قەرز):' : isAr ? 'فواتير ووصلات الشراء:' : 'Purchase Invoices:'}</span>
              </span>
              <span className="font-mono text-amber-300 font-black">{purchasesCount.toLocaleString()}</span>
            </div>
            <select
              value={purchasesCount}
              onChange={(e) => setPurchasesCount(Number(e.target.value))}
              disabled={isGenerating}
              className="w-full bg-[#050B17] border border-blue-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value={500}>500 وصل شراء</option>
              <option value={2000}>2,000 وصل شراء نقد ودين</option>
              <option value={5000}>5,000 وصل شراء</option>
            </select>
          </div>

        </div>

        {/* Progress Display */}
        {isGenerating && (
          <div className="p-4 rounded-2xl bg-[#050B17] border border-cyan-500/40 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-2 text-cyan-300">
                <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                <span>{progressMessage}</span>
              </span>
              <span className="font-mono text-cyan-300 font-black text-sm">{progressPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Message */}
        {generationDone && !isGenerating && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-3 animate-fadeIn">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="font-black text-white text-sm">
                {isKu ? 'تەواو! داتاکان بە سەرکەوتوویی دروستکران و خرایە ناو سیستم' : isAr ? 'تم توليد كافة البيانات بنجاح وربطها بالتقارير والمخزن!' : 'All data successfully generated & linked!'}
              </p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                {isKu 
                  ? 'دەتوانی ئێستا بچیتە بەشی کۆگا (100 کاڵا بۆ هەر پەڕەیەک) و ڕاپۆرتەکان تاقی بکەیتەوە.' 
                  : isAr 
                  ? 'يمكنك الآن تصفح المخزن مع تقليب الصفحات (100 مادة لكل صفحة) ومراجعة كافة التقارير المالية والإحصائيات.' 
                  : 'You can now browse the warehouse (100 items per page) and review all reports and analytics.'}
              </p>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>{isKu ? 'پاشەکەوتکردن بە سیستەمی IndexedDB ی خێرا' : isAr ? 'تخزين فائق السرعة عبر تقنية IndexedDB المحلية' : 'Fast local high-capacity storage'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
            >
              {isKu ? 'داخستن' : isAr ? 'إلغاء' : 'Close'}
            </button>

            <button
              type="button"
              onClick={handleStartGeneration}
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isKu ? 'دەستپێکردنی دروستکردن' : isAr ? 'بدء التوليد الفوري للتجربة' : 'Generate Stress Data'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
