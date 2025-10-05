import { startOfDay, parseISO } from 'date-fns';
import { DateIntervalService } from './date-interval.service';
import { PromotionComputationPipeline } from './promotion-computation/promotion-pipeline';
import { BuildIntervalsStep } from './promotion-computation/steps/build-intervals.step';
import { SelectActiveIntervalStep } from './promotion-computation/steps/select-active.step';
import { AggregatePurchasesStep } from './promotion-computation/steps/aggregate-purchases.step';
import { ComputeAvailableAmountStep } from './promotion-computation/steps/compute-available.step';

/**
 * Validate perMethod fallback for single payment method promotions.
 */

describe('Single payment method perMethod fallback', () => {
  const dateSvc = new DateIntervalService();
  const pipeline = new PromotionComputationPipeline([
    new BuildIntervalsStep(dateSvc),
    new SelectActiveIntervalStep(),
    new AggregatePurchasesStep(),
    new ComputeAvailableAmountStep()
  ]);

  const raw: any = {
    id: 42,
    title: 'Banco Único',
    discount: 20,
    payment_methods: ['Modo / XYZ / Crédito'],
    limit: { amount: 8000, times: 'each', mode: 'user', period: 'month' },
    validity: { from: '2025-10-01', to: '2025-10-31', days_of_week: [0,1,2,3,4,5,6] }
  };

  it('builds perMethod array with single method stats', () => {
    // A purchase large enough to cap refund: refund cap = 8000 => purchase cap = 8000*100/20 = 40000
    const purchases = [ { id: 1, promoId: raw.id, amount: 20000, date: '2025-10-05', storeName: 'Store', paymentMethod: raw.payment_methods[0] } ];
    const today = startOfDay(parseISO('2025-10-10'));
    const ctx = pipeline.run({ raw, today, purchases });
    expect(ctx.activeInterval).toBeTruthy();
    const perMethod = (ctx.activeInterval as any).perMethod;
    expect(perMethod).toBeTruthy();
    expect(perMethod.length).toBe(1);
    expect(perMethod[0].method).toBe(raw.payment_methods[0]);
    expect(perMethod[0].purchased).toBe(20000);
    // refund = 20% of 20000 = 4000 < 8000 cap
    expect(perMethod[0].refund).toBe(4000);
    expect(perMethod[0].usageFraction).toBeCloseTo(4000/8000);
  });
});
