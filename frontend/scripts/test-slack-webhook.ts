#!/usr/bin/env npx tsx
/**
 * Test Slack webhook integration (Direct version)
 * Usage: npm run slack:test
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testSlackWebhook() {
  console.log('🧪 Testing Slack Webhook Integration...\n');

  const webhookUrl = process.env.SLACK_AISQUARE_WEBHOOK_URL || 
                     process.env.SLACK_AISQUARE_DEV_WEBHOOK_URL || 
                     process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('❌ Slack webhook not configured\n');
    console.log('Setup instructions:');
    console.log('1. Go to your Slack workspace');
    console.log('2. Create a new app or use existing one');
    console.log('3. Enable "Incoming Webhooks"');
    console.log('4. Add new webhook to workspace');
    console.log('5. Copy the webhook URL');
    console.log('6. Add to .env.local:');
    console.log('   SLACK_AISQUARE_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL\n');
    return;
  }

  console.log('✅ Slack webhook configured\n');

  // Test 1: Simple notification
  console.log('📤 Sending test notification...');
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '🎉 AI Square Slack webhook test successful!',
        attachments: [{
          color: 'good',
          fields: [
            {
              title: 'Test Type',
              value: 'Connection Test',
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date().toLocaleString('zh-TW'),
              short: true
            }
          ]
        }]
      })
    });

    if (response.ok) {
      console.log('✅ Test notification sent successfully\n');
    } else {
      console.error('❌ Failed to send notification:', response.statusText);
      return;
    }
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return;
  }

  // Test 2: Sample report
  console.log('📊 Sending sample report...');
  
  const sampleReport = `📊 *AI Square 系統狀態報告*
${new Date().toLocaleString('zh-TW')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 *系統健康度: 95%*

📈 *今日統計*
• Commits: 5 次
• 測試通過率: 98%
• 程式碼覆蓋率: 40.2%
• TypeScript 錯誤: 0 個

🚀 *最近部署*
• 環境: Staging
• 版本: v1.5.0
• 狀態: ✅ 成功

━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: sampleReport,
        mrkdwn: true
      })
    });

    if (response.ok) {
      console.log('✅ Sample report sent successfully\n');
    } else {
      console.error('❌ Failed to send report:', response.statusText);
      return;
    }
  } catch (error) {
    console.error('❌ Error sending report:', error);
    return;
  }

  console.log('🎉 All tests completed!');
  console.log('Check your Slack channel for the messages.');
  console.log('\n💡 Tip: Use the dynamic reporting commands for real data:');
  console.log('   npm run report:ceo  - Send CEO progress report');
  console.log('   npm run report:dev  - Send development metrics report');
}

// Run test
testSlackWebhook().catch(console.error);