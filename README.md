[README.md](https://github.com/user-attachments/files/26640958/README.md)
# dariopagnoni.it

Sito personale statico, minimale e senza backend.

## Struttura

- `public/index.html` -> sito
- `public/404.html` -> redirect alla home
- `firebase.json` -> configurazione Firebase Hosting
- `.firebaserc` -> alias del progetto Firebase

## Deploy rapido

1. Crea un progetto su Firebase.
2. Installa la Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
3. Esegui login:
   ```bash
   firebase login
   ```
4. Sostituisci `INSERISCI_IL_TUO_FIREBASE_PROJECT_ID` nel file `.firebaserc`.
5. Dalla cartella del progetto esegui:
   ```bash
   firebase deploy --only hosting
   ```
6. In Firebase Hosting collega `dariopagnoni.it` e `www.dariopagnoni.it`.

## Note

- Il sito e volutamente statico: niente backend, database o CMS.
- Se vuoi usare il sito come laboratorio AI, ti conviene iterare prima su testo e design, non su funzioni inutili.
- Verifica e aggiorna il link LinkedIn nel file `public/index.html` se necessario.
