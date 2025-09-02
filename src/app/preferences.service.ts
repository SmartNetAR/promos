import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type FilterMode = 'active' | 'active-future' | 'all';
export type TextScale = 'normal' | 'large';

export interface PreferencesState {
  filter: FilterMode;
  text: TextScale;
}

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly storageKey = 'preferences';
  readonly state$ = new BehaviorSubject<PreferencesState>(this.loadInitial());

  constructor() {
    this.apply(this.state$.value);
  }

  cycleFilter(): void {
    const order: FilterMode[] = ['active', 'active-future', 'all'];
    const curr = this.state$.value.filter;
    const next = order[(order.indexOf(curr) + 1) % order.length];
    this.set({ ...this.state$.value, filter: next });
  }

  toggleTextScale(): void {
    const next: TextScale = this.state$.value.text === 'large' ? 'normal' : 'large';
    this.set({ ...this.state$.value, text: next });
  }

  setFilter(mode: FilterMode): void {
    if (this.state$.value.filter === mode) return;
    this.set({ ...this.state$.value, filter: mode });
  }

  private set(state: PreferencesState): void {
    this.state$.next(state);
    this.apply(state);
    try { localStorage.setItem(this.storageKey, JSON.stringify(state)); } catch {}
  }

  private loadInitial(): PreferencesState {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw) as PreferencesState;
    } catch {}
    return { filter: 'active-future', text: 'normal' };
  }

  private apply(state: PreferencesState): void {
    const root = document.documentElement;
    root.classList.toggle('text-lg', state.text === 'large');
  }
}
