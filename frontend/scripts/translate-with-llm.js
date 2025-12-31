#!/usr/bin/env node

/**
 * Translate all locale files using LLM
 * This script translates English content to all supported languages
 */

const fs = require("fs").promises;
const path = require("path");

// Language mapping
const languages = {
  zhTW: "繁體中文 (Traditional Chinese)",
  zhCN: "简体中文 (Simplified Chinese)",
  pt: "Português (Portuguese)",
  ar: "العربية (Arabic)",
  id: "Bahasa Indonesia (Indonesian)",
  th: "ไทย (Thai)",
  es: "Español (Spanish)",
  ja: "日本語 (Japanese)",
  ko: "한국어 (Korean)",
  fr: "Français (French)",
  de: "Deutsch (German)",
  ru: "Русский (Russian)",
  it: "Italiano (Italian)",
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

// Translation examples for common UI terms (to ensure consistency)
const commonTranslations = {
  zhTW: {
    Save: "儲存",
    Cancel: "取消",
    Submit: "提交",
    Delete: "刪除",
    Edit: "編輯",
    New: "新增",
    Search: "搜尋",
    Loading: "載入中",
    Error: "錯誤",
    Success: "成功",
  },
  zhCN: {
    Save: "保存",
    Cancel: "取消",
    Submit: "提交",
    Delete: "删除",
    Edit: "编辑",
    New: "新建",
    Search: "搜索",
    Loading: "加载中",
    Error: "错误",
    Success: "成功",
  },
  es: {
    Save: "Guardar",
    Cancel: "Cancelar",
    Submit: "Enviar",
    Delete: "Eliminar",
    Edit: "Editar",
    New: "Nuevo",
    Search: "Buscar",
    Loading: "Cargando",
    Error: "Error",
    Success: "Éxito",
  },
  ja: {
    Save: "保存",
    Cancel: "キャンセル",
    Submit: "送信",
    Delete: "削除",
    Edit: "編集",
    New: "新規",
    Search: "検索",
    Loading: "読み込み中",
    Error: "エラー",
    Success: "成功",
  },
  ko: {
    Save: "저장",
    Cancel: "취소",
    Submit: "제출",
    Delete: "삭제",
    Edit: "편집",
    New: "새로 만들기",
    Search: "검색",
    Loading: "로딩 중",
    Error: "오류",
    Success: "성공",
  },
  // Add more as needed
};

/**
 * Simulated LLM translation function
 * In production, this would call an actual translation API
 */
async function translateWithLLM(text, targetLang, context = "") {
  // For demonstration, we'll create a translation prompt
  const prompt = `Translate the following English text to ${languages[targetLang]}.
Context: ${context}
Keep the same tone and style. For UI elements, be concise.
If there are placeholders like {{variable}}, keep them unchanged.

Text to translate:
${text}

Translation:`;

  // In a real implementation, this would call an LLM API
  // For now, we'll return a placeholder
  console.log(`Translating to ${targetLang}: "${text.substring(0, 50)}..."`);

  // Check if we have a common translation
  if (commonTranslations[targetLang] && commonTranslations[targetLang][text]) {
    return commonTranslations[targetLang][text];
  }

  // Return original text with language prefix for now
  // In production, this would be the actual translation
  return `[${targetLang}] ${text}`;
}

/**
 * Translate a JSON object recursively
 */
async function translateObject(obj, targetLang, context = "") {
  if (typeof obj === "string") {
    return await translateWithLLM(obj, targetLang, context);
  }

  if (Array.isArray(obj)) {
    return Promise.all(
      obj.map((item) => translateObject(item, targetLang, context)),
    );
  }

  if (typeof obj === "object" && obj !== null) {
    const translated = {};
    for (const [key, value] of Object.entries(obj)) {
      // Use key as additional context
      const keyContext = context ? `${context}.${key}` : key;
      translated[key] = await translateObject(value, targetLang, keyContext);
    }
    return translated;
  }

  return obj;
}

/**
 * Process a single file for a language
 */
async function translateFile(fileName, targetLang) {
  try {
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

    // Read source file
    const sourceContent = await fs.readFile(sourcePath, "utf8");
    const sourceData = JSON.parse(sourceContent);

    // Check if target already has non-English content
    try {
      const targetContent = await fs.readFile(targetPath, "utf8");
      const targetData = JSON.parse(targetContent);

      // Simple check: if the first string value is different from English, skip
      const firstEnglishValue = Object.values(sourceData).find(
        (v) => typeof v === "string",
      );
      const firstTargetValue = Object.values(targetData).find(
        (v) => typeof v === "string",
      );

      if (
        firstEnglishValue &&
        firstTargetValue &&
        firstEnglishValue !== firstTargetValue
      ) {
        console.log(`✓ ${targetLang}/${fileName} already translated, skipping`);
        return { status: "skipped", file: fileName, lang: targetLang };
      }
    } catch (error) {
      // Target file doesn't exist or can't be read, continue with translation
    }

    // Translate
    console.log(`Translating ${fileName} to ${targetLang}...`);
    const translatedData = await translateObject(
      sourceData,
      targetLang,
      fileName.replace(".json", ""),
    );

    // Write translated file
    await fs.writeFile(
      targetPath,
      JSON.stringify(translatedData, null, 2) + "\n",
      "utf8",
    );

    return { status: "translated", file: fileName, lang: targetLang };
  } catch (error) {
    console.error(
      `Error translating ${fileName} to ${targetLang}:`,
      error.message,
    );
    return {
      status: "error",
      file: fileName,
      lang: targetLang,
      error: error.message,
    };
  }
}

/**
 * Main translation function
 */
async function main() {
  console.log("Starting LLM-based translation process...\n");

  const results = {
    translated: 0,
    skipped: 0,
    errors: 0,
  };

  // Process each language
  for (const [langCode, langName] of Object.entries(languages)) {
    console.log(`\n=== Processing ${langName} (${langCode}) ===`);

    // Process each file
    for (const fileName of filesToTranslate) {
      const result = await translateFile(fileName, langCode);
      results[
        result.status === "translated"
          ? "translated"
          : result.status === "skipped"
            ? "skipped"
            : "errors"
      ]++;

      // Add a small delay to avoid rate limits in production
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Summary
  console.log("\n=== Translation Summary ===");
  console.log(`✓ Translated: ${results.translated} files`);
  console.log(`➜ Skipped: ${results.skipped} files (already translated)`);
  console.log(`✗ Errors: ${results.errors} files`);
  console.log(
    "\nNOTE: This is a demonstration script. In production, integrate with a real LLM API.",
  );
  console.log(
    "Consider using: Google Translate API, DeepL API, or OpenAI GPT-4 for translations.",
  );
}

// Run the script
main().catch(console.error);
