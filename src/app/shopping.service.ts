import { Injectable } from '@angular/core';
import { compareDesc, parse, startOfDay } from 'date-fns';

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
    const today = startOfDay(new Date());
    const amount = prompt('Ingrese el monto de la compra');
    if (!amount || !parseFloat(amount)) return;
    const date = prompt(`Ingrese la fecha de la compra (${today.toISOString().split('T')[0]})`, today.toISOString().split('T')[0]);
    const storeName = prompt('Ingrese el nombre del comercio');
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
    localStorage.setItem('shopping', JSON.stringify(this.shopping));
  }

  private getStorage() {
    const shopping = localStorage.getItem('shopping');

    if (shopping) {
      this.shopping = JSON.parse(shopping);
    }
  }
}
