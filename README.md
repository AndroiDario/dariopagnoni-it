# dariopagnoni.it

Sito personale statico su Cloudflare Workers Static Assets, con un Worker minimo per il modulo di contatto e il rimando del dominio principale a `www`.

## Struttura

Le pagine stanno in `public/`, servite con il nome esatto (`html_handling: "none"`: `/privacy.html` resta `/privacy.html`).

- `index.html` — sito single-page completo (HTML + CSS + JS inline)
- `grazie.html` — pagina di conferma per l'invio del form di contatto
- `privacy.html` — informativa privacy
- `cookie-policy.html` — cookie policy e dettagli sulle preferenze
- `assets/cmp.css` / `assets/cmp.js` — CMP proprietaria e gestione preferenze cookie
- `favicon.svg` — favicon SVG con iniziali DP
- `og-image.jpg` — immagine OpenGraph per social sharing

## Caratteristiche

- Palette: nero/antracite/bianco con tocchi di verde salvia e ambra
- Dark mode con toggle manuale + rispetto preferenze di sistema
- Micro-animazioni di scroll (IntersectionObserver)
- Google Tag Manager (GTM-MDT32R8S) con Google Consent Mode V2 Advanced
- CMP statica con categorie Necessari, Statistiche e Marketing
- Modulo di contatto inviato via email con Resend dal Worker (`src/worker.ts`)
- SEO: meta tags, OpenGraph, Twitter Cards, JSON-LD structured data
- Responsive, accessibile, nessuna dipendenza nel browser

## Deploy

Worker `dariopagnoni-it` sull'account Cloudflare «DP | Dario Pagnoni», collegato a GitHub con Workers Builds: ogni push su `main` pubblica (build vuoto, deploy `npx wrangler deploy`, `NODE_VERSION=22`). Domini custom: `www.dariopagnoni.it` e `dariopagnoni.it`; il Worker rimanda il secondo al primo con un 301. `_headers` vale per gli asset; le risposte del Worker (redirect, modulo) portano i propri header.

In locale: `npm ci`, `npm run dev` (http://localhost:8787), `npm test`, `npm run check`.

## CMP e Consent Mode

Le pagine caricano prima i default di Google Consent Mode V2 (`denied` per analytics e advertising), poi il container GTM. La CMP salva le scelte nel cookie tecnico `dp_cookie_consent` per 180 giorni e consente di modificarle dal link “Preferenze cookie”.

Quando si aggiungono nuovi tag in GTM, verificare che siano coerenti con le categorie esposte nella Cookie Policy e che rispettino i consensi `analytics_storage`, `ad_storage`, `ad_user_data` e `ad_personalization`.

## Modulo di contatto

`POST /grazie.html` arriva al Worker, che:

- accetta solo richieste dalla stessa origine;
- tratta il campo nascosto `bot-field` come trappola: se è compilato risponde come a un invio riuscito, senza spedire;
- valida `nome` (fino a 200 caratteri), `email` e `messaggio` (fino a 5000);
- invia con Resend a `CONTACT_TO`, mittente `CONTACT_FROM`, `reply_to` sull'indirizzo del visitatore;
- risponde 303 su `/grazie.html`, oppure su `/?errore=campi#contatti` o `/?errore=invio#contatti`, dove la pagina mostra il messaggio.

Destinatario e mittente sono variabili in `wrangler.jsonc`. Il segreto `RESEND_API_KEY` (chiave «sending access» sul dominio dariopagnoni.it) si imposta dal pannello: Worker → Settings → Variables and Secrets. Senza chiave il modulo risponde con l'errore di invio.
