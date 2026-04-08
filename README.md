# LearnHub - Piattaforma E-Learning Completa

**Marketplace di corsi online professionale** con area insegnante, studente e amministratore.

## Caratteristiche Principali

### Area Insegnante
- **Dashboard completa** con statistiche (studenti, ricavi, rating)
- **Creazione corsi** guidata con form intuitivo
- **Gestione moduli e lezioni** con editor avanzato
- **4 tipi di contenuto**: Video, PDF, Testo, Contenuto Misto
- **Upload file** (immagini, video, PDF) via Cloudinary o storage locale
- **Copertine automatiche**: Upload manuale o generazione automatica con template grafici
- **Calcolo durata automatico**: Il sistema calcola automaticamente la durata totale del corso
- **Stati corso**: Bozza -> In Revisione -> Pubblicato/Rifiutato
- **Duplicazione corsi** per riutilizzo rapido
- **Anteprima corso** prima della pubblicazione

### Area Studente
- **Catalogo corsi** con ricerca e filtri avanzati
- **Iscrizione corsi** con tracciamento progresso
- **Visualizzazione contenuti**: Player video, viewer PDF, testo formattato
- **Progresso automatico**: Completamento lezioni e calcolo percentuale
- **Attestati PDF**: Generazione automatica al 100% di completamento
- **Download attestati** con codice verifica univoco
- **Dashboard personale** con corsi iscritti e attestati ottenuti

### Area Admin
- **Gestione utenti** (sospensione, cambio ruoli)
- **Moderazione corsi** (approvazione/rifiuto)
- **Analytics avanzate** (revenue, utenti, corsi)
- **Gestione categorie**
- **Export progetto** completo come ZIP

### Design e UX
- **Design moderno** stile Stripe/Linear/Notion
- **Dark mode ready** (supporto nativo)
- **Responsive** su tutti i dispositivi
- **Animazioni fluide** e transizioni eleganti
- **Componenti Shadcn/UI** professionali

### Community e Gamification
- **Forum** con post, commenti e upvote
- **Sistema XP** e livelli (Principiante -> Maestro)
- **Badge** per traguardi raggiunti
- **Classifica** utenti top 20

## Stack Tecnologico

### Frontend
- **Next.js 14** - Framework React full-stack
- **React 18** - Libreria UI
- **TailwindCSS** - Styling utility-first
- **Shadcn/UI** - Componenti UI moderni
- **Lucide React** - Icone
- **Recharts** - Grafici analytics

### Backend
- **Next.js API Routes** - Backend serverless
- **Node.js** - Runtime JavaScript
- **jsPDF** - Generazione PDF attestati
- **Canvas (node-canvas)** - Generazione copertine
- **Archiver** - Export ZIP progetto
- **Cloudinary** - Upload e storage media (opzionale)

### Database
- **MongoDB** - Database NoSQL

### Collezioni Database
```
users          - Utenti (student, instructor, admin)
courses        - Corsi con metadata completi
modules        - Sezioni/moduli dei corsi
lessons        - Lezioni multi-formato
categories     - Categorie corsi (10 precaricate)
enrollments    - Iscrizioni con progresso
certificates   - Attestati rilasciati
reviews        - Recensioni corsi
forumPosts     - Post community
comments       - Commenti ai post
subtitles      - Sottotitoli lezioni
```

## Prerequisiti

- **Node.js** >= 18.0.0
- **MongoDB** >= 5.0
- **Yarn** (consigliato) o npm

## Installazione

1. **Clona il repository**
   ```bash
   git clone <repository-url>
   cd learnhub
   ```

2. **Installa le dipendenze**
   ```bash
   yarn install
   # oppure
   npm install
   ```

3. **Configura variabili d'ambiente**

   Copia `.env.example` in `.env`:
   ```bash
   cp .env.example .env
   ```

   Modifica `.env` con i tuoi dati:
   ```env
   # MongoDB
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=learnhub

   # JWT Secret (genera una stringa casuale sicura)
   JWT_SECRET=your-super-secret-jwt-key-here

   # Next.js
   NEXT_PUBLIC_BASE_URL=http://localhost:3000

   # Cloudinary (opzionale - per upload media)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

   > Se Cloudinary non e configurato, i file vengono salvati localmente in `public/uploads/`.

4. **Avvia MongoDB**
   ```bash
   # Se usi MongoDB locale
   mongod

   # Oppure connettiti a MongoDB Atlas (cloud)
   ```

5. **Inizializza il database con dati demo**

   Visita: `http://localhost:3000/api/init`

   Questo creera automaticamente:
   - 10 categorie
   - 4 utenti demo (admin, 2 insegnanti, 1 studente)
   - 6 corsi di esempio con moduli e lezioni

6. **Avvia il server di sviluppo**
   ```bash
   yarn dev
   # oppure
   npm run dev
   ```

7. **Apri l'applicazione**

   Visita: [http://localhost:3000](http://localhost:3000)

## Credenziali Demo

Dopo l'inizializzazione del database, puoi accedere con:

```
Admin
Email: admin@learnhub.it
Password: admin123

Insegnante 1
Email: marco@learnhub.it
Password: marco123

Insegnante 2
Email: laura@learnhub.it
Password: laura123

Studente
Email: student@learnhub.it
Password: student123
```

## Guida Utilizzo

### Come Insegnante

1. **Login** con credenziali insegnante
2. **Crea un nuovo corso**:
   - Clicca "Nuovo Corso" nella dashboard
   - Compila titolo, descrizione, categoria, livello, prezzo
   - Carica una copertina o genera automaticamente
   - Salva come bozza

3. **Aggiungi moduli e lezioni**:
   - Dopo aver creato il corso, vai su "Modifica"
   - Tab "Contenuto" -> "Aggiungi Modulo"
   - Per ogni modulo, clicca "Aggiungi Lezione"
   - Scegli tipo lezione:
     - **Video**: Upload file video (MP4, WebM, OGG, MOV - max 500MB)
     - **PDF**: Upload documento (PDF, DOC, DOCX, TXT - max 50MB)
     - **Testo**: Contenuto testuale formattato
     - **Misto**: Combinazione di video, PDF e testo

4. **Pubblica il corso**:
   - Tab "Impostazioni"
   - Controlla la checklist di pubblicazione
   - Clicca "Invia in Revisione"
   - Attendi approvazione admin

5. **Monitora performance**:
   - Dashboard mostra studenti iscritti, ricavi, rating
   - Visualizza statistiche dettagliate

### Come Studente

1. **Esplora il catalogo**
   - Cerca corsi per categoria, livello, prezzo
   - Visualizza anteprima corso

2. **Iscriviti a un corso**
   - Clicca su un corso -> "Iscriviti"

3. **Segui le lezioni**
   - Naviga tra i moduli nel pannello laterale
   - Visualizza video, PDF, testo
   - Completa ogni lezione cliccando il checkbox

4. **Ottieni l'attestato**
   - Completa tutte le lezioni obbligatorie
   - Al 100% di progresso, l'attestato viene generato automaticamente
   - Scarica il PDF dalla dashboard o dalla pagina corso

5. **Verifica attestato**
   - Ogni attestato ha un codice univoco (formato: LH-XXXXXXXX)
   - Visita `/api/certificates/verify/CODICE` per verificare

### Come Admin

1. **Gestisci utenti**: Sospendi/Attiva account, cambia ruoli
2. **Modera corsi**: Approva o rifiuta corsi in revisione
3. **Monitora analytics**: Revenue, utenti, corsi popolari
4. **Esporta progetto**: `/api/export/project` per download ZIP completo

## Funzionalita Avanzate

### Calcolo Automatico Durata

Il sistema calcola automaticamente la durata del corso in base ai contenuti:
- **Video**: Durata reale del file o metadata
- **PDF**: 2 minuti per pagina (stimato)
- **Testo**: 200 parole al minuto (stimato)
- **Contenuto Misto**: Somma automatica di tutti i contenuti

La durata viene aggiornata in tempo reale ogni volta che viene aggiunta, modificata o eliminata una lezione.

### Generazione Copertine Automatica

L'insegnante puo:
1. **Upload manuale**: Carica un'immagine personalizzata
2. **Generazione automatica**: Il sistema crea una copertina moderna con:
   - Gradient personalizzato per categoria
   - Titolo del corso con word-wrap automatico
   - Sottotitolo
   - Badge livello (Principiante/Intermedio/Avanzato)
   - Nome insegnante
   - Pattern decorativo

### Attestati PDF Professionali

Caratteristiche attestati:
- Generazione automatica **solo** al 100% di completamento
- Template elegante con bordo decorativo
- Codice univoco di verifica (formato: LH-XXXXXXXX)
- Nome studente, corso, insegnante
- Data di completamento
- Logo piattaforma
- Verifica pubblica via URL

### Sistema Gamification

- **XP** guadagnati per: iscrizione (+10), lezione completata (+10), corso completato (+100), recensione (+20), post forum (+15)
- **Livelli**: Principiante (0) -> Esploratore (100) -> Apprendista (300) -> Studioso (600) -> Esperto (1000) -> Maestro (1500)
- **Badge**: Primo Corso, Apprendista Veloce, Maestro, Top Insegnante, Star Community
- **Classifica** pubblica top 20 utenti

## API Principali

### Autenticazione
```
POST   /api/auth/register         Registrazione utente
POST   /api/auth/login            Login
GET    /api/auth/me               Profilo utente corrente
PUT    /api/auth/profile          Aggiorna profilo
```

### Corsi (Insegnante)
```
GET    /api/instructor/dashboard                  Dashboard con statistiche
GET    /api/instructor/courses                    Lista corsi insegnante
POST   /api/instructor/courses                    Crea corso
PUT    /api/instructor/courses/:id                Modifica corso
DELETE /api/instructor/courses/:id                Elimina corso
POST   /api/instructor/courses/:id/duplicate      Duplica corso
PUT    /api/instructor/courses/:id/status         Cambia stato corso
```

### Moduli e Lezioni
```
POST   /api/instructor/courses/:id/sections       Crea modulo
PUT    /api/instructor/sections/:id               Modifica modulo
DELETE /api/instructor/sections/:id               Elimina modulo
POST   /api/instructor/sections/:id/lessons       Crea lezione
PUT    /api/instructor/lessons/:id                Modifica lezione
DELETE /api/instructor/lessons/:id                Elimina lezione
```

### Upload
```
POST   /api/instructor/upload                     Upload file (FormData: file + type)
POST   /api/instructor/generate-cover             Genera copertina automatica
```

### Corsi Pubblici
```
GET    /api/courses                               Lista corsi (filtri: search, category, level, sort)
GET    /api/courses/:id                           Dettaglio corso completo
GET    /api/courses/:id/modules                   Lista moduli
GET    /api/courses/:id/reviews                   Lista recensioni
POST   /api/courses/:id/enroll                    Iscrizione
POST   /api/courses/:id/progress                  Aggiorna progresso
POST   /api/courses/:id/reviews                   Aggiungi recensione
```

### Studente
```
POST   /api/student/lessons/:id/complete          Completa lezione
GET    /api/student/courses/:id/progress          Progresso corso
GET    /api/student/courses/:id/certificate       Genera/scarica attestato
```

### Dashboard
```
GET    /api/dashboard/student                     Dashboard studente
GET    /api/dashboard/instructor                  Dashboard insegnante
GET    /api/dashboard/admin                       Dashboard admin
```

### Admin
```
GET    /api/admin/users                           Lista utenti
PUT    /api/admin/users/:id                       Aggiorna ruolo
PUT    /api/admin/users/:id/suspend               Sospendi/riattiva
GET    /api/admin/courses                         Lista tutti i corsi
PUT    /api/admin/courses/:id/approve             Approva/rifiuta
DELETE /api/admin/courses/:id                     Elimina corso
GET    /api/admin/analytics                       Analytics piattaforma
GET    /api/admin/payments                        Lista pagamenti
GET    /api/admin/reports                         Report esportabili
```

### Community
```
GET    /api/community/posts                       Lista post
POST   /api/community/posts                       Crea post
GET    /api/community/posts/:id                   Dettaglio post
POST   /api/community/posts/:id/comments          Commenta
POST   /api/community/posts/:id/upvote            Upvote/downvote
```

### Gamification
```
GET    /api/gamification/profile                  Profilo XP, livello, badge
GET    /api/gamification/leaderboard              Classifica
```

### AI (Demo)
```
POST   /api/ai/course-structure                   Genera struttura corso
POST   /api/ai/description                        Genera descrizione
POST   /api/ai/summary                            Riassunto lezione
POST   /api/ai/quiz                               Genera quiz
POST   /api/ai/chat                               Chat assistente
```

### Certificati
```
POST   /api/certificates/generate                 Genera certificato
GET    /api/certificates/:code/verify             Verifica pubblica
```

### Sottotitoli
```
POST   /api/subtitles/generate                    Genera sottotitoli AI (Whisper)
POST   /api/subtitles/save                        Salva sottotitoli
GET    /api/lessons/:id/subtitles                 Ottieni sottotitoli
```

### Altro
```
GET    /api/init                                  Seed database
GET    /api/categories                            Lista categorie
POST   /api/upload                                Upload generico
GET    /api/export/project                        Esporta progetto ZIP
GET    /api/documents/view/:lessonId              Proxy documenti inline
```

## Struttura Progetto

```
/
├── app/
│   ├── api/
│   │   └── [[...path]]/
│   │       └── route.js              # Backend API monolitico (tutte le route)
│   ├── page.js                       # Frontend SPA React
│   ├── layout.js                     # Root Layout Next.js
│   └── globals.css                   # Stili globali Tailwind
│
├── components/
│   ├── ui/                           # Componenti Shadcn/UI
│   │   ├── accordion.jsx
│   │   ├── alert-dialog.jsx
│   │   ├── avatar.jsx
│   │   ├── badge.jsx
│   │   ├── button.jsx
│   │   ├── calendar.jsx
│   │   ├── card.jsx
│   │   ├── carousel.jsx
│   │   ├── chart.jsx
│   │   ├── checkbox.jsx
│   │   ├── command.jsx
│   │   ├── dialog.jsx
│   │   ├── drawer.jsx
│   │   ├── dropdown-menu.jsx
│   │   ├── form.jsx
│   │   ├── input.jsx
│   │   ├── label.jsx
│   │   ├── popover.jsx
│   │   ├── progress.jsx
│   │   ├── scroll-area.jsx
│   │   ├── select.jsx
│   │   ├── separator.jsx
│   │   ├── sheet.jsx
│   │   ├── skeleton.jsx
│   │   ├── slider.jsx
│   │   ├── sonner.jsx
│   │   ├── switch.jsx
│   │   ├── table.jsx
│   │   ├── tabs.jsx
│   │   ├── textarea.jsx
│   │   ├── toast.jsx
│   │   ├── toaster.jsx
│   │   ├── toggle.jsx
│   │   ├── tooltip.jsx
│   │   └── ...
│   ├── CompleteCourseEditor.jsx      # Editor completo corsi (insegnante)
│   └── InstructorComponents.jsx      # Componenti area insegnante
│
├── lib/
│   ├── mongodb.js                    # Connessione MongoDB (singleton cached)
│   ├── backend-extensions.js         # Utility backend (PDF, Canvas, ZIP, durata)
│   └── utils.js                      # Utility frontend (cn, classnames)
│
├── hooks/
│   ├── use-toast.js                  # Hook notifiche toast
│   └── use-mobile.jsx                # Hook responsive
│
├── public/
│   └── uploads/                      # File caricati (fallback locale)
│       ├── images/                   # Immagini e avatar
│       ├── videos/                   # Video lezioni
│       ├── pdfs/                     # Documenti PDF
│       ├── covers/                   # Copertine generate/caricate
│       └── certificates/             # Attestati PDF generati
│
├── package.json                      # Dipendenze (yarn install)
├── next.config.js                    # Config Next.js (standalone, CORS, headers)
├── tailwind.config.js                # Config Tailwind + Shadcn/UI theme
├── postcss.config.js                 # Config PostCSS
├── jsconfig.json                     # Path aliases (@/*)
├── components.json                   # Config Shadcn/UI
├── .env                              # Variabili d'ambiente (NON committare)
├── .env.example                      # Template variabili d'ambiente
└── README.md                         # Questa documentazione
```

## Deploy in Produzione

### Opzione 1: Vercel (Consigliato)

1. Fai push del progetto su GitHub
2. Importa su [vercel.com](https://vercel.com) -> "New Project"
3. Configura variabili d'ambiente:
   - `MONGO_URL`: URL MongoDB Atlas
   - `DB_NAME`: Nome database
   - `JWT_SECRET`: Secret JWT
   - `NEXT_PUBLIC_BASE_URL`: URL produzione
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (per upload)
4. Deploy automatico!

### Opzione 2: Server VPS

1. **Build di produzione**
   ```bash
   yarn build
   ```

2. **Avvia il server**
   ```bash
   yarn start
   ```

3. **Usa PM2 per processo persistente**
   ```bash
   npm install -g pm2
   pm2 start yarn --name learnhub -- start
   pm2 save
   pm2 startup
   ```

4. **Configura Nginx come reverse proxy**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       client_max_body_size 500M;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_read_timeout 300s;
       }
   }
   ```

## Troubleshooting

### MongoDB non si connette
- Verifica che MongoDB sia in esecuzione: `mongod --version`
- Controlla che `MONGO_URL` in `.env` sia corretto
- Se usi MongoDB Atlas, verifica IP whitelist

### Errore upload file
- Controlla permessi cartella `/public/uploads/`
- Verifica dimensione massima file in `next.config.js`
- Se usi Cloudinary, verifica le credenziali nel `.env`

### Video non si caricano
- Formato supportati: MP4, WebM, OGG, MOV
- Dimensione massima: 500MB
- Se usi Cloudinary, verifica il piano (limiti upload)

### Attestati non si generano
- Verifica che il corso sia completato al 100%
- Controlla logs backend per errori jsPDF
- Assicurati che la cartella `/public/uploads/certificates/` esista

### Copertine non si generano
- Verifica installazione `canvas` (richiede dipendenze di sistema)
- Su Linux: `apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
- Su Mac: `brew install pkg-config cairo pango libpng jpeg giflib librsvg`

### Login non funziona
- Verifica che il database sia inizializzato (`GET /api/init`)
- Controlla che le credenziali siano corrette
- Verifica che JWT_SECRET sia configurato

## Licenza

MIT License - Vedi file LICENSE per dettagli.

## Supporto

Per supporto:
- Apri una Issue su GitHub
- Email: support@learnhub.it

---

**Sviluppato con amore per educatori e studenti**

Made with Next.js, React, MongoDB, TailwindCSS, Shadcn/UI
