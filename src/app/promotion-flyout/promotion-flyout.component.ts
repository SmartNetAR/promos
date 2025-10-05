import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PromotionsStorageService, CustomPromotion } from '../promotions-storage.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-promotion-flyout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotion-flyout.component.html',
  styleUrls: ['./promotion-flyout.component.css']
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
