import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Toast, ToastService } from '../toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="toast-wrap" *ngIf="toasts.length > 0">
    <div class="toast enter" *ngFor="let t of toasts" [class.success]="t.type==='success'" [class.error]="t.type==='error'">
      <span class="msg">{{ t.message }} <small class="count" *ngIf="(t.count ?? 1) > 1">×{{ t.count }}</small></span>
      <button type="button" class="close" (click)="dismiss(t.id)" aria-label="Cerrar">×</button>
    </div>
  </div>
  `,
  styles: [`
  .toast-wrap { position: fixed; left: 50%; transform: translateX(-50%); bottom: 16px; z-index: 1000; display: flex; flex-direction: column; gap: 8px; }
  .toast { background: #1f2937; color: white; padding: 10px 12px; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.2); display: flex; gap: 12px; align-items: center; opacity: 0; transform: translateY(8px); transition: opacity .2s ease, transform .2s ease; }
  .toast.enter { opacity: 1; transform: translateY(0); }
  .toast.success { background: #065f46; }
  .toast.error { background: #7f1d1d; }
  .toast .close { background: transparent; border: none; color: inherit; font-size: 18px; line-height: 1; cursor: pointer; }
  .msg { font-size: 14px; }
  .count { opacity: .8; }
  `]
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
