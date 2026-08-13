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
  const isAr = settings.language === 'ar';
  const storeName = isAr ? settings.storeNameAr || settings.storeName : settings.storeName;
  const currency = settings.currencySymbol || 'د.ع';

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

  // 2. Select Character Code Table (CP864 for Arabic or UTF-8)
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
    pushLine('*** REFUND RECEIPT / [مرتجع] ***');
    pushBytes(GS, 0x21, 0x00);  // Normal height
    pushBytes(ESC, 0x45, 0x00); // Bold OFF
  }

  if (settings.address) {
    pushLine(settings.address);
  }
  if (settings.phone) {
    pushLine(`Tel: ${settings.phone}`);
  }

  pushLine('------------------------------------------------');

  // 4. Invoice Info (Left/Right)
  pushBytes(ESC, 0x61, 0x00); // Left align
  pushLine(`Invoice No: ${sale.invoiceNumber}`);
  pushLine(`Date: ${new Date(sale.timestamp).toLocaleString(isAr ? 'ar-IQ' : 'en-US')}`);
  pushLine(`Cashier: ${sale.cashierName}`);
  if (sale.customerName) {
    pushLine(`Customer: ${sale.customerName}`);
  }

  pushLine('================================================');

  // 5. Items Header
  pushBytes(ESC, 0x45, 0x01); // Bold
  pushLine('Item                     Qty   Price     Total');
  pushBytes(ESC, 0x45, 0x00); // Bold OFF
  pushLine('------------------------------------------------');

  // 6. Items List
  const items = Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : []);
  items.forEach((item: any) => {
    const itemName = item.productNameAr || item.productName;
    const nameShort = itemName.substring(0, 22).padEnd(24, ' ');
    const qtyStr = `${item.quantity}`.padStart(5, ' ');
    const priceStr = `${formatNumber(item.price)}`.padStart(8, ' ');
    const totalStr = `${formatNumber(item.total)}`.padStart(9, ' ');

    pushLine(nameShort + qtyStr + priceStr + totalStr);
  });

  pushLine('================================================');

  // 7. Totals Summary (Right Align, Bold Net Total)
  pushBytes(ESC, 0x61, 0x02); // Right align
  pushLine(`Subtotal: ${currency} ${formatNumber(sale.subtotal)}`);

  if (sale.discount > 0) {
    pushLine(`Discount: -${currency} ${formatNumber(sale.discount)}`);
  }
  if (sale.tax > 0) {
    pushLine(`Tax (${settings.taxRate}%): ${currency} ${formatNumber(sale.tax)}`);
  }

  pushBytes(ESC, 0x45, 0x01); // Bold ON
  pushBytes(GS, 0x21, 0x01);  // Double height
  pushLine(`NET TOTAL: ${currency} ${formatNumber(sale.total)}`);
  pushBytes(GS, 0x21, 0x00);  // Normal height
  pushBytes(ESC, 0x45, 0x00); // Bold OFF

  if (sale.amountTendered) {
    pushLine(`Paid: ${currency} ${formatNumber(sale.amountTendered)}`);
    pushLine(`Change: ${currency} ${formatNumber(sale.changeDue || 0)}`);
  }

  pushLine('------------------------------------------------');

  // 8. Footer Message (Center Align)
  pushBytes(ESC, 0x61, 0x01); // Center align
  if (settings.receiptFooterMsg) {
    pushLine(settings.receiptFooterMsg);
  } else {
    pushLine('Thank you for shopping with us!');
  }
  pushLine('Powered by 7amo.pos Offline');

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
  const isAr = settings.language === 'ar';
  const currency = settings.currencySymbol || 'د.ع';
  const storeName = isAr ? settings.storeNameAr || settings.storeName : settings.storeName;

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

  const itemsRows = (sale.items || []).map(item => `
    <tr>
      <td style="padding: 4px 0; font-size: 11px; font-weight: bold;">${item.productNameAr || item.productName}</td>
      <td style="padding: 4px 0; text-align: center; font-size: 11px;">${item.quantity}</td>
      <td style="padding: 4px 0; text-align: right; font-size: 11px;">${currency}${formatNumber(item.price)}</td>
      <td style="padding: 4px 0; text-align: right; font-size: 11px; font-weight: bold;">${currency}${formatNumber(item.total)}</td>
    </tr>
  `).join('');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="${isAr ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${sale.invoiceNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            width: 78mm;
            margin: 0 auto;
            padding: 8px;
            color: #000;
            background: #fff;
            font-size: 11px;
            direction: ${isAr ? 'rtl' : 'ltr'};
          }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
          .title { font-size: 16px; font-weight: 900; margin: 0; }
          .subtitle { font-size: 10px; margin-top: 2px; }
          .meta { font-size: 10px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
          th { border-bottom: 1px solid #000; padding: 4px 0; font-size: 10px; text-align: ${isAr ? 'right' : 'left'}; }
          .totals { border-top: 2px dashed #000; padding-top: 6px; font-size: 11px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .grand-total { font-size: 15px; font-weight: 900; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin: 4px 0; }
          .footer { text-align: center; font-size: 10px; margin-top: 8px; border-top: 1px solid #eee; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${storeName}</div>
          ${settings.address ? `<div class="subtitle">${settings.address}</div>` : ''}
          ${settings.phone ? `<div class="subtitle">هاتف: ${settings.phone}</div>` : ''}
        </div>

        <div class="meta">
          <div class="meta-row"><span>رقم الوصل:</span><strong>${sale.invoiceNumber}</strong></div>
          <div class="meta-row"><span>التاريخ والوقت:</span><span>${sale.timestamp}</span></div>
          <div class="meta-row"><span>الزبون:</span><span>${sale.customerName || 'زبون عام'}</span></div>
          <div class="meta-row"><span>الكاشير:</span><span>${sale.cashierName}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>المادة</th>
              <th style="text-align: center;">العدد</th>
              <th style="text-align: right;">السعر</th>
              <th style="text-align: right;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row"><span>المجموع الفرعي:</span><span>${currency}${formatNumber(sale.subtotal)}</span></div>
          ${sale.discount > 0 ? `<div class="total-row"><span>الخصم:</span><span>-${currency}${formatNumber(sale.discount)}</span></div>` : ''}
          ${sale.tax > 0 ? `<div class="total-row"><span>الضريبة:</span><span>${currency}${formatNumber(sale.tax)}</span></div>` : ''}
          
          <div class="total-row grand-total">
            <span>المجموع النهائي:</span>
            <span>${currency}${formatNumber(sale.total)}</span>
          </div>

          <div class="total-row"><span>طريقة الدفع:</span><span>${sale.paymentMethod === 'cash' ? 'نقداً' : sale.paymentMethod === 'card' ? 'بطاقة' : sale.paymentMethod === 'debt' ? 'دين' : 'NFC'}</span></div>
          ${sale.amountTendered > 0 ? `<div class="total-row"><span>المسلم:</span><span>${currency}${formatNumber(sale.amountTendered)}</span></div>` : ''}
          ${sale.changeDue > 0 ? `<div class="total-row"><span>الباقي:</span><span>${currency}${formatNumber(sale.changeDue)}</span></div>` : ''}
        </div>

        <div class="footer">
          <div>شكراً لزيارتكم! نرجو الاحتفاظ بالوصل</div>
          ${settings.receiptFooterMsg ? `<div>${settings.receiptFooterMsg}</div>` : ''}
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              if (window.frameElement) window.frameElement.remove();
            }, 1000);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();
}

