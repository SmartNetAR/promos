import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { startOfDay } from 'date-fns';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { ClockService } from './clock.service';
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
  private promotions$?: Observable<any[]>;

  constructor(
    private readonly http: HttpClient,
    private readonly shoppingService: ShoppingService,
    private readonly dateSvc: DateIntervalService,
  private readonly clock: ClockService,
  private readonly registry: PromotionsRegistryService,
  private readonly favs: FavouritesService
  ) {
    // this.favouriteIds.push(1, 4, 6);

  }

  private buildStream(): Observable<any[]> {
    // Cache-buster using build hash (preferred) else build timestamp; ignore unreplaced placeholders
    const w: any = window as any;
    let v: any = w.__buildHash;
    if (!v || (typeof v === 'string' && v.indexOf('%') !== -1)) {
      v = w.__APP_BUILD_TS || Date.now();
    }
    // Optional: expose chosen version for diagnostics (only first time)
    if (!w.__promosVersionLogged) {
      // eslint-disable-next-line no-console
      console.debug('[Promotions] version param =', v);
      w.__promosVersionLogged = true;
    }
    return this.http.get<any[]>(`data/promotions.json?v=${v}`)
      .pipe(
        map(raw => raw.map(promo => {
          const purchases = this.shoppingService.getPurchasesByPromoId(String(promo.id));
          const model = new PromotionModel({ ...promo, isFavourite: this.favs.has(String(promo.id)) }, this.dateSvc, this.today, purchases);
          return model as any;
        })),
        map(list => {
          this.registry.register(list);
          (window as any).__promos = list;
          return list;
        }),
        shareReplay(1)
      );
  }

  getPromotions$(): Observable<any[]> {
    if (!this.promotions$) this.promotions$ = this.buildStream();
    return this.promotions$;
  }

  // Backwards compatibility: provide synchronous snapshot (may be empty if not yet loaded)
  getPromotionsSnapshot(): any[] {
    // Not storing last value separately yet; components should migrate to observable
    return (window as any).__promos || [];
  }

  // Legacy method retained for existing tests that call getPromotions synchronously.
  getPromotions(): any[] { return this.getPromotionsSnapshot(); }

  getFavouritePromotions$(): Observable<any[]> {
    return this.getPromotions$().pipe(map(list => list.filter(p => this.favs.has(p.id) || p.isFavourite)));
  }

  // Keeping service slim; date and interval logic extracted to DateIntervalService and PromotionModel
}
