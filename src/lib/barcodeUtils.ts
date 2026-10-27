import QRCode from 'qrcode';
import { Product } from '../types';

// Track session-generated barcodes to ensure clicking generate repeatedly in a session never repeats
const sessionGeneratedBarcodes = new Set<string>();

/**
 * Calculates standard GS1 Modulo-10 Check Digit for 12 digits (EAN-13 check digit).
 */
export const calculateEan13CheckDigit = (twelveDigits: string): number => {
  const digits = twelveDigits.replace(/\D/g, '').slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = parseInt(digits[i], 10) || 0;
    sum += i % 2 === 0 ? n * 1 : n * 3;
  }
  return (10 - (sum % 10)) % 10;
};

/**
 * Generates a completely new unique 13-digit standard barcode starting with prefix '200245'
 * followed by 6 randomized digits and the mathematically verified GS1 check digit.
 * (e.g. 2002458194026).
 * This ensures 100% compatibility with every commercial barcode scanner and POS gun.
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
    // Generate 6 random digits
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    const twelve = `${prefix}${randomPart}`;
    const check = calculateEan13CheckDigit(twelve);
    candidate = `${twelve}${check}`;
    attempts++;
  } while (existingBarcodes.has(candidate.toLowerCase()) && attempts < 5000);

  // Fallback in case of extreme collision
  if (existingBarcodes.has(candidate.toLowerCase())) {
    const twelve = `${prefix}${Date.now().toString().slice(-6)}`;
    const check = calculateEan13CheckDigit(twelve);
    candidate = `${twelve}${check}`;
  }

  sessionGeneratedBarcodes.add(candidate);
  return candidate;
};

export interface BarcodeRenderOptions {
  format?: 'CODE128' | 'EAN13' | 'CODE39' | 'QR';
  height?: number;
  width?: number; // module width in px (usually 1.5 - 2.5)
  showText?: boolean;
  fontSize?: number;
  margin?: number; // quiet zone in pixels
  background?: string;
  lineColor?: string;
}

/**
 * ISO/IEC 15417 Code 128 Patterns (107 patterns, 0-106)
 * Each pattern specifies lengths of alternating 3 bars and 3 spaces (sum = 11 modules).
 * Stop pattern has 4 bars, 3 spaces (sum = 13 modules).
 */
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

/**
 * Generates an SVG string representation of standard Code 128 (ISO/IEC 15417)
 * Works anywhere (browser, server, node) with zero external dependencies.
 */
export function generateCode128Svg(
  text: string,
  height: number = 40,
  showText: boolean = true,
  moduleWidth: number = 2,
  quietZone: number = 16,
  background: string = '#ffffff',
  lineColor: string = '#000000'
): string {
  const safeText = String(text || '').trim();
  if (!safeText) return '';

  const isDigitsOnly = /^\d+$/.test(safeText);
  // Code 128 Set C encodes digits in pairs (00-99) for double density
  const useSetC = isDigitsOnly && safeText.length >= 4 && safeText.length % 2 === 0;

  const codes: number[] = [];
  let checksum = 0;

  if (useSetC) {
    // Start Set C = 105
    codes.push(105);
    checksum = 105;
    let weight = 1;
    for (let i = 0; i < safeText.length; i += 2) {
      const pairVal = parseInt(safeText.slice(i, i + 2), 10);
      codes.push(pairVal);
      checksum += pairVal * weight;
      weight++;
    }
  } else {
    // Start Set B = 104
    codes.push(104);
    checksum = 104;
    let weight = 1;
    for (let i = 0; i < safeText.length; i++) {
      const charCode = safeText.charCodeAt(i) - 32;
      const validCode = (charCode >= 0 && charCode <= 95) ? charCode : 0;
      codes.push(validCode);
      checksum += validCode * weight;
      weight++;
    }
  }

  // Checksum mod 103
  codes.push(checksum % 103);
  // Stop Code = 106
  codes.push(106);

  // Build binary modules
  const binaryBars: number[] = [];
  codes.forEach(codeIdx => {
    const pattern = CODE128_PATTERNS[codeIdx];
    if (!pattern) return;
    for (let pIdx = 0; pIdx < pattern.length; pIdx++) {
      const width = parseInt(pattern[pIdx], 10);
      const isBar = pIdx % 2 === 0;
      for (let m = 0; m < width; m++) {
        binaryBars.push(isBar ? 1 : 0);
      }
    }
  });

  const barcodeWidth = binaryBars.length * moduleWidth;
  const totalSvgWidth = barcodeWidth + quietZone * 2;
  const svgHeight = height + (showText ? 15 : 0);

  let rectsSvg = '';
  let inBar = false;
  let barStart = 0;

  for (let b = 0; b < binaryBars.length; b++) {
    const bit = binaryBars[b];
    if (bit === 1 && !inBar) {
      inBar = true;
      barStart = b;
    } else if (bit === 0 && inBar) {
      inBar = false;
      const x = quietZone + barStart * moduleWidth;
      const w = (b - barStart) * moduleWidth;
      rectsSvg += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="${lineColor}" shape-rendering="crispEdges"/>`;
    }
  }

  if (inBar) {
    const x = quietZone + barStart * moduleWidth;
    const w = (binaryBars.length - barStart) * moduleWidth;
    rectsSvg += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="${lineColor}" shape-rendering="crispEdges"/>`;
  }

  const textSvg = showText
    ? `<text x="${totalSvgWidth / 2}" y="${height + 13}" font-family="monospace, Courier" font-size="11" font-weight="bold" letter-spacing="1.5" fill="${lineColor}" text-anchor="middle">${safeText}</text>`
    : '';

  return `
    <svg viewBox="0 0 ${totalSvgWidth} ${svgHeight}" width="${totalSvgWidth}" height="${svgHeight}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="${totalSvgWidth}" height="${svgHeight}" fill="${background}"/>
      ${rectsSvg}
      ${textSvg}
    </svg>
  `.trim();
}

/**
 * Standard EAN-13 Barcode generator
 */
export function generateEan13Svg(
  digitsStr: string,
  height: number = 40,
  showText: boolean = true,
  moduleWidth: number = 2,
  quietZone: number = 16,
  background: string = '#ffffff',
  lineColor: string = '#000000'
): string {
  const digits = digitsStr.replace(/\D/g, '').slice(0, 13);
  if (digits.length < 12) {
    // Fallback to Code 128 if not enough digits
    return generateCode128Svg(digitsStr, height, showText, moduleWidth, quietZone, background, lineColor);
  }

  // Calculate check digit for first 12 digits to ensure 100% mathematical validity
  const base12 = digits.slice(0, 12);
  const check = calculateEan13CheckDigit(base12);
  const full13 = `${base12}${check}`;

  const L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const G_CODES = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
  const R_CODES = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];

  const PARITY_TABLE = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
  ];

  const firstDigit = parseInt(full13[0], 10);
  const parity = PARITY_TABLE[firstDigit] || 'LLLLLL';

  let bitString = '101'; // Left guard

  // Left 6 digits
  for (let i = 1; i <= 6; i++) {
    const digit = parseInt(full13[i], 10);
    const useG = parity[i - 1] === 'G';
    bitString += useG ? G_CODES[digit] : L_CODES[digit];
  }

  bitString += '01010'; // Center guard

  // Right 6 digits
  for (let i = 7; i <= 12; i++) {
    const digit = parseInt(full13[i], 10);
    bitString += R_CODES[digit];
  }

  bitString += '101'; // Right guard

  const totalWidth = bitString.length * moduleWidth + quietZone * 2;
  const svgHeight = height + (showText ? 15 : 0);

  let rectsSvg = '';
  for (let i = 0; i < bitString.length; i++) {
    if (bitString[i] === '1') {
      const x = quietZone + i * moduleWidth;
      rectsSvg += `<rect x="${x}" y="0" width="${moduleWidth}" height="${height}" fill="${lineColor}" shape-rendering="crispEdges"/>`;
    }
  }

  const textSvg = showText
    ? `<text x="${totalWidth / 2}" y="${height + 13}" font-family="monospace, Courier" font-size="11" font-weight="bold" letter-spacing="1.5" fill="${lineColor}" text-anchor="middle">${full13}</text>`
    : '';

  return `
    <svg viewBox="0 0 ${totalWidth} ${svgHeight}" width="${totalWidth}" height="${svgHeight}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="${totalWidth}" height="${svgHeight}" fill="${background}"/>
      ${rectsSvg}
      ${textSvg}
    </svg>
  `.trim();
}

/**
 * Standard Code 39 Barcode generator
 */
export function generateCode39Svg(
  text: string,
  height: number = 40,
  showText: boolean = true,
  moduleWidth: number = 2,
  quietZone: number = 16,
  background: string = '#ffffff',
  lineColor: string = '#000000'
): string {
  const clean = text.toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, '');
  if (!clean) return '';

  const CODE39_MAP: Record<string, string> = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
    '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
    '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
    'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
    'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
    'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
    'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
    'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
    '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
    '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
  };

  const fullStr = `*${clean}*`;
  const wideMultiplier = 2.5;

  let currentX = quietZone;
  let rectsSvg = '';

  for (let c = 0; c < fullStr.length; c++) {
    const char = fullStr[c];
    const pattern = CODE39_MAP[char] || CODE39_MAP[' '];

    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const isWide = pattern[i] === '1';
      const w = isWide ? moduleWidth * wideMultiplier : moduleWidth;

      if (isBar) {
        rectsSvg += `<rect x="${currentX}" y="2" width="${w}" height="${height}" fill="${lineColor}" shape-rendering="crispEdges"/>`;
      }
      currentX += w;
    }
    // Inter-character space
    currentX += moduleWidth;
  }

  const totalWidth = currentX + quietZone;
  const svgHeight = height + (showText ? 15 : 0);

  const textSvg = showText
    ? `<text x="${totalWidth / 2}" y="${height + 13}" font-family="monospace, Courier" font-size="11" font-weight="bold" letter-spacing="1.5" fill="${lineColor}" text-anchor="middle">${clean}</text>`
    : '';

  return `
    <svg viewBox="0 0 ${totalWidth} ${svgHeight}" width="${totalWidth}" height="${svgHeight}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="${totalWidth}" height="${svgHeight}" fill="${background}"/>
      ${rectsSvg}
      ${textSvg}
    </svg>
  `.trim();
}

/**
 * Generates an SVG string representation of a 100% scanner-readable barcode (Code 128 / EAN 13 / Code 39).
 * Works reliably anywhere without external CJS dependencies.
 */
export const generateBarcodeSvgString = (
  value: string,
  height: number = 42,
  showText: boolean = true,
  options: BarcodeRenderOptions = {}
): string => {
  if (!value) return '';

  const safeVal = String(value).trim();
  if (!safeVal) return '';

  const reqFormat = options.format || 'CODE128';
  const moduleWidth = options.width || 2;
  const quietZone = options.margin !== undefined ? options.margin : 12;
  const background = options.background || '#ffffff';
  const lineColor = options.lineColor || '#000000';

  if (reqFormat === 'EAN13' && /^\d{12,13}$/.test(safeVal)) {
    return generateEan13Svg(safeVal, height, showText, moduleWidth, quietZone, background, lineColor);
  }

  if (reqFormat === 'CODE39') {
    return generateCode39Svg(safeVal, height, showText, moduleWidth, quietZone, background, lineColor);
  }

  // Default to standard Code 128 (Universal compatibility with all 1D/2D scanners)
  return generateCode128Svg(safeVal, height, showText, moduleWidth, quietZone, background, lineColor);
};

// Aliases for compatibility
export const generatePureCode128Svg = generateCode128Svg;

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
