// Sito personale su Cloudflare: gli asset statici di public/ e il modulo di contatto.
// Il dominio principale rimanda a www; il modulo arriva via email con Resend.
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** Host canonico: le richieste agli altri host del Worker vi rimandano. */
  CANONICAL_HOST: string;
  /** Destinatario dei messaggi del modulo. */
  CONTACT_TO: string;
  /** Mittente verificato su Resend per il dominio. */
  CONTACT_FROM: string;
  /** Segreto: chiave Resend «sending access». */
  RESEND_API_KEY?: string;
}

const limits = { nome: 200, email: 254, messaggio: 5000 };
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
// Le risposte del Worker non passano da _headers: gli header essenziali si mettono qui.
const headers = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store',
};
const redirect = (location: string, status = 303) =>
  new Response(null, { status, headers: { ...headers, Location: location } });

async function contact(request: Request, env: Env): Promise<Response> {
  const origin = new URL(request.url).origin;
  if (request.headers.get('Origin') !== origin) return new Response('Origine non valida.', { status: 403, headers });
  const form = await request.formData().catch(() => null);
  if (!form) return redirect('/?errore=invio#contatti');
  // Il campo nascosto lo compilano solo i bot: si risponde come a un invio riuscito, senza spedire.
  if (String(form.get('bot-field') ?? '').trim()) return redirect('/grazie.html');
  const nome = String(form.get('nome') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const messaggio = String(form.get('messaggio') ?? '').trim();
  const valid = nome && nome.length <= limits.nome && emailPattern.test(email) && email.length <= limits.email && messaggio && messaggio.length <= limits.messaggio;
  if (!valid) return redirect('/?errore=campi#contatti');
  if (!env.RESEND_API_KEY) return redirect('/?errore=invio#contatti');
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `Messaggio dal sito da ${nome.replace(/[\r\n]+/g, ' ')}`,
      text: `${nome} <${email}> ha scritto dal modulo di dariopagnoni.it:\n\n${messaggio}\n`,
    }),
  }).catch(() => null);
  if (!sent?.ok) {
    console.error('Invio del modulo non riuscito', sent?.status ?? 'rete');
    return redirect('/?errore=invio#contatti');
  }
  return redirect('/grazie.html');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname !== env.CANONICAL_HOST && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      url.hostname = env.CANONICAL_HOST;
      url.protocol = 'https:';
      url.port = '';
      return redirect(url.toString(), 301);
    }
    if (url.pathname === '/grazie.html' && request.method === 'POST') return contact(request, env);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Metodo non consentito.', { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } });
    // Gli asset si servono con il nome esatto (html_handling "none"): la radice è index.html.
    if (url.pathname === '/') return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    return env.ASSETS.fetch(request);
  },
};
