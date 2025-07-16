#!/usr/bin/env node

/**
 * Translate locale files using Google Cloud Translation API
 * Prerequisites: 
 * 1. Set up Google Cloud credentials
 * 2. Enable Translation API
 * 3. npm install @google-cloud/translate
 */

const fs = require('fs').promises;
const path = require('path');

// Import Google Cloud Translation
let Translation;
try {
  const { Translation: TranslationClient } = require('@google-cloud/translate').v2;
  Translation = TranslationClient;
} catch (error) {
  console.error('Please install Google Cloud Translation: npm install @google-cloud/translate');
  process.exit(1);
}

// Initialize translation client
const translate = new Translation({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-2024'
});

// Language mapping (Google Cloud format)
const languageMap = {
  zhTW: 'zh-TW',
  zhCN: 'zh-CN',
  pt: 'pt',
  ar: 'ar',
  id: 'id',
  th: 'th',
  es: 'es',
  ja: 'ja',
  ko: 'ko',
  fr: 'fr',
  de: 'de',
  ru: 'ru',
  it: 'it'
};

// Files to translate
const filesToTranslate = [
  'admin.json',
  'assessment.json',
  'auth.json',
  'chat.json',
  'common.json',
  'dashboard.json',
  'discovery.json',
  'homepage.json',
  'journey.json',
  'ksa.json',
  'learning.json',
  'learningPath.json',
  'legal.json',
  'navigation.json',
  'onboarding.json',
  'pbl.json',
  'relations.json'
];

// Cache to avoid retranslating identical strings
const translationCache = new Map();

/**
 * Translate text using Google Cloud Translation
 */
async function translateText(text, targetLang) {
  // Skip if text is empty or just whitespace
  if (!text || !text.trim()) return text;
  
  // Skip if text contains only placeholders
  if (/^(\{\{[^}]+\}\}|\s)+$/.test(text)) return text;
  
  // Check cache
  const cacheKey = `${text}::${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }
  
  try {
    // Preserve placeholders
    const placeholders = [];
    let processedText = text;
    
    // Extract {{placeholders}}
    processedText = processedText.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
      placeholders.push(match);
      return `__PLACEHOLDER_${placeholders.length - 1}__`;
    });
    
    // Translate
    const [translation] = await translate.translate(processedText, targetLang);
    
    // Restore placeholders
    let result = translation;
    placeholders.forEach((placeholder, index) => {
      result = result.replace(`__PLACEHOLDER_${index}__`, placeholder);
    });
    
    // Cache the result
    translationCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error(`Translation error for "${text}" to ${targetLang}:`, error.message);
    return text; // Return original on error
  }
}

/**
 * Translate a JSON object recursively
 */
async function translateObject(obj, targetLang, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) return obj;
  
  if (typeof obj === 'string') {
    return await translateText(obj, targetLang);
  }
  
  if (Array.isArray(obj)) {
    const translated = [];
    for (const item of obj) {
      translated.push(await translateObject(item, targetLang, depth + 1));
    }
    return translated;
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const translated = {};
    for (const [key, value] of Object.entries(obj)) {
      // Don't translate certain keys
      if (key.includes('_id') || key.includes('_key') || key === 'id') {
        translated[key] = value;
      } else {
        translated[key] = await translateObject(value, targetLang, depth + 1);
      }
    }
    return translated;
  }
  
  return obj;
}

/**
 * Check if file already has translations
 */
async function isAlreadyTranslated(filePath, sourceData) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Check if first few string values differ from source
    const sourceStrings = [];
    const targetStrings = [];
    
    function extractStrings(obj, arr) {
      if (typeof obj === 'string' && obj.trim()) {
        arr.push(obj);
      } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(v => extractStrings(v, arr));
      }
    }
    
    extractStrings(sourceData, sourceStrings);
    extractStrings(data, targetStrings);
    
    // If more than 20% of strings are different, consider it translated
    let differences = 0;
    for (let i = 0; i < Math.min(sourceStrings.length, targetStrings.length, 10); i++) {
      if (sourceStrings[i] !== targetStrings[i]) differences++;
    }
    
    return differences > 2;
  } catch (error) {
    return false;
  }
}

/**
 * Process a single file for a language
 */
async function translateFile(fileName, targetLangCode) {
  const targetLang = languageMap[targetLangCode];
  const sourcePath = path.join(__dirname, '..', 'public', 'locales', 'en', fileName);
  const targetPath = path.join(__dirname, '..', 'public', 'locales', targetLangCode, fileName);
  
  try {
    // Read source file
    const sourceContent = await fs.readFile(sourcePath, 'utf8');
    const sourceData = JSON.parse(sourceContent);
    
    // Check if already translated
    if (await isAlreadyTranslated(targetPath, sourceData)) {
      console.log(`✓ ${targetLangCode}/${fileName} already translated`);
      return { status: 'skipped' };
    }
    
    console.log(`Translating ${fileName} to ${targetLangCode}...`);
    
    // Translate the content
    const translatedData = await translateObject(sourceData, targetLang);
    
    // Write translated file
    await fs.writeFile(
      targetPath,
      JSON.stringify(translatedData, null, 2) + '\n',
      'utf8'
    );
    
    console.log(`✓ Completed ${targetLangCode}/${fileName}`);
    return { status: 'translated' };
    
  } catch (error) {
    console.error(`✗ Error with ${targetLangCode}/${fileName}:`, error.message);
    return { status: 'error', error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Google Cloud Translation API - Locale File Translator');
  console.log('====================================================\n');
  
  // Check if we can connect to Translation API
  try {
    const [languages] = await translate.getLanguages();
    console.log(`✓ Connected to Translation API (${languages.length} languages available)\n`);
  } catch (error) {
    console.error('✗ Failed to connect to Translation API:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. Google Cloud credentials are configured');
    console.error('2. Translation API is enabled');
    console.error('3. GOOGLE_APPLICATION_CREDENTIALS environment variable is set');
    process.exit(1);
  }
  
  const stats = {
    translated: 0,
    skipped: 0,
    errors: 0
  };
  
  // Process each language
  for (const langCode of Object.keys(languageMap)) {
    console.log(`\n=== Processing ${langCode} ===`);
    
    for (const fileName of filesToTranslate) {
      const result = await translateFile(fileName, langCode);
      stats[result.status === 'translated' ? 'translated' : 
            result.status === 'skipped' ? 'skipped' : 'errors']++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Summary
  console.log('\n=== Translation Summary ===');
  console.log(`✓ Translated: ${stats.translated} files`);
  console.log(`➜ Skipped: ${stats.skipped} files`);
  console.log(`✗ Errors: ${stats.errors} files`);
  console.log(`\nTotal API calls (estimated): ${translationCache.size}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { translateText, translateObject };