// Mock promotions data so tests don't depend on real promotions.json contents
jest.mock('./data/promotions.json', () => [
    {
      id: 'b7f2c3d4-8a9e-4f1b-9023-5c7d8e9f0123',
      title: 'Shell',
      payment_methods: ['Modo / BNA+ / Crédito y Débito'],
      discount: 25,
      limit: { amount: 20000, times: 'each', mode: 'user', period: 'month' },
      validity: { from: '2024-08-09', to: '2025-09-30', days_of_week: [0,1,2,3,4,5,6] }
    },
    {
      id: 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
      title: 'Carnicerías DNI',
      payment_methods: ['Cta DNI / Crédito y Débito'],
      discount: 35,
      limit: { amount: 6000, times: 'each', mode: 'user', period: 'day' },
      validity: { from: '2025-09-01', to: '2025-09-30', specific_dates: ['2025-09-06','2025-09-20'] }
    }
]);

import { TestBed } from '@angular/core/testing';
import { PromotionsService } from './promotions.service';
import { ShoppingService } from './shopping.service';
import { ClockService } from './clock.service';

class FakeShoppingService {
  private purchasesByPromo: Record<string, any[]> = {};

  setPurchases(promoId: string, purchases: any[]) {
    this.purchasesByPromo[promoId] = purchases;
  }

  getPurchasesByPromoId(promoId: string) {
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
      const shellId = 'b7f2c3d4-8a9e-4f1b-9023-5c7d8e9f0123';
      const dniId = 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
      fakeShopping.setPurchases(shellId, [
        { id: 1, promoId: shellId, amount: 1000, date: '2025-09-03', storeName: 'S1', paymentMethod: 'Debit' },
        { id: 2, promoId: shellId, amount: 5000, date: '2025-09-10', storeName: 'S2', paymentMethod: 'Credit' }
      ]);
    });

    it('should include all promos and compute calculated fields', () => {
      const promos = service.getPromotions();

      // There should be at least the known ids from the JSON
  const shell = promos.find((p: any) => p.id === 'b7f2c3d4-8a9e-4f1b-9023-5c7d8e9f0123');
  const dni = promos.find((p: any) => p.id === 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f');

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
