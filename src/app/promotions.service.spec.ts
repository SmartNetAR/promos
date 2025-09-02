import { TestBed } from '@angular/core/testing';
import { PromotionsService } from './promotions.service';
import { ShoppingService } from './shopping.service';
import { ClockService } from './clock.service';

class FakeShoppingService {
  private purchasesByPromo: Record<number, any[]> = {};

  setPurchases(promoId: number, purchases: any[]) {
    this.purchasesByPromo[promoId] = purchases;
  }

  getPurchasesByPromoId(promoId: number) {
    return this.purchasesByPromo[promoId] ?? [];
  }
}

class FakeClockService {
  private _today = new Date('2025-09-15T00:00:00Z');
  set(dateIso: string) { this._today = new Date(dateIso); }
  today() { return this._today; }
}

describe('PromotionsService', () => {
  let service: PromotionsService;
  let fakeShopping: FakeShoppingService;
  let fakeClock: FakeClockService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PromotionsService,
        { provide: ShoppingService, useClass: FakeShoppingService },
        { provide: ClockService, useClass: FakeClockService }
      ]
    });
    service = TestBed.inject(PromotionsService);
    fakeShopping = TestBed.inject(ShoppingService) as unknown as FakeShoppingService;
    fakeClock = TestBed.inject(ClockService) as unknown as FakeClockService;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  afterEach(() => { });

  describe('getPromotions mapping', () => {
    beforeEach(() => {
      fakeClock.set('2025-09-15T00:00:00Z');
      // Provide some purchases for promo id 2 (Shell, monthly, all days)
      fakeShopping.setPurchases(2, [
        { id: 1, promoId: 2, amount: 1000, date: '2025-09-03', storeName: 'S1', paymentMethod: 'Debit' },
        { id: 2, promoId: 2, amount: 5000, date: '2025-09-10', storeName: 'S2', paymentMethod: 'Credit' }
      ]);
    });

    it('should include all promos and compute calculated fields', () => {
      const promos = service.getPromotions();

      // There should be at least the known ids from the JSON
      const shell = promos.find((p: any) => p.id === 2);
      const dni = promos.find((p: any) => p.id === 3);

      expect(shell).toBeTruthy();
      expect(dni).toBeTruthy();

      // Shell promo assertions
      const shellPromo = shell!;
      expect(shellPromo.calculatedPurchaseAmount).toBe(20000 * 100 / 25);

      // Active month of Sep 2025 should aggregate purchases of the whole month
      expect(shellPromo.activeDate).toBeTruthy();
      expect(shellPromo.activeDate.totalAmountPurchased).toBe(6000);
      expect(shellPromo.activeDate.totalAmountRefunded).toBe(1500);
      expect(shellPromo.activeDate.availableAmountToPurchase).toBe(80000 - 6000);

      // DNI specific dates: on Sep 15, no active date, 1 past (Sep 6) and 1 future (Sep 20)
      const dniPromo = dni!;
      expect(dniPromo.activeDate).toBeNull();
      const dniPast = dniPromo.pastDates;
      const dniFuture = dniPromo.futureDates;
      expect(dniPast.length).toBeGreaterThanOrEqual(1);
      expect(dniFuture.length).toBeGreaterThanOrEqual(1);
      // Ensure ordering with respect to mocked today
      const allPastBeforeToday = dniPast.every((d: any) => new Date(d.to) < new Date('2025-09-15'));
      const allFutureAfterToday = dniFuture.every((d: any) => new Date(d.from) > new Date('2025-09-15'));
      expect(allPastBeforeToday).toBe(true);
      expect(allFutureAfterToday).toBe(true);
    });
  });
});
