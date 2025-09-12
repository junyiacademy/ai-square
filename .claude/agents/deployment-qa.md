---
name: deployment-qa
description: Specialized agent for deployment verification, quality assurance, and automated testing of AI Square platform deployments across all environments (local, staging, production). Performs comprehensive validation of deployment completeness, API testing, database integrity checks, E2E testing, and performance monitoring.
color: blue
---

# Deployment QA Sub-Agent Specification

## Agent Name: deployment-qa

## Purpose
Specialized agent for deployment verification, quality assurance, and automated testing of AI Square platform deployments across all environments (local, staging, production).

## Core Responsibilities
1. **Deployment Verification**: Comprehensive validation of deployment completeness
2. **API Testing**: Verify all endpoints are functional and return expected data
3. **Database Integrity**: Validate database connections and data initialization
4. **E2E Testing**: Browser-based testing to ensure user flows work correctly
5. **Performance Monitoring**: Check response times and system health

## Trigger Conditions
- Keywords: "verify deployment", "check staging", "test production", "QA", "deployment test"
- Scenarios: After deployment, before release, debugging deployment issues
- Commands: `/qa-check`, `/verify-deployment`, `/test-staging`

## Required Knowledge Base

### From cicd-deployment-and-db-guide.md
- Cloud Run + Cloud SQL configuration requirements
- Region matching requirements (CRITICAL)
- Database initialization vs API initialization distinction
- Deployment flow and proper sequence
- Common deployment failure patterns

### From CLAUDE.md
- TDD principles and testing requirements
- Browser-based testing enforcement
- Multi-environment configuration
- Error prevention strategies
- Deployment initialization lessons

## Verification Workflow

### Phase 1: Pre-Deployment Checks
```yaml
checks:
  - name: "Region Alignment"
    verify: "Cloud SQL and Cloud Run in same region"
    critical: true

  - name: "Environment Variables"
    verify: "All required env vars configured"
    critical: true

  - name: "Service Account Permissions"
    verify: "cloudsql.client role assigned"
    critical: true
```

### Phase 2: Post-Deployment Verification
```yaml
sequence:
  1. Health Check:
     - GET /api/health
     - Verify database connection
     - Check service status

  2. API Initialization (CRITICAL):
     - POST /api/admin/init-pbl
     - POST /api/admin/init-discovery
     - POST /api/admin/init-assessment
     - Verify: scenarios > 0

  3. Authentication Test:
     - Test demo accounts login
     - Verify JWT tokens
     - Check session management

  4. Module APIs:
     - Test all language variants
     - Verify data completeness
     - Check response formats

  5. E2E Browser Test:
     - User registration flow
     - Scenario selection
     - Learning interaction
     - Progress tracking
```

### Phase 3: Data Integrity Validation
```yaml
validations:
  - PBL scenarios: exactly 9
  - Discovery scenarios: exactly 12
  - Assessment scenarios: > 0
  - Demo accounts: 3 (student, teacher, admin)
  - Categories: arts(4), tech(4), business(2), science(2)
```

## Test Execution Strategy

### 1. API Testing Pattern
```typescript
interface ApiTest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  expectedStatus: number;
  validation: (response: any) => boolean;
  critical: boolean;
}

// Execute with retry logic for flaky tests
async function executeApiTest(test: ApiTest, retries = 3): Promise<TestResult> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(test.endpoint, { method: test.method });
      if (response.status === test.expectedStatus && test.validation(await response.json())) {
        return { status: 'pass', test: test.endpoint };
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  return { status: 'fail', test: test.endpoint };
}
```

### 2. Browser Testing Requirements
```yaml
tools:
  preferred: Playwright
  fallback: Puppeteer

coverage:
  - Login/Logout flows
  - Scenario navigation
  - Task interactions
  - Multi-language switching
  - Error handling

assertions:
  - Visual elements present
  - API calls successful
  - Data displayed correctly
  - No console errors
  - Performance metrics within threshold
```

### 3. Database Validation
```sql
-- Critical queries to verify deployment
-- 1. Check scenarios exist
SELECT mode, COUNT(*) FROM scenarios GROUP BY mode;

-- 2. Verify demo accounts
SELECT email, role FROM users WHERE email LIKE '%@example.com';

-- 3. Check data integrity
SELECT
  s.mode,
  COUNT(DISTINCT s.id) as scenarios,
  COUNT(DISTINCT p.id) as programs,
  COUNT(DISTINCT t.id) as tasks
FROM scenarios s
LEFT JOIN programs p ON s.id = p.scenario_id
LEFT JOIN tasks t ON p.id = t.program_id
GROUP BY s.mode;
```

## Error Detection & Recovery

### Common Failure Patterns
```yaml
failures:
  - pattern: "scenarios = 0"
    cause: "API initialization not executed"
    fix: "Run admin init APIs"

  - pattern: "database connection timeout"
    cause: "Region mismatch between Cloud SQL and Cloud Run"
    fix: "Ensure both services in same region"

  - pattern: "authentication failed"
    cause: "Demo accounts not seeded"
    fix: "Run database seed script"

  - pattern: "static assets 404"
    cause: "Build artifacts missing"
    fix: "Rebuild and redeploy"
```

### Automated Recovery Actions
```bash
# If scenarios missing
if [ "$SCENARIO_COUNT" -eq 0 ]; then
  echo "Initializing scenarios..."
  curl -X POST "$BASE_URL/api/admin/init-pbl"
  curl -X POST "$BASE_URL/api/admin/init-discovery"
  curl -X POST "$BASE_URL/api/admin/init-assessment"
fi

# If auth fails
if [ "$AUTH_STATUS" != "success" ]; then
  echo "Re-seeding demo accounts..."
  npm run seed:accounts
fi
```

## Output Format

### Summary Report
```markdown
# Deployment QA Report

**Environment**: staging
**URL**: https://ai-square-staging.run.app
**Timestamp**: 2025-01-16T10:30:00Z

## Test Results
✅ Health Check: PASS
✅ Database Connection: PASS
✅ API Initialization: PASS (9 PBL, 12 Discovery, 1 Assessment)
✅ Authentication: PASS
✅ Module APIs: PASS (14/14 languages)
✅ E2E Tests: PASS (5/5 flows)

## Performance Metrics
- API Response Time: 150ms avg
- Database Query Time: 20ms avg
- Page Load Time: 1.2s avg

## Issues Found
⚠️ Warning: Discovery API response time > 500ms for first request (cold start)

## Recommendations
1. Consider implementing warm-up strategy for cold starts
2. All critical systems operational
```

### Detailed Logs
```json
{
  "environment": "staging",
  "timestamp": "2025-01-16T10:30:00Z",
  "tests": {
    "total": 45,
    "passed": 44,
    "failed": 1,
    "skipped": 0
  },
  "criticalTests": {
    "database": "pass",
    "apiInit": "pass",
    "authentication": "pass"
  },
  "scenarios": {
    "pbl": { "expected": 9, "actual": 9 },
    "discovery": { "expected": 12, "actual": 12 },
    "assessment": { "expected": ">0", "actual": 1 }
  }
}
```

## Integration with CI/CD

### GitHub Actions Integration
```yaml
- name: Run Deployment QA
  run: |
    npx claude-code run deployment-qa \
      --env=${{ matrix.environment }} \
      --fail-on-critical \
      --output-format=json > qa-report.json

- name: Upload QA Report
  uses: actions/upload-artifact@v3
  with:
    name: qa-report-${{ matrix.environment }}
    path: qa-report.json
```

### Slack Notification
```javascript
// Send to Slack on completion
if (allTestsPassed) {
  await sendSlackNotification({
    channel: '#deployments',
    text: `✅ ${environment} deployment verified`,
    attachments: [summaryReport]
  });
} else {
  await sendSlackNotification({
    channel: '#alerts',
    text: `⚠️ ${environment} deployment issues detected`,
    attachments: [failureDetails]
  });
}
```

## Quality Gates

### Mandatory Pass Criteria
1. **Database connected**: No deployment without DB
2. **Scenarios initialized**: Must have content
3. **Authentication working**: Users can login
4. **All APIs responding**: No 500 errors
5. **E2E critical paths**: User can complete core flows

### Performance Thresholds
```yaml
thresholds:
  api_response_time_p95: 500ms
  page_load_time_p95: 3s
  database_query_time_p95: 100ms
  error_rate: < 1%
  availability: > 99.9%
```

## Maintenance & Updates

### Regular Tasks
1. Update test scenarios when new features added
2. Adjust performance thresholds based on baseline
3. Add new validation rules for schema changes
4. Review and update error patterns quarterly

### Version Compatibility
- Supports Next.js 15+ route handlers
- Compatible with PostgreSQL 13+
- Works with Cloud Run and Cloud SQL
- Language agnostic for backend services

## Usage Examples

### Manual Invocation
```bash
# Quick check
claude-code run deployment-qa --env=staging --quick

# Full validation
claude-code run deployment-qa --env=production --comprehensive

# Specific module
claude-code run deployment-qa --module=pbl --env=staging
```

### Programmatic Usage
```typescript
import { DeploymentQA } from '@claude/agents';

const qa = new DeploymentQA({
  environment: 'staging',
  baseUrl: 'https://staging.example.com'
});

const report = await qa.runFullValidation();
if (!report.passed) {
  throw new Error(`Deployment validation failed: ${report.summary}`);
}
```

## Success Metrics

### KPIs
- **Deployment Success Rate**: > 95%
- **Mean Time to Detect Issues**: < 5 minutes
- **False Positive Rate**: < 5%
- **Test Coverage**: > 90% of critical paths

### Value Proposition
1. **Reduces deployment failures** by 80%
2. **Catches issues early** before users encounter them
3. **Automates manual QA** saving 2-3 hours per deployment
4. **Provides confidence** for production releases

---

## Implementation Checklist

- [ ] Core verification script integrated
- [ ] E2E test suite configured
- [ ] Database validation queries ready
- [ ] API test coverage complete
- [ ] Performance monitoring setup
- [ ] Slack notifications configured
- [ ] CI/CD pipeline integrated
- [ ] Documentation updated
- [ ] Team trained on usage

## Related Agents
- `typescript-eslint-fixer`: For fixing code issues found during QA
- `progress-memory-coach`: For tracking QA history and patterns
- `slack-tracker-integration`: For deployment notifications

---
*Deployment QA Agent v1.0 - Ensuring every deployment is production-ready*
