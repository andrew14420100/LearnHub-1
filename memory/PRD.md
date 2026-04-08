# LearnHub PRD

## Problem Statement
Clone https://github.com/andrew14420100/LearnHub-1.git and fix 500 Internal Server Error on all API endpoints. Then fix file upload (502 on video serving, empty URLs). Create comprehensive README matching original style.

## Architecture
- **Frontend**: React CRA + Craco + Tailwind CSS (port 3000)
- **Backend**: FastAPI Python (port 8001)
- **Database**: MongoDB (learnhub)
- **File Storage**: Local (/app/backend/uploads/) served via streaming endpoint with Range support

## What's Been Implemented
- [2025-04-08] Ported all 60+ API routes from Next.js route.js to FastAPI server.py
- [2025-04-08] Fixed all 500 errors (init, login, categories, courses, etc.)
- [2025-04-08] Implemented local file upload with async streaming + Range requests
- [2025-04-08] Fixed 502 on video serving for large files (33MB+ tested)
- [2025-04-08] Updated frontend to use REACT_APP_BACKEND_URL + resolveUrl()
- [2025-04-08] Created comprehensive README.md in original Next.js project style

## Backlog
- P1: Real AI integration (OpenAI/Gemini)
- P1: Cloudinary for production file storage
- P1: PDF certificate generation (Python)
- P2: Stripe payment integration
- P2: Email notifications
- P2: Real-time WebSocket chat
