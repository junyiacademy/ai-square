#!/usr/bin/env node
/**
 * 驗證所有語言翻譯檔案的 key 是否與 YAML 檔案匹配
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 顏色輸出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// 讀取 YAML 檔案中的 domain keys
const yamlPath = path.join(__dirname, '../public/rubrics_data/ai_lit_domains.yaml');
const yamlContent = fs.readFileSync(yamlPath, 'utf8');
const yamlData = yaml.load(yamlContent);

// 獲取所有 domain keys
const domainKeys = Object.keys(yamlData.domains);
console.log(`\n${colors.blue}📋 YAML 檔案中的 Domain Keys:${colors.reset}`);
domainKeys.forEach(key => console.log(`  - ${key}`));

// 讀取所有語言的翻譯檔案
const localesDir = path.join(__dirname, '../public/locales');
const languages = fs.readdirSync(localesDir);

console.log(`\n${colors.blue}🔍 檢查所有語言的翻譯檔案...${colors.reset}\n`);

const results = {
  passed: [],
  failed: []
};

languages.forEach(lang => {
  const relationsFile = path.join(localesDir, lang, 'relations.json');
  
  if (fs.existsSync(relationsFile)) {
    const content = JSON.parse(fs.readFileSync(relationsFile, 'utf8'));
    const missingKeys = [];
    const wrongKeys = [];
    
    // 檢查每個 domain key
    domainKeys.forEach(domainKey => {
      if (!content[domainKey]) {
        missingKeys.push(domainKey);
        
        // 檢查是否使用了空格版本
        const spaceKey = domainKey.replace(/_/g, ' ');
        if (content[spaceKey]) {
          wrongKeys.push({ expected: domainKey, found: spaceKey });
        }
      }
    });
    
    if (missingKeys.length === 0 && wrongKeys.length === 0) {
      results.passed.push(lang);
      console.log(`${colors.green}✅ ${lang}${colors.reset} - 所有 domain keys 正確`);
    } else {
      results.failed.push(lang);
      console.log(`${colors.red}❌ ${lang}${colors.reset}`);
      
      if (wrongKeys.length > 0) {
        console.log(`   ${colors.yellow}錯誤的 keys (使用空格而非底線):${colors.reset}`);
        wrongKeys.forEach(item => {
          console.log(`     - "${item.found}" → 應該是 "${item.expected}"`);
        });
      }
      
      if (missingKeys.length > 0) {
        console.log(`   ${colors.yellow}缺少的 keys:${colors.reset}`);
        missingKeys.forEach(key => {
          console.log(`     - ${key}`);
        });
      }
    }
    
    // 檢查翻譯內容
    console.log(`   範例翻譯:`);
    domainKeys.slice(0, 2).forEach(key => {
      if (content[key]) {
        console.log(`     ${key}: "${content[key]}"`);
      }
    });
    console.log('');
  }
});

// 總結
console.log(`${colors.blue}📊 檢查結果總結:${colors.reset}`);
console.log(`✅ 通過: ${results.passed.length} 個語言 (${results.passed.join(', ')})`);
console.log(`❌ 失敗: ${results.failed.length} 個語言 ${results.failed.length > 0 ? `(${results.failed.join(', ')})` : ''}`);

if (results.failed.length === 0) {
  console.log(`\n${colors.green}🎉 太好了！所有語言的翻譯 keys 都正確！${colors.reset}`);
} else {
  console.log(`\n${colors.yellow}⚠️  請修正上述錯誤的翻譯 keys${colors.reset}`);
  process.exit(1);
}