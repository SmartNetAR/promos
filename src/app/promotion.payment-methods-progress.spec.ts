import { startOfDay, parseISO } from 'date-fns';
import { DateIntervalService } from './date-interval.service';
import { PromotionModel } from './promotion.model';
import { PromotionComputationPipeline } from './promotion-computation/promotion-pipeline';
import { BuildIntervalsStep } from './promotion-computation/steps/build-intervals.step';
import { SelectActiveIntervalStep } from './promotion-computation/steps/select-active.step';
import { AggregatePurchasesStep } from './promotion-computation/steps/aggregate-purchases.step';
import { ComputeAvailableAmountStep } from './promotion-computation/steps/compute-available.step';
import { PromotionComponent } from './promotion/promotion.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';

/**
 * Ensures that for mode=payment_methods the availableAmountToPurchase sums remaining per method
 * and progress bar reflects average consumption instead of single-method full usage.
 */

describe('Promotion payment_methods progress & availability', () => {
  const dateSvc = new DateIntervalService();
  const pipeline = new PromotionComputationPipeline([
    new BuildIntervalsStep(dateSvc),
    new SelectActiveIntervalStep(),
    new AggregatePurchasesStep(),
    new ComputeAvailableAmountStep()
  ]);

  const raw: any = {
    id: 6,
    title: 'Supermercados Modo Bancos',
    discount: 25,
    payment_methods: [
      'Modo / BNA+ / Crédito y Débito',
      'Modo / Galicia / Crédito y Débito'
    ],
    limit: { amount: 10000, times: 'each', mode: 'payment_methods', period: 'week' },
    validity: { from: '2025-07-04', to: '2025-10-31', days_of_week: [5,6] }
  };

  function purch(id: number, date: string, amount: number, method: string) {
    return { id, promoId: raw.id, amount, date, storeName: 'Store', paymentMethod: method };
  }

  it('computes remaining purchase capacity as sum of per-method remaining', () => {
    // One purchase hitting the cap for first method: purchase amount to reach refund cap of 10k at 25% is 40k.
    const purchases = [purch(1, '2025-07-05', 40000, raw.payment_methods[0])];
    const today = startOfDay(parseISO('2025-07-05'));
    const ctx = pipeline.run({ raw, today, purchases });
    expect(ctx.activeInterval).toBeTruthy();
    // First method fully consumed: remaining purchase for first = 0. Second method untouched: remaining purchase = 40k.
    expect(ctx.activeInterval!.availableAmountToPurchase).toBe(40000);
  });

  it('progress bar average reflects 50% when one of two methods is fully used', async () => {
    const purchases = [purch(1, '2025-07-05', 40000, raw.payment_methods[0])];
    const today = startOfDay(parseISO('2025-07-05'));
    const model = new PromotionModel(raw, dateSvc, today, purchases);

    await TestBed.configureTestingModule({ imports: [PromotionComponent] }).compileComponents();
    const fixture: ComponentFixture<PromotionComponent> = TestBed.createComponent(PromotionComponent);
    const component = fixture.componentInstance;
    component.promotion = model as any;
    fixture.detectChanges();
    const pct = component.availableProgress();
    expect(pct).toBe(50); // One of two methods consumed
  });
});
