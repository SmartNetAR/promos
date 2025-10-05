import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiscountEngineService } from '../stacking/discount-engine.service';
import { ExtraPercentageStackStrategy } from './extra-percentage.strategy';
import { SequentialStackStrategy } from './sequential.strategy';

@Component({
  selector: 'app-stacked-purchase-flyout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stacked-purchase-flyout.component.html',
  styleUrls: ['./stacked-purchase-flyout.component.css']
})
export class StackedPurchaseFlyoutComponent implements OnChanges {
  @Input() open = false;
  @Input() promotions: any[] | null = null;
  @Input() initialPaymentMethod: string | null = null;
  @Output() submitStacked = new EventEmitter<{ promotions: any[]; amount: number; date: string; storeName: string; paymentMethod: string; breakdown: any; finalAmount: number }>();
  @Output() close = new EventEmitter<void>();

  amount = 0;
  date = new Date().toISOString().slice(0,10);
  storeName = '';
  paymentMethod = '';
  paymentMethods: string[] = [];
  breakdown: any[] = [];
  totalDiscount: number | null = null;
  finalAmount: number | null = null;
  isEdit = false;
  editId?: number;
  minDateISO?: string;
  maxDateISO?: string;
  unmetMinimums: any[] = [];
  hasMinimums = false;

  private engine = new DiscountEngineService([ new ExtraPercentageStackStrategy(), new SequentialStackStrategy() ]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['promotions']) {
      this.rebuildPaymentMethods();
      this.computeDateBounds();
    }
    if (changes['open'] && this.open) {
      // reset form when opening
      this.amount = 0;
      this.storeName = '';
      this.breakdown = [];
      this.totalDiscount = null;
      this.finalAmount = null;
      this.date = new Date().toISOString().slice(0,10);
      this.rebuildPaymentMethods();
      if (!this.isEdit) this.editId = undefined;
      this.computeDateBounds();
      // inicializar tabla estructural
      this.recalc();
    }
  }

  private rebuildPaymentMethods() {
    if (!this.promotions || this.promotions.length === 0) {
      this.paymentMethods = [];
      this.paymentMethod = '';
      return;
    }
    const set = new Set<string>();
    for (const p of this.promotions) {
      (p.payment_methods || []).forEach((m: string) => set.add(m));
    }
    this.paymentMethods = Array.from(set.values());
    if (this.initialPaymentMethod && this.paymentMethods.includes(this.initialPaymentMethod)) {
      this.paymentMethod = this.initialPaymentMethod;
      this.initialPaymentMethod = null; // consume once
    } else if (!this.paymentMethod || !this.paymentMethods.includes(this.paymentMethod)) {
      this.paymentMethod = this.paymentMethods[0] || '';
    }
  }

  findTitle(id: string): string { return this.promotions?.find(p => p.id === id)?.title || '#' + id; }
  combinedTitles(): string { return (this.promotions || []).map(p => p.title).join(' + '); }

  private computeDateBounds() {
    if (!this.promotions || this.promotions.length === 0) { this.minDateISO = this.maxDateISO = undefined; return; }
    // Intersect active date windows across promos; if any has no active window, fallback to today
    const ranges = this.promotions
      .map(p => p.activeDate ? { from: p.activeDate.from ? new Date(p.activeDate.from) : null, to: p.activeDate.to ? new Date(p.activeDate.to) : null } : null)
      .filter(r => r !== null) as { from: Date|null; to: Date|null }[];
    if (!ranges.length) { this.minDateISO = this.maxDateISO = undefined; return; }
    const fromMax = ranges.reduce((acc, r) => (r.from && (!acc || r.from > acc)) ? r.from : acc, ranges[0].from);
    const toMin = ranges.reduce((acc, r) => (r.to && (!acc || r.to < acc)) ? r.to : acc, ranges[0].to);
    this.minDateISO = fromMax ? fromMax.toISOString().slice(0,10) : undefined;
    this.maxDateISO = toMin ? toMin.toISOString().slice(0,10) : undefined;
    if (this.date) {
      if (this.minDateISO && this.date < this.minDateISO) this.date = this.minDateISO;
      if (this.maxDateISO && this.date > this.maxDateISO) this.date = this.maxDateISO;
    }
  }

  recalc() {
    if (!this.promotions || this.promotions.length === 0) {
      this.breakdown = [];
      this.totalDiscount = null;
      this.finalAmount = null;
      return;
    }
    // track unmet minimums (for amount 0 all with minAmount count as unmet)
    this.unmetMinimums = this.promotions.filter(p => p.minAmount && this.amount < p.minAmount);
    this.hasMinimums = this.promotions.some(p => p.minAmount);

    // Always build a structural breakdown so the table can be shown incluso con monto 0
    if (this.amount <= 0) {
      this.breakdown = this.promotions.map(p => ({ promoId: p.id, percent: p.discount, baseApplied: 0, discountValue: 0 }));
      this.totalDiscount = 0;
      this.finalAmount = 0;
      return;
    }

    if (this.promotions.length === 1) {
      const single = this.promotions[0];
      const result = this.engine.calculate(this.amount, [{ id: single.id, discount: single.discount, limit: single.limit, stacking: single.stacking, minAmount: single.minAmount } as any]);
      // If engine filtered it out by minAmount leave a structural row so user sees it
      if (!result.breakdown.length) {
        this.breakdown = [{ promoId: single.id, percent: single.discount, baseApplied: this.amount, discountValue: 0 }];
        this.totalDiscount = 0;
        this.finalAmount = this.amount;
        return;
      }
      this.breakdown = result.breakdown;
      this.totalDiscount = result.totalDiscount;
      this.finalAmount = result.finalAmount;
      return;
    }

    const result = this.engine.calculate(this.amount, this.promotions.map(p => ({ id: p.id, discount: p.discount, limit: p.limit, stacking: p.stacking, minAmount: p.minAmount })) as any);
    // If some promos filtered out (min no alcanzado) we still want rows for them with 0 descuento
    const presentIds = new Set(result.breakdown.map((b: any) => b.promoId));
    const supplemental = this.promotions
      .filter(p => !presentIds.has(p.id))
      .map(p => ({ promoId: p.id, percent: p.discount, baseApplied: this.amount, discountValue: 0 }));
    this.breakdown = [...result.breakdown, ...supplemental];
    this.totalDiscount = result.totalDiscount;
    this.finalAmount = result.finalAmount;
  }

  private hasAnyApplicable(): boolean {
    if (!this.promotions || this.promotions.length === 0) return false;
    return this.promotions.some(p => !p.minAmount || this.amount >= p.minAmount);
  }
  private applicablePromotions(): any[] {
    if (!this.promotions) return [];
    return this.promotions.filter(p => !p.minAmount || this.amount >= p.minAmount);
  }
  canSubmit() {
    return !!this.promotions && this.promotions.length >= 1 &&
      this.amount > 0 &&
      !!this.storeName && !!this.date && !!this.paymentMethod &&
      this.hasAnyApplicable() &&
      (this.promotions.length === 1 || this.finalAmount !== null);
  }

  unmetMinimumsLabel(): string {
    if (!this.unmetMinimums.length) return '';
    return this.unmetMinimums.map(p => `${p.title} (mín $${p.minAmount || 0})`).join(', ');
  }

  minimumsHelp(): string {
    if (!this.unmetMinimums.length) return '';
    const more = this.unmetMinimums.length > 1 ? 'montos mínimos' : 'monto mínimo';
    return `Para aplicar ${this.unmetMinimums.length > 1 ? 'estas promociones' : 'esta promoción'} necesitas alcanzar el ${more}.`;
  }

  rowUnmet(promoId: string): boolean {
    if (!this.promotions) return false;
    const p = this.promotions.find(pr => pr.id === promoId);
    return !!(p?.minAmount && this.amount < p.minAmount);
  }

  submit() {
    this.recalc();
  if (!this.canSubmit() || !this.promotions) return;
  const applicable = this.applicablePromotions();
  if (applicable.length === 0) return;
  const finalAmount = applicable.length === 1 ? this.amount : (this.finalAmount ?? this.amount);
  // Filter breakdown to keep only applicable promos for emission
  const applicableIds = new Set(applicable.map(p => p.id));
  const filteredBreakdown = this.breakdown.filter(b => applicableIds.has(b.promoId));
  this.submitStacked.emit({ promotions: applicable, amount: this.amount, date: this.date, storeName: this.storeName, paymentMethod: this.paymentMethod, breakdown: filteredBreakdown, finalAmount });
    this.amount = 0; this.storeName=''; this.breakdown=[]; this.totalDiscount=null; this.finalAmount=null; this.close.emit();
  }

  showEdit(purchase: any, promotions: any[]) {
    this.promotions = promotions;
    this.isEdit = true;
    this.editId = purchase.id;
    this.amount = purchase.amount;
    this.finalAmount = purchase.finalAmount ?? purchase.amount;
    this.date = this.normalizeDateInput(purchase.date);
    this.storeName = purchase.storeName;
    this.paymentMethod = purchase.paymentMethod || '';
    this.breakdown = purchase.breakdown || [];
    this.totalDiscount = this.breakdown.reduce((sum: number, b: any) => sum + (b.discountValue || 0), 0);
    this.rebuildPaymentMethods();
    this.open = true;
    this.recalc();
  }

  private normalizeDateInput(value: any): string {
    const fallback = () => new Date().toISOString().slice(0,10);
    if (!value) return fallback();
    if (value instanceof Date) return value.toISOString().slice(0,10);
    if (typeof value === 'number') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? fallback() : d.toISOString().slice(0,10);
    }
    if (typeof value === 'string') {
      // Already ISO yyyy-mm-dd
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      // dd-MM-yyyy or dd/MM/yyyy
      const m = value.match(/^(\d{2})[-\/.](\d{2})[-\/.](\d{4})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      // Try Date parse
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
      return fallback();
    }
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
    } catch { /* ignore */ }
    return fallback();
  }
}