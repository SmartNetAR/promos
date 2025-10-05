import { DiscountStrategy, PromotionLike, DiscountResult } from '../discount-strategy';

export class DiscountEngineService {
  constructor(private readonly strategies: DiscountStrategy[]) {}

  calculate(amount: number, promos: PromotionLike[]): DiscountResult {
    if (!promos.length) {
      return { totalDiscount: 0, finalAmount: amount, breakdown: [] };
    }
    // Filter out promos that don't meet their minimum purchase requirement
    const applicable = promos.filter(p => (p.minAmount == null) || amount >= p.minAmount!);
    if (!applicable.length) {
      return { totalDiscount: 0, finalAmount: amount, breakdown: [] };
    }
  // Try strategies in the order they were registered that claim support.
  const strategy = this.strategies.find(s => s.supports(applicable));
    if (!strategy) {
      // fallback: apply best single discount (highest absolute discount respecting limit)
      const best = applicable
        .map(p => ({ p, value: (p.limit?.amount === 0) ? (amount * (p.discount / 100)) : Math.min(amount * (p.discount / 100), p.limit.amount) }))
        .sort((a, b) => b.value - a.value)[0];
      if (!best) return { totalDiscount: 0, finalAmount: amount, breakdown: [] };
      return {
        totalDiscount: best.value,
        finalAmount: amount - best.value,
  breakdown: [{ promoId: best.p.id as string, percent: best.p.discount, baseApplied: amount, discountValue: best.value, limitAmount: best.p.limit.amount }]
      };
    }
    return strategy.calculate(amount, applicable);
  }
}
