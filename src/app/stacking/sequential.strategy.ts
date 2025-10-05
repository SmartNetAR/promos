import { DiscountStrategy, PromotionLike, DiscountResult } from '../discount-strategy';

/**
 * Parallel-over-total strategy (updated):
 * Business rule: Extra (stackable) promociones se calculan siempre sobre el total de la compra.
 * Para 2+ promociones stackables (1 base + N extras) cada descuento se calcula de forma independiente sobre el
 * importe original, respetando el tope de cada promo. El descuento total es la suma (clamp al monto para no dejar negativo).
 * El breakdown refleja baseApplied = amount para todas.
 */
export class SequentialStackStrategy implements DiscountStrategy {
  supports(promos: PromotionLike[]): boolean {
    return promos.length >= 2 && promos.every(p => p.stacking?.stackable);
  }

  calculate(amount: number, promos: PromotionLike[]): DiscountResult {
    const ordered = [...promos].sort((a,b) => (a.stacking?.priority ?? 1000) - (b.stacking?.priority ?? 1000));
    const breakdown = ordered.map(p => {
      const rawDiscount = amount * (p.discount / 100);
      const cap = p.limit?.amount;
      const discountValue = (cap === 0) ? rawDiscount : Math.min(rawDiscount, cap);
      return { promoId: p.id as string, percent: p.discount, baseApplied: amount, discountValue, limitAmount: cap };
    });
    let totalDiscount = breakdown.reduce((a,b) => a + b.discountValue, 0);
    if (totalDiscount > amount) {
      // Scale down proportionally (rare edge case) to avoid negative final amount
      const factor = amount / totalDiscount;
      totalDiscount = 0;
      breakdown.forEach(b => { b.discountValue = Math.floor(b.discountValue * factor); totalDiscount += b.discountValue; });
    }
    return { totalDiscount, finalAmount: amount - totalDiscount, breakdown };
  }
}