import React, { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { generateBarcodeSvgString } from '../lib/barcodeUtils';

export interface BarcodeGraphicProps {
  value: string;
  className?: string;
  height?: number;
  width?: number; // module width (usually 1.5 - 2.5)
  showText?: boolean;
  fontSize?: number;
  format?: 'CODE128' | 'EAN13' | 'CODE39' | 'QR';
  margin?: number;
  background?: string;
  lineColor?: string;
}

export const BarcodeGraphic: React.FC<BarcodeGraphicProps> = ({
  value,
  className = '',
  height = 40,
  width = 2,
  showText = true,
  fontSize = 11,
  format = 'CODE128',
  margin = 10,
  background = '#ffffff',
  lineColor = '#000000',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const cleanVal = (value || '').trim();

  useEffect(() => {
    if (!cleanVal || format !== 'QR') {
      setQrDataUrl(null);
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(cleanVal, {
      width: Math.max(height * 2, 80),
      margin: 1,
      color: {
        dark: lineColor,
        light: background,
      },
    })
      .then(url => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(err => {
        console.warn('QR Code generation failed:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [cleanVal, height, format, background, lineColor]);

  const svgMarkup = useMemo(() => {
    if (!cleanVal || format === 'QR') return '';
    return generateBarcodeSvgString(cleanVal, height, showText, {
      format,
      width,
      margin,
      fontSize,
      background,
      lineColor,
    });
  }, [cleanVal, height, showText, format, width, margin, fontSize, background, lineColor]);

  if (!cleanVal) {
    return (
      <div className={`flex flex-col items-center justify-center p-2 text-xs text-slate-400 ${className}`}>
        [لا يوجد باركود]
      </div>
    );
  }

  if (format === 'QR' && qrDataUrl) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <img
          src={qrDataUrl}
          alt={`QR ${cleanVal}`}
          style={{ width: `${height * 2}px`, height: `${height * 2}px` }}
          className="object-contain"
        />
        {showText && (
          <span
            style={{ color: lineColor, fontSize: `${fontSize}px` }}
            className="font-mono tracking-wider font-bold mt-1 text-center"
          >
            {cleanVal}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
};
