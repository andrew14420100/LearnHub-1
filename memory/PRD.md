# LearnHub PRD

## Problem Statement
Clone https://github.com/andrew14420100/LearnHub-1.git, fix 500 errors, fix file uploads, restructure as single Next.js project deployable on Vercel.

## Final Architecture (Vercel-ready)
- **Single Next.js 14 project** with App Router
- **API**: `app/api/[[...path]]/route.js` (monolithic catch-all route handler)
- **Frontend**: `app/page.js` (SPA React)
- **Database**: MongoDB (via `lib/mongodb.js` singleton)
- **Upload**: Cloudinary (primary) + local fallback (`public/uploads/`)
- **UI**: Shadcn/UI (48 components) + TailwindCSS

## What's Been Implemented
- [2025-04-08] Fixed all 500 errors by porting API to FastAPI (Emergent preview)
- [2025-04-08] Fixed file upload with streaming + Range requests
- [2025-04-08] Restructured as single Next.js project (Vercel-deployable)
- [2025-04-08] Created comprehensive README.md
- [2025-04-08] Created .env.example with all required variables
- [2025-04-08] Copied all 48 Shadcn/UI components + custom components
- [2025-04-08] Set up lib/, hooks/, public/uploads/ directories

## Deploy Instructions
1. Push to GitHub
2. Import on Vercel
3. Set env vars: MONGO_URL (Atlas), DB_NAME, JWT_SECRET, CLOUDINARY_*
4. Deploy

## Credentials
- admin@learnhub.it / admin123
- marco@learnhub.it / marco123
- laura@learnhub.it / laura123
- student@learnhub.it / student123
