# CI/CD Deployment and Database Guide

## 🌳 Branch Strategy (環境分支模式)

AI Square 採用直覺的環境分支策略：

```
feature/* → staging → main
    ↓          ↓        ↓
  開發分支   測試環境  生產環境
```

### Branch Purposes

- **feature/\***: 功能開發分支
  - 所有新功能和修復在這裡開發
  - 完成後 PR 到 staging

- **staging**: 測試環境分支
  - 自動部署到 staging 環境
  - 用於測試和 QA
  - 穩定後 PR 到 main

- **main**: 生產環境分支
  - 自動部署到 production 環境
  - 只接受來自 staging 的 PR
  - 代表生產就緒的代碼

## 🚀 CI/CD Workflows

### Workflow Files Location
```
ai-square/
├── .github/workflows/          # 根目錄的 workflows (正確版本)
│   ├── deploy-staging.yml      # staging 分支 → staging 環境
│   ├── deploy-production.yml   # main 分支 → production 環境
│   └── ...
└── frontend/
    └── .github/workflows/      # ⚠️ 不要在這裡放部署 workflows
```

### Staging Deployment

**Trigger**: Push to `staging` branch
**Workflow**: `/.github/workflows/deploy-staging.yml`

```yaml
on:
  push:
    branches:
      - staging
```

**Steps**:
1. Build and test
2. Build Docker image
3. Deploy to Cloud Run (staging)
4. Run Prisma migrations
5. Initialize scenarios
6. Run E2E tests
7. Send Slack notification

### Production Deployment

**Trigger**: Push to `main` branch
**Workflow**: `/.github/workflows/deploy-production.yml`

```yaml
on:
  push:
    branches:
      - main
```

**Steps**:
1. Require manual confirmation
2. Full test suite
3. Build Docker image
4. Deploy to Cloud Run (production)
5. Database migrations with backup
6. Smoke tests
7. Monitoring alerts

## 💾 Database Management

### Database Environments

- **Local**: PostgreSQL in Docker (port 5433)
  ```
  DB_NAME=ai_square_db
  DB_USER=postgres
  DB_PASSWORD=postgres
  ```

- **Staging**: Cloud SQL in asia-east1
  ```
  Instance: ai-square-db-staging-asia
  Connection: /cloudsql/ai-square-463013:asia-east1:ai-square-db-staging-asia
  ```

- **Production**: Cloud SQL in asia-east1
  ```
  Instance: ai-square-db-prod-asia
  Connection: /cloudsql/ai-square-463013:asia-east1:ai-square-db-prod-asia
  ```

### Database Migrations

#### Using Prisma

1. **Schema Changes**:
   ```bash
   # Edit schema
   vi prisma/schema.prisma
   
   # Generate migration
   npx prisma migrate dev --name describe_your_change
   
   # Apply to local DB
   npx prisma migrate deploy
   ```

2. **CI/CD Auto-Migration**:
   - Staging: Automatically runs `prisma migrate deploy`
   - Production: Requires manual approval

3. **Manual Migration** (if needed):
   ```bash
   # Connect to Cloud SQL proxy
   cloud_sql_proxy -instances=CONNECTION_NAME=tcp:5432
   
   # Run migration
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

### Adding New Fields (Example: email_verified_at)

1. **Update Prisma Schema**:
   ```prisma
   model User {
     // ... existing fields
     emailVerifiedAt    DateTime? @map("email_verified_at")
   }
   ```

2. **Generate Migration**:
   ```bash
   npx prisma migrate dev --name add_email_verified_at
   ```

3. **Deploy**:
   ```bash
   # Commit and push to staging
   git add -A
   git commit -m "feat: add email_verified_at field"
   git push origin staging
   
   # After testing, merge to main
   git checkout main
   git merge staging
   git push origin main
   ```

## 📋 Deployment Checklist

### Before Deploying to Staging
- [ ] All tests pass locally
- [ ] TypeScript no errors (`npm run typecheck`)
- [ ] ESLint no warnings (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Database migrations tested locally
- [ ] Authentication tests pass (`npm test -- auth`)
- [ ] E2E authentication tests pass (`npm run test:e2e -- auth`)

### Before Deploying to Production
- [ ] Staging deployment successful
- [ ] E2E tests pass on staging
- [ ] No critical bugs in staging
- [ ] Database backup completed
- [ ] Team notification sent

## 🔧 Common Tasks

### Check Deployment Status
```bash
# View recent deployments
gh run list --repo junyiacademy/ai-square --limit 5

# Watch current deployment
gh run watch RUN_ID --repo junyiacademy/ai-square
```

### Manual Deployment
```bash
# Trigger staging deployment
gh workflow run deploy-staging.yml --repo junyiacademy/ai-square

# Trigger production deployment (requires confirmation)
gh workflow run deploy-production.yml --repo junyiacademy/ai-square
```

### Rollback
```bash
# Revert to previous revision in Cloud Run
gcloud run services update-traffic SERVICE_NAME \
  --region=asia-east1 \
  --to-revisions=PREVIOUS_REVISION=100
```

## 🚨 Important Notes

1. **Never skip tests** in production deployments
2. **Always backup database** before production migrations
3. **Monitor logs** after deployment for errors
4. **Keep staging and production** in sync
5. **Verify authentication** works after each deployment
   - Check middleware is correctly validating tokens
   - Test protected routes are accessible when logged in
   - Ensure token format consistency (hex vs base64)

## 📊 Monitoring

- Cloud Run logs: `gcloud run services logs read SERVICE_NAME`
- Database connections: Cloud SQL metrics
- Application metrics: Cloud Monitoring dashboards
- Error tracking: Check error logs in Cloud Logging

---

Last updated: 2025-01-22