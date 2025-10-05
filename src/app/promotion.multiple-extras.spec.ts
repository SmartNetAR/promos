import { PromotionModel } from './promotion.model';
import { DateIntervalService } from './date-interval.service';
import { startOfDay, parseISO } from 'date-fns';

function m(raw: any) { return new PromotionModel(raw, new DateIntervalService(), startOfDay(parseISO('2025-10-04')), []); }

describe('Multiple extras with one base policy', () => {
  const base = m({ id: 'base-X', title: 'Base', discount: 10, limit: { amount: 1000, period: 'month', mode: 'user' }, validity: { from: '2025-10-01', to: '2025-10-31', days_of_week: [0,1,2,3,4,5,6] }, stacking: { stackable: true, type: 'base' } });
  const extraA = m({ id: 'extra-A', title: 'Extra A', discount: 5, limit: { amount: 500, period: 'week', mode: 'user' }, validity: { from: '2025-10-01', to: '2025-10-31', days_of_week: [0,1,2,3,4,5,6] }, stacking: { stackable: true, type: 'extra', appliesWith: ['base-X'] } });
  const extraB = m({ id: 'extra-B', title: 'Extra B', discount: 6, limit: { amount: 600, period: 'week', mode: 'user' }, validity: { from: '2025-10-01', to: '2025-10-31', days_of_week: [0,1,2,3,4,5,6] }, stacking: { stackable: true, type: 'extra', appliesWith: ['base-X'] } });

  it('base with extraA allowed', () => {
    expect(base.canStackWith(extraA)).toBe(true);
  });

  it('extraA with base allowed', () => {
    expect(extraA.canStackWith(base)).toBe(true);
  });

  it('extraA with extraB disallowed directly (needs base context)', () => {
    expect(extraA.canStackWith(extraB)).toBe(false);
  });
});