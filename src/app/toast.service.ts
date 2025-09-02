import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'info' | 'success' | 'error';
export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  timeout: number;
  count?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private list: Toast[] = [];
  private subject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.subject.asObservable();
  private timers = new Map<number, any>();

  show(message: string, type: ToastType = 'info', timeout = 3000, dedupe = true): number {
    if (dedupe) {
      const existing = this.list.find(t => t.message === message && t.type === type);
      if (existing) {
        existing.count = (existing.count ?? 1) + 1;
        // reset timer
        const prev = this.timers.get(existing.id);
        if (prev) clearTimeout(prev);
        if (timeout > 0) {
          const handle = setTimeout(() => this.dismiss(existing.id), timeout);
          this.timers.set(existing.id, handle);
        }
        this.subject.next([...this.list]);
        return existing.id;
      }
    }

    const id = ++this.seq;
    const toast: Toast = { id, type, message, timeout, count: 1 };
    this.list = [...this.list, toast];
    this.subject.next(this.list);
    if (timeout > 0) {
      const handle = setTimeout(() => this.dismiss(id), timeout);
      this.timers.set(id, handle);
    }
    return id;
  }

  info(message: string, timeout = 3000) { return this.show(message, 'info', timeout); }
  success(message: string, timeout = 3000) { return this.show(message, 'success', timeout); }
  error(message: string, timeout = 3000) { return this.show(message, 'error', timeout); }

  dismiss(id: number) {
    this.list = this.list.filter(t => t.id !== id);
    this.subject.next(this.list);
  const h = this.timers.get(id);
  if (h) clearTimeout(h);
  this.timers.delete(id);
  }

  clear() {
  // clear timers
  for (const h of this.timers.values()) clearTimeout(h);
  this.timers.clear();
  this.list = [];
    this.subject.next(this.list);
  }
}
