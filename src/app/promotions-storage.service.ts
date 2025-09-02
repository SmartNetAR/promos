import { Injectable } from '@angular/core';

export interface CustomPromotionLimit {
  amount: number;
  times: 'each' | 'once';
  mode: 'user' | 'payment_methods';
  period: 'day' | 'week' | 'month';
}

export interface CustomPromotionValidity {
  from: string; // ISO date YYYY-MM-DD
  to: string;   // ISO date YYYY-MM-DD
  days_of_week?: number[] | null; // 0..6
  specific_dates?: string[] | null; // ISO dates
}

export interface CustomPromotion {
  id: number;
  title: string;
  payment_methods: string[];
  discount: number;
  limit: CustomPromotionLimit;
  validity: CustomPromotionValidity;
}

@Injectable({ providedIn: 'root' })
export class PromotionsStorageService {
  private readonly key = 'custom-promotions';

  load(): CustomPromotion[] {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  save(list: CustomPromotion[]): void {
    localStorage.setItem(this.key, JSON.stringify(list));
  }

  add(promo: Omit<CustomPromotion, 'id'>): CustomPromotion {
    const list = this.load();
    const nextId = list.length > 0 ? Math.max(...list.map(p => p.id)) + 1 : 1000;
    const withId: CustomPromotion = { id: nextId, ...promo } as CustomPromotion;
    list.push(withId);
    this.save(list);
    return withId;
  }
}
