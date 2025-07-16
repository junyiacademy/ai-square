#!/usr/bin/env node

/**
 * Generate missing Discovery career translations
 * This script creates placeholder files for missing languages
 * Real translations should be done by professional translators
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

const careers = [
  'app_developer',
  'biotech_researcher',
  'content_creator',
  'cybersecurity_specialist',
  'data_analyst',
  'environmental_scientist',
  'game_designer',
  'product_manager',
  'startup_founder',
  'tech_entrepreneur',
  'ux_designer',
  'youtuber'
];

const missingLanguages = ['ar', 'de', 'es', 'fr', 'id', 'it', 'ja', 'ko', 'pt', 'ru', 'th', 'zhCN'];

const languageNames = {
  ar: 'Arabic',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
  ru: 'Russian',
  th: 'Thai',
  zhCN: 'Simplified Chinese'
};

// Translation placeholders - in real implementation, use translation API
const translations = {
  ar: { needsTranslation: 'يحتاج إلى ترجمة' },
  de: { needsTranslation: 'Übersetzung erforderlich' },
  es: { needsTranslation: 'Necesita traducción' },
  fr: { needsTranslation: 'Traduction nécessaire' },
  id: { needsTranslation: 'Perlu diterjemahkan' },
  it: { needsTranslation: 'Necessita traduzione' },
  ja: { needsTranslation: '翻訳が必要です' },
  ko: { needsTranslation: '번역이 필요합니다' },
  pt: { needsTranslation: 'Precisa de tradução' },
  ru: { needsTranslation: 'Требуется перевод' },
  th: { needsTranslation: 'ต้องการการแปล' },
  zhCN: { needsTranslation: '需要翻译' }
};

async function generateTranslation(career, lang) {
  try {
    // Read English template
    const enPath = path.join(__dirname, '..', 'public', 'discovery_data', career, `${career}_en.yml`);
    const enContent = await fs.readFile(enPath, 'utf8');
    const enData = yaml.load(enContent);

    // Create translated structure (placeholder)
    const translatedData = JSON.parse(JSON.stringify(enData)); // Deep clone

    // Add translation notice
    translatedData.metadata.translation_notice = `${translations[lang].needsTranslation} - This is a placeholder file`;
    translatedData.metadata.original_language = 'en';
    translatedData.metadata.target_language = lang;
    translatedData.metadata.generated_date = new Date().toISOString();

    // Convert back to YAML
    const yamlContent = yaml.dump(translatedData, {
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false,
      noRefs: true
    });

    // Add header comment
    const header = `# ${career.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Discovery Path - ${languageNames[lang]}\n# PLACEHOLDER FILE - ${translations[lang].needsTranslation}\n`;
    
    return header + yamlContent;
  } catch (error) {
    console.error(`Error generating translation for ${career} in ${lang}:`, error);
    return null;
  }
}

async function main() {
  let generatedCount = 0;
  let errorCount = 0;

  console.log('Starting Discovery translation generation...\n');

  for (const career of careers) {
    console.log(`Processing ${career}...`);
    
    for (const lang of missingLanguages) {
      const targetPath = path.join(__dirname, '..', 'public', 'discovery_data', career, `${career}_${lang}.yml`);
      
      try {
        // Check if file already exists
        try {
          await fs.access(targetPath);
          console.log(`  ✓ ${lang} already exists`);
          continue;
        } catch {
          // File doesn't exist, create it
        }

        const content = await generateTranslation(career, lang);
        if (content) {
          await fs.writeFile(targetPath, content, 'utf8');
          console.log(`  ✓ Generated ${lang}`);
          generatedCount++;
        } else {
          console.log(`  ✗ Failed to generate ${lang}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`  ✗ Error with ${lang}:`, error.message);
        errorCount++;
      }
    }
    console.log('');
  }

  console.log(`\nGeneration complete!`);
  console.log(`✓ Generated: ${generatedCount} files`);
  console.log(`✗ Errors: ${errorCount} files`);
  console.log(`\nNOTE: These are placeholder files. Professional translation is required.`);
}

main().catch(console.error);