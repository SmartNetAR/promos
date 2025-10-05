import { Injectable } from '@angular/core';
import { startOfDay } from 'date-fns';
import { ClockService } from './clock.service';
import data from './data/promotions.json';
import { DateIntervalService } from './date-interval.service';
import { FavouritesService } from './favourites.service';
import { PromotionModel } from './promotion.model';
import { PromotionsRegistryService } from './promotions-registry.service';
import { ShoppingService } from './shopping.service';

@Injectable({
  providedIn: 'root'
})
export class PromotionsService {
  favouriteIds: (string|number)[] = [];
  // Dynamically resolve "today" so tests can control current date through ClockService
  private get today() { return startOfDay(this.clock.today()); }
  // private readonly today = startOfDay(parseISO("2025-09-22"));

  constructor(
    private readonly shoppingService: ShoppingService,
    private readonly dateSvc: DateIntervalService,
  private readonly clock: ClockService,
  private readonly registry: PromotionsRegistryService,
  private readonly favs: FavouritesService
  ) {
    // this.favouriteIds.push(1, 4, 6);

  }

  getPromotions() {

  const mayoristas = 'a3e6a1f2-6d5c-4d2a-9b32-1f2c6b3d9e01';
  const shell = 'b7f2c3d4-8a9e-4f1b-9023-5c7d8e9f0123';
  const dni = 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
  const comercios_de_barrio = 'd4e5f6a7-b8c9-4012-9345-6d7e8f9a0b1c';
  const dia = 'e5f6a7b8-c9d0-4123-a456-7e8f9a0b1c2d';
  const supermercados = 'f6a7b8c9-d0e1-4234-b567-8f9a0b1c2d3e';
  const carrefour = 'a7b8c9d0-e1f2-4345-c678-9a0b1c2d3e4f';
    const todas = true;

    const filterPromos = ((promo: any) =>
      // promo.id === supermercados ||
      // promo.id === shell ||
      // promo.id === mayoristas ||
      todas
    );

  const result = data
      .filter(filterPromos)
      .map(promo => {
    const purchases = this.shoppingService.getPurchasesByPromoId(String(promo.id));
  const model = new PromotionModel({ ...promo, isFavourite: this.favs.has(String(promo.id)) }, this.dateSvc, this.today, purchases);
        // Keep shape compatible with components by returning the model instance (it exposes same getters/props)
        return model as any;
      });
    this.registry.register(result);
    (window as any).__promos = result; // optional legacy global for components still using heuristic
    return result;
  }

  getFavouritePromotions() {
    return this.getPromotions().filter(promo => this.favs.has(promo.id) || promo.isFavourite);
  }

  // Keeping service slim; date and interval logic extracted to DateIntervalService and PromotionModel
}
