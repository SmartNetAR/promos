import { Component, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { PromotionsService } from './promotions.service';
import { PromotionComponent } from './promotion/promotion.component';
import { ToastContainerComponent } from './toast/toast-container.component';
import { PurchaseFlyoutComponent, PurchaseFormData } from './purchase-flyout/purchase-flyout.component';
import { ShoppingService } from './shopping.service';
import { ToastService } from './toast.service';
import { FavouritesService } from './favourites.service';
import { Subject, takeUntil } from 'rxjs';
import { PreferencesService, FilterMode } from './preferences.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PromotionComponent, ToastContainerComponent, PurchaseFlyoutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnDestroy {
  title = 'promos';
  promotions = this.promotionsService.getPromotions() || [];
  favouritePromotions = [] as any[];
  otherPromotions = [] as any[];
  showFilterMenu = false;
  countActive = 0;
  countActiveFuture = 0;
  countAll = 0;

  private destroyed$ = new Subject<void>();
  @ViewChild(PurchaseFlyoutComponent) purchaseFlyout?: PurchaseFlyoutComponent;
  @ViewChild('filterMenu') filterMenu?: ElementRef<HTMLUListElement>;

  constructor(
    private readonly promotionsService: PromotionsService,
  private readonly favs: FavouritesService,
  private readonly shopping: ShoppingService,
  private readonly toast: ToastService,
  public readonly prefs: PreferencesService,
  private readonly el: ElementRef
  ) {
    this.favs.favourites$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.recomputeLists());

    this.prefs.state$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.recomputeLists());

  this.recomputeLists();
  }

  recomputeLists() {
  const all = this.promotionsService.getPromotions() || [];
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
  this.purchaseFlyout?.show(promo, paymentMethod);
    // temporarily store selected promo for submission
    (this as any)._selectedPromo = promo;
  }

  openEditPurchase(promo: any, purchase: any) {
    this.purchaseFlyout?.showEdit(promo, purchase);
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

  handlePurchaseSubmit(data: PurchaseFormData) {
    const promo = (this as any)._selectedPromo;
    if (!promo) return;
  this.shopping.addPurchaseDirect(promo, data.paymentMethod, data.amount, data.date, data.storeName);
  this.toast.success('Compra agregada');
  this.recomputeLists();
  }

  handlePurchaseUpdate(data: any) {
    this.shopping.editPurchase({ id: data.id, amount: data.amount, date: data.date, storeName: data.storeName });
    this.toast.success('Compra actualizada');
    this.recomputeLists();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
