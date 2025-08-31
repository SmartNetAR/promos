import { Injectable } from '@angular/core';
import { addDays, addMonths, endOfMonth, format, getDay, isAfter, isBefore, isWithinInterval, max, min, parseISO, startOfDay, startOfMonth } from 'date-fns';
import data from './data/promotions.json';
import { ShoppingService } from './shopping.service';
import { ValidDate } from './valid-date';

@Injectable({
  providedIn: 'root'
})
export class PromotionsService {
  private readonly allDaysOfWeekAmount = 7;
  favouriteIds: number[] = [];
  // private readonly today = startOfDay(parseISO("2025-08-27"));
  private readonly today = startOfDay(new Date());

  constructor(private readonly shoppingService: ShoppingService) {
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
      .filter(filterPromos).map(promo => {
      const self = this;
      const fromDate = parseISO(promo.validity.from);
      const toDate = parseISO(promo.validity.to);
      const validDates = this.getValidDates(fromDate, toDate, promo.validity, promo.limit.period);
      const purchases = self.shoppingService.getPurchasesByPromoId(promo.id)
        .map(purchase => ({
          ...purchase,
          date: startOfDay(parseISO(purchase.date))
        }));

      const isoValidDates = validDates.map(date => ({
        from: startOfDay(parseISO(date.from)),
        to: startOfDay(parseISO(date.to))
      }));

      const mappedPromo = {
        ...promo,
        isFavourite: this.favouriteIds.includes(promo.id),
        get calculatedPurchaseAmount() {
          return promo.limit.amount * 100 / promo.discount;
        },
        get purchasesMade() {
          return purchases;
        },
        get pastDates() {
          const pastDates = isoValidDates.filter(date =>
            isBefore(date.to, self.today)
          ).map(date => ({
            ...date,
            purchases: self.getPurchasesByInterval(purchases, date)
          }));

          return pastDates;
        },
        get activeDate() {
          const activeDate = self.getActiveDate(isoValidDates);

          if (activeDate) {

            const purchasesInThisInterval = self.getPurchasesByInterval(purchases, activeDate);

            let totalAmountPurchasedInThisInterval = purchasesInThisInterval.reduce((acc, purchase) => acc + purchase.amount, 0) ?? 0;

            let totalAmountRefunded = 0;

            if (promo.limit.period === 'month') {
              const start = startOfMonth(self.today);
              const end = endOfMonth(self.today);

              const purchasesInThisMonth = self.getPurchasesByInterval(purchases, { from: start, to: end });

              totalAmountPurchasedInThisInterval = purchasesInThisMonth.reduce((acc, purchase) => acc + purchase.amount, 0) ?? 0;
            }

            if (totalAmountPurchasedInThisInterval !== 0) {

              totalAmountRefunded = totalAmountPurchasedInThisInterval * promo.discount / 100;

              totalAmountRefunded = totalAmountRefunded > promo.limit.amount ? promo.limit.amount : totalAmountRefunded;
            }

            const availableAmountToPurchase = self.getAvailableAmountToPurchase(promo, this.calculatedPurchaseAmount, totalAmountPurchasedInThisInterval, isoValidDates)


            return {
              ...activeDate,
              purchases: purchasesInThisInterval,
              totalAmountPurchased: totalAmountPurchasedInThisInterval,
              totalAmountRefunded: totalAmountRefunded,
              availableAmountToPurchase: availableAmountToPurchase
            };
          }

          return null;
        },
        get futureDates() {
          return isoValidDates.filter(date =>
            isAfter(date.from, self.today)
          );
        }
      };

      return mappedPromo;
    });
  }

  getFavouritePromotions() {
    return this.getPromotions().filter(promo => promo.isFavourite);
  }

  // period: 'day' | 'week' | 'month' | 'year'
  private getValidDates(fromDate: Date, toDate: Date, validity: any, period: string): ValidDate[] {
    const validDates: ValidDate[] = [];
    let currentDate = fromDate;
    let weekDates: string[] = [];

    if (validity.specific_dates != null) {
      validity.specific_dates
        .map((specificDate: string) => parseISO(specificDate))
        .forEach((specificDate: Date) => {
          weekDates.push(format(specificDate, 'yyyy-MM-dd'));
          if (weekDates.length === 1) {
            validDates.push({ from: weekDates[0], to: weekDates[0] });
          } else {
            validDates.push({ from: weekDates[0], to: weekDates[weekDates.length - 1] });
          }

          weekDates = [];
        });
    }


    if (validity.days_of_week != null) {
      if (validity.days_of_week.length === this.allDaysOfWeekAmount) {

        // When a promotion is valid for months, we need to calculate the valid dates for each month
        if (period === 'month') {
          const ranges: any[] = [];
          let currentStartDate = startOfMonth(fromDate);

          while (currentStartDate <= toDate) {
            ranges.push({
              from: format(max([currentStartDate, fromDate]), 'yyyy-MM-dd'),
              to: format(min([endOfMonth(currentStartDate), toDate]), 'yyyy-MM-dd')
            });

            currentStartDate = addMonths(currentStartDate, 1);
          }

          return ranges;
        } else {
          return [{ from: format(fromDate, 'yyyy-MM-dd'), to: format(toDate, 'yyyy-MM-dd') }];
        }
      }

      const firstDayOfPromoInWeek = validity.days_of_week[0];
      const lastDayOfPromoInWeek = validity.days_of_week[validity.days_of_week.length - 1];
      while (isBefore(currentDate, addDays(toDate, 1))) {
        const dayOfWeek = getDay(currentDate);

        if (validity.days_of_week.includes(dayOfWeek)) {
          weekDates.push(format(currentDate, 'yyyy-MM-dd'));
        }

        currentDate = addDays(currentDate, 1);
      }

      let from: Date | undefined;
      let to: Date | undefined;
      weekDates
        .map(date => parseISO(date))
        .forEach((date, idx) => {
          const dayOfWeek = getDay(date);

          if (dayOfWeek === firstDayOfPromoInWeek || idx === 0) {
            from = date;
          }

          if (dayOfWeek === lastDayOfPromoInWeek || idx === weekDates.length - 1) {
            to = date;
          }

          if (from && to) {
            validDates.push({ from: format(from, 'yyy-MM-dd'), to: format(to, 'yyy-MM-dd') });
            from = undefined;
            to = undefined;
          }
        });
    }

    return validDates;
  }

  private getActiveDate(isoValidDates: any[]) {
    const activeDate = isoValidDates.find(date =>
      isWithinInterval(this.today, {
        start: date.from,
        end: date.to
      })
    );

    return activeDate;
  }

  private getPurchasesByInterval(purchases: any[], intervalDates: any) {
    return purchases.filter(purchase => isWithinInterval(purchase.date, {
      start: intervalDates.from,
      end: intervalDates.to
    }));
  }

  private getAvailableAmountToPurchase(promo: any, calculatedPurchaseAmount: number, totalAmountPurchased: number, isoValidDates: any): number {
    if (promo.limit.mode === 'user') {
      if (promo.limit.period === 'month' ) {
        const start = startOfMonth(this.today);
        const end = endOfMonth(this.today);

        // const purchasesInThisMonth = this.getPurchasesByInterval(isoValidDates[0]., { from: start, to: end });

        console.log('>>> [promo]', promo);
        console.log('>>> [isoValidDates]', isoValidDates);
        // console.log('>>> [purchasesInThisMonth]', purchasesInThisMonth);

      }
      const availableAmountToPurchase = calculatedPurchaseAmount - totalAmountPurchased;

      return availableAmountToPurchase > 0 ? availableAmountToPurchase : 0;
    }

    return calculatedPurchaseAmount;
  }
}
