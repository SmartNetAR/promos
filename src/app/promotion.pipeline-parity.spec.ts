import { startOfDay, parseISO } from 'date-fns';
import { DateIntervalService } from './date-interval.service';
import { PromotionModel } from './promotion.model';
import { PromotionComputationPipeline } from './promotion-computation/promotion-pipeline';
import { BuildIntervalsStep } from './promotion-computation/steps/build-intervals.step';
import { SelectActiveIntervalStep } from './promotion-computation/steps/select-active.step';
import { AggregatePurchasesStep } from './promotion-computation/steps/aggregate-purchases.step';
import { ComputeAvailableAmountStep } from './promotion-computation/steps/compute-available.step';

/**
 * Parity tests: ensure pipeline produces equivalent key figures to current PromotionModel implementation
 */

describe('PromotionModel vs Pipeline parity', () => {
  const dateSvc = new DateIntervalService();
  const pipeline = new PromotionComputationPipeline([
    new BuildIntervalsStep(dateSvc),
    new SelectActiveIntervalStep(),
    new AggregatePurchasesStep(),
    new ComputeAvailableAmountStep()
  ]);

  function buildRaw(overrides: any) {
    return {
  id: 'pipe-123',
      title: 'Parity Promo',
      payment_methods: [],
      discount: 25,
      limit: { amount: 20000, times: 'each', mode: 'user', period: 'month' },
      validity: { from: '2025-09-01', to: '2025-09-30', days_of_week: [0,1,2,3,4,5,6] },
      ...overrides
    };
  }

  it('monthly all-days: active interval metrics match', () => {
    const raw = buildRaw({});
    const purchases = [
  { id: 1, promoId: raw.id, amount: 10000, date: '2025-09-05', storeName: 'A', paymentMethod: 'x' },
  { id: 2, promoId: raw.id, amount: 50000, date: '2025-09-10', storeName: 'B', paymentMethod: 'y' }
    ];
    const today = startOfDay(parseISO('2025-09-15'));

    const model = new PromotionModel(raw, dateSvc, today, purchases);
    const ctx = pipeline.run({ raw, today, purchases });

    expect(model.activeDate).toBeTruthy();
    expect(ctx.activeInterval).toBeTruthy();
  expect(model.activeDate).not.toBeNull();
  expect(model.activeDate!.totalAmountPurchased).toBe(ctx.activeInterval!.totalAmountPurchased);
  expect(model.activeDate!.totalAmountRefunded).toBe(ctx.activeInterval!.totalAmountRefunded);
  expect(model.activeDate!.availableAmountToPurchase).toBe(ctx.activeInterval!.availableAmountToPurchase);
  });

  it('specific dates: active null parity', () => {
    const raw = buildRaw({ validity: { from: '2025-09-01', to: '2025-09-30', specific_dates: ['2025-09-06', '2025-09-20'] }, limit: { amount: 6000, times: 'each', mode: 'user', period: 'day' }, discount: 35 });
    const purchases: any[] = [];
    const today = startOfDay(parseISO('2025-09-13')); // between specific dates

    const model = new PromotionModel(raw, dateSvc, today, purchases);
    const ctx = pipeline.run({ raw, today, purchases });

    expect(model.activeDate).toBeNull();
    expect(ctx.activeInterval).toBeNull();
  });

  it('weekly multi-day grouping parity', () => {
    const raw = buildRaw({ validity: { from: '2025-09-01', to: '2025-09-30', days_of_week: [5,6] }, limit: { amount: 8000, times: 'each', mode: 'user', period: 'week' }, discount: 40 });
    const purchases = [
  { id: 1, promoId: raw.id, amount: 2000, date: '2025-09-06', storeName: 'A', paymentMethod: 'x' }
    ];
    const today = startOfDay(parseISO('2025-09-06')); // Saturday

    const model = new PromotionModel(raw, dateSvc, today, purchases);
    const ctx = pipeline.run({ raw, today, purchases });

    expect(model.activeDate).toBeTruthy();
    expect(ctx.activeInterval).toBeTruthy();
  expect(model.activeDate).not.toBeNull();
  expect(model.activeDate!.totalAmountPurchased).toBe(ctx.activeInterval!.totalAmountPurchased);
  });
});
