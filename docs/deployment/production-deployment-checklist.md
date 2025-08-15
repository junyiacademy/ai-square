# Production Deployment Checklist for AI Square

## 🔐 Pre-Deployment Security Checklist

### Secret Manager Setup
- [ ] Create production secrets in Google Secret Manager:
  ```bash
  # Database password
  echo -n "YOUR_SECURE_PASSWORD" | gcloud secrets create db-password-production --data-file=-
  
  # NextAuth secret
  echo -n "$(openssl rand -base64 32)" | gcloud secrets create nextauth-secret-production --data-file=-
  
  # JWT secret
  echo -n "$(openssl rand -base64 32)" | gcloud secrets create jwt-secret-production --data-file=-
  
  # Claude API key
  echo -n "YOUR_CLAUDE_API_KEY" | gcloud secrets create claude-api-key-production --data-file=-
  
  # Google credentials (service account JSON)
  gcloud secrets create google-credentials-production --data-file=path/to/service-account.json
  ```

### Cloud SQL Production Instance
- [ ] Create production Cloud SQL instance:
  ```bash
  gcloud sql instances create ai-square-db-production \
    --database-version=POSTGRES_15 \
    --tier=db-n1-standard-2 \
    --region=asia-east1 \
    --network=default \
    --no-assign-ip \
    --backup \
    --backup-start-time=03:00 \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=03
  ```

- [ ] Create production database:
  ```bash
  gcloud sql databases create ai_square_db \
    --instance=ai-square-db-production
  ```

- [ ] Set strong password for postgres user:
  ```bash
  gcloud sql users set-password postgres \
    --instance=ai-square-db-production \
    --password=YOUR_SECURE_PASSWORD
  ```

## 📋 Environment Variables Checklist

### Required Secrets (in Secret Manager)
- [ ] `db-password-production` - Strong database password
- [ ] `nextauth-secret-production` - Random 32+ character string
- [ ] `jwt-secret-production` - Random 32+ character string
- [ ] `claude-api-key-production` - Claude API key for translations
- [ ] `google-credentials-production` - Service account JSON

### Required Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `DB_HOST=/cloudsql/PROJECT:REGION:INSTANCE`
- [ ] `DB_NAME=ai_square_db`
- [ ] `DB_USER=postgres`
- [ ] `NEXTAUTH_URL=https://your-production-domain.com`

## 🚀 Deployment Steps

### 1. Database Initialization
```bash
# Deploy application first (without scenarios)
SKIP_DB_INIT=true ./deploy-production.sh

# Initialize schema via API
curl -X POST "https://YOUR-SERVICE-URL/api/admin/init-schema" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json"

# Verify schema
curl "https://YOUR-SERVICE-URL/api/admin/init-schema"
```

### 2. Scenario Initialization
```bash
# Initialize scenarios (one-time setup)
INIT_SCENARIOS=true ./deploy-production.sh

# Or manually:
curl -X POST "https://YOUR-SERVICE-URL/api/admin/init-assessment" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'

curl -X POST "https://YOUR-SERVICE-URL/api/admin/init-pbl" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'

curl -X POST "https://YOUR-SERVICE-URL/api/admin/init-discovery" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

### 3. Health Verification
```bash
# Check health status
curl "https://YOUR-SERVICE-URL/api/health"

# Verify scenario counts
curl "https://YOUR-SERVICE-URL/api/admin/init-schema"
```

## ✅ Post-Deployment Verification

### Application Health
- [ ] `/api/health` returns "healthy"
- [ ] Database connection successful
- [ ] All 22 scenarios loaded (1 assessment, 9 PBL, 12 discovery)

### Security Verification
- [ ] HTTPS enforced
- [ ] Admin endpoints protected
- [ ] Secrets not exposed in logs
- [ ] CORS properly configured

### Performance Checks
- [ ] Response time < 2 seconds
- [ ] Memory usage < 80%
- [ ] CPU usage < 70%
- [ ] No error spikes in logs

### Functional Testing
- [ ] User registration works
- [ ] User login works
- [ ] PBL scenarios accessible
- [ ] Assessment scenarios functional
- [ ] Discovery scenarios loading
- [ ] AI features responding

## 🔍 Monitoring Setup

### Cloud Monitoring
```bash
# Set up uptime check
gcloud monitoring uptime-checks create ai-square-production \
  --display-name="AI Square Production" \
  --monitored-resource="type=uptime_url,host=YOUR-SERVICE-URL" \
  --check-interval=5m

# Set up alert policy
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="AI Square Production Alerts" \
  --condition-display-name="High Error Rate" \
  --condition-expression='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.label.response_code_class="5xx"'
```

### Log Monitoring
```bash
# View recent logs
gcloud run logs read --service ai-square-production --region asia-east1 --limit 100

# Stream logs
gcloud run logs tail --service ai-square-production --region asia-east1

# View errors only
gcloud run logs read --service ai-square-production --region asia-east1 --filter="severity>=ERROR"
```

## 🔄 Rollback Procedures

### Quick Rollback
```bash
# List all revisions
gcloud run revisions list --service ai-square-production --region asia-east1

# Rollback to previous revision
gcloud run services update-traffic ai-square-production \
  --to-revisions=PREVIOUS_REVISION_ID=100 \
  --region asia-east1
```

### Database Rollback
```bash
# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=ai-square-db-production \
  --backup-id=BACKUP_ID
```

## 📊 Performance Optimization

### Cloud Run Configuration
- [ ] Set minimum instances to 1 (avoid cold starts)
- [ ] Set maximum instances based on load
- [ ] Configure CPU and memory appropriately
- [ ] Enable CPU boost for faster startup

### Database Optimization
- [ ] Enable connection pooling
- [ ] Set appropriate connection limits
- [ ] Enable query insights
- [ ] Regular vacuum and analyze

### Caching Strategy
- [ ] Enable Redis for production
- [ ] Configure CDN for static assets
- [ ] Set appropriate cache headers
- [ ] Enable browser caching

## 🛡️ Security Hardening

### Access Control
- [ ] Enable Identity-Aware Proxy (IAP) if needed
- [ ] Configure Cloud Armor for DDoS protection
- [ ] Set up VPC Service Controls
- [ ] Enable audit logging

### Compliance
- [ ] Regular security scans
- [ ] Dependency updates
- [ ] SSL certificate management
- [ ] Data encryption at rest

## 📝 Documentation Updates

- [ ] Update README with production URL
- [ ] Document deployment process
- [ ] Update API documentation
- [ ] Create runbook for common issues

## 🎯 Success Criteria

✅ **Deployment is successful when:**
1. Health check returns "healthy"
2. All 22 scenarios are accessible
3. No errors in logs for 30 minutes
4. Response time < 2 seconds for 95% of requests
5. All functional tests pass
6. Security scan shows no critical issues

## 🚨 Emergency Contacts

- **On-call Engineer**: [Contact Info]
- **Database Admin**: [Contact Info]
- **Security Team**: [Contact Info]
- **Product Manager**: [Contact Info]

## 📚 References

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Best Practices](https://cloud.google.com/sql/docs/postgres/best-practices)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud Monitoring Setup](https://cloud.google.com/monitoring/support/set-up)

---

**Last Updated**: 2025-01-14
**Version**: 1.0
**Status**: Ready for Production Deployment