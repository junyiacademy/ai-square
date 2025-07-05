# AI Square Database Build Plan - Cloud SQL Implementation

## Executive Summary

This document outlines a comprehensive plan for implementing Cloud SQL as the primary data persistence layer for AI Square, replacing the current localStorage-based approach. The plan includes data layer architecture, testing strategy, local/production initialization, CI/CD deployment, and schema migration capabilities.

## 1. Architecture Overview

### 1.1 Technology Stack
- **Database**: Google Cloud SQL (PostgreSQL 15)
- **ORM**: Prisma (TypeScript)
- **Migration Tool**: Prisma Migrate
- **Connection Pooling**: PgBouncer
- **Backup**: Automated Cloud SQL backups
- **Monitoring**: Cloud SQL Insights

### 1.2 High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│                 API Routes / tRPC                        │
├─────────────────────────────────────────────────────────┤
│              Data Access Layer (Prisma)                  │
├─────────────────────────────────────────────────────────┤
│           Connection Pool (PgBouncer)                    │
├─────────────────────────────────────────────────────────┤
│              Cloud SQL (PostgreSQL)                      │
└─────────────────────────────────────────────────────────┘
```

## 2. Database Schema Design

### 2.1 Core Tables

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  locale VARCHAR(10) DEFAULT 'zh-TW',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  auth_provider VARCHAR(50),
  auth_provider_id VARCHAR(255)
);

-- Learning Progress
CREATE TABLE learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(100) NOT NULL,
  competency VARCHAR(100) NOT NULL,
  progress DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, domain, competency)
);

-- Assessment Results
CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assessment_type VARCHAR(50) NOT NULL,
  scores JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1
);

-- PBL Scenarios Progress
CREATE TABLE pbl_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scenario_id VARCHAR(100) NOT NULL,
  program_id VARCHAR(100) NOT NULL,
  task_id VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'not_started',
  responses JSONB,
  evaluations JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, scenario_id, program_id, task_id)
);

-- Discovery Workspaces
CREATE TABLE discovery_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  path_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  current_task_index INTEGER DEFAULT 0,
  completed_tasks_count INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]'::jsonb,
  workspace_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Discovery Tasks
CREATE TABLE discovery_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES discovery_workspaces(id) ON DELETE CASCADE,
  task_id VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  responses JSONB,
  evaluations JSONB,
  xp_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, task_id)
);

-- AI Conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  context_type VARCHAR(50) NOT NULL,
  context_id VARCHAR(100),
  messages JSONB NOT NULL,
  token_count INTEGER DEFAULT 0,
  model_used VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- User Preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  learning_pace VARCHAR(20) DEFAULT 'moderate',
  preferred_ai_model VARCHAR(50) DEFAULT 'gemini-2.5-flash',
  custom_settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX idx_pbl_progress_user_scenario ON pbl_progress(user_id, scenario_id);
CREATE INDEX idx_discovery_workspaces_user ON discovery_workspaces(user_id);
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_analytics_events_user_type ON analytics_events(user_id, event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
```

### 2.2 Schema Versioning
```sql
-- Schema migrations table (managed by Prisma)
CREATE TABLE _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMP WITH TIME ZONE,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  applied_steps_count INTEGER DEFAULT 0
);
```

## 3. Data Access Layer Design

### 3.1 Prisma Schema
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  name            String?
  avatarUrl       String?   @map("avatar_url")
  locale          String    @default("zh-TW")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  lastLoginAt     DateTime? @map("last_login_at")
  authProvider    String?   @map("auth_provider")
  authProviderId  String?   @map("auth_provider_id")
  
  // Relations
  learningProgress    LearningProgress[]
  assessmentResults   AssessmentResult[]
  pblProgress        PblProgress[]
  discoveryWorkspaces DiscoveryWorkspace[]
  aiConversations    AiConversation[]
  preferences        UserPreferences?
  analyticsEvents    AnalyticsEvent[]
  
  @@map("users")
}

model LearningProgress {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  domain      String
  competency  String
  progress    Decimal  @default(0)
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, domain, competency])
  @@index([userId])
  @@map("learning_progress")
}

model DiscoveryWorkspace {
  id                   String   @id @default(uuid())
  userId               String   @map("user_id")
  pathId               String   @map("path_id")
  title                String
  status               String   @default("active")
  currentTaskIndex     Int      @default(0) @map("current_task_index")
  completedTasksCount  Int      @default(0) @map("completed_tasks_count")
  totalXp              Int      @default(0) @map("total_xp")
  achievements         Json     @default("[]")
  workspaceData        Json     @map("workspace_data")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")
  
  user  User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks DiscoveryTask[]
  
  @@index([userId])
  @@map("discovery_workspaces")
}

// ... Additional models
```

### 3.2 Repository Pattern Implementation
```typescript
// src/lib/repositories/base.repository.ts
export abstract class BaseRepository<T> {
  constructor(protected prisma: PrismaClient) {}
  
  abstract findById(id: string): Promise<T | null>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
}

// src/lib/repositories/user.repository.ts
export class UserRepository extends BaseRepository<User> {
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { preferences: true }
    });
  }
  
  async createWithPreferences(userData: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...userData,
        preferences: {
          create: {}
        }
      },
      include: { preferences: true }
    });
  }
}
```

## 4. Migration Strategy

### 4.1 Data Migration Plan
```typescript
// scripts/migrate-from-localstorage.ts
import { PrismaClient } from '@prisma/client';
import { GoogleCloudStorageService } from '@/lib/services/gcs.service';

export class DataMigrator {
  constructor(
    private prisma: PrismaClient,
    private gcs: GoogleCloudStorageService
  ) {}
  
  async migrateUser(email: string): Promise<void> {
    // 1. Read from localStorage/GCS
    const localData = await this.gcs.getUserData(email);
    
    // 2. Transform data
    const transformedData = this.transformData(localData);
    
    // 3. Insert into database
    await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: { email, ...transformedData.user }
      });
      
      // Migrate related data
      await this.migrateLearningProgress(tx, user.id, transformedData.progress);
      await this.migratePblProgress(tx, user.id, transformedData.pbl);
      await this.migrateDiscoveryData(tx, user.id, transformedData.discovery);
    });
  }
  
  private transformData(localData: any): TransformedData {
    // Transform localStorage format to database schema
    return {
      user: {
        name: localData.profile?.name,
        locale: localData.settings?.locale || 'zh-TW'
      },
      progress: localData.learningProgress || {},
      pbl: localData.pblScenarios || {},
      discovery: localData.discoveryWorkspaces || []
    };
  }
}
```

### 4.2 Schema Migration Process
```bash
# Development workflow
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate:dev # Create migration
npm run prisma:studio      # Visual database editor

# Production deployment
npm run prisma:migrate:deploy # Apply migrations
```

## 5. Testing Strategy

### 5.1 Unit Tests
```typescript
// src/lib/repositories/__tests__/user.repository.test.ts
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { UserRepository } from '../user.repository';

describe('UserRepository', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let repository: UserRepository;
  
  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    repository = new UserRepository(prisma);
  });
  
  it('should create user with preferences', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User'
    };
    
    prisma.user.create.mockResolvedValue({
      id: 'uuid',
      ...userData,
      preferences: {}
    });
    
    const result = await repository.createWithPreferences(userData);
    
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: userData.email,
        preferences: { create: {} }
      })
    });
  });
});
```

### 5.2 Integration Tests
```typescript
// src/lib/repositories/__tests__/integration/user.repository.integration.test.ts
import { PrismaClient } from '@prisma/client';
import { UserRepository } from '../../user.repository';

describe('UserRepository Integration', () => {
  let prisma: PrismaClient;
  let repository: UserRepository;
  
  beforeAll(async () => {
    // Use test database
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    prisma = new PrismaClient();
    repository = new UserRepository(prisma);
    
    // Clean database
    await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  it('should perform CRUD operations', async () => {
    // Create
    const user = await repository.create({
      email: 'integration@test.com',
      name: 'Integration Test'
    });
    expect(user.id).toBeDefined();
    
    // Read
    const found = await repository.findByEmail('integration@test.com');
    expect(found?.name).toBe('Integration Test');
    
    // Update
    await repository.update(user.id, { name: 'Updated Name' });
    
    // Delete
    await repository.delete(user.id);
    const deleted = await repository.findById(user.id);
    expect(deleted).toBeNull();
  });
});
```

### 5.3 Test Database Setup
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: ai_square_test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data
```

## 6. Local Development Setup

### 6.1 Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ai_square
      POSTGRES_PASSWORD: ${DB_PASSWORD:-development}
      POSTGRES_DB: ai_square_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai_square"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_DATABASE: ai_square_dev
      DATABASES_USER: ai_square
      DATABASES_PASSWORD: ${DB_PASSWORD:-development}
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 25
    ports:
      - "6432:6432"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

### 6.2 Development Scripts
```json
// package.json
{
  "scripts": {
    "db:start": "docker-compose up -d",
    "db:stop": "docker-compose down",
    "db:reset": "docker-compose down -v && docker-compose up -d && npm run prisma:migrate:reset",
    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:migrate:reset": "prisma migrate reset --force",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node prisma/seed.ts"
  }
}
```

### 6.3 Environment Configuration
```bash
# .env.local
DATABASE_URL="postgresql://ai_square:development@localhost:5432/ai_square_dev"
DATABASE_POOL_URL="postgresql://ai_square:development@localhost:6432/ai_square_dev"
TEST_DATABASE_URL="postgresql://test:test@localhost:5433/ai_square_test"

# .env.production
DATABASE_URL="postgresql://user:password@/ai_square_prod?host=/cloudsql/ai-square-463013:us-central1:ai-square-db"
```

## 7. Production Initialization

### 7.1 Cloud SQL Instance Setup
```bash
# Create Cloud SQL instance
gcloud sql instances create ai-square-db \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=us-central1 \
  --network=default \
  --database-flags=max_connections=200,shared_buffers=256MB \
  --backup \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=10

# Create database
gcloud sql databases create ai_square_prod \
  --instance=ai-square-db

# Create user
gcloud sql users create ai_square_app \
  --instance=ai-square-db \
  --password=[SECURE_PASSWORD]
```

### 7.2 Connection Configuration
```yaml
# app.yaml (App Engine)
env_variables:
  DATABASE_URL: "postgresql://ai_square_app:[PASSWORD]@/ai_square_prod?host=/cloudsql/ai-square-463013:us-central1:ai-square-db"
  
beta_settings:
  cloud_sql_instances: "ai-square-463013:us-central1:ai-square-db"
```

### 7.3 Initial Production Setup
```bash
# Run migrations
npm run prisma:migrate:deploy

# Seed initial data (if needed)
npm run prisma:seed:prod

# Verify connection
npm run db:health-check
```

## 8. CI/CD Pipeline

### 8.1 GitHub Actions Workflow
```yaml
# .github/workflows/database-deploy.yml
name: Database Migration and Deploy

on:
  push:
    branches: [main]
    paths:
      - 'prisma/**'
      - 'frontend/src/lib/repositories/**'
      - '.github/workflows/database-deploy.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: ai_square_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npm run prisma:generate
      
      - name: Run migrations on test DB
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/ai_square_test
        run: npm run prisma:migrate:deploy
      
      - name: Run integration tests
        env:
          TEST_DATABASE_URL: postgresql://test:test@localhost:5432/ai_square_test
        run: npm run test:integration

  migrate-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Run staging migrations
        run: |
          npm run prisma:migrate:deploy
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

  migrate-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Backup production database
        run: |
          gcloud sql backups create \
            --instance=ai-square-db \
            --description="Pre-migration backup $(date +%Y%m%d-%H%M%S)"
      
      - name: Run production migrations
        run: |
          npm run prisma:migrate:deploy
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
      
      - name: Verify migration
        run: |
          npm run db:health-check:prod
```

### 8.2 Deployment Script
```bash
#!/bin/bash
# scripts/deploy-database.sh

set -e

echo "🚀 Starting database deployment..."

# Check environment
if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ]; then
  echo "❌ Error: ENVIRONMENT must be 'production' or 'staging'"
  exit 1
fi

# Backup current database
echo "📦 Creating backup..."
gcloud sql backups create \
  --instance=ai-square-db-$ENVIRONMENT \
  --description="Pre-deployment backup $(date +%Y%m%d-%H%M%S)"

# Run migrations
echo "🔄 Running migrations..."
npm run prisma:migrate:deploy

# Verify database health
echo "✅ Verifying database health..."
npm run db:health-check:$ENVIRONMENT

echo "✨ Database deployment complete!"
```

## 9. Monitoring and Maintenance

### 9.1 Health Checks
```typescript
// src/app/api/health/db/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get connection pool stats
    const stats = await prisma.$metrics.json();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        pool: stats
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
```

### 9.2 Performance Monitoring
```sql
-- Monitor slow queries
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Monitor table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 10. Rollback Procedures

### 10.1 Migration Rollback
```bash
# Rollback last migration
npm run prisma:migrate:rollback

# Rollback to specific migration
npm run prisma:migrate:rollback -- --to 20240104_initial_schema
```

### 10.2 Database Restore
```bash
# List available backups
gcloud sql backups list --instance=ai-square-db

# Restore from backup
gcloud sql backups restore [BACKUP_ID] \
  --restore-instance=ai-square-db \
  --backup-instance=ai-square-db
```

## 11. Security Considerations

### 11.1 Access Control
- Use Cloud SQL IAM authentication
- Implement row-level security for multi-tenant data
- Encrypt sensitive data at rest
- Use SSL/TLS for all connections

### 11.2 Security Policies
```sql
-- Enable row-level security
ALTER TABLE discovery_workspaces ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY workspace_user_policy ON discovery_workspaces
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);
```

## 12. Cost Optimization

### 12.1 Instance Sizing
- Start with db-g1-small for development
- Scale to db-n1-standard-1 for production
- Use read replicas for analytics queries

### 12.2 Storage Optimization
- Enable automatic storage increase
- Implement data archiving for old records
- Use JSONB compression for large JSON fields

## 13. Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- Set up Cloud SQL instances
- Create Prisma schema
- Implement base repositories
- Set up local development environment

### Phase 2: Migration (Week 3-4)
- Build data migration scripts
- Test migration with sample data
- Create rollback procedures
- Document migration process

### Phase 3: Integration (Week 5-6)
- Update API routes to use database
- Implement caching layer
- Add monitoring and health checks
- Performance testing

### Phase 4: Deployment (Week 7-8)
- Deploy to staging environment
- Run full migration test
- Deploy to production
- Monitor and optimize

## 14. Success Metrics

- Zero data loss during migration
- < 50ms average query response time
- 99.9% uptime SLA
- Successful automated backups
- All tests passing (unit + integration)

## Conclusion

This comprehensive plan provides a clear path for migrating AI Square from localStorage to Cloud SQL. The use of Prisma as an ORM provides excellent TypeScript support and makes schema migrations straightforward. The plan ensures data integrity, performance, and scalability while maintaining the ability to easily modify the schema as the application evolves.

Key advantages of this approach:
1. **Type Safety**: Full TypeScript support through Prisma
2. **Migration Control**: Version-controlled schema changes
3. **Performance**: Connection pooling and query optimization
4. **Reliability**: Automated backups and failover
5. **Scalability**: Easy to scale vertically and horizontally
6. **Developer Experience**: Great tooling and local development setup