import { Component, OnDestroy, ViewChild, ElementRef, HostListener, inject, OnInit, AfterViewInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { PromotionsService } from './promotions.service';
import { PromotionComponent } from './promotion/promotion.component';
import { ToastContainerComponent } from './toast/toast-container.component';
import { StackedPurchaseFlyoutComponent } from './stacking/stacked-purchase-flyout.component';
import { ShoppingService } from './shopping.service';
import { ToastService } from './toast.service';
import { FavouritesService } from './favourites.service';
import { Subject, takeUntil } from 'rxjs';
import { PreferencesService, FilterMode } from './preferences.service';
import { PromotionsRegistryService } from './promotions-registry.service';
import { SelectionService } from './selection.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PromotionComponent, ToastContainerComponent, StackedPurchaseFlyoutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnDestroy, OnInit, AfterViewInit {
  title = 'promos';
  promotions = this.promotionsService.getPromotions() || [];
  favouritePromotions = [] as any[];
  otherPromotions = [] as any[];
  showFilterMenu = false;
  countActive = 0;
  countActiveFuture = 0;
  countAll = 0;
  stackFlyoutOpen = false;
  selectedPromotions: any[] = [];
  toolbarExpanded = false;
  extraPanelHeight = 0; // for smooth height animation
  @ViewChild('extraPanelRef') extraPanelRef?: ElementRef<HTMLDivElement>;
  private resizeObserver?: ResizeObserver;
  private selection = inject(SelectionService);
  private registry = inject(PromotionsRegistryService);

  private destroyed$ = new Subject<void>();
  @ViewChild(StackedPurchaseFlyoutComponent) unifiedFlyout?: StackedPurchaseFlyoutComponent;
  @ViewChild('filterMenu') filterMenu?: ElementRef<HTMLUListElement>;

  constructor(
    private readonly promotionsService: PromotionsService,
  private readonly favs: FavouritesService,
  private readonly shopping: ShoppingService,
  private readonly toast: ToastService,
  public readonly prefs: PreferencesService,
  private readonly el: ElementRef,
  private readonly renderer: Renderer2
  ) {
    this.favs.favourites$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.recomputeLists());

    this.prefs.state$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.recomputeLists());

  this.recomputeLists();
  this.selection.selection$.pipe(takeUntil(this.destroyed$)).subscribe(() => this.refreshSelectedPromotions());
  }

  ngOnInit(): void {
    // Restore persisted toolbar state
    try {
      const saved = localStorage.getItem('toolbarExpanded');
      if (saved === '1') this.toolbarExpanded = true; else if (saved === '0') this.toolbarExpanded = false;
    } catch {}
  }

  ngAfterViewInit(): void {
    // Initialize height if starting expanded
    setTimeout(() => this.updateExtraPanelHeight(true), 0);
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.updateExtraPanelHeight(false));
      if (this.extraPanelRef?.nativeElement) this.resizeObserver.observe(this.extraPanelRef.nativeElement);
    }
  }

  recomputeLists() {
  const all = this.promotionsService.getPromotions() || [];
  this.registry.register(all);
  const mode = this.prefs.state$.value.filter;
  // counts
  this.countAll = all.length;
  const isActive = (p: any) => p.activeDate !== null;
  const hasFuture = (p: any) => (p.futureDates?.length ?? 0) > 0;
  this.countActive = all.filter(isActive).length;
  this.countActiveFuture = all.filter(p => isActive(p) || hasFuture(p)).length;
  const filtered = this.filterByMode(all, mode);
  const sorted = this.sortForMode(filtered, mode);
  this.promotions = sorted;
  this.favouritePromotions = sorted.filter(p => p.isFavourite);
  this.otherPromotions = sorted.filter(p => !p.isFavourite);
  }

  private filterByMode(list: any[], mode: FilterMode): any[] {
    if (mode === 'all') return list;
    if (mode === 'active') {
      return list.filter(p => p.activeDate !== null);
    }
    // active-future
    return list.filter(p => p.activeDate !== null || (p.futureDates?.length ?? 0) > 0);
  }

  private sortForMode(list: any[], mode: FilterMode): any[] {
    if (mode !== 'all' && mode !== 'active-future') return list; // sort only for all and active-future
    const withRank = list.map(p => {
      const isActive = p.activeDate !== null;
      const hasFuture = (p.futureDates?.length ?? 0) > 0;
      const rank = isActive ? 0 : (hasFuture ? 1 : 2); // 0=active, 1=future, 2=past
      // tie keys
      const activeEnd: number | null = isActive ? (p.activeDate.to ? new Date(p.activeDate.to).getTime() : null) : null;
      const futureStart: number | null = hasFuture ? (p.futureDates[0]?.from ? new Date(p.futureDates[0].from).getTime() : null) : null;
      const lastPastTo: number | null = (!isActive && !hasFuture) ? (p.pastDates?.length ? new Date(p.pastDates[p.pastDates.length - 1].to).getTime() : null) : null;
      return { p, rank, activeEnd, futureStart, lastPastTo };
    });
    withRank.sort((a, b) => {
      if (a.rank !== b.rank) {
        // In active-future, there is no rank 2; in all, 0<1<2
        return a.rank - b.rank;
      }
      // within Active: end sooner first (ascending)
      if (a.rank === 0) {
        if (a.activeEnd != null && b.activeEnd != null && a.activeEnd !== b.activeEnd) return a.activeEnd - b.activeEnd;
      }
      // within Future: start sooner first (ascending)
      if (a.rank === 1) {
        if (a.futureStart != null && b.futureStart != null && a.futureStart !== b.futureStart) return a.futureStart - b.futureStart;
      }
      if (mode === 'all') {
        // within Past: most recently ended first (descending)
        if (a.rank === 2) {
          if (a.lastPastTo != null && b.lastPastTo != null && a.lastPastTo !== b.lastPastTo) return b.lastPastTo - a.lastPastTo;
        }
      }
      // final tie-breaker: alphabetical by title
      return (a.p.title || '').localeCompare(b.p.title || '');
    });
    return withRank.map(x => x.p);
  }


  openPurchaseForm(promo: any, paymentMethod: string) {
    // Unificar comportamiento: "Agregar compra" actúa igual que "Combinar"
    // tomando el conjunto actual seleccionado (checkboxes) y, si es compatible,
    // agrega la promo clickeada. Si no, reemplaza la selección.
    this.refreshSelectedPromotions();

    // Helper para validar reglas de stacking (1 base + N extras compatibles)
    const validateStack = (promos: any[]): boolean => {
      if (promos.length <= 1) return true;
      const bases = promos.filter(p => p?.stacking?.type === 'base');
      const extras = promos.filter(p => p?.stacking?.type === 'extra');
      if (bases.length > 1) return false; // 1 base máx
      if (bases.length === 0 && extras.length > 1) return false; // no 2 extras sin base
      if (bases.length === 1) {
        const base = bases[0];
        for (const ex of extras) {
          const list: string[] | undefined = ex?.stacking?.appliesWith;
          if (list && !list.includes(base.id)) return false; // extra incompatible
        }
      }
      return true;
    };

    let candidate = [...this.selectedPromotions];
    // Asegurar que la promo clickeada esté en el set candidato
    if (!candidate.find(p => p.id === promo.id)) {
      candidate.push(promo);
    }

    // Si la promo NO es stackeable y había selección previa, forzar reemplazo
    const needsReplaceBecauseNonStackable = !promo.isStackable && this.selectedPromotions.length > 0;
    // Validar compatibilidad completa
    const valid = !needsReplaceBecauseNonStackable && validateStack(candidate);
    if (!valid) {
      if (this.selectedPromotions.length > 0) {
        this.toast.info('Selección previa reemplazada: la nueva promoción no es combinable con las seleccionadas.');
      }
      candidate = [promo];
    }

    // Sincronizar selección (checkboxes) con el set final para coherencia visual/UX
    this.selection.clear();
    candidate.forEach(p => this.selection.toggle(String(p.id)));
    this.selectedPromotions = candidate;

    if (this.unifiedFlyout) {
      this.stackFlyoutOpen = true;
      this.unifiedFlyout.initialPaymentMethod = paymentMethod;
    }
    (this as any)._selectedPromo = promo;
  }

  openEditPurchase(promo: any, purchase: any) {
    // Determine if stacked purchase
    if (purchase?.promoIds?.length > 1) {
      // reconstruct promotions set from ids
      const all = [...this.favouritePromotions, ...this.otherPromotions];
  const promos = purchase.promoIds.map((id: string) => all.find(p => String(p.id) === id)).filter(Boolean);
      this.selectedPromotions = promos;
      if (this.unifiedFlyout) {
        this.unifiedFlyout.showEdit(purchase, promos);
        this.stackFlyoutOpen = true;
      }
    } else {
      // single purchase edit uses unified as well
      if (promo) {
        this.selectedPromotions = [promo];
        if (this.unifiedFlyout) {
          this.unifiedFlyout.showEdit(purchase, [promo]);
          this.stackFlyoutOpen = true;
        }
      }
    }
    (this as any)._selectedPromo = promo;
  }

  toggleFilterMenu(ev?: Event) {
    ev?.stopPropagation();
    this.showFilterMenu = !this.showFilterMenu;
    if (this.showFilterMenu) {
      // focus first item a tick later
      setTimeout(() => this.filterMenu?.nativeElement.querySelector('button')?.focus(), 0);
    }
  }

  onFilterMenuKeydown(event: KeyboardEvent) {
    const menu = this.filterMenu?.nativeElement; if (!menu) return;
    const items = Array.from(menu.querySelectorAll('button')) as HTMLButtonElement[];
    const idx = items.indexOf(event.target as HTMLButtonElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); items[(idx + 1) % items.length]?.focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); }
    else if (event.key === 'Escape') { this.showFilterMenu = false; }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.showFilterMenu) return;
    const dropdown = this.el.nativeElement.querySelector('.tb-dropdown');
    if (dropdown && !dropdown.contains(ev.target)) {
      this.showFilterMenu = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.showFilterMenu = false; }

  @HostListener('document:focusin', ['$event'])
  onFocusIn(ev: FocusEvent) {
    if (!this.showFilterMenu) return;
    const dropdown = this.el.nativeElement.querySelector('.tb-dropdown');
    if (dropdown && ev.target instanceof Node && !dropdown.contains(ev.target)) {
      this.showFilterMenu = false;
    }
  }

  // Legacy handlers removed (single add/edit now flows through unified flyout submission path)

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  selectedCount() { return this.selection.size(); }
  clearSelection() { this.selection.clear(); }
  openStackFlyout() { this.refreshSelectedPromotions(); if (this.selectedPromotions.length >=1) this.stackFlyoutOpen = true; }
  toggleToolbar() {
    this.toolbarExpanded = !this.toolbarExpanded;
    try { localStorage.setItem('toolbarExpanded', this.toolbarExpanded ? '1' : '0'); } catch {}
    this.updateExtraPanelHeight(true);
  }
  filterIsNotAll() { return this.prefs.state$.value.filter !== 'all'; }

  private updateExtraPanelHeight(animate: boolean) {
    const panel = this.extraPanelRef?.nativeElement; if (!panel) return;
    if (this.toolbarExpanded) {
      // measure scrollHeight
      const target = panel.scrollHeight;
      if (animate) {
        this.extraPanelHeight = target;
      } else {
        // if already open and content changed, adjust without jank
        this.extraPanelHeight = target;
      }
    } else {
      this.extraPanelHeight = 0;
    }
  }
  private refreshSelectedPromotions() {
    const ids = new Set(this.selection.values());
    const all = [...this.favouritePromotions, ...this.otherPromotions];
    this.selectedPromotions = all.filter(p => ids.has(p.id));
  }
  handleStackedPurchase(evt: { promotions: any[]; amount: number; date: string; storeName: string; paymentMethod: string; breakdown: any; finalAmount: number }) {
    const editingId = (this.unifiedFlyout as any)?.editId;
    const isEdit = !!editingId;
    if (evt.promotions.length === 1) {
      const promo = evt.promotions[0];
      if (isEdit) {
        this.shopping.editPurchase({ id: editingId, amount: evt.amount, date: evt.date, storeName: evt.storeName });
        this.toast.success('Compra actualizada');
      } else {
        this.shopping.addPurchaseDirect(promo, evt.paymentMethod, evt.amount, evt.date, evt.storeName);
        this.toast.success('Compra agregada');
      }
    } else {
      if (isEdit) {
        this.shopping.editStackedPurchase({ id: editingId, amount: evt.amount, date: evt.date, storeName: evt.storeName, breakdown: evt.breakdown, finalAmount: evt.finalAmount, paymentMethod: evt.paymentMethod });
        this.toast.success('Compra combinada actualizada');
      } else {
        this.shopping.addStackedPurchase(evt.promotions, evt.paymentMethod, evt.amount, evt.date, evt.storeName, evt.breakdown, evt.finalAmount);
        this.toast.success('Compra combinada guardada');
      }
    }
    this.selection.clear();
    this.stackFlyoutOpen = false;
    this.recomputeLists();
  }

  // Recalcular listas cuando una compra individual fue eliminada dentro de un componente hijo
  onPurchasesChanged() {
    this.recomputeLists();
    this.refreshSelectedPromotions();
  }
}
