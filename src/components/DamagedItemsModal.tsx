import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  X, 
  Search, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Calendar, 
  Package, 
  FileText, 
  DollarSign, 
  Clock, 
  Layers,
  Printer,
  History,
  ShieldAlert
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { getTranslation, getProductName } from '../lib/translations';

export interface DamagedItemRecord {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  damageType: 'DAMAGED' | 'BROKEN' | 'EXPIRED' | 'DEFECTIVE';
  reason: string;
  costPerUnit: number;
  totalLossAmount: number;
  recordedAt: string;
  cashierName?: string;
  stockDeducted: boolean;
}

interface DamagedItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
  cashierName?: string;
}

export const DamagedItemsModal: React.FC<DamagedItemsModalProps> = ({
  isOpen,
  onClose,
  products,
  setProducts,
  settings,
  cashierName
}) => {
  if (!isOpen) return null;

  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const t = (ar: string, ku: string, en: string) => isKu ? ku : isAr ? ar : en;

  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [damageType, setDamageType] = useState<'DAMAGED' | 'BROKEN' | 'EXPIRED' | 'DEFECTIVE'>('DAMAGED');
  const [reason, setReason] = useState('');
  const [autoDeductStock, setAutoDeductStock] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // Persistent Damaged Items Logs
  const [damagedLogs, setDamagedLogs] = useState<DamagedItemRecord[]>(() => {
    try {
      const saved = localStorage.getItem('pos_damaged_items_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pos_damaged_items_logs', JSON.stringify(damagedLogs));
    } catch (err) {
      console.warn('Failed to save damaged items logs:', err);
    }
  }, [damagedLogs]);

  // Filter products for dropdown/search
  const filteredProducts = search.trim()
    ? products.filter(
        p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.nameAr && p.nameAr.toLowerCase().includes(search.toLowerCase())) ||
          (p.barcode && p.barcode.includes(search))
      )
    : products.slice(0, 10);

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    setSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert(t('يرجى اختيار المادة أولاً', 'تکایە سەرەتا کاڵایەک هەڵبژێرە', 'Please select a product first'));
      return;
    }
    if (quantity <= 0) {
      alert(t('يرجى تحديد كمية متلفة أكبر من الصفر', 'تکایە بڕێکی گەورەتر لە سفر دیاری بکە', 'Quantity must be greater than 0'));
      return;
    }

    const unitCost = selectedProduct.costPerUnit || selectedProduct.cost || (selectedProduct.cartonPurchasePrice / (selectedProduct.unitsPerCarton || 1)) || 0;
    const totalLoss = unitCost * quantity;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newRecord: DamagedItemRecord = {
      id: `dmg-${Date.now()}`,
      productId: selectedProduct.id,
      productName: getProductName(selectedProduct, lang),
      barcode: selectedProduct.barcode,
      quantity,
      damageType,
      reason: reason.trim() || t('إتلاف اعتيادي', 'زەرەری ئاسایی', 'Standard Damage'),
      costPerUnit: unitCost,
      totalLossAmount: totalLoss,
      recordedAt: nowStr,
      cashierName: cashierName || t('الكاشير الحالي', 'کاشێری ئێستا', 'Active Cashier'),
      stockDeducted: autoDeductStock
    };

    // Update Product Stock if autoDeductStock is true
    if (autoDeductStock) {
      setProducts(prevProducts =>
        prevProducts.map(p => {
          if (p.id === selectedProduct.id) {
            const currentTotal = p.totalUnits || p.stock || 0;
            const updatedTotal = Math.max(0, currentTotal - quantity);
            const unitsPerCarton = p.unitsPerCarton || 1;
            const updatedCartons = Math.floor(updatedTotal / unitsPerCarton);

            return {
              ...p,
              stock: updatedTotal,
              totalUnits: updatedTotal,
              cartonsCount: updatedCartons,
              status: updatedTotal === 0 ? 'out_of_stock' : updatedTotal <= p.minStock ? 'low_stock' : 'in_stock'
            };
          }
          return p;
        })
      );
    }

    // Save Record
    setDamagedLogs(prev => [newRecord, ...prev]);

    // Reset Form
    setSelectedProduct(null);
    setQuantity(1);
    setReason('');
    setSuccessMsg(t('تم تسجيل وتوثيق إتلاف المادة بنجاح !', 'کاڵای تێکچوو بە سەرکەوتوویی تۆمارکرا!', 'Damaged item recorded successfully!'));

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteLog = (id: string) => {
    if (confirm(t('هل أنت متأكد من حذف هذا السجل؟', 'ئایا دڵنیایت لە سڕینەوەی ئەم تۆمارە؟', 'Are you sure you want to delete this log?'))) {
      setDamagedLogs(prev => prev.filter(item => item.id !== id));
    }
  };

  const totalLossAllTime = damagedLogs.reduce((sum, item) => sum + item.totalLossAmount, 0);

  const getDamageTypeLabel = (type: DamagedItemRecord['damageType']) => {
    switch (type) {
      case 'DAMAGED':
        return { label: t('🥀 مادة متلفة / تالفة', '🥀 کاڵای تێکچوو / زەرەر', 'Damaged Item'), color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case 'BROKEN':
        return { label: t('💔 مادة مكسورة', '💔 کاڵای شکاو', 'Broken Item'), color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'EXPIRED':
        return { label: t('⏰ منتهية الصلاحية', '⏰ ماوە بەسەرچوو', 'Expired Date'), color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'DEFECTIVE':
        return { label: t('📦 عيب تصنيعي / شحن', '📦 عەیبی دروستکردن / بارکۆد', 'Defective Item'), color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0B132B] text-slate-100 rounded-3xl border border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.3)] w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950 border-b border-rose-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 shadow-inner">
              <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{t('تسجيل وإضافة المواد المتلفة والمكسورة ومنتهية الصلاحية', 'تۆمارکردن و زیادکردنی کاڵای تێکچوو، شکاو یان بەسەرچوو', 'Log Damaged, Broken & Expired Items')}</span>
              </h2>
              <p className="text-xs text-rose-300/80 font-medium">
                {t('نظام إتلاف المواد وتوثيق الخسائر وخصم الكميات من المخزن', 'سیستەمی لەناوبردنی کاڵا، بەڵگەنامەکردنی زیانەکان و داشکاندنی بڕ لە کۆگا', 'Record inventory waste, damaged items, and auto-deduct stock')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white transition-all border border-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#070D1C] border-b border-slate-800 text-xs font-bold">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('NEW')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'NEW'
                  ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border border-rose-400'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{t('تسجيل مادة متلفة جديدة', 'تۆمارکردنی کاڵای تێکچووی نوێ', 'Record New Item')}</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border border-rose-400'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{t('سجل الإتلافات والأرشيف', 'تۆماری زیانەکان و ئەرشیف', 'Damaged Logs History')} ({damagedLogs.length})</span>
            </button>
          </div>

          {damagedLogs.length > 0 && (
            <div className="text-[11px] font-mono font-bold text-rose-300 bg-rose-950/60 px-3 py-1 rounded-xl border border-rose-500/30">
              {t('مجموع الخسائر:', 'کۆی گشتی زیانەکان:', 'Total Loss:')} {totalLossAllTime.toLocaleString()} {settings.currencySymbol}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
          
          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'NEW' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Product Search / Picker */}
              <div className="space-y-2">
                <label className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  <span>{t('1. اختر المادة أو امسح الباركود:', '١. کاڵا هەڵبژێرە یان بارکۆد سکان بکە:', '1. Select Product or Scan Barcode:')}</span>
                </label>

                {selectedProduct ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border-2 border-cyan-500/60 flex items-center justify-between gap-3 shadow-md">
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-2">
                        <span>{getProductName(selectedProduct, lang)}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                          {selectedProduct.barcode}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>{t('المتوفر بالمخزن:', 'بەردەست لە کۆگا:', 'Stock:')} <strong className="text-emerald-400 font-mono">{selectedProduct.stock}</strong></span>
                        <span>|</span>
                        <span>{t('سعر التكلفة:', 'نرخی تێچوون:', 'Cost:')} <strong className="text-amber-300 font-mono">{(selectedProduct.costPerUnit || selectedProduct.cost || 0).toLocaleString()} {settings.currencySymbol}</strong></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="px-3 py-1.5 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold border border-rose-500/40 cursor-pointer"
                    >
                      {t('تغيير المادة', 'گۆڕینی کاڵا', 'Change Product')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('ابحث عن المادة بالاسم أو اكتب/امسح الباركود...', 'گەڕان بەپێی ناوی کاڵا یان نووسین/سکانکردنی بارکۆد...', 'Search product by name or barcode...')}
                        className="w-full bg-[#070D1C] text-xs text-white placeholder-slate-500 pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-3 rounded-2xl border border-cyan-500/30 focus:border-cyan-400 focus:outline-none font-bold"
                        autoFocus
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 bg-[#070D1C] p-2 rounded-2xl border border-slate-800 custom-scrollbar">
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-500">
                          {t('لم يتم العثور على أية مادة', 'هیچ کاڵایەک نەدۆزرایەوە', 'No products found')}
                        </div>
                      ) : (
                        filteredProducts.map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProduct(p)}
                            className="p-2.5 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-all flex items-center justify-between border border-transparent hover:border-cyan-500/30"
                          >
                            <div>
                              <div className="text-xs font-bold text-white">{getProductName(p, lang)}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{p.barcode}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-mono font-bold text-emerald-400">{p.stock} {p.unit || (isKu ? 'دانە' : isAr ? 'قطعة' : 'pc')}</div>
                              <div className="text-[10px] text-slate-400">{t('تكلفة:', 'تێچوو:', 'Cost:')} {(p.costPerUnit || p.cost || 0).toLocaleString()}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Damage Type Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{t('2. حدد نوع الضرر أو التلف:', '٢. جۆری زیان یان تێکچوون دیاری بکە:', '2. Select Type of Damage:')}</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setDamageType('DAMAGED')}
                    className={`p-2.5 rounded-2xl text-xs font-black border transition-all text-center cursor-pointer ${
                      damageType === 'DAMAGED'
                        ? 'bg-rose-950/90 border-2 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🥀 {t('مادة متلفة / تالفة', 'کاڵای تێکچوو / زەرەر', 'Damaged')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDamageType('BROKEN')}
                    className={`p-2.5 rounded-2xl text-xs font-black border transition-all text-center cursor-pointer ${
                      damageType === 'BROKEN'
                        ? 'bg-amber-950/90 border-2 border-amber-500 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    💔 {t('مادة مكسورة', 'کاڵای شکاو', 'Broken')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDamageType('EXPIRED')}
                    className={`p-2.5 rounded-2xl text-xs font-black border transition-all text-center cursor-pointer ${
                      damageType === 'EXPIRED'
                        ? 'bg-purple-950/90 border-2 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⏰ {t('منتهية الصلاحية', 'ماوە بەسەرچوو', 'Expired')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDamageType('DEFECTIVE')}
                    className={`p-2.5 rounded-2xl text-xs font-black border transition-all text-center cursor-pointer ${
                      damageType === 'DEFECTIVE'
                        ? 'bg-blue-950/90 border-2 border-blue-500 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📦 {t('عيب تصنيعي / شحن', 'عەیبی دروستکردن / بارکۆد', 'Defect')}
                  </button>
                </div>
              </div>

              {/* Quantity & Loss Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-cyan-300 block">
                    {t('3. الكمية المتلفة (قطع/وحدات):', '٣. بڕی تێکچوو (دانە/یەکە):', '3. Damaged Quantity:')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct ? selectedProduct.stock || 99999 : 99999}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#070D1C] text-amber-300 font-mono text-base p-3 rounded-2xl border-2 border-amber-500/50 focus:border-amber-400 focus:outline-none font-bold text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-cyan-300 block">
                    {t('مبلغ الخسارة التقديري:', 'بڕی زیانی خەمڵێنراو:', 'Estimated Financial Loss:')}
                  </label>
                  <div className="w-full bg-[#070D1C] text-rose-400 font-mono text-base p-3 rounded-2xl border border-rose-500/30 text-center font-black">
                    {selectedProduct
                      ? (((selectedProduct.costPerUnit || selectedProduct.cost || 0) * quantity)).toLocaleString()
                      : '0'}{' '}
                    {settings.currencySymbol}
                  </div>
                </div>
              </div>

              {/* Reason / Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-cyan-300 block">
                  {t('4. سبب الإتلاف / ملاحظات إضافية:', '٤. هۆکاری زیان / تێبینی زیاتر:', '4. Reason / Additional Notes:')}
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={t('اكتب ملاحظات أو سبب التلف هنا...', 'تێبینی یان هۆکاری تێکچوون بنووسە...', 'Write notes or damage cause here...')}
                  className="w-full bg-[#070D1C] text-xs text-white p-3 rounded-2xl border border-slate-700 focus:border-cyan-400 focus:outline-none font-bold"
                />
              </div>

              {/* Auto Deduct Checkbox */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deductStock"
                    checked={autoDeductStock}
                    onChange={e => setAutoDeductStock(e.target.checked)}
                    className="w-4 h-4 text-rose-500 rounded focus:ring-rose-400 cursor-pointer"
                  />
                  <label htmlFor="deductStock" className="text-xs font-bold text-slate-200 cursor-pointer">
                    {t('خصم الكمية المتلفة تلقائياً من مخزون المادة', 'داشکاندنی بڕی تێکچوو بە شێوەی ئۆتۆماتیکی لە کۆگای کاڵا', 'Auto-deduct damaged quantity from store inventory')}
                  </label>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  {autoDeductStock ? t('مفعل ✓', 'چالاکە ✓', 'Active ✓') : t('غير مفعل', 'ناچالاک', 'Disabled')}
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!selectedProduct}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:brightness-110 text-white font-black text-sm shadow-[0_0_20px_rgba(244,63,94,0.4)] border border-rose-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                <span>{t('تأكيد وتسجيل إتلاف المادة', 'پشتڕاستکردنەوە و تۆمارکردنی کاڵای تێکچوو', 'Confirm & Log Damaged Item')}</span>
              </button>
            </form>
          ) : (
            /* HISTORY LOGS TAB */
            <div className="space-y-3">
              {damagedLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <AlertTriangle className="w-10 h-10 mx-auto opacity-40 text-rose-400" />
                  <p className="text-xs font-bold">{t('لا يوجد أية سجلات للمواد المتلفة والمكسورة حتى الآن', 'هیچ تۆمارێکی کاڵای تێکچوو یان شکاو تا ئێستا نییە', 'No damaged item records found yet')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-400">
                      {t(`إجمالي السجلات المدونة: (${damagedLogs.length}) سجل`, `کۆی گشتی تۆمارەکان: (${damagedLogs.length}) تۆمار`, `Total Logs: ${damagedLogs.length}`)}
                    </span>
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t('طباعة التقرير', 'چاپکردنی ڕاپۆرت', 'Print Report')}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {damagedLogs.map(log => {
                      const typeInfo = getDamageTypeLabel(log.damageType);
                      return (
                        <div
                          key={log.id}
                          className="p-3 rounded-2xl bg-[#070D1C] border border-slate-800 hover:border-rose-500/30 transition-all flex flex-wrap items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white">{log.productName}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-3">
                              <span>{t('الباركود:', 'بارکۆد:', 'Barcode:')} <strong className="font-mono text-cyan-300">{log.barcode}</strong></span>
                              <span>|</span>
                              <span>{t('التاريخ:', 'بەروار:', 'Date:')} <strong className="font-mono text-slate-300">{log.recordedAt}</strong></span>
                              {log.cashierName && (
                                <>
                                  <span>|</span>
                                  <span>{t('الكاشير:', 'کاشێر:', 'Cashier:')} <strong className="text-slate-300">{log.cashierName}</strong></span>
                                </>
                              )}
                            </div>
                            {log.reason && (
                              <div className="text-[11px] text-amber-300/90 italic">
                                {t('السبب:', 'هۆکار:', 'Reason:')} {log.reason}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs font-black text-rose-400 font-mono">
                                {t('الكمية:', 'بڕ:', 'Qty:')} {log.quantity}
                              </div>
                              <div className="text-[11px] font-bold text-amber-300 font-mono">
                                {t('خسارة:', 'زیان:', 'Loss:')} {log.totalLossAmount.toLocaleString()} {settings.currencySymbol}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 cursor-pointer"
                              title={t('حذف السجل', 'سڕینەوەی تۆمار', 'Delete Log')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#070D1C] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>💡 {t('المواد المتلفة والمكسورة يتم الاحتفاظ بسجلها تلقائياً بالمتصفح', 'تۆماری کاڵا زیانلێکەوتووەکان بە شێوەی ئۆتۆماتیکی پاشەکەوت دەکرێت', 'Damaged item logs are automatically stored in memory')}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 cursor-pointer"
          >
            {t('إغلاق النافذة', 'داخستنی پەنجەرە', 'Close')}
          </button>
        </div>

      </div>
    </div>
  );
};
