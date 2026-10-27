// Dynamic loader for pdfjsLib with resilient worker resolution
async function getPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      // Vite native worker import
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    } catch {
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '6.3.289'}/build/pdf.worker.min.mjs`;
      } catch {
        // Fallback: allow main-thread execution
        pdfjs.GlobalWorkerOptions.workerSrc = '';
      }
    }
  }
  return pdfjs;
}

export interface PdfInspectionResult {
  numPages: number;
  pagesDataUrls: string[];
  extractedText?: string;
  pagesText?: string[];
}

/**
 * Counts the pages in a PDF file and renders pages to crisp image data URLs
 * with enhanced contrast for superior OCR on small invoice fonts.
 * Also extracts embedded digital text organized by table rows.
 */
export async function inspectAndRenderPdf(
  file: File,
  maxPagesToRender: number = 50,
  scale: number = 2.2
): Promise<PdfInspectionResult> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  
  let pdf: any;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapPacked: true,
    });
    pdf = await loadingTask.promise;
  } catch (workerErr) {
    console.warn('[pdfHelper] Primary getDocument failed, retrying without external worker:', workerErr);
    try {
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      }
      const fallbackTask = (pdfjsLib as any).getDocument({
        data: new Uint8Array(arrayBuffer),
      });
      pdf = await fallbackTask.promise;
    } catch (fbErr) {
      console.error('[pdfHelper] Fallback getDocument failed:', fbErr);
      // Raw string fallback to extract any text from the PDF file directly
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = textDecoder.decode(new Uint8Array(arrayBuffer));
      const cleanRawStrings = rawText.match(/[a-zA-Z0-9\u0600-\u06FF\u0750-\u077F\.\,\-\*]{3,}/g) || [];
      return {
        numPages: 1,
        pagesDataUrls: [],
        extractedText: cleanRawStrings.join(' ')
      };
    }
  }

  const numPages = pdf?.numPages || 1;
  const pagesDataUrls: string[] = [];
  const textSnippets: string[] = [];
  const pagesText: string[] = [];

  const pagesToProcess = Math.min(numPages, maxPagesToRender);

  for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      
      // Try to extract embedded digital text if present and organize line-by-line
      let pageText = '';
      try {
        const textContent = await page.getTextContent();
        if (textContent?.items?.length > 0) {
          // Sort items top-to-bottom (Y descending in PDF), then left-to-right (X ascending)
          const items = (textContent.items as any[])
            .filter(it => it && typeof it.str === 'string' && it.str.trim().length > 0)
            .map(it => ({
              str: it.str,
              x: it.transform ? it.transform[4] : 0,
              y: it.transform ? it.transform[5] : 0,
            }));

          // Group by Y within a 5-point tolerance to reconstruct table rows
          items.sort((a, b) => b.y - a.y || a.x - b.x);
          const lines: string[] = [];
          let currentLine: typeof items = [];
          let currentY: number | null = null;

          for (const item of items) {
            if (currentY === null || Math.abs(item.y - currentY) <= 5) {
              currentLine.push(item);
              currentY = currentY === null ? item.y : currentY;
            } else {
              // Sort current line left-to-right
              currentLine.sort((a, b) => a.x - b.x);
              lines.push(currentLine.map(c => c.str).join(' '));
              currentLine = [item];
              currentY = item.y;
            }
          }
          if (currentLine.length > 0) {
            currentLine.sort((a, b) => a.x - b.x);
            lines.push(currentLine.map(c => c.str).join(' '));
          }

          pageText = lines.join('\n');
          if (pageText.trim()) {
            textSnippets.push(`--- Page ${pageNum} ---\n` + pageText);
          }
        }
      } catch (textErr) {
        console.warn(`[pdfHelper] Could not extract text from page ${pageNum}:`, textErr);
      }
      pagesText.push(pageText);

      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas
        };
        await (page.render(renderContext as any) as any).promise;

        // Auto-enhance contrast for sharper text OCR on invoices
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          // Apply a gentle contrast boost (contrast factor 1.15) to make numbers and small fonts pop
          const factor = (259 * (28 + 255)) / (255 * (259 - 28));
          for (let p = 0; p < data.length; p += 4) {
            data[p] = Math.min(255, Math.max(0, factor * (data[p] - 128) + 128));
            data[p + 1] = Math.min(255, Math.max(0, factor * (data[p + 1] - 128) + 128));
            data[p + 2] = Math.min(255, Math.max(0, factor * (data[p + 2] - 128) + 128));
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (contrastErr) {
          console.warn('[pdfHelper] Contrast enhancement skipped:', contrastErr);
        }

        pagesDataUrls.push(canvas.toDataURL('image/jpeg', 0.92));
      }
    } catch (renderErr) {
      console.warn(`[pdfHelper] Error rendering PDF page ${pageNum}:`, renderErr);
    }
  }

  return {
    numPages,
    pagesDataUrls,
    extractedText: textSnippets.join('\n\n'),
    pagesText
  };
}

/**
 * Quick helper to only get page count of a PDF file
 */
export async function getPdfPageCount(file: File): Promise<number> {
  try {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
    });
    const pdf = await loadingTask.promise;
    return pdf.numPages || 1;
  } catch (err) {
    console.warn('[pdfHelper] Error getting PDF page count:', err);
    return 1;
  }
}
