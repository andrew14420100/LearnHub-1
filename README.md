# LearnHub - Piattaforma E-Learning Completa

**Marketplace di corsi online professionale** con area insegnante, studente e amministratore.

## Caratteristiche Principali

### Area Insegnante
- **Dashboard completa** con statistiche (studenti, ricavi, rating)
- **Creazione corsi** guidata con form intuitivo
- **Gestione moduli e lezioni** con editor avanzato
- **4 tipi di contenuto**: Video, PDF, Testo, Contenuto Misto
- **Upload file** (immagini, video, PDF) con storage locale e streaming
- **Copertine**: Upload manuale o generazione automatica
- **Calcolo durata automatico**: Il sistema calcola automaticamente la durata totale del corso
- **Stati corso**: Bozza -> In Revisione -> Pubblicato/Rifiutato
- **Duplicazione corsi** per riutilizzo rapido
- **Anteprima corso** prima della pubblicazione

### Area Studente
- **Catalogo corsi** con ricerca e filtri avanzati
- **Iscrizione corsi** con tracciamento progresso
- **Visualizzazione contenuti**: Player video con streaming, viewer PDF, testo formattato
- **Progresso automatico**: Completamento lezioni e calcolo percentuale
- **Attestati**: Generazione automatica al 100% di completamento
- **Download attestati** con codice verifica univoco
- **Dashboard personale** con corsi iscritti e attestati ottenuti

### Area Admin
- **Gestione utenti** (sospensione, cambio ruoli)
- **Moderazione corsi** (approvazione/rifiuto)
- **Analytics avanzate** (revenue, utenti, corsi)
- **Gestione categorie**
- **Report esportabili** (JSON)

### Design e UX
- **Design moderno** stile Stripe/Linear/Notion
- **Responsive** su tutti i dispositivi
- **Animazioni fluide** e transizioni eleganti
- **Componenti Shadcn/UI** professionali
- **Icone Lucide React**

### Community e Gamification
- **Forum** con post, commenti e upvote
- **Sistema XP** e livelli (Principiante -> Maestro)
- **Badge** per traguardi raggiunti
- **Classifica** utenti

## Stack Tecnologico

### Frontend
- **React 18** (CRA + Craco) - Libreria UI
- **TailwindCSS** - Styling utility-first
- **Shadcn/UI** - Componenti UI moderni
- **Lucide React** - Icone
- **Recharts** - Grafici analytics
- **Sonner** - Notifiche toast

### Backend
- **FastAPI** (Python) - API REST ad alte prestazioni
- **Motor** - Driver MongoDB asincrono
- **Aiofiles** - I/O file asincrono
- **Streaming Response** - Serving video con HTTP Range requests

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
- **Python** >= 3.11
- **MongoDB** >= 5.0
- **Yarn** (consigliato) o npm

## Installazione

### 1. Clona il repository

```bash
git clone <repository-url>
cd learnhub
```

### 2. Setup Backend

```bash
cd backend
pip install -r requirements.txt
```

Crea il file `.env` nella cartella `backend/`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=learnhub
CORS_ORIGINS=*
JWT_SECRET=your-super-secret-jwt-key-here
```

Avvia il backend:

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Setup Frontend

```bash
cd frontend
yarn install
```

Crea il file `.env` nella cartella `frontend/`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

> **Nota:** In produzione, imposta `REACT_APP_BACKEND_URL` con l'URL pubblico del backend (es. `https://api.tuodominio.com`).

Avvia il frontend:

```bash
yarn start
```

L'app sara disponibile su `http://localhost:3000`.

### 4. Inizializzazione Database

Al primo avvio, visita la homepage o chiama:

```
GET http://localhost:8001/api/init
```

Questo creera automaticamente:
- 10 categorie (Sviluppo Web, Mobile, Data Science, Design, Business, Marketing, Fotografia, Musica, Crescita Personale, Finanza)
- 4 utenti demo (admin, 2 insegnanti, 1 studente)
- 6 corsi di esempio con moduli e lezioni
- Indici database per performance

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
   - Cambia stato a "In Revisione"
   - Attendi approvazione admin

5. **Monitora performance**:
   - Dashboard mostra studenti iscritti, ricavi, rating
   - Visualizza statistiche dettagliate per corso

### Come Studente

1. **Esplora il catalogo**
   - Cerca corsi per categoria, livello, prezzo
   - Filtra per popolarita, novita, rating

2. **Iscriviti a un corso**
   - Clicca su un corso
   - Clicca "Iscriviti"

3. **Segui le lezioni**
   - Naviga tra i moduli nel pannello laterale
   - Visualizza video con player streaming, PDF, testo
   - Completa ogni lezione cliccando il checkbox

4. **Ottieni l'attestato**
   - Completa tutte le lezioni obbligatorie
   - Al 100% di progresso, l'attestato viene generato automaticamente
   - Scarica dalla dashboard o dalla pagina corso

5. **Verifica attestato**
   - Ogni attestato ha un codice univoco (formato: LH-XXXXXXXX)
   - Verifica pubblica via API

### Come Admin

1. **Gestisci utenti**
   - Dashboard Admin -> Utenti
   - Sospendi/Attiva account
   - Cambia ruoli (studente/insegnante/admin)

2. **Modera corsi**
   - Visualizza corsi in revisione
   - Approva o rifiuta corsi
   - Modifica/elimina corsi

3. **Monitora analytics**
   - Revenue totale e per corso
   - Crescita utenti e iscrizioni
   - Distribuzione categorie e corsi popolari

4. **Esporta report**
   - Report riepilogativo, utenti, corsi, iscrizioni (JSON)

## Funzionalita Avanzate

### Upload File e Streaming Video

Il sistema di upload supporta:
- **Immagini**: JPG, PNG, GIF, WebP (copertine corsi)
- **Video**: MP4, WebM, OGG, MOV (fino a 500MB)
- **Documenti**: PDF, DOC, DOCX, TXT, RTF, ODT (fino a 50MB)

I file vengono salvati in `backend/uploads/` e serviti tramite:
- **Streaming asincrono** per tutti i file
- **HTTP Range Requests** per video (seek/scrubbing)
- **Cache headers** per performance ottimale

### Calcolo Automatico Durata

Il sistema calcola automaticamente la durata del corso in base ai contenuti:
- **Video**: Durata reale del file o metadata forniti
- **PDF**: 2 minuti per pagina (stimato)
- **Testo**: 200 parole al minuto (stimato)
- **Totale corso**: Somma automatica di tutte le lezioni

La durata viene aggiornata in tempo reale ad ogni modifica.

### Sistema Gamification

- **XP** guadagnati per: iscrizione corso (+10), completamento lezione (+10), completamento corso (+100), recensione (+20), post forum (+15)
- **Livelli**: Principiante (0) -> Esploratore (100) -> Apprendista (300) -> Studioso (600) -> Esperto (1000) -> Maestro (1500)
- **Badge**: Primo Corso, Apprendista Veloce, Maestro, Top Insegnante, Star Community
- **Classifica** pubblica top 20 utenti

### Attestati

Caratteristiche attestati:
- Generazione automatica **solo** al 100% di completamento
- Codice univoco di verifica (formato: LH-XXXXXXXX)
- Nome studente, corso, insegnante, data
- Verifica pubblica via API

## API Endpoints

### Autenticazione
```
POST   /api/auth/register         Registrazione utente
POST   /api/auth/login            Login (restituisce JWT)
GET    /api/auth/me               Profilo utente corrente
PUT    /api/auth/profile          Aggiorna profilo
```

### Corsi Pubblici
```
GET    /api/courses               Lista corsi (filtri: search, category, level, sort, page, limit)
GET    /api/courses/:id           Dettaglio corso con moduli, lezioni, recensioni
GET    /api/courses/:id/modules   Lista moduli di un corso
GET    /api/courses/:id/reviews   Lista recensioni
POST   /api/courses/:id/enroll    Iscrizione al corso
POST   /api/courses/:id/progress  Aggiorna progresso
POST   /api/courses/:id/reviews   Aggiungi recensione
```

### Categorie
```
GET    /api/categories            Lista tutte le categorie
POST   /api/categories            Crea categoria (admin)
```

### Area Insegnante
```
GET    /api/instructor/dashboard                  Dashboard e lista corsi
POST   /api/instructor/courses                    Crea corso
PUT    /api/instructor/courses/:id                Modifica corso
DELETE /api/instructor/courses/:id                Elimina corso
POST   /api/instructor/courses/:id/duplicate      Duplica corso
PUT    /api/instructor/courses/:id/status         Cambia stato (draft/pending_review)
POST   /api/instructor/courses/:id/sections       Crea sezione/modulo
PUT    /api/instructor/sections/:id               Modifica sezione
DELETE /api/instructor/sections/:id               Elimina sezione
POST   /api/instructor/sections/:id/lessons       Crea lezione
PUT    /api/instructor/lessons/:id                Modifica lezione
DELETE /api/instructor/lessons/:id                Elimina lezione
POST   /api/instructor/upload                     Upload file (FormData: file + type)
```

### Area Studente
```
POST   /api/student/lessons/:id/complete          Segna lezione completata
GET    /api/student/courses/:id/progress          Progresso nel corso
GET    /api/student/courses/:id/certificate       Genera/scarica attestato
```

### Dashboard
```
GET    /api/dashboard/student     Dashboard studente
GET    /api/dashboard/instructor  Dashboard insegnante
GET    /api/dashboard/admin       Dashboard admin
```

### Admin
```
GET    /api/admin/users                       Lista utenti
GET    /api/admin/users/:id                   Dettaglio utente
PUT    /api/admin/users/:id                   Aggiorna ruolo
PUT    /api/admin/users/:id/suspend           Sospendi/riattiva
GET    /api/admin/courses                     Lista tutti i corsi
PUT    /api/admin/courses/:id/approve         Approva/rifiuta
PUT    /api/admin/courses/:id                 Modifica corso
DELETE /api/admin/courses/:id                 Elimina corso
GET    /api/admin/reviews                     Lista recensioni
DELETE /api/admin/reviews/:id                 Elimina recensione
PUT    /api/admin/categories/:id              Modifica categoria
DELETE /api/admin/categories/:id              Elimina categoria
GET    /api/admin/analytics                   Analytics piattaforma
GET    /api/admin/payments                    Lista pagamenti
GET    /api/admin/reports?type=summary|users|courses|enrollments
```

### Community / Forum
```
GET    /api/community/posts                   Lista post
POST   /api/community/posts                   Crea post
GET    /api/community/posts/:id               Dettaglio post con commenti
POST   /api/community/posts/:id/comments      Aggiungi commento
POST   /api/community/posts/:id/upvote        Upvote/downvote
```

### Gamification
```
GET    /api/gamification/profile               Profilo XP, livello, badge
GET    /api/gamification/leaderboard           Classifica top 20
```

### AI (Demo)
```
POST   /api/ai/course-structure               Genera struttura corso
POST   /api/ai/description                    Genera descrizione
POST   /api/ai/summary                        Riassunto lezione
POST   /api/ai/quiz                           Genera quiz
POST   /api/ai/chat                           Chat assistente
```

> **Nota:** Le risposte AI sono attualmente in modalita demo. Per attivarle, configurare una chiave API OpenAI.

### Certificati
```
POST   /api/certificates/generate             Genera certificato
GET    /api/certificates/:code/verify         Verifica pubblica
GET    /api/certificates/:code                Dettaglio certificato
```

### Upload e File
```
POST   /api/upload                            Upload generico
POST   /api/instructor/upload                 Upload insegnante (image/video/document)
GET    /api/uploads/:subdir/:filename         Accesso file (streaming con Range)
```

### Sottotitoli
```
POST   /api/subtitles/save                    Salva sottotitoli
GET    /api/lessons/:id/subtitles             Ottieni sottotitoli lezione
```

### Inizializzazione
```
GET    /api/init                              Seed database con dati demo
GET    /api/health                            Health check
```

## Struttura Progetto

```
/app
  backend/
    server.py              # FastAPI - tutte le API (auth, corsi, upload, admin, etc.)
    .env                   # Variabili d'ambiente backend
    requirements.txt       # Dipendenze Python
    uploads/               # File caricati dagli utenti
      images/              # Copertine corsi e avatar
      videos/              # Video lezioni
      pdfs/                # Documenti PDF
      certificates/        # Attestati generati
  
  frontend/
    src/
      App.js               # App React principale (3000 righe)
                           # Include: routing, pagine, componenti, logica
      App.css              # Stili principali e animazioni
      index.css            # Stili globali + Tailwind directives
      index.js             # Entry point React
      components/
        CompleteCourseEditor.jsx   # Editor completo corsi (insegnante)
                                   # Upload cover, video, PDF
                                   # Gestione moduli e lezioni
        InstructorComponents.jsx   # Componenti aggiuntivi insegnante
        ui/                        # Componenti Shadcn/UI
          button.jsx, card.jsx, dialog.jsx, input.jsx,
          select.jsx, tabs.jsx, badge.jsx, avatar.jsx,
          progress.jsx, slider.jsx, sonner.jsx, ...
      hooks/
        use-toast.js               # Hook notifiche
      lib/
        utils.js                   # Utility (cn, classnames)
    .env                   # REACT_APP_BACKEND_URL
    package.json           # Dipendenze Node.js
    tailwind.config.js     # Config Tailwind
    postcss.config.js      # Config PostCSS
    craco.config.js        # Config Craco (path aliases)
  
  README.md                # Questa documentazione
```

## Deploy in Produzione

### Opzione 1: VPS / Server dedicato

1. **Build frontend di produzione**
   ```bash
   cd frontend
   yarn build
   ```

2. **Configura .env produzione**
   ```env
   # backend/.env
   MONGO_URL=mongodb://tuo-server-mongo:27017
   DB_NAME=learnhub
   JWT_SECRET=chiave-segreta-produzione-molto-lunga
   CORS_ORIGINS=https://tuodominio.com

   # frontend/.env
   REACT_APP_BACKEND_URL=https://api.tuodominio.com
   ```

3. **Avvia con PM2/Supervisor**
   ```bash
   # Backend
   pip install -r backend/requirements.txt
   pm2 start "uvicorn server:app --host 0.0.0.0 --port 8001" --name learnhub-api

   # Frontend (serve build statica con nginx o serve)
   npx serve -s frontend/build -l 3000
   ```

4. **Configura Nginx come reverse proxy**
   ```nginx
   server {
       listen 80;
       server_name tuodominio.com;
       client_max_body_size 500M;

       location /api/ {
           proxy_pass http://localhost:8001;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_read_timeout 300s;
           proxy_send_timeout 300s;
       }

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
       }
   }
   ```

### Opzione 2: Docker

```dockerfile
# docker-compose.yml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    env_file: ./backend/.env
    depends_on:
      - mongodb
    volumes:
      - uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    env_file: ./frontend/.env

volumes:
  mongo_data:
  uploads:
```

## Troubleshooting

### MongoDB non si connette
- Verifica che MongoDB sia in esecuzione: `mongosh --version`
- Controlla che `MONGO_URL` in `backend/.env` sia corretto
- Se usi MongoDB Atlas, verifica IP whitelist e stringa di connessione

### Errore upload file
- Controlla permessi cartella `backend/uploads/`
- Verifica che il backend sia raggiungibile dal frontend
- Video max 500MB, documenti max 50MB

### Video non si caricano / 502 Error
- I video sono serviti in streaming con Range requests
- Verifica che `REACT_APP_BACKEND_URL` nel frontend punti al backend corretto
- Controlla che nginx (se usato) abbia `client_max_body_size` sufficientemente alto
- Verifica i log del backend: `tail -f /var/log/supervisor/backend.err.log`

### Attestati non si generano
- Verifica che il corso sia completato al 100% (tutte le lezioni obbligatorie)
- Lo studente deve essere iscritto al corso
- Controlla logs backend per errori

### Login non funziona
- Verifica che il database sia inizializzato (`GET /api/init`)
- Controlla che le credenziali siano corrette (case-sensitive sull'email)
- Verifica che il JWT_SECRET sia lo stesso tra riavvii del server

### Frontend non si connette al backend
- Verifica `REACT_APP_BACKEND_URL` in `frontend/.env`
- Dopo aver modificato `.env`, riavvia il frontend (`yarn start`)
- Verifica CORS: `CORS_ORIGINS` nel backend deve includere l'URL del frontend

## Licenza

MIT License - Vedi file LICENSE per dettagli.

## Supporto

Per supporto:
- Apri una Issue su GitHub
- Email: support@learnhub.it

---

**Sviluppato con amore per educatori e studenti**

Stack: React, FastAPI, MongoDB, TailwindCSS, Shadcn/UI
