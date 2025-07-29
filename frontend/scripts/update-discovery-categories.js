const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// 定義需要更新的職業和其新的類別
const categoryUpdates = {
  'startup_founder': 'business',
  'product_manager': 'business'
};

const languages = ['en', 'zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];

function updateYamlFiles() {
  const discoveryDataPath = path.join(__dirname, '..', 'public', 'discovery_data');
  
  for (const [careerPath, newCategory] of Object.entries(categoryUpdates)) {
    console.log(`\nUpdating ${careerPath} to category: ${newCategory}`);
    
    const careerDir = path.join(discoveryDataPath, careerPath);
    if (!fs.existsSync(careerDir)) {
      console.error(`  ❌ Directory not found: ${careerDir}`);
      continue;
    }
    
    for (const lang of languages) {
      const filename = `${careerPath}_${lang}.yml`;
      const filePath = path.join(careerDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠️  File not found: ${filename}`);
        continue;
      }
      
      try {
        // 讀取 YAML 檔案
        const content = fs.readFileSync(filePath, 'utf8');
        const data = yaml.parse(content);
        
        // 記錄原始類別
        const oldCategory = data.category;
        
        // 更新類別
        data.category = newCategory;
        
        // 寫回 YAML 檔案，保持原始格式
        const updatedContent = content.replace(
          /^category:\s*\w+$/m,
          `category: ${newCategory}`
        );
        
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`  ✅ Updated ${filename}: ${oldCategory} → ${newCategory}`);
        
      } catch (error) {
        console.error(`  ❌ Error updating ${filename}:`, error.message);
      }
    }
  }
  
  console.log('\n✅ Category updates completed!');
  console.log('\n⚠️  Remember to run the seed script to update the database:');
  console.log('  node scripts/seed-discovery-scenarios.ts');
}

// 執行更新
updateYamlFiles();