import { Injectable } from '@angular/core';
import { compareDesc, parse } from 'date-fns';

@Injectable({
  providedIn: 'root'
})
export class ShoppingService {
  shopping: any[] = [];

  constructor() {
    this.getStorage();
  }

  getPurchasesByPromoId(promoId: number) {
    return this.shopping
      .filter(purchase => purchase.promoId === promoId)
      .sort((a, b) => compareDesc(parse(a.date, 'dd-MM-yyyy', new Date()), parse(b.date, 'dd-MM-yyyy', new Date())));
  }

  addPurchase(promotion: any, paymentMethod: string) {
    const today = new Date();
    const amount = prompt('Ingrese el monto de la compra');
    const date = prompt('Ingrese la fecha de la compra (dd-mm-aaaa)', today.toISOString().split('T')[0]);
    const storeName = prompt('Ingrese el nombre del comercio');

    const shopping = {
      id: this.shopping.length + 1,
      promoId: promotion.id,
      amount: amount ? parseFloat(amount) : 0,
      date: date,
      storeName: storeName,
      paymentMethod
    };

    this.shopping.push(shopping);
    this.updateStorage();
  }

  removePurchase(purchaseId: number) {
    this.shopping = this.shopping.filter(purchase => purchase.id !== purchaseId);
  }

  private updateStorage() {
    localStorage.setItem('shopping', JSON.stringify(this.shopping));
  }

  private getStorage() {
    const shopping = localStorage.getItem('shopping');

    if (shopping) {
      this.shopping = JSON.parse(shopping);
    }
  }
}
