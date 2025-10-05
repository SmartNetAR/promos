import { ExtraPercentageStackStrategy } from './extra-percentage.strategy';
import { DiscountEngineService } from './discount-engine.service';

describe('DiscountEngineService (stacking initial)', () => {
  it('applies base supermarket promo + extra Modo 10%', () => {
    const engine = new DiscountEngineService([ new ExtraPercentageStackStrategy() ]);
    const amount = 10000; // compra

    const supermercado = {
  id: 'deng-100',
      discount: 25,
      limit: { amount: 20000, period: 'month', mode: 'user' },
      stacking: { stackable: true }
    };
    const extraModo = {
  id: 'deng-200',
      discount: 10,
      limit: { amount: 5000, period: 'week', mode: 'user' },
      stacking: { stackable: true, type: 'extra' }
    };

    const result = engine.calculate(amount, [supermercado, extraModo]);

    // Supermercado: 25% de 10000 = 2500 (<= 20000)
    // Extra Modo: 10% de 10000 = 1000 (<= 5000)
    // Total descuento = 3500
    expect(result.totalDiscount).toBe(3500);
    expect(result.finalAmount).toBe(6500);
    expect(result.breakdown.length).toBe(2);
  });
});
