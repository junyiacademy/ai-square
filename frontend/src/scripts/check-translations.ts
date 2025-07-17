#!/usr/bin/env tsx
/**
 * Check translation completeness across all languages
 * Compare each language against English (en) as the baseline
 */

import fs from 'fs/promises';
import path from 'path';

interface TranslationReport {
  language: string;
  files: {
    [filename: string]: {
      missingKeys: string[];
      totalKeys: number;
      completeness: number;
    };
  };
  overallCompleteness: number;
}

async function getJsonKeys(obj: any, prefix = ''): Promise<string[]> {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...await getJsonKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

async function compareTranslations(baseFile: string, targetFile: string): Promise<{ missingKeys: string[], totalKeys: number }> {
  try {
    const [baseContent, targetContent] = await Promise.all([
      fs.readFile(baseFile, 'utf-8'),
      fs.readFile(targetFile, 'utf-8').catch(() => '{}')
    ]);
    
    const baseJson = JSON.parse(baseContent);
    const targetJson = JSON.parse(targetContent);
    
    const baseKeys = await getJsonKeys(baseJson);
    const targetKeys = await getJsonKeys(targetJson);
    
    const missingKeys = baseKeys.filter(key => !targetKeys.includes(key));
    
    return {
      missingKeys,
      totalKeys: baseKeys.length
    };
  } catch (error) {
    console.error(`Error comparing ${baseFile} with ${targetFile}:`, error);
    return { missingKeys: [], totalKeys: 0 };
  }
}

async function checkAllTranslations() {
  const localesDir = path.join(process.cwd(), 'public', 'locales');
  const languages = await fs.readdir(localesDir);
  const reports: TranslationReport[] = [];
  
  // Get all files from English directory
  const enDir = path.join(localesDir, 'en');
  const enFiles = await fs.readdir(enDir);
  const jsonFiles = enFiles.filter(file => file.endsWith('.json'));
  
  for (const lang of languages) {
    if (lang === 'en') continue;
    
    const report: TranslationReport = {
      language: lang,
      files: {},
      overallCompleteness: 0
    };
    
    let totalMissing = 0;
    let totalKeys = 0;
    
    for (const file of jsonFiles) {
      const baseFile = path.join(enDir, file);
      const targetFile = path.join(localesDir, lang, file);
      
      const comparison = await compareTranslations(baseFile, targetFile);
      
      report.files[file] = {
        missingKeys: comparison.missingKeys,
        totalKeys: comparison.totalKeys,
        completeness: comparison.totalKeys > 0 
          ? ((comparison.totalKeys - comparison.missingKeys.length) / comparison.totalKeys) * 100 
          : 100
      };
      
      totalMissing += comparison.missingKeys.length;
      totalKeys += comparison.totalKeys;
    }
    
    report.overallCompleteness = totalKeys > 0 
      ? ((totalKeys - totalMissing) / totalKeys) * 100 
      : 100;
    
    reports.push(report);
  }
  
  return reports;
}

async function generateMissingTranslations(reports: TranslationReport[]) {
  const localesDir = path.join(process.cwd(), 'public', 'locales');
  const needsTranslation: { [lang: string]: { [file: string]: { [key: string]: string } } } = {};
  
  for (const report of reports) {
    if (report.overallCompleteness < 100) {
      needsTranslation[report.language] = {};
      
      for (const [filename, fileReport] of Object.entries(report.files)) {
        if (fileReport.missingKeys.length > 0) {
          needsTranslation[report.language][filename] = {};
          
          // Get the English values for missing keys
          const enFile = path.join(localesDir, 'en', filename);
          const enContent = await fs.readFile(enFile, 'utf-8');
          const enJson = JSON.parse(enContent);
          
          for (const key of fileReport.missingKeys) {
            const value = getValueByPath(enJson, key);
            if (value) {
              needsTranslation[report.language][filename][key] = value;
            }
          }
        }
      }
    }
  }
  
  return needsTranslation;
}

function getValueByPath(obj: any, path: string): string | null {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return null;
    }
  }
  
  return typeof current === 'string' ? current : null;
}

// Main execution
async function main() {
  console.log('🔍 Checking translation completeness...\n');
  
  const reports = await checkAllTranslations();
  
  // Sort by completeness
  reports.sort((a, b) => a.overallCompleteness - b.overallCompleteness);
  
  // Display summary
  console.log('📊 Translation Completeness Summary:');
  console.log('=====================================');
  
  for (const report of reports) {
    const emoji = report.overallCompleteness === 100 ? '✅' : 
                  report.overallCompleteness >= 90 ? '🟡' : '❌';
    
    console.log(`${emoji} ${report.language}: ${report.overallCompleteness.toFixed(1)}% complete`);
    
    if (report.overallCompleteness < 100) {
      for (const [file, fileReport] of Object.entries(report.files)) {
        if (fileReport.missingKeys.length > 0) {
          console.log(`   - ${file}: ${fileReport.missingKeys.length} missing keys`);
        }
      }
    }
  }
  
  // Generate detailed report for incomplete translations
  const incompleteReports = reports.filter(r => r.overallCompleteness < 100);
  
  if (incompleteReports.length > 0) {
    console.log('\n📝 Generating missing translations report...');
    
    const missingTranslations = await generateMissingTranslations(incompleteReports);
    const reportPath = path.join(process.cwd(), 'missing-translations-report.json');
    
    await fs.writeFile(
      reportPath, 
      JSON.stringify(missingTranslations, null, 2),
      'utf-8'
    );
    
    console.log(`\n✅ Report saved to: ${reportPath}`);
    console.log('\n💡 To translate missing keys, run: npm run translate:missing');
  } else {
    console.log('\n✅ All translations are complete!');
  }
}

main().catch(console.error);