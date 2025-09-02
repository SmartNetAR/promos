import { InteractionService } from './interaction.service';

describe('InteractionService', () => {
  it('delegates to window.prompt', () => {
    const svc = new InteractionService();
    let asked: any[] = [];
    const original = window.prompt;
    // @ts-ignore
    window.prompt = (msg: string, def?: string) => { asked = [msg, def]; return '123'; };

    const result = svc.prompt('hello', 'default');
    expect(result).toBe('123');
    expect(asked).toEqual(['hello', 'default']);

    window.prompt = original;
  });
});
