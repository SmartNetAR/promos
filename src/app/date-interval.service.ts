import { Injectable } from '@angular/core';
import { addDays, addMonths, endOfMonth, format, getDay, isAfter, isBefore, isWithinInterval, max, min, parseISO, startOfDay, startOfMonth } from 'date-fns';
import { ValidDate } from './valid-date';

@Injectable({ providedIn: 'root' })
export class DateIntervalService {
    private readonly allDaysOfWeekAmount = 7;

    getValidDates(fromDate: Date, toDate: Date, validity: any, period: string): ValidDate[] {
        const validDates: ValidDate[] = [];
        let currentDate = fromDate;
        let weekDates: string[] = [];

        if (validity.specific_dates != null) {
            validity.specific_dates
                .map((specificDate: string) => parseISO(specificDate))
                .forEach((specificDate: Date) => {
                    weekDates.push(format(specificDate, 'yyyy-MM-dd'));
                    if (weekDates.length === 1) {
                        validDates.push({ from: weekDates[0], to: weekDates[0] });
                    } else {
                        validDates.push({ from: weekDates[0], to: weekDates[weekDates.length - 1] });
                    }

                    weekDates = [];
                });
        }

        if (validity.days_of_week != null) {
            if (validity.days_of_week.length === this.allDaysOfWeekAmount) {
                if (period === 'month') {
                    const ranges: any[] = [];
                    let currentStartDate = startOfMonth(fromDate);

                    while (currentStartDate <= toDate) {
                        ranges.push({
                            from: format(max([currentStartDate, fromDate]), 'yyyy-MM-dd'),
                            to: format(min([endOfMonth(currentStartDate), toDate]), 'yyyy-MM-dd')
                        });

                        currentStartDate = addMonths(currentStartDate, 1);
                    }

                    return ranges;
                } else {
                    return [{ from: format(fromDate, 'yyyy-MM-dd'), to: format(toDate, 'yyyy-MM-dd') }];
                }
            }

            const firstDayOfPromoInWeek = validity.days_of_week[0];
            const lastDayOfPromoInWeek = validity.days_of_week[validity.days_of_week.length - 1];
            while (isBefore(currentDate, addDays(toDate, 1))) {
                const dayOfWeek = getDay(currentDate);

                if (validity.days_of_week.includes(dayOfWeek)) {
                    weekDates.push(format(currentDate, 'yyyy-MM-dd'));
                }

                currentDate = addDays(currentDate, 1);
            }

            let from: Date | undefined;
            let to: Date | undefined;
            weekDates
                .map(date => parseISO(date))
                .forEach((date, idx) => {
                    const dayOfWeek = getDay(date);

                    if (dayOfWeek === firstDayOfPromoInWeek || idx === 0) {
                        from = date;
                    }

                    if (dayOfWeek === lastDayOfPromoInWeek || idx === weekDates.length - 1) {
                        to = date;
                    }

                    if (from && to) {
                        // Fix bug: use yyyy not yyy
                        validDates.push({ from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') });
                        from = undefined;
                        to = undefined;
                    }
                });
        }

        return validDates;
    }

    getActiveDate(isoValidDates: any[], today: Date) {
        return isoValidDates.find(date =>
            isWithinInterval(today, {
                start: date.from,
                end: date.to
            })
        );
    }

    getPurchasesByInterval(purchases: any[], intervalDates: any) {
        return purchases.filter(purchase => isWithinInterval(purchase.date, {
            start: intervalDates.from,
            end: intervalDates.to
        }));
    }
}
