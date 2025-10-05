import { DiscountStrategy, PromotionLike, DiscountResult, computeDiscountForPromotion } from '../discount-strategy';

/**
 * Strategy: one promo marked as 'extra' (stackable) adds its discount on top of exactly one base promo.
 * Simplification step 1: amount is applied fully to both; each respects its own refund limit.
 */
export class ExtraPercentageStackStrategy implements DiscountStrategy {
  supports(promos: PromotionLike[]): boolean {
    if (promos.length !== 2) return false;
    const extra = promos.find(p => p.stacking?.stackable && p.stacking?.type === 'extra');
    return !!extra;
  }

  calculate(amount: number, promos: PromotionLike[]): DiscountResult {
    const breakdown = promos.map(p => {
      const discountValue = computeDiscountForPromotion(amount, p);
      return {
        promoId: p.id,
        percent: p.discount,
        baseApplied: amount,
        discountValue,
        limitAmount: p.limit.amount
      };
    });
    const totalDiscount = breakdown.reduce((a, b) => a + b.discountValue, 0);
    return {
      totalDiscount,
      finalAmount: amount - totalDiscount,
      breakdown
    };
  }
}
