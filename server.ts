import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
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
