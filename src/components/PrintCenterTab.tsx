import React, { useState } from 'react';
import { 
  Printer, Tag, Barcode, Search, AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, RefreshCw, Layers
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { BarcodePrintModal } from './BarcodePrintModal';

interface PrintCenterTabProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
  onBackToDashboard?: () => void;
}

export const PrintCenterTab: React.FC<PrintCenterTabProps> = ({
  products,
  setProducts,
  settings,
  onBackToDashboard
}) => {
  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'price' | 'barcode' | 'no_barcode'>('barcode');
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);

  // Products without barcodes
  const productsWithoutBarcode = products.filter(p => !p.barcode || p.barcode.trim() === '');
  const productsWithBarcode = products.filter(p => p.barcode && p.barcode.trim() !== '');

  // Auto-generate barcodes for products without barcode
  const handleAutoGenerateBarcodes = () => {
    if (productsWithoutBarcode.length === 0) return;
    
    const confirmMsg = isKu
      ? `ئایا دڵنیایت لە دروستکردنی بارکۆدی نوێ بۆ (${productsWithoutBarcode.length}) کاڵا کە بارکۆدیان نییە؟`
      : isAr
      ? `هل أنت متأكد من توليد باركودات عشوائية مميزة لـ (${productsWithoutBarcode.length}) مادة لا تحتوي على باركود؟`
      : `Generate automatic unique barcodes for (${productsWithoutBarcode.length}) items without barcodes?`;

    if (!window.confirm(confirmMsg)) return;

    const updated = products.map(p => {
      if (!p.barcode || p.barcode.trim() === '') {
        const randomNum = Math.floor(100000000000 + Math.random() * 900000000000);
        return { ...p, barcode: randomNum.toString() };
      }
      return p;
    });

    setProducts(updated);
    localStorage.setItem('supermarket_products_v1', JSON.stringify(updated));
  };

  const handleOpenBarcodeOnly = (prod?: Product) => {
    setSelectedProductForModal(prod || (products.length > 0 ? products[0] : null));
    setModalMode('barcode');
    setIsModalOpen(true);
  };

  const handleOpenPriceTags = (prod?: Product) => {
    setSelectedProductForModal(prod || (products.length > 0 ? products[0] : null));
    setModalMode('price');
    setIsModalOpen(true);
  };

  const handleOpenNoBarcodeTags = (prod?: Product) => {
    // If there are products without barcode, select first or selected, or generate placeholder barcode
    const target = prod || (productsWithoutBarcode.length > 0 ? productsWithoutBarcode[0] : (products.length > 0 ? products[0] : null));
    setSelectedProductForModal(target);
    setModalMode('no_barcode');
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto h-full pb-24">
      
      {/* Header Bar */}
      <div className="cyber-card p-6 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#0F172A] via-[#0B1120] to-[#1E293B] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <Printer className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>{isKu ? 'ناوەندی چاپکردن' : isAr ? 'مركز الطباعة' : 'Printing Hub'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                {products.length} {isKu ? 'کاڵا' : isAr ? 'مادة' : 'Products'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {isKu 
                ? 'چاپکردنی نرخی کاڵاکان بۆ سەر ڕەفەکان، یان دروستکردن و چاپکردنی بارکۆد بۆ ئەو کاڵایانەی کە بێ بارکۆدن'
                : isAr 
                ? 'طباعة بطاقات الأسعار للرفوف، أو توليد وطباعة باركودات مخصصة للمواد التي لا تحتوي على باركود'
                : 'Print shelf price tags, or generate and print barcodes for products without existing barcodes'}
            </p>
          </div>
        </div>

        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            {isAr || isKu ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isKu ? 'گەڕانەوە' : isAr ? 'رجوع' : 'Back'}</span>
          </button>
        )}
      </div>

      {/* THREE PRIMARY ACTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* BUTTON 1: طباعة ملصق باركود فقط (بدون أسعار) */}
        <div className="cyber-card p-6 rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-br from-cyan-950/40 via-[#0B1120] to-[#0F172A] shadow-xl hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Barcode className="w-8 h-8 stroke-[2.5]" />
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 font-mono">
                {products.length} {isKu ? 'کاڵا' : isAr ? 'مادة' : 'Items'}
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-black text-white">
                {isKu ? '🏷️ چاپکردنی تەنها بارکۆد (بێ نرخ)' : isAr ? '🏷️ طباعة ملصق باركود فقط (بدون سعر)' : '🏷️ Print Barcode Only (No Price)'}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isKu 
                  ? 'چاپکردنی لەزگەی بارکۆدی پاک و پوخت بەبێ پیشاندانی نرخ، تایبەت بە لکاندن بەسەر کاڵاکان بۆ خوێندنەوە لە کاشێر.' 
                  : isAr 
                  ? 'طباعة ملصقات باركود قياسية بدون عرض الأسعار، مخصصة للصق على المنتجات لمسحها ضوئياً عند الكاشير.' 
                  : 'Print clean barcode label stickers without prices for product tagging and POS scanner lookup.'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#10192D] border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isKu ? 'تایبەتمەندییەکان:' : isAr ? 'الميزات المتاحة:' : 'Features:'}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {isKu
                  ? '• تەنها بارکۆد + ناوی کاڵا • قەبارەی گەورە بۆ سکانەری خێرا • گونجاو بۆ هەموو جۆرە چاپکەرێکی حەراری'
                  : isAr
                  ? '• باركود رقمي + اسم المادة فقط • خطوط واضحة للمسح السريع • مقاسات متعددة لطابعات الملصقات'
                  : '• Barcode & name only • High scan reliability • Multiple label sizes'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBarcodeOnly()}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Barcode className="w-4 h-4" />
            <span>{isKu ? 'دەستپێکردنی چاپی بارکۆد' : isAr ? 'بدء طباعة ملصق الباركود فقط' : 'Open Barcode Printer'}</span>
            {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* BUTTON 2: طباعة أسعار منتجات (مفرد، كرتون، جملة أو مدمجة) */}
        <div className="cyber-card p-6 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-[#0B1120] to-[#0F172A] shadow-xl hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Tag className="w-8 h-8 stroke-[2.5]" />
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 font-mono">
                {products.length} {isKu ? 'مادە' : isAr ? 'مادة متوفرة' : 'Items'}
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-black text-white">
                {isKu ? '💲 چاپکردنی نرخی کاڵاکان (تاک، کارتۆن، کۆ)' : isAr ? '💲 طباعة أسعار المنتجات (مفرد/كرتون/جملة)' : '💲 Print Product Price Tags'}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isKu 
                  ? 'چاپکردنی لەزگەی نرخی دیار بۆ سەر ڕەفەکان؛ هەڵبژاردنی نرخی تاک، کارتۆن، کۆ یان چاپکردنی دوو جۆر یان سێ جۆری نرخ پێکەوە.' 
                  : isAr 
                  ? 'طباعة بطاقات وعلامات الأسعار للرفوف مع إمكانية تحديد نوع السعر: مفرد، كرتون، جملة، أو طباعة نوعين معاً أو ثلاثتهم حسب رغبة المدير.' 
                  : 'Print shelf price tags with options for single, carton, wholesale, dual combinations or all three together.'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#10192D] border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isKu ? 'تایبەتمەندییەکان:' : isAr ? 'خيارات الأسعار المتاحة:' : 'Price Features:'}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {isKu
                  ? '• تاک، کارتۆن، کۆ یان پێکەوە • چاپکردنی دوو نرخ پێکەوە • دەستکاریکردنی فۆنت و ڕەنگ'
                  : isAr
                  ? '• مفرد أو كرتون أو جملة • دمج نوعين من الأسعار معاً • طباعة الأسعار الثلاثة معاً'
                  : '• Single, carton, wholesale • Multi-price combinations • Custom font and colors'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenPriceTags()}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Tag className="w-4 h-4 fill-slate-950" />
            <span>{isKu ? 'دەستپێکردنی چاپی نرخەکان' : isAr ? 'بدء طباعة أسعار المنتجات' : 'Open Price Tags Printer'}</span>
            {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* BUTTON 3: طباعة باركود للمواد التي لا يوجد لديها باركود */}
        <div className="cyber-card p-6 rounded-3xl border-2 border-purple-500/40 bg-gradient-to-br from-purple-950/40 via-[#0B1120] to-[#0F172A] shadow-xl hover:border-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] transition-all flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3.5 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <RefreshCw className="w-8 h-8 stroke-[2.5]" />
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border font-mono ${
                productsWithoutBarcode.length > 0 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {productsWithoutBarcode.length} {isKu ? 'بێ بارکۆد' : isAr ? 'بدون باركود' : 'No Barcode'}
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-black text-white">
                {isKu ? '⚡ بارکۆد بۆ کاڵا بێ بارکۆدەکان' : isAr ? '⚡ توليد باركود للمواد بدون باركود' : '⚡ Items Missing Barcode'}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isKu 
                  ? 'دۆزینەوەی ئەو کاڵایانەی کە لە کاتی تۆمارکردندا بێ بارکۆد بوون، بەخشینی بارکۆدی نوێ و چاپکردنی خێرا.' 
                  : isAr 
                  ? 'حصر المواد التي تم إدخالها بدون باركود تجاري، توليد أرقام فريدة لها وطباعة ملصقاتها بنقرة واحدة.' 
                  : 'Identify items registered without barcode, auto-generate unique barcodes, and print stickers.'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#10192D] border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between font-bold text-purple-300 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    {productsWithoutBarcode.length > 0 
                      ? (isKu ? `(${productsWithoutBarcode.length}) کاڵا` : isAr ? `(${productsWithoutBarcode.length}) مادة` : `${productsWithoutBarcode.length} items`)
                      : (isKu ? 'هەمووی هەیەتی ✓' : isAr ? 'الكل يحتوي باركود ✓' : 'All have barcodes ✓')
                    }
                  </span>
                </div>
                {productsWithoutBarcode.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateBarcodes}
                    className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold cursor-pointer"
                  >
                    {isKu ? 'تولید بۆ هەموو' : isAr ? 'توليد للكل' : 'Auto All'}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {isKu
                  ? '• دروستکردنی بارکۆدی 12 ڕەقەمی یەکتا • چاپکردنی ڕاستەوخۆ بە قەبارەی جۆراوجۆر'
                  : isAr
                  ? '• توليد أرقام باركود تجارية 12 خانة • طباعة مباشرة وفورية لكافة المواد'
                  : '• Unique 12-digit barcodes • Direct bulk & single printing'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenNoBarcodeTags()}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.35)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Barcode className="w-4 h-4" />
            <span>{isKu ? 'دەستپێکردنی چاپی کاڵا بێ بارکۆدەکان' : isAr ? 'طباعة باركود المواد بدون باركود' : 'Open No-Barcode Printer'}</span>
            {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* QUICK TABLE: LIST OF PRODUCTS WITHOUT BARCODE (IF ANY) */}
      {productsWithoutBarcode.length > 0 && (
        <div className="cyber-card p-6 rounded-3xl border border-rose-500/30 bg-[#0B1120] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">
                {isKu ? 'لیستی ئەو کاڵایانەی کە لە سیستەمدا بێ بارکۆدن:' : isAr ? 'قائمة المواد التي لا يوجد لديها باركود مسجل في المنظومة:' : 'Items currently missing a barcode:'}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAutoGenerateBarcodes}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isKu ? 'تولیدکردنی بارکۆد بۆ هەموویان' : isAr ? 'توليد باركود تلقائي لجميع هذه المواد' : 'Auto Generate Barcodes For All'}</span>
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-800 divide-y divide-slate-800/80">
            {productsWithoutBarcode.map((p) => (
              <div key={p.id} className="p-3 bg-[#10192D]/60 hover:bg-[#10192D] flex items-center justify-between gap-3 text-xs transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <div>
                    <span className="font-bold text-slate-100">{isKu ? (p.nameKu || p.nameAr || p.name) : (p.nameAr || p.name)}</span>
                    <span className="text-slate-500 text-[11px] block">{p.category || 'عام'} — {settings.currencySymbol}{p.singleRetailPrice || p.price}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // assign quick barcode
                      const randomNum = Math.floor(100000000000 + Math.random() * 900000000000).toString();
                      const updated = products.map(item => item.id === p.id ? { ...item, barcode: randomNum } : item);
                      setProducts(updated);
                      localStorage.setItem('supermarket_products_v1', JSON.stringify(updated));
                      handleOpenNoBarcodeTags({ ...p, barcode: randomNum });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Barcode className="w-3.5 h-3.5" />
                    <span>{isKu ? 'تولید و چاپکردن' : isAr ? 'توليد وطباعة' : 'Generate & Print'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Render the Barcode and Price Tags Modal */}
      <BarcodePrintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProductForModal}
        initialProduct={selectedProductForModal}
        products={modalMode === 'no_barcode' && productsWithoutBarcode.length > 0 ? productsWithoutBarcode : products}
        settings={settings}
        mode={modalMode === 'price' ? 'price' : 'barcode'}
      />

    </div>
  );
};
