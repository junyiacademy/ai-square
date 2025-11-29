/**
 * Agent-Powered WYSIWYG Editor - Modern 3-Panel Layout
 * Left: Collapsible Navigation
 * Center: Visual Display/Preview
 * Right: AI Agent Chat for Natural Language Editing
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDraftManager } from '@/hooks/useDraftManager';
import {
  Eye,
  Edit3,
  Upload,
  RotateCcw,
  Clock,
  FileText,
  Plus,
  Trash2,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  MessageSquare,
  Send,
  Bot,
  User,
  Settings,
  Hash,
  Type,
  Calendar,
  Target,
  Sparkles,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TaskTemplate {
  id: string;
  title: Record<string, string>;
  type: string;
  description?: Record<string, string>;
  content?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ScenarioData extends Record<string, unknown> {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  mode: 'pbl' | 'discovery' | 'assessment';
  difficulty: string;
  estimatedMinutes: number;
  taskTemplates: TaskTemplate[];
  objectives?: string[] | Record<string, string[]>;
  prerequisites?: string[];
  xpRewards?: Record<string, number>;
  pblData?: Record<string, unknown>;
  discoveryData?: Record<string, unknown>;
  assessmentData?: Record<string, unknown>;
  resources?: Array<Record<string, unknown>>;
  aiModules?: Record<string, unknown>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface EditPopup {
  field: string;
  x: number;
  y: number;
  value: unknown;
  type: 'text' | 'number' | 'select' | 'multiline';
  options?: string[];
}

export default function AgentEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get('id') || 'new';

  const [language, setLanguage] = useState('zh');
  const [loading, setLoading] = useState(true);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Navigation hierarchy state
  const [selectedMode, setSelectedMode] = useState<'pbl' | 'discovery' | 'assessment' | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(scenarioId !== 'new' ? scenarioId : null);
  const [activeSection, setActiveSection] = useState<string>('basic-info');

  // Scenarios list state
  const [allScenarios, setAllScenarios] = useState<Array<{
    id: string;
    scenario_id: string;
    title: Record<string, string>;
    mode: string;
    difficulty: string;
    estimated_time: number;
  }>>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 嗨！我是你的編輯助手。告訴我你想修改什麼，我會幫你更新場景內容。例如：\n\n• "把標題改成AI基礎課程"\n• "增加一個新任務"\n• "設定難度為簡單"\n• "修改時長為45分鐘"',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Edit popup state
  const [editPopup, setEditPopup] = useState<EditPopup | null>(null);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'scenario-basic': true,
    'scenario-objectives': true,
    'scenario-mode-specific': true,  // 預設展開以顯示模式特定設定
    'scenario-advanced': false
  });
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const {
    draft,
    hasChanges,
    lastSaved,
    isPublishing,
    publishError,
    loadOriginal,
    updateDraft,
    publish,
    discardChanges,
    getChangeSummary
  } = useDraftManager<ScenarioData>({
    scenarioId,
    onPublish: async (data) => {
      const response = await fetch('/api/scenarios/editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to publish');
      }
    },
    autoSaveDelay: 2000
  });

  useEffect(() => {
    loadScenario();
    if (scenarioId === 'new') {
      loadScenarios();
    }
  }, [scenarioId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadScenarios = async () => {
    setLoadingScenarios(true);
    try {
      const response = await fetch('/api/scenarios/editor');
      if (!response.ok) throw new Error('Failed to load scenarios');
      const data = await response.json();
      setAllScenarios(data.scenarios || []);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoadingScenarios(false);
    }
  };

  const deleteScenario = async (id: string) => {
    if (!confirm('確定要刪除此場景嗎？')) return;

    try {
      const response = await fetch(`/api/scenarios/editor/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete scenario');

      // Reload scenarios list
      await loadScenarios();
      alert('刪除成功！');
    } catch (error) {
      console.error('Failed to delete scenario:', error);
      alert('刪除失敗！');
    }
  };

  const loadScenario = async () => {
    try {
      if (scenarioId === 'new') {
        const newScenario: ScenarioData = {
          id: 'new',
          title: { en: 'New Scenario', zh: '新場景' },
          description: { en: 'Click to edit description', zh: '點擊編輯描述' },
          mode: selectedMode || 'pbl',
          difficulty: 'medium',
          estimatedMinutes: 30,
          taskTemplates: [],
          objectives: { en: [], zh: [] }
        };
        loadOriginal(newScenario);
      } else {
        const response = await fetch(`/api/scenarios/editor/${scenarioId}`);
        if (!response.ok) throw new Error('Failed to load scenario');
        const data = await response.json();
        loadOriginal(data);
      }
    } catch (error) {
      console.error('Failed to load scenario:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScenarioById = async (id: string) => {
    try {
      if (id === 'new') {
        const newScenario: ScenarioData = {
          id: 'new',
          title: { en: 'New Scenario', zh: '新場景' },
          description: { en: 'Click to edit description', zh: '點擊編輯描述' },
          mode: selectedMode || 'pbl',
          difficulty: 'medium',
          estimatedMinutes: 30,
          taskTemplates: [],
          objectives: { en: [], zh: [] },
          prerequisites: [],
          xpRewards: {},
          pblData: {},
          discoveryData: {},
          assessmentData: {},
          resources: [],
          aiModules: {}
        };
        loadOriginal(newScenario);
      } else {
        const response = await fetch(`/api/scenarios/editor/${id}`);
        if (!response.ok) throw new Error('Failed to load scenario');
        const { scenario } = await response.json();

        console.log('📥 Loaded scenario from DB:', scenario);

        // Transform database format to frontend format
        // Repository returns: tasks/questions, pbl_data/discovery_data/assessment_data
        // Frontend expects: taskTemplates, pblData/discoveryData/assessmentData
        const transformed: ScenarioData = {
          id: scenario.scenario_id || scenario.id,
          title: scenario.title || { en: '', zh: '' },
          description: scenario.description || { en: '', zh: '' },
          mode: scenario.mode,
          difficulty: scenario.difficulty || 'medium',
          estimatedMinutes: scenario.estimated_time || 30,

          // Transform field names: snake_case from DB to camelCase for frontend
          taskTemplates: scenario.content?.tasks || scenario.content?.questions || scenario.content?.taskTemplates || [],
          objectives: scenario.content?.objectives || { en: [], zh: [] },
          prerequisites: scenario.content?.prerequisites || [],
          xpRewards: scenario.content?.xpRewards || {},
          resources: scenario.content?.resources || [],
          aiModules: scenario.content?.aiModules || {},

          // Mode-specific data (transform snake_case to camelCase)
          pblData: scenario.content?.pbl_data || scenario.content?.pblData || {},
          discoveryData: scenario.content?.discovery_data || scenario.content?.discoveryData || {},
          assessmentData: scenario.content?.assessment_data || scenario.content?.assessmentData || {}
        };

        console.log('✅ Transformed scenario for editor:', transformed);
        console.log('  - taskTemplates:', transformed.taskTemplates);
        console.log('  - pblData:', transformed.pblData);
        loadOriginal(transformed);
      }
    } catch (error) {
      console.error('❌ Failed to load scenario:', error);
    }
  };

  const handleEditClick = (e: React.MouseEvent, field: string, value: unknown, type: 'text' | 'number' | 'select' | 'multiline' = 'text', options?: string[]) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEditPopup({
      field,
      x: rect.left,
      y: rect.bottom + 5,
      value,
      type,
      options
    });
  };

  const handlePopupSave = (newValue: unknown) => {
    if (!editPopup || !draft) return;

    const field = editPopup.field;
    if (field.startsWith('task.')) {
      const [, taskId, taskField] = field.split('.');
      const updatedTasks = draft.taskTemplates.map(task =>
        task.id === taskId ? { ...task, [taskField]: newValue } : task
      );
      updateDraft({ taskTemplates: updatedTasks });
    } else {
      updateDraft({ [field]: newValue });
    }

    setEditPopup(null);
  };

  const processAgentCommand = async (command: string) => {
    setIsProcessing(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: command,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Parse and execute command
    const lowerCommand = command.toLowerCase();
    let responseText = '';

    if (lowerCommand.includes('標題') || lowerCommand.includes('title')) {
      const match = command.match(/[「"']([^「"']+)[」"']/);
      if (match) {
        const newTitle = match[1];
        updateDraft({ title: { ...draft?.title, [language]: newTitle } as Record<string, string> });
        responseText = `✅ 已將標題更新為「${newTitle}」`;
      } else {
        responseText = '請用引號包含新標題，例如："把標題改成「AI基礎課程」"';
      }
    } else if (lowerCommand.includes('難度') || lowerCommand.includes('difficulty')) {
      if (lowerCommand.includes('簡單') || lowerCommand.includes('easy')) {
        updateDraft({ difficulty: 'easy' });
        responseText = '✅ 已將難度設定為「簡單」';
      } else if (lowerCommand.includes('中等') || lowerCommand.includes('medium')) {
        updateDraft({ difficulty: 'medium' });
        responseText = '✅ 已將難度設定為「中等」';
      } else if (lowerCommand.includes('困難') || lowerCommand.includes('hard')) {
        updateDraft({ difficulty: 'hard' });
        responseText = '✅ 已將難度設定為「困難」';
      }
    } else if (lowerCommand.includes('時長') || lowerCommand.includes('duration') || lowerCommand.includes('分鐘')) {
      const match = command.match(/\d+/);
      if (match) {
        const minutes = parseInt(match[0]);
        updateDraft({ estimatedMinutes: minutes });
        responseText = `✅ 已將時長設定為 ${minutes} 分鐘`;
      }
    } else if (lowerCommand.includes('新增任務') || lowerCommand.includes('add task')) {
      const newTask: TaskTemplate = {
        id: `task-${Date.now()}`,
        title: { en: 'New Task', zh: '新任務' },
        type: 'conversation',
        description: { en: 'Task description', zh: '任務描述' },
        content: {}
      };
      updateDraft({
        taskTemplates: [...(draft?.taskTemplates || []), newTask]
      });
      responseText = '✅ 已新增一個任務';
    } else if (lowerCommand.includes('描述') || lowerCommand.includes('description')) {
      const match = command.match(/[「"']([^「"']+)[」"']/);
      if (match) {
        const newDesc = match[1];
        updateDraft({ description: { ...draft?.description, [language]: newDesc } as Record<string, string> });
        responseText = `✅ 已更新描述為「${newDesc}」`;
      }
    } else {
      responseText = '我不太理解你的指令。你可以試試：\n• "把標題改成「...」"\n• "設定難度為簡單"\n• "修改時長為45分鐘"\n• "新增一個任務"';
    }

    // Add assistant response
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, assistantMessage]);

    setIsProcessing(false);
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isProcessing) {
      processAgentCommand(inputMessage.trim());
      setInputMessage('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Scenario not found</h2>
          <button
            onClick={() => router.push('/admin/scenarios')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg"
          >
            Back to Scenarios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Content Area - Full Height */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Navigation - Fixed Height */}
        <div className={`${leftPanelCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col overflow-hidden`}>
          <div className="flex-shrink-0 p-4 border-b border-gray-200">
            <button
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {leftPanelCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>

          {!leftPanelCollapsed && (
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {/* Mode Selection - Always visible, highlight selected */}
              <div className="text-xs font-semibold text-gray-500 mb-3 px-3">學習模式</div>
              <button
                onClick={() => { setSelectedMode('pbl'); loadScenarios(); setSelectedScenario(null); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  selectedMode === 'pbl'
                    ? 'bg-gradient-to-r from-purple-100 to-purple-200 border-2 border-purple-400 shadow-md'
                    : 'bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200'
                }`}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-purple-900">PBL</div>
                    <div className="text-xs text-purple-600">專案式學習</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => { setSelectedMode('discovery'); loadScenarios(); setSelectedScenario(null); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  selectedMode === 'discovery'
                    ? 'bg-gradient-to-r from-green-100 to-green-200 border-2 border-green-400 shadow-md'
                    : 'bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-2 border-green-200'
                }`}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-green-900">DISCOVERY</div>
                    <div className="text-xs text-green-600">探索學習</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => { setSelectedMode('assessment'); loadScenarios(); setSelectedScenario(null); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  selectedMode === 'assessment'
                    ? 'bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-400 shadow-md'
                    : 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200'
                }`}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-blue-900">ASSESSMENT</div>
                    <div className="text-xs text-blue-600">評測</div>
                  </div>
                </div>
              </button>

              {/* Level 3: Scenario selected - Show back button only */}
              {selectedScenario && (
                <>
                  <div className="my-3 border-t border-gray-200"></div>
                  <button
                    onClick={() => {
                      setSelectedScenario(null);
                      setExpandedSections({
                        'scenario-basic': true,
                        'scenario-objectives': true,
                        'scenario-mode-specific': true,  // 預設展開
                        'scenario-advanced': false
                      });
                      setExpandedTasks({});
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    返回場景列表
                  </button>
                </>
              )}
            </nav>
          )}

          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            {hasChanges ? (
              <div className="text-sm text-yellow-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {!leftPanelCollapsed && <span>{getChangeSummary().length} 個變更</span>}
              </div>
            ) : (
              <div className="text-sm text-green-600 flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {!leftPanelCollapsed && <span>已保存</span>}
              </div>
            )}
          </div>
        </div>

        {/* Center Panel - Display - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-4xl mx-auto">

          {/* Welcome - No mode selected */}
          {!selectedMode && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-12 w-12 text-purple-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-3">歡迎使用場景編輯器</h2>
                <p className="text-gray-600 mb-6">請從左側選擇學習模式開始</p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <span>PBL 專案</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    <span>Discovery 探索</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span>Assessment 評測</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scenario List - Mode selected but no scenario */}
          {selectedMode && !selectedScenario && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-800">
                  {selectedMode === 'pbl' ? '🎯 PBL 專案式學習' : selectedMode === 'discovery' ? '🔍 Discovery 探索學習' : '📊 Assessment 評測'}
                </h2>
                <button
                  onClick={() => {
                    setSelectedScenario('new');
                    setActiveSection('basic-info');
                    loadScenarioById('new');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                >
                  <Plus className="h-5 w-5 inline mr-2" />
                  新增場景
                </button>
              </div>

              {loadingScenarios ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                </div>
              ) : (
                <>
                  {allScenarios.filter(s => s.mode === selectedMode).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allScenarios.filter(s => s.mode === selectedMode).map(scenario => (
                        <div key={scenario.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-300">
                          <h4 className="font-bold text-xl text-gray-800 mb-2">{scenario.title[language] || scenario.title.en}</h4>
                          <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full ${
                              scenario.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              scenario.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {scenario.difficulty === 'easy' ? '簡單' : scenario.difficulty === 'medium' ? '中等' : '困難'}
                            </span>
                            <span>•</span>
                            <Clock className="h-4 w-4 inline" />
                            <span>{scenario.estimated_time} 分鐘</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedScenario(scenario.scenario_id);
                                setActiveSection('basic-info');
                                // Use database ID for API call
                                loadScenarioById(scenario.id);
                              }}
                              className={`flex-1 px-4 py-2 rounded-lg hover:shadow-lg transition-colors font-medium ${
                                selectedMode === 'pbl' ? 'bg-purple-600 hover:bg-purple-700' :
                                selectedMode === 'discovery' ? 'bg-green-600 hover:bg-green-700' :
                                'bg-blue-600 hover:bg-blue-700'
                              } text-white`}
                            >
                              <Edit3 className="h-4 w-4 inline mr-2" />
                              編輯
                            </button>
                            <button
                              onClick={() => deleteScenario(scenario.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-700 mb-2">尚無場景</h3>
                      <p className="text-gray-500 mb-6">開始創建您的第一個場景</p>
                      <button
                        onClick={() => {
                          setSelectedScenario('new');
                          setActiveSection('basic-info');
                          loadScenarioById('new');
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                      >
                        <Plus className="h-5 w-5 inline mr-2" />
                        新增場景
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Edit Mode - Three-Level Structure (PBL/Discovery/Assessment) */}
          {selectedScenario && draft && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">
                  {draft.mode === 'pbl' ? '🎯 PBL 場景編輯器' : draft.mode === 'discovery' ? '🔍 Discovery 場景編輯器' : '📊 Assessment 場景編輯器'}
                </h1>
                <span className="text-sm text-gray-500">三層級編輯：Scenario → Task List → Task Detail</span>
              </div>

              {/* ========== LEVEL 1: SCENARIO LEVEL ========== */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
                <h2 className="text-xl font-bold text-purple-700 mb-4 flex items-center gap-2">
                  <Target className="h-6 w-6" />
                  Level 1: Scenario Level - 場景層級
                </h2>

                {/* Basic Info - Collapsible */}
                <div className="bg-white rounded-lg mb-3 shadow">
                  <button
                    onClick={() => toggleSection('scenario-basic')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
                  >
                    <span className="font-bold text-gray-800">📝 基本資訊</span>
                    {expandedSections['scenario-basic'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {expandedSections['scenario-basic'] && (
                    <div className="px-4 pb-4 border-t border-gray-100 space-y-4">
                      {/* Title */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">標題</label>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-800">
                            {draft.title?.[language] || draft.title?.en || 'Untitled'}
                          </span>
                          <button onClick={(e) => handleEditClick(e, 'title', draft.title || {}, 'text')} className="p-1 hover:bg-gray-100 rounded">
                            <Edit3 className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">描述</label>
                        <div className="flex items-start gap-2">
                          <p className="text-gray-600">{draft.description?.[language] || draft.description?.en || 'No description'}</p>
                          <button onClick={(e) => handleEditClick(e, 'description', draft.description || {}, 'multiline')} className="p-1 hover:bg-gray-100 rounded">
                            <Edit3 className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </div>

                      {/* Grid: Difficulty, Time, Mode */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-600">難度</label>
                            <button onClick={(e) => handleEditClick(e, 'difficulty', draft.difficulty, 'select', ['easy', 'medium', 'hard'])} className="p-0.5 hover:bg-gray-200 rounded">
                              <Edit3 className="h-3 w-3 text-gray-500" />
                            </button>
                          </div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            draft.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            draft.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {draft.difficulty === 'easy' ? '簡單' : draft.difficulty === 'medium' ? '中等' : '困難'}
                          </span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-600">時長</label>
                            <button onClick={(e) => handleEditClick(e, 'estimatedMinutes', draft.estimatedMinutes, 'number')} className="p-0.5 hover:bg-gray-200 rounded">
                              <Edit3 className="h-3 w-3 text-gray-500" />
                            </button>
                          </div>
                          <span className="text-sm font-medium text-gray-800">{draft.estimatedMinutes} 分鐘</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs font-medium text-gray-600 block mb-1">模式</label>
                          <span className="text-sm font-medium text-purple-700">
                            {draft.mode === 'pbl' ? 'PBL' : draft.mode === 'discovery' ? 'Discovery' : 'Assessment'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Learning Objectives - Collapsible */}
                <div className="bg-white rounded-lg mb-3 shadow">
                  <button
                    onClick={() => toggleSection('scenario-objectives')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
                  >
                    <span className="font-bold text-gray-800">🎯 學習目標</span>
                    {expandedSections['scenario-objectives'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {expandedSections['scenario-objectives'] && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="space-y-2 mt-3">
                        {(() => {
                          // Handle both array and multilingual object formats
                          let objectivesList: string[] = [];
                          if (Array.isArray(draft.objectives)) {
                            objectivesList = draft.objectives;
                          } else if (draft.objectives && typeof draft.objectives === 'object') {
                            // Try different language keys: zh, zhTW, zhCN, en
                            objectivesList = draft.objectives[language] ||
                                            draft.objectives.zhTW ||
                                            draft.objectives.zh ||
                                            draft.objectives.en ||
                                            [];
                          }

                          return objectivesList.map((obj: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{obj}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mode-Specific Data - PBL */}
                {draft.mode === 'pbl' && (
                  <div className="bg-white rounded-lg shadow">
                    <button
                      onClick={() => toggleSection('scenario-mode-specific')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
                    >
                      <span className="font-bold text-gray-800">🧩 PBL 專屬設定</span>
                      {expandedSections['scenario-mode-specific'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                    {expandedSections['scenario-mode-specific'] && (
                      <div className="px-4 pb-4 border-t border-gray-100 space-y-4 mt-3">
                        {/* KSA Mapping */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">KSA Mapping</label>
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div>
                              <span className="text-xs font-medium text-gray-600">Knowledge: </span>
                              <span className="text-sm text-gray-800">
                                {draft.pblData?.ksaMapping?.knowledge?.join(', ') || '未設定'}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-600">Skills: </span>
                              <span className="text-sm text-gray-800">
                                {draft.pblData?.ksaMapping?.skills?.join(', ') || '未設定'}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-600">Attitudes: </span>
                              <span className="text-sm text-gray-800">
                                {draft.pblData?.ksaMapping?.attitudes?.join(', ') || '未設定'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* AI Mentor Guidelines */}
                        {draft.pblData?.aiMentorGuidelines && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">AI Mentor Guidelines</label>
                            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                              {draft.pblData.aiMentorGuidelines}
                            </p>
                          </div>
                        )}

                        {/* Reflection Prompts */}
                        {draft.pblData?.reflectionPrompts && Array.isArray(draft.pblData.reflectionPrompts) && draft.pblData.reflectionPrompts.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Reflection Prompts</label>
                            <div className="space-y-1">
                              {draft.pblData.reflectionPrompts.map((prompt: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 bg-gray-50 rounded p-2">
                                  <span className="text-xs text-gray-500 mt-0.5">{i + 1}.</span>
                                  <span className="text-sm text-gray-700">{prompt}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Mode-Specific Data - Discovery */}
                {draft.mode === 'discovery' && (
                  <div className="bg-white rounded-lg shadow">
                    <button
                      onClick={() => toggleSection('scenario-mode-specific')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
                    >
                      <span className="font-bold text-gray-800">🔍 Discovery 專屬設定</span>
                      {expandedSections['scenario-mode-specific'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                    {expandedSections['scenario-mode-specific'] && (
                      <div className="px-4 pb-4 border-t border-gray-100 space-y-4 mt-3">
                        {/* Career Type */}
                        {draft.discoveryData?.careerType && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Career Type - 職業類型</label>
                            <p className="text-sm text-gray-800 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-3 font-medium">
                              {draft.discoveryData.careerType}
                            </p>
                          </div>
                        )}

                        {/* Career Info */}
                        {draft.discoveryData?.careerInfo && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Career Information - 職業資訊</label>
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                              {draft.discoveryData.careerInfo.avgSalary && (
                                <div>
                                  <span className="text-xs font-medium text-gray-600">平均薪資: </span>
                                  <span className="text-sm text-gray-800">{draft.discoveryData.careerInfo.avgSalary}</span>
                                </div>
                              )}
                              {draft.discoveryData.careerInfo.demandLevel && (
                                <div>
                                  <span className="text-xs font-medium text-gray-600">需求程度: </span>
                                  <span className="text-sm text-gray-800">{draft.discoveryData.careerInfo.demandLevel}</span>
                                </div>
                              )}
                              {draft.discoveryData.careerInfo.requiredSkills && draft.discoveryData.careerInfo.requiredSkills.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-gray-600 block mb-1">所需技能: </span>
                                  <div className="flex flex-wrap gap-1">
                                    {draft.discoveryData.careerInfo.requiredSkills.map((skill: string, i: number) => (
                                      <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Skill Tree */}
                        {draft.discoveryData?.skillTree && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Skill Tree - 技能樹</label>
                            <div className="space-y-2">
                              {draft.discoveryData.skillTree.core && draft.discoveryData.skillTree.core.length > 0 && (
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <span className="text-xs font-medium text-blue-700 block mb-1">Core Skills:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {draft.discoveryData.skillTree.core.map((skill: string, i: number) => (
                                      <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {draft.discoveryData.skillTree.advanced && draft.discoveryData.skillTree.advanced.length > 0 && (
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <span className="text-xs font-medium text-purple-700 block mb-1">Advanced Skills:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {draft.discoveryData.skillTree.advanced.map((skill: string, i: number) => (
                                      <span key={i} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* XP Rewards */}
                        {draft.discoveryData?.xpRewards && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">XP Rewards - 經驗值獎勵</label>
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 grid grid-cols-3 gap-3">
                              {draft.discoveryData.xpRewards.completion !== undefined && (
                                <div className="text-center">
                                  <div className="text-xs text-gray-600">完成獎勵</div>
                                  <div className="text-lg font-bold text-orange-600">{draft.discoveryData.xpRewards.completion} XP</div>
                                </div>
                              )}
                              {draft.discoveryData.xpRewards.challenge !== undefined && (
                                <div className="text-center">
                                  <div className="text-xs text-gray-600">挑戰獎勵</div>
                                  <div className="text-lg font-bold text-orange-600">{draft.discoveryData.xpRewards.challenge} XP</div>
                                </div>
                              )}
                              {draft.discoveryData.xpRewards.innovation !== undefined && (
                                <div className="text-center">
                                  <div className="text-xs text-gray-600">創新獎勵</div>
                                  <div className="text-lg font-bold text-orange-600">{draft.discoveryData.xpRewards.innovation} XP</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Exploration Path */}
                        {draft.discoveryData?.explorationPath && draft.discoveryData.explorationPath.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Exploration Path - 探索路徑</label>
                            <div className="space-y-1">
                              {draft.discoveryData.explorationPath.map((path: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                                  <span className="text-xs font-bold text-gray-500">{i + 1}</span>
                                  <ChevronRight className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm text-gray-700">{path}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Mode-Specific Data - Assessment */}
                {draft.mode === 'assessment' && (
                  <div className="bg-white rounded-lg shadow">
                    <button
                      onClick={() => toggleSection('scenario-mode-specific')}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
                    >
                      <span className="font-bold text-gray-800">📊 Assessment 專屬設定</span>
                      {expandedSections['scenario-mode-specific'] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                    {expandedSections['scenario-mode-specific'] && (
                      <div className="px-4 pb-4 border-t border-gray-100 space-y-4 mt-3">
                        {/* Assessment Type */}
                        {draft.assessmentData?.assessmentType && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Assessment Type - 評測類型</label>
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {draft.assessmentData.assessmentType === 'diagnostic' ? '診斷性評測' :
                               draft.assessmentData.assessmentType === 'formative' ? '形成性評測' : '總結性評測'}
                            </span>
                          </div>
                        )}

                        {/* Question Bank */}
                        {draft.assessmentData?.questionBank && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Question Bank - 題庫</label>
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                              {draft.assessmentData.questionBank.total !== undefined && (
                                <div>
                                  <span className="text-xs font-medium text-gray-600">總題數: </span>
                                  <span className="text-sm font-bold text-gray-800">{draft.assessmentData.questionBank.total}</span>
                                </div>
                              )}
                              {draft.assessmentData.questionBank.byDomain && Object.keys(draft.assessmentData.questionBank.byDomain).length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-gray-600 block mb-1">各領域題數:</span>
                                  <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(draft.assessmentData.questionBank.byDomain).map(([domain, count]) => (
                                      <div key={domain} className="bg-white rounded p-2 flex justify-between items-center">
                                        <span className="text-xs text-gray-700">{domain}</span>
                                        <span className="text-sm font-bold text-blue-600">{String(count)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Scoring Rubric */}
                        {draft.assessmentData?.scoringRubric && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Scoring Rubric - 評分標準</label>
                            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 grid grid-cols-2 gap-3">
                              {draft.assessmentData.scoringRubric.passingScore !== undefined && (
                                <div>
                                  <div className="text-xs text-gray-600">及格分數</div>
                                  <div className="text-lg font-bold text-green-600">{draft.assessmentData.scoringRubric.passingScore}%</div>
                                </div>
                              )}
                              {draft.assessmentData.scoringRubric.excellentScore !== undefined && (
                                <div>
                                  <div className="text-xs text-gray-600">優秀分數</div>
                                  <div className="text-lg font-bold text-blue-600">{draft.assessmentData.scoringRubric.excellentScore}%</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Time Limits */}
                        {draft.assessmentData?.timeLimits && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Time Limits - 時間限制</label>
                            <div className="bg-yellow-50 rounded-lg p-3 space-y-2">
                              {draft.assessmentData.timeLimits.perQuestion !== undefined && (
                                <div>
                                  <span className="text-xs font-medium text-gray-600">每題時間: </span>
                                  <span className="text-sm text-gray-800">{draft.assessmentData.timeLimits.perQuestion} 分鐘</span>
                                </div>
                              )}
                              {draft.assessmentData.timeLimits.total !== undefined && (
                                <div>
                                  <span className="text-xs font-medium text-gray-600">總時間: </span>
                                  <span className="text-sm font-bold text-gray-800">{draft.assessmentData.timeLimits.total} 分鐘</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ========== LEVEL 2: TASK LIST ========== */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border-2 border-green-200">
                <h2 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Level 2: Task List - 任務列表 ({(draft.taskTemplates || []).length} 個任務)
                </h2>

                <div className="space-y-3">
                  {(draft.taskTemplates || []).map((task, index) => (
                    <div key={task.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="flex items-center p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm mr-3">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800">{task.title?.[language] || task.title?.en || 'Untitled Task'}</h3>
                          <p className="text-sm text-gray-600 mt-0.5">{task.description?.[language] || task.description?.en || 'No description'}</p>
                        </div>
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="ml-3 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          {expandedTasks[task.id] ? '收合' : '展開編輯'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('確定要刪除此任務嗎？')) {
                              updateDraft({ taskTemplates: draft.taskTemplates.filter(t => t.id !== task.id) });
                            }
                          }}
                          className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* ========== LEVEL 3: TASK DETAIL (Expandable) ========== */}
                      {expandedTasks[task.id] && (
                        <div className="border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                          <h4 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Level 3: Task Detail - 任務詳細設定
                          </h4>
                          <div className="bg-white rounded-lg p-4 space-y-4">
                            {/* Title */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1">任務標題</label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">{task.title?.[language] || task.title?.en}</span>
                                <button onClick={(e) => handleEditClick(e, `task.${task.id}.title`, task.title || {}, 'text')} className="p-1 hover:bg-gray-100 rounded">
                                  <Edit3 className="h-3 w-3 text-gray-500" />
                                </button>
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1">任務描述</label>
                              <div className="flex items-start gap-2">
                                <p className="text-sm text-gray-700">{task.description?.[language] || task.description?.en}</p>
                                <button onClick={(e) => handleEditClick(e, `task.${task.id}.description`, task.description || {}, 'multiline')} className="p-1 hover:bg-gray-100 rounded">
                                  <Edit3 className="h-3 w-3 text-gray-500" />
                                </button>
                              </div>
                            </div>

                            {/* Type */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1">任務類型</label>
                              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">{task.type}</span>
                            </div>

                            {/* Instructions */}
                            {task.content?.instructions && (
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-2">Instructions - 指示說明</label>
                                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                                  {Array.isArray(task.content.instructions) ? (
                                    task.content.instructions.map((instruction: string, i: number) => (
                                      <div key={i} className="flex items-start gap-2">
                                        <span className="text-xs text-gray-500 mt-0.5">{i + 1}.</span>
                                        <span className="text-sm text-gray-700">{instruction}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-sm text-gray-700">{String(task.content.instructions)}</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Expected Outcome */}
                            {task.content?.expectedOutcome && (
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Expected Outcome - 預期成果</label>
                                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                                  {String(task.content.expectedOutcome)}
                                </p>
                              </div>
                            )}

                            {/* Resources */}
                            {task.content?.resources && Array.isArray(task.content.resources) && task.content.resources.length > 0 && (
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-2">Resources - 資源</label>
                                <div className="space-y-2">
                                  {task.content.resources.map((resource: string, i: number) => (
                                    <div key={i} className="bg-gray-50 rounded p-2 text-sm text-gray-700 flex items-center gap-2">
                                      <FileText className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                      <span>{resource}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* AI Module Configuration */}
                            {task.content?.aiModule && (
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-2">AI Module - AI 模組設定</label>
                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 space-y-2">
                                  <div className="flex items-center gap-4">
                                    <div>
                                      <span className="text-xs text-gray-600">Role: </span>
                                      <span className="text-sm font-medium text-purple-700">{task.content.aiModule.role || 'N/A'}</span>
                                    </div>
                                    {task.content.aiModule.model && (
                                      <div>
                                        <span className="text-xs text-gray-600">Model: </span>
                                        <span className="text-sm font-medium text-purple-700">{task.content.aiModule.model}</span>
                                      </div>
                                    )}
                                  </div>
                                  {task.content.aiModule.persona && (
                                    <div>
                                      <span className="text-xs text-gray-600">Persona: </span>
                                      <span className="text-sm text-gray-700">{task.content.aiModule.persona}</span>
                                    </div>
                                  )}
                                  {task.content.aiModule.initialPrompt && (
                                    <div>
                                      <span className="text-xs text-gray-600 block mb-1">Initial Prompt: </span>
                                      <p className="text-sm text-gray-700 bg-white rounded p-2">{task.content.aiModule.initialPrompt}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Assessment Focus (PBL specific) */}
                            {task.content?.assessmentFocus && (
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-2">Assessment Focus - 評估重點</label>
                                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                  {task.content.assessmentFocus.primary && task.content.assessmentFocus.primary.length > 0 && (
                                    <div>
                                      <span className="text-xs font-medium text-gray-600">Primary KSA: </span>
                                      <span className="text-sm text-gray-800">{task.content.assessmentFocus.primary.join(', ')}</span>
                                    </div>
                                  )}
                                  {task.content.assessmentFocus.secondary && task.content.assessmentFocus.secondary.length > 0 && (
                                    <div>
                                      <span className="text-xs font-medium text-gray-600">Secondary KSA: </span>
                                      <span className="text-sm text-gray-800">{task.content.assessmentFocus.secondary.join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Time Limit */}
                            {task.content?.timeLimit && (
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">Time Limit - 時間限制</label>
                                <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                                  {task.content.timeLimit} 分鐘
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Task Button */}
                  <button
                    onClick={() => {
                      const newTask: TaskTemplate = {
                        id: `task-${Date.now()}`,
                        title: { en: 'New Task', zh: '新任務' },
                        type: 'conversation',
                        description: { en: 'Click to edit description', zh: '點擊編輯描述' },
                        content: {}
                      };
                      updateDraft({ taskTemplates: [...(draft.taskTemplates || []), newTask] });
                    }}
                    className="w-full p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="h-5 w-5 text-green-600" />
                    <span className="text-green-700 font-medium">新增任務</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Right Panel - AI Agent Chat - Fixed Height */}
        <div className={`${rightPanelCollapsed ? 'w-16' : 'w-96'} bg-white border-l border-gray-200 transition-all duration-300 flex flex-col overflow-hidden`}>
          {/* Action Buttons - Above AI Agent Header */}
          {!rightPanelCollapsed && (
            <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded-lg transition-all text-xs font-medium border border-gray-200"
              >
                {language === 'zh' ? 'EN' : '中文'}
              </button>

              {hasChanges && (
                <button
                  onClick={discardChanges}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded-lg transition-all text-gray-700 text-xs font-medium border border-gray-200"
                >
                  <RotateCcw className="h-3 w-3 inline mr-1" />
                  放棄
                </button>
              )}

              <button
                onClick={async () => {
                  try {
                    await publish();
                    alert('發布成功！');
                  } catch (error) {
                    console.error('Publish failed:', error);
                  }
                }}
                disabled={!hasChanges || isPublishing}
                className={`px-4 py-1.5 rounded-lg font-medium transition-all text-xs ${
                  hasChanges && !isPublishing
                    ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <Upload className="h-3 w-3 inline mr-1" />
                {isPublishing ? '發布中...' : '發布'}
              </button>
            </div>
          )}

          {/* AI Header */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              {!rightPanelCollapsed && (
                <div className="flex items-center gap-2">
                  <Bot className="h-6 w-6" />
                  <h3 className="font-bold">AI 編輯助手</h3>
                </div>
              )}
              <button
                onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                {rightPanelCollapsed ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Chat Messages - Scrollable - Always render to maintain flex layout */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${rightPanelCollapsed ? 'hidden' : ''}`}>
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Bot className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input - Fixed at Bottom */}
          {!rightPanelCollapsed && (
            <div className="flex-shrink-0 p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="輸入指令..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                    disabled={isProcessing}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isProcessing || !inputMessage.trim()}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      isProcessing || !inputMessage.trim()
                        ? 'bg-gray-200 text-gray-400'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {['修改標題', '新增任務', '設定難度'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInputMessage(suggestion)}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
          )}
        </div>
      </div>

      {/* Edit Popup */}
      {editPopup && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4"
          style={{
            left: editPopup.x,
            top: editPopup.y,
            minWidth: '200px'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">編輯欄位</h4>
            <button
              onClick={() => setEditPopup(null)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {editPopup.type === 'text' && (
            <input
              type="text"
              defaultValue={typeof editPopup.value === 'object' ? (editPopup.value as Record<string, string>)[language] : String(editPopup.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const newValue = typeof editPopup.value === 'object'
                    ? { ...editPopup.value as Record<string, string>, [language]: (e.target as HTMLInputElement).value }
                    : (e.target as HTMLInputElement).value;
                  handlePopupSave(newValue);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              autoFocus
            />
          )}

          {editPopup.type === 'multiline' && (
            <textarea
              defaultValue={typeof editPopup.value === 'object' ? (editPopup.value as Record<string, string>)[language] : String(editPopup.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              autoFocus
            />
          )}

          {editPopup.type === 'number' && (
            <input
              type="number"
              defaultValue={String(editPopup.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handlePopupSave(parseInt((e.target as HTMLInputElement).value));
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              autoFocus
            />
          )}

          {editPopup.type === 'select' && editPopup.options && (
            <select
              defaultValue={String(editPopup.value)}
              onChange={(e) => handlePopupSave(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              autoFocus
            >
              {editPopup.options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                const input = document.querySelector('input, textarea, select') as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                if (input) {
                  const newValue = editPopup.type === 'number'
                    ? parseInt(input.value)
                    : typeof editPopup.value === 'object'
                    ? { ...editPopup.value as Record<string, string>, [language]: input.value }
                    : input.value;
                  handlePopupSave(newValue);
                }
              }}
              className="flex-1 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
            >
              保存
            </button>
            <button
              onClick={() => setEditPopup(null)}
              className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

    </div>
  );
}