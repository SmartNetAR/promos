import { TestBed } from '@angular/core/testing';
import { FavouritesService } from './favourites.service';

// Simple localStorage mock
class LocalStorageMock {
  store = new Map<string, string>();
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

describe('FavouritesService', () => {
  let service: FavouritesService;
  let mock: LocalStorageMock;

  beforeEach(() => {
    mock = new LocalStorageMock();
    // @ts-ignore
    global.localStorage = mock;

    TestBed.configureTestingModule({});
    service = TestBed.inject(FavouritesService);
  });

  it('starts empty and toggles favourites', () => {
    expect(service.list()).toEqual([]);
    const afterAdd = service.toggle(1);
    expect(afterAdd).toBe(true);
    expect(service.list()).toEqual([1]);
    expect(service.has(1)).toBe(true);

    const afterRemove = service.toggle(1);
    expect(afterRemove).toBe(false);
    expect(service.list()).toEqual([]);
    expect(service.has(1)).toBe(false);
  });

  it('emits changes via favourites$', (done) => {
    const events: number[][] = [];
    const sub = service.favourites$.subscribe(v => events.push(v));
    service.toggle(2);
    service.toggle(3);
    service.toggle(2); // remove 2
    setTimeout(() => {
      expect(events[0]).toEqual([]); // initial emit
      expect(events[1]).toEqual([2]);
      expect(events[2].sort()).toEqual([2,3]);
      expect(events[3]).toEqual([3]);
      sub.unsubscribe();
      done();
    });
  });
});
