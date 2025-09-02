import { StorageService } from './storage.service';

describe('StorageService', () => {
  beforeEach(() => {
    // @ts-ignore
    global.localStorage = {
      _m: new Map<string, string>(),
      getItem(k: string) { return this['_m'].has(k) ? this['_m'].get(k)! : null; },
      setItem(k: string, v: string) { this['_m'].set(k, v); },
      removeItem(k: string) { this['_m'].delete(k); },
      clear() { this['_m'].clear(); }
    } as any;
  });

  it('load/save roundtrip', () => {
    const svc = new StorageService();
    expect(svc.load()).toEqual([]);
    svc.save([{ id: 1 } as any]);
    expect(svc.load()).toEqual([{ id: 1 } as any]);
  });
});
