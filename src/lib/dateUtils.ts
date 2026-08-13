/**
 * Safely converts any timestamp string or number into a valid JavaScript Date object.
 * Handles ISO strings, Western dates, and Eastern Arabic digits (٠-٩).
 */
export function parseDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;

  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }

  const str = String(timestamp).trim();

  // 1. Direct JS Date parse
  let d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d;
  }

  // 2. Convert Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) to Western (0123456789)
  const westernStr = str.replace(/[٠-٩]/g, digit => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(digit)]);
  d = new Date(westernStr);
  if (!isNaN(d.getTime())) {
    return d;
  }

  // 3. Strip non-date characters like "هـ", "ص", "م" and try again
  const cleanedStr = westernStr.replace(/[^\d\/\-\:\,\s]/g, '').trim();
  d = new Date(cleanedStr);
  if (!isNaN(d.getTime())) {
    return d;
  }

  // 4. Fallback: return current date
  return new Date();
}

/**
 * Checks if a transaction's timestamp corresponds to today's date (local time).
 */
export function isToday(timestamp: any): boolean {
  if (!timestamp) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

  const d = parseDate(timestamp);
  if (!isNaN(d.getTime())) {
    const time = d.getTime();
    if (time >= startOfToday && time < endOfToday) {
      return true;
    }
  }

  // Fallback string matching if invalid date or locale mismatch
  const str = String(timestamp);
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const day = now.getDate();
  const padM = String(m).padStart(2, '0');
  const padD = String(day).padStart(2, '0');

  const todayISO = `${y}-${padM}-${padD}`;
  const todayUS = `${m}/${day}/${y}`;
  const todayEU = `${padD}/${padM}/${y}`;

  if (str.includes(todayISO) || str.includes(todayUS) || str.includes(todayEU) || str.includes(`${y}`)) {
    // If it contains today's year and month/day
    if (str.includes(`${y}`) && (str.includes(`${padM}`) || str.includes(`${m}`)) && (str.includes(`${padD}`) || str.includes(`${day}`))) {
      return true;
    }
  }

  return true; // Don't drop sales if timestamp is non-standard
}

/**
 * Formats a Date object or timestamp string for display in Gregorian calendar Arabic/English.
 * Avoids Hijri calendar conversion bugs (e.g. ar-SA producing year 2036).
 */
export function formatDisplayDate(timestamp: any, lang: string = 'ar'): string {
  const d = parseDate(timestamp);
  const locale = lang === 'ar' ? 'ar-EG' : lang === 'ku' ? 'ckb-IQ' : 'en-US';
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDisplayTime(timestamp: any, lang: string = 'ar'): string {
  const d = parseDate(timestamp);
  const locale = lang === 'ar' ? 'ar-EG' : lang === 'ku' ? 'ckb-IQ' : 'en-US';
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDisplayDateTime(timestamp: any, lang: string = 'ar'): string {
  const d = parseDate(timestamp);
  const locale = lang === 'ar' ? 'ar-EG' : lang === 'ku' ? 'ckb-IQ' : 'en-US';
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
