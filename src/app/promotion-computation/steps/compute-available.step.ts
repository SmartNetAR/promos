import { PromotionComputationStep, PromotionPipelineContext } from '../promotion-pipeline';

export class ComputeAvailableAmountStep implements PromotionComputationStep {
  run(ctx: PromotionPipelineContext): PromotionPipelineContext {
    if (!ctx.activeInterval) return ctx;
    const raw = ctx.input.raw;
    // Backwards compatibility semantics:
    // - Original model: limit.amount represents the aggregate refund cap for the active period.
    // - New model (when limit.totalCap present):
    //      * limit.amount => per-purchase refund cap
    //      * limit.totalCap => aggregate refund cap for the period
    // For promotions without totalCap we keep previous behavior.

    const hasTotalCap = typeof raw.limit?.totalCap === 'number';
    const aggregateRefundCap: number = hasTotalCap ? raw.limit.totalCap : raw.limit.amount;
    const perPurchaseRefundCap: number = hasTotalCap ? raw.limit.amount : raw.limit.amount; // same field, different meaning when hasTotalCap

    const discountPct: number = raw.discount;

    // Compute refund per purchase respecting per-purchase cap when totalCap is present (or legacy semantics treat it the same field)
    const purchases = ctx.activeInterval.purchases || [];
    let totalRefundRaw = 0; // sum BEFORE applying aggregate cap
    let effectivePurchasedForRefund = 0; // purchase amount that contributed to refund (capped per purchase when per-purchase cap exists)
    const perPurchaseEffectivePurchaseCap = perPurchaseRefundCap * 100 / discountPct; // purchase amount that yields (potentially) the max per-purchase refund

    for (const p of purchases) {
      const potentialRefund = p.amount * discountPct / 100;
      const refundForPurchase = Math.min(potentialRefund, perPurchaseRefundCap);
      totalRefundRaw += refundForPurchase;
      // Effective purchased amount towards aggregate refund capacity cannot exceed the amount that would yield the granted refund
      // i.e., clamp each purchase's contribution to the portion that produced discount (mirrors refundForPurchase inverted by discount pct)
      const effectivePurchasePortion = Math.min(p.amount, (refundForPurchase * 100) / discountPct, perPurchaseEffectivePurchaseCap);
      effectivePurchasedForRefund += effectivePurchasePortion;
    }

    const totalAmountRefunded = Math.min(totalRefundRaw, aggregateRefundCap);

    // Available amount to purchase (showing remaining purchase volume that can still generate refunds):
    // For legacy (no totalCap): same formula as before based on aggregate cap treated as a single-purchase theoretical maximum.
    // For totalCap case: base it on remaining refund capacity translated to purchase volume, net of effective purchased amount.
    let availableAmountToPurchase: number;
    if (!hasTotalCap) {
      // Special handling for mode=payment_methods: each payment method has its own independent refund cap (limit.amount)
  if (raw.limit?.mode === 'payment_methods' && Array.isArray(raw.payment_methods) && raw.payment_methods.length > 0) {
        // Compute refund per payment method capped individually
        const methods: string[] = raw.payment_methods;
        const purchasesByMethod: Record<string, { purchased: number; refund: number; remainingRefund: number; remainingPurchase: number; }> = {};
        for (const m of methods) {
          purchasesByMethod[m] = { purchased: 0, refund: 0, remainingRefund: raw.limit.amount, remainingPurchase: (raw.limit.amount * 100 / discountPct) };
        }
        for (const p of purchases) {
          const m = p.paymentMethod;
            if (!purchasesByMethod[m]) {
              // In case a purchase has a method not listed (defensive): initialize it (won't expand potential capacity)
              purchasesByMethod[m] = { purchased: 0, refund: 0, remainingRefund: raw.limit.amount, remainingPurchase: (raw.limit.amount * 100 / discountPct) };
            }
            purchasesByMethod[m].purchased += p.amount;
        }
        let totalRefund = 0;
        let totalRemainingPurchaseCapacity = 0;
        for (const m of Object.keys(purchasesByMethod)) {
          const entry = purchasesByMethod[m];
          const rawRefund = entry.purchased * discountPct / 100;
          const cappedRefund = Math.min(rawRefund, raw.limit.amount);
          entry.refund = cappedRefund;
          entry.remainingRefund = Math.max(0, raw.limit.amount - cappedRefund);
          entry.remainingPurchase = entry.remainingRefund * 100 / discountPct;
          totalRefund += cappedRefund;
        }
        for (const m of Object.keys(purchasesByMethod)) {
          const entry = purchasesByMethod[m];
          totalRemainingPurchaseCapacity += entry.remainingPurchase;
        }
        let perMethodArray = Object.keys(purchasesByMethod).map(k => ({ method: k, ...purchasesByMethod[k] }));
        // Add usage fraction and sort by remainingRefund desc (methods with more saldo first for usability)
        perMethodArray = perMethodArray.map(m => ({ ...m, usageFraction: (raw.limit.amount - m.remainingRefund) / raw.limit.amount }))
          .sort((a, b) => b.remainingRefund - a.remainingRefund);
        // Override totalAmountRefunded derived earlier (which assumed aggregate refund cap)
        const activeInterval = { ...ctx.activeInterval, totalAmountRefunded: totalRefund, availableAmountToPurchase: totalRemainingPurchaseCapacity, perMethod: perMethodArray };
        return { ...ctx, activeInterval };
      } else {
        const discountedMaxPurchase = aggregateRefundCap * 100 / discountPct; // identical to previous formula
        availableAmountToPurchase = Math.max(0, discountedMaxPurchase - ctx.activeInterval.totalAmountPurchased);
      }
    } else {
      const maxEligibleAggregatePurchase = aggregateRefundCap * 100 / discountPct;
      const remainingRefundCapacity = Math.max(0, aggregateRefundCap - totalAmountRefunded);
      // Remaining purchase capacity should reflect only the part that can still yield refund. We subtract effective purchased (capped) from aggregate eligible.
      // This avoids prematurely hitting 0 when raw purchased amount exceeded effective refundable portion due to per-purchase caps.
      const remainingPurchaseCapacity = Math.max(0, maxEligibleAggregatePurchase - effectivePurchasedForRefund);
      // Guard: if no refund capacity left, zero out.
      availableAmountToPurchase = remainingRefundCapacity === 0 ? 0 : remainingPurchaseCapacity;
    }

    const activeInterval = { ...ctx.activeInterval, totalAmountRefunded, availableAmountToPurchase };
    // Fallback: for single-payment-method promotions (not mode=payment_methods) build a perMethod structure
    if (!hasTotalCap || hasTotalCap) { // unconditional check scope
      const rawMethods = Array.isArray(raw.payment_methods) ? raw.payment_methods : [];
      if (!('perMethod' in activeInterval) && rawMethods.length === 1) {
        const method = rawMethods[0];
        const purchasesForMethod = (activeInterval.purchases || []).filter((p: any) => p.paymentMethod === method);
        const purchased = purchasesForMethod.reduce((a: number, b: any) => a + (b.amount || 0), 0);
        const potentialRefund = purchased * discountPct / 100;
        const cap = hasTotalCap ? aggregateRefundCap : (raw.limit?.amount || aggregateRefundCap);
        const refund = Math.min(potentialRefund, totalAmountRefunded); // ensure we don't exceed already computed aggregate refunded
        const remainingRefund = Math.max(0, cap - refund);
        const remainingPurchase = remainingRefund * 100 / discountPct;
        const usageFraction = cap > 0 ? refund / cap : 0;
        (activeInterval as any).perMethod = [{ method, purchased, refund, remainingRefund, remainingPurchase, usageFraction }];
      }
    }
    return { ...ctx, activeInterval };
  }
}
