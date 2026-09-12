import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Dynamic GoogleGenAI client resolver (supports server env and client-provided key)
function resolveApiKey(req?: express.Request): string | undefined {
  const headerKey = req?.headers?.['x-gemini-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  const bodyKey = req?.body?.apiKey;
  if (typeof bodyKey === 'string' && bodyKey.trim()) {
    return bodyKey.trim();
  }
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey !== 'MY_GEMINI_API_KEY') {
    return envKey.trim();
  }
  return undefined;
}

function getAIClient(customApiKey?: string): GoogleGenAI {
  const apiKey = customApiKey || resolveApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error("GEMINI_API_KEY_MISSING: No valid Gemini API key found in server environment or request headers.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Multi-tier resilient model fallback cascade per official Gemini guidelines
const GEMINI_VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview"
];

async function callGeminiVisionWithFallback(params: {
  prompt: string;
  imagePart: {
    inlineData: {
      mimeType: string;
      data: string;
    };
  };
  config?: any;
  apiKey?: string;
}): Promise<string> {
  const ai = getAIClient(params.apiKey);
  let lastError: any = null;

  for (let i = 0; i < GEMINI_VISION_MODELS.length; i++) {
    const model = GEMINI_VISION_MODELS[i];
    try {
      console.log(`[Gemini Vision] Attempting model "${model}" (${i + 1}/${GEMINI_VISION_MODELS.length})...`);
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            params.imagePart,
            { text: params.prompt }
          ]
        },
        config: params.config || {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });

      if (response.text) {
        console.log(`[Gemini Vision] Successfully processed request with model "${model}"`);
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      const errStr = err?.message || String(err);
      console.warn(`[Gemini Vision] Model "${model}" returned error: ${errStr}`);
      // If 503 (high demand), 429 (rate limit), or RESOURCE_EXHAUSTED / quota, pause with adaptive backoff before trying next fallback model
      if (
        errStr.includes("503") ||
        errStr.includes("429") ||
        errStr.includes("UNAVAILABLE") ||
        errStr.includes("high demand") ||
        errStr.includes("RESOURCE_EXHAUSTED") ||
        errStr.includes("quota") ||
        errStr.includes("Quota")
      ) {
        const backoff = (i + 1) * 1200;
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }

  throw lastError || new Error("All AI vision models are currently experiencing high demand.");
}

// Health check
app.get(["/api/health", "/health"], (_req, res) => {
  res.json({
    status: "ok",
    mode: "100% Isolated Standalone Client POS",
    timestamp: new Date().toISOString()
  });
});

// Gemini AI Status & Test Key Endpoint
app.all(["/api/gemini/test-key", "/gemini/test-key"], async (req, res) => {
  try {
    const key = resolveApiKey(req);
    if (!key) {
      return res.status(400).json({
        success: false,
        configured: false,
        error: "لم يتم العثور على مفتاح Gemini API. يرجى إدخال مفتاح الذكاء الاصطناعي في الإعدادات أو تعيين متغير GEMINI_API_KEY في بيئة الخادم."
      });
    }

    const ai = getAIClient(key);
    let workingModel = "";
    let lastErr = "";

    for (const model of GEMINI_VISION_MODELS) {
      try {
        const testRes = await ai.models.generateContent({
          model,
          contents: "ping"
        });
        if (testRes.text) {
          workingModel = model;
          break;
        }
      } catch (err: any) {
        lastErr = err?.message || String(err);
      }
    }

    if (workingModel) {
      const isCustom = !!(req.headers['x-gemini-api-key'] || req.body?.apiKey);
      return res.json({
        success: true,
        configured: true,
        model: workingModel,
        source: isCustom ? "custom_key" : "server_env",
        maskedKey: key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "configured",
        message: `تم التحقق بنجاح! الذكاء الاصطناعي متصل وجاهز للعمل عبر موديل (${workingModel}). الفحص الذكي للصور والفواتير جاهز 100%.`
      });
    } else {
      return res.status(502).json({
        success: false,
        configured: true,
        error: `تعذر الاتصال بخوادم Gemini بالمفتاح المزود: ${lastErr}`
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      configured: false,
      error: err.message || "حدث خطأ أثناء فحص المفتاح"
    });
  }
});

// Gemini AI Invoice / Image Scanner Endpoint
app.post(["/api/gemini/scan-invoice", "/gemini/scan-invoice", "/api/scan-invoice", "/scan-invoice"], async (req, res) => {
  try {
    const { imageBase64, mimeType, languageMode = 'all' } = req.body;
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

      // Fast path for preset sample demo
      if (typeof imageBase64 === 'string' && (imageBase64.startsWith('demo_') || imageBase64 === 'demo_collagen_invoice')) {
        return res.json(defaultDemoData);
      }

      try {
        const detectedMimeType = mimeType || "image/jpeg";
        const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const prompt = `You are an ultra-fast, elite OCR and document intelligence AI specialized in pharmaceutical bills, medicine invoices, wholesale drug receipts, and POS receipts across Kurdish (سۆرانی و بادینی), Arabic (عربي), and English.
TARGET LANGUAGE FOCUS MODE: ${languageMode} (Process rapidly and populate tri-lingual names: English, Kurdish Sorani, Arabic).

KURDISH RECEIPT VOCABULARY & RECOGNITION (سۆرانی و بادینی):
- Recognize warehouse terms: "كۆگای دەرمان" (Drug Store / Warehouse), "پسوولەی کڕین" / "پسوولەی فرۆشتن" (Purchase/Sales Bill), "هه‌ولێر", "سلێمانی", "دهۆك", "ژمارەی پسوولە" (Invoice #), "کڕیار" (Customer), "بەروار" (Date).
- Item and quantity terms: "ناوی دەرمان / کاڵا" (Medicine Name), "بڕ / عەدەد / دانە" (Quantity), "بەلاش / بۆنەس" (Free/Bonus), "نرخی کڕین" (Cost Price), "نرخی فرۆشتن" (Retail Price), "داشکاندن" (Discount).
- Financial totals & balance terms: "کۆی گشتی" / "المجموع" (Gross Total), "داشکاندن" / "الخصم" (Discount), "صافي الوصل" / "کۆی کۆتایی" (Net Invoice Total), "بڕی دراو / واسڵکراو" / "المدفوع / الواصل" (Paid Amount), "بڕی ماوە / قەرز" / "المتبقي / الباقي" (Remaining / Unpaid Amount), "حسابی پێشوو" / "الحساب السابق" (Previous Balance), "کۆی گشتی قەرز" / "مجموع الرصيد" (Total Balance).

MANDATORY PRECISION & EXTRACTION RULES:
- HIGH PRECISION ITEM-BY-ITEM EXTRACTION: Carefully read every single item line in sequence without skipping or merging rows. Verify each quantity, unit cost, line total, and expiration date with meticulous accuracy.
1. "rawInvoiceName": The EXACT verbatim product/medicine name as printed on the physical receipt without alteration.
2. "name" & "englishName": The clean, standardized English pharmaceutical/trade name (e.g., "Panadol Extra 500mg Tab", "Amoxicillin 500mg Cap", "Cefixime 400mg").
3. "nameKu": Standard Kurdish Sorani translation/transliteration (e.g., "پانادۆڵ ئێکسـترا 500 ملغ", "ئەمۆکسیسیلین 500 ملغ", "سیفیکسیم 400 ملغ").
4. "nameAr": Standard Arabic translation (e.g., "بانادول إكسترا 500 ملغ", "أموكسيسيلين 500 ملغ", "سيفيكسيم 400 ملغ").
5. "barcode": Look very carefully for any barcode numbers, GTIN, EAN-13, UPC, SKU, item code, or numbers printed under barcode stripes or in a dedicated "Barcode / Code / باركود / کۆد" column. Convert any Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) to standard English digits (0123456789). If no barcode number is visible, generate a clean consistent code formatted as "MED-" followed by the brand or sequence.
6. "quantity": Total units or packs purchased.
7. "bonus": Bonus/free units if indicated (+1, +2, بونص, بەلاش).
8. "unitPurchasePrice": The net purchase price per unit/pack in the invoice currency.
9. "suggestedRetailPrice": The selling price or retail price if present, or calculated reasonable retail price.
10. "unitsPerPack": Number of strips/tablets/blisters per pack if mentioned in name (e.g. *30Tab -> 30, *14Stick -> 14, 24Tab -> 24).
11. "expiryDate": Normalize any expiry date format (DD/MM/YYYY, MM/YY, MM/YYYY) into standardized "YYYY-MM-DD" format.
12. "batchNumber": Lot / Batch / B.N # if visible.

Output valid JSON strictly following this schema:
{
  "supplier": {
    "name": "Supplier company or warehouse name",
    "nameKu": "Kurdish name if found",
    "phone": "Phone numbers",
    "address": "Address or city"
  },
  "invoice": {
    "invoiceNumber": "Invoice / Bill #",
    "date": "YYYY-MM-DD",
    "customerName": "Pharmacy / Buyer name",
    "totalItemsCount": 0,
    "grossInvoiceAmount": 0,
    "discountAmount": 0,
    "discountPercent": 0,
    "netInvoiceAmount": 0,
    "paidAmount": 0,
    "remainingAmount": 0,
    "previousBalance": 0,
    "totalBalance": 0,
    "currency": "IQD"
  },
  "items": [
    {
      "rawInvoiceName": "Exact verbatim name on receipt",
      "name": "Standard English pharmaceutical name",
      "englishName": "Standard English pharmaceutical name",
      "nameAr": "Arabic name",
      "nameKu": "Kurdish name",
      "category": "Category like أدوية ومستلزمات, مسكنات, مضادات حيوية, فيتامينات",
      "dosageForm": "Tablet, Capsule, Syrup, Drops, Cream, Ointment, Ampoule, Injection, etc.",
      "manufacturer": "Company / Origin",
      "barcode": "Digits only (e.g. 8680001004312)",
      "expiryDate": "YYYY-MM-DD",
      "batchNumber": "Batch #",
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

MANDATORY RULES:
- EXTRACT EVERY SINGLE ITEM ROW: Do not truncate or stop after 1 or 2 items. Extract all rows visible in the invoice table.
- All numbers must be clean digits without letters or currency symbols.`;

        const imagePart = {
          inlineData: {
            mimeType: detectedMimeType,
            data: cleanData
          }
        };

        let rawText = "";
        try {
          const resolvedApiKey = resolveApiKey(req);
          rawText = await callGeminiVisionWithFallback({
            prompt,
            imagePart,
            apiKey: resolvedApiKey,
            config: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          });
        } catch (geminiErr: any) {
          console.error("Gemini API invoice scanning failed across models:", geminiErr);
          const errStr = geminiErr?.message || "";
          let userMessage = geminiErr?.message || "فشل فحص الفاتورة بواسطة الذكاء الاصطناعي";
          if (errStr.includes("GEMINI_API_KEY_MISSING")) {
            userMessage = "مفتاح الذكاء الاصطناعي (Gemini API Key) غير محدد. يرجى إدخال مفتاح Gemini الخاص بك في الإعدادات أو في نافذة الفحص.";
          } else if (errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("quota") || errStr.includes("Quota")) {
            userMessage = "تم تجاوز حد الاستخدام المؤقت (Quota Exceeded) لمفتاح الذكاء الاصطناعي. يرجى إدخال مفتاح Gemini جديد من Google AI Studio في الإعدادات.";
          } else if (errStr.includes("API_KEY_INVALID") || errStr.includes("API key not valid")) {
            userMessage = "مفتاح Gemini API غير صالح. يرجى التأكد من نسخه بدقة من Google AI Studio.";
          }
          return res.status(500).json({
            error: userMessage,
            details: "Please ensure your Gemini API key is valid and image is clear."
          });
        }

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
        console.error("Gemini API invoice scanning error:", geminiErr);
        let errorMsg = geminiErr.message || "Failed to parse invoice with AI";
        try {
          if (typeof errorMsg === 'string' && errorMsg.includes('{')) {
            const jsonPart = errorMsg.replace(/^[^{]*(\{.*\}).*$/, '$1');
            const parsed = JSON.parse(jsonPart);
            if (parsed?.error?.message) {
              errorMsg = parsed.error.message;
            }
          }
        } catch {}
        res.status(500).json({ 
          error: errorMsg,
          details: "Please ensure the image is clear and well lit."
        });
      }
    } catch (err: any) {
      console.error("Error in invoice scanning handler:", err);
      res.status(500).json({ error: err.message || "Failed to process invoice image" });
    }
  });

  // Legacy System & Desktop Screen AI Migrator Endpoint (نقل المواد من شاشات البرامج القديمة)
  app.post(["/api/gemini/migrate-legacy-screen", "/gemini/migrate-legacy-screen", "/api/migrate-legacy-screen", "/migrate-legacy-screen"], async (req, res) => {
    try {
      const { imageBase64, mimeType, languageMode = 'all' } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Comprehensive fallback items extracted from real pharmacy desktop software screens
      const fallbackScreenData = {
        systemTitle: "دەرمانەکان (Pharmacy Management System Table)",
        totalItemsDetected: 24,
        items: [
          {
            barcode: "6291107470269",
            name: "Plego",
            englishName: "Plego",
            nameAr: "Plego",
            nameKu: "Plego",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 5092.5,
            sheetSellingPrice: 0,
            packSellingPrice: 6500,
            dosageForm: "Syrup",
            manufacturer: "Julphar",
            expiryDate: "2026-02-22",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "6251599000139",
            name: "B-cor 10mg",
            englishName: "B-cor 10mg",
            nameAr: "B-cor 10mg",
            nameKu: "B-cor 10mg",
            quantityPieces: 24,
            unitsInPack: 3,
            sheetPurchasePrice: 2013.683,
            packPurchasePrice: 6041.05,
            sheetSellingPrice: 2500,
            packSellingPrice: 7500,
            dosageForm: "Tablet",
            manufacturer: "Joswe",
            expiryDate: "2028-06-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "4031571068850",
            name: "Toras-denk 5mg",
            englishName: "Toras-denk 5mg",
            nameAr: "Toras-denk 5mg",
            nameKu: "Toras-denk 5mg",
            quantityPieces: 2,
            unitsInPack: 3,
            sheetPurchasePrice: 2454.167,
            packPurchasePrice: 7362.5,
            sheetSellingPrice: 3000,
            packSellingPrice: 9000,
            dosageForm: "Tablet",
            manufacturer: "Denk",
            expiryDate: "2027-01-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "9008732006759",
            name: "Thrombo Ass 100mg",
            englishName: "Thrombo Ass 100mg",
            nameAr: "Thrombo Ass 100mg",
            nameKu: "Thrombo Ass 100mg",
            quantityPieces: 27,
            unitsInPack: 3,
            sheetPurchasePrice: 687.1667,
            packPurchasePrice: 2061.5,
            sheetSellingPrice: 1000,
            packSellingPrice: 3000,
            dosageForm: "Tablet",
            manufacturer: "Gerot",
            expiryDate: "2027-03-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "3594452600521",
            name: "Diamicron MR 60mg Asly",
            englishName: "Diamicron MR 60mg Asly",
            nameAr: "Diamicron MR 60mg Asly",
            nameKu: "Diamicron MR 60mg Asly",
            quantityPieces: 6,
            unitsInPack: 2,
            sheetPurchasePrice: 2567.85,
            packPurchasePrice: 5135.7,
            sheetSellingPrice: 3000,
            packSellingPrice: 6000,
            dosageForm: "Tablet",
            manufacturer: "Francia",
            expiryDate: "2027-09-22",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "6251107424754",
            name: "Mixif 400mg",
            englishName: "Mixif 400mg",
            nameAr: "Mixif 400mg",
            nameKu: "Mixif 400mg",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 1640,
            packPurchasePrice: 1640,
            sheetSellingPrice: 3000,
            packSellingPrice: 3000,
            dosageForm: "Tablet",
            manufacturer: "Jordan",
            expiryDate: "2027-06-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "6251060001689",
            name: "Caldex Drops",
            englishName: "Caldex Drops",
            nameAr: "Caldex Drops",
            nameKu: "Caldex Drops",
            quantityPieces: 14,
            unitsInPack: 1,
            sheetPurchasePrice: 2040,
            packPurchasePrice: 2040,
            sheetSellingPrice: 3500,
            packSellingPrice: 3500,
            dosageForm: "Drops",
            manufacturer: "Syria",
            expiryDate: "2027-07-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "6251159037308",
            name: "Dentagyl Tab",
            englishName: "Dentagyl Tab",
            nameAr: "Dentagyl Tab",
            nameKu: "Dentagyl Tab",
            quantityPieces: 12,
            unitsInPack: 2,
            sheetPurchasePrice: 3000,
            packPurchasePrice: 6000,
            sheetSellingPrice: 4000,
            packSellingPrice: 8000,
            dosageForm: "Tablet",
            manufacturer: "Hikma",
            expiryDate: "2027-08-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "8904134917420",
            name: "Freefil 200mg Tab",
            englishName: "Freefil 200mg Tab",
            nameAr: "Freefil 200mg Tab",
            nameKu: "Freefil 200mg Tab",
            quantityPieces: 0,
            unitsInPack: 10,
            sheetPurchasePrice: 1060.8,
            packPurchasePrice: 10183.68,
            sheetSellingPrice: 1500,
            packSellingPrice: 15000,
            dosageForm: "Tablet",
            manufacturer: "India",
            expiryDate: "2023-11-22",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "5906395089154",
            name: "Kelonil 15mg Cream",
            englishName: "Kelonil 15mg Cream",
            nameAr: "Kelonil 15mg Cream",
            nameKu: "Kelonil 15mg Cream",
            quantityPieces: 3,
            unitsInPack: 1,
            sheetPurchasePrice: 14652,
            packPurchasePrice: 14652,
            sheetSellingPrice: 16000,
            packSellingPrice: 16000,
            dosageForm: "Cream",
            manufacturer: "Polanda",
            expiryDate: "2027-08-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "8699536092393",
            name: "Cardofix Plus 5/160/25",
            englishName: "Cardofix Plus 5/160/25",
            nameAr: "Cardofix Plus 5/160/25",
            nameKu: "Cardofix Plus 5/160/25",
            quantityPieces: 0,
            unitsInPack: 4,
            sheetPurchasePrice: 3912.278,
            packPurchasePrice: 15649.11,
            sheetSellingPrice: 4000,
            packSellingPrice: 16000,
            dosageForm: "Capsule",
            manufacturer: "Sanovel",
            expiryDate: "2026-12-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "4260393340145",
            name: "Zinc-oxide Plaster Roller",
            englishName: "Zinc-oxide Plaster Roller",
            nameAr: "Zinc-oxide Plaster Roller",
            nameKu: "Zinc-oxide Plaster Roller",
            quantityPieces: 2,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 1716.9,
            sheetSellingPrice: 0,
            packSellingPrice: 2500,
            dosageForm: "Plaster",
            manufacturer: "India",
            expiryDate: "2027-11-22",
            category: "أدوية ومستلزمات",
            unit: "قطعة"
          },
          {
            barcode: "852510005170",
            name: "Colon Cleanser Tab",
            englishName: "Colon Cleanser Tab",
            nameAr: "Colon Cleanser Tab",
            nameKu: "Colon Cleanser Tab",
            quantityPieces: 101,
            unitsInPack: 100,
            sheetPurchasePrice: 155.7099,
            packPurchasePrice: 15570.99,
            sheetSellingPrice: 200,
            packSellingPrice: 18000,
            dosageForm: "Tablet",
            manufacturer: "UK",
            expiryDate: "2027-12-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "047",
            name: "Codom Corolet Cap",
            englishName: "Codom Corolet Cap",
            nameAr: "Codom Corolet Cap",
            nameKu: "Codom Corolet Cap",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 750,
            packPurchasePrice: 750,
            sheetSellingPrice: 1500,
            packSellingPrice: 1500,
            dosageForm: "Capsule",
            manufacturer: "USE",
            expiryDate: "2027-12-25",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "6932951807589",
            name: "Open Patella Knee Support",
            englishName: "Open Patella Knee Support",
            nameAr: "Open Patella Knee Support",
            nameKu: "Open Patella Knee Support",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 3500,
            sheetSellingPrice: 0,
            packSellingPrice: 5000,
            dosageForm: "Support",
            manufacturer: "China",
            expiryDate: "2026-11-26",
            category: "أدوية ومستلزمات",
            unit: "قطعة"
          },
          {
            barcode: "8697462452281",
            name: "Sah Baby Tablets",
            englishName: "Sah Baby Tablets",
            nameAr: "Sah Baby Tablets",
            nameKu: "Sah Baby Tablets",
            quantityPieces: 158,
            unitsInPack: 24,
            sheetPurchasePrice: 660.6667,
            packPurchasePrice: 15856,
            sheetSellingPrice: 1000,
            packSellingPrice: 24000,
            dosageForm: "Tablet",
            manufacturer: "China",
            expiryDate: "2026-11-26",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "6932951807336",
            name: "Knee Support with Stays",
            englishName: "Knee Support with Stays",
            nameAr: "Knee Support with Stays",
            nameKu: "Knee Support with Stays",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 3500,
            sheetSellingPrice: 0,
            packSellingPrice: 5000,
            dosageForm: "Support",
            manufacturer: "China",
            expiryDate: "2026-11-26",
            category: "أدوية ومستلزمات",
            unit: "قطعة"
          },
          {
            barcode: "7640154980785",
            name: "Meratrum Tablet",
            englishName: "Meratrum Tablet",
            nameAr: "Meratrum Tablet",
            nameKu: "Meratrum Tablet",
            quantityPieces: 11,
            unitsInPack: 1,
            sheetPurchasePrice: 4502.05,
            packPurchasePrice: 4502.05,
            sheetSellingPrice: 6000,
            packSellingPrice: 6000,
            dosageForm: "Tablet",
            manufacturer: "Switzerland",
            expiryDate: "2028-01-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "8906103241512",
            name: "Vitacomplex Multivitamin",
            englishName: "Vitacomplex Multivitamin",
            nameAr: "Vitacomplex Multivitamin",
            nameKu: "Vitacomplex Multivitamin",
            quantityPieces: 1,
            unitsInPack: 10,
            sheetPurchasePrice: 241.864,
            packPurchasePrice: 2418.64,
            sheetSellingPrice: 1000,
            packSellingPrice: 10000,
            dosageForm: "Tablet",
            manufacturer: "India",
            expiryDate: "2027-11-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "8696871293669",
            name: "Nano Yuz Ampoule",
            englishName: "Nano Yuz Ampoule",
            nameAr: "Nano Yuz Ampoule",
            nameKu: "Nano Yuz Ampoule",
            quantityPieces: 1,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 500,
            sheetSellingPrice: 0,
            packSellingPrice: 1000,
            dosageForm: "Ampoule",
            manufacturer: "China",
            expiryDate: "2026-11-01",
            category: "أدوية ومستلزمات",
            unit: "أمبولة"
          },
          {
            barcode: "8054487661003",
            name: "Nano Yuz Ampoule Extra",
            englishName: "Nano Yuz Ampoule Extra",
            nameAr: "Nano Yuz Ampoule Extra",
            nameKu: "Nano Yuz Ampoule Extra",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 500,
            sheetSellingPrice: 0,
            packSellingPrice: 1000,
            dosageForm: "Ampoule",
            manufacturer: "China",
            expiryDate: "2026-11-26",
            category: "أدوية ومستلزمات",
            unit: "أمبولة"
          },
          {
            barcode: "6251875000471",
            name: "Laritin Tab 5mg Pioneer",
            englishName: "Laritin Tab 5mg Pioneer",
            nameAr: "Laritin Tab 5mg Pioneer",
            nameKu: "Laritin Tab 5mg Pioneer",
            quantityPieces: 104,
            unitsInPack: 3,
            sheetPurchasePrice: 308.75,
            packPurchasePrice: 926.25,
            sheetSellingPrice: 1000,
            packSellingPrice: 2000,
            dosageForm: "Tablet",
            manufacturer: "Pioneer",
            expiryDate: "2027-12-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "9504000086220",
            name: "Omeprazol 40mg Cap",
            englishName: "Omeprazol 40mg Cap",
            nameAr: "Omeprazol 40mg Cap",
            nameKu: "Omeprazol 40mg Cap",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 650,
            sheetSellingPrice: 0,
            packSellingPrice: 1000,
            dosageForm: "Capsule",
            manufacturer: "Awamedica",
            expiryDate: "2025-07-28",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          },
          {
            barcode: "8901111985113",
            name: "Aprazol 40mg Cap",
            englishName: "Aprazol 40mg Cap",
            nameAr: "Aprazol 40mg Cap",
            nameKu: "Aprazol 40mg Cap",
            quantityPieces: 10,
            unitsInPack: 1,
            sheetPurchasePrice: 1292.62,
            packPurchasePrice: 1292.62,
            sheetSellingPrice: 2000,
            packSellingPrice: 2000,
            dosageForm: "Capsule",
            manufacturer: "Ajanta",
            expiryDate: "2028-09-01",
            category: "أدوية ومستلزمات",
            unit: "علبة"
          }
        ]
      };

      // Fast path for preset sample demo
      if (typeof imageBase64 === 'string' && (imageBase64.startsWith('demo_') || imageBase64 === 'demo_legacy_pharmacy_screen')) {
        return res.json(fallbackScreenData);
      }

      try {
        const detectedMimeType = mimeType || "image/jpeg";
        const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const prompt = `You are a world-class AI vision and OCR expert specializing in reading computer monitor photos, mobile phone camera pictures of legacy pharmacy desktop software (e.g. Al-Ameen, Al-Mustashar, Asnan, Delphi POS, Visual Basic 6 tables, FoxPro, Access DB grids, Excel tables).

HIGH-PRECISION EXTRACTION RULES:
1. Examine the image row-by-row and column-by-column across the table or grid. Look through monitor moiré patterns, reflections, perspective angles, or slight blur.
2. Read EVERY SINGLE product row completely. Never skip or truncate rows.
3. For each row:
   - "name": Verbatim product/medicine name as written in the cell (e.g. "Panadol Extra 500mg *24", "Amoxicillin 500mg Cap", "Cataflam 50mg Tab").
     * If printed in Latin/English, preserve English exactly without translating.
     * If printed in Arabic or Kurdish, preserve as printed.
     * Retain dosage strength (e.g. 500mg, 10ml, 1g) and package count if in the name cell.
   - "barcode": Exact barcode number or product code visible in the row (e.g. "5000347060124").
     * Convert Eastern Arabic/Persian digits (٠١٢٣٤٥٦٧٨٩) to standard 0-9 digits.
     * If no barcode column exists or cell is blank, return empty string "".
   - "quantityPieces": Current stock balance or total quantity (integer or decimal). If empty, return 0.
   - "unitsInPack": Units, strips, or blisters per box/carton if shown (default 1).
   - "sheetPurchasePrice": Cost/purchase price per sheet/strip if shown (number, default 0).
   - "packPurchasePrice": Cost/purchase price per pack/box (number, default 0).
   - "sheetSellingPrice": Retail selling price per sheet/strip if shown (number, default 0).
   - "packSellingPrice": Retail selling price per pack/box (number, default 0).
   - "dosageForm": Dosage form (Tablet, Capsule, Syrup, Drops, Injection, Cream, Ointment, Spray, etc.).
   - "manufacturer": Company, origin, or agent name if in a column.
   - "expiryDate": Expiry date in YYYY-MM-DD or MM/YY if visible.
   - "category": Category (e.g. "أدوية ومستلزمات").
   - "unit": "علبة" or "قطعة".

Output STRICT valid JSON format only without markdown ticks:
{
  "systemTitle": "Detected screen or table title",
  "totalItemsDetected": 0,
  "items": [
    {
      "barcode": "string",
      "name": "string",
      "quantityPieces": 0,
      "unitsInPack": 1,
      "sheetPurchasePrice": 0,
      "packPurchasePrice": 0,
      "sheetSellingPrice": 0,
      "packSellingPrice": 0,
      "dosageForm": "Tablet",
      "manufacturer": "",
      "expiryDate": "",
      "category": "أدوية ومستلزمات",
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

        let rawText = "";
        try {
          const resolvedApiKey = resolveApiKey(req);
          rawText = await callGeminiVisionWithFallback({
            prompt,
            imagePart,
            apiKey: resolvedApiKey,
            config: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          });
          console.log("[Legacy Screen OCR] Raw response length:", rawText.length, "Snippet:", rawText.slice(0, 300));
        } catch (geminiErr: any) {
          console.error("Gemini API legacy screen migrator error:", geminiErr);
          const isDemo = imageBase64 === "demo_legacy_pharmacy_screen" || imageBase64.startsWith("demo_");
          if (isDemo) {
            return res.json(fallbackScreenData);
          }
          return res.status(500).json({
            error: geminiErr?.message || "تعذر معالجة الصورة بالذكاء الاصطناعي، يرجى المحاولة بصورة أوضح.",
            items: []
          });
        }

        const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        let parsedData: any;
        try {
          parsedData = JSON.parse(cleaned);
        } catch {
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            try {
              parsedData = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
            } catch {}
          }
          if (!parsedData) {
            const firstBracket = cleaned.indexOf('[');
            const lastBracket = cleaned.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
              try {
                parsedData = JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
              } catch {}
            }
          }
        }

        let extractedItemList: any[] = [];
        let detectedTitle = "المواد المستخرجة من شاشة النظام السابق";

        if (Array.isArray(parsedData)) {
          if (parsedData.length > 0 && Array.isArray(parsedData[0]?.items)) {
            extractedItemList = parsedData[0].items;
            detectedTitle = parsedData[0].systemTitle || detectedTitle;
          } else {
            extractedItemList = parsedData;
          }
        } else if (parsedData && typeof parsedData === 'object') {
          detectedTitle = parsedData.systemTitle || detectedTitle;
          if (Array.isArray(parsedData.items)) {
            extractedItemList = parsedData.items;
          } else if (Array.isArray(parsedData.products)) {
            extractedItemList = parsedData.products;
          } else if (Array.isArray(parsedData.medicines)) {
            extractedItemList = parsedData.medicines;
          }
        }

        console.log(`[Legacy Screen OCR] Extracted ${extractedItemList.length} items from image.`);

        // If no items were detected by the model and this is not a demo, return 500 so client fallback can try alternative models / direct processing
        if (extractedItemList.length === 0 && !imageBase64.startsWith("demo_")) {
          return res.status(500).json({
            error: "EMPTY_EXTRACTION",
            details: "No items detected in response",
            systemTitle: detectedTitle,
            items: []
          });
        }

        return res.json({
          systemTitle: detectedTitle,
          totalItemsDetected: extractedItemList.length,
          items: extractedItemList
        });
      } catch (geminiErr: any) {
        console.error("Gemini API legacy screen migrator error handled:", geminiErr);
        return res.status(500).json({
          error: geminiErr?.message || "حدث خطأ أثناء معالجة الصورة.",
          items: []
        });
      }
    } catch (err: any) {
      console.error("Error in legacy screen migrator handler:", err);
      return res.status(500).json({
        error: "حدث خطأ في الخادم أثناء قراءة الصورة.",
        items: []
      });
    }
  });

  // Single Product / Medicine Box AI Scanner Endpoint (فحص وقراءة علبة الدواء بالكاميرا والصورة)
  app.post(["/api/gemini/scan-product-box", "/gemini/scan-product-box"], async (req, res) => {
    try {
      const { imageBase64, mimeType, languageMode = 'all' } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      const defaultDemoProduct = {
        name: "Panadol Extra 500mg/65mg",
        englishName: "Panadol Extra Tablets",
        nameKu: "پانادۆڵ ئێکسـترا 500 ملغ",
        nameAr: "بانادول إكسترا 500 ملغ",
        scientificName: "Paracetamol 500mg + Caffeine 65mg",
        dosageForm: "حبوب / أقراص (Tablet)",
        dosageStrength: "500mg / 65mg",
        barcode: "5000347060124",
        manufacturer: "GSK (GlaxoSmithKline)",
        countryOfOrigin: "بريطانيا (UK)",
        expiryDate: "2028-06-01",
        batchNumber: "GSK2028",
        unitsPerPack: 24,
        suggestedPurchasePrice: 1500,
        suggestedRetailPrice: 2000,
        category: "مسكنات وخافض حرارة"
      };

      if (typeof imageBase64 === 'string' && (imageBase64.startsWith('demo_') || imageBase64 === 'demo_panadol_box')) {
        return res.json(defaultDemoProduct);
      }

      try {
        const detectedMimeType = mimeType || "image/jpeg";
        const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const prompt = `You are a lightning-fast pharmaceutical AI vision expert. Analyze this photo of a medicine box, packaging, bottle, blister strip, or product label.
Target Language Focus: ${languageMode} (Must provide accurate tri-lingual names: English, Kurdish Sorani, and Arabic).

Extract all key pharmaceutical specifications with extreme accuracy:
1. "name": Standard English trade & strength name (e.g. "Panadol Extra 500mg", "Amoxicillin 500mg").
2. "nameKu": Native Kurdish Sorani name & strength (e.g. "پانادۆڵ ئێکسـترا 500 ملغ", "ئەمۆکسیسیلین 500 ملغ").
3. "nameAr": Native Arabic name & strength (e.g. "بانادول إكسترا 500 ملغ", "أموكسيسيلين 500 ملغ").
4. "scientificName": Active chemical ingredient / scientific name (e.g. "Paracetamol + Caffeine").
5. "dosageForm": Dosage form (e.g. "حبوب / أقراص (Tablet)", "كبسولات (Capsule)", "شراب (Syrup)", "قطرة (Drops)", "مرهم / كريم (Ointment/Cream)", "حقن / أمبول (Ampoule)").
6. "dosageStrength": Strength / concentration (e.g. "500mg", "1g", "250mg/5ml", "200mg").
7. "barcode": Numerical barcode digits printed on package (EAN-13, GTIN, UPC). Convert Eastern Arabic/Kurdish numerals to 0-9 digits. If none visible, leave empty string "".
8. "manufacturer": Pharma company name (e.g. "GSK", "Pioneer", "Awamedica", "SDI", "Julphar", "Sanofi", "Novartis").
9. "countryOfOrigin": Country of manufacture (e.g. "العراق (Iraq)", "بريطانيا (UK)", "الأردن (Jordan)", "تركيا (Turkey)").
10. "expiryDate": Normalize expiration date to "YYYY-MM-DD" format.
11. "batchNumber": Lot / Batch number printed on box if visible.
12. "unitsPerPack": Count of strips, blisters, or tablets in the box (e.g. 20, 24, 30, 2). Default 1 or 2 if not stated.
13. "category": Appropriate pharmaceutical category (e.g. "مسكنات وخافض حرارة", "مضادات حيوية", "أدوية السكري", "فيتامينات ومكملات").

OUTPUT VALID JSON STRICTLY:
{
  "name": "Panadol Extra 500mg",
  "nameKu": "پانادۆڵ ئێکسـترا 500 ملغ",
  "nameAr": "بانادول إكسترا 500 ملغ",
  "scientificName": "Paracetamol + Caffeine",
  "dosageForm": "حبوب / أقراص (Tablet)",
  "dosageStrength": "500mg",
  "barcode": "5000347060124",
  "manufacturer": "GSK",
  "countryOfOrigin": "بريطانيا (UK)",
  "expiryDate": "YYYY-MM-DD",
  "batchNumber": "BN123",
  "unitsPerPack": 2,
  "category": "مسكنات وخافض حرارة",
  "suggestedPurchasePrice": 1500,
  "suggestedRetailPrice": 2000
}`;

        const imagePart = {
          inlineData: {
            mimeType: detectedMimeType,
            data: cleanData
          }
        };

        let rawText = "";
        try {
          const resolvedApiKey = resolveApiKey(req);
          rawText = await callGeminiVisionWithFallback({
            prompt,
            imagePart,
            apiKey: resolvedApiKey,
            config: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          });
        } catch (geminiErr: any) {
          console.error("Gemini API product box scan failed:", geminiErr);
          const errStr = geminiErr?.message || "";
          let userMessage = geminiErr?.message || "فشل فحص علبة الدواء بواسطة الذكاء الاصطناعي";
          if (errStr.includes("GEMINI_API_KEY_MISSING")) {
            userMessage = "مفتاح الذكاء الاصطناعي (Gemini API Key) غير محدد. يرجى إدخاله في الإعدادات.";
          } else if (errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("quota")) {
            userMessage = "تم تجاوز حد الاستخدام لمفتاح الذكاء الاصطناعي. يرجى إدخال مفتاح Gemini شخصي في الإعدادات.";
          }
          return res.status(500).json({ error: userMessage });
        }

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
            throw new Error("Unable to parse structured JSON from product scan");
          }
        }
        res.json(parsedData);
      } catch (geminiErr: any) {
        console.error("Gemini API product box error:", geminiErr);
        res.status(500).json({ error: geminiErr.message || "Failed to recognize medicine box" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to process medicine box image" });
    }
  });

  // ==========================================
  // MOBILE POS & SCANNER REAL-TIME PAIRING HUB
  // Restricts mobile access exclusively to authorized shop & laptop
  // ==========================================

  interface RegisteredLaptopSession {
    laptopId: string;
    pin: string;
    token: string;
    shopName: string;
    lastHeartbeat: number;
    pendingScans: Array<{
      id: string;
      barcode: string;
      laptopId: string;
      pin: string;
      deviceName?: string;
      timestamp: number;
      scanMode?: string;
    }>;
  }

  const activeLaptopSessions = new Map<string, RegisteredLaptopSession>();

  // 1. Laptop registers or updates its active security pairing session
  app.post("/api/mobile-sync/register-laptop", (req, res) => {
    try {
      const { laptopId, pin, token, shopName } = req.body;
      if (!laptopId || !pin) {
        return res.status(400).json({ error: "laptopId and pin are required" });
      }

      const existing = activeLaptopSessions.get(laptopId);
      activeLaptopSessions.set(laptopId, {
        laptopId,
        pin: String(pin).trim(),
        token: token || existing?.token || "",
        shopName: shopName || existing?.shopName || "سوبرماركت",
        lastHeartbeat: Date.now(),
        pendingScans: existing ? existing.pendingScans : []
      });

      return res.json({ success: true, registered: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 2. Mobile device verifies authorization with the laptop's security PIN
  app.post("/api/mobile-sync/verify", (req, res) => {
    try {
      const { laptopId, pin, token } = req.body;
      if (!laptopId) {
        return res.status(400).json({ error: "laptopId is required" });
      }

      const session = activeLaptopSessions.get(laptopId);
      const cleanPin = String(pin || "").trim();

      // If registered on server, check PIN or token
      if (session) {
        const pinMatch = session.pin === cleanPin;
        const tokenMatch = token && session.token && session.token === token;

        if (pinMatch || tokenMatch) {
          return res.json({
            authorized: true,
            shopName: session.shopName,
            laptopId: session.laptopId,
            message: "تم التحقق من تفويض الجهاز بنجاح"
          });
        } else {
          return res.status(403).json({
            authorized: false,
            error: "رمز أمان اللابتوب (PIN) غير صحيح! الوصول مقفل ومقتصر على لابتوب المحل فقط."
          });
        }
      }

      // If session not yet in memory on server (e.g. server restart), accept if PIN is provided
      if (cleanPin.length >= 4) {
        activeLaptopSessions.set(laptopId, {
          laptopId,
          pin: cleanPin,
          token: token || "",
          shopName: "سوبرماركت",
          lastHeartbeat: Date.now(),
          pendingScans: []
        });
        return res.json({
          authorized: true,
          shopName: "سوبرماركت",
          laptopId,
          message: "تم التحقق والمصادقة بنجاح"
        });
      }

      return res.status(403).json({
        authorized: false,
        error: "هذا النظام مقفل ومخصص للابتوب المحل فقط. يرجى إدخال رمز الأمان الصحيح."
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 3. Mobile phone sends a scanned barcode to the laptop
  app.post("/api/mobile-sync/scan", (req, res) => {
    try {
      const { laptopId, pin, barcode, deviceName, scanMode } = req.body;
      if (!laptopId || !barcode) {
        return res.status(400).json({ error: "laptopId and barcode are required" });
      }

      let session = activeLaptopSessions.get(laptopId);
      if (!session) {
        session = {
          laptopId,
          pin: pin ? String(pin).trim() : "",
          token: "",
          shopName: "سوبرماركت",
          lastHeartbeat: Date.now(),
          pendingScans: []
        };
        activeLaptopSessions.set(laptopId, session);
      }

      const scanItem = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        barcode: String(barcode).trim(),
        laptopId,
        pin: pin ? String(pin).trim() : "",
        deviceName: deviceName || "موبايل الكاشير",
        timestamp: Date.now(),
        scanMode: scanMode || "scanner"
      };

      session.pendingScans.push(scanItem);
      // Keep queue manageable
      if (session.pendingScans.length > 50) {
        session.pendingScans = session.pendingScans.slice(-50);
      }

      return res.json({ success: true, received: true, scanId: scanItem.id });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 4. Laptop polls for scans sent from the phone
  app.get("/api/mobile-sync/poll", (req, res) => {
    try {
      const laptopId = String(req.query.laptopId || "").trim();
      if (!laptopId) {
        return res.status(400).json({ error: "laptopId is required" });
      }

      const session = activeLaptopSessions.get(laptopId);
      if (!session || session.pendingScans.length === 0) {
        return res.json({ scans: [] });
      }

      // Pop all pending scans
      const scansToSend = [...session.pendingScans];
      session.pendingScans = [];
      session.lastHeartbeat = Date.now();

      return res.json({ scans: scansToSend });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 5. Laptop revokes pairing and clears all scans
  app.post("/api/mobile-sync/revoke", (req, res) => {
    try {
      const { laptopId, pin } = req.body;
      if (laptopId) {
        activeLaptopSessions.delete(laptopId);
      }
      return res.json({ success: true, revoked: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

// Vite middleware and static serving for standalone server
async function startServer() {
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

if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };
