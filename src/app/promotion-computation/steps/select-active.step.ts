import { isWithinInterval } from 'date-fns';
import { PromotionComputationStep, PromotionPipelineContext } from '../promotion-pipeline';

export class SelectActiveIntervalStep implements PromotionComputationStep {
  run(ctx: PromotionPipelineContext): PromotionPipelineContext {
    const today = ctx.input.today;
    const active = ctx.intervals.find(iv => isWithinInterval(today, { start: iv.from, end: iv.to }));
    if (!active) return { ...ctx, activeInterval: null };
    return { ...ctx, activeInterval: { ...active, purchases: [], totalAmountPurchased: 0, totalAmountRefunded: 0, availableAmountToPurchase: 0 } };
  }
}
