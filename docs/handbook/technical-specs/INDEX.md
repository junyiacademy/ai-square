# Technical Specifications Index

> Last Updated: 2025-01-28
> Status: All specs aligned with PRD phased approach

## Overview

This index provides a comprehensive overview of all technical specifications for AI Square, organized by implementation phase and functional area.

## Quick Navigation

### By Phase

#### Phase 1-2: MVP (2025/01-06)
- [Infrastructure](./infrastructure.md) - GitHub Pages + Cloud Run (~$10/month)
- [Authentication & SSO](./authentication-sso.md) - JWT + Local Storage
- [Learning System](./learning-system.md) - PBL implementation
- [Analytics & Reporting](./analytics-reporting.md) - Google Analytics

#### Phase 2: Enhanced MVP (2025/07-09)
- [CMS Setup](./cms-setup.md) - Git-Based content management
- [CMS Multilingual](./cms-multilingual-enhancement.md) - Basic multilingual editing
- [Dynamic Language](./dynamic-language-system.md) - Extended language support

#### Phase 3: Production (2025/10-12)
- [Content Management](./content-management.md) - Full CMS features
- [AI Integration](./ai-integration.md) - Agent system architecture

#### Phase 4+: Enterprise (2026+)
- [Enterprise Features](./enterprise-features.md) - Organization management
- [Knowledge Graph](./knowledge-graph-phase4-spec.md) - Smart learning paths

#### Phase 5+: Ecosystem (2027+)
- [Plugin Architecture](./plugin-architecture.md) - Developer platform

### By Category

#### 🏗️ Infrastructure & Platform
1. **[Infrastructure](./infrastructure.md)**
   - Cloud architecture evolution
   - Cost optimization strategies
   - Deployment configurations

2. **[Authentication & SSO](./authentication-sso.md)**
   - User authentication flow
   - SSO integration (Phase 4+)
   - Session management

#### 📝 Content Management
3. **[CMS Setup Guide](./cms-setup.md)** ⭐
   - Git-Based architecture
   - Deployment strategies
   - **Central roadmap location**

4. **[Content Management Spec](./content-management.md)**
   - Visual rubrics builder
   - AI content generation
   - Version control system

5. **[CMS Multilingual Enhancement](./cms-multilingual-enhancement.md)**
   - Multi-language editing
   - Translation workflow
   - AI translation (Phase 4+)

#### 🤖 AI & Learning
6. **[AI Integration](./ai-integration.md)**
   - LLM service abstraction
   - MCP implementation path
   - Agent orchestration

7. **[Learning System](./learning-system.md)**
   - Adaptive learning paths
   - Assessment engine
   - Progress tracking

8. **[Dynamic Language System](./dynamic-language-system.md)**
   - Unlimited language support
   - Real-time translation
   - Smart caching

#### 📊 Analytics & Intelligence
9. **[Analytics & Reporting](./analytics-reporting.md)**
   - Learning analytics
   - Performance metrics
   - Predictive models (Phase 4+)

10. **[Knowledge Graph](./knowledge-graph-phase4-spec.md)**
    - Concept relationships
    - Learning path optimization
    - Recommendation engine

#### 🏢 Enterprise & Ecosystem
11. **[Enterprise Features](./enterprise-features.md)**
    - Team collaboration
    - Class management
    - Custom deployment

12. **[Plugin Architecture](./plugin-architecture.md)**
    - Plugin SDK design
    - Marketplace infrastructure
    - Revenue sharing model

## Implementation Status

### Phase 1-2 (Current)
| Feature | Status | Spec |
|---------|--------|------|
| Basic Auth | ✅ Implemented | [Auth](./authentication-sso.md) |
| PBL System | ✅ Implemented | [Learning](./learning-system.md) |
| Static Hosting | ✅ Active | [Infra](./infrastructure.md) |
| Basic Analytics | 🔄 In Progress | [Analytics](./analytics-reporting.md) |

### Phase 2 (Planned)
| Feature | Target | Spec |
|---------|--------|------|
| CMS Service | 2025 Q3 | [CMS](./cms-setup.md) |
| Multi-language Editor | 2025 Q3 | [Multilingual](./cms-multilingual-enhancement.md) |
| Extended Languages | 2025 Q3 | [Dynamic Lang](./dynamic-language-system.md) |

## Key Technical Decisions

### Architecture Principles
1. **Git-Based**: All content stored in Git
2. **Progressive Enhancement**: Start simple, add complexity when needed
3. **Cost-Conscious**: Each phase has defined cost targets
4. **API-First**: Clear separation of concerns

### Technology Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.x
- **Infrastructure**: Google Cloud Platform
- **Content**: YAML/JSON in Git

### Cost Targets
- Phase 1-2: ~$10/month
- Phase 2: ~$50/month
- Phase 3: ~$200/month
- Phase 4+: $1000+/month

## Reading Order

For new team members, read in this order:

1. [Product Requirements Document](../product-requirements-document.md) - Business context
2. [CMS Setup Guide](./cms-setup.md) - Architecture overview and roadmap
3. [Infrastructure](./infrastructure.md) - Deployment approach
4. [Learning System](./learning-system.md) - Core functionality
5. Other specs as needed

## Maintenance

### Update Frequency
- Technical specs should be reviewed quarterly
- Update when PRD changes significantly
- Track implementation status monthly

### Document Owners
Each spec should have a designated owner responsible for:
- Keeping content current
- Resolving conflicts with other specs
- Tracking implementation progress

## Related Documents

- [Product Requirements Document](../product-requirements-document.md)
- [AI Quick Reference](../AI-QUICK-REFERENCE.md)
- [Development Workflow](../../README.md)