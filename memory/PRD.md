# LearnHub PRD

## Problem Statement
Clone https://github.com/andrew14420100/LearnHub-1.git and fix 500 Internal Server Error on all API endpoints. Then fix file upload (502 on video serving, empty URLs). Create comprehensive README.

## Architecture
- **Frontend**: React CRA + Craco + Tailwind CSS (port 3000)
- **Backend**: FastAPI Python (port 8001)
- **Database**: MongoDB (learnhub)
- **File Storage**: Local (/app/backend/uploads/) served via streaming endpoint

## User Personas
- **Admin**: Platform management, user moderation, analytics
- **Instructor**: Course creation, content management, upload media
- **Student**: Course browsing, enrollment, progress tracking, certificates

## Core Requirements
- Multi-role authentication (JWT)
- Course CRUD with modules and lessons
- File upload (images, videos, PDFs) with streaming
- Student enrollment and progress tracking
- Certificate generation
- Community forum with gamification
- Admin dashboard with analytics

## What's Been Implemented
- [2025-04-08] Ported all 60+ API routes from Next.js route.js to FastAPI server.py
- [2025-04-08] Fixed all 500 errors (init, login, categories, courses, etc.)
- [2025-04-08] Implemented local file upload with streaming (images, videos, PDFs)
- [2025-04-08] Fixed 502 on video serving with async streaming + Range requests
- [2025-04-08] Updated frontend to use REACT_APP_BACKEND_URL for all API calls
- [2025-04-08] Added resolveUrl() for uploaded media display
- [2025-04-08] Created comprehensive README.md in Italian

## Prioritized Backlog
### P0 (Done)
- Fix 500 errors on all endpoints
- Fix file upload and serving
- README documentation

### P1 (Next)
- Integrate real AI for course structure generation (OpenAI/Gemini)
- Implement Cloudinary for production file storage
- PDF certificate generation with jsPDF equivalent in Python
- Real payment integration (Stripe)

### P2 (Future)
- Email notifications (enrollment, certificate)
- Real-time chat/WebSocket for community
- Course ratings aggregation pipeline
- Advanced search with MongoDB text indexes
- Mobile-responsive video player improvements
- Social login (Google OAuth)

## Next Tasks
- Test all instructor flows end-to-end
- Add proper error handling for large file uploads
- Implement AI-powered course structure generation
- Add Cloudinary integration for scalable file storage
