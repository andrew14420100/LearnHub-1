// ==================== BACKEND EXTENSIONS FOR INSTRUCTOR AREA ====================
// Questo file contiene le estensioni del backend per l'area insegnante
// Include: gestione completa corsi, moduli, lezioni, upload file, copertine, attestati PDF

import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createCanvas, loadImage } from 'canvas';
import jsPDF from 'jspdf';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calcola la durata stimata di lettura per un testo
 * @param {string} text - Testo da analizzare
 * @returns {number} Durata in secondi
 */
export function calculateTextReadingTime(text) {
  if (!text) return 0;
  const wordsPerMinute = 200; // Media di lettura
  const words = text.trim().split(/\s+/).length;
  const minutes = words / wordsPerMinute;
  return Math.ceil(minutes * 60); // Secondi
}

/**
 * Calcola la durata stimata di lettura per un PDF
 * @param {number} pages - Numero di pagine
 * @returns {number} Durata in secondi
 */
export function calculatePDFReadingTime(pages) {
  if (!pages || pages < 1) return 0;
  const minutesPerPage = 2; // Stima: 2 minuti per pagina
  return pages * minutesPerPage * 60; // Secondi
}

/**
 * Estrae metadata video (placeholder - in produzione usare ffprobe)
 * @param {string} filePath - Path del file video
 * @returns {Promise<object>} Metadata del video
 */
export async function getVideoMetadata(filePath) {
  // Placeholder: in produzione usare ffprobe o simili
  // Per ora ritorna durata fissa come esempio
  return {
    duration: 600, // 10 minuti di default
    width: 1920,
    height: 1080,
    format: 'mp4'
  };
}

/**
 * Estrae metadata PDF (placeholder)
 * @param {string} filePath - Path del file PDF
 * @returns {Promise<object>} Metadata del PDF
 */
export async function getPDFMetadata(filePath) {
  // Placeholder: in produzione usare pdf-parse o pdf-lib
  return {
    pages: 10, // Default 10 pagine
    title: 'Documento',
    author: ''
  };
}

// ==================== COVER GENERATION ====================

/**
 * Genera una copertina del corso con template grafico moderno
 * @param {object} courseData - Dati del corso
 * @returns {Promise<string>} Path della copertina generata
 */
export async function generateCourseCover(courseData) {
  const { title, subtitle, instructorName, category, level } = courseData;
  
  // Dimensioni canvas
  const width = 1200;
  const height = 675;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Gradients per categoria
  const gradients = {
    'web-development': { start: '#3B82F6', end: '#8B5CF6' },
    'mobile-development': '#06B6D4', end: '#2563EB' },
    'data-science': { start: '#10B981', end: '#14B8A6' },
    'design': { start: '#EC4899', end: '#F43F5E' },
    'business': { start: '#F59E0B', end: '#F97316' },
    'marketing': { start: '#EF4444', end: '#EC4899' },
    'photography': { start: '#8B5CF6', end: '#A855F7' },
    'music': { start: '#6366F1', end: '#3B82F6' },
    'personal-growth': { start: '#EAB308', end: '#F59E0B' },
    'finance': { start: '#64748B', end: '#475569' }
  };
  
  const colors = gradients[category] || { start: '#6366F1', end: '#8B5CF6' };
  
  // Gradient di sfondo
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors.start);
  gradient.addColorStop(1, colors.end);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Pattern decorativo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      Math.random() * 100 + 50,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  
  // Titolo corso
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Word wrap per il titolo
  const maxWidth = width - 100;
  const words = title.split(' ');
  let line = '';
  const lines = [];
  
  for (let word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== '') {
      lines.push(line);
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  
  // Disegna titolo
  const startY = height / 2 - (lines.length * 35);
  lines.forEach((line, i) => {
    ctx.fillText(line.trim(), width / 2, startY + (i * 70));
  });
  
  // Sottotitolo
  if (subtitle) {
    ctx.font = '32px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(subtitle, width / 2, height / 2 + 100);
  }
  
  // Insegnante
  if (instructorName) {
    ctx.font = '28px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`by ${instructorName}`, width / 2, height - 80);
  }
  
  // Badge livello
  if (level) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(50, 50, 150, 50);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(level.toUpperCase(), 70, 80);
  }
  
  // Salva immagine
  const buffer = canvas.toBuffer('image/png');
  const filename = `cover-${uuidv4()}.png`;
  const coverPath = path.join(process.cwd(), 'public', 'uploads', 'covers', filename);
  
  await mkdir(path.dirname(coverPath), { recursive: true });
  await writeFile(coverPath, buffer);
  
  return `/uploads/covers/${filename}`;
}

// ==================== PDF CERTIFICATE GENERATION ====================

/**
 * Genera un attestato PDF per il completamento del corso
 * @param {object} data - Dati per il certificato
 * @returns {Promise<string>} Path del certificato generato
 */
export async function generateCertificatePDF(data) {
  const { 
    studentName, 
    courseName, 
    instructorName, 
    completedAt, 
    certificateCode,
    courseSubtitle 
  } = data;
  
  // Crea PDF con jsPDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  
  // Bordo decorativo
  doc.setDrawColor(99, 102, 241); // Indigo
  doc.setLineWidth(2);
  doc.rect(10, 10, width - 20, height - 20);
  
  doc.setLineWidth(0.5);
  doc.rect(15, 15, width - 30, height - 30);
  
  // Logo/Titolo piattaforma
  doc.setFontSize(24);
  doc.setTextColor(99, 102, 241);
  doc.text('LearnHub', width / 2, 30, { align: 'center' });
  
  // "Attestato di Fine Frequenza"
  doc.setFontSize(16);
  doc.setTextColor(100, 100, 100);
  doc.text('Attestato di Fine Frequenza', width / 2, 45, { align: 'center' });
  
  // Questo certifica che
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text('Questo certifica che', width / 2, 65, { align: 'center' });
  
  // Nome studente
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(studentName, width / 2, 85, { align: 'center' });
  
  // Ha completato con successo il corso
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('ha completato con successo il corso', width / 2, 100, { align: 'center' });
  
  // Nome corso
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(courseName, width / 2, 120, { align: 'center', maxWidth: width - 60 });
  
  // Sottotitolo corso (se presente)
  if (courseSubtitle) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(courseSubtitle, width / 2, 135, { align: 'center', maxWidth: width - 60 });
  }
  
  // Data completamento
  const dateStr = new Date(completedAt).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Data di completamento: ${dateStr}`, width / 2, 155, { align: 'center' });
  
  // Insegnante
  if (instructorName) {
    doc.setFontSize(12);
    doc.text('Insegnante', 40, height - 40);
    doc.setFont('helvetica', 'bold');
    doc.text(instructorName, 40, height - 32);
    
    // Linea firma
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(40, height - 25, 100, height - 25);
  }
  
  // Codice certificato
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Codice certificato: ${certificateCode}`, width - 40, height - 32, { align: 'right' });
  doc.text('Verificabile su: learnhub.it/verify', width - 40, height - 25, { align: 'right' });
  
  // Salva PDF
  const filename = `certificate-${certificateCode}.pdf`;
  const pdfPath = path.join(process.cwd(), 'public', 'uploads', 'certificates', filename);
  
  await mkdir(path.dirname(pdfPath), { recursive: true });
  
  // Salva il buffer del PDF
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  await writeFile(pdfPath, pdfBuffer);
  
  return `/uploads/certificates/${filename}`;
}

// ==================== PROJECT ZIP EXPORT ====================

/**
 * Crea un archivio ZIP del progetto completo
 * @returns {Promise<string>} Path del file ZIP creato
 */
export async function createProjectZIP() {
  const zipFilename = `learnhub-project-${Date.now()}.zip`;
  const zipPath = path.join(process.cwd(), 'public', 'exports', zipFilename);
  
  await mkdir(path.dirname(zipPath), { recursive: true });
  
  const output = createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`ZIP creato: ${archive.pointer()} bytes`);
      resolve(`/exports/${zipFilename}`);
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    
    // Aggiungi tutti i file del progetto
    const projectRoot = process.cwd();
    
    // Directory da includere
    archive.directory(path.join(projectRoot, 'app'), 'app');
    archive.directory(path.join(projectRoot, 'components'), 'components');
    archive.directory(path.join(projectRoot, 'lib'), 'lib');
    archive.directory(path.join(projectRoot, 'public'), 'public');
    
    // File individuali
    archive.file(path.join(projectRoot, 'package.json'), { name: 'package.json' });
    archive.file(path.join(projectRoot, 'tailwind.config.js'), { name: 'tailwind.config.js' });
    archive.file(path.join(projectRoot, 'postcss.config.js'), { name: 'postcss.config.js' });
    archive.file(path.join(projectRoot, 'next.config.js'), { name: 'next.config.js' });
    
    // Crea .env.example
    const envExample = `# LearnHub Environment Variables

# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=learnhub

# JWT Secret
JWT_SECRET=your-secret-key-here

# Next.js
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Upload limits
MAX_FILE_SIZE=50MB
`;
    
    archive.append(envExample, { name: '.env.example' });
    
    // Crea README.md
    const readme = `# LearnHub - Piattaforma E-Learning

Marketplace di corsi online completo con area insegnante, studente e admin.

## Caratteristiche

- 🎓 **Area Insegnante**: Crea e gestisci corsi con moduli e lezioni
- 📚 **Area Studente**: Segui corsi, traccia progresso, ottieni attestati
- 👨‍💼 **Area Admin**: Gestione piattaforma completa
- 🎨 **Gestione Copertine**: Upload manuale o generazione automatica
- 📹 **Contenuti Multi-formato**: Video, PDF, Testo, Contenuti misti
- ⏱️ **Durata Automatica**: Calcolo automatico durata corsi
- 🏆 **Attestati PDF**: Generazione automatica a completamento corso
- 🎯 **Progresso Tracciato**: Monitoraggio completo avanzamento studente

## Stack Tecnologico

- **Frontend**: Next.js 14, React, TailwindCSS, Shadcn/UI
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **PDF**: jsPDF
- **Canvas**: node-canvas per generazione copertine

## Installazione

1. Clona il repository
2. Installa le dipendenze:
   \`\`\`bash
   yarn install
   \`\`\`

3. Copia \`.env.example\` in \`.env\` e configura le variabili:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. Avvia MongoDB localmente o configura un cluster MongoDB Atlas

5. Avvia il server di sviluppo:
   \`\`\`bash
   yarn dev
   \`\`\`

6. Apri [http://localhost:3000](http://localhost:3000)

## Seed Database

Al primo avvio, visita \`/api/init\` per popolare il database con dati di esempio.

## Credenziali Demo

- **Admin**: admin@learnhub.it / admin123
- **Insegnante**: marco@learnhub.it / marco123
- **Studente**: student@learnhub.it / student123

## Deploy

### Vercel (Consigliato)

1. Fai push su GitHub
2. Importa il progetto su Vercel
3. Configura le variabili d'ambiente
4. Deploy automatico!

### Server Proprio

1. Build di produzione:
   \`\`\`bash
   yarn build
   \`\`\`

2. Avvia il server:
   \`\`\`bash
   yarn start
   \`\`\`

## Struttura Progetto

\`\`\`
/app
  /api/[[...path]]     # API Backend
  /page.js             # Frontend SPA
  /layout.js           # Root Layout
  /globals.css         # Stili globali

/components/ui/        # Componenti Shadcn

/lib
  /mongodb.js          # Connessione DB
  /backend-extensions.js  # Funzioni backend estese

/public
  /uploads             # File caricati dagli utenti
\`\`\`

## API Principali

### Autenticazione
- POST \`/api/auth/register\`
- POST \`/api/auth/login\`
- GET \`/api/auth/me\`

### Corsi (Insegnante)
- GET \`/api/instructor/courses\`
- POST \`/api/instructor/courses\`
- PUT \`/api/instructor/courses/:id\`
- DELETE \`/api/instructor/courses/:id\`

### Moduli e Lezioni
- POST \`/api/instructor/courses/:id/sections\`
- POST \`/api/instructor/sections/:id/lessons\`
- PUT \`/api/instructor/lessons/:id\`

### Progresso Studente
- POST \`/api/student/lessons/:id/complete\`
- GET \`/api/student/courses/:id/progress\`

### Attestati
- GET \`/api/student/courses/:id/certificate\`
- GET \`/api/certificates/verify/:code\`

## Licenza

MIT

## Supporto

Per supporto, apri una issue o contatta support@learnhub.it
`;
    
    archive.append(readme, { name: 'README.md' });
    
    archive.finalize();
  });
}

export default {
  calculateTextReadingTime,
  calculatePDFReadingTime,
  getVideoMetadata,
  getPDFMetadata,
  generateCourseCover,
  generateCertificatePDF,
  createProjectZIP
};
