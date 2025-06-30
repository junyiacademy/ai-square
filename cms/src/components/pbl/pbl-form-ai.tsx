'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Send, Sparkles, AlertCircle, Check } from 'lucide-react'
import * as yaml from 'js-yaml'

// 動態載入 Monaco Editor 避免 SSR 問題
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface PBLFormAIProps {
  content: any
  onChange: (content: any) => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  yamlChanges?: {
    before: string
    after: string
  }
}

interface YAMLDiff {
  path: string
  type: 'added' | 'removed' | 'modified'
  oldValue?: any
  newValue?: any
}

export function PBLFormAI({ content, onChange }: PBLFormAIProps) {
  const [yamlContent, setYamlContent] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showDiff, setShowDiff] = useState(false)
  const [yamlHistory, setYamlHistory] = useState<string[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null)

  // 初始化 YAML 內容
  useEffect(() => {
    try {
      const yamlStr = yaml.dump(content, {
        noRefs: true,
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: false
      })
      setYamlContent(yamlStr)
      setYamlHistory([yamlStr])
      
      // 初始化聊天訊息
      setChatMessages([{
        id: '1',
        role: 'assistant',
        content: `您好！我是您的 PBL 情境編輯助手。我可以幫助您：

• 🎯 填寫缺失的欄位
• 🌐 自動翻譯成 9 種語言
• ✨ 優化內容描述
• 📝 確保符合 YAML 規範

請告訴我您想要做什麼？例如：
- "幫我填寫情境標題和描述"
- "將所有內容翻譯成其他語言"
- "幫我設計 3 個學習任務"`,
        timestamp: new Date()
      }])
    } catch (error) {
      console.error('YAML initialization error:', error)
    }
  }, [content])

  // 驗證 YAML
  const validateYAML = (yamlStr: string): string[] => {
    const errors: string[] = []
    
    try {
      const parsed = yaml.load(yamlStr) as any
      
      // 檢查必要欄位
      if (!parsed.scenario_info?.id) {
        errors.push('缺少 scenario_info.id')
      }
      if (!parsed.scenario_info?.title) {
        errors.push('缺少 scenario_info.title (英文版)')
      }
      if (!parsed.scenario_info?.difficulty) {
        errors.push('缺少 scenario_info.difficulty')
      }
      if (!parsed.ksa_mapping) {
        errors.push('缺少 ksa_mapping 區塊')
      }
      if (!parsed.tasks || parsed.tasks.length === 0) {
        errors.push('至少需要一個 task')
      }
      
    } catch (error) {
      errors.push(`YAML 格式錯誤: ${error}`)
    }
    
    return errors
  }

  // 處理 YAML 編輯器變更
  const handleYAMLChange = (value: string | undefined) => {
    if (value !== undefined) {
      setYamlContent(value)
      
      // 即時驗證
      const errors = validateYAML(value)
      setValidationErrors(errors)
      
      // 如果沒有錯誤，更新 content
      if (errors.length === 0) {
        try {
          const parsed = yaml.load(value)
          onChange(parsed)
        } catch (error) {
          console.error('YAML parse error:', error)
        }
      }
    }
  }

  // 發送訊息給 AI
  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setUserInput('')
    setIsLoading(true)

    try {
      // 呼叫 AI API
      const response = await fetch('/api/pbl/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentYaml: yamlContent,
          userRequest: userInput,
          validationErrors
        })
      })

      if (!response.ok) throw new Error('AI request failed')

      const data = await response.json()
      
      // 處理 AI 回應
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.explanation,
        timestamp: new Date(),
        yamlChanges: data.updatedYaml ? {
          before: yamlContent,
          after: data.updatedYaml
        } : undefined
      }

      setChatMessages(prev => [...prev, aiMessage])

      // 如果有更新的 YAML，應用變更
      if (data.updatedYaml) {
        setYamlContent(data.updatedYaml)
        setYamlHistory(prev => [...prev, data.updatedYaml])
        handleYAMLChange(data.updatedYaml)
        setShowDiff(true)
      }

    } catch (error) {
      console.error('AI assist error:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，處理您的請求時發生錯誤。請稍後再試。',
        timestamp: new Date()
      }
      
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // 自動捲動到最新訊息
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [chatMessages])

  // 渲染 YAML 差異
  const renderYAMLDiff = (before: string, after: string) => {
    const beforeLines = before.split('\n')
    const afterLines = after.split('\n')
    
    return (
      <div className="space-y-1 font-mono text-xs bg-muted p-4 rounded-lg overflow-x-auto">
        {afterLines.map((line, index) => {
          const beforeLine = beforeLines[index]
          
          if (!beforeLine) {
            // 新增的行
            return (
              <div key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded">
                + {line}
              </div>
            )
          } else if (line !== beforeLine) {
            // 修改的行
            return (
              <div key={index}>
                <div className="bg-red-100 text-red-800 px-2 py-1 rounded line-through">
                  - {beforeLine}
                </div>
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded mt-1">
                  + {line}
                </div>
              </div>
            )
          } else {
            // 未變更的行
            return (
              <div key={index} className="text-muted-foreground px-2 py-1">
                  {line}
              </div>
            )
          }
        })}
        
        {/* 處理被刪除的行 */}
        {beforeLines.length > afterLines.length && 
          beforeLines.slice(afterLines.length).map((line, index) => (
            <div key={`deleted-${index}`} className="bg-red-100 text-red-800 px-2 py-1 rounded line-through">
              - {line}
            </div>
          ))
        }
      </div>
    )
  }

  return (
    <div className="flex h-[800px] gap-4">
      {/* 左側：YAML 編輯器 */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">YAML 編輯器</h3>
          {validationErrors.length > 0 ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{validationErrors.length} 個錯誤</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm">格式正確</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 border rounded-lg overflow-hidden">
          <MonacoEditor
            height="100%"
            language="yaml"
            theme="vs-light"
            value={yamlContent}
            onChange={handleYAMLChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              folding: true,
              glyphMargin: true,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 3
            }}
            onMount={(editor) => {
              editorRef.current = editor
            }}
          />
        </div>
        
        {/* 驗證錯誤列表 */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-4 border border-destructive/20 bg-destructive/10 rounded-lg">
            <p className="text-sm font-medium text-destructive mb-2">驗證錯誤：</p>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm text-destructive">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 右側：AI 助手聊天介面 */}
      <div className="w-[500px] flex flex-col border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI 編輯助手
          </h3>
        </div>
        
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* 顯示 YAML 變更 */}
                  {message.yamlChanges && showDiff && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium">YAML 變更：</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowDiff(!showDiff)}
                        >
                          {showDiff ? '隱藏' : '顯示'}
                        </Button>
                      </div>
                      {renderYAMLDiff(message.yamlChanges.before, message.yamlChanges.after)}
                    </div>
                  )}
                  
                  <p className="text-xs mt-2 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* 輸入區域 */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="輸入您的需求... (例如：幫我翻譯標題)"
              className="flex-1 min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !userInput.trim()}
              size="icon"
              className="self-end"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="mt-2 flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUserInput('幫我將標題和描述翻譯成所有語言')}
              className="text-xs"
            >
              翻譯全部
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUserInput('幫我檢查並填寫缺少的必要欄位')}
              className="text-xs"
            >
              填寫缺失
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUserInput('幫我設計3個學習任務')}
              className="text-xs"
            >
              生成任務
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUserInput('優化情境描述，讓它更吸引人')}
              className="text-xs"
            >
              優化內容
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}