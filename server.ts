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

        const prompt = `You are an elite optical character recognition (OCR) and document intelligence AI specialized in pharmaceutical bills, medicine invoices, wholesale drug receipts, and POS receipts in English, Arabic, and Kurdish.
Analyze this invoice or receipt image with extreme precision and extract ALL product lines and metadata into structured JSON.

CRITICAL EXTRACTION GUIDELINES FOR PHARMACEUTICAL ITEMS AND BARCODES:
1. "rawInvoiceName": The EXACT, verbatim product/medicine name as printed on the physical receipt without alteration.
2. "name" & "englishName": The clean, standardized English pharmaceutical/trade name (e.g., "Panadol Extra 500mg Tab", "Amoxicillin 500mg Cap", "Cefixime 400mg").
3. "nameAr": Arabic translation or transcription of the medicine name.
4. "nameKu": Kurdish translation or transcription of the medicine name.
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
        console.error("Gemini API invoice scanning error:", geminiErr);
        res.status(500).json({ 
          error: geminiErr.message || "Failed to parse invoice with AI",
          details: "Please ensure the image is clear and well lit."
        });
      }
    } catch (err: any) {
      console.error("Error in invoice scanning handler:", err);
      res.status(500).json({ error: err.message || "Failed to process invoice image" });
    }
  });

  // Legacy System & Desktop Screen AI Migrator Endpoint (نقل المواد من شاشات البرامج القديمة)
  app.post("/api/gemini/migrate-legacy-screen", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
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
            nameAr: "بليغو",
            nameKu: "پلێگۆ",
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
            nameAr: "بي كور 10 ملغ",
            nameKu: "بی کۆر ١٠مگ",
            quantityPieces: 24,
            unitsInPack: 3,
            sheetPurchasePrice: 2013.683,
            packPurchasePrice: 6041.05,
            sheetSellingPrice: 2500,
            packSellingPrice: 7500,
            dosageForm: "Tablet",
            manufacturer: "Joswe",
            expiryDate: "2028-06-01",
            category: "أدوية القلب والضغط",
            unit: "علبة"
          },
          {
            barcode: "4031571068850",
            name: "Toras-denk 5mg",
            englishName: "Toras-denk 5mg",
            nameAr: "توراس دينك 5 ملغ",
            nameKu: "تۆراس دێنک ٥مگ",
            quantityPieces: 2,
            unitsInPack: 3,
            sheetPurchasePrice: 2454.167,
            packPurchasePrice: 7362.5,
            sheetSellingPrice: 3000,
            packSellingPrice: 9000,
            dosageForm: "Tablet",
            manufacturer: "Denk",
            expiryDate: "2027-01-01",
            category: "أدوية القلب والضغط",
            unit: "علبة"
          },
          {
            barcode: "9008732006759",
            name: "Thrombo Ass 100mg",
            englishName: "Thrombo Ass 100mg",
            nameAr: "ثرومبو اس 100 ملغ مميع للدم",
            nameKu: "ترۆمبۆ ئاس ١٠٠مگ",
            quantityPieces: 27,
            unitsInPack: 3,
            sheetPurchasePrice: 687.1667,
            packPurchasePrice: 2061.5,
            sheetSellingPrice: 1000,
            packSellingPrice: 3000,
            dosageForm: "Tablet",
            manufacturer: "Gerot",
            expiryDate: "2027-03-01",
            category: "أدوية القلب والضغط",
            unit: "علبة"
          },
          {
            barcode: "3594452600521",
            name: "Diamicron MR 60mg Asly",
            englishName: "Diamicron MR 60mg Asly",
            nameAr: "داياميكرون ام ار 60 ملغ أصلي للسكر",
            nameKu: "دیامیکرۆن ٦٠مگ ئەسڵی",
            quantityPieces: 6,
            unitsInPack: 2,
            sheetPurchasePrice: 2567.85,
            packPurchasePrice: 5135.7,
            sheetSellingPrice: 3000,
            packSellingPrice: 6000,
            dosageForm: "Tablet",
            manufacturer: "Francia",
            expiryDate: "2027-09-22",
            category: "أدوية السكري",
            unit: "علبة"
          },
          {
            barcode: "6251107424754",
            name: "Mixif 400mg",
            englishName: "Mixif 400mg",
            nameAr: "مكسيف 400 ملغ مضاد حيوي",
            nameKu: "میکسف ٤٠٠مگ",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 1640,
            packPurchasePrice: 1640,
            sheetSellingPrice: 3000,
            packSellingPrice: 3000,
            dosageForm: "Tablet",
            manufacturer: "Jordan",
            expiryDate: "2027-06-01",
            category: "مضادات حيوية",
            unit: "علبة"
          },
          {
            barcode: "6251060001689",
            name: "Caldex Drops",
            englishName: "Caldex Drops",
            nameAr: "كالديكس نقط بالفم",
            nameKu: "کالدێکس قەترە",
            quantityPieces: 14,
            unitsInPack: 1,
            sheetPurchasePrice: 2040,
            packPurchasePrice: 2040,
            sheetSellingPrice: 3500,
            packSellingPrice: 3500,
            dosageForm: "Drops",
            manufacturer: "Syria",
            expiryDate: "2027-07-01",
            category: "أدوية أطفال وفيتامينات",
            unit: "علبة"
          },
          {
            barcode: "6251159037308",
            name: "Dentagyl Tab",
            englishName: "Dentagyl Tab",
            nameAr: "دينتاجيل حبوب لالتهاب الأسنان",
            nameKu: "دێنتاجیل حەب",
            quantityPieces: 12,
            unitsInPack: 2,
            sheetPurchasePrice: 3000,
            packPurchasePrice: 6000,
            sheetSellingPrice: 4000,
            packSellingPrice: 8000,
            dosageForm: "Tablet",
            manufacturer: "Hikma",
            expiryDate: "2027-08-01",
            category: "مضادات حيوية وأسنان",
            unit: "علبة"
          },
          {
            barcode: "8904134917420",
            name: "Freefil 200mg Tab",
            englishName: "Freefil 200mg Tab",
            nameAr: "فريفيل 200 ملغ",
            nameKu: "فریفیل ٢٠٠مگ",
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
            nameAr: "كيلونيل 15 ملغ كريم للندبات",
            nameKu: "کێلۆنیل ١٥مگ کرێم",
            quantityPieces: 3,
            unitsInPack: 1,
            sheetPurchasePrice: 14652,
            packPurchasePrice: 14652,
            sheetSellingPrice: 16000,
            packSellingPrice: 16000,
            dosageForm: "Cream",
            manufacturer: "Polanda",
            expiryDate: "2027-08-01",
            category: "مراهم وكريمات جلدية",
            unit: "علبة"
          },
          {
            barcode: "8699536092393",
            name: "Cardofix Plus 5/160/25",
            englishName: "Cardofix Plus 5/160/25",
            nameAr: "كاردوفيكس بلس 5/160/25 كبسول",
            nameKu: "کاردۆفیکس پڵەس",
            quantityPieces: 0,
            unitsInPack: 4,
            sheetPurchasePrice: 3912.278,
            packPurchasePrice: 15649.11,
            sheetSellingPrice: 4000,
            packSellingPrice: 16000,
            dosageForm: "Capsule",
            manufacturer: "Sanovel",
            expiryDate: "2026-12-01",
            category: "أدوية القلب والضغط",
            unit: "علبة"
          },
          {
            barcode: "4260393340145",
            name: "Zinc-oxide Plaster Roller",
            englishName: "Zinc-oxide Plaster Roller",
            nameAr: "لاصق طبي زنك اوكسايد رول",
            nameKu: "پلاستەری زینک ئۆکساید",
            quantityPieces: 2,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 1716.9,
            sheetSellingPrice: 0,
            packSellingPrice: 2500,
            dosageForm: "Plaster",
            manufacturer: "India",
            expiryDate: "2027-11-22",
            category: "مستلزمات طبية وإسعافات",
            unit: "قطعة"
          },
          {
            barcode: "852510005170",
            name: "Colon Cleanser Tab",
            englishName: "Colon Cleanser Tab",
            nameAr: "منظف القولون حبوب",
            nameKu: "کۆلۆن کلینسەر",
            quantityPieces: 101,
            unitsInPack: 100,
            sheetPurchasePrice: 155.7099,
            packPurchasePrice: 15570.99,
            sheetSellingPrice: 200,
            packSellingPrice: 18000,
            dosageForm: "Tablet",
            manufacturer: "UK",
            expiryDate: "2027-12-01",
            category: "أدوية الجهاز الهضمي",
            unit: "علبة"
          },
          {
            barcode: "047",
            name: "Codom Corolet Cap",
            englishName: "Codom Corolet Cap",
            nameAr: "كودوم كوروليت كبسول",
            nameKu: "کۆدۆم کۆرۆلێت",
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
            nameAr: "مشد ركبة مفتوح طبي",
            nameKu: "مەشدەی ئەژنۆ کراوە",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 3500,
            sheetSellingPrice: 0,
            packSellingPrice: 5000,
            dosageForm: "Support",
            manufacturer: "China",
            expiryDate: "2026-11-26",
            category: "مستلزمات ومشدات طبية",
            unit: "قطعة"
          },
          {
            barcode: "8697462452281",
            name: "Sah Baby Tablets",
            englishName: "Sah Baby Tablets",
            nameAr: "صح بيبي أطفال",
            nameKu: "ساە بەیبی",
            quantityPieces: 158,
            unitsInPack: 24,
            sheetPurchasePrice: 660.6667,
            packPurchasePrice: 15856,
            sheetSellingPrice: 1000,
            packSellingPrice: 24000,
            dosageForm: "Tablet",
            manufacturer: "China",
            expiryDate: "2026-11-26",
            category: "عناية وأطفال",
            unit: "علبة"
          },
          {
            barcode: "6932951807336",
            name: "Knee Support with Stays",
            englishName: "Knee Support with Stays",
            nameAr: "مشد ركبة مقوى بدعامات",
            nameKu: "مەشدەی ئەژنۆی دەعامەدار",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 3500,
            sheetSellingPrice: 0,
            packSellingPrice: 5000,
            dosageForm: "Support",
            manufacturer: "China",
            expiryDate: "2026-11-26",
            category: "مستلزمات ومشدات طبية",
            unit: "قطعة"
          },
          {
            barcode: "7640154980785",
            name: "Meratrum Tablet",
            englishName: "Meratrum Tablet",
            nameAr: "ميراترم حبوب سويسري",
            nameKu: "مێراترۆم حەب",
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
            nameAr: "فيتاكومبلكس مكمل فيتامينات",
            nameKu: "ڤیتاکۆمپلێکس ڤیتامین",
            quantityPieces: 1,
            unitsInPack: 10,
            sheetPurchasePrice: 241.864,
            packPurchasePrice: 2418.64,
            sheetSellingPrice: 1000,
            packSellingPrice: 10000,
            dosageForm: "Tablet",
            manufacturer: "India",
            expiryDate: "2027-11-01",
            category: "فيتامينات ومكملات غذائية",
            unit: "علبة"
          },
          {
            barcode: "8696871293669",
            name: "Nano Yuz Ampoule",
            englishName: "Nano Yuz Ampoule",
            nameAr: "نانو يوز امبولات",
            nameKu: "نانۆ یوز ئەمپوول",
            quantityPieces: 1,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 500,
            sheetSellingPrice: 0,
            packSellingPrice: 1000,
            dosageForm: "Ampoule",
            manufacturer: "China",
            expiryDate: "2026-11-01",
            category: "أمبولات وحقن",
            unit: "أمبولة"
          },
          {
            barcode: "8054487661003",
            name: "Nano Yuz Ampoule Extra",
            englishName: "Nano Yuz Ampoule Extra",
            nameAr: "نانو يوز امبولات اكسترا",
            nameKu: "نانۆ یوز ئەمپوول ٢",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 500,
            sheetSellingPrice: 0,
            packSellingPrice: 1000,
            dosageForm: "Ampoule",
            manufacturer: "China",
            expiryDate: "2026-11-26",
            category: "أمبولات وحقن",
            unit: "أمبولة"
          },
          {
            barcode: "6251875000471",
            name: "Laritin Tab 5mg Pioneer",
            englishName: "Laritin Tab 5mg Pioneer",
            nameAr: "لاريتين 5 ملغ حبوب حساسية بايونير",
            nameKu: "لاریتین ٥مگ پایۆنێر",
            quantityPieces: 104,
            unitsInPack: 3,
            sheetPurchasePrice: 308.75,
            packPurchasePrice: 926.25,
            sheetSellingPrice: 1000,
            packSellingPrice: 2000,
            dosageForm: "Tablet",
            manufacturer: "Pioneer",
            expiryDate: "2027-12-01",
            category: "أدوية الحساسية والجهاز التنفسي",
            unit: "علبة"
          },
          {
            barcode: "9504000086220",
            name: "Omeprazol 40mg Cap",
            englishName: "Omeprazol 40mg Cap",
            nameAr: "اوميبرازول 40 ملغ كبسول للمعدة",
            nameKu: "ئۆمیپرازۆڵ ٤٠مگ",
            quantityPieces: 0,
            unitsInPack: 1,
            sheetPurchasePrice: 0,
            packPurchasePrice: 650,
            sheetSellingPrice: 0,
            packSellingPrice: 1000,
            dosageForm: "Capsule",
            manufacturer: "Awamedica",
            expiryDate: "2025-07-28",
            category: "أدوية الجهاز الهضمي والمعدة",
            unit: "علبة"
          },
          {
            barcode: "8901111985113",
            name: "Aprazol 40mg Cap",
            englishName: "Aprazol 40mg Cap",
            nameAr: "ابرازول 40 ملغ كبسول",
            nameKu: "ئاپرازۆڵ ٤٠مگ",
            quantityPieces: 10,
            unitsInPack: 1,
            sheetPurchasePrice: 1292.62,
            packPurchasePrice: 1292.62,
            sheetSellingPrice: 2000,
            packSellingPrice: 2000,
            dosageForm: "Capsule",
            manufacturer: "Ajanta",
            expiryDate: "2028-09-01",
            category: "أدوية الجهاز الهضمي والمعدة",
            unit: "علبة"
          }
        ]
      };

      try {
        const ai = getAIClient();
        const detectedMimeType = mimeType || "image/jpeg";
        const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const prompt = `You are an expert AI vision system specialized in reading legacy pharmacy, medical clinic, and POS software computer screens, database tables, Excel grids, and printed tabular sheets in Kurdish, Arabic, and English.
Analyze this computer monitor photo or screenshot table and extract ALL visible rows with extreme precision.

TABLE COLUMN MAPPINGS TO DETECT IN KURDISH, ARABIC, AND ENGLISH:
1. BARCODE / CODE: "بارکۆد", "کۆد", "الباركود", "كود", "Barcode", "Code", "Item Code".
   - Extract the full numerical barcode sequence (e.g. 6291107470269, 8680001004312, 047). Convert any Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) to standard English digits (0123456789). Do not truncate digits.
2. MEDICINE / ITEM NAME: "ناوی دەرمان", "اسم المادة", "اسم الدواء", "Medicine Name", "Item Name", "Description".
   - Extract the EXACT name as shown, plus provide the standardized pharmaceutical name, English name, Arabic name, and Kurdish name.
3. QUANTITY / PIECES: "بڕ(عدد)", "بڕ", "العدد", "الكمية", "الرصيد", "Quantity", "Qty", "Stock".
4. UNITS IN PACK / STRIPS PER BOX: "بڕی ناو پاکەت", "العدد بالباكيت", "عدد الأشرطة", "Units in Pack", "Pack Strips". (If not stated, default to 1).
5. PURCHASE PRICE SHEET: "نرخی کڕینی شیت", "سعر شراء الشريط", "Sheet Purchase Price".
6. PURCHASE PRICE PACK: "نرخی کڕینی پاکەت", "سعر شراء الباكيت", "Pack Purchase Price".
7. SELLING PRICE SHEET: "نرخی فرۆشتنی شیت", "سعر بيع الشريط", "Sheet Retail Price".
8. SELLING PRICE PACK: "نرخی فرۆشتنی", "سعر بيع الباكيت", "سعر المفرد", "Pack Retail Price".
9. DOSAGE FORM: "جۆری دەرمان", "شكل الدواء", "Form" (Tablet, Capsule, Syrup, Drops, Cream, Ointment, Ampoule, Plaster, Spray, Gel, Support, etc.).
10. MANUFACTURER: "کۆمپانیا", "الشركة", "Company", "Manufacturer" (e.g., Julphar, Joswe, Denk, Gerot, Francia, Jordan, Pioneer, Awamedica, Ajanta, Sanovel, etc.).
11. EXPIRY DATE: "بەرواری بەسەرچوون", "تاريخ الانتهاء", "صلاحية", "Expiry Date". Convert any format (DD/MM/YYYY, D/M/YYYY) to standardized "YYYY-MM-DD".

OUTPUT VALID JSON FOLLOWING THIS STRUCTURE:
{
  "systemTitle": "Detected screen or table title",
  "totalItemsDetected": 0,
  "items": [
    {
      "barcode": "Clean digit barcode string (e.g. 6291107470269)",
      "name": "Standard English trade/scientific name",
      "englishName": "Standard English pharmaceutical name",
      "nameAr": "Arabic translation or description",
      "nameKu": "Kurdish translation or description",
      "quantityPieces": 0,
      "unitsInPack": 1,
      "sheetPurchasePrice": 0,
      "packPurchasePrice": 0,
      "sheetSellingPrice": 0,
      "packSellingPrice": 0,
      "dosageForm": "Tablet, Syrup, Drops, Cream, Capsule, Ampoule, etc.",
      "manufacturer": "Company / Manufacturer",
      "expiryDate": "YYYY-MM-DD",
      "category": "Category name",
      "unit": "علبة"
    }
  ]
}

CRITICAL RULES:
- Extract ALL visible rows in the table without skipping.
- Digits must be in standard 0-9 format.
- If barcode column is empty for a row, generate a clean unique barcode like "LEGACY-XXXXX".`;

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
        console.error("Gemini API legacy screen migrator error:", geminiErr);
        res.status(500).json({
          error: geminiErr.message || "Failed to process legacy screen image",
          details: "Please ensure the monitor screen is clearly visible."
        });
      }
    } catch (err: any) {
      console.error("Error in legacy screen migrator handler:", err);
      res.status(500).json({ error: err.message || "Failed to process legacy screen image" });
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
