import { parseISO, startOfDay } from 'date-fns';
import { PromotionComputationStep, PromotionPipelineContext } from '../promotion-pipeline';
import { DateIntervalService } from '../../date-interval.service';

export class BuildIntervalsStep implements PromotionComputationStep {
  constructor(private readonly dateSvc: DateIntervalService) {}
  run(ctx: PromotionPipelineContext): PromotionPipelineContext {
    const raw = ctx.input.raw;
    const fromDate = parseISO(raw.validity.from);
    const toDate = parseISO(raw.validity.to);
    const intervals = this.dateSvc.getValidDates(fromDate, toDate, raw.validity, raw.limit.period)
      .map(d => ({ from: startOfDay(parseISO(d.from)), to: startOfDay(parseISO(d.to)) }));
    return { ...ctx, intervals };
  }
}
