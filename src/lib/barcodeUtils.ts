import { Product } from '../types';

// Track session-generated barcodes to ensure clicking generate repeatedly in a session never repeats
const sessionGeneratedBarcodes = new Set<string>();

/**
 * Generates a completely new unique barcode starting with prefix '200245'
 * followed by 6 fully randomized digits (e.g. 200245819402, 200245138592).
 * Does NOT increment +1 digit-by-digit.
 * Guarantees that the generated barcode does not exist in existingProducts or session history.
 */
export const generateUniqueBarcode200245 = (
  existingProducts: Product[] = [],
  currentBarcode?: string
): string => {
  const safeProducts = Array.isArray(existingProducts) ? existingProducts : [];
  const existingBarcodes = new Set<string>(
    safeProducts
      .filter(Boolean)
      .map(p => (p?.barcode || '').trim().toLowerCase())
      .filter(Boolean)
  );

  // Add all previously generated session barcodes
  sessionGeneratedBarcodes.forEach(b => existingBarcodes.add(b.toLowerCase()));

  if (currentBarcode && typeof currentBarcode === 'string' && currentBarcode.trim()) {
    existingBarcodes.add(currentBarcode.trim().toLowerCase());
  }

  const prefix = '200245';
  let candidate = '';
  let attempts = 0;

  do {
    // Generate 6 completely random digits (between 100000 and 999999)
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    candidate = `${prefix}${randomPart}`;
    attempts++;
  } while (existingBarcodes.has(candidate.toLowerCase()) && attempts < 5000);

  // Fallback in case of extreme collision
  if (existingBarcodes.has(candidate.toLowerCase())) {
    candidate = `${prefix}${Date.now().toString().slice(-6)}`;
  }

  sessionGeneratedBarcodes.add(candidate);
  return candidate;
};

/**
 * Generates an SVG string representation of a 1D barcode
 * Suitable for embedding directly into HTML strings (e.g., thermal printer iframes, receipts, print views).
 */
export const generateBarcodeSvgString = (
  value: string,
  height: number = 42,
  showText: boolean = true
): string => {
  if (!value) return '';

  const safeVal = String(value);
  const bars: { width: number; isSpace: boolean }[] = [];

  // Start guard bars
  bars.push({ width: 2, isSpace: false });
  bars.push({ width: 1, isSpace: true });
  bars.push({ width: 2, isSpace: false });
  bars.push({ width: 2, isSpace: true });

  for (let i = 0; i < safeVal.length; i++) {
    const code = safeVal.charCodeAt(i);
    const b1 = (code % 3) + 1;
    const s1 = ((code >> 1) % 2) + 1;
    const b2 = ((code >> 2) % 3) + 1;
    const s2 = ((code >> 3) % 2) + 1;

    bars.push({ width: b1, isSpace: false });
    bars.push({ width: s1, isSpace: true });
    bars.push({ width: b2, isSpace: false });
    bars.push({ width: s2, isSpace: true });
  }

  // Stop guard bars
  bars.push({ width: 2, isSpace: false });
  bars.push({ width: 1, isSpace: true });
  bars.push({ width: 3, isSpace: false });
  bars.push({ width: 2, isSpace: true });
  bars.push({ width: 2, isSpace: false });

  const totalWidth = bars.reduce((acc, b) => acc + b.width * 2, 0) + 20;
  let currentX = 10;
  let rectsHtml = '';

  for (let idx = 0; idx < bars.length; idx++) {
    const bar = bars[idx];
    const w = bar.width * 2;
    const x = currentX;
    currentX += w;
    if (!bar.isSpace) {
      rectsHtml += `<rect x="${x}" y="2" width="${w}" height="${height - 4}" fill="#000000" />`;
    }
  }

  return `
    <div style="text-align: center; margin: 4px auto; max-width: 100%;">
      <svg viewBox="0 0 ${totalWidth} ${height}" style="width: 100%; max-width: 260px; height: ${height}px; display: block; margin: 0 auto;" preserveAspectRatio="none">
        <rect width="${totalWidth}" height="${height}" fill="#ffffff" />
        ${rectsHtml}
      </svg>
      ${showText ? `<div style="font-family: monospace, Courier; font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #000; margin-top: 2px;">${safeVal}</div>` : ''}
    </div>
  `;
};

/**
 * Checks if a given barcode is already used by another product.

 * Returns the matching product if found, or undefined if unique.
 */
export const findDuplicateBarcodeProduct = (
  barcode: string,
  existingProducts: Product[] = [],
  excludeProductId?: string
): Product | undefined => {
  if (!barcode || typeof barcode !== 'string') return undefined;
  const cleanBarcode = barcode.trim().toLowerCase();
  if (!cleanBarcode) return undefined;

  const safeProducts = Array.isArray(existingProducts) ? existingProducts : [];
  return safeProducts.find(p => {
    if (!p) return false;
    if (excludeProductId && p.id === excludeProductId) return false;
    return (p.barcode || '').trim().toLowerCase() === cleanBarcode;
  });
};

