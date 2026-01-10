# AI Square

> 通用規則見 `~/.claude/CLAUDE.md`（Agent 路由、Git、Security、TDD）

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + TypeScript |
| Backend | Node.js API |
| Database | PostgreSQL + Redis |
| AI | Vertex AI (Gemini) |
| Deploy | GCP Cloud Run |

## GCP Configuration

**Project**: `ai-square-463013` | **Account**: `youngtsai@junyiacademy.org` | **Region**: `asia-east1`

```bash
gcloud config list  # Verify before GCP operations
```

## Core Principles

- **Infrastructure First** - Production-grade from Day 1
- **No Workarounds** - "Nothing more permanent than a temporary solution"
- **Agent-Driven** - Use `agents-manager` for ALL tasks

## agents-manager Coordinates

| Task | Agent |
|------|-------|
| Infrastructure | infrastructure-first-agent |
| Testing | tdd-validator-agent |
| Architecture | unified-architecture-guardian |
| Security | security-audit-agent |
| Code Quality | quality-guardian-agent |
| Deployment | deployment-master-agent |
| GCP Config | gcp-config-manager |
| Documentation | documentation-sync-agent |
| Git | git-commit-push |
| Performance | performance-optimization-agent |
| Database | database-management-agent |
| Error Learning | error-reflection-agent |

## Parallel Agent Execution (30% Faster)

**Safe Combinations**:
- Testing + Performance
- Security + Documentation
- Quality + Testing

See `.claude/agents/agents-manager.md` for full rules.

## Commands

```bash
# Development
npm run dev

# Build & Test
npm run build
npm run test
npm run lint
npm run typecheck
```

## Key Docs

- `.claude/agents/agents-manager.md` - Agent coordination
- `PRD.md` - Product requirements
