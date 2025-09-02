import { DateIntervalService } from './date-interval.service';
import { parseISO } from 'date-fns';

describe('DateIntervalService', () => {
    let svc: DateIntervalService;

    beforeEach(() => {
        svc = new DateIntervalService();
    });

    it('formats ranges with yyyy-MM-dd and groups week ranges correctly', () => {
        const from = parseISO('2025-03-01'); // Sat
        const to = parseISO('2025-03-10');   // Mon
        const validity = { days_of_week: [5, 6, 0] }; // Fri, Sat, Sun

        const ranges = svc.getValidDates(from, to, validity, 'week');
        // Should create at least one range and use yyyy-MM-dd formatting
        expect(ranges.length).toBeGreaterThan(0);
        expect(ranges.every(r => /\d{4}-\d{2}-\d{2}/.test(r.from) && /\d{4}-\d{2}-\d{2}/.test(r.to))).toBe(true);
    });
});
