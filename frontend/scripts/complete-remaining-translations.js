#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 語言對應表
const translations = {
  'ar': {
    // Chat translations (阿拉伯語)
    'aiAdvisor': 'مستشار تعلم الذكاء الاصطناعي',
    'newChat': 'محادثة جديدة',
    'history': 'تاريخ المحادثة',
    'welcomeTitle': 'مرحباً! أنا مستشار تعلم الذكاء الاصطناعي الخاص بك',
    'welcomeMessage': 'أنا هنا لمساعدتك في التنقل في رحلة محو الأمية بالذكاء الاصطناعي. اسألني عن مسارات التعلم أو سيناريوهات التعلم القائم على المشاكل أو أي مفاهيم ذكاء اصطناعي تريد فهمها بشكل أفضل.',
    'inputPlaceholder': 'اكتب رسالتك هنا... (اضغط Enter للإرسال)',
    'suggestedTopic1': 'ما هو سيناريو التعلم القائم على المشاكل الذي يجب أن أبدأ به؟',
    'suggestedTopic2': 'ساعدني في فهم نتائج تقييمي',
    'suggestedTopic3': 'ما هي نقاط ضعفي وكيف يمكنني تحسينها؟',
    'suggestedTopic4': 'اشرح مفاهيم الذكاء الاصطناعي بمصطلحات بسيطة'
  },
  'th': {
    // Chat translations (泰語)  
    'aiAdvisor': 'ที่ปรึกษาการเรียนรู้ AI',
    'newChat': 'แชทใหม่',
    'history': 'ประวัติการแชท',
    'welcomeTitle': 'สวัสดี! ฉันคือที่ปรึกษาการเรียนรู้ AI ของคุณ',
    'welcomeMessage': 'ฉันอยู่ที่นี่เพื่อช่วยคุณนำทางการเดินทางด้านการรู้เท่าทัน AI ถามฉันเกี่ยวกับเส้นทางการเรียนรู้ สถานการณ์ PBL หรือแนวคิด AI ใดๆ ที่คุณต้องการเข้าใจดีขึ้น',
    'inputPlaceholder': 'พิมพ์ข้อความของคุณที่นี่... (กด Enter เพื่อส่ง)',
    'suggestedTopic1': 'ฉันควรเริ่มต้นด้วยสถานการณ์ PBL ใด?',
    'suggestedTopic2': 'ช่วยฉันเข้าใจผลการประเมินของฉัน',
    'suggestedTopic3': 'จุดอ่อนของฉันคืออะไรและฉันจะปรับปรุงได้อย่างไร?',
    'suggestedTopic4': 'อธิบายแนวคิด AI ในแง่ที่เข้าใจง่าย'
  }
};

// 更新檔案的函數
function updateTranslationFile(filePath, lang) {
  try {
    // 讀取現有檔案
    let content = fs.readFileSync(filePath, 'utf8');
    let jsonData = JSON.parse(content);
    
    // 替換佔位符
    function replaceInObject(obj, langCode) {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          // 移除佔位符標記
          obj[key] = obj[key].replace(/\s*\[.*?\]\s*/g, '');
          
          // 如果有對應的翻譯，使用翻譯
          if (translations[langCode] && translations[langCode][key]) {
            obj[key] = translations[langCode][key];
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          replaceInObject(obj[key], langCode);
        }
      }
    }
    
    replaceInObject(jsonData, lang);
    
    // 寫回檔案
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2) + '\n');
    console.log(`✅ Updated: ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// 處理需要翻譯的檔案
const filesToProcess = [
  'public/locales/ar/chat.json',
  'public/locales/th/chat.json'
];

console.log('🚀 Starting translation update...\n');

filesToProcess.forEach(filePath => {
  const langCode = filePath.split('/')[2]; // 取得語言代碼
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (fs.existsSync(fullPath)) {
    updateTranslationFile(fullPath, langCode);
  } else {
    console.log(`⚠️  File not found: ${fullPath}`);
  }
});

console.log('\n✨ Translation update completed!');