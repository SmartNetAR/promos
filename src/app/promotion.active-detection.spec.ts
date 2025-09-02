import { startOfDay, parseISO } from 'date-fns';
import { DateIntervalService } from './date-interval.service';
import { PromotionModel } from './promotion.model';

describe('Promotion active detection (generic cases)', () => {
  const dateSvc = new DateIntervalService();

  function buildModel(validity: any, todayIso: string, period: 'day' | 'week' | 'month' | 'year' = 'week') {
    const promo: any = {
      id: 0,
      title: 'Test Promo',
      payment_methods: [],
      discount: 10,
      limit: { amount: 1000, times: 'each', mode: 'user', period },
      validity
    };

    const today = startOfDay(parseISO(todayIso));
    return new PromotionModel(promo, dateSvc, today, []);
  }

  it('is active on Monday when valid range includes today and day_of_week = [1]', () => {
    const model = buildModel(
      { from: '2025-08-15', to: '2025-09-30', days_of_week: [1] },
      '2025-09-01',
      'week'
    );
    expect(model.activeDate).not.toBeNull();
  });

  it('is not active on Tuesday when only Monday is allowed in the range', () => {
    const model = buildModel(
      { from: '2025-08-15', to: '2025-09-30', days_of_week: [1] },
      '2025-09-02',
      'week'
    );
    expect(model.activeDate).toBeNull();
  });

  it('is active on Friday and Saturday when days_of_week = [5,6] (multi-day weekly)', () => {
    const validity = { from: '2025-07-01', to: '2025-09-30', days_of_week: [5, 6] };
    const friday = buildModel(validity, '2025-09-05', 'week');
    const saturday = buildModel(validity, '2025-09-06', 'week');
    const sunday = buildModel(validity, '2025-09-07', 'week');

    expect(friday.activeDate).not.toBeNull();
    expect(saturday.activeDate).not.toBeNull();
    expect(sunday.activeDate).toBeNull();
  });

  it('is active only on specific_dates provided', () => {
    const validity = { from: '2025-09-01', to: '2025-09-30', specific_dates: ['2025-09-06', '2025-09-20'] };
    const onFirst = buildModel(validity, '2025-09-06', 'day');
    const between = buildModel(validity, '2025-09-13', 'day');
    const onSecond = buildModel(validity, '2025-09-20', 'day');

    expect(onFirst.activeDate).not.toBeNull();
    expect(between.activeDate).toBeNull();
    expect(onSecond.activeDate).not.toBeNull();
  });

  it('is active any day within the month when days_of_week = all and period = month', () => {
    const allWeek = [0, 1, 2, 3, 4, 5, 6];
    const validity = { from: '2025-09-01', to: '2025-09-30', days_of_week: allWeek };
    const model = buildModel(validity, '2025-09-15', 'month');
    expect(model.activeDate).not.toBeNull();
  });

  it('is not active when today is outside the validity date range', () => {
    const model = buildModel(
      { from: '2025-07-01', to: '2025-07-31', days_of_week: [1] },
      '2025-09-01',
      'week'
    );
    expect(model.activeDate).toBeNull();
  });

  it('is active on any day within a short window when period = day and all days allowed', () => {
    const allWeek = [0, 1, 2, 3, 4, 5, 6];
    const validity = { from: '2025-09-10', to: '2025-09-12', days_of_week: allWeek };
    const mid = buildModel(validity, '2025-09-11', 'day');
    const out = buildModel(validity, '2025-09-13', 'day');
    expect(mid.activeDate).not.toBeNull();
    expect(out.activeDate).toBeNull();
  });

  it('splits by month when period = month; activeDate.to ends at month boundary inside range', () => {
    const allWeek = [0, 1, 2, 3, 4, 5, 6];
    const validity = { from: '2025-08-20', to: '2025-10-05', days_of_week: allWeek };
    const sep = buildModel(validity, '2025-09-10', 'month');
    expect(sep.activeDate).not.toBeNull();
    expect(sep.activeDate.to.toISOString().slice(0, 10)).toBe('2025-09-30');
  });

  it('for the last partial month, activeDate.to stops at the validity upper bound', () => {
    const allWeek = [0, 1, 2, 3, 4, 5, 6];
    const validity = { from: '2025-08-20', to: '2025-10-05', days_of_week: allWeek };
    const oct = buildModel(validity, '2025-10-01', 'month');
    expect(oct.activeDate).not.toBeNull();
    expect(oct.activeDate.to.toISOString().slice(0, 10)).toBe('2025-10-05');
  });

  it('period=week with weekend [5,6,0] groups Fri-Sun; activeDate.from/to bound the weekend', () => {
    const validity = { from: '2025-09-01', to: '2025-09-30', days_of_week: [5, 6, 0] };
    const sat = buildModel(validity, '2025-09-06', 'week');
    expect(sat.activeDate).not.toBeNull();
    expect(sat.activeDate.from.toISOString().slice(0, 10)).toBe('2025-09-05');
    expect(sat.activeDate.to.toISOString().slice(0, 10)).toBe('2025-09-07');
  });

  it('period=week with single day [3]=Wednesday yields one-day interval', () => {
    const validity = { from: '2025-09-01', to: '2025-09-30', days_of_week: [3] };
    const wed = buildModel(validity, '2025-09-03', 'week');
    expect(wed.activeDate).not.toBeNull();
    const d = wed.activeDate.from.toISOString().slice(0, 10);
    expect(d).toBe('2025-09-03');
    expect(wed.activeDate.to.toISOString().slice(0, 10)).toBe('2025-09-03');
  });

  it('period=week with all days returns a single full-range interval', () => {
    const allWeek = [0, 1, 2, 3, 4, 5, 6];
    const validity = { from: '2025-09-01', to: '2025-09-10', days_of_week: allWeek };
    const any = buildModel(validity, '2025-09-05', 'week');
    expect(any.activeDate).not.toBeNull();
    expect(any.activeDate.from.toISOString().slice(0, 10)).toBe('2025-09-01');
    expect(any.activeDate.to.toISOString().slice(0, 10)).toBe('2025-09-10');
  });

  it('period=week weekend across month boundary (Aug 29-31) still groups correctly', () => {
    const validity = { from: '2025-08-25', to: '2025-09-10', days_of_week: [5, 6, 0] };
    const fri = buildModel(validity, '2025-08-29', 'week');
    expect(fri.activeDate).not.toBeNull();
    expect(fri.activeDate.from.toISOString().slice(0, 10)).toBe('2025-08-29');
    expect(fri.activeDate.to.toISOString().slice(0, 10)).toBe('2025-08-31');
  });
});
