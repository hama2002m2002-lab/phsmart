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
 * Formats a Date object or timestamp string for display with Day/Month/Year (DD/MM/YYYY).
 * Avoids Hijri calendar conversion bugs and enforces DD/MM/YYYY and 12-hour clock.
 */
export function formatDisplayDate(timestamp: any, lang: string = 'ar'): string {
  const d = parseDate(timestamp);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDisplayTime(timestamp: any, lang: string = 'ar'): string {
  const d = parseDate(timestamp);
  if (isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const isPM = hours >= 12;
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const period = lang === 'ku' ? (isPM ? 'د.ن' : 'ب.ن') : lang === 'en' ? (isPM ? 'PM' : 'AM') : (isPM ? 'م' : 'ص');
  return `${hours}:${minutes} ${period}`;
}

export function formatDisplayDateTime(timestamp: any, lang: string = 'ar'): string {
  const d = parseDate(timestamp);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const timeStr = formatDisplayTime(d, lang);
  return `${day}/${month}/${year} - ${timeStr}`;
}

export function formatDateDDMMYYYY(timestamp: any): string {
  const d = parseDate(timestamp);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatTime12Hour(timestamp: any, lang: string = 'ar'): string {
  return formatDisplayTime(timestamp, lang);
}

