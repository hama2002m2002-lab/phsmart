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
    // Cost of 1 carton
    if (prod.cartonPurchasePrice && prod.cartonPurchasePrice > 0) {
      return prod.cartonPurchasePrice;
    }
    const unitsPerCarton = prod.unitsPerCarton && prod.unitsPerCarton > 0 ? prod.unitsPerCarton : 1;
    const baseCost = prod.costPerUnit || prod.cost || 0;
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
