import { Product, SaleUnitType } from '../types';

/**
 * Calculates the unit cost for a sale item depending on its saleType (carton, wholesale, blister, retail).
 */
export function getItemUnitCost(
  item: { productId: string; price: number; quantity: number; saleType?: SaleUnitType },
  prod?: Product
): number {
  if (!prod) {
    // Fallback if product is deleted or unavailable
    return item.price * 0.7;
  }

  const saleType = item.saleType || 'retail';

  if (saleType === 'carton') {
    // Cost of 1 carton for profit & reports: uses weighted average unit cost * units per carton
    const unitsPerCarton = prod.unitsPerCarton && prod.unitsPerCarton > 0 ? prod.unitsPerCarton : 1;
    const baseCost = prod.costPerUnit || prod.cost || (prod.cartonPurchasePrice ? prod.cartonPurchasePrice / unitsPerCarton : 0);
    return baseCost * unitsPerCarton;
  }

  if (saleType === 'blister') {
    // Cost of 1 blister/strip
    const baseCost = prod.costPerUnit || prod.cost || 0;
    const blistersPerBox = prod.blistersPerBox && prod.blistersPerBox > 0 ? prod.blistersPerBox : 1;
    return baseCost / blistersPerBox;
  }

  // Retail or Wholesale: Cost per unit is the single unit cost
  return prod.costPerUnit || prod.cost || 0;
}

/**
 * Calculates total cost for a sale item line
 */
export function getItemTotalCost(
  item: { productId: string; price: number; quantity: number; saleType?: SaleUnitType },
  prod?: Product
): number {
  const unitCost = getItemUnitCost(item, prod);
  return unitCost * (item.quantity || 0);
}

/**
 * Calculates total profit for a sale item line
 */
export function getItemTotalProfit(
  item: { productId: string; price: number; quantity: number; total?: number; saleType?: SaleUnitType },
  prod?: Product
): number {
  const revenue = item.total ?? (item.price * item.quantity);
  const cost = getItemTotalCost(item, prod);
  return revenue - cost;
}

/**
 * Calculates total profit refunded/reversed on a returned item line
 */
export function getReturnedItemProfit(
  item: { productId: string; price: number; quantity: number; total?: number; saleType?: SaleUnitType },
  prod?: Product
): number {
  const revenue = Math.abs(Number(item.total ?? (item.price * item.quantity)) || 0);
  const cost = Math.abs(Number(getItemTotalCost(item, prod)) || 0);
  return Math.max(0, revenue - cost);
}

export interface StoreFinancialMetrics {
  grossSales: number;
  totalDiscounts: number;
  totalRefundsValue: number;
  netSales: number;
  cogs: number; // Net cost of goods sold (sold cost - returned cost)
  soldCogs: number; // Total cost of items originally sold
  returnedCogs: number; // Total cost of items recovered/restocked via returns
  returnedProfits: number; // Total profit reversed/deducted by returned items
  grossProfit: number; // Net earned profit from sales after deducting returns
  earnedProfit: number; // Net earned profit (same as grossProfit)
  totalOperatingExpenses: number;
  netOperatingProfit: number; // grossProfit - totalOperatingExpenses
  cashInHand: number;
  posCardTerminals: number;
  loyaltyWalletSales: number;
}

/**
 * Universal Single Source of Truth for calculating financial metrics,
 * strictly deducting returned items and their profits when items are returned.
 */
export function calculateStoreFinancialMetrics(
  sales: any[],
  products: Product[],
  opExpenseItems: { amount: number }[] = []
): StoreFinancialMetrics {
  let grossSales = 0;
  let totalDiscounts = 0;
  let totalRefundsValue = 0;
  let soldCogs = 0;
  let returnedCogs = 0;
  let returnedProfits = 0;

  let cashInHand = 0;
  let posCardTerminals = 0;
  let loyaltyWalletSales = 0;

  const safeSales = Array.isArray(sales) ? sales : [];

  safeSales.forEach(s => {
    if (!s) return;
    const isRefundedTx = s.status === 'refunded' || (s.total && s.total < 0) || (s.subtotal && s.subtotal < 0);
    const returnedArr: any[] = Array.isArray(s.returnedItems)
      ? s.returnedItems
      : (typeof s.returnedItems === 'string' ? (JSON.parse(s.returnedItems || '[]') || []) : []);

    const rawTotal = Math.abs(Number(s.total) || 0);
    const rawSubtotal = Math.abs(Number(s.subtotal) || rawTotal);
    const disc = Math.max(0, Number(s.discount) || 0);

    if (isRefundedTx) {
      // Standalone Return Voucher / Direct Return Transaction
      const returnItemsList: any[] = returnedArr.length > 0 ? returnedArr : (Array.isArray(s.items) ? s.items : []);
      let txRefundVal = rawTotal > 0 ? rawTotal : rawSubtotal;

      if (txRefundVal === 0 && returnItemsList.length > 0) {
        txRefundVal = returnItemsList.reduce((acc, it) => acc + Math.abs(Number(it.total || (it.price * it.quantity)) || 0), 0);
      }

      totalRefundsValue += txRefundVal;

      // Deduct cash from drawer for cash returns
      if (s.paymentMethod === 'cash' || !s.paymentMethod) {
        cashInHand -= txRefundVal;
      }

      // Calculate cost and profit reversed for each returned item
      returnItemsList.forEach(item => {
        const prod = products.find(p => p.id === item.productId || (p.barcode && item.barcode && p.barcode.trim() === item.barcode.trim()));
        const unitCost = getItemUnitCost(item, prod);
        const qty = Math.abs(Number(item.quantity) || 1);
        const itemTotalCost = unitCost * qty;
        const itemSellingVal = Math.abs(Number(item.total || (item.price * qty)) || 0);
        const itemProfit = itemSellingVal - itemTotalCost;

        returnedCogs += itemTotalCost;
        returnedProfits += itemProfit;
      });
    } else {
      // Regular Sale Transaction
      const itemsList: any[] = Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? (JSON.parse(s.items || '[]') || []) : []);
      
      // Calculate current cost and revenue of items present on invoice
      let currentItemsCost = 0;
      let currentItemsRevenue = 0;
      itemsList.forEach(item => {
        const prod = products.find(p => p.id === item.productId || (p.barcode && item.barcode && p.barcode.trim() === item.barcode.trim()));
        const unitCost = getItemUnitCost(item, prod);
        const qty = Number(item.quantity || 0);
        const itemRev = Number(item.total ?? (item.price * qty));
        currentItemsRevenue += itemRev;
        currentItemsCost += unitCost * qty;
      });

      // Partial returns that occurred on this specific invoice
      let partialRefundsVal = 0;
      let partialReturnCogs = 0;
      if (returnedArr.length > 0) {
        returnedArr.forEach(ret => {
          const prod = products.find(p => p.id === ret.productId || (p.barcode && ret.barcode && p.barcode.trim() === ret.barcode.trim()));
          const unitCost = getItemUnitCost(ret, prod);
          const qty = Math.abs(Number(ret.quantity) || 1);
          const retTotalCost = unitCost * qty;
          const retSellingVal = Math.abs(Number(ret.total || (ret.price * qty)) || 0);
          const retProfit = retSellingVal - retTotalCost;

          partialRefundsVal += retSellingVal;
          partialReturnCogs += retTotalCost;
          returnedCogs += retTotalCost;
          returnedProfits += retProfit;
        });
      }

      totalRefundsValue += partialRefundsVal;
      totalDiscounts += disc;

      // Detect whether s.items was already decremented by invoice returns (as in handleProcessInvoiceReturnItem)
      const itemsWereDecremented = (Math.abs(currentItemsRevenue - rawSubtotal) < 1 || rawSubtotal < (currentItemsRevenue + partialRefundsVal)) && partialRefundsVal > 0;
      if (itemsWereDecremented) {
        soldCogs += (currentItemsCost + partialReturnCogs);
        grossSales += (rawSubtotal > 0 ? rawSubtotal : currentItemsRevenue) + partialRefundsVal;
      } else {
        soldCogs += currentItemsCost;
        grossSales += (rawSubtotal > 0 ? rawSubtotal : currentItemsRevenue);
      }

      // Payment breakdown
      const netPaidForThisInvoice = Math.max(0, rawTotal - partialRefundsVal);
      if (s.paymentMethod === 'cash') {
        cashInHand += netPaidForThisInvoice;
      } else if (s.paymentMethod === 'card' || s.paymentMethod === 'nfc') {
        posCardTerminals += netPaidForThisInvoice;
      } else if (s.paymentMethod === 'loyalty') {
        loyaltyWalletSales += netPaidForThisInvoice;
      }
    }
  });

  const netSales = Math.max(0, grossSales - totalDiscounts - totalRefundsValue);
  const netCogs = Math.max(0, soldCogs - returnedCogs);
  // Net Gross Profit: Total sales profit MINUS the profits of returned items!
  const grossProfit = netSales - netCogs;
  const earnedProfit = grossProfit;
  const totalOperatingExpenses = opExpenseItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const netOperatingProfit = grossProfit - totalOperatingExpenses;

  return {
    grossSales,
    totalDiscounts,
    totalRefundsValue,
    netSales,
    cogs: netCogs,
    soldCogs,
    returnedCogs,
    returnedProfits,
    grossProfit,
    earnedProfit,
    totalOperatingExpenses,
    netOperatingProfit,
    cashInHand: Math.max(0, cashInHand),
    posCardTerminals,
    loyaltyWalletSales
  };
}
