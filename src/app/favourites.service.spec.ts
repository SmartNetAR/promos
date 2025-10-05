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
  const afterAdd = service.toggle('fav-1');
    expect(afterAdd).toBe(true);
  expect(service.list()).toEqual(['fav-1']);
  expect(service.has('fav-1')).toBe(true);

  const afterRemove = service.toggle('fav-1');
    expect(afterRemove).toBe(false);
    expect(service.list()).toEqual([]);
  expect(service.has('fav-1')).toBe(false);
  });

  it('emits changes via favourites$', (done) => {
  const events: string[][] = [];
  const sub = service.favourites$.subscribe(v => events.push(v));
  service.toggle('fav-2');
  service.toggle('fav-3');
  service.toggle('fav-2'); // remove 2
    setTimeout(() => {
      expect(events[0]).toEqual([]); // initial emit
  expect(events[1]).toEqual(['fav-2']);
  expect(events[2].sort()).toEqual(['fav-2','fav-3']);
  expect(events[3]).toEqual(['fav-3']);
      sub.unsubscribe();
      done();
    });
  });
});
