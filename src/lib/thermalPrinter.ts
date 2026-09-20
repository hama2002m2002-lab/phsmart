// Web Serial ESC/POS Direct Thermal Printer Integration Library
// Supports direct raw printing to USB / COM / Serial Thermal POS Printers (Epson, Xprinter, Rongta, POS-58, POS-80)

import { SaleTransaction, StoreSettings } from '../types';
import { formatNumber } from './formatUtils';
import { generateBarcodeSvgString } from './barcodeUtils';
import { formatDisplayDateTime, formatDisplayDate, formatDisplayTime } from './dateUtils';

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
    const itemName = isKu ? (item.productNameKu || item.productNameAr || item.productName) : (item.productNameAr || item.productName);
    const nameShort = itemName.substring(0, 24).padEnd(25, ' ');
    const qtyStr = `${item.quantity}`.padStart(5, ' ');
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
  const containerWidth = is58mm ? '44mm' : '56mm';
  const baseFontSize = is58mm ? '8.5px' : '9px';

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
            font-family: 'Segoe UI', Tahoma, -apple-system, Arial, sans-serif;
            font-size: ${baseFontSize};
            line-height: 1.25;
            direction: ${isAr || isKu ? 'rtl' : 'ltr'};
          }
          .receipt-box {
            width: ${containerWidth};
            max-width: ${containerWidth};
            margin: 0 auto;
            padding: 1mm 0.2mm;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 3px;
            margin-bottom: 4px;
          }
          .store-name {
            font-size: 13px;
            font-weight: 900;
            margin: 1px 0;
            line-height: 1.15;
          }
          .store-sub {
            font-size: 8.5px;
            font-weight: 600;
            margin-top: 1px;
            color: #111;
          }
          .refund-badge {
            border: 1px solid #000;
            padding: 2px 3px;
            font-weight: 900;
            font-size: 9.5px;
            margin-bottom: 3px;
            text-align: center;
            background: #ffffff;
            color: #000000;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 3px;
            font-size: 9px;
          }
          .meta-table td {
            padding: 1px 0;
            vertical-align: top;
          }
          .meta-label {
            width: 38%;
            text-align: ${isAr || isKu ? 'right' : 'left'};
            font-weight: bold;
            color: #222;
          }
          .meta-val {
            width: 62%;
            text-align: ${isAr || isKu ? 'left' : 'right'};
            font-weight: 700;
          }
          .divider-solid {
            border-bottom: 1px solid #000;
            margin: 3px 0;
          }
          .divider-dashed {
            border-bottom: 1px dashed #000;
            margin: 3px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 3px;
            table-layout: fixed;
          }
          .items-table th {
            border-bottom: 1px solid #000;
            padding: 2px 1px;
            font-size: 8.5px;
            font-weight: 900;
            color: #000;
          }
          .items-table td {
            padding: 2px 1px;
            border-bottom: 1px dashed #aaa;
            vertical-align: top;
            font-size: 9px;
          }
          .col-name {
            width: 46%;
            text-align: ${isAr || isKu ? 'right' : 'left'};
            word-break: break-word;
          }
          .col-qty {
            width: 13%;
            text-align: center;
            font-weight: bold;
            font-family: monospace, sans-serif;
          }
          .col-price {
            width: 19%;
            text-align: center;
            font-family: monospace, sans-serif;
            font-size: 8.5px;
          }
          .col-total {
            width: 22%;
            text-align: ${isAr || isKu ? 'left' : 'right'};
            font-weight: bold;
            font-family: monospace, sans-serif;
          }
          .item-title {
            font-weight: 800;
            font-size: 9.5px;
            line-height: 1.2;
            color: #000;
          }
          .item-sub {
            font-size: 8px;
            margin-top: 1px;
            color: #222;
          }
          .ret-header-cell {
            text-align: center;
            font-weight: 900;
            font-size: 8.5px;
            padding: 2px 0 !important;
            border-bottom: 1px solid #000 !important;
            background: #f0f0f0;
          }
          .totals-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 2px;
            font-size: 9px;
          }
          .totals-table td {
            padding: 1.5px 0;
            vertical-align: middle;
          }
          .tot-label {
            text-align: ${isAr || isKu ? 'right' : 'left'};
            font-weight: 600;
            color: #111;
          }
          .tot-val {
            text-align: ${isAr || isKu ? 'left' : 'right'};
            font-family: monospace, sans-serif;
            font-weight: 700;
          }
          .grand-row td {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 0;
          }
          .grand-label {
            font-size: 11px;
            font-weight: 900;
            color: #000;
          }
          .grand-val {
            font-size: 11px;
            font-weight: 900;
            color: #000;
          }
          .footer {
            text-align: center;
            border-top: 1px dashed #000;
            padding-top: 3px;
            margin-top: 4px;
          }
          .footer-msg {
            font-size: 8.5px;
            font-weight: 600;
            line-height: 1.3;
            color: #111;
          }
          .footer-brand {
            font-size: 7.5px;
            color: #555;
            margin-top: 2px;
            font-weight: 600;
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
            <div class="store-name">${storeName}</div>
            ${settings.address ? `<div class="store-sub">${settings.address}</div>` : ''}
            ${settings.phone ? `<div class="store-sub">${isKu ? 'تەلەفۆن' : isAr ? 'هاتف' : 'Tel'}: <span class="num-ltr">${settings.phone}</span></div>` : ''}
          </div>

          <!-- Metadata -->
          <table class="meta-table">
            <tr>
              <td class="meta-label">${isKu ? 'ژمارەی پسوولە:' : isAr ? 'رقم الوصل:' : 'Invoice No:'}</td>
              <td class="meta-val"><span class="num-ltr" style="font-weight: 900; font-size: 10.5px;">#${sale.invoiceNumber}</span></td>
            </tr>
            <tr>
              <td style="width: 50%; text-align: ${isAr || isKu ? 'right' : 'left'}; font-weight: bold;">
                ${isKu ? 'بەروار:' : isAr ? 'التاريخ:' : 'Date:'} <span class="num-ltr" style="font-weight: normal;">${formatDisplayDate(sale.timestamp, lang)}</span>
              </td>
              <td style="width: 50%; text-align: ${isAr || isKu ? 'left' : 'right'}; font-weight: bold;">
                ${isKu ? 'کات:' : isAr ? 'الوقت:' : 'Time:'} <span class="num-ltr" style="font-weight: normal;">${formatDisplayTime(sale.timestamp, lang)}</span>
              </td>
            </tr>
            <tr>
              <td class="meta-label">${isKu ? 'کاشێر:' : isAr ? 'الكاشير:' : 'Cashier:'}</td>
              <td class="meta-val"><span dir="auto">${sale.cashierName || '-'}</span></td>
            </tr>
            <tr>
              <td class="meta-label">${isKu ? 'شێوازی پارەدان:' : isAr ? 'طريقة الدفع:' : 'Payment:'}</td>
              <td class="meta-val">${cleanPaymentLabel}</td>
            </tr>
          </table>

          <div class="divider-solid"></div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th class="col-name">${isKu ? (isRefunded ? 'کاڵای گەڕاوە' : 'کاڵا') : isAr ? (isRefunded ? 'المادة المرتجعة' : 'المادة') : 'Item'}</th>
                <th class="col-qty">${isKu ? 'بڕ' : isAr ? 'العدد' : 'Qty'}</th>
                <th class="col-price">${isKu ? 'نرخ' : isAr ? 'السعر' : 'Price'}</th>
                <th class="col-total">${isKu ? 'کۆی گشتی' : isAr ? 'الإجمالي' : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              ${activeItems.map((item: any, idx: number) => {
                const itemName = isKu ? (item.productNameKu || item.productNameAr || item.productName) : (item.productNameAr || item.productName);
                return `
                  <tr>
                    <td class="col-name">
                      <div class="item-title">${idx + 1}. ${itemName}</div>
                      ${item.dosageInstruction ? `<div class="item-sub" style="font-style: italic;">• ${item.dosageInstruction}</div>` : ''}
                    </td>
                    <td class="col-qty">${item.quantity}</td>
                    <td class="col-price"><span class="num-ltr">${formatNumber(item.price)}</span></td>
                    <td class="col-total"><span class="num-ltr">${isRefunded ? '-' : ''}${formatNumber(Math.abs(item.total))} ${currency}</span></td>
                  </tr>
                `;
              }).join('')}

              ${(!isRefunded && returnedItems.length > 0 && returnedTotal > 0) ? `
                <tr>
                  <td colspan="4" class="ret-header-cell">*** ${isKu ? 'داشکاندنی کاڵا گەڕاوەکان' : isAr ? 'المواد المرتجعة المستردة' : 'Returned Items'} ***</td>
                </tr>
                ${returnedItems.map((ret: any) => {
                  const retName = isKu ? (ret.productNameKu || ret.productNameAr || ret.productName) : (ret.productNameAr || ret.productName);
                  return `
                    <tr>
                      <td class="col-name">
                        <div class="item-title">[${isKu ? 'گەڕاوە' : isAr ? 'مرتجع' : 'Returned'}] ${retName}</div>
                      </td>
                      <td class="col-qty">${ret.quantity}</td>
                      <td class="col-price"><span class="num-ltr">${formatNumber(ret.price || (ret.total / ret.quantity))}</span></td>
                      <td class="col-total"><span class="num-ltr">-${formatNumber(ret.total)} ${currency}</span></td>
                    </tr>
                  `;
                }).join('')}
              ` : ''}
            </tbody>
          </table>

          <div class="divider-dashed"></div>

          <!-- Totals -->
          <table class="totals-table">
            <tr>
              <td class="tot-label">${isKu ? 'کۆی سەرەتایی:' : isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</td>
              <td class="tot-val"><span class="num-ltr">${formatNumber(Math.abs(sale.subtotal))} ${currency}</span></td>
            </tr>
            ${(!isRefunded && returnedTotal > 0) ? `
            <tr>
              <td class="tot-label">${isKu ? 'داشکاندنی گەڕاوە:' : isAr ? 'خصم المرجوع:' : 'Refunds:'}</td>
              <td class="tot-val"><span class="num-ltr">-${formatNumber(returnedTotal)} ${currency}</span></td>
            </tr>` : ''}
            ${sale.discount > 0 ? `
            <tr>
              <td class="tot-label">${isKu ? 'داشکاندنی گشتی:' : isAr ? 'الخصم الممنوح:' : 'Discount:'}</td>
              <td class="tot-val"><span class="num-ltr">-${formatNumber(sale.discount)} ${currency}</span></td>
            </tr>` : ''}
            
            <tr class="grand-row">
              <td class="grand-label">${isKu ? 'کۆی گشتی و کۆتایی:' : isAr ? 'المجموع الصافي النهائي:' : 'GRAND TOTAL:'}</td>
              <td class="grand-val"><span class="num-ltr">${sale.total < 0 ? '-' : ''}${formatNumber(Math.abs(sale.total))} ${currency}</span></td>
            </tr>

            ${sale.amountTendered > 0 ? `
            <tr>
              <td class="tot-label">${isKu ? 'پارەی وەرگیراو:' : isAr ? 'المسلم من الزبون:' : 'Tendered:'}</td>
              <td class="tot-val"><span class="num-ltr">${formatNumber(sale.amountTendered)} ${currency}</span></td>
            </tr>` : ''}
            ${sale.changeDue > 0 ? `
            <tr>
              <td class="tot-label">${isKu ? 'ماوە / گەڕاوە:' : isAr ? 'الباقي للمشتري:' : 'Change Due:'}</td>
              <td class="tot-val"><span class="num-ltr">${formatNumber(sale.changeDue)} ${currency}</span></td>
            </tr>` : ''}
          </table>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-msg">${defaultFooterMsg}</div>
            <div class="footer-brand">7AMO.POS • Pharmacy POS System</div>
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

