import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  FileText, Printer, Download, Calendar, CheckCircle, ShieldCheck,
  TrendingUp, DollarSign, CreditCard, Wallet, BarChart3,
  Package, Clock, AlertTriangle, Users, ShoppingBag, UserCheck,
  ShieldAlert, RefreshCw, Filter, ArrowUpRight, ArrowDownRight,
  Truck, Percent, Receipt, History, Activity, Sparkles, X, Plus,
  MinusCircle, Lock, Award, Zap, ArrowRight, ArrowLeft, Eye,
  FileSpreadsheet, Trash2, Tag, PlusCircle, RotateCcw, FolderPlus,
  Edit2, Check, Boxes, Search, ShoppingCart, BookOpen, Coins,
  Star, Flame, Gauge, CalendarRange, CheckCircle2, ClipboardCheck,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Product, SaleTransaction, Supplier, Customer, PurchaseInvoice, UserAccount, StoreSettings, OperatingExpenseItem, InventoryAuditSession } from '../types';
import { formatNumber } from '../lib/formatUtils';
import { parseDate, isToday, isThisWeek, isThisMonth, isThreeMonths, isThisYear, formatDisplayDate, formatDisplayTime, formatDisplayDateTime, formatDateDDMMYYYY } from '../lib/dateUtils';
import { getItemUnitCost, getItemTotalProfit } from '../lib/financialUtils';
import { exportDataToExcel } from '../lib/excelExport';
import { DatePickerDDMMYYYY } from './DatePickerDDMMYYYY';

interface ReportsTabProps {
  products: Product[];
  salesHistory: SaleTransaction[];
  suppliers?: Supplier[];
  customers?: Customer[];
  purchaseInvoices?: PurchaseInvoice[];
  userAccounts?: UserAccount[];
  settings: StoreSettings;
  initialCategory?: MainReportCategory;
  initialSubTab?: string;
  isCashierAccountsOnly?: boolean;
  onOpenShiftReport?: () => void;
  onOpenAccountsModal?: () => void;
  onViewReceipt?: (sale: SaleTransaction) => void;
  onToggleFullscreen?: (isFull: boolean) => void;
  onBackToDashboard?: () => void;
  onOpenDamagedItemsModal?: () => void;
  onOpenInventoryAudit?: () => void;
}

export type MainReportCategory = 
  | 'financial'
  | 'inventory'
  | 'suppliers'
  | 'customers'
  | 'security'
  | 'operational';

export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'rent', labelAr: 'إيجار المحل والمخزن', labelKu: 'کرێی دوکان و کۆگا', labelEn: 'Rent & Storage', icon: '🏢' },
  { id: 'electricity', labelAr: 'كهرباء ومولدات وطاقة', labelKu: 'کارەبا و مۆلیدە و وزە', labelEn: 'Electricity & Utilities', icon: '⚡' },
  { id: 'salaries', labelAr: 'رواتب الموظفين والكاشيرية', labelKu: 'مووچەی کارمەندان و کاشێرەکان', labelEn: 'Staff Salaries', icon: '👥' },
  { id: 'petty', labelAr: 'مصاريف نثرية وضيافة', labelKu: 'تێچووی لاوەکی و میوانداری', labelEn: 'Petty Cash & Hospitality', icon: '☕' },
  { id: 'maintenance', labelAr: 'صيانة ومعدات وتصليح', labelKu: 'چاککردنەوە و ئامێرەکان', labelEn: 'Maintenance & Repairs', icon: '🔧' },
  { id: 'transport', labelAr: 'أجور نقل وشحن وتوصيل', labelKu: 'کرێی گواستنەوە و گەیاندن', labelEn: 'Logistics & Transport', icon: '🚚' },
  { id: 'marketing', labelAr: 'تسويق ودعاية وإعلانات', labelKu: 'مارکێتینگ و ڕیکلام', labelEn: 'Marketing & Ads', icon: '📢' },
  { id: 'packaging', labelAr: 'أكياس وتغليف ومطبوعات', labelKu: 'نایلۆن و پاکێجینگ و چاپ', labelEn: 'Packaging & Supplies', icon: '📦' },
  { id: 'taxes', labelAr: 'ضرائب ورسوم حكومية', labelKu: 'باج و ڕسووماتی فەرمی', labelEn: 'Taxes & Official Fees', icon: '🏛️' },
  { id: 'custom', labelAr: 'نوع مخصص آخر', labelKu: 'جۆری تایبەتی تر', labelEn: 'Custom Expense Type', icon: '🏷️' },
];

export const ReportsTab: React.FC<ReportsTabProps> = ({
  products = [],
  salesHistory = [],
  suppliers = [],
  customers = [],
  purchaseInvoices = [],
  userAccounts = [],
  settings,
  initialCategory,
  initialSubTab,
  isCashierAccountsOnly,
  onOpenShiftReport,
  onOpenAccountsModal,
  onViewReceipt,
  onToggleFullscreen,
  onBackToDashboard,
  onOpenDamagedItemsModal,
  onOpenInventoryAudit
}) => {
  const lang = settings.language;
  const isLight = settings?.themeMode === 'light';
  const isAr = lang === 'ar';
  const isKu = lang === 'ku';
  const currency = settings.currencySymbol || 'د.ع';

  const t = (ar: string, ku: string, en: string = ar) => isKu ? ku : (isAr ? ar : en);

  // ----------------------------------------------------
  // NAVIGATION & FILTER STATES
  // ----------------------------------------------------
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(Boolean(isCashierAccountsOnly || initialSubTab || (initialCategory && initialCategory !== 'financial')));
  const [activeCategory, setActiveCategory] = useState<MainReportCategory>(initialCategory || 'financial');
  const [activeSubTab, setActiveSubTab] = useState<string>(isCashierAccountsOnly ? 'cashier_accounts' : (initialSubTab || 'comprehensive_financial'));

  // Today Returns Detailed Modal state & Analytics Timeframe
  const [showTodayReturnsModal, setShowTodayReturnsModal] = useState<boolean>(false);
  const [todayReturnsSearchInput, setTodayReturnsSearchInput] = useState<string>('');
  const [returnsChartTimeframe, setReturnsChartTimeframe] = useState<'7days' | '14days' | '30days'>('7days');
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');
  const [itemTurnoverTab, setItemTurnoverTab] = useState<'fast' | 'slow' | 'dead'>('fast');

  // Inventory Audit Sessions State & Expand Accordion
  const [auditSessions, setAuditSessions] = useState<InventoryAuditSession[]>(() => {
    try {
      const saved = localStorage.getItem('pos_inventory_audit_sessions_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [expandedAuditSessionId, setExpandedAuditSessionId] = useState<string | null>(null);
  const [auditSessionSearch, setAuditSessionSearch] = useState<string>('');

  // Damaged Items Logs State & Filter for Wastage Report
  const [damagedLogsFilter, setDamagedLogsFilter] = useState<'ALL' | 'DAMAGED' | 'BROKEN' | 'EXPIRED' | 'DEFECTIVE'>('ALL');
  const [damagedLogs, setDamagedLogs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('pos_damaged_items_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedDamaged = localStorage.getItem('pos_damaged_items_logs');
        setDamagedLogs(savedDamaged ? JSON.parse(savedDamaged) : []);

        const savedAudits = localStorage.getItem('pos_inventory_audit_sessions_v1');
        setAuditSessions(savedAudits ? JSON.parse(savedAudits) : []);
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (isCashierAccountsOnly) {
      setActiveCategory('financial');
      setActiveSubTab('cashier_accounts');
      setIsDetailOpen(true);
      onToggleFullscreen?.(true);
    } else if (initialSubTab) {
      setActiveSubTab(initialSubTab);
      setIsDetailOpen(true);
      onToggleFullscreen?.(true);
    } else if (initialCategory && initialCategory !== 'financial') {
      setActiveCategory(initialCategory);
      setIsDetailOpen(true);
      onToggleFullscreen?.(true);
    }
  }, [initialCategory, initialSubTab, isCashierAccountsOnly]);
  
  // Date range filter
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'three_months' | 'year'>('all');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');

  // Custom Date & Time Filter state
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [startDate, setStartDate] = useState<string>(todayDateStr);
  const [startTime, setStartTime] = useState<string>('00:00');
  const [endDate, setEndDate] = useState<string>(todayDateStr);
  const [endTime, setEndTime] = useState<string>('23:59');
  const [useCustomDateTime, setUseCustomDateTime] = useState<boolean>(false);

  // Cashier Accounts UI Interactive state
  const [expandedCashierInvoices, setExpandedCashierInvoices] = useState<string | null>(null);
  const [cashierDrawerFilter, setCashierDrawerFilter] = useState<{ [cashierName: string]: 'all' | 'cash' | 'refunds' | 'net' | 'profit' | 'sold_items' | 'returned_items' }>({});
  const [cashierPrintModalData, setCashierPrintModalData] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SaleTransaction | null>(null);
  
  // Operational expenses state (Dynamic list defaulting to 0 / empty as requested)
  const [opExpenseItems, setOpExpenseItems] = useState<OperatingExpenseItem[]>(() => {
    try {
      const saved = localStorage.getItem('pos_custom_operating_expenses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return []; // Defaults to 0 / empty list
  });

  // Custom expense categories created by the user
  const [customExpenseTypes, setCustomExpenseTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pos_custom_expense_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [editingExpense, setEditingExpense] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('rent');
  const [newExpenseAmount, setNewExpenseAmount] = useState<number | ''>('');
  const [newExpenseNote, setNewExpenseNote] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Persist expense items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pos_custom_operating_expenses', JSON.stringify(opExpenseItems));
    } catch (e) {
      console.error(e);
    }
  }, [opExpenseItems]);

  // Persist custom categories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pos_custom_expense_types', JSON.stringify(customExpenseTypes));
    } catch (e) {
      console.error(e);
    }
  }, [customExpenseTypes]);

  // Helper to add single manual expense unit
  const handleAddExpenseItem = () => {
    if (!newExpenseName.trim() || newExpenseAmount === '' || Number(newExpenseAmount) < 0) return;
    const newItem: OperatingExpenseItem = {
      id: 'EXP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: newExpenseName.trim(),
      category: newExpenseCategory,
      amount: Number(newExpenseAmount),
      note: newExpenseNote.trim() || undefined,
      date: new Date().toISOString()
    };
    setOpExpenseItems(prev => [newItem, ...prev]);
    setNewExpenseName('');
    setNewExpenseAmount('');
    setNewExpenseNote('');
    setShowAddExpenseModal(false);
  };

  // Helper to add custom expense type
  const handleAddCustomType = () => {
    if (!newCategoryName.trim()) return;
    const catName = newCategoryName.trim();
    if (!customExpenseTypes.includes(catName)) {
      setCustomExpenseTypes(prev => [...prev, catName]);
    }
    setNewExpenseCategory(catName);
    setNewCategoryName('');
    setShowAddCategoryModal(false);
  };

  // Zero out all expense amounts (as requested: "اجعل كل تكاليف مصفرا")
  const handleZeroAllExpenses = () => {
    setOpExpenseItems(prev => prev.map(item => ({ ...item, amount: 0 })));
  };

  // Clear / remove all expense items
  const handleClearAllExpenses = () => {
    setOpExpenseItems([]);
  };

  // Delete a single expense item
  const handleDeleteExpenseItem = (id: string) => {
    setOpExpenseItems(prev => prev.filter(item => item.id !== id));
  };

  // Update a single expense item field
  const handleUpdateExpenseItem = (id: string, field: keyof OperatingExpenseItem, value: any) => {
    setOpExpenseItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Helper to resolve category title and icon
  const getCategoryMeta = (catIdOrName: string) => {
    const predefined = DEFAULT_EXPENSE_CATEGORIES.find(c => c.id === catIdOrName);
    if (predefined) {
      return {
        label: isKu ? predefined.labelKu : (isAr ? predefined.labelAr : predefined.labelEn),
        icon: predefined.icon
      };
    }
    return {
      label: catIdOrName,
      icon: '🏷️'
    };
  };

  // Shift closure simulation
  const [actualShiftCash, setActualShiftCash] = useState<number>(0);
  const [shiftClosed, setShiftClosed] = useState(false);

  // Full print preview modal state
  const [showPrintModal, setShowPrintModal] = useState(false);

  // ----------------------------------------------------
  // FILTERED SALES HISTORY (WITH DATE & TIME FILTER)
  // ----------------------------------------------------
  const filteredSales = useMemo(() => {
    let list = Array.isArray(salesHistory) ? [...salesHistory] : [];

    // Filter by Cashier
    if (selectedCashier !== 'all') {
      list = list.filter(s => s && s.cashierName === selectedCashier);
    }

    // Filter by Custom Date & Time if enabled
    if (useCustomDateTime) {
      let startTs = 0;
      let endTs = Infinity;
      if (startDate) {
        const [sY, sM, sD] = startDate.split('-').map(Number);
        const [sH, sMin] = (startTime || '00:00').split(':').map(Number);
        startTs = new Date(sY, sM - 1, sD, sH || 0, sMin || 0, 0, 0).getTime();
      }
      if (endDate) {
        const [eY, eM, eD] = endDate.split('-').map(Number);
        const [eH, eMin] = (endTime || '23:59').split(':').map(Number);
        endTs = new Date(eY, eM - 1, eD, eH !== undefined ? eH : 23, eMin !== undefined ? eMin : 59, 59, 999).getTime();
      }

      list = list.filter(s => {
        if (!s || !s.timestamp) return false;
        const saleTs = parseDate(s.timestamp).getTime();
        if (isNaN(saleTs)) return false;
        if (startTs && saleTs < startTs) return false;
        if (endTs && saleTs > endTs) return false;
        return true;
      });
    } else if (dateFilter !== 'all') {
      list = list.filter(s => {
        if (!s || !s.timestamp) return false;
        if (dateFilter === 'today') {
          return isToday(s.timestamp);
        }
        if (dateFilter === 'week') {
          return isThisWeek(s.timestamp);
        }
        if (dateFilter === 'month') {
          return isThisMonth(s.timestamp);
        }
        if (dateFilter === 'three_months') {
          return isThreeMonths(s.timestamp);
        }
        if (dateFilter === 'year') {
          return isThisYear(s.timestamp);
        }
        return true;
      });
    }

    return list;
  }, [salesHistory, dateFilter, selectedCashier, useCustomDateTime, startDate, startTime, endDate, endTime]);

  // ----------------------------------------------------
  // PER-CASHIER DETAILED ACCOUNTS METRICS (حساب كاشير)
  // ----------------------------------------------------
  const cashierAccountsData = useMemo(() => {
    const namesSet = new Set<string>();

    // Collect names from userAccounts (ONLY real created user accounts)
    if (userAccounts && userAccounts.length > 0) {
      userAccounts.forEach(u => {
        const displayName = u.fullName || u.username;
        if (displayName && displayName.trim()) {
          namesSet.add(displayName.trim());
        }
      });
    }

    // Collect names from sales history
    salesHistory.forEach(s => {
      if (s.cashierName && s.cashierName.trim()) {
        namesSet.add(s.cashierName.trim());
      }
    });

    return Array.from(namesSet).map(name => {
      const cashierTx = filteredSales.filter(s => {
        if (!s.cashierName) return false;
        const sName = s.cashierName.trim().toLowerCase();
        const targetName = name.trim().toLowerCase();
        return sName === targetName || sName.includes(targetName) || targetName.includes(sName);
      });

      let cashSales = 0;
      let cardSales = 0;
      let refunds = 0;
      let discounts = 0;
      let grossSales = 0;
      let cogs = 0;

      cashierTx.forEach(s => {
        const isRefunded = s.status === 'refunded';
        const rawTot = Math.abs(s.total || 0);
        const sub = Math.abs(s.subtotal || rawTot);
        const disc = s.discount || 0;

        const returnedArr = Array.isArray(s.returnedItems)
          ? s.returnedItems
          : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);
        const partialRefundsVal = returnedArr.reduce((rAcc: number, r: any) => rAcc + Math.abs(Number(r?.total || (Number(r?.price || 0) * Number(r?.quantity || 0))) || 0), 0);

        if (isRefunded) {
          grossSales += sub;
          discounts += disc;
          refunds += rawTot > 0 ? rawTot : partialRefundsVal;
          // COGS is 0 for fully refunded items
        } else {
          grossSales += sub;
          discounts += disc;
          refunds += partialRefundsVal;

          if (s.paymentMethod === 'cash') {
            cashSales += Math.max(0, rawTot - partialRefundsVal);
          } else {
            cardSales += Math.max(0, rawTot - partialRefundsVal);
          }

          if (Array.isArray(s.items)) {
            s.items.forEach(item => {
              const prod = products.find(p => p.id === item.productId);
              const costUnit = getItemUnitCost(item, prod);

              const retItem = returnedArr.find((r: any) => r?.productId === item.productId || r?.barcode === item.barcode || r?.productName === item.productName);
              const retQty = retItem ? (Number(retItem.quantity) || 0) : 0;
              const netQty = Math.max(0, (item.quantity || 0) - retQty);

              cogs += costUnit * netQty;
            });
          }
        }
      });

      const netSales = grossSales - discounts - refunds;
      const profit = netSales - cogs;
      const invoiceCount = cashierTx.length;

      return {
        cashierName: name,
        cashSales,
        cardSales,
        refunds,
        discounts,
        grossSales,
        netSales,
        profit,
        invoiceCount,
        avgInvoice: invoiceCount > 0 ? Math.round(netSales / invoiceCount) : 0,
        transactions: cashierTx
      };
    });
  }, [filteredSales, userAccounts, salesHistory, products]);

  // ----------------------------------------------------
  // CALCULATED TODAY'S RETURNS FINANCIAL SUMMARY METRICS
  // ----------------------------------------------------
  const todayReturnsSummary = useMemo(() => {
    const todaySales = salesHistory.filter(s => {
      if (!s || !s.timestamp) return false;
      const d = new Date(s.timestamp);
      if (!isNaN(d.getTime())) {
        const now = new Date();
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      }
      return isToday(s.timestamp);
    });

    const returnedSales = todaySales.filter(s => {
      if (s.status === 'refunded') return true;
      if (s.total < 0 || s.subtotal < 0) return true;
      const returnedArr = Array.isArray(s.returnedItems)
        ? s.returnedItems
        : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);
      return returnedArr.length > 0;
    });

    let totalAmount = 0;
    let totalItemsCount = 0;

    returnedSales.forEach(s => {
      const isFullRefund = s.status === 'refunded' || s.total < 0;
      const returnedArr = Array.isArray(s.returnedItems)
        ? s.returnedItems
        : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);

      if (isFullRefund) {
        const val = Math.abs(s.total || s.subtotal || 0);
        totalAmount += val;
        const items = Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? (JSON.parse(s.items || '[]') || []) : []);
        totalItemsCount += items.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 1), 0);
      } else {
        const partialVal = returnedArr.reduce((acc: number, r: any) => acc + Math.abs(Number(r?.total || (Number(r?.price || 0) * Number(r?.quantity || 0))) || 0), 0);
        const partialQty = returnedArr.reduce((acc: number, r: any) => acc + (Number(r?.quantity) || 1), 0);
        totalAmount += partialVal;
        totalItemsCount += partialQty;
      }
    });

    return {
      count: returnedSales.length,
      totalAmount,
      totalItemsCount,
      returnedSales
    };
  }, [salesHistory]);

  // ----------------------------------------------------
  // DAILY RETURNS ANALYTICS & RECHARTS DATA COMPUTATION
  // ----------------------------------------------------
  const dailyReturnsAnalytics = useMemo(() => {
    const daysCount = returnsChartTimeframe === '7days' ? 7 : returnsChartTimeframe === '14days' ? 14 : 30;
    const now = new Date();
    const datesMap: { [dateStr: string]: { dateLabel: string; rawDate: string; grossSales: number; returnedAmount: number; returnRate: number; salesCount: number; returnsCount: number } } = {};

    // Generate array of last N days
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const rawDate = `${year}-${month}-${day}`;
      const dateLabel = d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });

      datesMap[rawDate] = {
        dateLabel,
        rawDate,
        grossSales: 0,
        returnedAmount: 0,
        returnRate: 0,
        salesCount: 0,
        returnsCount: 0
      };
    }

    // Populate with actual sales & returns from salesHistory
    salesHistory.forEach(s => {
      if (!s || !s.timestamp) return;
      const d = new Date(s.timestamp);
      if (isNaN(d.getTime())) return;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const rawDate = `${year}-${month}-${day}`;

      if (datesMap[rawDate]) {
        const isRefund = s.status === 'refunded' || s.total < 0 || s.subtotal < 0;
        const returnedArr = Array.isArray(s.returnedItems)
          ? s.returnedItems
          : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);

        if (isRefund) {
          const val = Math.abs(s.total || s.subtotal || 0);
          datesMap[rawDate].returnedAmount += val;
          datesMap[rawDate].returnsCount += 1;
        } else {
          const grossVal = Math.max(0, s.total || 0);
          datesMap[rawDate].grossSales += grossVal;
          datesMap[rawDate].salesCount += 1;

          if (returnedArr.length > 0) {
            const partialVal = returnedArr.reduce((acc: number, r: any) => acc + Math.abs(Number(r?.total || (Number(r?.price || 0) * Number(r?.quantity || 0))) || 0), 0);
            datesMap[rawDate].returnedAmount += partialVal;
            datesMap[rawDate].returnsCount += 1;
          }
        }
      }
    });

    const chartList = Object.values(datesMap).map(item => {
      const totalBase = item.grossSales + item.returnedAmount;
      const rate = totalBase > 0 ? Number(((item.returnedAmount / totalBase) * 100).toFixed(1)) : 0;
      return {
        ...item,
        returnRate: rate
      };
    });

    // Top Returned Products aggregation for Quality Decisions
    const productReturnMap: { [key: string]: { name: string; returnedQty: number; returnedAmount: number; returnCount: number } } = {};

    salesHistory.forEach(s => {
      const isRefund = s.status === 'refunded' || s.total < 0;
      const returnedArr = Array.isArray(s.returnedItems)
        ? s.returnedItems
        : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);

      if (isRefund) {
        const items = Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? (JSON.parse(s.items || '[]') || []) : []);
        items.forEach((it: any) => {
          const pName = it.productNameAr || it.productName || 'مادة';
          if (!productReturnMap[pName]) {
            productReturnMap[pName] = { name: pName, returnedQty: 0, returnedAmount: 0, returnCount: 0 };
          }
          productReturnMap[pName].returnedQty += (Number(it.quantity) || 1);
          productReturnMap[pName].returnedAmount += (Number(it.price || 0) * Number(it.quantity || 1) || 0);
          productReturnMap[pName].returnCount += 1;
        });
      } else if (returnedArr.length > 0) {
        returnedArr.forEach((it: any) => {
          const pName = it.productNameAr || it.productName || 'مادة';
          if (!productReturnMap[pName]) {
            productReturnMap[pName] = { name: pName, returnedQty: 0, returnedAmount: 0, returnCount: 0 };
          }
          productReturnMap[pName].returnedQty += (Number(it.quantity) || 1);
          productReturnMap[pName].returnedAmount += (Number(it.total || (Number(it.price || 0) * Number(it.quantity || 0))) || 0);
          productReturnMap[pName].returnCount += 1;
        });
      }
    });

    const topReturnedProducts = Object.values(productReturnMap)
      .sort((a, b) => b.returnedAmount - a.returnedAmount)
      .slice(0, 5);

    // Period Financial Totals & Overall Return Rate
    const periodGrossSales = chartList.reduce((acc, i) => acc + i.grossSales, 0);
    const periodReturnsVal = chartList.reduce((acc, i) => acc + i.returnedAmount, 0);
    const periodTotal = periodGrossSales + periodReturnsVal;
    const periodReturnRate = periodTotal > 0 ? Number(((periodReturnsVal / periodTotal) * 100).toFixed(1)) : 0;

    return {
      chartList,
      topReturnedProducts,
      periodGrossSales,
      periodReturnsVal,
      periodReturnRate
    };
  }, [salesHistory, returnsChartTimeframe, isAr]);

  // ----------------------------------------------------
  // CALCULATED FINANCIAL METRICS
  // ----------------------------------------------------
  const financialMetrics = useMemo(() => {
    let grossSales = 0;
    let totalDiscounts = 0;
    let totalRefundsValue = 0;
    let cogs = 0;

    filteredSales.forEach(s => {
      const isRefunded = s.status === 'refunded';
      const rawTot = Math.abs(s.total || 0);
      const sub = Math.abs(s.subtotal || rawTot);
      const disc = s.discount || 0;

      const returnedArr = Array.isArray(s.returnedItems)
        ? s.returnedItems
        : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);
      const partialRefundsVal = returnedArr.reduce((rAcc: number, r: any) => rAcc + Math.abs(Number(r?.total || (Number(r?.price || 0) * Number(r?.quantity || 0))) || 0), 0);

      if (isRefunded) {
        grossSales += sub;
        totalDiscounts += disc;
        totalRefundsValue += rawTot > 0 ? rawTot : partialRefundsVal;
      } else {
        grossSales += sub;
        totalDiscounts += disc;
        totalRefundsValue += partialRefundsVal;

        if (Array.isArray(s.items)) {
          s.items.forEach(item => {
            const prod = products.find(p => p.id === item.productId);
            const costUnit = getItemUnitCost(item, prod);

            const retItem = returnedArr.find((r: any) => r?.productId === item.productId || r?.barcode === item.barcode || r?.productName === item.productName);
            const retQty = retItem ? (Number(retItem.quantity) || 0) : 0;
            const netQty = Math.max(0, (item.quantity || 0) - retQty);

            cogs += costUnit * netQty;
          });
        }
      }
    });

    const netSales = grossSales - totalDiscounts - totalRefundsValue;
    const grossProfit = netSales - cogs;
    const earnedProfit = grossProfit; // الأرباح المحققة المكتسبة الفعلية من المبيعات
    const totalOperatingExpenses = opExpenseItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const netOperatingProfit = grossProfit - totalOperatingExpenses;

    // Payment methods breakdown
    const cashInHand = filteredSales
      .filter(s => s.paymentMethod === 'cash' && s.status !== 'refunded')
      .reduce((acc, s) => acc + s.total, 0);

    const posCardTerminals = filteredSales
      .filter(s => (s.paymentMethod === 'card' || s.paymentMethod === 'nfc') && s.status === 'completed')
      .reduce((acc, s) => acc + s.total, 0);

    const loyaltyWalletSales = filteredSales
      .filter(s => s.paymentMethod === 'loyalty' && s.status === 'completed')
      .reduce((acc, s) => acc + s.total, 0);

    return {
      grossSales,
      totalDiscounts,
      totalRefundsValue,
      netSales,
      cogs,
      grossProfit,
      earnedProfit,
      totalOperatingExpenses,
      netOperatingProfit,
      cashInHand,
      posCardTerminals,
      loyaltyWalletSales
    };
  }, [filteredSales, products, opExpenseItems]);

  // ----------------------------------------------------
  // CALCULATED INVENTORY VALUATION METRICS
  // ----------------------------------------------------
  const inventoryValuation = useMemo(() => {
    let totalCostVal = 0;
    let totalRetailVal = 0;
    let totalItemsCount = 0;
    let totalShelvesStock = 0;
    let totalBackroomStock = 0;

    const fastMoving: Product[] = [];
    const slowMoving: Product[] = [];
    const deadStock: Product[] = [];
    const reorderAlerts: Product[] = [];
    const expiredStock: Product[] = [];
    const nearExpiryStock: Product[] = [];

    const now = new Date();

    products.forEach(p => {
      const stock = p.stock || 0;
      const costUnit = p.costPerUnit || p.cost || 0;
      const retailUnit = p.singleRetailPrice || p.price || 0;

      totalItemsCount += 1;
      totalCostVal += costUnit * stock;
      totalRetailVal += retailUnit * stock;

      // Split stock (simulation: 70% shelves, 30% backroom warehouse)
      totalShelvesStock += Math.ceil(stock * 0.7);
      totalBackroomStock += Math.floor(stock * 0.3);

      // Stock alerts
      if (stock <= (p.minStock || settings.lowStockThresholdDefault || 10)) {
        reorderAlerts.push(p);
      }

      // Check sales activity for item movement (fast/slow/dead)
      const salesCount = salesHistory.reduce((acc, s) => {
        const item = s.items.find(i => i.productId === p.id);
        return acc + (item ? item.quantity : 0);
      }, 0);

      if (salesCount >= 15) {
        fastMoving.push(p);
      } else if (salesCount > 0 && salesCount < 5) {
        slowMoving.push(p);
      } else if (salesCount === 0) {
        deadStock.push(p);
      }

      // Expiry Ledger check
      if (p.expiryDate) {
        const expDate = new Date(p.expiryDate);
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 0) {
          expiredStock.push(p);
        } else if (diffDays <= 60) {
          nearExpiryStock.push(p);
        }
      }
    });

    const potentialProfit = totalRetailVal - totalCostVal;

    return {
      totalItemsCount,
      totalCostVal,
      totalRetailVal,
      potentialProfit,
      totalShelvesStock,
      totalBackroomStock,
      fastMoving,
      slowMoving,
      deadStock,
      reorderAlerts,
      expiredStock,
      nearExpiryStock
    };
  }, [products, salesHistory, settings.lowStockThresholdDefault]);

  // ----------------------------------------------------
  // CALCULATED SUPPLIER METRICS
  // ----------------------------------------------------
  const supplierMetrics = useMemo(() => {
    const invoices = Array.isArray(purchaseInvoices) ? purchaseInvoices : [];
    const totalPurchasesVal = invoices.reduce((acc, pi) => acc + (pi?.totalInvoiceAmount || 0), 0);
    const totalPaidVal = invoices.reduce((acc, pi) => acc + (pi?.paidAmount || 0), 0);
    const totalSupplierDebts = invoices.reduce((acc, pi) => acc + (pi?.remainingAmount || 0), 0);

    return {
      totalPurchasesVal,
      totalPaidVal,
      totalSupplierDebts,
      invoicesCount: invoices.length
    };
  }, [purchaseInvoices]);

  // ----------------------------------------------------
  // CALCULATED CUSTOMER & CREDIT METRICS
  // ----------------------------------------------------
  const customerMetrics = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    const totalCustomersCount = list.length;
    const vipCustomers = list.filter(c => c && (c.tier === 'VIP' || c.tier === 'Gold' || (c.totalSpent && c.totalSpent > 100000)));
    
    // Credit accounts & Aging Debt simulation
    const creditCustomers = list.map(c => {
      if (!c) return { id: '', name: '', debt: 0, debtDays: 0, phone: '', email: '', points: 0, totalSpent: 0, tier: 'Bronze' };
      const cId = c.id ? String(c.id) : '';
      const debt = (cId.length % 3 === 0) ? Math.floor((c.totalSpent || 0) * 0.15) : 0;
      const days = (cId.length % 2 === 0) ? 20 : 75;
      return {
        ...c,
        debt,
        debtDays: days
      };
    }).filter(c => c.debt > 0);

    const totalDebts = creditCustomers.reduce((acc, c) => acc + c.debt, 0);

    const debtUnder30 = creditCustomers.filter(c => c.debtDays < 30).reduce((acc, c) => acc + c.debt, 0);
    const debt30To60 = creditCustomers.filter(c => c.debtDays >= 30 && c.debtDays <= 60).reduce((acc, c) => acc + c.debt, 0);
    const debtOver90 = creditCustomers.filter(c => c.debtDays > 60).reduce((acc, c) => acc + c.debt, 0);

    return {
      totalCustomersCount,
      vipCustomers,
      creditCustomers,
      totalDebts,
      debtUnder30,
      debt30To60,
      debtOver90
    };
  }, [customers]);

  // ----------------------------------------------------
  // CALCULATED OPERATIONAL & CASHIER PERFORMANCE METRICS
  // ----------------------------------------------------
  const operationalAnalytics = useMemo(() => {
    // Hourly distribution (24 hours)
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const hourSales = filteredSales.filter(s => {
        const h = new Date(s.timestamp).getHours();
        return h === i;
      });
      const revenue = hourSales.reduce((acc, s) => acc + s.total, 0);
      return {
        hour: i,
        hourLabel: `${i.toString().padStart(2, '0')}:00`,
        count: hourSales.length,
        revenue
      };
    });

    const totalInvoices = filteredSales.length;
    const totalItemsSold = filteredSales.reduce((acc, s) => {
      return acc + s.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);

    const avgBasketItems = totalInvoices > 0 ? (totalItemsSold / totalInvoices).toFixed(1) : '0';
    const avgTicketSize = totalInvoices > 0 ? Math.round(financialMetrics.netSales / totalInvoices) : 0;

    // Cashier performance map
    const cashierPerformance: { [key: string]: { salesVal: number; invoiceCount: number; errors: number; voidCount: number } } = {};

    filteredSales.forEach(s => {
      const name = s.cashierName || t('كاشير عام', 'کاشێری گشتی', 'General Cashier');
      if (!cashierPerformance[name]) {
        cashierPerformance[name] = { salesVal: 0, invoiceCount: 0, errors: 0, voidCount: 0 };
      }
      cashierPerformance[name].salesVal += s.status === 'completed' ? s.total : 0;
      cashierPerformance[name].invoiceCount += 1;
      if (s.status === 'refunded') {
        cashierPerformance[name].voidCount += 1;
      }
    });

    return {
      hourlyData,
      totalInvoices,
      totalItemsSold,
      avgBasketItems,
      avgTicketSize,
      cashierPerformance
    };
  }, [filteredSales, financialMetrics.netSales, isAr, isKu]);

  // Wastage & Damage Analytics & Combined Logs
  const wastageAnalytics = useMemo(() => {
    const combinedLogs: Array<{
      id: string;
      productName: string;
      barcode: string;
      quantity: number;
      damageType: 'DAMAGED' | 'BROKEN' | 'EXPIRED' | 'DEFECTIVE';
      reason: string;
      costPerUnit: number;
      totalLossAmount: number;
      recordedAt: string;
      cashierName?: string;
      source: 'LOG' | 'EXPIRED_PRODUCT';
    }> = [
      ...damagedLogs.map(item => ({
        id: item.id,
        productName: item.productName || 'صنف غير مسمى',
        barcode: item.barcode || 'N/A',
        quantity: item.quantity || 1,
        damageType: item.damageType || 'DAMAGED',
        reason: item.reason || t('إتلاف مسجل', 'زیانی تۆمارکراو', 'Recorded damage'),
        costPerUnit: item.costPerUnit || 0,
        totalLossAmount: item.totalLossAmount || ((item.costPerUnit || 0) * (item.quantity || 1)),
        recordedAt: item.recordedAt || new Date().toISOString().replace('T', ' ').substring(0, 16),
        cashierName: item.cashierName || t('الكاشير', 'کاشێر', 'Cashier'),
        source: 'LOG' as const
      })),
      ...inventoryValuation.expiredStock
        .filter(p => !damagedLogs.some(l => l.productId === p.id && l.damageType === 'EXPIRED'))
        .map(p => {
          const unitCost = p.costPerUnit || p.cost || 0;
          const qty = p.stock || 1;
          return {
            id: `exp-${p.id}`,
            productName: p.nameKu || p.nameAr || p.name,
            barcode: p.barcode || 'N/A',
            quantity: qty,
            damageType: 'EXPIRED' as const,
            reason: t('منتهي الصلاحية تلقائياً في المخزن', 'بەرواری بەسەرچووە بە خودکار لە کۆگا', 'Expired stock in inventory'),
            costPerUnit: unitCost,
            totalLossAmount: unitCost * qty,
            recordedAt: p.expiryDate || new Date().toISOString().split('T')[0],
            cashierName: t('فحص المخزن التلقائي', 'پشکنینی کۆگا', 'Auto Audit'),
            source: 'EXPIRED_PRODUCT' as const
          };
        })
    ];

    const filteredCombined = combinedLogs.filter(item => {
      if (damagedLogsFilter === 'ALL') return true;
      return item.damageType === damagedLogsFilter;
    });

    const totalLoss = filteredCombined.reduce((sum, item) => sum + item.totalLossAmount, 0);
    const totalQty = filteredCombined.reduce((sum, item) => sum + item.quantity, 0);

    return {
      combinedLogs,
      filteredCombined,
      totalLoss,
      totalQty
    };
  }, [damagedLogs, inventoryValuation.expiredStock, damagedLogsFilter, isAr, isKu, t]);

  // ----------------------------------------------------
  // PROFESSIONAL PDF SUMMARY REPORT EXPORTER
  // ----------------------------------------------------
  const handleExportPdfSummary = (period: 'today' | 'month') => {
    const periodLabel = period === 'today' ? 'ملخص مبيعات اليوم' : 'ملخص مبيعات الشهر الحالي';
    const currency = settings.currencySymbol || 'د.ع';
    const storeName = settings.storeNameAr || settings.storeName || 'الماركيت المتقدم';

    // Filter sales for period
    const now = new Date();
    const salesToReport = salesHistory.filter(sale => {
      if (!sale) return false;
      const saleDate = new Date(sale.timestamp);
      if (period === 'today') {
        return saleDate.toDateString() === now.toDateString();
      } else {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
    });

    const totalRevenue = salesToReport.reduce((acc, s) => acc + s.total, 0);
    const totalInvoices = salesToReport.length;
    const totalItemsSold = salesToReport.reduce((acc, s) => acc + (s.items || []).reduce((iAcc, i) => iAcc + i.quantity, 0), 0);
    const totalDiscounts = salesToReport.reduce((acc, s) => acc + (s.discount || 0), 0);

    const cashSales = salesToReport.filter(s => s.paymentMethod === 'cash').reduce((acc, s) => acc + s.total, 0);
    const cardSales = salesToReport.filter(s => s.paymentMethod === 'card').reduce((acc, s) => acc + s.total, 0);
    const nfcSales = salesToReport.filter(s => s.paymentMethod === 'nfc').reduce((acc, s) => acc + s.total, 0);
    const debtSales = salesToReport.filter(s => s.paymentMethod === 'debt').reduce((acc, s) => acc + s.total, 0);

    // Group top 10 products
    const productMap: Record<string, { name: string; qty: number; total: number }> = {};
    salesToReport.forEach(s => {
      (s.items || []).forEach(item => {
        const pName = item.productNameAr || item.productName;
        if (!productMap[pName]) {
          productMap[pName] = { name: pName, qty: 0, total: 0 };
        }
        productMap[pName].qty += item.quantity;
        productMap[pName].total += item.total;
      });
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.total - a.total).slice(0, 10);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const productRows = topProducts.map((p, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold; padding: 6px;">${idx + 1}</td>
        <td style="padding: 6px; font-weight: bold;">${p.name}</td>
        <td style="text-align: center; padding: 6px;">${p.qty}</td>
        <td style="text-align: right; font-weight: bold; padding: 6px;">${currency}${formatNumber(p.total)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>${periodLabel} - ${storeName}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              direction: rtl;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #0284c7;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .store-title { font-size: 22px; font-weight: 900; color: #0f172a; }
            .report-title { font-size: 16px; font-weight: 800; color: #0284c7; margin-top: 4px; }
            .meta-box { font-size: 11px; color: #475569; text-align: left; }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 20px;
            }
            .kpi-card {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px;
              text-align: center;
            }
            .kpi-label { font-size: 10px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
            .kpi-val { font-size: 16px; font-weight: 900; color: #0284c7; }
            .section-title { font-size: 14px; font-weight: 800; color: #0f172a; border-right: 4px solid #0284c7; padding-right: 8px; margin: 20px 0 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
            th { background: #0284c7; color: #ffffff; padding: 6px; text-align: right; }
            td { border-bottom: 1px solid #e2e8f0; padding: 6px; }
            .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="store-title">${storeName}</div>
              <div class="report-title">📊 ${periodLabel}</div>
            </div>
            <div class="meta-box">
              <div><strong>تاريخ التصدير:</strong> ${new Date().toLocaleString('ar-SA')}</div>
              <div><strong>الفترة:</strong> ${period === 'today' ? 'اليوم' : 'الشهر الحالي (' + (now.getMonth() + 1) + '/' + now.getFullYear() + ')'}</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">إجمالي المبيعات الصافية</div>
              <div class="kpi-val">${currency}${formatNumber(totalRevenue)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">عدد الفواتير الصادرة</div>
              <div class="kpi-val">${totalInvoices}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">إجمالي القطع المباعة</div>
              <div class="kpi-val">${totalItemsSold}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">إجمالي الخصومات</div>
              <div class="kpi-val" style="color:#e11d48;">-${currency}${formatNumber(totalDiscounts)}</div>
            </div>
          </div>

          <div class="section-title">تفاصيل قنوات الدفع والصندوق</div>
          <table>
            <thead>
              <tr>
                <th>طريقة الدفع</th>
                <th>المبلغ المستلم</th>
                <th>النسبة من الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>💵 المبيعات النقدية (كاش)</td>
                <td><strong>${currency}${formatNumber(cashSales)}</strong></td>
                <td>${totalRevenue > 0 ? ((cashSales / totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td>💳 بطاقات الائتمان / مدى</td>
                <td><strong>${currency}${formatNumber(cardSales)}</strong></td>
                <td>${totalRevenue > 0 ? ((cardSales / totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td>📲 الدفع السريع NFC</td>
                <td><strong>${currency}${formatNumber(nfcSales)}</strong></td>
                <td>${totalRevenue > 0 ? ((nfcSales / totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td>📋 الآجل / الديون</td>
                <td><strong>${currency}${formatNumber(debtSales)}</strong></td>
                <td>${totalRevenue > 0 ? ((debtSales / totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">الأصناف والمواد الأكثر مبيعاً (${topProducts.length})</div>
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">#</th>
                <th>اسم المادة</th>
                <th style="text-align: center;">الكمية المباعة</th>
                <th style="text-align: right;">إجمالي الإيراد</th>
              </tr>
            </thead>
            <tbody>
              ${productRows || '<tr><td colspan="4" style="text-align:center;">لا توجد مبيعات مسجلة لهذه الفترة</td></tr>'}
            </tbody>
          </table>

          <div class="footer-sig">
            <div>توقيع مسؤول الصندوق / الكاشير: ........................</div>
            <div>ختم وتوقيع المدير العام: ........................</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ----------------------------------------------------
  // CASHIER SHIFT REPORT PDF EXPORTER (تصدير تقرير الوردية PDF)
  // ----------------------------------------------------
  const handleExportShiftPdf = (cashierTargetName?: string) => {
    const cashierName = cashierTargetName || (selectedCashier !== 'all' ? selectedCashier : 'الكاشير الحالي');
    const storeName = settings.storeNameAr || settings.storeName || 'صيدلية وماركيت المتقدم';
    const currency = settings.currencySymbol || 'د.ع';

    // Filter sales for this cashier/shift
    const shiftSales = filteredSales.filter(s => {
      if (cashierTargetName || selectedCashier !== 'all') {
        const target = (cashierTargetName || selectedCashier).trim().toLowerCase();
        return s.cashierName && s.cashierName.trim().toLowerCase().includes(target);
      }
      return true;
    });

    let grossSales = 0;
    let totalDiscounts = 0;
    let cashSales = 0;
    let cardSales = 0;
    let debtSales = 0;
    let totalRefunds = 0;
    let refundedCount = 0;

    shiftSales.forEach(s => {
      const isRefunded = s.status === 'refunded';
      const tot = s.total || 0;
      const sub = s.subtotal || tot;
      const disc = s.discount || 0;

      if (isRefunded) {
        totalRefunds += tot;
        refundedCount += 1;
      } else {
        grossSales += sub;
        totalDiscounts += disc;
        if (s.paymentMethod === 'cash') {
          cashSales += tot;
        } else if (s.paymentMethod === 'card' || s.paymentMethod === 'nfc') {
          cardSales += tot;
        } else if (s.paymentMethod === 'debt') {
          debtSales += tot;
        }
      }
    });

    const netSales = grossSales - totalDiscounts - totalRefunds;
    const initialFloat = 250.00;
    const expectedDrawerCash = initialFloat + cashSales - totalRefunds;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>تقرير الوردية - ${cashierName}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              direction: rtl;
            }
            .header-banner {
              background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
              color: white;
              padding: 20px;
              border-radius: 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
            }
            .store-name { font-size: 22px; font-weight: 900; }
            .shift-badge { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-top: 6px; display: inline-block; }
            .meta-info { font-size: 11px; line-height: 1.6; text-align: left; }
            .section-card {
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              padding: 16px;
              margin-bottom: 16px;
              background: #f8fafc;
            }
            .section-title {
              font-size: 15px;
              font-weight: 800;
              color: #0369a1;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 8px;
              margin-bottom: 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
            .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .stat-box {
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
            }
            .stat-label { font-size: 11px; color: #64748b; font-weight: 600; }
            .stat-value { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px; }
            .stat-value.green { color: #16a34a; }
            .stat-value.red { color: #dc2626; }
            .stat-value.blue { color: #0284c7; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { background: #0f172a; color: white; padding: 8px; text-align: right; font-weight: 700; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px; }
            .highlight-row { background: #f0fdf4; font-weight: 700; }
            .footer-signatures {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              font-weight: 700;
              color: #334155;
              border-top: 2px dashed #cbd5e1;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <div class="store-name">${storeName}</div>
              <div style="font-size: 16px; font-weight: 800; opacity: 0.9;">📋 تقرير تسوية الوردية (Shift Report)</div>
              <div class="shift-badge">الكاشير: ${cashierName}</div>
            </div>
            <div class="meta-info">
              <div><strong>تاريخ التقرير:</strong> ${new Date().toLocaleString('ar-EG')}</div>
              <div><strong>النطاق الزمني:</strong> ${useCustomDateTime ? `${startDate} ${startTime} - ${endDate} ${endTime}` : dateFilter === 'three_months' ? 'آخر 3 أشهر' : dateFilter === 'year' ? 'سنة كاملة / هذا العام' : dateFilter === 'today' ? 'اليوم' : dateFilter === 'week' ? 'هذا الأسبوع' : dateFilter === 'month' ? 'هذا الشهر' : 'الكل (كافة الفترات)'}</div>
              <div><strong>عدد الفواتير الصادرة:</strong> ${shiftSales.length} فاتورة (${refundedCount} مرتجع)</div>
            </div>
          </div>

          <!-- 1. ملخص المبيعات والمرتجع -->
          <div class="section-card">
            <div class="section-title">
              <span>📊 1. ملخص المبيعات والمرتجعات خلال الوردية</span>
              <span style="font-size: 12px; color: #64748b;">(Shift Sales & Returns Summary)</span>
            </div>
            <div class="grid-3">
              <div class="stat-box">
                <div class="stat-label">إجمالي المبيعات (Gross Sales)</div>
                <div class="stat-value blue">${currency} ${grossSales.toLocaleString('en-US')}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">إجمالي المرتجعات (Returns)</div>
                <div class="stat-value red">-${currency} ${totalRefunds.toLocaleString('en-US')}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">صافي المبيعات النهائي (Net Sales)</div>
                <div class="stat-value green">${currency} ${netSales.toLocaleString('en-US')}</div>
              </div>
            </div>
          </div>

          <!-- 2. تفاصيل حركة الدرج والصندوق -->
          <div class="section-card">
            <div class="section-title">
              <span>💵 2. حركة الدرج والصندوق (Cash Drawer Flow)</span>
              <span style="font-size: 12px; color: #64748b;">(Cash Balance & Drawer Verification)</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>البند / البيان</th>
                  <th style="text-align: center;">النوع</th>
                  <th style="text-align: left;">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>الرصيد الافتتاحي للدرج (Initial Cash Float)</strong></td>
                  <td style="text-align: center;"><span style="color: #0284c7;">ثابت افتتاحي</span></td>
                  <td style="text-align: left; font-weight: 700; font-family: monospace;">${currency} ${formatNumber(initialFloat)}</td>
                </tr>
                <tr>
                  <td><strong>المبيعات النقدية المستلمة (Cash Collected)</strong></td>
                  <td style="text-align: center;"><span style="color: #16a34a;">+ مقبوضات نقدية</span></td>
                  <td style="text-align: left; font-weight: 700; font-family: monospace; color: #16a34a;">+ ${currency} ${cashSales.toLocaleString('en-US')}</td>
                </tr>
                <tr>
                  <td><strong>المرتجعات النقدية المدفوعة (Cash Refunds Paid)</strong></td>
                  <td style="text-align: center;"><span style="color: #dc2626;">- مدفوعات مرجعة</span></td>
                  <td style="text-align: left; font-weight: 700; font-family: monospace; color: #dc2626;">- ${currency} ${totalRefunds.toLocaleString('en-US')}</td>
                </tr>
                <tr class="highlight-row">
                  <td><strong>إجمالي النقد المتوقع وجوده في الدرج (Expected Drawer Cash)</strong></td>
                  <td style="text-align: center;"><strong>المجموع النهائي</strong></td>
                  <td style="text-align: left; font-weight: 900; font-family: monospace; font-size: 14px; color: #15803d;">${currency} ${expectedDrawerCash.toLocaleString('en-US')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 3. قنوات الدفع الأخرى -->
          <div class="section-card">
            <div class="section-title">
              <span>💳 3. المبيعات عبر البطاقات والآجل (Non-Cash Payments)</span>
            </div>
            <div class="grid-2">
              <div class="stat-box">
                <div class="stat-label">مبيعات البطاقات والشبكة (POS Card/NFC)</div>
                <div class="stat-value">${currency} ${cardSales.toLocaleString('en-US')}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">المبيعات الآجلة / الديون (Credit Sales)</div>
                <div class="stat-value">${currency} ${debtSales.toLocaleString('en-US')}</div>
              </div>
            </div>
          </div>

          <!-- 4. قائمة جميع وصلات وفواتير الكاشير -->
          <div class="section-card">
            <div class="section-title">
              <span>🧾 4. جميع وصلات وفواتير الكاشير المباعة (${shiftSales.length})</span>
              <span style="font-size: 12px; color: #dc2626; font-weight: bold;">(الوصلات المسترجعة باللون الأحمر)</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>رقم الوصل</th>
                  <th>الوقت</th>
                  <th>طريقة الدفع</th>
                  <th>المبلغ الإجمالي</th>
                  <th style="text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${shiftSales.length === 0 ? '<tr><td colspan="5" style="text-align:center;">لا توجد وصلات مسجلة لهذه الوردية</td></tr>' : shiftSales.map(tx => {
                  const isRefunded = tx.status === 'refunded';
                  const rowStyle = isRefunded ? 'background-color: #fee2e2; color: #991b1b; font-weight: bold;' : 'color: #0f172a;';
                  const statusBadge = isRefunded 
                    ? '<span style="background: #dc2626; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">🔴 وصل مسترجع / Refunded</span>' 
                    : '<span style="background: #16a34a; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">🟢 مباع / Completed</span>';
                  return `
                    <tr style="${rowStyle}">
                      <td style="font-family: monospace; font-weight: bold;">#${tx.invoiceNumber}</td>
                      <td>${new Date(tx.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>${tx.paymentMethod === 'cash' ? 'نقد (Cash)' : tx.paymentMethod === 'card' ? 'بطاقة (Card)' : tx.paymentMethod === 'debt' ? 'آجل (Debt)' : tx.paymentMethod}</td>
                      <td style="font-family: monospace; font-weight: bold;">${currency} ${(tx.total || 0).toLocaleString('en-US')}</td>
                      <td style="text-align: center;">${statusBadge}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer-signatures">
            <div>
              <p>توقيع الكاشير مسلّم الوردية:</p>
              <p style="margin-top: 30px;">..........................................</p>
            </div>
            <div>
              <p>توقيع المشرف / مدير الصندوق:</p>
              <p style="margin-top: 30px;">..........................................</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ----------------------------------------------------
  // EXPORT TO CSV HANDLER
  // ----------------------------------------------------
  const handleExportCSV = () => {
    let csvData = `Report,Value\n`;
    csvData += `Total Gross Sales,${financialMetrics.grossSales}\n`;
    csvData += `Total Discounts,${financialMetrics.totalDiscounts}\n`;
    csvData += `Net Sales,${financialMetrics.netSales}\n`;
    csvData += `COGS,${financialMetrics.cogs}\n`;
    csvData += `Gross Profit,${financialMetrics.grossProfit}\n`;
    csvData += `Total Operating Expenses,${financialMetrics.totalOperatingExpenses}\n`;
    if (opExpenseItems.length > 0) {
      opExpenseItems.forEach((item, idx) => {
        csvData += `Expense #${idx + 1}: ${item.name} [${item.category}],${item.amount}\n`;
      });
    }
    csvData += `Net Operating Profit,${financialMetrics.netOperatingProfit}\n`;

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `POS_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----------------------------------------------------
  // CATEGORIES DEFINITION FOR NAVIGATION WITH ICONS
  // ----------------------------------------------------
  const categoriesConfig = [
    {
      id: 'financial' as MainReportCategory,
      titleAr: '1. الحركة المالية والمبيعات والمرجوعات',
      titleKu: '١. جووڵەی دارایی و فرۆشتن و گەڕێنراوەکان',
      titleEn: '1. Financial, Sales & Returns',
      icon: DollarSign,
      subTabs: [
        { id: 'comprehensive_financial', labelAr: 'التقرير المالي الشامل (P&L)', labelKu: 'ڕاپۆرتی دارایی گشتگیر (P&L)', labelEn: 'Comprehensive Financial (P&L)', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/10' },
        { id: 'sales_report', labelAr: 'تقارير المبيعات التفصيلية', labelKu: 'ڕاپۆرتی وردی فرۆشتن', labelEn: 'Detailed Sales Report', icon: ShoppingCart, color: 'text-cyan-400 bg-cyan-500/10' },
        { id: 'returns_report', labelAr: 'تقارير المرجوعات والمرتجعات', labelKu: 'ڕاپۆرتی کاڵا گەڕێنراوەکان', labelEn: 'Returns & Refunds Report', icon: RotateCcw, color: 'text-rose-400 bg-rose-500/10' },
        { id: 'cashier_accounts', labelAr: 'تقارير حسابات ومبيعات الكاشيرية', labelKu: 'کەشف حیسابی کاشێرەکان', labelEn: 'Cashier Accounts & Sales', icon: UserCheck, color: 'text-purple-400 bg-purple-500/10' },
        { id: 'payment_cashflow', labelAr: 'تفصيل وسائل الدفع والسيولة', labelKu: 'وردەکاری ڕێگاکانی دانی پارە و نەقدی', labelEn: 'Payment & Cashflow', icon: Wallet, color: 'text-blue-400 bg-blue-500/10' },
        { id: 'period_comparison', labelAr: 'مقارنة الفترات والاتجاهات', labelKu: 'بەراوردی ماوەکان و ڕەوتەکان', labelEn: 'Period & Trends Comparison', icon: CalendarRange, color: 'text-amber-400 bg-amber-500/10' }
      ]
    },
    {
      id: 'inventory' as MainReportCategory,
      titleAr: '2. المخزون والمواد المتلفة والهالك',
      titleKu: '٢. کۆگا و کاڵای تێکچوو و زەرەر',
      titleEn: '2. Inventory & Damaged Stock',
      icon: Package,
      subTabs: [
        { id: 'inventory_audit_reports', labelAr: 'تقارير وسجلات جرد المخزون الفعلي', labelKu: 'ڕاپۆرت و تۆمارەکانی جردی کۆگا', labelEn: 'Physical Inventory Audit Reports', icon: ClipboardCheck, color: 'text-amber-400 bg-amber-500/10' },
        { id: 'stock_valuation', labelAr: 'جرد وتقييم المخزون ( بسعر البيع والشراء )', labelKu: 'جرد و هەڵسەنگاندنی کۆگا (بە نرخی تاک و تێچوو)', labelEn: 'Stock Valuation', icon: Boxes, color: 'text-cyan-400 bg-cyan-500/10' },
        { id: 'item_turnover', labelAr: 'حركة ودوران البضائع (الأكثر/الأقل/الراكد)', labelKu: 'جووڵە و خولانەوەی کاڵاکان (پڕفرۆش/کەمفرۆش/مەند)', labelEn: 'Item Turnover', icon: RefreshCw, color: 'text-emerald-400 bg-emerald-500/10' },
        { id: 'wastage_damage', labelAr: 'تقارير المواد المتلفة والهالك والتسويات', labelKu: 'ڕاپۆرتی کاڵای تێکچوو و زەرەر', labelEn: 'Damaged & Spoiled Stock', icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10' },
        { id: 'proactive_alerts', labelAr: 'التنبيهات المتقدمة وحد إعادة الطلب', labelKu: 'ئاگاداری پێشکەوتوو و بەسەرچوون', labelEn: 'Proactive Reorder & Expiry', icon: Clock, color: 'text-rose-400 bg-rose-500/10' }
      ]
    },
    {
      id: 'suppliers' as MainReportCategory,
      titleAr: '3. تقارير الشراء والموردين',
      titleKu: '٣. ڕاپۆرتی کڕین و دابینکەران',
      titleEn: '3. Purchases & Supplier Reports',
      icon: Truck,
      subTabs: [
        { id: 'purchases_report', labelAr: 'تقارير الشراء وفواتير المشتريات', labelKu: 'ڕاپۆرتی کڕین و پسوڵەکان', labelEn: 'Purchases & Invoices Report', icon: Receipt, color: 'text-blue-400 bg-blue-500/10' },
        { id: 'supplier_ledgers', labelAr: 'كشف حساب وحركة الموردين', labelKu: 'کەشف حیساب و جووڵەی دابینکەران', labelEn: 'Supplier Ledgers & Debts', icon: BookOpen, color: 'text-purple-400 bg-purple-500/10' },
        { id: 'purchase_price_history', labelAr: 'تاريخ وتغير أسعار الشراء', labelKu: 'مێژوو و گۆڕانکاری نرخەکانی کڕین', labelEn: 'Purchase Price History', icon: History, color: 'text-amber-400 bg-amber-500/10' }
      ]
    },
    {
      id: 'customers' as MainReportCategory,
      titleAr: '4. العملاء والديون والولاء',
      titleKu: '٤. کڕیاران و قەرز و دڵسۆزی',
      titleEn: '4. Customers & Credit',
      icon: Users,
      subTabs: [
        { id: 'customer_receivables', labelAr: 'الذمم المدينة وأعمار الديون', labelKu: 'قەرزەکان و تەمەنی قەرزەکانی کڕیار', labelEn: 'Customer Credit & Debt Aging', icon: Coins, color: 'text-rose-400 bg-rose-500/10' },
        { id: 'loyalty_behavior', labelAr: 'نقاط الولاء وقائمة الزبائن المميزين', labelKu: 'خاڵەکانی دڵسۆزی و کڕیارە تایبەتەکان', labelEn: 'Loyalty & VIP Customers', icon: Star, color: 'text-amber-400 bg-amber-500/10' }
      ]
    },
    {
      id: 'security' as MainReportCategory,
      titleAr: '5. التدقيق الأمني ومنع الاختلاس',
      titleKu: '٥. پشکنینی ئاسایش و ڕێگریکردن لە دزی',
      titleEn: '5. Audit & Anti-Fraud',
      icon: ShieldAlert,
      subTabs: [
        { id: 'shift_closure', labelAr: 'إغلاق الورديات (Z-Report)', labelKu: 'داخستنی نۆبەت (Z-Report)', labelEn: 'Shift Closure Z-Report', icon: Lock, color: 'text-emerald-400 bg-emerald-500/10' },
        { id: 'security_audit_log', labelAr: 'سجل العمليات المشبوهة والإلغاءات', labelKu: 'تۆماری کردارە گوماناوییەکان و هەڵوەشاندنەوەکان', labelEn: 'Security Audit Log', icon: ShieldCheck, color: 'text-rose-400 bg-rose-500/10' }
      ]
    },
    {
      id: 'operational' as MainReportCategory,
      titleAr: '6. التحليلات السلوكية والتشغيلية',
      titleKu: '٦. شیکاری کارکردن و بەکارهێنان',
      titleEn: '6. Operational Analytics',
      icon: BarChart3,
      subTabs: [
        { id: 'cashier_accounts', labelAr: 'حسابات ومبيعات الكاشيرية (مع الوقت)', labelKu: 'ئەژماری کاشێرەکان بە پێی بەروار و کات', labelEn: 'Cashier Accounts (Date & Time)', icon: Users, color: 'text-purple-400 bg-purple-500/10' },
        { id: 'peak_hours', labelAr: 'تحليل ساعات الذروة (24 ساعة)', labelKu: 'شیکاری کاتەکانی قەرەباڵغی (٢٤ کاتژمێر)', labelEn: '24h Peak Hours Analysis', icon: Flame, color: 'text-amber-400 bg-amber-500/10' },
        { id: 'basket_analysis', labelAr: 'تحليل حجم وسلة الشراء', labelKu: 'شیکاری قەبارەی سەبەتەی کڕین', labelEn: 'Basket Size & Cross-Selling', icon: ShoppingBag, color: 'text-cyan-400 bg-cyan-500/10' },
        { id: 'cashier_performance', labelAr: 'تقرير أداء وسرعة الكاشيرية', labelKu: 'ڕاپۆرتی کارکردن و خێرایی کاشێرەکان', labelEn: 'Cashier Speed & Errors', icon: Gauge, color: 'text-emerald-400 bg-emerald-500/10' }
      ]
    }
  ];

  const activeCategoryObj = categoriesConfig.find(c => c.id === activeCategory) || categoriesConfig[0];
  const activeSubTabObj = categoriesConfig.flatMap(c => c.subTabs).find(s => s.id === activeSubTab) || activeCategoryObj.subTabs[0];

  return (
    <div className="w-full">
      {isCashierAccountsOnly ? (
        <div className={`space-y-4 pb-12 animate-fadeIn w-full ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
        {/* COMPACT CASHIER ACCOUNTS HEADER WITH DROPDOWN CALENDAR & EXPORT CONTROLS */}
        <div className={`cyber-card p-2.5 sm:p-3.5 border rounded-2xl relative overflow-hidden shadow-md ${
          isLight 
            ? 'bg-gradient-to-r from-slate-50 via-teal-50 to-emerald-50 border-emerald-300 text-slate-900' 
            : 'bg-gradient-to-r from-[#0B1A1E] via-[#0D242B] to-[#0A1020] border-emerald-500/30 text-slate-100'
        }`}>
          <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            {/* Title & Badge */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-md shadow-emerald-500/20 shrink-0">
                <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className={`text-base sm:text-lg font-black tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {t('كشف حسابات الكاشيرية 👤', 'کەشفی حیسابات و تسویەی کاشێرەکان 👤', 'Cashier Accounts 👤')}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 text-[10px] font-bold shrink-0">
                    {t('حسابات الكاشير', 'حیساباتی کاشێر', 'Cashier View')}
                  </span>
                </div>
                <p className={`text-[11px] mt-0.5 truncate ${isLight ? 'text-slate-600 font-medium' : 'text-slate-300'}`}>
                  {useCustomDateTime ? (
                    <span className="text-cyan-300 font-mono font-bold">
                      {t(`من ${formatDisplayDate(startDate, lang)} إلى ${formatDisplayDate(endDate, lang)}`, `لە ${formatDisplayDate(startDate, lang)} بۆ ${formatDisplayDate(endDate, lang)}`, `From ${formatDisplayDate(startDate, lang)} to ${formatDisplayDate(endDate, lang)}`)}
                      {startTime || endTime ? ` (${startTime || '00:00'} - ${endTime || '23:59'})` : ''}
                    </span>
                  ) : dateFilter === 'today' ? (
                    <span className="text-emerald-300 font-bold">{t('مبيعات اليوم فقط 📅', 'فرۆشتنی ئەمڕۆ 📅', 'Today\'s Sales 📅')}</span>
                  ) : dateFilter === 'week' ? (
                    <span className="text-cyan-300 font-bold">{t('مبيعات الأسبوع الحالي 🗓️', 'فرۆشتنی ئەم حەفتەیە 🗓️', 'This Week 🗓️')}</span>
                  ) : dateFilter === 'month' ? (
                    <span className="text-purple-300 font-bold">{t('مبيعات الشهر الحالي 🗓️', 'فرۆشتنی ئەم مانگە 🗓️', 'This Month 🗓️')}</span>
                  ) : dateFilter === 'three_months' ? (
                    <span className="text-amber-300 font-bold">{t('مبيعات آخر 3 أشهر 🗓️', 'فرۆشتنی ٣ مانگی ڕابردوو 🗓️', 'Last 3 Months 🗓️')}</span>
                  ) : dateFilter === 'year' ? (
                    <span className="text-blue-300 font-bold">{t('مبيعات هذا العام / سنة 🗓️', 'فرۆشتنی ئەمساڵ / ساڵێک 🗓️', 'This Year / 1 Year 🗓️')}</span>
                  ) : (
                    <span className="text-slate-300 font-bold">{t('جميع التواريخ والأوقات 🌐', 'هەموو بەروارەکان 🌐', 'All Dates 🌐')}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Filter Dropdown & Export Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Period Dropdown Select */}
              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-cyan-400 absolute right-2.5 pointer-events-none z-10" />
                <select
                  value={useCustomDateTime ? 'custom' : dateFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setUseCustomDateTime(true);
                    } else {
                      setUseCustomDateTime(false);
                      setDateFilter(val as any);
                    }
                  }}
                  className="bg-slate-900/90 text-cyan-300 font-bold text-xs pr-8 pl-2.5 py-1.5 rounded-xl border border-cyan-500/40 shadow-sm focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none transition-all hover:border-cyan-400"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">{t('الكل 🌐', 'هەمووی 🌐', 'All 🌐')}</option>
                  <option value="today" className="bg-slate-900 text-slate-200">{t('اليوم 📅', 'ئەمڕۆ 📅', 'Today 📅')}</option>
                  <option value="week" className="bg-slate-900 text-slate-200">{t('هذا الأسبوع 🗓️', 'ئەم حەفتەیە 🗓️', 'This Week 🗓️')}</option>
                  <option value="month" className="bg-slate-900 text-slate-200">{t('هذا الشهر 🗓️', 'ئەم مانگە 🗓️', 'This Month 🗓️')}</option>
                  <option value="three_months" className="bg-slate-900 text-slate-200">{t('ثلاثة أشهر 🗓️', 'سێ مانگ (٣ مانگ) 🗓️', '3 Months 🗓️')}</option>
                  <option value="year" className="bg-slate-900 text-slate-200">{t('سنة كاملة / هذا العام 🗓️', 'ساڵێک / ئەمساڵ 🗓️', '1 Year / This Year 🗓️')}</option>
                  <option value="custom" className="bg-slate-900 text-cyan-300 font-bold">{t('تحديد بالتقويم 🗓️', 'دیاریکردن بە ڕۆژژمێر 🗓️', 'Custom Calendar 🗓️')}</option>
                </select>
              </div>

              {/* PDF & Print Buttons */}
              <button
                onClick={() => handleExportShiftPdf()}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer transition-all active:scale-95 border border-emerald-400/40"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-200" />
                <span>{t('تصدير وردية PDF', 'ڕاپۆرتی نۆبەت PDF', 'Export Shift PDF')}</span>
              </button>

              <button
                onClick={() => setShowPrintModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer transition-all active:scale-95 border border-blue-400/40"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('طباعة بيان', 'چاپکردن', 'Print')}</span>
              </button>

              {/* Exit to Main Dashboard Button */}
              {onBackToDashboard && (
                <button
                  onClick={() => {
                    onToggleFullscreen?.(false);
                    onBackToDashboard();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-900/40 hover:brightness-110 cursor-pointer transition-all active:scale-95 border border-rose-400/50 ring-2 ring-rose-500/20"
                  title={t('الخروج والعودة للواجهة الرئيسية', 'دەرچوون و گەڕانەوە بۆ سەرەکی', 'Exit & Return to Main')}
                >
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  <span>{t('الخروج للرئيسية 🚪', 'دەرچوون 🚪', 'Exit 🚪')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Custom Date & Time Picker inputs row if calendar option selected */}
          {useCustomDateTime && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fadeIn text-xs bg-[#050A15]/80 p-2 sm:p-2.5 rounded-xl border border-cyan-500/30">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-300 block">{t('من تاريخ (يوم / شهر / سنة):', 'لە بەرواری (ڕۆژ / مانگ / ساڵ):', 'From Date (DD/MM/YYYY):')}</label>
                <DatePickerDDMMYYYY
                  value={startDate}
                  onChange={(dStr) => {
                    setStartDate(dStr);
                    setUseCustomDateTime(true);
                  }}
                  lang={lang}
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-300 block">{t('إلى تاريخ (يوم / شهر / سنة):', 'بۆ بەرواری (ڕۆژ / مانگ / ساڵ):', 'To Date (DD/MM/YYYY):')}</label>
                <DatePickerDDMMYYYY
                  value={endDate}
                  onChange={(dStr) => {
                    setEndDate(dStr);
                    setUseCustomDateTime(true);
                  }}
                  lang={lang}
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-300 block">{t('من/إلى وقت:', 'کاتی:', 'Time Range:')}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-lg px-1.5 py-1 text-white font-mono text-[11px] focus:border-cyan-400 focus:outline-none text-center"
                  />
                  <span className="text-slate-500 text-xs font-bold">-</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-[#0B132B] border border-slate-700 rounded-lg px-1.5 py-1 text-white font-mono text-[11px] focus:border-cyan-400 focus:outline-none text-center"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setUseCustomDateTime(false);
                    setDateFilter('all');
                    setStartDate(todayDateStr);
                    setEndDate(todayDateStr);
                  }}
                  className="w-full py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer text-center"
                >
                  {t('إعادة ضبط 🔄', 'ڕێکخستنەوە 🔄', 'Reset 🔄')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* OVERALL CASHIERS SUMMARY BANNER */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <div className="p-3 rounded-2xl bg-[#090E1A] border border-emerald-500/40 space-y-1">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{t('مجموع البيع النقد (الكل)', 'کۆی فرۆشتنی نەقد (هەمووی)', 'Total Cash Revenue')}</p>
            <p className="text-sm sm:text-base font-black text-emerald-300 font-mono text-center">
              {currency} {cashierAccountsData.reduce((acc, c) => acc + c.cashSales, 0).toLocaleString('en-US')}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#090E1A] border border-rose-500/40 space-y-1">
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">{t('مجموع المرجع (الكل)', 'کۆی گەڕێنراوەکان (هەمووی)', 'Total Refunds')}</p>
            <p className="text-sm sm:text-base font-black text-rose-300 font-mono text-center">
              {currency} {cashierAccountsData.reduce((acc, c) => acc + c.refunds, 0).toLocaleString('en-US')}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#090E1A] border border-cyan-500/40 space-y-1">
            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t('صافي المبيعات (الكل)', 'پاکی فرۆشتن (هەمووی)', 'Total Net Sales')}</p>
            <p className="text-sm sm:text-base font-black text-cyan-300 font-mono text-center">
              {currency} {cashierAccountsData.reduce((acc, c) => acc + c.netSales, 0).toLocaleString('en-US')}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#090E1A] border border-amber-500/40 space-y-1">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{t('مجموع كل المبيعات', 'کۆی سەرجەمی فرۆشتن', 'Total All Sales')}</p>
            <p className="text-sm sm:text-base font-black text-amber-300 font-mono text-center">
              {currency} {cashierAccountsData.reduce((acc, c) => acc + c.grossSales, 0).toLocaleString('en-US')}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#090E1A] border border-purple-500/40 space-y-1 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">{t('أرباح المبيعات (الكل)', 'قازانجی فرۆشتن (هەمووی)', 'Total Sales Profit')}</p>
            <p className="text-sm sm:text-base font-black text-purple-300 font-mono text-center">
              {currency} {cashierAccountsData.reduce((acc, c) => acc + c.profit, 0).toLocaleString('en-US')}
            </p>
          </div>
        </div>

        {/* Header bar for cashier accounts section */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 pb-1 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white">
              {t('حسابات الكاشير والمستخدمين المسجلة', 'ئەژمارەکانی کاشێر', 'Registered Cashier Accounts')}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
              {cashierAccountsData.length} {t('حسابات', 'ئەژمار', 'accounts')}
            </span>
          </div>

          {onOpenAccountsModal && (
            <button
              onClick={onOpenAccountsModal}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{t('عرض كشف كافة الحسابات 👤', 'پشاندانی هەموو ئەژمارەکان', 'View All Accounts List')}</span>
            </button>
          )}
        </div>

        {/* GRID OF COMPACT CASHIER ACCOUNTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {cashierAccountsData.map((c) => {
            const isExpanded = expandedCashierInvoices === c.cashierName;
            const activeDrawerFilter = cashierDrawerFilter[c.cashierName] || 'all';

            const openWithFilter = (mode: 'all' | 'cash' | 'refunds' | 'net' | 'profit' | 'sold_items' | 'returned_items') => {
              setExpandedCashierInvoices(c.cashierName);
              setCashierDrawerFilter(prev => ({ ...prev, [c.cashierName]: mode }));
            };

            // Calculate aggregated sold items for this cashier
            const soldItemsMap: { [productId: string]: { name: string; quantity: number; totalRevenue: number; totalProfit: number } } = {};
            const returnedItemsMap: { [productId: string]: { name: string; quantity: number; totalRefunded: number; invoiceNo: string; timestamp: string } } = {};

            c.transactions.forEach(tx => {
              if (tx.status === 'refunded') {
                if (Array.isArray(tx.items)) {
                  tx.items.forEach(it => {
                    const id = it.productId || it.productName;
                    if (!returnedItemsMap[id]) {
                      returnedItemsMap[id] = { name: it.productNameAr || it.productName, quantity: 0, totalRefunded: 0, invoiceNo: tx.invoiceNumber, timestamp: tx.timestamp };
                    }
                    returnedItemsMap[id].quantity += it.quantity;
                    returnedItemsMap[id].totalRefunded += (it.total || (it.price * it.quantity));
                  });
                }
              } else {
                if (Array.isArray(tx.items)) {
                  tx.items.forEach(it => {
                    const id = it.productId || it.productName;
                    const prod = products.find(p => p.id === it.productId);
                    const itemProfit = getItemTotalProfit(it, prod);

                    if (!soldItemsMap[id]) {
                      soldItemsMap[id] = { name: it.productNameAr || it.productName, quantity: 0, totalRevenue: 0, totalProfit: 0 };
                    }
                    soldItemsMap[id].quantity += it.quantity;
                    soldItemsMap[id].totalRevenue += (it.total || (it.price * it.quantity));
                    soldItemsMap[id].totalProfit += itemProfit;
                  });
                }
              }
            });

            const soldItemsList = Object.values(soldItemsMap);
            const returnedItemsList = Object.values(returnedItemsMap);

            // Filter transactions for receipt list view
            let filteredTransactions = c.transactions;
            if (activeDrawerFilter === 'cash') {
              filteredTransactions = c.transactions.filter(t => t.paymentMethod === 'cash' && t.status !== 'refunded');
            } else if (activeDrawerFilter === 'refunds' || activeDrawerFilter === 'returned_items') {
              filteredTransactions = c.transactions.filter(t => t.status === 'refunded');
            } else if (activeDrawerFilter === 'net' || activeDrawerFilter === 'profit' || activeDrawerFilter === 'sold_items') {
              filteredTransactions = c.transactions.filter(t => t.status !== 'refunded');
            }

            return (
              <div
                key={c.cashierName}
                className="cyber-card p-2.5 rounded-xl bg-[#0A0F1D] border border-cyan-500/30 hover:border-cyan-400/60 transition-all space-y-2 shadow-md relative overflow-hidden"
              >
                {/* Top Header Box for Cashier Name */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black shadow-sm">
                      <UserCheck className="w-3.5 h-3.5 text-slate-950" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-white tracking-wide truncate max-w-[120px]">
                        {t(`حساب ${c.cashierName}`, `ئەژماری ${c.cashierName}`, `Account: ${c.cashierName}`)}
                      </h2>
                      <p className="text-[9px] text-slate-400 font-mono">
                        {c.invoiceCount} {t('فواتير صادر', 'پسوڵە', 'invoices')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCashierPrintModalData(c)}
                      className="px-1.5 py-0.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-500 text-cyan-200 border border-cyan-500/40 text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                      title={t('طباعة كشف حساب هذا الكاشير', 'چاپکردنی کەشف حیساب', 'Print Cashier Statement')}
                    >
                      <Printer className="w-3 h-3 text-cyan-300" />
                      <span>{t('طباعة', 'چاپ', 'Print')}</span>
                    </button>
                    <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-bold shrink-0">
                      {c.invoiceCount > 0 ? t('نشط', 'چالاک', 'Active') : t('بدون مبيعات', 'بێ فرۆشتن', 'No Sales')}
                    </span>
                  </div>
                </div>

                {/* 5 INTERACTIVE METRIC BUTTON FIELDS */}
                <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                  {/* 1. بيع نقد (Cash Sales Button) */}
                  <button
                    onClick={() => openWithFilter('cash')}
                    className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-95 text-right ${
                      isExpanded && activeDrawerFilter === 'cash'
                        ? 'bg-emerald-900/80 border-emerald-400 ring-2 ring-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)] text-white'
                        : 'bg-emerald-950/40 border-emerald-500/30 hover:bg-emerald-900/50'
                    }`}
                    title={t('اضغط لفتح ورؤية وصلات البيع النقدية', 'بینینی فرۆشتنی نەقد', 'Click to open cash sales receipts')}
                  >
                    <span className="text-[9px] font-bold text-emerald-400 font-sans flex items-center gap-1">
                      <span>{t('بيع نقد', 'نەقد', 'Cash')}</span>
                      <span className="text-[8px] opacity-90">🔍</span>
                    </span>
                    <span className="font-bold text-emerald-300 text-[10px]">
                      {currency} {c.cashSales.toLocaleString('en-US')}
                    </span>
                  </button>

                  {/* 2. مرجوع (Refunds / Returns Button) */}
                  <button
                    onClick={() => openWithFilter('returned_items')}
                    className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-95 text-right ${
                      isExpanded && (activeDrawerFilter === 'refunds' || activeDrawerFilter === 'returned_items')
                        ? 'bg-rose-900/80 border-rose-400 ring-2 ring-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] text-white'
                        : 'bg-rose-950/40 border-rose-500/30 hover:bg-rose-900/50'
                    }`}
                    title={t('اضغط لفتح ورؤية المواد والوصلات المرجوعة', 'بینینی کاڵا گەڕێنراوەکان', 'Click to open returns & refunded receipts')}
                  >
                    <span className="text-[9px] font-bold text-rose-400 font-sans flex items-center gap-1">
                      <span>{t('مرجوع', 'گەڕێنراوە', 'Refund')}</span>
                      <span className="text-[8px] opacity-90">🔍</span>
                    </span>
                    <span className="font-bold text-rose-300 text-[10px]">
                      {currency} {c.refunds.toLocaleString('en-US')}
                    </span>
                  </button>

                  {/* 3. صافي المبيعات (Net Sales Button) */}
                  <button
                    onClick={() => openWithFilter('net')}
                    className={`p-1.5 rounded-lg border flex items-center justify-between col-span-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 text-right ${
                      isExpanded && activeDrawerFilter === 'net'
                        ? 'bg-cyan-900/80 border-cyan-300 ring-2 ring-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)] text-white'
                        : 'bg-cyan-950/50 border-cyan-500/40 hover:bg-cyan-900/50 bg-gradient-to-r from-cyan-950/60 to-blue-950/60'
                    }`}
                    title={t('اضغط لفتح ورؤية وصلات صافي المبيعات النافذة', 'بینینی پاکی فرۆشتن', 'Click to open net sales receipts')}
                  >
                    <span className="text-[10px] font-bold text-cyan-300 font-sans flex items-center gap-1">
                      <span>{t('صافي المبيعات', 'پاکی فرۆشتن', 'Net Sales')}</span>
                      <span className="text-[8px] opacity-90">🔍</span>
                    </span>
                    <span className="text-xs font-black text-cyan-200">
                      {currency} {c.netSales.toLocaleString('en-US')}
                    </span>
                  </button>

                  {/* 4. مجموع كل المبيعات (Total All Sales Button) */}
                  <button
                    onClick={() => openWithFilter('all')}
                    className={`p-1.5 rounded-lg border flex items-center justify-between col-span-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 text-right ${
                      isExpanded && activeDrawerFilter === 'all'
                        ? 'bg-amber-900/80 border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.3)] text-white'
                        : 'bg-amber-950/40 border-amber-500/30 hover:bg-amber-900/50'
                    }`}
                    title={t('اضغط لفتح ورؤية كافة الوصلات الصادرة', 'بینینی هەموو پسوڵەکان', 'Click to open all issued receipts')}
                  >
                    <span className="text-[9px] font-bold text-amber-400 font-sans flex items-center gap-1">
                      <span>{t('مجموع كل المبيعات', 'کۆی گشتی', 'Total Sales')}</span>
                      <span className="text-[8px] opacity-90">🔍</span>
                    </span>
                    <span className="font-bold text-amber-300 text-[10px]">
                      {currency} {c.grossSales.toLocaleString('en-US')}
                    </span>
                  </button>

                  {/* 5. أرباح المبيعات (Sales Profit Button) */}
                  <button
                    onClick={() => openWithFilter('sold_items')}
                    className={`p-1.5 rounded-lg border flex items-center justify-between col-span-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 text-right ${
                      isExpanded && (activeDrawerFilter === 'profit' || activeDrawerFilter === 'sold_items')
                        ? 'bg-purple-900/80 border-purple-300 ring-2 ring-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.3)] text-white'
                        : 'bg-purple-950/50 border-purple-500/40 hover:bg-purple-900/50 bg-gradient-to-r from-purple-950/60 to-indigo-950/60'
                    }`}
                    title={t('اضغط لفتح ورؤية المواد المباعة وتفاصيل الأرباح', 'بینینی کاڵا فرۆشراوەکان و قازانج', 'Click to view sold materials & net profits')}
                  >
                    <span className="text-[10px] font-bold text-purple-300 font-sans flex items-center gap-1">
                      <span>💰 {t('أرباح المبيعات', 'قازانجی فرۆشتن', 'Sales Profit')}</span>
                      <span className="text-[8px] opacity-90">🔍</span>
                    </span>
                    <span className="text-xs font-black text-purple-200">
                      {currency} {c.profit.toLocaleString('en-US')}
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => setExpandedCashierInvoices(isExpanded ? null : c.cashierName)}
                  className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-700 w-full"
                >
                  <span>{isExpanded ? t('إخفاء التفاصيل ✕', 'شاردنەوە ✕', 'Hide Details ✕') : t('فتح كافة الوصلات والمواد 📋', 'کردنەوەی هەموو پسوڵەکان 📋', 'Open Invoices & Items 📋')}</span>
                </button>

                {/* Drawer: Filtered Invoices & Sold / Returned Materials */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-800 space-y-2 animate-fadeIn bg-[#050914] p-2 rounded-xl border border-indigo-500/20">
                    {/* Quick View Tabs Bar */}
                    <div className="flex flex-wrap items-center gap-1 bg-[#090F20] p-1 rounded-xl border border-slate-800 font-sans text-[9px]">
                      <button
                        onClick={() => openWithFilter('all')}
                        className={`px-1.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                          activeDrawerFilter === 'all'
                            ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t('كل الوصلات', 'هەموو پسوڵەکان', 'All Receipts')}
                      </button>

                      <button
                        onClick={() => openWithFilter('cash')}
                        className={`px-1.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                          activeDrawerFilter === 'cash'
                            ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t('نقد', 'نەقد', 'Cash')}
                      </button>

                      <button
                        onClick={() => openWithFilter('sold_items')}
                        className={`px-1.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                          activeDrawerFilter === 'sold_items' || activeDrawerFilter === 'profit'
                            ? 'bg-purple-500 text-slate-950 shadow-sm font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🛒 {t('مواد تم بيعها', 'کاڵای فرۆشراو', 'Sold Items')}
                      </button>

                      <button
                        onClick={() => openWithFilter('returned_items')}
                        className={`px-1.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                          activeDrawerFilter === 'returned_items' || activeDrawerFilter === 'refunds'
                            ? 'bg-rose-500 text-slate-950 shadow-sm font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🔄 {t('مواد مرجوعة', 'کاڵای گەڕێنراوە', 'Returned Items')}
                      </button>
                    </div>

                    {/* VIEW 1: SOLD ITEMS (مواد تم بيعها وأرباحها) */}
                    {(activeDrawerFilter === 'sold_items' || activeDrawerFilter === 'profit') && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-purple-300 p-1 bg-purple-950/40 rounded-lg border border-purple-500/30">
                          <span>🛒 {t(`المواد المباعة (${soldItemsList.length}):`, `کاڵا فرۆشراوەکان (${soldItemsList.length}):`, `Sold Items (${soldItemsList.length}):`)}</span>
                          <span className="text-[10px] text-purple-200 font-mono font-bold">{t('صافي الربح:', 'قازانج:', 'Profit:')} {currency} {Math.round(c.profit).toLocaleString('en-US')}</span>
                        </div>
                        {soldItemsList.length === 0 ? (
                          <p className="text-[10px] text-slate-500 py-2 text-center">{t('لا توجد مواد مباعة لهذا الكاشير', 'هیچ کاڵایەک نەفڕۆشراوە', 'No sold items')}</p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1 text-[10px] custom-scrollbar pr-0.5">
                            {soldItemsList.map((item, idx) => (
                              <div key={idx} className="p-1.5 rounded-lg bg-[#070C18] border border-purple-500/20 flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-slate-100 font-sans truncate max-w-[130px]">{item.name}</p>
                                  <p className="text-[9px] text-slate-400 font-mono">{t('الكمية المباعة:', 'بڕ:', 'Qty:')} <strong className="text-purple-300 font-bold">{item.quantity}</strong></p>
                                </div>
                                <div className="text-right font-mono">
                                  <p className="font-bold text-emerald-400 text-[10px]">{currency} {item.totalRevenue.toLocaleString('en-US')}</p>
                                  <p className="text-[9px] text-purple-300 font-bold">{t('ربح:', 'قازانج:', 'Profit:')} {currency} {Math.round(item.totalProfit).toLocaleString('en-US')}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* VIEW 2: RETURNED ITEMS (مواد مرجوعة ووصلات المرجوع) */}
                    {(activeDrawerFilter === 'returned_items' || activeDrawerFilter === 'refunds') && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-rose-300 p-1 bg-rose-950/40 rounded-lg border border-rose-500/30">
                          <span>🔄 {t(`المواد المرجوعة والراجع (${returnedItemsList.length}):`, `کاڵا گەڕێنراوەکان (${returnedItemsList.length}):`, `Returned Items (${returnedItemsList.length}):`)}</span>
                          <span className="text-[10px] text-rose-300 font-mono font-bold">-{currency} {c.refunds.toLocaleString('en-US')}</span>
                        </div>

                        {returnedItemsList.length === 0 && filteredTransactions.length === 0 ? (
                          <p className="text-[10px] text-slate-500 py-2 text-center">{t('لا توجد مواد أو وصلات مرجوعة لهذا الحساب', 'هیچ کاڵایەک نەگەڕێنراوەتەوە', 'No returned items or receipts')}</p>
                        ) : (
                          <>
                            {returnedItemsList.length > 0 && (
                              <div className="max-h-36 overflow-y-auto space-y-1 text-[10px] custom-scrollbar pr-0.5">
                                {returnedItemsList.map((item, idx) => (
                                  <div key={idx} className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-500/40 flex items-center justify-between">
                                    <div>
                                      <p className="font-bold text-rose-100 font-sans truncate max-w-[130px]">{item.name}</p>
                                      <p className="text-[9px] text-rose-300/80 font-mono">
                                        {t('الكمية المرجعة:', 'بڕی گەڕێنراوە:', 'Returned Qty:')} <strong>{item.quantity}</strong> • #{item.invoiceNo}
                                      </p>
                                    </div>
                                    <div className="text-right font-mono">
                                      <p className="font-bold text-rose-300 text-[10px]">-{currency} {item.totalRefunded.toLocaleString('en-US')}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {filteredTransactions.length > 0 && (
                              <div className="space-y-1 pt-1 border-t border-rose-900/40">
                                <p className="text-[9px] font-bold text-rose-300">{t('فواتير ووصلات المرجوع المعتمدة:', 'پسوڵە گەڕێنراوەکان:', 'Refunded Receipts:')}</p>
                                <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5 text-[10px] custom-scrollbar">
                                  {filteredTransactions.map((tx) => (
                                    <div key={tx.id} className="p-1.5 rounded-xl border border-rose-500/50 bg-rose-950/70 text-rose-100 flex items-center justify-between">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <p className="font-mono font-bold text-rose-200">#{tx.invoiceNumber}</p>
                                          <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[8px] font-sans font-black">
                                            {t('مرتجع 🔴', 'گەڕێنراوە 🔴', 'Refunded 🔴')}
                                          </span>
                                        </div>
                                        <p className="text-[9px] font-mono text-rose-300/80">
                                          {formatDisplayTime(tx.timestamp, lang)}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-rose-300 text-xs font-mono">-{currency} {tx.total.toLocaleString('en-US')}</p>
                                        <button
                                          onClick={() => {
                                            setSelectedInvoice(tx);
                                            onViewReceipt?.(tx);
                                          }}
                                          className="py-1 px-2 rounded-lg bg-rose-600/40 hover:bg-rose-500 text-white border border-rose-400 text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                                          title={t('فتح معاينة الوصل والمرجوع', 'کردنەوەی پسوڵە', 'Open Refund Receipt')}
                                        >
                                          <Eye className="w-3 h-3 text-white" />
                                          <span>{t('معاينة الوصل', 'کردنەوە', 'View')}</span>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* VIEW 3: INVOICES & RECEIPTS LIST FOR CASH, NET, ALL */}
                    {(activeDrawerFilter === 'all' || activeDrawerFilter === 'cash' || activeDrawerFilter === 'net') && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold p-1 rounded-lg border bg-[#070C18]"
                          style={{
                            borderColor: activeDrawerFilter === 'cash' ? 'rgba(16,185,129,0.3)' : activeDrawerFilter === 'net' ? 'rgba(6,182,212,0.3)' : 'rgba(245,158,11,0.3)'
                          }}
                        >
                          <span className="text-slate-200">
                            {activeDrawerFilter === 'cash' && `💵 ${t('وصلات المبيعات النقدية:', 'پسوڵەکانی نەقد:', 'Cash Receipts:')}`}
                            {activeDrawerFilter === 'net' && `💙 ${t('وصلات صافي المبيعات النافذة:', 'پاکی فرۆشتن:', 'Net Receipts:')}`}
                            {activeDrawerFilter === 'all' && `📊 ${t('كافة الوصلات والفواتير الصادرة:', 'هەموو پسوڵەکان:', 'All Receipts:')}`}
                            {' '}({filteredTransactions.length})
                          </span>
                          <span className="font-mono font-bold text-cyan-300">
                            {activeDrawerFilter === 'cash' && `${currency} ${c.cashSales.toLocaleString('en-US')}`}
                            {activeDrawerFilter === 'net' && `${currency} ${c.netSales.toLocaleString('en-US')}`}
                            {activeDrawerFilter === 'all' && `${currency} ${c.grossSales.toLocaleString('en-US')}`}
                          </span>
                        </div>
                        {filteredTransactions.length === 0 ? (
                          <p className="text-[10px] text-slate-500 py-2 text-center">{t('لا توجد فواتير مطابقة', 'هیچ پسوڵەیەک نەدۆزرایەوە', 'No matching invoices')}</p>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5 text-[10px] custom-scrollbar">
                            {filteredTransactions.map((tx) => {
                              const isRefunded = tx.status === 'refunded';
                              return (
                                <div 
                                  key={tx.id} 
                                  className={`p-1.5 rounded-xl border flex items-center justify-between transition-all ${
                                    isRefunded 
                                      ? 'bg-rose-950/90 border-2 border-rose-500 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.35)] font-bold' 
                                      : 'bg-[#070C18] border-slate-800 text-slate-200 hover:border-slate-700'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className={`font-mono font-bold ${isRefunded ? 'text-rose-200' : 'text-cyan-300'}`}>
                                        #{tx.invoiceNumber}
                                      </p>
                                      {isRefunded && (
                                        <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[8px] font-sans font-black uppercase tracking-wider animate-pulse">
                                          {t('مرتجع 🔴', 'گەڕێنراوە 🔴', 'Refunded 🔴')}
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-[9px] font-mono ${isRefunded ? 'text-rose-300/80' : 'text-slate-400'}`}>
                                      {formatDisplayTime(tx.timestamp, lang)} • {tx.paymentMethod === 'cash' ? t('نقد', 'نەقد', 'Cash') : tx.paymentMethod}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right rtl:text-left font-mono">
                                      <p className={`font-bold ${isRefunded ? 'text-rose-300 text-xs line-through' : 'text-emerald-400 text-xs'}`}>
                                        {currency} {tx.total.toLocaleString('en-US')}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setSelectedInvoice(tx);
                                        onViewReceipt?.(tx);
                                      }}
                                      className="py-1 px-2 rounded-lg bg-cyan-600/30 hover:bg-cyan-500 text-cyan-200 border border-cyan-500/40 text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                                      title={t('فتح معاينة الوصل والفاتورة الكاملة', 'کردنەوەی پسوڵە', 'Open Receipt Details')}
                                    >
                                      <Eye className="w-3 h-3 text-cyan-300" />
                                      <span>{t('فتح الوصل', 'کردنەوە', 'Open')}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      ) : !isDetailOpen ? (
        <div className={`space-y-6 pb-12 animate-fadeIn w-full ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
        {/* ======================================================== */}
        {/* TOP HEADER BANNER (REPORTS HUB) */}
        {/* ======================================================== */}
        <div className={`cyber-card p-5 sm:p-6 border rounded-3xl relative overflow-hidden shadow-xl ${
          isLight 
            ? 'bg-gradient-to-r from-slate-50 via-teal-50 to-cyan-50 border-slate-300 text-slate-900' 
            : 'bg-gradient-to-r from-[#0B152A] via-[#0F1C38] to-[#0A1020] border-cyan-500/30 text-slate-100'
        }`}>
          <div className="absolute top-0 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5 rtl:space-x-reverse min-w-0">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/30 shrink-0">
                <FileText className="w-8 h-8" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className={`text-xl sm:text-2xl font-black tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {t('الموسوعة الشاملة لتقارير وإحصائيات الماركيت', 'ئینسایکلۆپیدیای گشتگیری ڕاپۆرتەکانی مارکێت', 'Market Reports Hub')}
                  </h1>
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40 text-xs font-black shrink-0">
                    {t('مركز التحليلات - 6 أقسام رئيسية', 'ناوەندی ٦ بەشی سەرەکی', '6 Core Modules')}
                  </span>
                </div>
                <p className={`text-xs sm:text-sm mt-1.5 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-300'}`}>
                  {t('اضغط على أي قسم أدناه للدخول إلى الواجهة التفصيلية للتقرير بكامل الشاشة (بدون قائمة جانبية)',
                     'کلیک لەسەر هەر بەشێکی خوارەوە بکە بۆ چوونەنێو واجەی تەواوی ڕاپۆرتەکە (بێ پێڕستی لایەنی)',
                     'Click any module below to launch its dedicated full-screen report workspace')}
                </p>
              </div>
            </div>

            {/* Shift & Quick Export Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleExportShiftPdf()}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:brightness-110 cursor-pointer transition-all active:scale-95 border border-emerald-400/50"
              >
                <FileText className="w-4 h-4 text-emerald-200" />
                <span>{t('تصدير تقرير الوردية PDF 📋', 'ڕاپۆرتی نۆبەت PDF 📋', 'Export Shift PDF')}</span>
              </button>

              <button
                onClick={() => handleExportPdfSummary('today')}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer transition-all active:scale-95 border border-rose-400/40"
              >
                <FileText className="w-4 h-4 text-rose-200" />
                <span>{t('PDF اليوم 📄', 'PDF ئەمڕۆ 📄', 'Today PDF')}</span>
              </button>

              <button
                onClick={() => handleExportPdfSummary('month')}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer transition-all active:scale-95 border border-purple-400/40"
              >
                <FileText className="w-4 h-4 text-purple-200" />
                <span>{t('PDF الشهر 📄', 'PDF ئەم مانگە 📄', 'Month PDF')}</span>
              </button>

              <button
                onClick={() => setShowPrintModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>{t('طباعة بيان رسمية', 'چاپکردن', 'Print Statement')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TODAY'S RETURNS FINANCIAL SUMMARY CARD */}
        {/* ======================================================== */}
        <div 
          onClick={() => setShowTodayReturnsModal(true)}
          className={`p-5 rounded-3xl border cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden group ${
            isLight
              ? 'bg-gradient-to-r from-rose-50 via-amber-50 to-white border-rose-200 hover:border-rose-400 text-slate-900 shadow-md'
              : 'bg-gradient-to-r from-[#1E0E18] via-[#1A0B14] to-[#0D1527] border-rose-500/40 hover:border-rose-400 text-white shadow-xl'
          }`}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 text-white shadow-lg shadow-rose-500/30 shrink-0 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-7 h-7 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-wide">
                    {t('الملخص المالي لإجمالي مرتجعات اليوم 🔄', 'کورتەی دارایی سەرجەمی کاڵا گەڕێنراوەکانی ئەمڕۆ 🔄', 'Today\'s Total Returns Financial Summary 🔄')}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 text-[10px] font-extrabold">
                    {t('خصم تلقائي من الصندوق 💰', 'داشکاندنی ڕاستەوخۆ لە سندوق 💰', 'Deducted from Cash 💰')}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  {t('إجمالي مبالغ المواد والفواتير المرجعة التي تمت اليوم مع إمكانية عرض القائمة التفصيلية وطباعة الوصل', 'کۆی بەهای دارایی کاڵا گەڕێنراوەکانی ئەمڕۆ بە وردەکارییەوە', 'Total refunded value and item return list for today with print capabilities')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-rose-500/20">
              <div className="text-right rtl:text-right text-left">
                <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 block uppercase tracking-wider">
                  {t('إجمالي مبلغ المرتجعات اليوم', 'کۆی بەهای گەڕێنراوەکانی ئەمڕۆ', 'Total Refund Value Today')}
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-300">
                  {currency} {todayReturnsSummary.totalAmount.toLocaleString('en-US')}
                </span>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  {todayReturnsSummary.count} {t('فاتورة', 'پسوڵە', 'invoices')} | {todayReturnsSummary.totalItemsCount} {t('قطعة مرجعة للمخزن', 'کاڵای گەڕێنراوە بۆ کۆگا', 'returned items')}
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md group-hover:scale-105 transition-all shrink-0">
                <Eye className="w-3.5 h-3.5" />
                <span>{t('عرض التفاصيل ↗', 'بینینی وردەکاری ↗', 'View Details ↗')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ======================================================== */}
        {/* 6 MAIN CATEGORY HUB LAUNCH CARDS (Compact List View with Icons) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoriesConfig.map((cat) => {
            const IconComp = cat.icon;
            return (
              <div
                key={cat.id}
                className={`p-4 rounded-2xl border text-right rtl:text-right text-left flex flex-col justify-between transition-all duration-200 ${
                  isLight 
                    ? 'bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:border-cyan-400' 
                    : 'bg-gradient-to-b from-[#0C152B] via-[#091022] to-[#060B18] border-slate-800 hover:border-cyan-500/60 shadow-md shadow-black/40'
                }`}
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-blue-600 text-white shadow-sm shadow-cyan-500/20 shrink-0">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {isKu ? cat.titleKu : (isAr ? cat.titleAr : cat.titleEn)}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                      {cat.subTabs.length}
                    </span>
                  </div>

                  {/* Sub-report list view: compact list buttons with icons */}
                  <div className="space-y-1">
                    {cat.subTabs.map((sub: any) => {
                      const SubIcon = sub.icon || ArrowUpRight;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setActiveCategory(cat.id);
                            setActiveSubTab(sub.id);
                            setIsDetailOpen(true);
                            onToggleFullscreen?.(true);
                          }}
                          className={`w-full text-right rtl:text-right text-left flex items-center justify-between py-1.5 px-2.5 rounded-lg border transition-all cursor-pointer group/btn ${
                            isLight
                              ? 'bg-slate-50/80 hover:bg-cyan-50 border-slate-200/80 hover:border-cyan-400 text-slate-700 hover:text-cyan-950'
                              : 'bg-[#080E1C]/80 hover:bg-cyan-950/40 border-slate-800/60 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`p-1 rounded-md shrink-0 transition-transform group-hover/btn:scale-110 ${sub.color || 'text-cyan-400 bg-cyan-500/10'}`}>
                              <SubIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-medium truncate">
                              {isKu ? sub.labelKu : (isAr ? sub.labelAr : sub.labelEn)}
                            </span>
                          </div>
                          <div className="text-slate-400 group-hover/btn:text-cyan-400 rtl:rotate-0 rotate-90 shrink-0 transition-transform group-hover/btn:translate-x-0.5">
                            <ArrowUpRight className="w-3 h-3" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setActiveSubTab(cat.subTabs[0].id);
                      setIsDetailOpen(true);
                      onToggleFullscreen?.(true);
                    }}
                    className={`w-full py-1.5 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                      isLight 
                        ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200' 
                        : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    <span>{t('فتح جميع تقارير هذا القسم ↗', 'کردنەوەی هەموو ڕاپۆرتەکان ↗', 'Open Section Reports ↗')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      ) : (
        <div className={`space-y-4 pb-12 animate-fadeIn w-full ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
      
      {/* ======================================================== */}
      {/* FULLSCREEN VIEW HEADER WITH BACK BUTTON */}
      {/* ======================================================== */}
      <div className={`cyber-card p-4 sm:p-5 border rounded-2xl relative overflow-hidden shadow-lg ${
        isLight 
          ? 'bg-gradient-to-r from-slate-50 via-teal-50 to-cyan-50 border-slate-300 text-slate-900' 
          : 'bg-gradient-to-r from-[#0B152A] via-[#0F1C38] to-[#0A1020] border-cyan-500/30 text-slate-100'
      }`}>
        <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* BACK TO HUB BUTTON */}
            <button
              onClick={() => {
                setIsDetailOpen(false);
                onToggleFullscreen?.(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs flex items-center gap-2 shadow-xl cursor-pointer transition-all active:scale-95 border border-cyan-400/40 shrink-0"
              title={t('الرجوع إلى القائمة الرئيسية للتقارير', 'گەڕانەوە بۆ ناوەندی ڕاپۆرتەکان', 'Back to Reports Hub')}
            >
              <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180 text-cyan-200" />
              <span>{t('الرجوع للتقارير 🏠', 'گەڕانەوە بۆ ڕاپۆرتەکان 🏠', 'Back to Hub 🏠')}</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <span>{isKu ? activeCategoryObj.titleKu : (isAr ? activeCategoryObj.titleAr : activeCategoryObj.titleEn)}</span>
                  <span>›</span>
                </div>
                <h1 className={`text-base sm:text-lg font-black tracking-wide truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {isKu ? activeSubTabObj.labelKu : (isAr ? activeSubTabObj.labelAr : activeSubTabObj.labelEn)}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40 text-[10px] font-bold shrink-0">
                  {t('تفاصيل التقرير المختار', 'وردەکاری ڕاپۆرت', 'Active Report View')}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons & Date Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center rounded-xl border p-1 ${isLight ? 'bg-white border-slate-300' : 'bg-[#070D1C] border-slate-700/80'}`}>
              <button
                onClick={() => {
                  setUseCustomDateTime(false);
                  setDateFilter('all');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  !useCustomDateTime && dateFilter === 'all' 
                    ? (isLight ? 'bg-cyan-600 text-white shadow' : 'bg-cyan-500 text-slate-950 shadow') 
                    : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
                }`}
              >
                {t('الكل', 'هەمووي', 'All')}
              </button>
              <button
                onClick={() => {
                  setUseCustomDateTime(false);
                  setDateFilter('today');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  !useCustomDateTime && dateFilter === 'today' 
                    ? (isLight ? 'bg-cyan-600 text-white shadow' : 'bg-cyan-500 text-slate-950 shadow') 
                    : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
                }`}
              >
                {t('اليوم', 'ئەمڕۆ', 'Today')}
              </button>
              <button
                onClick={() => {
                  setUseCustomDateTime(false);
                  setDateFilter('week');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  !useCustomDateTime && dateFilter === 'week' 
                    ? (isLight ? 'bg-cyan-600 text-white shadow' : 'bg-cyan-500 text-slate-950 shadow') 
                    : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
                }`}
              >
                {t('هذا الأسبوع', 'ئەم هەفتەیە', 'This Week')}
              </button>
              <button
                onClick={() => {
                  setUseCustomDateTime(false);
                  setDateFilter('month');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  !useCustomDateTime && dateFilter === 'month' 
                    ? (isLight ? 'bg-cyan-600 text-white shadow' : 'bg-cyan-500 text-slate-950 shadow') 
                    : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
                }`}
              >
                {t('هذا الشهر', 'ئەم مانگە', 'This Month')}
              </button>
              <button
                onClick={() => {
                  setUseCustomDateTime(false);
                  setDateFilter('three_months');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  !useCustomDateTime && dateFilter === 'three_months' 
                    ? (isLight ? 'bg-cyan-600 text-white shadow' : 'bg-cyan-500 text-slate-950 shadow') 
                    : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
                }`}
              >
                {t('3 أشهر', '٣ مانگ', '3 Months')}
              </button>
              <button
                onClick={() => {
                  setUseCustomDateTime(false);
                  setDateFilter('year');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  !useCustomDateTime && dateFilter === 'year' 
                    ? (isLight ? 'bg-cyan-600 text-white shadow' : 'bg-cyan-500 text-slate-950 shadow') 
                    : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
                }`}
              >
                {t('سنة', 'ساڵێک', '1 Year')}
              </button>
            </div>

            {/* Shift Report PDF Export Button */}
            <button
              onClick={() => handleExportShiftPdf()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg hover:brightness-110 cursor-pointer transition-all active:scale-95 border border-emerald-400/50"
              title={t('تصدير تقرير الوردية وحركة الدرج والمرتجعات بصيغة PDF', 'ڕەوانەکردنی ڕاپۆرتی نۆبەت بە PDF', 'Export Shift PDF')}
            >
              <FileText className="w-4 h-4 text-emerald-200" />
              <span>{t('تصدير تقرير الوردية PDF 📋', 'ڕاپۆرتی نۆبەت PDF 📋', 'Export Shift PDF 📋')}</span>
            </button>

            {/* PDF Summary Export Buttons */}
            <button
              onClick={() => handleExportPdfSummary('today')}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer transition-all active:scale-95 border border-rose-400/40"
              title={t('تصدير ملخص مبيعات اليوم بتنسيق PDF احترافي', 'ڕەوانەکردنی کورتەی فرۆشتنی ئەمڕۆ بە PDF', 'Export Today Sales PDF')}
            >
              <FileText className="w-4 h-4 text-rose-200" />
              <span>{t('PDF اليوم 📄', 'PDF ئەمڕۆ 📄', 'Today PDF 📄')}</span>
            </button>

            <button
              onClick={() => handleExportPdfSummary('month')}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer transition-all active:scale-95 border border-purple-400/40"
              title={t('تصدير ملخص مبيعات الشهر الحالي بتنسيق PDF احترافي', 'ڕەوانەکردنی کورتەی فرۆشتنی ئەم مانگە بە PDF', 'Export Month Sales PDF')}
            >
              <FileText className="w-4 h-4 text-purple-200" />
              <span>{t('PDF الشهر 📄', 'PDF ئەم مانگە 📄', 'Month PDF 📄')}</span>
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{t('طباعة التقرير الرسمية', 'چاپکردنی ڕاپۆرتی فەرمی', 'Print Statement')}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border ${
                isLight 
                  ? 'bg-white hover:bg-slate-100 text-cyan-700 border-slate-300 shadow-sm' 
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-500/30'
              }`}
              title={t('تصدير بيانات اكسل CSV', 'ڕەوانەکردنی ئێکسڵ CSV', 'Export Excel CSV')}
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. DYNAMIC REPORT CONTENT VIEWS */}
      {/* ======================================================== */}

      {/* ---------------------------------------------------- */}
      {/* CATEGORY 1: FINANCIAL & SALES */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'financial' && (
        <div className="space-y-4">
          
          {/* Sub-tab: Comprehensive Financial (P&L) */}
          {activeSubTab === 'comprehensive_financial' && (
            <div className="space-y-4">
              
              {/* Financial Summary Highlight Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-blue-500/30 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('المبيعات الإجمالية (Gross Sales)', 'سەرجەمی فرۆشتن (Gross Sales)', 'Gross Sales')}
                  </p>
                  <p className="text-base sm:text-lg font-black text-white font-mono text-center">
                    {currency} {financialMetrics.grossSales.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] text-slate-500 text-center">
                    {t('قبل الخصومات والمرتجعات', 'پێش داشکاندن و گەڕێنراوەکان', 'Before discounts & returns')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-emerald-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    {t('صافي المبيعات (Net Sales)', 'پاکی فرۆشتن (Net Sales)', 'Net Sales')}
                  </p>
                  <p className="text-base sm:text-lg font-black text-emerald-400 font-mono text-center">
                    {currency} {financialMetrics.netSales.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] text-slate-500 text-center">
                    {t('المبيعات الفعالية المستلمة', 'فرۆشتنی ڕاستەقینەی وەرگیراو', 'Net actual sales')}
                  </p>
                </div>

                {/* حقل الأرباح المكتسبة المحققة (غير مرتبطة بالتكاليف التشغيلية اليدوية) */}
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-teal-500/50 space-y-1 shadow-lg shadow-teal-950/20">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                      {t('الأرباح المكتسبة المحققة ✨', 'قازانجی بەدەستهاتوو ✨', 'Earned Profit ✨')}
                    </p>
                    <span className="px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 text-[9px] font-bold">
                      {t('أرباح البيع', 'قازانجی فرۆشتن', 'Earned')}
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-teal-300 font-mono text-center">
                    {currency} {financialMetrics.earnedProfit.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] text-slate-400 text-center">
                    {t('أرباح المبيعات المحققة (بدون خصم المصاريف)', 'قازانجی بەدەستهاتووی فرۆشتن بێ دەرکردنی خەرجی', 'Earned profit from sales (excl. OPEX)')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-cyan-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    {t('إجمالي الربح (Gross Profit)', 'سەرجەمی قازانج (Gross Profit)', 'Gross Profit')}
                  </p>
                  <p className="text-base sm:text-lg font-black text-cyan-300 font-mono text-center">
                    {currency} {financialMetrics.grossProfit.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] text-slate-500 text-center">
                    {t('صافي المبيعات - تكلفة البضاعة المباعة', 'پاکی فرۆشتن - تێچووی کاڵای فرۆشراو', 'Net Sales - COGS')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-amber-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    {t('صافي الربح التشغيلي', 'پاکی قازانجی کارکردن', 'Net Operating Profit')}
                  </p>
                  <p className="text-base sm:text-lg font-black text-amber-300 font-mono text-center">
                    {currency} {financialMetrics.netOperatingProfit.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] text-slate-500 text-center">
                    {t('بعد خصم المصاريف التشغيلية', 'دوای دەرکردنی تێچووەکانی کارکردن', 'After operating expenses')}
                  </p>
                </div>

                <div 
                  onClick={() => setShowTodayReturnsModal(true)}
                  className="p-3.5 rounded-2xl bg-[#1A0C18] border border-rose-500/50 hover:border-rose-400 cursor-pointer space-y-1 group transition-all"
                  title={t('اضغط لعرض القائمة التفصيلية لمرتجعات اليوم', 'داگرە بۆ بینینی هەموو گەڕێنراوەکانی ئەمڕۆ', 'Click to view today\'s detailed return list')}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                      {t('مرتجعات اليوم المالي 🔄', 'گەڕێنراوەکانی ئەمڕۆ 🔄', 'Today Returns 🔄')}
                    </p>
                    <Eye className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-base sm:text-lg font-black text-rose-300 font-mono text-center">
                    {currency} {todayReturnsSummary.totalAmount.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] text-rose-400/80 text-center font-bold">
                    {todayReturnsSummary.count} {t('عملية | إضغط للتفاصيل ↗', 'کردار | کلیک بکه ↗', 'records | Click ↗')}
                  </p>
                </div>
              </div>

              {/* Detailed Financial Breakdown Table */}
              <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-sm text-white">
                      {t('جدول حساب الأرباح والخسائر الشامل (Income Statement / P&L)', 'خشتەی حیسابی قازانج و زیانی گشتگیر (Income Statement / P&L)', 'Comprehensive P&L Statement')}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowAddExpenseModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title={t('إضافة بند تكلفة جديد يدوياً', 'زیادکردنی بڕگەی تێچووی نوێ بە دەستی', 'Add manual expense')}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{t('+ إضافة بند تكلفة', '+ زیادکردنی تێچوو', '+ Add Expense Unit')}</span>
                    </button>

                    <button
                      onClick={() => setShowAddCategoryModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title={t('إضافة نوع / تصنيف تكلفة جديد', 'زیادکردنی جۆری تێچووی نوێ', 'Add custom expense type')}
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>{t('+ نوع تكلفة جديد', '+ جۆری تێچووی نوێ', '+ Expense Type')}</span>
                    </button>

                    {opExpenseItems.length > 0 && (
                      <button
                        onClick={handleZeroAllExpenses}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title={t('تصفير مبالغ كافة التكاليف', 'سفرکردنەوەی هەموو بڕەکان', 'Zero all amounts')}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t('تصفير الكل', 'سفرکردنی هەموو', 'Zero All')}</span>
                      </button>
                    )}

                    <button
                      onClick={() => setEditingExpense(!editingExpense)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        editingExpense
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-900/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {editingExpense ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t('حفظ التعديلات', 'پاشەکەوتکردن', 'Save Changes')}</span>
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{t('تعديل المصاريف', 'دەستکاری تێچووەکان', 'Edit Expenses')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-200">
                    <thead className="bg-[#050914] text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 text-right rtl:text-right">{t('البند المالي', 'بڕگەی دارایی', 'Line Item')}</th>
                        <th className="p-2.5 text-center">{t('الوصف والتفاصيل', 'وەسف و وردەکاری', 'Details')}</th>
                        <th className="p-2.5 text-center">{t('المبلغ الإجمالي', 'کۆی گشتی بڕ', 'Total Amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      <tr>
                        <td className="p-2.5 font-bold text-white">{t('1. المبيعات الإجمالية (Gross Revenue)', '١. سەرجەمی داهاتی فرۆشتن (Gross Revenue)', '1. Gross Revenue')}</td>
                        <td className="p-2.5 text-center text-slate-400">{t('مجموع قيمة جميع الفواتير الصادرة', 'کۆی بەهای هەموو پسوڵە دەرچووەکان', 'Total sum of all issued invoices')}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-white">{currency} {financialMetrics.grossSales.toLocaleString('en-US')}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-rose-400">{t('(-) إجمالي الخصومات والتخفيضات', '(-) کۆی داشکاندنەکان', '(-) Total Discounts')}</td>
                        <td className="p-2.5 text-center text-slate-400">{t('خصومات الفواتير والأصناف والأكواد', 'داشکاندنی پسوڵە و کاڵاکان', 'Invoice & line item discounts')}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-rose-400">- {currency} {financialMetrics.totalDiscounts.toLocaleString('en-US')}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-rose-400">{t('(-) إجمالي المرتجعات والبدائل', '(-) کۆی گەڕێنراوەکان', '(-) Total Refunds & Returns')}</td>
                        <td className="p-2.5 text-center text-slate-400">{t('الفواتير والأصناف المرجعة', 'پسوڵە و کاڵا گەڕێنراوەکان', 'Refunded sales & returned items')}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-rose-400">- {currency} {financialMetrics.totalRefundsValue.toLocaleString('en-US')}</td>
                      </tr>
                      <tr className="bg-emerald-500/10 font-bold">
                        <td className="p-2.5 text-emerald-300">{t('(=) صافي المبيعات (Net Sales)', '(=) پاکی فرۆشتن (Net Sales)', '(=) Net Sales')}</td>
                        <td className="p-2.5 text-center text-emerald-400">{t('المبيعات الإجمالية - الخصومات - المرتجعات', 'سەرجەمی فرۆشتن - داشکاندنەکان - گەڕێنراوەکان', 'Gross Sales - Discounts - Refunds')}</td>
                        <td className="p-2.5 text-center font-mono text-emerald-400 text-sm">{currency} {financialMetrics.netSales.toLocaleString('en-US')}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-amber-400">{t('(-) تكلفة البضاعة المباعة (COGS)', '(-) تێچووی کاڵای فرۆشراو (COGS)', '(-) Cost of Goods Sold')}</td>
                        <td className="p-2.5 text-center text-slate-400">{t('التكلفة الأصلية للمواد التي تم بيعها فعلياً', 'تێچووی بنەڕەتی ئەو کاڵایانەی فرۆشراون', 'Total cost price of items sold')}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-amber-400">- {currency} {financialMetrics.cogs.toLocaleString('en-US')}</td>
                      </tr>
                      <tr className="bg-cyan-500/10 font-bold">
                        <td className="p-2.5 text-cyan-300">{t('(=) إجمالي هامش الربح (Gross Profit)', '(=) سەرجەمی هامشی قازانج (Gross Profit)', '(=) Gross Profit')}</td>
                        <td className="p-2.5 text-center text-cyan-400">{t('صافي المبيعات - تكلفة البضاعة المباعة', 'پاکی فرۆشتن - تێچووی کاڵای فرۆشراو', 'Net Sales - COGS')}</td>
                        <td className="p-2.5 text-center font-mono text-cyan-300 text-sm">{currency} {financialMetrics.grossProfit.toLocaleString('en-US')}</td>
                      </tr>
                      <tr className="bg-teal-500/10 font-bold border-t border-teal-500/20">
                        <td className="p-2.5 text-teal-300 flex items-center gap-1.5">
                          <span>✨</span>
                          <span>{t('(=) الأرباح المحققة المكتسبة (Earned Profit)', '(=) قازانجی بەدەستهاتووی فرۆشتن (Earned Profit)', '(=) Earned Profit')}</span>
                        </td>
                        <td className="p-2.5 text-center text-teal-400">{t('الأرباح الفعلية المكتسبة من عمليات البيع (غير مرتبطة بالمصاريف التشغيلية)', 'قازانجی فرۆشتن بەبێ بەستنەوە بە تێچووەکانی کارکردن', 'Actual earned sales profit (independent of operating expenses)')}</td>
                        <td className="p-2.5 text-center font-mono text-teal-300 text-sm">{currency} {financialMetrics.earnedProfit.toLocaleString('en-US')}</td>
                      </tr>

                      {/* Dynamic Manual Operating Expenses Block */}
                      <tr className="bg-slate-900/90 border-t-2 border-slate-700">
                        <td colSpan={3} className="p-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-amber-400" />
                              <span className="font-bold text-slate-200 text-xs">
                                {t('المصروفات والتكاليف التشغيلية اليدوية (Operating Expenses - OPEX):', 'تێچووەکانی کارکردن بە دەستی (Operating Expenses - OPEX):', 'Manual Operating Expenses (OPEX):')}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
                                {opExpenseItems.length} {t('بند', 'بڕگە', 'items')}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400">
                                {t('إجمالي التكاليف:', 'کۆی تێچووەکان:', 'Total OPEX:')}
                              </span>
                              <span className="font-mono font-bold text-amber-400 text-xs">
                                {currency} {financialMetrics.totalOperatingExpenses.toLocaleString('en-US')}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* When no operating expenses are added (Default zero state) */}
                      {opExpenseItems.length === 0 ? (
                        <tr className="bg-slate-950/40">
                          <td colSpan={3} className="p-4 text-center">
                            <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                              <p className="text-xs">
                                {t('لا توجد مصاريف أو تكاليف مسجلة حالياً (المجموع مصفّر: 0)', 'هیچ تێچوویەک تۆمار نەکراوە (کۆی گشتی سفرە: 0)', 'No expenses recorded currently (Total is 0)')}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {t('يمكنك إضافة تكاليف يدوياً واحدة بوحدة وتحديد نوعها بالضغط على زر "+ إضافة بند تكلفة"', 'دەتوانیت تێچوو زیاد بکەیت یەکە بە یەکە بە کلیک لە "+ زیادکردنی تێچوو"', 'You can add expenses one by one manually by clicking "+ Add Expense Unit"')}
                              </p>
                              <button
                                onClick={() => setShowAddExpenseModal(true)}
                                className="mt-1.5 px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{t('إضافة أول بند تكلفة الآن', 'زیادکردنی یەکەمین تێچوو', 'Add First Expense Now')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        opExpenseItems.map((item, idx) => {
                          const meta = getCategoryMeta(item.category);
                          return (
                            <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-2.5 pl-6 rtl:pr-6 rtl:pl-0 text-slate-300">
                                {editingExpense ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => handleUpdateExpenseItem(item.id, 'name', e.target.value)}
                                      placeholder={t('اسم التكلفة', 'ناوی تێچوو', 'Expense name')}
                                      className="bg-slate-900 text-white font-bold py-1 px-2 rounded border border-slate-700 text-xs w-44"
                                    />
                                    <select
                                      value={item.category}
                                      onChange={(e) => handleUpdateExpenseItem(item.id, 'category', e.target.value)}
                                      className="bg-slate-900 text-cyan-300 font-medium py-1 px-2 rounded border border-slate-700 text-xs"
                                    >
                                      {DEFAULT_EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                          {cat.icon} {isKu ? cat.labelKu : (isAr ? cat.labelAr : cat.labelEn)}
                                        </option>
                                      ))}
                                      {customExpenseTypes.map(cName => (
                                        <option key={cName} value={cName}>
                                          🏷️ {cName}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span>•</span>
                                    <span className="text-base">{meta.icon}</span>
                                    <span className="font-medium text-slate-200">{item.name}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300 border border-slate-700/60 font-sans">
                                      {meta.label}
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="p-2.5 text-center">
                                {editingExpense ? (
                                  <input
                                    type="text"
                                    value={item.note || ''}
                                    onChange={(e) => handleUpdateExpenseItem(item.id, 'note', e.target.value)}
                                    placeholder={t('ملاحظات وتفاصيل...', 'تێبینی...', 'Notes...')}
                                    className="w-full max-w-xs bg-slate-900 text-slate-300 py-1 px-2 rounded border border-slate-700 text-xs text-center"
                                  />
                                ) : (
                                  <span className="text-slate-400">{item.note || meta.label}</span>
                                )}
                              </td>

                              <td className="p-2.5 text-center">
                                {editingExpense ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.amount}
                                      onChange={(e) => handleUpdateExpenseItem(item.id, 'amount', Math.max(0, Number(e.target.value)))}
                                      className="w-28 bg-slate-900 text-center font-mono font-bold py-1 px-2 rounded border border-slate-700 text-xs text-amber-300"
                                    />
                                    <button
                                      onClick={() => handleDeleteExpenseItem(item.id)}
                                      className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 cursor-pointer transition-colors"
                                      title={t('حذف هذا البند', 'سڕینەوەی ئەم بڕگەیە', 'Delete item')}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-mono text-slate-300 font-bold">
                                    {currency} {item.amount.toLocaleString('en-US')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}

                      {/* Subtotal OPEX row */}
                      {opExpenseItems.length > 0 && (
                        <tr className="bg-slate-900/60 font-bold border-t border-slate-800">
                          <td className="p-2.5 pl-6 rtl:pr-6 rtl:pl-0 text-amber-400">
                            {t('(-) مجموع المصاريف التشغيلية (Total OPEX)', '(-) کۆی تێچووەکانی کارکردن (Total OPEX)', '(-) Total OPEX')}
                          </td>
                          <td className="p-2.5 text-center text-slate-400">
                            {t('مجموع كافة بنود التكاليف المضافة يدوياً', 'کۆی گشتی هەموو بڕگە دەستییەکان', 'Sum of all manual expense units')}
                          </td>
                          <td className="p-2.5 text-center font-mono text-amber-400 font-bold">
                            - {currency} {financialMetrics.totalOperatingExpenses.toLocaleString('en-US')}
                          </td>
                        </tr>
                      )}

                      {/* Final Net Operating Profit Row */}
                      <tr className="bg-amber-500/20 font-black">
                        <td className="p-3 text-amber-300 text-sm">{t('(=) صافي الربح التشغيلي النهائي', '(=) پاکی قازانجی کۆتایی کارکردن', '(=) Net Operating Profit')}</td>
                        <td className="p-3 text-center text-amber-400">{t('الربح النهائي الخالص للمحل بعد خصم التكاليف', 'قازانجی پاکی کۆتایی دوکان دوای دەرکردنی تێچووەکان', 'Final net profit after expenses')}</td>
                        <td className="p-3 text-center font-mono text-amber-300 text-base">{currency} {financialMetrics.netOperatingProfit.toLocaleString('en-US')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Detailed Sales Report (تقارير المبيعات التفصيلية) */}
          {activeSubTab === 'sales_report' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Sales KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-blue-500/30 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('المبيعات الإجمالية', 'کۆی فرۆشتن', 'Gross Sales')}</p>
                  <p className="text-base sm:text-lg font-black text-white font-mono text-center">
                    {currency} {financialMetrics.grossSales.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-emerald-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">{t('صافي المبيعات', 'پاکی فرۆشتن', 'Net Sales')}</p>
                  <p className="text-base sm:text-lg font-black text-emerald-400 font-mono text-center">
                    {currency} {financialMetrics.netSales.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-rose-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">{t('إجمالي الخصومات', 'کۆی داشکاندن', 'Discounts')}</p>
                  <p className="text-base sm:text-lg font-black text-rose-300 font-mono text-center">
                    {currency} {financialMetrics.totalDiscounts.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-cyan-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">{t('عدد الفواتير المباعة', 'ژمارەی پسوڵەکان', 'Invoice Count')}</p>
                  <p className="text-base sm:text-lg font-black text-cyan-300 font-mono text-center">
                    {filteredSales.filter(s => s.status !== 'refunded').length}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-purple-500/40 space-y-1 col-span-2 md:col-span-1">
                  <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">{t('متوسط قيمة الفاتورة', 'تێکڕای پسوڵە', 'Avg Invoice')}</p>
                  <p className="text-base sm:text-lg font-black text-purple-300 font-mono text-center">
                    {currency} {filteredSales.length > 0 ? Math.round(financialMetrics.netSales / Math.max(1, filteredSales.filter(s => s.status !== 'refunded').length)).toLocaleString('en-US') : 0}
                  </p>
                </div>
              </div>

              {/* Table of Sales Invoices */}
              <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-cyan-400" />
                    <span>{t('جدول تقارير المبيعات الفعالية وفواتير الشراء المباشر', 'خشتەی ڕاپۆرتی پسوڵەکانی فرۆشتن', 'Detailed Sales Invoices Statement')}</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {filteredSales.length} {t('سجل مبيعات', 'تۆماری فرۆشتن', 'sales records')}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-200">
                    <thead className="bg-[#050914] text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 text-right rtl:text-right">{t('رقم الفاتورة', 'ژمارەی پسوڵە', 'Invoice #')}</th>
                        <th className="p-2.5 text-center">{t('التاريخ والوقت', 'بەروار و کات', 'Date & Time')}</th>
                        <th className="p-2.5 text-center">{t('الكاشير البائع', 'کاشێر', 'Cashier')}</th>
                        <th className="p-2.5 text-center">{t('طريقة الدفع', 'ڕێگەی دانی پارە', 'Payment Method')}</th>
                        <th className="p-2.5 text-center">{t('عدد المواد', 'ژمارەی کاڵاکان', 'Items')}</th>
                        <th className="p-2.5 text-center">{t('الخصم', 'داشکاندن', 'Discount')}</th>
                        <th className="p-2.5 text-center">{t('الصافي المستلم', 'پاکی وەرگیراو', 'Net Total')}</th>
                        <th className="p-2.5 text-center">{t('الحالة', 'دۆخ', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredSales.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-slate-500">{t('لا توجد فواتير مبيعات مسجلة ضمن هذه الفترة', 'هیچ پسوڵەیەکی فرۆشتن تۆمار نەکراوە', 'No sales invoices recorded in this period')}</td>
                        </tr>
                      ) : (
                        filteredSales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-2.5 font-mono font-bold text-cyan-300">#{sale.invoiceNumber}</td>
                            <td className="p-2.5 text-center font-mono text-slate-400 text-[11px]">
                              {new Date(sale.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="p-2.5 text-center font-bold text-white">{sale.cashierName || 'أحمد'}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sale.paymentMethod === 'cash' ? 'bg-emerald-500/20 text-emerald-300' :
                                sale.paymentMethod === 'card' || sale.paymentMethod === 'nfc' ? 'bg-cyan-500/20 text-cyan-300' :
                                sale.paymentMethod === 'debt' ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
                              }`}>
                                {sale.paymentMethod === 'cash' ? t('نقداً', 'نەقد', 'Cash') :
                                 sale.paymentMethod === 'card' ? t('بطاقة / شبكة', 'کارت', 'Card') :
                                 sale.paymentMethod === 'debt' ? t('آجل / دين', 'قەرز', 'Debt') : sale.paymentMethod}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-300">{(sale.items || []).reduce((acc, i) => acc + i.quantity, 0)}</td>
                            <td className="p-2.5 text-center font-mono text-rose-400">{currency} {(sale.discount || 0).toLocaleString('en-US')}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-emerald-400 text-sm">{currency} {sale.total.toLocaleString('en-US')}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sale.status === 'refunded' ? 'bg-rose-500/20 text-rose-300 line-through' : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {sale.status === 'refunded' ? t('مرجوع', 'گەڕێنراوە', 'Refunded') : t('مكتمل', 'تەواو بوو', 'Completed')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Returns & Refunds Report (تقارير المرجوعات والمرتجعات) */}
          {activeSubTab === 'returns_report' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Returns KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-rose-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">{t('إجمالي مبالغ المرجوعات', 'کۆی بەهای کاڵا گەڕێنراوەکان', 'Total Refunded Value')}</p>
                  <p className="text-lg sm:text-xl font-black text-rose-300 font-mono text-center">
                    {currency} {financialMetrics.totalRefundsValue.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] text-slate-400 text-center">{t('قيمة البضائع المرجعة أو المكنسلة', 'بەهای فرۆشراوە گەڕێنراوەکان', 'Value of returned items')}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-amber-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{t('عدد الفواتير المرجعة', 'ژمارەی پسوڵە گەڕێنراوەکان', 'Returned Invoices Count')}</p>
                  <p className="text-lg sm:text-xl font-black text-amber-300 font-mono text-center">
                    {filteredSales.filter(s => s.status === 'refunded').length} <span className="text-xs font-normal text-slate-400">{t('فاتورة', 'پسوڵە', 'invoices')}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 text-center">{t('عدد عمليات الإرجاع المسجلة', 'ژمارەی کرداری گەڕاندنەوە', 'Recorded return operations')}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-cyan-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">{t('نسبة المرجوعات من المبيعات', 'ڕێژەی گەڕێنراوەکان لە فرۆشتن', 'Refund Rate %')}</p>
                  <p className="text-lg sm:text-xl font-black text-cyan-300 font-mono text-center">
                    {financialMetrics.grossSales > 0 
                      ? ((financialMetrics.totalRefundsValue / financialMetrics.grossSales) * 100).toFixed(1) 
                      : '0.0'}%
                  </p>
                  <p className="text-[10px] text-slate-400 text-center">{t('نسبة المبالغ المرتجعة مقارنة بالإجمالي', 'ڕێژەی پارەی گەڕێنراوە بەراورد بە سەرجەم', 'Percentage of gross sales')}</p>
                </div>
              </div>

              {/* ======================================================== */}
              {/* RECHARTS GRAPHICAL ANALYTICS SECTION */}
              {/* ======================================================== */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Left (2 Cols): Daily Returns vs Total Sales Composed Chart */}
                <div className="lg:col-span-2 cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-cyan-400" />
                        <span>{t('مخطط المرتجعات اليومية مقارنة بالمبيعات الكلية ونسبتها 📊', 'ڕوونکردنەوەی گەڕێنراوەکانی ئەمڕۆ بەراورد بە فرۆشتن 📊', 'Daily Returns vs Total Sales & Return Rate % 📊')}</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t('مقارنة بصرية دقيقة بين حجم المبيعات الإجمالية ومبالغ المرتجعات اليومية لمتابعة الجودة', 'بەراوردی بصری لە نێوان کۆی فرۆشتن و گەڕێنراوەکان', 'Visual comparison between gross sales and daily returns to monitor quality')}
                      </p>
                    </div>

                    {/* Timeframe Selector */}
                    <div className="flex items-center gap-1 bg-[#050914] p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setReturnsChartTimeframe('7days')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          returnsChartTimeframe === '7days' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t('7 أيام', '7 ڕۆژ', '7 Days')}
                      </button>
                      <button
                        onClick={() => setReturnsChartTimeframe('14days')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          returnsChartTimeframe === '14days' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t('14 يوماً', '14 ڕۆژ', '14 Days')}
                      </button>
                      <button
                        onClick={() => setReturnsChartTimeframe('30days')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          returnsChartTimeframe === '30days' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {t('30 يوماً', '30 ڕۆژ', '30 Days')}
                      </button>
                    </div>
                  </div>

                  {/* Period Stats Summary Bar */}
                  <div className="grid grid-cols-3 gap-2 bg-[#050914] p-2.5 rounded-xl border border-slate-800/80 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('إجمالي مبيعات الفترة', 'کۆی فرۆشتنی ماوەکە', 'Period Gross Sales')}</span>
                      <span className="text-xs font-mono font-bold text-indigo-400">{currency} {formatNumber(dailyReturnsAnalytics.periodGrossSales)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('إجمالي مرتجعات الفترة', 'کۆی گەڕێنراوەکانی ماوەکە', 'Period Returns')}</span>
                      <span className="text-xs font-mono font-bold text-rose-400">{currency} {formatNumber(dailyReturnsAnalytics.periodReturnsVal)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('معدل المرتجعات للفترة', 'ڕێژەی گەڕاندنەوەی ماوەکە', 'Period Return Rate')}</span>
                      <span className="text-xs font-mono font-black text-amber-300">{dailyReturnsAnalytics.periodReturnRate}%</span>
                    </div>
                  </div>

                  {/* Recharts Composed Chart */}
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={dailyReturnsAnalytics.chartList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
                        <XAxis dataKey="dateLabel" stroke="#64748B" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" stroke="#64748B" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" tick={{ fontSize: 10 }} unit="%" />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="p-3 bg-[#080E1E] border border-slate-700 rounded-xl shadow-2xl text-xs space-y-1.5 text-white">
                                  <p className="font-bold text-slate-300 border-b border-slate-700/80 pb-1">{d.dateLabel} ({d.rawDate})</p>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-indigo-400 font-bold">{t('المبيعات:', 'فرۆشتن:', 'Sales:')}</span>
                                    <span className="font-mono font-bold">{currency} {formatNumber(d.grossSales)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-rose-400 font-bold">{t('المرتجعات:', 'گەڕێنراوەکان:', 'Returns:')}</span>
                                    <span className="font-mono font-bold text-rose-300">{currency} {formatNumber(d.returnedAmount)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 border-t border-slate-700/80 pt-1">
                                    <span className="text-amber-400 font-bold">{t('نسبة المرتجعات:', 'ڕێژەی گەڕێنراوەکان:', 'Return Rate:')}</span>
                                    <span className="font-mono font-black text-amber-300">{d.returnRate}%</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Bar yAxisId="left" dataKey="grossSales" name={t('إجمالي المبيعات', 'کۆی فرۆشتن', 'Gross Sales')} fill="#6366F1" radius={[4, 4, 0, 0]} barSize={16} />
                        <Bar yAxisId="left" dataKey="returnedAmount" name={t('مبلغ المرتجعات', 'بڕی گەڕێنراوەکان', 'Returned Amount')} fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={16} />
                        <Line yAxisId="right" type="monotone" dataKey="returnRate" name={t('نسبة المرتجعات %', 'ڕێژەی گەڕاندنەوە %', 'Return Rate %')} stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3, fill: '#F59E0B' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right (1 Col): Product Quality Decision Matrix & Top Returned Items */}
                <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>{t('تقييم جودة المواد والمنتجات الأكثر إرجاعاً 📦', 'پشکنینی کوالیتی کاڵاکان و گەڕێنراوەکان 📦', 'Item Quality Matrix & Top Returns 📦')}</span>
                    </h3>

                    {/* Quality Decision Card */}
                    <div className="mt-3 p-3 rounded-xl bg-[#050914] border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">{t('قرار جودة المخزون والموردين:', 'بڕیاری کوالیتی کاڵا و دابینکەران:', 'Inventory Quality Advisory:')}</span>
                        {dailyReturnsAnalytics.periodReturnRate < 2 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black">
                            {t('🟢 جودة ممتازة (<2%)', '🟢 کوالیتی عالی (<2%)', '🟢 Excellent Quality (<2%)')}
                          </span>
                        ) : dailyReturnsAnalytics.periodReturnRate <= 5 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black">
                            {t('🟡 معدل طبيعي (2%-5%)', '🟡 ڕێژەی ئاسایی (2%-5%)', '🟡 Normal Rate (2%-5%)')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-black animate-pulse">
                            {t('🔴 تنبيه: مرتجعات مرتفعة (>5%)', '🔴 ئاگاداری: گەڕێنراوەی بەرز (>5%)', '🔴 High Returns (>5%)')}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {dailyReturnsAnalytics.periodReturnRate < 2
                          ? t('معدل المرتجعات منخفض جداً ومثالي، مما يدل على جودة عالية للأدوية والمكونات ورضا الزبائن التام.', 'ڕێژەی گەڕاندنەوە زۆر نزم و نایابە، نیشانەی کوالیتی بەرزی دەرمانەکانە.', 'Return rate is very low and optimal, indicating high product quality and customer satisfaction.')
                          : dailyReturnsAnalytics.periodReturnRate <= 5
                          ? t('نسبة المرتجعات ضمن الحدود التشغيلية المقبولة. يُنصح بمتابعة أسباب إرجاع المواد بانتظام.', 'ڕێژەی گەڕێنراوەکان لە ئاستی ئاساییدایە.', 'Returns rate is within acceptable operating limits. Regular checks recommended.')
                          : t('تنبيه! نسبة المرتجعات أعلى من المعدل المستهدف. يُوصى بفحص الشحنات المستلمة من الموردين وتواريخ الانتهاء وعيوب التغليف اتخاذ قرار باستبدال وجبة المادة.', 'ئاگاداری! ڕێژەی گەڕێنراوەکان بەرزە. پێویستە پێداچوونەوە بە دابینکەران و بەرواری بەسەرچوون بكرێت.', 'Warning! Return rate is high. Inspect supplier batches, expiry dates, and product defects immediately.')
                        }
                      </p>
                    </div>

                    {/* Top Returned Items Mini Bar Chart */}
                    <div className="mt-3 space-y-2">
                      <span className="text-xs font-bold text-slate-300 block">{t('الأصناف الأكثر إرجاعاً حسب القيمة المالية:', 'زۆرترین کاڵا گەڕێنراوەکان بەپێی بەها:', 'Top Returned Items by Value:')}</span>
                      
                      {dailyReturnsAnalytics.topReturnedProducts.length === 0 ? (
                        <p className="text-center text-xs text-slate-500 py-4">{t('لا توجد أصناف مرجعة مسجلة حتى الآن', 'هیچ کاڵایەکی گەڕێنراوە نییە', 'No returned items recorded yet')}</p>
                      ) : (
                        <div className="space-y-2">
                          {dailyReturnsAnalytics.topReturnedProducts.map((p, idx) => {
                            const maxVal = dailyReturnsAnalytics.topReturnedProducts[0]?.returnedAmount || 1;
                            const widthPct = Math.min(100, Math.max(10, (p.returnedAmount / maxVal) * 100));
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-slate-200 truncate max-w-[150px]">{p.name}</span>
                                  <span className="font-mono font-bold text-rose-400">{currency} {formatNumber(p.returnedAmount)} ({p.returnedQty} {t('قطعة', 'دانە', 'pcs')})</span>
                                </div>
                                <div className="w-full bg-[#050914] h-2 rounded-full overflow-hidden border border-slate-800">
                                  <div className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${widthPct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Returned Invoices Log Table */}
              <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-rose-400" />
                    <span>{t('سجل تقارير الفواتير والمواد المرجعة والمرتجعة', 'تۆماری پسوڵە و کاڵا گەڕێنراوەکان', 'Returned Invoices & Items Log')}</span>
                  </h3>
                  <span className="text-xs text-rose-400 font-mono font-bold">
                    {filteredSales.filter(s => s.status === 'refunded').length} {t('مرجوع', 'گەڕێنراوە', 'refunds')}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-200">
                    <thead className="bg-[#050914] text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 text-right rtl:text-right">{t('رقم الفاتورة المرجعة', 'ژمارەی پسوڵەی گەڕێنراوە', 'Refunded Invoice #')}</th>
                        <th className="p-2.5 text-center">{t('تاريخ الإرجاع', 'بەرواری گەڕاندنەوە', 'Return Date')}</th>
                        <th className="p-2.5 text-center">{t('الكاشير المنفذ', 'کاشێری جێبەجێکار', 'Executed Cashier')}</th>
                        <th className="p-2.5 text-center">{t('المواد المرجعة', 'کاڵا گەڕێنراوەکان', 'Returned Items')}</th>
                        <th className="p-2.5 text-center">{t('سبب الإرجاع', 'هۆکاری گەڕاندنەوە', 'Refund Reason')}</th>
                        <th className="p-2.5 text-center">{t('المبلغ المرجع', 'بڕی پارەی گەڕێنراوە', 'Refunded Amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredSales.filter(s => s.status === 'refunded').length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-500">
                            <CheckCircle className="w-6 h-6 text-emerald-500/50 mx-auto mb-1" />
                            <p>{t('ممتاز! لا توجد أي فواتير مرجعة مسجلة خلال هذه الفترة', 'هیچ پسوڵەیەکی گەڕێنراوە تۆمار نەکراوە', 'No refunded invoices in this period')}</p>
                          </td>
                        </tr>
                      ) : (
                        filteredSales.filter(s => s.status === 'refunded').map((sale) => (
                          <tr key={sale.id} className="hover:bg-rose-950/20 transition-colors">
                            <td className="p-2.5 font-mono font-bold text-rose-400">#{sale.invoiceNumber}</td>
                            <td className="p-2.5 text-center font-mono text-slate-400 text-[11px]">
                              {new Date(sale.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="p-2.5 text-center font-bold text-white">{sale.cashierName || 'أحمد'}</td>
                            <td className="p-2.5 text-center text-slate-300">
                              {(sale.items || []).map(i => `${i.productNameAr || i.productName} (${i.quantity})`).join(', ') || t('كل الفاتورة', 'هەموو پسوڵەکە', 'Entire Invoice')}
                            </td>
                            <td className="p-2.5 text-center text-amber-300">
                              {sale.notes || t('طلب الزبون إرجاع المادة', 'داواکاری کڕیار بۆ گەڕاندنەوە', 'Customer requested return')}
                            </td>
                            <td className="p-2.5 text-center font-mono font-black text-rose-400 text-sm">
                              {currency} {sale.total.toLocaleString('en-US')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Payment & Cashflow */}
          {activeSubTab === 'payment_cashflow' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[#090E1A] border border-emerald-500/30 space-y-1">
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="text-xs font-bold">{t('النقد المباشر (Cash In Hand)', 'نەقدی ڕاستەوخۆ (Cash In Hand)', 'Cash In Hand')}</span>
                    <Wallet className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black text-white font-mono text-center mt-2">
                    {currency} {financialMetrics.cashInHand.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] text-slate-400 text-center">{t('المبالغ النقدية الموجودة في درج الكاشير', 'بڕی پارەی نەقد لە ناو مێزی کاشێر', 'Actual cash inside POS drawer')}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#090E1A] border border-cyan-500/30 space-y-1">
                  <div className="flex items-center justify-between text-cyan-400">
                    <span className="text-xs font-bold">{t('الدفع الإلكتروني (POS / Mada)', 'دانی ئەلیکترۆنی (POS / Mada)', 'E-Wallets / Cards')}</span>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black text-white font-mono text-center mt-2">
                    {currency} {financialMetrics.posCardTerminals.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] text-slate-400 text-center">{t('الدفع عن طريق البطاقات والأجهزة البنكية', 'دانی پارە بە کارت و ئامێری بەنکی', 'POS term Card transactions')}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#090E1A] border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-xs font-bold">{t('المبيعات الآجلة (Credit Sales)', 'فرۆشتنی بەقەرز (Credit Sales)', 'Credit Sales')}</span>
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black text-white font-mono text-center mt-2">
                    {currency} {customerMetrics.totalDebts.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] text-slate-400 text-center">{t('ديون المبيعات المتبقية لدى الزبائن', 'قەرزی ماوەی کاڵاکان لای کڕیاران', 'Outstanding customer credit')}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#090E1A] border border-purple-500/30 space-y-1">
                  <div className="flex items-center justify-between text-purple-400">
                    <span className="text-xs font-bold">{t('محفظة الولاء والنقاط', 'جزدانی دڵسۆزی و خاڵەکان', 'Loyalty Wallet')}</span>
                    <Award className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black text-white font-mono text-center mt-2">
                    {currency} {financialMetrics.loyaltyWalletSales.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] text-slate-400 text-center">{t('المبيعات المسددة بنقاط المحفظة', 'فرۆشتنی دراو بە خاڵەکانی جزدان', 'Paid via loyalty points')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Cashier Accounts & Sales (حسابات ومبيعات الكاشيرية) */}
          {activeSubTab === 'cashier_accounts' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Date & Time Selector Control Bar */}
              <div className="cyber-card p-4 rounded-2xl bg-gradient-to-r from-[#0B1428] via-[#0F1D38] to-[#0A1020] border border-cyan-500/40 shadow-xl space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-white flex items-center gap-2">
                        <span>{t('تحديد نطاق التاريخ والوقت لتسوية وحسابات الكاشيرية', 'دیاریکردنی بەروار و کات بۆ حساباتی کاشێرەکان', 'Date & Time Filter for Cashier Accounts')}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                          {useCustomDateTime ? t('فلتر تاريخ ووقت مخصص', 'فلتەری بەروار و کاتی تایبەت', 'Custom Date & Time') : t('تصفية سريعة', 'فلتەری خێرا', 'Preset Mode')}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {t('يمكنك اختيار تاريخ البداية والنهاية والوقت بالدقيقة لاستخراج تقرير كشف حساب الكاشير بدقة متناهية', 'دەتوانیت بەروار و کات بە خولەک هەڵبژێریت بۆ ڕاپۆرتی کاشێرەکان', 'Filter sales by exact start/end date and minute to generate precise cashier shift reports')}
                      </p>
                    </div>
                  </div>

                  {/* Preset / Custom Mode Switcher Toggle */}
                  <div className="flex items-center bg-[#050914] p-1 rounded-xl border border-slate-800 self-start md:self-auto">
                    <button
                      onClick={() => setUseCustomDateTime(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !useCustomDateTime ? 'bg-cyan-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('التاريخ القياسي', 'بەرواری ئاسایی', 'Standard Date')}
                    </button>
                    <button
                      onClick={() => setUseCustomDateTime(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        useCustomDateTime ? 'bg-cyan-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('تاريخ ووقت مخصص ⏱️', 'بەروار و کاتی تایبەت ⏱️', 'Custom Date & Time ⏱️')}
                    </button>
                  </div>
                </div>

                {/* Custom Date & Time Inputs Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#060B18] p-3 rounded-xl border border-slate-800">
                  
                  {/* Start Date & Time */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('تاريخ البداية (يوم / شهر / سنة):', 'بەرواری دەستپێک (ڕۆژ / مانگ / ساڵ):', 'Start Date (DD/MM/YYYY):')}</span>
                    </label>
                    <DatePickerDDMMYYYY
                      value={startDate}
                      onChange={(dStr) => {
                        setStartDate(dStr);
                        setUseCustomDateTime(true);
                      }}
                      lang={lang}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('وقت البداية (من):', 'کاتی دەستپێک (لە):', 'Start Time (From):')}</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setUseCustomDateTime(true);
                      }}
                      className="w-full bg-[#090F1F] text-cyan-300 text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-700 focus:border-cyan-400 outline-none"
                    />
                  </div>

                  {/* End Date & Time */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-rose-400" />
                      <span>{t('تاريخ النهاية (يوم / شهر / سنة):', 'بەرواری کۆتایی (ڕۆژ / مانگ / ساڵ):', 'End Date (DD/MM/YYYY):')}</span>
                    </label>
                    <DatePickerDDMMYYYY
                      value={endDate}
                      onChange={(dStr) => {
                        setEndDate(dStr);
                        setUseCustomDateTime(true);
                      }}
                      lang={lang}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      <span>{t('وقت النهاية (إلى):', 'کاتی کۆتایی (بۆ):', 'End Time (To):')}</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        setUseCustomDateTime(true);
                      }}
                      className="w-full bg-[#090F1F] text-rose-300 text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-700 focus:border-rose-400 outline-none"
                    />
                  </div>

                </div>

                {/* Quick Shift Presets Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-bold ml-1 rtl:mr-1">{t('ورديات جاهزة:', 'نۆبەتە ڕێکخراوەکان:', 'Shift Presets:')}</span>
                    
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setStartDate(today);
                        setStartTime('00:00');
                        setEndDate(today);
                        setEndTime('23:59');
                        setUseCustomDateTime(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold border border-slate-700 transition-all cursor-pointer"
                    >
                      {t('اليوم بالكامل (00:00 - 23:59)', 'تەواوی ئەمڕۆ', 'Full Today')}
                    </button>

                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setStartDate(today);
                        setStartTime('08:00');
                        setEndDate(today);
                        setEndTime('16:00');
                        setUseCustomDateTime(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition-all cursor-pointer"
                    >
                      {t('الوردية الصباحية (08:00 - 16:00)', 'نۆبەتی بەیانیان', 'Morning Shift')}
                    </button>

                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setStartDate(today);
                        setStartTime('16:00');
                        setEndDate(today);
                        setEndTime('23:59');
                        setUseCustomDateTime(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30 transition-all cursor-pointer"
                    >
                      {t('الوردية المسائية (16:00 - 23:59)', 'نۆبەتی ئێواران', 'Evening Shift')}
                    </button>

                    <button
                      onClick={() => {
                        const yest = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
                        setStartDate(yest);
                        setStartTime('00:00');
                        setEndDate(yest);
                        setEndTime('23:59');
                        setUseCustomDateTime(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition-all cursor-pointer"
                    >
                      {t('مبيعات الأمس', 'فرۆشتنی دوێنێ', 'Yesterday')}
                    </button>
                  </div>

                  <div className="text-[11px] font-mono text-cyan-300 font-bold bg-cyan-950/80 px-3 py-1 rounded-lg border border-cyan-500/30">
                    {useCustomDateTime ? (
                      <span>
                        {t('من', 'لە', 'From')}: <strong className="text-white">{startDate} {startTime}</strong> {t('إلى', 'بۆ', 'To')}: <strong className="text-white">{endDate} {endTime}</strong>
                      </span>
                    ) : (
                      <span>{t('فلتر التاريخ الحالي', 'فلتەری بەرواری ئێستا', 'Active Filter')}: <strong className="text-white">{dateFilter === 'three_months' ? t('آخر 3 أشهر', '٣ مانگی ڕابردوو', 'Last 3 Months') : dateFilter === 'year' ? t('سنة كاملة', 'ساڵێک', 'Full Year') : dateFilter === 'today' ? t('اليوم', 'ئەمڕۆ', 'Today') : dateFilter === 'week' ? t('الأسبوع', 'هەفتە', 'Week') : dateFilter === 'month' ? t('الشهر', 'مانگ', 'Month') : t('الكل', 'هەمووی', 'All')}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* OVERALL CASHIERS SUMMARY BANNER */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-emerald-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">{t('مجموع البيع النقد (الكل)', 'کۆی فرۆشتنی نەقد (هەمووی)', 'Total Cash Revenue')}</p>
                  <p className="text-base sm:text-lg font-black text-emerald-300 font-mono text-center">
                    {currency} {cashierAccountsData.reduce((acc, c) => acc + c.cashSales, 0).toLocaleString('en-US')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-rose-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">{t('مجموع المرجع (الكل)', 'کۆی گەڕێنراوەکان (هەمووی)', 'Total Refunds')}</p>
                  <p className="text-base sm:text-lg font-black text-rose-300 font-mono text-center">
                    {currency} {cashierAccountsData.reduce((acc, c) => acc + c.refunds, 0).toLocaleString('en-US')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-cyan-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">{t('صافي المبيعات (الكل)', 'پاکی فرۆشتن (هەمووی)', 'Total Net Sales')}</p>
                  <p className="text-base sm:text-lg font-black text-cyan-300 font-mono text-center">
                    {currency} {cashierAccountsData.reduce((acc, c) => acc + c.netSales, 0).toLocaleString('en-US')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-amber-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{t('مجموع كل المبيعات', 'کۆی سەرجەمی فرۆشتن', 'Total All Sales')}</p>
                  <p className="text-base sm:text-lg font-black text-amber-300 font-mono text-center">
                    {currency} {cashierAccountsData.reduce((acc, c) => acc + c.grossSales, 0).toLocaleString('en-US')}
                  </p>
                </div>
              </div>

              {/* Header bar for cashier accounts section */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 pb-1 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    {t('حسابات الكاشير والمستخدمين المسجلة', 'ئەژمارەکانی کاشێر', 'Registered Cashier Accounts')}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                    {cashierAccountsData.length} {t('حسابات', 'ئەژمار', 'accounts')}
                  </span>
                </div>

                {onOpenAccountsModal && (
                  <button
                    onClick={onOpenAccountsModal}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{t('عرض كشف كافة الحسابات 👤', 'پشاندانی هەموو ئەژمارەکان', 'View All Accounts List')}</span>
                  </button>
                )}
              </div>

              {/* GRID OF COMPACT CASHIER ACCOUNTS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {cashierAccountsData.map((c) => {
                  const isExpanded = expandedCashierInvoices === c.cashierName;

                  return (
                    <div
                      key={c.cashierName}
                      className="cyber-card p-2.5 rounded-xl bg-[#0A0F1D] border border-cyan-500/30 hover:border-cyan-400/60 transition-all space-y-2 shadow-md relative overflow-hidden"
                    >
                      {/* Top Header Box for Cashier Name */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black shadow-sm">
                            <UserCheck className="w-3.5 h-3.5 text-slate-950" />
                          </div>
                          <div>
                            <h2 className="text-xs font-bold text-white tracking-wide truncate max-w-[120px]">
                              {t(`حساب ${c.cashierName}`, `ئەژماری ${c.cashierName}`, `Account: ${c.cashierName}`)}
                            </h2>
                            <p className="text-[9px] text-slate-400 font-mono">
                              {c.invoiceCount} {t('فواتير صادر', 'پسوڵە', 'invoices')}
                            </p>
                          </div>
                        </div>

                        <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-bold shrink-0">
                          {c.invoiceCount > 0 ? t('نشط', 'چالاک', 'Active') : t('بدون مبيعات', 'بێ فرۆشتن', 'No Sales')}
                        </span>
                      </div>

                      {/* 4 CORE STATS (2x2 Compact Grid) */}
                      <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                        
                        {/* 1. بيع نقد (Cash Sales) */}
                        <div className="p-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-emerald-400 font-sans">
                            {t('بيع نقد', 'نەقد', 'Cash')}
                          </span>
                          <span className="font-bold text-emerald-300 text-[10px]">
                            {currency} {c.cashSales.toLocaleString('en-US')}
                          </span>
                        </div>

                        {/* 2. مرجوع (Refunds / Returns) */}
                        <div className="p-1 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-rose-400 font-sans">
                            {t('مرجوع', 'گەڕێنراوە', 'Refund')}
                          </span>
                          <span className="font-bold text-rose-300 text-[10px]">
                            {currency} {c.refunds.toLocaleString('en-US')}
                          </span>
                        </div>

                        {/* 3. صافي المبيعات (Net Sales) */}
                        <div className="p-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-between col-span-2 bg-gradient-to-r from-cyan-950/60 to-blue-950/60">
                          <span className="text-[10px] font-bold text-cyan-300 font-sans">
                            {t('صافي المبيعات', 'پاکی فرۆشتن', 'Net Sales')}
                          </span>
                          <span className="text-xs font-black text-cyan-200">
                            {currency} {c.netSales.toLocaleString('en-US')}
                          </span>
                        </div>

                        {/* 4. مجموع كل المبيعات (Total All Sales) */}
                        <div className="p-1 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-center justify-between col-span-2">
                          <span className="text-[9px] font-bold text-amber-400 font-sans">
                            {t('مجموع المبيعات', 'کۆی فرۆشتن', 'Gross')}
                          </span>
                          <span className="font-bold text-amber-300 text-[10px]">
                            {currency} {c.grossSales.toLocaleString('en-US')}
                          </span>
                        </div>

                      </div>

                      {/* Additional Details Accordion / Breakdown */}
                      <div className="pt-0.5 text-[9px] space-y-0.5 border-t border-slate-800/80 font-mono text-slate-400">
                        <div className="flex justify-between">
                          <span>{t('شبكة / خصومات:', 'کارت/داشکاندن:', 'Card/Discounts:')}</span>
                          <span className="text-slate-200 font-bold">{currency} {c.cardSales.toLocaleString('en-US')} / {currency} {c.discounts.toLocaleString('en-US')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('متوسط الفاتورة:', 'تێکڕای پسوڵە:', 'Average Ticket:')}</span>
                          <span className="text-cyan-300 font-bold">{currency} {c.avgInvoice.toLocaleString('en-US')}</span>
                        </div>
                      </div>

                      {/* Footer Control Buttons */}
                      <div className="flex items-center gap-1 pt-1">
                        <button
                          onClick={() => handleExportShiftPdf(c.cashierName)}
                          className="flex-1 py-1 px-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer shadow-sm transition-all active:scale-95"
                          title={t('تصدير تقرير الوردية PDF', 'ڕاپۆرتی نۆبەت بە PDF', 'Export Shift PDF')}
                        >
                          <FileText className="w-3 h-3 text-emerald-200" />
                          <span>{t('تصدير الوردية PDF', 'نۆبەت PDF', 'Shift PDF')}</span>
                        </button>

                        <button
                          onClick={() => setCashierPrintModalData(c)}
                          className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-700"
                        >
                          <Printer className="w-3 h-3" />
                          <span>{t('طباعة', 'چاپ', 'Print')}</span>
                        </button>

                        <button
                          onClick={() => setExpandedCashierInvoices(isExpanded ? null : c.cashierName)}
                          className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-700"
                        >
                          <span>{isExpanded ? t('إخفاء', 'شاردنەوە', 'Hide') : t('الفواتير', 'پسوڵەكان', 'Invoices')}</span>
                        </button>
                      </div>

                      {/* Drawer: Detailed list of transactions for this cashier */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-800 space-y-1.5 animate-fadeIn">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-300">
                              {t(`جميع وصلات ${c.cashierName} (${c.transactions.length}):`, `پسوڵەکانی ${c.cashierName} (${c.transactions.length}):`, `All receipts for ${c.cashierName} (${c.transactions.length}):`)}
                            </span>
                            <span className="text-rose-400 font-mono text-[9px]">
                              {t('(المرتجع باللون الأحمر)', '(گەڕێنراوە بە سوور)', '(Refunded in red)')}
                            </span>
                          </div>
                          {c.transactions.length === 0 ? (
                            <p className="text-[10px] text-slate-500 py-1 text-center">{t('لا توجد فواتير', 'هیچ پسوڵەیەک نییە', 'No invoices')}</p>
                          ) : (
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5 text-[10px] custom-scrollbar">
                              {c.transactions.map((tx) => {
                                const isRefunded = tx.status === 'refunded';
                                return (
                                  <div 
                                    key={tx.id} 
                                    className={`p-1.5 rounded-xl border flex items-center justify-between transition-all ${
                                      isRefunded 
                                        ? 'bg-rose-950/90 border-2 border-rose-500 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.35)] font-bold' 
                                        : 'bg-[#050914] border-slate-800 text-slate-200'
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <p className={`font-mono font-bold ${isRefunded ? 'text-rose-200' : 'text-cyan-300'}`}>
                                          #{tx.invoiceNumber}
                                        </p>
                                        {isRefunded && (
                                          <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[8px] font-sans font-black uppercase tracking-wider animate-pulse">
                                            {t('مرتجع 🔴', 'گەڕێنراوە 🔴', 'Refunded 🔴')}
                                          </span>
                                        )}
                                      </div>
                                      <p className={`text-[9px] font-mono ${isRefunded ? 'text-rose-300/80' : 'text-slate-400'}`}>
                                        {new Date(tx.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} • {tx.paymentMethod === 'cash' ? t('نقد', 'نەقد', 'Cash') : tx.paymentMethod}
                                      </p>
                                    </div>
                                    <div className="text-right rtl:text-left font-mono">
                                      <p className={`font-bold ${isRefunded ? 'text-rose-300 text-xs line-through' : 'text-emerald-400 text-xs'}`}>
                                        {currency} {tx.total.toLocaleString('en-US')}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* Sub-tab: Period & Trends Comparison */}
          {activeSubTab === 'period_comparison' && (
            <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>{t('مقارنة الفترات والنمو الدوري (Period & Trends Comparison)', 'بەراوردی ماوەکان و گەشەی خولیی', 'Trends & Period Growth Comparison')}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#050914] border border-slate-800 space-y-3">
                  <p className="text-xs font-bold text-cyan-300">{t('معدل النمو الشهري (MoM Revenue Growth)', 'ڕێژەی گەشەی مانگانە (MoM Revenue Growth)', 'MoM Revenue Growth')}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black text-emerald-400 font-mono">+18.4%</span>
                      <p className="text-[10px] text-slate-400">{t('مقارنة بالشهر السابق', 'بەراورد بە مانگی پێشوو', 'Compared to previous month')}</p>
                    </div>
                    <ArrowUpRight className="w-8 h-8 text-emerald-400 p-1 bg-emerald-500/10 rounded-xl" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#050914] border border-slate-800 space-y-3">
                  <p className="text-xs font-bold text-cyan-300">{t('متوسط قيمة السلة الشرائية', 'تێکڕای بەهای سەبەتەی کڕین', 'Average Basket Value')}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black text-cyan-400 font-mono">{currency} {financialMetrics.netSales && filteredSales.length ? (financialMetrics.netSales / filteredSales.length).toFixed(2) : '0.00'}</span>
                      <p className="text-[10px] text-slate-400">{t('لكل معاملة بيع', 'بۆ هەر مامەڵەیەکی فرۆشتن', 'Per transaction')}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-cyan-400 p-1 bg-cyan-500/10 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CATEGORY 2: INVENTORY & STOCK VALUATION */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'inventory' && (
        <div className="space-y-4">

          {/* Sub-tab: Physical Inventory Audit Reports & Master Logs */}
          {activeSubTab === 'inventory_audit_reports' && (() => {
            const filteredSessions = auditSessions.filter(s => {
              if (!auditSessionSearch) return true;
              const q = auditSessionSearch.toLowerCase();
              return (
                s.sessionNumber?.toLowerCase().includes(q) ||
                s.date?.includes(q) ||
                s.auditorName?.toLowerCase().includes(q) ||
                s.notes?.toLowerCase().includes(q)
              );
            });

            // Overall Stats across all sessions
            const totalSessionsCount = auditSessions.length;
            const totalProductsAuditedEver = auditSessions.reduce((acc, s) => acc + (s.totalProductsAudited || 0), 0);
            const totalDiscrepanciesEver = auditSessions.reduce((acc, s) => acc + (s.discrepancyCount || 0), 0);
            const totalFinancialVarianceEver = auditSessions.reduce((acc, s) => acc + (s.totalFinancialVariance || 0), 0);
            const avgAccuracyRate = totalSessionsCount > 0
              ? Math.round(auditSessions.reduce((acc, s) => {
                  const match = s.matchedCount || 0;
                  const total = s.totalProductsAudited || 1;
                  return acc + ((match / total) * 100);
                }, 0) / totalSessionsCount)
              : 100;

            const handleDeleteSession = (sessionId: string) => {
              if (confirm(t('هل أنت متأكد من حذف هذا السجل من أرشيف الجرد؟', 'دڵنیایت لە سڕینەوەی ئەم تۆمارەی جرد؟', 'Are you sure you want to delete this audit record?'))) {
                const updated = auditSessions.filter(s => s.id !== sessionId);
                setAuditSessions(updated);
                localStorage.setItem('pos_inventory_audit_sessions_v1', JSON.stringify(updated));
              }
            };

            const handlePrintSingleSession = (session: InventoryAuditSession) => {
              const printWin = window.open('', '_blank');
              if (!printWin) return;
              printWin.document.write(`
                <!DOCTYPE html>
                <html dir="rtl">
                  <head>
                    <meta charset="utf-8" />
                    <title>تقرير محضر جرد المخزون - ${session.sessionNumber}</title>
                    <style>
                      @page { size: A4 landscape; margin: 10mm; }
                      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 0; direction: rtl; font-size: 11px; }
                      .header { border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; }
                      .title { font-size: 18px; font-weight: bold; color: #0369a1; }
                      .meta { font-size: 11px; color: #475569; line-height: 1.6; }
                      .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
                      .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; text-align: center; background: #f8fafc; }
                      .kpi-title { font-size: 10px; color: #64748b; font-weight: bold; }
                      .kpi-val { font-size: 15px; font-weight: bold; margin-top: 4px; }
                      table { width: 100%; border-collapse: collapse; font-size: 10px; }
                      th { background: #0f172a; color: white; padding: 6px; text-align: right; }
                      td { border-bottom: 1px solid #e2e8f0; padding: 6px; }
                      .match { color: #16a34a; font-weight: bold; }
                      .deficit { color: #dc2626; font-weight: bold; }
                      .surplus { color: #0284c7; font-weight: bold; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div>
                        <div class="title">📋 تقرير جلسة جرد المخزون رقم: ${session.sessionNumber}</div>
                        <div>${settings.storeName || 'المتجر'}</div>
                      </div>
                      <div class="meta">
                        <div>التاريخ والوقت: ${session.date} ${session.time}</div>
                        <div>المسؤول: ${session.auditorName}</div>
                      </div>
                    </div>
                    <div class="kpis">
                      <div class="kpi"><div class="kpi-title">الأصناف المدققة</div><div class="kpi-val">${session.totalProductsAudited}</div></div>
                      <div class="kpi"><div class="kpi-title">المتطابق تماماً</div><div class="kpi-val" style="color:#16a34a">${session.matchedCount}</div></div>
                      <div class="kpi"><div class="kpi-title">أصناف بها عجز</div><div class="kpi-val" style="color:#dc2626">${session.deficitCount}</div></div>
                      <div class="kpi"><div class="kpi-title">الفارق المالي</div><div class="kpi-val">${currency} ${session.totalFinancialVariance.toLocaleString('en-US')}</div></div>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>الباركود</th>
                          <th>اسم المادة</th>
                          <th>رصيد النظام</th>
                          <th>جرد الماركت</th>
                          <th>جرد المخزن</th>
                          <th>الجرد الفعلي</th>
                          <th>فارق القطع</th>
                          <th>الفارق المالي</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${session.items.map(item => `
                          <tr>
                            <td style="font-family: monospace;">${item.barcode}</td>
                            <td>${item.productName}</td>
                            <td>${item.systemUnits} قط (${item.systemCartons} ك)</td>
                            <td>${item.marketUnits}</td>
                            <td>${item.warehouseUnits}</td>
                            <td><strong>${item.actualUnits} قط (${item.actualCartons} ك)</strong></td>
                            <td class="${item.diffUnits === 0 ? 'match' : item.diffUnits < 0 ? 'deficit' : 'surplus'}">${item.diffUnits > 0 ? `+${item.diffUnits}` : item.diffUnits}</td>
                            <td style="font-family: monospace;">${currency} ${item.financialVariance.toLocaleString('en-US')}</td>
                            <td class="${item.diffUnits === 0 ? 'match' : item.diffUnits < 0 ? 'deficit' : 'surplus'}">
                              ${item.status === 'match' ? 'مطابق' : item.status === 'deficit' ? 'عجز' : 'زيادة'}
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </body>
                </html>
              `);
              printWin.document.close();
              printWin.focus();
              setTimeout(() => printWin.print(), 350);
            };

            return (
              <div className="space-y-4 animate-fadeIn">
                
                {/* Header Action Bar */}
                <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0A0F1D] border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-600 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className={`text-sm sm:text-base font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <span>{t('تقارير وسجلات جرد المخزون الفعلي ومطابقة الأرصدة', 'ڕاپۆرت و تۆمارەکانی جردی کۆگا و پشکنینی باڵانس', 'Physical Inventory Audit Reports & Logs')}</span>
                      </h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t('سجل تاريخي كامل لجميع جلسات الجرد، رصد العجز والزيادة، حساب الفروقات المالية، وتوثيق المحاضر',
                           'مێژووی تەواوی جردەکان، ئاشکراکردنی کەم و زۆری و بەهای دارایی جیاوازییەکان',
                           'Complete history of all audit sessions, variance tracking, and discrepancies analysis')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenInventoryAudit && (
                      <button
                        type="button"
                        onClick={onOpenInventoryAudit}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-900/20 active:scale-95 border border-amber-400/40"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        <span>{t('بدء عملية جرد فعلي جديدة 📝', 'دەستپێکردنی جردی نوێ 📝', 'Start New Inventory Audit 📝')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => exportDataToExcel(auditSessions.map(s => ({
                        'رقم الجلسة': s.sessionNumber,
                        'التاريخ': s.date,
                        'الوقت': s.time,
                        'المسؤول': s.auditorName,
                        'الأصناف المدققة': s.totalProductsAudited,
                        'المتطابق': s.matchedCount,
                        'العجز': s.deficitCount,
                        'الزيادة': s.surplusCount,
                        'صافي فارق القطع': s.netUnitVariance,
                        'صافي فارق الكراتين': s.netCartonVariance,
                        'الفارق المالي بالتكلفة': s.totalFinancialVariance,
                        'الملاحظات': s.notes || ''
                      })), `audit_history_report_${new Date().toISOString().split('T')[0]}.xlsx`, 'جلسات الجرد')}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border border-emerald-400/30 active:scale-95"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{t('تصدير إكسل', 'تۆمار لە ئێکسڵ', 'Export Excel')}</span>
                    </button>
                  </div>
                </div>

                {/* KPI Analytics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLight ? 'bg-white border-blue-200 shadow-sm' : 'bg-[#090E1A] border-blue-500/30'
                  }`}>
                    <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">
                      {t('إجمالي جلسات الجرد الموثقة', 'کۆی دانیشتنەکانی جرد', 'Total Documented Audits')}
                    </p>
                    <p className={`text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {totalSessionsCount} <span className="text-xs font-normal text-slate-400">{t('جلسة جرد', 'دانیشتن', 'sessions')}</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {auditSessions[0] ? `${t('آخر جرد:', 'دواین جرد:', 'Last:')} ${auditSessions[0].date}` : t('لا يوجد جرد سابق', 'هیچ جردێک نەکراوە', 'No previous audit')}
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLight ? 'bg-white border-emerald-200 shadow-sm' : 'bg-[#090E1A] border-emerald-500/30'
                  }`}>
                    <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
                      {t('متوسط نسبة دقة المخزون', 'تێکڕای ڕێژەی دروستی کۆگا', 'Avg Stock Accuracy')}
                    </p>
                    <p className={`text-2xl font-black font-mono ${avgAccuracyRate >= 95 ? 'text-emerald-500' : avgAccuracyRate >= 80 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {avgAccuracyRate}%
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {t('نسبة مطابقة الكميات الفعلية مع النظام', 'ڕێژەی هاوتایی بڕەکان', 'Physical vs recorded match rate')}
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLight ? 'bg-white border-amber-200 shadow-sm' : 'bg-[#090E1A] border-amber-500/30'
                  }`}>
                    <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                      {t('إجمالي الفروقات المكتشفة', 'کۆی جیاوازییە دۆزراوەکان', 'Total Discrepancies Found')}
                    </p>
                    <p className="text-2xl font-black font-mono text-amber-400">
                      {totalDiscrepanciesEver} <span className="text-xs font-normal text-slate-400">{t('صنف / فارق', 'جۆر / جیاوازی', 'items')}</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {t('مجموع حالات العجز والفائض عبر الجلسات', 'کۆی کەم و زۆرییەکان', 'Total deficits & surplus items')}
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLight ? 'bg-white border-purple-200 shadow-sm' : 'bg-[#090E1A] border-purple-500/30'
                  }`}>
                    <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                      {t('صافي الأثر المالي للتسويات', 'پوختەی کاریگەری دارایی', 'Net Financial Impact')}
                    </p>
                    <p className={`text-2xl font-black font-mono ${totalFinancialVarianceEver === 0 ? 'text-emerald-400' : totalFinancialVarianceEver < 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                      {currency} {totalFinancialVarianceEver.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {t('قيمة فروقات التكلفة المسجلة بالجرد', 'بەهای جیاوازی تێچووی جرد', 'Total cost valuation of variances')}
                    </p>
                  </div>

                </div>

                {/* Filter and Search Bar for Sessions */}
                <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0A0F1D] border-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-400" />
                    <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {t('أرشيف جلسات ومحاضر الجرد المسجلة بالنظام', 'ئەرشیفی دانیشتنەکانی جردی تۆمارکراو', 'Recorded Audit Sessions & Logs Master Archive')}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono font-bold">
                      {filteredSessions.length} {t('جلسات', 'دانیشتن', 'sessions')}
                    </span>
                  </div>

                  <div className="relative min-w-[260px]">
                    <Search className="w-3.5 h-3.5 absolute right-3 rtl:right-3 rtl:left-auto left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={auditSessionSearch}
                      onChange={(e) => setAuditSessionSearch(e.target.value)}
                      placeholder={t('بحث برقم الجلسة أو التاريخ أو المسؤول...', 'گەڕان بەپێی ژمارە، بەروار یان بەرپرس...', 'Search by session, date, auditor...')}
                      className={`w-full text-xs rounded-xl py-1.5 px-8 border outline-none transition-all ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500' : 'bg-[#050914] border-slate-700 text-white focus:border-amber-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Audit Sessions History List */}
                {filteredSessions.length === 0 ? (
                  <div className={`p-10 rounded-2xl border text-center space-y-3 ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#0A0F1D] border-slate-800'
                  }`}>
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mx-auto flex items-center justify-center">
                      <ClipboardCheck className="w-8 h-8" />
                    </div>
                    <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {t('لم يتم تسجيل جلسات جرد محفوظة حتى الآن', 'هیچ دانیشتنێکی جرد تۆمار نەکراوە تا ئێستا', 'No saved inventory audit sessions yet')}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {t('يمكنك البدء في فحص وتدقيق المخزون ومطابقة كميات الماركت والمستودع بضغطة زر وتوثيق أول تقرير جرد رسمي.',
                         'دەتوانیت دەست بکەیت بە جردی کۆگا و تۆمارکردنی یەکەمین ڕاپۆرتی فەرمی.',
                         'You can start auditing shelves & warehouse stock and generate your first documented audit session.')}
                    </p>
                    {onOpenInventoryAudit && (
                      <button
                        type="button"
                        onClick={onOpenInventoryAudit}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:brightness-110 text-white text-xs font-black shadow-lg shadow-amber-900/20 cursor-pointer transition-all active:scale-95 inline-flex items-center gap-2 mt-2"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        <span>{t('ابدأ أول عملية جرد وتدقيق الآن 📝', 'دەستپێکردنی یەکەمین جرد 📝', 'Start First Inventory Audit Now 📝')}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSessions.map((session) => {
                      const isExpanded = expandedAuditSessionId === session.id;

                      return (
                        <div
                          key={session.id}
                          className={`rounded-2xl border transition-all overflow-hidden ${
                            isLight ? 'bg-white border-slate-200 shadow-sm hover:border-amber-300' : 'bg-[#0A0F1D] border-slate-800 hover:border-amber-500/40'
                          }`}
                        >
                          {/* Session Header Card */}
                          <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className={`font-black text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                    {t('جلسة جرد رقم:', 'دانیشتنی جردی ژمارە:', 'Audit Session:')} <span className="font-mono text-cyan-400">{session.sessionNumber}</span>
                                  </h4>
                                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                                    {session.date} - {session.time}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 font-bold text-[10px] border border-cyan-800">
                                    👤 {session.auditorName}
                                  </span>
                                </div>
                                {session.notes && (
                                  <p className="text-[11px] text-slate-400 mt-1 italic">
                                    📝 {session.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Badges & Stats in Session Card */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
                                ✅ {session.matchedCount} {t('مطابق', 'هاوتا', 'matched')}
                              </span>

                              {session.deficitCount > 0 && (
                                <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold font-mono">
                                  🔻 {session.deficitCount} {t('عجز', 'کەم', 'deficits')}
                                </span>
                              )}

                              {session.surplusCount > 0 && (
                                <span className="px-2.5 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-bold font-mono">
                                  🔺 {session.surplusCount} {t('فائض', 'زیاد', 'surplus')}
                                </span>
                              )}

                              <div className="text-left rtl:text-right px-2 border-r rtl:border-r-0 rtl:border-l border-slate-800">
                                <span className="text-[10px] text-slate-400 block">{t('الفارق المالي', 'جیاوازی دارایی', 'Variance')}</span>
                                <span className={`text-xs font-black font-mono ${session.totalFinancialVariance === 0 ? 'text-emerald-400' : session.totalFinancialVariance < 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                                  {currency} {session.totalFinancialVariance.toLocaleString('en-US')}
                                </span>
                              </div>

                              {/* Controls */}
                              <button
                                type="button"
                                onClick={() => handlePrintSingleSession(session)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                                title={t('طباعة محضر الجلسة', 'چاپ', 'Print Session')}
                              >
                                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSession(session.id)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700"
                                title={t('حذف من الأرشيف', 'سڕینەوە', 'Delete Record')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setExpandedAuditSessionId(isExpanded ? null : session.id)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isExpanded
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                <span>{isExpanded ? t('إخفاء التفاصيل', 'شاردنەوە', 'Hide') : t('عرض تفاصيل المواد', 'پشاندانی وردەکاری', 'View Details')}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Itemized Table for Session */}
                          {isExpanded && (
                            <div className="border-t border-slate-800 p-4 bg-[#050914] overflow-x-auto animate-fadeIn">
                              <table className="w-full text-xs text-slate-200">
                                <thead className="bg-[#0A0F1D] text-slate-400 font-bold border-b border-slate-800">
                                  <tr>
                                    <th className="p-2.5 text-right rtl:text-right">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                                    <th className="p-2.5 text-right rtl:text-right">{t('اسم المادة', 'ناوی کاڵا', 'Product Name')}</th>
                                    <th className="p-2.5 text-center">{t('رصيد النظام', 'سیستم', 'System')}</th>
                                    <th className="p-2.5 text-center">{t('جرد الماركت', 'مارکێت', 'Market')}</th>
                                    <th className="p-2.5 text-center">{t('جرد المخزن', 'کۆگا', 'Warehouse')}</th>
                                    <th className="p-2.5 text-center">{t('إجمالي الفعلي', 'کۆی ڕاستەقینە', 'Actual Total')}</th>
                                    <th className="p-2.5 text-center">{t('فارق القطع', 'جیاوازی دانە', 'Unit Diff')}</th>
                                    <th className="p-2.5 text-center">{t('الأثر المالي', 'بەهای دارایی', 'Financial Impact')}</th>
                                    <th className="p-2.5 text-center">{t('الحالة', 'دۆخ', 'Status')}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80">
                                  {session.items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                                      <td className="p-2.5 font-mono text-cyan-400">{item.barcode}</td>
                                      <td className="p-2.5 font-bold text-white max-w-[200px] truncate">{item.productName}</td>
                                      <td className="p-2.5 text-center font-mono text-slate-300">{item.systemUnits} ({item.systemCartons} {t('ك', 'ک', 'ctn')})</td>
                                      <td className="p-2.5 text-center font-mono text-amber-300">{item.marketUnits}</td>
                                      <td className="p-2.5 text-center font-mono text-indigo-300">{item.warehouseUnits}</td>
                                      <td className="p-2.5 text-center font-mono font-bold text-white">{item.actualUnits} ({item.actualCartons} {t('ك', 'ک', 'ctn')})</td>
                                      <td className="p-2.5 text-center font-mono font-bold">
                                        {item.diffUnits === 0 ? (
                                          <span className="text-emerald-400">0</span>
                                        ) : item.diffUnits > 0 ? (
                                          <span className="text-blue-400">+{item.diffUnits}</span>
                                        ) : (
                                          <span className="text-rose-400">{item.diffUnits}</span>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-center font-mono font-bold">
                                        <span className={item.financialVariance === 0 ? 'text-slate-400' : item.financialVariance > 0 ? 'text-blue-400' : 'text-rose-400'}>
                                          {currency} {item.financialVariance.toLocaleString('en-US')}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-center">
                                        {item.status === 'match' ? (
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                            {t('مطابق', 'هاوتا', 'Match')}
                                          </span>
                                        ) : item.status === 'deficit' ? (
                                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                                            {t('عجز', 'کەم', 'Deficit')}
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                                            {t('زيادة', 'زیاد', 'Surplus')}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })()}

          {/* Sub-tab: Stock Valuation & Inventory Audit */}
          {activeSubTab === 'stock_valuation' && (() => {
            const filteredProducts = products.filter(p => {
              if (!stockSearchQuery) return true;
              const q = stockSearchQuery.toLowerCase();
              return (
                p.name?.toLowerCase().includes(q) ||
                p.nameAr?.toLowerCase().includes(q) ||
                p.nameKu?.toLowerCase().includes(q) ||
                p.barcode?.toLowerCase().includes(q)
              );
            });

            return (
              <div className="space-y-4 animate-fadeIn">
                {/* Header Action Bar */}
                <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0A0F1D] border-cyan-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center gap-2 justify-center text-cyan-400 font-bold">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <span>{t('جرد وتقييم المخزون الشامل (بسعر البيع وسعر التكلفة)', 'جرد و هەڵسەنگاندنی گشتگیری کۆگا (بە نرخی فرۆشتن و تێچوو)', 'Comprehensive Stock Valuation & Inventory Audit')}</span>
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        {t('حساب القيمة الإجمالية للمخزون، هامش الربح المحتمل، وكميات الرف والمستودع', 'هەژمارکردنی کۆی بەهای کۆگا، قازانجی پێشبینیکراو و بڕی سەر ڕەف و عەمبار', 'Total stock asset valuation, potential gross margin, and stock breakdown')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportDataToExcel(filteredProducts.map(p => ({
                        'اسم الصنف': p.nameKu || p.nameAr || p.name,
                        'الباركود': p.barcode || '',
                        'الكمية المتوفرة': p.stock || 0,
                        'سعر التكلفة': p.costPerUnit || p.cost || 0,
                        'سعر البيع': p.singleRetailPrice || p.price || 0,
                        'إجمالي التكلفة': ((p.costPerUnit || p.cost || 0) * (p.stock || 0)).toFixed(2),
                        'إجمالي قيمة البيع': ((p.singleRetailPrice || p.price || 0) * (p.stock || 0)).toFixed(2),
                        'الربح المتوقع': (((p.singleRetailPrice || p.price || 0) - (p.costPerUnit || p.cost || 0)) * (p.stock || 0)).toFixed(2)
                      })), `stock_valuation_report_${new Date().toISOString().split('T')[0]}.xlsx`, 'جرد المخزون')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border border-emerald-400/30"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{t('تصدير إكسل', 'تۆمارکردنی ئێکسڵ', 'Export Excel')}</span>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border border-cyan-400/30"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t('طباعة الجرد', 'چاپکردنی جرد', 'Print Audit')}</span>
                    </button>
                  </div>
                </div>

                {/* Stock Valuation KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLight ? 'bg-white border-cyan-200 shadow-sm' : 'bg-[#090E1A] border-cyan-500/40'
                  }`}>
                    <p className="text-[11px] font-bold text-cyan-500 uppercase tracking-wider">
                      {t('إجمالي قيمة المخزون بسعر التكلفة', 'کۆی تێچووی کۆگا بە نرخی کڕین', 'Total Stock Cost Value')}
                    </p>
                    <p className={`text-xl font-black font-mono text-center ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {currency} {inventoryValuation.totalCostVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-400 text-center">{t('رأس المال المستثمر في البضاعة', 'سەرمایەی دانراو لە کاڵاکان', 'Invested Capital in Stock')}</p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLight ? 'bg-white border-blue-200 shadow-sm' : 'bg-[#090E1A] border-blue-500/40'
                  }`}>
                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                      {t('إجمالي قيمة المخزون بسعر البيع', 'کۆی بەهای کۆگا بە نرخی فرۆشتن', 'Total Stock Retail Value')}
                    </p>
                    <p className={`text-xl font-black font-mono text-center ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {currency} {inventoryValuation.totalRetailVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-400 text-center">{t('القيمة السوقية عند البيع الكامل', 'بەهای فرۆشتن لەکاتی تەواوبوون', 'Expected Total Revenue')}</p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLight ? 'bg-white border-emerald-200 shadow-sm' : 'bg-[#090E1A] border-emerald-500/40'
                  }`}>
                    <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      {t('إجمالي الأرباح المتوقعة من المخزون', 'کۆی قازانجی پێشبینیکراو', 'Expected Gross Profit')}
                    </p>
                    <p className={`text-xl font-black font-mono text-center ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      {currency} {inventoryValuation.potentialProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-emerald-500 text-center font-bold">
                      {t('هامش ربح إجمالي:', 'ڕێژەی قازانج:', 'Margin:')} {inventoryValuation.totalRetailVal > 0 ? ((inventoryValuation.potentialProfit / inventoryValuation.totalRetailVal) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLight ? 'bg-white border-purple-200 shadow-sm' : 'bg-[#090E1A] border-purple-500/40'
                  }`}>
                    <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                      {t('عدد الأصناف والكمية الإجمالية', 'ژمارەی جۆر و دانەکان', 'Items & Stock Count')}
                    </p>
                    <p className={`text-xl font-black font-mono text-center ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
                      {products.length} <span className="text-xs font-normal text-slate-400">{t('صنف', 'جۆر', 'items')}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 text-center font-mono">
                      {products.reduce((acc, p) => acc + (p.stock || 0), 0).toLocaleString('en-US')} {t('قطعة بالمخزن', 'دانە لە کۆگادا', 'units in stock')}
                    </p>
                  </div>
                </div>

                {/* Detailed Stock Valuation Table with Search */}
                <div className={`cyber-card p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0A0F1D] border-slate-800 text-slate-100'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-bold text-sm">
                        {t('كشف جرد وتقييم تفصيلي لجميع أصناف المخزون', 'کەشف جرد و هەڵسەنگاندنی وردی سەرجەم کاڵاکان', 'Detailed Stock Valuation Item Register')}
                      </h3>
                    </div>

                    <div className="relative min-w-[240px]">
                      <Search className="w-3.5 h-3.5 absolute right-3 rtl:right-3 rtl:left-auto left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={stockSearchQuery}
                        onChange={(e) => setStockSearchQuery(e.target.value)}
                        placeholder={t('بحث بالاسم أو الباركود...', 'گەڕان بەپێی ناو یان بارکۆد...', 'Search by name or barcode...')}
                        className={`w-full text-xs rounded-xl py-2 px-8 border outline-none transition-all ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500' : 'bg-[#050914] border-slate-700 text-white focus:border-cyan-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className={`border-b font-bold ${
                        isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#050914] text-slate-400 border-slate-800'
                      }`}>
                        <tr>
                          <th className="p-2.5 text-right rtl:text-right">{t('اسم الصنف', 'ناوی کاڵا', 'Product Name')}</th>
                          <th className="p-2.5 text-center">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                          <th className="p-2.5 text-center">{t('الكمية الحالية', 'بڕی ماوە', 'Current Stock')}</th>
                          <th className="p-2.5 text-center">{t('سعر التكلفة', 'تێچووی کڕین', 'Cost Unit')}</th>
                          <th className="p-2.5 text-center">{t('سعر البيع', 'نرخی فرۆشتن', 'Retail Unit')}</th>
                          <th className="p-2.5 text-center">{t('إجمالي التكلفة', 'کۆی تێچوو', 'Total Cost')}</th>
                          <th className="p-2.5 text-center">{t('إجمالي البيع', 'کۆی فرۆشتن', 'Total Retail')}</th>
                          <th className="p-2.5 text-center">{t('الربح المتوقع', 'قازانجی چاوەڕوانکراو', 'Expected Profit')}</th>
                          <th className="p-2.5 text-center">{t('الحالة', 'دۆخ', 'Status')}</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-slate-500">
                              {t('لا توجد أصناف تطابق البحث', 'هیچ کاڵایەک نەدۆزرایەوە', 'No matching products found')}
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.slice(0, 100).map((p) => {
                            const stock = p.stock || 0;
                            const cost = p.costPerUnit || p.cost || 0;
                            const price = p.singleRetailPrice || p.price || 0;
                            const totalCost = cost * stock;
                            const totalRetail = price * stock;
                            const profit = totalRetail - totalCost;
                            const isLow = stock <= (p.minStock || 10);
                            const isOut = stock <= 0;

                            return (
                              <tr key={p.id} className={`hover:bg-cyan-500/5 transition-colors ${
                                isOut ? 'bg-rose-500/5' : isLow ? 'bg-amber-500/5' : ''
                              }`}>
                                <td className={`p-2.5 font-bold max-w-[200px] truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                  {p.nameKu || p.nameAr || p.name}
                                </td>
                                <td className="p-2.5 text-center font-mono text-cyan-400">{p.barcode || '---'}</td>
                                <td className="p-2.5 text-center font-mono font-bold">{stock}</td>
                                <td className="p-2.5 text-center font-mono text-slate-400">{currency} {cost.toLocaleString('en-US')}</td>
                                <td className="p-2.5 text-center font-mono text-blue-400 font-bold">{currency} {price.toLocaleString('en-US')}</td>
                                <td className="p-2.5 text-center font-mono text-slate-300">{currency} {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-cyan-400">{currency} {totalRetail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className={`p-2.5 text-center font-mono font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {currency} {profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-2.5 text-center">
                                  {isOut ? (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                                      {t('نفد المخزون', 'تەواوبووە', 'Out of Stock')}
                                    </span>
                                  ) : isLow ? (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                                      {t('مخزون منخفض', 'کەمە', 'Low Stock')}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                      {t('متوفر', 'بەردەستە', 'In Stock')}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Sub-tab: Item Turnover (Fast / Slow / Dead Stock) */}
          {activeSubTab === 'item_turnover' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Turnover Tabs Bar */}
              <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0A0F1D] border-slate-800'
              }`}>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {t('تقرير حركة ودوران البضائع والأصناف الراكدة', 'ڕاپۆرتی جووڵە و خولانەوەی کاڵاکان و کاڵا مەندەکان', 'Item Turnover, Movement & Dead Stock Analysis')}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {t('تصنيف الأصناف حسب سرعة البيع ودوران رأس المال لتفادي تكدس البضائع', 'پۆلێنکردنی کاڵاکان بەپێی خێرایی فرۆشتن بۆ ڕێگری لە مەندبوون', 'Categorize fast-moving, slow-moving, and stagnant dead stock')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setItemTurnoverTab('fast')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      itemTurnoverTab === 'fast'
                        ? 'bg-emerald-600 text-white shadow'
                        : (isLight ? 'bg-slate-100 text-slate-600 hover:text-slate-900' : 'bg-[#050914] text-slate-400 hover:text-white')
                    }`}
                  >
                    🔥 {t('الأكثر مبيعاً وسريع الحركة', 'پڕفرۆشترین و خێراترین', 'Fast Moving')} ({inventoryValuation.fastMoving.length})
                  </button>

                  <button
                    onClick={() => setItemTurnoverTab('slow')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      itemTurnoverTab === 'slow'
                        ? 'bg-amber-600 text-white shadow'
                        : (isLight ? 'bg-slate-100 text-slate-600 hover:text-slate-900' : 'bg-[#050914] text-slate-400 hover:text-white')
                    }`}
                  >
                    ⏳ {t('بطيء الحركة', 'هێواش لە فرۆشتن', 'Slow Moving')} ({inventoryValuation.slowMoving.length})
                  </button>

                  <button
                    onClick={() => setItemTurnoverTab('dead')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      itemTurnoverTab === 'dead'
                        ? 'bg-rose-600 text-white shadow'
                        : (isLight ? 'bg-slate-100 text-slate-600 hover:text-slate-900' : 'bg-[#050914] text-slate-400 hover:text-white')
                    }`}
                  >
                    🛑 {t('الراكد والمخزون الميت', 'مەند و نەفرۆشراو', 'Dead Stock')} ({inventoryValuation.deadStock.length})
                  </button>
                </div>
              </div>

              {/* Items List Table */}
              <div className={`cyber-card p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0A0F1D] border-slate-800 text-slate-100'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className={`border-b font-bold ${
                      isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#050914] text-slate-400 border-slate-800'
                    }`}>
                      <tr>
                        <th className="p-2.5 text-right rtl:text-right">{t('اسم الصنف', 'ناوی کاڵا', 'Product Name')}</th>
                        <th className="p-2.5 text-center">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                        <th className="p-2.5 text-center">{t('الكمية الحالية', 'بڕی ماوە', 'In Stock')}</th>
                        <th className="p-2.5 text-center">{t('سعر التكلفة', 'تێچوو', 'Cost')}</th>
                        <th className="p-2.5 text-center">{t('سعر البيع', 'فرۆشتن', 'Price')}</th>
                        <th className="p-2.5 text-center">{t('رأس المال المحتجز', 'سەرمایەی ڕاگیراو', 'Tied Capital')}</th>
                        <th className="p-2.5 text-center">{t('الإجراء المقترح', 'کرداری پێشنیازکراو', 'Recommendation')}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
                      {(itemTurnoverTab === 'fast'
                        ? inventoryValuation.fastMoving
                        : itemTurnoverTab === 'slow'
                        ? inventoryValuation.slowMoving
                        : inventoryValuation.deadStock
                      ).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            {t('لا توجد أصناف في هذه القائمة حالياً', 'هیچ کاڵایەک لەم بەشەدا نییە', 'No products in this category')}
                          </td>
                        </tr>
                      ) : (
                        (itemTurnoverTab === 'fast'
                          ? inventoryValuation.fastMoving
                          : itemTurnoverTab === 'slow'
                          ? inventoryValuation.slowMoving
                          : inventoryValuation.deadStock
                        ).map((p) => {
                          const stock = p.stock || 0;
                          const cost = p.costPerUnit || p.cost || 0;
                          const price = p.singleRetailPrice || p.price || 0;
                          const tiedCapital = stock * cost;

                          return (
                            <tr key={p.id} className="hover:bg-cyan-500/5 transition-colors">
                              <td className={`p-2.5 font-bold max-w-[220px] truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {p.nameKu || p.nameAr || p.name}
                              </td>
                              <td className="p-2.5 text-center font-mono text-cyan-400">{p.barcode || '---'}</td>
                              <td className="p-2.5 text-center font-mono font-bold">{stock}</td>
                              <td className="p-2.5 text-center font-mono text-slate-400">{currency} {cost.toLocaleString('en-US')}</td>
                              <td className="p-2.5 text-center font-mono text-blue-400 font-bold">{currency} {price.toLocaleString('en-US')}</td>
                              <td className="p-2.5 text-center font-mono font-black text-rose-400">{currency} {tiedCapital.toLocaleString('en-US')}</td>
                              <td className="p-2.5 text-center">
                                {itemTurnoverTab === 'fast' ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                    {t('أعد الطلب وزد المخزون', 'داواکردنەوەی زیاتر', 'Reorder More')}
                                  </span>
                                ) : itemTurnoverTab === 'slow' ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                                    {t('قدّم عروض ترويجية', 'داشکاندن و عەرز پێشکەش بکە', 'Run Promo Offer')}
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                                    {t('تصفية بسعر التكلفة', 'تەسفیە بە نرخی کڕین', 'Liquidate at Cost')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Wastage, Damage & Damaged Goods Report */}
          {activeSubTab === 'wastage_damage' && (() => {
            const { combinedLogs, filteredCombined, totalLoss, totalQty } = wastageAnalytics;
            const getBadge = (damageType: string) => {
              if (damageType === 'DAMAGED') return { label: t('🥀 مادة متلفة / تالفة', '🥀 کاڵای تێکچوو', 'Damaged'), color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
              if (damageType === 'BROKEN') return { label: t('💔 مادة مكسورة', '💔 شکاو', 'Broken'), color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
              if (damageType === 'EXPIRED') return { label: t('⏰ منتهية الصلاحية', '⏰ بەسەرچوو', 'Expired'), color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
              return { label: t('📦 عيب تصنيعي', '📦 عەیبدار', 'Defective'), color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
            };
            return (
              <div className="space-y-4 animate-fadeIn">
                {/* Header Action Bar for Printing & Exporting */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0A0F1D] p-3.5 rounded-2xl border border-rose-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center gap-2 justify-center text-rose-400 font-bold">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{t('تقرير شامل للمواد المتلفة والمكسورة ومنتهية الصلاحية', 'ڕاپۆرتی گشتگیری کاڵای تێکچوو، شکاو و بەسەرچوو', 'Damaged, Broken & Expired Items Report')}</span>
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        {t('عرض جميع تسجيلات الخسائر، التواريخ، الأسباب، والمسؤولين عن الإتلاف', 'پیشاندانی هەموو زەرەرەکان، بەروار، هۆکار و بەرپرسان', 'Detailed loss records, dates, causes, and cashiers')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenDamagedItemsModal && (
                      <button
                        onClick={onOpenDamagedItemsModal}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border border-amber-400/30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('تسجيل مادة متلفة جديدة', 'تۆمارکردنی کاڵای تێکچوو', 'Register Damaged Item')}</span>
                      </button>
                    )}

                    <button
                      onClick={() => exportDataToExcel(filteredCombined.map(x => ({
                        'اسم المادة': x.productName,
                        'الباركود': x.barcode,
                        'نوع التلف': x.damageType,
                        'السبب': x.reason,
                        'الكمية': x.quantity,
                        'تكلفة القطعة': x.costPerUnit,
                        'إجمالي الخسارة': x.totalLossAmount,
                        'التاريخ': x.recordedAt,
                        'المسؤول': x.cashierName
                      })), `damaged_items_report_${new Date().toISOString().split('T')[0]}.xlsx`, 'المواد المتلفة')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border border-emerald-400/30"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{t('تصدير إكسل', 'تۆمارکردنی ئێکسڵ', 'Export Excel')}</span>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border border-rose-400/30"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t('طباعة التقرير', 'چاپکردنی ڕاپۆرت', 'Print Report')}</span>
                    </button>
                  </div>
                </div>

                {/* Wastage & Damage KPI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-rose-500/40 space-y-1 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                    <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">{t('إجمالي قيمة خسائر المواد المتلفة', 'کۆی بەهای زیانی کاڵا تێکچووەکان', 'Total Loss Value')}</p>
                    <p className="text-xl sm:text-2xl font-black text-rose-300 font-mono text-center">
                      {currency} {totalLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-amber-500/40 space-y-1">
                    <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{t('مجموع القطع المتلفة والهالكة', 'کۆی پارچە تێکچووەکان', 'Total Damaged Units')}</p>
                    <p className="text-xl sm:text-2xl font-black text-amber-300 font-mono text-center">
                      {totalQty.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-400">{t('قطعة / وحدة', 'دانە', 'units')}</span>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-cyan-500/40 space-y-1">
                    <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">{t('عدد الأصناف المتأثرة بالتلف', 'ژمارەی جۆری کاڵاکان', 'Affected Product Types')}</p>
                    <p className="text-xl sm:text-2xl font-black text-cyan-300 font-mono text-center">
                      {filteredCombined.length} <span className="text-xs font-normal text-slate-400">{t('صنف مسجل', 'کاڵای تۆمارکراو', 'logged items')}</span>
                    </p>
                  </div>
                </div>

                {/* Damage Type Filter Bar */}
                <div className="flex items-center gap-2 overflow-x-auto p-2 bg-[#080D1A] rounded-2xl border border-slate-800 text-xs">
                  <span className="text-slate-400 font-bold px-2">{t('تصفية حسب نوع الإتلاف:', 'فلتەرکردن بەپێی جۆری تێکچوون:', 'Filter Type:')}</span>
                  
                  <button
                    onClick={() => setDamagedLogsFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      damagedLogsFilter === 'ALL'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('الكل', 'هەمووی', 'All')} ({combinedLogs.length})
                  </button>

                  <button
                    onClick={() => setDamagedLogsFilter('DAMAGED')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      damagedLogsFilter === 'DAMAGED'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('🥀 تالف', '🥀 تێکچوو', 'Damaged')} ({combinedLogs.filter(x => x.damageType === 'DAMAGED').length})
                  </button>

                  <button
                    onClick={() => setDamagedLogsFilter('BROKEN')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      damagedLogsFilter === 'BROKEN'
                        ? 'bg-amber-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('💔 مكسور', '💔 شکاو', 'Broken')} ({combinedLogs.filter(x => x.damageType === 'BROKEN').length})
                  </button>

                  <button
                    onClick={() => setDamagedLogsFilter('EXPIRED')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      damagedLogsFilter === 'EXPIRED'
                        ? 'bg-purple-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('⏰ منتهي الصلاحية', '⏰ بەسەرچوو', 'Expired')} ({combinedLogs.filter(x => x.damageType === 'EXPIRED').length})
                  </button>

                  <button
                    onClick={() => setDamagedLogsFilter('DEFECTIVE')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      damagedLogsFilter === 'DEFECTIVE'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('📦 عيب تصنيعي', '📦 عەیبدار', 'Defective')} ({combinedLogs.filter(x => x.damageType === 'DEFECTIVE').length})
                  </button>
                </div>

                {/* Damaged Items Detailed Table */}
                <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>{t('سجل تفاصيل المواد الهالكة والمتلفة المسجلة بالنظام', 'تۆماری وردەکاری کاڵا زەرەربووەکانی سیستم', 'Recorded Damaged Goods Master Log')}</span>
                    </h3>
                    <span className="text-xs text-rose-400 font-bold font-mono">
                      {filteredCombined.length} {t('سجل إتلاف', 'تۆماری تێکچوو', 'records')}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-200">
                      <thead className="bg-[#050914] text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-2.5 text-right rtl:text-right">{t('اسم الصنف المتلف', 'ناوی کاڵا', 'Product Name')}</th>
                          <th className="p-2.5 text-center">{t('الباركود', 'بارکۆد', 'Barcode')}</th>
                          <th className="p-2.5 text-center">{t('نوع الإتلاف', 'جۆری تێکچوون', 'Damage Type')}</th>
                          <th className="p-2.5 text-center">{t('السبب والنوع', 'هۆکار', 'Reason')}</th>
                          <th className="p-2.5 text-center">{t('المسؤول / الكاشير', 'بەرپرس / کاشێر', 'Cashier')}</th>
                          <th className="p-2.5 text-center">{t('الكمية', 'بڕ', 'Qty')}</th>
                          <th className="p-2.5 text-center">{t('تكلفة القطعة', 'تێچووی دانە', 'Unit Cost')}</th>
                          <th className="p-2.5 text-center">{t('إجمالي قيمة الخسارة', 'کۆی بەهای زیان', 'Total Loss Value')}</th>
                          <th className="p-2.5 text-center">{t('التاريخ والوقت', 'بەروار و کات', 'Recorded Date')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {filteredCombined.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-slate-500">
                              <CheckCircle className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                              <p className="font-bold text-slate-300">{t('لا توجد أي مواد متلفة أو منتهية الصلاحية مسجلة حالياً', 'هیچ کاڵایەکی تێکچوو یان بەسەرچوو نییە', 'No damaged or expired items recorded')}</p>
                              <p className="text-[11px] text-slate-500 mt-1">{t('يمكنك إضافة مواد متلفة جديدة عبر شاشة إتلاف المواد من قائمة الكاشير', 'دەتوانیت کاڵای تێکچووی نوێ تۆمار بکەیت لە شاشەی کاتژمێری کاشێر', 'You can log damaged items using the Damaged Items option in POS menu')}</p>
                            </td>
                          </tr>
                        ) : (
                          filteredCombined.map((item) => {
                            const badge = getBadge(item.damageType);
                            return (
                              <tr key={item.id} className="hover:bg-rose-950/20 transition-colors">
                                <td className="p-2.5 font-bold text-white max-w-[180px] truncate">{item.productName}</td>
                                <td className="p-2.5 text-center font-mono text-cyan-300">{item.barcode}</td>
                                <td className="p-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center text-slate-300 max-w-[150px] truncate">{item.reason}</td>
                                <td className="p-2.5 text-center text-blue-300 font-semibold">{item.cashierName || 'N/A'}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-rose-400">{item.quantity}</td>
                                <td className="p-2.5 text-center font-mono text-slate-300">{currency} {item.costPerUnit.toLocaleString('en-US')}</td>
                                <td className="p-2.5 text-center font-mono font-black text-rose-400 text-sm">{currency} {item.totalLossAmount.toLocaleString('en-US')}</td>
                                <td className="p-2.5 text-center font-mono text-[10px] text-slate-400">{item.recordedAt}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Sub-tab: Proactive Reorder & Expiry Alerts */}
          {activeSubTab === 'proactive_alerts' && (
            <div className="space-y-4">
              <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-amber-500/30 space-y-3">
                <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t('أصناف بلغت حد إعادة الطلب (Reorder Alert)', 'کاڵاکانی گەیشتوونەتە سنووری داواکردنەوە', 'Items Reaching Reorder Threshold')}</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-200">
                    <thead className="bg-[#050914] text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-2 text-right rtl:text-right">{t('اسم الصنف', 'ناوی کاڵا', 'Product Name')}</th>
                        <th className="p-2 text-center">{t('الكمية المتبقية', 'بڕی ماوە', 'Current Stock')}</th>
                        <th className="p-2 text-center">{t('حد إعادة الطلب', 'سنووری داواکردنەوە', 'Min Stock')}</th>
                        <th className="p-2 text-center">{t('الحالة', 'دۆخ', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {inventoryValuation.reorderAlerts.map(p => (
                        <tr key={p.id}>
                          <td className="p-2 font-bold text-white">{p.nameKu || p.nameAr || p.name}</td>
                          <td className="p-2 text-center font-mono font-bold text-rose-400">{p.stock}</td>
                          <td className="p-2 text-center font-mono text-slate-400">{p.minStock || 10}</td>
                          <td className="p-2 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                              {t('يلزم التوريد فوراً', 'پێویستە بەپەلە داوا بکرێتەوە', 'Reorder Now')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CATEGORY 3: SUPPLIERS & PURCHASING */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'suppliers' && (
        <div className="space-y-4">
          
          {/* Sub-tab: Purchases & Invoices Report (تقارير الشراء وفواتير المشتريات) */}
          {activeSubTab === 'purchases_report' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Purchases KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-cyan-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">{t('إجمالي تكلفة الشراء', 'کۆی بڕی تێچووی کڕین', 'Total Purchases Value')}</p>
                  <p className="text-lg sm:text-xl font-black text-white font-mono text-center">
                    {currency} {supplierMetrics.totalPurchasesVal.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-emerald-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">{t('المبالغ المسددة للشركات', 'بڕی دراو بە کۆمپانیاکان', 'Paid Amount')}</p>
                  <p className="text-lg sm:text-xl font-black text-emerald-300 font-mono text-center">
                    {currency} {supplierMetrics.totalPaidVal.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-amber-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{t('المتبقي (ديون الشراء الآجل)', 'ماوە (قەرزی کڕین)', 'Purchases Credit Debt')}</p>
                  <p className="text-lg sm:text-xl font-black text-amber-300 font-mono text-center">
                    {currency} {supplierMetrics.totalSupplierDebts.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-purple-500/40 space-y-1">
                  <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">{t('عدد فواتير الشراء', 'ژمارەی پسوڵەکانی کڕین', 'Purchase Invoices Count')}</p>
                  <p className="text-lg sm:text-xl font-black text-purple-300 font-mono text-center">
                    {purchaseInvoices.length} <span className="text-xs font-normal text-slate-400">{t('فاتورة', 'پسوڵە', 'invoices')}</span>
                  </p>
                </div>
              </div>

              {/* Purchase Invoices Log Table */}
              <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Truck className="w-4 h-4 text-cyan-400" />
                    <span>{t('سجل فواتير التوريد والمشتريات التفصيلي', 'تۆماری پسوڵەی کڕین و تورید', 'Detailed Purchase Invoices Log')}</span>
                  </h3>
                  <span className="text-xs font-mono text-cyan-300">
                    {purchaseInvoices.length} {t('فواتير', 'پسوڵە', 'invoices')}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-200">
                    <thead className="bg-[#050914] text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 text-right rtl:text-right">{t('رقم فاتورة الشراء', 'ژمارەی پسوڵەی کڕین', 'Invoice #')}</th>
                        <th className="p-2.5 text-center">{t('المورد / الشركة', 'دابینکەر / کۆمپانیا', 'Supplier')}</th>
                        <th className="p-2.5 text-center">{t('التاريخ', 'بەروار', 'Date')}</th>
                        <th className="p-2.5 text-center">{t('عدد المواد الموردة', 'ژمارەی کاڵا توریدکراوەکان', 'Items Count')}</th>
                        <th className="p-2.5 text-center">{t('حالة التسديد', 'دۆخی دانی پارە', 'Payment Status')}</th>
                        <th className="p-2.5 text-center">{t('إجمالي قيمة الفاتورة', 'کۆی بەهای پسوڵە', 'Total Invoice Amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {purchaseInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">
                            {t('لا توجد فواتير شراء مسجلة حالياً', 'هیچ پسوڵەیەکی کڕین تۆمار نەکراوە', 'No purchase invoices registered yet')}
                          </td>
                        </tr>
                      ) : (
                        purchaseInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-2.5 font-mono font-bold text-cyan-300">#{inv.invoiceNumber}</td>
                            <td className="p-2.5 text-center font-bold text-white">{inv.supplierName}</td>
                            <td className="p-2.5 text-center font-mono text-slate-400">{inv.date}</td>
                            <td className="p-2.5 text-center font-mono text-slate-300">{(inv.items || []).length}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                inv.paymentType === 'cash' ? 'bg-emerald-500/20 text-emerald-300' :
                                inv.paymentType === 'part' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {inv.paymentType === 'cash' ? t('مسدد نقداً', 'دراو', 'Paid') :
                                 inv.paymentType === 'part' ? t('مسدد جزئياً', 'بەشێکی دراوە', 'Partial') : t('آجل / دين', 'قەرز', 'Credit')}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-emerald-400 text-sm">
                              {currency} {(inv.totalInvoiceAmount || 0).toLocaleString('en-US')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Supplier Ledgers */}
          {activeSubTab === 'supplier_ledgers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-slate-800 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('إجمالي المشتريات والتوريدات', 'کۆی گشتی کڕین و دابینکردن', 'Total Invoiced Purchases')}</p>
                  <p className="text-lg font-black text-white font-mono text-center">
                    {currency} {supplierMetrics.totalPurchasesVal.toLocaleString('en-US')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-emerald-500/30 space-y-1">
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">{t('المبالغ المسددة للموردين', 'بڕی پارەی دراو بە دابینکەران', 'Paid to Suppliers')}</p>
                  <p className="text-lg font-black text-emerald-400 font-mono text-center">
                    {currency} {supplierMetrics.totalPaidVal.toLocaleString('en-US')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-amber-500/30 space-y-1">
                  <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{t('ديون الموردين المتبقية (آجل)', 'قەرزی ماوەی دابینکەران', 'Supplier Debts (Accounts Payable)')}</p>
                  <p className="text-lg font-black text-amber-300 font-mono text-center">
                    {currency} {supplierMetrics.totalSupplierDebts.toLocaleString('en-US')}
                  </p>
                </div>
              </div>

              {/* Suppliers ledger table */}
              <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <span>{t('كشف حسابات الموردين والشركات الموردة', 'کەشف حیسابی دابینکەران و کۆمپانیاکان', 'Supplier Ledgers Statement')}</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-200">
                    <thead className="bg-[#050914] text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-2 text-right rtl:text-right">{t('اسم الشركة / المورد', 'ناوی کۆمپانیا / دابینکەر', 'Supplier Company')}</th>
                        <th className="p-2 text-center">{t('إجمالي المشتريات', 'کۆی کڕینەکان', 'Total Invoiced')}</th>
                        <th className="p-2 text-center">{t('المسدد', 'دراو', 'Total Paid')}</th>
                        <th className="p-2 text-center">{t('المتبقي (الذمة)', 'ماوە (قەرز)', 'Balance Due')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {suppliers.map(sup => (
                        <tr key={sup.id}>
                          <td className="p-2 font-bold text-white">{sup.nameKu || sup.nameAr || sup.name}</td>
                          <td className="p-2 text-center font-mono text-slate-300">{currency} {(sup.totalInvoiced || 0).toLocaleString('en-US')}</td>
                          <td className="p-2 text-center font-mono text-emerald-400">{currency} {(sup.totalPaid || 0).toLocaleString('en-US')}</td>
                          <td className="p-2 text-center font-mono font-bold text-amber-400">{currency} {(sup.balanceDue || 0).toLocaleString('en-US')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Purchase Price History */}
          {activeSubTab === 'purchase_price_history' && (
            <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <span>{t('سجل تتبع تغير أسعار الشراء وتأثير التضخم', 'مێژووی بەدواداچوونی گۆڕانکاری نرخی کڕین', 'Purchase Price History & Inflation Log')}</span>
              </h3>

              <p className="text-xs text-slate-400">
                {t('يتتبع هذا التقرير تلقائياً أي تعديل في أسعار الشراء من الموردين عند إدخال فواتير التوريد الجديدة لمنع ارتفاع التكاليف الخفي.',
                   'ئەم ڕاپۆرتە بە خۆکارانە بەدواداچوون بۆ گۆڕانکاری نرخەکانی کڕین دەکات بۆ ڕێگریکردن لە بەرزبوونەوەی شاراوەی تێچوو.',
                   'Tracks all historical purchase price changes per item upon invoice restock.')}
              </p>
            </div>
          )}

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CATEGORY 4: CUSTOMERS & CREDIT */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'customers' && (
        <div className="space-y-4">
          
          {/* Sub-tab: Customer Receivables & Debt Aging */}
          {activeSubTab === 'customer_receivables' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-amber-500/30 space-y-1">
                  <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{t('إجمالي ديون المبيعات (الآجل)', 'کۆی قەرزەکانی کڕیاران', 'Total Customer Credit')}</p>
                  <p className="text-lg font-black text-amber-300 font-mono text-center">
                    {currency} {customerMetrics.totalDebts.toLocaleString('en-US')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-emerald-500/30 space-y-1">
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">{t('ديون أقل من 30 يوماً', 'قەرزی کەمتر لە ٣٠ ڕۆژ', 'Debt < 30 Days')}</p>
                  <p className="text-lg font-black text-emerald-400 font-mono text-center">
                    {currency} {customerMetrics.debtUnder30.toLocaleString('en-US')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-amber-500/30 space-y-1">
                  <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{t('ديون بين 30-60 يوماً', 'قەرزی نێوان ٣٠-٦٠ ڕۆژ', 'Debt 30-60 Days')}</p>
                  <p className="text-lg font-black text-amber-300 font-mono text-center">
                    {currency} {customerMetrics.debt30To60.toLocaleString('en-US')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090E1A] border border-rose-500/30 space-y-1">
                  <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">{t('ديون متعثرة (> 60 يوماً)', 'قەرزی دوانەکەوتوو (> ٦٠ ڕۆژ)', 'Aging Debt > 60 Days')}</p>
                  <p className="text-lg font-black text-rose-400 font-mono text-center">
                    {currency} {customerMetrics.debtOver90.toLocaleString('en-US')}
                  </p>
                </div>
              </div>

              {/* Credit customers table */}
              <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>{t('جدول كشف حسابات الزبائن الآجلين وأعمار الديون', 'خشتەی کەشف حیسابی قەرزاری کڕیاران', 'Customer Credit Receivables Ledger')}</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-200">
                    <thead className="bg-[#050914] text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-2 text-right rtl:text-right">{t('اسم الزبون', 'ناوی کڕیار', 'Customer Name')}</th>
                        <th className="p-2 text-center">{t('رقم الهاتف', 'ژمارەی تلفۆن', 'Phone')}</th>
                        <th className="p-2 text-center">{t('عمر الدين (بالأيام)', 'تەمەنی قەرز (بە ڕۆژ)', 'Debt Age (Days)')}</th>
                        <th className="p-2 text-center">{t('قيمة الدين', 'بڕی قەرز', 'Outstanding Balance')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {customerMetrics.creditCustomers.map(c => (
                        <tr key={c.id}>
                          <td className="p-2 font-bold text-white">{c.name}</td>
                          <td className="p-2 text-center font-mono text-slate-400">{c.phone}</td>
                          <td className="p-2 text-center font-mono text-amber-300">{c.debtDays} {t('يوم', 'ڕۆژ', 'days')}</td>
                          <td className="p-2 text-center font-mono font-bold text-rose-400">{currency} {c.debt.toLocaleString('en-US')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Loyalty & VIP Customers */}
          {activeSubTab === 'loyalty_behavior' && (
            <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>{t('القائمة البيضاء للزبائن الأكثر شراءً (VIP Customers)', 'لیستی کڕیارە تایبەتەکان (VIP Customers)', 'VIP Customers & Loyalty Ranks')}</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-200">
                  <thead className="bg-[#050914] text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-2 text-right rtl:text-right">{t('اسم الزبون', 'ناوی کڕیار', 'Customer Name')}</th>
                      <th className="p-2 text-center">{t('فئة العضوية', 'پلەی ئەندامێتی', 'Tier')}</th>
                      <th className="p-2 text-center">{t('نقاط الولاء', 'خاڵەکانی دڵسۆزی', 'Loyalty Points')}</th>
                      <th className="p-2 text-center">{t('إجمالي المشتريات', 'کۆی کڕینەکان', 'Total Spent')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {customerMetrics.vipCustomers.map(c => (
                      <tr key={c.id}>
                        <td className="p-2 font-bold text-white">{c.name}</td>
                        <td className="p-2 text-center font-bold text-amber-400">{c.tier}</td>
                        <td className="p-2 text-center font-mono text-cyan-300">{c.loyaltyPoints} {t('نقطة', 'خاڵ', 'pts')}</td>
                        <td className="p-2 text-center font-mono font-bold text-emerald-400">{currency} {c.totalSpent.toLocaleString('en-US')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CATEGORY 5: SECURITY AUDIT & ANTI-FRAUD */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'security' && (
        <div className="space-y-4">

          {/* Sub-tab: Shift Closure Z-Report */}
          {activeSubTab === 'shift_closure' && (
            <div className="cyber-card p-5 rounded-2xl bg-[#0A0F1D] border border-cyan-500/30 space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  <span>{t('تقرير إغلاق الورديات والمناوبات (Shift Closure Z-Report)', 'ڕاپۆرتی داخستنی نۆبەت و وردییات (Shift Closure Z-Report)', 'Shift Closure Z-Report Audit')}</span>
                </h3>
                
                <div className="flex items-center gap-2">
                  {onOpenShiftReport && (
                    <button
                      onClick={onOpenShiftReport}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer transition-all active:scale-95"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{t('طباعة ملخص وردية اليوم (Shift Report)', 'چاپکردنی ڕاپۆرتی نۆبەت', 'Print Today Shift Report')}</span>
                    </button>
                  )}
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">{new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#050914] border border-slate-800 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400">{t('النقد المتوقع وجوده بالدرج', 'نەقدی چاوەڕوانکراوی ناو مێز', 'Expected Drawer Cash')}</p>
                  <p className="text-lg font-black text-emerald-400 font-mono text-center">
                    {currency} {financialMetrics.cashInHand.toLocaleString('en-US')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#050914] border border-slate-800 space-y-2">
                  <p className="text-[11px] font-bold text-slate-400">{t('النقد الفعلي الذي أدخله الكاشير', 'نەقدی ڕاستەقینەی تۆمارکراو', 'Actual Cash Counted')}</p>
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="number"
                      value={actualShiftCash}
                      onChange={(e) => setActualShiftCash(Number(e.target.value))}
                      placeholder="0"
                      className="w-28 bg-slate-900 text-cyan-300 font-mono font-bold text-center py-1 px-2 rounded-lg border border-cyan-500/40 text-xs"
                    />
                    <button
                      onClick={() => setShiftClosed(true)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      {t('مطابقة', 'یەکسانکردن', 'Match')}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#050914] border border-slate-800 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400">{t('فارق الصندوق الدقيق (عجز / زيادة)', 'جیاوازی دقیق (کەم / زیاد)', 'Cash Shortage / Surplus')}</p>
                  {shiftClosed ? (
                    <p className={`text-lg font-black font-mono text-center ${
                      actualShiftCash - financialMetrics.cashInHand >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {actualShiftCash - financialMetrics.cashInHand >= 0 ? '+' : ''}
                      {currency} {(actualShiftCash - financialMetrics.cashInHand).toLocaleString('en-US')}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-2">{t('أدخل النقد الفعلي للمطابقة', 'نەقدی ڕاستەقینە داخڵ بکە بۆ یەکسانکردن', 'Enter count to compare')}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: Security Audit Log & Suspicious Actions */}
          {activeSubTab === 'security_audit_log' && (
            <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-rose-500/30 space-y-3">
              <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                <ShieldAlert className="w-4 h-4" />
                <span>{t('السجل الأمني للعملايات الحساسة والمشبوهة (Anti-Fraud Audit Log)', 'تۆماری ئاسایش بۆ کرداری هەستیار و گوماناوی', 'Anti-Fraud & Security Audit Log')}</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#050914] border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-bold text-white">{t('فواتير ملغاة بالكامل (Void Invoices)', 'پسوڵە هەڵوەشێنراوەکان', 'Void Invoices Log')}</span>
                  </div>
                  <span className="font-mono text-rose-400 font-bold">2 {t('عمليات إلغاء', 'کرداری هەڵوەشاندنەوە', 'voids')}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#050914] border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-bold text-white">{t('أصناف محذوفة من الفاتورة أثناء التمرير', 'کاڵا سڕاوەکان لە پسوڵە لە کاتی گەڕاندنەوەدا', 'Deleted Items During Scan')}</span>
                  </div>
                  <span className="font-mono text-amber-400 font-bold">5 {t('عناصر', 'بڕگە', 'deleted')}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#050914] border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    <span className="font-bold text-white">{t('تعديلات الأسعار والخصومات اليدوية', 'دەستکاری دەستی نرخ و داشکاندن', 'Manual Discounts & Overrides')}</span>
                  </div>
                  <span className="font-mono text-cyan-400 font-bold">3 {t('مرات', 'جار', 'overrides')}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#050914] border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="font-bold text-white">{t('فتح درج النقدية بدون عملية بيع (No Sale Open)', 'کردنەوەی مێزی نەقد بەبێ فرۆشتن', 'No-Sale Drawer Open')}</span>
                  </div>
                  <span className="font-mono text-purple-400 font-bold">1 {t('مرة', 'جار', 'time')}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CATEGORY 6: OPERATIONAL & STORE ANALYTICS */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'operational' && (
        <div className="space-y-4">

          {/* Sub-tab: Peak Hours Analysis */}
          {activeSubTab === 'peak_hours' && (
            <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>{t('تحليل ساعات الذروة وكثافة الزبائن (24 Hours Sales Breakdown)', 'شیکاری کاتەکانی قەرەباڵغی (٢٤ کاتژمێر)', '24-Hour Peak Sales Density Analysis')}</span>
              </h3>

              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 items-end h-36 bg-[#050914] p-3 rounded-xl border border-slate-800">
                {operationalAnalytics.hourlyData.slice(8, 22).map((h) => {
                  const maxRev = Math.max(...operationalAnalytics.hourlyData.map(d => d.revenue), 1);
                  const heightPct = Math.max(10, Math.min(100, Math.round((h.revenue / maxRev) * 100)));

                  return (
                    <div key={h.hour} className="flex flex-col items-center gap-1 h-full justify-end group">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t transition-all group-hover:brightness-125 relative"
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-[9px] font-mono font-bold text-white px-1 py-0.5 rounded pointer-events-none whitespace-nowrap z-20">
                          {h.revenue}
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">{h.hourLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-tab: Basket Size & Cross-Selling */}
          {activeSubTab === 'basket_analysis' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#090E1A] border border-cyan-500/30 space-y-2">
                <p className="text-xs font-bold text-slate-400">{t('متوسط عدد الأصناف في الفاتورة الواحدة', 'تێکڕای ژمارەی کاڵاکان لە یەک پسوڵەدا', 'Avg Items Per Basket')}</p>
                <p className="text-2xl font-black text-cyan-300 font-mono text-center">
                  {operationalAnalytics.avgBasketItems} <span className="text-xs text-slate-400">{t('مواد', 'کاڵا', 'items')}</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#090E1A] border border-emerald-500/30 space-y-2">
                <p className="text-xs font-bold text-slate-400">{t('متوسط قيمة الفاتورة الواحدة (Ticket Size)', 'تێکڕای بەهای یەک پسوڵە (Ticket Size)', 'Avg Ticket Size')}</p>
                <p className="text-2xl font-black text-emerald-400 font-mono text-center">
                  {currency} {operationalAnalytics.avgTicketSize.toLocaleString('en-US')}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#090E1A] border border-purple-500/30 space-y-2">
                <p className="text-xs font-bold text-slate-400">{t('أصناف تباع معاً مساندة (Cross-Selling)', 'کاڵاکان کە بەیەکەوە دەفڕۆشرێن (Cross-Selling)', 'Associated Cross-Selling Items')}</p>
                <p className="text-xs font-bold text-purple-300 text-center py-2">
                  {t('شاي + سكر | حليب + رقائق | خبز + جبن', 'چای + شەکر | شیر + ئۆتمیل | نان + پەنیری', 'Tea + Sugar | Milk + Cereal')}
                </p>
              </div>
            </div>
          )}

          {/* Sub-tab: Cashier Performance */}
          {activeSubTab === 'cashier_performance' && (
            <div className="cyber-card p-4 rounded-2xl bg-[#0A0F1D] border border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>{t('تقرير أداء وسرعة الكاشيرية', 'ڕاپۆرتی کارکردن و خێرایی کاشێرەکان', 'Cashier Speed & Performance Statement')}</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-200">
                  <thead className="bg-[#050914] text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-2 text-right rtl:text-right">{t('اسم الكاشير', 'ناوی کاشێر', 'Cashier Name')}</th>
                      <th className="p-2 text-center">{t('عدد الفواتير المنفذة', 'ژمارەی پسوڵە ئەنجامدراوەکان', 'Completed Invoices')}</th>
                      <th className="p-2 text-center">{t('إجمالي المبيعات', 'کۆی فرۆشراوەکان', 'Total Sales')}</th>
                      <th className="p-2 text-center">{t('عدد المرتجعات والإلغاءات', 'ژمارەی گەڕێنراوە و هەڵوەشێنراوەکان', 'Voids Count')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {Object.entries(operationalAnalytics.cashierPerformance).map(([cashier, data]: [string, any]) => (
                      <tr key={cashier}>
                        <td className="p-2 font-bold text-white">{cashier}</td>
                        <td className="p-2 text-center font-mono text-cyan-300">{data.invoiceCount}</td>
                        <td className="p-2 text-center font-mono text-emerald-400 font-bold">{currency} {data.salesVal.toLocaleString('en-US')}</td>
                        <td className="p-2 text-center font-mono text-rose-400 font-bold">{data.voidCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
      </div>
      )}

      {/* ======================================================== */}
      {/* 5. FORMAL PRINTABLE STATEMENT MODAL */}
      {/* ======================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0B1120] border border-cyan-500/40 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 text-slate-200 relative">
            
            <button
              onClick={() => setShowPrintModal(false)}
              className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Document Header */}
            <div id="printable-statement" className="p-6 bg-white text-slate-900 rounded-2xl space-y-6 shadow-2xl">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">
                    {settings.storeNameAr || settings.storeName}
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">{settings.address}</p>
                  <p className="text-xs text-slate-600 font-medium">{settings.phone}</p>
                </div>

                <div className="text-right rtl:text-left text-xs text-slate-700">
                  <p className="font-black text-sm text-slate-900">OFFICIAL POS MANAGEMENT STATEMENT</p>
                  <p className="mt-1 font-bold">{t('تاريخ التقرير:', 'بەرواری ڕاپۆرت:', 'Date:')} {formatDisplayDate(new Date(), lang)}</p>
                  <p>{t('نوع الكشف:', 'جۆری ڕاپۆرت:', 'Type:')} {isKu ? activeCategoryObj.titleKu : (isAr ? activeCategoryObj.titleAr : activeCategoryObj.titleEn)}</p>
                </div>
              </div>

              {/* Document Summary Table */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm border-b border-slate-300 pb-1 text-slate-900">
                  {t('ملخص الأرقام والمؤشرات الرئيسية', 'کورتەی ژمارەکان و ئاماژە سەرەکییەکان', 'Key Performance Indicators Summary')}
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs font-medium">
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                    <p className="text-slate-600">{t('صافي المبيعات', 'پاکی فرۆشتن', 'Net Sales')}</p>
                    <p className="text-base font-black text-slate-900 font-mono text-center mt-1">
                      {currency} {financialMetrics.netSales.toLocaleString('en-US')}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                    <p className="text-slate-600">{t('إجمالي الربح (Gross Profit)', 'سەرجەمی قازانج (Gross Profit)', 'Gross Profit')}</p>
                    <p className="text-base font-black text-slate-900 font-mono text-center mt-1">
                      {currency} {financialMetrics.grossProfit.toLocaleString('en-US')}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                    <p className="text-slate-600">{t('صافي الربح التشغيلي', 'پاکی قازانجی کارکردن', 'Net Operating Profit')}</p>
                    <p className="text-base font-black text-slate-900 font-mono text-center mt-1">
                      {currency} {financialMetrics.netOperatingProfit.toLocaleString('en-US')}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                    <p className="text-slate-600">{t('قيمة جرد المخزون بسعر الشراء', 'بەهای جردی کۆگا بە نرخی تێچوو', 'Inventory Cost Value')}</p>
                    <p className="text-base font-black text-slate-900 font-mono text-center mt-1">
                      {currency} {inventoryValuation.totalCostVal.toLocaleString('en-US')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Signatures Footer */}
              <div className="pt-8 border-t border-slate-300 flex justify-between items-center text-xs font-bold text-slate-700">
                <div>
                  <p>{t('توقيع مدير الفرع / المحاسب:', 'ئیمزای بەڕێوەبەری لقی / ژمێریار:', 'Branch Manager Signature:')}</p>
                  <p className="mt-6 border-b border-slate-400 w-40" />
                </div>
                <div>
                  <p>{t('ختم المنظومة المعتمد:', 'مۆری فەرمی سیستم:', 'Official Seal:')}</p>
                  <div className="mt-2 w-16 h-16 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center text-[9px] text-slate-400 text-center">
                    {t('ختم المحل', 'مۆری دوکان', 'SEAL')}
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>{t('إرسال للأمر بالطابعة', 'ناردن بۆ چاپکەر', 'Send to Printer')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. INDIVIDUAL CASHIER SHIFT STATEMENT PRINT MODAL */}
      {/* ======================================================== */}
      {cashierPrintModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0B1120] border border-cyan-500/40 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 text-slate-200 relative">
            
            <button
              onClick={() => setCashierPrintModalData(null)}
              className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Cashier Shift Receipt / Statement */}
            <div id="cashier-printable-statement" className="p-6 bg-white text-slate-900 rounded-2xl space-y-5 shadow-2xl">
              
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <h1 className="text-xl font-black text-slate-900">
                  {settings.storeNameAr || settings.storeName}
                </h1>
                <p className="text-xs text-slate-600 font-bold">
                  {t('تقرير كشف حساب وتسوية مبيعات كاشير', 'ڕاپۆرتی کەشف حیسابی کاشێر', 'CASHIER SHIFT ACCOUNT STATEMENT')}
                </p>
                <div className="inline-block px-3 py-1 mt-2 bg-slate-900 text-white rounded-full text-xs font-bold font-mono">
                  {t('اسم الكاشير:', 'ناوی کاشێر:', 'Cashier:')} {cashierPrintModalData.cashierName}
                </div>
              </div>

              {/* Time Range Info */}
              <div className="text-xs font-mono bg-slate-100 p-3 rounded-xl border border-slate-300 space-y-1">
                <p><strong>{t('تاريخ التقرير:', 'بەرواری ڕاپۆرت:', 'Printed On:')}</strong> {formatDisplayDateTime(new Date(), lang)}</p>
                <p><strong>{t('فترة الحساب:', 'ماوەی حیساب:', 'Period:')}</strong> {useCustomDateTime ? `${startDate} ${startTime} - ${endDate} ${endTime}` : dateFilter === 'three_months' ? t('آخر 3 أشهر', '٣ مانگی ڕابردوو', 'Last 3 Months') : dateFilter === 'year' ? t('سنة كاملة / هذا العام', 'ساڵێک / ئەمساڵ', 'Full Year') : dateFilter === 'today' ? t('اليوم', 'ئەمڕۆ', 'Today') : dateFilter === 'week' ? t('هذا الأسبوع', 'ئەم هەفتەیە', 'This Week') : dateFilter === 'month' ? t('هذا الشهر', 'ئەم مانگە', 'This Month') : t('الكل (كافة الفترات)', 'هەمووی', 'All Time')}</p>
                <p><strong>{t('إجمالي الفواتير:', 'کۆی پسوڵەکان:', 'Total Invoices:')}</strong> {cashierPrintModalData.invoiceCount}</p>
              </div>

              {/* Core Financial Numbers (Matching the 4 lines in drawing) */}
              <div className="space-y-2 font-mono text-xs">
                
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-300 flex justify-between items-center">
                  <span className="font-bold text-emerald-900 font-sans">{t('1. بيع نقد (Cash Revenue)', '١. فرۆشتنی نەقد', '1. Cash Sales')}</span>
                  <span className="font-black text-emerald-800 text-sm">{currency} {cashierPrintModalData.cashSales.toLocaleString('en-US')}</span>
                </div>

                <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-300 flex justify-between items-center">
                  <span className="font-bold text-rose-900 font-sans">{t('2. مرجوع (Refunds)', '٢. گەڕێنراوە', '2. Refunds')}</span>
                  <span className="font-black text-rose-800 text-sm">- {currency} {cashierPrintModalData.refunds.toLocaleString('en-US')}</span>
                </div>

                <div className="p-2.5 bg-cyan-50 rounded-lg border border-cyan-400 flex justify-between items-center">
                  <span className="font-bold text-cyan-950 font-sans">{t('3. صافي المبيعات (Net Revenue)', '٣. پاکی فرۆشتن', '3. Net Sales')}</span>
                  <span className="font-black text-cyan-900 text-base">{currency} {cashierPrintModalData.netSales.toLocaleString('en-US')}</span>
                </div>

                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-300 flex justify-between items-center">
                  <span className="font-bold text-amber-900 font-sans">{t('4. مجموع كل المبيعات (Gross Sales)', '٤. کۆی سەرجەمی فرۆشتن', '4. Total All Sales')}</span>
                  <span className="font-black text-amber-800 text-sm">{currency} {cashierPrintModalData.grossSales.toLocaleString('en-US')}</span>
                </div>

              </div>

              {/* Extra breakdown */}
              <div className="text-xs space-y-1.5 border-t border-slate-300 pt-3">
                <div className="flex justify-between text-slate-700">
                  <span>{t('المبيعات بالبطاقات / الشبكة:', 'فرۆشتن بە کارت:', 'Card/NFC Sales:')}</span>
                  <span className="font-mono font-bold">{currency} {cashierPrintModalData.cardSales.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{t('إجمالي الخصومات الممنوحة:', 'داشکاندنەکانی دراو:', 'Discounts Given:')}</span>
                  <span className="font-mono font-bold text-rose-600">{currency} {cashierPrintModalData.discounts.toLocaleString('en-US')}</span>
                </div>
              </div>

              {/* Detailed Sales Receipts List for Cashier */}
              <div className="space-y-2 border-t border-slate-300 pt-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>{t('جميع وصلات الكاشير المباعة:', 'سەرجەم پسوڵەکانی کاشێر:', 'All Sales Receipts for Cashier:')}</span>
                  <span className="text-[10px] text-rose-600 font-bold">{t('(الوصلات المسترجعة باللون الأحمر 🔴)', '(پسوڵە گەڕێنراوەکان بە سوور 🔴)', '(Returned receipts in red 🔴)')}</span>
                </div>
                {(!cashierPrintModalData.transactions || cashierPrintModalData.transactions.length === 0) ? (
                  <p className="text-xs text-slate-500 py-1 text-center">{t('لا توجد وصلات مسجلة', 'هیچ پسوڵەیەک نییە', 'No receipts')}</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                    {cashierPrintModalData.transactions.map((tx: any) => {
                      const isRefunded = tx.status === 'refunded';
                      return (
                        <div 
                          key={tx.id} 
                          className={`p-2 rounded-xl border flex items-center justify-between ${
                            isRefunded 
                              ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold shadow-sm' 
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isRefunded ? 'text-rose-900' : 'text-slate-900'}`}>#{tx.invoiceNumber}</span>
                              {isRefunded && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-sans font-black">
                                  {t('وصل مسترجع 🔴', 'پسوڵەی گەڕێنراوە 🔴', 'Returned Receipt 🔴')}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                              {formatDisplayTime(tx.timestamp, lang)} • {tx.paymentMethod === 'cash' ? t('نقد', 'نەقد', 'Cash') : tx.paymentMethod}
                            </p>
                          </div>
                          <div className="text-right font-bold text-sm">
                            <span className={isRefunded ? 'text-rose-800 line-through' : 'text-emerald-700'}>
                              {currency} {tx.total?.toLocaleString('en-US')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-300 flex justify-between items-center text-xs font-bold text-slate-700">
                <div>
                  <p>{t('توقيع الكاشير:', 'ئیمزای کاشێر:', 'Cashier Signature:')}</p>
                  <p className="mt-6 border-b border-slate-400 w-32" />
                </div>
                <div>
                  <p>{t('توقيع المحاسب / المدير:', 'ئیمزای بەڕێوەبەر:', 'Manager Signature:')}</p>
                  <p className="mt-6 border-b border-slate-400 w-32" />
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>{t('طباعة كشف الحساب كاشير', 'چاپکردنی کەشف حیساب', 'Print Cashier Statement')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. FULL INVOICE & RECEIPT DETAILS VIEW MODAL */}
      {/* ======================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#0B1120] border-2 border-cyan-500/50 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.3)] flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cyan-500/20 bg-gradient-to-r from-[#0F172A] via-[#0E2238] to-[#0F172A]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black shadow-lg">
                  <Receipt className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-white font-mono tracking-wider">
                      #{selectedInvoice.invoiceNumber}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
                      selectedInvoice.status === 'refunded'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {selectedInvoice.status === 'refunded' ? t('فاتورة مرتجعة 🔴', 'پسوڵەی گەڕێنراوە 🔴', 'Refunded 🔴') : t('فاتورة مكتملة ✅', 'پسوڵەی تەواوبوو ✅', 'Completed ✅')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {t(`الكاشير المسؤول: ${selectedInvoice.cashierName || 'غير مسمى'}`, `کاشێر: ${selectedInvoice.cashierName || '-'}`, `Cashier: ${selectedInvoice.cashierName || '-'}`)}
                    {' • '}
                    {formatDisplayDateTime(selectedInvoice.timestamp, lang)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Meta Bar */}
            <div className="p-3 bg-[#070D1D] border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans font-bold">{t('طريقة الدفع:', 'شێوازی دانان:', 'Payment:')}</span>
                <span className="text-cyan-300 font-bold uppercase">
                  {selectedInvoice.paymentMethod === 'cash' ? t('نقد 💵', 'نەقد 💵', 'Cash 💵') : selectedInvoice.paymentMethod}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans font-bold">{t('اسم العميل:', 'ناوی کڕیار:', 'Customer:')}</span>
                <span className="text-slate-200 font-bold truncate block">
                  {selectedInvoice.customerName || t('زبون عام', 'کڕیاری گشتی', 'General Customer')}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans font-bold">{t('عدد المواد:', 'ژمارەی کاڵا:', 'Items Count:')}</span>
                <span className="text-amber-300 font-bold">
                  {selectedInvoice.items ? selectedInvoice.items.length : 0} {t('مواد', 'کاڵا', 'items')}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans font-bold">{t('إجمالي الفاتورة:', 'کۆی پسوڵە:', 'Total:')}</span>
                <span className="text-emerald-300 font-black text-sm">
                  {currency} {selectedInvoice.total.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            {/* Invoice Purchased Items List */}
            <div className="p-4 sm:p-5 overflow-y-auto max-h-[48vh] custom-scrollbar space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>{t('المواد والمنتجات المباعة داخل الوصل 🛒', 'کاڵاکانی ناو پسوڵە 🛒', 'Purchased Invoice Items 🛒')}</span>
              </h3>

              {!selectedInvoice.items || selectedInvoice.items.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">{t('لا توجد تفاصيل مواد لهذه الفاتورة', 'هیچ زانیارییەک نییە', 'No item details')}</p>
              ) : (
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#050914]">
                  <table className="w-full text-right rtl:text-right ltr:text-left text-xs">
                    <thead className="bg-[#0D1527] text-slate-400 border-b border-slate-800 font-bold text-[11px]">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">{t('المادة / المنتج', 'کاڵا', 'Product Name')}</th>
                        <th className="p-2.5 text-center">{t('الكمية', 'بڕ', 'Qty')}</th>
                        <th className="p-2.5">{t('السعر', 'نرخ', 'Price')}</th>
                        <th className="p-2.5 text-left rtl:text-left ltr:text-right">{t('الإجمالي', 'کۆی گشتی', 'Total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50 transition-all">
                          <td className="p-2.5 text-slate-500 font-bold text-[10px]">{idx + 1}</td>
                          <td className="p-2.5 font-sans font-bold text-slate-100">
                            <div>
                              <p>{item.productNameAr || item.productName}</p>
                              {item.saleType && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  {item.saleType === 'carton' ? t('كرتون', 'کارتۆن', 'Carton') : item.saleType === 'blister' ? t('شريط', 'شریت', 'Blister') : t('مفرد', 'تاک', 'Unit')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-bold text-cyan-300 text-sm">
                            {item.quantity}
                          </td>
                          <td className="p-2.5 text-slate-300">
                            {currency} {item.price.toLocaleString('en-US')}
                          </td>
                          <td className="p-2.5 text-left rtl:text-left ltr:text-right font-black text-emerald-400">
                            {currency} {(item.total || (item.price * item.quantity)).toLocaleString('en-US')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Returned Items Section if any */}
              {selectedInvoice.returnedItems && selectedInvoice.returnedItems.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-rose-500/20">
                  <h3 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <span>🔄 {t('المواد المرجوعة من هذا الوصل:', 'کاڵا گەڕێنراوەکانی ئەم پسوڵەیە:', 'Returned Items from this Receipt:')}</span>
                  </h3>
                  <div className="border border-rose-500/30 rounded-2xl overflow-hidden bg-rose-950/20">
                    <table className="w-full text-right rtl:text-right ltr:text-left text-xs">
                      <thead className="bg-rose-950/40 text-rose-300 border-b border-rose-500/30 font-bold text-[10px]">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">{t('المادة المرجعة', 'کاڵا', 'Returned Product')}</th>
                          <th className="p-2 text-center">{t('الكمية المرجعة', 'بڕی گەڕێنراوە', 'Returned Qty')}</th>
                          <th className="p-2 text-left rtl:text-left ltr:text-right">{t('المبلغ المرجع', 'بڕی گەڕێنراوەتەوە', 'Refund Total')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-500/20 font-mono text-rose-100">
                        {selectedInvoice.returnedItems.map((ret, rIdx) => (
                          <tr key={rIdx}>
                            <td className="p-2 text-rose-400 text-[10px]">{rIdx + 1}</td>
                            <td className="p-2 font-sans font-bold">{ret.productNameAr || ret.productName}</td>
                            <td className="p-2 text-center font-bold text-rose-300">{ret.quantity}</td>
                            <td className="p-2 text-left rtl:text-left ltr:text-right font-bold text-rose-400">-{currency} {ret.total.toLocaleString('en-US')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Financial Breakdown Box */}
              <div className="p-3.5 rounded-2xl bg-[#050A18] border border-cyan-500/30 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{t('المجموع الفرعي:', 'کۆی لاوەکی:', 'Subtotal:')}</span>
                  <span className="text-slate-200 font-bold">{currency} {(selectedInvoice.subtotal || selectedInvoice.total).toLocaleString('en-US')}</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>{t('الخصم الممنوح:', 'داشکاندن:', 'Discount:')}</span>
                    <span className="font-bold">-{currency} {selectedInvoice.discount.toLocaleString('en-US')}</span>
                  </div>
                )}
                {selectedInvoice.tax > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>{t('الضريبة:', 'باج:', 'Tax:')}</span>
                    <span className="font-bold">+{currency} {selectedInvoice.tax.toLocaleString('en-US')}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black">
                  <span className="text-white font-sans">{t('صافي المجموع النهائي:', 'کۆی گشتی کۆتایی:', 'Grand Total:')}</span>
                  <span className="text-emerald-300">{currency} {selectedInvoice.total.toLocaleString('en-US')}</span>
                </div>
                {selectedInvoice.amountTendered !== undefined && (
                  <div className="pt-1 flex justify-between text-[11px] text-slate-400">
                    <span>{t('المبلغ المدفوع / الباقي:', 'وەردگیراو / ماوە:', 'Paid / Change:')}</span>
                    <span className="text-cyan-300 font-bold">
                      {currency} {selectedInvoice.amountTendered.toLocaleString('en-US')} / {currency} {(selectedInvoice.changeDue || 0).toLocaleString('en-US')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-cyan-500/20 bg-[#0A0F1D] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onViewReceipt) {
                    onViewReceipt(selectedInvoice);
                  } else {
                    window.print();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>{t('طباعة الوصل 🖨️', 'چاپکردنی پسوڵە 🖨️', 'Print Receipt 🖨️')}</span>
              </button>

              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                {t('إغلاق ✕', 'داخستن ✕', 'Close ✕')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TODAY'S RETURNS DETAILED LIST MODAL */}
      {/* ======================================================== */}
      {showTodayReturnsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-5xl max-h-[92vh] rounded-3xl border border-rose-500/40 bg-[#0B132B] text-slate-100 flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-rose-500/20 bg-gradient-to-r from-[#180C1E] via-[#1F0F1B] to-[#0D1528] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 text-white shadow-lg shadow-rose-500/30">
                  <RefreshCw className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
                    <span>{t('كشف وحساب مرتجعات اليوم التفصيلي 🔄', 'تۆماری کاڵا گەڕێنراوەکانی ئەمڕۆ 🔄', 'Detailed Today\'s Returns Log 🔄')}</span>
                  </h2>
                  <p className="text-xs text-rose-300/80 mt-0.5">
                    {t('عرض جميع الفواتير والأصناف المسجلة كمرجوعات خلال هذا اليوم ومخصومة من المبيعات مع خيار طباعة الوصل', 'کۆنتڕۆڵ و بینینی هەموو کاڵا گەڕێنراوەکانی ئەمڕۆ', 'List of all returned invoices & items recorded today deducted from sales with print options')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowTodayReturnsModal(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary Highlight Strip */}
            <div className="p-4 bg-[#080E1E] border-b border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#0F172A] border border-rose-500/40 text-center">
                <span className="text-[11px] font-bold text-rose-400 block uppercase tracking-wider">
                  {t('إجمالي مبالغ المرتجعات اليوم', 'کۆی بەهای گەڕێنراوەکانی ئەمڕۆ', 'Total Refund Amount')}
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-rose-300 mt-1 block">
                  {currency} {todayReturnsSummary.totalAmount.toLocaleString('en-US')}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0F172A] border border-amber-500/40 text-center">
                <span className="text-[11px] font-bold text-amber-400 block uppercase tracking-wider">
                  {t('عدد الفواتير والعمليات المرجعة', 'ژمارەی پسوڵە گەڕێنراوەکان', 'Returned Invoices Count')}
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-amber-300 mt-1 block">
                  {todayReturnsSummary.count} <span className="text-xs font-normal text-slate-400">{t('عملية', 'کردار', 'records')}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0F172A] border border-cyan-500/40 text-center">
                <span className="text-[11px] font-bold text-cyan-400 block uppercase tracking-wider">
                  {t('قطع المواد المستعادة للمخزن', 'کاڵا گەڕێنراوەکان بۆ کۆگا', 'Returned Items Restocked')}
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-cyan-300 mt-1 block">
                  {todayReturnsSummary.totalItemsCount} <span className="text-xs font-normal text-slate-400">{t('قطعة', 'دانە', 'pcs')}</span>
                </span>
              </div>
            </div>

            {/* Modal Body & Search */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0 bg-[#0A1020]">
              
              {/* Search Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={todayReturnsSearchInput}
                    onChange={(e) => setTodayReturnsSearchInput(e.target.value)}
                    placeholder={t('ابحث برقم الفاتورة، اسم المادة، الكاشير، أو الباركود...', 'گەڕان بە ژمارەی پسوڵە، ناوی کاڵا...', 'Search by invoice #, product, cashier, barcode...')}
                    className="w-full bg-[#050A18] text-xs text-slate-100 placeholder-slate-500 px-9 py-2.5 rounded-xl border border-slate-700 focus:border-rose-500 focus:outline-none text-right font-medium"
                  />
                  <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-rose-400" />
                  {todayReturnsSearchInput && (
                    <button
                      onClick={() => setTodayReturnsSearchInput('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs bg-slate-800 p-1 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table of Today's Returns */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#050A18] shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-200 text-right rtl:text-right">
                    <thead className="bg-[#02050E] text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3 text-center w-12">#</th>
                        <th className="p-3">{t('رقم الفاتورة المرجعة', 'ژمارەی پسوڵە', 'Invoice #')}</th>
                        <th className="p-3 text-center">{t('تاريخ ووقت الإرجاع', 'کاتی گەڕاندنەوە', 'Return Time')}</th>
                        <th className="p-3 text-center">{t('الكاشير والزبون', 'کاشێر و کڕیار', 'Cashier & Customer')}</th>
                        <th className="p-3">{t('المواد المرجعة مع الكمية والسعر', 'کاڵا گەڕێنراوەکان', 'Returned Items')}</th>
                        <th className="p-3 text-center">{t('المبلغ المرجع والمخصوم', 'بڕی پارەی گەڕێنراوە', 'Refund Amount')}</th>
                        <th className="p-3 text-center">{t('إجراءات', 'کردارەکان', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {todayReturnsSummary.returnedSales.filter(s => {
                        if (!todayReturnsSearchInput.trim()) return true;
                        const q = todayReturnsSearchInput.trim().toLowerCase();
                        const matchInvoice = (s.invoiceNumber || '').toLowerCase().includes(q);
                        const matchCashier = (s.cashierName || '').toLowerCase().includes(q);
                        const matchCustomer = (s.customerName || '').toLowerCase().includes(q);
                        const itemsList = Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? (JSON.parse(s.items || '[]') || []) : []);
                        const matchItem = itemsList.some((it: any) =>
                          (it.productName || '').toLowerCase().includes(q) ||
                          (it.productNameAr || '').toLowerCase().includes(q) ||
                          (it.barcode || '').toLowerCase().includes(q)
                        );
                        return matchInvoice || matchCashier || matchCustomer || matchItem;
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 space-y-2">
                            <CheckCircle className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                            <p className="font-bold">{t('لا توجد أي سجلات مرتجعات متطابقة لهذا اليوم', 'هیچ تۆمارێکی گەڕێنراوە نییە بۆ ئەمڕۆ', 'No matching return records for today')}</p>
                          </td>
                        </tr>
                      ) : (
                        todayReturnsSummary.returnedSales.filter(s => {
                          if (!todayReturnsSearchInput.trim()) return true;
                          const q = todayReturnsSearchInput.trim().toLowerCase();
                          const matchInvoice = (s.invoiceNumber || '').toLowerCase().includes(q);
                          const matchCashier = (s.cashierName || '').toLowerCase().includes(q);
                          const matchCustomer = (s.customerName || '').toLowerCase().includes(q);
                          const itemsList = Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? (JSON.parse(s.items || '[]') || []) : []);
                          const matchItem = itemsList.some((it: any) =>
                            (it.productName || '').toLowerCase().includes(q) ||
                            (it.productNameAr || '').toLowerCase().includes(q) ||
                            (it.barcode || '').toLowerCase().includes(q)
                          );
                          return matchInvoice || matchCashier || matchCustomer || matchItem;
                        }).map((sale, index) => {
                          const isFullRefund = sale.status === 'refunded' || sale.total < 0;
                          const returnedArr = Array.isArray(sale.returnedItems)
                            ? sale.returnedItems
                            : (typeof sale.returnedItems === 'string' ? (JSON.parse(sale.returnedItems || '[]') || []) : []);
                          
                          const itemsList = Array.isArray(sale.items) ? sale.items : (typeof sale.items === 'string' ? (JSON.parse(sale.items || '[]') || []) : []);
                          const displayItems = isFullRefund ? itemsList : (returnedArr.length > 0 ? returnedArr : itemsList);

                          const refundedVal = isFullRefund 
                            ? Math.abs(sale.total || sale.subtotal || 0)
                            : returnedArr.reduce((acc: number, r: any) => acc + Math.abs(Number(r?.total || (Number(r?.price || 0) * Number(r?.quantity || 0))) || 0), 0);

                          return (
                            <tr key={sale.id || index} className="hover:bg-rose-950/20 transition-colors">
                              <td className="p-3 text-center font-mono font-bold text-slate-400">{index + 1}</td>
                              <td className="p-3 font-mono font-bold text-rose-400">
                                #{sale.invoiceNumber}
                              </td>
                              <td className="p-3 text-center font-mono text-slate-400 text-[11px]">
                                {new Date(sale.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="p-3 text-center font-bold text-white">
                                <div>{sale.cashierName || 'الكاشير الرئيسية'}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{sale.customerName || t('زبون عام', 'کڕیاری گشتی', 'General Customer')}</div>
                              </td>
                              <td className="p-3 text-slate-300">
                                <div className="space-y-1">
                                  {displayItems.map((it: any, iIdx: number) => (
                                    <div key={iIdx} className="flex items-center gap-2 text-xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                      <span className="font-bold text-white">{it.productNameAr || it.productName}</span>
                                      <span className="text-rose-300 font-mono">({it.quantity} {t('قطع', 'دانە', 'pcs')})</span>
                                      <span className="text-slate-400 font-mono">@ {currency} {formatNumber(it.price || 0)}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 text-center font-mono font-black text-rose-400 text-sm">
                                -{currency} {formatNumber(refundedVal)}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onViewReceipt) {
                                      onViewReceipt(sale);
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 mx-auto shadow-md transition-all cursor-pointer active:scale-95"
                                  title={t('طباعة وصل إثبات المرتجعات لهذا الوصل', 'چاپکردنی پسوڵەی گەڕاندنەوە', 'Print return receipt')}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>{t('طباعة الوصل 📄', 'چاپ کردنی پسوڵە 📄', 'Print Receipt 📄')}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#080E1E] flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setActiveCategory('financial');
                  setActiveSubTab('returns_report');
                  setIsDetailOpen(true);
                  setShowTodayReturnsModal(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center gap-2 hover:brightness-110 transition-all shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('الانتقال للتقرير المالي الشامل للمرجوعات ↗', 'چوون بۆ ڕاپۆرتی گشتی گەڕێنراوەکان ↗', 'Go to Full Returns Report ↗')}</span>
              </button>

              <button
                onClick={() => setShowTodayReturnsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all border border-slate-700 cursor-pointer"
              >
                {t('إغلاق ✕', 'داخستن ✕', 'Close ✕')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD MANUAL EXPENSE UNIT (إضافة بند تكلفة يدوياً) */}
      {/* ---------------------------------------------------- */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0B132B] border border-cyan-500/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="p-4 bg-[#070D1E] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t('إضافة بند تكلفة تشغيلية يدوياً', 'زیادکردنی بڕگەی تێچووی نوێ بە دەستی', 'Add Manual Operating Expense Unit')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('أدخل تفاصيل التكلفة والمبلغ ونوعها لحساب صافي الأرباح', 'وردەکاری تێچوو و بڕ و جۆرەکەی دیاری بکە', 'Enter cost details, amount and category')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-5 space-y-4 text-xs text-right rtl:text-right bg-[#0A1022]">
              {/* Expense Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">
                  {t('اسم / عنوان بند التكلفة *', 'ناوی بڕگەی تێچوو *', 'Expense Name / Title *')}
                </label>
                <input
                  type="text"
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  placeholder={t('مثال: إيجار المحل، صيانة مكيفات، شراء أكياس، رواتب كادر...', 'نموونە: کرێی دوکان، چاککردنەوە، نایلۆن...', 'e.g., Shop rent, AC maintenance, bags...')}
                  className="w-full bg-[#050A18] text-white p-2.5 rounded-xl border border-slate-700 focus:border-cyan-500 focus:outline-none text-xs font-medium placeholder-slate-500"
                  autoFocus
                />
              </div>

              {/* Expense Category / Type */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300">
                    {t('نوع وتصنيف التكلفة *', 'جۆری تێچوو *', 'Expense Category / Type *')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategoryModal(true);
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('+ إضافة نوع جديد', '+ زیادکردنی جۆری نوێ', '+ Add new category')}</span>
                  </button>
                </div>

                <select
                  value={newExpenseCategory}
                  onChange={(e) => setNewExpenseCategory(e.target.value)}
                  className="w-full bg-[#050A18] text-cyan-300 p-2.5 rounded-xl border border-slate-700 focus:border-cyan-500 focus:outline-none text-xs font-bold"
                >
                  <optgroup label={t('التصنيفات القياسية الأساسية', 'جۆرە بنەڕەتییەکان', 'Standard Categories')}>
                    {DEFAULT_EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {isKu ? cat.labelKu : (isAr ? cat.labelAr : cat.labelEn)}
                      </option>
                    ))}
                  </optgroup>
                  {customExpenseTypes.length > 0 && (
                    <optgroup label={t('الأنواع والتصنيفات المخصصة', 'جۆرە تایبەتە زیادکراوەکان', 'Custom Categories')}>
                      {customExpenseTypes.map(cName => (
                        <option key={cName} value={cName}>
                          🏷️ {cName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Expense Amount */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">
                  {t('المبلغ المالي *', 'بڕی پارە *', 'Amount *')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-[#050A18] text-amber-300 p-2.5 pl-14 rtl:pr-14 rtl:pl-2.5 rounded-xl border border-slate-700 focus:border-amber-500 focus:outline-none font-mono font-bold text-sm"
                  />
                  <span className="absolute top-1/2 -translate-y-1/2 right-3 rtl:right-auto rtl:left-3 text-slate-400 font-bold text-xs pointer-events-none">
                    {currency}
                  </span>
                </div>
              </div>

              {/* Notes / Details */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">
                  {t('تفاصيل وملاحظات إضافية (اختياري)', 'تێبینی و وردەکاری زیاتر (ئارەزوومەندانە)', 'Notes / Details (Optional)')}
                </label>
                <input
                  type="text"
                  value={newExpenseNote}
                  onChange={(e) => setNewExpenseNote(e.target.value)}
                  placeholder={t('أدخل أي توضيح أو رقم وصل أو اسم المورد/المستلم...', 'هەر ڕوونکردنەوەیەک یان ژمارەی وەسڵ...', 'Any note, voucher #, or recipient name...')}
                  className="w-full bg-[#050A18] text-slate-200 p-2.5 rounded-xl border border-slate-700 focus:border-cyan-500 focus:outline-none text-xs font-medium placeholder-slate-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#070D1E] border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                {t('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
              </button>

              <button
                type="button"
                onClick={handleAddExpenseItem}
                disabled={!newExpenseName.trim() || newExpenseAmount === ''}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('حفظ وإضافة التكلفة', 'پاشەکەوت و زیادکردن', 'Save & Add Expense')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD CUSTOM EXPENSE CATEGORY (إضافة نوع تكلفة) */}
      {/* ---------------------------------------------------- */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0B132B] border border-purple-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="p-4 bg-[#070D1E] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t('إضافة نوع وتصنيف تكلفة جديد', 'زیادکردنی جۆری نوێی تێچوو', 'Add Custom Expense Type')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('أدخل اسم التصنيف الجديد لتنظيم المصاريف اليدوية', 'ناوی جۆری نوێ بنووسە بۆ ڕێکخستنی تێچووەکان', 'Enter category name to organize manual expenses')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-5 space-y-4 text-xs text-right rtl:text-right bg-[#0A1022]">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">
                  {t('اسم نوع / تصنيف التكلفة الجديد *', 'ناوی جۆری تێچووی نوێ *', 'New Expense Category Name *')}
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={t('مثال: مصاريف بنزين ومحروقات، إكراميات، قرطاسية، ضيافة خاصة...', 'نموونە: بەنزین، شیرینی، چاپ...', 'e.g., Fuel & gas, stationery, tips...')}
                  className="w-full bg-[#050A18] text-white p-2.5 rounded-xl border border-slate-700 focus:border-purple-500 focus:outline-none text-xs font-medium placeholder-slate-500"
                  autoFocus
                />
              </div>

              {/* Display existing custom categories */}
              {customExpenseTypes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400 font-bold">
                    {t('الأنواع المخصصة المضافة سابقاً:', 'جۆرە تایبەتە زیادکراوەکانی پێشوو:', 'Existing custom types:')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {customExpenseTypes.map((cName, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] flex items-center gap-1.5"
                      >
                        <span>🏷️ {cName}</span>
                        <button
                          type="button"
                          onClick={() => setCustomExpenseTypes(prev => prev.filter(x => x !== cName))}
                          className="text-slate-400 hover:text-rose-400 cursor-pointer"
                          title={t('حذف هذا التصنيف', 'سڕینەوەی ئەم جۆرە', 'Delete category')}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#070D1E] border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                {t('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
              </button>

              <button
                type="button"
                onClick={handleAddCustomType}
                disabled={!newCategoryName.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>{t('حفظ نوع التكلفة', 'پاشەکەوتکردنی جۆر', 'Save Category')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
