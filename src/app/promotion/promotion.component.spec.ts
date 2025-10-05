import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromotionComponent } from './promotion.component';

describe('PromotionComponent', () => {
  let component: PromotionComponent;
  let fixture: ComponentFixture<PromotionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromotionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PromotionComponent);
    component = fixture.componentInstance;
    // Provide minimal input required by template
    component.promotion = {
      id: 'promo-test-1',
      title: 'Test Promo',
      payment_methods: [],
      discount: 10,
      limit: { amount: 1000 },
      calculatedPurchaseAmount: 1000,
      activeDate: null,
      futureDates: [],
      pastDates: [
        { from: new Date('2025-01-01'), to: new Date('2025-01-02'), purchases: [] }
      ]
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('legacy progress uses purchase proportion', () => {
    component.promotion = {
      discount: 25,
      limit: { amount: 20000 },
      calculatedPurchaseAmount: 80000,
      activeDate: { totalAmountPurchased: 20000, totalAmountRefunded: 5000 }
    };
    const pct = component.availableProgress();
    expect(pct).toBe(25); // 20k / 80k
  });

  it('totalCap progress uses refund proportion, not raw purchase', () => {
    component.promotion = {
      discount: 20,
      limit: { amount: 1000, totalCap: 5000 },
      // calculatedPurchaseAmount would be per-purchase theoretical (5000) but not used for totalCap progress
      calculatedPurchaseAmount: 5000,
      activeDate: { totalAmountPurchased: 12000, totalAmountRefunded: 1000 }
    };
    const pct = component.availableProgress();
    expect(pct).toBe(20); // 1000 / 5000
  });
});
