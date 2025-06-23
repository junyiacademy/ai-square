#!/usr/bin/env node
/**
 * 快速檢查所有語言標題長度的腳本
 * 不需要啟動瀏覽器或 dev server
 */

const fs = require('fs');
const path = require('path');

// 顏色輸出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// 讀取所有語言的翻譯檔案
const localesDir = path.join(__dirname, '../public/locales');
const languages = fs.readdirSync(localesDir);

console.log(`\n${colors.blue}📊 檢查所有語言的標題長度${colors.reset}\n`);

const results = [];
const warnings = [];

languages.forEach(lang => {
  const relationsFile = path.join(localesDir, lang, 'relations.json');
  
  if (fs.existsSync(relationsFile)) {
    const content = JSON.parse(fs.readFileSync(relationsFile, 'utf8'));
    const title = content.pageTitle;
    const length = title.length;
    
    results.push({
      語言: lang,
      標題: title,
      字數: length,
      狀態: length > 40 ? '⚠️ 過長' : '✅ OK'
    });
    
    if (length > 40) {
      warnings.push({ lang, title, length });
    }
  }
});

// 按字數排序
results.sort((a, b) => b.字數 - a.字數);

// 輸出表格
console.table(results);

// 輸出警告
if (warnings.length > 0) {
  console.log(`\n${colors.yellow}⚠️  警告：以下語言的標題可能太長：${colors.reset}\n`);
  warnings.forEach(w => {
    console.log(`  ${colors.red}${w.lang}${colors.reset}: "${w.title}" (${w.length} 字)`);
  });
  
  console.log(`\n${colors.blue}💡 建議：${colors.reset}`);
  console.log('  1. 這些標題在小螢幕上可能會被截斷');
  console.log('  2. 已經套用響應式字體大小 (text-2xl sm:text-3xl)');
  console.log('  3. 已經加入水平內距 (px-4) 防止貼邊');
} else {
  console.log(`\n${colors.green}✅ 所有語言的標題長度都在合理範圍內！${colors.reset}`);
}

// 計算平均長度
const avgLength = results.reduce((sum, r) => sum + r.字數, 0) / results.length;
console.log(`\n📊 平均標題長度：${avgLength.toFixed(1)} 字`);

// 檢查視窗寬度下的預估顯示效果
console.log(`\n${colors.blue}📱 不同視窗寬度的預估效果：${colors.reset}\n`);

const viewports = [
  { name: 'iPhone SE', width: 320 },
  { name: 'iPhone 8', width: 375 },
  { name: 'iPad', width: 768 },
  { name: 'Desktop', width: 1920 }
];

const fontSize = {
  mobile: 24,  // text-2xl
  desktop: 30  // text-3xl
};

viewports.forEach(vp => {
  console.log(`${vp.name} (${vp.width}px):`);
  
  const effectiveWidth = vp.width - 32; // 扣除 px-4 (16px * 2)
  const charWidth = vp.width >= 640 ? fontSize.desktop * 0.6 : fontSize.mobile * 0.6; // 預估字元寬度
  const maxChars = Math.floor(effectiveWidth / charWidth);
  
  warnings.forEach(w => {
    if (w.length > maxChars) {
      console.log(`  ${colors.red}✗${colors.reset} ${w.lang}: 可能需要 ${Math.ceil(w.length / maxChars)} 行`);
    }
  });
  
  if (warnings.filter(w => w.length > maxChars).length === 0) {
    console.log(`  ${colors.green}✓${colors.reset} 所有語言都能正常顯示`);
  }
  
  console.log('');
});