#!/usr/bin/env tsx
/**
 * Translate missing keys using Claude LLM
 */

import fs from 'fs/promises';
import path from 'path';
import { VertexAI } from '@google-cloud/vertexai';

// Language mapping
const languageNames: { [key: string]: string } = {
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
  zhCN: 'Simplified Chinese',
  zhTW: 'Traditional Chinese'
};

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-437618',
  location: 'us-central1'
});

const model = vertexAI.preview.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 0.3,
    topP: 0.8,
  }
});

async function translateKeys(
  englishKeys: { [key: string]: string },
  targetLanguage: string,
  context: string
): Promise<{ [key: string]: string }> {
  const prompt = `You are a professional translator for a web application about AI literacy education.

Context: ${context}

Please translate the following English UI text to ${languageNames[targetLanguage]}:

${JSON.stringify(englishKeys, null, 2)}

Requirements:
1. Maintain the exact same JSON structure and keys
2. Only translate the values (the text), not the keys
3. Keep any placeholders like {{variable}} unchanged
4. For ${targetLanguage === 'zhTW' ? 'Traditional Chinese' : languageNames[targetLanguage]}, use appropriate formal/educational tone
5. Ensure translations are culturally appropriate and natural
6. Return ONLY the JSON object with translated values, no explanation

Example format:
{
  "key1": "translated text",
  "key2": "translated text with {{placeholder}}"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {};
  } catch (error) {
    console.error(`Error translating to ${targetLanguage}:`, error);
    return {};
  }
}

function setValueByPath(obj: Record<string, unknown>, path: string, value: string): void {
  const keys = path.split('.');
  let current = obj as Record<string, unknown>;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
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
  console.log('🔍 Loading missing translations report...\n');
  
  const reportPath = path.join(process.cwd(), 'missing-translations-report.json');
  const reportContent = await fs.readFile(reportPath, 'utf-8');
  const missingTranslations = JSON.parse(reportContent);
  
  const languagesToTranslate = Object.keys(missingTranslations);
  
  console.log(`📝 Found ${languagesToTranslate.length} languages needing translations\n`);
  
  for (const language of languagesToTranslate) {
    console.log(`\n🌐 Translating to ${languageNames[language]} (${language})...`);
    
    const files = missingTranslations[language];
    
    for (const [filename, keys] of Object.entries(files)) {
      const keyCount = Object.keys(keys as object).length;
      if (keyCount === 0) continue;
      
      console.log(`  📄 ${filename}: ${keyCount} keys to translate`);
      
      // Get context from filename
      const context = filename.replace('.json', '').replace(/([A-Z])/g, ' $1').toLowerCase();
      
      // Translate in batches to avoid token limits
      const keysArray = Object.entries(keys as object);
      const batchSize = 20;
      const translatedKeys: { [key: string]: string } = {};
      
      for (let i = 0; i < keysArray.length; i += batchSize) {
        const batch = keysArray.slice(i, i + batchSize);
        const batchKeys = Object.fromEntries(batch);
        
        console.log(`    🔄 Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(keysArray.length / batchSize)}...`);
        
        const translations = await translateKeys(batchKeys, language, context);
        
        // Map back to original key paths
        for (const [keyPath] of batch) {
          const translatedValue = translations[keyPath];
          if (translatedValue) {
            translatedKeys[keyPath] = translatedValue;
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Update the translation file
      await updateTranslationFile(language, filename, translatedKeys);
      console.log(`    ✅ Updated ${filename}`);
    }
  }
  
  console.log('\n✅ All translations completed!');
  console.log('\n💡 Run the check script again to verify: npm run check:translations');
}

main().catch(console.error);