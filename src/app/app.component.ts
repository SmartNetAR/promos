import { Component, OnDestroy, ViewChild } from '@angular/core';
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
  favouritePromotions = this.promotionsService.getFavouritePromotions() || [];
  otherPromotions = this.promotions.filter(promo => !promo.isFavourite);

  private destroyed$ = new Subject<void>();
  @ViewChild(PurchaseFlyoutComponent) purchaseFlyout?: PurchaseFlyoutComponent;

  constructor(
    private readonly promotionsService: PromotionsService,
  private readonly favs: FavouritesService,
  private readonly shopping: ShoppingService,
  private readonly toast: ToastService
  ) {
    this.favs.favourites$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.recomputeLists());
  }

  recomputeLists() {
    this.promotions = this.promotionsService.getPromotions() || [];
    this.favouritePromotions = this.promotionsService.getFavouritePromotions() || [];
    this.otherPromotions = this.promotions.filter(p => !p.isFavourite);
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
