#!/usr/bin/env node

/**
 * Translate locale files using MyMemory Translation API (free tier)
 * No authentication required for up to 5000 chars/day
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Language mapping for MyMemory API
const languageMap = {
  zhTW: 'zh-TW',
  zhCN: 'zh-CN',
  pt: 'pt-PT',
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

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

/**
 * Make HTTP request to MyMemory API
 */
function makeRequest(text, sourceLang, targetLang) {
  return new Promise((resolve, reject) => {
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${sourceLang}|${targetLang}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.responseStatus === 200) {
            resolve(result.responseData.translatedText);
          } else {
            reject(new Error(`API Error: ${result.responseDetails || 'Unknown error'}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Translate text with rate limiting and caching
 */
async function translateText(text, targetLang) {
  // Skip empty or whitespace-only text
  if (!text || !text.trim()) return text;
  
  // Skip if text contains only placeholders
  if (/^(\{\{[^}]+\}\}|\s)+$/.test(text)) return text;
  
  // Check cache
  const cacheKey = `${text}::${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }
  
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
  
  try {
    // Preserve placeholders
    const placeholders = [];
    let processedText = text;
    
    // Extract {{placeholders}}
    processedText = processedText.replace(/\{\{([^}]+)\}\}/g, (match) => {
      placeholders.push(match);
      return `PLACEHOLDER${placeholders.length - 1}`;
    });
    
    // Translate
    const translation = await makeRequest(processedText, 'en', targetLang);
    
    // Restore placeholders
    let result = translation;
    placeholders.forEach((placeholder, index) => {
      result = result.replace(`PLACEHOLDER${index}`, placeholder);
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
    
    // Extract first few string values
    const sourceStrings = [];
    const targetStrings = [];
    
    function extractStrings(obj, arr, maxCount = 5) {
      if (arr.length >= maxCount) return;
      if (typeof obj === 'string' && obj.trim()) {
        arr.push(obj);
      } else if (typeof obj === 'object' && obj !== null) {
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
    
    return compareCount > 0 && (differences / compareCount) > 0.4;
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
    
    // For demo purposes, only translate first few strings to avoid rate limits
    // In production, you'd translate everything
    const limitedData = {};
    let stringCount = 0;
    const maxStrings = 10; // Limit for demo
    
    async function limitedTranslate(obj, targetObj, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && stringCount < maxStrings) {
          targetObj[key] = await translateText(value, targetLang);
          stringCount++;
        } else if (typeof value === 'object' && value !== null) {
          targetObj[key] = Array.isArray(value) ? [] : {};
          await limitedTranslate(value, targetObj[key], `${path}.${key}`);
        } else {
          targetObj[key] = value;
        }
      }
    }
    
    await limitedTranslate(sourceData, limitedData);
    
    // Merge with existing data (keep untranslated parts)
    let finalData = sourceData;
    try {
      const existingContent = await fs.readFile(targetPath, 'utf8');
      const existingData = JSON.parse(existingContent);
      finalData = { ...existingData, ...limitedData };
    } catch (e) {
      finalData = { ...sourceData, ...limitedData };
    }
    
    // Write translated file
    await fs.writeFile(
      targetPath,
      JSON.stringify(finalData, null, 2) + '\n',
      'utf8'
    );
    
    console.log(`✓ Completed ${targetLangCode}/${fileName} (demo: ${stringCount} strings)`);
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
  console.log('MyMemory Translation API - Locale File Translator (Demo)');
  console.log('=======================================================\n');
  console.log('Note: This is a demo version that translates only the first 10 strings per file');
  console.log('to avoid rate limits. For production, use Google Cloud Translation API.\n');
  
  const stats = {
    translated: 0,
    skipped: 0,
    errors: 0
  };
  
  // For demo, only translate one language to show it works
  const demoLanguages = ['zhTW', 'es']; // Chinese Traditional and Spanish as examples
  
  // Process each language
  for (const langCode of demoLanguages) {
    console.log(`\n=== Processing ${langCode} ===`);
    
    // For demo, only translate first 3 files
    for (const fileName of filesToTranslate.slice(0, 3)) {
      const result = await translateFile(fileName, langCode);
      stats[result.status === 'translated' ? 'translated' : 
            result.status === 'skipped' ? 'skipped' : 'errors']++;
    }
  }
  
  // Summary
  console.log('\n=== Translation Summary ===');
  console.log(`✓ Translated: ${stats.translated} files`);
  console.log(`➜ Skipped: ${stats.skipped} files`);
  console.log(`✗ Errors: ${stats.errors} files`);
  console.log(`\nTotal API calls: ${translationCache.size}`);
  console.log('\nFor production use with all languages and complete translations,');
  console.log('please use the Google Cloud Translation API script instead.');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { translateText, translateObject };