import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Toast, ToastService } from '../toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.css']
})
export class ToastContainerComponent implements OnDestroy {
  toasts: Toast[] = [];
  private destroyed$ = new Subject<void>();

  constructor(private readonly toast: ToastService) {
    this.toast.toasts$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(list => this.toasts = list);
  }

  dismiss(id: number) { this.toast.dismiss(id); }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
