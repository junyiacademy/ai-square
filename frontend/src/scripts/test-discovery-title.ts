// Script to test Discovery task title localization
// Run with: cd frontend && npx tsx src/scripts/test-discovery-title.ts

import 'dotenv/config';

// Mock task data with multilingual titles
const mockTask = {
  id: 'test-task-1',
  title: {
    en: 'Story Script Creation',
    zhTW: '故事腳本創作',
    zhCN: '故事脚本创作',
    es: 'Creación de Guión',
    fr: 'Création de Script',
    de: 'Drehbucherstellung',
    ja: 'ストーリー脚本作成',
    ko: '스토리 스크립트 작성'
  }
};

// Test the title extraction logic
function getLocalizedTitle(title: any, acceptLang: string): string {
  if (typeof title === 'string') return title;
  if (typeof title === 'object' && title !== null) {
    // Handle zh-TW -> zhTW mapping
    let lookupLang = acceptLang;
    if (acceptLang === 'zh-TW') lookupLang = 'zhTW';
    if (acceptLang === 'zh-CN') lookupLang = 'zhCN';
    
    // Try direct lookup
    if (title[lookupLang]) {
      return title[lookupLang];
    }
    
    // Fallback
    return title.en || title.zhTW || Object.values(title)[0] || 'Task';
  }
  return 'Task';
}

// Test different languages
const testLanguages = ['en', 'zh-TW', 'zh-CN', 'es', 'fr', 'de', 'ja', 'ko'];

console.log('Testing Discovery task title localization:\n');
console.log('Mock task:', JSON.stringify(mockTask.title, null, 2));
console.log('\nResults:');

testLanguages.forEach(lang => {
  const result = getLocalizedTitle(mockTask.title, lang);
  console.log(`${lang.padEnd(8)} => ${result}`);
});

// Test edge cases
console.log('\nEdge cases:');
console.log('null     =>', getLocalizedTitle(null, 'en'));
console.log('string   =>', getLocalizedTitle('Simple String', 'en'));
console.log('empty    =>', getLocalizedTitle({}, 'en'));