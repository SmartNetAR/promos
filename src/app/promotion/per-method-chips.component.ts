import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

export interface PerMethodStat {
  method: string;
  purchased: number;
  refund: number;
  remainingRefund: number;
  remainingPurchase: number;
  usageFraction: number; // 0..1
}

@Component({
  selector: 'app-per-method-chips',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './per-method-chips.component.html',
  styleUrls: ['./per-method-chips.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerMethodChipsComponent {
  @Input() stats: PerMethodStat[] = [];
  @Input() cap!: number; // per-method cap (amount or totalCap fallback)
  @Input() showSaldo = true;
  // Provide full list of methods so we can render empty chips before first purchase
  @Input() methods: string[] = [];
  // Emit selected method when user clicks add button
  @Output() addPurchase = new EventEmitter<string>();
  // Width is computed directly; no delayed mount animation to avoid race conditions hiding progress.
  private normalizedFraction(stat: PerMethodStat): number {
    if (this.cap > 0) {
      if (stat.usageFraction && stat.usageFraction > 0) return Math.min(1, stat.usageFraction);
      if (stat.refund > 0) return Math.min(1, stat.refund / this.cap);
    }
    return 0;
  }
  barWidthSafe(stat: PerMethodStat): number { return this.normalizedFraction(stat) * 100; }
  barColor(stat: PerMethodStat): string {
    const f = this.normalizedFraction(stat);
    if (f >= 0.9) return 'linear-gradient(90deg,#065f46,#10b981)';
    if (f >= 0.6) return 'linear-gradient(90deg,#2563eb,#059669)';
    if (f >= 0.3) return 'linear-gradient(90deg,#3b82f6,#2563eb)';
    return 'linear-gradient(90deg,#64748b,#3b82f6)';
  }
  ariaLabel(stat: PerMethodStat): string {
    const pct = Math.round(stat.usageFraction * 100);
    const saldo = stat.remainingRefund;
    return `${stat.method}: reintegrado ${stat.refund} de ${this.cap} (${pct}%). Saldo ${saldo}.`;
  }

  trackByMethod(_idx: number, item: PerMethodStat) { return item.method; }

  get derivedStats(): PerMethodStat[] {
    if (this.stats && this.stats.length) return this.stats;
    // Build zero-usage stats for each declared method (only if cap known)
    if (this.methods?.length && typeof this.cap === 'number') {
      return this.methods.map(m => ({
        method: m,
        purchased: 0,
        refund: 0,
        remainingRefund: this.cap,
        remainingPurchase: 0,
        usageFraction: 0
      }));
    }
    return [];
  }

  onAdd(method: string) {
    this.addPurchase.emit(method);
  }
}
