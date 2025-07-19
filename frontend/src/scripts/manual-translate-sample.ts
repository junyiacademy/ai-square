#!/usr/bin/env tsx
/**
 * Manual translation samples for demonstration
 */

import fs from 'fs/promises';
import path from 'path';

// Sample translations for demonstration
const sampleTranslations: { [lang: string]: { [file: string]: { [key: string]: string } } } = {
  zhTW: {
    "assessment.json": {
      "results.questionReview.closeReview": "關閉檢視"
    },
    "common.json": {
      "status.error": "錯誤",
      "status.success": "成功",
      "status.warning": "警告",
      "status.info": "資訊",
      "actions.confirm": "確認",
      "actions.cancel": "取消",
      "actions.save": "儲存",
      "actions.delete": "刪除",
      "actions.edit": "編輯",
      "actions.create": "建立",
      "actions.update": "更新",
      "actions.refresh": "重新整理",
      "actions.search": "搜尋",
      "actions.filter": "篩選",
      "actions.sort": "排序",
      "actions.export": "匯出",
      "actions.import": "匯入",
      "actions.download": "下載",
      "actions.upload": "上傳"
    },
    "relations.json": {
      "frameworkResource": "檢視 AI 素養框架 (PDF)"
    }
  },
  de: {
    "admin.json": {
      "dashboard.quickActions": "Schnellaktionen"
    },
    "assessment.json": {
      "quiz.correct": "Richtig!",
      "quiz.incorrect": "Falsch",
      "quiz.selectAnswerToSeeExplanation": "Wählen Sie eine Antwort, um die Erklärung zu sehen"
    },
    "navigation.json": {
      "dashboard": "Dashboard",
      "discovery": "Entdeckung",
      "more": "Mehr",
      "language": "Sprache",
      "theme": "Thema",
      "light": "Hell",
      "dark": "Dunkel"
    },
    "pbl.json": {
      "learn.completeProgram": "Programm abschließen"
    }
  },
  ja: {
    "admin.json": {
      "dashboard.quickActions": "クイックアクション"
    },
    "navigation.json": {
      "dashboard": "ダッシュボード",
      "discovery": "ディスカバリー"
    },
    "pbl.json": {
      "learn.completeProgram": "プログラムを完了"
    },
    "relations.json": {
      "loading": "関係を読み込み中...",
      "frameworkResource": "AIリテラシーフレームワークを表示 (PDF)"
    }
  }
};

function setValueByPath(obj: Record<string, unknown>, path: string, value: string): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

async function updateTranslationFile(
  language: string, 
  filename: string, 
  translations: { [key: string]: string }
): Promise<void> {
  const localesDir = path.join(process.cwd(), 'public', 'locales');
  const filePath = path.join(localesDir, language, filename);
  
  // Read existing file
  let existingContent = {};
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    existingContent = JSON.parse(content);
  } catch {
    console.log(`Creating new file: ${filePath}`);
  }
  
  // Update with new translations
  for (const [key, value] of Object.entries(translations)) {
    setValueByPath(existingContent, key, value);
  }
  
  // Write back
  await fs.writeFile(
    filePath,
    JSON.stringify(existingContent, null, 2),
    'utf-8'
  );
}

async function main() {
  console.log('📝 Applying sample translations...\n');
  
  for (const [language, files] of Object.entries(sampleTranslations)) {
    console.log(`🌐 Updating ${language}...`);
    
    for (const [filename, translations] of Object.entries(files)) {
      await updateTranslationFile(language, filename, translations);
      console.log(`  ✅ Updated ${filename}`);
    }
  }
  
  console.log('\n✅ Sample translations applied!');
  console.log('\n💡 This is just a demonstration. For complete translations, you would need to:');
  console.log('1. Set up Google Cloud authentication');
  console.log('2. Run the full translation script');
  console.log('3. Or manually translate all missing keys');
}

main().catch(console.error);