import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface FastSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isLight?: boolean;
  debounceMs?: number;
  autoFocus?: boolean;
  onClear?: () => void;
  id?: string;
}

export const FastSearchInput: React.FC<FastSearchInputProps> = ({
  value,
  onChange,
  placeholder = 'بحث...',
  className = '',
  isLight = false,
  debounceMs = 100,
  autoFocus = false,
  onClear,
  id = 'fast-search-input'
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize if external value changes (e.g. cleared by category change or external reset)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setLocalValue(nextVal);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // If empty or user pressed enter/scan, flush immediately
    if (!nextVal) {
      onChange('');
      return;
    }

    // Debounce pushing to parent to keep input 100% 60fps responsive with zero lag
    timerRef.current = setTimeout(() => {
      onChange(nextVal);
    }, debounceMs);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (timerRef.current) clearTimeout(timerRef.current);
      onChange(localValue);
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocalValue('');
    onChange('');
    if (onClear) onClear();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative w-full">
      <Search className={`w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
        isLight ? 'text-slate-400' : 'text-slate-400'
      }`} />
      
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full text-xs pl-9 rtl:pl-8 rtl:pr-9 pr-8 py-2 rounded-xl border font-semibold focus:outline-none transition-all ${
          isLight
            ? 'bg-slate-50 text-slate-900 placeholder-slate-400 border-slate-300 focus:border-blue-500 focus:bg-white'
            : 'bg-[#0B1120] text-slate-200 placeholder-slate-500 border-blue-500/20 focus:border-cyan-500/60'
        } ${className}`}
      />

      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all cursor-pointer"
          title="مسح البحث"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
