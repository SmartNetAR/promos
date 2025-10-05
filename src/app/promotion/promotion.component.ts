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
