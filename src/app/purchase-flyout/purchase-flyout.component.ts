import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface PurchaseFormData {
  amount: number;
  date: string; // ISO YYYY-MM-DD
  storeName: string;
  paymentMethod: string;
}
export interface PurchaseUpdateData extends PurchaseFormData { id: number; }

@Component({
  selector: 'app-purchase-flyout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="backdrop" (click)="close()" *ngIf="open"></div>
  <aside class="flyout" [class.open]="open" aria-label="Agregar compra">
    <header class="flyout-header">
      <h3>{{ isEdit ? 'Editar compra' : 'Agregar compra' }}</h3>
      <button type="button" class="icon" (click)="close()" aria-label="Cerrar">×</button>
    </header>
    <form class="form" (ngSubmit)="submit()" *ngIf="open">
      <div class="hint">{{promoTitle}} — {{paymentMethod}}</div>
      <label>Monto<input type="number" min="1" step="0.01" [(ngModel)]="model.amount" name="amount" required /></label>
      <label>Fecha<input type="date" [(ngModel)]="model.date" name="date" [attr.min]="minDateISO || null" [attr.max]="maxDateISO || null" required /></label>
      <label>Comercio<input [(ngModel)]="model.storeName" name="storeName" placeholder="Nombre del comercio" required /></label>
      <footer class="actions">
        <button type="button" class="btn ghost" (click)="close()">Cancelar</button>
        <button type="submit" class="btn primary">{{ isEdit ? 'Guardar' : 'Agregar' }}</button>
      </footer>
    </form>
  </aside>
  `,
  styles: [`
  :host { display: contents; }
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); backdrop-filter: blur(2px); z-index: 60; }
  .flyout { position: fixed; top: 0; right: 0; width: min(420px, 95vw); height: 100%; background: #fff; box-shadow: -8px 0 24px rgba(0,0,0,.2); transform: translateX(100%); transition: transform .25s ease; z-index: 70; display: flex; flex-direction: column; }
  .flyout.open { transform: translateX(0); }
  .flyout-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
  .icon { background: transparent; border: none; font-size: 20px; cursor: pointer; }
  .form { display: grid; gap: 12px; padding: 12px 16px; }
  .hint { color: #374151; font-size: .9rem; margin-bottom: 4px; }
  label { display: grid; gap: 6px; font-size: .9rem; }
  input { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; font: inherit; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
  .btn { border-radius: 8px; padding: 8px 12px; border: 1px solid transparent; cursor: pointer; font: inherit; }
  .btn.primary { background: #2563eb; color: white; }
  .btn.primary:hover { background: #1d4ed8; }
  .btn.ghost { background: #f3f4f6; color: #111827; }
  .btn.ghost:hover { background: #e5e7eb; }
  `]
})
export class PurchaseFlyoutComponent {
  open = false;
  promoTitle = '';
  paymentMethod = '';
  model: PurchaseFormData = { amount: 0, date: new Date().toISOString().slice(0,10), storeName: '', paymentMethod: '' };
  minDateISO?: string;
  maxDateISO?: string;
  isEdit = false;
  editId?: number;

  @Output() submitted = new EventEmitter<PurchaseFormData>();
  @Output() updated = new EventEmitter<PurchaseUpdateData>();

  show(promo: any, paymentMethod: string) {
    this.promoTitle = promo?.title ?? '';
    this.paymentMethod = paymentMethod;
    // Derive min/max from active period when available
    const from: Date | undefined = promo?.activeDate?.from;
    const to: Date | undefined = promo?.activeDate?.to;
    this.minDateISO = from ? new Date(from).toISOString().slice(0,10) : undefined;
    this.maxDateISO = to ? new Date(to).toISOString().slice(0,10) : undefined;
    let today = new Date().toISOString().slice(0,10);
    if (this.minDateISO && today < this.minDateISO) today = this.minDateISO;
    if (this.maxDateISO && today > this.maxDateISO) today = this.maxDateISO;
    this.model = { amount: 0, date: today, storeName: '', paymentMethod };
    this.isEdit = false;
    this.editId = undefined;
    this.open = true;
  }

  showEdit(promo: any, purchase: { id: number; amount: number; date: string; storeName: string; paymentMethod: string; }) {
    this.promoTitle = promo?.title ?? '';
    this.paymentMethod = purchase.paymentMethod;
    const from: Date | undefined = promo?.activeDate?.from;
    const to: Date | undefined = promo?.activeDate?.to;
    this.minDateISO = from ? new Date(from).toISOString().slice(0,10) : undefined;
    this.maxDateISO = to ? new Date(to).toISOString().slice(0,10) : undefined;
  const isoDate = this.toISODate(purchase.date);
  this.model = { amount: purchase.amount, date: isoDate, storeName: purchase.storeName, paymentMethod: purchase.paymentMethod };
    this.isEdit = true;
    this.editId = purchase.id;
    this.open = true;
  }
  close() { this.open = false; }

  submit() {
    if (!this.model.amount || !this.model.date || !this.model.storeName) return;
    if (this.isEdit && this.editId != null) {
      this.updated.emit({ id: this.editId, ...this.model });
    } else {
      this.submitted.emit({ ...this.model });
    }
    this.close();
  }

  private toISODate(value: any): string {
    if (!value) return new Date().toISOString().slice(0,10);
    if (value instanceof Date) return new Date(value).toISOString().slice(0,10);
    const str = String(value);
    // legacy format dd-MM-yyyy => yyyy-MM-dd
    const legacy = /^(\d{2})-(\d{2})-(\d{4})$/;
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
    if (iso.test(str)) return str;
    const m = str.match(legacy);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    // fallback: try Date.parse
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
    return new Date().toISOString().slice(0,10);
  }
}
