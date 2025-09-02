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
      id: 1,
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
});
