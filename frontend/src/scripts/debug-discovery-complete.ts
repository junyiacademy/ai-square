// Debug script for Discovery completion page
// Run with: npx tsx src/scripts/debug-discovery-complete.ts

import 'dotenv/config';

// Simulate the actual task title structure from the database
const taskFromDB = {
  id: 'task-1',
  title: {
    "ar": "Story Script Creation",
    "de": "Story Script Creation", 
    "en": "Story Script Creation",
    "es": "Story Script Creation",
    "fr": "Story Script Creation",
    "id": "Story Script Creation",
    "it": "Story Script Creation",
    "ja": "Story Script Creation",
    "ko": "Story Script Creation",
    "pt": "Story Script Creation",
    "ru": "Story Script Creation",
    "th": "Story Script Creation",
    "zhCN": "Story Script Creation",
    "zhTW": "故事腳本創作"
  }
};

// This is what's happening in the API
function getLocalizedTitle(title: any, acceptLang: string): string {
  console.log(`\nProcessing title for language: ${acceptLang}`);
  console.log('Title object:', JSON.stringify(title));
  
  if (typeof title === 'string') {
    console.log('Title is already a string');
    return title;
  }
  
  if (typeof title === 'object' && title !== null) {
    // Handle zh-TW -> zhTW mapping
    let lookupLang = acceptLang;
    if (acceptLang === 'zh-TW') lookupLang = 'zhTW';
    if (acceptLang === 'zh-CN') lookupLang = 'zhCN';
    
    console.log(`Looking for key: ${lookupLang}`);
    
    // Try direct lookup
    if (title[lookupLang]) {
      console.log(`Found: ${title[lookupLang]}`);
      return title[lookupLang];
    }
    
    // Fallback
    const fallback = title.en || title.zhTW || Object.values(title)[0] || 'Task';
    console.log(`Using fallback: ${fallback}`);
    return fallback;
  }
  
  console.log('Title is neither string nor object, returning default');
  return 'Task';
}

// Test with different Accept-Language headers
console.log('=== Testing Discovery Task Title Localization ===\n');

const result1 = getLocalizedTitle(taskFromDB.title, 'zh-TW');
console.log(`\nResult for zh-TW: "${result1}"`);

const result2 = getLocalizedTitle(taskFromDB.title, 'en');
console.log(`\nResult for en: "${result2}"`);

// What might be happening - the title might be JSON stringified
console.log('\n\n=== Testing with JSON stringified title ===');
const stringifiedTitle = JSON.stringify(taskFromDB.title);
const result3 = getLocalizedTitle(stringifiedTitle, 'zh-TW');
console.log(`\nResult for zh-TW with stringified: "${result3}"`);