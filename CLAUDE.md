# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Rules for AI Assistant

### Commit Execution Rules
1. **NEVER execute commit without explicit instruction**
2. **ONLY commit when user says "commit" or similar clear command**
3. **MUST use Makefile commands**: `make commit-check` or `make commit-ticket`
4. **NEVER use direct git commands** for commits (no `git add -A && git commit`)
5. **EXCEPTION**: Auto-commit for adding commit hash (with SKIP_POST_COMMIT=1)
6. **NO self-initiated commits** after completing tasks
7. **Reference**: See [ADR-017](docs/decisions/ADR-017-dev-logs-structure-and-standards.md) Section 6

### Git Command Restrictions
**ABSOLUTELY FORBIDDEN - Direct Git Commands:**
- ❌ `git add` (use Makefile workflow instead)
- ❌ `git commit` (use `make commit-check` or `make commit-ticket`)
- ❌ `git add -A && git commit` (violates workflow rules)
- ❌ Any combination of direct git add/commit commands

**ALLOWED Git Commands:**
- ✅ `git status` (checking repository state)
- ✅ `git diff` (viewing changes)
- ✅ `git log` (viewing history)
- ✅ `git push` (after proper Makefile commit)
- ✅ `git pull` (updating from remote)
- ✅ `git branch` (branch management)
- ✅ `git checkout` (switching branches)

**ENFORCEMENT:**
If user requests a commit, you MUST:
1. Use `make commit-check` for standard commits
2. Use `make commit-ticket` for ticket-based development
3. REFUSE any request to use direct git add/commit commands
4. Explain that the Makefile workflow ensures tests pass and documentation is updated

**Example Response When User Says "commit":**
```
I'll commit the changes using the proper workflow:

[Execute: make commit-check]

This will run tests, perform checks, and commit if everything passes.
```

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

# Run tests
cd frontend && npm run test
# or CI mode (no watch)
cd frontend && npm run test:ci

# Type checking
cd frontend && npm run typecheck
# or
cd frontend && npx tsc --noEmit
```

### Backend (Python FastAPI)
```bash
# Development server
cd backend && source venv/bin/activate && uvicorn main:app --reload
# or use Makefile
make backend

# Run tests (if pytest is installed)
cd backend && python -m pytest

# Linting (if ruff is installed)
cd backend && python -m ruff check .
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

## Ticket Development Rules

### When to Create a Ticket
You MUST create a ticket when the user requests:
1. **New Features**: "implement", "add", "create", "build" 
2. **Bug Fixes**: "fix", "resolve", "bug doesn't work"
3. **Refactoring**: "refactor", "improve", "optimize"
4. **Multi-file Changes**: Any change affecting > 3 files
5. **Time Estimate > 15 minutes**

### Ticket Workflow
When a ticket is needed, respond with:
```
This task requires a development ticket. Let me create one:

[Execute: make dev-ticket TICKET=<descriptive-name>]

This will:
1. Create a ticket file for time tracking
2. Start a dedicated branch (if enabled)
3. Track all changes related to this task
```

### Skip Ticket for:
- Simple documentation updates
- Typo fixes
- Single config file changes
- CSS/style only changes

### Active Ticket Check
Always check for active tickets before creating new ones:
```bash
python docs/scripts/ticket-manager.py active
```

### Automated Decision Making

**Can Execute Without Asking**:
1. Creating/pausing/resuming tickets
2. Branch operations (create, switch)
3. Git stash/WIP commits
4. Running tests and checks
5. Generating commit messages

**Must Ask Before**:
1. Resolving merge conflicts (unless trivial)
2. Changing business logic
3. Deleting code/files
4. Force pushing
5. Switching context (unless urgent)

**Smart Automation Rules**:
- If "urgent/緊急/broken/壞了" → Auto pause current & switch
- If "continue/繼續/回到" → Auto resume matching ticket
- If conflict in package-lock.json → Auto resolve with --theirs
- If only formatting changes → Auto fix with prettier/eslint

### Parallel Ticket Handling
When user switches context during an active ticket:

1. **Detect Context Switch**:
   - Different topic/feature mentioned
   - Explicit request like "等等" or "先處理"
   - New bug report while developing feature

2. **Response Template**:
   ```
   我注意到您提到了 [新主題]，這與當前的 [ticket名稱] 不同。
   
   請問您想要：
   1. 暫停當前 ticket，處理新問題
   2. 將這作為當前 ticket 的一部分  
   3. 先記下來，完成當前工作後處理
   
   當前進度：[簡述當前ticket進度]
   ```

3. **Switching Tickets**:
   ```bash
   # Pause current
   make pause-ticket
   
   # Create new
   make dev-ticket TICKET=new-issue
   
   # Or resume previous
   make resume-ticket TICKET=previous-name
   ```

4. **List All Tickets**:
   ```bash
   make list-tickets
   ```

## Development Workflow

### Standard Development Flow
1. Frontend development: Use `make frontend` for live reload
2. Content updates: Edit YAML files in `public/rubrics_data/`
3. New languages: Add translations to both JSON locales and YAML field suffixes
4. Testing: Run `npm run test` and `npm run lint` in frontend directory
5. Deployment: Use Makefile commands for GCP deployment

### Quality Checks and Commit Workflow
The project uses automated checks through the Makefile workflow:

#### Before Committing (Manual or via Makefile)
Run quality checks before committing:
```bash
# Run all tests and checks
make test-all

# Or use the commit workflow which includes checks
make commit-check
```

The following checks are performed:
- **Frontend Tests**: `npm run test:ci` (Jest tests)
- **Frontend Linting**: `npm run lint` (ESLint)
- **Frontend Type Checking**: `npm run typecheck` or `npx tsc --noEmit`
- **Backend Tests**: `python -m pytest` (if available)
- **Backend Linting**: `python -m ruff check .` (if available)

#### Commit Workflow (via Makefile)
```bash
# Standard commit with checks
make commit-check

# Ticket-based development with time tracking
make dev-ticket TICKET=feature-name
# ... develop ...
make commit-ticket
```

#### Post-commit (Automatic)
After successful commits, the following happens automatically:
- **Changelog Update**: Updates `docs/CHANGELOG.md` for feat/fix/perf commits
- **Documentation Generation**: Generates dev logs and documentation
- **Time Tracking**: Records development time if using ticket workflow

### Commit Workflow Rules
1. **ALWAYS run tests before committing** (use `make test-all` or `make commit-check`)
2. **NEVER commit failing tests** unless explicitly fixing them
3. **Changelog updates are automatic** for significant changes (feat, fix, perf) via post-commit
4. **Use conventional commits**: feat, fix, docs, style, refactor, test, chore, perf, build, ci
5. **Use Makefile commands** for consistent workflow: `make commit-check`, `make commit-ticket`

## Documentation Structure
- **docs/PLAYBOOK.md** - Main development guide  
- **docs/dev-logs/** - Development logs in YAML format (features, bugs, refactors)
- **docs/decisions/** - Architecture Decision Records
- **docs/ai-tasks/** - AI collaboration templates
- **docs/scripts/** - Development automation scripts

Note: This CLAUDE.md file must remain in the project root directory to be automatically read by Claude AI.

## Project Context
This is Phase 1 of a 6-phase roadmap to build a comprehensive AI learning platform. Current focus is on authentication, internationalization, and basic practice functionality with Google Gemini API integration planned.