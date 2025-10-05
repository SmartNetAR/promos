import { parseISO, startOfDay } from 'date-fns';
import { PromotionComputationStep, PromotionPipelineContext } from '../promotion-pipeline';

export class AggregatePurchasesStep implements PromotionComputationStep {
  run(ctx: PromotionPipelineContext): PromotionPipelineContext {
  if (!ctx.activeInterval) return ctx;
  const active = ctx.activeInterval; // non-null local reference
  const purchases = ctx.input.purchases.map(p => ({ ...p, date: startOfDay(parseISO(p.date)) }));

  // Monthly period requires aggregating over whole month rather than just interval
  const period = ctx.input.raw.limit.period;
  let relevant = purchases.filter(p => p.date >= active.from && p.date <= active.to);
  // Exclude purchases that don't meet minAmount (they shouldn't count towards totals or appear)
  const minAmount = ctx.input.raw.minAmount as number | undefined;
  if (minAmount) {
    relevant = relevant.filter(p => p.amount >= minAmount);
  }
    if (period === 'month') {
      // expand filter to entire month of today
      const today = ctx.input.today;
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      relevant = purchases.filter(p => p.date >= monthStart && p.date <= monthEnd);
      if (minAmount) {
        relevant = relevant.filter(p => p.amount >= minAmount);
      }
    }
    const total = relevant.reduce((a, b) => a + b.amount, 0);
  const activeInterval = { ...active, purchases: relevant, totalAmountPurchased: total };
    return { ...ctx, activeInterval };
  }
}
