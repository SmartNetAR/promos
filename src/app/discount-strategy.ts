export interface DiscountBreakdown {
  promoId: string; // GUID
  percent: number;
  baseApplied: number;
  discountValue: number;
  limitAmount: number;
}

export interface DiscountResult {
  totalDiscount: number;
  finalAmount: number;
  breakdown: DiscountBreakdown[];
}

export interface PromotionLike {
  id: string; // GUID
  title?: string;
  discount: number; // percentage
  limit: { amount: number; period: string; mode: string };
  minAmount?: number; // optional minimum purchase to qualify
  stacking?: {
    stackable: boolean;
    type?: string; // e.g. 'extra'
    priority?: number;
    appliesWith?: number[]; // list of promo ids it can combine with
  };
}

export interface DiscountStrategy {
  supports(promos: PromotionLike[]): boolean;
  calculate(amount: number, promos: PromotionLike[]): DiscountResult;
}

// Helper to clamp discount by limit (limit interpreted as max refund amount)
export function computeDiscountForPromotion(amount: number, promo: PromotionLike) {
  const raw = amount * (promo.discount / 100);
  const cap = promo.limit?.amount;
  // Interpret cap === 0 as 'sin tope' (unlimited refund)
  if (cap === 0) return raw;
  return Math.min(raw, cap);
}
