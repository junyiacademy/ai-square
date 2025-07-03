# Translation Scripts Guide

This directory contains scripts to help manage translations for the AI Square platform.

## Available Scripts

### 1. `batch-translation-setup.js`
Creates placeholder translation files for missing languages.

**Usage:**
```bash
npm run translation:setup
```

**What it does:**
- Creates missing JSON translation files in `/public/locales/` for languages: zhCN, pt, ar, id, th
- Adds placeholder translations to `ksa_codes.yaml` for missing language fields
- Preserves existing translations

### 2. `batch-translate-with-service.js`
Advanced script for batch translation using translation services (requires integration).

**Usage:**
```bash
npm run translation:batch
# or with force flag to overwrite existing translations
npm run translation:batch -- --force
```

**What it does:**
- Batch translates all JSON files and YAML content
- Supports caching to avoid retranslating the same text
- Currently uses placeholders (requires translation service integration)

## Translation Service Integration

To use real translations, modify `batch-translate-with-service.js` to integrate with:

### Google Translate API
```javascript
const {Translate} = require('@google-cloud/translate').v2;
const translate = new Translate({projectId: 'your-project-id'});

async function translateText(text, targetLang) {
  const [translation] = await translate.translate(text, LANGUAGE_CODES[targetLang]);
  return translation;
}
```

### DeepL API
```javascript
const deepl = require('deepl-node');
const translator = new deepl.Translator('your-api-key');

async function translateText(text, targetLang) {
  const result = await translator.translateText(text, null, LANGUAGE_CODES[targetLang]);
  return result.text;
}
```

## Language Codes

| Code | Language | Translation Service Code |
|------|----------|-------------------------|
| zhCN | Chinese Simplified | zh-CN |
| pt | Portuguese | pt |
| ar | Arabic | ar |
| id | Indonesian | id |
| th | Thai | th |

## Workflow

1. **Initial Setup**: Run `npm run translation:setup` to create placeholder files
2. **Integrate Translation Service**: Modify the translation function in `batch-translate-with-service.js`
3. **Batch Translate**: Run `npm run translation:batch` to translate all content
4. **Review**: Have native speakers review the translations
5. **Manual Adjustments**: Edit specific translations as needed

## File Structure

```
public/
├── locales/
│   ├── en/         # Source language
│   ├── zhCN/       # Chinese Simplified
│   ├── pt/         # Portuguese
│   ├── ar/         # Arabic
│   ├── id/         # Indonesian
│   └── th/         # Thai
└── rubrics_data/
    └── ksa_codes.yaml  # Contains multi-language AI literacy content
```

## Notes

- The scripts preserve existing translations by default
- Translation cache is saved in `.translation-cache.json` to avoid duplicate API calls
- YAML translations use field suffixes (e.g., `summary_zhCN`, `summary_pt`)
- JSON translations maintain the same structure as the English source files