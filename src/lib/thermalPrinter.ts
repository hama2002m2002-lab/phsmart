// Web Serial ESC/POS Direct Thermal Printer Integration Library
// Supports direct raw printing to USB / COM / Serial Thermal POS Printers (Epson, Xprinter, Rongta, POS-58, POS-80)

import { SaleTransaction, StoreSettings } from '../types';
import { formatNumber } from './formatUtils';
import { generateBarcodeSvgString } from './barcodeUtils';
import { formatDisplayDateTime, formatDisplayDate, formatDisplayTime, formatReceiptDateTime } from './dateUtils';

let activeSerialPort: any = null;

/**
 * Check if Web Serial API is supported in the current browser environment
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export function isSerialConnected(): boolean {
  return Boolean(activeSerialPort);
}

/**
 * Send a test print command to the active serial printer
 */
export async function testPrintSerial(settings: StoreSettings): Promise<void> {
  const dummySale: SaleTransaction = {
    id: 'test-' + Date.now(),
    invoiceNumber: 'TEST-001',
    cashierName: 'System Test',
    timestamp: new Date().toLocaleString(),
    items: [
      {
        productId: 'test-item',
        productName: 'Test Item',
        productNameAr: 'مادة اختبار',
        quantity: 1,
        saleType: 'retail',
        price: 1000,
        total: 1000,
      }
    ],
    subtotal: 1000,
    discount: 0,
    tax: 0,
    total: 1000,
    paymentMethod: 'cash',
    status: 'completed'
  };

  const buffer = buildEscPosBuffer(dummySale, settings);
  await sendRawToWebSerialPrinter(buffer);
}

/**
 * Download 1-Click Windows Batch Launcher for Chrome/Edge with --kiosk-printing flag
 * This eliminates the print preview window completely when printing.
 */
export function downloadKioskPrintingBatchFile(): void {
  const currentUrl = window.location.href;
  const batContent = `@echo off
chcp 65001 >nul
title 7amo.pos - Direct Silent Printing POS Launcher
echo ========================================================
echo   7amo.pos - مشغل نقاط البيع بالطباعة الصامتة الفورية
echo ========================================================
echo   جاري تشغيل النظام بوضع Kiosk Printing لإلغاء نافذة المتصفح...
echo.

:: Try Google Chrome 64-bit
if exist "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app="${currentUrl}"
    exit
)

:: Try Google Chrome 32-bit
if exist "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app="${currentUrl}"
    exit
)

:: Try Microsoft Edge
if exist "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --app="${currentUrl}"
    exit
)
if exist "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --app="${currentUrl}"
    exit
)

:: Fallback generic start
start chrome --kiosk-printing --app="${currentUrl}"
exit
`;

  const blob = new Blob([batContent], { type: 'application/x-bat;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '7amo-POS-Silent-Print.bat';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


/**
 * Request user to pick a Web Serial device (USB / Serial Thermal POS Printer)
 */
export async function connectWebSerialPrinter(baudRate = 9600): Promise<any> {
  if (!isWebSerialSupported()) {
    throw new Error('متصفحك لا يدعم خاصية Web Serial للطباعة الحرارية المباشرة. يرجى استخدام متصفح Chrome أو Edge أو Brave.');
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate });
    activeSerialPort = port;
    return port;
  } catch (err: any) {
    console.error('Web Serial Connection Error:', err);
    throw new Error(err.message || 'تعذر الاتصال بالطابعة الحرارية عبر منفذ Serial/USB');
  }
}

/**
 * Disconnect current active Web Serial thermal printer
 */
export async function disconnectWebSerialPrinter(): Promise<void> {
  if (activeSerialPort) {
    try {
      await activeSerialPort.close();
    } catch (e) {
      console.warn('Error closing serial port:', e);
    }
    activeSerialPort = null;
  }
}

/**
 * Encode Arabic & UTF-8 text into an Uint8Array buffer for ESC/POS
 */
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Build ESC/POS Byte Buffer for a Sale Transaction Invoice
 */
export function buildEscPosBuffer(sale: SaleTransaction, settings: StoreSettings): Uint8Array {
  const lang = settings.language || 'ar';
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const storeName = isKu 
    ? (settings.storeNameKu || settings.storeNameAr || settings.storeName)
    : isAr 
    ? (settings.storeNameAr || settings.storeName) 
    : settings.storeName;

  const currency = settings.currencySymbol || (isKu ? 'د.ع' : isAr ? 'د.ع' : 'IQD');

  const ESC = 0x1B;
  const GS = 0x1D;

  const commands: number[] = [];

  // Helper push functions
  const pushBytes = (...bytes: number[]) => commands.push(...bytes);
  const pushText = (text: string) => {
    const encoded = stringToUint8Array(text);
    for (let i = 0; i < encoded.length; i++) {
      commands.push(encoded[i]);
    }
  };
  const pushLine = (text = '') => {
    pushText(text + '\n');
  };

  // 1. Initialize Printer
  pushBytes(ESC, 0x40); // ESC @ Initialize

  // 2. Select Character Code Table
  pushBytes(ESC, 0x74, 0x16); // Select Arabic CP864 if available

  // 3. Header: Center Align, Double Size, Bold
  pushBytes(ESC, 0x61, 0x01); // Center align
  pushBytes(ESC, 0x45, 0x01); // Bold ON
  pushBytes(GS, 0x21, 0x11);  // Double width & height
  pushLine(storeName);

  pushBytes(GS, 0x21, 0x00);  // Reset text size
  pushBytes(ESC, 0x45, 0x00); // Bold OFF

  const isRefunded = sale.status === 'refunded';
  const returnedItems = Array.isArray(sale.returnedItems) ? sale.returnedItems : (typeof sale.returnedItems === 'string' ? (JSON.parse(sale.returnedItems || '[]') || []) : []);
  if (isRefunded || returnedItems.length > 0) {
    pushBytes(ESC, 0x45, 0x01); // Bold ON
    pushBytes(GS, 0x21, 0x01);  // Double height
    pushLine(isKu ? '*** پسوولەی گەڕاندنەوە / [مەرتەجەع] ***' : isAr ? '*** REFUND RECEIPT / [مرتجع] ***' : '*** REFUND RECEIPT ***');
    pushBytes(GS, 0x21, 0x00);  // Normal height
    pushBytes(ESC, 0x45, 0x00); // Bold OFF
  }

  if (settings.address) {
    pushLine(settings.address);
  }
  if (settings.phone) {
    pushLine(`${isKu ? 'تەلەفۆن' : isAr ? 'هاتف' : 'Tel'}: ${settings.phone}`);
  }

  pushLine('------------------------------------------------');

  // 4. Invoice Info (Left/Right)
  pushBytes(ESC, 0x61, 0x00); // Left align
  pushLine(`${isKu ? 'ژمارەی پسوولە' : isAr ? 'رقم الوصل' : 'Invoice No'}: #${sale.invoiceNumber}`);
  pushLine(`${isKu ? 'بەروار' : isAr ? 'التاريخ' : 'Date'}: ${formatDisplayDate(sale.timestamp, lang)}    ${isKu ? 'کات' : isAr ? 'الوقت' : 'Time'}: ${formatDisplayTime(sale.timestamp, lang)}`);
  pushLine(`${isKu ? 'کاشێر' : isAr ? 'الكاشير' : 'Cashier'}: ${sale.cashierName}`);

  pushLine('================================================');

  // 5. Items Header
  pushBytes(ESC, 0x45, 0x01); // Bold
  if (isKu) {
    pushLine('کاڵا                       بڕ    نرخ      کۆی گشتی');
  } else if (isAr) {
    pushLine('المادة                     العدد   السعر    الإجمالي');
  } else {
    pushLine('Item                     Qty   Price     Total');
  }
  pushBytes(ESC, 0x45, 0x00); // Bold OFF
  pushLine('------------------------------------------------');

  // 6. Items List
  const items = Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : []);
  items.forEach((item: any) => {
    const saleTypeLabel = item.saleType === 'blister' ? (isKu ? 'شیت' : isAr ? 'شيت' : 'Sheet') : (isKu ? 'باکەت' : isAr ? 'باكت' : 'Box');
    const itemName = isKu ? (item.productNameKu || item.productNameAr || item.productName) : (item.productNameAr || item.productName);
    const nameShort = itemName.substring(0, 18).padEnd(19, ' ');
    const qtyStr = `${saleTypeLabel} ${item.quantity}`.padStart(11, ' ');
    const priceStr = `${formatNumber(item.price)}`.padStart(8, ' ');
    const totalStr = `${formatNumber(item.total)}`.padStart(9, ' ');

    pushLine(nameShort + qtyStr + priceStr + totalStr);
  });

  pushLine('================================================');

  // 7. Totals Summary (Right Align, Bold Net Total)
  pushBytes(ESC, 0x61, 0x02); // Right align
  pushLine(`${isKu ? 'کۆی سەرەتایی' : isAr ? 'المجموع الفرعي' : 'Subtotal'}: ${currency} ${formatNumber(sale.subtotal)}`);

  if (sale.discount > 0) {
    pushLine(`${isKu ? 'داشکاندن' : isAr ? 'الخصم' : 'Discount'}: -${currency} ${formatNumber(sale.discount)}`);
  }

  pushBytes(ESC, 0x45, 0x01); // Bold ON
  pushBytes(GS, 0x21, 0x01);  // Double height
  pushLine(`${isKu ? 'کۆی گشتی و کۆتایی' : isAr ? 'المجموع الصافي' : 'NET TOTAL'}: ${currency} ${formatNumber(sale.total)}`);
  pushBytes(GS, 0x21, 0x00);  // Normal height
  pushBytes(ESC, 0x45, 0x00); // Bold OFF

  if (sale.amountTendered) {
    pushLine(`${isKu ? 'وەرگیراو' : isAr ? 'المسلم' : 'Paid'}: ${currency} ${formatNumber(sale.amountTendered)}`);
    pushLine(`${isKu ? 'ماوە / گەڕاوە' : isAr ? 'الباقي' : 'Change'}: ${currency} ${formatNumber(sale.changeDue || 0)}`);
  }

  pushLine('------------------------------------------------');

  // 8. Footer Message (Center Align)
  pushBytes(ESC, 0x61, 0x01); // Center align
  if (settings.receiptFooterMsg) {
    pushLine(settings.receiptFooterMsg);
  } else {
    pushLine(isKu ? 'سوپاس بۆ سەردانەکەتان! تکایە پسوولەکە بپارێزن' : isAr ? 'شكراً لزيارتكم! نرجو الاحتفاظ بالوصل' : 'Thank you for shopping with us!');
  }
  pushLine('7amo.pos Offline System');

  // 9. Feed & Cut Paper Command
  pushBytes(0x0A, 0x0A, 0x0A); // Feed 3 lines
  pushBytes(GS, 0x56, 0x41, 0x00); // Partial cut paper

  // 10. Open Cash Drawer Kick (ESC p m t1 t2)
  pushBytes(ESC, 0x70, 0x00, 0x19, 0xFF);

  return new Uint8Array(commands);
}

/**
 * Send raw bytes directly to Web Serial Port
 */
export async function sendRawToWebSerialPrinter(buffer: Uint8Array, baudRate = 9600): Promise<void> {
  if (!activeSerialPort) {
    activeSerialPort = await connectWebSerialPrinter(baudRate);
  }

  if (!activeSerialPort || !activeSerialPort.writable) {
    throw new Error('منفذ الطابعة الحرارية غير متصل أو غير قابل للكتّابة.');
  }

  const writer = activeSerialPort.writable.getWriter();
  try {
    await writer.write(buffer);
  } finally {
    writer.releaseLock();
  }
}

/**
 * Silent Direct Thermal Iframe Printer (Browser native silent fallback)
 * Injects complete 80mm cashier receipt styles and preserves barcodes & layout
 */
export function printThermalSilentIframe(printableElementId: string): void {
  const elem = document.getElementById(printableElementId);
  if (!elem) {
    window.print();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Collect page stylesheets so classes like flex, grid, etc. are properly styled
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>طباعة ورق كاشير 80 مم</title>
        ${stylesheets}
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 1mm 1mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Segoe UI', Tahoma, system-ui, -apple-system, sans-serif !important;
            font-size: 9.5px !important;
            line-height: 1.25 !important;
            width: 56mm !important;
            max-width: 56mm !important;
            direction: rtl !important;
          }
          /* Ensure all dark-mode text classes turn into high-contrast black for thermal paper */
          * {
            color: #000000 !important;
            background-color: transparent !important;
            text-shadow: none !important;
            border-color: #333333 !important;
          }
          .bg-white, [class*="bg-white"] {
            background-color: #ffffff !important;
          }
          svg text, text {
            fill: #000000 !important;
          }
          svg rect {
            fill: #000000 !important;
          }
          svg rect[fill="#ffffff"] {
            fill: #ffffff !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            padding: 3px 1px !important;
            color: #000000 !important;
          }
          th {
            border-bottom: 2px solid #000000 !important;
            font-weight: bold !important;
          }
          td {
            border-bottom: 1px dashed #666666 !important;
          }
          .truncate {
            overflow: visible !important;
            white-space: normal !important;
            text-overflow: clip !important;
          }
        </style>
      </head>
      <body>
        <div style="width: 54mm; max-width: 54mm; margin: 0 auto; box-sizing: border-box;">
          ${elem.innerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                if (window.frameElement) window.frameElement.remove();
              }, 800);
            }, 100);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();
}

/**
 * Direct Print 80mm Cashier Receipt for a Sale Transaction
 */
export function print80mmCashierReceipt(sale: SaleTransaction, settings: StoreSettings): void {
  renderSilentIframeReceipt(sale, settings);
}

/**
 * Direct Print Thermal Receipt for a Sale Transaction without opening any popup/modal window
 */
export function printSaleReceiptDirect(sale: SaleTransaction, settings: StoreSettings): void {
  // If active Web Serial thermal printer is open, send raw bytes directly for true 0-click print!
  if (activeSerialPort && activeSerialPort.writable) {
    try {
      const buffer = buildEscPosBuffer(sale, settings);
      sendRawToWebSerialPrinter(buffer).catch(err => {
        console.warn('WebSerial print failed, falling back to silent iframe:', err);
        renderSilentIframeReceipt(sale, settings);
      });
      return;
    } catch (e) {
      console.warn('WebSerial print error:', e);
    }
  }

  renderSilentIframeReceipt(sale, settings);
}

/**
 * Render and trigger print on a hidden iframe formatted specifically for 80mm/58mm thermal cashier paper
 */
function renderSilentIframeReceipt(sale: SaleTransaction, settings: StoreSettings): void {
  const lang = settings.language || 'ar';
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const currency = settings.currencySymbol || (isKu ? 'د.ع' : isAr ? 'د.ع' : 'IQD');
  const storeName = isKu 
    ? (settings.storeNameKu || settings.storeNameAr || settings.storeName)
    : isAr 
    ? (settings.storeNameAr || settings.storeName) 
    : settings.storeName;

  const isRefunded = sale.status === 'refunded';
  const returnedItems = Array.isArray(sale.returnedItems) ? sale.returnedItems : (typeof sale.returnedItems === 'string' ? (JSON.parse(sale.returnedItems || '[]') || []) : []);
  const returnedTotal = returnedItems.reduce((sum: number, r: any) => sum + (Number(r.total) || 0), 0);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const itemsList = Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : []);
  // If transaction is fully refunded, only render the items list once to prevent duplicate rows
  const activeItems = isRefunded ? (itemsList.length > 0 ? itemsList : returnedItems) : itemsList;

  const cleanPaymentLabel = sale.paymentMethod === 'cash' 
    ? (isKu ? 'نەقد (کاش)' : isAr ? 'نقداً (كاش)' : 'Cash')
    : sale.paymentMethod === 'card' 
    ? (isKu ? 'کارت / فیزا' : isAr ? 'بطاقة مصرفية' : 'Card')
    : sale.paymentMethod === 'debt' 
    ? (isKu ? 'قەرز (آجل)' : isAr ? 'آجل (دين)' : 'Credit/Debt')
    : (sale.paymentMethod || (isKu ? 'نەقد' : 'كاش'));

  const defaultFooterMsg = isKu 
    ? (settings.receiptFooterMsg && settings.receiptFooterMsg !== 'البضاعة المباعة ترجع وتستبدل خلال 14 يوماً بشرط الفاتورة.'
        ? settings.receiptFooterMsg 
        : 'کاڵای فرۆشراو دەگەڕێندرێتەوە و دەگۆڕدرێتەوە لە ماوەی ١٤ ڕۆژدا بە مەرجی هێنانی پسوولە.')
    : (settings.receiptFooterMsg || 'البضاعة المباعة ترجع وتستبدل خلال 14 يوماً بشرط إحضار الفاتورة.');

  // Clean barcode SVG without overflow
  const invoiceBarcodeSvg = generateBarcodeSvgString(sale.invoiceNumber, 36, false);

  const is58mm = settings.printerType === 'thermal58mm';
  const pageSize = is58mm ? '58mm auto' : '80mm auto';
  const containerWidth = is58mm ? '48mm' : '72mm';
  const baseFontSize = is58mm ? '9px' : '10px';

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="${isAr || isKu ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8" />
        <title>Receipt #${sale.invoiceNumber}</title>
        <style>
          @page {
            size: ${pageSize};
            margin: 0mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            background: #ffffff;
            color: #000000;
            font-family: 'Times New Roman', Times, serif;
            font-size: ${baseFontSize};
            line-height: 1.2;
            direction: ${isAr || isKu ? 'rtl' : 'ltr'};
          }
          .receipt-box {
            position: relative;
            width: ${containerWidth};
            max-width: ${containerWidth};
            margin: 0 auto;
            padding: 2mm 1.5mm;
            background: #ffffff;
            color: #000000;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 2px;
          }
          .store-name {
            font-size: 16px;
            font-weight: 900;
            color: #000000;
            margin: 0 0 1px 0;
            line-height: 1.15;
            text-transform: uppercase;
          }
          .store-sub {
            font-size: 9.5px;
            font-weight: bold;
            color: #000000;
            line-height: 1.2;
          }
          .refund-badge {
            border: 1px solid #000000;
            color: #000000;
            padding: 1px 4px;
            font-weight: 900;
            font-size: 9.5px;
            margin-bottom: 3px;
            text-align: center;
          }
          .solid-line {
            border-top: 1.5px solid #000000;
            margin: 3px 0;
          }
          .dashed-line {
            border-bottom: 1.5px dashed #000000;
            margin: 3px 0;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9.5px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 1.5px;
          }
          .inv-badge {
            border: 1.5px solid #000000;
            padding: 0.5px 4px;
            font-weight: 900;
            font-size: 10px;
            display: inline-block;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 1.5px solid #000000;
            font-family: 'Times New Roman', Times, serif;
            font-size: 9.5px;
            margin: 3px 0;
            box-sizing: border-box;
          }
          .items-table th {
            border: 1px solid #000000 !important;
            padding: 3px 2px !important;
            font-weight: 900;
            background: #ffffff;
            color: #000000;
            text-align: center;
            box-sizing: border-box;
          }
          .items-table td {
            border: 1px solid #000000 !important;
            padding: 3px 2px !important;
            vertical-align: middle;
            color: #000000;
            box-sizing: border-box;
          }
          .col-name {
            width: 38%;
            text-align: ${isAr || isKu ? 'right' : 'left'};
            font-weight: bold;
            line-height: 1.15;
            word-break: break-word;
          }
          .col-type {
            width: 15%;
            text-align: center;
          }
          .col-qty {
            width: 12%;
            text-align: center;
            font-weight: bold;
          }
          .col-price {
            width: 17%;
            text-align: center;
            font-weight: bold;
            white-space: nowrap;
          }
          .col-total {
            width: 18%;
            text-align: ${isAr || isKu ? 'left' : 'right'};
            font-weight: bold;
            white-space: nowrap;
          }
          .type-pill {
            border: 1px solid #000000;
            border-radius: 2px;
            padding: 0.5px 3px;
            font-size: 8.5px;
            font-weight: bold;
            display: inline-block;
          }
          .totals-card {
            border: 1.5px solid #000000;
            padding: 3px 5px;
            margin: 3px 0;
            font-size: 9.5px;
            font-weight: bold;
            color: #000000;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5px;
          }
          .grand-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            font-weight: 900;
            padding: 1px 0;
          }
          .footer {
            text-align: center;
            padding-top: 2px;
            margin-top: 2px;
            color: #000000;
          }
          .footer-msg {
            font-size: 9.5px;
            font-weight: bold;
            line-height: 1.25;
          }
          .footer-brand {
            font-size: 8.5px;
            color: #000000;
            margin-top: 1px;
            font-weight: bold;
          }
          .num-ltr {
            display: inline-block;
            direction: ltr !important;
            unicode-bidi: embed !important;
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <!-- Header -->
          <div class="header">
            ${(isRefunded || returnedItems.length > 0) ? `
              <div class="refund-badge">
                *** ${isKu ? 'پسوولەی گەڕاندنەوەی کاڵا (مەرتەجەع)' : isAr ? 'وصل إرجاع بضاعة (مرتجع)' : 'REFUND RECEIPT'} ***
              </div>
            ` : ''}
            <div class="store-name">${storeName || '7AMO.POS'}</div>
            <div class="store-sub">
              ${settings.address || (isAr ? 'العراق - بغداد - شارع فلسطين' : isKu ? 'عێراق - بەغداد - شەقامی فەلەستین' : 'Palestine St - Baghdad')}
              ${settings.phone ? ` • <span class="num-ltr" style="font-weight: bold;">${settings.phone}</span>` : ' • <span class="num-ltr" style="font-weight: bold;">+964 770 000 0000</span>'}
            </div>
          </div>

          <!-- Solid Line -->
          <div class="solid-line"></div>

          <!-- Meta Row 1 -->
          <div class="meta-row">
            <div>
              <span class="inv-badge num-ltr">#${sale.invoiceNumber}</span>
              <span style="margin: 0 4px;">•</span>
              <span>${cleanPaymentLabel}</span>
            </div>
            <div class="num-ltr" style="font-weight: bold;">
              ${formatReceiptDateTime(sale.timestamp, lang)}
            </div>
          </div>

          <!-- Meta Row 2 -->
          <div class="meta-row">
            <div>${isKu ? 'کاشێر:' : isAr ? 'الكاشير:' : 'Cashier:'} ${sale.cashierName || 'Admin'}</div>
            <div>
              ${isRefunded 
                ? (isKu ? 'گەڕاوەتەوە بەتەواوی' : isAr ? 'مرتجع بالكامل' : 'Refunded')
                : sale.paymentMethod === 'debt'
                ? (isKu ? 'قەرز (نەدراوە)' : isAr ? 'آجل / غير مسدد' : 'Credit')
                : (isKu ? 'دراوە بە تەواوی' : isAr ? 'مدفوع بالكامل' : 'Paid')}
            </div>
          </div>
          ${sale.customerName ? `
          <div class="meta-row">
            <div>${isKu ? 'موشتەری:' : isAr ? 'الزبون:' : 'Customer:'} ${sale.customerName}</div>
          </div>` : ''}

          <!-- Dashed Line -->
          <div class="dashed-line"></div>

          <!-- Items Table with Crisp Black Grid Borders -->
          <table class="items-table">
            <colgroup>
              <col style="width: 38%;">
              <col style="width: 15%;">
              <col style="width: 12%;">
              <col style="width: 17%;">
              <col style="width: 18%;">
            </colgroup>
            <thead>
              <tr>
                <th class="col-name">${isKu ? 'کاڵا' : isAr ? 'المادة' : 'Item'}</th>
                <th class="col-type">${isKu ? 'جۆر' : isAr ? 'النوع' : 'Type'}</th>
                <th class="col-qty">${isKu ? 'بڕ' : isAr ? 'العدد' : 'Qty'}</th>
                <th class="col-price">${isKu ? 'نرخ' : isAr ? 'السعر' : 'Price'}</th>
                <th class="col-total">${isKu ? 'کۆی گشتی' : isAr ? 'الإجمالي' : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              ${activeItems.map((item: any) => {
                const itemName = isKu ? (item.productNameKu || item.productNameAr || item.productName) : (item.productNameAr || item.productName);
                const saleTypeLabel = item.saleType === 'blister' 
                  ? (isKu ? 'شیت' : isAr ? 'شيت' : 'Sheet') 
                  : (isKu ? 'باکەت' : isAr ? 'باكت' : 'Box');
                return `
                  <tr>
                    <td class="col-name">
                      <div>${itemName}</div>
                      ${item.dosageInstruction ? `<div style="font-size: 8px; font-weight: normal; font-style: italic;">💊 ${item.dosageInstruction}</div>` : ''}
                    </td>
                    <td class="col-type"><span class="type-pill">${saleTypeLabel}</span></td>
                    <td class="col-qty"><span class="num-ltr">${item.quantity}</span></td>
                    <td class="col-price"><span class="num-ltr">${formatNumber(item.price)}</span></td>
                    <td class="col-total"><span class="num-ltr">${isRefunded ? '-' : ''}${formatNumber(Math.abs(item.total))}</span></td>
                  </tr>
                `;
              }).join('')}

              ${(!isRefunded && returnedItems.length > 0 && returnedTotal > 0) ? `
                <tr>
                  <td colspan="5" style="text-align: center; font-weight: bold; border: 1px solid #000; padding: 2px 0;">
                    *** ${isKu ? 'داشکاندنی کاڵا گەڕاوەکان' : isAr ? 'المواد المرتجعة المستردة' : 'Returned Items'} ***
                  </td>
                </tr>
                ${returnedItems.map((ret: any) => {
                  const retName = isKu ? (ret.productNameKu || ret.productNameAr || ret.productName) : (ret.productNameAr || ret.productName);
                  const retSaleType = ret.saleType === 'blister' 
                    ? (isKu ? 'شیت' : isAr ? 'شيت' : 'Sheet') 
                    : (isKu ? 'باکەت' : isAr ? 'باكت' : 'Box');
                  return `
                    <tr>
                      <td class="col-name">[${isKu ? 'گەڕاوە' : isAr ? 'مرتجع' : 'Ret'}] ${retName}</td>
                      <td class="col-type"><span class="type-pill">${retSaleType}</span></td>
                      <td class="col-qty"><span class="num-ltr">${ret.quantity}</span></td>
                      <td class="col-price"><span class="num-ltr">${formatNumber(ret.price || (ret.total / ret.quantity))}</span></td>
                      <td class="col-total"><span class="num-ltr">-${formatNumber(ret.total)}</span></td>
                    </tr>
                  `;
                }).join('')}
              ` : ''}
            </tbody>
          </table>

          <!-- Totals Box with Crisp 1.5px Solid Border -->
          <div class="totals-card">
            <div class="totals-row">
              <span>${isKu ? 'کۆی سەرەتایی:' : isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
              <span class="num-ltr font-bold">${formatNumber(Math.abs(sale.subtotal))} ${currency}</span>
            </div>
            ${(!isRefunded && returnedTotal > 0) ? `
            <div class="totals-row">
              <span>${isKu ? 'داشکاندنی گەڕاوە:' : isAr ? 'خصم المرجوع:' : 'Refunds:'}</span>
              <span class="num-ltr font-bold">-${formatNumber(returnedTotal)} ${currency}</span>
            </div>` : ''}
            ${sale.discount > 0 ? `
            <div class="totals-row">
              <span>${isKu ? 'داشکاندن:' : isAr ? 'الخصم الممنوح:' : 'Discount:'}</span>
              <span class="num-ltr font-bold">-${formatNumber(sale.discount)} ${currency}</span>
            </div>` : ''}
            ${sale.tax > 0 ? `
            <div class="totals-row">
              <span>${isKu ? 'باج / خزمەتگوزاری:' : isAr ? 'الضريبة / الخدمة:' : 'Tax:'}</span>
              <span class="num-ltr font-bold">${formatNumber(sale.tax)} ${currency}</span>
            </div>` : ''}
            
            <div class="dashed-line"></div>

            <div class="grand-total-row">
              <span>${isKu ? 'کۆی گشتی و کۆتایی:' : isAr ? 'الصافي النهائي:' : 'GRAND TOTAL:'}</span>
              <span class="num-ltr" style="font-size: 13px; font-weight: 900;">${sale.total < 0 ? '-' : ''}${formatNumber(Math.abs(sale.total))} ${currency}</span>
            </div>

            <div class="dashed-line"></div>

            <div class="totals-row" style="font-size: 9px; margin-top: 1px;">
              <span>
                ${isKu ? 'وەرگیراو:' : isAr ? 'المستلم:' : 'Tendered:'} 
                <span class="num-ltr" style="font-weight: bold;">${formatNumber(sale.amountTendered || sale.total)} ${currency}</span>
              </span>
              <span>
                ${isKu ? 'ماوە:' : isAr ? 'الباقي:' : 'Change:'} 
                <span class="num-ltr" style="font-weight: bold;">${formatNumber(sale.changeDue || 0)} ${currency}</span>
              </span>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-msg">${defaultFooterMsg}</div>
            <div class="footer-brand">7AMO.POS • Pharmacy POS</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                if (window.frameElement) window.frameElement.remove();
              }, 1000);
            }, 80);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();
}

