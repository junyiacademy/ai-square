# Frontend 實作指南 - AI Square

## 🏗️ 技術架構

### 核心技術棧
```
Next.js 15 (App Router)
├── React 19 (Client Components)
├── TypeScript 5 (Type Safety)
├── Tailwind CSS 4 (Styling)
├── react-i18next (Internationalization)
└── js-yaml (YAML Processing)
```

### 專案結構
```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root Layout
│   │   ├── page.tsx           # Home Page
│   │   ├── relations/         # AI Literacy Page
│   │   │   └── page.tsx
│   │   └── api/               # API Routes
│   │       └── relations/
│   │           └── route.ts
│   ├── components/            # Reusable Components
│   │   ├── ui/               # Base UI Components
│   │   ├── features/         # Feature Components
│   │   └── layouts/          # Layout Components
│   ├── lib/                  # Utility Libraries
│   │   ├── utils.ts         # Helper Functions
│   │   ├── constants.ts     # App Constants
│   │   └── types.ts         # Type Definitions
│   ├── hooks/               # Custom React Hooks
│   ├── stores/              # State Management
│   └── i18n.ts             # Internationalization Config
├── public/
│   ├── locales/            # Translation Files
│   │   ├── en/relations.json
│   │   ├── zh-TW/relations.json
│   │   └── ...
│   └── rubrics_data/       # YAML Data Files
│       ├── ai_lit_domains.yaml
│       └── ksa_codes.yaml
└── package.json
```

## 🎨 設計系統

### Tailwind CSS 配置
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      }
    },
  },
  plugins: [],
}
```

### 組件設計原則
```typescript
// 基礎組件範例
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  ...props 
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-lg transition-colors'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </button>
  )
}
```

## 🌍 國際化系統

### react-i18next 配置
```typescript
// src/i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// 動態載入翻譯資源
const getDefaultLng = (): string => {
  if (typeof window !== 'undefined') {
    const savedLang = localStorage.getItem('ai-square-language')
    if (savedLang) return savedLang
    
    const browserLang = navigator.language.toLowerCase()
    const supportedLangs = ['en', 'zh-tw', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it']
    
    for (const lang of supportedLangs) {
      if (browserLang.startsWith(lang.replace('-', ''))) {
        return lang === 'zh-tw' ? 'zh-TW' : lang
      }
    }
  }
  return 'en'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('../public/locales/en/relations.json') },
      'zh-TW': { translation: require('../public/locales/zh-TW/relations.json') },
      // ... 其他語言
    },
    lng: getDefaultLng(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  })

export default i18n
```

### 多語言組件實作
```typescript
// components/LanguageSelector.tsx
'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'es', name: 'Español' },
  // ... 其他語言
]

export function LanguageSelector() {
  const { i18n } = useTranslation()
  const [currentLang, setCurrentLang] = useState(i18n.language)
  
  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
    setCurrentLang(langCode)
    
    // 持久化語言偏好
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-square-language', langCode)
    }
  }
  
  return (
    <select
      value={currentLang}
      onChange={(e) => handleLanguageChange(e.target.value)}
      className="border rounded px-3 py-1"
    >
      {languages.map(({ code, name }) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  )
}
```

## 📊 狀態管理

### React State 策略
```typescript
// 簡單狀態：useState
function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  // ...
}

// 複雜狀態：useReducer
type State = {
  loading: boolean
  data: AILiteracyData | null
  error: string | null
}

type Action = 
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: AILiteracyData }
  | { type: 'ERROR'; payload: string }

function dataReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null }
    case 'SUCCESS':
      return { ...state, loading: false, data: action.payload }
    case 'ERROR':
      return { ...state, loading: false, error: action.payload }
    default:
      return state
  }
}

// 全域狀態：Context + useReducer
const AILiteracyContext = createContext<{
  state: State
  dispatch: Dispatch<Action>
} | null>(null)
```

### 自訂 Hooks
```typescript
// hooks/useAILiteracy.ts
export function useAILiteracy(language: string) {
  const [state, dispatch] = useReducer(dataReducer, {
    loading: false,
    data: null,
    error: null
  })
  
  const fetchData = useCallback(async () => {
    dispatch({ type: 'LOADING' })
    
    try {
      const response = await fetch(`/api/relations?lang=${language}`)
      const data = await response.json()
      dispatch({ type: 'SUCCESS', payload: data })
    } catch (error) {
      dispatch({ type: 'ERROR', payload: error.message })
    }
  }, [language])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  return { ...state, refetch: fetchData }
}

// hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error('Error reading localStorage:', error)
      return initialValue
    }
  })
  
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error('Error setting localStorage:', error)
    }
  }
  
  return [storedValue, setValue] as const
}
```

## 🎯 組件架構模式

### 組件分層
```typescript
// 1. 基礎 UI 組件 (components/ui/)
export function Card({ children, className, ...props }) {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`} {...props}>
      {children}
    </div>
  )
}

// 2. 功能組件 (components/features/)
export function DomainCard({ domain, onExpand }) {
  const { t } = useTranslation()
  
  return (
    <Card className="cursor-pointer" onClick={() => onExpand(domain.id)}>
      <div className="flex items-center p-4">
        <span className="text-2xl mr-3">{domain.emoji}</span>
        <h3 className="text-xl font-bold text-blue-800">
          {t(domain.key)}
        </h3>
      </div>
    </Card>
  )
}

// 3. 頁面組件 (app/*/page.tsx)
export default function RelationsPage() {
  const { data, loading, error } = useAILiteracy('zh-TW')
  
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return (
    <div className="container mx-auto p-8">
      <Header />
      <DomainsList domains={data.domains} />
    </div>
  )
}
```

### 條件渲染模式
```typescript
// 早期返回模式
function CompetencyCard({ competency }) {
  if (!competency) return null
  
  return (
    <div className="competency-card">
      {/* 組件內容 */}
    </div>
  )
}

// 邏輯運算子模式
function KSASection({ ksa, isVisible }) {
  return (
    <div>
      {isVisible && (
        <div className="ksa-details">
          {ksa.map(item => <KSAItem key={item.id} item={item} />)}
        </div>
      )}
    </div>
  )
}

// 三元運算子模式
function LoadingState({ loading, children }) {
  return loading ? <Spinner /> : children
}
```

## 🚀 效能最佳化

### 程式碼分割
```typescript
// 動態導入
const LazyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false // 如果需要客戶端專用
})

// 路由層級分割
// Next.js 自動處理頁面層級的程式碼分割
```

### React 效能優化
```typescript
// memo 化組件
const ExpensiveComponent = memo(({ data, onUpdate }) => {
  // 只在 data 或 onUpdate 改變時重新渲染
  return <div>{/* 複雜渲染邏輯 */}</div>
})

// useCallback 快取函數
function ParentComponent() {
  const [count, setCount] = useState(0)
  
  // 沒有依賴，函數只建立一次
  const handleClick = useCallback(() => {
    setCount(c => c + 1)
  }, [])
  
  return <ChildComponent onClick={handleClick} />
}

// useMemo 快取計算
function DataVisualization({ rawData }) {
  const processedData = useMemo(() => {
    return rawData.map(item => ({
      ...item,
      computed: expensiveCalculation(item)
    }))
  }, [rawData])
  
  return <Chart data={processedData} />
}
```

### 圖片最佳化
```typescript
// Next.js Image 組件
import Image from 'next/image'

function DomainImage({ domain }) {
  return (
    <Image
      src={`/images/${domain.key}.png`}
      alt={domain.name}
      width={400}
      height={240}
      className="rounded-xl"
      sizes="(max-width: 768px) 100vw, 224px"
      priority={domain.key === 'Engaging_with_AI'} // LCP 優化
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
    />
  )
}
```

## 🔧 開發工具配置

### TypeScript 配置
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### ESLint 配置
```javascript
// eslint.config.mjs
import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'error'
    }
  }
]

export default eslintConfig
```

## 📱 響應式設計

### Tailwind 斷點策略
```typescript
// 手機優先設計
function ResponsiveLayout({ children }) {
  return (
    <div className="
      px-4          // 手機：16px padding
      sm:px-6       // 小平板：24px
      md:px-8       // 平板：32px  
      lg:px-12      // 桌面：48px
      xl:px-16      // 大桌面：64px
      max-w-7xl     // 最大寬度限制
      mx-auto       // 水平置中
    ">
      {children}
    </div>
  )
}

// 條件式組件渲染
function AdaptiveKSADisplay({ ksaData }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  return isMobile ? (
    <KSAOverlay data={ksaData} />
  ) : (
    <KSASidebar data={ksaData} />
  )
}
```

### 自訂 Hook：媒體查詢
```typescript
// hooks/useMediaQuery.ts
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    
    const listener = () => setMatches(media.matches)
    media.addListener(listener)
    
    return () => media.removeListener(listener)
  }, [query])
  
  return matches
}
```

## 🛠️ 開發最佳實踐

### 檔案命名規範
```
組件檔案：PascalCase.tsx
Hook 檔案：use*.ts
工具檔案：camelCase.ts
常數檔案：UPPER_SNAKE_CASE.ts
類型檔案：*.types.ts
```

### Git Commit 規範
```
feat: 新增 Google 登入功能
fix: 修正語言切換時的記憶體洩漏
docs: 更新 API 文檔
style: 調整按鈕間距
refactor: 重構 KSA 卡片組件
test: 新增多語言測試案例
chore: 更新相依套件版本
```

### 錯誤處理策略
```typescript
// 錯誤邊界組件
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // 發送錯誤報告到監控服務
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    
    return this.props.children
  }
}

// API 錯誤處理
async function fetchWithErrorHandling<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('網路連線問題，請檢查網路狀態')
    }
    throw error
  }
}
```

---

> **開發原則**: 型別安全、效能優先、用戶體驗為王、可維護性至上