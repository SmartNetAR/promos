import { ExtraPercentageStackStrategy } from './extra-percentage.strategy';
import { DiscountEngineService } from './discount-engine.service';

describe('Stacking IDs integrity (GUID strings)', () => {
  it('returns breakdown with the exact string promoIds (no numeric coercion)', () => {
    const engine = new DiscountEngineService([ new ExtraPercentageStackStrategy() ]);
    const amount = 10000;
    const baseId = 'base-guid-test-1234';
    const extraId = 'extra-guid-test-5678';
    const base = {
      id: baseId,
      discount: 20,
      limit: { amount: 5000, period: 'month', mode: 'user' },
      stacking: { stackable: true, type: 'base' }
    } as any;
    const extra = {
      id: extraId,
      discount: 10,
      limit: { amount: 3000, period: 'month', mode: 'user' },
      stacking: { stackable: true, type: 'extra', appliesWith: [baseId] }
    } as any;

    const result = engine.calculate(amount, [base, extra]);
    expect(result.breakdown.length).toBe(2);
    const ids = result.breakdown.map(b => b.promoId).sort();
    expect(ids).toEqual([baseId, extraId].sort());
    ids.forEach(id => expect(typeof id).toBe('string'));
    // Validate discount math: base 20% of 10k = 2000 (<=5000), extra 10% of 10k = 1000 (<=3000)
    expect(result.totalDiscount).toBe(3000);
    expect(result.finalAmount).toBe(7000);
  });
});
