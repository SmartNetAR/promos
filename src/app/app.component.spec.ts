import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'promos' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('promos');
  });

  it('should render headers when there are promotions', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
  // Expect the new topbar with filter label to be present
  const topbar = compiled.querySelector('.topbar');
  expect(topbar).toBeTruthy();
  // Default filter is 'active-future' -> label should show 'Activas y futuras'
  expect(topbar?.textContent).toContain('Activas y futuras');
  });
});
