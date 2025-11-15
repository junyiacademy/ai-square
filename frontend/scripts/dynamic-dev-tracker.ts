#!/usr/bin/env npx tsx
/**
 * 動態開發追蹤器
 * 即時讀取開發活動，不修改任何源代碼
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

interface DevMetrics {
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  buildStatus: 'success' | 'failed';
  buildTime?: number;
  typeScriptErrors: number;
  eslintWarnings: number;
  commitsToday: number;
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
}

interface DevSession {
  startTime: Date;
  endTime?: Date;
  tasks: string[];
  metrics: DevMetrics;
  featuresCompleted: string[];
  currentWork: string;
}

class DynamicDevTracker {
  private sessionFile = path.join(process.cwd(), '.dev-session.json');
  private webhookUrl = process.env.SLACK_AISQUARE_DEV_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;

  /**
   * 獲取今日的開發指標
   */
  private collectMetrics(): DevMetrics {
    const metrics: DevMetrics = {
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      buildStatus: 'success',
      typeScriptErrors: 0,
      eslintWarnings: 0,
      commitsToday: 0,
      filesChanged: 0,
      linesAdded: 0,
      linesDeleted: 0
    };

    // 測試結果
    try {
      // 執行測試並捕獲輸出（不使用 JSON，因為失敗時無法生成）
      const testOutput = execSync('npm run test:ci 2>&1 || true', {
        encoding: 'utf-8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      // 解析測試輸出
      const testsMatch = testOutput.match(/Tests:\s+(\d+) failed(?:, (\d+) skipped)?, (\d+) passed, (\d+) total/);
      if (testsMatch) {
        metrics.testsFailed = parseInt(testsMatch[1]) || 0;
        metrics.testsPassed = parseInt(testsMatch[3]) || 0;
        metrics.testsRun = parseInt(testsMatch[4]) || 0;
      } else {
        // 備用：檢查是否所有測試都通過
        const allPassMatch = testOutput.match(/Tests:\s+(\d+) passed, (\d+) total/);
        if (allPassMatch) {
          metrics.testsPassed = parseInt(allPassMatch[1]) || 0;
          metrics.testsRun = parseInt(allPassMatch[2]) || 0;
          metrics.testsFailed = 0;
        }
      }
    } catch (error) {
      // 即使命令失敗也嘗試解析輸出
      console.error('測試執行錯誤，但會嘗試解析結果');
      metrics.testsFailed = 1;
    }

    // Build 狀態
    try {
      const start = Date.now();
      execSync('npm run build', { stdio: 'pipe' });
      metrics.buildStatus = 'success';
      metrics.buildTime = Date.now() - start;
    } catch {
      metrics.buildStatus = 'failed';
    }

    // TypeScript 錯誤
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      metrics.typeScriptErrors = 0;
    } catch (error: any) {
      const output = error.stdout ? error.stdout.toString() : '';
      const matches = output.match(/Found (\d+) error/);
      metrics.typeScriptErrors = matches ? parseInt(matches[1]) : 0;
    }

    // ESLint 警告
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      metrics.eslintWarnings = 0;
    } catch (error: any) {
      const output = error.stdout ? error.stdout.toString() : '';
      const matches = output.match(/(\d+) warning/);
      metrics.eslintWarnings = matches ? parseInt(matches[1]) : 0;
    }

    // Git 統計
    try {
      // 今日 commits
      const today = new Date().toISOString().split('T')[0];
      const commits = execSync(
        `git log --since="${today} 00:00:00" --pretty=format:"%H" --no-merges`,
        { encoding: 'utf-8' }
      ).trim();
      metrics.commitsToday = commits ? commits.split('\n').length : 0;

      // 檔案變更統計
      const stats = execSync('git diff --stat', { encoding: 'utf-8' });
      const fileMatch = stats.match(/(\d+) files? changed/);
      const insertMatch = stats.match(/(\d+) insertions?\(\+\)/);
      const deleteMatch = stats.match(/(\d+) deletions?\(-\)/);

      metrics.filesChanged = fileMatch ? parseInt(fileMatch[1]) : 0;
      metrics.linesAdded = insertMatch ? parseInt(insertMatch[1]) : 0;
      metrics.linesDeleted = deleteMatch ? parseInt(deleteMatch[1]) : 0;
    } catch {
      // Git 統計失敗
    }

    return metrics;
  }

  /**
   * 分析最近的開發活動
   */
  private analyzeRecentActivity(): { features: string[], currentWork: string } {
    try {
      // 最近的 commits
      const commits = execSync(
        'git log --since="1 day ago" --pretty=format:"%s" --no-merges -10',
        { encoding: 'utf-8' }
      ).split('\n').filter(Boolean);

      const features = commits
        .filter(c => c.includes('feat:') || c.includes('fix:'))
        .slice(0, 5);

      // 當前分支
      const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

      // 未提交的變更
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      const modifiedFiles = status.split('\n').filter(l => l.startsWith(' M')).length;

      const currentWork = modifiedFiles > 0
        ? `在 ${branch} 分支上修改 ${modifiedFiles} 個檔案`
        : `在 ${branch} 分支上工作`;

      return { features, currentWork };
    } catch {
      return { features: [], currentWork: '開發中' };
    }
  }

  /**
   * 生成開發報告
   */
  public generateDevReport(): string {
    const metrics = this.collectMetrics();
    const { features, currentWork } = this.analyzeRecentActivity();

    // 計算健康度分數
    const healthScore = this.calculateHealthScore(metrics);
    const healthEmoji = healthScore >= 80 ? '🟢' : healthScore >= 60 ? '🟡' : '🔴';

    return `📊 *開發活動即時報告*
${new Date().toLocaleString('zh-TW')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${healthEmoji} *專案健康度: ${healthScore}%*

📈 *今日開發統計*
• Commits: ${metrics.commitsToday} 次
• 檔案變更: ${metrics.filesChanged} 個
• 新增: +${metrics.linesAdded} 行
• 刪除: -${metrics.linesDeleted} 行

🧪 *測試狀態*
• 執行: ${metrics.testsRun} 個測試
• 通過: ${metrics.testsPassed} ✅
• 失敗: ${metrics.testsFailed} ${metrics.testsFailed > 0 ? '❌' : ''}

🏗️ *建置狀態*
• Build: ${metrics.buildStatus === 'success' ? '✅ 成功' : '❌ 失敗'}
${metrics.buildTime ? `• 耗時: ${(metrics.buildTime / 1000).toFixed(1)}秒` : ''}

🔍 *程式碼品質*
• TypeScript 錯誤: ${metrics.typeScriptErrors} ${metrics.typeScriptErrors > 0 ? '❌' : '✅'}
• ESLint 警告: ${metrics.eslintWarnings} ${metrics.eslintWarnings > 0 ? '⚠️' : '✅'}

🎯 *最近完成功能*
${features.length > 0 ? features.map(f => `• ${f}`).join('\n') : '• 暫無新功能提交'}

💻 *當前工作*
• ${currentWork}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  /**
   * 計算專案健康度分數
   */
  private calculateHealthScore(metrics: DevMetrics): number {
    let score = 100;

    // 測試失敗扣分
    if (metrics.testsFailed > 0) {
      score -= Math.min(30, metrics.testsFailed * 5);
    }

    // Build 失敗扣分
    if (metrics.buildStatus === 'failed') {
      score -= 30;
    }

    // TypeScript 錯誤扣分
    if (metrics.typeScriptErrors > 0) {
      score -= Math.min(20, metrics.typeScriptErrors * 2);
    }

    // ESLint 警告扣分
    if (metrics.eslintWarnings > 0) {
      score -= Math.min(10, metrics.eslintWarnings);
    }

    // 沒有 commits 扣分
    if (metrics.commitsToday === 0) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * 發送到 Slack
   */
  public async sendToSlack(): Promise<void> {
    if (!this.webhookUrl) {
      console.error('❌ 未設定 Slack webhook URL');
      return;
    }

    const report = this.generateDevReport();
    console.log('📋 開發報告:');
    console.log(report);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: report,
          mrkdwn: true
        })
      });

      if (response.ok) {
        console.log('✅ 開發報告已發送至 Slack');
      } else {
        console.error('❌ 發送失敗:', response.statusText);
      }
    } catch (error) {
      console.error('❌ 發送錯誤:', error);
    }
  }

  /**
   * 開始開發 session
   */
  public startSession(): void {
    const session: DevSession = {
      startTime: new Date(),
      tasks: [],
      metrics: this.collectMetrics(),
      featuresCompleted: [],
      currentWork: ''
    };

    fs.writeFileSync(this.sessionFile, JSON.stringify(session, null, 2));
    console.log('🚀 開發 session 已開始');
  }

  /**
   * 結束開發 session
   */
  public async endSession(): Promise<void> {
    if (!fs.existsSync(this.sessionFile)) {
      console.log('❌ 沒有進行中的 session');
      return;
    }

    const session: DevSession = JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8'));
    session.endTime = new Date();
    session.metrics = this.collectMetrics();

    // 計算 session 時長
    const duration = (session.endTime.getTime() - new Date(session.startTime).getTime()) / 1000 / 60;

    // 生成 session 摘要
    const summary = `📝 *開發 Session 摘要*
時長: ${Math.round(duration)} 分鐘
Commits: ${session.metrics.commitsToday}
測試通過率: ${session.metrics.testsRun > 0 ? Math.round((session.metrics.testsPassed / session.metrics.testsRun) * 100) : 0}%
程式碼品質: ${session.metrics.typeScriptErrors === 0 && session.metrics.eslintWarnings === 0 ? '✅ 優良' : '⚠️ 需改進'}`;

    // 發送摘要
    if (this.webhookUrl) {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: summary, mrkdwn: true })
      });
    }

    // 清理 session 檔案
    fs.unlinkSync(this.sessionFile);
    console.log('✅ 開發 session 已結束');
  }
}

// 主程式
async function main() {
  const tracker = new DynamicDevTracker();
  const args = process.argv.slice(2);

  if (args.includes('--start-session')) {
    tracker.startSession();
  } else if (args.includes('--end-session')) {
    await tracker.endSession();
  } else {
    // 預設：發送即時報告
    await tracker.sendToSlack();
  }
}

main().catch(console.error);
