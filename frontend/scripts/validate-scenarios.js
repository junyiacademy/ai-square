#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 支援的語言
const LANGUAGES = ['zhTW', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it', 'zhCN', 'pt', 'ar', 'id', 'th'];

// 必要的 keys
const REQUIRED_KEYS = {
  scenario_info: {
    required: [
      'id', 'title', 'description', 'difficulty', 'estimated_duration', 
      'target_domains', 'prerequisites', 'learning_objectives'
    ],
    multilingual: ['title', 'description', 'prerequisites', 'learning_objectives']
  },
  tasks: {
    required: [
      'id', 'title', 'description', 'category', 'instructions', 'expected_outcome'
    ],
    multilingual: ['title', 'description', 'instructions', 'expected_outcome']
  },
  completion_criteria: {
    required: ['min_tasks_completed', 'min_overall_score'],
    multilingual: []
  }
};

function validateScenario(filePath) {
  console.log(`\n📋 驗證檔案: ${path.basename(filePath)}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(content);
    
    let errors = [];
    let warnings = [];

    // 檢查 scenario_info
    if (!data.scenario_info) {
      errors.push('缺少 scenario_info 區塊');
      return { errors, warnings };
    }

    // 檢查必要欄位
    REQUIRED_KEYS.scenario_info.required.forEach(key => {
      if (!data.scenario_info[key]) {
        errors.push(`scenario_info.${key} 缺少或為空`);
      }
    });

    // 檢查多語言支援
    REQUIRED_KEYS.scenario_info.multilingual.forEach(baseKey => {
      if (data.scenario_info[baseKey]) {
        LANGUAGES.forEach(lang => {
          const langKey = `${baseKey}_${lang}`;
          if (!data.scenario_info[langKey]) {
            errors.push(`scenario_info.${langKey} 缺少`);
          } else if (!data.scenario_info[langKey] || 
                     (Array.isArray(data.scenario_info[langKey]) && data.scenario_info[langKey].length === 0) ||
                     (typeof data.scenario_info[langKey] === 'string' && data.scenario_info[langKey].trim() === '')) {
            warnings.push(`scenario_info.${langKey} 為空值`);
          }
        });
      }
    });

    // 檢查 tasks
    if (!data.tasks || !Array.isArray(data.tasks)) {
      errors.push('tasks 必須是陣列且不能為空');
    } else {
      data.tasks.forEach((task, index) => {
        REQUIRED_KEYS.tasks.required.forEach(key => {
          if (!task[key]) {
            errors.push(`tasks[${index}].${key} 缺少或為空`);
          }
        });

        // 檢查 task 多語言支援
        REQUIRED_KEYS.tasks.multilingual.forEach(baseKey => {
          if (task[baseKey]) {
            LANGUAGES.forEach(lang => {
              const langKey = `${baseKey}_${lang}`;
              if (!task[langKey]) {
                errors.push(`tasks[${index}].${langKey} 缺少`);
              } else if (!task[langKey] || 
                         (Array.isArray(task[langKey]) && task[langKey].length === 0) ||
                         (typeof task[langKey] === 'string' && task[langKey].trim() === '')) {
                warnings.push(`tasks[${index}].${langKey} 為空值`);
              }
            });
          }
        });

        // 檢查 target_competencies 格式
        if (task.target_competencies && !Array.isArray(task.target_competencies)) {
          errors.push(`tasks[${index}].target_competencies 必須是陣列`);
        }

        // 檢查 evaluation_criteria 格式
        if (task.evaluation_criteria && !Array.isArray(task.evaluation_criteria)) {
          errors.push(`tasks[${index}].evaluation_criteria 必須是陣列`);
        }
      });
    }

    // 檢查 completion_criteria
    if (!data.completion_criteria) {
      errors.push('缺少 completion_criteria 區塊');
    } else {
      REQUIRED_KEYS.completion_criteria.required.forEach(key => {
        if (data.completion_criteria[key] === undefined) {
          errors.push(`completion_criteria.${key} 缺少`);
        }
      });
    }

    // 檢查 ai_module 配置（關鍵！）
    data.tasks.forEach((task, index) => {
      if (!task.ai_module) {
        errors.push(`tasks[${index}].ai_module 缺少 - 這是 AI 對話功能必需的！`);
      } else {
        if (!task.ai_module.role) {
          errors.push(`tasks[${index}].ai_module.role 缺少`);
        }
        if (!task.ai_module.model) {
          errors.push(`tasks[${index}].ai_module.model 缺少`);
        }
        if (!task.ai_module.persona) {
          errors.push(`tasks[${index}].ai_module.persona 缺少`);
        }
        if (!task.ai_module.initial_prompt) {
          errors.push(`tasks[${index}].ai_module.initial_prompt 缺少`);
        }
      }
      
      // 檢查 assessment_focus
      if (task.assessment_focus) {
        if (!task.assessment_focus.primary || !Array.isArray(task.assessment_focus.primary)) {
          warnings.push(`tasks[${index}].assessment_focus.primary 應該是陣列`);
        }
        if (task.assessment_focus.secondary && !Array.isArray(task.assessment_focus.secondary)) {
          warnings.push(`tasks[${index}].assessment_focus.secondary 應該是陣列`);
        }
      }
    });

    // 檢查 KSA mapping
    if (data.ksa_mapping) {
      ['knowledge', 'skills', 'attitudes'].forEach(category => {
        if (!data.ksa_mapping[category] || !Array.isArray(data.ksa_mapping[category])) {
          warnings.push(`ksa_mapping.${category} 應該是陣列`);
        } else {
          // 驗證 KSA 代碼格式
          const prefix = category.charAt(0).toUpperCase();
          data.ksa_mapping[category].forEach(code => {
            if (!code.match(new RegExp(`^${prefix}\\d+\\.\\d+$`))) {
              errors.push(`ksa_mapping.${category} 中的 '${code}' 格式不正確，應為 ${prefix}#.# 格式`);
            }
          });
        }
      });
    } else {
      warnings.push('缺少 ksa_mapping 區塊');
    }

    // 檢查多餘的 keys
    function checkExtraKeys(obj, path, allowedKeys) {
      Object.keys(obj).forEach(key => {
        if (!allowedKeys.includes(key)) {
          warnings.push(`${path}.${key} 是多餘的 key`);
        }
      });
    }

    // 報告結果
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ 通過驗證');
    } else {
      if (errors.length > 0) {
        console.log('❌ 錯誤:');
        errors.forEach(error => console.log(`   - ${error}`));
      }
      if (warnings.length > 0) {
        console.log('⚠️  警告:');
        warnings.forEach(warning => console.log(`   - ${warning}`));
      }
    }

    return { errors, warnings };

  } catch (error) {
    console.log(`❌ YAML 解析錯誤: ${error.message}`);
    return { errors: [error.message], warnings: [] };
  }
}

// 主函數
function main() {
  const dataDir = path.join(__dirname, '..', 'public', 'pbl_data');
  
  // 獲取所有 scenario 檔案（排除模板）
  const files = fs.readdirSync(dataDir)
    .filter(file => file.endsWith('_scenario.yaml') && !file.startsWith('_'))
    .map(file => path.join(dataDir, file));

  console.log('🔍 PBL Scenario 檔案驗證器');
  console.log('='.repeat(50));

  let totalErrors = 0;
  let totalWarnings = 0;

  files.forEach(file => {
    const { errors, warnings } = validateScenario(file);
    totalErrors += errors.length;
    totalWarnings += warnings.length;
  });

  console.log('\n📊 總結:');
  console.log(`檢查檔案數量: ${files.length}`);
  console.log(`總錯誤數: ${totalErrors}`);
  console.log(`總警告數: ${totalWarnings}`);

  if (totalErrors === 0) {
    console.log('🎉 所有檔案都通過驗證！');
    process.exit(0);
  } else {
    console.log('💥 發現錯誤，請修復後重新驗證');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}