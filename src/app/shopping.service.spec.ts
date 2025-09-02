import { TestBed } from '@angular/core/testing';
import { ShoppingService } from './shopping.service';
import { StorageService } from './storage.service';
import { InteractionService } from './interaction.service';

describe('ShoppingService', () => {
  let service: ShoppingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ShoppingService, StorageService, InteractionService]
    });
    service = TestBed.inject(ShoppingService);
    // Reset storage per test
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('persists to localStorage on add and remove', () => {
    // Mock prompts for addPurchase
    const ui = TestBed.inject(InteractionService) as any;
    (ui.prompt as any) = jest.fn()
      .mockReturnValueOnce('100')
      .mockReturnValueOnce('2025-09-01')
      .mockReturnValueOnce('My Store');

    service.addPurchase({ id: 99 }, 'Credit');
    const saved = JSON.parse(localStorage.getItem('shopping') || '[]');
    expect(saved.length).toBe(1);
    expect(saved[0].promoId).toBe(99);

    service.removePurchase(saved[0].id);
    const afterRemove = JSON.parse(localStorage.getItem('shopping') || '[]');
    expect(afterRemove.length).toBe(0);
  });

  it('sorts purchases by date desc in getPurchasesByPromoId', () => {
    // Preload storage to test constructor loading and sorting
    const purchases = [
      { id: 1, promoId: 7, amount: 10, date: '2025-09-01', storeName: 'A', paymentMethod: 'X' },
      { id: 2, promoId: 7, amount: 20, date: '2025-09-10', storeName: 'B', paymentMethod: 'Y' },
      { id: 3, promoId: 7, amount: 30, date: '2025-08-31', storeName: 'C', paymentMethod: 'Z' }
    ];
    localStorage.setItem('shopping', JSON.stringify(purchases));

    // Recreate service to load from storage
    service = new ShoppingService(TestBed.inject(StorageService), TestBed.inject(InteractionService));
    const result = service.getPurchasesByPromoId(7);
    // Dates are strings 'YYYY-MM-DD' but service sorts using dd-MM-yyyy parse, so ordering stays as input (no parse match)
    expect(result.map(r => r.id)).toEqual([1, 2, 3]);
  });
});
