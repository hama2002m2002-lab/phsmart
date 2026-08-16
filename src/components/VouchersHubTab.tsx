import React, { useState } from 'react';
import { 
  Receipt, 
  ShoppingCart, 
  PackagePlus, 
  Undo2, 
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  FileText,
  BadgePercent,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { POSTab } from './POSTab';
import { PurchasesTab } from './PurchasesTab';
import { InvoicesTab } from './InvoicesTab';
import { DelegateReturnsModal } from './DelegateReturnsModal';
import { Product, SaleTransaction, Supplier, Customer, StoreSettings, UserAccount, PurchaseInvoice } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { isToday } from '../lib/dateUtils';

export type VoucherSubTab = 'hub' | 'pos' | 'purchases' | 'delegateReturns' | 'invoices';

interface VouchersHubTabProps {
  initialSubTab?: VoucherSubTab;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  salesHistory: SaleTransaction[];
  setSalesHistory: React.Dispatch<React.SetStateAction<SaleTransaction[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  settings: StoreSettings;
  setSettings?: React.Dispatch<React.SetStateAction<StoreSettings>>;
  currentUser?: UserAccount | null;
  onOpenPOS?: () => void;
  onSaleCompleted: (sale: SaleTransaction) => void;
  showPOSInventory: boolean;
  setShowPOSInventory: React.Dispatch<React.SetStateAction<boolean>>;
  isYellowLineModalOpen: boolean;
  setIsYellowLineModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAnyModalOpen: boolean;
  onViewReceipt: (sale: SaleTransaction) => void;
  onOpenMobileSync: () => void;
  onExitPOS: () => void;
  onBackToDashboard: () => void;
  onOpenPrintBarcode: (prod?: Product | null) => void;
  onOpenSalesReturn: () => void;
  onOpenCustomerDisplay: () => void;
  handleOpenAddProduct: () => void;
  handleOpenAddProductForSupplier: (supplierName: string) => void;
  setSalesReturnPreInvoiceNo: (no: string | null) => void;
  setIsSalesReturnOpen: (isOpen: boolean) => void;
}

export const VouchersHubTab: React.FC<VouchersHubTabProps> = ({
  initialSubTab = 'hub',
  products,
  setProducts,
  salesHistory,
  setSalesHistory,
  suppliers,
  setSuppliers,
  customers,
  setCustomers,
  purchaseInvoices,
  setPurchaseInvoices,
  settings,
  setSettings,
  currentUser,
  onOpenPOS,
  onSaleCompleted,
  showPOSInventory,
  setShowPOSInventory,
  isYellowLineModalOpen,
  setIsYellowLineModalOpen,
  isAnyModalOpen,
  onViewReceipt,
  onOpenMobileSync,
  onExitPOS,
  onBackToDashboard,
  onOpenPrintBarcode,
  onOpenSalesReturn,
  onOpenCustomerDisplay,
  handleOpenAddProduct,
  handleOpenAddProductForSupplier,
  setSalesReturnPreInvoiceNo,
  setIsSalesReturnOpen,
}) => {
  const lang = settings.language;
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';

  const [activeSubTab, setActiveSubTab] = useState<VoucherSubTab>(initialSubTab);

  // Statistics calculation for the Hub View
  const todaySales = salesHistory.filter(s => s && isToday(s.timestamp));
  const todaySalesCount = todaySales.length;
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + (s.finalAmount || 0), 0);

  const purchaseInvoicesCount = purchaseInvoices.length;
  const totalPurchasesAmount = purchaseInvoices.reduce((acc, p) => acc + (p.finalAmount || p.totalAmount || 0), 0);

  const voucherCards = [
    {
      id: 'pos' as VoucherSubTab,
      title: isKu ? 'کاشێر و فرۆشتنی خێرا (POS)' : isAr ? 'الكاشير والبيع السريع (POS)' : 'POS & Cashier',
      subtitle: isKu ? 'تۆمارکردنی فرۆشتن، لێدانی بارکۆد و پسوولەی فرۆشتن' : isAr ? 'إصدار فواتير البيع السريع، قراءة الباركود وطباعة الوصولات' : 'Point of Sale, barcode scanning and instant receipts',
      badge: isKu ? 'خێرا' : isAr ? 'سريع' : 'FAST',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: ShoppingCart,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
      borderGlow: 'hover:border-emerald-500/60 hover:shadow-emerald-500/20',
      statLabel: isKu ? 'فرۆشتنی ئەمڕۆ' : isAr ? 'مبيعات اليوم' : 'Today Sales',
      statValue: `${todaySalesCount} ${isKu ? 'پسوولە' : isAr ? 'فاتورة' : 'bills'} (${formatNumber(todaySalesTotal)} ${settings.currency})`,
      btnText: isKu ? 'کردنەوەی شاشەی کاشێر' : isAr ? 'فتح شاشة الكاشير والبيع' : 'Launch Cashier POS',
      btnColor: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-950/40',
    },
    {
      id: 'delegateReturns' as VoucherSubTab,
      title: isKu ? 'گەڕاندنەوەی کاڵا بۆ مەندوب' : isAr ? 'إرجاع مواد إلى مندوب / مورد' : 'Return Items to Delegate',
      subtitle: isKu ? 'گەڕاندنەوەی بضاعة و پسوولەی قەرەبوو لە کۆمپانیا و مەندوبەکان' : isAr ? 'تسجيل إرجاع واسترداد البضائع إلى المندوبين والشركات مع كشف الحساب' : 'Return damaged or expired items to suppliers & delegates',
      badge: isKu ? 'مەندوب' : isAr ? 'مندوب' : 'Delegate',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: Undo2,
      gradient: 'from-amber-600 via-orange-600 to-red-700',
      borderGlow: 'hover:border-amber-500/60 hover:shadow-amber-500/20',
      statLabel: isKu ? 'کۆمپانیا و دابینکەران' : isAr ? 'الشركات والمندوبين' : 'Active Suppliers',
      statValue: `${suppliers.length} ${isKu ? 'دابینکەر' : isAr ? 'مورد ومندوب' : 'Suppliers'}`,
      btnText: isKu ? 'تۆمارکردنی گەڕاندنەوە' : isAr ? 'تسجيل إرجاع بضاعة لمندوب' : 'Process Delegate Return',
      btnColor: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-950/40',
    },
    {
      id: 'purchases' as VoucherSubTab,
      title: isKu ? 'کڕین و دابینکردن' : isAr ? 'فواتير الشراء وتوريد البضائع' : 'Purchases & Restock Invoices',
      subtitle: isKu ? 'تۆمارکردنی پسوولەی کڕینی کاڵا، زیادکردنی کۆگا و حیسابی مەندوب' : isAr ? 'إدخال فواتير المشتريات، تزويد المخزون ومطابقة حسابات التجهيز' : 'Manage purchase invoices, restock items and supplier billing',
      badge: isKu ? 'نوێ' : isAr ? 'جديد' : 'NEW',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      icon: PackagePlus,
      gradient: 'from-blue-600 via-cyan-600 to-teal-700',
      borderGlow: 'hover:border-cyan-500/60 hover:shadow-cyan-500/20',
      statLabel: isKu ? 'پسوولەکانی کڕین' : isAr ? 'إجمالي فواتير الشراء' : 'Total Purchase Bills',
      statValue: `${purchaseInvoicesCount} ${isKu ? 'پسوولە' : isAr ? 'فاتورة' : 'invoices'} (${formatNumber(totalPurchasesAmount)} ${settings.currency})`,
      btnText: isKu ? 'بەشی فواتیری کڕین' : isAr ? 'إدارة فواتير الشراء والتوريد' : 'Manage Purchase Invoices',
      btnColor: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-950/40',
    },
    {
      id: 'invoices' as VoucherSubTab,
      title: isKu ? 'ئەرشیفی پسوولەکانی فرۆشتن' : isAr ? 'أرشيف وسجل فواتير البيع' : 'Sales Receipts Archive',
      subtitle: isKu ? 'گەڕان، چاپکردنەوە، پشکنین و سەرلەنوێ تەماشاکردنی پسوولەکان' : isAr ? 'البحث عن الفواتير السابقة، إعادة الطباعة، التعديل وإرجاع المبيعات' : 'Search, reprint, view details and process returns for invoices',
      badge: `${salesHistory.length}`,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: FileSpreadsheet,
      gradient: 'from-purple-600 via-indigo-600 to-blue-700',
      borderGlow: 'hover:border-purple-500/60 hover:shadow-purple-500/20',
      statLabel: isKu ? 'کۆی گشتی فواتیر' : isAr ? 'إجمالي الوصولات المسجلة' : 'All Recorded Receipts',
      statValue: `${salesHistory.length} ${isKu ? 'پسوولە' : isAr ? 'فاتورة بيع' : 'receipts'}`,
      btnText: isKu ? 'کردنەوەی ئەرشیف' : isAr ? 'عرض أرشيف الفواتير' : 'Open Receipts Archive',
      btnColor: 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-purple-950/40',
    },
  ];

  const isAdmin = !currentUser || currentUser.role === 'Admin';
  const perms = currentUser?.permissions;

  const availableVoucherCards = voucherCards.filter((card) => {
    if (isAdmin) return true;
    if (!perms) return true;
    if (card.id === 'pos') return Boolean(perms.canAccessPOS);
    if (card.id === 'delegateReturns') return Boolean(perms.canManageProducts || perms.canManageSuppliers);
    if (card.id === 'purchases') return Boolean(perms.canManagePurchases ?? perms.canManageProducts);
    if (card.id === 'invoices') return Boolean(perms.canViewInvoices ?? perms.canManageOrders);
    return true;
  });

  // If we are in the main Hub page (واجهة وصلات الرئيسية)
  if (activeSubTab === 'hub') {
    return (
      <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-2 sm:p-4 space-y-4 max-w-7xl mx-auto w-full">
        
        {/* Header Hero for Vouchers Hub */}
        <div className="bg-gradient-to-r from-[#0C1527] via-[#101D36] to-[#0A1120] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-xl shadow-cyan-950/20 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30 shrink-0">
                <Receipt className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-wide">
                    {isKu ? 'ڕووکاری سەرەکی پسوولەکان (وصلات)' : isAr ? 'واجهة قسم الوصلات والفواتير' : 'Vouchers & Invoices Portal'}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-black">
                    {isKu ? 'وصلات' : isAr ? 'وصلات' : 'Vouchers'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isKu
                    ? 'هەموو پسوولەکانی کاشێر، کڕین و دابینکردن، گەڕاندنەوەی کاڵا بۆ مەندوب و ئەرشیف لە یەک شوێندا.'
                    : isAr
                    ? 'المركز الشامل لعمليات البيع السريع (POS)، فواتير الشراء والتجهيز، مرتجعات المندوب وأرشيف الفواتير.'
                    : 'Unified portal for Cashier POS, Purchase Invoices, Delegate Returns and Sales Archives.'}
                </p>
              </div>
            </div>

            {/* Quick Back to Dashboard */}
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0 self-end sm:self-auto"
            >
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              <span>{isKu ? 'گەڕانەوە بۆ پەیجی سەرەکی' : isAr ? 'العودة للرئيسية' : 'Back to Dashboard'}</span>
            </button>
          </div>
        </div>

        {/* Compact Action Buttons Grid: ONLY Icon & Button Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {availableVoucherCards.map((card) => {
            const Icon = card.icon;

            const handleCardClick = () => {
              if (card.id === 'pos' && onOpenPOS) {
                onOpenPOS();
              } else {
                setActiveSubTab(card.id);
              }
            };

            return (
              <button
                key={card.id}
                type="button"
                onClick={handleCardClick}
                className={`group relative bg-[#0D1527] hover:bg-[#13203D] active:scale-[0.98] border border-slate-700/80 hover:border-cyan-500/50 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-between gap-3 text-start w-full ${card.borderGlow}`}
              >
                {/* Icon & Name */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`p-3 rounded-xl bg-gradient-to-tr ${card.gradient} text-white shadow-md group-hover:scale-105 transition-transform shrink-0`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm lg:text-base font-black text-white group-hover:text-cyan-300 transition-colors leading-tight">
                      {card.title}
                    </h2>
                  </div>
                </div>

                {/* Subtle Arrow */}
                <div className="w-7 h-7 rounded-lg bg-slate-800/80 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 text-slate-400 flex items-center justify-center transition-colors shrink-0">
                  {isAr || isKu ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>
            );
          })}
        </div>

      </div>
    );
  }

  // Sub-Navigation for active sub views (POS, Purchases, Returns, Invoices)
  const navTabs = [
    {
      id: 'pos' as VoucherSubTab,
      label: isKu ? 'کاشێر و فرۆشتنی خێرا (POS)' : isAr ? 'الكاشير والبيع السريع (POS)' : 'POS & Cashier',
      icon: ShoppingCart,
      badge: isKu ? 'خێرا' : isAr ? 'سريع' : 'FAST',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    },
    {
      id: 'delegateReturns' as VoucherSubTab,
      label: isKu ? 'گەڕاندنەوەی کاڵا بۆ مەندوب' : isAr ? 'إرجاع مواد إلى مندوب' : 'Delegate Returns',
      icon: Undo2,
      badge: isKu ? 'مەندوب' : isAr ? 'مندوب' : 'Delegate',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    },
    {
      id: 'purchases' as VoucherSubTab,
      label: isKu ? 'کڕین و دابینکردن' : isAr ? 'فواتير الشراء والتوريد' : 'Purchases & Restock',
      icon: PackagePlus,
      badge: isKu ? 'نوێ' : isAr ? 'جديد' : 'NEW',
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    },
    {
      id: 'invoices' as VoucherSubTab,
      label: isKu ? 'ئەرشیفی پسوولەکان' : isAr ? 'أرشيف فواتير البيع' : 'Sales Invoices',
      icon: FileSpreadsheet,
      badge: `${salesHistory.length}`,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
  ];

  return (
    <div className="flex flex-col h-full space-y-2">
      
      {/* Top Header Bar when inside any sub-module */}
      <div className="bg-[#0D1527] border border-cyan-500/30 rounded-2xl p-2 sm:p-2.5 shadow-md shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Back to Vouchers Hub Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('hub')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow-md shadow-cyan-950/40 transition-all active:scale-95 cursor-pointer"
            >
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              <span>{isKu ? 'واژەی سەرەکی پسوولەکان' : isAr ? 'واجهة الوصلات الرئيسية' : 'Vouchers Hub'}</span>
            </button>
          </div>

          {/* Quick Sub Tab Switcher */}
          <div className="flex flex-wrap items-center gap-1 bg-[#070D1C] p-1 rounded-xl border border-slate-700/80">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'pos' && onOpenPOS) {
                      onOpenPOS();
                    } else {
                      setActiveSubTab(tab.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Main Sub Tab Render */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeSubTab === 'pos' && (
          <div className="h-full">
            <POSTab
              products={products}
              setProducts={setProducts}
              customers={customers}
              settings={settings}
              setSettings={setSettings}
              onSaleCompleted={onSaleCompleted}
              showInventory={showPOSInventory}
              setShowInventory={setShowPOSInventory}
              showYellowLineModal={isYellowLineModalOpen}
              setShowYellowLineModal={setIsYellowLineModalOpen}
              isAnyModalOpen={isAnyModalOpen}
              salesHistory={salesHistory}
              onViewReceipt={onViewReceipt}
              onOpenMobileSync={onOpenMobileSync}
              onExitPOS={() => setActiveSubTab('hub')}
              onBackToDashboard={onBackToDashboard}
              onOpenPrintBarcode={onOpenPrintBarcode}
              onOpenSalesReturn={onOpenSalesReturn}
              onOpenDelegateReturns={() => setActiveSubTab('delegateReturns')}
              onOpenCustomerDisplay={onOpenCustomerDisplay}
              currentUser={currentUser}
            />
          </div>
        )}

        {activeSubTab === 'purchases' && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <PurchasesTab
              products={products}
              setProducts={setProducts}
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              purchaseInvoices={purchaseInvoices}
              setPurchaseInvoices={setPurchaseInvoices}
              settings={settings}
              onOpenAddProduct={handleOpenAddProduct}
              onBackToDashboard={() => setActiveSubTab('hub')}
            />
          </div>
        )}

        {activeSubTab === 'delegateReturns' && (
          <div className="h-full">
            <DelegateReturnsModal
              isOpen={true}
              onClose={() => setActiveSubTab('hub')}
              products={products}
              setProducts={setProducts}
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              settings={settings}
              cashierName={currentUser?.fullName || (isAr ? 'الكاشير الرئيسي' : 'Main Cashier')}
            />
          </div>
        )}

        {activeSubTab === 'invoices' && (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <InvoicesTab
              products={products}
              salesHistory={salesHistory}
              setSalesHistory={setSalesHistory}
              userAccounts={[]}
              onUpdateSaleCashier={(saleId, newCashierName) => {
                setSalesHistory(prev => prev.map(s => s.id === saleId ? { ...s, cashierName: newCashierName } : s));
              }}
              settings={settings}
              onOpenPOS={() => setActiveSubTab('pos')}
              onBackToDashboard={() => setActiveSubTab('hub')}
              onViewReceipt={onViewReceipt}
              onOpenReturnForSale={(sale) => {
                setSalesReturnPreInvoiceNo(sale.invoiceNumber);
                setIsSalesReturnOpen(true);
              }}
            />
          </div>
        )}
      </div>

    </div>
  );
};
