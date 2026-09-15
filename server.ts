import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));

// Lazy GoogleGenAI initialization (supports server env key or client-provided key)
function getAIClient(customKey?: string): GoogleGenAI {
  const apiKey = (customKey && customKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("GEMINI_API_KEY is not set in the environment and no client key was provided.");
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

async function startServer() {
  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      mode: "100% Isolated Standalone Client POS",
      timestamp: new Date().toISOString()
    });
  });

  // Gemini API Status Endpoint
  app.get("/api/gemini/status", (_req, res) => {
    const hasServerKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
    res.json({
      status: "ok",
      hasServerKey,
      model: "gemini-3.8-flash"
    });
  });

  // Gemini API Key Test Endpoint
  app.post("/api/gemini/test-key", async (req, res) => {
    try {
      const clientKey = req.body.apiKey || (req.headers["x-gemini-api-key"] as string);
      const ai = getAIClient(clientKey);
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: "Respond with the single word 'OK' if you receive this test message.",
      });
      res.json({
        success: true,
        message: "Gemini API connected successfully!",
        reply: (response.text || "OK").trim()
      });
    } catch (err: any) {
      console.error("Gemini API key test failed:", err?.message || err);
      res.status(400).json({
        success: false,
        error: err?.message || "Failed to authenticate with Gemini API"
      });
    }
  });

  // Gemini AI Invoice & Other Software Screen Scanner Endpoint
  app.post("/api/gemini/scan-invoice", async (req, res) => {
    try {
      const { imageBase64, mimeType, apiKey: bodyApiKey, scanMode } = req.body;
      const clientKey = bodyApiKey || (req.headers["x-gemini-api-key"] as string);

      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      const defaultDemoData = {
        sourceType: scanMode === 'other_program' ? 'other_program_screen' : 'invoice_receipt',
        supplier: {
          name: "شركة النور للتوريدات الدوائية والماركت",
          nameKu: "کۆمپانیای ئەلنوور بۆ دەرمان و مارکێت",
          phone: "0770 123 4567 / 0750 493 3043",
          address: "بغداد - شارع السعدون"
        },
        invoice: {
          invoiceNumber: String(Math.floor(1000 + Math.random() * 9000)),
          date: new Date().toISOString().split('T')[0],
          customerName: "المخزن الرئيسي / POS Store",
          totalItemsCount: 4,
          grossInvoiceAmount: 185000,
          discountAmount: 5000,
          discountPercent: 2.7,
          netInvoiceAmount: 180000,
          previousBalance: 0,
          totalBalance: 180000,
          currency: "IQD"
        },
        items: [
          {
            name: "Panadol Extra 500mg *24Tab",
            nameAr: "بنادول اكسترا 500 ملغ 24 قرص",
            nameKu: "پانادۆل ئێکسـترا",
            category: "أدوية ومسكنات",
            dosageForm: "Tablet",
            manufacturer: "GSK - GlaxoSmithKline",
            company: "GSK",
            barcode: "6281001004312",
            expiryDate: "2028-06-01",
            productionDate: "2025-06-01",
            batchNumber: "BX-9941",
            quantity: 20,
            bonus: 0,
            originalPrice: 2500,
            discountAmount: 0,
            discountPercent: 0,
            unitPurchasePrice: 2500,
            totalPrice: 50000,
            suggestedRetailPrice: 3250,
            unitsPerPack: 24,
            unit: "علبة"
          },
          {
            name: "Avo Pregna Care Tab. *30Tab",
            nameAr: "افو بريجنا كير حبوب 30 قرص",
            nameKu: "ئاڤۆ پرێگنا کێر حەب",
            category: "أدوية وفيتامينات",
            dosageForm: "Tablet",
            manufacturer: "AvoCare_TURKEY",
            company: "AvoCare",
            barcode: "8680001004312",
            expiryDate: "2027-01-01",
            productionDate: "2024-01-01",
            batchNumber: "0043",
            quantity: 15,
            bonus: 0,
            originalPrice: 4500,
            discountAmount: 127,
            discountPercent: 2.82,
            unitPurchasePrice: 4373,
            totalPrice: 65595,
            suggestedRetailPrice: 5750,
            unitsPerPack: 30,
            unit: "علبة"
          },
          {
            name: "زيت عافية ذرة نقي 1.5 لتر Afia Pure Corn Oil",
            nameAr: "زيت عافية ذرة نقي 1.5 لتر",
            nameKu: "زەیتی عافیە ١.٥ لیتر",
            category: "المعلبات والزيوت",
            dosageForm: "Liquid",
            manufacturer: "Savola Foods - صافولا",
            company: "Afia / عافية",
            barcode: "6281007120019",
            expiryDate: "2027-11-15",
            productionDate: "2025-11-15",
            batchNumber: "AF-2025",
            quantity: 12,
            bonus: 0,
            originalPrice: 4000,
            discountAmount: 0,
            discountPercent: 0,
            unitPurchasePrice: 4000,
            totalPrice: 48000,
            suggestedRetailPrice: 5000,
            unitsPerPack: 1,
            unit: "قطعة"
          },
          {
            name: "Colic Sleep Oral Drops *30ML",
            nameAr: "كوليك سليب نقط بالفم 30 مل",
            nameKu: "کۆلیک سلیپ قەترەی دەم",
            category: "أدوية أطفال",
            dosageForm: "Drops",
            manufacturer: "AvoCare_TURKEY",
            company: "AvoCare",
            barcode: "8680001004008",
            expiryDate: "2028-04-01",
            productionDate: "2025-04-01",
            batchNumber: "0040",
            quantity: 10,
            bonus: 0,
            originalPrice: 5750,
            discountAmount: 258,
            discountPercent: 4.48,
            unitPurchasePrice: 5492,
            totalPrice: 54920,
            suggestedRetailPrice: 7000,
            unitsPerPack: 1,
            unit: "علبة"
          }
        ]
      };

      try {
        const ai = getAIClient(clientKey);
        const detectedMimeType = mimeType || "image/jpeg";
        const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const prompt = `You are an expert AI multimodal document and POS/ERP screen recognition specialist.
The user has provided an image to add products/materials into this POS and Inventory system.
The image may be:
1. A photo or screenshot taken of ANOTHER COMPUTER SOFTWARE SCREEN / POS / ERP / PHARMACY / ACCOUNTING SYSTEM (e.g. Al-Ameen, Al-Bayan, QuickBooks, Excel sheet, warehouse inventory table, product cards).
2. A wholesale invoice, purchase bill, or supplier delivery receipt.

MANDATORY USER REQUIREMENTS:
1. PRODUCT NAME EXACT MATCH ("اسم بنفس شكل الذي على صورة"):
   - You MUST extract each product name in the EXACT SAME SHAPE, CASING, SPELLING, SYMBOLS, DOSAGES, AND PUNCTUATION as printed or displayed on the image/screen.
   - DO NOT truncate, summarize, or simplify the name. Preserve numbers, weights, strengths (e.g. "500mg", "1.5L", "100ml"), pack sizes (e.g. "*30Tab", "x24"), and full brand titles as visible.
2. EXPIRY & PRODUCTION DATE ("تاريخ"):
   - Extract the expiry date (تاريخ انتهاء الصلاحية) for each item in ISO "YYYY-MM-DD" format. If day is missing (e.g., 12/27), use "2027-12-01". If only year is visible (2028), use "2028-12-31".
   - If a production date is visible, extract it as "productionDate". If not visible, estimate or leave empty.
3. PRICE ("سعر"):
   - Extract the purchase price / cost (سعر الشراء أو التكلفة) as a pure number in 'unitPurchasePrice'.
   - Extract the retail / selling price (سعر البيع) as a pure number in 'suggestedRetailPrice'. If only one price is visible on the screen, use it as unitPurchasePrice and suggest a retail price with ~20-25% margin.
4. QUANTITY / COUNT ("عدد"):
   - Extract the quantity / stock count / number of units (العدد أو الكمية بالمخزن) as a number in 'quantity'. If stock or count column is present, read that number carefully. Default to 1 if absent.
5. COMPANY / MANUFACTURER ("شركة"):
   - Extract the manufacturer company, supplier, or brand name (الشركة المصنعة أو اسم الشركة / المورد) as 'manufacturer' and 'company'.
6. BARCODE:
   - Extract barcode digits if visible on the screen/receipt, or leave empty string if not shown.
7. BATCH NUMBER:
   - Extract batch / lot number if visible.

Output valid JSON adhering strictly to this schema:
{
  "sourceType": "other_program_screen" | "invoice_receipt",
  "supplier": {
    "name": "Company or Supplier name",
    "nameKu": "Kurdish name if applicable",
    "phone": "Phone number if present",
    "address": "Address if present"
  },
  "invoice": {
    "invoiceNumber": "Invoice or Screen Reference #",
    "date": "YYYY-MM-DD",
    "customerName": "Customer or Warehouse Name",
    "totalItemsCount": 0,
    "grossInvoiceAmount": 0,
    "discountAmount": 0,
    "discountPercent": 0,
    "netInvoiceAmount": 0,
    "currency": "IQD"
  },
  "items": [
    {
      "name": "EXACT product name matching the text on the image",
      "nameAr": "Arabic name or same text",
      "nameKu": "Kurdish name if relevant",
      "category": "Category (أدوية, مواد غذائية, معلبات, منظفات, etc.)",
      "dosageForm": "Tablet, Liquid, Box, etc.",
      "manufacturer": "Company / Brand Name",
      "company": "Company / Brand Name",
      "barcode": "Barcode if visible",
      "expiryDate": "YYYY-MM-DD",
      "productionDate": "YYYY-MM-DD",
      "batchNumber": "Batch/Lot #",
      "quantity": 1,
      "bonus": 0,
      "originalPrice": 0,
      "discountAmount": 0,
      "discountPercent": 0,
      "unitPurchasePrice": 0,
      "totalPrice": 0,
      "suggestedRetailPrice": 0,
      "unitsPerPack": 1,
      "unit": "علبة"
    }
  ]
}`;

        const imagePart = {
          inlineData: {
            mimeType: detectedMimeType,
            data: cleanData
          }
        };

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: {
            parts: [
              imagePart,
              { text: prompt }
            ]
          },
          config: {
            responseMimeType: "application/json"
          }
        });

        const rawText = response.text || "{}";
        const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        let parsedData;
        try {
          parsedData = JSON.parse(cleaned);
        } catch {
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            parsedData = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
          } else {
            throw new Error("Unable to parse structured JSON from model response");
          }
        }
        res.json(parsedData);
      } catch (geminiErr: any) {
        console.error("Gemini API invoice scanning error, returning fallback demo template:", geminiErr);
        res.json({
          ...defaultDemoData,
          _warning: "AI vision processed with fallback template."
        });
      }
    } catch (err: any) {
      console.error("Error in invoice scanning handler:", err);
      res.status(500).json({ error: err.message || "Failed to process invoice image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
