import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SelectionService {
  private readonly selected = new Set<string>();
  private readonly subject = new BehaviorSubject<Set<string>>(new Set());
  readonly selection$ = this.subject.asObservable();

  toggle(id: string | number) {
    const key = String(id);
    if (this.selected.has(key)) this.selected.delete(key); else this.selected.add(key);
    this.emit();
  }

  clear() { this.selected.clear(); this.emit(); }
  has(id: string | number) { return this.selected.has(String(id)); }
  values(): string[] { return Array.from(this.selected.values()); }
  size(): number { return this.selected.size; }

  private emit() { this.subject.next(new Set(this.selected)); }
}