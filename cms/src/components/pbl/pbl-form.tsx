'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Languages, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface PBLFormProps {
  content: any
  onChange: (content: any) => void
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'zh', name: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
]

export function PBLForm({ content, onChange }: PBLFormProps) {
  const [activeTab, setActiveTab] = useState('basic')
  const [activeLang, setActiveLang] = useState('en')
  const [translating, setTranslating] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<string[]>([])
  
  // 確保 content 有正確的結構
  const scenarioData = content.scenario_info || content

  const updateField = (field: string, value: any) => {
    // 特殊處理 ksa_mapping 和 tasks - 它們在根層級
    if (field === 'ksa_mapping' || field === 'tasks' || field === 'completion_criteria') {
      onChange({
        ...content,
        [field]: value
      })
    } else if (content.scenario_info) {
      onChange({
        ...content,
        scenario_info: {
          ...content.scenario_info,
          [field]: value
        }
      })
    } else {
      onChange({
        ...content,
        [field]: value
      })
    }
  }

  const updateLocalizedField = (field: string, lang: string, value: string) => {
    const fieldKey = lang === 'en' ? field : `${field}_${lang}`
    updateField(fieldKey, value)
  }

  const getLocalizedValue = (field: string, lang: string) => {
    const fieldKey = lang === 'en' ? field : `${field}_${lang}`
    return scenarioData[fieldKey] || ''
  }

  const addStage = () => {
    const newStage = {
      id: `stage_${Date.now()}`,
      title: 'New Stage',
      description: '',
      duration: 30,
      tasks: []
    }
    updateField('stages', [...(scenarioData.stages || []), newStage])
  }

  const updateStage = (index: number, stage: any) => {
    const stages = [...(scenarioData.stages || [])]
    stages[index] = stage
    updateField('stages', stages)
  }

  const deleteStage = (index: number) => {
    const stages = (scenarioData.stages || []).filter((_: any, i: number) => i !== index)
    updateField('stages', stages)
  }

  const handleTranslateAll = async () => {
    setTranslating(true)
    
    try {
      // 收集需要翻譯的內容
      const fieldsToTranslate = ['title', 'description']
      const sourceTexts: Record<string, string> = {}
      
      // 收集英文版本的文本
      fieldsToTranslate.forEach(field => {
        const value = scenarioData[field]
        if (value) {
          sourceTexts[field] = value
        }
      })
      
      // 收集 prerequisites (數組)
      if (scenarioData.prerequisites && scenarioData.prerequisites.length > 0) {
        sourceTexts.prerequisites = JSON.stringify(scenarioData.prerequisites)
      }
      
      // TODO: 調用翻譯 API
      // const response = await fetch('/api/translate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     texts: sourceTexts,
      //     targetLanguages: LANGUAGES.filter(l => l.code !== 'en').map(l => l.code)
      //   })
      // })
      
      // 模擬翻譯結果
      alert('Translation feature coming soon!\n\nThis will translate:\n- Title\n- Description\n- Prerequisites\n\nTo all 8 other languages automatically.')
      
    } catch (error) {
      console.error('Translation error:', error)
      alert('Translation failed. Please try again.')
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div>
            <Label htmlFor="id">Scenario ID</Label>
            <Input
              id="id"
              value={scenarioData.id || ''}
              onChange={(e) => updateField('id', e.target.value)}
              placeholder="e.g., resume-optimization"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <select
                id="difficulty"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={scenarioData.difficulty || 'intermediate'}
                onChange={(e) => updateField('difficulty', e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={scenarioData.estimated_duration || scenarioData.duration || 60}
                onChange={(e) => updateField('estimated_duration', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={scenarioData.category || ''}
              onChange={(e) => updateField('category', e.target.value)}
              placeholder="e.g., career_development"
            />
          </div>

          <div>
            <Label>Prerequisites</Label>
            <div className="space-y-2">
              {(scenarioData.prerequisites || []).map((prereq: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={prereq}
                    onChange={(e) => {
                      const prerequisites = [...(scenarioData.prerequisites || [])]
                      prerequisites[index] = e.target.value
                      updateField('prerequisites', prerequisites)
                    }}
                    placeholder="e.g., Basic computer skills"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const prerequisites = (scenarioData.prerequisites || []).filter((_: any, i: number) => i !== index)
                      updateField('prerequisites', prerequisites)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateField('prerequisites', [...(scenarioData.prerequisites || []), ''])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Prerequisite
              </Button>
            </div>
          </div>

          <div>
            <Label>Target Domains</Label>
            <div className="space-y-2">
              {(scenarioData.target_domains || []).map((domain: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <select
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2"
                    value={domain}
                    onChange={(e) => {
                      const domains = [...(scenarioData.target_domains || [])]
                      domains[index] = e.target.value
                      updateField('target_domains', domains)
                    }}
                  >
                    <option value="">Select a domain</option>
                    <option value="engaging_with_ai">Engaging with AI</option>
                    <option value="creating_with_ai">Creating with AI</option>
                    <option value="managing_with_ai">Managing with AI</option>
                    <option value="designing_with_ai">Designing with AI</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const domains = (scenarioData.target_domains || []).filter((_: any, i: number) => i !== index)
                      updateField('target_domains', domains)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateField('target_domains', [...(scenarioData.target_domains || []), ''])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Domain
              </Button>
            </div>
          </div>
          
          <div className="mt-6">
            <Label>KSA Mapping</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Map the Knowledge, Skills, and Attitudes for this scenario
            </p>
            
            <div className="space-y-4">
              <div>
                <Label>Knowledge</Label>
                <Input
                  value={(content.ksa_mapping?.knowledge || []).join(', ')}
                  onChange={(e) => {
                    const ksa = content.ksa_mapping || {}
                    updateField('ksa_mapping', {
                      ...ksa,
                      knowledge: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })
                  }}
                  placeholder="e.g., K1.1, K1.2, K2.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Understanding AI capabilities, limitations, and evaluation
                </p>
              </div>
              
              <div>
                <Label>Skills</Label>
                <Input
                  value={(content.ksa_mapping?.skills || []).join(', ')}
                  onChange={(e) => {
                    const ksa = content.ksa_mapping || {}
                    updateField('ksa_mapping', {
                      ...ksa,
                      skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })
                  }}
                  placeholder="e.g., S1.1, S1.2, S2.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  AI interaction, prompting, content creation
                </p>
              </div>
              
              <div>
                <Label>Attitudes</Label>
                <Input
                  value={(content.ksa_mapping?.attitudes || []).join(', ')}
                  onChange={(e) => {
                    const ksa = content.ksa_mapping || {}
                    updateField('ksa_mapping', {
                      ...ksa,
                      attitudes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })
                  }}
                  placeholder="e.g., A1.1, A1.2, A2.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Curiosity, critical thinking, responsible use
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Language</Label>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
                onClick={handleTranslateAll}
                disabled={translating}
              >
                <Languages className="h-4 w-4" />
                {translating ? 'Translating...' : 'Translate All'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <Button
                  key={lang.code}
                  variant={activeLang === lang.code ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveLang(lang.code)}
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div>
              <Label>Title ({LANGUAGES.find(l => l.code === activeLang)?.name})</Label>
              <Input
                value={getLocalizedValue('title', activeLang)}
                onChange={(e) => updateLocalizedField('title', activeLang, e.target.value)}
                placeholder="Enter title in selected language"
              />
            </div>

            <div>
              <Label>Description ({LANGUAGES.find(l => l.code === activeLang)?.name})</Label>
              <Textarea
                value={getLocalizedValue('description', activeLang)}
                onChange={(e) => updateLocalizedField('description', activeLang, e.target.value)}
                placeholder="Enter description in selected language"
                rows={4}
              />
            </div>

            <div>
              <Label>Prerequisites ({LANGUAGES.find(l => l.code === activeLang)?.name})</Label>
              <div className="space-y-2">
                {(getLocalizedValue('prerequisites', activeLang) || []).map((prereq: string, index: number) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={prereq}
                      onChange={(e) => {
                        const fieldKey = activeLang === 'en' ? 'prerequisites' : `prerequisites_${activeLang}`
                        const prerequisites = [...(scenarioData[fieldKey] || [])]
                        prerequisites[index] = e.target.value
                        updateField(fieldKey, prerequisites)
                      }}
                      placeholder="Enter prerequisite in selected language"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const fieldKey = activeLang === 'en' ? 'prerequisites' : `prerequisites_${activeLang}`
                        const prerequisites = (scenarioData[fieldKey] || []).filter((_: any, i: number) => i !== index)
                        updateField(fieldKey, prerequisites)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fieldKey = activeLang === 'en' ? 'prerequisites' : `prerequisites_${activeLang}`
                    updateField(fieldKey, [...(scenarioData[fieldKey] || []), ''])
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Prerequisite
                </Button>
              </div>
            </div>
          </div>

        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label>Tasks</Label>
                <p className="text-sm text-muted-foreground">
                  Define the tasks for this scenario
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newTask = {
                    id: `task-${(scenarioData.tasks?.length || 0) + 1}`,
                    title: 'New Task',
                    description: '',
                    category: 'research',
                    time_limit: 20,
                    instructions: [],
                    expected_outcome: '',
                    assessment_focus: { primary: [], secondary: [] }
                  }
                  updateField('tasks', [...(scenarioData.tasks || []), newTask])
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
            
            <div className="space-y-3">
              {(scenarioData.tasks || []).map((task: any, index: number) => {
                const taskId = task.id || `task-${index}`
                const isExpanded = expandedTasks.includes(taskId)
                
                return (
                  <Collapsible
                    key={taskId}
                    open={isExpanded}
                    onOpenChange={(open) => {
                      setExpandedTasks(prev => 
                        open 
                          ? [...prev, taskId]
                          : prev.filter(id => id !== taskId)
                      )
                    }}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                          <div className="text-left">
                            <h3 className="font-semibold">
                              Task {index + 1}: {task.title || 'Untitled'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {task.description || 'No description'} • {task.time_limit || 20} minutes
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            const tasks = (scenarioData.tasks || []).filter((_: any, i: number) => i !== index)
                            updateField('tasks', tasks)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="px-4 pb-4">
                  
                  <Tabs defaultValue="task-basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="task-basic">Basic</TabsTrigger>
                      <TabsTrigger value="task-content">Content</TabsTrigger>
                      <TabsTrigger value="task-ai">AI Module</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="task-basic" className="space-y-3 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Task ID</Label>
                          <Input
                            value={task.id || ''}
                            onChange={(e) => {
                              const tasks = [...(scenarioData.tasks || [])]
                              tasks[index] = { ...task, id: e.target.value }
                              updateField('tasks', tasks)
                            }}
                            placeholder="e.g., task-1"
                          />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2"
                            value={task.category || 'research'}
                            onChange={(e) => {
                              const tasks = [...(scenarioData.tasks || [])]
                              tasks[index] = { ...task, category: e.target.value }
                              updateField('tasks', tasks)
                            }}
                          >
                            <option value="research">Research</option>
                            <option value="analysis">Analysis</option>
                            <option value="creation">Creation</option>
                            <option value="interaction">Interaction</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Time Limit (minutes)</Label>
                        <Input
                          type="number"
                          value={task.time_limit || 20}
                          onChange={(e) => {
                            const tasks = [...(scenarioData.tasks || [])]
                            tasks[index] = { ...task, time_limit: parseInt(e.target.value) || 20 }
                            updateField('tasks', tasks)
                          }}
                        />
                      </div>
                      
                      <div>
                        <Label>Assessment Focus</Label>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-sm">Primary</Label>
                            <Input
                              value={(task.assessment_focus?.primary || []).join(', ')}
                              onChange={(e) => {
                                const tasks = [...(scenarioData.tasks || [])]
                                tasks[index] = {
                                  ...task,
                                  assessment_focus: {
                                    ...task.assessment_focus,
                                    primary: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                  }
                                }
                                updateField('tasks', tasks)
                              }}
                              placeholder="e.g., K1.1, S1.1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Secondary</Label>
                            <Input
                              value={(task.assessment_focus?.secondary || []).join(', ')}
                              onChange={(e) => {
                                const tasks = [...(scenarioData.tasks || [])]
                                tasks[index] = {
                                  ...task,
                                  assessment_focus: {
                                    ...task.assessment_focus,
                                    secondary: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                  }
                                }
                                updateField('tasks', tasks)
                              }}
                              placeholder="e.g., A1.1"
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="task-content" className="space-y-3 mt-4">
                      <div className="mb-4">
                        <Label>Language</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {LANGUAGES.map((lang) => (
                            <Button
                              key={lang.code}
                              variant={activeLang === lang.code ? 'default' : 'outline'}
                              size="sm"
                              type="button"
                              onClick={() => setActiveLang(lang.code)}
                            >
                              <span className="mr-2">{lang.flag}</span>
                              {lang.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label>Title ({LANGUAGES.find(l => l.code === activeLang)?.name})</Label>
                        <Input
                          value={task[activeLang === 'en' ? 'title' : `title_${activeLang}`] || ''}
                          onChange={(e) => {
                            const tasks = [...(scenarioData.tasks || [])]
                            const fieldKey = activeLang === 'en' ? 'title' : `title_${activeLang}`
                            tasks[index] = { ...task, [fieldKey]: e.target.value }
                            updateField('tasks', tasks)
                          }}
                          placeholder="Enter task title"
                        />
                      </div>
                      
                      <div>
                        <Label>Description ({LANGUAGES.find(l => l.code === activeLang)?.name})</Label>
                        <Textarea
                          value={task[activeLang === 'en' ? 'description' : `description_${activeLang}`] || ''}
                          onChange={(e) => {
                            const tasks = [...(scenarioData.tasks || [])]
                            const fieldKey = activeLang === 'en' ? 'description' : `description_${activeLang}`
                            tasks[index] = { ...task, [fieldKey]: e.target.value }
                            updateField('tasks', tasks)
                          }}
                          placeholder="Enter task description"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label>Instructions ({LANGUAGES.find(l => l.code === activeLang)?.name})</Label>
                        <div className="space-y-2">
                          {(task[activeLang === 'en' ? 'instructions' : `instructions_${activeLang}`] || []).map((instruction: string, instrIndex: number) => (
                            <div key={instrIndex} className="flex gap-2">
                              <Input
                                value={instruction}
                                onChange={(e) => {
                                  const tasks = [...(scenarioData.tasks || [])]
                                  const fieldKey = activeLang === 'en' ? 'instructions' : `instructions_${activeLang}`
                                  const instructions = [...(task[fieldKey] || [])]
                                  instructions[instrIndex] = e.target.value
                                  tasks[index] = { ...task, [fieldKey]: instructions }
                                  updateField('tasks', tasks)
                                }}
                                placeholder="Enter instruction"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() => {
                                  const tasks = [...(scenarioData.tasks || [])]
                                  const fieldKey = activeLang === 'en' ? 'instructions' : `instructions_${activeLang}`
                                  const instructions = (task[fieldKey] || []).filter((_: any, i: number) => i !== instrIndex)
                                  tasks[index] = { ...task, [fieldKey]: instructions }
                                  updateField('tasks', tasks)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => {
                              const tasks = [...(scenarioData.tasks || [])]
                              const fieldKey = activeLang === 'en' ? 'instructions' : `instructions_${activeLang}`
                              tasks[index] = { ...task, [fieldKey]: [...(task[fieldKey] || []), ''] }
                              updateField('tasks', tasks)
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Instruction
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Expected Outcome ({LANGUAGES.find(l => l.code === activeLang)?.name})</Label>
                        <Input
                          value={task[activeLang === 'en' ? 'expected_outcome' : `expected_outcome_${activeLang}`] || ''}
                          onChange={(e) => {
                            const tasks = [...(scenarioData.tasks || [])]
                            const fieldKey = activeLang === 'en' ? 'expected_outcome' : `expected_outcome_${activeLang}`
                            tasks[index] = { ...task, [fieldKey]: e.target.value }
                            updateField('tasks', tasks)
                          }}
                          placeholder="Enter expected outcome"
                        />
                      </div>
                      
                      <div>
                        <Label>Resources ({LANGUAGES.find(l => l.code === activeLang)?.name})</Label>
                        <div className="space-y-2">
                          {(task[activeLang === 'en' ? 'resources' : `resources_${activeLang}`] || []).map((resource: string, resIndex: number) => (
                            <div key={resIndex} className="flex gap-2">
                              <Input
                                value={resource}
                                onChange={(e) => {
                                  const tasks = [...(scenarioData.tasks || [])]
                                  const fieldKey = activeLang === 'en' ? 'resources' : `resources_${activeLang}`
                                  const resources = [...(task[fieldKey] || [])]
                                  resources[resIndex] = e.target.value
                                  tasks[index] = { ...task, [fieldKey]: resources }
                                  updateField('tasks', tasks)
                                }}
                                placeholder="Enter resource"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() => {
                                  const tasks = [...(scenarioData.tasks || [])]
                                  const fieldKey = activeLang === 'en' ? 'resources' : `resources_${activeLang}`
                                  const resources = (task[fieldKey] || []).filter((_: any, i: number) => i !== resIndex)
                                  tasks[index] = { ...task, [fieldKey]: resources }
                                  updateField('tasks', tasks)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => {
                              const tasks = [...(scenarioData.tasks || [])]
                              const fieldKey = activeLang === 'en' ? 'resources' : `resources_${activeLang}`
                              tasks[index] = { ...task, [fieldKey]: [...(task[fieldKey] || []), ''] }
                              updateField('tasks', tasks)
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Resource
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="task-ai" className="space-y-3 mt-4">
                      <div>
                        <Label>AI Module Settings</Label>
                        <div className="space-y-3 mt-2">
                          <div>
                            <Label>Role</Label>
                            <select
                              className="w-full rounded-md border border-input bg-background px-3 py-2"
                              value={task.ai_module?.role || 'assistant'}
                              onChange={(e) => {
                                const tasks = [...(scenarioData.tasks || [])]
                                tasks[index] = {
                                  ...task,
                                  ai_module: { ...task.ai_module, role: e.target.value }
                                }
                                updateField('tasks', tasks)
                              }}
                            >
                              <option value="assistant">Assistant</option>
                              <option value="evaluator">Evaluator</option>
                              <option value="actor">Actor</option>
                            </select>
                          </div>
                          
                          <div>
                            <Label>Model</Label>
                            <Input
                              value={task.ai_module?.model || 'gemini-2.5-flash'}
                              onChange={(e) => {
                                const tasks = [...(scenarioData.tasks || [])]
                                tasks[index] = {
                                  ...task,
                                  ai_module: { ...task.ai_module, model: e.target.value }
                                }
                                updateField('tasks', tasks)
                              }}
                              placeholder="e.g., gemini-2.5-flash"
                            />
                          </div>
                          
                          <div>
                            <Label>Persona</Label>
                            <Input
                              value={task.ai_module?.persona || ''}
                              onChange={(e) => {
                                const tasks = [...(scenarioData.tasks || [])]
                                tasks[index] = {
                                  ...task,
                                  ai_module: { ...task.ai_module, persona: e.target.value }
                                }
                                updateField('tasks', tasks)
                              }}
                              placeholder="e.g., Career Research Assistant"
                            />
                          </div>
                          
                          <div>
                            <Label>Initial Prompt</Label>
                            <Textarea
                              value={task.ai_module?.initial_prompt || ''}
                              onChange={(e) => {
                                const tasks = [...(scenarioData.tasks || [])]
                                tasks[index] = {
                                  ...task,
                                  ai_module: { ...task.ai_module, initial_prompt: e.target.value }
                                }
                                updateField('tasks', tasks)
                              }}
                              placeholder="Enter the initial prompt for the AI module"
                              rows={6}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="evaluation" className="space-y-4">
          <div>
            <Label>Learning Objectives</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Define the learning objectives for this scenario
            </p>
            
            <div className="space-y-2">
              {(scenarioData.learning_objectives || []).map((objective: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={objective}
                    onChange={(e) => {
                      const objectives = [...(scenarioData.learning_objectives || [])]
                      objectives[index] = e.target.value
                      updateField('learning_objectives', objectives)
                    }}
                    placeholder="e.g., Master AI-powered job market research techniques"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const objectives = (scenarioData.learning_objectives || []).filter((_: any, i: number) => i !== index)
                      updateField('learning_objectives', objectives)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateField('learning_objectives', [...(scenarioData.learning_objectives || []), ''])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Learning Objective
              </Button>
            </div>
          </div>
          
          <div className="mt-6">
            <Label>Multi-language Learning Objectives</Label>
            <p className="text-sm text-muted-foreground mb-4">
              You can also edit learning objectives in different languages in the Content tab
            </p>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                This scenario includes learning objectives in 9 languages. 
                Use the Content tab to edit language-specific versions.
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <Label>Completion Criteria</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Define the criteria for successfully completing this scenario
            </p>
            
            <div className="space-y-4">
              <div>
                <Label>Minimum Tasks Completed</Label>
                <Input
                  type="number"
                  value={scenarioData.completion_criteria?.min_tasks_completed || 4}
                  onChange={(e) => {
                    const criteria = scenarioData.completion_criteria || {}
                    updateField('completion_criteria', {
                      ...criteria,
                      min_tasks_completed: parseInt(e.target.value) || 0
                    })
                  }}
                  min="1"
                  max={scenarioData.tasks?.length || 5}
                />
              </div>
              
              <div>
                <Label>Required Competencies</Label>
                <Input
                  value={(scenarioData.completion_criteria?.required_competencies || []).join(', ')}
                  onChange={(e) => {
                    const criteria = scenarioData.completion_criteria || {}
                    updateField('completion_criteria', {
                      ...criteria,
                      required_competencies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })
                  }}
                  placeholder="e.g., K1.1, S1.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must demonstrate these competencies to complete the scenario
                </p>
              </div>
              
              <div>
                <Label>Minimum Overall Score (%)</Label>
                <Input
                  type="number"
                  value={scenarioData.completion_criteria?.min_overall_score || 70}
                  onChange={(e) => {
                    const criteria = scenarioData.completion_criteria || {}
                    updateField('completion_criteria', {
                      ...criteria,
                      min_overall_score: parseInt(e.target.value) || 0
                    })
                  }}
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}