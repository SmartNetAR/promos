import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { format, startOfDay } from 'date-fns';
import { ShoppingService } from '../shopping.service';
import { FavouritesService } from '../favourites.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-promotion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './promotion.component.html',
  styleUrl: './promotion.component.css'
})
export class PromotionComponent {
  @Input() promotion: any;
  @Output() addPurchaseRequest = new EventEmitter<{ promo: any; paymentMethod: string }>();
  @Output() editPurchaseRequest = new EventEmitter<{ promo: any; purchase: any }>();
  showPastPurchases = false;

  constructor(
    private readonly shoppingService: ShoppingService,
  private readonly favs: FavouritesService,
  private readonly toast: ToastService
  ) { }

  get isFavourite(): boolean { return !!this.promotion?.isFavourite || this.favs.has(this.promotion?.id); }

  toggleFavourite(): void {
  const isFav = this.favs.toggle(this.promotion.id);
  this.toast.success(isFav ? 'Agregada a Favoritas' : 'Quitada de Favoritas');
  }

  addPurchase(promotion: any, paymentMethod: string) {
    this.addPurchaseRequest.emit({ promo: promotion, paymentMethod });
  }

  removePurchase(purchase: any) {
  this.shoppingService.removePurchase(purchase.id);
  this.toast.info('Compra eliminada');
  }

  editPurchase(purchase: any) {
    if (!this.promotion) return;
    this.editPurchaseRequest.emit({ promo: this.promotion, purchase });
  }

  availableProgress(): number | null {
    if (!this.promotion?.activeDate) return null;
    const total = this.promotion.calculatedPurchaseAmount;
    const purchased = this.promotion.activeDate.totalAmountPurchased ?? 0;
    if (!total) return null;
    const pct = Math.min(100, Math.max(0, Math.round((purchased / total) * 100)));
    return pct;
  }
}
