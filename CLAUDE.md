# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Square is a multi-agent learning platform for AI literacy education. The project is a monorepo with a Next.js frontend and Python FastAPI backend, designed to be deployed on Google Cloud Platform.

**Key Features:**
- Multilingual AI literacy competency visualization (9 languages supported)
- Interactive accordion-based competency explorer with Knowledge, Skills, and Attitudes (KSA) mapping
- YAML-based content management for educational rubrics
- Internationalization with dynamic language switching

## Development Commands

### Frontend (Next.js)
```bash
# Development server
cd frontend && npm run dev
# or use Makefile
make frontend

# Build production
cd frontend && npm run build
# or use Makefile  
make build-frontend

# Lint
cd frontend && npm run lint
```

### Backend (Python FastAPI)
```bash
# Development server
cd backend && source venv/bin/activate && uvicorn main:app --reload
# or use Makefile
make backend
```

### Docker & Cloud Deployment
```bash
# Build Docker image
make build-frontend-image

# Deploy to Google Cloud Run
make gcloud-build-and-deploy-frontend
```

## Architecture

### Frontend Structure
- **Framework**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Internationalization**: react-i18next with 9 language support (en, zh-TW, es, ja, ko, fr, de, ru, it)
- **Key Pages**:
  - `/` - Home page with Tailwind CSS demo
  - `/relations` - Main competency visualization interface
- **API Routes**: `/api/relations` - Serves YAML data with language-specific translations

### Backend Structure  
- **Framework**: FastAPI with Python 3.x
- **Key Dependencies**: Google Cloud AI Platform, Generative AI, OpenAI, YAML processing
- **Purpose**: Handles AI/LLM integrations and data processing

### Data Architecture
- **Content Management**: YAML files in `frontend/public/rubrics_data/`
  - `ai_lit_domains.yaml` - Four core AI literacy domains with competencies
  - `ksa_codes.yaml` - Knowledge, Skills, Attitudes reference codes
- **Translation System**: Suffix-based field naming (e.g., `description_zh`, `description_es`)
- **Domain Structure**: Engaging_with_AI, Creating_with_AI, Managing_with_AI, Designing_with_AI

### Component Architecture
- **Client-side rendering** with useState/useEffect patterns
- **Accordion interfaces** for domain and competency exploration  
- **Responsive design** with mobile-specific overlays
- **Dynamic content loading** via API with language parameter

## Key Implementation Details

### Translation System
The app uses a dual translation approach:
1. **UI Labels**: react-i18next with JSON files in `public/locales/`
2. **Content Data**: YAML field suffixes processed by `getTranslatedField()` utility

### YAML Data Processing
- Domains contain competencies with KSA code references
- API route dynamically resolves translations and builds KSA maps
- Competencies link to knowledge (K), skills (S), and attitudes (A) indicators

### Styling Approach
- **Tailwind CSS** for utility-first styling
- **Gradient backgrounds** and **responsive design** patterns
- **Custom animations** with CSS-in-JS for mobile interactions

## Configuration Files
- `eslint.config.mjs` - Next.js + TypeScript ESLint setup
- `tailwind.config.js` - Tailwind CSS configuration  
- `next.config.ts` - Next.js configuration with i18n
- `next-i18next.config.js` - Internationalization setup
- `tsconfig.json` - TypeScript configuration

## Development Workflow
1. Frontend development: Use `make frontend` for live reload
2. Content updates: Edit YAML files in `public/rubrics_data/`
3. New languages: Add translations to both JSON locales and YAML field suffixes
4. Testing: Run `npm run lint` in frontend directory
5. Deployment: Use Makefile commands for GCP deployment

## Project Context
This is Phase 1 of a 6-phase roadmap to build a comprehensive AI learning platform. Current focus is on authentication, internationalization, and basic practice functionality with Google Gemini API integration planned.