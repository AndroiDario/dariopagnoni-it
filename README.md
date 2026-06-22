# dariopagnoni.it

Sito personale statico, minimale e senza backend.

## Struttura

- `index.html` — sito single-page completo (HTML + CSS + JS inline)
- `grazie.html` — pagina di conferma per l'invio del form di contatto
- `privacy.html` — informativa privacy
- `favicon.svg` — favicon SVG con iniziali DP
- `og-image.jpg` — immagine OpenGraph per social sharing

## Caratteristiche

- Palette: nero/antracite/bianco con tocchi di verde salvia e ambra
- Dark mode con toggle manuale + rispetto preferenze di sistema
- Micro-animazioni di scroll (IntersectionObserver)
- Google Tag Manager (GTM-MDT32R8S)
- Form di contatto statico gestito con Netlify Forms
- SEO: meta tags, OpenGraph, Twitter Cards, JSON-LD structured data
- Responsive, accessibile, zero dipendenze esterne

## Deploy

Commit e push su GitHub, deploy tramite Netlify.

## Netlify Forms

Il form di contatto in `index.html` usa Netlify Forms nativo:

- `name="contatto"` identifica il form nella dashboard Netlify.
- `data-netlify="true"` permette a Netlify di rilevarlo durante il deploy.
- `netlify-honeypot="bot-field"` abilita un campo anti-spam invisibile agli utenti.
- `action="/grazie.html"` porta alla pagina di conferma dopo l'invio.

Dopo il primo deploy su Netlify:

1. Apri il sito pubblicato e invia un messaggio di test dal form.
2. Vai in Netlify → sito `dariopagnoni.it` → Forms e verifica che compaia il form `contatto`.
3. In Forms → `contatto` → Notifications, aggiungi una notifica email verso l'indirizzo che vuoi usare per ricevere i messaggi.
4. Valuta l'attivazione di spam filtering o reCAPTCHA se dovesse arrivare spam, lasciando intanto l'honeypot attivo come prima protezione leggera.
