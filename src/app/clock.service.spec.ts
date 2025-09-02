import { ClockService } from './clock.service';

describe('ClockService', () => {
  it('returns start of day for now', () => {
    const svc = new ClockService();
    const now = new Date();
    const today = svc.today();
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
    expect(today.getSeconds()).toBe(0);
    expect(today.getFullYear()).toBe(now.getFullYear());
    expect(today.getMonth()).toBe(now.getMonth());
    expect(today.getDate()).toBe(now.getDate());
  });
});
