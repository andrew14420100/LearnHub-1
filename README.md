# LearnHub - Piattaforma E-Learning

Marketplace di corsi online con area insegnante, studente e admin.

## Architettura

| Componente | Tecnologia | Porta |
|-----------|-----------|-------|
| Frontend | React (CRA + Craco) + Tailwind CSS | 3000 |
| Backend | FastAPI (Python) | 8001 |
| Database | MongoDB | 27017 |

## Installazione

### Prerequisiti
- Node.js 18+
- Python 3.11+
- MongoDB

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
```

Crea il file `.env` nella cartella `backend/`:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="learnhub"
CORS_ORIGINS="*"
JWT_SECRET="learnhub-jwt-secret-2025"
```

Avvia il backend:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Frontend

```bash
cd frontend
yarn install
```

Crea il file `.env` nella cartella `frontend/`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

> **Nota:** In produzione, imposta `REACT_APP_BACKEND_URL` con l'URL pubblico del backend.

Avvia il frontend:
```bash
yarn start
```

L'app sara disponibile su `http://localhost:3000`.

### 3. Inizializzazione Database

Al primo avvio, visita la homepage o chiama:
```
GET /api/init
```

Questo creera automaticamente:
- 10 categorie
- 4 utenti demo
- 6 corsi di esempio con moduli e lezioni

## Credenziali Demo

| Ruolo | Email | Password |
|-------|-------|----------|
| Admin | admin@learnhub.it | admin123 |
| Insegnante | marco@learnhub.it | marco123 |
| Insegnante | laura@learnhub.it | laura123 |
| Studente | student@learnhub.it | student123 |

## API Endpoints

### Autenticazione
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrazione nuovo utente |
| POST | `/api/auth/login` | Login (restituisce JWT token) |
| GET | `/api/auth/me` | Profilo utente autenticato |
| PUT | `/api/auth/profile` | Aggiorna profilo |

### Corsi
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/courses` | Lista corsi (con filtri: search, category, level, sort, page, limit) |
| GET | `/api/courses/:id` | Dettaglio corso con moduli, lezioni, recensioni |
| POST | `/api/courses` | Crea corso (insegnante/admin) |
| PUT | `/api/courses/:id` | Aggiorna corso |
| DELETE | `/api/courses/:id` | Elimina corso |
| POST | `/api/courses/:id/enroll` | Iscrizione al corso |
| POST | `/api/courses/:id/progress` | Aggiorna progresso |
| GET | `/api/courses/:id/reviews` | Lista recensioni |
| POST | `/api/courses/:id/reviews` | Aggiungi recensione |
| GET | `/api/courses/:id/modules` | Lista moduli |

### Categorie
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/categories` | Lista tutte le categorie |
| POST | `/api/categories` | Crea categoria (admin) |

### Moduli e Lezioni
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/modules` | Crea modulo |
| PUT | `/api/modules/:id` | Aggiorna modulo |
| DELETE | `/api/modules/:id` | Elimina modulo |
| GET | `/api/modules/:id/lessons` | Lista lezioni del modulo |
| POST | `/api/lessons` | Crea lezione |
| PUT | `/api/lessons/:id` | Aggiorna lezione |
| DELETE | `/api/lessons/:id` | Elimina lezione |

### Dashboard
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/dashboard/student` | Dashboard studente |
| GET | `/api/dashboard/instructor` | Dashboard insegnante |
| GET | `/api/dashboard/admin` | Dashboard admin |

### Area Insegnante
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/instructor/dashboard` | Dashboard e lista corsi |
| POST | `/api/instructor/courses` | Crea nuovo corso |
| PUT | `/api/instructor/courses/:id` | Aggiorna corso |
| DELETE | `/api/instructor/courses/:id` | Elimina corso |
| POST | `/api/instructor/courses/:id/duplicate` | Duplica corso |
| PUT | `/api/instructor/courses/:id/status` | Cambia stato (draft/pending_review) |
| POST | `/api/instructor/courses/:id/sections` | Crea sezione/modulo |
| PUT | `/api/instructor/sections/:id` | Aggiorna sezione |
| DELETE | `/api/instructor/sections/:id` | Elimina sezione |
| POST | `/api/instructor/sections/:id/lessons` | Crea lezione nella sezione |
| PUT | `/api/instructor/lessons/:id` | Aggiorna lezione |
| DELETE | `/api/instructor/lessons/:id` | Elimina lezione |
| POST | `/api/instructor/upload` | Upload file (immagine/video/PDF) |

### Area Studente
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/student/lessons/:id/complete` | Segna lezione come completata |
| GET | `/api/student/courses/:id/progress` | Progresso nel corso |
| GET | `/api/student/courses/:id/certificate` | Genera/scarica attestato |

### Admin
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/admin/users` | Lista utenti |
| GET | `/api/admin/users/:id` | Dettaglio utente |
| PUT | `/api/admin/users/:id` | Aggiorna ruolo utente |
| PUT | `/api/admin/users/:id/suspend` | Sospendi/riattiva utente |
| GET | `/api/admin/courses` | Lista tutti i corsi |
| PUT | `/api/admin/courses/:id/approve` | Approva/rifiuta corso |
| PUT | `/api/admin/courses/:id` | Modifica corso |
| DELETE | `/api/admin/courses/:id` | Elimina corso |
| GET | `/api/admin/reviews` | Lista recensioni |
| DELETE | `/api/admin/reviews/:id` | Elimina recensione |
| PUT | `/api/admin/categories/:id` | Modifica categoria |
| DELETE | `/api/admin/categories/:id` | Elimina categoria |
| GET | `/api/admin/analytics` | Analytics piattaforma |
| GET | `/api/admin/payments` | Lista pagamenti |
| GET | `/api/admin/reports` | Report (summary/users/courses/enrollments) |

### Community / Forum
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/community/posts` | Lista post |
| POST | `/api/community/posts` | Crea post |
| GET | `/api/community/posts/:id` | Dettaglio post con commenti |
| POST | `/api/community/posts/:id/comments` | Aggiungi commento |
| POST | `/api/community/posts/:id/upvote` | Upvote/downvote post |

### Gamification
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/gamification/profile` | Profilo gamification (XP, livello, badge) |
| GET | `/api/gamification/leaderboard` | Classifica utenti |

### AI (Demo)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/ai/course-structure` | Genera struttura corso |
| POST | `/api/ai/description` | Genera descrizione |
| POST | `/api/ai/summary` | Riassunto lezione |
| POST | `/api/ai/quiz` | Genera quiz |
| POST | `/api/ai/chat` | Chat assistente AI |

> **Nota:** Le risposte AI sono attualmente in modalita demo.

### Certificati
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/certificates/generate` | Genera certificato |
| GET | `/api/certificates/:code/verify` | Verifica certificato |

### Upload File
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/upload` | Upload generico |
| POST | `/api/instructor/upload` | Upload insegnante (immagine/video/PDF) |
| GET | `/api/uploads/:subdir/:filename` | Accesso file caricati (streaming) |

I file caricati vengono salvati localmente in `backend/uploads/` e serviti tramite streaming con supporto HTTP Range requests (per lo streaming video).

### Sottotitoli
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/subtitles/save` | Salva sottotitoli |
| GET | `/api/lessons/:id/subtitles` | Ottieni sottotitoli lezione |

## Struttura File

```
/app/
  backend/
    server.py          # FastAPI - tutte le API
    .env               # Variabili d'ambiente backend
    requirements.txt   # Dipendenze Python
    uploads/           # File caricati
      images/
      videos/
      pdfs/
      certificates/
  frontend/
    src/
      App.js           # App React principale (routing, pagine, componenti)
      App.css          # Stili principali
      index.css        # Stili globali + Tailwind
      components/
        CompleteCourseEditor.jsx  # Editor completo corsi (insegnante)
        InstructorComponents.jsx  # Componenti dashboard insegnante
        ui/                       # Componenti UI (shadcn/ui)
    .env               # Variabili d'ambiente frontend
    package.json       # Dipendenze Node.js
    tailwind.config.js # Configurazione Tailwind
```

## Funzionalita Principali

- **Marketplace corsi** con ricerca, filtri per categoria/livello/prezzo
- **Area insegnante** completa: crea/modifica/pubblica corsi con moduli e lezioni
- **Area studente**: iscrizione corsi, tracciamento progresso, attestati
- **Area admin**: gestione utenti, approvazione corsi, analytics, report
- **Upload file**: immagini di copertina, video lezioni, documenti PDF
- **Community/Forum**: post, commenti, upvote
- **Gamification**: XP, livelli, badge, classifica
- **Certificati**: generazione automatica al completamento corso
- **Video player**: player custom con controlli, supporto Range requests per streaming
- **Responsive**: interfaccia ottimizzata per desktop e mobile

## Note Tecniche

- L'autenticazione usa JWT con token Bearer
- I file vengono salvati localmente (no Cloudinary in questa configurazione)
- I video sono serviti con HTTP Range requests per streaming efficiente
- Il database viene inizializzato automaticamente al primo accesso
- Le API AI restituiscono risposte demo (configurabile con chiave OpenAI)
