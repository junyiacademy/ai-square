# Automated Cleanup System

## Overview

The AI Square project implements a comprehensive automated cleanup system to manage cloud resources, container images, GitHub artifacts, and stale branches/PRs. This system ensures cost optimization, resource hygiene, and prevents accumulation of unused resources.

## Philosophy

Following the "Infrastructure First" principle:
- ✅ Production-grade automation from Day 1
- ✅ Safe defaults with manual override options
- ✅ Comprehensive logging and reporting
- ✅ Dry-run mode for testing
- ❌ No temporary or manual cleanup scripts

## Cleanup Workflows

### 1. Preview Services Cleanup

**File**: `.github/workflows/cleanup-preview-services.yml`

**Purpose**: Cleanup orphaned preview Cloud Run services that no longer have active branches or PRs.

**Schedule**: Every Sunday at 2 AM UTC (10 AM Taiwan)

**What it does**:
- Finds all preview services matching `ai-square-preview-issue-*`
- Checks if corresponding branch exists
- Checks if PR is still open
- Deletes services older than 7 days with no active branch/PR
- Also deletes associated container images

**Safety**:
- Never deletes `ai-square` (production) or `ai-square-staging`
- Keeps services with active branches or open PRs
- Dry-run mode available

**Manual trigger**:
```bash
gh workflow run cleanup-preview-services.yml -f max_age_days=7 -f dry_run=true
```

**Configuration**:
- `max_age_days`: Maximum age for unused services (default: 7)
- `dry_run`: Test mode without actual deletion (default: false)

---

### 2. Container Images Cleanup

**File**: `.github/workflows/cleanup-container-images.yml`

**Purpose**: Cleanup old container images from GCR to save storage costs.

**Schedule**: Every Sunday at 3 AM UTC (11 AM Taiwan)

**What it does**:
- Finds preview images: `gcr.io/ai-square-463013/ai-square-preview-issue-*`
- Keeps latest 10 versions per service
- Deletes images older than 30 days (except latest 10)
- Never deletes images tagged `production`, `staging`, or `latest`
- Removes untagged images older than 7 days

**Safety**:
- Protected tags: `production`, `staging`, `latest`
- Always keeps N most recent versions
- Separate handling for untagged images

**Manual trigger**:
```bash
gh workflow run cleanup-container-images.yml \
  -f max_age_days=30 \
  -f keep_versions=10 \
  -f dry_run=true
```

**Configuration**:
- `max_age_days`: Maximum age for deletion (default: 30)
- `keep_versions`: Number of recent versions to keep (default: 10)
- `dry_run`: Test mode (default: false)

**Cost Impact**: Can save $5-20/month in GCR storage costs

---

### 3. GitHub Artifacts Cleanup

**File**: `.github/workflows/cleanup-github-artifacts.yml`

**Purpose**: Remove old workflow artifacts to free up GitHub storage.

**Schedule**: Daily at 1 AM UTC (9 AM Taiwan)

**What it does**:
- Finds artifacts older than 7 days
- Keeps latest successful build artifacts
- Deletes old test reports, screenshots, logs
- Reports space saved

**Safety**:
- Always keeps latest successful artifacts
- Respects `keep_successful` flag
- Age-based deletion only

**Manual trigger**:
```bash
gh workflow run cleanup-github-artifacts.yml \
  -f max_age_days=7 \
  -f keep_successful=true \
  -f dry_run=true
```

**Configuration**:
- `max_age_days`: Maximum artifact age (default: 7)
- `keep_successful`: Keep latest successful builds (default: true)
- `dry_run`: Test mode (default: false)

**Cost Impact**: GitHub has 2GB free storage, this prevents overage charges

---

### 4. Stale Branches Cleanup

**File**: `.github/workflows/cleanup-stale-branches.yml`

**Purpose**: Remove merged feature branches to keep repository clean.

**Schedule**: Every Monday at 2 AM UTC (10 AM Taiwan)

**What it does**:
- Finds merged `fix/issue-*` and `feat/issue-*` branches
- Deletes branches older than 30 days after merge
- Keeps branches with open PRs
- Keeps unmerged branches for manual review

**Safety**:
- Protected branches: `main`, `staging`, `master`, `develop`
- Only deletes merged branches
- Unmerged branches kept for manual review
- Never deletes branches with open PRs

**Manual trigger**:
```bash
gh workflow run cleanup-stale-branches.yml \
  -f max_age_days=30 \
  -f dry_run=true
```

**Configuration**:
- `max_age_days`: Age threshold for merged branches (default: 30)
- `dry_run`: Test mode (default: false)

---

### 5. Stale PRs Management

**File**: `.github/workflows/cleanup-stale-prs.yml`

**Purpose**: Mark inactive PRs as stale and eventually close them.

**Schedule**: Daily at 9 AM UTC (5 PM Taiwan)

**What it does**:
- Marks PRs as `stale` after 14 days of inactivity
- Closes stale PRs after 30 days total inactivity
- Leaves helpful comments with instructions
- Respects `keep-open` and `in-progress` labels

**Safety**:
- Never touches draft PRs
- Respects protection labels (`keep-open`, `in-progress`)
- Provides clear warnings before closure
- Can be reopened if still needed

**Manual trigger**:
```bash
gh workflow run cleanup-stale-prs.yml \
  -f stale_days=14 \
  -f close_days=30 \
  -f dry_run=true
```

**Configuration**:
- `stale_days`: Days before marking stale (default: 14)
- `close_days`: Days before auto-closing (default: 30)
- `dry_run`: Test mode (default: false)

**How to prevent auto-closure**:
Add label `keep-open` or `in-progress` to PR

---

## Reporting System

All cleanup workflows report to centralized tracking issues:

| Workflow | Tracking Issue Label | Report Frequency |
|----------|---------------------|------------------|
| Preview Services | `automated-cleanup`, `infrastructure` | Weekly |
| Container Images | `automated-cleanup`, `infrastructure` | Weekly |
| GitHub Artifacts | `automated-cleanup`, `infrastructure` | Daily |
| Stale Branches | `automated-cleanup`, `infrastructure` | Weekly |
| Stale PRs | `automated-cleanup`, `infrastructure` | Daily |

**Find tracking issues**:
```bash
gh issue list --label automated-cleanup
```

Each cleanup run posts a comment with:
- Summary statistics
- Deleted resources list
- Kept resources (with reasons)
- Timestamp and mode (dry-run or production)

---

## Testing Cleanup Workflows

### Before Production Use

**Step 1: Dry Run All Workflows**
```bash
# Test preview services cleanup
gh workflow run cleanup-preview-services.yml -f dry_run=true

# Test container images cleanup
gh workflow run cleanup-container-images.yml -f dry_run=true

# Test artifacts cleanup
gh workflow run cleanup-github-artifacts.yml -f dry_run=true

# Test branches cleanup
gh workflow run cleanup-stale-branches.yml -f dry_run=true

# Test stale PRs
gh workflow run cleanup-stale-prs.yml -f dry_run=true
```

**Step 2: Check Logs**
```bash
gh run list --limit 5
gh run view <run-id> --log
```

**Step 3: Review Reports**
Check tracking issues for dry-run results.

**Step 4: Enable Production Mode**
Once satisfied, let scheduled runs execute normally (dry_run=false).

---

## Cost Savings

Expected monthly savings from cleanup automation:

| Resource | Before Cleanup | After Cleanup | Savings |
|----------|---------------|---------------|---------|
| Preview Cloud Run | $10-30 | $2-5 | $8-25 |
| GCR Storage | $15-40 | $5-10 | $10-30 |
| GitHub Artifacts | $0-10 | $0 | $0-10 |
| **Total** | **$25-80** | **$7-15** | **$18-65/month** |

*Actual savings depend on usage patterns*

---

## Monitoring and Alerts

### Check Cleanup Status

```bash
# View recent cleanup runs
gh run list --workflow=cleanup-preview-services.yml --limit 5
gh run list --workflow=cleanup-container-images.yml --limit 5
gh run list --workflow=cleanup-github-artifacts.yml --limit 5
gh run list --workflow=cleanup-stale-branches.yml --limit 5
gh run list --workflow=cleanup-stale-prs.yml --limit 5

# View tracking issues
gh issue list --label automated-cleanup
```

### Verify GCP Resources

```bash
# Check preview services
gcloud run services list --region=asia-east1 --filter="metadata.name~preview"

# Check container images
gcloud container images list --repository=gcr.io/ai-square-463013 --filter="name~preview"

# Check storage usage
gcloud container images list-tags gcr.io/ai-square-463013/ai-square-preview-issue-27 --format="table(digest,timestamp)"
```

---

## Manual Cleanup Commands

If you need to manually cleanup specific resources:

### Delete Specific Preview Service
```bash
SERVICE_NAME="ai-square-preview-issue-27"
gcloud run services delete $SERVICE_NAME --region=asia-east1 --quiet
```

### Delete Specific Container Image
```bash
IMAGE="gcr.io/ai-square-463013/ai-square-preview-issue-27:abc123"
gcloud container images delete $IMAGE --quiet
```

### Delete Specific Branch
```bash
git push origin --delete fix/issue-27
```

### Close Specific PR
```bash
gh pr close 27 --comment "Closing due to inactivity"
```

---

## Troubleshooting

### Cleanup Not Running

**Check workflow status**:
```bash
gh workflow list
gh workflow view cleanup-preview-services.yml
```

**Re-enable if disabled**:
```bash
gh workflow enable cleanup-preview-services.yml
```

### Too Many Resources Deleted

**Immediate action**:
1. Disable workflow: `gh workflow disable <workflow-name>`
2. Check tracking issue for deletion report
3. Review logs: `gh run view <run-id> --log`
4. Manually restore if needed (from backup or rebuild)

**Prevention**:
- Use dry-run mode first
- Adjust thresholds (max_age_days, keep_versions)
- Add protection labels

### Not Enough Resources Deleted

**Adjust thresholds**:
```bash
# More aggressive cleanup
gh workflow run cleanup-container-images.yml \
  -f max_age_days=14 \
  -f keep_versions=5
```

---

## Best Practices

### 1. Start Conservative
- Use default thresholds initially
- Monitor for 2-4 weeks
- Adjust based on actual patterns

### 2. Use Protection Labels
Mark important PRs with `keep-open` or `in-progress`

### 3. Regular Review
- Check tracking issues weekly
- Verify cost savings monthly
- Adjust thresholds quarterly

### 4. Testing Changes
Always use `dry_run=true` when testing new configurations

### 5. Document Exceptions
If you need to keep specific resources, document why in the tracking issue

---

## Integration with Per-Issue Preview Workflow

The cleanup system is designed to work seamlessly with the per-issue preview deployment:

```
Issue #27 → fix/issue-27 → Preview Deploy → PR Merged → Auto Cleanup
                                ↓
                    ai-square-preview-issue-27
                                ↓
                    (Cleaned up 7 days after PR close)
```

### Lifecycle
1. **Deploy**: Push to `fix/issue-27` → Preview service created
2. **Test**: Case owner tests on preview URL
3. **Merge**: PR merged to staging
4. **Immediate**: `preview-deploy.yml` deletes service on PR close
5. **Backup**: `cleanup-preview-services.yml` catches any orphaned services weekly

### Why Two Cleanup Mechanisms?

**Immediate (preview-deploy.yml)**:
- Triggered by PR close event
- Cleans up immediately
- Requires PR to exist

**Scheduled (cleanup-preview-services.yml)**:
- Runs weekly
- Catches orphaned services (if PR cleanup failed)
- Finds services with deleted branches
- Safety net for edge cases

---

## Future Enhancements

### Planned
- [ ] Slack notifications for significant cleanups (>3 resources)
- [ ] Cost tracking integration with GCP billing
- [ ] ML-based prediction of optimal thresholds
- [ ] Automated rollback for accidental deletions

### Under Consideration
- [ ] Cleanup of old Cloud SQL backups
- [ ] Cleanup of old Secret Manager versions
- [ ] Cleanup of old Cloud Logging entries
- [ ] Cleanup of old Cloud Build artifacts

---

## References

- **Preview Deploy Workflow**: `.github/workflows/preview-deploy.yml`
- **GCP Cleanup Best Practices**: https://cloud.google.com/architecture/best-practices-for-cost-optimization
- **GitHub Actions Cleanup**: https://docs.github.com/en/actions/managing-workflow-runs/removing-workflow-artifacts

---

**Version**: 1.0
**Last Updated**: 2026-01-11
**Maintainer**: AI Square Infrastructure Team
