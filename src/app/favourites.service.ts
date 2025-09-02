import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FavouritesService {
  private readonly key = 'favourites';
  private ids: number[] = [];
  private subject = new BehaviorSubject<number[]>([]);
  favourites$ = this.subject.asObservable();

  constructor() {
    this.ids = this.read();
    this.subject.next([...this.ids]);
  }

  private read(): number[] {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private write(ids: number[]): void {
    localStorage.setItem(this.key, JSON.stringify(ids));
  }

  list(): number[] { return [...this.ids]; }

  has(id: number): boolean { return this.ids.includes(id); }

  toggle(id: number): boolean {
    const i = this.ids.indexOf(id);
    if (i >= 0) { this.ids.splice(i, 1); }
    else { this.ids.push(id); }
    this.write(this.ids);
    const nowFav = this.ids.includes(id);
    this.subject.next([...this.ids]);
    return nowFav;
  }
}
