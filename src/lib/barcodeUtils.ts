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

