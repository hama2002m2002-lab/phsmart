// Web Serial ESC/POS Direct Thermal Printer Integration Library
// Supports direct raw printing to USB / COM / Serial Thermal POS Printers (Epson, Xprinter, Rongta, POS-58, POS-80)

import { SaleTransaction, StoreSettings } from '../types';
import { formatNumber } from './formatUtils';

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
        product: {
          id: 'test-item',
          name: 'Test Item',
          nameAr: 'مادة اختبار',
          barcode: '123456',
          price: 1000,
          cost: 800,
          stock: 10,
          category: 'Test',
          unit: 'pcs',
          updatedAt: Date.now()
        },
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
  pushLine(`${isKu ? 'ژمارەی پسوولە' : isAr ? 'رقم الوصل' : 'Invoice No'}: ${sale.invoiceNumber}`);
  pushLine(`${isKu ? 'بەروار و کات' : isAr ? 'التاريخ والوقت' : 'Date'}: ${sale.timestamp}`);
  pushLine(`${isKu ? 'کاشێر' : isAr ? 'الكاشير' : 'Cashier'}: ${sale.cashierName}`);
  if (sale.customerName) {
    pushLine(`${isKu ? 'کڕیار' : isAr ? 'الزبون' : 'Customer'}: ${sale.customerName}`);
  }

  pushLine('================================================');

  // 5. Items Header
  pushBytes(ESC, 0x45, 0x01); // Bold
  if (isKu) {
    pushLine('کاڵا (جۆر)                 بڕ    نرخ      کۆی گشتی');
  } else if (isAr) {
    pushLine('المادة (النوع)             العدد   السعر    الإجمالي');
  } else {
    pushLine('Item (Type)              Qty   Price     Total');
  }
  pushBytes(ESC, 0x45, 0x00); // Bold OFF
  pushLine('------------------------------------------------');

  // 6. Items List
  const items = Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : []);
  items.forEach((item: any) => {
    const itemName = isKu ? (item.productNameKu || item.productNameAr || item.productName) : (item.productNameAr || item.productName);
    const saleTypeTag = item.saleType === 'carton' 
      ? (isKu ? '[کارتۆن]' : isAr ? '[كرتون]' : '[Carton]')
      : item.saleType === 'wholesale'
      ? (isKu ? '[کۆ]' : isAr ? '[جملة]' : '[Wholesale]')
      : item.saleType === 'blister'
      ? (isKu ? '[شریت]' : isAr ? '[شريط]' : '[Strip]')
      : (isKu ? '[تاک]' : isAr ? '[مفرد]' : '[Piece]');

    const fullNameWithTag = `${itemName} ${saleTypeTag}`;
    const nameShort = fullNameWithTag.substring(0, 22).padEnd(24, ' ');
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
  if (sale.tax > 0) {
    pushLine(`${isKu ? 'باج' : isAr ? 'الضريبة' : 'Tax'} (${settings.taxRate}%): ${currency} ${formatNumber(sale.tax)}`);
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

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Thermal Print</title>
        <style>
          @page { size: auto; margin: 0mm; }
          body {
            font-family: monospace;
            padding: 4px;
            margin: 0;
            color: #000;
            background: #fff;
          }
          * { box-sizing: border-box; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 2px 0; }
        </style>
      </head>
      <body>
        ${elem.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.frameElement.remove();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();
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
 * Render and trigger print on a hidden iframe
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

  const itemsRows = itemsList.map((item: any) => {
    const itemName = isKu ? (item.productNameKu || item.productNameAr || item.productName) : (item.productNameAr || item.productName);
    const saleTypeLabel = item.saleType === 'carton' 
      ? (isKu ? 'کارتۆن' : isAr ? 'كرتون' : 'Carton')
      : item.saleType === 'wholesale'
      ? (isKu ? 'کۆ' : isAr ? 'جملة' : 'Wholesale')
      : item.saleType === 'blister'
      ? (isKu ? 'شریت' : isAr ? 'شريط' : 'Strip')
      : (isKu ? 'تاک' : isAr ? 'مفرد' : 'Unit');

    return `
      <tr style="border-bottom: 1px dashed #ccc;">
        <td style="padding: 5px 0; font-size: 11px; text-align: ${isAr || isKu ? 'right' : 'left'};">
          <div style="font-weight: bold; color: #000;">${itemName}</div>
          <div style="font-size: 9px; color: #333; margin-top: 1px;">
            <span style="display: inline-block; background: #eee; padding: 1px 4px; border-radius: 3px; font-weight: bold;">
              ${saleTypeLabel}
            </span>
            ${item.dosageInstruction ? `<span style="margin-inline-start: 4px; font-style: italic;">💊 ${item.dosageInstruction}</span>` : ''}
          </div>
        </td>
        <td style="padding: 5px 0; text-align: center; font-size: 11px; font-weight: bold; font-family: monospace;">${item.quantity}</td>
        <td style="padding: 5px 0; text-align: ${isAr || isKu ? 'left' : 'right'}; font-size: 11px; font-family: monospace;">${currency}${formatNumber(item.price)}</td>
        <td style="padding: 5px 0; text-align: ${isAr || isKu ? 'left' : 'right'}; font-size: 11px; font-weight: bold; font-family: monospace;">${currency}${formatNumber(item.total)}</td>
      </tr>
    `;
  }).join('');

  const returnedRows = returnedItems.map((ret: any) => {
    const retName = isKu ? (ret.productNameKu || ret.productNameAr || ret.productName) : (ret.productNameAr || ret.productName);
    return `
      <tr style="border-bottom: 1px dashed #e57373; color: #b71c1c;">
        <td style="padding: 3px 0; font-size: 10px; font-weight: bold;">[مرتجع/گەڕاوە] ${retName}</td>
        <td style="padding: 3px 0; text-align: center; font-size: 10px; font-family: monospace;">${ret.quantity}</td>
        <td style="padding: 3px 0; text-align: right; font-size: 10px; font-family: monospace;" colspan="2">-${currency}${formatNumber(ret.total)}</td>
      </tr>
    `;
  }).join('');

  const paymentLabel = sale.paymentMethod === 'cash' 
    ? (isKu ? 'نەقد (کاش) 💵' : isAr ? 'نقداً 💵' : 'Cash 💵')
    : sale.paymentMethod === 'card' 
    ? (isKu ? 'کارت / فیزا 💳' : isAr ? 'بطاقة 💳' : 'Card 💳')
    : sale.paymentMethod === 'debt' 
    ? (isKu ? 'قەرز 📋' : isAr ? 'آجل (دين) 📋' : 'Debt 📋')
    : (sale.paymentMethod || 'NFC');

  const defaultFooterMsg = isKu 
    ? 'سوپاس بۆ سەردانەکەتان! تکایە پسوولەکە بپارێزن' 
    : isAr 
    ? 'شكراً لزيارتكم! نرجو الاحتفاظ بالوصل' 
    : 'Thank you for your visit!';

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="${isAr || isKu ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8" />
        <title>Receipt #${sale.invoiceNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: 'Segoe UI', Tahoma, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            width: 76mm;
            margin: 0 auto;
            padding: 6px;
            color: #000;
            background: #fff;
            font-size: 11px;
            direction: ${isAr || isKu ? 'rtl' : 'ltr'};
            line-height: 1.35;
          }
          * { box-sizing: border-box; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
          .title { font-size: 16px; font-weight: 900; margin: 0; text-transform: uppercase; }
          .subtitle { font-size: 10px; margin-top: 2px; color: #222; }
          .refund-banner { background: #fee2e2; border: 2px solid #ef4444; color: #b91c1c; font-weight: bold; text-align: center; padding: 4px; margin: 4px 0; border-radius: 4px; font-size: 11px; }
          .meta { font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
          th { border-bottom: 1.5px solid #000; padding: 4px 0; font-size: 10px; text-align: ${isAr || isKu ? 'right' : 'left'}; font-weight: bold; }
          .totals { border-top: 2px dashed #000; padding-top: 5px; font-size: 11px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 2.5px; }
          .grand-total { font-size: 15px; font-weight: 900; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 4px 0; margin: 4px 0; }
          .footer { text-align: center; font-size: 10px; margin-top: 8px; border-top: 1px dashed #777; padding-top: 6px; }
          .font-mono { font-family: monospace, Courier, monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          ${(isRefunded || returnedItems.length > 0) ? `<div class="refund-banner">🔴 ${isKu ? 'پسوولەی گەڕاندنەوەی کاڵا (مەرتەجەع)' : isAr ? 'وصل إرجاع مواد (مرتجع)' : 'REFUND RECEIPT'} 🔴</div>` : ''}
          <div class="title">${storeName}</div>
          ${settings.address ? `<div class="subtitle">${settings.address}</div>` : ''}
          ${settings.phone ? `<div class="subtitle">${isKu ? 'تەلەفۆن' : isAr ? 'هاتف' : 'Tel'}: ${settings.phone}</div>` : ''}
        </div>

        <div class="meta">
          <div class="meta-row"><span>${isKu ? 'ژمارەی پسوولە:' : isAr ? 'رقم الوصل:' : 'Invoice No:'}</span><strong class="font-mono">#${sale.invoiceNumber}</strong></div>
          <div class="meta-row"><span>${isKu ? 'بەروار و کات:' : isAr ? 'التاريخ والوقت:' : 'Date/Time:'}</span><span class="font-mono">${sale.timestamp}</span></div>
          <div class="meta-row"><span>${isKu ? 'کڕیار:' : isAr ? 'الزبون:' : 'Customer:'}</span><span>${sale.customerName || (isKu ? 'کڕیاری گشتی' : isAr ? 'زبون عام' : 'General')}</span></div>
          <div class="meta-row"><span>${isKu ? 'کاشێر:' : isAr ? 'الكاشير:' : 'Cashier:'}</span><span>${sale.cashierName}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 48%;">${isKu ? 'کاڵا (جۆری فرۆشتن)' : isAr ? 'المادة (نوع البيع)' : 'Item (Sale Type)'}</th>
              <th style="width: 14%; text-align: center;">${isKu ? 'بڕ' : isAr ? 'العدد' : 'Qty'}</th>
              <th style="width: 18%; text-align: ${isAr || isKu ? 'left' : 'right'};">${isKu ? 'نرخ' : isAr ? 'السعر' : 'Price'}</th>
              <th style="width: 20%; text-align: ${isAr || isKu ? 'left' : 'right'};">${isKu ? 'کۆی گشتی' : isAr ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            ${returnedRows}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row"><span>${isKu ? 'کۆی سەرەتایی:' : isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span><span class="font-mono">${currency}${formatNumber(sale.subtotal)}</span></div>
          ${returnedTotal > 0 ? `<div class="total-row" style="color: #b71c1c;"><span>${isKu ? 'داشکاندنی گەڕاوە:' : isAr ? 'خصم المرجوع:' : 'Refunds:'}</span><span class="font-mono">-${currency}${formatNumber(returnedTotal)}</span></div>` : ''}
          ${sale.discount > 0 ? `<div class="total-row" style="color: #c2410c;"><span>${isKu ? 'داشکاندن:' : isAr ? 'الخصم الممنوح:' : 'Discount:'}</span><span class="font-mono">-${currency}${formatNumber(sale.discount)}</span></div>` : ''}
          ${sale.tax > 0 ? `<div class="total-row"><span>${isKu ? 'باج' : isAr ? 'الضريبة' : 'Tax'} (${settings.taxRate}%):</span><span class="font-mono">${currency}${formatNumber(sale.tax)}</span></div>` : ''}
          
          <div class="total-row grand-total">
            <span>${isKu ? 'کۆی گشتی و کۆتایی:' : isAr ? 'المجموع الصافي النهائي:' : 'GRAND TOTAL:'}</span>
            <span class="font-mono">${currency}${formatNumber(sale.total)}</span>
          </div>

          <div class="total-row"><span>${isKu ? 'شێوازی پارەدان:' : isAr ? 'طريقة الدفع:' : 'Payment:'}</span><span>${paymentLabel}</span></div>
          ${sale.amountTendered > 0 ? `<div class="total-row"><span>${isKu ? 'پارەی وەرگیراو:' : isAr ? 'المسلم من الزبون:' : 'Tendered:'}</span><span class="font-mono">${currency}${formatNumber(sale.amountTendered)}</span></div>` : ''}
          ${sale.changeDue > 0 ? `<div class="total-row"><span>${isKu ? 'ماوە / گەڕاوە:' : isAr ? 'الباقي:' : 'Change Due:'}</span><span class="font-mono">${currency}${formatNumber(sale.changeDue)}</span></div>` : ''}
        </div>

        <div class="footer">
          <div>${settings.receiptFooterMsg || defaultFooterMsg}</div>
          <div style="font-size: 8px; color: #666; margin-top: 3px;">7amo.pos Offline System</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              if (window.frameElement) window.frameElement.remove();
            }, 600);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();
}

