# 前端開發模式指南

本指南提供 AI Square 前端開發的核心模式和最佳實踐。

## 📁 專案結構

```
frontend/src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root Layout
│   ├── page.tsx           # Home Page
│   ├── [route]/           # 路由頁面
│   └── api/               # API Routes
├── components/            
│   ├── ui/               # 基礎組件
│   ├── features/         # 功能組件
│   └── layouts/          # 佈局組件
├── lib/                  # 工具函數
├── hooks/                # 自訂 Hooks
├── stores/               # 狀態管理
└── types/                # TypeScript 類型
```

## 🎨 組件設計模式

### 基礎 UI 組件
```typescript
// components/ui/Button.tsx
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

### 功能組件模式
```typescript
// components/features/DomainCard.tsx
interface DomainCardProps {
  domain: Domain
  onExpand: (id: string) => void
}

export function DomainCard({ domain, onExpand }: DomainCardProps) {
  const { t } = useTranslation()
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow" 
      onClick={() => onExpand(domain.id)}
    >
      <CardHeader>
        <span className="text-2xl">{domain.emoji}</span>
        <h3 className="text-xl font-bold">{t(domain.key)}</h3>
      </CardHeader>
      <CardBody>
        <p className="text-gray-600">{t(domain.description)}</p>
      </CardBody>
    </Card>
  )
}
```

## 🔄 狀態管理模式

### Local State (useState)
```typescript
function ToggleButton() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <button onClick={() => setIsOpen(!isOpen)}>
      {isOpen ? 'Close' : 'Open'}
    </button>
  )
}
```

### Complex State (useReducer)
```typescript
type State = {
  loading: boolean
  data: Data | null
  error: string | null
}

type Action = 
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Data }
  | { type: 'FETCH_ERROR'; payload: string }

function dataReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return { loading: false, data: action.payload, error: null }
    case 'FETCH_ERROR':
      return { loading: false, data: null, error: action.payload }
    default:
      return state
  }
}
```

### Global State (Context)
```typescript
// contexts/AuthContext.tsx
const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  
  const login = useCallback(async (credentials: Credentials) => {
    const user = await authService.login(credentials)
    setUser(user)
  }, [])
  
  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

## 🎣 自訂 Hooks

### useLocalStorage
```typescript
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
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
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }
  
  return [storedValue, setValue] as const
}
```

### useMediaQuery
```typescript
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }
    
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])
  
  return matches
}
```

### useDebounce
```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}
```

## 🚀 效能優化

### Memoization
```typescript
// Memoize expensive components
const ExpensiveList = memo(({ items }: { items: Item[] }) => {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
})

// Memoize callbacks
function SearchBox({ onSearch }: { onSearch: (term: string) => void }) {
  const [term, setTerm] = useState('')
  
  const handleSearch = useCallback(() => {
    onSearch(term)
  }, [term, onSearch])
  
  return (
    <div>
      <input value={term} onChange={e => setTerm(e.target.value)} />
      <button onClick={handleSearch}>Search</button>
    </div>
  )
}

// Memoize computations
function DataTable({ data }: { data: RawData[] }) {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      computed: expensiveCalculation(item)
    }))
  }, [data])
  
  return <Table data={processedData} />
}
```

### Code Splitting
```typescript
// Dynamic imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />,
  ssr: false
})

// Lazy loading with Suspense
const LazyComponent = lazy(() => import('./LazyComponent'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyComponent />
    </Suspense>
  )
}
```

## 🌍 國際化模式

### 語言切換器
```typescript
export function LanguageSelector() {
  const { i18n } = useTranslation()
  const [currentLang, setCurrentLang] = useLocalStorage('language', 'en')
  
  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang)
    setCurrentLang(lang)
  }
  
  return (
    <select value={currentLang} onChange={e => handleChange(e.target.value)}>
      {languages.map(({ code, name }) => (
        <option key={code} value={code}>{name}</option>
      ))}
    </select>
  )
}
```

### 多語言內容
```typescript
// 使用 translation hook
function WelcomeMessage() {
  const { t } = useTranslation()
  return <h1>{t('welcome.title')}</h1>
}

// 動態語言內容
function DynamicContent({ content }: { content: MultiLangContent }) {
  const { i18n } = useTranslation()
  const field = `description_${i18n.language}`
  
  return <p>{content[field] || content.description_en}</p>
}
```

## 📱 響應式設計

### Breakpoint Hooks
```typescript
export function useBreakpoint() {
  const isMobile = useMediaQuery('(max-width: 640px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')
  const isDesktop = useMediaQuery('(min-width: 1025px)')
  
  return { isMobile, isTablet, isDesktop }
}
```

### 響應式組件
```typescript
function ResponsiveNav() {
  const { isMobile } = useBreakpoint()
  
  if (isMobile) {
    return <MobileNav />
  }
  
  return <DesktopNav />
}
```

## 🛡️ 錯誤處理

### Error Boundary
```typescript
class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught:', error, errorInfo)
    // 發送到錯誤監控服務
    errorReportingService.log(error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          retry={() => this.setState({ hasError: false })}
        />
      )
    }
    
    return this.props.children
  }
}
```

### Async Error Handling
```typescript
export async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText)
    }
    
    return await response.json()
  } catch (error) {
    if (error instanceof TypeError) {
      throw new NetworkError('網路連線失敗')
    }
    throw error
  }
}
```

## 🎯 最佳實踐

### 命名規範
- 組件：PascalCase (`UserProfile.tsx`)
- Hooks：camelCase 前綴 use (`useAuth.ts`)
- 工具函數：camelCase (`formatDate.ts`)
- 常數：UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)
- 類型：PascalCase 後綴 Type/Interface (`UserType.ts`)

### 檔案組織
```typescript
// ✅ Good - 相關檔案放在一起
components/
  UserProfile/
    index.tsx
    UserProfile.tsx
    UserProfile.test.tsx
    UserProfile.styles.ts
    
// ❌ Bad - 分散的檔案
components/UserProfile.tsx
tests/UserProfile.test.tsx
styles/UserProfile.styles.ts
```

### TypeScript 使用
```typescript
// ✅ Good - 明確的類型
interface UserProps {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
}

// ❌ Bad - 使用 any
interface UserProps {
  data: any
}
```

---

記住：**保持簡單、保持一致、保持可維護性！**