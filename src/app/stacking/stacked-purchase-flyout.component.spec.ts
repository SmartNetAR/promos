import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StackedPurchaseFlyoutComponent } from './stacked-purchase-flyout.component';

const basePromo = (over: any = {}) => ({
  id: 'fly-base-1',
  title: 'Banco XYZ',
  discount: 30,
  limit: { amount: 10000 },
  stacking: { type: 'base' },
  payment_methods: ['Visa'] ,
  activeDate: { from: new Date(), to: new Date(Date.now()+86400000) }
, ...over});

const extraPromo = (id: string, over: any = {}) => ({
  id,
  title: 'Extra '+id,
  discount: 10,
  limit: { amount: 5000 },
  stacking: { type: 'extra', appliesWith: ['fly-base-1'] },
  payment_methods: ['Visa','Master'] ,
  activeDate: { from: new Date(), to: new Date(Date.now()+86400000) }
, ...over});

describe('StackedPurchaseFlyoutComponent', () => {
  let component: StackedPurchaseFlyoutComponent;
  let fixture: ComponentFixture<StackedPurchaseFlyoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StackedPurchaseFlyoutComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(StackedPurchaseFlyoutComponent);
    component = fixture.componentInstance;
  });

  it('computes single promo discount breakdown', () => {
    component.promotions = [basePromo({ discount: 20, limit: { amount: 1000 } })];
    component.open = true;
    fixture.detectChanges();
    component.amount = 5000; // discount cap 1000
    component.recalc();
    expect(component.totalDiscount).toBe(1000); // capped
    expect(component.finalAmount).toBe(4000);
    expect(component.breakdown.length).toBe(1);
  });


  it('shows stacked breakdown for multiple promos', () => {
  component.promotions = [basePromo(), extraPromo('fly-extra-2')];
    component.amount = 10000;
    component.recalc();
    expect(component.breakdown.length).toBeGreaterThan(0);
    expect(component.finalAmount).toBeLessThan(10000);
  });

  it('disables submit when single promo amount below min', () => {
    component.promotions = [basePromo({ minAmount: 20000 })];
    component.open = true;
    fixture.detectChanges();
    component.amount = 15000; // below min
    component.storeName = 'Store';
    component.paymentMethod = 'Visa';
    component.recalc();
    expect(component.canSubmit()).toBe(false);
    component.amount = 20000; // meets min
    component.recalc();
    fixture.detectChanges();
    expect(component.canSubmit()).toBe(true);
  });

  it('allows submit when at least one stacked promo meets minimum', () => {
    const base = basePromo({ minAmount: 10000 });
  const extra = extraPromo('fly-extra-2', { minAmount: 40000 });
    component.promotions = [base, extra];
    component.amount = 15000; // meets base, not extra
    component.storeName = 'S';
    component.paymentMethod = 'Visa';
    component.recalc();
    // now should allow because at least base applies
    expect(component.canSubmit()).toBe(true);
    component.amount = 40000; // now meets both
    component.recalc();
    fixture.detectChanges();
    expect(component.canSubmit()).toBe(true);
  });

  it('marks unmet promos rows with row-unmet class', () => {
  const withMin = basePromo({ id: 'fly-min-5', minAmount: 20000 });
    component.promotions = [withMin];
    component.amount = 0;
    component.open = true;
    fixture.detectChanges();
    component.recalc();
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('tbody tr');
    expect(row.classList.contains('row-unmet')).toBe(true);
    component.amount = 25000; // satisfies min
    component.recalc();
    fixture.detectChanges();
    const updatedRow = fixture.nativeElement.querySelector('tbody tr');
    expect(updatedRow.classList.contains('row-unmet')).toBe(false);
  });
});
