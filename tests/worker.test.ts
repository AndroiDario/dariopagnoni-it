import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../src/worker';

const assets = vi.fn(async (request: Request) => new Response(`asset ${new URL(request.url).pathname}`));
const env = (extra: Partial<Env> = {}): Env => ({
  ASSETS: { fetch: assets },
  CANONICAL_HOST: 'www.dariopagnoni.it',
  CONTACT_TO: 'destinatario@example.com',
  CONTACT_FROM: 'Sito <contatti@example.com>',
  RESEND_API_KEY: 'chiave-di-prova',
  ...extra,
});
const origin = 'https://www.dariopagnoni.it';
const post = (fields: Record<string, string>, headers: Record<string, string> = { Origin: origin }) =>
  new Request(`${origin}/grazie.html`, { method: 'POST', headers, body: new URLSearchParams(fields) });
const valid = { nome: 'Maria Rossi', email: 'maria@example.com', messaggio: 'Buongiorno, vorrei parlarle di un progetto.', 'bot-field': '' };

afterEach(() => {
  vi.unstubAllGlobals();
  assets.mockClear();
});

describe('instradamento', () => {
  it('il dominio principale rimanda a www conservando percorso e query', async () => {
    const response = await worker.fetch(new Request('https://dariopagnoni.it/privacy.html?x=1'), env());
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://www.dariopagnoni.it/privacy.html?x=1');
  });
  it('la radice serve index.html, le altre pagine con il nome esatto', async () => {
    expect(await (await worker.fetch(new Request(`${origin}/`), env())).text()).toBe('asset /index.html');
    expect(await (await worker.fetch(new Request(`${origin}/cookie-policy.html`), env())).text()).toBe('asset /cookie-policy.html');
  });
  it('rifiuta metodi diversi da GET e HEAD fuori dal modulo', async () => {
    expect((await worker.fetch(new Request(`${origin}/`, { method: 'POST' }), env())).status).toBe(405);
  });
});

describe('modulo di contatto', () => {
  it('invia con Resend, risponde al mittente e torna alla pagina di ringraziamento', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const response = await worker.fetch(post(valid), env());
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/grazie.html');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer chiave-di-prova');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ to: ['destinatario@example.com'], reply_to: 'maria@example.com', from: 'Sito <contatti@example.com>' });
    expect(body.text).toContain('vorrei parlarle');
  });
  it('il campo nascosto compilato non invia nulla ma risponde come un invio riuscito', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const response = await worker.fetch(post({ ...valid, 'bot-field': 'spam' }), env());
    expect(response.headers.get('location')).toBe('/grazie.html');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('campi mancanti o email non valida tornano al modulo con l\'errore', async () => {
    vi.stubGlobal('fetch', vi.fn());
    for (const fields of [{ ...valid, nome: '' }, { ...valid, email: 'non-email' }, { ...valid, messaggio: 'x'.repeat(5001) }]) {
      const response = await worker.fetch(post(fields), env());
      expect(response.headers.get('location')).toBe('/?errore=campi#contatti');
    }
  });
  it('un errore di Resend o la chiave assente tornano al modulo con l\'errore di invio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
    expect((await worker.fetch(post(valid), env())).headers.get('location')).toBe('/?errore=invio#contatti');
    expect((await worker.fetch(post(valid), env({ RESEND_API_KEY: undefined }))).headers.get('location')).toBe('/?errore=invio#contatti');
  });
  it('rifiuta invii da un\'altra origine', async () => {
    vi.stubGlobal('fetch', vi.fn());
    expect((await worker.fetch(post(valid, { Origin: 'https://evil.example' }), env())).status).toBe(403);
  });
  it('un a capo nel nome non entra nell\'oggetto della mail', async () => {
    const fetch = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await worker.fetch(post({ ...valid, nome: 'Maria\r\nBcc: x@example.com' }), env());
    const body = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.subject).not.toMatch(/[\r\n]/);
  });
});
