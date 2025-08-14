#!/bin/bash

# Emergency Rollback Script
# Usage: ./scripts/rollback.sh [staging|production] [timestamp]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-staging}
TIMESTAMP=$2

echo -e "${RED}🚨 EMERGENCY ROLLBACK${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Rolling back to: $TIMESTAMP${NC}"
echo ""

echo -e "${RED}⚠️  This will:${NC}"
echo "  1. Revert application to previous version"
echo "  2. Restore database from backup (if specified)"
echo "  3. Clear caches"
echo ""
echo -e "${YELLOW}Continue? (yes/no)${NC}"
read -r response

if [ "$response" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

# 1. Rollback Application
echo -e "${YELLOW}Step 1: Rolling back application...${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    # Find previous revision
    PREVIOUS_REVISION=$(gcloud run revisions list \
        --service ai-square-frontend \
        --platform managed \
        --region asia-east1 \
        --format "value(name)" \
        --limit 2 | tail -1)
    
    # Switch traffic to previous version
    gcloud run services update-traffic ai-square-frontend \
        --to-revisions=$PREVIOUS_REVISION=100 \
        --platform managed \
        --region asia-east1
else
    PREVIOUS_REVISION=$(gcloud run revisions list \
        --service ai-square-frontend-staging \
        --platform managed \
        --region asia-east1 \
        --format "value(name)" \
        --limit 2 | tail -1)
    
    gcloud run services update-traffic ai-square-frontend-staging \
        --to-revisions=$PREVIOUS_REVISION=100 \
        --platform managed \
        --region asia-east1
fi

echo -e "${GREEN}✓ Application rolled back to: $PREVIOUS_REVISION${NC}"

# 2. Database Rollback (Optional)
echo -e "${YELLOW}Restore database from backup? (y/n)${NC}"
read -r response

if [ "$response" = "y" ]; then
    echo -e "${YELLOW}Step 2: Restoring database...${NC}"
    
    BACKUP_FILE="backups/${ENVIRONMENT}_backup_$TIMESTAMP.sql"
    
    if [ -f "$BACKUP_FILE" ]; then
        echo -e "${RED}⚠️  This will DELETE all current data and restore from backup!${NC}"
        echo -e "${YELLOW}Type 'RESTORE' to confirm:${NC}"
        read -r confirm
        
        if [ "$confirm" = "RESTORE" ]; then
            # Create current backup first
            EMERGENCY_BACKUP="backups/emergency_${ENVIRONMENT}_$(date +%Y%m%d_%H%M%S).sql"
            pg_dump $DATABASE_URL > $EMERGENCY_BACKUP
            echo -e "${GREEN}✓ Emergency backup created: $EMERGENCY_BACKUP${NC}"
            
            # Restore from backup
            psql $DATABASE_URL < $BACKUP_FILE
            echo -e "${GREEN}✓ Database restored from: $BACKUP_FILE${NC}"
        else
            echo "Database restore cancelled."
        fi
    else
        echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
    fi
fi

# 3. Clear Caches
echo -e "${YELLOW}Step 3: Clearing caches...${NC}"
# Clear Redis cache if using
redis-cli FLUSHALL

# Clear CDN cache if using
# gcloud compute url-maps invalidate-cdn-cache ...

echo -e "${GREEN}✓ Caches cleared${NC}"

# 4. Health Check
echo -e "${YELLOW}Step 4: Verifying rollback...${NC}"
sleep 5

if [ "$ENVIRONMENT" = "production" ]; then
    HEALTH_URL="https://ai-square-frontend-xxxxx.asia-east1.run.app/api/health"
else
    HEALTH_URL="https://ai-square-frontend-staging-xxxxx.asia-east1.run.app/api/health"
fi

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Service is healthy${NC}"
else
    echo -e "${RED}⚠️  Health check failed: $HEALTH_STATUS${NC}"
fi

echo ""
echo -e "${GREEN}🔄 Rollback Complete!${NC}"
echo -e "${YELLOW}Please verify:${NC}"
echo "  [ ] Application is functioning correctly"
echo "  [ ] Users can log in"
echo "  [ ] Critical features are working"
echo "  [ ] Check error logs for issues"