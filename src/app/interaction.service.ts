import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class InteractionService {
    prompt(message: string, _default?: string): string | null {
        // Delegate to window.prompt; adapter makes it easy to mock
        return window.prompt(message, _default);
    }
}
