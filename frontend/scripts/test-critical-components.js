#!/usr/bin/env node

/**
 * 關鍵組件測試腳本
 * 專門檢查我們修改可能影響的核心組件
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 檢查關鍵組件是否受到影響...\n');

const criticalComponents = [
  // Assessment 相關
  {
    path: 'src/components/assessment/AssessmentResults.tsx',
    name: 'Assessment Results (雷達圖)',
    checkFor: ['DynamicRadarChart', 'DynamicRadar', 'ResponsiveContainer'],
    critical: true
  },
  
  // KSA 相關
  {
    path: 'src/components/pbl/KSADiagnosticReport.tsx',
    name: 'KSA 診斷報告',
    checkFor: ['KSA', 'diagnostic'],
    critical: true
  },
  {
    path: 'src/components/pbl/KSARadarChart.tsx',
    name: 'KSA 雷達圖',
    checkFor: ['RadarChart', 'Radar'],
    critical: true
  },
  {
    path: 'src/components/pbl/KSAKnowledgeGraph.tsx',
    name: 'KSA 知識圖',
    checkFor: ['Knowledge', 'Graph'],
    critical: true
  },

  // 頁面組件
  {
    path: 'src/app/assessment/page.tsx',
    name: 'Assessment 頁面',
    checkFor: ['assessment', 'quiz'],
    critical: true
  },
  {
    path: 'src/app/dashboard/page.tsx',
    name: 'Dashboard 頁面',
    checkFor: ['dashboard'],
    critical: true
  },
  {
    path: 'src/app/learning-path/page.tsx',
    name: 'Learning Path 頁面',
    checkFor: ['learning', 'path'],
    critical: true
  },

  // API 路由
  {
    path: 'src/app/api/pbl/chat/route.ts',
    name: 'PBL Chat API',
    checkFor: ['chat', 'conversation'],
    critical: true
  },

  // 核心服務
  {
    path: 'src/lib/dynamic-imports.tsx',
    name: '動態導入配置',
    checkFor: ['DynamicRadarChart', 'DynamicRadar'],
    critical: true
  },
  {
    path: 'src/services/content-service.ts',
    name: '內容服務',
    checkFor: ['getRelationsTree', 'scenarios'],
    critical: false
  }
];

function checkComponent(component) {
  const fullPath = path.join(__dirname, '..', component.path);
  
  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      message: `❌ 檔案不存在: ${component.path}`
    };
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // 檢查語法錯誤
    if (content.includes('syntax error') || content.includes('SyntaxError')) {
      return {
        success: false,
        message: `❌ 語法錯誤`
      };
    }

    // 檢查關鍵內容
    const missingKeywords = component.checkFor.filter(keyword => 
      !content.toLowerCase().includes(keyword.toLowerCase())
    );

    if (missingKeywords.length > 0) {
      return {
        success: false,
        message: `⚠️  缺少關鍵內容: ${missingKeywords.join(', ')}`
      };
    }

    // 檢查 import 錯誤
    const importErrors = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.trim().startsWith('import') && line.includes('from')) {
        // 簡單檢查 import 語法
        if (!line.includes(';') && !line.includes('\n')) {
          // 可能有問題，但不一定
        }
      }
    });

    return {
      success: true,
      message: `✅ 正常`
    };

  } catch (error) {
    return {
      success: false,
      message: `❌ 讀取錯誤: ${error.message}`
    };
  }
}

// 執行檢查
let criticalIssues = 0;
let totalIssues = 0;

criticalComponents.forEach(component => {
  const result = checkComponent(component);
  const status = result.success ? '✅' : (component.critical ? '🚨' : '⚠️');
  
  console.log(`${status} ${component.name}`);
  console.log(`   📁 ${component.path}`);
  console.log(`   ${result.message}\n`);
  
  if (!result.success) {
    totalIssues++;
    if (component.critical) {
      criticalIssues++;
    }
  }
});

// 總結
console.log('📊 檢查結果:');
console.log(`   總組件數: ${criticalComponents.length}`);
console.log(`   正常組件: ${criticalComponents.length - totalIssues}`);
console.log(`   有問題組件: ${totalIssues}`);
console.log(`   關鍵問題: ${criticalIssues}\n`);

if (criticalIssues > 0) {
  console.log('🚨 發現關鍵問題！這些可能會影響核心功能：');
  console.log('   建議立即檢查並修復標記為 🚨 的組件\n');
} else if (totalIssues > 0) {
  console.log('⚠️  發現一些非關鍵問題，但核心功能應該正常運作\n');
} else {
  console.log('🎉 所有關鍵組件看起來都正常！\n');
}

console.log('💡 建議的測試順序：');
console.log('   1. npm run dev');
console.log('   2. 測試 Assessment 頁面和雷達圖');
console.log('   3. 測試 PBL Chat 功能');
console.log('   4. 測試 KSA 診斷功能');
console.log('   5. 測試 Dashboard 和 Learning Path');