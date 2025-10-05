import { PromotionModel } from './promotion.model';
import { DateIntervalService } from './date-interval.service';
import { startOfDay, parseISO } from 'date-fns';

function model(raw: any): PromotionModel {
  const svc = new DateIntervalService();
  const today = startOfDay(parseISO('2025-10-04'));
  return new PromotionModel(raw, svc, today, []);
}

describe('Promotion stacking compatibility (unidirectional extra appliesWith)', () => {
  const base6 = model({ id: 'base-6', title: 'Base 6', discount: 10, limit: { amount: 1000, period: 'month', mode: 'user' }, validity: { from: '2025-10-01', to: '2025-10-31', days_of_week: [0,1,2,3,4,5,6] }, stacking: { stackable: true, type: 'base' } });
  const base8 = model({ id: 'base-8', title: 'Base 8', discount: 12, limit: { amount: 1000, period: 'month', mode: 'user' }, validity: { from: '2025-10-01', to: '2025-10-31', days_of_week: [0,1,2,3,4,5,6] }, stacking: { stackable: true, type: 'base' } });
  const extra9 = model({ id: 'extra-9', title: 'Extra 9', discount: 5, limit: { amount: 500, period: 'week', mode: 'user' }, validity: { from: '2025-10-01', to: '2025-10-31', days_of_week: [0,1,2,3,4,5,6] }, stacking: { stackable: true, type: 'extra', appliesWith: ['base-6'] } });
  const extra10 = model({ id: 'extra-10', title: 'Extra 10', discount: 5, limit: { amount: 600, period: 'month', mode: 'user' }, validity: { from: '2025-10-01', to: '2025-10-31', days_of_week: [0,1,2,3,4,5,6] }, stacking: { stackable: true, type: 'extra', appliesWith: ['base-8'] } });

  it('base+base => false', () => {
    expect(base6.canStackWith(base8)).toBe(false);
  });

  it('extra with listed base => true (directional data)', () => {
    expect(extra9.canStackWith(base6)).toBe(true);
    expect(base6.canStackWith(extra9)).toBe(true); // symmetric by logic though only extra lists
  });

  it('extra with non-listed base => false', () => {
    expect(extra9.canStackWith(base8)).toBe(false);
  });

  it('extra+extra => false', () => {
    expect(extra9.canStackWith(extra10)).toBe(false);
  });
});