import { Product, ProductBatch } from '../types';
import { parseDate } from './dateUtils';

export interface BatchSaleAllocation {
  batchNumber?: string;
  expiryDate: string;
  allocatedQty: number;
  remainingInBatchAfter: number;
  isEarliest: boolean;
}

export interface ProductExpirySummary {
  hasExpiry: boolean;
  earliestExpiryDate?: string;
  earliestBatch?: ProductBatch;
  newerBatches: ProductBatch[];
  hasMultipleBatches: boolean;
  totalActiveStock: number;
  daysUntilExpiry?: number;
  isExpired: boolean;
  isNearExpiry: boolean; // <= 90 days
  isUrgentExpiry: boolean; // <= 30 days
  alertMessageAr?: string;
  alertMessageKu?: string;
  alertMessageEn?: string;
  // Dynamic cart-aware properties
  cartQtyInPieces: number;
  takenFromEarliest: number;
  remainingInEarliest: number;
  takenFromNewer: number;
  remainingInNewer: number;
  remainingTotalActiveStock: number;
  isEarliestExhausted: boolean;
}

/**
 * Computes a comprehensive breakdown of product expiration dates and active batches
 * according to the FEFO (First-Expired, First-Out) rule with real-time cart allocation.
 */
export function getProductExpirySummary(product: Product, cartQtyInPieces: number = 0): ProductExpirySummary {
  const batches: ProductBatch[] = Array.isArray(product.batches) ? product.batches : [];
  
  // Active batches with stock > 0
  const activeBatches = batches
    .filter(b => b.quantity > 0 && b.expiryDate && b.expiryDate.trim() !== '' && b.expiryDate !== 'N/A')
    .sort((a, b) => {
      const dateA = parseDate(a.expiryDate).getTime();
      const dateB = parseDate(b.expiryDate).getTime();
      return dateA - dateB;
    });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const cartQty = Math.max(0, cartQtyInPieces || 0);

  if (activeBatches.length > 0) {
    const earliestBatch = activeBatches[0];
    const newerBatches = activeBatches.slice(1);
    const earliestDate = parseDate(earliestBatch.expiryDate);
    const diffTime = earliestDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isExpired = daysUntil < 0;
    const isUrgentExpiry = daysUntil >= 0 && daysUntil <= 30;
    const isNearExpiry = daysUntil >= 0 && daysUntil <= 90;
    const hasMultipleBatches = newerBatches.length > 0;
    const totalActiveStock = activeBatches.reduce((sum, b) => sum + b.quantity, 0);

    // Calculate dynamic deduction from earliest and newer batches based on cart qty
    const takenFromEarliest = Math.min(earliestBatch.quantity, cartQty);
    const remainingInEarliest = Math.max(0, earliestBatch.quantity - takenFromEarliest);
    const isEarliestExhausted = earliestBatch.quantity > 0 && remainingInEarliest === 0 && cartQty > 0;

    const remainingForNewer = Math.max(0, cartQty - takenFromEarliest);
    const nextBatch = newerBatches[0];
    const takenFromNewer = nextBatch ? Math.min(nextBatch.quantity, remainingForNewer) : 0;
    const remainingInNewer = nextBatch ? Math.max(0, nextBatch.quantity - takenFromNewer) : 0;
    const remainingTotalActiveStock = Math.max(0, totalActiveStock - cartQty);

    let alertAr = '';
    let alertKu = '';
    let alertEn = '';

    if (hasMultipleBatches) {
      if (cartQty === 0) {
        alertAr = `يوجد عدد (${earliestBatch.quantity}) من المواد بتاريخ قديم (${earliestBatch.expiryDate})، يرجى بيع تلك المادة قبل بيع المادة بالتاريخ الجديد (${nextBatch.expiryDate})`;
        alertKu = `بڕی (${earliestBatch.quantity}) دانە بە بەرواری کۆن هەیە (${earliestBatch.expiryDate})، تکایە ئەو کاڵایە بفرۆشە پێش فرۆشتنی کاڵای بەروار نوێ (${nextBatch.expiryDate})`;
        alertEn = `There are (${earliestBatch.quantity}) pcs with older expiry date (${earliestBatch.expiryDate}), please sell that item before selling the newer date batch (${nextBatch.expiryDate})`;
      } else if (cartQty > 0 && remainingInEarliest > 0) {
        alertAr = `⚠️ يوجد عدد (${earliestBatch.quantity}) بتاريخ قديم (${earliestBatch.expiryDate}) [تم خصم ${takenFromEarliest} في السلة • المتبقي: ${remainingInEarliest} ق]، يرجى بيعها أولاً قبل التاريخ الجديد (${nextBatch.expiryDate})`;
        alertKu = `⚠️ بڕی (${earliestBatch.quantity}) دانە بە بەرواری کۆن هەیە (${earliestBatch.expiryDate}) [لە سەبەتەدا ${takenFromEarliest} دانەی لێبڕدراوە • ${remainingInEarliest} دانە ماوە]، تکایە سەرەتا ئەوە تەواو بکە پێش بەروار نوێ (${nextBatch.expiryDate})`;
        alertEn = `⚠️ There are (${earliestBatch.quantity}) pcs with older date (${earliestBatch.expiryDate}) [In cart: ${takenFromEarliest} • Remaining: ${remainingInEarliest} pcs], please sell it before newer date (${nextBatch.expiryDate})`;
      } else if (cartQty > 0 && remainingInEarliest === 0 && takenFromNewer === 0) {
        alertAr = `✅ تم استيفاء كامل كمية الدفعة القديمة (${earliestBatch.quantity} قطعة) في هذه السلة! أي زيادة تالية ستُسحب من التاريخ الجديد (${nextBatch.expiryDate})`;
        alertKu = `✅ تەواوی بڕی بەروارە کۆنەکە (${earliestBatch.quantity} دانە) لەم سەبەتەیە کێشرا! هەر زیادکردنێکی تر لە بەروارە نوێیەکە دەبڕدرێت (${nextBatch.expiryDate})`;
        alertEn = `✅ All older batch qty (${earliestBatch.quantity} pcs) allocated to this cart! Next additions will be deducted from newer date (${nextBatch.expiryDate})`;
      } else {
        alertAr = `⚡ تم خصم (${takenFromEarliest}) ق من التاريخ القديم (${earliestBatch.expiryDate}) [نفذت الدفعة القديمة] + خصم (${takenFromNewer}) ق من التاريخ الجديد (${nextBatch.expiryDate}) [المتبقي من الجديد: ${remainingInNewer} ق]`;
        alertKu = `⚡ بڕی (${takenFromEarliest}) دانە لە بەرواری کۆن بڕدرا (${earliestBatch.expiryDate}) [تەواوبوو] + بڕی (${takenFromNewer}) دانە لە بەرواری نوێ بڕدرا (${nextBatch.expiryDate}) [لە نوێیەکە ${remainingInNewer} دانە ماوە]`;
        alertEn = `⚡ Deducted (${takenFromEarliest}) pcs from older date (${earliestBatch.expiryDate}) [Old batch exhausted] + (${takenFromNewer}) pcs from newer date (${nextBatch.expiryDate}) [New batch remaining: ${remainingInNewer} pcs]`;
      }
    } else if (isExpired) {
      alertAr = `⛔ منتهي الصلاحية بتاريخ (${earliestBatch.expiryDate})!`;
      alertKu = `⛔ بەسەرچووە لە بەرواری (${earliestBatch.expiryDate})!`;
      alertEn = `⛔ Expired on (${earliestBatch.expiryDate})!`;
    } else if (isUrgentExpiry || isNearExpiry) {
      if (cartQty > 0) {
        alertAr = `⚠️ ينتهي قريباً (${earliestBatch.expiryDate} - متبقي ${daysUntil} يوم) [الرصيد الأصلي: ${earliestBatch.quantity} • في السلة: ${cartQty} • المتبقي بالمخزن: ${remainingInEarliest} ق]`;
        alertKu = `⚠️ بەرواری نزیکە (${earliestBatch.expiryDate} - ${daysUntil} ڕۆژ ماوە) [بڕی سەرەتا: ${earliestBatch.quantity} • لە سەبەتە: ${cartQty} • ماوە لە کۆگا: ${remainingInEarliest} دانە]`;
        alertEn = `⚠️ Near expiry (${earliestBatch.expiryDate} - ${daysUntil}d left) [Initial: ${earliestBatch.quantity} • In cart: ${cartQty} • Remaining: ${remainingInEarliest} pcs]`;
      } else {
        alertAr = `⚠️ يوجد عدد (${earliestBatch.quantity}) بتاريخ انتهاء قريب (${earliestBatch.expiryDate} - متبقي ${daysUntil} يوم)، يرجى بيع تلك المادة أولاً`;
        alertKu = `⚠️ بڕی (${earliestBatch.quantity}) دانە بە بەرواری نزیک لە بەسەرچوون هەیە (${earliestBatch.expiryDate} - ${daysUntil} ڕۆژ ماوە)، تکایە سەرەتا ئەو کاڵایە بفرۆشە`;
        alertEn = `⚠️ There are (${earliestBatch.quantity}) pcs near expiry (${earliestBatch.expiryDate} - ${daysUntil} days left), please sell that item first`;
      }
    } else {
      if (cartQty > 0) {
        alertAr = `تاريخ الصلاحية: (${earliestBatch.expiryDate}) - المتبقي: (${remainingInEarliest} قطعة) [في السلة: ${cartQty}]`;
        alertKu = `بەرواری بەسەرچوون: (${earliestBatch.expiryDate}) - ماوە لە کۆگا: (${remainingInEarliest} دانە) [لە سەبەتەدا: ${cartQty}]`;
        alertEn = `Expiry: (${earliestBatch.expiryDate}) - Remaining: (${remainingInEarliest} pcs) [In cart: ${cartQty}]`;
      } else {
        alertAr = `تاريخ الصلاحية: (${earliestBatch.expiryDate}) - الرصيد: (${earliestBatch.quantity} قطعة)`;
        alertKu = `بەرواری بەسەرچوون: (${earliestBatch.expiryDate}) - بڕی بەردەست: (${earliestBatch.quantity} دانە)`;
        alertEn = `Expiry: (${earliestBatch.expiryDate}) - Stock: (${earliestBatch.quantity} pcs)`;
      }
    }

    return {
      hasExpiry: true,
      earliestExpiryDate: earliestBatch.expiryDate,
      earliestBatch,
      newerBatches,
      hasMultipleBatches,
      totalActiveStock,
      daysUntilExpiry: daysUntil,
      isExpired,
      isNearExpiry,
      isUrgentExpiry,
      alertMessageAr: alertAr,
      alertMessageKu: alertKu,
      alertMessageEn: alertEn,
      cartQtyInPieces: cartQty,
      takenFromEarliest,
      remainingInEarliest,
      takenFromNewer,
      remainingInNewer,
      remainingTotalActiveStock,
      isEarliestExhausted
    };
  }

  // If no active batches in array, fallback to product.expiryDate
  if (product.expiryDate && product.expiryDate.trim() !== '' && product.expiryDate !== 'N/A') {
    const expDate = parseDate(product.expiryDate);
    const diffTime = expDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isExpired = daysUntil < 0;
    const isUrgentExpiry = daysUntil >= 0 && daysUntil <= 30;
    const isNearExpiry = daysUntil >= 0 && daysUntil <= 90;
    const totalActiveStock = product.stock;
    const takenFromEarliest = Math.min(product.stock, cartQty);
    const remainingInEarliest = Math.max(0, product.stock - takenFromEarliest);
    const isEarliestExhausted = product.stock > 0 && remainingInEarliest === 0 && cartQty > 0;

    let alertAr = '';
    let alertKu = '';
    let alertEn = '';

    if (isExpired) {
      alertAr = `⛔ منتهي الصلاحية بتاريخ (${product.expiryDate})!`;
      alertKu = `⛔ بەسەرچووە لە بەرواری (${product.expiryDate})!`;
      alertEn = `⛔ Expired on (${product.expiryDate})!`;
    } else if (isUrgentExpiry || isNearExpiry) {
      if (cartQty > 0) {
        alertAr = `⚠️ ينتهي قريباً (${product.expiryDate} - متبقي ${daysUntil} يوم) [الرصيد الأصلي: ${product.stock} • في السلة: ${cartQty} • المتبقي بالمخزن: ${remainingInEarliest} ق]`;
        alertKu = `⚠️ بەرواری نزیکە (${product.expiryDate} - ${daysUntil} ڕۆژ ماوە) [بڕی سەرەتا: ${product.stock} • لە سەبەتە: ${cartQty} • ماوە لە کۆگا: ${remainingInEarliest} دانە]`;
        alertEn = `⚠️ Near expiry (${product.expiryDate} - ${daysUntil}d left) [Initial: ${product.stock} • In cart: ${cartQty} • Remaining: ${remainingInEarliest} pcs]`;
      } else {
        alertAr = `⚠️ يوجد عدد (${product.stock}) بتاريخ انتهاء قريب (${product.expiryDate} - متبقي ${daysUntil} يوم)، يرجى بيع تلك المادة أولاً`;
        alertKu = `⚠️ بڕی (${product.stock}) دانە بە بەرواری نزیک لە بەسەرچوون هەیە (${product.expiryDate} - ${daysUntil} ڕۆژ ماوە)، تکایە سەرەتا ئەو کاڵایە بفرۆشە`;
        alertEn = `⚠️ There are (${product.stock}) pcs near expiry (${product.expiryDate} - ${daysUntil} days left), please sell that item first`;
      }
    } else {
      if (cartQty > 0) {
        alertAr = `تاريخ الصلاحية: (${product.expiryDate}) - المتبقي: (${remainingInEarliest} قطعة) [في السلة: ${cartQty}]`;
        alertKu = `بەرواری بەسەرچوون: (${product.expiryDate}) - ماوە لە کۆگا: (${remainingInEarliest} دانە) [لە سەبەتەدا: ${cartQty}]`;
        alertEn = `Expiry: (${product.expiryDate}) - Remaining: (${remainingInEarliest} pcs) [In cart: ${cartQty}]`;
      } else {
        alertAr = `تاريخ الصلاحية: (${product.expiryDate}) - الرصيد: (${product.stock} قطعة)`;
        alertKu = `بەرواری بەسەرچوون: (${product.expiryDate}) - بڕی بەردەست: (${product.stock} دانە)`;
        alertEn = `Expiry: (${product.expiryDate}) - Stock: (${product.stock} pcs)`;
      }
    }

    return {
      hasExpiry: true,
      earliestExpiryDate: product.expiryDate,
      newerBatches: [],
      hasMultipleBatches: false,
      totalActiveStock,
      daysUntilExpiry: daysUntil,
      isExpired,
      isNearExpiry,
      isUrgentExpiry,
      alertMessageAr: alertAr,
      alertMessageKu: alertKu,
      alertMessageEn: alertEn,
      cartQtyInPieces: cartQty,
      takenFromEarliest,
      remainingInEarliest,
      takenFromNewer: 0,
      remainingInNewer: 0,
      remainingTotalActiveStock: remainingInEarliest,
      isEarliestExhausted
    };
  }

  return {
    hasExpiry: false,
    newerBatches: [],
    hasMultipleBatches: false,
    totalActiveStock: product.stock,
    isExpired: false,
    isNearExpiry: false,
    isUrgentExpiry: false,
    cartQtyInPieces: cartQty,
    takenFromEarliest: 0,
    remainingInEarliest: 0,
    takenFromNewer: 0,
    remainingInNewer: 0,
    remainingTotalActiveStock: product.stock,
    isEarliestExhausted: false
  };
}

/**
 * Computes how a sale quantity will be distributed across batches (FEFO)
 */
export function calculateBatchAllocations(product: Product, totalPieces: number): BatchSaleAllocation[] {
  const batches: ProductBatch[] = Array.isArray(product.batches) ? product.batches : [];
  const activeBatches = batches
    .filter(b => b.quantity > 0)
    .sort((a, b) => {
      const dateA = parseDate(a.expiryDate).getTime();
      const dateB = parseDate(b.expiryDate).getTime();
      return dateA - dateB;
    });

  if (activeBatches.length === 0) {
    if (product.expiryDate) {
      return [{
        batchNumber: product.batchNumber,
        expiryDate: product.expiryDate,
        allocatedQty: totalPieces,
        remainingInBatchAfter: Math.max(0, product.stock - totalPieces),
        isEarliest: true
      }];
    }
    return [];
  }

  let remaining = totalPieces;
  const allocations: BatchSaleAllocation[] = [];

  for (let i = 0; i < activeBatches.length; i++) {
    const b = activeBatches[i];
    if (remaining <= 0) break;

    const qtyFromThisBatch = Math.min(b.quantity, remaining);
    allocations.push({
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      allocatedQty: qtyFromThisBatch,
      remainingInBatchAfter: b.quantity - qtyFromThisBatch,
      isEarliest: i === 0
    });
    remaining -= qtyFromThisBatch;
  }

  // If pieces remain beyond all registered batches (overdraft)
  if (remaining > 0 && allocations.length > 0) {
    allocations[allocations.length - 1].allocatedQty += remaining;
    allocations[allocations.length - 1].remainingInBatchAfter -= remaining;
  }

  return allocations;
}

/**
 * Deducts stock from batches following FEFO logic and returns the updated batch array
 * and updated effective primary expiry date for the product.
 */
export function deductProductBatchesFEFO(product: Product, totalPiecesToDeduct: number): {
  updatedBatches: ProductBatch[];
  newEffectiveExpiry: string;
} {
  const batches: ProductBatch[] = Array.isArray(product.batches) ? [...product.batches] : [];

  if (batches.length === 0) {
    return {
      updatedBatches: [],
      newEffectiveExpiry: product.expiryDate || ''
    };
  }

  // Sort batches ascending by expiry date (earliest first)
  const sorted = [...batches].sort((a, b) => {
    if (!a.expiryDate || a.expiryDate === 'N/A') return 1;
    if (!b.expiryDate || b.expiryDate === 'N/A') return -1;
    return parseDate(a.expiryDate).getTime() - parseDate(b.expiryDate).getTime();
  });

  let remainingToDeduct = totalPiecesToDeduct;
  const updatedBatches = sorted.map(batch => {
    if (remainingToDeduct <= 0) return { ...batch };
    if (batch.quantity <= remainingToDeduct) {
      remainingToDeduct -= batch.quantity;
      return { ...batch, quantity: 0 };
    } else {
      const newQty = batch.quantity - remainingToDeduct;
      remainingToDeduct = 0;
      return { ...batch, quantity: newQty };
    }
  });

  // Handle overdraft if user sold more than batch stock
  if (remainingToDeduct > 0 && updatedBatches.length > 0) {
    const last = updatedBatches[updatedBatches.length - 1];
    last.quantity -= remainingToDeduct;
  }

  // Find new earliest active batch with quantity > 0
  const activeRemaining = updatedBatches.filter(b => b.quantity > 0 && b.expiryDate && b.expiryDate !== 'N/A');
  const newEffectiveExpiry = activeRemaining.length > 0 
    ? activeRemaining[0].expiryDate 
    : (product.expiryDate || '');

  return {
    updatedBatches,
    newEffectiveExpiry
  };
}
