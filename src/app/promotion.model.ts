import { startOfDay, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { DateIntervalService } from './date-interval.service';
import { PromotionComputationPipeline } from './promotion-computation/promotion-pipeline';
import { BuildIntervalsStep } from './promotion-computation/steps/build-intervals.step';
import { SelectActiveIntervalStep } from './promotion-computation/steps/select-active.step';
import { AggregatePurchasesStep } from './promotion-computation/steps/aggregate-purchases.step';
import { ComputeAvailableAmountStep } from './promotion-computation/steps/compute-available.step';

export class PromotionModel {
    private readonly isoValidDates: { from: Date; to: Date }[];
    private readonly purchases: any[];
    private pipelineResult: any | null = null;

    constructor(
        private readonly raw: any,
        private readonly dateSvc: DateIntervalService,
        private readonly today: Date,
        purchases: any[]
    ) {
        this.purchases = purchases.map(p => ({ ...p, date: startOfDay(parseISO(p.date)) }));
        const validDates = this.dateSvc.getValidDates(parseISO(raw.validity.from), parseISO(raw.validity.to), raw.validity, raw.limit.period);
        this.isoValidDates = validDates.map(d => ({ from: startOfDay(parseISO(d.from)), to: startOfDay(parseISO(d.to)) }));
        // Run pipeline early (idempotent) so getters use unified logic
        const pipeline = new PromotionComputationPipeline([
            new BuildIntervalsStep(this.dateSvc),
            new SelectActiveIntervalStep(),
            new AggregatePurchasesStep(),
            new ComputeAvailableAmountStep()
        ]);
        this.pipelineResult = pipeline.run({ raw: this.raw, today: this.today, purchases });
    }

    get id() { return this.raw.id; }
    get title() { return this.raw.title; }
    get payment_methods() { return this.raw.payment_methods; }
    get discount() { return this.raw.discount; }
    get limit() { return this.raw.limit; }
    get validity() { return this.raw.validity; }
    get stacking() { return this.raw.stacking; }
    get minAmount(): number | undefined { return this.raw.minAmount; }
    get isStackable(): boolean { return !!this.raw.stacking?.stackable; }
    get stackingType(): string | undefined { return this.raw.stacking?.type; }

    get isFavourite(): boolean { return !!this.raw.isFavourite; }

    get calculatedPurchaseAmount() {
        return this.raw.limit.amount * 100 / this.raw.discount;
    }

    get purchasesMade() { return this.purchases; }

    get pastDates() {
        // derive from pipeline intervals (those ending before today)
        const intervals = this.pipelineResult?.intervals || this.isoValidDates;
        return intervals.filter((d: any) => d.to < this.today)
            .map((d: any) => ({ ...d, purchases: this.dateSvc.getPurchasesByInterval(this.purchases, d) }));
    }

    get activeDate() {
        const active = this.pipelineResult?.activeInterval;
        if (!active) return null;
        return {
            from: active.from,
            to: active.to,
            purchases: active.purchases,
            totalAmountPurchased: active.totalAmountPurchased,
            totalAmountRefunded: active.totalAmountRefunded,
            availableAmountToPurchase: active.availableAmountToPurchase,
            perMethod: (active as any).perMethod
        };
    }

    get futureDates() {
        return this.isoValidDates.filter(d => d.from > this.today);
    }

    canStackWith(other: PromotionModel): boolean {
        if (!this.isStackable || !other.isStackable) return false;
        const thisExtra = this.stackingType === 'extra';
        const otherExtra = other.stackingType === 'extra';
        // base + base not allowed
        if (!thisExtra && !otherExtra) return false;
        // extra + extra allowed only if there is a shared base anchor (handled externally); pairwise extras alone shouldn't stack
        if (thisExtra && otherExtra) return false; // direct pair of extras without base context
        const extraPromo = thisExtra ? this : other;
        const basePromo = thisExtra ? other : this;
    const list: string[] | undefined = extraPromo.raw.stacking?.appliesWith;
    if (!list) return true;
    return list.includes(String(basePromo.id));
    }

    private getAvailableAmountToPurchase(_promo: any, calculatedPurchaseAmount: number, _totalAmountPurchased: number, _isoValidDates: any): number {
        // Retained for backward compatibility (unused with pipeline but kept to avoid breaking external refs)
        return calculatedPurchaseAmount;
    }
}
