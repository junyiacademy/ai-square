# Slack Webhook Setup - Quick Guide

## 1. Create Incoming Webhook (2 minutes)

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name: "AI Square Bot", select your workspace
4. Go to **"Incoming Webhooks"** → Toggle **ON**
5. Click **"Add New Webhook to Workspace"**
6. Choose a channel (e.g., #dev-updates)
7. Copy the webhook URL

## 2. Configure AI Square

Add to `.env.local`:
```bash
# For development work
SLACK_AISQUARE_DEV_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX

# For production notifications (optional)
SLACK_AISQUARE_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

## 3. Test It

```bash
npx tsx scripts/test-slack-webhook.ts
```

## Usage Examples

### In Your Code
```typescript
import { devTracker } from '@/lib/agents/development-tracker';

// Track progress
devTracker.trackTests(150, 0, '10s');
devTracker.trackFeature('User Auth', 'completed');

// Send summary
await devTracker.sendSummary();
```

### Automatic Summaries
- In development: Auto-sends summary when you press Ctrl+C
- In production: Call `devTracker.sendSummary()` manually

### Quick Notifications
```typescript
await devTracker.notify('Deployment started', 'info');
await devTracker.notify('Build failed!', 'error');
```

## Message Format

Messages appear in Slack with:
- 📊 Work progress overview
- ✅ Completed tasks with metrics
- ❌ Failed tasks with errors
- 📈 Performance metrics

## Security

- Keep webhook URL secret (it's in `.gitignore`)
- Use different webhooks for dev/prod
- Webhooks are write-only (can't read messages)

That's it! Your development progress will now be tracked in Slack. 🎉
