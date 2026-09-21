import React, { useState, useEffect } from 'react';
import { X, Printer, ShoppingBag, FileText, Layout, Copy, Check, Eye, Layers, Zap, Cpu, AlertCircle } from 'lucide-react';
import { SaleTransaction, StoreSettings } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { formatDisplayDateTime, formatDisplayTime, formatDisplayDate, formatReceiptDateTime } from '../lib/dateUtils';
import { BarcodeGraphic } from './BarcodeGraphic';
import {
  isWebSerialSupported,
  connectWebSerialPrinter,
  sendRawToWebSerialPrinter,
  buildEscPosBuffer,
  printThermalSilentIframe,
  print80mmCashierReceipt
} from '../lib/thermalPrinter';

export type PaperFormatType = 'thermal80mm' | 'thermal58mm' | 'a4' | 'a5';

interface ReceiptModalProps {
  sale: SaleTransaction | null;
  onClose: () => void;
  settings: StoreSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose, settings }) => {
  const [viewMode, setViewMode] = useState<'details' | 'print_preview'>('details');
  const [activeFormat, setActiveFormat] = useState<PaperFormatType>(
    (settings.printerType as PaperFormatType) || 'thermal80mm'
  );
  const [copies, setCopies] = useState<number>(settings.printerCopies || 1);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [directPrintStatus, setDirectPrintStatus] = useState<string>('');

  useEffect(() => {
    if (settings.printerType && ['thermal80mm', 'thermal58mm', 'a4', 'a5'].includes(settings.printerType)) {
      setActiveFormat(settings.printerType as PaperFormatType);
    }
  }, [settings.printerType]);

  if (!sale) return null;

  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const t = (ar: string, ku: string, en: string) => {
    if (isKu) return ku;
    if (isAr) return ar;
    return en;
  };

  const storeDisplayName = isKu && settings.storeNameKu ? settings.storeNameKu : (isAr ? settings.storeNameAr : settings.storeName);
  const currency = settings.currencySymbol || (isKu ? 'د.ع' : isAr ? 'د.ع' : 'IQD');
  const safeItems = Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? (JSON.parse(sale.items || '[]') || []) : []);
  const safeReturnedItems = Array.isArray(sale.returnedItems) ? sale.returnedItems : (typeof sale.returnedItems === 'string' ? (JSON.parse(sale.returnedItems || '[]') || []) : []);
  const returnedTotal = safeReturnedItems.reduce((acc, r) => acc + (r?.total || 0), 0);
  const isFullyRefunded = sale.status === 'refunded';
  const isRefundReceipt = isFullyRefunded || returnedTotal > 0;

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 150);
  };

  const handleSilentPrint = () => {
    setIsPrinting(true);
    try {
      printThermalSilentIframe('printable-receipt');
    } catch (e) {
      window.print();
    } finally {
      setTimeout(() => setIsPrinting(false), 500);
    }
  };

  const handle80mmCashierPrint = () => {
    setIsPrinting(true);
    try {
      print80mmCashierReceipt(sale, settings);
    } catch (e) {
      handleSilentPrint();
    } finally {
      setTimeout(() => setIsPrinting(false), 600);
    }
  };

  const handleDirectEscPosPrint = async () => {
    setIsPrinting(true);
    setDirectPrintStatus(t('جاري إرسال أوامر ESC/POS للطابعة الحرارية...', 'ناردنی فەرمانەکانی ESC/POS بۆ پرینتەری گەرمی...', 'Sending ESC/POS bytes to Thermal Printer...'));
    try {
      const buffer = buildEscPosBuffer(sale, settings);
      await sendRawToWebSerialPrinter(buffer);
      setDirectPrintStatus(t('تم إرسال الفاتورة بنجاح للطابعة الحرارية!', 'پسوولەکە بە سەرکەوتوویی بۆ پرینتەر نێردرا!', 'Invoice sent to thermal printer!'));
      setTimeout(() => setDirectPrintStatus(''), 3000);
    } catch (err: any) {
      console.warn('Direct ESC/POS Serial Error:', err);
      setDirectPrintStatus(t(`تنبيه: ${err.message || 'تعذر الاتصال المباشر. استخدام الطباعة السريعة بدلاً منها.'}`, `ئاگاداری: نەتوانرا پەیوەندی ڕاستەوخۆ دروست بکرێت. چاپکردنی خێرا بەکاردێت.`, 'Direct connection failed. Using silent print fallback.'));
      handleSilentPrint();
    } finally {
      setIsPrinting(false);
    }
  };

  const paperFormatsList: { id: PaperFormatType; titleAr: string; titleKu: string; titleEn: string; sizeTag: string; icon: React.ReactNode; descAr: string; descKu: string }[] = [
    {
      id: 'thermal80mm',
      titleAr: 'إيصال حراري 80mm',
      titleKu: 'پسوولەی گەرمی 80mm',
      titleEn: '80mm Thermal',
      sizeTag: '80mm x Auto',
      icon: <Printer className="w-4 h-4" />,
      descAr: 'المقاس القياسي لكاشير المحلات',
      descKu: 'قەبارەی ستانداردی کاشێر'
    },
    {
      id: 'thermal58mm',
      titleAr: 'إيصال حراري 58mm',
      titleKu: 'پسوولەی گەرمی 58mm',
      titleEn: '58mm Thermal',
      sizeTag: '58mm x Auto',
      icon: <Printer className="w-3.5 h-3.5" />,
      descAr: 'شريط طباعة صغير مدمج',
      descKu: 'شریتی چاپی بچووکی کۆمپاکت'
    },
    {
      id: 'a4',
      titleAr: 'فاتورة A4 كاملة',
      titleKu: 'پسوولەی فەرمی A4',
      titleEn: 'A4 Formal Invoice',
      sizeTag: '210 x 297 mm',
      icon: <FileText className="w-4 h-4" />,
      descAr: 'فاتورة ورقية رسمية كاملة',
      descKu: 'پسوولەی کاغەزی فەرمی تەواو'
    },
    {
      id: 'a5',
      titleAr: 'فاتورة A5 مدمجة',
      titleKu: 'پسوولەی مامناوەند A5',
      titleEn: 'A5 Compact',
      sizeTag: '148 x 210 mm',
      icon: <Layout className="w-4 h-4" />,
      descAr: 'فاتورة متوسطة نصف ورقة A4',
      descKu: 'نیوەی لاپەڕەی A4'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      {/* Dynamic Print Engine Media Query CSS */}
      <style>{`
        @media print {
          @page {
            size: ${
              activeFormat === 'a4'
                ? 'A4 portrait'
                : activeFormat === 'a5'
                ? 'A5 portrait'
                : activeFormat === 'thermal58mm'
                ? '58mm auto'
                : '80mm auto'
            };
            margin: ${activeFormat.startsWith('thermal') ? '0' : '6mm'};
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${
              activeFormat === 'thermal80mm'
                ? '72mm'
                : activeFormat === 'thermal58mm'
                ? '48mm'
                : '100%'
            } !important;
            max-width: ${
              activeFormat === 'thermal80mm'
                ? '72mm'
                : activeFormat === 'thermal58mm'
                ? '48mm'
                : '100%'
            } !important;
            margin: 0 auto !important;
            padding: ${activeFormat.startsWith('thermal') ? '1.5mm 2mm' : '8mm'} !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            font-family: 'Times New Roman', Times, serif !important;
            font-size: 10px !important;
          }
          #printable-receipt table {
            border-collapse: collapse !important;
            width: 100% !important;
            border: 1.5px solid #000000 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          #printable-receipt th, #printable-receipt td {
            border: 1px solid #000000 !important;
            color: #000000 !important;
          }
        }
      `}</style>

      <div className={`cyber-card p-4 sm:p-6 rounded-3xl border border-cyan-500/40 w-full bg-[#0B1120] text-slate-100 relative shadow-[0_0_60px_rgba(6,182,212,0.3)] my-auto animate-scaleUp transition-all duration-300 ${
        activeFormat === 'a4' ? 'max-w-6xl' : activeFormat === 'a5' ? 'max-w-4xl' : 'max-w-3xl'
      }`}>
        
        {/* Modal Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-cyan-500/20 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/30 to-blue-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {viewMode === 'details'
                    ? t('تفاصيل الوصل والفاتورة الكاملة', 'وردەکاریی تەواوی پسوولە و فرۆشتن', 'Full Invoice Details')
                    : t('معاينة واختيار حجم الورق للطباعة', 'پێشبینین و هەڵبژاردنی قەبارەی کاغەز', 'Print Preview & Paper Format Selection')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[11px] font-mono font-bold border border-cyan-500/30">
                  #{sale.invoiceNumber}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  sale.status === 'refunded' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {sale.status === 'refunded' ? t('مرتجع 🔴', 'گەڕاوە 🔴', 'Refunded 🔴') : t('مكتمل / دراوە ✅', 'دراوە ✅', 'Paid ✅')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  `الكاشير المسؤول: ${sale.cashierName || 'غير مسمى'} • التاريخ: ${formatDisplayDateTime(sale.timestamp, lang)}`,
                  `کاشێر: ${sale.cashierName || 'دیاری نەکراوە'} • بەروار: ${formatDisplayDateTime(sale.timestamp, lang)}`,
                  `Cashier: ${sale.cashierName || '-'} • Date: ${formatDisplayDateTime(sale.timestamp, lang)}`
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle Buttons */}
            <div className="flex bg-[#070D18] p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('details')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'details'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📋</span>
                <span>{t('تفاصيل الوصل', 'وردەکاریی پسوولە', 'Receipt Details')}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('print_preview')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'print_preview'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🖨️</span>
                <span>{t('معاينة الورق', 'شێوازی کاغەز', 'Paper Format')}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700"
              title={t('إغلاق', 'داخستن', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* VIEW MODE 1: CLEAN UI INVOICE DETAILS VIEW */}
        {viewMode === 'details' && (
          <div className="py-4 space-y-4 max-h-[68vh] overflow-y-auto custom-scrollbar pr-1">
            
            {/* Quick Summary Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-2xl bg-[#070D1A] border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans font-bold">{t('طريقة الدفع:', 'شێوازی پارەدان:', 'Payment Method:')}</span>
                <span className="text-cyan-300 font-bold uppercase text-sm">
                  {sale.paymentMethod === 'cash' ? t('نقد 💵', 'کاش 💵', 'Cash 💵') : sale.paymentMethod}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#070D1A] border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans font-bold">{t('اسم العميل:', 'ناوی کڕیار:', 'Customer Name:')}</span>
                <span className="text-slate-100 font-bold truncate block font-sans">
                  {sale.customerName || t('زبون عام (مفرد)', 'کڕیاری گشتی (کاش)', 'General Customer')}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#070D1A] border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans font-bold">{t('عدد المواد المباعة:', 'ژمارەی کاڵاکان:', 'Items Count:')}</span>
                <span className="text-amber-300 font-bold text-sm">
                  {safeItems.length} {t('مواد', 'کاڵا', 'items')}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#070D1A] border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans font-bold">{t('إجمالي الفاتورة:', 'کۆی گشتی پسوولە:', 'Total Amount:')}</span>
                <span className="text-emerald-400 font-black text-base">
                  {settings.currencySymbol}{formatNumber(sale.total)}
                </span>
              </div>
            </div>

            {/* Purchased Items Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between font-sans">
                <span>🛒 {t('قائمة المواد والمنتجات داخل هذا الوصل:', 'لیستی کاڵا و بەرهەمەکانی ناو ئەم پسوولەیە:', 'Purchased Receipt Items:')}</span>
              </h3>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#050914]">
                <table className="w-full text-right rtl:text-right ltr:text-left text-xs">
                  <thead className="bg-[#0D1527] text-slate-400 border-b border-slate-800 font-bold text-[11px] font-sans">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">{t('المادة / المنتج', 'کاڵا / بەرهەم', 'Product Name')}</th>
                      <th className="p-2.5 text-center">{t('الكمية', 'بڕ / ژمارە', 'Qty')}</th>
                      <th className="p-2.5">{t('سعر الوحدة', 'نرخی تاک', 'Unit Price')}</th>
                      <th className="p-2.5 text-left rtl:text-left ltr:text-right">{t('الإجمالي', 'کۆی گشتی', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                    {safeItems.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-900/50 transition-all">
                        <td className="p-2.5 text-slate-500 font-bold text-[10px]">{idx + 1}</td>
                        <td className="p-2.5 font-sans font-bold text-slate-100">
                          <div>
                            <p>{(isKu && item.productNameKu) ? item.productNameKu : (item.productNameAr || item.productName)}</p>
                            {item.saleType && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 inline-block mt-0.5 font-bold">
                                {item.saleType === 'blister' ? t('شيت', 'شیت', 'Sheet') : t('باكت', 'باکەت', 'Box')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-bold text-cyan-300 text-sm">
                          {item.quantity}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {settings.currencySymbol}{formatNumber(item.price)}
                        </td>
                        <td className="p-2.5 text-left rtl:text-left ltr:text-right font-black text-emerald-400">
                          {settings.currencySymbol}{formatNumber(item.total || (item.price * item.quantity))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Returned Items Section if any */}
            {safeReturnedItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-rose-500/20">
                <h3 className="text-xs font-bold text-rose-300 flex items-center gap-1.5 font-sans">
                  <span>🔄 {t('المواد المرجوعة من هذا الوصل:', 'کاڵا گەڕاوەکانی ناو ئەم پسوولەیە:', 'Returned Items from this Receipt:')}</span>
                </h3>
                <div className="border border-rose-500/30 rounded-2xl overflow-hidden bg-rose-950/20">
                  <table className="w-full text-right rtl:text-right ltr:text-left text-xs">
                    <thead className="bg-rose-950/40 text-rose-300 border-b border-rose-500/30 font-bold text-[10px] font-sans">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">{t('المادة المرجعة', 'کاڵای گەڕاوە', 'Returned Product')}</th>
                        <th className="p-2 text-center">{t('الكمية المرجعة', 'بڕی گەڕاوە', 'Returned Qty')}</th>
                        <th className="p-2 text-left rtl:text-left ltr:text-right">{t('المبلغ المرجع', 'بڕی پارەی گەڕاوە', 'Refund Total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-500/20 font-mono text-rose-100">
                      {safeReturnedItems.map((ret: any, rIdx: number) => (
                        <tr key={rIdx}>
                          <td className="p-2 text-rose-400 text-[10px]">{rIdx + 1}</td>
                          <td className="p-2 font-sans font-bold">{(isKu && ret.productNameKu) ? ret.productNameKu : (ret.productNameAr || ret.productName)}</td>
                          <td className="p-2 text-center font-bold text-rose-300">{ret.quantity}</td>
                          <td className="p-2 text-left rtl:text-left ltr:text-right font-bold text-rose-400">-{settings.currencySymbol}{formatNumber(ret.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Financial Summary Box */}
            <div className="p-4 rounded-2xl bg-[#050A18] border border-cyan-500/30 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">{t('المجموع الفرعي:', 'کۆی سەرەتایی:', 'Subtotal:')}</span>
                <span className="text-slate-200 font-bold">{settings.currencySymbol}{formatNumber(sale.subtotal || sale.total)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span className="font-sans">{t('الخصم الممنوح:', 'داشکاندن:', 'Discount:')}</span>
                  <span className="font-bold">-{settings.currencySymbol}{formatNumber(sale.discount)}</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span className="font-sans">{t('الضريبة:', 'باج:', 'Tax:')}</span>
                  <span className="font-bold">+{settings.currencySymbol}{formatNumber(sale.tax)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm sm:text-base font-black">
                <span className="text-white font-sans">{t('صافي المجموع النهائي:', 'کۆی گشتی و کۆتایی:', 'Grand Total Paid:')}</span>
                <span className="text-emerald-300">{settings.currencySymbol}{formatNumber(sale.total)}</span>
              </div>
              {sale.amountTendered !== undefined && (
                <div className="pt-1 flex justify-between text-xs text-slate-400 border-t border-slate-800/60">
                  <span className="font-sans">{t('المبلغ المستلم من الزبون / الباقي:', 'پارەی وەرگیراو / گەڕاوە:', 'Tender / Change:')}</span>
                  <span className="text-cyan-300 font-bold">
                    {settings.currencySymbol}{formatNumber(sale.amountTendered)} / {settings.currencySymbol}{formatNumber(sale.changeDue || 0)}
                  </span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW MODE 2: PAPER PRINT FORMAT & PREVIEW STAGE */}
        {viewMode === 'print_preview' && (
          <>
            {/* Paper Format Selection Bar */}
            <div className="py-4 space-y-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Layers className="w-4 h-4" />
                  <span>{t('اختر مقاس ورق الطباعة (Format):', 'قەبارەی کاغەزی چاپ هەڵبژێرە:', 'Select Paper Size Format:')}</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {t(
                    `المحدد حالياً: ${paperFormatsList.find(f => f.id === activeFormat)?.titleAr}`,
                    `هەڵبژێردراو: ${paperFormatsList.find(f => f.id === activeFormat)?.titleKu}`,
                    `Active: ${activeFormat}`
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {paperFormatsList.map((fmt) => {
                  const isActive = activeFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setActiveFormat(fmt.id)}
                      className={`p-3 rounded-2xl border transition-all text-right rtl:text-right flex flex-col justify-between cursor-pointer active:scale-95 ${
                        isActive
                          ? 'bg-gradient-to-br from-cyan-950/80 via-blue-950/50 to-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-2 ring-cyan-400/40 text-white'
                          : 'bg-[#070D19] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className={`p-1.5 rounded-xl ${isActive ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                          {fmt.icon}
                        </div>
                        {isActive && (
                          <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                            ✓
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white leading-tight font-sans">
                          {isKu ? fmt.titleKu : (isAr ? fmt.titleAr : fmt.titleEn)}
                        </div>
                        <div className="text-[10px] text-cyan-400 font-mono font-bold mt-0.5">
                          {fmt.sizeTag}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Additional Print Option Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 bg-[#070D18] p-3 rounded-2xl border border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-4">
                  {/* Copies Stepper */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 flex items-center gap-1 font-semibold font-sans">
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      {t('عدد النسخ:', 'ژمارەی چاپی پەڕە:', 'Copies:')}
                    </span>
                    <div className="flex items-center bg-[#0B1120] border border-slate-700 rounded-xl p-0.5 font-mono">
                      <button
                        type="button"
                        onClick={() => setCopies(prev => Math.max(1, prev - 1))}
                        className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-2.5 font-bold text-cyan-300">{copies}</span>
                      <button
                        type="button"
                        onClick={() => setCopies(prev => Math.min(10, prev + 1))}
                        className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Barcode Toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none font-sans">
                    <input
                      type="checkbox"
                      checked={showBarcode}
                      onChange={(e) => setShowBarcode(e.target.checked)}
                      className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-900"
                    />
                    <span>{t('إظهار الباركود', 'نیشاندانی بارکۆد', 'Show Barcode')}</span>
                  </label>

                  {/* Signatures Toggle for A4/A5 */}
                  {(activeFormat === 'a4' || activeFormat === 'a5') && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none font-sans">
                      <input
                        type="checkbox"
                        checked={showSignatures}
                        onChange={(e) => setShowSignatures(e.target.checked)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-900"
                      />
                      <span>{t('خانة التوقيعات', 'شوێنی واژوو', 'Signature Box')}</span>
                    </label>
                  )}
                </div>

                <div className="text-[11px] text-cyan-300 font-mono font-sans">
                  ⚡ {t('جاهز للطباعة المباشرة', 'ئامادەیە بۆ چاپی ڕاستەوخۆ', 'Ready to print')}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ALWAYS RENDER PRINTABLE STAGE IN DOM FOR PRINT MEDIA QUERIES */}
        <div className={viewMode === 'details' ? 'hidden print:block' : 'py-4'}>
          {viewMode === 'print_preview' && (
            <div className="text-center mb-2">
              <span className="text-[11px] font-bold text-slate-400 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700 inline-block font-sans">
                {t('🔍 شاشة المعاينة الحية للورق', '🔍 پێشبینینی ڕاستەوخۆی کاغەز', '🔍 Live Paper Print Stage Preview')}
              </span>
            </div>
          )}

          <div className="overflow-x-auto p-2 max-h-[52vh] overflow-y-auto rounded-2xl bg-[#040812] border border-slate-800/80">
            <div
              id="printable-receipt"
              className={`mx-auto transition-all duration-200 ${
                activeFormat === 'a4'
                  ? 'bg-[#080E1D] p-6 sm:p-8 rounded-2xl border border-slate-700 space-y-6 shadow-2xl w-full max-w-4xl text-slate-100 font-sans'
                  : activeFormat === 'a5'
                  ? 'bg-[#080E1D] p-5 rounded-2xl border border-slate-700 space-y-4 shadow-xl w-full max-w-2xl text-slate-100 font-sans'
                  : activeFormat === 'thermal58mm'
                  ? 'bg-[#FFFFFF] text-black p-2 rounded-lg border-2 border-black shadow-2xl w-full max-w-[300px] receipt-times-font text-[9.5px] relative select-none'
                  : 'bg-[#FFFFFF] text-black p-2.5 sm:p-3 rounded-lg border-2 border-black shadow-2xl w-full max-w-[360px] receipt-times-font text-[10px] relative select-none'
              }`}
            >
              {/* LAYOUT CHOICE: A4 OR A5 FORMAL INVOICE */}
              {(activeFormat === 'a4' || activeFormat === 'a5') ? (
                <div className="space-y-5 text-slate-200 font-sans">
                  {/* Formal Header */}
                  <div className="flex flex-wrap items-start justify-between border-b-2 border-slate-700 pb-4 gap-4">
                    <div className="space-y-1">
                      <div className={`inline-block px-3 py-1 rounded-lg text-xs font-bold mb-1 border ${
                        isRefundReceipt
                          ? 'bg-rose-950/80 text-rose-400 border-rose-500/80 print-red font-black text-sm'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}>
                        {isRefundReceipt
                          ? t('🔴 وصل إرجاع مواد / فاتورة مرتجعة (REFUND RECEIPT) 🔴', '🔴 پسوولەی گەڕاندنەوەی کاڵا (REFUND) 🔴', '🔴 RETURNED GOODS RECEIPT / REFUND 🔴')
                          : t('فاتورة بيع رسمية ضريبية (Tax Invoice)', 'پسوولەی فەرمی فرۆشتن', 'Official Commercial Tax Invoice')}
                      </div>
                      <h1 className={`${activeFormat === 'a4' ? 'text-2xl sm:text-3xl' : 'text-xl'} font-black text-white tracking-wide`}>
                        {storeDisplayName}
                      </h1>
                      <p className="text-xs text-slate-300">{settings.address}</p>
                      <p className="text-xs text-slate-300 font-mono">{t('هاتف التواصل:', 'ژمارەی مۆبایل:', 'Phone:')} {settings.phone}</p>
                    </div>

                    <div className="text-right rtl:text-left space-y-1 bg-[#0F172A] p-3 rounded-2xl border border-slate-700">
                      <div className="text-xs text-slate-400">{t('رقم الفاتورة:', 'ژمارەی پسوولە:', 'Invoice No:')}</div>
                      <div className="text-lg font-black text-cyan-400 font-mono">{sale.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-300 font-mono">{formatDisplayDateTime(sale.timestamp, lang)}</div>
                      {showBarcode && (
                        <div className="pt-1.5 flex justify-end rtl:justify-start">
                          <BarcodeGraphic value={sale.invoiceNumber} height={32} showText={false} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer, Cashier & Timestamp Details Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 bg-[#0F172A] p-3.5 rounded-2xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('تاريخ ووقت الوصل:', 'بەروار و کات:', 'Receipt Time:')}</span>
                      <strong className="text-cyan-300 font-mono text-[11px]">{formatDisplayDateTime(sale.timestamp, lang)}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('أول إضافة للمواد:', 'کاتی یەکەم کاڵا:', 'First Item Added:')}</span>
                      <strong className="text-amber-300 font-mono text-[11px]">{formatDisplayTime(safeItems[0]?.addedAtTime || sale.timestamp, lang)}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('الكاشير المسؤول:', 'کاشێر:', 'Cashier:')}</span>
                      <strong className="text-white text-[11px]">{sale.cashierName}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('اسم الزبون / العميل:', 'ناوی کڕیار:', 'Customer:')}</span>
                      <strong className="text-blue-400 text-[11px]">{sale.customerName || t('زبون عام (مفرد)', 'کڕیاری گشتی', 'General Customer')}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('وسيلة الدفع:', 'شێوازی پارەدان:', 'Payment Method:')}</span>
                      <strong className="text-emerald-400 uppercase font-mono text-[11px]">{sale.paymentMethod === 'cash' ? t('نقد', 'کاش', 'Cash') : sale.paymentMethod}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('حالة الفاتورة:', 'دۆخی پسوولە:', 'Status:')}</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        sale.status === 'refunded' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {sale.status === 'refunded' ? t('مسترجعة', 'گەڕاوە', 'Refunded') : t('مكتملة ومدفوعة', 'دراوە', 'Paid in Full')}
                      </span>
                    </div>
                  </div>

                  {/* Prescription Info Box if attached */}
                  {sale.prescriptionInfo && (
                    <div className="bg-cyan-950/40 p-3 rounded-2xl border border-cyan-500/30 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-cyan-300 font-bold border-b border-cyan-500/20 pb-1">
                        <span className="flex items-center gap-1.5">
                          📋 {t('بيانات الوصفة والطبيب الموصوف', 'زانیاری ڕەچەتە و پزیشک', 'Prescription & Doctor Info')}
                        </span>
                        {sale.prescriptionInfo.doctorName && (
                          <span className="text-cyan-400 font-bold">
                            {t(`الطبيب: ${sale.prescriptionInfo.doctorName}`, `پزیشک: ${sale.prescriptionInfo.doctorName}`, `Dr. ${sale.prescriptionInfo.doctorName}`)}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
                        {sale.prescriptionInfo.patientName && (
                          <div>
                            <span className="text-slate-400">{t('المريض: ', 'نەخۆش: ', 'Patient: ')}</span>
                            <strong className="text-white">{sale.prescriptionInfo.patientName}</strong>
                          </div>
                        )}
                        {sale.prescriptionInfo.patientPhone && (
                          <div>
                            <span className="text-slate-400">{t('الهاتف: ', 'تەلەفۆن: ', 'Phone: ')}</span>
                            <span className="font-mono text-cyan-300">{sale.prescriptionInfo.patientPhone}</span>
                          </div>
                        )}
                        {sale.prescriptionInfo.prescriptionNotes && (
                          <div className="col-span-2 sm:col-span-3 text-emerald-300 bg-emerald-950/30 p-1.5 rounded-xl border border-emerald-500/20">
                            <strong>{t('ملاحظات الوصفة: ', 'تێبینی ڕەچەتە: ', 'Prescription Notes: ')}</strong>
                            {sale.prescriptionInfo.prescriptionNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Items Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      {t('تفاصيل المواد والمنتجات المباعة', 'وردەکاریی کاڵا و بەرهەمە فرۆشراوەکان', 'Itemized Line Breakdown')}
                    </h3>

                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full text-xs text-right rtl:text-right border-collapse">
                        <thead>
                          <tr className="bg-[#0F172A] text-slate-300 uppercase text-[10px] font-bold border-b border-slate-800">
                            <th className="p-2.5">#</th>
                            <th className="p-2.5">{t('المادة / المنتج', 'کاڵا / بەرهەم', 'Product Description')}</th>
                            <th className="p-2.5 text-center">{t('وقت الإضافة', 'کاتی زیادکردن', 'Time Added')}</th>
                            <th className="p-2.5 text-center">{t('نوع البيع', 'جۆری فرۆشتن', 'Sale Type')}</th>
                            <th className="p-2.5 text-center">{t('الكمية', 'بڕ', 'Qty')}</th>
                            <th className="p-2.5 text-center">{t('سعر الوحدة', 'نرخی تاک', 'Unit Price')}</th>
                            <th className="p-2.5 text-left rtl:text-right">{t('الإجمالي', 'کۆی گشتی', 'Line Total')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {safeItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              <td className="p-2.5 text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                              <td className="p-2.5 font-medium">
                                <div className="text-white font-bold">{(isKu && item.productNameKu) ? item.productNameKu : (item.productNameAr || item.productName)}</div>
                                {item.barcode && (
                                  <div className="text-[10px] font-mono font-bold text-cyan-300 print:text-black flex items-center gap-1 mt-0.5">
                                    🏷️ <span>{item.barcode}</span>
                                  </div>
                                )}
                                {item.dosageInstruction && (
                                  <div className="text-[10px] text-cyan-300 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/30 inline-block mt-0.5">
                                    💊 {item.dosageInstruction}
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className="font-mono text-[10px] text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                                  🕒 {formatDisplayTime(item.addedAtTime || safeItems[0]?.addedAtTime || sale.timestamp, lang)}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-cyan-300 border border-slate-700">
                                  {item.saleType === 'blister' ? t('شيت', 'شیت', 'Sheet') : t('باكت', 'باکەت', 'Box')}
                                </span>
                              </td>
                              <td className="p-2.5 text-center font-bold text-white font-mono">{item.quantity}</td>
                              <td className="p-2.5 text-center font-mono text-slate-300">{settings.currencySymbol}{formatNumber(item.price)}</td>
                              <td className="p-2.5 text-left rtl:text-right font-mono font-bold text-emerald-400">{settings.currencySymbol}{formatNumber(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Returned Items if any */}
                  {sale.returnedItems && sale.returnedItems.length > 0 && (
                    <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-rose-300 font-bold border-b border-rose-500/20 pb-1.5">
                        <span>{t('المواد المرجوعة من هذا الوصل', 'کاڵا گەڕاوەکانی ئەم پسوولەیە', 'Returned Items Deducted')}</span>
                        <span className="font-mono text-rose-400 font-black">-{settings.currencySymbol}{formatNumber(returnedTotal)}</span>
                      </div>
                      {sale.returnedItems.map((ret, rIdx) => (
                        <div key={rIdx} className="flex justify-between text-[11px] text-slate-300">
                          <span>{(isKu && ret.productNameKu) ? ret.productNameKu : (ret.productNameAr || ret.productName)} ({ret.quantity} {t('قطعة', 'دانە', 'pcs')})</span>
                          <span className="font-mono text-rose-400 font-bold">-{settings.currencySymbol}{formatNumber(ret.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Financial Totals & Signatures */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div className="space-y-2 text-xs text-slate-400 bg-[#0F172A] p-3.5 rounded-2xl border border-slate-800">
                      <p className="font-bold text-slate-300 border-b border-slate-800 pb-1">{settings.receiptHeaderMsg}</p>
                      <p className="text-[11px] leading-relaxed">{settings.receiptFooterMsg}</p>
                      
                      {showSignatures && (
                        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-[11px]">
                          <div>
                            <span>{t('توقيع الكاشير:', 'واژووی کاشێر:', 'Cashier Sig:')}</span>
                            <div className="mt-4 border-b border-slate-600 w-24" />
                          </div>
                          <div>
                            <span>{t('ختم/توقيع المستلم:', 'مۆر/واژووی وەرگر:', 'Receiver Sig:')}</span>
                            <div className="mt-4 border-b border-slate-600 w-24" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-[#0F172A] p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span className="font-sans">{t('المجموع قبل الخصم:', 'کۆی گشتی پێش داشکاندن:', 'Subtotal:')}</span>
                        <span className="text-slate-200">{settings.currencySymbol}{formatNumber(sale.subtotal)}</span>
                      </div>

                      {returnedTotal > 0 && (
                        <div className="flex justify-between text-rose-400">
                          <span className="font-sans">{t('خصم الترجيع:', 'داشکاندنی گەڕاندنەوە:', 'Returns:')}</span>
                          <span>-{settings.currencySymbol}{formatNumber(returnedTotal)}</span>
                        </div>
                      )}

                      {sale.discount > 0 && (
                        <div className="flex justify-between text-amber-400">
                          <span className="font-sans">{t('خصم الفاتورة:', 'داشکاندنی پسوولە:', 'Discount:')}</span>
                          <span>-{settings.currencySymbol}{formatNumber(sale.discount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-slate-400">
                        <span className="font-sans">{t(`الضريبة (${settings.taxRate}%):`, `باج (${settings.taxRate}%):`, `Tax (${settings.taxRate}%):`)}</span>
                        <span className="text-slate-200">{settings.currencySymbol}{formatNumber(sale.tax)}</span>
                      </div>

                      <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-700">
                        <span className="font-sans">{t('صافي الإجمالي النهائي:', 'کۆی گشتی و کۆتایی:', 'Grand Total:')}</span>
                        <span className="text-emerald-400 text-lg">{settings.currencySymbol}{formatNumber(sale.total)}</span>
                      </div>

                      {sale.amountTendered && (
                        <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800 font-sans">
                          <span>{t('المستلم:', 'وەرگیراو:', 'Tendered:')} {settings.currencySymbol}{formatNumber(sale.amountTendered)}</span>
                          <span>{t('المتبقي:', 'ماوە / بەجێماو:', 'Change:')} {settings.currencySymbol}{formatNumber(sale.changeDue || 0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* LAYOUT CHOICE: THERMAL 80mm OR 58mm RECEIPT TAPE - TIMES NEW ROMAN & COMPACT CLEAR GRID */
                <div className="text-black receipt-times-font text-[10px] leading-tight relative select-none p-1 sm:p-2 bg-white">
                  {/* Store Header */}
                  <div className="text-center mb-1">
                    {isRefundReceipt && (
                      <div className="border border-black text-black py-0.5 px-2 text-center mb-1 font-bold text-[10px]">
                        *** {t('وصل إرجاع بضاعة (مرتجع)', 'پسوولەی گەڕاندنەوەی کاڵا (مەرتەجەع)', 'REFUND RECEIPT')} ***
                      </div>
                    )}
                    <h1 className="text-lg sm:text-xl font-black tracking-normal uppercase text-black m-0 leading-tight">
                      {storeDisplayName || '7AMO.POS'}
                    </h1>
                    <p className="text-[9.5px] text-black font-bold mt-0.5 leading-snug">
                      {settings.address || (isAr ? 'العراق - بغداد - شارع فلسطين' : isKu ? 'عێراق - بەغداد - شەقامی فەلەستین' : 'Palestine St - Baghdad')} | <span dir="ltr" className="font-bold">{settings.phone || '0000 000 770 964+'}</span>
                    </p>
                  </div>

                  {/* Solid Horizontal Line */}
                  <div className="border-t-[1.5px] border-black my-1" />

                  {/* Metadata Row 1: [#5001] + Payment Method (Right) / Date & Time (Left) */}
                  <div className="flex justify-between items-center text-[9.5px] font-bold text-black mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span>
                        {sale.paymentMethod === 'cash'
                          ? t('نقد (كاش)', 'نەقد (کاش)', 'Cash')
                          : sale.paymentMethod === 'card'
                          ? t('بطاقة (كارت)', 'کارت / ڤیزا', 'Card')
                          : sale.paymentMethod === 'debt'
                          ? t('آجل (دين)', 'قەرز', 'Credit')
                          : (sale.paymentMethod || t('نقد (كاش)', 'نەقد (کاش)', 'Cash'))}
                      </span>
                      <span className="border-[1.5px] border-black px-1.5 py-[0.5px] font-black" dir="ltr">
                        #{sale.invoiceNumber}
                      </span>
                    </div>
                    <div dir="ltr" className="font-bold text-[9.5px]">
                      {formatReceiptDateTime(sale.timestamp, lang)}
                    </div>
                  </div>

                  {/* Metadata Row 2: Cashier (Right) / Status (Left) */}
                  <div className="flex justify-between items-center text-[9.5px] font-bold text-black mb-1">
                    <div>
                      {t('الكاشير:', 'کاشێر:', 'Cashier:')} {sale.cashierName || t('Admin', 'Admin', 'Admin')}
                    </div>
                    <div>
                      {isRefundReceipt
                        ? t('مرتجع بالكامل', 'گەڕاوەتەوە بەتەواوی', 'Fully Refunded')
                        : sale.paymentMethod === 'debt'
                        ? t('آجل / غير مسدد', 'قەرز', 'Unpaid Debt')
                        : t('مدفوع بالكامل', 'دراوە بە تەواوی', 'Fully Paid')}
                    </div>
                  </div>

                  {/* Dashed Horizontal Line */}
                  <div className="border-b-[1.5px] border-dashed border-black my-1" />

                  {/* Items Table with Crisp Black Grid Borders */}
                  <table className="w-full border-collapse border-[1.5px] border-black text-[9.5px] my-1 text-black">
                    <thead>
                      <tr className="border-b-[1.5px] border-black bg-white font-black">
                        <th className="border border-black py-1 px-1.5 text-right rtl:text-right w-[40%]">{t('المادة', 'کاڵا', 'Item')}</th>
                        <th className="border border-black py-1 px-1 text-center w-[15%]">{t('النوع', 'جۆر', 'Type')}</th>
                        <th className="border border-black py-1 px-1 text-center w-[12%]">{t('العدد', 'بڕ', 'Qty')}</th>
                        <th className="border border-black py-1 px-1 text-center w-[16%]">{t('السعر', 'نرخ', 'Price')}</th>
                        <th className="border border-black py-1 px-1.5 text-left rtl:text-left w-[17%]">{t('الإجمالي', 'کۆی گشتی', 'Total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeItems.map((item, idx) => {
                        const itemName = (isKu && item.productNameKu) ? item.productNameKu : (item.productNameAr || item.productName);
                        const saleTypeLabel = item.saleType === 'blister'
                          ? t('شيت', 'شیت', 'Sheet')
                          : t('باكت', 'باکەت', 'Box');

                        return (
                          <tr key={idx} className="border-b border-black">
                            <td className="border border-black py-1 px-1.5 text-right rtl:text-right align-middle font-bold leading-tight">
                              <div>{itemName}</div>
                              {item.dosageInstruction && (
                                <div className="text-[8px] italic font-normal">
                                  💊 {item.dosageInstruction}
                                </div>
                              )}
                            </td>
                            <td className="border border-black py-1 px-1 text-center align-middle">
                              <span className="border border-black rounded-[2px] px-1 py-[0.5px] font-bold text-[8.5px] inline-block">
                                {saleTypeLabel}
                              </span>
                            </td>
                            <td className="border border-black py-1 px-1 text-center align-middle font-bold text-[10px]" dir="ltr">
                              {item.quantity}
                            </td>
                            <td className="border border-black py-1 px-1 text-center align-middle font-bold whitespace-nowrap text-[9px]" dir="ltr">
                              {formatNumber(item.price)}
                            </td>
                            <td className="border border-black py-1 px-1.5 text-left rtl:text-left align-middle font-bold whitespace-nowrap text-[9px]" dir="ltr">
                              {formatNumber(item.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Returned Items if any */}
                  {!isFullyRefunded && safeReturnedItems.length > 0 && returnedTotal > 0 && (
                    <div className="border border-black p-1.5 my-1 space-y-0.5 text-[9px]">
                      <div className="flex justify-between font-bold border-b border-black pb-0.5">
                        <span>{t('خصم المرجوعات:', 'گەڕاوەکان:', 'Returns:')}</span>
                        <span dir="ltr">-{formatNumber(returnedTotal)} {currency}</span>
                      </div>
                      {safeReturnedItems.map((ret, rIdx) => {
                        const retType = ret.saleType === 'blister' ? t('شيت', 'شیت', 'Sheet') : t('باكت', 'باکەت', 'Box');
                        const retName = (isKu && ret.productNameKu) ? ret.productNameKu : (ret.productNameAr || ret.productName);
                        return (
                          <div key={rIdx} className="flex justify-between text-[8.5px]">
                            <span>{retName} ({retType} {ret.quantity})</span>
                            <span dir="ltr">-{formatNumber(ret.total)} {currency}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Totals Box with Crisp 1.5px Solid Border */}
                  <div className="border-[1.5px] border-black p-1.5 sm:p-2 my-1 text-black font-bold text-[9.5px]">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center mb-0.5">
                      <span>{t('المجموع الفرعي:', 'کۆی سەرەتایی:', 'Subtotal:')}</span>
                      <span dir="ltr" className="font-bold">
                        {formatNumber(sale.subtotal)} {currency}
                      </span>
                    </div>

                    {/* Tax or Discount */}
                    {sale.tax > 0 ? (
                      <div className="flex justify-between items-center mb-0.5">
                        <span>{t('الضريبة / الخدمة:', 'باج / خزمەتگوزاری:', 'Tax / Fee:')}</span>
                        <span dir="ltr" className="font-bold">
                          {formatNumber(sale.tax)} {currency}
                        </span>
                      </div>
                    ) : sale.discount > 0 ? (
                      <div className="flex justify-between items-center mb-0.5">
                        <span>{t('الخصم الممنوح:', 'داشکاندن:', 'Discount:')}</span>
                        <span dir="ltr" className="font-bold">
                          -{formatNumber(sale.discount)} {currency}
                        </span>
                      </div>
                    ) : null}

                    {/* Dashed divider */}
                    <div className="border-t-[1.5px] border-dashed border-black my-1" />

                    {/* Grand Net Total */}
                    <div className="flex justify-between items-center text-[12px] font-black py-0.5">
                      <span>{t('الصافي النهائي:', 'کۆی گشتی و کۆتایی:', 'Grand Total:')}</span>
                      <span dir="ltr" className="font-black text-[13px]">
                        {sale.total < 0 ? '-' : ''}{formatNumber(Math.abs(sale.total))} {currency}
                      </span>
                    </div>

                    {/* Tendered & Change */}
                    <div className="flex justify-between items-center text-[9px] pt-0.5">
                      <span>
                        {t('المستلم:', 'وەرگیراو:', 'Tendered:')}{' '}
                        <span dir="ltr" className="font-bold">{formatNumber(sale.amountTendered || sale.total)} {currency}</span>
                      </span>
                      <span>
                        {t('الباقي:', 'ماوە:', 'Change:')}{' '}
                        <span dir="ltr" className="font-bold">{formatNumber(sale.changeDue || 0)} {currency}</span>
                      </span>
                    </div>
                  </div>

                  {/* Return Policy and Tagline Footer */}
                  <div className="text-center pt-1 space-y-0.5 text-black">
                    <p className="text-[9.5px] font-bold leading-snug">
                      {settings.receiptFooterMsg || t('البضاعة المباعة ترجع وتستبدل خلال 14 يوماً بشرط الفاتورة', 'کاڵای فرۆشراو دەگەڕێندرێتەوە بە مەرجی هێنانی پسوولە', 'Goods sold can be returned or exchanged within 14 days with receipt')}
                    </p>
                    <p className="text-[8.5px] font-bold tracking-wide">
                      7AMO.POS • Pharmacy POS
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Direct Print Status Message */}
        {directPrintStatus && (
          <div className="mb-3 p-3 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 text-xs font-bold flex items-center gap-2 animate-fadeIn font-sans">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>{directPrintStatus}</span>
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-800">
          
          {/* Direct 80mm Cashier Roll Print Button */}
          <button
            type="button"
            onClick={handle80mmCashierPrint}
            disabled={isPrinting}
            title={t('طباعة فورية على ورق كاشير 80 مم مع تفاصيل المواد والباركود', 'چاپی خێرا لەسەر وەرەقەی کاشێری 80 ملم بە بارکۆدەوە', 'Print 80mm Cashier Thermal Roll')}
            className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95 transition-all border border-emerald-300/50 shrink-0 font-sans"
          >
            <Printer className="w-4 h-4 text-slate-950" />
            <span>{t('طباعة ورق كاشير 80 مم', 'چاپی کاشێر 80 ملم', 'Print 80mm Cashier')}</span>
          </button>

          {/* Direct ESC/POS Thermal Print (Web Serial) */}
          {activeFormat.startsWith('thermal') && isWebSerialSupported() && (
            <button
              type="button"
              onClick={handleDirectEscPosPrint}
              disabled={isPrinting}
              title={t('طباعة حرارية مباشرة عبر منفذ USB/Serial بدون فتح نافذة المتصفح', 'چاپی ڕاستەوخۆ بە بێ پەنجەرەی وێبگەڕ لە ڕێگەی USB/Serial', 'Direct ESC/POS Thermal Printing via USB/Serial')}
              className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_0_25px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95 transition-all border border-amber-300/50 shrink-0 font-sans"
            >
              <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
              <span>{t('حراري مباشر (ESC/POS)', 'گەرمی ڕاستەوخۆ', 'ESC/POS')}</span>
            </button>
          )}

          {/* Silent Print Button */}
          <button
            type="button"
            onClick={handleSilentPrint}
            disabled={isPrinting}
            className="py-3.5 px-4 rounded-2xl bg-purple-900/80 hover:bg-purple-800 text-purple-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-purple-500/40 transition-all shrink-0 font-sans"
          >
            <Cpu className="w-4 h-4 text-purple-300" />
            <span>{t('طباعة صامتة', 'چاپی بێدەنگ', 'Silent Print')}</span>
          </button>

          {/* Standard Browser Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95 transition-all border border-cyan-300/40 font-sans"
          >
            <Printer className="w-4 h-4 text-slate-950" />
            <span>
              {isPrinting
                ? t('جاري إرسال الفاتورة...', 'ناردنی پسوولە...', 'Printing...')
                : isKu
                ? `پشتڕاستکردن و چاپی پسوولە (${paperFormatsList.find(f => f.id === activeFormat)?.titleKu}) ${copies > 1 ? `[${copies} دانە]` : ''}`
                : isAr
                ? `تأكيد وطباعة الفاتورة (${paperFormatsList.find(f => f.id === activeFormat)?.titleAr}) ${copies > 1 ? `[${copies} نسخ]` : ''}`
                : `Confirm & Print (${paperFormatsList.find(f => f.id === activeFormat)?.titleEn}) ${copies > 1 ? `[${copies} Copies]` : ''}`}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs cursor-pointer border border-slate-700 transition-all font-sans"
          >
            {t('إلغاء', 'داخستن / پاشگەزبوونەوە', 'Cancel')}
          </button>
        </div>

      </div>
    </div>
  );
};
