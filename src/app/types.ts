export interface LimitDTO {
    amount: number;
    times: 'each' | 'once';
    mode: 'user' | 'payment_methods' | string;
    period: 'day' | 'week' | 'month' | 'year' | string;
}

export interface ValidityDTO {
    from: string; // ISO yyyy-MM-dd
    to: string;   // ISO yyyy-MM-dd
    days_of_week?: number[]; // 0..6
    specific_dates?: string[]; // ISO dates
}

export interface PromotionDTO {
    id: number;
    title: string;
    payment_methods: string[];
    discount: number; // percentage
    limit: LimitDTO;
    validity: ValidityDTO;
}

export interface PurchaseDTO {
    id: number;
    promoId: number;
    amount: number;
    date: string; // ISO yyyy-MM-dd
    storeName: string;
    paymentMethod: string;
}

export interface DateInterval {
    from: Date;
    to: Date;
}