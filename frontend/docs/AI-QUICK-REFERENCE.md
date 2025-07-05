# AI 開發快速參考

## 🎯 MVP 開發原則

### 優先級判斷
```bash
# 問自己：這個功能是否直接影響核心用戶價值？
✅ 是 → 立即實作
❓ 不確定 → 先建立 TODO，收集需求
❌ 否 → 記錄為技術債務，延後處理
```

### 避免過度工程化的信號
- 實作時間 > 2 小時但用戶看不到價值
- 創建複雜的基礎設施但核心功能未完成
- 追求 100% 完美但 80% 就能滿足需求
- 添加「以防萬一」的功能

## 🚀 高效開發模式

### 1. 一口氣開發流程
```bash
# 用戶指示：「實作登入功能，plan 開發 測試 一口氣做完」
1. 自動規劃 (TodoWrite)
2. 自動實作 + 測試
3. 自動運行測試 & lint
4. 停下等用戶確認
5. 用戶說 "commit" 才提交
```

### 2. 測試策略
```bash
# 單元測試 (70% 覆蓋率目標)
npm run test -- src/components/auth  # 組件測試
npm run test -- src/app/api         # API 測試
npm run test -- --coverage          # 覆蓋率報告

# E2E 測試 (關鍵流程)
npm run test:e2e -- --grep "登入"    # 特定流程
```

### 3. 開發檢查清單
- [ ] 核心功能是否滿足用戶需求？
- [ ] 測試是否覆蓋主要場景？
- [ ] 是否遵循現有代碼風格？
- [ ] 是否記錄了必要的 AI 使用複雜度？

## 📝 代碼模式

### React 組件模式
```typescript
// 標準組件結構
interface Props {
  // 明確的 TypeScript 類型
}

export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // 1. useState hooks
  // 2. useEffect hooks  
  // 3. 事件處理函數
  // 4. render return
};

export default ComponentName;
```

### API 路由模式
```typescript
// app/api/feature/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. 驗證輸入
    // 2. 業務邏輯處理
    // 3. 返回結果
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error message' }, 
      { status: 500 }
    );
  }
}
```

### 測試模式
```typescript
// 組件測試
describe('ComponentName', () => {
  it('應該正確渲染', () => {
    render(<ComponentName prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('應該處理用戶交互', async () => {
    render(<ComponentName />);
    await user.click(screen.getByRole('button'));
    expect(mockFunction).toHaveBeenCalled();
  });
});
```

## 🔧 實用命令

### 開發命令
```bash
# 開發服務器
npm run dev

# 建構檢查
npm run build
npm run lint
```

### Git 提交格式
```bash
# 功能開發
feat: 實作用戶登入功能

# 錯誤修復  
fix: 修復登入表單驗證問題

# 性能優化
perf: 優化首頁載入速度

# 重構
refactor: 重構認證邏輯
```

## 🧠 AI 協作最佳實踐

### 有效的任務描述
```bash
# ✅ 好的描述
"實作用戶登入功能，包含 email/password 驗證，JWT token 管理，錯誤處理"

# ❌ 模糊的描述  
"做登入"
```

### AI 複雜度追蹤
```bash
# 簡單查詢、小修改
AI_COMPLEXITY=simple

# 一般功能開發
AI_COMPLEXITY=medium  

# 複雜功能、大重構
AI_COMPLEXITY=complex

# 除錯、問題解決
AI_COMPLEXITY=debug
```

## 📊 品質檢查

### 提交前檢查
1. 測試通過 ✅
2. Lint 無錯誤 ✅  
3. TypeScript 編譯成功 ✅
4. 功能手動測試通過 ✅

### 代碼審查重點
- 是否解決了實際用戶問題？
- 代碼是否易於理解和維護？
- 是否遵循項目約定？
- 是否有適當的錯誤處理？

---

**記住：寧可快速交付 80% 的解決方案，也不要拖延追求 100% 的完美**