import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - use unpkg or workerSrc
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

export interface PdfInspectionResult {
  numPages: number;
  pagesDataUrls: string[];
  extractedText?: string;
}

/**
 * Counts the pages in a PDF file and renders pages to crisp image data URLs
 * with enhanced contrast for superior OCR on small invoice fonts.
 * Also extracts embedded digital text if available.
 */
export async function inspectAndRenderPdf(
  file: File,
  maxPagesToRender: number = 25,
  scale: number = 2.0
): Promise<PdfInspectionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages || 1;
  const pagesDataUrls: string[] = [];
  const textSnippets: string[] = [];

  const pagesToProcess = Math.min(numPages, maxPagesToRender);

  for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      
      // Try to extract embedded digital text if present
      try {
        const textContent = await page.getTextContent();
        if (textContent?.items?.length > 0) {
          const pageStrings = textContent.items
            .map((it: any) => ('str' in it ? it.str : ''))
            .filter(Boolean);
          if (pageStrings.length > 0) {
            textSnippets.push(`--- Page ${pageNum} ---\n` + pageStrings.join(' '));
          }
        }
      } catch (textErr) {
        console.warn(`[pdfHelper] Could not extract text from page ${pageNum}:`, textErr);
      }

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
    extractedText: textSnippets.join('\n\n')
  };
}

/**
 * Quick helper to only get page count of a PDF file
 */
export async function getPdfPageCount(file: File): Promise<number> {
  try {
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
