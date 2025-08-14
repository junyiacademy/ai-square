#!/bin/bash

# Safe Deployment Script - 防止意外刪除資料
# Usage: ./scripts/safe-deploy.sh [staging|production]

set -e  # Exit on error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}🚀 AI Square Safe Deployment Script${NC}"
echo -e "${BLUE}Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo ""

# 1. Pre-deployment Safety Checks
echo -e "${YELLOW}Step 1: Running safety checks...${NC}"
npx tsx scripts/deployment-safety-check.ts
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Safety checks failed! Deployment aborted.${NC}"
    exit 1
fi

# 2. Database Backup (CRITICAL!)
echo -e "${YELLOW}Step 2: Creating database backup...${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    # Production backup
    pg_dump $DATABASE_URL > backups/prod_backup_$TIMESTAMP.sql
    
    # Verify backup
    if [ -s backups/prod_backup_$TIMESTAMP.sql ]; then
        echo -e "${GREEN}✓ Database backup created: prod_backup_$TIMESTAMP.sql${NC}"
    else
        echo -e "${RED}❌ Backup failed! Aborting deployment.${NC}"
        exit 1
    fi
else
    # Staging backup
    pg_dump $DATABASE_URL > backups/staging_backup_$TIMESTAMP.sql
    echo -e "${GREEN}✓ Staging backup created${NC}"
fi

# 3. Build Application
echo -e "${YELLOW}Step 3: Building application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Deployment aborted.${NC}"
    exit 1
fi

# 4. Run Tests
echo -e "${YELLOW}Step 4: Running tests...${NC}"
npm run test:ci
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Some tests failed. Continue? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        echo -e "${RED}Deployment aborted by user.${NC}"
        exit 1
    fi
fi

# 5. Database Migrations (Safe Mode)
echo -e "${YELLOW}Step 5: Running database migrations...${NC}"
echo -e "${BLUE}Current migration status:${NC}"
npx prisma migrate status

echo -e "${YELLOW}Apply pending migrations? (y/n)${NC}"
read -r response
if [ "$response" = "y" ]; then
    npx prisma migrate deploy
    echo -e "${GREEN}✓ Migrations applied${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping migrations${NC}"
fi

# 6. Deploy to Cloud Run
echo -e "${YELLOW}Step 6: Deploying to Google Cloud Run...${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    # Production deployment
    gcloud run deploy ai-square-frontend \
        --image gcr.io/$GCP_PROJECT/ai-square-frontend:$TIMESTAMP \
        --region asia-east1 \
        --platform managed \
        --allow-unauthenticated \
        --set-env-vars NODE_ENV=production \
        --tag prod-$TIMESTAMP
        
    echo -e "${GREEN}✓ Production deployment complete${NC}"
    echo -e "${BLUE}URL: https://ai-square-frontend-xxxxx.asia-east1.run.app${NC}"
else
    # Staging deployment
    gcloud run deploy ai-square-frontend-staging \
        --image gcr.io/$GCP_PROJECT/ai-square-frontend:$TIMESTAMP \
        --region asia-east1 \
        --platform managed \
        --allow-unauthenticated \
        --set-env-vars NODE_ENV=staging \
        --tag staging-$TIMESTAMP
        
    echo -e "${GREEN}✓ Staging deployment complete${NC}"
    echo -e "${BLUE}URL: https://ai-square-frontend-staging-xxxxx.asia-east1.run.app${NC}"
fi

# 7. Health Check
echo -e "${YELLOW}Step 7: Running health check...${NC}"
sleep 10  # Wait for service to start

if [ "$ENVIRONMENT" = "production" ]; then
    HEALTH_URL="https://ai-square-frontend-xxxxx.asia-east1.run.app/api/health"
else
    HEALTH_URL="https://ai-square-frontend-staging-xxxxx.asia-east1.run.app/api/health"
fi

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed! Status: $HEALTH_STATUS${NC}"
    echo -e "${YELLOW}Rolling back...${NC}"
    
    # Rollback
    if [ "$ENVIRONMENT" = "production" ]; then
        gcloud run services update-traffic ai-square-frontend --to-revisions=LATEST=0
    else
        gcloud run services update-traffic ai-square-frontend-staging --to-revisions=LATEST=0
    fi
    
    exit 1
fi

# 8. Smoke Tests
echo -e "${YELLOW}Step 8: Running smoke tests...${NC}"
npx playwright test e2e/critical/smoke-test.spec.ts
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Smoke tests failed!${NC}"
    echo -e "${YELLOW}Keep deployment? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        # Rollback
        echo -e "${YELLOW}Rolling back...${NC}"
        if [ "$ENVIRONMENT" = "production" ]; then
            gcloud run services update-traffic ai-square-frontend --to-revisions=LATEST=0
        else
            gcloud run services update-traffic ai-square-frontend-staging --to-revisions=LATEST=0
        fi
        exit 1
    fi
fi

# 9. Update Traffic (Gradual Rollout for Production)
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}Step 9: Gradual traffic rollout...${NC}"
    
    # 10% traffic first
    echo -e "${BLUE}Routing 10% traffic to new version...${NC}"
    gcloud run services update-traffic ai-square-frontend \
        --to-tags prod-$TIMESTAMP=10
    
    echo -e "${YELLOW}Monitor for 5 minutes, then continue? (y/n)${NC}"
    read -r response
    if [ "$response" = "y" ]; then
        # 50% traffic
        echo -e "${BLUE}Routing 50% traffic to new version...${NC}"
        gcloud run services update-traffic ai-square-frontend \
            --to-tags prod-$TIMESTAMP=50
            
        echo -e "${YELLOW}Monitor for 5 minutes, then continue? (y/n)${NC}"
        read -r response
        if [ "$response" = "y" ]; then
            # 100% traffic
            echo -e "${BLUE}Routing 100% traffic to new version...${NC}"
            gcloud run services update-traffic ai-square-frontend \
                --to-tags prod-$TIMESTAMP=100
        fi
    fi
else
    # Staging - 100% immediately
    gcloud run services update-traffic ai-square-frontend-staging \
        --to-tags staging-$TIMESTAMP=100
fi

# 10. Deployment Summary
echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Timestamp: ${YELLOW}$TIMESTAMP${NC}"
echo -e "Backup: ${YELLOW}backups/${ENVIRONMENT}_backup_$TIMESTAMP.sql${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}📝 Post-deployment checklist:${NC}"
echo "  [ ] Monitor error rates in Cloud Console"
echo "  [ ] Check application logs"
echo "  [ ] Verify critical user flows"
echo "  [ ] Monitor database performance"
echo "  [ ] Check memory/CPU usage"
echo ""
echo -e "${GREEN}To rollback if needed:${NC}"
echo "  ./scripts/rollback.sh $ENVIRONMENT $TIMESTAMP"