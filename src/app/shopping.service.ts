import { Injectable } from '@angular/core';
import { compareDesc, parse, startOfDay } from 'date-fns';
import { StorageService } from './storage.service';
import { InteractionService } from './interaction.service';
import { Purchase, normalizeIsoDate, isStacked } from './purchase.model';

@Injectable({
  providedIn: 'root'
})
export class ShoppingService {
  shopping: Purchase[] = [];

  constructor(private readonly storage: StorageService, private readonly ui: InteractionService) {
    this.shopping = (this.storage.load() as any[]).map((p, idx) => {
      // Normalize date to YYYY-MM-DD once
      const date = normalizeIsoDate(p.date);
      return { ...p, id: p.id ?? (idx + 1), date } as Purchase;
    });
  }

  getPurchasesByPromoId(promoId: string): Purchase[] {
    return this.shopping
      .filter(purchase => (purchase as any).promoId === promoId || (isStacked(purchase) && purchase.promoIds.includes(promoId)))
      .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)));
  }

  addPurchase(promotion: any, paymentMethod: string) {
    const today = startOfDay(new Date());
    const amount = this.ui.prompt('Ingrese el monto de la compra');
    if (!amount || !parseFloat(amount)) return;
    const date = this.ui.prompt(`Ingrese la fecha de la compra (${today.toISOString().split('T')[0]})`, today.toISOString().split('T')[0]);
    const storeName = this.ui.prompt('Ingrese el nombre del comercio');
    if (!storeName) return;

    const shopping: Purchase = {
      id: this.shopping.length + 1,
      promoId: String(promotion.id),
      amount: parseFloat(amount),
      date: normalizeIsoDate(date || new Date()),
      storeName: storeName,
      paymentMethod
    };

    this.shopping.push(shopping);
    this.updateStorage();
  }

  addPurchaseDirect(promotion: any, paymentMethod: string, amount: number, isoDate: string, storeName: string) {
    if (!amount || !isoDate || !storeName) return;
    if (promotion?.minAmount && amount < promotion.minAmount) {
      return; // ignore purchases that don't reach the minimum
    }
    const shopping: Purchase = {
      id: this.shopping.length + 1,
      promoId: String(promotion.id),
      amount: parseFloat(String(amount)),
      date: normalizeIsoDate(isoDate),
      storeName: storeName,
      paymentMethod
    } as Purchase;
    this.shopping.push(shopping);
    this.updateStorage();
  }

  addStackedPurchase(promotions: any[], paymentMethod: string, amount: number, isoDate: string, storeName: string, breakdown: any, finalAmount: number) {
    if (!amount || !isoDate || !storeName || promotions.length < 2) return;
    // For stacked purchases, require that every promo with minAmount is satisfied
    const unmet = promotions.filter(p => p.minAmount && amount < p.minAmount);
    if (unmet.length) return; // abort storing
    const shopping: Purchase = {
      id: this.shopping.length + 1,
      promoIds: promotions.map(p => String(p.id)),
      amount: parseFloat(String(amount)), // base amount
      finalAmount: parseFloat(String(finalAmount)),
      date: normalizeIsoDate(isoDate),
      storeName,
      paymentMethod,
      breakdown
    } as Purchase;
    this.shopping.push(shopping);
    this.updateStorage();
  }

  removePurchase(purchaseId: number) {
    this.shopping = this.shopping.filter(purchase => purchase.id !== purchaseId);
    this.updateStorage();
  }

  editPurchase(update: { id: number; amount: number; date: string; storeName: string; }) {
    const idx = this.shopping.findIndex(p => p.id === update.id);
    if (idx >= 0) {
      this.shopping[idx] = { ...this.shopping[idx], amount: parseFloat(String(update.amount)), date: normalizeIsoDate(update.date), storeName: update.storeName } as Purchase;
      this.updateStorage();
    }
  }

  editStackedPurchase(update: { id: number; amount: number; date: string; storeName: string; breakdown: any[]; finalAmount: number; paymentMethod?: string; }) {
  const idx = this.shopping.findIndex(p => isStacked(p) && p.id === update.id && p.promoIds.length > 1);
    if (idx >= 0) {
      this.shopping[idx] = {
        ...this.shopping[idx],
        amount: parseFloat(String(update.amount)),
        finalAmount: parseFloat(String(update.finalAmount)),
        date: normalizeIsoDate(update.date),
        storeName: update.storeName,
        breakdown: update.breakdown,
        paymentMethod: update.paymentMethod ?? this.shopping[idx].paymentMethod
      } as Purchase;
      this.updateStorage();
    }
  }

  private updateStorage() {
    this.storage.save(this.shopping);
  }
}
