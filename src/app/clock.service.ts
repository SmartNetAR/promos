import { Injectable } from '@angular/core';
import { startOfDay } from 'date-fns';

@Injectable({ providedIn: 'root' })
export class ClockService {
    today(): Date {
        return startOfDay(new Date());
    }
}
