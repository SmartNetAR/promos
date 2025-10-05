import { TestBed } from '@angular/core/testing';
import { SelectionService } from './selection.service';

describe('SelectionService', () => {
  let service: SelectionService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SelectionService] });
    service = TestBed.inject(SelectionService);
  });

  it('toggles ids and emits set', () => {
  const emissions: number[] = [];
    service.selection$.subscribe(s => emissions.push(s.size));
  service.toggle('sel-1');
  service.toggle('sel-2');
  service.toggle('sel-1'); // remove 1
    expect(service.size()).toBe(1);
  expect(service.has('sel-2')).toBe(true);
    expect(emissions[emissions.length-1]).toBe(1);
  });

  it('clears selection', () => {
  service.toggle('sel-3'); service.toggle('sel-4');
    expect(service.size()).toBe(2);
    service.clear();
    expect(service.size()).toBe(0);
  });
});