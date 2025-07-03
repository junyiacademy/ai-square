#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const LOCALES_DIR = path.join(__dirname, '../public/locales');
const RUBRICS_DIR = path.join(__dirname, '../public/rubrics_data');
const KSA_CODES_FILE = path.join(RUBRICS_DIR, 'ksa_codes.yaml');

// Languages to process
const TARGET_LANGUAGES = ['zhCN', 'pt', 'ar', 'id', 'th'];

// Language names for placeholders
const LANGUAGE_NAMES = {
  zhCN: 'Chinese Simplified',
  pt: 'Portuguese',
  ar: 'Arabic',
  id: 'Indonesian',
  th: 'Thai'
};

// Required JSON files (based on English folder)
const REQUIRED_JSON_FILES = [
  'assessment.json',
  'auth.json',
  'chat.json',
  'common.json',
  'dashboard.json',
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

// Create placeholder text for a given language
function createPlaceholder(languageCode, originalText) {
  const languageName = LANGUAGE_NAMES[languageCode];
  return `[${languageName}] translation needed`;
}

// Recursively create placeholder translations for JSON objects
function createPlaceholderObject(obj, languageCode) {
  if (typeof obj === 'string') {
    return createPlaceholder(languageCode, obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => createPlaceholderObject(item, languageCode));
  } else if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const key in obj) {
      result[key] = createPlaceholderObject(obj[key], languageCode);
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
      console.log(`Created directory: ${langDir}`);
    }

    // Check for missing files
    const existingFiles = fs.existsSync(langDir) 
      ? fs.readdirSync(langDir).filter(f => f.endsWith('.json'))
      : [];
    
    const missingFiles = REQUIRED_JSON_FILES.filter(
      file => !existingFiles.includes(file)
    );

    console.log(`\n${LANGUAGE_NAMES[lang]} (${lang}):`);
    console.log(`  Existing files: ${existingFiles.length}`);
    console.log(`  Missing files: ${missingFiles.length}`);

    // Create missing files
    for (const file of missingFiles) {
      const enFilePath = path.join(LOCALES_DIR, 'en', file);
      const targetFilePath = path.join(langDir, file);

      if (fs.existsSync(enFilePath)) {
        try {
          const enContent = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));
          const placeholderContent = createPlaceholderObject(enContent, lang);
          
          fs.writeFileSync(
            targetFilePath,
            JSON.stringify(placeholderContent, null, 2),
            'utf8'
          );
          
          console.log(`  ✓ Created: ${file}`);
        } catch (error) {
          console.error(`  ✗ Error creating ${file}: ${error.message}`);
        }
      } else {
        console.warn(`  ⚠ English source file not found: ${file}`);
      }
    }
  }
}

// Process YAML file and add placeholder translations
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

    let updatesCount = 0;

    // Function to recursively process YAML data
    function processYamlObject(obj, path = '') {
      if (!obj || typeof obj !== 'object') return;

      // Look for translation fields
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
          // Skip if it's not a string value
          if (typeof obj[baseKey] !== 'string') continue;

          // Check and add missing translations for target languages
          for (const lang of TARGET_LANGUAGES) {
            const translationKey = `${baseKey}_${lang}`;
            
            if (!obj.hasOwnProperty(translationKey)) {
              obj[translationKey] = createPlaceholder(lang, obj[baseKey]);
              updatesCount++;
              console.log(`  ✓ Added placeholder for: ${path}.${translationKey}`);
            }
          }
        }
      }

      // Recursively process nested objects
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          processYamlObject(obj[key], path ? `${path}.${key}` : key);
        }
      }
    }

    // Process the YAML data
    processYamlObject(data);

    if (updatesCount > 0) {
      // Save the updated YAML file
      const updatedYaml = yaml.dump(data, {
        lineWidth: -1,
        noCompatMode: true,
        sortKeys: false
      });
      
      fs.writeFileSync(KSA_CODES_FILE, updatedYaml, 'utf8');
      console.log(`\n✓ Updated YAML file with ${updatesCount} new placeholder translations`);
    } else {
      console.log('\n✓ No missing translations found in YAML file');
    }

  } catch (error) {
    console.error(`Error processing YAML file: ${error.message}`);
  }
}

// Main function
async function main() {
  console.log('=== Batch Translation Setup Script ===\n');
  console.log('Target languages:', TARGET_LANGUAGES.join(', '));
  console.log('Processing...\n');

  // Process JSON files
  await processJsonTranslations();

  // Process YAML file
  await processYamlTranslations();

  console.log('\n=== Script completed ===');
  console.log('\nNext steps:');
  console.log('1. Review the created placeholder files');
  console.log('2. Use a translation service to replace placeholders with actual translations');
  console.log('3. Have native speakers review the translations for accuracy');
}

// Run the script
main().catch(console.error);