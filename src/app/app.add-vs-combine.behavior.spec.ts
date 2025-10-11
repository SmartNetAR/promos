import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { SelectionService } from './selection.service';
import { PromotionsService } from './promotions.service';
import { DateIntervalService } from './date-interval.service';
import { PromotionModel } from './promotion.model';
import { ClockService } from './clock.service';
import { ShoppingService } from './shopping.service';
import { FavouritesService } from './favourites.service';
import { BehaviorSubject } from 'rxjs';
import { PreferencesService } from './preferences.service';
import { PromotionsRegistryService } from './promotions-registry.service';

// This test ensures that clicking "Agregar compra" (openPurchaseForm via child output)
// when a promotion is ya seleccionada (checkbox) junto a otras, abre el flyout
// con todo el set combinado (mismo comportamiento que el botón Combinar).

describe('Add vs Combine unified behavior', () => {
  let selection: SelectionService;
  let promotionsService: PromotionsService;

  class FakeClockService { today() { return new Date('2025-09-15T00:00:00Z'); } }
  class FakeShoppingService { getPurchasesByPromoId() { return []; } }
  class FakeFavsService {
    favourites$ = new BehaviorSubject<Set<string>>(new Set());
    has() { return false; }
  }
  class FakePrefsService {
    state$ = new BehaviorSubject({ filter: 'all', text: 'normal' });
  }
  class FakeRegistry {
    private list: any[] = [];
    private map = new Map<string, any>();
    register(l: any[]) { this.list = l; this.map = new Map(l.map(p => [String(p.id), p])); }
    getAll() { return this.list; }
    get(id: string) { return this.map.get(String(id)); }
  }
  class FakeDateIntervalService {
    getValidDates(from: Date, to: Date, validity: any) {
      if (validity.specific_dates) {
        return validity.specific_dates.map((d: string) => ({ from: d, to: d }));
      }
      return [{ from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) }];
    }
    getPurchasesByInterval() { return []; }
  }

  class FakePromotionsService {
    private raw = [
      {
        id: 'base1', title: 'Base Promo', discount: 20,
        payment_methods: ['Visa'], limit: { amount: 10000, mode: 'user', times: 'each', period: 'month' },
        validity: { from: '2025-09-01', to: '2025-12-31', days_of_week: [0,1,2,3,4,5,6] },
        stacking: { stackable: true, type: 'base' },
        activeDate: null, futureDates: [], pastDates: [{ from: '2025-08-01', to: '2025-08-31', purchases: [] }]
      },
      {
        id: 'extra1', title: 'Extra Promo', discount: 10,
        payment_methods: ['Visa'], limit: { amount: 5000, mode: 'user', times: 'each', period: 'month' },
        validity: { from: '2025-09-01', to: '2025-12-31', days_of_week: [0,1,2,3,4,5,6] },
        stacking: { stackable: true, type: 'extra', appliesWith: ['base1'] },
        activeDate: null, futureDates: [], pastDates: [{ from: '2025-08-01', to: '2025-08-31', purchases: [] }]
      },
      {
        id: 'base2', title: 'Second Base', discount: 25,
        payment_methods: ['Visa'], limit: { amount: 15000, mode: 'user', times: 'each', period: 'month' },
        validity: { from: '2025-09-01', to: '2025-12-31', days_of_week: [0,1,2,3,4,5,6] },
        stacking: { stackable: true, type: 'base' },
        activeDate: null, futureDates: [], pastDates: [{ from: '2025-08-01', to: '2025-08-31', purchases: [] }]
      }
    ];
    private mapped: any[] | null = null;
    private mapAll(): any[] {
      if (this.mapped) return this.mapped;
      const dateSvc = new FakeDateIntervalService();
      const clock = new FakeClockService();
      const shopping = new FakeShoppingService();
      const favs = new FakeFavsService();
      this.mapped = this.raw.map(r => new PromotionModel(r, dateSvc as any, clock.today(), []));
      return this.mapped;
    }
    getPromotions() { return this.mapAll(); }
    getPromotions$() { return of(this.mapAll()); }
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: PromotionsService, useClass: FakePromotionsService },
        { provide: DateIntervalService, useClass: FakeDateIntervalService },
        { provide: ClockService, useClass: FakeClockService },
        { provide: ShoppingService, useClass: FakeShoppingService },
        { provide: FavouritesService, useClass: FakeFavsService },
        { provide: PromotionsRegistryService, useClass: FakeRegistry },
        { provide: PreferencesService, useClass: FakePrefsService }
      ]
    }).compileComponents();
    selection = TestBed.inject(SelectionService);
    promotionsService = TestBed.inject(PromotionsService);
  });

  it('should keep existing compatible selection when adding purchase from one of them', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const comp = fixture.componentInstance as AppComponent & { openPurchaseForm: Function };
    fixture.detectChanges();
    // Allow subscription microtask to run
    tick();
    const base = comp.promotions.find((p: any) => p?.stacking?.type === 'base');
    const extra = comp.promotions.find((p: any) => p?.stacking?.type === 'extra' && (!p.stacking.appliesWith || p.stacking.appliesWith.includes(base?.id)));
    expect(base && extra).toBeTruthy();
    selection.toggle(String(base.id));
    selection.toggle(String(extra.id));
    fixture.detectChanges();
    comp.openPurchaseForm(extra, extra.payment_methods[0]);
    fixture.detectChanges();
    const ids = comp.selectedPromotions.map(p => p.id).sort();
    expect(ids).toContain(base.id);
    expect(ids).toContain(extra.id);
    expect(comp.stackFlyoutOpen).toBe(true);
  }));

  it('should replace incompatible previous selection', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance as AppComponent & { openPurchaseForm: Function };
    const promos = comp.promotions;
    const bases = promos.filter((p: any) => p?.stacking?.type === 'base');
    expect(bases.length).toBeGreaterThanOrEqual(2);
    selection.toggle(String(bases[0].id));
    fixture.detectChanges();
    comp.openPurchaseForm(bases[1], bases[1].payment_methods[0] || 'Metodo');
    fixture.detectChanges();
    expect(comp.selectedPromotions.length).toBe(1);
    expect(comp.selectedPromotions[0].id).toBe(bases[1].id);
  });
});
