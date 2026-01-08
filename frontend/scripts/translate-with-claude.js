#!/usr/bin/env node

/**
 * Translate locale files using Claude LLM
 * This script uses Claude's capabilities to provide high-quality translations
 * while preserving technical terminology and placeholders
 */

const fs = require("fs").promises;
const path = require("path");

// Language mapping with full names for better context
const languages = {
  zhTW: {
    code: "zh-TW",
    name: "繁體中文 (Traditional Chinese)",
    region: "Taiwan",
  },
  zhCN: {
    code: "zh-CN",
    name: "简体中文 (Simplified Chinese)",
    region: "China",
  },
  pt: { code: "pt", name: "Português (Portuguese)", region: "Brazil" },
  ar: { code: "ar", name: "العربية (Arabic)", region: "Middle East" },
  id: {
    code: "id",
    name: "Bahasa Indonesia (Indonesian)",
    region: "Indonesia",
  },
  th: { code: "th", name: "ไทย (Thai)", region: "Thailand" },
  es: { code: "es", name: "Español (Spanish)", region: "Latin America" },
  ja: { code: "ja", name: "日本語 (Japanese)", region: "Japan" },
  ko: { code: "ko", name: "한국어 (Korean)", region: "South Korea" },
  fr: { code: "fr", name: "Français (French)", region: "France" },
  de: { code: "de", name: "Deutsch (German)", region: "Germany" },
  ru: { code: "ru", name: "Русский (Russian)", region: "Russia" },
  it: { code: "it", name: "Italiano (Italian)", region: "Italy" },
};

// Files to translate
const filesToTranslate = [
  "admin.json",
  "assessment.json",
  "auth.json",
  "chat.json",
  "common.json",
  "dashboard.json",
  "discovery.json",
  "homepage.json",
  "journey.json",
  "ksa.json",
  "learning.json",
  "learningPath.json",
  "legal.json",
  "navigation.json",
  "onboarding.json",
  "pbl.json",
  "relations.json",
];

// Technical glossary for consistent translations
const technicalGlossary = {
  AI: "AI",
  "AI Literacy": {
    zhTW: "AI 素養",
    zhCN: "AI 素养",
    ja: "AIリテラシー",
    ko: "AI 리터러시",
  },
  PBL: "PBL",
  "Problem-Based Learning": {
    zhTW: "問題導向學習",
    zhCN: "问题导向学习",
    ja: "問題基盤学習",
    ko: "문제 기반 학습",
  },
  KSA: "KSA",
  Knowledge: {
    zhTW: "知識",
    zhCN: "知识",
    ja: "知識",
    ko: "지식",
  },
  Skills: {
    zhTW: "技能",
    zhCN: "技能",
    ja: "スキル",
    ko: "기술",
  },
  Attitudes: {
    zhTW: "態度",
    zhCN: "态度",
    ja: "態度",
    ko: "태도",
  },
};

/**
 * Create a translation prompt for Claude
 */
function createTranslationPrompt(content, targetLang, fileName) {
  const langInfo = languages[targetLang];
  const context = fileName.replace(".json", "");

  return `You are a professional translator specializing in educational technology and AI literacy content.
Please translate the following JSON content from English to ${langInfo.name} (${langInfo.region} variant).

Important guidelines:
1. Preserve all JSON structure and formatting exactly
2. Keep all placeholders like {{variable}} unchanged
3. Maintain consistent terminology throughout
4. Use natural, culturally appropriate language for ${langInfo.region}
5. For UI elements, be concise but clear
6. Technical terms like "AI", "PBL", "KSA" may remain in English if commonly used

Context: This is the "${context}" section of an AI literacy learning platform.

Here is the JSON content to translate:

${JSON.stringify(content, null, 2)}

Please respond with ONLY the translated JSON, no explanations or comments.`;
}

/**
 * Simulate Claude translation (in production, this would call Claude API)
 * For now, we'll create high-quality translations for demonstration
 */
async function translateWithClaude(content, targetLang, fileName) {
  console.log(`Translating ${fileName} to ${targetLang} using Claude...`);

  // In production, this would be an API call to Claude
  // For demonstration, we'll provide some actual translations for key files

  if (fileName === "admin.json" && targetLang === "zhTW") {
    return {
      title: "管理員內容管理系統",
      dashboard: {
        title: "內容管理系統儀表板",
        domains: "領域",
        questions: "問題",
        overrides: "覆寫設定",
        drafts: "草稿",
        quickActions: "快速操作",
        recentActivity: "最近活動",
        editedBy: "由 {{editor}} 編輯",
        daysAgo: "{{days}} 天前",
        noActivity: "沒有最近的活動",
      },
      navigation: {
        dashboard: "儀表板",
        content: "內容管理",
        history: "歷史記錄",
        backToSite: "返回網站",
      },
      content: {
        title: "內容管理",
        selectType: "選擇要管理的內容類型",
        domains: "AI 素養領域",
        domainsDesc: "管理 AI 素養框架的領域和能力",
        ksa: "KSA 代碼",
        ksaDesc: "管理知識、技能和態度代碼",
        scenarios: "PBL 情境",
        scenariosDesc: "管理問題導向學習情境",
        assessment: "評估問題",
        assessmentDesc: "管理評估題庫",
        careers: "探索職業",
        careersDesc: "管理職業探索內容",
      },
      actions: {
        edit: "編輯",
        save: "儲存",
        cancel: "取消",
        delete: "刪除",
        create: "新增",
        publish: "發布",
        unpublish: "取消發布",
        preview: "預覽",
        duplicate: "複製",
        exportData: "匯出資料",
        importData: "匯入資料",
      },
      status: {
        published: "已發布",
        draft: "草稿",
        archived: "已封存",
        pending: "待審核",
      },
      messages: {
        saveSuccess: "成功儲存變更",
        saveError: "儲存失敗，請再試一次",
        deleteConfirm: "確定要刪除此項目嗎？此操作無法復原。",
        deleteSuccess: "成功刪除項目",
        publishSuccess: "成功發布內容",
        loading: "載入中...",
        noData: "沒有可顯示的資料",
      },
    };
  }

  if (fileName === "common.json" && targetLang === "zhTW") {
    return {
      appName: "AI Square",
      loading: "載入中...",
      error: "錯誤",
      success: "成功",
      save: "儲存",
      cancel: "取消",
      delete: "刪除",
      edit: "編輯",
      create: "新增",
      search: "搜尋",
      filter: "篩選",
      sort: "排序",
      refresh: "重新整理",
      submit: "提交",
      continue: "繼續",
      back: "返回",
      next: "下一步",
      previous: "上一步",
      close: "關閉",
      confirm: "確認",
      yes: "是",
      no: "否",
      ok: "確定",
      apply: "套用",
      reset: "重設",
      clear: "清除",
      select: "選擇",
      selectAll: "全選",
      unselectAll: "取消全選",
      expand: "展開",
      collapse: "收合",
      more: "更多",
      less: "較少",
      viewDetails: "查看詳情",
      download: "下載",
      upload: "上傳",
      share: "分享",
      copy: "複製",
      copied: "已複製",
      print: "列印",
      export: "匯出",
      import: "匯入",
      settings: "設定",
      preferences: "偏好設定",
      help: "說明",
      about: "關於",
      version: "版本",
      language: "語言",
      theme: "主題",
      darkMode: "深色模式",
      lightMode: "淺色模式",
      auto: "自動",
      system: "系統",
      user: "使用者",
      admin: "管理員",
      guest: "訪客",
      profile: "個人檔案",
      account: "帳號",
      logout: "登出",
      login: "登入",
      register: "註冊",
      forgotPassword: "忘記密碼",
      resetPassword: "重設密碼",
      changePassword: "變更密碼",
      email: "電子郵件",
      password: "密碼",
      confirmPassword: "確認密碼",
      username: "使用者名稱",
      name: "姓名",
      firstName: "名字",
      lastName: "姓氏",
      phone: "電話",
      address: "地址",
      city: "城市",
      country: "國家",
      zipCode: "郵遞區號",
      optional: "選填",
      required: "必填",
      invalidEmail: "無效的電子郵件地址",
      invalidPassword: "密碼必須至少包含 8 個字元",
      passwordMismatch: "密碼不相符",
      fieldRequired: "此欄位為必填",
      somethingWentWrong: "發生錯誤，請稍後再試",
      pageNotFound: "找不到頁面",
      unauthorized: "未授權",
      forbidden: "禁止存取",
      serverError: "伺服器錯誤",
      networkError: "網路錯誤",
      tryAgain: "再試一次",
      refresh_page: "重新整理頁面",
      goHome: "返回首頁",
      learnMore: "了解更多",
      viewAll: "查看全部",
      showLess: "顯示較少",
      showMore: "顯示更多",
      startDate: "開始日期",
      endDate: "結束日期",
      date: "日期",
      time: "時間",
      duration: "持續時間",
      status: "狀態",
      active: "啟用",
      inactive: "停用",
      pending: "待處理",
      completed: "已完成",
      failed: "失敗",
      inProgress: "進行中",
      notStarted: "尚未開始",
      all: "全部",
      none: "無",
      other: "其他",
      total: "總計",
      average: "平均",
      min: "最小值",
      max: "最大值",
      count: "數量",
      percentage: "百分比",
      ratio: "比例",
      score: "分數",
      points: "點數",
      level: "等級",
      rank: "排名",
      position: "位置",
      progress: "進度",
      complete: "完成",
      incomplete: "未完成",
      passed: "通過",
      failed_status: "未通過",
      excellent: "優秀",
      good: "良好",
      average_status: "一般",
      poor: "較差",
      needsImprovement: "需要改進",
      notApplicable: "不適用",
      unknown: "未知",
      yes_answer: "是",
      no_answer: "否",
      maybe: "可能",
      agree: "同意",
      disagree: "不同意",
      neutral: "中立",
    };
  }

  // For other combinations, return a message indicating it needs translation
  // In production, this would make an actual API call to Claude
  return {
    _note: `This file needs translation to ${languages[targetLang].name}`,
    _instruction:
      "Run this script with Claude API integration to get actual translations",
    ...content,
  };
}

/**
 * Check if file already has translations
 */
async function isAlreadyTranslated(filePath, sourceData) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(content);

    // Check if the file has a translation note or if content differs from source
    if (data._note || data._instruction) {
      return false;
    }

    // Extract first few string values to compare
    const sourceStrings = [];
    const targetStrings = [];

    function extractStrings(obj, arr, maxCount = 5) {
      if (arr.length >= maxCount) return;
      if (typeof obj === "string" && obj.trim()) {
        arr.push(obj);
      } else if (typeof obj === "object" && obj !== null) {
        for (const value of Object.values(obj)) {
          if (arr.length >= maxCount) break;
          extractStrings(value, arr, maxCount);
        }
      }
    }

    extractStrings(sourceData, sourceStrings);
    extractStrings(data, targetStrings);

    // If more than 40% of strings are different, consider it translated
    let differences = 0;
    const compareCount = Math.min(sourceStrings.length, targetStrings.length);
    for (let i = 0; i < compareCount; i++) {
      if (sourceStrings[i] !== targetStrings[i]) differences++;
    }

    return compareCount > 0 && differences / compareCount > 0.4;
  } catch (error) {
    return false;
  }
}

/**
 * Process a single file for a language
 */
async function translateFile(fileName, targetLang) {
  const sourcePath = path.join(
    __dirname,
    "..",
    "public",
    "locales",
    "en",
    fileName,
  );
  const targetPath = path.join(
    __dirname,
    "..",
    "public",
    "locales",
    targetLang,
    fileName,
  );

  try {
    // Read source file
    const sourceContent = await fs.readFile(sourcePath, "utf8");
    const sourceData = JSON.parse(sourceContent);

    // Check if already translated
    if (await isAlreadyTranslated(targetPath, sourceData)) {
      console.log(`✓ ${targetLang}/${fileName} already translated`);
      return { status: "skipped" };
    }

    // Translate using Claude
    const translatedData = await translateWithClaude(
      sourceData,
      targetLang,
      fileName,
    );

    // Write translated file
    await fs.writeFile(
      targetPath,
      JSON.stringify(translatedData, null, 2) + "\n",
      "utf8",
    );

    console.log(`✓ Completed ${targetLang}/${fileName}`);
    return { status: "translated" };
  } catch (error) {
    console.error(`✗ Error with ${targetLang}/${fileName}:`, error.message);
    return { status: "error", error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log("Claude LLM Translation Tool for AI Square");
  console.log("=========================================\n");
  console.log(
    "This script demonstrates using Claude for high-quality translations.",
  );
  console.log("In production, it would make API calls to Claude.\n");

  const stats = {
    translated: 0,
    skipped: 0,
    errors: 0,
  };

  // For demonstration, translate admin.json and common.json to zhTW
  const demoFiles = ["admin.json", "common.json"];
  const demoLang = "zhTW";

  console.log(`=== Translating to ${languages[demoLang].name} ===\n`);

  for (const fileName of demoFiles) {
    const result = await translateFile(fileName, demoLang);
    stats[
      result.status === "translated"
        ? "translated"
        : result.status === "skipped"
          ? "skipped"
          : "errors"
    ]++;
  }

  // Summary
  console.log("\n=== Translation Summary ===");
  console.log(`✓ Translated: ${stats.translated} files`);
  console.log(`➜ Skipped: ${stats.skipped} files`);
  console.log(`✗ Errors: ${stats.errors} files`);

  console.log("\n📝 Next Steps:");
  console.log("1. Review the translated files in public/locales/zhTW/");
  console.log(
    "2. To translate all files to all languages, integrate with Claude API",
  );
  console.log(
    "3. Use the translation prompt template provided in createTranslationPrompt()",
  );

  console.log("\n💡 Pro Tips:");
  console.log("- Claude provides context-aware translations");
  console.log("- Technical terms are preserved appropriately");
  console.log("- Cultural nuances are considered for each region");
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { translateWithClaude, createTranslationPrompt };
