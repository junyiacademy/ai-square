# 業務規則 - AI Square

## 核心業務規則

### AI 素養四大領域（強制實作）
```
1. Engaging_with_AI   - 與 AI 互動
2. Creating_with_AI   - 用 AI 創造  
3. Managing_with_AI   - 管理 AI
4. Designing_with_AI  - 設計 AI
```
**規則**：
- 域名必須使用底線分隔（不是空格或連字號）
- 順序不可變更
- 每個域必須包含至少 3 個 competencies

### 語言支援規則
**必須支援的 9 種語言**：
```javascript
const SUPPORTED_LANGUAGES = [
  'en',      // English
  'zhTW',   // 繁體中文
  'es',      // Español
  'ja',      // 日本語
  'ko',      // 한국어
  'fr',      // Français
  'de',      // Deutsch
  'ru',      // Русский
  'it'       // Italiano
];

const DEFAULT_LANGUAGE = 'zhTW';
```

**規則**：
- 預設語言是 zhTW
- 語言切換必須即時生效（無需重新載入）
- 所有 UI 文字必須有對應翻譯
- 缺少翻譯時 fallback 到英文

### KSA 映射規則
```yaml
# 每個 competency 必須包含
K: Knowledge  # 知識 - 至少 1 個
S: Skills     # 技能 - 至少 1 個  
A: Attitudes  # 態度 - 至少 1 個
```

**規則**：
- KSA 代碼格式：`K1.1`, `S2.3`, `A4.2`
- 第一個數字是領域編號（1-4）
- 第二個數字是項目編號
- 不可重複使用相同代碼

### 數據完整性規則
1. **YAML 檔案位置**：
   - `frontend/public/rubrics_data/ai_lit_domains.yaml`
   - `frontend/public/rubrics_data/ksa_codes.yaml`

2. **欄位命名規則**：
   - 多語言欄位：`{field}_{lang}` (如 `description_zh`, `description_fr`)
   - 必要欄位：`name`, `description_{lang}` 對所有語言

3. **資料驗證**：
   - 所有 competency 必須有唯一 ID
   - 所有翻譯欄位必須非空
   - KSA 引用必須存在於 ksa_codes.yaml

### UI/UX 業務規則

1. **手風琴展開規則**：
   - 同時只能展開一個 domain
   - 同時只能展開一個 competency
   - 展開時有平滑動畫

2. **響應式設計規則**：
   - 手機版：單欄顯示
   - 平板版：可選雙欄
   - 桌面版：雙欄顯示

3. **顏色主題規則**：
   - 每個 domain 有專屬漸層色
   - 深色模式支援（未來）

### API 業務規則

1. **路由規則**：
   - `/api/relations?lang={lang}` - 獲取指定語言資料
   - 無 lang 參數時使用 DEFAULT_LANGUAGE

2. **快取規則**：
   - YAML 資料快取 5 分鐘
   - 語言切換不使用快取

3. **錯誤處理**：
   - 找不到語言：回傳 400
   - YAML 解析失敗：回傳 500
   - 永遠回傳有意義的錯誤訊息