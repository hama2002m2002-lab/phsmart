import React, { useState } from 'react';
import { X, Code2, Download, Copy, Check, FileCode, Terminal, Sparkles, Monitor, Layers, ShieldCheck } from 'lucide-react';
import { StoreSettings, Product, SaleTransaction } from '../types';

interface CSharpExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  products: Product[];
  sales: SaleTransaction[];
}

export const CSharpExporterModal: React.FC<CSharpExporterModalProps> = ({
  isOpen,
  onClose,
  settings,
  products,
  sales
}) => {
  if (!isOpen) return null;

  const [activeFile, setActiveFile] = useState<'Program.cs' | 'MainForm.cs' | 'Product.cs' | 'ReceiptPrinter.cs' | 'DatabaseHelper.cs' | '7amoPOS.csproj'>('MainForm.cs');
  const [copiedFile, setCopiedFile] = useState<boolean>(false);

  const lang = settings.language;
  const isAr = lang === 'ar';

  const csharpCodeFiles = {
    'Program.cs': `using System;
using System.Windows.Forms;

namespace SevenAmoPOS
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}`,

    'MainForm.cs': `using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace SevenAmoPOS
{
    public partial class MainForm : Form
    {
        private List<Product> _inventory = new List<Product>();
        private List<CartItem> _cart = new List<CartItem>();
        private decimal _grandTotal = 0;

        public MainForm()
        {
            InitializeComponent();
            LoadInventory();
        }

        private void LoadInventory()
        {
            // Load products from SQLite database
            _inventory = DatabaseHelper.GetProducts();
            RefreshProductGrid();
        }

        private void txtBarcode_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter)
            {
                string barcode = txtBarcode.Text.Trim();
                var product = _inventory.Find(p => p.Barcode == barcode);

                if (product != null)
                {
                    AddToCart(product);
                    System.Media.SystemSounds.Beep.Play();
                }
                else
                {
                    MessageBox.Show("هذا الباركود غير موجود بالمخزن!", "تنبيه", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }

                txtBarcode.Clear();
                txtBarcode.Focus();
            }
        }

        private void AddToCart(Product p)
        {
            var item = _cart.Find(c => c.ProductId == p.Id);
            if (item != null)
            {
                item.Quantity++;
                item.Total = item.Quantity * item.Price;
            }
            else
            {
                _cart.Add(new CartItem { ProductId = p.Id, ProductName = p.Name, Price = p.Price, Quantity = 1, Total = p.Price });
            }

            UpdateCartGrid();
        }

        private void UpdateCartGrid()
        {
            dgvCart.DataSource = null;
            dgvCart.DataSource = _cart;
            
            _grandTotal = 0;
            foreach (var item in _cart) _grandTotal += item.Total;
            lblGrandTotal.Text = $"{_grandTotal:N2} د.ع";
        }

        private void btnCheckout_Click(object sender, EventArgs e)
        {
            if (_cart.Count == 0) return;

            string invoiceNo = "INV-" + DateTime.Now.ToString("yyyyMMddHHmmss");
            ReceiptPrinter.PrintReceipt(invoiceNo, _cart, _grandTotal, "${settings.storeName.replace(/"/g, '\\"')}");
            
            DatabaseHelper.SaveSale(invoiceNo, _cart, _grandTotal);
            _cart.Clear();
            UpdateCartGrid();

            MessageBox.Show("تمت عملية البيع وطباعة الوصل بنجاح!", "نجاح", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
    }
}`,

    'Product.cs': `namespace SevenAmoPOS
{
    public class Product
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string NameAr { get; set; }
        public string Barcode { get; set; }
        public decimal Price { get; set; }
        public decimal WholesalePrice { get; set; }
        public int Stock { get; set; }
        public string Category { get; set; }
    }

    public class CartItem
    {
        public string ProductId { get; set; }
        public string ProductName { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public decimal Total { get; set; }
    }
}`,

    'ReceiptPrinter.cs': `using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Printing;
using System.Windows.Forms;

namespace SevenAmoPOS
{
    public static class ReceiptPrinter
    {
        public static void PrintReceipt(string invoiceNo, List<CartItem> items, decimal total, string storeName)
        {
            PrintDocument pd = new PrintDocument();
            pd.PrintPage += (sender, e) =>
            {
                Graphics g = e.Graphics;
                Font fontHeader = new Font("Arial", 14, FontStyle.Bold);
                Font fontBody = new Font("Arial", 10, FontStyle.Regular);
                Font fontBold = new Font("Arial", 10, FontStyle.Bold);

                int y = 10;
                g.DrawString(storeName, fontHeader, Brushes.Black, 10, y); y += 25;
                g.DrawString("وصل مبيعات: " + invoiceNo, fontBold, Brushes.Black, 10, y); y += 20;
                g.DrawString("التاريخ: " + DateTime.Now.ToString("g"), fontBody, Brushes.Black, 10, y); y += 25;
                g.DrawString("------------------------------------", fontBody, Brushes.Black, 10, y); y += 15;

                foreach (var item in items)
                {
                    g.DrawString($"{item.ProductName} ({item.Quantity}x)", fontBody, Brushes.Black, 10, y);
                    g.DrawString($"{item.Total:N2}", fontBold, Brushes.Black, 180, y);
                    y += 20;
                }

                g.DrawString("------------------------------------", fontBody, Brushes.Black, 10, y); y += 20;
                g.DrawString($"الإجمالي الصافي: {total:N2}", fontHeader, Brushes.Black, 10, y);
            };

            PrintDialog pdDlg = new PrintDialog();
            pdDlg.Document = pd;
            if (pdDlg.ShowDialog() == DialogResult.OK)
            {
                pd.Print();
            }
        }
    }
}`,

    'DatabaseHelper.cs': `using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace SevenAmoPOS
{
    public static class DatabaseHelper
    {
        private static string _dbPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "7amo_pos_data.json");

        public static List<Product> GetProducts()
        {
            if (!File.Exists(_dbPath)) return GetInitialDemoData();
            string json = File.ReadAllText(_dbPath);
            return JsonSerializer.Deserialize<List<Product>>(json) ?? GetInitialDemoData();
        }

        public static void SaveSale(string invoiceNo, List<CartItem> items, decimal total)
        {
            // Update stock and save local JSON/SQLite database
            var products = GetProducts();
            foreach (var item in items)
            {
                var p = products.Find(x => x.Id == item.ProductId);
                if (p != null) p.Stock -= item.Quantity;
            }
            File.WriteAllText(_dbPath, JsonSerializer.Serialize(products, new JsonSerializerOptions { WriteIndented = true }));
        }

        private static List<Product> GetInitialDemoData()
        {
            return new List<Product>
            {
                new Product { Id = "P1", Name = "Aspirin 500mg", NameAr = "بندول 500 ملغم", Barcode = "1111", Price = 2500, Stock = 100 },
                new Product { Id = "P2", Name = "Amoxicillin", NameAr = "أموكسيسيلين", Barcode = "2222", Price = 4000, Stock = 50 }
            };
        }
    }
}`,

    '7amoPOS.csproj': `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <ApplicationIcon>app.ico</ApplicationIcon>
    <Title>7amo.pos Desktop C#</Title>
  </PropertyGroup>
</Project>`
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(csharpCodeFiles[activeFile]);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleDownloadZipSolution = () => {
    const fullZipCode = Object.entries(csharpCodeFiles)
      .map(([fileName, code]) => `// ================= ${fileName} =================\n${code}`)
      .join('\n\n\n');

    const blob = new Blob([fullZipCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SevenAmoPOS_CSharp_DotNet8_Solution.cs';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="cyber-card p-4 sm:p-6 rounded-3xl border border-cyan-500/40 w-full max-w-4xl bg-[#0B1120] text-slate-100 relative shadow-[0_0_60px_rgba(6,182,212,0.3)] my-auto animate-scaleUp">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.5)]">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                مشروع 7amo.pos بلغة <span className="text-purple-400 font-mono">C# (.NET 8 WinForms/WPF)</span>
              </h2>
              <p className="text-xs text-slate-400">
                كود المصدري الكامل بلغة سي شارب (C#) للتشغيل على نظام الويندوز وتطوير التطبيق
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="my-3 p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              تم توليد المشروع المصدري بـ <strong>Visual Studio .NET 8 C#</strong> ليحتوي على واجهة الكاشير، الكود للباركود، وطباعة الفواتير حرارياً!
            </span>
          </div>
          <button
            type="button"
            onClick={handleDownloadZipSolution}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تنزيل ملفات C# الكاملة</span>
          </button>
        </div>

        {/* Code Tabs Header */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
          {Object.keys(csharpCodeFiles).map((fileName) => (
            <button
              key={fileName}
              type="button"
              onClick={() => setActiveFile(fileName as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeFile === fileName
                  ? 'bg-purple-600 text-white border border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{fileName}</span>
            </button>
          ))}
        </div>

        {/* Code Viewer Stage */}
        <div className="relative mt-3 rounded-2xl bg-[#040812] border border-slate-800 p-3 overflow-hidden font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
            <span className="text-[11px] text-purple-400 font-bold">{activeFile}</span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer border border-slate-700 transition-all"
            >
              {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
              <span>{copiedFile ? 'تم النسخ!' : 'نسخ الكود'}</span>
            </button>
          </div>

          <pre className="max-h-[45vh] overflow-y-auto overflow-x-auto text-emerald-300 p-2 leading-relaxed selection:bg-purple-900">
            <code>{csharpCodeFiles[activeFile]}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            متوافق مع Visual Studio 2022 و .NET 8.0 Framework
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold cursor-pointer transition-all"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
