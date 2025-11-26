# AI Square Documentation

Essential documentation for building and maintaining AI Square.

## 📁 Documentation Structure

```
docs/
├── weekly-reports/              # Weekly development reports
├── technical/                   # Technical implementation docs
│   ├── LOCAL_DEVELOPMENT.md     # Setup guide for developers
│   ├── DB_CONFIG.md            # Database configuration
│   ├── infrastructure/         # Architecture documentation
│   ├── deployment/             # Deployment guides
│   └── testing/                # Testing guidelines
└── handbook/                    # Product & feature specs
    ├── PRD.md                  # Core Product Requirements
    └── technical-specs/         # Feature specifications
```

## 🚀 Quick Start

1. **Development Setup**: [technical/LOCAL_DEVELOPMENT.md](technical/LOCAL_DEVELOPMENT.md)
2. **Architecture Overview**: [technical/infrastructure/unified-learning-architecture.md](technical/infrastructure/unified-learning-architecture.md)
3. **Product Requirements**: [handbook/PRD.md](handbook/PRD.md)
4. **Weekly Reports**: [weekly-reports/README.md](weekly-reports/README.md)

## 🏗️ Key Technical Documents

### Architecture & Infrastructure
- [Unified Learning Architecture](technical/infrastructure/unified-learning-architecture.md) - Core system design
- [Database Guide](technical/infrastructure/database-guide.md) - PostgreSQL schema and usage
- [Repository Pattern](technical/infrastructure/implementation-guide/02-repository-pattern-implementation.md) - Data access layer

### Development & Deployment
- [Local Development](technical/LOCAL_DEVELOPMENT.md) - Environment setup
- [Deployment Guide](technical/deployment/deployment-guide.md) - Production deployment
- [Testing Guidelines](technical/testing/testing-guidelines.md) - Test practices

### Feature Specifications
- [Learning System](handbook/technical-specs/learning-system.md) - PBL/Assessment/Discovery modules
- [Content Management](handbook/technical-specs/content-management.md) - CMS features
- [Authentication](handbook/technical-specs/authentication-sso.md) - Auth implementation
- [Infrastructure](handbook/technical-specs/infrastructure.md) - Cloud architecture

## 🔧 Technology Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python), Google Vertex AI
- **Database**: PostgreSQL
- **Deployment**: Google Cloud Run, Docker
- **Languages**: 14 languages supported

## 📊 Project Progress

- **Weekly Reports**: [weekly-reports/](weekly-reports/) - Track development by week
- **Latest PRD**: [handbook/PRD.md](handbook/PRD.md) - Product vision and roadmap
- **Current Phase**: Phase 2.5 - Production Ready (Oct-Nov 2025)

## 📝 Notes

- Weekly reports auto-generated from git commits
- Development scripts are maintained separately
- For the latest code, always refer to the source files
