import { DiscountEngineService } from './discount-engine.service';
import { ExtraPercentageStackStrategy } from './extra-percentage.strategy';

/**
 * Integration style test: simulate adding stacked purchase and ensure breakdown + final amount.
 */

describe('DiscountEngineService integration (stacked purchase)', () => {
  const engine = new DiscountEngineService([new ExtraPercentageStackStrategy()]);

  it('computes stacked discount and final amount', () => {
  const supermarket = { id: 'int-10', discount: 25, limit: { amount: 20000, period: 'month', mode: 'user' }, stacking: { stackable: true } };
  const modoExtra = { id: 'int-11', discount: 10, limit: { amount: 5000, period: 'week', mode: 'user' }, stacking: { stackable: true, type: 'extra' } };

    const amount = 40000;
    const result = engine.calculate(amount, [supermarket, modoExtra]);

  // Paralelo sobre total: 25% => 10000 (<= 20000), 10% => 4000 (<= 5000) total 14000 final 26000
    expect(result.totalDiscount).toBe(14000);
    expect(result.finalAmount).toBe(26000);
  expect(result.breakdown.find(b => b.promoId === 'int-10')?.discountValue).toBe(10000);
  expect(result.breakdown.find(b => b.promoId === 'int-11')?.discountValue).toBe(4000);
  });
});
