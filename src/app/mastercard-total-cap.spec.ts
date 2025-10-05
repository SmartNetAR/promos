import { startOfDay, parseISO } from 'date-fns';
import { DateIntervalService } from './date-interval.service';
import { PromotionComputationPipeline } from './promotion-computation/promotion-pipeline';
import { BuildIntervalsStep } from './promotion-computation/steps/build-intervals.step';
import { SelectActiveIntervalStep } from './promotion-computation/steps/select-active.step';
import { AggregatePurchasesStep } from './promotion-computation/steps/aggregate-purchases.step';
import { ComputeAvailableAmountStep } from './promotion-computation/steps/compute-available.step';
import { PromotionModel } from './promotion.model';

/**
 * Tests for promotion with per-purchase cap (limit.amount) and aggregate cap (limit.totalCap)
 */

describe('Mastercard totalCap logic', () => {
  const dateSvc = new DateIntervalService();
  const pipeline = new PromotionComputationPipeline([
    new BuildIntervalsStep(dateSvc),
    new SelectActiveIntervalStep(),
    new AggregatePurchasesStep(),
    new ComputeAvailableAmountStep()
  ]);

  const raw: any = {
  id: 'mc-oct',
    title: 'Mastercard especial Octubre',
    payment_methods: ['Modo / Crédito y Débito'],
    discount: 20,
    limit: { amount: 1000, totalCap: 5000, times: 'each', mode: 'user', period: 'month' },
    validity: { from: '2025-10-01', to: '2025-10-31', days_of_week: [0,1,2,3,4,5,6] },
  stacking: { stackable: true, type: 'extra', appliesWith: ['f6a7b8c9-d0e1-4234-b567-8f9a0b1c2d3e','b8c9d0e1-f2a3-4456-d789-a0b1c2d3e4f5','e1f2a3b4-c5d6-4789-a01c-d3e4f5061728'] }
  };

  function buildPurchase(id: number, date: string, amount: number) {
    return { id, promoId: raw.id, amount, date, storeName: 'Tienda', paymentMethod: 'Modo' };
  }

  it('caps refund per purchase at 1000 and aggregate at 5000', () => {
    // Five large purchases each big enough to exceed per-purchase refund cap
    const purchases = [
      buildPurchase(1, '2025-10-02', 10000),
      buildPurchase(2, '2025-10-05', 8000),
      buildPurchase(3, '2025-10-10', 12000),
      buildPurchase(4, '2025-10-15', 15000),
      buildPurchase(5, '2025-10-20', 9000)
    ];
    const today = startOfDay(parseISO('2025-10-21'));

    const ctx = pipeline.run({ raw, today, purchases });
    expect(ctx.activeInterval).toBeTruthy();
    // Each purchase refund would be min(amount*20%, 1000) => 1000 each (all amounts >= 5000 required for 1000 refund)
    expect(ctx.activeInterval!.totalAmountRefunded).toBe(5000); // aggregate cap reached
    expect(ctx.activeInterval!.availableAmountToPurchase).toBe(0); // no refund capacity left
  });

  it('partially fills aggregate cap and computes remaining purchase capacity based on effective refunded portion', () => {
    // First purchase large (refund capped at 1000), second small such that refund < per-purchase cap
    const purchases = [
      buildPurchase(1, '2025-10-02', 15000), // refund 1000 (cap)
      buildPurchase(2, '2025-10-05', 2000)   // refund 400 (20% of 2000)
    ];
    const today = startOfDay(parseISO('2025-10-06'));
    const ctx = pipeline.run({ raw, today, purchases });
    expect(ctx.activeInterval).toBeTruthy();
    expect(ctx.activeInterval!.totalAmountRefunded).toBe(1400);
    // Max eligible aggregate purchase for refunds = totalCap *100 / discount = 5000*100/20 = 25000
    // Effective purchase contributing to refund: first purchase counts only up to 5000 (for 1000 refund), second counts full 2000 => 7000 used
    // Remaining purchase capacity that can still generate refund = 25000 - 7000 = 18000 (>0)
    expect(ctx.activeInterval!.availableAmountToPurchase).toBe(18000);
  });

  it('parity: PromotionModel exposes updated metrics (pipeline invoked internally)', () => {
    const purchases = [
      buildPurchase(1, '2025-10-02', 15000),
      buildPurchase(2, '2025-10-05', 2000)
    ];
    const today = startOfDay(parseISO('2025-10-06'));
    const model = new PromotionModel(raw, dateSvc, today, purchases);
    expect(model.activeDate).toBeTruthy();
    expect(model.activeDate!.totalAmountRefunded).toBe(1400);
    expect(model.activeDate!.availableAmountToPurchase).toBe(18000);
  });
});
