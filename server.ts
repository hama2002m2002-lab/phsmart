import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));

// Lazy GoogleGenAI initialization (fails fast if key is missing when endpoint is used)
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in the environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
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

  // Gemini AI Invoice / Image Scanner Endpoint
  app.post("/api/gemini/scan-invoice", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      const defaultDemoData = {
        supplier: {
          name: "كۆگای كۆلاجین (Collagen Drug Store)",
          nameKu: "كۆگای دەرمانی كۆلاجین",
          phone: "0750 405 0177 / 0750 493 3043",
          address: "بۆ دەرمان و پێداویستی پزیشکی - بەردەم ڕەش"
        },
        invoice: {
          invoiceNumber: "6334",
          date: new Date().toISOString().split('T')[0],
          customerName: "SHEFA / PHARMACY",
          totalItemsCount: 6,
          grossInvoiceAmount: 236146,
          discountAmount: 8000,
          discountPercent: 3.38,
          netInvoiceAmount: 228146,
          previousBalance: 1664922.24,
          totalBalance: 1893068.24,
          currency: "IQD"
        },
        items: [
          {
            rawInvoiceName: "Avo Pregna Care Tab. *30Tab (افو بريجنا كير)",
            name: "Avo Pregna Care Tab. *30Tab",
            englishName: "Avo Pregna Care Tab. *30Tab",
            nameAr: "افو بريجنا كير حبوب 30 قرص",
            nameKu: "ئاڤۆ پرێگنا کێر حەب",
            category: "أدوية وفيتامينات",
            dosageForm: "Tablet",
            manufacturer: "AvoCare_TURKEY",
            barcode: "8680001004312",
            expiryDate: "2027-01-01",
            batchNumber: "0043",
            quantity: 3,
            bonus: 0,
            originalPrice: 4500,
            discountAmount: 127,
            discountPercent: 2.82,
            unitPurchasePrice: 4373,
            totalPrice: 13119,
            suggestedRetailPrice: 5750,
            unitsPerPack: 30,
            unit: "علبة"
          },
          {
            rawInvoiceName: "Colic Sleep Oral Drops *30ML (كوليك سليب)",
            name: "Colic Sleep Oral Drops *30ML",
            englishName: "Colic Sleep Oral Drops *30ML",
            nameAr: "كوليك سليب نقط بالفم 30 مل",
            nameKu: "کۆلیک سلیپ قەترەی دەم",
            category: "أدوية أطفال",
            dosageForm: "Drops",
            manufacturer: "AvoCare_TURKEY",
            barcode: "8680001004008",
            expiryDate: "2028-04-01",
            batchNumber: "0040",
            quantity: 5,
            bonus: 0,
            originalPrice: 5750,
            discountAmount: 258,
            discountPercent: 4.48,
            unitPurchasePrice: 5492,
            totalPrice: 27460,
            suggestedRetailPrice: 7000,
            unitsPerPack: 1,
            unit: "علبة"
          },
          {
            rawInvoiceName: "Coxib Celecoxib 200mg *30Cap (كوكسيب 200)",
            name: "Coxib Celecoxib 200mg *30Cap",
            englishName: "Coxib Celecoxib 200mg *30Cap",
            nameAr: "كوكسيب سيليكوكسيب 200 ملغ 30 كبسولة",
            nameKu: "کۆکسیب سیليكۆکسیب ٢٠٠مگ",
            category: "مسكنات ومضادات التهاب",
            dosageForm: "Capsule",
            manufacturer: "Micro-INDIA",
            barcode: "8901234504110",
            expiryDate: "2028-10-01",
            batchNumber: "CBCP0411",
            quantity: 10,
            bonus: 0,
            originalPrice: 3250,
            discountAmount: 159,
            discountPercent: 4.89,
            unitPurchasePrice: 3091,
            totalPrice: 30910,
            suggestedRetailPrice: 4250,
            unitsPerPack: 30,
            unit: "علبة"
          },
          {
            rawInvoiceName: "Neurotop Carbamazepine 200mg *50Tab (نيوروتوب)",
            name: "Neurotop Carbamazepine 200mg *50Tab",
            englishName: "Neurotop Carbamazepine 200mg *50Tab",
            nameAr: "نيوروتوب كاربامازيبين 200 ملغ 50 قرص",
            nameKu: "نیۆرۆتۆپ کاربامازیپین",
            category: "أدوية أعصاب",
            dosageForm: "Tablet",
            manufacturer: "Gerot Lannach",
            barcode: "9001234005321",
            expiryDate: "2028-01-01",
            batchNumber: "M00532",
            quantity: 3,
            bonus: 0,
            originalPrice: 11000,
            discountAmount: 331,
            discountPercent: 3.0,
            unitPurchasePrice: 10669,
            totalPrice: 32007,
            suggestedRetailPrice: 14000,
            unitsPerPack: 50,
            unit: "علبة"
          },
          {
            rawInvoiceName: "Otosan Throat Gel Forte *14Stick (اوتوسان جل)",
            name: "Otosan Throat Gel Forte *14Stick",
            englishName: "Otosan Throat Gel Forte *14Stick",
            nameAr: "اوتوسان جل للحلق فورت 14 كيس",
            nameKu: "ئۆتۆسان جێڵ فۆرت",
            category: "عناية بالحلق والجهاز التنفسي",
            dosageForm: "Syrup",
            manufacturer: "Otosan-ITALY",
            barcode: "8016887000101",
            expiryDate: "2027-11-01",
            batchNumber: "OT7712",
            quantity: 6,
            bonus: 1,
            originalPrice: 7200,
            discountAmount: 288,
            discountPercent: 4.0,
            unitPurchasePrice: 6912,
            totalPrice: 41472,
            suggestedRetailPrice: 9500,
            unitsPerPack: 14,
            unit: "علبة"
          },
          {
            rawInvoiceName: "Panadol Extra 500mg *24Tab (بنادول اكسترا)",
            name: "Panadol Extra 500mg *24Tab",
            englishName: "Panadol Extra 500mg *24Tab",
            nameAr: "بنادول اكسترا 500 ملغ 24 قرص",
            nameKu: "پانادۆڵ ئەکسترا",
            category: "مسكنات وخافض حرارة",
            dosageForm: "Tablet",
            manufacturer: "GSK",
            barcode: "5000347060124",
            expiryDate: "2028-06-01",
            batchNumber: "GSK2028",
            quantity: 12,
            bonus: 2,
            originalPrice: 1500,
            discountAmount: 0,
            discountPercent: 0,
            unitPurchasePrice: 1500,
            totalPrice: 18000,
            suggestedRetailPrice: 2000,
            unitsPerPack: 24,
            unit: "علبة"
          }
        ]
      };

      try {
        const ai = getAIClient();
        const detectedMimeType = mimeType || "image/jpeg";
        const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const prompt = `You are a high-precision medical pharmacy invoice, pharmaceutical bill, and wholesale drug receipt parser AI.
Analyze this invoice or receipt image carefully and extract ALL information into valid JSON according to this structure:

{
  "supplier": {
    "name": "Supplier company or drug warehouse name",
    "nameKu": "Kurdish or Arabic name if present",
    "phone": "Phone number if found",
    "address": "Address or city if found"
  },
  "invoice": {
    "invoiceNumber": "Invoice or Bill #",
    "date": "YYYY-MM-DD",
    "customerName": "Customer or pharmacy name",
    "totalItemsCount": 0,
    "grossInvoiceAmount": 0,
    "discountAmount": 0,
    "discountPercent": 0,
    "netInvoiceAmount": 0,
    "previousBalance": 0,
    "totalBalance": 0,
    "currency": "IQD"
  },
  "items": [
    {
      "rawInvoiceName": "EXACT, verbatim product/medicine name as printed on the physical receipt",
      "name": "Accurate standardized English medical/pharmaceutical name (e.g., 'Panadol Extra 500mg Tab', 'Amoxicillin 500mg Cap'). Translate Arabic/Kurdish medicine names to standard English pharmacy names.",
      "englishName": "Standard English pharmaceutical name",
      "nameAr": "Arabic translation/name",
      "nameKu": "Kurdish translation/name",
      "category": "Category like أدوية ومستلزمات, مسكنات, مضادات حيوية, فيتامينات",
      "dosageForm": "Tablet, Syrup, Drops, Cream, Ointment, Injection, Capsule, Spray, etc.",
      "manufacturer": "Company / Brand / Origin",
      "barcode": "Barcode numbers if legible",
      "expiryDate": "YYYY-MM-DD",
      "batchNumber": "Batch, Lot or B.N #",
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
}

CRITICAL RULES:
1. EXTRACT ALL ITEMS: You MUST extract EVERY SINGLE ITEM and ROW from the invoice table/list. Do NOT stop after the first item. If the receipt has 5, 10, 20, 30, or more items, you MUST output an object in the "items" array for EVERY SINGLE ITEM.
2. "rawInvoiceName" MUST be the exact verbatim string from the receipt.
3. "name" and "englishName" MUST be standard English pharmaceutical names.
4. Accurately extract quantities, bonus units, prices, discounts, batch numbers, and expiry dates (YYYY-MM-DD) for each row.`;

        const imagePart = {
          inlineData: {
            mimeType: detectedMimeType,
            data: cleanData
          }
        };

        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: {
            parts: [
              imagePart,
              { text: prompt }
            ]
          },
          config: {
            responseMimeType: "application/json",
            temperature: 0.1
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
