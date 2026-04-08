from fastapi import FastAPI, APIRouter, Request, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List
import os, uuid, hashlib, hmac, base64, json, math, random, logging, time, shutil, aiofiles, mimetypes
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="LearnHub API")
r = APIRouter(prefix="/api")

UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / 'images').mkdir(exist_ok=True)
(UPLOAD_DIR / 'videos').mkdir(exist_ok=True)
(UPLOAD_DIR / 'pdfs').mkdir(exist_ok=True)
(UPLOAD_DIR / 'certificates').mkdir(exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get('JWT_SECRET', 'learnhub-jwt-secret-2025')

# ==================== FILE STREAMING ENDPOINT ====================
@app.get("/api/uploads/{subdir}/{filename}")
async def serve_uploaded_file(subdir: str, filename: str, request: Request):
    file_path = UPLOAD_DIR / subdir / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(404, "File non trovato")
    
    file_size = file_path.stat().st_size
    content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    
    range_header = request.headers.get("range")
    if range_header:
        range_str = range_header.replace("bytes=", "")
        parts = range_str.split("-")
        start = int(parts[0])
        end = int(parts[1]) if parts[1] else file_size - 1
        end = min(end, file_size - 1)
        chunk_size = end - start + 1
        
        async def stream_range():
            async with aiofiles.open(str(file_path), 'rb') as f:
                await f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    read_size = min(remaining, 65536)
                    data = await f.read(read_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
        
        return StreamingResponse(
            stream_range(),
            status_code=206,
            media_type=content_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
                "Cache-Control": "public, max-age=3600",
            }
        )
    
    async def stream_file():
        async with aiofiles.open(str(file_path), 'rb') as f:
            while True:
                data = await f.read(65536)
                if not data:
                    break
                yield data
    
    return StreamingResponse(
        stream_file(),
        media_type=content_type,
        headers={
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
        }
    )

# ==================== UTILS ====================
def new_id():
    return str(uuid.uuid4())

def hash_password(password):
    salt = os.urandom(16).hex()
    h = hashlib.pbkdf2_hmac('sha512', password.encode(), salt.encode(), 10000).hex()
    return f"{salt}:{h}"

def verify_password(password, stored):
    parts = stored.split(':')
    if len(parts) != 2:
        return False
    salt, h = parts
    verify = hashlib.pbkdf2_hmac('sha512', password.encode(), salt.encode(), 10000).hex()
    return h == verify

def create_token(payload):
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip('=')
    body_data = {**payload, "iat": int(time.time() * 1000), "exp": int(time.time() * 1000) + 7 * 24 * 60 * 60 * 1000}
    body = base64.urlsafe_b64encode(json.dumps(body_data).encode()).decode().rstrip('=')
    sig = hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    signature = base64.urlsafe_b64encode(sig).decode().rstrip('=')
    return f"{header}.{body}.{signature}"

def verify_token(token):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header, body, signature = parts
        expected = base64.urlsafe_b64encode(
            hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
        ).decode().rstrip('=')
        if signature != expected:
            return None
        padding = 4 - len(body) % 4
        if padding != 4:
            body += '=' * padding
        payload = json.loads(base64.urlsafe_b64decode(body))
        if payload.get('exp', 0) < int(time.time() * 1000):
            return None
        return payload
    except Exception:
        return None

async def get_auth_user(request: Request):
    auth = request.headers.get('authorization', '')
    if not auth.startswith('Bearer '):
        return None
    payload = verify_token(auth[7:])
    if not payload:
        return None
    user = await db.users.find_one({"id": payload.get("id")}, {"_id": 0})
    if not user:
        return None
    safe = {k: v for k, v in user.items() if k != 'password'}
    return safe

def clean_doc(doc):
    if doc and '_id' in doc:
        del doc['_id']
    return doc

def clean_docs(docs):
    return [clean_doc(d) for d in docs]

def serialize_dates(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: serialize_dates(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_dates(i) for i in obj]
    return obj

# ==================== SEED ====================
async def seed_database():
    count = await db.categories.count_documents({})
    if count > 0:
        return

    categories = [
        {"id": new_id(), "name": "Sviluppo Web", "slug": "web-development", "icon": "\U0001f5a5\ufe0f", "description": "HTML, CSS, JavaScript, React, Node.js e altro", "courseCount": 0},
        {"id": new_id(), "name": "Sviluppo Mobile", "slug": "mobile-development", "icon": "\U0001f4f1", "description": "Android, iOS, Flutter, React Native", "courseCount": 0},
        {"id": new_id(), "name": "Data Science & AI", "slug": "data-science", "icon": "\U0001f916", "description": "Python, Machine Learning, Deep Learning", "courseCount": 0},
        {"id": new_id(), "name": "Design & UX", "slug": "design", "icon": "\U0001f3a8", "description": "UI Design, UX Design, Figma, Adobe", "courseCount": 0},
        {"id": new_id(), "name": "Business & Management", "slug": "business", "icon": "\U0001f4c8", "description": "Leadership, Strategia, Project Management", "courseCount": 0},
        {"id": new_id(), "name": "Marketing Digitale", "slug": "marketing", "icon": "\U0001f4ca", "description": "SEO, Social Media, Content Marketing", "courseCount": 0},
        {"id": new_id(), "name": "Fotografia & Video", "slug": "photography", "icon": "\U0001f4f7", "description": "Fotografia, Editing Video, Produzione", "courseCount": 0},
        {"id": new_id(), "name": "Musica & Audio", "slug": "music", "icon": "\U0001f3b5", "description": "Produzione musicale, Strumenti, Teoria", "courseCount": 0},
        {"id": new_id(), "name": "Crescita Personale", "slug": "personal-growth", "icon": "\U0001f9e0", "description": "Produttivita, Comunicazione, Mindset", "courseCount": 0},
        {"id": new_id(), "name": "Finanza & Investimenti", "slug": "finance", "icon": "\U0001f4b0", "description": "Trading, Investimenti, Contabilita", "courseCount": 0},
    ]
    await db.categories.insert_many(categories)

    admin_id, inst1_id, inst2_id, student_id = new_id(), new_id(), new_id(), new_id()
    users = [
        {"id": admin_id, "name": "Admin LearnHub", "email": "admin@learnhub.it", "password": hash_password("admin123"), "role": "admin", "bio": "Amministratore della piattaforma", "avatar": None, "xp": 0, "level": 1, "badges": [], "referralCode": new_id()[:8], "createdAt": datetime.now(timezone.utc).isoformat()},
        {"id": inst1_id, "name": "Marco Rossi", "email": "marco@learnhub.it", "password": hash_password("marco123"), "role": "instructor", "bio": "Senior Full-Stack Developer con 10+ anni di esperienza.", "avatar": None, "xp": 500, "level": 3, "badges": ["top_instructor"], "referralCode": new_id()[:8], "createdAt": datetime.now(timezone.utc).isoformat()},
        {"id": inst2_id, "name": "Laura Bianchi", "email": "laura@learnhub.it", "password": hash_password("laura123"), "role": "instructor", "bio": "Data Scientist e ricercatrice AI. PhD in Computer Science.", "avatar": None, "xp": 800, "level": 4, "badges": ["top_instructor", "community_star"], "referralCode": new_id()[:8], "createdAt": datetime.now(timezone.utc).isoformat()},
        {"id": student_id, "name": "Studente Demo", "email": "student@learnhub.it", "password": hash_password("student123"), "role": "student", "bio": "Appassionato di tecnologia e programmazione.", "avatar": None, "xp": 150, "level": 2, "badges": ["first_course"], "referralCode": new_id()[:8], "createdAt": datetime.now(timezone.utc).isoformat()},
    ]
    await db.users.insert_many(users)

    web_cat = next(c for c in categories if c["slug"] == "web-development")
    ds_cat = next(c for c in categories if c["slug"] == "data-science")
    design_cat = next(c for c in categories if c["slug"] == "design")
    marketing_cat = next(c for c in categories if c["slug"] == "marketing")
    mobile_cat = next(c for c in categories if c["slug"] == "mobile-development")

    c1, c2, c3, c4, c5, c6 = new_id(), new_id(), new_id(), new_id(), new_id(), new_id()
    now = datetime.now(timezone.utc).isoformat()
    courses = [
        {"id": c1, "title": "React e Next.js: Guida Completa 2025", "slug": "react-nextjs-guida-completa-2025", "shortDescription": "Impara React e Next.js da zero a esperto con progetti reali.", "description": "Questo corso completo ti guidera attraverso tutto cio che devi sapere su React e Next.js.", "price": 49.99, "category": "web-development", "categoryName": "Sviluppo Web", "thumbnail": None, "instructorId": inst1_id, "instructorName": "Marco Rossi", "status": "published", "rating": 4.7, "ratingCount": 128, "totalStudents": 1243, "tags": ["react", "nextjs", "javascript"], "language": "it", "level": "intermediate", "requirements": ["Conoscenza base di HTML/CSS", "Fondamenti di JavaScript"], "whatYouLearn": ["Costruire applicazioni React moderne", "Padroneggiare Next.js 14 e App Router", "Server Components e Client Components"], "totalLessons": 8, "totalDuration": 1800, "createdAt": "2025-01-15T00:00:00Z", "updatedAt": now},
        {"id": c2, "title": "Python per Data Science e Machine Learning", "slug": "python-data-science-ml", "shortDescription": "Padroneggia Python per analisi dati e machine learning.", "description": "Un percorso completo dalla programmazione Python alla Data Science avanzata.", "price": 39.99, "category": "data-science", "categoryName": "Data Science & AI", "thumbnail": None, "instructorId": inst2_id, "instructorName": "Laura Bianchi", "status": "published", "rating": 4.9, "ratingCount": 256, "totalStudents": 2150, "tags": ["python", "data-science", "machine-learning"], "language": "it", "level": "beginner", "requirements": ["Nessuna esperienza richiesta"], "whatYouLearn": ["Programmare in Python da zero", "Analisi dati con Pandas e NumPy"], "totalLessons": 10, "totalDuration": 2400, "createdAt": "2025-02-01T00:00:00Z", "updatedAt": now},
        {"id": c3, "title": "UI/UX Design Masterclass", "slug": "ui-ux-design-masterclass", "shortDescription": "Impara a progettare interfacce belle e funzionali con Figma.", "description": "Diventa un designer UI/UX professionista.", "price": 59.99, "category": "design", "categoryName": "Design & UX", "thumbnail": None, "instructorId": inst2_id, "instructorName": "Laura Bianchi", "status": "published", "rating": 4.6, "ratingCount": 89, "totalStudents": 876, "tags": ["design", "ui", "ux", "figma"], "language": "it", "level": "beginner", "requirements": ["Nessuna esperienza di design richiesta"], "whatYouLearn": ["Principi fondamentali di UI Design", "Prototipazione con Figma"], "totalLessons": 7, "totalDuration": 1500, "createdAt": "2025-01-20T00:00:00Z", "updatedAt": now},
        {"id": c4, "title": "Marketing Digitale Avanzato", "slug": "marketing-digitale-avanzato", "shortDescription": "Strategie avanzate di marketing digitale.", "description": "Impara le strategie di marketing digitale che utilizzano le aziende di successo.", "price": 34.99, "category": "marketing", "categoryName": "Marketing Digitale", "thumbnail": None, "instructorId": inst1_id, "instructorName": "Marco Rossi", "status": "published", "rating": 4.4, "ratingCount": 67, "totalStudents": 543, "tags": ["marketing", "seo", "ads"], "language": "it", "level": "intermediate", "requirements": ["Conoscenza base del marketing"], "whatYouLearn": ["SEO on-page e off-page", "Google Ads e campagne PPC"], "totalLessons": 6, "totalDuration": 1200, "createdAt": "2025-03-01T00:00:00Z", "updatedAt": now},
        {"id": c5, "title": "Machine Learning da Zero a Pro", "slug": "machine-learning-zero-pro", "shortDescription": "Diventa esperto di ML con Python e TensorFlow.", "description": "Corso avanzato di Machine Learning.", "price": 69.99, "category": "data-science", "categoryName": "Data Science & AI", "thumbnail": None, "instructorId": inst2_id, "instructorName": "Laura Bianchi", "status": "published", "rating": 4.8, "ratingCount": 156, "totalStudents": 1567, "tags": ["machine-learning", "deep-learning", "python"], "language": "it", "level": "advanced", "requirements": ["Conoscenza base di Python"], "whatYouLearn": ["Algoritmi ML supervisionati e non", "Reti Neurali e Deep Learning"], "totalLessons": 12, "totalDuration": 3000, "createdAt": "2025-02-15T00:00:00Z", "updatedAt": now},
        {"id": c6, "title": "Flutter: App Mobile Cross-Platform", "slug": "flutter-app-mobile-cross-platform", "shortDescription": "Costruisci app native per iOS e Android.", "description": "Impara Flutter e Dart per creare applicazioni mobile.", "price": 44.99, "category": "mobile-development", "categoryName": "Sviluppo Mobile", "thumbnail": None, "instructorId": inst1_id, "instructorName": "Marco Rossi", "status": "published", "rating": 4.5, "ratingCount": 93, "totalStudents": 789, "tags": ["flutter", "dart", "mobile"], "language": "it", "level": "beginner", "requirements": ["Conoscenza base di programmazione"], "whatYouLearn": ["Dart programming language", "Widget e Layout in Flutter"], "totalLessons": 9, "totalDuration": 2100, "createdAt": "2025-03-10T00:00:00Z", "updatedAt": now},
    ]
    await db.courses.insert_many(courses)

    all_modules = []
    all_lessons = []
    for course in courses:
        mc = min(3, math.ceil(course["totalLessons"] / 3))
        for m in range(mc):
            mid = new_id()
            all_modules.append({"id": mid, "courseId": course["id"], "title": f"Modulo {m+1}: {['Fondamenti','Intermedio','Avanzato'][m] if m < 3 else 'Extra'}", "description": f"Modulo {m+1} del corso {course['title']}", "order": m+1})
            lim = 3 if m < mc - 1 else course["totalLessons"] - m * 3
            for l in range(max(1, lim)):
                all_lessons.append({"id": new_id(), "moduleId": mid, "courseId": course["id"], "title": f"Lezione {m*3+l+1}: Argomento {m*3+l+1}", "content": f"Contenuto della lezione {m*3+l+1}.", "videoUrl": None, "duration": random.randint(10, 30) * 60, "order": l+1, "type": "text"})
    if all_modules:
        await db.modules.insert_many(all_modules)
    if all_lessons:
        await db.lessons.insert_many(all_lessons)

    first_lesson = next((l for l in all_lessons if l["courseId"] == c1), None)
    await db.enrollments.insert_one({"id": new_id(), "userId": student_id, "courseId": c1, "progress": 25, "completedLessons": [first_lesson["id"]] if first_lesson else [], "startedAt": "2025-04-01T00:00:00Z", "completedAt": None, "lastAccessedAt": now})

    cat_counts = {}
    for c in courses:
        cat_counts[c["category"]] = cat_counts.get(c["category"], 0) + 1
    for slug, cnt in cat_counts.items():
        await db.categories.update_one({"slug": slug}, {"$set": {"courseCount": cnt}})

    # Create indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.courses.create_index("id", unique=True)
        await db.courses.create_index("slug")
        await db.courses.create_index("category")
        await db.modules.create_index("courseId")
        await db.lessons.create_index("courseId")
        await db.lessons.create_index("moduleId")
        await db.enrollments.create_index([("userId", 1), ("courseId", 1)])
        await db.reviews.create_index("courseId")
        await db.categories.create_index("slug")
        await db.forumPosts.create_index("courseId")
    except Exception:
        pass

# ==================== INIT ====================
@r.get("/init")
async def init_db():
    await seed_database()
    return {"message": "Database inizializzato", "seeded": True}

# ==================== AUTH ====================
@r.post("/auth/register")
async def register(request: Request):
    body = await request.json()
    name, email, password = body.get("name"), body.get("email"), body.get("password")
    role = body.get("role", "student")
    if not name or not email or not password:
        raise HTTPException(400, "Nome, email e password sono obbligatori")
    if len(password) < 6:
        raise HTTPException(400, "La password deve avere almeno 6 caratteri")
    valid_roles = ["student", "instructor"]
    user_role = role if role in valid_roles else "student"
    existing = await db.users.find_one({"email": email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Email gia registrata")
    user = {"id": new_id(), "name": name, "email": email.lower(), "password": hash_password(password), "role": user_role, "bio": "", "avatar": None, "xp": 0, "level": 1, "badges": [], "referralCode": new_id()[:8], "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.users.insert_one(user)
    safe = {k: v for k, v in user.items() if k not in ('password', '_id')}
    token = create_token({"id": user["id"], "email": user["email"], "role": user["role"]})
    return {"user": safe, "token": token}

@r.post("/auth/login")
async def login(request: Request):
    body = await request.json()
    email, password = body.get("email"), body.get("password")
    if not email or not password:
        raise HTTPException(400, "Email e password sono obbligatori")
    user = await db.users.find_one({"email": email.lower()}, {"_id": 0})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(401, "Credenziali non valide")
    safe = {k: v for k, v in user.items() if k != 'password'}
    token = create_token({"id": user["id"], "email": user["email"], "role": user["role"]})
    return {"user": safe, "token": token}

@r.get("/auth/me")
async def me(request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    return {"user": user}

@r.put("/auth/profile")
async def update_profile(request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    body = await request.json()
    updates = {}
    if body.get("name"): updates["name"] = body["name"]
    if "bio" in body: updates["bio"] = body["bio"]
    if "avatar" in body: updates["avatar"] = body["avatar"]
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return {"user": updated}

# ==================== COURSES ====================
@r.get("/courses")
async def list_courses(request: Request):
    await seed_database()
    params = request.query_params
    search = params.get("search", "")
    category = params.get("category", "")
    level = params.get("level", "")
    sort = params.get("sort", "popular")
    page = int(params.get("page", "1"))
    limit = int(params.get("limit", "12"))
    instructor_id = params.get("instructorId", "")
    language = params.get("language", "")

    f = {"status": "published"}
    if search:
        f["$or"] = [{"title": {"$regex": search, "$options": "i"}}, {"description": {"$regex": search, "$options": "i"}}, {"tags": {"$regex": search, "$options": "i"}}]
    if category:
        f["category"] = category
    if level:
        f["level"] = level
    if language:
        f["language"] = language
    if instructor_id:
        f["instructorId"] = instructor_id
        f.pop("status", None)

    sort_map = {"popular": [("totalStudents", -1)], "newest": [("createdAt", -1)], "rating": [("rating", -1)], "price-low": [("price", 1)], "price-high": [("price", -1)]}
    total = await db.courses.count_documents(f)
    cursor = db.courses.find(f, {"_id": 0}).sort(sort_map.get(sort, [("totalStudents", -1)])).skip((page - 1) * limit).limit(limit)
    courses = await cursor.to_list(limit)
    return {"courses": courses, "total": total, "page": page, "limit": limit, "totalPages": math.ceil(total / limit) if total > 0 else 0}

@r.get("/courses/{course_id}")
async def get_course(course_id: str, request: Request):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(404, "Corso non trovato")
    modules = await db.modules.find({"courseId": course_id}, {"_id": 0}).sort("order", 1).to_list(100)
    lessons = await db.lessons.find({"courseId": course_id}, {"_id": 0}).sort("order", 1).to_list(500)
    reviews = await db.reviews.find({"courseId": course_id}, {"_id": 0}).sort("createdAt", -1).to_list(10)
    instructor = await db.users.find_one({"id": course.get("instructorId")}, {"_id": 0, "password": 0})
    modules_with_lessons = []
    for m in modules:
        m["lessons"] = [l for l in lessons if l.get("moduleId") == m["id"]]
        modules_with_lessons.append(m)
    user = await get_auth_user(request)
    enrollment = None
    if user:
        enrollment = await db.enrollments.find_one({"userId": user["id"], "courseId": course_id}, {"_id": 0})
    inst_info = None
    if instructor:
        inst_info = {"id": instructor["id"], "name": instructor.get("name"), "bio": instructor.get("bio"), "avatar": instructor.get("avatar")}
    total_lessons = len(lessons)
    total_duration = sum(l.get("duration", 0) for l in lessons)
    return {"course": course, "modules": modules_with_lessons, "reviews": reviews, "instructor": inst_info, "enrollment": enrollment, "totalLessons": total_lessons, "totalDuration": total_duration}

@r.post("/courses")
async def create_course(request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    if user["role"] not in ("instructor", "admin"):
        raise HTTPException(403, "Solo gli insegnanti possono creare corsi")
    data = await request.json()
    title = data.get("title", "")
    if not title or not data.get("description") or not data.get("category"):
        raise HTTPException(400, "Titolo, descrizione e categoria sono obbligatori")
    slug = title.lower()
    for c in "àáâãäå": slug = slug.replace(c, "a")
    for c in "èéêë": slug = slug.replace(c, "e")
    for c in "ìíîï": slug = slug.replace(c, "i")
    for c in "òóôõö": slug = slug.replace(c, "o")
    for c in "ùúûü": slug = slug.replace(c, "u")
    import re
    slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')
    course_id = new_id()
    cat = await db.categories.find_one({"slug": data.get("category")}, {"_id": 0})
    course = {"id": course_id, "title": title, "slug": f"{slug}-{course_id[:6]}", "shortDescription": data.get("shortDescription", ""), "description": data.get("description", ""), "price": float(data.get("price", 0)), "category": data.get("category"), "categoryName": cat["name"] if cat else "", "thumbnail": data.get("thumbnail"), "instructorId": user["id"], "instructorName": user["name"], "status": "pending", "rating": 0, "ratingCount": 0, "totalStudents": 0, "tags": data.get("tags", []), "language": data.get("language", "Italiano"), "level": data.get("level", "beginner"), "requirements": data.get("requirements", []), "whatYouLearn": data.get("whatYouLearn", []), "totalLessons": 0, "totalDuration": 0, "createdAt": datetime.now(timezone.utc).isoformat(), "updatedAt": datetime.now(timezone.utc).isoformat()}
    await db.courses.insert_one(course)
    # Create modules/lessons if provided
    total_lessons = 0
    total_duration = 0
    modules = data.get("modules", [])
    if modules and isinstance(modules, list):
        for mi, mod in enumerate(modules):
            mid = new_id()
            await db.modules.insert_one({"id": mid, "courseId": course_id, "title": mod.get("title", f"Modulo {mi+1}"), "description": mod.get("description", ""), "order": mi+1})
            for li, lesson in enumerate(mod.get("lessons", [])):
                dur = int(lesson.get("duration", 0))
                await db.lessons.insert_one({"id": new_id(), "moduleId": mid, "courseId": course_id, "title": lesson.get("title", f"Lezione {li+1}"), "content": lesson.get("content", ""), "videoUrl": lesson.get("videoUrl"), "duration": dur, "order": li+1, "type": lesson.get("type", "text")})
                total_lessons += 1
                total_duration += dur
    await db.courses.update_one({"id": course_id}, {"$set": {"totalLessons": total_lessons, "totalDuration": total_duration}})
    if data.get("category"):
        await db.categories.update_one({"slug": data["category"]}, {"$inc": {"courseCount": 1}})
    course["totalLessons"] = total_lessons
    course["totalDuration"] = total_duration
    course.pop("_id", None)
    return {"course": course}

@r.put("/courses/{course_id}")
async def update_course(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(404, "Corso non trovato")
    if course.get("instructorId") != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    data = await request.json()
    allowed = ["title", "shortDescription", "description", "price", "category", "level", "language", "tags", "requirements", "whatYouLearn", "thumbnail", "status"]
    updates = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    for field in allowed:
        if field in data:
            updates[field] = data[field]
    await db.courses.update_one({"id": course_id}, {"$set": updates})
    updated = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return {"course": updated}

@r.delete("/courses/{course_id}")
async def delete_course(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(404, "Corso non trovato")
    if course.get("instructorId") != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    await db.courses.delete_one({"id": course_id})
    await db.modules.delete_many({"courseId": course_id})
    await db.lessons.delete_many({"courseId": course_id})
    await db.enrollments.delete_many({"courseId": course_id})
    await db.reviews.delete_many({"courseId": course_id})
    return {"message": "Corso eliminato"}

@r.get("/courses/{course_id}/modules")
async def course_modules(course_id: str):
    modules = await db.modules.find({"courseId": course_id}, {"_id": 0}).sort("order", 1).to_list(100)
    return {"modules": modules}

# ==================== ENROLLMENT & PROGRESS ====================
@r.post("/courses/{course_id}/enroll")
async def enroll(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(404, "Corso non trovato")
    existing = await db.enrollments.find_one({"userId": user["id"], "courseId": course_id})
    if existing:
        raise HTTPException(400, "Sei gia iscritto a questo corso")
    enrollment = {"id": new_id(), "userId": user["id"], "courseId": course_id, "progress": 0, "completedLessons": [], "startedAt": datetime.now(timezone.utc).isoformat(), "completedAt": None, "lastAccessedAt": datetime.now(timezone.utc).isoformat()}
    await db.enrollments.insert_one(enrollment)
    await db.courses.update_one({"id": course_id}, {"$inc": {"totalStudents": 1}})
    await db.users.update_one({"id": user["id"]}, {"$inc": {"xp": 10}})
    enrollment.pop("_id", None)
    return {"enrollment": enrollment}

@r.post("/courses/{course_id}/progress")
async def progress(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    body = await request.json()
    lesson_id = body.get("lessonId")
    enrollment = await db.enrollments.find_one({"userId": user["id"], "courseId": course_id})
    if not enrollment:
        raise HTTPException(400, "Non iscritto a questo corso")
    completed = enrollment.get("completedLessons", [])
    if lesson_id not in completed:
        completed.append(lesson_id)
        await db.users.update_one({"id": user["id"]}, {"$inc": {"xp": 10}})
    total = await db.lessons.count_documents({"courseId": course_id})
    prog = round((len(completed) / total) * 100) if total > 0 else 0
    completed_at = datetime.now(timezone.utc).isoformat() if prog >= 100 else None
    await db.enrollments.update_one({"userId": user["id"], "courseId": course_id}, {"$set": {"completedLessons": completed, "progress": prog, "lastAccessedAt": datetime.now(timezone.utc).isoformat(), "completedAt": completed_at}})
    if prog >= 100 and not enrollment.get("completedAt"):
        await db.users.update_one({"id": user["id"]}, {"$inc": {"xp": 100}})
    enrollment["completedLessons"] = completed
    enrollment["progress"] = prog
    enrollment["completedAt"] = completed_at
    enrollment.pop("_id", None)
    return {"enrollment": enrollment, "completed": prog >= 100}

# ==================== REVIEWS ====================
@r.get("/courses/{course_id}/reviews")
async def get_reviews(course_id: str):
    reviews = await db.reviews.find({"courseId": course_id}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return {"reviews": reviews}

@r.post("/courses/{course_id}/reviews")
async def create_review(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    body = await request.json()
    rating = int(body.get("rating", 0))
    if rating < 1 or rating > 5:
        raise HTTPException(400, "Valutazione tra 1 e 5")
    existing = await db.reviews.find_one({"userId": user["id"], "courseId": course_id})
    if existing:
        raise HTTPException(400, "Hai gia recensito questo corso")
    review = {"id": new_id(), "userId": user["id"], "userName": user["name"], "userAvatar": user.get("avatar"), "courseId": course_id, "rating": rating, "comment": body.get("comment", ""), "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.reviews.insert_one(review)
    all_reviews = await db.reviews.find({"courseId": course_id}).to_list(1000)
    avg = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    await db.courses.update_one({"id": course_id}, {"$set": {"rating": round(avg, 1), "ratingCount": len(all_reviews)}})
    await db.users.update_one({"id": user["id"]}, {"$inc": {"xp": 20}})
    review.pop("_id", None)
    return {"review": review}

# ==================== CATEGORIES ====================
@r.get("/categories")
async def get_categories():
    await seed_database()
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    return {"categories": cats}

@r.post("/categories")
async def create_category(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    body = await request.json()
    import re
    slug = re.sub(r'[^a-z0-9]+', '-', body.get("name", "").lower())
    cat = {"id": new_id(), "name": body["name"], "slug": slug, "icon": body.get("icon", "\U0001f4da"), "description": body.get("description", ""), "courseCount": 0}
    await db.categories.insert_one(cat)
    cat.pop("_id", None)
    return {"category": cat}

# ==================== MODULES ====================
@r.post("/modules")
async def create_module(request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    body = await request.json()
    course_id = body.get("courseId")
    course = await db.courses.find_one({"id": course_id})
    if not course or (course.get("instructorId") != user["id"] and user["role"] != "admin"):
        raise HTTPException(403, "Non autorizzato")
    max_order = await db.modules.find({"courseId": course_id}).sort("order", -1).to_list(1)
    order = max_order[0]["order"] + 1 if max_order else 1
    module = {"id": new_id(), "courseId": course_id, "title": body.get("title", ""), "description": body.get("description", ""), "order": order}
    await db.modules.insert_one(module)
    module.pop("_id", None)
    return {"module": module}

@r.put("/modules/{module_id}")
async def update_module(module_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    body = await request.json()
    updates = {}
    if "title" in body: updates["title"] = body["title"]
    if "description" in body: updates["description"] = body["description"]
    if "order" in body: updates["order"] = body["order"]
    await db.modules.update_one({"id": module_id}, {"$set": updates})
    mod = await db.modules.find_one({"id": module_id}, {"_id": 0})
    return {"module": mod}

@r.delete("/modules/{module_id}")
async def delete_module(module_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    await db.lessons.delete_many({"moduleId": module_id})
    await db.modules.delete_one({"id": module_id})
    return {"message": "Modulo eliminato"}

@r.get("/modules/{module_id}/lessons")
async def module_lessons(module_id: str):
    lessons = await db.lessons.find({"moduleId": module_id}, {"_id": 0}).sort("order", 1).to_list(500)
    return {"lessons": lessons}

# ==================== LESSONS ====================
@r.post("/lessons")
async def create_lesson(request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    body = await request.json()
    module_id = body.get("moduleId")
    course_id = body.get("courseId")
    max_order = await db.lessons.find({"moduleId": module_id}).sort("order", -1).to_list(1)
    order = max_order[0]["order"] + 1 if max_order else 1
    lesson = {"id": new_id(), "moduleId": module_id, "courseId": course_id, "title": body.get("title", ""), "content": body.get("content", ""), "videoUrl": body.get("videoUrl"), "duration": int(body.get("duration", 0)), "order": order, "type": body.get("type", "text")}
    await db.lessons.insert_one(lesson)
    lessons = await db.lessons.find({"courseId": course_id}).to_list(1000)
    await db.courses.update_one({"id": course_id}, {"$set": {"totalLessons": len(lessons), "totalDuration": sum(l.get("duration", 0) for l in lessons)}})
    lesson.pop("_id", None)
    return {"lesson": lesson}

@r.put("/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    body = await request.json()
    updates = {}
    for f in ["title", "content", "videoUrl", "duration", "order", "type"]:
        if f in body:
            updates[f] = body[f]
    await db.lessons.update_one({"id": lesson_id}, {"$set": updates})
    updated = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    return {"lesson": updated}

@r.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    lesson = await db.lessons.find_one({"id": lesson_id})
    if lesson:
        await db.lessons.delete_one({"id": lesson_id})
        lessons = await db.lessons.find({"courseId": lesson["courseId"]}).to_list(1000)
        await db.courses.update_one({"id": lesson["courseId"]}, {"$set": {"totalLessons": len(lessons), "totalDuration": sum(l.get("duration", 0) for l in lessons)}})
    return {"message": "Lezione eliminata"}

@r.get("/lessons/{lesson_id}/subtitles")
async def get_subtitles(lesson_id: str):
    sub = await db.subtitles.find_one({"lessonId": lesson_id}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "Sottotitoli non trovati")
    return {"vttContent": sub.get("vttContent"), "language": sub.get("language"), "generatedAt": sub.get("generatedAt")}

# ==================== DASHBOARDS ====================
@r.get("/dashboard/student")
async def student_dashboard(request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    enrollments = await db.enrollments.find({"userId": user["id"]}, {"_id": 0}).to_list(100)
    course_ids = [e["courseId"] for e in enrollments]
    courses = await db.courses.find({"id": {"$in": course_ids}}, {"_id": 0}).to_list(100) if course_ids else []
    certificates = await db.certificates.find({"userId": user["id"]}, {"_id": 0}).to_list(100)
    enrolled_courses = []
    for e in enrollments:
        c = next((c for c in courses if c["id"] == e["courseId"]), None)
        if c:
            enrolled_courses.append({**e, "course": c})
    total_hours = sum(ec.get("course", {}).get("totalDuration", 0) for ec in enrolled_courses) / 3600
    completed_count = len([e for e in enrollments if e.get("progress", 0) >= 100])
    return {"enrolledCourses": enrolled_courses, "stats": {"totalCourses": len(enrollments), "completedCourses": completed_count, "totalHours": round(total_hours, 1), "certificates": len(certificates), "xp": user.get("xp", 0), "level": user.get("level", 1), "badges": user.get("badges", [])}, "certificates": certificates}

@r.get("/dashboard/instructor")
async def instructor_dashboard(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] not in ("instructor", "admin"):
        raise HTTPException(403, "Non autorizzato")
    courses = await db.courses.find({"instructorId": user["id"]}, {"_id": 0}).to_list(100)
    total_students = sum(c.get("totalStudents", 0) for c in courses)
    total_revenue = sum(c.get("price", 0) * c.get("totalStudents", 0) * 0.7 for c in courses)
    avg_rating = sum(c.get("rating", 0) for c in courses) / len(courses) if courses else 0
    course_ids = [c["id"] for c in courses]
    recent = await db.enrollments.find({"courseId": {"$in": course_ids}}, {"_id": 0}).sort("startedAt", -1).to_list(10) if course_ids else []
    months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu"]
    monthly = [{"month": m, "revenue": round(total_revenue / 6 * (0.7 + random.random() * 0.6)), "students": round(total_students / 6 * (0.7 + random.random() * 0.6))} for m in months]
    return {"courses": courses, "stats": {"totalStudents": total_students, "totalRevenue": round(total_revenue, 2), "totalCourses": len(courses), "avgRating": round(avg_rating, 1)}, "recentEnrollments": recent, "monthlyRevenue": monthly}

@r.get("/dashboard/admin")
async def admin_dashboard(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    total_users = await db.users.count_documents({})
    total_courses = await db.courses.count_documents({})
    total_enrollments = await db.enrollments.count_documents({})
    pending = await db.courses.find({"status": "pending"}, {"_id": 0}).to_list(100)
    published = await db.courses.count_documents({"status": "published"})
    students = await db.users.count_documents({"role": "student"})
    instructors = await db.users.count_documents({"role": "instructor"})
    all_courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
    total_revenue = sum(c.get("price", 0) * c.get("totalStudents", 0) * 0.3 for c in all_courses)
    return {"stats": {"totalUsers": total_users, "totalCourses": total_courses, "publishedCourses": published, "totalEnrollments": total_enrollments, "students": students, "instructors": instructors, "totalRevenue": round(total_revenue, 2), "pendingCount": len(pending)}, "pendingCourses": pending}

# ==================== ADMIN ====================
@r.get("/admin/users")
async def admin_users(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    params = request.query_params
    page = int(params.get("page", "1"))
    limit = int(params.get("limit", "20"))
    search = params.get("search", "")
    f = {}
    if search:
        f["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"email": {"$regex": search, "$options": "i"}}]
    total = await db.users.count_documents(f)
    users = await db.users.find(f, {"_id": 0, "password": 0}).skip((page-1)*limit).limit(limit).to_list(limit)
    return {"users": users, "total": total, "page": page, "limit": limit}

@r.get("/admin/users/{user_id}")
async def admin_get_user(user_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not target:
        raise HTTPException(404, "Utente non trovato")
    enrollments = await db.enrollments.find({"userId": user_id}, {"_id": 0}).to_list(100)
    courses = await db.courses.find({"instructorId": user_id}, {"_id": 0}).to_list(100) if target.get("role") == "instructor" else []
    reviews = await db.reviews.find({"userId": user_id}, {"_id": 0}).to_list(100)
    return {"user": target, "enrollments": enrollments, "courses": courses, "reviews": reviews}

@r.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    body = await request.json()
    updates = {}
    if body.get("role") in ["student", "instructor", "admin"]:
        updates["role"] = body["role"]
    if "banned" in body:
        updates["banned"] = body["banned"]
    await db.users.update_one({"id": user_id}, {"$set": updates})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return {"user": updated}

@r.put("/admin/users/{user_id}/suspend")
async def admin_suspend_user(user_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(404, "Utente non trovato")
    if target.get("role") == "admin":
        raise HTTPException(400, "Non puoi sospendere un admin")
    suspended = not target.get("suspended", False)
    await db.users.update_one({"id": user_id}, {"$set": {"suspended": suspended}})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return {"user": updated}

@r.put("/admin/courses/{course_id}/approve")
async def admin_approve_course(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    body = await request.json()
    status = body.get("status")
    if status not in ["published", "rejected"]:
        raise HTTPException(400, "Stato non valido")
    await db.courses.update_one({"id": course_id}, {"$set": {"status": status, "updatedAt": datetime.now(timezone.utc).isoformat()}})
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return {"course": course}

@r.get("/admin/courses")
async def admin_courses_list(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    params = request.query_params
    search = params.get("search", "")
    status = params.get("status", "")
    category = params.get("category", "")
    page = int(params.get("page", "1"))
    limit = int(params.get("limit", "20"))
    f = {}
    if search:
        f["$or"] = [{"title": {"$regex": search, "$options": "i"}}, {"instructorName": {"$regex": search, "$options": "i"}}]
    if status:
        f["status"] = status
    if category:
        f["category"] = category
    total = await db.courses.count_documents(f)
    courses = await db.courses.find(f, {"_id": 0}).sort("createdAt", -1).skip((page-1)*limit).limit(limit).to_list(limit)
    return {"courses": courses, "total": total, "page": page, "limit": limit}

@r.put("/admin/courses/{course_id}")
async def admin_edit_course(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    body = await request.json()
    allowed = ["title", "shortDescription", "description", "price", "category", "level", "language", "tags", "status", "thumbnail"]
    updates = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    for f in allowed:
        if f in body:
            updates[f] = body[f]
    if body.get("category"):
        cat = await db.categories.find_one({"slug": body["category"]})
        if cat:
            updates["categoryName"] = cat["name"]
    await db.courses.update_one({"id": course_id}, {"$set": updates})
    updated = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return {"course": updated}

@r.delete("/admin/courses/{course_id}")
async def admin_delete_course(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(404, "Corso non trovato")
    await db.courses.delete_one({"id": course_id})
    await db.modules.delete_many({"courseId": course_id})
    await db.lessons.delete_many({"courseId": course_id})
    await db.enrollments.delete_many({"courseId": course_id})
    await db.reviews.delete_many({"courseId": course_id})
    if course.get("category"):
        await db.categories.update_one({"slug": course["category"]}, {"$inc": {"courseCount": -1}})
    return {"message": "Corso eliminato"}

@r.get("/admin/analytics")
async def admin_analytics(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    total_users = await db.users.count_documents({})
    total_enrollments = await db.enrollments.count_documents({})
    all_courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
    total_revenue = sum(c.get("price", 0) * c.get("totalStudents", 0) for c in all_courses)
    daily_reg = [{"date": (datetime.now(timezone.utc)).isoformat()[:10], "count": max(1, random.randint(1, max(1, total_users // 15)))} for _ in range(30)]
    daily_enroll = [{"date": (datetime.now(timezone.utc)).isoformat()[:10], "count": max(1, random.randint(1, max(1, total_enrollments // 10)))} for _ in range(30)]
    months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu"]
    monthly_rev = [{"month": m, "revenue": round(total_revenue / 6 * (0.5 + random.random())), "enrollments": round(total_enrollments / 6 * (0.5 + random.random()))} for m in months]
    top_courses = await db.courses.find({"status": "published"}, {"_id": 0}).sort("totalStudents", -1).to_list(5)
    students = await db.users.count_documents({"role": "student"})
    instructors = await db.users.count_documents({"role": "instructor"})
    admins = await db.users.count_documents({"role": "admin"})
    published = await db.courses.count_documents({"status": "published"})
    pending = await db.courses.count_documents({"status": "pending"})
    rejected = await db.courses.count_documents({"status": "rejected"})
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    return {"dailyRegistrations": daily_reg, "dailyEnrollments": daily_enroll, "monthlyRevenue": monthly_rev, "topCourses": [{"id": c["id"], "title": c["title"], "students": c.get("totalStudents", 0), "revenue": round(c.get("price", 0) * c.get("totalStudents", 0), 2), "rating": c.get("rating", 0)} for c in top_courses], "userDistribution": [{"name": "Studenti", "value": students}, {"name": "Insegnanti", "value": instructors}, {"name": "Admin", "value": admins}], "courseDistribution": [{"name": "Pubblicati", "value": published}, {"name": "In attesa", "value": pending}, {"name": "Rifiutati", "value": rejected}], "categoryDistribution": [{"name": c["name"], "count": c.get("courseCount", 0)} for c in cats if c.get("courseCount", 0) > 0], "totals": {"totalRevenue": round(total_revenue, 2), "totalUsers": total_users, "totalEnrollments": total_enrollments, "platformFee": round(total_revenue * 0.3, 2)}}

@r.get("/admin/reviews")
async def admin_reviews(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    params = request.query_params
    page = int(params.get("page", "1"))
    limit = int(params.get("limit", "20"))
    course_id = params.get("courseId", "")
    f = {}
    if course_id:
        f["courseId"] = course_id
    total = await db.reviews.count_documents(f)
    reviews = await db.reviews.find(f, {"_id": 0}).sort("createdAt", -1).skip((page-1)*limit).limit(limit).to_list(limit)
    cids = list(set(r["courseId"] for r in reviews))
    courses = await db.courses.find({"id": {"$in": cids}}, {"_id": 0}).to_list(100) if cids else []
    enriched = [{**r, "courseName": next((c["title"] for c in courses if c["id"] == r["courseId"]), "N/A")} for r in reviews]
    return {"reviews": enriched, "total": total, "page": page, "limit": limit}

@r.delete("/admin/reviews/{review_id}")
async def admin_delete_review(review_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(404, "Recensione non trovata")
    await db.reviews.delete_one({"id": review_id})
    remaining = await db.reviews.find({"courseId": review["courseId"]}).to_list(1000)
    avg = sum(r["rating"] for r in remaining) / len(remaining) if remaining else 0
    await db.courses.update_one({"id": review["courseId"]}, {"$set": {"rating": round(avg, 1), "ratingCount": len(remaining)}})
    return {"message": "Recensione eliminata"}

@r.put("/admin/categories/{cat_id}")
async def admin_update_category(cat_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    body = await request.json()
    import re
    updates = {}
    if body.get("name"):
        updates["name"] = body["name"]
        updates["slug"] = re.sub(r'[^a-z0-9]+', '-', body["name"].lower())
    if body.get("icon"):
        updates["icon"] = body["icon"]
    if "description" in body:
        updates["description"] = body["description"]
    await db.categories.update_one({"id": cat_id}, {"$set": updates})
    updated = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    return {"category": updated}

@r.delete("/admin/categories/{cat_id}")
async def admin_delete_category(cat_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    cat = await db.categories.find_one({"id": cat_id})
    if not cat:
        raise HTTPException(404, "Categoria non trovata")
    if cat.get("courseCount", 0) > 0:
        raise HTTPException(400, "Impossibile eliminare: ci sono corsi in questa categoria")
    await db.categories.delete_one({"id": cat_id})
    return {"message": "Categoria eliminata"}

@r.get("/admin/payments")
async def admin_payments(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    params = request.query_params
    page = int(params.get("page", "1"))
    limit = int(params.get("limit", "20"))
    enrollments = await db.enrollments.find({}, {"_id": 0}).sort("startedAt", -1).skip((page-1)*limit).limit(limit).to_list(limit)
    total = await db.enrollments.count_documents({})
    uids = list(set(e["userId"] for e in enrollments))
    cids = list(set(e["courseId"] for e in enrollments))
    users = await db.users.find({"id": {"$in": uids}}, {"_id": 0, "password": 0}).to_list(100) if uids else []
    courses = await db.courses.find({"id": {"$in": cids}}, {"_id": 0}).to_list(100) if cids else []
    payments = []
    for e in enrollments:
        c = next((c for c in courses if c["id"] == e["courseId"]), None)
        u = next((u for u in users if u["id"] == e["userId"]), None)
        payments.append({"id": e["id"], "userId": e["userId"], "userName": u.get("name", "N/A") if u else "N/A", "userEmail": u.get("email", "") if u else "", "courseId": e["courseId"], "courseName": c.get("title", "N/A") if c else "N/A", "amount": c.get("price", 0) if c else 0, "platformFee": round((c.get("price", 0) if c else 0) * 0.3, 2), "instructorPayout": round((c.get("price", 0) if c else 0) * 0.7, 2), "status": "completed", "method": "Stripe (demo)", "date": e.get("startedAt")})
    return {"payments": payments, "total": total, "page": page, "limit": limit}

@r.get("/admin/reports")
async def admin_reports(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    params = request.query_params
    rtype = params.get("type", "summary")
    if rtype == "users":
        users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(10000)
        return {"report": users, "type": "users", "count": len(users)}
    if rtype == "courses":
        courses = await db.courses.find({}, {"_id": 0}).to_list(10000)
        return {"report": courses, "type": "courses", "count": len(courses)}
    if rtype == "enrollments":
        enrollments = await db.enrollments.find({}, {"_id": 0}).to_list(10000)
        return {"report": enrollments, "type": "enrollments", "count": len(enrollments)}
    total_users = await db.users.count_documents({})
    total_courses = await db.courses.count_documents({})
    total_enrollments = await db.enrollments.count_documents({})
    all_courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
    total_revenue = sum(c.get("price", 0) * c.get("totalStudents", 0) for c in all_courses)
    return {"report": {"totalUsers": total_users, "totalCourses": total_courses, "totalEnrollments": total_enrollments, "totalRevenue": round(total_revenue, 2), "platformFee": round(total_revenue * 0.3, 2)}, "type": "summary"}

# ==================== COMMUNITY ====================
@r.get("/community/posts")
async def get_posts(request: Request):
    params = request.query_params
    course_id = params.get("courseId", "")
    page = int(params.get("page", "1"))
    limit = int(params.get("limit", "20"))
    f = {}
    if course_id:
        f["courseId"] = course_id
    total = await db.forumPosts.count_documents(f)
    posts = await db.forumPosts.find(f, {"_id": 0}).sort("createdAt", -1).skip((page-1)*limit).limit(limit).to_list(limit)
    return {"posts": posts, "total": total, "page": page, "limit": limit}

@r.post("/community/posts")
async def create_post(request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    body = await request.json()
    if not body.get("title") or not body.get("content"):
        raise HTTPException(400, "Titolo e contenuto sono obbligatori")
    post = {"id": new_id(), "courseId": body.get("courseId"), "userId": user["id"], "userName": user["name"], "userAvatar": user.get("avatar"), "title": body["title"], "content": body["content"], "upvotes": 0, "upvotedBy": [], "commentCount": 0, "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.forumPosts.insert_one(post)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"xp": 15}})
    post.pop("_id", None)
    return {"post": post}

@r.get("/community/posts/{post_id}")
async def get_post(post_id: str):
    post = await db.forumPosts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Post non trovato")
    comments = await db.comments.find({"postId": post_id}, {"_id": 0}).sort("createdAt", 1).to_list(100)
    return {"post": post, "comments": comments}

@r.post("/community/posts/{post_id}/comments")
async def add_comment(post_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    body = await request.json()
    if not body.get("content"):
        raise HTTPException(400, "Contenuto obbligatorio")
    comment = {"id": new_id(), "postId": post_id, "userId": user["id"], "userName": user["name"], "userAvatar": user.get("avatar"), "content": body["content"], "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.comments.insert_one(comment)
    await db.forumPosts.update_one({"id": post_id}, {"$inc": {"commentCount": 1}})
    comment.pop("_id", None)
    return {"comment": comment}

@r.post("/community/posts/{post_id}/upvote")
async def upvote_post(post_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    post = await db.forumPosts.find_one({"id": post_id})
    if not post:
        raise HTTPException(404, "Post non trovato")
    upvoted = post.get("upvotedBy", [])
    if user["id"] in upvoted:
        await db.forumPosts.update_one({"id": post_id}, {"$pull": {"upvotedBy": user["id"]}, "$inc": {"upvotes": -1}})
    else:
        await db.forumPosts.update_one({"id": post_id}, {"$push": {"upvotedBy": user["id"]}, "$inc": {"upvotes": 1}})
    updated = await db.forumPosts.find_one({"id": post_id}, {"_id": 0})
    return {"post": updated}

# ==================== GAMIFICATION ====================
@r.get("/gamification/profile")
async def gamification_profile(request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    enrollments = await db.enrollments.find({"userId": user["id"]}).to_list(100)
    reviews = await db.reviews.count_documents({"userId": user["id"]})
    posts = await db.forumPosts.count_documents({"userId": user["id"]})
    xp = user.get("xp", 0)
    level, level_name, next_xp = 1, "Principiante", 100
    if xp > 1500: level, level_name, next_xp = 6, "Maestro", 2000
    elif xp > 1000: level, level_name, next_xp = 5, "Esperto", 1500
    elif xp > 600: level, level_name, next_xp = 4, "Studioso", 1000
    elif xp > 300: level, level_name, next_xp = 3, "Apprendista", 600
    elif xp > 100: level, level_name, next_xp = 2, "Esploratore", 300
    badge_defs = {"first_course": {"name": "Primo Corso", "icon": "\U0001f393", "description": "Hai completato il tuo primo corso!"}, "fast_learner": {"name": "Apprendista Veloce", "icon": "\u26a1", "description": "Hai completato 5 corsi!"}, "master": {"name": "Maestro", "icon": "\U0001f451", "description": "Hai completato 10 corsi!"}, "top_instructor": {"name": "Top Insegnante", "icon": "\U0001f3c6", "description": "Insegnante con rating alto!"}, "community_star": {"name": "Star Community", "icon": "\U0001f31f", "description": "10 post nel forum!"}}
    user_badges = [badge_defs.get(b, {"name": b, "icon": "\U0001f3c5", "description": ""}) for b in user.get("badges", [])]
    return {"xp": xp, "level": level, "levelName": level_name, "nextLevelXp": next_xp, "badges": user_badges, "stats": {"coursesEnrolled": len(enrollments), "coursesCompleted": len([e for e in enrollments if e.get("progress", 0) >= 100]), "reviewsWritten": reviews, "forumPosts": posts}}

@r.get("/gamification/leaderboard")
async def leaderboard():
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("xp", -1).to_list(20)
    return {"leaderboard": [{"rank": i+1, "name": u.get("name", ""), "xp": u.get("xp", 0), "level": u.get("level", 1), "badges": u.get("badges", [])} for i, u in enumerate(users)]}

# ==================== AI (Mock) ====================
@r.post("/ai/{action}")
async def ai_handler(action: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    body = await request.json()
    mocks = {
        "course-structure": {"result": {"title": body.get("topic", "Nuovo Corso"), "modules": [{"title": "Introduzione", "lessons": ["Benvenuto al corso", "Panoramica degli argomenti", "Setup ambiente"]}, {"title": "Fondamenti", "lessons": ["Concetti base", "Primi esercizi", "Quiz fondamenti"]}, {"title": "Pratica Avanzata", "lessons": ["Progetto guidato", "Esercizi avanzati", "Progetto finale"]}]}, "note": "Risposta demo"},
        "description": {"result": f"Scopri tutto su \"{body.get('title', 'questo argomento')}\" in questo corso completo.", "note": "Risposta demo"},
        "summary": {"result": "Questa lezione copre i concetti fondamentali dell'argomento, con focus su applicazioni pratiche.", "note": "Risposta demo"},
        "quiz": {"result": [{"question": "Qual e il concetto principale?", "options": ["A", "B", "C", "D"], "correct": 0}, {"question": "Quale vantaggio?", "options": ["Velocita", "Semplicita", "Scalabilita", "Tutte"], "correct": 3}], "note": "Risposta demo"},
        "chat": {"result": "Ciao! Sono il tuo assistente AI. Funziono in modalita demo.", "note": "Risposta demo"},
    }
    return mocks.get(action, {"result": "Azione non supportata", "note": "Risposta demo"})

# ==================== CERTIFICATES ====================
@r.post("/certificates/generate")
async def generate_certificate(request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    body = await request.json()
    course_id = body.get("courseId")
    enrollment = await db.enrollments.find_one({"userId": user["id"], "courseId": course_id, "progress": 100})
    if not enrollment:
        raise HTTPException(400, "Devi completare il corso per ottenere il certificato")
    existing = await db.certificates.find_one({"userId": user["id"], "courseId": course_id}, {"_id": 0})
    if existing:
        return {"certificate": existing}
    course = await db.courses.find_one({"id": course_id})
    code = f"LH-{new_id()[:8].upper()}"
    cert = {"id": new_id(), "userId": user["id"], "courseId": course_id, "userName": user["name"], "courseName": course.get("title", "Corso") if course else "Corso", "instructorName": course.get("instructorName", "") if course else "", "certificateCode": code, "issuedAt": datetime.now(timezone.utc).isoformat()}
    await db.certificates.insert_one(cert)
    cert.pop("_id", None)
    return {"certificate": cert}

@r.get("/certificates/{code}/verify")
async def verify_certificate_new(code: str):
    cert = await db.certificates.find_one({"$or": [{"certificateCode": code}, {"verificationCode": code}]}, {"_id": 0})
    if not cert:
        raise HTTPException(404, "Certificato non trovato")
    return {"valid": True, "certificate": {"userName": cert.get("userName"), "courseName": cert.get("courseName"), "instructorName": cert.get("instructorName"), "issuedAt": cert.get("issuedAt"), "certificateCode": cert.get("certificateCode")}}

@r.get("/certificates/{code}")
async def verify_certificate(code: str):
    cert = await db.certificates.find_one({"certificateCode": code}, {"_id": 0})
    if not cert:
        raise HTTPException(404, "Certificato non trovato")
    return {"certificate": cert, "valid": True}

# ==================== INSTRUCTOR (Extended) ====================
@r.get("/instructor/dashboard")
async def instructor_dashboard_new(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    courses = await db.courses.find({"instructorId": user["id"]}, {"_id": 0}).to_list(100)
    course_ids = [c["id"] for c in courses]
    total_students = await db.enrollments.count_documents({"courseId": {"$in": course_ids}}) if course_ids else 0
    total_revenue = sum((c.get("price", 0) * c.get("enrolledCount", 0)) for c in courses)
    avg_rating = sum(c.get("rating", 0) for c in courses) / len(courses) if courses else 0
    by_status = {"draft": len([c for c in courses if c.get("status") == "draft"]), "pending": len([c for c in courses if c.get("status") == "pending_review"]), "published": len([c for c in courses if c.get("status") == "published"]), "rejected": len([c for c in courses if c.get("status") == "rejected"])}
    return {"courses": courses, "stats": {"totalCourses": len(courses), "totalStudents": total_students, "totalRevenue": total_revenue, "avgRating": f"{avg_rating:.1f}", "byStatus": by_status}}

@r.get("/instructor/courses")
async def instructor_courses_list(request: Request):
    return await instructor_dashboard_new(request)

@r.post("/instructor/courses")
async def instructor_create_course(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    body = await request.json()
    cover = body.get("coverImage") or body.get("thumbnail")
    course = {"id": new_id(), "title": body.get("title", "Nuovo Corso"), "subtitle": body.get("subtitle", ""), "description": body.get("description", ""), "shortDescription": body.get("shortDescription", ""), "instructorId": user["id"], "instructorName": user["name"], "category": body.get("category", "web-development"), "level": body.get("level", "beginner"), "language": body.get("language", "it"), "price": float(body.get("price", 0)), "coverImage": cover, "thumbnail": cover, "coverType": body.get("coverType", "default"), "status": "draft", "objectives": body.get("objectives", []), "requirements": body.get("requirements", []), "targetStudents": body.get("targetStudents", ""), "totalDuration": 0, "totalLessons": 0, "enrolledCount": 0, "totalStudents": 0, "rating": 0, "ratingCount": 0, "reviewCount": 0, "createdAt": datetime.now(timezone.utc).isoformat(), "updatedAt": datetime.now(timezone.utc).isoformat()}
    await db.courses.insert_one(course)
    course.pop("_id", None)
    return {"course": course}

@r.put("/instructor/courses/{course_id}")
async def instructor_update_course(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    body = await request.json()
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(404, "Corso non trovato")
    if course.get("instructorId") != user["id"]:
        raise HTTPException(403, "Non autorizzato")
    allowed = ["title", "subtitle", "description", "shortDescription", "category", "level", "language", "price", "coverImage", "coverType", "objectives", "requirements", "targetStudents", "thumbnail"]
    updates = {}
    for f in allowed:
        if f in body:
            updates[f] = body[f]
    if updates.get("coverImage"):
        updates["thumbnail"] = updates["coverImage"]
    elif updates.get("thumbnail"):
        updates["coverImage"] = updates["thumbnail"]
    updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
    await db.courses.update_one({"id": course_id}, {"$set": updates})
    updated = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return {"course": updated}

@r.delete("/instructor/courses/{course_id}")
async def instructor_delete_course(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(404, "Corso non trovato")
    if course.get("instructorId") != user["id"]:
        raise HTTPException(403, "Non autorizzato")
    await db.modules.delete_many({"courseId": course_id})
    await db.lessons.delete_many({"courseId": course_id})
    await db.courses.delete_one({"id": course_id})
    return {"message": "Corso eliminato con successo"}

@r.post("/instructor/courses/{course_id}/duplicate")
async def instructor_duplicate_course(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(404, "Corso non trovato")
    if course.get("instructorId") != user["id"]:
        raise HTTPException(403, "Non autorizzato")
    new_cid = new_id()
    new_course = {**course, "id": new_cid, "title": f"{course['title']} (Copia)", "status": "draft", "enrolledCount": 0, "rating": 0, "reviewCount": 0, "createdAt": datetime.now(timezone.utc).isoformat(), "updatedAt": datetime.now(timezone.utc).isoformat()}
    await db.courses.insert_one(new_course)
    modules = await db.modules.find({"courseId": course_id}, {"_id": 0}).to_list(100)
    for mod in modules:
        old_mid = mod["id"]
        new_mid = new_id()
        new_mod = {**mod, "id": new_mid, "courseId": new_cid}
        await db.modules.insert_one(new_mod)
        lessons = await db.lessons.find({"moduleId": old_mid}, {"_id": 0}).to_list(500)
        for lesson in lessons:
            new_lesson = {**lesson, "id": new_id(), "courseId": new_cid, "moduleId": new_mid}
            await db.lessons.insert_one(new_lesson)
    new_course.pop("_id", None)
    return {"course": new_course}

@r.put("/instructor/courses/{course_id}/status")
async def instructor_course_status(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    body = await request.json()
    status = body.get("status")
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(404, "Corso non trovato")
    if course.get("instructorId") != user["id"]:
        raise HTTPException(403, "Non autorizzato")
    if status not in ["draft", "pending_review"]:
        raise HTTPException(400, "Stato non valido")
    await db.courses.update_one({"id": course_id}, {"$set": {"status": status, "updatedAt": datetime.now(timezone.utc).isoformat()}})
    return {"message": f"Stato aggiornato a {status}"}

@r.post("/instructor/courses/{course_id}/sections")
async def instructor_create_section(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    body = await request.json()
    course = await db.courses.find_one({"id": course_id})
    if not course or course.get("instructorId") != user["id"]:
        raise HTTPException(403, "Non autorizzato")
    max_order = await db.modules.find({"courseId": course_id}).sort("order", -1).to_list(1)
    order = max_order[0]["order"] + 1 if max_order else 1
    section = {"id": new_id(), "courseId": course_id, "title": body.get("title", "Nuova Sezione"), "description": body.get("description", ""), "order": order, "totalDuration": 0, "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.modules.insert_one(section)
    section.pop("_id", None)
    return {"section": section}

@r.put("/instructor/sections/{section_id}")
async def instructor_update_section(section_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] not in ("instructor", "admin"):
        raise HTTPException(403, "Non autenticato come insegnante")
    body = await request.json()
    section = await db.modules.find_one({"id": section_id})
    if not section:
        raise HTTPException(404, "Sezione non trovata")
    course = await db.courses.find_one({"id": section["courseId"]})
    if course.get("instructorId") != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Non autorizzato")
    updates = {}
    if "title" in body: updates["title"] = body["title"]
    if "description" in body: updates["description"] = body["description"]
    if "order" in body: updates["order"] = body["order"]
    await db.modules.update_one({"id": section_id}, {"$set": updates})
    updated = await db.modules.find_one({"id": section_id}, {"_id": 0})
    return {"section": updated}

@r.delete("/instructor/sections/{section_id}")
async def instructor_delete_section(section_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    section = await db.modules.find_one({"id": section_id})
    if not section:
        raise HTTPException(404, "Sezione non trovata")
    course = await db.courses.find_one({"id": section["courseId"]})
    if course.get("instructorId") != user["id"]:
        raise HTTPException(403, "Non autorizzato")
    await db.lessons.delete_many({"moduleId": section_id})
    await db.modules.delete_one({"id": section_id})
    # Recalculate
    lessons = await db.lessons.find({"courseId": section["courseId"]}).to_list(1000)
    await db.courses.update_one({"id": section["courseId"]}, {"$set": {"totalLessons": len(lessons), "totalDuration": sum(l.get("duration", 0) for l in lessons)}})
    return {"message": "Sezione eliminata"}

@r.post("/instructor/sections/{section_id}/lessons")
async def instructor_create_lesson(section_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    body = await request.json()
    section = await db.modules.find_one({"id": section_id})
    if not section:
        raise HTTPException(404, "Sezione non trovata")
    course = await db.courses.find_one({"id": section["courseId"]})
    if course.get("instructorId") != user["id"]:
        raise HTTPException(403, "Non autorizzato")
    max_order = await db.lessons.find({"moduleId": section_id}).sort("order", -1).to_list(1)
    order = max_order[0]["order"] + 1 if max_order else 1
    duration = 0
    ltype = body.get("type", "text")
    if ltype == "video": duration = int(body.get("videoDuration", 0))
    elif ltype == "pdf": duration = int(body.get("pdfPages", 10)) * 2 * 60
    elif ltype == "text":
        words = len((body.get("textContent", "") or "").split())
        duration = math.ceil((words / 200) * 60)
    lesson = {"id": new_id(), "moduleId": section_id, "courseId": section["courseId"], "title": body.get("title", "Nuova Lezione"), "description": body.get("description", ""), "type": ltype, "order": order, "duration": duration, "videoUrl": body.get("videoUrl"), "videoFile": body.get("videoFile"), "videoDuration": int(body.get("videoDuration", 0)), "pdfUrl": body.get("pdfUrl"), "pdfFile": body.get("pdfFile"), "pdfPages": int(body.get("pdfPages", 0)), "pdfDownloadable": body.get("pdfDownloadable", False), "textContent": body.get("textContent", ""), "richTextContent": body.get("richTextContent", ""), "isPreview": body.get("isPreview", False), "isRequired": body.get("isRequired", True), "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.lessons.insert_one(lesson)
    # Recalculate
    all_lessons = await db.lessons.find({"courseId": section["courseId"]}).to_list(1000)
    await db.courses.update_one({"id": section["courseId"]}, {"$set": {"totalLessons": len(all_lessons), "totalDuration": sum(l.get("duration", 0) for l in all_lessons)}})
    sec_lessons = await db.lessons.find({"moduleId": section_id}).to_list(1000)
    await db.modules.update_one({"id": section_id}, {"$set": {"totalDuration": sum(l.get("duration", 0) for l in sec_lessons)}})
    lesson.pop("_id", None)
    return {"lesson": lesson}

@r.put("/instructor/lessons/{lesson_id}")
async def instructor_update_lesson(lesson_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    body = await request.json()
    lesson = await db.lessons.find_one({"id": lesson_id})
    if not lesson:
        raise HTTPException(404, "Lezione non trovata")
    course = await db.courses.find_one({"id": lesson["courseId"]})
    if course.get("instructorId") != user["id"]:
        raise HTTPException(403, "Non autorizzato")
    updates = {}
    for f in ["title", "description", "type", "order", "videoUrl", "videoFile", "videoDuration", "pdfUrl", "pdfFile", "pdfPages", "pdfDownloadable", "textContent", "richTextContent", "isPreview", "isRequired"]:
        if f in body:
            updates[f] = body[f]
    await db.lessons.update_one({"id": lesson_id}, {"$set": updates})
    # Recalculate
    all_lessons = await db.lessons.find({"courseId": lesson["courseId"]}).to_list(1000)
    await db.courses.update_one({"id": lesson["courseId"]}, {"$set": {"totalLessons": len(all_lessons), "totalDuration": sum(l.get("duration", 0) for l in all_lessons)}})
    updated = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    return {"lesson": updated}

@r.delete("/instructor/lessons/{lesson_id}")
async def instructor_delete_lesson(lesson_id: str, request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    lesson = await db.lessons.find_one({"id": lesson_id})
    if not lesson:
        raise HTTPException(404, "Lezione non trovata")
    course = await db.courses.find_one({"id": lesson["courseId"]})
    if course.get("instructorId") != user["id"]:
        raise HTTPException(403, "Non autorizzato")
    await db.lessons.delete_one({"id": lesson_id})
    all_lessons = await db.lessons.find({"courseId": lesson["courseId"]}).to_list(1000)
    await db.courses.update_one({"id": lesson["courseId"]}, {"$set": {"totalLessons": len(all_lessons), "totalDuration": sum(l.get("duration", 0) for l in all_lessons)}})
    return {"message": "Lezione eliminata"}

@r.post("/instructor/upload")
async def instructor_upload(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] not in ("instructor", "admin"):
        raise HTTPException(403, "Non autenticato come insegnante")
    
    form = await request.form()
    file = form.get("file")
    file_type = form.get("type", "image")
    
    if not file:
        raise HTTPException(400, "Nessun file fornito")
    
    content = await file.read()
    ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
    filename = f"{new_id()}{ext}"
    
    subdir = "images"
    if file_type == "video": subdir = "videos"
    elif file_type in ("pdf", "document"): subdir = "pdfs"
    
    file_path = UPLOAD_DIR / subdir / filename
    async with aiofiles.open(str(file_path), 'wb') as f:
        await f.write(content)
    
    # Get duration for videos (approximate from file size)
    duration = 0
    if file_type == "video":
        # Rough estimate: ~1MB per 10 seconds at medium quality
        duration = max(1, int(len(content) / (1024 * 1024) * 10))
    
    url = f"/api/uploads/{subdir}/{filename}"
    return {"url": url, "filename": file.filename, "size": len(content), "type": file_type, "duration": duration}

@r.post("/instructor/generate-cover")
async def instructor_generate_cover(request: Request):
    user = await get_auth_user(request)
    if not user or user["role"] != "instructor":
        raise HTTPException(403, "Non autenticato come insegnante")
    return {"url": "", "message": "Generazione copertina non disponibile in questa configurazione."}

# ==================== STUDENT (Extended) ====================
@r.post("/student/lessons/{lesson_id}/complete")
async def student_complete_lesson(lesson_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    lesson = await db.lessons.find_one({"id": lesson_id})
    if not lesson:
        raise HTTPException(404, "Lezione non trovata")
    enrollment = await db.enrollments.find_one({"userId": user["id"], "courseId": lesson["courseId"]})
    if not enrollment:
        enrollment = {"id": new_id(), "userId": user["id"], "courseId": lesson["courseId"], "completedLessons": [], "progress": 0, "enrolledAt": datetime.now(timezone.utc).isoformat(), "lastAccessedAt": datetime.now(timezone.utc).isoformat()}
        await db.enrollments.insert_one(enrollment)
    completed = enrollment.get("completedLessons", [])
    if lesson_id not in completed:
        completed.append(lesson_id)
        total = await db.lessons.count_documents({"courseId": lesson["courseId"], "isRequired": True})
        if total == 0:
            total = await db.lessons.count_documents({"courseId": lesson["courseId"]})
        prog = math.floor((len(completed) / total) * 100) if total > 0 else 0
        updates = {"completedLessons": completed, "progress": prog, "lastAccessedAt": datetime.now(timezone.utc).isoformat()}
        if prog >= 100:
            updates["completedAt"] = datetime.now(timezone.utc).isoformat()
        await db.enrollments.update_one({"id": enrollment["id"]}, {"$set": updates})
        return {"progress": prog, "completed": prog >= 100}
    return {"progress": enrollment.get("progress", 0), "completed": enrollment.get("progress", 0) >= 100}

@r.get("/student/courses/{course_id}/progress")
async def student_course_progress(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    enrollment = await db.enrollments.find_one({"userId": user["id"], "courseId": course_id}, {"_id": 0})
    if not enrollment:
        return {"progress": 0, "completedLessons": [], "completed": False}
    return {"progress": enrollment.get("progress", 0), "completedLessons": enrollment.get("completedLessons", []), "completed": enrollment.get("progress", 0) >= 100, "completedAt": enrollment.get("completedAt")}

@r.get("/student/courses/{course_id}/certificate")
async def student_get_certificate(course_id: str, request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    enrollment = await db.enrollments.find_one({"userId": user["id"], "courseId": course_id, "progress": 100})
    if not enrollment:
        raise HTTPException(403, "Devi completare il corso al 100%")
    cert = await db.certificates.find_one({"userId": user["id"], "courseId": course_id}, {"_id": 0})
    if cert:
        return {"certificate": cert}
    course = await db.courses.find_one({"id": course_id})
    code = f"LH-{new_id()[:8].upper()}"
    cert = {"id": new_id(), "userId": user["id"], "courseId": course_id, "userName": user["name"], "courseName": course.get("title", "Corso") if course else "Corso", "courseSubtitle": course.get("subtitle", "") if course else "", "instructorName": course.get("instructorName", "") if course else "", "certificateCode": code, "verificationCode": code, "issuedAt": datetime.now(timezone.utc).isoformat()}
    await db.certificates.insert_one(cert)
    cert.pop("_id", None)
    return {"certificate": cert}

# ==================== SUBTITLES ====================
@r.post("/subtitles/save")
async def save_subtitles(request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(403, "Non autorizzato")
    body = await request.json()
    lesson_id = body.get("lessonId")
    vtt = body.get("vttContent")
    lang = body.get("language", "it")
    if not lesson_id or not vtt:
        raise HTTPException(400, "lessonId e vttContent sono obbligatori")
    sid = new_id()
    await db.subtitles.update_one({"lessonId": lesson_id}, {"$set": {"id": sid, "lessonId": lesson_id, "vttContent": vtt, "language": lang, "generatedAt": datetime.now(timezone.utc).isoformat(), "generatedBy": user["id"]}}, upsert=True)
    await db.lessons.update_one({"id": lesson_id}, {"$set": {"hasSubtitles": True, "subtitlesLanguage": lang}})
    return {"success": True, "subtitleId": sid, "message": "Sottotitoli salvati con successo"}

# ==================== UPLOAD ====================
@r.post("/upload")
async def upload_file(request: Request):
    user = await get_auth_user(request)
    if not user:
        raise HTTPException(401, "Non autenticato")
    
    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(400, "Nessun file fornito")
    
    content = await file.read()
    ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
    filename = f"{new_id()}{ext}"
    
    file_path = UPLOAD_DIR / "images" / filename
    async with aiofiles.open(str(file_path), 'wb') as f:
        await f.write(content)
    
    url = f"/api/uploads/images/{filename}"
    return {"url": url, "filename": file.filename, "size": len(content)}

# ==================== HEALTH ====================
@r.get("/")
async def root():
    return {"message": "LearnHub API running"}

@r.get("/health")
async def health():
    return {"status": "healthy", "service": "learnhub"}

# Include router
app.include_router(r)

@app.on_event("shutdown")
async def shutdown():
    client.close()
