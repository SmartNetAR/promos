import { startOfDay, parseISO } from 'date-fns';
import { DateIntervalService } from '../date-interval.service';

export interface PromotionPipelineInput {
  raw: any; // original promotion json
  today: Date;
  purchases: { amount: number; date: string }[];
}

export interface PromotionInterval {
  from: Date; to: Date;
  purchases: any[];
  totalAmountPurchased: number;
  totalAmountRefunded: number;
  availableAmountToPurchase: number;
}

export interface PromotionPipelineContext {
  input: PromotionPipelineInput;
  intervals: { from: Date; to: Date }[];
  activeInterval: PromotionInterval | null;
}

export interface PromotionComputationStep {
  run(ctx: PromotionPipelineContext): PromotionPipelineContext;
}

export class PromotionComputationPipeline {
  constructor(private readonly steps: PromotionComputationStep[]) {}

  run(input: PromotionPipelineInput): PromotionPipelineContext {
    let ctx: PromotionPipelineContext = {
      input,
      intervals: [],
      activeInterval: null
    };
    for (const step of this.steps) {
      ctx = step.run(ctx);
    }
    return ctx;
  }
}
