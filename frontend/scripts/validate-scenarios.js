const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SCENARIOS_DIR = path.join(__dirname, '..', 'public', 'pbl_data');

function validateScenarios() {
  console.log('🔍 開始驗證 PBL 情境檔案...');
  
  let hasErrors = false;
  const scenarios = [];
  
  try {
    // Check if directory exists
    if (!fs.existsSync(SCENARIOS_DIR)) {
      console.error(`❌ 找不到 PBL 資料目錄: ${SCENARIOS_DIR}`);
      process.exit(1);
    }
    
    // Read all YAML files in the directory (skip template files)
    const files = fs.readdirSync(SCENARIOS_DIR)
      .filter(file => (file.endsWith('.yaml') || file.endsWith('.yml')) && !file.startsWith('_'));
    
    if (files.length === 0) {
      console.warn('⚠️  沒有找到任何 YAML 檔案（跳過驗證）');
      console.log('✅ 驗證完成（無檔案需要驗證）');
      process.exit(0);
    }
    
    console.log(`📂 找到 ${files.length} 個 YAML 檔案`);
    
    // Validate each file
    files.forEach(file => {
      const filePath = path.join(SCENARIOS_DIR, file);
      console.log(`\n📄 驗證: ${file}`);
      
      try {
        // Read and parse YAML
        const content = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(content);
        
        // Basic validation
        if (!data) {
          console.error(`  ❌ 檔案是空的或格式錯誤`);
          hasErrors = true;
          return;
        }
        
        // Check for scenario structure
        if (file.includes('scenario')) {
          if (!data.id) {
            console.error(`  ❌ 缺少必要欄位: id`);
            hasErrors = true;
          }
          if (!data.title) {
            console.error(`  ❌ 缺少必要欄位: title`);
            hasErrors = true;
          }
          if (!data.tasks || !Array.isArray(data.tasks)) {
            console.error(`  ❌ 缺少必要欄位: tasks (必須是陣列)`);
            hasErrors = true;
          } else {
            console.log(`  ✅ 找到 ${data.tasks.length} 個任務`);
            
            // Validate each task
            data.tasks.forEach((task, index) => {
              if (!task.id) {
                console.error(`  ❌ 任務 ${index + 1} 缺少 id`);
                hasErrors = true;
              }
              if (!task.title && !task.title_zh) {
                console.error(`  ❌ 任務 ${index + 1} 缺少標題`);
                hasErrors = true;
              }
            });
          }
          
          scenarios.push({
            file,
            id: data.id,
            title: data.title || data.title_zh || 'Untitled',
            taskCount: data.tasks ? data.tasks.length : 0
          });
        }
        
        console.log(`  ✅ 格式正確`);
        
      } catch (error) {
        console.error(`  ❌ 解析錯誤: ${error.message}`);
        hasErrors = true;
      }
    });
    
    // Summary
    console.log('\n📊 驗證摘要:');
    console.log(`  總共驗證了 ${files.length} 個檔案`);
    console.log(`  找到 ${scenarios.length} 個情境`);
    
    if (scenarios.length > 0) {
      console.log('\n📚 情境列表:');
      scenarios.forEach(s => {
        console.log(`  - ${s.id}: ${s.title} (${s.taskCount} 個任務)`);
      });
    }
    
    if (hasErrors) {
      console.error('\n❌ 驗證失敗，請修正錯誤後再試');
      process.exit(1);
    } else {
      console.log('\n✅ 所有 PBL 情境檔案驗證通過！');
    }
    
  } catch (error) {
    console.error('❌ 驗證過程發生錯誤:', error.message);
    process.exit(1);
  }
}

// Run validation
validateScenarios();