import { startOfDay, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { DateIntervalService } from './date-interval.service';

export class PromotionModel {
    private readonly isoValidDates: { from: Date; to: Date }[];
    private readonly purchases: any[];

    constructor(
        private readonly raw: any,
        private readonly dateSvc: DateIntervalService,
        private readonly today: Date,
        purchases: any[]
    ) {
        this.purchases = purchases.map(p => ({ ...p, date: startOfDay(parseISO(p.date)) }));
        const validDates = this.dateSvc.getValidDates(parseISO(raw.validity.from), parseISO(raw.validity.to), raw.validity, raw.limit.period);
        this.isoValidDates = validDates.map(d => ({ from: startOfDay(parseISO(d.from)), to: startOfDay(parseISO(d.to)) }));
    }

    get id() { return this.raw.id; }
    get title() { return this.raw.title; }
    get payment_methods() { return this.raw.payment_methods; }
    get discount() { return this.raw.discount; }
    get limit() { return this.raw.limit; }
    get validity() { return this.raw.validity; }

    get isFavourite(): boolean { return !!this.raw.isFavourite; }

    get calculatedPurchaseAmount() {
        return this.raw.limit.amount * 100 / this.raw.discount;
    }

    get purchasesMade() { return this.purchases; }

    get pastDates() {
        const past = this.isoValidDates.filter(d => d.to < this.today)
            .map(d => ({ ...d, purchases: this.dateSvc.getPurchasesByInterval(this.purchases, d) }));
        return past;
    }

    get activeDate() {
        const active = this.dateSvc.getActiveDate(this.isoValidDates, this.today);
        if (!active) return null;

        const purchasesInInterval = this.dateSvc.getPurchasesByInterval(this.purchases, active);
        let totalAmountPurchased = purchasesInInterval.reduce((acc, x) => acc + x.amount, 0) ?? 0;
        let totalAmountRefunded = 0;

        if (this.raw.limit.period === 'month') {
            const start = startOfMonth(this.today);
            const end = endOfMonth(this.today);
            const inMonth = this.dateSvc.getPurchasesByInterval(this.purchases, { from: start, to: end });
            totalAmountPurchased = inMonth.reduce((acc, x) => acc + x.amount, 0) ?? 0;
        }

        if (totalAmountPurchased !== 0) {
            totalAmountRefunded = totalAmountPurchased * this.raw.discount / 100;
            totalAmountRefunded = totalAmountRefunded > this.raw.limit.amount ? this.raw.limit.amount : totalAmountRefunded;
        }

        const availableAmountToPurchase = this.getAvailableAmountToPurchase(this.raw, this.calculatedPurchaseAmount, totalAmountPurchased, this.isoValidDates);

        return {
            ...active,
            purchases: purchasesInInterval,
            totalAmountPurchased,
            totalAmountRefunded,
            availableAmountToPurchase
        };
    }

    get futureDates() {
        return this.isoValidDates.filter(d => d.from > this.today);
    }

    private getAvailableAmountToPurchase(promo: any, calculatedPurchaseAmount: number, totalAmountPurchased: number, _isoValidDates: any): number {
        if (promo.limit.mode === 'user') {
            const availableAmountToPurchase = calculatedPurchaseAmount - totalAmountPurchased;
            return availableAmountToPurchase > 0 ? availableAmountToPurchase : 0;
        }
        return calculatedPurchaseAmount;
    }
}
