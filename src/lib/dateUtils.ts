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
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  const d = parseDate(timestamp);
  if (!isNaN(d.getTime())) {
    const time = d.getTime();
    return time >= startOfToday && time <= endOfToday;
  }

  return false;
}

/**
 * Checks if a timestamp belongs to the current week starting from Saturday (يوم السبت).
 */
export function isThisWeek(timestamp: any): boolean {
  if (!timestamp) return false;
  const now = new Date();
  const daysSinceSaturday = (now.getDay() + 1) % 7; // Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceSaturday, 0, 0, 0, 0).getTime();
  const endOfWeek = new Date(startOfWeek + 7 * 24 * 60 * 60 * 1000 - 1).getTime();

  const d = parseDate(timestamp);
  if (isNaN(d.getTime())) return false;
  const time = d.getTime();
  return time >= startOfWeek && time <= endOfWeek;
}

/**
 * Checks if a timestamp belongs to the current month (from day 1 to last day of month).
 */
export function isThisMonth(timestamp: any): boolean {
  if (!timestamp) return false;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const d = parseDate(timestamp);
  if (isNaN(d.getTime())) return false;
  const time = d.getTime();
  return time >= startOfMonth && time <= endOfMonth;
}

/**
 * Checks if a timestamp belongs to the last 3 months (from 1st of month 2 months ago to end of current month).
 */
export function isThreeMonths(timestamp: any): boolean {
  if (!timestamp) return false;
  const now = new Date();
  const startOfThreeMonths = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0).getTime();
  const endOfThreeMonths = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const d = parseDate(timestamp);
  if (isNaN(d.getTime())) return false;
  const time = d.getTime();
  return time >= startOfThreeMonths && time <= endOfThreeMonths;
}

/**
 * Checks if a timestamp belongs to the current full year (Jan 1 to Dec 31).
 */
export function isThisYear(timestamp: any): boolean {
  if (!timestamp) return false;
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();

  const d = parseDate(timestamp);
  if (isNaN(d.getTime())) return false;
  const time = d.getTime();
  return time >= startOfYear && time <= endOfYear;
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

