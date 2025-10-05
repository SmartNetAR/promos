import { SequentialStackStrategy } from './sequential.strategy';

describe('SequentialStackStrategy', () => {
  const strategy = new SequentialStackStrategy();

  it('applies each discount sobre el total (paralelo) respetando prioridad solo para orden de breakdown', () => {
    const promos: any[] = [
  { id: 'seq-1', discount: 10, limit: { amount: 99999, period: 'month', mode: 'user' }, stacking: { stackable: true, priority: 200 } },
  { id: 'seq-2', discount: 20, limit: { amount: 99999, period: 'month', mode: 'user' }, stacking: { stackable: true, priority: 100 } },
  { id: 'seq-3', discount: 30, limit: { amount: 99999, period: 'month', mode: 'user' }, stacking: { stackable: true, priority: 300 } }
    ];
    expect(strategy.supports(promos)).toBe(true);
    const amount = 10000;
    const result = strategy.calculate(amount, promos);
  // Orden por prioridad (menor priority value primero): seq-2 (100), seq-1 (200), seq-3 (300)
  expect(result.breakdown.map(b=>b.promoId)).toEqual(['seq-2','seq-1','seq-3']);
    // Cada baseApplied es el total original
    result.breakdown.forEach(b => expect(b.baseApplied).toBe(amount));
    // Descuentos individuales
    const d2 = amount * 0.20;
    const d1 = amount * 0.10;
    const d3 = amount * 0.30;
    expect(result.breakdown[0].discountValue).toBe(d2);
    expect(result.breakdown[1].discountValue).toBe(d1);
    expect(result.breakdown[2].discountValue).toBe(d3);
    expect(result.totalDiscount).toBe(d1 + d2 + d3);
    expect(result.finalAmount).toBe(amount - (d1 + d2 + d3));
  });
});