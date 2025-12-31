# AI Square Agents for Claude Code

This directory contains specialized agents for AI Square development workflow.

## Available Agents

### 1. 🔧 Development Tracker Agent

**Purpose**: Track development progress and send summaries to Slack
**Target**: Developers
**Location**: `./development-tracker.ts`

#### How to Use:

```typescript
import { devTracker } from "@/lib/agents/development-tracker";

// Track test results
devTracker.trackTests(
  passedCount, // number of tests passed
  failedCount, // number of tests failed
  duration, // e.g., "12.5s"
);

// Track build status
devTracker.trackBuild(
  success, // boolean: true if build succeeded
  duration, // e.g., "45s"
  bundleSize, // e.g., "2.3MB" (optional)
);

// Track code fixes
devTracker.trackCodeFixes(
  "typescript", // or 'eslint'
  fixedCount, // number of issues fixed
  remainingCount, // number of issues remaining
);

// Track feature progress
devTracker.trackFeature(
  "Feature Name",
  "completed", // or 'in_progress' or 'failed'
  "Optional details",
);

// Send summary to Slack
await devTracker.sendSummary();

// Quick notification
await devTracker.notify("Deployment started", "info");
```

#### Automatic Features:

- **Auto-summary on exit**: In development mode, pressing Ctrl+C automatically sends a work summary
- **Real-time notifications**: Each tracked item can be sent to Slack immediately

---

### 2. 📊 CEO Release Tracker Agent

**Purpose**: Report release readiness and answer "When can we launch?"
**Target**: CEO/Management
**Location**: `./ceo-release-tracker.ts`

#### How to Call:

```bash
# Send CEO release report
npm run ceo:report
```

#### How to Update Status:

Edit `currentReleaseStatus` in `ceo-release-tracker.ts`:

```typescript
export const currentReleaseStatus = {
  targetReleaseDate: "2025-03-15", // Conservative estimate

  features: [
    {
      feature: "User Authentication",
      mustHave: true, // Is this required for launch?
      currentStatus: "testing", // 'not-started' | 'in-progress' | 'testing' | 'completed'
      completionPercentage: 80, // 0-100
      userBenefit: "Users can login and save progress",
      remainingDays: 5, // Days needed to complete
    },
    // ... more features
  ],

  blockers: [
    {
      issue: "Staging environment not ready",
      impact: "Cannot test in production-like environment",
      resolution: "Setting up staging with Cloud SQL, Redis",
      estimatedDays: 3,
    },
    // ... more blockers
  ],

  quality: {
    testCoverage: 40, // Current test coverage %
    criticalBugs: 0, // Number of critical bugs
    performance: "Dev: 2.1s load", // Performance metrics
    userReadiness: "Features complete, needs testing",
  },

  todayCompleted: [
    "Fixed TypeScript errors",
    "Added Slack integration",
    // ... what was done today
  ],

  tomorrowPlan: [
    "Set up staging environment",
    "Run E2E tests",
    // ... what will be done tomorrow
  ],
};
```

#### Report Contents:

- **Can we launch?** Yes/No answer
- **Estimated launch date** with confidence level
- **Must-have features** completion status
- **Blockers** preventing launch
- **Quality metrics** (tests, bugs, performance)
- **Daily progress** (completed/planned)

---

## Environment Setup

Both agents use Slack webhooks. Add to `.env.local`:

```bash
# For development notifications
SLACK_AISQUARE_DEV_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Testing

```bash
# Test Slack connection
npm run slack:test

# Send CEO report
npm run ceo:report
```

## Integration Examples

### In GitHub Actions

```yaml
- name: Send Release Report
  run: npm run ceo:report
  env:
    SLACK_AISQUARE_DEV_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### In Development Scripts

```typescript
// After running tests
const results = await runTests();
devTracker.trackTests(results.passed, results.failed, results.duration);

// After build
const buildResult = await build();
devTracker.trackBuild(buildResult.success, buildResult.time, buildResult.size);

// Send daily summary
await devTracker.sendSummary();
```

### Daily Workflow

1. **Morning**: Run `npm run ceo:report` to update CEO
2. **During dev**: Use `devTracker` to track progress
3. **End of day**: Press Ctrl+C to auto-send summary

---

## Notes for Claude Code

When using these agents in Claude Code:

1. Both agents send to the same Slack channel (dev webhook)
2. CEO agent focuses on launch readiness
3. Dev agent tracks detailed work progress
4. Update `currentReleaseStatus` daily for accurate CEO reports
5. Use `devTracker` in code for automatic progress tracking
