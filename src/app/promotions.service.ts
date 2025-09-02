import { Injectable } from '@angular/core';
import { isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import data from './data/promotions.json';
import { ShoppingService } from './shopping.service';
import { ValidDate } from './valid-date';
import { DateIntervalService } from './date-interval.service';
import { PromotionModel } from './promotion.model';
import { ClockService } from './clock.service';

@Injectable({
  providedIn: 'root'
})
export class PromotionsService {
  favouriteIds: number[] = [];
  // private readonly today = startOfDay(parseISO("2025-08-27"));
  private get today() { return this.clock.today(); }

  constructor(private readonly shoppingService: ShoppingService, private readonly dateSvc: DateIntervalService, private readonly clock: ClockService) {
    // this.favouriteIds.push(1, 4, 6);

  }

  getPromotions() {

    const mayoristas = 1;
    const shell = 2;
    const dni = 3;
    const comercios_de_barrio = 4;
    const dia = 5;
    const supermercados = 6;
    const carrefour = 7;
    const todas = true;

    const filterPromos = ((promo: any) =>
      // promo.id === supermercados ||
      // promo.id === shell ||
      // promo.id === mayoristas ||
      todas
    );

    return data
      .filter(filterPromos)
      .map(promo => {
        const purchases = this.shoppingService.getPurchasesByPromoId(promo.id);
        const model = new PromotionModel({ ...promo, isFavourite: this.favouriteIds.includes(promo.id) }, this.dateSvc, this.today, purchases);
        // Keep shape compatible with components by returning the model instance (it exposes same getters/props)
        return model as any;
      });
  }

  getFavouritePromotions() {
    return this.getPromotions().filter(promo => promo.isFavourite);
  }

  // Keeping service slim; date and interval logic extracted to DateIntervalService and PromotionModel
}
