import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FavouritesService {
  private readonly key = 'favourites';
  private ids: string[] = [];
  private subject = new BehaviorSubject<string[]>([]);
  favourites$ = this.subject.asObservable();

  constructor() {
    this.ids = this.read();
    this.subject.next([...this.ids]);
  }

  private read(): string[] {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private write(ids: string[]): void {
    localStorage.setItem(this.key, JSON.stringify(ids));
  }

  list(): string[] { return [...this.ids]; }

  has(id: string): boolean { return this.ids.includes(id); }

  toggle(id: string): boolean {
    const i = this.ids.indexOf(id);
    if (i >= 0) { this.ids.splice(i, 1); }
    else { this.ids.push(id); }
    this.write(this.ids);
    const nowFav = this.ids.includes(id);
    this.subject.next([...this.ids]);
    return nowFav;
  }
}
