export interface PurchaseBase {
  id: number;
  amount: number;          // Monto base original sin descuentos
  date: string;            // Siempre en formato ISO corto YYYY-MM-DD
  storeName: string;
  paymentMethod: string;
}

export interface SinglePurchase extends PurchaseBase {
  promoId: string;         // Promoción única
  finalAmount?: number;    // Igual a amount si no hubo stacking
  breakdown?: any[];       // Estructura opcional (p.ej. al convertir una compra single en stacked más tarde)
}

export interface StackedPurchase extends PurchaseBase {
  promoIds: string[];      // Conjunto de promociones aplicadas
  finalAmount: number;     // Monto final luego de descuentos combinados
  breakdown: any[];        // Detalle por promoción { promoId, percent, baseApplied, discountValue }
}

export type Purchase = SinglePurchase | StackedPurchase;

export function isStacked(p: Purchase): p is StackedPurchase {
  return Array.isArray((p as any).promoIds) && (p as any).promoIds.length > 1;
}

export function normalizeIsoDate(input: string | Date): string {
  if (input instanceof Date) return input.toISOString().slice(0,10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input; // already YYYY-MM-DD
  // Try to parse dd-MM-yyyy or dd/MM/yyyy
  const m = input.match(/^(\d{2})[-\/.](\d{2})[-\/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0,10) : d.toISOString().slice(0,10);
}
