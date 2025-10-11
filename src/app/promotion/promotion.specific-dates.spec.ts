import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PromotionComponent } from './promotion.component';

function mkPromo(overrides: any) {
  return Object.assign({
    id: 'p1',
    title: 'Test Specific',
    payment_methods: [],
    discount: 10,
    limit: { amount: 1000 },
    calculatedPurchaseAmount: 1000,
    activeDate: null,
    futureDates: [],
    pastDates: [ { from: new Date('2025-01-01'), to: new Date('2025-01-01'), purchases: [] } ]
  }, overrides);
}

describe('PromotionComponent specific dates behavior', () => {
  let fixture: ComponentFixture<PromotionComponent>;
  let component: PromotionComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromotionComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(PromotionComponent);
    component = fixture.componentInstance;
  });

  it('highlights the correct weekday (Saturday) when all future specific dates fall on Saturday', () => {
    // Two Saturdays in November 2025 -> 1 and 15 (verify actual weekdays: 2025-11-01 is Saturday, 2025-11-15 is Saturday)
    component.promotion = mkPromo({
      validity: { from: '2025-11-01', to: '2025-11-30', specific_dates: ['2025-11-01','2025-11-15'] }
    });
    fixture.detectChanges();
    const days = component.weekdaysDisplay();
    const saturday = days.find(d => d.letter === 'S');
    expect(saturday).toBeTruthy();
    // Should not be marked normal active (no days_of_week) but should be specific
    expect(saturday!.active).toBe(false);
    expect(saturday!.specific).toBe(true);
    // Ensure no other weekday marked specific
    const othersSpecific = days.filter(d => d.letter !== 'S' && d.specific);
    expect(othersSpecific.length).toBe(0);
  });

  it('removes calendar pill when all specific dates are in the past (filtered out)', () => {
    // Specific dates entirely in the past vs an assumed current date (test runtime date is later than 2024)
    component.promotion = mkPromo({
      validity: { from: '2024-01-01', to: '2024-01-31', specific_dates: ['2024-01-05','2024-01-12'] }
    });
    fixture.detectChanges();
    // After filtering there should be zero future specific dates
    expect(component.specificDates().length).toBe(0);
    // Weekday display should have no specific marking
    const days = component.weekdaysDisplay();
    expect(days.every(d => !d.specific)).toBe(true);
  });

  it('renders calendar pill with day numbers when there are future specific dates', () => {
    component.promotion = mkPromo({
      validity: { from: '2025-11-01', to: '2025-11-30', specific_dates: ['2025-11-01','2025-11-15'] }
    });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const pill = el.querySelector('.badge-calendar');
    expect(pill).toBeTruthy();
    expect(pill!.textContent).toContain('01');
    expect(pill!.textContent).toContain('15');
  });

  it('does not render calendar pill when all specific dates are filtered out (past)', () => {
    component.promotion = mkPromo({
      validity: { from: '2024-01-01', to: '2024-01-31', specific_dates: ['2024-01-05','2024-01-12'] }
    });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const pill = el.querySelector('.badge-calendar');
    expect(pill).toBeFalsy();
  });

  it('prefers current month specific dates when both current and future month dates exist', () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2,'0');
    // choose two current month future days (ensure > today date number by adding +1,+2 within month bounds)
    const day1 = String(Math.min(28, now.getDate() + 1)).padStart(2,'0');
    const day2 = String(Math.min(29, now.getDate() + 2)).padStart(2,'0');
    // Also include next month dates that should be ignored due to current month presence
    const next = new Date(yyyy, now.getMonth() + 1, 5);
    const nYYYY = next.getFullYear();
    const nMM = String(next.getMonth() + 1).padStart(2,'0');
    const futureDates = [ `${yyyy}-${mm}-${day1}`, `${yyyy}-${mm}-${day2}`, `${nYYYY}-${nMM}-05`, `${nYYYY}-${nMM}-10` ];
    component.promotion = mkPromo({
      validity: { from: `${yyyy}-${mm}-01`, to: `${nYYYY}-${nMM}-28`, specific_dates: futureDates }
    });
    fixture.detectChanges();
    const selected = component.specificDates();
  expect(selected.every(d => d.startsWith(`${yyyy}-${mm}-`))).toBe(true);
    expect(selected.length).toBe(2);
  });

  it('falls back to earliest future month when no current month specific dates remain', () => {
    const now = new Date();
    // Build only next month future dates
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nYYYY = next.getFullYear();
    const nMM = String(next.getMonth() + 1).padStart(2,'0');
    const dates = [ `${nYYYY}-${nMM}-01`, `${nYYYY}-${nMM}-15`, `${nYYYY}-${nMM}-20` ];
    component.promotion = mkPromo({
      validity: { from: `${nYYYY}-${nMM}-01`, to: `${nYYYY}-${nMM}-28`, specific_dates: dates }
    });
    fixture.detectChanges();
    const selected = component.specificDates();
    expect(selected.length).toBe(3);
  expect(selected.every(d => d.startsWith(`${nYYYY}-${nMM}-`))).toBe(true);
    const el: HTMLElement = fixture.nativeElement;
    const pill = el.querySelector('.badge-calendar');
    expect(pill?.textContent).toMatch(/\d{2}/); // still shows day numbers
    // Month label should appear (Spanish month names). Check one likely month name substring.
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    expect(monthNames.some(m => (pill?.textContent || '').includes(m))).toBe(true);
  });

  it('treats full coverage of a weekday in month as active (blue) not specific (amber)', () => {
    // November 2025 Tuesdays: 4, 11, 18, 25 (Month index 10)
    component.promotion = mkPromo({
      validity: { from: '2025-11-01', to: '2025-11-30', specific_dates: ['2025-11-04','2025-11-11','2025-11-18','2025-11-25'] }
    });
    fixture.detectChanges();
    const days = component.weekdaysDisplay();
    // Tuesday letter = 'M' (since order uses custom letters, Monday=L, Tuesday=M)
    const tuesday = days.find(d => d.fullName === 'Martes');
    expect(tuesday).toBeTruthy();
    expect(tuesday!.active).toBe(true); // promoted to active
    expect(tuesday!.specific).toBeFalsy();
    // Ensure no other weekday is incorrectly marked specific
    const othersSpecific = days.filter(d => d.fullName !== 'Martes' && d.specific);
    expect(othersSpecific.length).toBe(0);
  });

  it('shows month name prefix for a clearly future month subset (Dec 2025)', () => {
    // Force a future month far enough: December 2025
    component.promotion = mkPromo({
      validity: { from: '2025-12-01', to: '2025-12-31', specific_dates: ['2025-12-05','2025-12-20'] }
    });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const pill = el.querySelector('.badge-calendar');
    expect(pill).toBeTruthy();
    expect(pill!.textContent).toContain('Diciembre');
    expect(pill!.textContent).toMatch(/05|20/);
  });

  it('does not show month name for current month subset (uses only day numbers)', () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2,'0');
    // pick two future days in current month
    const day1 = String(Math.min(26, now.getDate() + 1)).padStart(2,'0');
    const day2 = String(Math.min(27, now.getDate() + 2)).padStart(2,'0');
    component.promotion = mkPromo({
      validity: { from: `${yyyy}-${mm}-01`, to: `${yyyy}-${mm}-30`, specific_dates: [`${yyyy}-${mm}-${day1}`, `${yyyy}-${mm}-${day2}`] }
    });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const pill = el.querySelector('.badge-calendar');
    expect(pill).toBeTruthy();
    const text = pill!.textContent || '';
    // Should not contain any full month Spanish name
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const containsMonth = monthNames.some(m => text.includes(m));
    // If current month is itself December and future subset logic adds month label only for future month, ensure we guard: we only assert absence when month is current.
    expect(containsMonth).toBe(false);
  });
});
