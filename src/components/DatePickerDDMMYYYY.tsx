import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface DatePickerDDMMYYYYProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  className?: string;
  id?: string;
  minDate?: string;
  maxDate?: string;
  lang?: 'ar' | 'ku' | 'en';
}

const MONTH_NAMES_AR = [
  '01 - يناير (1)', '02 - فبراير (2)', '03 - مارس (3)', '04 - أبريل (4)',
  '05 - مايو (5)', '06 - يونيو (6)', '07 - يوليو (7)', '08 - أغسطس (8)',
  '09 - سبتمبر (9)', '10 - أكتوبر (10)', '11 - نوفمبر (11)', '12 - ديسمبر (12)'
];

const MONTH_NAMES_KU = [
  '01 - کانوونی دووەم (1)', '02 - شوبات (2)', '03 - ئادار (3)', '04 - نیسان (4)',
  '05 - ئایار (5)', '06 - حوزەیران (6)', '07 - تەمووز (7)', '08 - ئاب (8)',
  '09 - ئەیلوول (9)', '10 - تشرینی یەکەم (10)', '11 - تشرینی دووەم (11)', '12 - کانوونی یەکەم (12)'
];

const MONTH_NAMES_EN = [
  '01 - Jan', '02 - Feb', '03 - Mar', '04 - Apr',
  '05 - May', '06 - Jun', '07 - Jul', '08 - Aug',
  '09 - Sep', '10 - Oct', '11 - Nov', '12 - Dec'
];

export const DatePickerDDMMYYYY: React.FC<DatePickerDDMMYYYYProps> = ({
  value,
  onChange,
  className = '',
  id,
  lang = 'ar'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM-DD
  const parts = (value || '').split('-');
  const initialYear = parts[0] ? parseInt(parts[0], 10) : new Date().getFullYear();
  const initialMonth = parts[1] ? parseInt(parts[1], 10) : new Date().getMonth() + 1;
  const initialDay = parts[2] ? parseInt(parts[2], 10) : new Date().getDate();

  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [day, setDay] = useState<number>(initialDay);

  useEffect(() => {
    if (value) {
      const p = value.split('-');
      if (p.length === 3) {
        setYear(parseInt(p[0], 10) || new Date().getFullYear());
        setMonth(parseInt(p[1], 10) || 1);
        setDay(parseInt(p[2], 10) || 1);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

  const updateDate = (newDay: number, newMonth: number, newYear: number) => {
    const maxD = daysInMonth(newYear, newMonth);
    const clampedDay = Math.min(newDay, maxD);
    const dStr = String(clampedDay).padStart(2, '0');
    const mStr = String(newMonth).padStart(2, '0');
    const yStr = String(newYear);
    const formattedISO = `${yStr}-${mStr}-${dStr}`;
    setDay(clampedDay);
    setMonth(newMonth);
    setYear(newYear);
    onChange(formattedISO);
  };

  const formattedDisplay = `${String(day).padStart(2, '0')} / ${String(month).padStart(2, '0')} / ${year}`;

  const monthList = lang === 'ku' ? MONTH_NAMES_KU : lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_AR;

  // Calendar grid calculation
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
  const totalDays = daysInMonth(year, month);

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`} id={id}>
      {/* Clickable Display Field clearly showing DD / MM / YYYY */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 bg-[#0B132B] hover:bg-[#111c40] border border-cyan-500/40 hover:border-cyan-400 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-2 focus:ring-cyan-400 focus:outline-none transition-all shadow-inner cursor-pointer"
        title="انقر لتغيير التاريخ (يوم / شهر / سنة)"
      >
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-cyan-300">
          <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-sm">{formattedDisplay}</span>
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700 font-sans">
          {lang === 'ku' ? 'ڕۆژ / مانگ / ساڵ' : lang === 'en' ? 'DD / MM / YYYY' : 'يوم / شهر / سنة'}
        </span>
      </button>

      {/* Popover Calendar with Direct Day/Month/Year Controls */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 z-50 w-72 sm:w-80 bg-[#0A1124] border-2 border-cyan-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-xl animate-fadeIn text-slate-100 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-bold text-xs text-cyan-300">
              {lang === 'ku' ? 'دیاریکردنی بەروار (ڕۆژ / مانگ / ساڵ)' : lang === 'en' ? 'Select Date (DD/MM/YYYY)' : 'تحديد التاريخ (يوم / شهر / سنة)'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          {/* Quick Selectors for Month, Year, and Day in DD - MM - YYYY order */}
          <div className="grid grid-cols-3 gap-1.5 mb-3 bg-[#0F1A36] p-2 rounded-lg border border-slate-800">
            {/* 1. DAY (يوم) - FIRST */}
            <div>
              <label className="text-[9px] text-cyan-400 font-bold block mb-0.5 text-center">
                {lang === 'ku' ? '١. ڕۆژ' : lang === 'en' ? '1. Day' : '١. اليوم'}
              </label>
              <select
                value={day}
                onChange={(e) => updateDate(parseInt(e.target.value, 10), month, year)}
                className="w-full bg-[#050A15] border border-cyan-500/40 rounded p-1 text-cyan-300 font-mono font-bold text-xs text-center focus:outline-none"
              >
                {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d} className="bg-[#050A15] text-white">
                    {String(d).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. MONTH (شهر) - MIDDLE */}
            <div>
              <label className="text-[9px] text-amber-400 font-bold block mb-0.5 text-center">
                {lang === 'ku' ? '٢. مانگ' : lang === 'en' ? '2. Month' : '٢. الشهر (وسط)'}
              </label>
              <select
                value={month}
                onChange={(e) => updateDate(day, parseInt(e.target.value, 10), year)}
                className="w-full bg-[#050A15] border border-amber-500/40 rounded p-1 text-amber-300 font-mono font-bold text-xs text-center focus:outline-none"
              >
                {monthList.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-[#050A15] text-white">
                    {String(idx + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. YEAR (سنة) - END */}
            <div>
              <label className="text-[9px] text-emerald-400 font-bold block mb-0.5 text-center">
                {lang === 'ku' ? '٣. ساڵ' : lang === 'en' ? '3. Year' : '٣. السنة'}
              </label>
              <select
                value={year}
                onChange={(e) => updateDate(day, month, parseInt(e.target.value, 10))}
                className="w-full bg-[#050A15] border border-emerald-500/40 rounded p-1 text-emerald-300 font-mono font-bold text-xs text-center focus:outline-none"
              >
                {Array.from({ length: 25 }, (_, i) => 2020 + i).map(y => (
                  <option key={y} value={y} className="bg-[#050A15] text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Month Stepper Navigation */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={() => {
                if (month === 1) {
                  updateDate(day, 12, year - 1);
                } else {
                  updateDate(day, month - 1, year);
                }
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-300"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>

            <span className="font-bold text-slate-200 text-xs">
              {monthList[month - 1]} {year}
            </span>

            <button
              type="button"
              onClick={() => {
                if (month === 12) {
                  updateDate(day, 1, year + 1);
                } else {
                  updateDate(day, month + 1, year);
                }
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>

          {/* Mini Calendar Grid (Days of Month) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'].map((dName, idx) => (
              <span key={idx} className="text-[9px] text-slate-500 font-bold py-0.5">
                {dName}
              </span>
            ))}

            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <span key={`empty-${i}`} />
            ))}

            {Array.from({ length: totalDays }, (_, i) => i + 1).map(dNum => {
              const isSelected = dNum === day;
              const isTodayDate = 
                dNum === new Date().getDate() &&
                month === new Date().getMonth() + 1 &&
                year === new Date().getFullYear();

              return (
                <button
                  key={dNum}
                  type="button"
                  onClick={() => {
                    updateDate(dNum, month, year);
                    setIsOpen(false);
                  }}
                  className={`py-1 rounded font-mono text-xs transition-all ${
                    isSelected
                      ? 'bg-cyan-500 text-black font-black shadow-md shadow-cyan-500/40'
                      : isTodayDate
                      ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-950'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {dNum}
                </button>
              );
            })}
          </div>

          {/* Quick Buttons: Today */}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                updateDate(now.getDate(), now.getMonth() + 1, now.getFullYear());
                setIsOpen(false);
              }}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-950/60 px-2 py-1 rounded border border-cyan-800/40"
            >
              {lang === 'ku' ? 'ئەمڕۆ' : lang === 'en' ? 'Today' : 'تاريخ اليوم'}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-950/60 px-3 py-1 rounded border border-emerald-800/40 flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              {lang === 'ku' ? 'تەواو' : lang === 'en' ? 'Done' : 'تم'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
