#!/usr/bin/env node
/**
 * 使用 LLM 智能完成缺失的翻譯
 * 通過分析現有翻譯模式來生成新翻譯
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 基於 LLM 分析生成的翻譯映射
const LLM_TRANSLATIONS = {
  // K1.1 - K1.5 基礎 AI 概念
  "AI systems use algorithms that combine step-by-step procedures with statistical inferences (e.g., weights and biases) to process data, detect patterns, and generate probable outputs.": {
    ar: "تستخدم أنظمة الذكاء الاصطناعي خوارزميات تجمع بين الإجراءات خطوة بخطوة والاستدلالات الإحصائية (مثل الأوزان والتحيزات) لمعالجة البيانات واكتشاف الأنماط وإنتاج المخرجات المحتملة.",
    id: "Sistem AI menggunakan algoritma yang menggabungkan prosedur langkah demi langkah dengan inferensi statistik (misalnya, bobot dan bias) untuk memproses data, mendeteksi pola, dan menghasilkan output yang mungkin.",
    th: "ระบบ AI ใช้อัลกอริทึมที่รวมขั้นตอนแบบทีละขั้นตอนกับการอนุมานทางสถิติ (เช่น น้ำหนักและอคติ) เพื่อประมวลผลข้อมูล ตรวจจับรูปแบบ และสร้างผลลัพธ์ที่เป็นไปได้"
  },
  
  "Machines 'learn' by inferring how to generate outputs such as predictions, content, and recommendations that influence physical or virtual environments, in response to information from the input they receive. They do so with varying levels of autonomy and adaptiveness after deployment.": {
    ar: "تتعلم الآلات من خلال استنتاج كيفية إنتاج المخرجات مثل التنبؤات والمحتوى والتوصيات التي تؤثر على البيئات المادية أو الافتراضية، استجابة للمعلومات من المدخلات التي تتلقاها. وهي تفعل ذلك بمستويات متفاوتة من الاستقلالية والقدرة على التكيف بعد النشر.",
    id: "Mesin 'belajar' dengan menyimpulkan cara menghasilkan output seperti prediksi, konten, dan rekomendasi yang mempengaruhi lingkungan fisik atau virtual, sebagai respons terhadap informasi dari input yang mereka terima. Mereka melakukannya dengan berbagai tingkat otonomi dan kemampuan adaptasi setelah penerapan.",
    th: "เครื่องจักร 'เรียนรู้' โดยการอนุมานวิธีสร้างผลลัพธ์ เช่น การทำนาย เนื้อหา และคำแนะนำที่มีอิทธิพลต่อสภาพแวดล้อมทางกายภาพหรือเสมือน เพื่อตอบสนองต่อข้อมูลจากอินพุตที่พวกมันได้รับ พวกมันทำเช่นนี้ด้วยระดับความเป็นอิสระและความสามารถในการปรับตัวที่แตกต่างกันหลังการนำไปใช้"
  },
  
  "Generative AI produces probabilistic human-like outputs of various modalities (e.g., text, audio, visual) but lacks genuine understanding and intent.": {
    ar: "ينتج الذكاء الاصطناعي التوليدي مخرجات احتمالية شبيهة بالبشر من طرائق مختلفة (مثل النص والصوت والصورة) ولكنه يفتقر إلى الفهم والنية الحقيقيين.",
    id: "AI Generatif menghasilkan output probabilistik mirip manusia dari berbagai modalitas (misalnya, teks, audio, visual) tetapi tidak memiliki pemahaman dan niat yang sesungguhnya.",
    th: "AI แบบสร้างสรรค์ผลิตผลลัพธ์ที่มีความน่าจะเป็นคล้ายมนุษย์ในรูปแบบต่างๆ (เช่น ข้อความ เสียง ภาพ) แต่ขาดความเข้าใจและเจตนาที่แท้จริง"
  },
  
  "AI systems operate differently based on their purpose; they may be used for creating, predicting, recommending, or responding.": {
    ar: "تعمل أنظمة الذكاء الاصطناعي بشكل مختلف بناءً على غرضها؛ قد تُستخدم للإنشاء أو التنبؤ أو التوصية أو الاستجابة.",
    id: "Sistem AI beroperasi secara berbeda berdasarkan tujuannya; mereka dapat digunakan untuk membuat, memprediksi, merekomendasikan, atau merespons.",
    th: "ระบบ AI ทำงานแตกต่างกันตามวัตถุประสงค์ อาจใช้สำหรับการสร้าง การทำนาย การแนะนำ หรือการตอบสนอง"
  },
  
  "Building and maintaining AI systems relies on human design of algorithms, collection and labeling of data, and management of harmful content. These systems reflect human choices, assumptions, and labor practices, and are shaped by global conditions of inequality.": {
    ar: "يعتمد بناء وصيانة أنظمة الذكاء الاصطناعي على التصميم البشري للخوارزميات، وجمع البيانات ووسمها، وإدارة المحتوى الضار. تعكس هذه الأنظمة الخيارات والافتراضات وممارسات العمل البشرية، وتتشكل بفعل ظروف عدم المساواة العالمية.",
    id: "Membangun dan memelihara sistem AI bergantung pada desain algoritma oleh manusia, pengumpulan dan pelabelan data, serta pengelolaan konten berbahaya. Sistem-sistem ini mencerminkan pilihan, asumsi, dan praktik kerja manusia, dan dibentuk oleh kondisi ketidaksetaraan global.",
    th: "การสร้างและบำรุงรักษาระบบ AI ต้องอาศัยการออกแบบอัลกอริทึมโดยมนุษย์ การรวบรวมและติดป้ายกำกับข้อมูล และการจัดการเนื้อหาที่เป็นอันตราย ระบบเหล่านี้สะท้อนถึงทางเลือก สมมติฐาน และแนวปฏิบัติการทำงานของมนุษย์ และถูกกำหนดโดยสภาวะความไม่เท่าเทียมทั่วโลก"
  }
};

async function completeAllMissingTranslations() {
  console.log('🤖 使用 LLM 完成所有缺失的翻譯...\n');
  
  const jsonPath = path.join(__dirname, '../public/rubrics_data_json/ksa_codes.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  
  let updateCount = 0;
  const updates = {};
  
  // 遍歷所有 sections
  ['knowledge_codes', 'skill_codes', 'attitude_codes'].forEach(section => {
    if (!data[section]) return;
    
    updates[section] = { themes: {} };
    
    Object.entries(data[section].themes).forEach(([themeId, theme]) => {
      Object.entries(theme.codes).forEach(([codeId, code]) => {
        const translations = LLM_TRANSLATIONS[code.summary];
        
        if (translations) {
          let hasUpdate = false;
          const codeUpdates = {};
          
          // 檢查並更新缺失的翻譯
          if (code.summary_ar?.includes('[AR:')) {
            codeUpdates.summary_ar = translations.ar;
            hasUpdate = true;
          }
          if (code.summary_id?.includes('[ID:')) {
            codeUpdates.summary_id = translations.id;
            hasUpdate = true;
          }
          if (code.summary_th?.includes('[TH:')) {
            codeUpdates.summary_th = translations.th;
            hasUpdate = true;
          }
          
          if (hasUpdate) {
            if (!updates[section].themes[themeId]) {
              updates[section].themes[themeId] = { codes: {} };
            }
            updates[section].themes[themeId].codes[codeId] = codeUpdates;
            updateCount++;
          }
        }
      });
    });
  });
  
  if (updateCount > 0) {
    console.log(`📝 準備更新 ${updateCount} 個項目的翻譯...\n`);
    
    // 使用 API 更新
    try {
      const response = await fetch('http://localhost:3000/api/admin/data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'rubrics',
          filename: 'ksa_codes',
          updates: updates,
          syncToYaml: true
        })
      });
      
      if (response.ok) {
        console.log('✅ 翻譯更新成功！');
        console.log('✅ 已同步到 YAML');
      } else {
        console.error('❌ 更新失敗:', await response.text());
      }
    } catch (error) {
      console.error('❌ API 錯誤:', error.message);
    }
  } else {
    console.log('ℹ️ 沒有找到需要更新的翻譯');
  }
  
  // 顯示剩餘的翻譯需求
  let remaining = 0;
  ['knowledge_codes', 'skill_codes', 'attitude_codes'].forEach(section => {
    if (!data[section]) return;
    
    Object.values(data[section].themes).forEach(theme => {
      Object.values(theme.codes).forEach(code => {
        if (code.summary_ar?.includes('[AR:') || 
            code.summary_id?.includes('[ID:') || 
            code.summary_th?.includes('[TH:')) {
          remaining++;
        }
      });
    });
  });
  
  if (remaining > 0) {
    console.log(`\n⚠️ 還有 ${remaining} 個項目需要額外的翻譯`);
    console.log('💡 提示：需要分析更多內容並添加到 LLM_TRANSLATIONS 映射中');
  }
}

// 執行
completeAllMissingTranslations().catch(console.error);