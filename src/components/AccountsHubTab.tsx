import React, { useState } from 'react';
import { 
  Users, 
  Truck, 
  Store, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { 
  StoreSettings, 
  UserAccount, 
  Supplier, 
  Customer, 
  MarketOrder, 
  PurchaseInvoice, 
  Product, 
  SaleTransaction,
  MarketNotification
} from '../types';
import { SuppliersTab } from './SuppliersTab';
import { CustomersTab } from './CustomersTab';
import { OrdersTab } from './OrdersTab';
import { ReportsTab } from './ReportsTab';
import { PermissionsManagerTab } from './PermissionsManagerTab';

export type AccountsSubTab = 
  | 'hub'
  | 'settings'
  | 'suppliers'
  | 'customers'
  | 'orders'
  | 'cashierAccounts'
  | 'permissions'
  | 'pos';

interface AccountsHubTabProps {
  initialSubTab?: AccountsSubTab;
  settings: StoreSettings;
  setSettings?: React.Dispatch<React.SetStateAction<StoreSettings>>;
  currentUser?: UserAccount | null;
  userAccounts: UserAccount[];
  setUserAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  orders: MarketOrder[];
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  salesHistory: SaleTransaction[];
  setSalesHistory?: React.Dispatch<React.SetStateAction<SaleTransaction[]>>;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  notifications?: MarketNotification[];
  onImportBackup?: (backupData: any) => number | void;
  onOpenPOS: () => void;
  onOpenAddProductForSupplier?: (supplierName: string) => void;
  onOpenAIInvoiceScanner?: () => void;
  onViewReceipt?: (sale: SaleTransaction) => void;
  onBackToDashboard?: () => void;
}

export const AccountsHubTab: React.FC<AccountsHubTabProps> = ({
  initialSubTab = 'hub',
  settings,
  currentUser,
  userAccounts,
  setUserAccounts,
  suppliers,
  setSuppliers,
  customers,
  setCustomers,
  orders,
  products,
  setProducts,
  salesHistory,
  setSalesHistory,
  purchaseInvoices,
  setPurchaseInvoices,
  onOpenAddProductForSupplier,
  onOpenAIInvoiceScanner,
  onViewReceipt,
  onBackToDashboard,
}) => {
  const isAr = settings.language === 'ar';
  const isKu = settings.language === 'ku';

  const [activeSubTab, setActiveSubTab] = useState<AccountsSubTab>(
    initialSubTab === 'settings' ? 'permissions' : initialSubTab
  );

  const isAdmin = !currentUser || currentUser.role === 'Admin';
  const perms = currentUser?.permissions;

  const canViewPermissions = isAdmin || Boolean(perms?.canManageSettings);
  const canViewSuppliers = isAdmin || Boolean(perms?.canManageSuppliers);
  const canViewCustomers = isAdmin || Boolean(perms?.canManageCustomers);
  const canViewOrders = isAdmin || Boolean(perms?.canManageOrders);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050813] text-slate-100 overflow-hidden">
      
      {/* Top Header & SubTab Bar */}
      <div className="bg-[#090F1E] border-b border-cyan-500/20 px-4 py-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Title & Back to Hub / Dashboard */}
          <div className="flex items-center gap-3">
            {activeSubTab !== 'hub' ? (
              <button
                type="button"
                onClick={() => setActiveSubTab('hub')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border border-slate-700 active:scale-95"
              >
                <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                <span>{isKu ? 'پێڕستی سەرەکی هەژمارەکان' : isAr ? 'رئيسية الحسابات والجهات' : 'Accounts Hub'}</span>
              </button>
            ) : onBackToDashboard ? (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border border-slate-700 active:scale-95"
              >
                <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                <span>{isKu ? 'گەڕانەوە بۆ پەیجی سەرەکی' : isAr ? 'العودة للرئيسية' : 'Back to Dashboard'}</span>
              </button>
            ) : null}

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-black text-white flex items-center gap-2">
                  <span>{isKu ? 'هەژمارەکان و لایەنەکان' : isAr ? 'الحسابات والجهات' : 'Accounts & Relations'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    HUB
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  {isKu 
                    ? 'بەڕێوەبردنی دابینکەران، کڕیاران، داواکارییەکان، و هەژمارەکانی کاشێر و دەسەڵاتەکان' 
                    : isAr 
                    ? 'إدارة الموردين، العملاء، الطلبات، وحسابات الكاشير والصلاحيات' 
                    : 'Manage Suppliers, Customers, Orders, Cashier Accounts & Permissions'}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5">

        {/* 1. HUB OVERVIEW (Cards Portal Grid) */}
        {activeSubTab === 'hub' && (
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
            
            {/* Action Buttons Grid: Permitted Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
              
              {/* BUTTON 1: حسابات الكاشير وإعطاء الصلاحيات (هەژمارەکانی کاشێر و پێدانی دەسەڵاتەکان) */}
              {canViewPermissions && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('permissions')}
                  className="group relative bg-[#0E1528] hover:bg-[#16223C] active:scale-[0.98] border border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-between gap-3 text-start w-full"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0">
                      <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm lg:text-base font-black text-white group-hover:text-cyan-300 transition-colors leading-tight">
                        {isKu ? 'هەژمارەکانی کاشێر و پێدانی دەسەڵاتەکان' : isAr ? 'حسابات الكاشير وإعطاء الصلاحيات' : 'Cashier Accounts & Permissions'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {isKu ? 'دروستکردنی هەژمار و دیاریکردنی وردی دەسەڵاتەکانی چوونەژوورەوە' : isAr ? 'إنشاء وتعديل حسابات الكاشير والموظفين وتحديد صلاحيات الوصول بدقة' : 'Manage cashier accounts, create credentials & assign granular rights'}
                      </p>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 text-cyan-400 flex items-center justify-center transition-colors shrink-0">
                    {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </div>
                </button>
              )}

              {/* BUTTON 2: دابینکەران و کۆمپانیاکان (الموردين والشركات) */}
              {canViewSuppliers && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('suppliers')}
                  className="group relative bg-[#0F172A] hover:bg-[#162340] active:scale-[0.98] border border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-between gap-3 text-start w-full"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                      <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm lg:text-base font-black text-white group-hover:text-indigo-300 transition-colors leading-tight">
                        {isKu ? 'دابینکەران و کۆمپانیاکان' : isAr ? 'الموردين والشركات' : 'Suppliers & Vendors'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {isKu ? 'کۆمپانیاکانی دابینکردن، قەرز و پسوولەی کڕین' : isAr ? 'إدارة المجهزين والشركات والديون المستحقة' : 'Vendor records, purchases & payable debts'}
                      </p>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center transition-colors shrink-0">
                    {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </div>
                </button>
              )}

              {/* BUTTON 3: کڕیاران و بەرنامەی دڵسۆزی (العملاء وبرنامج الولاء) */}
              {canViewCustomers && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('customers')}
                  className="group relative bg-[#1C1022] hover:bg-[#281730] active:scale-[0.98] border border-pink-500/40 hover:border-pink-400 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-between gap-3 text-start w-full"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform shrink-0">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm lg:text-base font-black text-white group-hover:text-pink-300 transition-colors leading-tight">
                        {isKu ? 'کڕیاران و بەرنامەی دڵسۆزی' : isAr ? 'العملاء وبرنامج الولاء' : 'Customers & Loyalty'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {isKu ? 'تۆماری کڕیاران، قەرزەکان و خاڵەکانی پاداشت' : isAr ? 'إدارة الزبائن وسجل الديون ونقاط المكافآت' : 'Customer profiles, debt ledger & loyalty points'}
                      </p>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-pink-500/10 group-hover:bg-pink-500/20 text-pink-400 flex items-center justify-center transition-colors shrink-0">
                    {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </div>
                </button>
              )}

              {/* BUTTON 4: داواکارییەکان و گەیاندن (الطلبات والتوصيل) */}
              {canViewOrders && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('orders')}
                  className="group relative bg-[#1C160B] hover:bg-[#2A2111] active:scale-[0.98] border border-amber-500/40 hover:border-amber-400 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-between gap-3 text-start w-full"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                      <Store className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm lg:text-base font-black text-white group-hover:text-amber-300 transition-colors leading-tight">
                        {isKu ? 'داواکارییەکان و گەیاندن' : isAr ? 'الطلبات والتوصيل' : 'Orders & Delivery'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {isKu ? 'داواکارییە هاتووەکان و بارەکانی کڕین' : isAr ? 'متابعة شحنات الطلبيات وحالات التوصيل' : 'Track customer shipments & delivery orders'}
                      </p>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 text-amber-400 flex items-center justify-center transition-colors shrink-0">
                    {isAr || isKu ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </div>
                </button>
              )}

            </div>

          </div>
        )}

        {/* 2. SUBTAB: CASHIER ACCOUNTS & PERMISSIONS */}
        {(activeSubTab === 'permissions' || activeSubTab === 'settings') && (
          <div className="h-full">
            <PermissionsManagerTab
              settings={settings}
              userAccounts={userAccounts}
              setUserAccounts={setUserAccounts}
            />
          </div>
        )}

        {/* 3. SUBTAB: SUPPLIERS */}
        {activeSubTab === 'suppliers' && (
          <div className="h-full">
            <SuppliersTab
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              products={products}
              setProducts={setProducts}
              purchaseInvoices={purchaseInvoices}
              setPurchaseInvoices={setPurchaseInvoices}
              settings={settings}
              onOpenAddProductForSupplier={onOpenAddProductForSupplier}
              onOpenAIInvoiceScanner={onOpenAIInvoiceScanner}
            />
          </div>
        )}

        {/* 4. SUBTAB: CUSTOMERS */}
        {activeSubTab === 'customers' && (
          <div className="h-full">
            <CustomersTab
              customers={customers}
              setCustomers={setCustomers}
              settings={settings}
              salesHistory={salesHistory}
              setSalesHistory={setSalesHistory}
              onViewReceipt={onViewReceipt}
              onOpenPOS={() => setActiveSubTab('hub')}
            />
          </div>
        )}

        {/* 5. SUBTAB: ORDERS */}
        {activeSubTab === 'orders' && (
          <div className="h-full">
            <OrdersTab
              orders={orders}
              settings={settings}
            />
          </div>
        )}

        {/* 6. SUBTAB: CASHIER ACCOUNTS */}
        {activeSubTab === 'cashierAccounts' && (
          <div className="h-full">
            <ReportsTab
              products={products}
              salesHistory={salesHistory}
              suppliers={suppliers}
              customers={customers}
              purchaseInvoices={purchaseInvoices}
              userAccounts={userAccounts}
              settings={settings}
              initialCategory="financial"
              initialSubTab="cashier_accounts"
              isCashierAccountsOnly={true}
              onOpenShiftReport={() => {}}
              onOpenAccountsModal={() => {}}
              onViewReceipt={onViewReceipt}
              onBackToDashboard={() => setActiveSubTab('hub')}
            />
          </div>
        )}

      </div>

    </div>
  );
};
