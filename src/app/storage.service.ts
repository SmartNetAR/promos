import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
    private key = 'shopping';

    load(): any[] {
        const shopping = localStorage.getItem(this.key);
        return shopping ? JSON.parse(shopping) : [];
    }

    save(items: any[]): void {
        localStorage.setItem(this.key, JSON.stringify(items));
    }
}
