# 功能開發完整範例：用戶偏好設定

這是一個完整的功能開發範例，展示從需求到完成的整個流程。

## 📋 需求描述

**User Story**: 作為學習者，我想要設定個人偏好（主題、字體大小），以便於獲得更好的學習體驗。

## 🚀 開發流程

### Step 1: 啟動開發
```bash
make dev-start
```

### Step 2: 創建開發日誌
```yaml
# docs/dev-logs/2025-06-23-feature-user-preferences.yml
type: feature
title: 用戶偏好設定功能
date: 2025-06-23
developer: Human/AI
status: in_progress

user_story:
  as: 學習者
  want: 設定個人偏好（主題、字體大小）
  so_that: 獲得更好的學習體驗

acceptance_criteria:
  - 支援淺色/深色主題切換
  - 三種字體大小選項（小/中/大）
  - 偏好保存到 localStorage
  - 即時生效無需重載
```

### Step 3: TDD - 先寫測試

```typescript
// __tests__/features/UserPreferences.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserPreferences } from '@/components/features/UserPreferences'

describe('UserPreferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should save theme preference to localStorage', async () => {
    render(<UserPreferences />)
    
    const themeToggle = screen.getByRole('button', { name: /dark mode/i })
    await userEvent.click(themeToggle)
    
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('should apply saved font size on mount', () => {
    localStorage.setItem('fontSize', 'large')
    
    render(<UserPreferences />)
    
    expect(document.documentElement).toHaveClass('text-lg')
  })
})
```

### Step 4: 實作功能

```typescript
// src/components/features/UserPreferences.tsx
'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'

type Theme = 'light' | 'dark'
type FontSize = 'small' | 'medium' | 'large'

export function UserPreferences() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<Theme>('light')
  const [fontSize, setFontSize] = useState<FontSize>('medium')

  // 載入已保存的偏好
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme
    const savedFontSize = localStorage.getItem('fontSize') as FontSize
    
    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    }
    
    if (savedFontSize) {
      setFontSize(savedFontSize)
      applyFontSize(savedFontSize)
    }
  }, [])

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size)
    localStorage.setItem('fontSize', size)
    applyFontSize(size)
  }

  const applyTheme = (theme: Theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const applyFontSize = (size: FontSize) => {
    const root = document.documentElement
    root.classList.remove('text-sm', 'text-base', 'text-lg')
    
    const sizeClasses = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg'
    }
    
    root.classList.add(sizeClasses[size])
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">{t('preferences.title')}</h2>
      
      {/* 主題設定 */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">{t('preferences.theme')}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleThemeChange('light')}
            className={`px-4 py-2 rounded ${
              theme === 'light' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200'
            }`}
            aria-label="Light mode"
          >
            ☀️ {t('preferences.light')}
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={`px-4 py-2 rounded ${
              theme === 'dark' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200'
            }`}
            aria-label="Dark mode"
          >
            🌙 {t('preferences.dark')}
          </button>
        </div>
      </div>

      {/* 字體大小設定 */}
      <div>
        <h3 className="font-medium mb-2">{t('preferences.fontSize')}</h3>
        <select
          value={fontSize}
          onChange={(e) => handleFontSizeChange(e.target.value as FontSize)}
          className="w-full p-2 border rounded"
        >
          <option value="small">{t('preferences.small')}</option>
          <option value="medium">{t('preferences.medium')}</option>
          <option value="large">{t('preferences.large')}</option>
        </select>
      </div>
    </Card>
  )
}
```

### Step 5: 添加到頁面

```typescript
// src/app/settings/page.tsx
import { UserPreferences } from '@/components/features/UserPreferences'

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">設定</h1>
      <UserPreferences />
    </div>
  )
}
```

### Step 6: 更新翻譯檔案

```json
// public/locales/zh-TW/common.json
{
  "preferences": {
    "title": "個人偏好設定",
    "theme": "主題",
    "light": "淺色",
    "dark": "深色",
    "fontSize": "字體大小",
    "small": "小",
    "medium": "中",
    "large": "大"
  }
}
```

### Step 7: 整合測試

```typescript
// __tests__/integration/settings.test.tsx
import { render, screen } from '@testing-library/react'
import SettingsPage from '@/app/settings/page'

describe('Settings Page Integration', () => {
  it('should render preferences component', () => {
    render(<SettingsPage />)
    
    expect(screen.getByText('個人偏好設定')).toBeInTheDocument()
    expect(screen.getByText('主題')).toBeInTheDocument()
    expect(screen.getByText('字體大小')).toBeInTheDocument()
  })
})
```

### Step 8: 需求變更處理

客戶要求添加「重置為預設值」功能：

```yaml
# 更新開發日誌
changes:
  - date: 2025-06-23T14:30:00
    type: feature_extension
    description: 添加重置為預設值按鈕
    impact:
      technical: 低 - 只需添加一個函數
      product: 中 - 改善用戶體驗
```

### Step 9: 執行檢查並提交

```bash
# 運行所有檢查
make commit-smart

# 系統自動執行：
# ✅ ESLint 檢查
# ✅ TypeScript 編譯
# ✅ 執行測試
# ✅ 檢查覆蓋率 (87%)
# ✅ 生成提交訊息
```

### Step 10: 更新開發日誌

```yaml
# 更新 status 為 completed
status: completed

metrics:
  total_time: 180  # 3 hours
  ai_percentage: 65
  human_percentage: 35
  lines_of_code: 120
  test_coverage: 87

deliverables:
  - type: component
    files: 
      - src/components/features/UserPreferences.tsx
      - __tests__/features/UserPreferences.test.tsx
  - type: page
    files:
      - src/app/settings/page.tsx
  - type: i18n
    files:
      - public/locales/*/common.json
```

## 📊 開發總結

### 時間分配
- 分析需求: 20 分鐘
- 寫測試: 40 分鐘
- 實作功能: 60 分鐘
- 整合測試: 30 分鐘
- 處理變更: 30 分鐘

### 學到的經驗
1. TDD 確實能幫助設計更好的 API
2. 先定義好 TypeScript 類型能減少錯誤
3. 及時處理需求變更比累積後處理更有效率

### 相關文檔
- [TDD 指南](../tutorials/tdd-guide.md)
- [前端模式](../tutorials/frontend-patterns.md)
- [變更管理](../decisions/ADR-003-change-management.md)

---

這個範例展示了完整的開發流程，從需求分析到最終提交，包括如何處理需求變更。