# Guida passo passo: far funzionare Live Studio su GitHub Pages

Segui questi passi **nell’ordine**. Ogni passo è uno solo.

---

## PARTE 1: Firebase (backend e auth)

### Passo 1.1 – Crea un progetto Firebase

1. Vai su **https://console.firebase.google.com**
2. Clicca **“Aggiungi progetto”** (o “Crea un progetto”).
3. Inserisci un nome (es. `live-studio-mio`).
4. Disattiva Google Analytics se non ti serve, poi **Continua** → **Crea progetto**.

---

### Passo 1.2 – Registra l’app web

1. Nella pagina principale del progetto, clicca l’icona **</>** (Web).
2. In **“Nickname app”** metti ad es. `Live Studio`.
3. **Non** spuntare “Firebase Hosting” per ora.
4. Clicca **“Registra app”**.
5. Nella schermata che segue vedi un blocco `firebaseConfig`. **Non** copiare ancora: ci servirà al passo 1.5. Clicca **“Continua alla console”**.

---

### Passo 1.3 – Abilita accesso anonimo (Auth)

1. Nel menu a sinistra: **Build** → **Authentication**.
2. Scheda **“Sign-in method”**.
3. Clicca **“Anonymous”**.
4. Attiva **“Abilita”**.
5. **Salva**.

---

### Passo 1.4 – Crea il database Firestore

1. Menu a sinistra: **Build** → **Firestore Database**.
2. Clicca **“Crea database”**.
3. Scegli **“Inizia in modalità test”** (per provare subito).
4. Scegli una **region** (es. `europe-west1`).
5. **Abilita**.

---

### Passo 1.5 – Copia la configurazione nell’app

1. Torna alla **Overview** del progetto (icona ingranaggio → Impostazioni progetto).
2. Scorri fino a **“Le tue app”** e clicca sull’app web che hai registrato.
3. Copia l’oggetto **`firebaseConfig`** (apiKey, authDomain, projectId, ecc.).
4. Sul tuo PC apri il file **`firebase/config.js`** dentro `live-studio-app`.
5. Sostituisci tutto il contenuto con qualcosa del genere (usa i **tuoi** valori):

```javascript
const firebaseConfig = {
  apiKey: "LA_TUA_API_KEY",
  authDomain: "TUO_PROJECT_ID.firebaseapp.com",
  projectId: "TUO_PROJECT_ID",
  storageBucket: "TUO_PROJECT_ID.appspot.com",
  messagingSenderId: "TUO_SENDER_ID",
  appId: "TUO_APP_ID"
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig };
}
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
}
```

6. Salva il file.

---

### Passo 1.6 – Autorizza il dominio di GitHub Pages

1. In Firebase: **Authentication** → **Settings** (Impostazioni) → **Authorized domains**.
2. Clicca **“Aggiungi dominio”**.
3. Inserisci: **`github.io`** (senza https).
4. Salva.

Poi, quando avrai il link della tua pagina (es. `https://TUOUSER.github.io/NomeRepo/`), aggiungi anche quel dominio se richiesto (a volte basta `github.io`).

---

## PARTE 2: Indici Firestore (per chat e signaling)

### Passo 2.1 – Crea gli indici da console

1. In Firebase: **Firestore Database** → scheda **“Indici”**.
2. Se quando usi l’app compaiono errori tipo “index required”, clicca sul link nell’errore: si aprirà la console con l’indice da creare già compilato. Clicca **“Crea indice”**.

In alternativa puoi creare manualmente:

- **Raccolta:** `rooms` (sotto-collezione: `chat`)  
  Campo: `timestamp` – Ordine: **Crescente**
- Per la signaling potresti dover creare un indice su `at` nella sotto-collezione sotto `rooms/{roomId}/signaling/...` se Firebase lo chiede.

---

## PARTE 3: Preparare il progetto per GitHub Pages

Su GitHub Pages l’URL è tipo: **`https://TUO_USERNAME.github.io/NOME_REPO/`**.  
Tutti i file devono essere riferiti rispetto a questa base.

### Passo 3.1 – Scegli nome repo e URL

Decidi:
- **Username GitHub:** es. `mario`
- **Nome repository:** es. `live-studio`

L’URL del sito sarà: **`https://mario.github.io/live-studio/`**

---

### Passo 3.2 – Prepara i file con lo script (consigliato)

1. Apri il terminale nella cartella **`live-studio-app`** (dove si trova questo file).
2. Esegui (sostituisci con il **tuo** URL di GitHub Pages, con lo slash finale):

   **Windows (PowerShell):**
   ```powershell
   $env:GH_PAGES_BASE="https://TUO_USERNAME.github.io/NOME_REPO/"
   node prepare-gh-pages.js
   ```

   **Windows (CMD):**
   ```cmd
   set GH_PAGES_BASE=https://TUO_USERNAME.github.io/NOME_REPO/
   node prepare-gh-pages.js
   ```

   **Mac/Linux:**
   ```bash
   GH_PAGES_BASE="https://TUO_USERNAME.github.io/NOME_REPO/" node prepare-gh-pages.js
   ```

   In alternativa puoi passare l’URL come argomento:
   ```bash
   node prepare-gh-pages.js "https://TUO_USERNAME.github.io/NOME_REPO/"
   ```

3. Si crea la cartella **`docs`** con:
   - `index.html`, `join.html`, `studio.html` (già con path corretti e tag `<base>`)
   - `css/`, `js/`, `firebase/` (copiati)

Se non usi lo script, segui i passi 3.3 e 3.4 a mano.

---

### Passo 3.3 – (Solo se NON hai usato lo script) Path nei file HTML

In **ogni** file HTML (`index.html`, `join.html`, `studio.html`) nella cartella che userai per Pages:

- Sostituisci **`../css/`** con **`css/`**
- Sostituisci **`../js/`** con **`js/`**
- Sostituisci **`../firebase/`** con **`firebase/`**

---

### Passo 3.4 – (Solo se NON hai usato lo script) Tag `<base>`

In **tutti e tre** gli HTML, subito dopo `<head>`, aggiungi:

```html
<base href="https://TUO_USERNAME.github.io/NOME_REPO/">
```

(con il **tuo** username e nome repo.)

---

### Passo 3.5 – Dove mettere i file sul repo

- **Opzione A – Cartella `docs`:**  
  Metti il contenuto di **`docs`** (dopo lo script) nella cartella **`docs`** nella root del repo.  
  Poi in GitHub: **Settings → Pages → Source:** Deploy from a branch → **Branch** `main` → **Folder** `/docs`.

- **Opzione B – Root del repo:**  
  Copia il contenuto di **`docs`** (tutti i file e le cartelle) nella **root** del repo.  
  Poi in GitHub: **Settings → Pages → Folder** `/ (root)`.

In **`app.js`** (nella parte che costruisce l’URL della stanza), assicurati che usi path relativi, ad esempio:

- `studio.html?room=${roomId}&host=1`  
e non un URL assoluto con `location.origin` che su GitHub potrebbe essere diverso. Se nel codice c’è qualcosa tipo `location.origin + location.pathname.replace('index.html','') + 'studio.html?room='` va bene: su Pages `location.pathname` sarà tipo `/NOME_REPO/` o `/NOME_REPO/index.html`, quindi il replace può lasciare `/NOME_REPO/` e lo script genera `.../studio.html?room=...`. Verifica che non ci siano slash doppi o path sbagliati.

L’app costruisce già il link della stanza con `location.origin` e `location.pathname`, quindi su GitHub Pages il link “Copia” e “Enter Studio” funzionano.

---

## PARTE 4: GitHub e pubblicazione

### Passo 4.1 – Crea il repository su GitHub

1. Vai su **https://github.com** e fai login.
2. Clicca **“+”** → **“New repository”**.
3. **Repository name:** stesso nome che hai usato nel `<base>` (es. `live-studio`).
4. Scegli **Public**.
5. **Non** inizializzare con README se hai già una cartella locale.
6. **Create repository**.

---

### Passo 4.2 – Push del progetto

- **Se usi la cartella `docs`:** dalla root del repo (dove c’è la cartella `docs` con dentro index.html, css, js, firebase):

```bash
git init
git add .
git commit -m "Live Studio - setup iniziale"
git branch -M main
git remote add origin https://github.com/TUO_USERNAME/NOME_REPO.git
git push -u origin main
```

- **Se usi la root:** dalla root del repo (dove ci sono direttamente index.html, join.html, studio.html, css/, js/, firebase/):

```bash
git init
git add .
git commit -m "Live Studio - setup iniziale"
git branch -M main
git remote add origin https://github.com/TUO_USERNAME/NOME_REPO.git
git push -u origin main
```

Sostituisci `TUO_USERNAME` e `NOME_REPO`.

---

### Passo 4.3 – Attiva GitHub Pages

1. Nel repo su GitHub: **Settings** → **Pages** (menu a sinistra).
2. In **“Build and deployment”** → **Source:** scegli **“Deploy from a branch”**.
3. **Branch:** `main` (o `master`).
4. **Folder:**  
   - **`/docs`** se hai usato la cartella docs  
   - **`/ (root)`** se hai messo index.html nella root del repo.
5. **Save**.

Attendi 1–2 minuti. L’URL del sito sarà:

**`https://TUO_USERNAME.github.io/NOME_REPO/`**

(es. `https://mario.github.io/live-studio/`)

---

## PARTE 5: Ultimi controlli

### Passo 5.1 – Aggiungi il dominio in Firebase (se serve)

Se quando apri l’app su GitHub Pages Firebase dà errore di dominio non autorizzato:

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**.
2. Aggiungi esattamente: **`TUO_USERNAME.github.io`** (senza `https://` e senza il nome del repo).

---

### Passo 5.2 – Apri il sito in HTTPS

1. Apri **`https://TUO_USERNAME.github.io/NOME_REPO/`** (con **https**).
2. Dovresti vedere la landing di Live Studio.
3. Clicca **“Create Studio Room”**: dovrebbe creare la stanza (se Firebase è configurato).
4. Clicca **“Enter Studio”**: si apre la pagina studio (camera/microfono richiesti).
5. In un’altra finestra (o altro browser) apri lo stesso URL, clicca **“Join Room”**, incolla il link della stanza e prova a entrare come ospite.

---

## Checklist rapida (ordine esatto)

| # | Cosa fare |
|---|-----------|
| 1 | Firebase: crea progetto → Registra app web → Copia `firebaseConfig` |
| 2 | Firebase: Authentication → Abilita **Anonymous** |
| 3 | Firebase: Firestore Database → Crea database (modalità test) |
| 4 | Incolla la config in **`firebase/config.js`** (sostituisci i valori) |
| 5 | Firebase: Authentication → Authorized domains → Aggiungi **`github.io`** |
| 6 | In `live-studio-app`: esegui **`prepare-gh-pages.js`** con il tuo URL (vedi 3.2) |
| 7 | Crea repo su GitHub (nome = quello usato nell’URL) |
| 8 | Copia il contenuto di **`docs`** nel repo (in `docs/` o nella root) e fai **push** |
| 9 | GitHub: **Settings → Pages** → Deploy from branch **main** → Folder **/docs** (o **/ (root)**) |
| 10 | Apri **https://TUO_USERNAME.github.io/NOME_REPO/** in HTTPS e testa |

Se qualcosa non funziona: controlla Firebase config, dominio autorizzato, tag `<base>` negli HTML e che stai usando **https**.
