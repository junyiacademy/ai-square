#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const LOCALES_DIR = path.join(__dirname, '../public/locales');
const RUBRICS_DIR = path.join(__dirname, '../public/rubrics_data');
const KSA_CODES_FILE = path.join(RUBRICS_DIR, 'ksa_codes.yaml');
const BATCH_SIZE = 100; // Number of texts to translate in one batch

// Languages to process
const TARGET_LANGUAGES = ['zhCN', 'pt', 'ar', 'id', 'th'];

// Language codes mapping for translation services
const LANGUAGE_CODES = {
  zhCN: 'zh-CN',
  pt: 'pt',
  ar: 'ar',
  id: 'id',
  th: 'th'
};

// Translation cache to avoid retranslating the same text
const translationCache = new Map();

// Placeholder for translation service integration
// In production, replace this with actual API calls to Google Translate, DeepL, etc.
async function translateText(text, targetLang) {
  // Check cache first
  const cacheKey = `${text}:${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // This is where you would integrate with a translation service
  // Example with Google Translate API:
  /*
  const {Translate} = require('@google-cloud/translate').v2;
  const translate = new Translate({projectId: 'your-project-id'});
  
  const [translation] = await translate.translate(text, LANGUAGE_CODES[targetLang]);
  translationCache.set(cacheKey, translation);
  return translation;
  */

  // For now, return a placeholder
  const languageNames = {
    zhCN: 'Chinese Simplified',
    pt: 'Portuguese',
    ar: 'Arabic',
    id: 'Indonesian',
    th: 'Thai'
  };
  
  const placeholder = `[${languageNames[targetLang]}] ${text}`;
  translationCache.set(cacheKey, placeholder);
  return placeholder;
}

// Batch translate multiple texts
async function batchTranslate(texts, targetLang) {
  const results = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const translations = await Promise.all(
      batch.map(text => translateText(text, targetLang))
    );
    results.push(...translations);
    
    // Add a small delay to avoid rate limiting
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Recursively translate JSON objects
async function translateJsonObject(obj, targetLang) {
  if (typeof obj === 'string') {
    return await translateText(obj, targetLang);
  } else if (Array.isArray(obj)) {
    const translations = await batchTranslate(obj, targetLang);
    return translations;
  } else if (typeof obj === 'object' && obj !== null) {
    const result = {};
    const keys = Object.keys(obj);
    
    for (const key of keys) {
      result[key] = await translateJsonObject(obj[key], targetLang);
    }
    
    return result;
  }
  return obj;
}

// Process JSON translation files
async function processJsonTranslations() {
  console.log('Processing JSON translation files...\n');

  for (const lang of TARGET_LANGUAGES) {
    const langDir = path.join(LOCALES_DIR, lang);
    
    // Create language directory if it doesn't exist
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    console.log(`\nProcessing ${lang}...`);

    // Process all required JSON files
    for (const file of fs.readdirSync(path.join(LOCALES_DIR, 'en'))) {
      if (!file.endsWith('.json')) continue;

      const enFilePath = path.join(LOCALES_DIR, 'en', file);
      const targetFilePath = path.join(langDir, file);

      // Skip if target file already exists and force flag is not set
      if (fs.existsSync(targetFilePath) && !process.argv.includes('--force')) {
        console.log(`  ⏭ Skipping existing file: ${file}`);
        continue;
      }

      try {
        const enContent = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));
        console.log(`  📄 Translating: ${file}`);
        
        const translatedContent = await translateJsonObject(enContent, lang);
        
        fs.writeFileSync(
          targetFilePath,
          JSON.stringify(translatedContent, null, 2),
          'utf8'
        );
        
        console.log(`  ✓ Completed: ${file}`);
      } catch (error) {
        console.error(`  ✗ Error processing ${file}: ${error.message}`);
      }
    }
  }
}

// Extract all text values from YAML that need translation
function extractTextsFromYaml(obj, textsMap = new Map(), path = '') {
  if (!obj || typeof obj !== 'object') return textsMap;

  const keys = Object.keys(obj);
  
  // Check if this object has translation fields
  const hasTranslations = keys.some(key => 
    key.includes('_') && !key.startsWith('_') && 
    ['zh', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'].some(lang => key.endsWith(`_${lang}`))
  );

  if (hasTranslations) {
    // Find base keys (without language suffix)
    const baseKeys = keys.filter(key => 
      !key.includes('_') || key.startsWith('_')
    );

    for (const baseKey of baseKeys) {
      if (typeof obj[baseKey] === 'string') {
        const fullPath = path ? `${path}.${baseKey}` : baseKey;
        textsMap.set(fullPath, obj[baseKey]);
      }
    }
  }

  // Recursively process nested objects
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      extractTextsFromYaml(obj[key], textsMap, path ? `${path}.${key}` : key);
    }
  }

  return textsMap;
}

// Apply translations back to YAML structure
function applyTranslationsToYaml(obj, translations, lang, path = '') {
  if (!obj || typeof obj !== 'object') return;

  const keys = Object.keys(obj);
  
  // Check if this object has translation fields
  const hasTranslations = keys.some(key => 
    key.includes('_') && !key.startsWith('_') && 
    ['zh', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'].some(lang => key.endsWith(`_${lang}`))
  );

  if (hasTranslations) {
    // Find base keys (without language suffix)
    const baseKeys = keys.filter(key => 
      !key.includes('_') || key.startsWith('_')
    );

    for (const baseKey of baseKeys) {
      if (typeof obj[baseKey] === 'string') {
        const fullPath = path ? `${path}.${baseKey}` : baseKey;
        const translationKey = `${baseKey}_${lang}`;
        
        if (translations.has(fullPath)) {
          obj[translationKey] = translations.get(fullPath);
        }
      }
    }
  }

  // Recursively process nested objects
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      applyTranslationsToYaml(obj[key], translations, lang, path ? `${path}.${key}` : key);
    }
  }
}

// Process YAML file with batch translation
async function processYamlTranslations() {
  console.log('\n\nProcessing YAML translations...\n');

  if (!fs.existsSync(KSA_CODES_FILE)) {
    console.error(`YAML file not found: ${KSA_CODES_FILE}`);
    return;
  }

  try {
    // Read YAML file
    const yamlContent = fs.readFileSync(KSA_CODES_FILE, 'utf8');
    const data = yaml.load(yamlContent);

    // Process each target language
    for (const lang of TARGET_LANGUAGES) {
      console.log(`\nProcessing ${lang} translations for YAML...`);
      
      // Extract all texts that need translation
      const textsMap = extractTextsFromYaml(data);
      const paths = Array.from(textsMap.keys());
      const texts = Array.from(textsMap.values());
      
      console.log(`  Found ${texts.length} texts to translate`);
      
      // Batch translate
      const translations = await batchTranslate(texts, lang);
      
      // Create a map of path to translation
      const translationMap = new Map();
      paths.forEach((path, index) => {
        translationMap.set(path, translations[index]);
      });
      
      // Apply translations back to the data structure
      applyTranslationsToYaml(data, translationMap, lang);
      
      console.log(`  ✓ Completed ${lang} translations`);
    }

    // Save the updated YAML file
    const updatedYaml = yaml.dump(data, {
      lineWidth: -1,
      noCompatMode: true,
      sortKeys: false
    });
    
    fs.writeFileSync(KSA_CODES_FILE, updatedYaml, 'utf8');
    console.log('\n✓ Updated YAML file with all translations');

  } catch (error) {
    console.error(`Error processing YAML file: ${error.message}`);
  }
}

// Save translation cache for future use
function saveTranslationCache() {
  const cacheFile = path.join(__dirname, '.translation-cache.json');
  const cacheData = Object.fromEntries(translationCache);
  fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
  console.log(`\n💾 Translation cache saved (${translationCache.size} entries)`);
}

// Load translation cache if exists
function loadTranslationCache() {
  const cacheFile = path.join(__dirname, '.translation-cache.json');
  if (fs.existsSync(cacheFile)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      Object.entries(cacheData).forEach(([key, value]) => {
        translationCache.set(key, value);
      });
      console.log(`💾 Loaded translation cache (${translationCache.size} entries)`);
    } catch (error) {
      console.warn('Failed to load translation cache:', error.message);
    }
  }
}

// Main function
async function main() {
  console.log('=== Batch Translation Script ===\n');
  console.log('Target languages:', TARGET_LANGUAGES.join(', '));
  
  if (process.argv.includes('--force')) {
    console.log('Force mode: Will overwrite existing translations');
  }
  
  console.log('\n⚠️  Note: This script currently uses placeholder translations.');
  console.log('To use real translations, integrate with a translation service like:');
  console.log('  - Google Translate API');
  console.log('  - DeepL API');
  console.log('  - Azure Translator');
  console.log('\nProcessing...\n');

  // Load cache
  loadTranslationCache();

  // Process JSON files
  await processJsonTranslations();

  // Process YAML file
  await processYamlTranslations();

  // Save cache
  saveTranslationCache();

  console.log('\n=== Script completed ===');
  console.log('\nNext steps:');
  console.log('1. Integrate with a real translation service');
  console.log('2. Review the translations for accuracy');
  console.log('3. Have native speakers validate the translations');
}

// Run the script
main().catch(console.error);