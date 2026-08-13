import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_FILE_PATH = path.join(process.cwd(), 'pos_local.sqlite');

let db: Database | null = null;

// Helper to save DB to disk
export function saveDatabaseToDisk() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

// Initialize SQLite DB
export async function getLocalDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      db = new SQL.Database(fileBuffer);
      console.log('Successfully loaded existing SQLite database from pos_local.sqlite');
    } catch (e) {
      console.warn('Could not read existing database file, creating fresh database...', e);
      db = new SQL.Database();
    }
  } else {
    console.log('Creating new SQLite database pos_local.sqlite...');
    db = new SQL.Database();
  }

  // Create Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      fullName TEXT,
      role TEXT,
      email TEXT,
      phone TEXT,
      active INTEGER,
      createdAt TEXT,
      permissions TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT UNIQUE,
      name TEXT,
      nameAr TEXT,
      nameKu TEXT,
      category TEXT,
      categoryAr TEXT,
      categoryKu TEXT,
      supplierDelegate TEXT,
      cartonsCount INTEGER,
      unitsPerCarton INTEGER,
      totalUnits INTEGER,
      cartonPurchasePrice REAL,
      costPerUnit REAL,
      singleRetailPrice REAL,
      wholesalePrice REAL,
      cartonSellingPrice REAL,
      singleProfit REAL,
      wholesaleProfit REAL,
      cartonProfit REAL,
      initialAddDate TEXT,
      lastEditDate TEXT,
      expiryDate TEXT,
      price REAL,
      cost REAL,
      stock REAL,
      minStock REAL,
      unit TEXT,
      supplierId TEXT,
      supplierName TEXT,
      imageIcon TEXT,
      status TEXT,
      scientificName TEXT,
      dosageForm TEXT,
      pharmaCategory TEXT,
      batchNumber TEXT,
      blistersPerBox INTEGER,
      blisterPrice REAL,
      storageCondition TEXT,
      storageLocation TEXT
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      invoiceNumber TEXT UNIQUE,
      timestamp TEXT,
      customerName TEXT,
      items TEXT,
      returnedItems TEXT,
      subtotal REAL,
      tax REAL,
      discount REAL,
      total REAL,
      paymentMethod TEXT,
      amountTendered REAL,
      changeDue REAL,
      cashierName TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT,
      nameAr TEXT,
      contactPerson TEXT,
      phone TEXT,
      email TEXT,
      categorySupplied TEXT,
      activeOrders INTEGER,
      totalInvoiced REAL,
      totalPaid REAL,
      balanceDue REAL,
      rating REAL,
      avatar TEXT,
      taxNumber TEXT,
      address TEXT,
      isSaved INTEGER,
      payments TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      email TEXT,
      loyaltyPoints INTEGER,
      totalSpent REAL,
      visitsCount INTEGER,
      tier TEXT,
      joinedDate TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      data TEXT
    );
  `);

  // Check if default admin/cashier exist, if not insert them
  const userCheck = db.exec("SELECT COUNT(*) as count FROM users");
  const userCount = userCheck[0]?.values[0]?.[0] as number;

  if (userCount === 0) {
    console.log('Seeding default local user accounts (Admin & Cashier)...');
    
    const adminPermissions = JSON.stringify({
      canAccessDashboard: true,
      canAccessPOS: true,
      canManageProducts: true,
      canManageInventoryAudit: true,
      canManagePurchases: true,
      canManageSuppliers: true,
      canManageCustomers: true,
      canManageOrders: true,
      canViewInvoices: true,
      canViewAnalytics: true,
      canViewReports: true,
      canManageSettings: true,
    });

    const cashierPermissions = JSON.stringify({
      canAccessDashboard: false,
      canAccessPOS: true,
      canManageProducts: false,
      canManageInventoryAudit: false,
      canManagePurchases: false,
      canManageSuppliers: false,
      canManageCustomers: true,
      canManageOrders: false,
      canViewInvoices: true,
      canViewAnalytics: false,
      canViewReports: false,
      canManageSettings: false,
    });

    db.run(
      `INSERT INTO users (id, username, password, fullName, role, email, active, createdAt, permissions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'user-admin-1',
        'admin',
        'admin123',
        'المدير العام (Admin)',
        'Admin',
        'admin@local.pos',
        1,
        new Date().toISOString(),
        adminPermissions
      ]
    );

    db.run(
      `INSERT INTO users (id, username, password, fullName, role, email, active, createdAt, permissions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'user-cashier-1',
        'cashier',
        'cashier123',
        'كاشير المبيعات (Cashier)',
        'Cashier',
        'cashier@local.pos',
        1,
        new Date().toISOString(),
        cashierPermissions
      ]
    );

    saveDatabaseToDisk();
  }

  return db;
}
