# AI Square Documentation

Essential documentation for building and maintaining AI Square.

## 📁 Documentation Structure

```
docs/
├── technical/                    # Technical implementation docs
│   ├── LOCAL_DEVELOPMENT.md     # Setup guide for developers
│   ├── DB_CONFIG.md            # Database configuration
│   ├── infrastructure/         # Architecture documentation
│   ├── deployment/             # Deployment guides
│   └── testing/                # Testing guidelines
└── handbook/                    # Product & feature specs
    ├── product-requirements-document.md  # Core PRD
    └── technical-specs/         # Feature specifications
```

## 🚀 Quick Start

1. **Development Setup**: [technical/LOCAL_DEVELOPMENT.md](technical/LOCAL_DEVELOPMENT.md)
2. **Architecture Overview**: [technical/infrastructure/unified-learning-architecture.md](technical/infrastructure/unified-learning-architecture.md)
3. **Product Requirements**: [handbook/product-requirements-document.md](handbook/product-requirements-document.md)

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

## 📝 Notes

- Historical reports and updates have been archived
- Development scripts are maintained separately
- For the latest code, always refer to the source files
