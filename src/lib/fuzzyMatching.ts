import { Product } from '../types';

/**
 * Normalizes English/Arabic/Kurdish strings for high-accuracy pharmaceutical fuzzy comparison:
 * - Lowercases and removes extra spaces
 * - Normalizes dosages (e.g. "500 mg" -> "500mg", "100 ml" -> "100ml")
 * - Standardizes common pharmaceutical form abbreviations:
 *   tablet/tablets/tabs -> tab, capsule/capsules/caps -> cap, syrup -> syr, ampoule/amp -> amp
 * - Strips punctuation, quotes, brackets, asterisks (*24tab -> 24tab)
 */
export function normalizePharmaName(str: string): string {
  if (!str) return '';
  let s = str.trim().toLowerCase();

  // Remove common noisy wrapper characters: *, #, [, ], (, ), {, }, ", ', `, ~, +, /
  s = s.replace(/[\*#\[\]\(\)\{\}"'`~+\/\\:;,\-_]/g, ' ');

  // Standardize dosage spacing: "500 mg" -> "500mg", "10 ml" -> "10ml", "2.5 mg" -> "2.5mg"
  s = s.replace(/(\d+(\.\d+)?)\s*(mg|ml|mcg|g|iu|ui|gm)\b/g, '$1$3');

  // Standardize pharmaceutical dosage forms
  s = s.replace(/\b(tablets|tablet|tabs)\b/g, 'tab');
  s = s.replace(/\b(capsules|capsule|caps)\b/g, 'cap');
  s = s.replace(/\b(syrups|syrup)\b/g, 'syr');
  s = s.replace(/\b(suspensions|suspension|susp)\b/g, 'susp');
  s = s.replace(/\b(ampoules|ampoule|amps)\b/g, 'amp');
  s = s.replace(/\b(ointments|ointment|oint)\b/g, 'oint');
  s = s.replace(/\b(creams|cream|crm)\b/g, 'crm');
  s = s.replace(/\b(drops|drop)\b/g, 'drops');
  s = s.replace(/\b(injections|injection|inj)\b/g, 'inj');

  // Collapse multiple whitespace
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Calculates standard Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const row = Array(b.length + 1).fill(0);
  for (let j = 0; j <= b.length; j++) row[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      if (a[i - 1] === b[j - 1]) {
        row[j] = prev;
      } else {
        row[j] = Math.min(prev + 1, row[j] + 1, row[j - 1] + 1);
      }
      prev = temp;
    }
  }

  return row[b.length];
}

/**
 * Returns Levenshtein similarity ratio between 0.0 and 1.0
 */
export function levenshteinSimilarity(a: string, b: string): number {
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Token-based similarity (handles reordered words or extra words)
 * E.g., "Panadol Extra 500mg" vs "Panadol 500mg Extra Tab"
 */
export function tokenSetSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(/\s+/).filter(Boolean));
  const tokensB = new Set(b.split(/\s+/).filter(Boolean));

  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersectionCount = 0;
  tokensA.forEach(t => {
    if (tokensB.has(t)) {
      intersectionCount++;
    } else {
      // Check if any token in B is a near-typo of t
      for (const tb of tokensB) {
        if (Math.abs(t.length - tb.length) <= 2 && levenshteinSimilarity(t, tb) >= 0.85) {
          intersectionCount += 0.9;
          break;
        }
      }
    }
  });

  const unionCount = tokensA.size + tokensB.size - intersectionCount;
  return Math.min(1.0, intersectionCount / Math.max(1, unionCount));
}

/**
 * Combined pharmaceutical string similarity score (0.0 to 1.0)
 * Combines character-level Levenshtein similarity with token-level set similarity.
 */
export function calculatePharmaSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0.0;

  const raw1 = str1.trim().toLowerCase();
  const raw2 = str2.trim().toLowerCase();
  if (raw1 === raw2) return 1.0;

  const norm1 = normalizePharmaName(str1);
  const norm2 = normalizePharmaName(str2);
  if (norm1 === norm2) return 1.0;

  // Direct containment check if long enough
  if (norm1.length >= 6 && norm2.length >= 6) {
    if (norm1.startsWith(norm2) || norm2.startsWith(norm1)) {
      const lengthRatio = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
      if (lengthRatio > 0.75) return Math.max(0.92, lengthRatio);
    }
  }

  const levScore = levenshteinSimilarity(norm1, norm2);
  const tokenScore = tokenSetSimilarity(norm1, norm2);

  // Weighted score favoring token similarity for pharmaceutical titles with differing dosage/form position
  return parseFloat((levScore * 0.45 + tokenScore * 0.55).toFixed(3));
}

export interface FuzzyMatchResult {
  matchedProduct: Product | null;
  similarity: number;
  matchType: 'exact_barcode' | 'exact_name' | 'fuzzy_name' | 'none';
  normalizedQuery: string;
  matchedField?: 'name' | 'nameAr' | 'nameKu' | 'barcode';
}

/**
 * Finds the best matching existing product using exact barcode, exact name, or fuzzy matching.
 * Minimum threshold defaults to 0.82 (82% similarity).
 */
export function findBestFuzzyProductMatch(
  queryName: string,
  existingProducts: Product[],
  options?: {
    barcode?: string;
    threshold?: number;
    requireSameDosage?: boolean;
  }
): FuzzyMatchResult {
  const barcode = (options?.barcode || '').trim();
  const threshold = options?.threshold ?? 0.82;

  // 1. Exact Barcode Match
  if (barcode) {
    const cleanB = barcode.replace(/\D/g, '');
    const foundByBarcode = existingProducts.find(p => {
      if (!p.barcode) return false;
      const cleanP = p.barcode.replace(/\D/g, '');
      return p.barcode.trim() === barcode || (cleanB.length >= 6 && cleanP === cleanB);
    });
    if (foundByBarcode) {
      return {
        matchedProduct: foundByBarcode,
        similarity: 1.0,
        matchType: 'exact_barcode',
        normalizedQuery: queryName,
        matchedField: 'barcode'
      };
    }
  }

  const trimmedQuery = (queryName || '').trim();
  if (!trimmedQuery) {
    return {
      matchedProduct: null,
      similarity: 0,
      matchType: 'none',
      normalizedQuery: ''
    };
  }

  const normQuery = normalizePharmaName(trimmedQuery);
  const lowerQuery = trimmedQuery.toLowerCase();

  // 2. Exact Name Match (case-insensitive & normalized)
  for (const p of existingProducts) {
    const pName = (p.name || '').trim().toLowerCase();
    const pNameAr = (p.nameAr || '').trim().toLowerCase();
    const pNameKu = (p.nameKu || '').trim().toLowerCase();

    if (pName === lowerQuery || (pNameAr && pNameAr === lowerQuery) || (pNameKu && pNameKu === lowerQuery)) {
      return {
        matchedProduct: p,
        similarity: 1.0,
        matchType: 'exact_name',
        normalizedQuery: normQuery,
        matchedField: pName === lowerQuery ? 'name' : (pNameAr === lowerQuery ? 'nameAr' : 'nameKu')
      };
    }

    const normP = normalizePharmaName(p.name || '');
    if (normP && normP === normQuery) {
      return {
        matchedProduct: p,
        similarity: 1.0,
        matchType: 'exact_name',
        normalizedQuery: normQuery,
        matchedField: 'name'
      };
    }
  }

  // 3. Extract dosage numbers (e.g. 500, 40, 625, 20) to avoid matching different strengths
  // E.g. "Panadol 500mg" should NOT match "Panadol 1000mg" even if names are similar
  const extractDosages = (s: string): string[] => {
    const matches = s.match(/\b\d+(\.\d+)?(mg|ml|mcg|g|%)\b/g);
    return matches ? matches.map(m => m.toLowerCase()) : [];
  };

  const queryDosages = extractDosages(normQuery);

  // 4. Fuzzy Matching across existing products
  let bestMatch: Product | null = null;
  let highestSimilarity = 0;
  let matchedField: 'name' | 'nameAr' | 'nameKu' = 'name';

  for (const p of existingProducts) {
    const pNormName = normalizePharmaName(p.name || '');
    if (!pNormName) continue;

    // Check dosage conflict if dosages were detected in both
    if (queryDosages.length > 0) {
      const pDosages = extractDosages(pNormName);
      if (pDosages.length > 0) {
        // If query has dosage like "500mg" and product has dosage like "1000mg" or "250mg", skip
        const hasCommonDosage = queryDosages.some(d => pDosages.includes(d));
        if (!hasCommonDosage) {
          continue;
        }
      }
    }

    // Compute similarity against English name
    const simName = calculatePharmaSimilarity(normQuery, pNormName);
    if (simName > highestSimilarity) {
      highestSimilarity = simName;
      bestMatch = p;
      matchedField = 'name';
    }

    // Also check Arabic name if query has Arabic characters
    if (/[\u0600-\u06FF]/.test(lowerQuery) && p.nameAr) {
      const simAr = calculatePharmaSimilarity(lowerQuery, p.nameAr.toLowerCase());
      if (simAr > highestSimilarity) {
        highestSimilarity = simAr;
        bestMatch = p;
        matchedField = 'nameAr';
      }
    }
  }

  if (bestMatch && highestSimilarity >= threshold) {
    return {
      matchedProduct: bestMatch,
      similarity: highestSimilarity,
      matchType: 'fuzzy_name',
      normalizedQuery: normQuery,
      matchedField
    };
  }

  return {
    matchedProduct: null,
    similarity: highestSimilarity,
    matchType: 'none',
    normalizedQuery: normQuery
  };
}
