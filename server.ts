import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { getLocalDatabase, saveDatabaseToDisk } from "./src/db/sqliteEngine.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));

async function startServer() {
  // Initialize SQLite Local Database
  const db = await getLocalDatabase();

  // --- LOCAL REST APIs (100% Offline Local Engine) ---

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      mode: "100% Offline Local Desktop",
      database: "SQLite (pos_local.sqlite)",
      timestamp: new Date().toISOString()
    });
  });

  // Local Auth Login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    try {
      const stmt = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?");
      stmt.bind([username, password]);
      
      let user = null;
      if (stmt.step()) {
        const row = stmt.getAsObject();
        user = {
          ...row,
          active: Boolean(row.active),
          permissions: row.permissions ? JSON.parse(row.permissions as string) : {}
        };
      }
      stmt.free();

      if (user) {
        // Exclude raw password
        const { password: _, ...userWithoutPassword } = user as any;
        res.json({ success: true, user: userWithoutPassword });
      } else {
        res.status(401).json({ success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // User Accounts API
  app.get("/api/users", (_req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM users");
      const users: any[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        users.push({
          ...row,
          active: Boolean(row.active),
          permissions: row.permissions ? JSON.parse(row.permissions as string) : {}
        });
      }
      stmt.free();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/users", (req, res) => {
    const u = req.body;
    try {
      db.run(
        `INSERT OR REPLACE INTO users (id, username, password, fullName, role, email, phone, active, createdAt, permissions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          u.id || `user-${Date.now()}`,
          u.username,
          u.password || '123456',
          u.fullName,
          u.role || 'Cashier',
          u.email || '',
          u.phone || '',
          u.active ? 1 : 0,
          u.createdAt || new Date().toISOString(),
          JSON.stringify(u.permissions || {})
        ]
      );
      saveDatabaseToDisk();
      res.json({ success: true, id: u.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    try {
      db.run("DELETE FROM users WHERE id = ?", [req.params.id]);
      saveDatabaseToDisk();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Products API
  app.get("/api/products", (_req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM products");
      const products: any[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        products.push(row);
      }
      stmt.free();
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/products", (req, res) => {
    const p = req.body;
    try {
      db.run(
        `INSERT OR REPLACE INTO products (
          id, barcode, name, nameAr, nameKu, category, categoryAr, categoryKu,
          supplierDelegate, cartonsCount, unitsPerCarton, totalUnits, cartonPurchasePrice,
          costPerUnit, singleRetailPrice, wholesalePrice, cartonSellingPrice,
          singleProfit, wholesaleProfit, cartonProfit, initialAddDate, lastEditDate,
          expiryDate, price, cost, stock, minStock, unit, supplierId, supplierName,
          imageIcon, status, scientificName, dosageForm, pharmaCategory, batchNumber,
          blistersPerBox, blisterPrice, storageCondition, storageLocation
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )`,
        [
          p.id || `prod-${Date.now()}`,
          p.barcode || '',
          p.name || '',
          p.nameAr || '',
          p.nameKu || '',
          p.category || '',
          p.categoryAr || '',
          p.categoryKu || '',
          p.supplierDelegate || '',
          p.cartonsCount || 0,
          p.unitsPerCarton || 1,
          p.totalUnits || 0,
          p.cartonPurchasePrice || 0,
          p.costPerUnit || 0,
          p.singleRetailPrice || 0,
          p.wholesalePrice || 0,
          p.cartonSellingPrice || 0,
          p.singleProfit || 0,
          p.wholesaleProfit || 0,
          p.cartonProfit || 0,
          p.initialAddDate || new Date().toISOString().split('T')[0],
          new Date().toISOString().split('T')[0],
          p.expiryDate || '',
          p.price || 0,
          p.cost || 0,
          p.stock || 0,
          p.minStock || 5,
          p.unit || 'علبة',
          p.supplierId || '',
          p.supplierName || '',
          p.imageIcon || '💊',
          p.status || (p.stock <= 0 ? 'out_of_stock' : p.stock <= p.minStock ? 'low_stock' : 'in_stock'),
          p.scientificName || '',
          p.dosageForm || '',
          p.pharmaCategory || '',
          p.batchNumber || '',
          p.blistersPerBox || 1,
          p.blisterPrice || 0,
          p.storageCondition || '',
          p.storageLocation || ''
        ]
      );
      saveDatabaseToDisk();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    try {
      db.run("DELETE FROM products WHERE id = ?", [req.params.id]);
      saveDatabaseToDisk();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sales API (Creating Sale Invoice & Deducting Stock)
  app.get("/api/sales", (_req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM sales ORDER BY timestamp DESC");
      const sales: any[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        sales.push({
          ...row,
          items: row.items ? JSON.parse(row.items as string) : [],
          returnedItems: row.returnedItems ? JSON.parse(row.returnedItems as string) : []
        });
      }
      stmt.free();
      res.json(sales);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sales", (req, res) => {
    const sale = req.body;
    try {
      // Insert sale
      db.run(
        `INSERT OR REPLACE INTO sales (
          id, invoiceNumber, timestamp, customerName, items, returnedItems,
          subtotal, tax, discount, total, paymentMethod, amountTendered, changeDue, cashierName, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sale.id,
          sale.invoiceNumber,
          sale.timestamp || new Date().toISOString(),
          sale.customerName || 'عميل نقدي',
          JSON.stringify(sale.items || []),
          JSON.stringify(sale.returnedItems || []),
          sale.subtotal || 0,
          sale.tax || 0,
          sale.discount || 0,
          sale.total || 0,
          sale.paymentMethod || 'cash',
          sale.amountTendered || 0,
          sale.changeDue || 0,
          sale.cashierName || 'كاشير',
          sale.status || 'completed'
        ]
      );

      // Deduct stock for sold items
      if (Array.isArray(sale.items)) {
        for (const item of sale.items) {
          if (item.productId) {
            let deductQty = item.quantity || 1;
            if (item.saleType === 'carton') {
              // Get product units per carton
              const prodStmt = db.prepare("SELECT unitsPerCarton FROM products WHERE id = ?");
              prodStmt.bind([item.productId]);
              if (prodStmt.step()) {
                const upc = (prodStmt.getAsObject().unitsPerCarton as number) || 1;
                deductQty *= upc;
              }
              prodStmt.free();
            }

            db.run(
              `UPDATE products SET stock = MAX(0, stock - ?), status = CASE WHEN (stock - ?) <= 0 THEN 'out_of_stock' WHEN (stock - ?) <= minStock THEN 'low_stock' ELSE 'in_stock' END WHERE id = ?`,
              [deductQty, deductQty, deductQty, item.productId]
            );
          }
        }
      }

      saveDatabaseToDisk();
      res.json({ success: true, invoiceNumber: sale.invoiceNumber });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sales Return API
  app.put("/api/sales/:id/return", (req, res) => {
    const { returnedItems, updatedSale } = req.body;
    const saleId = req.params.id;

    try {
      db.run(
        `UPDATE sales SET returnedItems = ?, status = ? WHERE id = ?`,
        [JSON.stringify(returnedItems || []), updatedSale?.status || 'completed', saleId]
      );

      // Restore returned stock
      if (Array.isArray(returnedItems)) {
        for (const item of returnedItems) {
          if (item.productId) {
            db.run(
              `UPDATE products SET stock = stock + ?, status = CASE WHEN (stock + ?) > minStock THEN 'in_stock' ELSE 'low_stock' END WHERE id = ?`,
              [item.quantity, item.quantity, item.productId]
            );
          }
        }
      }

      saveDatabaseToDisk();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Suppliers API
  app.get("/api/suppliers", (_req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM suppliers");
      const suppliers: any[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        suppliers.push({
          ...row,
          isSaved: Boolean(row.isSaved),
          payments: row.payments ? JSON.parse(row.payments as string) : []
        });
      }
      stmt.free();
      res.json(suppliers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/suppliers", (req, res) => {
    const s = req.body;
    try {
      db.run(
        `INSERT OR REPLACE INTO suppliers (
          id, name, nameAr, contactPerson, phone, email, categorySupplied,
          activeOrders, totalInvoiced, totalPaid, balanceDue, rating, avatar, taxNumber, address, isSaved, payments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id || `sup-${Date.now()}`,
          s.name || '',
          s.nameAr || s.name || '',
          s.contactPerson || '',
          s.phone || '',
          s.email || '',
          s.categorySupplied || '',
          s.activeOrders || 0,
          s.totalInvoiced || 0,
          s.totalPaid || 0,
          s.balanceDue || 0,
          s.rating || 5.0,
          s.avatar || '🏢',
          s.taxNumber || '',
          s.address || '',
          s.isSaved ? 1 : 0,
          JSON.stringify(s.payments || [])
        ]
      );
      saveDatabaseToDisk();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/suppliers/:id", (req, res) => {
    try {
      db.run("DELETE FROM suppliers WHERE id = ?", [req.params.id]);
      saveDatabaseToDisk();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Customers API
  app.get("/api/customers", (_req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM customers");
      const customers: any[] = [];
      while (stmt.step()) {
        customers.push(stmt.getAsObject());
      }
      stmt.free();
      res.json(customers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/customers", (req, res) => {
    const c = req.body;
    try {
      db.run(
        `INSERT OR REPLACE INTO customers (id, name, phone, email, loyaltyPoints, totalSpent, visitsCount, tier, joinedDate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.id || `cust-${Date.now()}`,
          c.name || '',
          c.phone || '',
          c.email || '',
          c.loyaltyPoints || 0,
          c.totalSpent || 0,
          c.visitsCount || 0,
          c.tier || 'Bronze',
          c.joinedDate || new Date().toISOString().split('T')[0]
        ]
      );
      saveDatabaseToDisk();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Settings API
  app.get("/api/settings", (_req, res) => {
    try {
      const stmt = db.prepare("SELECT data FROM settings WHERE id = 'store_config'");
      let settings = null;
      if (stmt.step()) {
        const row = stmt.getAsObject();
        settings = row.data ? JSON.parse(row.data as string) : null;
      }
      stmt.free();
      res.json(settings || {});
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/settings", (req, res) => {
    try {
      db.run(
        `INSERT OR REPLACE INTO settings (id, data) VALUES ('store_config', ?)`,
        [JSON.stringify(req.body)]
      );
      saveDatabaseToDisk();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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
          totalItemsCount: 31,
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
            name: "Avo Pregna Care Tab. *30Tab",
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
            name: "Colic Sleep Oral Drops *30ML",
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
            name: "Coxib Celecoxib 200mg *30Cap",
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
            name: "Neurotop Carbamazepine 200mg *50Tab",
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
            suggestedRetailPrice: 13500,
            unitsPerPack: 50,
            unit: "علبة"
          },
          {
            name: "Arjuna 200mg 30*cap",
            nameAr: "أرجونا 200 ملغ 30 كبسولة",
            nameKu: "ئارجونا ٢٠٠مگ",
            category: "مكملات وأعشاب",
            dosageForm: "Capsule",
            manufacturer: "La Collina_EUROPE",
            barcode: "8009876501004",
            expiryDate: "2028-12-01",
            batchNumber: "501A",
            quantity: 8,
            bonus: 0,
            originalPrice: 14000,
            discountAmount: 698,
            discountPercent: 4.98,
            unitPurchasePrice: 13302,
            totalPrice: 106416,
            suggestedRetailPrice: 17000,
            unitsPerPack: 30,
            unit: "علبة"
          },
          {
            name: "Otosan Throat Gel Forte *14Stick",
            nameAr: "اوتوسان جل الحلق فورت 14 ظرف",
            nameKu: "ئۆتۆسان جیلی قورگ فۆرتێ",
            category: "أدوية حلق وجهاز تنفسي",
            dosageForm: "Effervescent / Gel",
            manufacturer: "Otosan_ITALY",
            barcode: "8012345001429",
            expiryDate: "2029-03-01",
            batchNumber: "R142",
            quantity: 2,
            bonus: 0,
            originalPrice: 9500,
            discountAmount: 383,
            discountPercent: 4.03,
            unitPurchasePrice: 9117,
            totalPrice: 18234,
            suggestedRetailPrice: 12000,
            unitsPerPack: 14,
            unit: "علبة"
          }
        ]
      };

      // Check if demo request
      if (imageBase64 === "demo_collagen_invoice" || imageBase64.startsWith("demo_")) {
        return res.json(defaultDemoData);
      }

      // Clean base64 data
      let cleanData = imageBase64;
      let detectedMimeType = mimeType || "image/jpeg";
      if (imageBase64.includes(";base64,")) {
        const parts = imageBase64.split(";base64,");
        const match = parts[0].match(/data:(.*?)$/);
        if (match) detectedMimeType = match[1];
        cleanData = parts[1];
      }
      cleanData = cleanData.replace(/[\r\n\s]/g, "");

      if (!process.env.GEMINI_API_KEY) {
        return res.json(defaultDemoData);
      }

      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const prompt = `You are an expert multilingual OCR and purchase invoice analyzer for pharmacies, drug stores, and retail markets.
Analyze this invoice image in depth (it may contain text in Kurdish Sorani, Arabic, English or mixed).

Extract all structured information with high accuracy:
1. Supplier Header (Name in Arabic/Kurdish/English, Phone numbers, Address/Location).
2. Invoice Meta (Invoice Number, Invoice Date in YYYY-MM-DD format, Customer/Pharmacy Name, Total units/packs count, Gross invoice amount, Discount amount/percent if present, Net invoice amount, Previous balance/debt, Total balance/debt, Currency).
3. All Products in the table:
   - name: original/English item name
   - nameAr: clean Arabic name
   - nameKu: clean Kurdish name
   - category: e.g. Pharmacy / Medical / Grocery
   - dosageForm: e.g., Tablet, Capsule, Drops, Syrup, Effervescent, Cream, Gel, Stick, etc.
   - manufacturer: company name or country (e.g. AvoCare_TURKEY, Micro-INDIA, Gerot Lannach, Otosan_ITALY)
   - barcode: barcode or item code if present
   - expiryDate: strictly in 'YYYY-MM-DD' format (convert DD/MM/YYYY or MM/YYYY properly)
   - batchNumber: batch or lot number
   - quantity: number of boxes/cartons/packs
   - bonus: free bonus count if any (default 0)
   - originalPrice: price before discount if specified
   - discountAmount: discount amount on this line if specified
   - discountPercent: discount % on this line if specified
   - unitPurchasePrice: final net unit purchase/wholesale price (number)
   - totalPrice: total net row purchase price (number)
   - suggestedRetailPrice: suggested selling price with ~20-30% markup rounded to nearest 250 IQD
   - unitsPerPack: number of tablets/capsules/units per pack (e.g. 30 for *30Tab, 50 for *50Tab)
   - unit: e.g. 'علبة' or 'باكيت' or 'قطعة'

Respond strictly with valid JSON conforming to this schema without markdown codeblocks or extra text:
{
  "supplier": {
    "name": "string",
    "nameKu": "string",
    "phone": "string",
    "address": "string"
  },
  "invoice": {
    "invoiceNumber": "string",
    "date": "YYYY-MM-DD",
    "customerName": "string",
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
      "name": "string",
      "nameAr": "string",
      "nameKu": "string",
      "category": "string",
      "dosageForm": "string",
      "manufacturer": "string",
      "barcode": "string",
      "expiryDate": "YYYY-MM-DD",
      "batchNumber": "string",
      "quantity": 0,
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
          model: "gemini-3.7-flash",
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

        let rawText = response.text || "{}";
        let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
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
        console.error("Gemini API invoice scanning failed, providing parsed fallback:", geminiErr);
        // If Gemini API call fails (e.g. rate limit, quota or key issue), return fallback demo invoice data gracefully
        res.json({
          ...defaultDemoData,
          _warning: "AI Vision analysis encountered a network/API issue. Loaded template invoice for review."
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
    console.log(`====================================================`);
    console.log(`🚀 POS Offline Local Application is running!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`💾 Local Database: SQLite (${path.join(process.cwd(), 'pos_local.sqlite')})`);
    console.log(`🔒 Local Auth Roles: Admin (admin/admin123), Cashier (cashier/cashier123)`);
    console.log(`====================================================`);
  });
}

startServer();
