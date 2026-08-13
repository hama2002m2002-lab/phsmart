import React from 'react';

interface BarcodeGraphicProps {
  value: string;
  className?: string;
  height?: number;
  showText?: boolean;
}

export const BarcodeGraphic: React.FC<BarcodeGraphicProps> = ({
  value,
  className = '',
  height = 40,
  showText = true,
}) => {
  // Generate a clean 1D barcode pattern from character codes
  const generateBars = (text: string) => {
    const bars: { width: number; isSpace: boolean }[] = [];
    
    // Start guard bars
    bars.push({ width: 2, isSpace: false });
    bars.push({ width: 1, isSpace: true });
    bars.push({ width: 2, isSpace: false });
    bars.push({ width: 2, isSpace: true });

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
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

    return bars;
  };

  const bars = generateBars(value);
  const totalWidth = bars.reduce((acc, b) => acc + b.width * 2, 0) + 20;

  let currentX = 10;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full h-auto max-h-12"
        preserveAspectRatio="none"
      >
        <rect width={totalWidth} height={height} fill="white" />
        {bars.map((bar, index) => {
          const w = bar.width * 2;
          const x = currentX;
          currentX += w;
          if (bar.isSpace) return null;
          return (
            <rect
              key={index}
              x={x}
              y={2}
              width={w}
              height={height - 4}
              fill="black"
            />
          );
        })}
      </svg>
      {showText && (
        <span className="font-mono text-xs tracking-widest font-bold text-slate-700 dark:text-slate-300 mt-1">
          {value}
        </span>
      )}
    </div>
  );
};
