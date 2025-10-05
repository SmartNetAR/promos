import { DiscountEngineService } from './discount-engine.service';
import { ExtraPercentageStackStrategy } from './extra-percentage.strategy';
import { SequentialStackStrategy } from './sequential.strategy';

/**
 * Tests for minimum purchase thresholds.
 */
describe('DiscountEngineService minimum purchase', () => {
  const engine = new DiscountEngineService([ new ExtraPercentageStackStrategy(), new SequentialStackStrategy() ]);

  const vea = { id: 'min-vea', discount: 25, limit: { amount: 10000, period: 'month', mode: 'payment_methods' }, stacking: { stackable: true, type: 'base' }, minAmount: 20000 } as any;
  const modo = { id: 'min-modo', discount: 10, limit: { amount: 6000, period: 'month', mode: 'user' }, stacking: { stackable: true, type: 'extra', appliesWith: ['min-vea'] }, minAmount: 40000 } as any;

  it('excludes single promo discount when below its minimum', () => {
    const res = engine.calculate(15000, [vea]);
    expect(res.totalDiscount).toBe(0);
    expect(res.breakdown.length).toBe(0);
    expect(res.finalAmount).toBe(15000);
  });

  it('applies single promo exactly at minimum', () => {
    const res = engine.calculate(20000, [vea]);
    // 25% of 20000 = 5000 but capped at 10000 -> 5000
    expect(res.totalDiscount).toBe(5000);
    expect(res.finalAmount).toBe(15000);
  });

  it('excludes extra when below its minimum but applies base', () => {
    const res = engine.calculate(30000, [vea, modo]);
    // amount >= vea.min (20000) but < modo.min (40000) so only vea applies
    // 25% of 30000 = 7500 (<=10000)
    expect(res.breakdown.length).toBe(1);
    expect(res.totalDiscount).toBe(7500);
    expect(res.finalAmount).toBe(22500);
  });

  it('applies both when meeting both minimums', () => {
    const res = engine.calculate(50000, [vea, modo]);
    // vea 25% of 50000 = 12500 capped 10000
    // modo 10% of 50000 = 5000 capped 6000
    expect(res.breakdown.length).toBe(2);
    expect(res.totalDiscount).toBe(15000);
    expect(res.finalAmount).toBe(35000);
  });
});
