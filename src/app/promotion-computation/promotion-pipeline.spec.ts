import { startOfDay, parseISO } from 'date-fns';
import { DateIntervalService } from '../date-interval.service';
import { PromotionComputationPipeline } from './promotion-pipeline';
import { BuildIntervalsStep } from './steps/build-intervals.step';
import { SelectActiveIntervalStep } from './steps/select-active.step';
import { AggregatePurchasesStep } from './steps/aggregate-purchases.step';
import { ComputeAvailableAmountStep } from './steps/compute-available.step';

// TDD: define expected behavior of pipeline replicating current PromotionModel logic

describe('PromotionComputationPipeline', () => {
  const dateSvc = new DateIntervalService();
  const pipeline = new PromotionComputationPipeline([
    new BuildIntervalsStep(dateSvc),
    new SelectActiveIntervalStep(),
    new AggregatePurchasesStep(),
    new ComputeAvailableAmountStep()
  ]);

  it('computes active interval, purchase aggregation and refund capping (monthly)', () => {
    const raw: any = {
      id: 999,
      title: 'Super Mes',
      payment_methods: [],
      discount: 25, // 25%
      limit: { amount: 20000, times: 'each', mode: 'user', period: 'month' }, // refund cap 20k
      validity: { from: '2025-09-01', to: '2025-09-30', days_of_week: [0,1,2,3,4,5,6] }
    };

    // Purchases inside September (should aggregate for monthly period)
    const purchases = [
      { id: 1, promoId: 999, amount: 10000, date: '2025-09-05', storeName: 'A', paymentMethod: 'X' },
      { id: 2, promoId: 999, amount: 50000, date: '2025-09-10', storeName: 'B', paymentMethod: 'Y' }
    ];

    const today = startOfDay(parseISO('2025-09-15'));

    const ctx = pipeline.run({ raw, today, purchases });

    expect(ctx.intervals.length).toBeGreaterThan(0);
    expect(ctx.activeInterval).toBeTruthy();
    // Total purchased month = 60000
    expect(ctx.activeInterval!.totalAmountPurchased).toBe(60000);
    // Raw refund = 60000 * 25% = 15000 <= 20000 => 15000
    expect(ctx.activeInterval!.totalAmountRefunded).toBe(15000);
    // Available amount to purchase = (limit.amount * 100 / discount) - totalPurchased
    const theoreticalMaxPurchase = raw.limit.amount * 100 / raw.discount; // 80000
    expect(theoreticalMaxPurchase).toBe(80000);
    expect(ctx.activeInterval!.availableAmountToPurchase).toBe(80000 - 60000);
  });
});
