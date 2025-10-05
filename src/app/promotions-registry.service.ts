import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PromotionsRegistryService {
  private map = new Map<string, any>();
  private subject = new BehaviorSubject<any[]>([]);
  readonly promotions$ = this.subject.asObservable();

  register(list: any[]) {
    this.map.clear();
  for (const p of list) this.map.set(String(p.id), p);
    this.subject.next(list.slice());
  }

  get(id: string | number) { return this.map.get(String(id)); }
  getAll() { return this.subject.value; }
}