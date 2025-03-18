import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { PromotionsService } from './promotions.service';
import { PromotionComponent } from './promotion/promotion.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PromotionComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'promos';
  promotions = this.promotionsService.getPromotions() || [];
  favouritePromotions = this.promotionsService.getFavouritePromotions() || [];
  otherPromotions = this.promotions.filter(promo => !promo.isFavourite);

  constructor(private readonly promotionsService: PromotionsService) {
  }
}
