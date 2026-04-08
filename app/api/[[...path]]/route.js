import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import jsPDF from 'jspdf';
import archiver from 'archiver';
import { createWriteStream, createReadStream } from 'fs';
import { v2 as cloudinary } from 'cloudinary';

// ==================== CLOUDINARY CONFIG ====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// ==================== DATABASE CONNECTION ====================
let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db(process.env.DB_NAME || 'learnhub');
  return cachedDb;
}

// ==================== AUTH UTILITIES ====================
const JWT_SECRET = process.env.JWT_SECRET || 'learnhub-jwt-secret-2025';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verify;
}

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

async function getAuthUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const payload = verifyToken(auth.substring(7));
  if (!payload) return null;
  const db = await getDb();
  const user = await db.collection('users').findOne({ id: payload.id });
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function err(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ==================== SEED DATA ====================
async function seedDatabase() {
  const db = await getDb();
  const existingCats = await db.collection('categories').countDocuments();
  if (existingCats > 0) return;

  const categories = [
    { id: uuidv4(), name: 'Sviluppo Web', slug: 'web-development', icon: '🖥️', description: 'HTML, CSS, JavaScript, React, Node.js e altro', courseCount: 0 },
    { id: uuidv4(), name: 'Sviluppo Mobile', slug: 'mobile-development', icon: '📱', description: 'Android, iOS, Flutter, React Native', courseCount: 0 },
    { id: uuidv4(), name: 'Data Science & AI', slug: 'data-science', icon: '🤖', description: 'Python, Machine Learning, Deep Learning', courseCount: 0 },
    { id: uuidv4(), name: 'Design & UX', slug: 'design', icon: '🎨', description: 'UI Design, UX Design, Figma, Adobe', courseCount: 0 },
    { id: uuidv4(), name: 'Business & Management', slug: 'business', icon: '📈', description: 'Leadership, Strategia, Project Management', courseCount: 0 },
    { id: uuidv4(), name: 'Marketing Digitale', slug: 'marketing', icon: '📊', description: 'SEO, Social Media, Content Marketing', courseCount: 0 },
    { id: uuidv4(), name: 'Fotografia & Video', slug: 'photography', icon: '📷', description: 'Fotografia, Editing Video, Produzione', courseCount: 0 },
    { id: uuidv4(), name: 'Musica & Audio', slug: 'music', icon: '🎵', description: 'Produzione musicale, Strumenti, Teoria', courseCount: 0 },
    { id: uuidv4(), name: 'Crescita Personale', slug: 'personal-growth', icon: '🧠', description: 'Produttività, Comunicazione, Mindset', courseCount: 0 },
    { id: uuidv4(), name: 'Finanza & Investimenti', slug: 'finance', icon: '💰', description: 'Trading, Investimenti, Contabilità', courseCount: 0 },
  ];
  await db.collection('categories').insertMany(categories);

  // Create demo users
  const adminId = uuidv4();
  const instructor1Id = uuidv4();
  const instructor2Id = uuidv4();
  const studentId = uuidv4();

  const users = [
    { id: adminId, name: 'Admin LearnHub', email: 'admin@learnhub.it', password: hashPassword('admin123'), role: 'admin', bio: 'Amministratore della piattaforma', avatar: null, xp: 0, level: 1, badges: [], referralCode: uuidv4().slice(0, 8), createdAt: new Date() },
    { id: instructor1Id, name: 'Marco Rossi', email: 'marco@learnhub.it', password: hashPassword('marco123'), role: 'instructor', bio: 'Senior Full-Stack Developer con 10+ anni di esperienza. Appassionato di React, Node.js e architetture cloud.', avatar: null, xp: 500, level: 3, badges: ['top_instructor'], referralCode: uuidv4().slice(0, 8), createdAt: new Date() },
    { id: instructor2Id, name: 'Laura Bianchi', email: 'laura@learnhub.it', password: hashPassword('laura123'), role: 'instructor', bio: 'Data Scientist e ricercatrice AI. PhD in Computer Science. Specializzata in NLP e Computer Vision.', avatar: null, xp: 800, level: 4, badges: ['top_instructor', 'community_star'], referralCode: uuidv4().slice(0, 8), createdAt: new Date() },
    { id: studentId, name: 'Studente Demo', email: 'student@learnhub.it', password: hashPassword('student123'), role: 'student', bio: 'Appassionato di tecnologia e programmazione.', avatar: null, xp: 150, level: 2, badges: ['first_course'], referralCode: uuidv4().slice(0, 8), createdAt: new Date() },
  ];
  await db.collection('users').insertMany(users);

  // Create demo courses
  const webCat = categories.find(c => c.slug === 'web-development');
  const dsCat = categories.find(c => c.slug === 'data-science');
  const designCat = categories.find(c => c.slug === 'design');
  const marketingCat = categories.find(c => c.slug === 'marketing');
  const mobileCat = categories.find(c => c.slug === 'mobile-development');
  const bizCat = categories.find(c => c.slug === 'business');

  const course1Id = uuidv4();
  const course2Id = uuidv4();
  const course3Id = uuidv4();
  const course4Id = uuidv4();
  const course5Id = uuidv4();
  const course6Id = uuidv4();

  const courses = [
    {
      id: course1Id, title: 'React e Next.js: Guida Completa 2025', slug: 'react-nextjs-guida-completa-2025',
      shortDescription: 'Impara React e Next.js da zero a esperto con progetti reali.',
      description: 'Questo corso completo ti guiderà attraverso tutto ciò che devi sapere su React e Next.js. Partendo dalle basi di React, arriverai a padroneggiare Next.js 14 con App Router, Server Components, e molto altro. Costruirai 5 progetti reali durante il corso.',
      price: 49.99, category: webCat.slug, categoryName: webCat.name, thumbnail: null,
      instructorId: instructor1Id, instructorName: 'Marco Rossi',
      status: 'published', rating: 4.7, ratingCount: 128, totalStudents: 1243,
      tags: ['react', 'nextjs', 'javascript', 'frontend'], language: 'Italiano', level: 'intermediate',
      requirements: ['Conoscenza base di HTML/CSS', 'Fondamenti di JavaScript', 'Un computer con Node.js installato'],
      whatYouLearn: ['Costruire applicazioni React moderne', 'Padroneggiare Next.js 14 e App Router', 'Server Components e Client Components', 'Autenticazione e API Routes', 'Deploy su Vercel'],
      totalLessons: 8, totalDuration: 1800, createdAt: new Date('2025-01-15'), updatedAt: new Date()
    },
    {
      id: course2Id, title: 'Python per Data Science e Machine Learning', slug: 'python-data-science-ml',
      shortDescription: 'Padroneggia Python per analisi dati, visualizzazione e machine learning.',
      description: 'Un percorso completo dalla programmazione Python alla Data Science avanzata. Imparerai NumPy, Pandas, Matplotlib, Scikit-learn e TensorFlow con esercizi pratici e progetti reali.',
      price: 39.99, category: dsCat.slug, categoryName: dsCat.name, thumbnail: null,
      instructorId: instructor2Id, instructorName: 'Laura Bianchi',
      status: 'published', rating: 4.9, ratingCount: 256, totalStudents: 2150,
      tags: ['python', 'data-science', 'machine-learning', 'ai'], language: 'Italiano', level: 'beginner',
      requirements: ['Nessuna esperienza di programmazione richiesta', 'Un computer con accesso a internet'],
      whatYouLearn: ['Programmare in Python da zero', 'Analisi dati con Pandas e NumPy', 'Visualizzazione con Matplotlib e Seaborn', 'Machine Learning con Scikit-learn', 'Introduzione al Deep Learning'],
      totalLessons: 10, totalDuration: 2400, createdAt: new Date('2025-02-01'), updatedAt: new Date()
    },
    {
      id: course3Id, title: 'UI/UX Design Masterclass', slug: 'ui-ux-design-masterclass',
      shortDescription: 'Impara a progettare interfacce belle e funzionali con Figma.',
      description: 'Diventa un designer UI/UX professionista. Questo corso copre principi di design, wireframing, prototipazione, design system e user testing. Utilizzerai Figma per creare progetti reali.',
      price: 59.99, category: designCat.slug, categoryName: designCat.name, thumbnail: null,
      instructorId: instructor2Id, instructorName: 'Laura Bianchi',
      status: 'published', rating: 4.6, ratingCount: 89, totalStudents: 876,
      tags: ['design', 'ui', 'ux', 'figma'], language: 'Italiano', level: 'beginner',
      requirements: ['Nessuna esperienza di design richiesta', 'Account Figma gratuito'],
      whatYouLearn: ['Principi fondamentali di UI Design', 'User Experience e User Research', 'Prototipazione con Figma', 'Design System e Component Library', 'Portfolio professionale'],
      totalLessons: 7, totalDuration: 1500, createdAt: new Date('2025-01-20'), updatedAt: new Date()
    },
    {
      id: course4Id, title: 'Marketing Digitale Avanzato', slug: 'marketing-digitale-avanzato',
      shortDescription: 'Strategie avanzate di marketing digitale per far crescere il tuo business.',
      description: 'Impara le strategie di marketing digitale che utilizzano le aziende di successo. SEO avanzato, Google Ads, Facebook Ads, Content Marketing, Email Marketing e Analytics.',
      price: 34.99, category: marketingCat.slug, categoryName: marketingCat.name, thumbnail: null,
      instructorId: instructor1Id, instructorName: 'Marco Rossi',
      status: 'published', rating: 4.4, ratingCount: 67, totalStudents: 543,
      tags: ['marketing', 'seo', 'ads', 'social-media'], language: 'Italiano', level: 'intermediate',
      requirements: ['Conoscenza base del marketing', 'Account Google e Meta'],
      whatYouLearn: ['SEO on-page e off-page', 'Google Ads e campagne PPC', 'Facebook e Instagram Ads', 'Content Marketing Strategy', 'Email Marketing Automation'],
      totalLessons: 6, totalDuration: 1200, createdAt: new Date('2025-03-01'), updatedAt: new Date()
    },
    {
      id: course5Id, title: 'Machine Learning da Zero a Pro', slug: 'machine-learning-zero-pro',
      shortDescription: 'Diventa esperto di ML con Python, TensorFlow e progetti pratici.',
      description: 'Corso avanzato di Machine Learning. Copre algoritmi supervisionati e non supervisionati, reti neurali, deep learning, NLP e computer vision con progetti industriali reali.',
      price: 69.99, category: dsCat.slug, categoryName: dsCat.name, thumbnail: null,
      instructorId: instructor2Id, instructorName: 'Laura Bianchi',
      status: 'published', rating: 4.8, ratingCount: 156, totalStudents: 1567,
      tags: ['machine-learning', 'deep-learning', 'tensorflow', 'python'], language: 'Italiano', level: 'advanced',
      requirements: ['Conoscenza base di Python', 'Fondamenti di matematica e statistica', 'Esperienza base di Data Science'],
      whatYouLearn: ['Algoritmi ML supervisionati e non', 'Reti Neurali e Deep Learning', 'NLP e Text Processing', 'Computer Vision con CNN', 'Deploy modelli ML in produzione'],
      totalLessons: 12, totalDuration: 3000, createdAt: new Date('2025-02-15'), updatedAt: new Date()
    },
    {
      id: course6Id, title: 'Flutter: App Mobile Cross-Platform', slug: 'flutter-app-mobile-cross-platform',
      shortDescription: 'Costruisci app native per iOS e Android con un singolo codice.',
      description: 'Impara Flutter e Dart per creare applicazioni mobile bellissime e performanti. Dal setup iniziale al deploy sugli store, costruirai 3 app complete.',
      price: 44.99, category: mobileCat.slug, categoryName: mobileCat.name, thumbnail: null,
      instructorId: instructor1Id, instructorName: 'Marco Rossi',
      status: 'published', rating: 4.5, ratingCount: 93, totalStudents: 789,
      tags: ['flutter', 'dart', 'mobile', 'cross-platform'], language: 'Italiano', level: 'beginner',
      requirements: ['Conoscenza base di programmazione', 'Un computer con Flutter SDK'],
      whatYouLearn: ['Dart programming language', 'Widget e Layout in Flutter', 'State Management', 'API Integration e Firebase', 'Deploy su App Store e Play Store'],
      totalLessons: 9, totalDuration: 2100, createdAt: new Date('2025-03-10'), updatedAt: new Date()
    },
  ];
  await db.collection('courses').insertMany(courses);

  // Create modules and lessons for each course
  const allModules = [];
  const allLessons = [];

  for (const course of courses) {
    const moduleCount = Math.min(3, Math.ceil(course.totalLessons / 3));
    for (let m = 0; m < moduleCount; m++) {
      const moduleId = uuidv4();
      allModules.push({
        id: moduleId, courseId: course.id, title: `Modulo ${m + 1}: ${['Fondamenti', 'Intermedio', 'Avanzato'][m] || 'Extra'}`,
        description: `Modulo ${m + 1} del corso ${course.title}`, order: m + 1
      });
      const lessonsInModule = m < moduleCount - 1 ? 3 : course.totalLessons - m * 3;
      for (let l = 0; l < Math.max(1, lessonsInModule); l++) {
        allLessons.push({
          id: uuidv4(), moduleId, courseId: course.id,
          title: `Lezione ${m * 3 + l + 1}: Argomento ${m * 3 + l + 1}`,
          content: `Contenuto della lezione ${m * 3 + l + 1} del corso ${course.title}. Questa lezione copre concetti fondamentali e include esempi pratici.`,
          videoUrl: null, duration: Math.floor(Math.random() * 20 + 10) * 60,
          order: l + 1, type: 'text'
        });
      }
    }
  }
  if (allModules.length > 0) await db.collection('modules').insertMany(allModules);
  if (allLessons.length > 0) await db.collection('lessons').insertMany(allLessons);

  // Create enrollment for demo student
  await db.collection('enrollments').insertOne({
    id: uuidv4(), userId: studentId, courseId: course1Id, progress: 25,
    completedLessons: [allLessons.find(l => l.courseId === course1Id)?.id].filter(Boolean),
    startedAt: new Date('2025-04-01'), completedAt: null, lastAccessedAt: new Date()
  });

  // Update category course counts
  const categoryCounts = {};
  courses.forEach(c => { categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1; });
  for (const [slug, count] of Object.entries(categoryCounts)) {
    await db.collection('categories').updateOne({ slug }, { $set: { courseCount: count } });
  }

  // Create indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ id: 1 }, { unique: true });
  await db.collection('courses').createIndex({ id: 1 }, { unique: true });
  await db.collection('courses').createIndex({ slug: 1 });
  await db.collection('courses').createIndex({ category: 1 });
  await db.collection('courses').createIndex({ title: 'text', description: 'text', tags: 'text' });
  await db.collection('modules').createIndex({ courseId: 1 });
  await db.collection('lessons').createIndex({ courseId: 1 });
  await db.collection('lessons').createIndex({ moduleId: 1 });
  await db.collection('enrollments').createIndex({ userId: 1, courseId: 1 });
  await db.collection('reviews').createIndex({ courseId: 1 });
  await db.collection('categories').createIndex({ slug: 1 });
  await db.collection('forumPosts').createIndex({ courseId: 1 });

  return true;
}

// ==================== AUTH HANDLERS ====================
async function handleRegister(request) {
  const { name, email, password, role } = await request.json();
  if (!name || !email || !password) return err('Nome, email e password sono obbligatori');
  if (password.length < 6) return err('La password deve avere almeno 6 caratteri');
  const validRoles = ['student', 'instructor'];
  const userRole = validRoles.includes(role) ? role : 'student';

  const db = await getDb();
  const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
  if (existing) return err('Email già registrata');

  const user = {
    id: uuidv4(), name, email: email.toLowerCase(), password: hashPassword(password),
    role: userRole, bio: '', avatar: null, xp: 0, level: 1, badges: [],
    referralCode: uuidv4().slice(0, 8), createdAt: new Date()
  };
  await db.collection('users').insertOne(user);

  const { password: _, ...safeUser } = user;
  const token = createToken({ id: user.id, email: user.email, role: user.role });
  return json({ user: safeUser, token }, 201);
}

async function handleLogin(request) {
  const { email, password } = await request.json();
  if (!email || !password) return err('Email e password sono obbligatori');

  const db = await getDb();
  const user = await db.collection('users').findOne({ email: email.toLowerCase() });
  if (!user || !verifyPassword(password, user.password)) return err('Credenziali non valide', 401);

  const { password: _, ...safeUser } = user;
  const token = createToken({ id: user.id, email: user.email, role: user.role });
  return json({ user: safeUser, token });
}

async function handleMe(request) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  return json({ user });
}

async function handleUpdateProfile(request) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  const { name, bio, avatar } = await request.json();
  const db = await getDb();
  const updates = {};
  if (name) updates.name = name;
  if (bio !== undefined) updates.bio = bio;
  if (avatar !== undefined) updates.avatar = avatar;
  await db.collection('users').updateOne({ id: user.id }, { $set: updates });
  const updated = await db.collection('users').findOne({ id: user.id });
  const { password: _, ...safeUser } = updated;
  return json({ user: safeUser });
}

// ==================== COURSE HANDLERS ====================
async function handleListCourses(request) {
  const db = await getDb();
  await seedDatabase();

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';
  const level = url.searchParams.get('level') || '';
  const sort = url.searchParams.get('sort') || 'popular';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '12');
  const instructorId = url.searchParams.get('instructorId') || '';

  const filter = { status: 'published' };
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }
  if (category) filter.category = category;
  if (level) filter.level = level;
  const language = url.searchParams.get('language') || '';
  if (language) filter.language = language;
  if (instructorId) {
    filter.instructorId = instructorId;
    delete filter.status;
  }

  const sortMap = {
    'popular': { totalStudents: -1 },
    'newest': { createdAt: -1 },
    'rating': { rating: -1 },
    'price-low': { price: 1 },
    'price-high': { price: -1 },
  };

  const total = await db.collection('courses').countDocuments(filter);
  const courses = await db.collection('courses')
    .find(filter)
    .sort(sortMap[sort] || { totalStudents: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  return json({ courses, total, page, limit, totalPages: Math.ceil(total / limit) });
}

async function handleGetCourse(request, courseId) {
  const db = await getDb();
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course) return err('Corso non trovato', 404);

  const modules = await db.collection('modules').find({ courseId }).sort({ order: 1 }).toArray();
  const lessons = await db.collection('lessons').find({ courseId }).sort({ order: 1 }).toArray();
  const reviews = await db.collection('reviews').find({ courseId }).sort({ createdAt: -1 }).limit(10).toArray();
  const instructor = await db.collection('users').findOne({ id: course.instructorId });

  const modulesWithLessons = modules.map(m => ({
    ...m,
    lessons: lessons.filter(l => l.moduleId === m.id)
  }));

  // Check enrollment
  const user = await getAuthUser(request);
  let enrollment = null;
  if (user) {
    enrollment = await db.collection('enrollments').findOne({ userId: user.id, courseId });
  }

  return json({
    course,
    modules: modulesWithLessons,
    reviews,
    instructor: instructor ? { id: instructor.id, name: instructor.name, bio: instructor.bio, avatar: instructor.avatar } : null,
    enrollment,
    totalLessons: lessons.length,
    totalDuration: lessons.reduce((sum, l) => sum + (l.duration || 0), 0)
  });
}

async function handleCreateCourse(request) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  if (user.role !== 'instructor' && user.role !== 'admin') return err('Solo gli insegnanti possono creare corsi', 403);

  const data = await request.json();
  const { title, shortDescription, description, price, category, level, language, tags, requirements, whatYouLearn, thumbnail, modules } = data;
  if (!title || !description || !category) return err('Titolo, descrizione e categoria sono obbligatori');

  const db = await getDb();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  const courseId = uuidv4();
  const course = {
    id: courseId, title, slug: `${slug}-${courseId.slice(0, 6)}`,
    shortDescription: shortDescription || '', description,
    price: parseFloat(price) || 0, category, categoryName: '',
    thumbnail: thumbnail || null,
    instructorId: user.id, instructorName: user.name,
    status: 'pending', rating: 0, ratingCount: 0, totalStudents: 0,
    tags: tags || [], language: language || 'Italiano', level: level || 'beginner',
    requirements: requirements || [], whatYouLearn: whatYouLearn || [],
    totalLessons: 0, totalDuration: 0,
    createdAt: new Date(), updatedAt: new Date()
  };

  // Get category name
  const cat = await db.collection('categories').findOne({ slug: category });
  if (cat) course.categoryName = cat.name;

  await db.collection('courses').insertOne(course);

  // Create modules and lessons if provided
  let totalLessons = 0;
  let totalDuration = 0;
  if (modules && Array.isArray(modules)) {
    for (let mi = 0; mi < modules.length; mi++) {
      const mod = modules[mi];
      const moduleId = uuidv4();
      await db.collection('modules').insertOne({
        id: moduleId, courseId, title: mod.title || `Modulo ${mi + 1}`,
        description: mod.description || '', order: mi + 1
      });
      if (mod.lessons && Array.isArray(mod.lessons)) {
        for (let li = 0; li < mod.lessons.length; li++) {
          const lesson = mod.lessons[li];
          const duration = parseInt(lesson.duration) || 0;
          await db.collection('lessons').insertOne({
            id: uuidv4(), moduleId, courseId,
            title: lesson.title || `Lezione ${li + 1}`,
            content: lesson.content || '', videoUrl: lesson.videoUrl || null,
            duration, order: li + 1, type: lesson.type || 'text'
          });
          totalLessons++;
          totalDuration += duration;
        }
      }
    }
  }

  await db.collection('courses').updateOne({ id: courseId }, { $set: { totalLessons, totalDuration } });
  await db.collection('categories').updateOne({ slug: category }, { $inc: { courseCount: 1 } });

  return json({ course: { ...course, totalLessons, totalDuration } }, 201);
}

async function handleUpdateCourse(request, courseId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);

  const db = await getDb();
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course) return err('Corso non trovato', 404);
  if (course.instructorId !== user.id && user.role !== 'admin') return err('Non autorizzato', 403);

  const data = await request.json();
  const allowedFields = ['title', 'shortDescription', 'description', 'price', 'category', 'level', 'language', 'tags', 'requirements', 'whatYouLearn', 'thumbnail', 'status'];
  const updates = { updatedAt: new Date() };
  for (const field of allowedFields) {
    if (data[field] !== undefined) updates[field] = data[field];
  }

  await db.collection('courses').updateOne({ id: courseId }, { $set: updates });
  const updated = await db.collection('courses').findOne({ id: courseId });
  return json({ course: updated });
}

async function handleDeleteCourse(request, courseId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);

  const db = await getDb();
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course) return err('Corso non trovato', 404);
  if (course.instructorId !== user.id && user.role !== 'admin') return err('Non autorizzato', 403);

  await db.collection('courses').deleteOne({ id: courseId });
  await db.collection('modules').deleteMany({ courseId });
  await db.collection('lessons').deleteMany({ courseId });
  await db.collection('enrollments').deleteMany({ courseId });
  await db.collection('reviews').deleteMany({ courseId });

  return json({ message: 'Corso eliminato' });
}

// ==================== MODULE & LESSON HANDLERS ====================
async function handleCreateModule(request) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  const { courseId, title, description } = await request.json();

  const db = await getDb();
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course || (course.instructorId !== user.id && user.role !== 'admin')) return err('Non autorizzato', 403);

  const maxOrder = await db.collection('modules').find({ courseId }).sort({ order: -1 }).limit(1).toArray();
  const order = maxOrder.length > 0 ? maxOrder[0].order + 1 : 1;

  const module = { id: uuidv4(), courseId, title, description: description || '', order };
  await db.collection('modules').insertOne(module);
  return json({ module }, 201);
}

async function handleUpdateModule(request, moduleId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  const data = await request.json();

  const db = await getDb();
  const mod = await db.collection('modules').findOne({ id: moduleId });
  if (!mod) return err('Modulo non trovato', 404);

  const updates = {};
  if (data.title) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.order !== undefined) updates.order = data.order;

  await db.collection('modules').updateOne({ id: moduleId }, { $set: updates });
  return json({ module: { ...mod, ...updates } });
}

async function handleDeleteModule(request, moduleId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);

  const db = await getDb();
  await db.collection('lessons').deleteMany({ moduleId });
  await db.collection('modules').deleteOne({ id: moduleId });
  return json({ message: 'Modulo eliminato' });
}

async function handleCreateLesson(request) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  const { moduleId, courseId, title, content, videoUrl, duration, type } = await request.json();

  const db = await getDb();
  const maxOrder = await db.collection('lessons').find({ moduleId }).sort({ order: -1 }).limit(1).toArray();
  const order = maxOrder.length > 0 ? maxOrder[0].order + 1 : 1;

  const lesson = {
    id: uuidv4(), moduleId, courseId, title, content: content || '',
    videoUrl: videoUrl || null, duration: parseInt(duration) || 0,
    order, type: type || 'text'
  };
  await db.collection('lessons').insertOne(lesson);

  // Update course totals
  const lessons = await db.collection('lessons').find({ courseId }).toArray();
  await db.collection('courses').updateOne({ id: courseId }, {
    $set: { totalLessons: lessons.length, totalDuration: lessons.reduce((s, l) => s + (l.duration || 0), 0) }
  });

  return json({ lesson }, 201);
}

async function handleUpdateLesson(request, lessonId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  const data = await request.json();

  const db = await getDb();
  const updates = {};
  ['title', 'content', 'videoUrl', 'duration', 'order', 'type'].forEach(f => {
    if (data[f] !== undefined) updates[f] = data[f];
  });

  await db.collection('lessons').updateOne({ id: lessonId }, { $set: updates });
  const updated = await db.collection('lessons').findOne({ id: lessonId });
  return json({ lesson: updated });
}

async function handleDeleteLesson(request, lessonId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);

  const db = await getDb();
  const lesson = await db.collection('lessons').findOne({ id: lessonId });
  if (lesson) {
    await db.collection('lessons').deleteOne({ id: lessonId });
    const lessons = await db.collection('lessons').find({ courseId: lesson.courseId }).toArray();
    await db.collection('courses').updateOne({ id: lesson.courseId }, {
      $set: { totalLessons: lessons.length, totalDuration: lessons.reduce((s, l) => s + (l.duration || 0), 0) }
    });
  }
  return json({ message: 'Lezione eliminata' });
}

// ==================== ENROLLMENT & PROGRESS ====================
async function handleEnroll(request, courseId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);

  const db = await getDb();
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course) return err('Corso non trovato', 404);

  const existing = await db.collection('enrollments').findOne({ userId: user.id, courseId });
  if (existing) return err('Sei già iscritto a questo corso');

  const enrollment = {
    id: uuidv4(), userId: user.id, courseId, progress: 0,
    completedLessons: [], startedAt: new Date(), completedAt: null, lastAccessedAt: new Date()
  };
  await db.collection('enrollments').insertOne(enrollment);
  await db.collection('courses').updateOne({ id: courseId }, { $inc: { totalStudents: 1 } });

  // Award XP
  await db.collection('users').updateOne({ id: user.id }, { $inc: { xp: 10 } });

  return json({ enrollment }, 201);
}

async function handleProgress(request, courseId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  const { lessonId } = await request.json();

  const db = await getDb();
  const enrollment = await db.collection('enrollments').findOne({ userId: user.id, courseId });
  if (!enrollment) return err('Non iscritto a questo corso');

  const completedLessons = enrollment.completedLessons || [];
  if (!completedLessons.includes(lessonId)) {
    completedLessons.push(lessonId);
    // Award XP for lesson completion
    await db.collection('users').updateOne({ id: user.id }, { $inc: { xp: 10 } });
  }

  const totalLessons = await db.collection('lessons').countDocuments({ courseId });
  const progress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;
  const completedAt = progress >= 100 ? new Date() : null;

  await db.collection('enrollments').updateOne({ userId: user.id, courseId }, {
    $set: { completedLessons, progress, lastAccessedAt: new Date(), completedAt }
  });

  // Award XP and badge for course completion
  if (progress >= 100 && !enrollment.completedAt) {
    await db.collection('users').updateOne({ id: user.id }, { $inc: { xp: 100 } });
    const userDoc = await db.collection('users').findOne({ id: user.id });
    const completedCourses = await db.collection('enrollments').countDocuments({ userId: user.id, progress: 100 });
    const badges = userDoc.badges || [];
    if (completedCourses === 1 && !badges.includes('first_course')) {
      badges.push('first_course');
    }
    if (completedCourses >= 5 && !badges.includes('fast_learner')) {
      badges.push('fast_learner');
    }
    if (completedCourses >= 10 && !badges.includes('master')) {
      badges.push('master');
    }
    // Update level based on XP
    const xp = (userDoc.xp || 0) + 100;
    let level = 1;
    if (xp > 1500) level = 6;
    else if (xp > 1000) level = 5;
    else if (xp > 600) level = 4;
    else if (xp > 300) level = 3;
    else if (xp > 100) level = 2;
    await db.collection('users').updateOne({ id: user.id }, { $set: { badges, level } });
  }

  return json({ enrollment: { ...enrollment, completedLessons, progress, completedAt } });
}

// ==================== REVIEW HANDLERS ====================
async function handleGetReviews(request, courseId) {
  const db = await getDb();
  const reviews = await db.collection('reviews').find({ courseId }).sort({ createdAt: -1 }).toArray();
  return json({ reviews });
}

async function handleCreateReview(request, courseId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  const { rating, comment } = await request.json();
  if (!rating || rating < 1 || rating > 5) return err('Valutazione tra 1 e 5');

  const db = await getDb();
  const existing = await db.collection('reviews').findOne({ userId: user.id, courseId });
  if (existing) return err('Hai già recensito questo corso');

  const review = {
    id: uuidv4(), userId: user.id, userName: user.name, userAvatar: user.avatar,
    courseId, rating: parseInt(rating), comment: comment || '', createdAt: new Date()
  };
  await db.collection('reviews').insertOne(review);

  // Update course rating
  const allReviews = await db.collection('reviews').find({ courseId }).toArray();
  const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
  await db.collection('courses').updateOne({ id: courseId }, {
    $set: { rating: Math.round(avgRating * 10) / 10, ratingCount: allReviews.length }
  });

  // Award XP
  await db.collection('users').updateOne({ id: user.id }, { $inc: { xp: 20 } });

  return json({ review }, 201);
}

// ==================== CATEGORY HANDLERS ====================
async function handleGetCategories(request) {
  const db = await getDb();
  await seedDatabase();
  const categories = await db.collection('categories').find().toArray();
  return json({ categories });
}

async function handleCreateCategory(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const { name, icon, description } = await request.json();

  const db = await getDb();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const category = { id: uuidv4(), name, slug, icon: icon || '📚', description: description || '', courseCount: 0 };
  await db.collection('categories').insertOne(category);
  return json({ category }, 201);
}

// ==================== DASHBOARD HANDLERS ====================
async function handleStudentDashboard(request) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);

  const db = await getDb();
  const enrollments = await db.collection('enrollments').find({ userId: user.id }).toArray();
  const courseIds = enrollments.map(e => e.courseId);
  const courses = courseIds.length > 0 ? await db.collection('courses').find({ id: { $in: courseIds } }).toArray() : [];
  const certificates = await db.collection('certificates').find({ userId: user.id }).toArray();

  const enrolledCourses = enrollments.map(e => {
    const course = courses.find(c => c.id === e.courseId);
    return { ...e, course };
  }).filter(e => e.course);

  const totalHours = enrolledCourses.reduce((s, e) => s + (e.course?.totalDuration || 0), 0) / 3600;
  const completedCount = enrollments.filter(e => e.progress >= 100).length;

  return json({
    enrolledCourses,
    stats: {
      totalCourses: enrollments.length,
      completedCourses: completedCount,
      totalHours: Math.round(totalHours * 10) / 10,
      certificates: certificates.length,
      xp: user.xp || 0,
      level: user.level || 1,
      badges: user.badges || []
    },
    certificates
  });
}

async function handleInstructorDashboard(request) {
  const user = await getAuthUser(request);
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) return err('Non autorizzato', 403);

  const db = await getDb();
  const courses = await db.collection('courses').find({ instructorId: user.id }).toArray();
  const courseIds = courses.map(c => c.id);

  const totalStudents = courses.reduce((s, c) => s + (c.totalStudents || 0), 0);
  const totalRevenue = courses.reduce((s, c) => s + (c.price * c.totalStudents * 0.7), 0);
  const avgRating = courses.length > 0 ? courses.reduce((s, c) => s + (c.rating || 0), 0) / courses.length : 0;

  const recentEnrollments = courseIds.length > 0
    ? await db.collection('enrollments').find({ courseId: { $in: courseIds } }).sort({ startedAt: -1 }).limit(10).toArray()
    : [];

  // Monthly revenue data
  const monthlyRevenue = [];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'];
  for (let i = 0; i < 6; i++) {
    monthlyRevenue.push({
      month: months[i],
      revenue: Math.round(totalRevenue / 6 * (0.7 + Math.random() * 0.6)),
      students: Math.round(totalStudents / 6 * (0.7 + Math.random() * 0.6))
    });
  }

  return json({
    courses,
    stats: { totalStudents, totalRevenue: Math.round(totalRevenue * 100) / 100, totalCourses: courses.length, avgRating: Math.round(avgRating * 10) / 10 },
    recentEnrollments,
    monthlyRevenue
  });
}

async function handleAdminDashboard(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);

  const db = await getDb();
  const totalUsers = await db.collection('users').countDocuments();
  const totalCourses = await db.collection('courses').countDocuments();
  const totalEnrollments = await db.collection('enrollments').countDocuments();
  const pendingCourses = await db.collection('courses').find({ status: 'pending' }).toArray();
  const publishedCourses = await db.collection('courses').countDocuments({ status: 'published' });

  const students = await db.collection('users').countDocuments({ role: 'student' });
  const instructors = await db.collection('users').countDocuments({ role: 'instructor' });

  const allCourses = await db.collection('courses').find().toArray();
  const totalRevenue = allCourses.reduce((s, c) => s + (c.price * c.totalStudents * 0.3), 0);

  return json({
    stats: { totalUsers, totalCourses, publishedCourses, totalEnrollments, students, instructors, totalRevenue: Math.round(totalRevenue * 100) / 100, pendingCount: pendingCourses.length },
    pendingCourses
  });
}

// ==================== ADMIN HANDLERS ====================
async function handleAdminUsers(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);

  const db = await getDb();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const search = url.searchParams.get('search') || '';

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await db.collection('users').countDocuments(filter);
  const users = await db.collection('users').find(filter, { projection: { password: 0 } })
    .skip((page - 1) * limit).limit(limit).toArray();

  return json({ users, total, page, limit });
}

async function handleAdminUpdateUser(request, userId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);

  const db = await getDb();
  const data = await request.json();
  const updates = {};
  if (data.role && ['student', 'instructor', 'admin'].includes(data.role)) updates.role = data.role;
  if (data.banned !== undefined) updates.banned = data.banned;

  await db.collection('users').updateOne({ id: userId }, { $set: updates });
  const updated = await db.collection('users').findOne({ id: userId }, { projection: { password: 0 } });
  return json({ user: updated });
}

async function handleAdminApproveCourse(request, courseId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);

  const { status } = await request.json();
  if (!['published', 'rejected'].includes(status)) return err('Stato non valido');

  const db = await getDb();
  await db.collection('courses').updateOne({ id: courseId }, { $set: { status, updatedAt: new Date() } });
  const course = await db.collection('courses').findOne({ id: courseId });
  return json({ course });
}

// ==================== ENHANCED ADMIN HANDLERS ====================
async function handleAdminAnalytics(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();

  const totalUsers = await db.collection('users').countDocuments();
  const totalEnrollments = await db.collection('enrollments').countDocuments();
  const allCourses = await db.collection('courses').find().toArray();
  const totalRevenue = allCourses.reduce((s, c) => s + (c.price * (c.totalStudents || 0)), 0);

  // Daily registrations (last 30 days)
  const dailyRegistrations = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dailyRegistrations.push({ date: d.toISOString().split('T')[0], count: Math.floor(Math.random() * Math.max(1, totalUsers / 15) + 1) });
  }

  // Daily enrollments (last 30 days)
  const dailyEnrollments = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dailyEnrollments.push({ date: d.toISOString().split('T')[0], count: Math.floor(Math.random() * Math.max(1, totalEnrollments / 10) + 1) });
  }

  // Monthly revenue
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const cm = new Date().getMonth();
  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    monthlyRevenue.push({
      month: months[(cm - i + 12) % 12],
      revenue: Math.round(totalRevenue / 6 * (0.5 + Math.random() * 1.0)),
      enrollments: Math.round(totalEnrollments / 6 * (0.5 + Math.random() * 1.0))
    });
  }

  // Top courses
  const topCourses = await db.collection('courses').find({ status: 'published' }).sort({ totalStudents: -1 }).limit(5).toArray();

  // Distributions
  const students = await db.collection('users').countDocuments({ role: 'student' });
  const instructors = await db.collection('users').countDocuments({ role: 'instructor' });
  const admins = await db.collection('users').countDocuments({ role: 'admin' });
  const published = await db.collection('courses').countDocuments({ status: 'published' });
  const pending = await db.collection('courses').countDocuments({ status: 'pending' });
  const rejected = await db.collection('courses').countDocuments({ status: 'rejected' });
  const categories = await db.collection('categories').find().toArray();

  return json({
    dailyRegistrations, dailyEnrollments, monthlyRevenue,
    topCourses: topCourses.map(c => ({ id: c.id, title: c.title, students: c.totalStudents, revenue: Math.round(c.price * c.totalStudents * 100) / 100, rating: c.rating })),
    userDistribution: [{ name: 'Studenti', value: students }, { name: 'Insegnanti', value: instructors }, { name: 'Admin', value: admins }],
    courseDistribution: [{ name: 'Pubblicati', value: published }, { name: 'In attesa', value: pending }, { name: 'Rifiutati', value: rejected }],
    categoryDistribution: categories.map(c => ({ name: c.name, count: c.courseCount || 0 })).filter(c => c.count > 0),
    totals: { totalRevenue: Math.round(totalRevenue * 100) / 100, totalUsers, totalEnrollments, platformFee: Math.round(totalRevenue * 0.3 * 100) / 100 }
  });
}

async function handleAdminCoursesList(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const category = url.searchParams.get('category') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  const filter = {};
  if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { instructorName: { $regex: search, $options: 'i' } }];
  if (status) filter.status = status;
  if (category) filter.category = category;

  const total = await db.collection('courses').countDocuments(filter);
  const courses = await db.collection('courses').find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray();
  return json({ courses, total, page, limit });
}

async function handleAdminEditCourse(request, courseId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();
  const data = await request.json();
  const allowed = ['title', 'shortDescription', 'description', 'price', 'category', 'level', 'language', 'tags', 'status', 'thumbnail'];
  const updates = { updatedAt: new Date() };
  for (const f of allowed) { if (data[f] !== undefined) updates[f] = data[f]; }
  if (data.category) {
    const cat = await db.collection('categories').findOne({ slug: data.category });
    if (cat) updates.categoryName = cat.name;
  }
  await db.collection('courses').updateOne({ id: courseId }, { $set: updates });
  const updated = await db.collection('courses').findOne({ id: courseId });
  return json({ course: updated });
}

async function handleAdminDeleteCourse(request, courseId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course) return err('Corso non trovato', 404);
  await db.collection('courses').deleteOne({ id: courseId });
  await db.collection('modules').deleteMany({ courseId });
  await db.collection('lessons').deleteMany({ courseId });
  await db.collection('enrollments').deleteMany({ courseId });
  await db.collection('reviews').deleteMany({ courseId });
  if (course.category) await db.collection('categories').updateOne({ slug: course.category }, { $inc: { courseCount: -1 } });
  return json({ message: 'Corso eliminato' });
}

async function handleAdminReviews(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const courseId = url.searchParams.get('courseId') || '';
  const filter = {};
  if (courseId) filter.courseId = courseId;

  const total = await db.collection('reviews').countDocuments(filter);
  const reviews = await db.collection('reviews').find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray();
  const courseIds = [...new Set(reviews.map(r => r.courseId))];
  const courses = courseIds.length > 0 ? await db.collection('courses').find({ id: { $in: courseIds } }).toArray() : [];
  const enriched = reviews.map(r => ({ ...r, courseName: courses.find(c => c.id === r.courseId)?.title || 'N/A' }));
  return json({ reviews: enriched, total, page, limit });
}

async function handleAdminDeleteReview(request, reviewId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();
  const review = await db.collection('reviews').findOne({ id: reviewId });
  if (!review) return err('Recensione non trovata', 404);
  await db.collection('reviews').deleteOne({ id: reviewId });
  // Recalculate course rating
  const remaining = await db.collection('reviews').find({ courseId: review.courseId }).toArray();
  const avgRating = remaining.length > 0 ? remaining.reduce((s, r) => s + r.rating, 0) / remaining.length : 0;
  await db.collection('courses').updateOne({ id: review.courseId }, { $set: { rating: Math.round(avgRating * 10) / 10, ratingCount: remaining.length } });
  return json({ message: 'Recensione eliminata' });
}

async function handleAdminUpdateCategory(request, catId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();
  const data = await request.json();
  const updates = {};
  if (data.name) { updates.name = data.name; updates.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
  if (data.icon) updates.icon = data.icon;
  if (data.description !== undefined) updates.description = data.description;
  await db.collection('categories').updateOne({ id: catId }, { $set: updates });
  const updated = await db.collection('categories').findOne({ id: catId });
  return json({ category: updated });
}

async function handleAdminDeleteCategory(request, catId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();
  const cat = await db.collection('categories').findOne({ id: catId });
  if (!cat) return err('Categoria non trovata', 404);
  if (cat.courseCount > 0) return err('Impossibile eliminare: ci sono corsi in questa categoria');
  await db.collection('categories').deleteOne({ id: catId });
  return json({ message: 'Categoria eliminata' });
}

async function handleAdminPayments(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  // Generate payment records from enrollments (prepared for Stripe)
  const enrollments = await db.collection('enrollments').find().sort({ startedAt: -1 }).skip((page - 1) * limit).limit(limit).toArray();
  const total = await db.collection('enrollments').countDocuments();
  const userIds = [...new Set(enrollments.map(e => e.userId))];
  const courseIds = [...new Set(enrollments.map(e => e.courseId))];
  const users = userIds.length > 0 ? await db.collection('users').find({ id: { $in: userIds } }, { projection: { password: 0 } }).toArray() : [];
  const courses = courseIds.length > 0 ? await db.collection('courses').find({ id: { $in: courseIds } }).toArray() : [];

  const payments = enrollments.map(e => {
    const course = courses.find(c => c.id === e.courseId);
    const u = users.find(u => u.id === e.userId);
    return {
      id: e.id, userId: e.userId, userName: u?.name || 'N/A', userEmail: u?.email || '',
      courseId: e.courseId, courseName: course?.title || 'N/A',
      amount: course?.price || 0, platformFee: Math.round((course?.price || 0) * 0.3 * 100) / 100,
      instructorPayout: Math.round((course?.price || 0) * 0.7 * 100) / 100,
      status: 'completed', method: 'Stripe (demo)', date: e.startedAt
    };
  });

  return json({ payments, total, page, limit });
}

async function handleAdminReports(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'summary';

  if (type === 'users') {
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    return json({ report: users, type: 'users', count: users.length });
  }
  if (type === 'courses') {
    const courses = await db.collection('courses').find().toArray();
    return json({ report: courses, type: 'courses', count: courses.length });
  }
  if (type === 'enrollments') {
    const enrollments = await db.collection('enrollments').find().toArray();
    return json({ report: enrollments, type: 'enrollments', count: enrollments.length });
  }

  // Summary report
  const totalUsers = await db.collection('users').countDocuments();
  const totalCourses = await db.collection('courses').countDocuments();
  const totalEnrollments = await db.collection('enrollments').countDocuments();
  const allCourses = await db.collection('courses').find().toArray();
  const totalRevenue = allCourses.reduce((s, c) => s + (c.price * (c.totalStudents || 0)), 0);
  return json({ report: { totalUsers, totalCourses, totalEnrollments, totalRevenue: Math.round(totalRevenue * 100) / 100, platformFee: Math.round(totalRevenue * 0.3 * 100) / 100 }, type: 'summary' });
}

async function handleAdminSuspendUser(request, userId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();
  const target = await db.collection('users').findOne({ id: userId });
  if (!target) return err('Utente non trovato', 404);
  if (target.role === 'admin') return err('Non puoi sospendere un admin');
  const suspended = !target.suspended;
  await db.collection('users').updateOne({ id: userId }, { $set: { suspended } });
  const updated = await db.collection('users').findOne({ id: userId }, { projection: { password: 0 } });
  return json({ user: updated });
}

async function handleAdminGetUser(request, userId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Non autorizzato', 403);
  const db = await getDb();
  const target = await db.collection('users').findOne({ id: userId }, { projection: { password: 0 } });
  if (!target) return err('Utente non trovato', 404);
  const enrollments = await db.collection('enrollments').find({ userId }).toArray();
  const courses = target.role === 'instructor' ? await db.collection('courses').find({ instructorId: userId }).toArray() : [];
  const reviews = await db.collection('reviews').find({ userId }).toArray();
  return json({ user: target, enrollments, courses, reviews });
}

// ==================== COMMUNITY HANDLERS ====================
async function handleGetPosts(request) {
  const db = await getDb();
  const url = new URL(request.url);
  const courseId = url.searchParams.get('courseId') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  const filter = {};
  if (courseId) filter.courseId = courseId;

  const total = await db.collection('forumPosts').countDocuments(filter);
  const posts = await db.collection('forumPosts').find(filter).sort({ createdAt: -1 })
    .skip((page - 1) * limit).limit(limit).toArray();

  return json({ posts, total, page, limit });
}

async function handleCreatePost(request) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  const { courseId, title, content } = await request.json();
  if (!title || !content) return err('Titolo e contenuto sono obbligatori');

  const db = await getDb();
  const post = {
    id: uuidv4(), courseId: courseId || null, userId: user.id, userName: user.name,
    userAvatar: user.avatar, title, content, upvotes: 0, upvotedBy: [],
    commentCount: 0, createdAt: new Date()
  };
  await db.collection('forumPosts').insertOne(post);
  await db.collection('users').updateOne({ id: user.id }, { $inc: { xp: 15 } });
  return json({ post }, 201);
}

async function handleGetPost(request, postId) {
  const db = await getDb();
  const post = await db.collection('forumPosts').findOne({ id: postId });
  if (!post) return err('Post non trovato', 404);
  const comments = await db.collection('comments').find({ postId }).sort({ createdAt: 1 }).toArray();
  return json({ post, comments });
}

async function handleAddComment(request, postId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  const { content } = await request.json();
  if (!content) return err('Contenuto obbligatorio');

  const db = await getDb();
  const comment = {
    id: uuidv4(), postId, userId: user.id, userName: user.name,
    userAvatar: user.avatar, content, createdAt: new Date()
  };
  await db.collection('comments').insertOne(comment);
  await db.collection('forumPosts').updateOne({ id: postId }, { $inc: { commentCount: 1 } });
  return json({ comment }, 201);
}

async function handleUpvotePost(request, postId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);

  const db = await getDb();
  const post = await db.collection('forumPosts').findOne({ id: postId });
  if (!post) return err('Post non trovato', 404);

  const upvotedBy = post.upvotedBy || [];
  if (upvotedBy.includes(user.id)) {
    await db.collection('forumPosts').updateOne({ id: postId }, {
      $pull: { upvotedBy: user.id }, $inc: { upvotes: -1 }
    });
  } else {
    await db.collection('forumPosts').updateOne({ id: postId }, {
      $push: { upvotedBy: user.id }, $inc: { upvotes: 1 }
    });
  }

  const updated = await db.collection('forumPosts').findOne({ id: postId });
  return json({ post: updated });
}

// ==================== GAMIFICATION ====================
async function handleGamificationProfile(request) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);

  const db = await getDb();
  const enrollments = await db.collection('enrollments').find({ userId: user.id }).toArray();
  const reviews = await db.collection('reviews').countDocuments({ userId: user.id });
  const posts = await db.collection('forumPosts').countDocuments({ userId: user.id });

  const xp = user.xp || 0;
  let level = 1;
  let levelName = 'Principiante';
  let nextLevelXp = 100;
  if (xp > 1500) { level = 6; levelName = 'Maestro'; nextLevelXp = 2000; }
  else if (xp > 1000) { level = 5; levelName = 'Esperto'; nextLevelXp = 1500; }
  else if (xp > 600) { level = 4; levelName = 'Studioso'; nextLevelXp = 1000; }
  else if (xp > 300) { level = 3; levelName = 'Apprendista'; nextLevelXp = 600; }
  else if (xp > 100) { level = 2; levelName = 'Esploratore'; nextLevelXp = 300; }

  const badgeDefinitions = {
    first_course: { name: 'Primo Corso', icon: '🎓', description: 'Hai completato il tuo primo corso!' },
    fast_learner: { name: 'Apprendista Veloce', icon: '⚡', description: 'Hai completato 5 corsi!' },
    master: { name: 'Maestro', icon: '👑', description: 'Hai completato 10 corsi!' },
    reviewer: { name: 'Critico', icon: '⭐', description: 'Hai lasciato 5 recensioni!' },
    community_star: { name: 'Star Community', icon: '🌟', description: '10 post nel forum!' },
    top_instructor: { name: 'Top Insegnante', icon: '🏆', description: 'Insegnante con rating alto!' },
  };

  const userBadges = (user.badges || []).map(b => badgeDefinitions[b] || { name: b, icon: '🏅', description: '' });

  return json({
    xp, level, levelName, nextLevelXp,
    badges: userBadges,
    stats: {
      coursesEnrolled: enrollments.length,
      coursesCompleted: enrollments.filter(e => e.progress >= 100).length,
      reviewsWritten: reviews,
      forumPosts: posts
    }
  });
}

async function handleLeaderboard(request) {
  const db = await getDb();
  const users = await db.collection('users')
    .find({}, { projection: { password: 0 } })
    .sort({ xp: -1 })
    .limit(20)
    .toArray();
  return json({ leaderboard: users.map((u, i) => ({ rank: i + 1, name: u.name, xp: u.xp || 0, level: u.level || 1, badges: u.badges || [] })) });
}

// ==================== AI HANDLERS (Predisposed for OpenAI) ====================
async function handleAI(request, action) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  const body = await request.json();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sk-your-openai-key') {
    // Return mock responses when no API key
    const mockResponses = {
      'course-structure': {
        result: {
          title: body.topic || 'Nuovo Corso',
          modules: [
            { title: 'Introduzione', lessons: ['Benvenuto al corso', 'Panoramica degli argomenti', 'Setup ambiente'] },
            { title: 'Fondamenti', lessons: ['Concetti base', 'Primi esercizi', 'Quiz fondamenti'] },
            { title: 'Pratica Avanzata', lessons: ['Progetto guidato', 'Esercizi avanzati', 'Progetto finale'] },
          ]
        },
        note: 'Risposta demo - configura OPENAI_API_KEY per risposte AI reali'
      },
      'description': {
        result: `Scopri tutto su "${body.title || 'questo argomento'}" in questo corso completo. Imparerai concetti fondamentali e avanzati attraverso lezioni teoriche e progetti pratici. Perfetto per chi vuole acquisire competenze concrete e applicabili subito nel mondo del lavoro.`,
        note: 'Risposta demo - configura OPENAI_API_KEY per risposte AI reali'
      },
      'summary': {
        result: 'Questa lezione copre i concetti fondamentali dell\'argomento, con focus su applicazioni pratiche e best practices del settore. I punti chiave includono: comprensione dei principi base, applicazione pratica, e preparazione per argomenti più avanzati.',
        note: 'Risposta demo - configura OPENAI_API_KEY per risposte AI reali'
      },
      'quiz': {
        result: [
          { question: 'Qual è il concetto principale trattato in questa lezione?', options: ['Opzione A', 'Opzione B', 'Opzione C', 'Opzione D'], correct: 0 },
          { question: 'Quale di questi è un vantaggio dell\'approccio descritto?', options: ['Velocità', 'Semplicità', 'Scalabilità', 'Tutte le precedenti'], correct: 3 },
          { question: 'Come si applica questo concetto nella pratica?', options: ['Metodo 1', 'Metodo 2', 'Metodo 3', 'Dipende dal contesto'], correct: 3 },
        ],
        note: 'Risposta demo - configura OPENAI_API_KEY per risposte AI reali'
      },
      'chat': {
        result: `Ciao! Sono il tuo assistente di studio AI. Per il momento funziono in modalità demo. Configura la chiave OPENAI_API_KEY per avere risposte personalizzate basate sui tuoi corsi. In ogni caso, posso dirti che la pratica costante è la chiave per imparare qualsiasi argomento!`,
        note: 'Risposta demo - configura OPENAI_API_KEY per risposte AI reali'
      },
      'recommendations': {
        result: [],
        note: 'Risposta demo - configura OPENAI_API_KEY per raccomandazioni personalizzate'
      }
    };
    return json(mockResponses[action] || { error: 'Azione AI non supportata' });
  }

  // Real OpenAI integration
  try {
    const prompts = {
      'course-structure': `Sei un esperto di formazione online. Genera una struttura per un corso su "${body.topic}". ${body.description ? `Descrizione: ${body.description}` : ''} Rispondi in JSON con formato: {"title": "...", "modules": [{"title": "...", "lessons": ["...", "..."]}]}`,
      'description': `Scrivi una descrizione accattivante per un corso online intitolato "${body.title}". ${body.modules ? `Moduli: ${JSON.stringify(body.modules)}` : ''} La descrizione deve essere professionale, coinvolgente e tra 100-200 parole in italiano.`,
      'summary': `Riassumi il seguente contenuto di una lezione in modo chiaro e conciso in italiano (max 150 parole): ${body.content}`,
      'quiz': `Genera 5 domande quiz a risposta multipla basate su questo contenuto. Rispondi in JSON array con formato: [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0}]. Contenuto: ${body.content || body.lessonContent}`,
      'chat': `Sei un assistente di studio AI amichevole e competente. ${body.courseContext ? `Contesto del corso: ${body.courseContext}` : ''} Rispondi in italiano. Domanda dello studente: ${body.message}`,
      'recommendations': `Basandoti su questi interessi: ${JSON.stringify(body.interests || [])}, suggerisci 5 argomenti di corsi online. Rispondi in JSON array: ["argomento1", "argomento2", ...]`
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompts[action] }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();
    if (data.error) return err(data.error.message, 500);

    let result = data.choices?.[0]?.message?.content || '';
    // Try to parse JSON responses
    if (['course-structure', 'quiz', 'recommendations'].includes(action)) {
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      } catch {}
    }

    return json({ result });
  } catch (error) {
    return err('Errore AI: ' + error.message, 500);
  }
}

// ==================== UPLOAD HANDLER ====================
async function handleUpload(request) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return err('Nessun file fornito');

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = path.extname(file.name) || '.bin';
    const filename = `${uuidv4()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return json({ url: `/uploads/${filename}`, filename, size: buffer.length });
  } catch (error) {
    return err('Errore upload: ' + error.message, 500);
  }
}

// ==================== CERTIFICATE HANDLERS ====================
async function handleGenerateCertificate(request) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  const { courseId } = await request.json();

  const db = await getDb();
  const enrollment = await db.collection('enrollments').findOne({ userId: user.id, courseId, progress: 100 });
  if (!enrollment) return err('Devi completare il corso per ottenere il certificato');

  const existing = await db.collection('certificates').findOne({ userId: user.id, courseId });
  if (existing) return json({ certificate: existing });

  const course = await db.collection('courses').findOne({ id: courseId });
  const certificateCode = `LH-${uuidv4().slice(0, 8).toUpperCase()}`;

  const certificate = {
    id: uuidv4(), userId: user.id, courseId,
    userName: user.name, courseName: course?.title || 'Corso',
    instructorName: course?.instructorName || '',
    certificateCode, issuedAt: new Date()
  };
  await db.collection('certificates').insertOne(certificate);
  return json({ certificate }, 201);
}

async function handleVerifyCertificate(request, code) {
  const db = await getDb();
  const certificate = await db.collection('certificates').findOne({ certificateCode: code });
  if (!certificate) return err('Certificato non trovato', 404);
  return json({ certificate, valid: true });
}

// ==================== INIT/SEED ====================
async function handleInit() {
  await seedDatabase();
  return json({ message: 'Database inizializzato', seeded: true });
}

// ==================== EXTENDED INSTRUCTOR HANDLERS ====================

// Helper: Calcola durata automatica corso
async function recalculateCourseDuration(courseId) {
  const db = await getDb();
  const lessons = await db.collection('lessons').find({ courseId }).toArray();
  const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
  const totalLessons = lessons.length;
  
  await db.collection('courses').updateOne(
    { id: courseId },
    { $set: { totalDuration, totalLessons } }
  );
  
  return { totalDuration, totalLessons };
}

// GET /api/instructor/dashboard - Dashboard insegnante
async function handleInstructorDashboardNew(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  const db = await getDb();
  
  // Corsi dell'insegnante
  const courses = await db.collection('courses').find({ instructorId: user.id }).toArray();
  const courseIds = courses.map(c => c.id);
  
  // Statistiche
  const totalStudents = await db.collection('enrollments').countDocuments({ courseId: { $in: courseIds } });
  const totalRevenue = courses.reduce((sum, c) => sum + ((c.price || 0) * (c.enrolledCount || 0)), 0);
  const avgRating = courses.length > 0 
    ? courses.reduce((sum, c) => sum + (c.rating || 0), 0) / courses.length 
    : 0;
  
  // Corsi per stato
  const byStatus = {
    draft: courses.filter(c => c.status === 'draft').length,
    pending: courses.filter(c => c.status === 'pending_review').length,
    published: courses.filter(c => c.status === 'published').length,
    rejected: courses.filter(c => c.status === 'rejected').length
  };
  
  return json({
    courses,
    stats: {
      totalCourses: courses.length,
      totalStudents,
      totalRevenue,
      avgRating: avgRating.toFixed(1),
      byStatus
    }
  });
}

// POST /api/instructor/courses - Crea nuovo corso
async function handleInstructorCreateCourse(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  const body = await request.json();
  const db = await getDb();
  
  // Sync coverImage and thumbnail
  const coverImage = body.coverImage || body.thumbnail || null;
  
  const course = {
    id: uuidv4(),
    title: body.title || 'Nuovo Corso',
    subtitle: body.subtitle || '',
    description: body.description || '',
    shortDescription: body.shortDescription || '',
    instructorId: user.id,
    instructorName: user.name,
    category: body.category || 'web-development',
    level: body.level || 'beginner',
    language: body.language || 'it',
    price: parseFloat(body.price) || 0,
    coverImage: coverImage,
    thumbnail: coverImage, // Keep both fields in sync
    coverType: body.coverType || 'default', // 'upload' | 'generated' | 'default'
    status: 'draft', // draft | pending_review | published | rejected
    objectives: body.objectives || [],
    requirements: body.requirements || [],
    targetStudents: body.targetStudents || '',
    totalDuration: 0,
    totalLessons: 0,
    enrolledCount: 0,
    totalStudents: 0,
    rating: 0,
    ratingCount: 0,
    reviewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await db.collection('courses').insertOne(course);
  return json({ course }, 201);
}

// PUT /api/instructor/courses/:id - Modifica corso
async function handleInstructorUpdateCourse(request, courseId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  const body = await request.json();
  const db = await getDb();
  
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course) return err('Corso non trovato', 404);
  if (course.instructorId !== user.id) return err('Non autorizzato', 403);
  
  const updates = {};
  const allowedFields = [
    'title', 'subtitle', 'description', 'shortDescription', 'category',
    'level', 'language', 'price', 'coverImage', 'coverType',
    'objectives', 'requirements', 'targetStudents', 'thumbnail'
  ];
  
  allowedFields.forEach(field => {
    if (body[field] !== undefined) updates[field] = body[field];
  });
  
  // Sync coverImage and thumbnail
  if (updates.coverImage) {
    updates.thumbnail = updates.coverImage;
  } else if (updates.thumbnail) {
    updates.coverImage = updates.thumbnail;
  }
  
  updates.updatedAt = new Date();
  
  await db.collection('courses').updateOne({ id: courseId }, { $set: updates });
  const updated = await db.collection('courses').findOne({ id: courseId });
  
  return json({ course: updated });
}

// DELETE /api/instructor/courses/:id - Elimina corso
async function handleInstructorDeleteCourse(request, courseId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  const db = await getDb();
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course) return err('Corso non trovato', 404);
  if (course.instructorId !== user.id) return err('Non autorizzato', 403);
  
  // Elimina anche moduli e lezioni
  await db.collection('modules').deleteMany({ courseId });
  await db.collection('lessons').deleteMany({ courseId });
  await db.collection('courses').deleteOne({ id: courseId });
  
  return json({ message: 'Corso eliminato con successo' });
}

// POST /api/instructor/courses/:id/duplicate - Duplica corso
async function handleInstructorDuplicateCourse(request, courseId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  const db = await getDb();
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course) return err('Corso non trovato', 404);
  if (course.instructorId !== user.id) return err('Non autorizzato', 403);
  
  const newCourseId = uuidv4();
  const newCourse = {
    ...course,
    id: newCourseId,
    title: `${course.title} (Copia)`,
    status: 'draft',
    enrolledCount: 0,
    rating: 0,
    reviewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  delete newCourse._id;
  
  await db.collection('courses').insertOne(newCourse);
  
  // Duplica moduli e lezioni
  const modules = await db.collection('modules').find({ courseId }).toArray();
  for (const mod of modules) {
    const oldModId = mod.id;
    const newModId = uuidv4();
    const newMod = { ...mod, id: newModId, courseId: newCourseId };
    delete newMod._id;
    await db.collection('modules').insertOne(newMod);
    
    const lessons = await db.collection('lessons').find({ moduleId: oldModId }).toArray();
    for (const lesson of lessons) {
      const newLesson = { ...lesson, id: uuidv4(), courseId: newCourseId, moduleId: newModId };
      delete newLesson._id;
      await db.collection('lessons').insertOne(newLesson);
    }
  }
  
  return json({ course: newCourse }, 201);
}

// PUT /api/instructor/courses/:id/status - Cambia stato corso
async function handleInstructorCourseStatus(request, courseId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  const { status } = await request.json();
  const db = await getDb();
  
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course) return err('Corso non trovato', 404);
  if (course.instructorId !== user.id) return err('Non autorizzato', 403);
  
  if (!['draft', 'pending_review'].includes(status)) {
    return err('Stato non valido. Usa draft o pending_review');
  }
  
  await db.collection('courses').updateOne(
    { id: courseId },
    { $set: { status, updatedAt: new Date() } }
  );
  
  return json({ message: `Stato aggiornato a ${status}` });
}

// POST /api/instructor/courses/:id/sections - Crea sezione/modulo
async function handleInstructorCreateSection(request, courseId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  const { title, description } = await request.json();
  const db = await getDb();
  
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course) return err('Corso non trovato', 404);
  if (course.instructorId !== user.id) return err('Non autorizzato', 403);
  
  const maxOrder = await db.collection('modules').find({ courseId }).sort({ order: -1 }).limit(1).toArray();
  const order = maxOrder.length > 0 ? maxOrder[0].order + 1 : 1;
  
  const section = {
    id: uuidv4(),
    courseId,
    title: title || 'Nuova Sezione',
    description: description || '',
    order,
    totalDuration: 0,
    createdAt: new Date()
  };
  
  await db.collection('modules').insertOne(section);
  return json({ section }, 201);
}

// PUT /api/instructor/sections/:id - Modifica sezione
async function handleInstructorUpdateSection(request, sectionId) {
  const user = await getAuthUser(request);
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) return err('Non autenticato come insegnante', 403);
  
  const body = await request.json();
  const db = await getDb();
  
  const section = await db.collection('modules').findOne({ id: sectionId });
  if (!section) return err('Sezione non trovata', 404);
  
  const course = await db.collection('courses').findOne({ id: section.courseId });
  if (course.instructorId !== user.id && user.role !== 'admin') return err('Non autorizzato', 403);
  
  const updates = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.order !== undefined) updates.order = body.order;
  
  await db.collection('modules').updateOne({ id: sectionId }, { $set: updates });
  const updated = await db.collection('modules').findOne({ id: sectionId });
  
  return json({ section: updated });
}

// DELETE /api/instructor/sections/:id - Elimina sezione
async function handleInstructorDeleteSection(request, sectionId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  const db = await getDb();
  const section = await db.collection('modules').findOne({ id: sectionId });
  if (!section) return err('Sezione non trovata', 404);
  
  const course = await db.collection('courses').findOne({ id: section.courseId });
  if (course.instructorId !== user.id) return err('Non autorizzato', 403);
  
  await db.collection('lessons').deleteMany({ moduleId: sectionId });
  await db.collection('modules').deleteOne({ id: sectionId });
  
  await recalculateCourseDuration(section.courseId);
  
  return json({ message: 'Sezione eliminata' });
}

// POST /api/instructor/sections/:id/lessons - Crea lezione
async function handleInstructorCreateLesson(request, sectionId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  const body = await request.json();
  const db = await getDb();
  
  const section = await db.collection('modules').findOne({ id: sectionId });
  if (!section) return err('Sezione non trovata', 404);
  
  const course = await db.collection('courses').findOne({ id: section.courseId });
  if (course.instructorId !== user.id) return err('Non autorizzato', 403);
  
  const maxOrder = await db.collection('lessons').find({ moduleId: sectionId }).sort({ order: -1 }).limit(1).toArray();
  const order = maxOrder.length > 0 ? maxOrder[0].order + 1 : 1;
  
  // Calcola durata in base al tipo
  let duration = 0;
  if (body.type === 'video') {
    duration = parseInt(body.videoDuration) || 0;
  } else if (body.type === 'pdf') {
    const pages = parseInt(body.pdfPages) || 10;
    duration = pages * 2 * 60; // 2 minuti per pagina
  } else if (body.type === 'text') {
    const words = (body.textContent || '').trim().split(/\s+/).length;
    duration = Math.ceil((words / 200) * 60); // 200 parole al minuto
  } else if (body.type === 'mixed') {
    duration = (parseInt(body.videoDuration) || 0) + 
               ((parseInt(body.pdfPages) || 0) * 2 * 60) +
               (Math.ceil((((body.textContent || '').trim().split(/\s+/).length) / 200) * 60));
  }
  
  const lesson = {
    id: uuidv4(),
    moduleId: sectionId,
    courseId: section.courseId,
    title: body.title || 'Nuova Lezione',
    description: body.description || '',
    type: body.type || 'text', // video | pdf | text | mixed
    order,
    duration,
    
    // Video
    videoUrl: body.videoUrl || null,
    videoFile: body.videoFile || null,
    videoDuration: parseInt(body.videoDuration) || 0,
    
    // PDF
    pdfUrl: body.pdfUrl || null,
    pdfFile: body.pdfFile || null,
    pdfPages: parseInt(body.pdfPages) || 0,
    pdfDownloadable: body.pdfDownloadable || false,
    
    // Text
    textContent: body.textContent || '',
    richTextContent: body.richTextContent || '',
    
    // Flags
    isPreview: body.isPreview || false,
    isRequired: body.isRequired !== false, // Default true
    
    createdAt: new Date()
  };
  
  await db.collection('lessons').insertOne(lesson);
  
  // Ricalcola durata corso
  await recalculateCourseDuration(section.courseId);
  
  // Aggiorna durata sezione
  const sectionLessons = await db.collection('lessons').find({ moduleId: sectionId }).toArray();
  const sectionDuration = sectionLessons.reduce((sum, l) => sum + (l.duration || 0), 0);
  await db.collection('modules').updateOne({ id: sectionId }, { $set: { totalDuration: sectionDuration } });
  
  return json({ lesson }, 201);
}

// PUT /api/instructor/lessons/:id - Modifica lezione
async function handleInstructorUpdateLesson(request, lessonId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  const body = await request.json();
  const db = await getDb();
  
  const lesson = await db.collection('lessons').findOne({ id: lessonId });
  if (!lesson) return err('Lezione non trovata', 404);
  
  const course = await db.collection('courses').findOne({ id: lesson.courseId });
  if (course.instructorId !== user.id) return err('Non autorizzato', 403);
  
  const updates = {};
  const fields = [
    'title', 'description', 'type', 'order',
    'videoUrl', 'videoFile', 'videoDuration',
    'pdfUrl', 'pdfFile', 'pdfPages', 'pdfDownloadable',
    'textContent', 'richTextContent',
    'isPreview', 'isRequired'
  ];
  
  fields.forEach(field => {
    if (body[field] !== undefined) updates[field] = body[field];
  });
  
  // Ricalcola durata se cambiati i contenuti
  if (body.videoDuration !== undefined || body.pdfPages !== undefined || body.textContent !== undefined) {
    let duration = 0;
    const type = body.type || lesson.type;
    
    if (type === 'video') {
      duration = parseInt(body.videoDuration || lesson.videoDuration) || 0;
    } else if (type === 'pdf') {
      const pages = parseInt(body.pdfPages || lesson.pdfPages) || 0;
      duration = pages * 2 * 60;
    } else if (type === 'text') {
      const text = body.textContent || lesson.textContent || '';
      const words = text.trim().split(/\s+/).length;
      duration = Math.ceil((words / 200) * 60);
    } else if (type === 'mixed') {
      duration = (parseInt(body.videoDuration || lesson.videoDuration) || 0) +
                 ((parseInt(body.pdfPages || lesson.pdfPages) || 0) * 2 * 60) +
                 (Math.ceil((((body.textContent || lesson.textContent || '').trim().split(/\s+/).length) / 200) * 60));
    }
    
    updates.duration = duration;
  }
  
  await db.collection('lessons').updateOne({ id: lessonId }, { $set: updates });
  
  // Ricalcola durate
  await recalculateCourseDuration(lesson.courseId);
  const sectionLessons = await db.collection('lessons').find({ moduleId: lesson.moduleId }).toArray();
  const sectionDuration = sectionLessons.reduce((sum, l) => sum + (l.duration || 0), 0);
  await db.collection('modules').updateOne({ id: lesson.moduleId }, { $set: { totalDuration: sectionDuration } });
  
  const updated = await db.collection('lessons').findOne({ id: lessonId });
  return json({ lesson: updated });
}

// DELETE /api/instructor/lessons/:id - Elimina lezione
async function handleInstructorDeleteLesson(request, lessonId) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  const db = await getDb();
  const lesson = await db.collection('lessons').findOne({ id: lessonId });
  if (!lesson) return err('Lezione non trovata', 404);
  
  const course = await db.collection('courses').findOne({ id: lesson.courseId });
  if (course.instructorId !== user.id) return err('Non autorizzato', 403);
  
  await db.collection('lessons').deleteOne({ id: lessonId });
  
  // Ricalcola durate
  await recalculateCourseDuration(lesson.courseId);
  const sectionLessons = await db.collection('lessons').find({ moduleId: lesson.moduleId }).toArray();
  const sectionDuration = sectionLessons.reduce((sum, l) => sum + (l.duration || 0), 0);
  await db.collection('modules').updateOne({ id: lesson.moduleId }, { $set: { totalDuration: sectionDuration } });
  
  return json({ message: 'Lezione eliminata' });
}

// POST /api/instructor/upload - Upload file (immagini, video, PDF) via Cloudinary
async function handleInstructorUpload(request) {
  const user = await getAuthUser(request);
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) return err('Non autenticato come insegnante', 403);
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'image'; // image | video | pdf
    
    if (!file) return err('Nessun file fornito');
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Check if Cloudinary is configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      // Upload to Cloudinary
      // Determine resource type based on file type
      let resourceType = 'raw'; // Default to raw for documents
      if (type === 'video') resourceType = 'video';
      else if (type === 'image') resourceType = 'image';
      // For pdf, document, txt, etc. use 'raw'
      
      const folder = `learnhub/${type}s`;
      
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: folder,
            public_id: uuidv4(),
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(buffer);
      });
      
      return json({
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        filename: file.name,
        size: buffer.length,
        type,
        duration: uploadResult.duration || 0, // For videos
        width: uploadResult.width,
        height: uploadResult.height
      });
    }
    
    // Fallback to local storage if Cloudinary not configured
    const ext = path.extname(file.name) || '.bin';
    const filename = `${uuidv4()}${ext}`;
    
    let subdir = 'images';
    if (type === 'video') subdir = 'videos';
    else if (type === 'pdf') subdir = 'pdfs';
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subdir);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    
    return json({
      url: `/uploads/${subdir}/${filename}`,
      filename,
      size: buffer.length,
      type
    });
  } catch (error) {
    return err('Errore upload: ' + error.message, 500);
  }
}

// POST /api/instructor/generate-cover - Genera copertina corso
async function handleInstructorGenerateCover(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'instructor') return err('Non autenticato come insegnante', 403);
  
  try {
    const { title, subtitle, category, level } = await request.json();
    
    const width = 1200;
    const height = 675;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Gradients per categoria
    const gradients = {
      'web-development': { start: '#3B82F6', end: '#8B5CF6' },
      'mobile-development': { start: '#06B6D4', end: '#2563EB' },
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
    
    // Titolo
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
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
    
    const startY = height / 2 - (lines.length * 35);
    lines.forEach((line, i) => {
      ctx.fillText(line.trim(), width / 2, startY + (i * 70));
    });
    
    // Sottotitolo
    if (subtitle) {
      ctx.font = '32px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(subtitle, width / 2, height / 2 + 100);
    }
    
    // Badge livello
    if (level) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(50, 50, 150, 50);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'left';
      const levelMap = { beginner: 'PRINCIPIANTE', intermediate: 'INTERMEDIO', advanced: 'AVANZATO' };
      ctx.fillText(levelMap[level] || level.toUpperCase(), 70, 80);
    }
    
    // Insegnante
    ctx.font = '28px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(`by ${user.name}`, width / 2, height - 80);
    
    // Salva
    const buffer = canvas.toBuffer('image/png');
    const filename = `cover-${uuidv4()}.png`;
    const coverPath = path.join(process.cwd(), 'public', 'uploads', 'covers', filename);
    
    await mkdir(path.dirname(coverPath), { recursive: true });
    await writeFile(coverPath, buffer);
    
    return json({ url: `/uploads/covers/${filename}` });
  } catch (error) {
    return err('Errore generazione copertina: ' + error.message, 500);
  }
}

// ==================== EXTENDED STUDENT HANDLERS ====================

// POST /api/student/lessons/:id/complete - Completa lezione
async function handleStudentCompleteLesson(request, lessonId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  
  const db = await getDb();
  const lesson = await db.collection('lessons').findOne({ id: lessonId });
  if (!lesson) return err('Lezione non trovata', 404);
  
  // Trova o crea enrollment
  let enrollment = await db.collection('enrollments').findOne({ 
    userId: user.id, 
    courseId: lesson.courseId 
  });
  
  if (!enrollment) {
    enrollment = {
      id: uuidv4(),
      userId: user.id,
      courseId: lesson.courseId,
      completedLessons: [],
      progress: 0,
      enrolledAt: new Date(),
      lastAccessedAt: new Date()
    };
    await db.collection('enrollments').insertOne(enrollment);
  }
  
  // Aggiungi lezione se non già completata
  if (!enrollment.completedLessons.includes(lessonId)) {
    enrollment.completedLessons.push(lessonId);
    
    // Calcola progresso
    const totalLessons = await db.collection('lessons').countDocuments({ 
      courseId: lesson.courseId,
      isRequired: true 
    });
    const progress = totalLessons > 0 
      ? Math.floor((enrollment.completedLessons.length / totalLessons) * 100)
      : 0;
    
    await db.collection('enrollments').updateOne(
      { id: enrollment.id },
      { 
        $set: { 
          completedLessons: enrollment.completedLessons,
          progress,
          lastAccessedAt: new Date(),
          ...(progress === 100 ? { completedAt: new Date() } : {})
        }
      }
    );
    
    return json({ progress, completed: progress === 100 });
  }
  
  return json({ progress: enrollment.progress, completed: enrollment.progress === 100 });
}

// GET /api/student/courses/:id/progress - Ottieni progresso corso
async function handleStudentCourseProgress(request, courseId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  
  const db = await getDb();
  const enrollment = await db.collection('enrollments').findOne({
    userId: user.id,
    courseId
  });
  
  if (!enrollment) {
    return json({ progress: 0, completedLessons: [], completed: false });
  }
  
  return json({
    progress: enrollment.progress || 0,
    completedLessons: enrollment.completedLessons || [],
    completed: enrollment.progress === 100,
    completedAt: enrollment.completedAt || null
  });
}

// GET /api/student/courses/:id/certificate - Genera/Scarica attestato
async function handleStudentGetCertificate(request, courseId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autenticato', 401);
  
  const db = await getDb();
  
  // Verifica completamento
  const enrollment = await db.collection('enrollments').findOne({
    userId: user.id,
    courseId,
    progress: 100
  });
  
  if (!enrollment) {
    return err('Devi completare il corso al 100% per ottenere l\'attestato', 403);
  }
  
  // Verifica se certificato già esiste
  let certificate = await db.collection('certificates').findOne({
    userId: user.id,
    courseId
  });
  
  if (certificate) {
    return json({ certificate });
  }
  
  // Genera nuovo certificato
  const course = await db.collection('courses').findOne({ id: courseId });
  if (!course) return err('Corso non trovato', 404);
  
  const certificateCode = `LH-${uuidv4().slice(0, 8).toUpperCase()}`;
  
  try {
    // Genera PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    
    // Bordo
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(2);
    doc.rect(10, 10, width - 20, height - 20);
    doc.setLineWidth(0.5);
    doc.rect(15, 15, width - 30, height - 30);
    
    // Logo
    doc.setFontSize(24);
    doc.setTextColor(99, 102, 241);
    doc.text('LearnHub', width / 2, 30, { align: 'center' });
    
    // Titolo
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text('Attestato di Fine Frequenza', width / 2, 45, { align: 'center' });
    
    // Certifica che
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text('Questo certifica che', width / 2, 65, { align: 'center' });
    
    // Nome studente
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(user.name, width / 2, 85, { align: 'center' });
    
    // Ha completato
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('ha completato con successo il corso', width / 2, 100, { align: 'center' });
    
    // Nome corso
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    const courseName = course.title.length > 60 ? course.title.substring(0, 57) + '...' : course.title;
    doc.text(courseName, width / 2, 120, { align: 'center' });
    
    // Data
    const dateStr = new Date(enrollment.completedAt || new Date()).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Data di completamento: ${dateStr}`, width / 2, 145, { align: 'center' });
    
    // Insegnante
    if (course.instructorName) {
      doc.setFontSize(12);
      doc.text('Insegnante', 40, height - 40);
      doc.setFont('helvetica', 'bold');
      doc.text(course.instructorName, 40, height - 32);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.line(40, height - 25, 100, height - 25);
    }
    
    // Codice
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Codice: ${certificateCode}`, width - 40, height - 32, { align: 'right' });
    
    // Salva PDF
    const filename = `certificate-${certificateCode}.pdf`;
    const pdfPath = path.join(process.cwd(), 'public', 'uploads', 'certificates', filename);
    
    await mkdir(path.dirname(pdfPath), { recursive: true });
    
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    await writeFile(pdfPath, pdfBuffer);
    
    // Salva nel DB
    certificate = {
      id: uuidv4(),
      userId: user.id,
      courseId,
      userName: user.name,
      courseName: course.title,
      courseSubtitle: course.subtitle || '',
      instructorName: course.instructorName || '',
      certificateCode,
      pdfUrl: `/uploads/certificates/${filename}`,
      issuedAt: new Date(),
      verificationCode: certificateCode
    };
    
    await db.collection('certificates').insertOne(certificate);
    
    return json({ certificate }, 201);
  } catch (error) {
    console.error('Errore generazione PDF:', error);
    return err('Errore generazione attestato: ' + error.message, 500);
  }
}

// GET /api/certificates/verify/:code - Verifica attestato pubblico
async function handleVerifyCertificateNew(request, code) {
  const db = await getDb();
  const certificate = await db.collection('certificates').findOne({ 
    $or: [
      { certificateCode: code },
      { verificationCode: code }
    ]
  });
  
  if (!certificate) {
    return err('Certificato non trovato', 404);
  }
  
  return json({
    valid: true,
    certificate: {
      userName: certificate.userName,
      courseName: certificate.courseName,
      instructorName: certificate.instructorName,
      issuedAt: certificate.issuedAt,
      certificateCode: certificate.certificateCode
    }
  });
}

// ==================== PROJECT EXPORT ====================

// GET /api/export/project - Esporta progetto come ZIP
async function handleExportProject(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== 'admin') return err('Solo admin può esportare il progetto', 403);
  
  try {
    const zipFilename = `learnhub-project-${Date.now()}.zip`;
    const zipPath = path.join(process.cwd(), 'public', 'exports', zipFilename);
    
    await mkdir(path.dirname(zipPath), { recursive: true });
    
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    await new Promise((resolve, reject) => {
      output.on('close', () => {
        resolve();
      });
      
      archive.on('error', (err) => {
        reject(err);
      });
      
      archive.pipe(output);
      
      const projectRoot = process.cwd();
      
      // Aggiungi directory
      archive.directory(path.join(projectRoot, 'app'), 'app');
      archive.directory(path.join(projectRoot, 'components'), 'components');
      archive.directory(path.join(projectRoot, 'lib'), 'lib');
      
      // File individuali
      archive.file(path.join(projectRoot, 'package.json'), { name: 'package.json' });
      try {
        archive.file(path.join(projectRoot, 'tailwind.config.js'), { name: 'tailwind.config.js' });
        archive.file(path.join(projectRoot, 'postcss.config.js'), { name: 'postcss.config.js' });
        archive.file(path.join(projectRoot, 'next.config.js'), { name: 'next.config.js' });
      } catch (e) {
        // File potrebbero non esistere
      }
      
      // .env.example
      const envExample = `# LearnHub Environment Variables\n\n# MongoDB\nMONGO_URL=mongodb://localhost:27017\nDB_NAME=learnhub\n\n# JWT\nJWT_SECRET=your-secret-key-here\n\n# Next.js\nNEXT_PUBLIC_BASE_URL=http://localhost:3000\n`;
      archive.append(envExample, { name: '.env.example' });
      
      // README
      const readme = `# LearnHub - Piattaforma E-Learning\n\nMarketplace di corsi online con area insegnante, studente e admin.\n\n## Installazione\n\n1. Installa dipendenze:\n\`\`\`bash\nyarn install\n\`\`\`\n\n2. Configura .env\n\n3. Avvia:\n\`\`\`bash\nyarn dev\n\`\`\`\n\nVisita http://localhost:3000\n`;
      archive.append(readme, { name: 'README.md' });
      
      archive.finalize();
    });
    
    return json({ 
      url: `/exports/${zipFilename}`,
      filename: zipFilename,
      message: 'Progetto esportato con successo'
    });
  } catch (error) {
    console.error('Errore export:', error);
    return err('Errore export progetto: ' + error.message, 500);
  }
}

// GET /api/courses/:id/modules - Lista moduli di un corso
async function handleCourseModules(request, courseId) {
  const db = await getDb();
  const modules = await db.collection('modules').find({ courseId }).sort({ order: 1 }).toArray();
  return json({ modules });
}

// POST /api/subtitles/generate - Genera sottotitoli AI per un video
async function handleGenerateSubtitles(request) {
  const user = await getAuthUser(request);
  if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
    return err('Non autorizzato', 403);
  }
  
  const db = await getDb();
  const body = await request.json();
  const { lessonId, videoUrl, language } = body;
  
  if (!lessonId || !videoUrl) {
    return err('lessonId e videoUrl sono obbligatori', 400);
  }
  
  try {
    // Scarica il video da Cloudinary temporaneamente
    const fetch = (await import('node-fetch')).default;
    const videoResponse = await fetch(videoUrl);
    
    if (!videoResponse.ok) {
      return err('Impossibile scaricare il video', 400);
    }
    
    const videoBuffer = await videoResponse.buffer();
    
    // Verifica dimensione (max 200MB)
    if (videoBuffer.length > 200 * 1024 * 1024) {
      return err('Video troppo grande per la trascrizione (max 200MB)', 400);
    }
    
    // Usa OpenAI Whisper per generare sottotitoli
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.EMERGENT_LLM_KEY || process.env.OPENAI_API_KEY
    });
    
    // Crea un file temporaneo
    const tempDir = path.join(process.cwd(), 'tmp');
    await mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, `video_${uuidv4()}.mp4`);
    await writeFile(tempFile, videoBuffer);
    
    // Genera trascrizione in formato VTT
    const fs = await import('fs');
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      model: 'whisper-1',
      response_format: 'vtt',
      language: language || 'it'
    });
    
    // Elimina file temporaneo
    try {
      await import('fs/promises').then(fsp => fsp.unlink(tempFile));
    } catch (e) {}
    
    // Salva sottotitoli nel database
    const subtitleId = uuidv4();
    await db.collection('subtitles').updateOne(
      { lessonId },
      {
        $set: {
          id: subtitleId,
          lessonId,
          vttContent: transcription,
          language: language || 'it',
          generatedAt: new Date(),
          generatedBy: user.id
        }
      },
      { upsert: true }
    );
    
    // Aggiorna la lezione con il flag hasSubtitles
    await db.collection('lessons').updateOne(
      { id: lessonId },
      { $set: { hasSubtitles: true, subtitlesLanguage: language || 'it' } }
    );
    
    return json({
      success: true,
      subtitleId,
      vttContent: transcription,
      message: 'Sottotitoli generati con successo'
    });
  } catch (error) {
    console.error('Errore generazione sottotitoli:', error);
    return err('Errore nella generazione dei sottotitoli: ' + error.message, 500);
  }
}

// GET /api/documents/view/:lessonId - Proxy sicuro per visualizzazione documenti inline
async function handleDocumentProxy(request, lessonId) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autorizzato', 401);
  
  const db = await getDb();
  const lesson = await db.collection('lessons').findOne({ id: lessonId });
  
  if (!lesson || !lesson.pdfUrl) {
    return err('Documento non trovato', 404);
  }
  
  // Verify enrollment for non-preview lessons
  if (!lesson.isPreview && user.role === 'student') {
    const enrollment = await db.collection('enrollments').findOne({ 
      userId: user.id, 
      courseId: lesson.courseId 
    });
    if (!enrollment) return err('Non iscritto al corso', 403);
  }
  
  try {
    const fetch = (await import('node-fetch')).default;
    const docResponse = await fetch(lesson.pdfUrl);
    
    if (!docResponse.ok) {
      return err('Impossibile caricare il documento', 500);
    }
    
    const buffer = await docResponse.buffer();
    
    // Smart content type detection using magic bytes
    const isPdf = buffer.length >= 4 && buffer.slice(0, 4).toString() === '%PDF';
    const isText = !isPdf && (() => {
      try {
        // Try to decode as UTF-8 text - if it works without errors, it's text
        const sample = buffer.slice(0, Math.min(500, buffer.length)).toString('utf-8');
        // Check if it contains common binary indicators
        const binaryChars = sample.split('').filter(c => {
          const code = c.charCodeAt(0);
          return code < 9 || (code > 13 && code < 32 && code !== 27);
        }).length;
        return binaryChars === 0;
      } catch { return false; }
    })();
    
    if (isText) {
      const textContent = buffer.toString('utf-8');
      return json({ content: textContent, type: 'text' });
    }
    
    // For PDFs and other binary docs, return with inline headers
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': isPdf ? 'application/pdf' : 'application/octet-stream',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-cache',
      }
    });
  } catch (error) {
    console.error('Document proxy error:', error);
    return err('Errore nel caricamento del documento', 500);
  }
}

// GET /api/lessons/:id/subtitles - Ottieni sottotitoli di una lezione
async function handleGetSubtitles(request, lessonId) {
  const db = await getDb();
  const subtitle = await db.collection('subtitles').findOne({ lessonId });
  
  if (!subtitle) {
    return err('Sottotitoli non trovati', 404);
  }
  
  return json({
    vttContent: subtitle.vttContent,
    language: subtitle.language,
    generatedAt: subtitle.generatedAt
  });
}

// POST /api/subtitles/save - Salva sottotitoli generati dal backend Python
async function handleSaveSubtitles(request) {
  const user = await getAuthUser(request);
  if (!user) return err('Non autorizzato', 403);
  
  const db = await getDb();
  const body = await request.json();
  const { lessonId, vttContent, language } = body;
  
  if (!lessonId || !vttContent) {
    return err('lessonId e vttContent sono obbligatori', 400);
  }
  
  const subtitleId = uuidv4();
  await db.collection('subtitles').updateOne(
    { lessonId },
    {
      $set: {
        id: subtitleId,
        lessonId,
        vttContent,
        language: language || 'it',
        generatedAt: new Date(),
        generatedBy: user.id
      }
    },
    { upsert: true }
  );
  
  // Aggiorna la lezione con il flag hasSubtitles
  await db.collection('lessons').updateOne(
    { id: lessonId },
    { $set: { hasSubtitles: true, subtitlesLanguage: language || 'it' } }
  );
  
  return json({
    success: true,
    subtitleId,
    message: 'Sottotitoli salvati con successo'
  });
}

// GET /api/modules/:id/lessons - Lista lezioni di un modulo
async function handleModuleLessons(request, moduleId) {
  const db = await getDb();
  const lessons = await db.collection('lessons').find({ moduleId }).sort({ order: 1 }).toArray();
  return json({ lessons });
}

// ==================== MAIN HANDLER ====================
async function handler(request, { params }) {
  const p = params?.path || [];
  const method = request.method;

  try {
    // Auth routes
    if (p[0] === 'auth') {
      if (method === 'POST' && p[1] === 'register') return handleRegister(request);
      if (method === 'POST' && p[1] === 'login') return handleLogin(request);
      if (method === 'GET' && p[1] === 'me') return handleMe(request);
      if (method === 'PUT' && p[1] === 'profile') return handleUpdateProfile(request);
    }

    // Course routes
    if (p[0] === 'courses') {
      if (method === 'GET' && !p[1]) return handleListCourses(request);
      if (method === 'GET' && p[1] && p[2] === 'modules') return handleCourseModules(request, p[1]);
      if (method === 'GET' && p[1] && !p[2]) return handleGetCourse(request, p[1]);
      if (method === 'POST' && !p[1]) return handleCreateCourse(request);
      if (method === 'PUT' && p[1] && !p[2]) return handleUpdateCourse(request, p[1]);
      if (method === 'DELETE' && p[1] && !p[2]) return handleDeleteCourse(request, p[1]);
      if (method === 'POST' && p[1] && p[2] === 'enroll') return handleEnroll(request, p[1]);
      if (method === 'POST' && p[1] && p[2] === 'progress') return handleProgress(request, p[1]);
      if (method === 'GET' && p[1] && p[2] === 'reviews') return handleGetReviews(request, p[1]);
      if (method === 'POST' && p[1] && p[2] === 'reviews') return handleCreateReview(request, p[1]);
    }

    // Module routes
    if (p[0] === 'modules') {
      if (method === 'GET' && p[1] && p[2] === 'lessons') return handleModuleLessons(request, p[1]);
      if (method === 'POST' && !p[1]) return handleCreateModule(request);
      if (method === 'PUT' && p[1]) return handleUpdateModule(request, p[1]);
      if (method === 'DELETE' && p[1]) return handleDeleteModule(request, p[1]);
    }

    // Lesson routes
    if (p[0] === 'lessons') {
      if (method === 'POST' && !p[1]) return handleCreateLesson(request);
      if (method === 'PUT' && p[1]) return handleUpdateLesson(request, p[1]);
      if (method === 'DELETE' && p[1]) return handleDeleteLesson(request, p[1]);
    }

    // Category routes
    if (p[0] === 'categories') {
      if (method === 'GET') return handleGetCategories(request);
      if (method === 'POST') return handleCreateCategory(request);
    }

    // Dashboard routes
    if (p[0] === 'dashboard') {
      if (method === 'GET' && p[1] === 'student') return handleStudentDashboard(request);
      if (method === 'GET' && p[1] === 'instructor') return handleInstructorDashboard(request);
      if (method === 'GET' && p[1] === 'admin') return handleAdminDashboard(request);
    }

    // Admin routes
    if (p[0] === 'admin') {
      if (method === 'GET' && p[1] === 'analytics') return handleAdminAnalytics(request);
      if (method === 'GET' && p[1] === 'payments') return handleAdminPayments(request);
      if (method === 'GET' && p[1] === 'reports') return handleAdminReports(request);
      if (method === 'GET' && p[1] === 'users' && !p[2]) return handleAdminUsers(request);
      if (method === 'GET' && p[1] === 'users' && p[2]) return handleAdminGetUser(request, p[2]);
      if (method === 'PUT' && p[1] === 'users' && p[2] && p[3] === 'suspend') return handleAdminSuspendUser(request, p[2]);
      if (method === 'PUT' && p[1] === 'users' && p[2] && !p[3]) return handleAdminUpdateUser(request, p[2]);
      if (method === 'GET' && p[1] === 'courses' && !p[2]) return handleAdminCoursesList(request);
      if (method === 'PUT' && p[1] === 'courses' && p[2] && p[3] === 'approve') return handleAdminApproveCourse(request, p[2]);
      if (method === 'PUT' && p[1] === 'courses' && p[2] && !p[3]) return handleAdminEditCourse(request, p[2]);
      if (method === 'DELETE' && p[1] === 'courses' && p[2]) return handleAdminDeleteCourse(request, p[2]);
      if (method === 'GET' && p[1] === 'reviews' && !p[2]) return handleAdminReviews(request);
      if (method === 'DELETE' && p[1] === 'reviews' && p[2]) return handleAdminDeleteReview(request, p[2]);
      if (method === 'PUT' && p[1] === 'categories' && p[2]) return handleAdminUpdateCategory(request, p[2]);
      if (method === 'DELETE' && p[1] === 'categories' && p[2]) return handleAdminDeleteCategory(request, p[2]);
    }

    // Community routes
    if (p[0] === 'community') {
      if (p[1] === 'posts') {
        if (method === 'GET' && !p[2]) return handleGetPosts(request);
        if (method === 'POST' && !p[2]) return handleCreatePost(request);
        if (method === 'GET' && p[2] && !p[3]) return handleGetPost(request, p[2]);
        if (method === 'POST' && p[2] && p[3] === 'comments') return handleAddComment(request, p[2]);
        if (method === 'POST' && p[2] && p[3] === 'upvote') return handleUpvotePost(request, p[2]);
      }
    }

    // Gamification routes
    if (p[0] === 'gamification') {
      if (method === 'GET' && p[1] === 'profile') return handleGamificationProfile(request);
      if (method === 'GET' && p[1] === 'leaderboard') return handleLeaderboard(request);
    }

    // AI routes
    if (p[0] === 'ai') {
      if (method === 'POST' && p[1]) return handleAI(request, p[1]);
    }

    // Instructor routes (NEW)
    if (p[0] === 'instructor') {
      if (method === 'GET' && p[1] === 'dashboard') return handleInstructorDashboardNew(request);
      if (method === 'GET' && p[1] === 'courses' && !p[2]) return handleInstructorDashboardNew(request); // Lista corsi
      if (method === 'POST' && p[1] === 'courses' && !p[2]) return handleInstructorCreateCourse(request);
      if (method === 'PUT' && p[1] === 'courses' && p[2] && !p[3]) return handleInstructorUpdateCourse(request, p[2]);
      if (method === 'DELETE' && p[1] === 'courses' && p[2] && !p[3]) return handleInstructorDeleteCourse(request, p[2]);
      if (method === 'POST' && p[1] === 'courses' && p[2] && p[3] === 'duplicate') return handleInstructorDuplicateCourse(request, p[2]);
      if (method === 'PUT' && p[1] === 'courses' && p[2] && p[3] === 'status') return handleInstructorCourseStatus(request, p[2]);
      if (method === 'POST' && p[1] === 'courses' && p[2] && p[3] === 'sections') return handleInstructorCreateSection(request, p[2]);
      if (method === 'PUT' && p[1] === 'sections' && p[2] && !p[3]) return handleInstructorUpdateSection(request, p[2]);
      if (method === 'DELETE' && p[1] === 'sections' && p[2]) return handleInstructorDeleteSection(request, p[2]);
      if (method === 'POST' && p[1] === 'sections' && p[2] && p[3] === 'lessons') return handleInstructorCreateLesson(request, p[2]);
      if (method === 'PUT' && p[1] === 'lessons' && p[2]) return handleInstructorUpdateLesson(request, p[2]);
      if (method === 'DELETE' && p[1] === 'lessons' && p[2]) return handleInstructorDeleteLesson(request, p[2]);
      if (method === 'POST' && p[1] === 'upload') return handleInstructorUpload(request);
      if (method === 'POST' && p[1] === 'generate-cover') return handleInstructorGenerateCover(request);
    }

    // Student routes (NEW)
    if (p[0] === 'student') {
      if (method === 'POST' && p[1] === 'lessons' && p[2] && p[3] === 'complete') return handleStudentCompleteLesson(request, p[2]);
      if (method === 'GET' && p[1] === 'courses' && p[2] && p[3] === 'progress') return handleStudentCourseProgress(request, p[2]);
      if (method === 'GET' && p[1] === 'courses' && p[2] && p[3] === 'certificate') return handleStudentGetCertificate(request, p[2]);
    }

    // Export route (NEW)
    if (p[0] === 'export' && p[1] === 'project' && method === 'GET') return handleExportProject(request);

    // Upload route
    if (p[0] === 'upload' && method === 'POST') return handleUpload(request);

    // Certificate routes (Updated)
    if (p[0] === 'certificates') {
      if (method === 'POST' && p[1] === 'generate') return handleGenerateCertificate(request);
      if (method === 'GET' && p[1] && p[2] === 'verify') return handleVerifyCertificateNew(request, p[2]);
      if (method === 'GET' && p[1]) return handleVerifyCertificate(request, p[1]); // Fallback
    }

    // Document proxy route (secure inline viewing)
    if (p[0] === 'documents' && p[1] === 'view' && p[2] && method === 'GET') return handleDocumentProxy(request, p[2]);

    // Init/Seed route
    if (p[0] === 'init' && method === 'GET') return handleInit();
    
    // Subtitles routes
    if (p[0] === 'subtitles' && p[1] === 'generate' && method === 'POST') return handleGenerateSubtitles(request);
    if (p[0] === 'subtitles' && p[1] === 'save' && method === 'POST') return handleSaveSubtitles(request);
    if (p[0] === 'lessons' && p[2] === 'subtitles' && method === 'GET') return handleGetSubtitles(request, p[1]);

    return err('Route non trovata', 404);
  } catch (error) {
    console.error('API Error:', error);
    return err(error.message || 'Errore interno del server', 500);
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
