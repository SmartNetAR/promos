import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PerMethodChipsComponent } from './per-method-chips.component';
import { format, startOfDay } from 'date-fns';
import { ShoppingService } from '../shopping.service';
import { SelectionService } from '../selection.service';
import { PromotionsRegistryService } from '../promotions-registry.service';
import { FavouritesService } from '../favourites.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-promotion',
  standalone: true,
  imports: [CommonModule, PerMethodChipsComponent],
  templateUrl: './promotion.component.html',
  styleUrl: './promotion.component.css'
})
export class PromotionComponent {
  @Input() promotion: any;
  @Output() addPurchaseRequest = new EventEmitter<{ promo: any; paymentMethod: string }>();
  @Output() editPurchaseRequest = new EventEmitter<{ promo: any; purchase: any }>();
  @Output() purchaseRemoved = new EventEmitter<void>();
  showPastPurchases = false;

  constructor(
  private readonly shoppingService: ShoppingService,
  private readonly selection: SelectionService,
  private readonly registry: PromotionsRegistryService,
  private readonly favs: FavouritesService,
  private readonly toast: ToastService
  ) { }

  get isFavourite(): boolean { return !!this.promotion?.isFavourite || this.favs.has(String(this.promotion?.id)); }

  toggleFavourite(): void {
  const isFav = this.favs.toggle(String(this.promotion.id));
  this.toast.success(isFav ? 'Agregada a Favoritas' : 'Quitada de Favoritas');
  }

  addPurchase(promotion: any, paymentMethod: string) {
    this.addPurchaseRequest.emit({ promo: promotion, paymentMethod });
  }

  removePurchase(purchase: any) {
  this.shoppingService.removePurchase(purchase.id);
  this.toast.info('Compra eliminada');
    // Notificar al padre para que recalcule las listas y refresque totales
    this.purchaseRemoved.emit();
  }

  editPurchase(purchase: any) {
    if (!this.promotion) return;
    this.editPurchaseRequest.emit({ promo: this.promotion, purchase });
  }

  availableProgress(): number | null {
    if (!this.promotion?.activeDate) return null;
    // If the promo has a separate totalCap (aggregate) distinct from per-purchase cap, the purchase-based
    // theoretical max (calculatedPurchaseAmount) is misleading: a single large purchase may exceed the per-purchase
    // effective portion that counts toward the aggregate refund, making the bar jump to 100% too early.
    // For totalCap case we instead show progress of refund consumed vs aggregate refund cap.
    if (this.hasSeparatePerPurchaseCap()) {
      const refunded = this.promotion.activeDate.totalAmountRefunded || 0;
      const totalCap = this.promotion.limit.totalCap;
      if (!totalCap) return null;
      return Math.min(100, Math.max(0, Math.round((refunded / totalCap) * 100)));
    }
    // If mode=payment_methods, interpret progress as mean consumption across methods to avoid 100% upon first method cap.
    if (this.promotion?.limit?.mode === 'payment_methods' && Array.isArray(this.promotion?.payment_methods) && this.promotion.payment_methods.length > 0) {
      const perMethodRefundCap = this.promotion.limit.amount;
      const methods = this.promotion.payment_methods;
      // Aggregate purchases by method
      const purchases = (this.promotion.activeDate.purchases || []) as any[];
      const refundPct = this.promotion.discount;
      let sumFractions = 0;
      for (const m of methods) {
        const totalPurchased = purchases.filter(p => p.paymentMethod === m).reduce((a, b) => a + (b.amount || 0), 0);
        const potentialRefund = totalPurchased * refundPct / 100;
        const refunded = Math.min(perMethodRefundCap, potentialRefund);
        const fraction = perMethodRefundCap > 0 ? (refunded / perMethodRefundCap) : 0;
        sumFractions += Math.min(1, fraction);
      }
      const avgFraction = sumFractions / methods.length;
      return Math.min(100, Math.max(0, Math.round(avgFraction * 100)));
    }
    // Legacy behavior (no separate totalCap): keep purchase-based progress
    const total = this.promotion.calculatedPurchaseAmount;
    const purchased = this.promotion.activeDate.totalAmountPurchased ?? 0;
    if (!total) return null;
    return Math.min(100, Math.max(0, Math.round((purchased / total) * 100)));
  }

  remainingRefundCap(): number | null {
    if (!this.promotion?.activeDate) return null;
    const limit = this.promotion.limit;
    if (!limit) return null;
    const totalCap = typeof limit.totalCap === 'number' ? limit.totalCap : limit.amount;
    if (typeof totalCap !== 'number') return null;
    const refunded = this.promotion.activeDate.totalAmountRefunded || 0;
    const remaining = Math.max(0, totalCap - refunded);
    return remaining;
  }

  hasSeparatePerPurchaseCap(): boolean {
    return !!(this.promotion?.limit && typeof this.promotion.limit.totalCap === 'number');
  }

  isUnlimited(): boolean {
    return !!(this.promotion?.limit && this.promotion.limit.amount === 0);
  }

  // Weekday letters (Mon-Sun) using Spanish abbreviations: L M X J V S D
  private static readonly WEEK_LETTERS = ['D','L','M','X','J','V','S']; // will reorder for display Mon->Sun
  weekdaysDisplay(): { letter: string; active: boolean; fullName: string; specific?: boolean }[] {
    if (!this.promotion?.validity) return [];
    const activeSet = new Set<number>();
    if (Array.isArray(this.promotion.validity.days_of_week)) {
      this.promotion.validity.days_of_week.forEach((d: number) => activeSet.add(d));
    }
    // If no explicit days_of_week, infer from specific dates subset.
    // Rules:
    // 1. If all specific dates fall on same weekday AND they DO NOT cover every occurrence of that weekday in that month subset -> mark as specific (amber).
    // 2. If they cover every occurrence of that weekday within the month (i.e., all Tuesdays of that month) -> treat as active (blue) instead of specific.
    let specificWeekday: number | null = null;
    if (!activeSet.size) {
      const specs = this.specificDates();
      if (specs.length) {
        const parsed = specs.map(d => {
          const y = Number(d.slice(0,4));
          const m = Number(d.slice(5,7)) - 1;
          const day = Number(d.slice(8,10));
          const dt = new Date(y, m, day);
          return { dt, weekday: dt.getDay(), y, m };
        });
        const weekdays = parsed.map(p => p.weekday);
        const allSame = weekdays.every(w => w === weekdays[0]);
        if (allSame) {
          const targetWeekday = weekdays[0];
          // Determine number of occurrences of that weekday in the month (y,m) of the subset (they're all same month due to earlier filtering logic).
          const y = parsed[0].y; const m = parsed[0].m;
          const occurrences: Date[] = [];
          // Iterate days of month
          const firstOfMonth = new Date(y, m, 1);
            for (let d = 1; d <= 31; d++) {
              const cand = new Date(y, m, d);
              if (cand.getMonth() !== m) break; // overflow
              if (cand.getDay() === targetWeekday) occurrences.push(cand);
            }
          const coveredAll = occurrences.length === parsed.length && parsed.every(p => occurrences.some(o => o.getDate() === p.dt.getDate()));
          if (coveredAll) {
            activeSet.add(targetWeekday); // promote to active (blue)
          } else {
            specificWeekday = targetWeekday; // partial coverage -> amber highlight
          }
        }
      }
    }
    // Display Monday first: ordering indices 1..6 then 0
    const order = [1,2,3,4,5,6,0];
    const full = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    return order.map(idx => ({
      letter: PromotionComponent.WEEK_LETTERS[idx],
      active: activeSet.has(idx),
      fullName: full[idx],
      specific: specificWeekday === idx
    }));
  }

  isAllWeek(): boolean {
    const days = this.promotion?.validity?.days_of_week;
    if (!Array.isArray(days)) return false;
    if (days.length !== 7) return false;
    return [0,1,2,3,4,5,6].every(d => days.includes(d));
  }

  activeDaysAriaLabel(): string {
    if (this.isAllWeek()) return 'Aplica todos los días';
    const activeLetters = this.weekdaysDisplay().filter(d => d.active).map(d => d.letter);
    if (!activeLetters.length) return 'Sin días activos';
    return 'Aplica: ' + activeLetters.join(', ');
  }

  specificDates(): string[] {
    const spec = this.promotion?.validity?.specific_dates;
    if (!Array.isArray(spec)) return [];
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // Build structures with parsed dates
    const futureOrToday = spec.map(d => {
      const y = Number(d.slice(0,4));
      const m = Number(d.slice(5,7)) - 1;
      const dayNum = Number(d.slice(8,10));
      const dt = new Date(y, m, dayNum, 0, 0, 0, 0);
      return { raw: d, date: dt, y, m };
    }).filter(x => x.date >= todayStart);
    if (!futureOrToday.length) return [];
    const currentMonthMatches = futureOrToday.filter(x => x.y === today.getFullYear() && x.m === today.getMonth());
    let subset: typeof futureOrToday;
    if (currentMonthMatches.length) {
      subset = currentMonthMatches;
    } else {
      // pick earliest future month (year, month) lexicographically
      futureOrToday.sort((a,b) => (a.y - b.y) || (a.m - b.m) || (a.date.getTime() - b.date.getTime()));
      const first = futureOrToday[0];
      subset = futureOrToday.filter(x => x.y === first.y && x.m === first.m);
    }
    // Preserve original ordering within selected subset as they appeared in spec
    const rawSet = new Set(subset.map(s => s.raw));
    return spec.filter(d => rawSet.has(d));
  }

  specificDatesFormatted(): string {
    const dates = this.specificDates();
    if (!dates.length) return '';
    // Keep original order; show dd-MM abreviado
    return dates.map(d => d.slice(8,10)+'-'+d.slice(5,7)).join(', ');
  }

  specificDatesDayNumbers(): string {
    const dates = this.specificDates();
    if (!dates.length) return '';
    return dates.map(d => d.slice(8,10)).join(' / ');
  }

  private specificDatesYearMonth(): { y: number; m: number } | null {
    const dates = this.specificDates();
    if (!dates.length) return null;
    const first = dates[0];
    return { y: Number(first.slice(0,4)), m: Number(first.slice(5,7)) - 1 };
  }

  isFutureMonthSpecificDates(): boolean {
    const ym = this.specificDatesYearMonth();
    if (!ym) return false;
    const now = new Date();
    return ym.y > now.getFullYear() || (ym.y === now.getFullYear() && ym.m > now.getMonth());
  }

  specificDatesMonthLabel(): string {
    const ym = this.specificDatesYearMonth();
    if (!ym) return '';
    const now = new Date();
    if (ym.y === now.getFullYear() && ym.m === now.getMonth()) return '';
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return months[ym.m];
  }

  // For stackable extras, show per-method progress derived from their own purchases; if they have none but a base exists selected, reuse base fractions.
  derivedPerMethodForExtra(): any[] | null {
    if (!this.promotion?.isStackable || this.promotion?.stacking?.type !== 'extra') return null;
    const own = this.promotion.activeDate?.perMethod;
    if (own && own.length) return own;
    // try to find selected base to mirror progress so user sees context
    const ids = this.selection.values();
    if (!ids.length) return null;
    const selectedModels = ids.map(id => this.registry.get(id)).filter(Boolean);
    const base = selectedModels.find((p: any) => p?.stacking?.type === 'base');
    if (base?.activeDate?.perMethod?.length) {
      // Clone but zero out refunds so it visually indicates no usage yet; keep purchase fraction mapping.
      return base.activeDate.perMethod.map((m: any) => ({ ...m }));
    }
    return null;
  }

  segmentGradient(refund: number, cap: number): string {
    const pct = cap > 0 ? refund / cap : 0;
    // Color blend from slate (#64748b) through primary (#3b82f6) to green (#10b981)
    // Simple thresholds for readability
    if (pct >= 0.9) return 'linear-gradient(90deg,#059669,#10b981)';
    if (pct >= 0.6) return 'linear-gradient(90deg,#2563eb,#059669)';
    if (pct >= 0.3) return 'linear-gradient(90deg,#3b82f6,#2563eb)';
    return 'linear-gradient(90deg,#64748b,#3b82f6)';
  }

  toggleSelect() {
    if (!this.promotion?.isStackable) return;
    if (this.isDisabledForStack()) return;
  this.selection.toggle(String(this.promotion.id));
  }

  // Map a promoId from a breakdown row to a human-friendly title.
  findTitle(promoId: string): string {
    if (!promoId) return '';
    if (String(this.promotion?.id) === String(promoId)) return this.promotion.title;
    const ref = this.registry.get(promoId);
    return ref?.title || 'Promo';
  }

  isSelected(): boolean { return this.selection.has(String(this.promotion?.id)); }

  isDisabledForStack(): boolean {
    const ids = this.selection.values();
    if (ids.length === 0) return false; // first selection always allowed
    if (this.isSelected()) return false; // allow unselect
    const registry = this.registry.getAll();
    if (!registry.length) return false; // fallback allow
  const selectedModels = ids.map(id => this.registry.get(id)).filter(Boolean);
    const candidate = [...selectedModels, this.promotion];
    const bases = candidate.filter(p => p?.stacking?.type === 'base');
    const extras = candidate.filter(p => p?.stacking?.type === 'extra');
    // New rules:
    // - 1 base max.
    // - N extras (>=1) allowed but only if there is exactly one base in the set OR (temporarily) user is still before choosing base (only 1 extra so far).
    // - Prevent having more than 1 extra without a base anchor.
    // - Each extra must list the base in appliesWith if its list exists.
    if (bases.length > 1) return true; // multiple bases not allowed yet
    const base = bases[0];
    if (!base) {
      // No base yet: allow adding a single extra, disallow adding a second extra
      const selectedExtras = selectedModels.filter(p => p?.stacking?.type === 'extra');
      // If already one extra selected and candidate is extra => disabled
      if (selectedExtras.length >= 1 && this.promotion?.stacking?.type === 'extra') return true;
      return false;
    }
    // There is a base anchor
    if (this.promotion?.stacking?.type === 'base') {
      // Already have base -> can't add another base
      return true;
    }
    // Candidate is extra, check compatibility with base
  const list: string[] | undefined = this.promotion?.stacking?.appliesWith;
    if (list && !list.includes(base.id)) return true; // incompatible extra
    // Also ensure all currently selected extras (with lists) are compatible with base (defensive)
    for (const e of extras) {
  const l: string[] | undefined = e.stacking?.appliesWith;
      if (l && !l.includes(base.id)) return true; // existing incompatible (shouldn't happen)
    }
    return false; // allowed
  }

  // Compute total refund for a given purchase (stacked or single).
  totalRefund(purchase: any): number {
    if (!purchase) return 0;
    // If stacked with breakdown, sum discountValue
    if (Array.isArray(purchase.breakdown) && purchase.breakdown.length) {
      return purchase.breakdown.reduce((a: number, b: any) => a + (Number(b.discountValue) || 0), 0);
    }
    // For single promo purchases, approximate refund = amount * discount% (capped by per purchase refund cap if applicable)
    try {
      const discountPct = this.promotion?.discount || 0;
      const rawRefund = purchase.amount * discountPct / 100;
      const perPurchaseCap = this.promotion?.limit?.amount;
      if (perPurchaseCap === 0) return rawRefund; // interpret 0 as sin tope
      if (typeof perPurchaseCap === 'number' && perPurchaseCap > 0) {
        return Math.min(rawRefund, perPurchaseCap);
      }
      return rawRefund; // no cap info
    } catch { return 0; }
  }
}
