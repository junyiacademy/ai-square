# Cleanup System - Quick Reference Card

## 🚀 One-Line Commands

### Test All Cleanups (Dry Run)
```bash
# Preview services
gh workflow run cleanup-preview-services.yml -f dry_run=true

# Container images
gh workflow run cleanup-container-images.yml -f dry_run=true

# GitHub artifacts
gh workflow run cleanup-github-artifacts.yml -f dry_run=true

# Stale branches
gh workflow run cleanup-stale-branches.yml -f dry_run=true

# Stale PRs
gh workflow run cleanup-stale-prs.yml -f dry_run=true
```

### Check Status
```bash
# View tracking issues (all cleanup reports)
gh issue list --label automated-cleanup

# View recent runs
gh run list --workflow=cleanup-preview-services.yml --limit 3
```

### Manual Cleanup
```bash
# Delete specific preview service
gcloud run services delete ai-square-preview-issue-27 --region=asia-east1 --quiet

# Delete specific container image
gcloud container images delete gcr.io/ai-square-463013/ai-square-preview-issue-27:abc123 --quiet

# Delete specific branch
git push origin --delete fix/issue-27

# Close specific PR
gh pr close 27 --comment "Closing due to inactivity"
```

---

## 📋 Cleanup Schedule

| Workflow | Frequency | Time (Taiwan) | What it cleans |
|----------|-----------|---------------|----------------|
| **Preview Services** | Weekly | Sunday 10 AM | Orphaned Cloud Run services |
| **Container Images** | Weekly | Sunday 11 AM | Old GCR images |
| **GitHub Artifacts** | Daily | 9 AM | Old workflow artifacts |
| **Stale Branches** | Weekly | Monday 10 AM | Merged feature branches |
| **Stale PRs** | Daily | 5 PM | Inactive pull requests |

---

## 🛡️ Protection Rules

### What's NEVER Deleted

**Cloud Run Services**:
- `ai-square` (production)
- `ai-square-staging`
- Services with active branches
- Services with open PRs

**Container Images**:
- Tagged: `production`, `staging`, `latest`
- Latest 10 versions per service
- Images < 30 days old

**Branches**:
- `main`, `staging`, `master`, `develop`
- Branches with open PRs
- Unmerged branches (kept for review)

**Pull Requests**:
- Draft PRs
- PRs labeled `keep-open` or `in-progress`

---

## ⚙️ Default Thresholds

| Resource | Threshold | Keep Policy |
|----------|-----------|-------------|
| Preview Services | 7 days unused | Active branches only |
| Container Images | 30 days old | Latest 10 versions |
| GitHub Artifacts | 7 days old | Latest successful |
| Merged Branches | 30 days after merge | Protected branches |
| Stale PRs | 14 days → stale<br>30 days → close | Label protection |

---

## 🚨 Emergency Commands

### Stop All Cleanups
```bash
gh workflow disable cleanup-preview-services.yml
gh workflow disable cleanup-container-images.yml
gh workflow disable cleanup-github-artifacts.yml
gh workflow disable cleanup-stale-branches.yml
gh workflow disable cleanup-stale-prs.yml
```

### Re-enable All Cleanups
```bash
gh workflow enable cleanup-preview-services.yml
gh workflow enable cleanup-container-images.yml
gh workflow enable cleanup-github-artifacts.yml
gh workflow enable cleanup-stale-branches.yml
gh workflow enable cleanup-stale-prs.yml
```

### Check If Cleanup Deleted Something Important
```bash
# View last cleanup report
gh issue list --label automated-cleanup
gh issue view <ISSUE_NUMBER>

# View workflow logs
gh run list --workflow=cleanup-preview-services.yml --limit 1
gh run view <RUN_ID> --log
```

---

## 🎯 Common Tasks

### Adjust Cleanup Aggressiveness

**More Aggressive** (cleanup more):
```bash
gh workflow run cleanup-container-images.yml \
  -f max_age_days=14 \
  -f keep_versions=5
```

**Less Aggressive** (keep more):
```bash
gh workflow run cleanup-container-images.yml \
  -f max_age_days=60 \
  -f keep_versions=20
```

### Protect a PR from Auto-Close
```bash
gh pr edit 27 --add-label "keep-open"
# or
gh pr edit 27 --add-label "in-progress"
```

### Check Cleanup Cost Savings
```bash
# Before cleanup (estimate)
gcloud run services list --region=asia-east1 --filter="metadata.name~preview" --format="table(name)"
gcloud container images list --repository=gcr.io/ai-square-463013 --filter="name~preview"

# After cleanup
gh issue view <CLEANUP_TRACKING_ISSUE> # Check latest report
```

---

## 📊 Monitoring Dashboard

### Quick Health Check
```bash
# Count preview services
gcloud run services list --region=asia-east1 --filter="metadata.name~preview" --format="value(name)" | wc -l

# Count preview images
gcloud container images list --repository=gcr.io/ai-square-463013 --filter="name~preview" --format="value(name)" | wc -l

# Count stale PRs
gh pr list --label stale

# Count total artifacts
gh api repos/junyiacademy/ai-square/actions/artifacts --jq '.total_count'
```

### Detailed Reports
```bash
# View all tracking issues
gh issue list --label automated-cleanup --state open

# Preview Services report
gh issue view <ISSUE_NUM> --comments

# Container Images report
gh issue view <ISSUE_NUM> --comments

# Artifacts report
gh issue view <ISSUE_NUM> --comments

# Branches report
gh issue view <ISSUE_NUM> --comments

# PRs report
gh issue view <ISSUE_NUM> --comments
```

---

## 🐛 Troubleshooting

### "Workflow not found"
```bash
# List all workflows
gh workflow list

# Check if workflow file exists
ls .github/workflows/cleanup-*.yml
```

### "Permission denied"
```bash
# Check GCP authentication
gcloud config list

# Re-authenticate if needed
gcloud auth login
```

### "Service not found" (when trying to delete manually)
```bash
# List all services
gcloud run services list --region=asia-east1

# Verify service name
gcloud run services describe ai-square-preview-issue-27 --region=asia-east1
```

### Cleanup ran but nothing deleted
```bash
# Check if resources meet deletion criteria
gh run view <RUN_ID> --log

# Verify thresholds
cat .github/workflows/cleanup-preview-services.yml | grep MAX_AGE_DAYS
```

---

## 💡 Pro Tips

1. **Always test with dry-run first**
   ```bash
   gh workflow run <workflow>.yml -f dry_run=true
   ```

2. **Monitor tracking issues weekly**
   ```bash
   gh issue list --label automated-cleanup
   ```

3. **Use protection labels**
   - `keep-open` - Prevent PR auto-close
   - `in-progress` - Prevent PR auto-close

4. **Check cleanup logs for unexpected deletions**
   ```bash
   gh run list --workflow=cleanup-preview-services.yml --limit 5
   ```

5. **Cost monitoring**
   - Check tracking issues for space saved
   - Monitor GCP billing dashboard
   - Expected savings: $18-65/month

---

## 📚 Full Documentation

For complete details, see: `docs/deployment/CLEANUP_SYSTEM.md`

---

**Version**: 1.0 | **Updated**: 2026-01-11
