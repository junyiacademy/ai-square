#!/usr/bin/env node
/**
 * Test Slack webhook integration
 * Usage: npx tsx scripts/test-slack-webhook.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createSlackWebhookAgent } from '../src/lib/agents/slack-webhook-agent';

async function testSlackWebhook() {
  console.log('🧪 Testing Slack Webhook Integration...\n');

  const agent = createSlackWebhookAgent();
  if (!agent) {
    console.log('❌ Slack webhook not configured\n');
    console.log('Setup instructions:');
    console.log('1. Go to your Slack workspace');
    console.log('2. Create a new app or use existing one');
    console.log('3. Enable "Incoming Webhooks"');
    console.log('4. Add new webhook to workspace');
    console.log('5. Copy the webhook URL');
    console.log('6. Add to .env.local:');
    console.log('   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL\n');
    return;
  }

  console.log('✅ Slack webhook configured\n');

  // Test 1: Simple notification
  console.log('📤 Sending test notification...');
  try {
    await agent.sendNotification('AI Square Slack webhook test successful! 🎉', 'success');
    console.log('✅ Notification sent\n');
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
    return;
  }

  // Test 2: Work progress summary
  console.log('📊 Testing work progress summary...');
  
  // Add some test data
  agent.addProgress({
    taskName: 'Test Coverage Improvement',
    status: 'completed',
    duration: '30m',
    details: 'Increased coverage from 39.44% to 40.2%',
    metrics: {
      'Tests Added': 15,
      'Lines Covered': 81,
      'Final Coverage (%)': 40.2
    }
  });

  agent.addProgress({
    taskName: 'TypeScript Error Fixes',
    status: 'completed',
    duration: '1h 15m',
    details: 'Fixed all TypeScript errors in test files',
    metrics: {
      'Errors Fixed': 102,
      'Files Updated': 45
    }
  });

  agent.addProgress({
    taskName: 'Slack Integration',
    status: 'completed',
    duration: '45m',
    details: 'Implemented Slack webhook agent'
  });

  agent.addProgress({
    taskName: 'Production Deploy',
    status: 'failed',
    errors: [
      'Cloud Run deployment timeout',
      'Health check failed'
    ]
  });

  try {
    await agent.sendSummary();
    console.log('✅ Summary sent\n');
  } catch (error) {
    console.error('❌ Failed to send summary:', error);
    return;
  }

  console.log('🎉 All tests completed!');
  console.log('Check your Slack channel for the messages.');
}

// Run test
testSlackWebhook().catch(console.error);