import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PromotionsStorageService, CustomPromotion } from '../promotions-storage.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-promotion-flyout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="backdrop" (click)="close()" *ngIf="open"></div>
  <aside class="flyout" [class.open]="open" aria-label="Nueva promoción">
    <header class="flyout-header">
      <h3>Nueva promoción</h3>
      <button type="button" class="icon" (click)="close()" aria-label="Cerrar">×</button>
    </header>
    <form (ngSubmit)="submit()" *ngIf="open" class="form">
      <label>
        Título
        <input [(ngModel)]="model.title" name="title" required placeholder="Ej: Supermercados Mayoristas" />
      </label>
      <label>
        Métodos de pago (separados por coma)
        <input [(ngModel)]="paymentMethods" name="paymentMethods" placeholder="Ej: Modo / BNA+ / Crédito" />
      </label>
      <label>
        Descuento (%)
        <input type="number" [(ngModel)]="model.discount" name="discount" min="1" max="100" required />
      </label>
      <fieldset>
        <legend>Tope</legend>
        <label>Monto<input type="number" [(ngModel)]="model.limit.amount" name="limit_amount" required /></label>
        <label>Veces
          <select [(ngModel)]="model.limit.times" name="limit_times">
            <option value="each">Cada periodo</option>
            <option value="once">Una vez</option>
          </select>
        </label>
        <label>Modo
          <select [(ngModel)]="model.limit.mode" name="limit_mode">
            <option value="user">Por usuario</option>
            <option value="payment_methods">Por método de pago</option>
          </select>
        </label>
        <label>Periodo
          <select [(ngModel)]="model.limit.period" name="limit_period">
            <option value="day">Día</option>
            <option value="week">Semana</option>
            <option value="month">Mes</option>
          </select>
        </label>
      </fieldset>
      <fieldset>
        <legend>Vigencia</legend>
        <label>Desde<input type="date" [(ngModel)]="model.validity.from" name="valid_from" required /></label>
        <label>Hasta<input type="date" [(ngModel)]="model.validity.to" name="valid_to" required /></label>
        <label>Días de semana (0..6, separados por coma)<input [(ngModel)]="daysOfWeek" name="days_of_week" placeholder="Ej: 5,6" /></label>
        <label>Fechas específicas (YYYY-MM-DD, separadas por coma)<input [(ngModel)]="specificDates" name="specific_dates" placeholder="Ej: 2025-09-06,2025-09-20" /></label>
      </fieldset>
      <footer class="actions">
        <button type="button" class="btn ghost" (click)="close()">Cancelar</button>
        <button type="submit" class="btn primary">Guardar</button>
      </footer>
    </form>
  </aside>
  `,
  styles: [`
  :host { display: contents; }
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); backdrop-filter: blur(2px); z-index: 40; }
  .flyout { position: fixed; top: 0; right: 0; width: min(560px, 95vw); height: 100%; background: #fff; box-shadow: -8px 0 24px rgba(0,0,0,.2); transform: translateX(100%); transition: transform .25s ease; z-index: 50; display: flex; flex-direction: column; }
  .flyout.open { transform: translateX(0); }
  .flyout-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
  .icon { background: transparent; border: none; font-size: 20px; cursor: pointer; }
  .form { display: grid; gap: 12px; padding: 12px 16px; overflow: auto; }
  label { display: grid; gap: 6px; font-size: .9rem; }
  input, select { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; font: inherit; }
  fieldset { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; }
  legend { color: #374151; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
  .btn { border-radius: 8px; padding: 8px 12px; border: 1px solid transparent; cursor: pointer; font: inherit; }
  .btn.primary { background: #2563eb; color: white; }
  .btn.primary:hover { background: #1d4ed8; }
  .btn.ghost { background: #f3f4f6; color: #111827; }
  .btn.ghost:hover { background: #e5e7eb; }
  `]
})
export class PromotionFlyoutComponent {
  open = false;
  @Output() created = new EventEmitter<CustomPromotion>();

  model: any = {
    title: '',
    discount: 10,
    payment_methods: [],
    limit: { amount: 10000, times: 'each', mode: 'user', period: 'month' },
    validity: { from: '', to: '', days_of_week: null, specific_dates: null }
  };
  paymentMethods = '';
  daysOfWeek = '';
  specificDates = '';

  constructor(private readonly store: PromotionsStorageService, private readonly toast: ToastService) {}

  show() { this.open = true; }
  close() { this.open = false; }

  submit() {
    if (!this.model.title || !this.model.validity.from || !this.model.validity.to) {
      this.toast.error('Completá título y fechas');
      return;
    }
    const promo = {
      title: this.model.title.trim(),
      discount: Number(this.model.discount) || 0,
      payment_methods: this.paymentMethods ? this.paymentMethods.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      limit: { ...this.model.limit, amount: Number(this.model.limit.amount) || 0 },
      validity: {
        from: this.model.validity.from,
        to: this.model.validity.to,
        days_of_week: this.daysOfWeek ? this.daysOfWeek.split(',').map((n: string) => Number(n.trim())).filter((n: any) => !isNaN(n)) : null,
        specific_dates: this.specificDates ? this.specificDates.split(',').map((s: string) => s.trim()).filter(Boolean) : null
      }
    };

    const saved = this.store.add(promo as any);
    this.toast.success('Promoción creada');
    this.created.emit(saved as any);
    this.reset();
    this.close();
  }

  private reset() {
    this.model = { title: '', discount: 10, payment_methods: [], limit: { amount: 10000, times: 'each', mode: 'user', period: 'month' }, validity: { from: '', to: '', days_of_week: null, specific_dates: null } };
    this.paymentMethods = '';
    this.daysOfWeek = '';
    this.specificDates = '';
  }
}
