import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { SelectionService } from './selection.service';
import { PromotionsService } from './promotions.service';

// This test ensures that clicking "Agregar compra" (openPurchaseForm via child output)
// when a promotion is ya seleccionada (checkbox) junto a otras, abre el flyout
// con todo el set combinado (mismo comportamiento que el botón Combinar).

describe('Add vs Combine unified behavior', () => {
  let selection: SelectionService;
  let promotionsService: PromotionsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent]
    }).compileComponents();
    selection = TestBed.inject(SelectionService);
    promotionsService = TestBed.inject(PromotionsService);
  });

  it('should keep existing compatible selection when adding purchase from one of them', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance as AppComponent & { openPurchaseForm: Function };
    const promos = promotionsService.getPromotions();
    // Find a base and an extra compatible (base id must appear in extra.appliesWith when list exists)
    const base = promos.find(p => p?.stacking?.type === 'base');
    const extra = promos.find(p => p?.stacking?.type === 'extra' && (!p.stacking.appliesWith || p.stacking.appliesWith.includes(base.id)));
    if (!base || !extra) {
      pending('No suitable base/extra pair found in test data');
      return;
    }
    // Simulate selecting both via selection service
    selection.toggle(String(base.id));
    selection.toggle(String(extra.id));
    fixture.detectChanges();

    // Trigger add purchase from the extra (could be base, either is fine)
    comp.openPurchaseForm(extra, extra.payment_methods[0] || 'Metodo');
    fixture.detectChanges();

    // Expect both still present in selectedPromotions
    const ids = comp.selectedPromotions.map(p => p.id).sort();
    expect(ids).toEqual([base.id, extra.id].sort());
    // Flyout should be open
  expect(comp.stackFlyoutOpen).toBe(true);
  });

  it('should replace incompatible previous selection', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance as AppComponent & { openPurchaseForm: Function };
    const promos = promotionsService.getPromotions();
    // Pick two bases (incompatible)
    const bases = promos.filter(p => p?.stacking?.type === 'base');
    if (bases.length < 2) {
      pending('Not enough base promotions to test replacement');
      return;
    }
    selection.toggle(String(bases[0].id));
    fixture.detectChanges();
    // Now open purchase on second base; should replace selection
    comp.openPurchaseForm(bases[1], bases[1].payment_methods[0] || 'Metodo');
    fixture.detectChanges();
    expect(comp.selectedPromotions.length).toBe(1);
    expect(comp.selectedPromotions[0].id).toBe(bases[1].id);
  });
});
