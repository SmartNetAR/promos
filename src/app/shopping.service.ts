import { Injectable } from '@angular/core';
import { compareDesc, parse, startOfDay } from 'date-fns';
import { StorageService } from './storage.service';
import { InteractionService } from './interaction.service';

@Injectable({
  providedIn: 'root'
})
export class ShoppingService {
  shopping: any[] = [];

  constructor(private readonly storage: StorageService, private readonly ui: InteractionService) {
    this.shopping = this.storage.load();
  }

  getPurchasesByPromoId(promoId: number) {
    return this.shopping
      .filter(purchase => purchase.promoId === promoId)
      .sort((a, b) => compareDesc(parse(a.date, 'dd-MM-yyyy', new Date()), parse(b.date, 'dd-MM-yyyy', new Date())));
  }

  addPurchase(promotion: any, paymentMethod: string) {
    const today = startOfDay(new Date());
    const amount = this.ui.prompt('Ingrese el monto de la compra');
    if (!amount || !parseFloat(amount)) return;
    const date = this.ui.prompt(`Ingrese la fecha de la compra (${today.toISOString().split('T')[0]})`, today.toISOString().split('T')[0]);
    const storeName = this.ui.prompt('Ingrese el nombre del comercio');
    if (!storeName) return;

    const shopping = {
      id: this.shopping.length + 1,
      promoId: promotion.id,
      amount: parseFloat(amount),
      date: date,
      storeName: storeName,
      paymentMethod
    };

    this.shopping.push(shopping);
    this.updateStorage();
  }

  removePurchase(purchaseId: number) {
    this.shopping = this.shopping.filter(purchase => purchase.id !== purchaseId);
    this.updateStorage();
  }

  private updateStorage() {
    this.storage.save(this.shopping);
  }
}
