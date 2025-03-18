import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { format, startOfDay } from 'date-fns';
import { ShoppingService } from '../shopping.service';

@Component({
  selector: 'app-promotion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './promotion.component.html',
  styleUrl: './promotion.component.css'
})
export class PromotionComponent {
  @Input() promotion: any;

  constructor(private readonly shoppingService: ShoppingService) { }

  addPurchase(promotion: any, paymentMethod: string) {

    this.shoppingService.addPurchase(promotion, paymentMethod);
  }

  removePurchase(purchase: any) {
    this.shoppingService.removePurchase(purchase.id);
  }
}
