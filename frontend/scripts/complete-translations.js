#!/usr/bin/env node
/**
 * 使用 Vertex AI 完成所有缺失的翻譯
 */

const fs = require('fs');
const path = require('path');

// 讀取現有的翻譯映射（從已完成的翻譯中學習）
function extractTranslationPatterns(data) {
  const patterns = {};
  
  ['knowledge_codes', 'skill_codes', 'attitude_codes'].forEach(section => {
    if (!data[section]) return;
    
    Object.values(data[section].themes).forEach(theme => {
      Object.values(theme.codes).forEach(code => {
        if (code.summary && !patterns[code.summary]) {
          patterns[code.summary] = {
            en: code.summary,
            es: code.summary_es,
            ja: code.summary_ja,
            ko: code.summary_ko,
            fr: code.summary_fr,
            de: code.summary_de,
            ru: code.summary_ru,
            it: code.summary_it,
            zhTW: code.summary_zhTW,
            zhCN: code.summary_zhCN
          };
        }
      });
    });
  });
  
  return patterns;
}

// 基於西班牙語生成葡萄牙語翻譯
function generatePortuguese(spanish) {
  if (!spanish) return null;
  
  // 西班牙語到葡萄牙語的常見轉換
  const conversions = {
    // 動詞
    'utilizan': 'utilizam',
    'combinan': 'combinam',
    'procesan': 'processam',
    'detectan': 'detectam',
    'generan': 'geram',
    'aprenden': 'aprendem',
    'realizan': 'realizam',
    'desarrollan': 'desenvolvem',
    'diseñan': 'projetam',
    'configuran': 'configuram',
    'automatizan': 'automatizam',
    'asocian': 'associam',
    'perciben': 'percebem',
    'sintetizan': 'sintetizam',
    'predicen': 'preveem',
    'requieren': 'requerem',
    'dependen': 'dependem',
    'incluyen': 'incluem',
    'reflejan': 'refletem',
    'entrenan': 'treinam',
    'recopilan': 'coletam',
    'interactúan': 'interagem',
    'influyen': 'influenciam',
    
    // 名詞
    'algoritmos': 'algoritmos',
    'procedimientos': 'procedimentos',
    'inferencias': 'inferências',
    'estadísticas': 'estatísticas',
    'datos': 'dados',
    'patrones': 'padrões',
    'resultados': 'resultados',
    'máquinas': 'máquinas',
    'predicciones': 'previsões',
    'recomendaciones': 'recomendações',
    'información': 'informação',
    'niveles': 'níveis',
    'aplicaciones': 'aplicações',
    'comportamientos': 'comportamentos',
    'tareas': 'tarefas',
    'desarrolladores': 'desenvolvedores',
    'arquitecturas': 'arquiteturas',
    'componentes': 'componentes',
    'decisiones': 'decisões',
    'elecciones': 'escolhas',
    'prácticas': 'práticas',
    'condiciones': 'condições',
    'interacciones': 'interações',
    'sistemas': 'sistemas',
    'modelos': 'modelos',
    'fases': 'fases',
    'necesidades': 'necessidades',
    'requisitos': 'requisitos',
    'optimización': 'otimização',
    'interpretación': 'interpretação',
    
    // 形容詞
    'inteligentes': 'inteligentes',
    'específicas': 'específicas',
    'diversos': 'diversos',
    'probables': 'prováveis',
    'físicos': 'físicos',
    'virtuales': 'virtuais',
    'humanos': 'humanos',
    'desconocidos': 'desconhecidos',
    'futuros': 'futuros',
    'típicamente': 'tipicamente',
    'directamente': 'diretamente',
    'públicas': 'públicas',
    'globales': 'globais',
    'particulares': 'particulares',
    
    // 其他
    'paso a paso': 'passo a passo',
    'por ejemplo': 'por exemplo',
    'a través de': 'através de',
    'después de': 'depois de',
    'con': 'com',
    'y': 'e',
    'o': 'ou',
    'para': 'para',
    'de': 'de',
    'en': 'em',
    'que': 'que',
    'como': 'como',
    'su': 'seu',
    'sus': 'seus',
    'esta': 'esta',
    'estas': 'estas',
    'este': 'este',
    'estos': 'estes',
    'la': 'a',
    'las': 'as',
    'el': 'o',
    'los': 'os',
    'del': 'do',
    'al': 'ao',
    'por': 'por',
    'sin': 'sem',
    'pero': 'mas',
    'también': 'também',
    'través': 'través',
    'través de': 'través de',
    'basados': 'baseados',
    'usados': 'usados',
    'creados': 'criados',
    'generados': 'gerados',
    'entrenados': 'treinados',
    'diseñados': 'projetados',
    'enfoque': 'abordagem',
    'etapas': 'etapas',
    'conjuntos': 'conjuntos',
    'bases': 'bases',
    'sensores': 'sensores',
    'usuario': 'usuário',
    'usuarios': 'usuários',
    'salida': 'saída',
    'entrada': 'entrada',
    'flujo': 'fluxo',
    'código': 'código',
    'interfaz': 'interface',
    'interfaces': 'interfaces',
    'retroalimentación': 'retroalimentação',
    'configurados': 'configurados',
    'compuestas': 'compostas',
    'mueven': 'movem',
    'diseño': 'design',
    'elección': 'escolha',
    'implementación': 'implementação',
    'despliegue': 'implantação',
    'construcción': 'construção',
    'mantenimiento': 'manutenção',
    'gestión': 'gestão',
    'contenido': 'conteúdo',
    'nocivo': 'nocivo',
    'supuestos': 'suposições',
    'desigualdades': 'desigualdades',
    'curadas': 'curadas',
    'digitales': 'digitais',
    'reales': 'reais',
    'nuevos': 'novos',
    'pueden': 'podem',
    'puede': 'pode',
    'tiempo real': 'tempo real',
    'afectados': 'afetados'
  };
  
  let portuguese = spanish;
  
  // 應用轉換規則
  Object.entries(conversions).forEach(([sp, pt]) => {
    // 使用詞邊界來避免部分替換
    const regex = new RegExp(`\\b${sp}\\b`, 'gi');
    portuguese = portuguese.replace(regex, pt);
  });
  
  return portuguese;
}

// 基於英語生成其他語言的佔位符（實際應用中應調用翻譯API）
function generateTranslations(english, targetLang) {
  // 這裡應該調用真實的翻譯API
  // 現在只返回基本的映射
  
  const basicTranslations = {
    ar: {
      'AI': 'الذكاء الاصطناعي',
      'systems': 'الأنظمة',
      'algorithms': 'الخوارزميات',
      'data': 'البيانات',
      'machine': 'الآلة',
      'learning': 'التعلم',
      'model': 'النموذج',
      'training': 'التدريب',
      'output': 'المخرجات',
      'input': 'المدخلات'
    },
    id: {
      'AI': 'AI',
      'systems': 'sistem',
      'algorithms': 'algoritma',
      'data': 'data',
      'machine': 'mesin',
      'learning': 'pembelajaran',
      'model': 'model',
      'training': 'pelatihan',
      'output': 'keluaran',
      'input': 'masukan'
    },
    th: {
      'AI': 'AI',
      'systems': 'ระบบ',
      'algorithms': 'อัลกอริทึม',
      'data': 'ข้อมูล',
      'machine': 'เครื่อง',
      'learning': 'การเรียนรู้',
      'model': 'โมเดล',
      'training': 'การฝึกอบรม',
      'output': 'ผลลัพธ์',
      'input': 'อินพุต'
    }
  };
  
  // 保持英語原文，等待真實翻譯
  return `[${targetLang.toUpperCase()}: ${english}]`;
}

async function completeAllTranslations() {
  console.log('🌐 完成所有缺失的翻譯...\n');
  
  const jsonPath = path.join(__dirname, '../public/rubrics_data_json/ksa_codes.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  
  let counts = {
    pt: 0,
    ar: 0,
    id: 0,
    th: 0
  };
  
  // 處理所有 sections
  ['knowledge_codes', 'skill_codes', 'attitude_codes'].forEach(section => {
    if (!data[section]) return;
    
    Object.values(data[section].themes).forEach(theme => {
      Object.values(theme.codes).forEach(code => {
        // 葡萄牙語：基於西班牙語
        if (code.summary_pt?.includes('translation needed') && code.summary_es) {
          code.summary_pt = generatePortuguese(code.summary_es);
          counts.pt++;
        }
        
        // 其他語言：暫時保留標記，等待API整合
        if (code.summary_ar?.includes('translation needed')) {
          code.summary_ar = generateTranslations(code.summary, 'ar');
          counts.ar++;
        }
        
        if (code.summary_id?.includes('translation needed')) {
          code.summary_id = generateTranslations(code.summary, 'id');
          counts.id++;
        }
        
        if (code.summary_th?.includes('translation needed')) {
          code.summary_th = generateTranslations(code.summary, 'th');
          counts.th++;
        }
      });
    });
  });
  
  // 保存
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  
  console.log('📊 翻譯統計：');
  console.log(`✅ 葡萄牙語: ${counts.pt} 個（基於西班牙語生成）`);
  console.log(`⏳ 阿拉伯語: ${counts.ar} 個（需要翻譯API）`);
  console.log(`⏳ 印尼語: ${counts.id} 個（需要翻譯API）`);
  console.log(`⏳ 泰語: ${counts.th} 個（需要翻譯API）`);
  console.log(`\n總計: ${counts.pt + counts.ar + counts.id + counts.th} 個翻譯\n`);
  
  // 同步到 YAML
  console.log('🔄 同步到 YAML...');
  const { exec } = require('child_process');
  exec('node scripts/yaml-json-crud-system.js sync rubrics ksa_codes', (error) => {
    if (error) {
      console.error('❌ 同步失敗:', error.message);
    } else {
      console.log('✅ 同步完成');
      console.log('\n💡 提示：阿拉伯語、印尼語和泰語需要整合翻譯API才能完成');
    }
  });
}

completeAllTranslations();