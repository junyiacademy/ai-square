/**
 * Agent-Powered WYSIWYG Editor - Modern 3-Panel Layout
 * Left: Collapsible Navigation
 * Center: Visual Display/Preview
 * Right: AI Agent Chat for Natural Language Editing
 */

'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDraftManager } from '@/hooks/useDraftManager';
import { LeftPanel } from '@/components/agent-editor/LeftPanel';
import { CenterPanel } from '@/components/agent-editor/CenterPanel';
import { RightPanel } from '@/components/agent-editor/RightPanel';

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

function AgentEditorContent() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get('id') || 'new';

  const [language, setLanguage] = useState('zh');
  const [loading, setLoading] = useState(true);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Navigation hierarchy state
  const [selectedMode, setSelectedMode] = useState<'pbl' | 'discovery' | 'assessment' | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
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

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

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
    // Don't auto-load scenario on mount - wait for user to select from sidebar
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

        // Set selectedMode when user clicks a scenario
        if (!selectedMode) {
          setSelectedMode(scenario.mode as 'pbl' | 'discovery' | 'assessment');
        }
      }
    } catch (error) {
      console.error('❌ Failed to load scenario:', error);
    }
  };

  // Inline editing handlers
  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditingValue(value);
  };

  const saveInlineEdit = () => {
    if (!editingField || !draft) return;

    const field = editingField;
    if (field === 'title') {
      updateDraft({ title: { ...draft.title, [language]: editingValue } });
    } else if (field === 'description') {
      updateDraft({ description: { ...draft.description, [language]: editingValue } });
    } else if (field === 'estimatedMinutes') {
      updateDraft({ estimatedMinutes: parseInt(editingValue) || 30 });
    } else if (field === 'difficulty') {
      updateDraft({ difficulty: editingValue });
    } else if (field.startsWith('task.')) {
      const [, taskId, taskField] = field.split('.');
      const updatedTasks = draft.taskTemplates.map(task =>
        task.id === taskId ? { ...task, [taskField]: typeof task[taskField as keyof typeof task] === 'object' ? { ...(task[taskField as keyof typeof task] as Record<string, string>), [language]: editingValue } : editingValue } : task
      );
      updateDraft({ taskTemplates: updatedTasks });
    }

    setEditingField(null);
    setEditingValue('');
  };

  const cancelInlineEdit = () => {
    setEditingField(null);
    setEditingValue('');
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel
          leftPanelCollapsed={leftPanelCollapsed}
          setLeftPanelCollapsed={setLeftPanelCollapsed}
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          selectedScenario={selectedScenario}
          setSelectedScenario={setSelectedScenario}
          loadScenarios={loadScenarios}
          setExpandedSections={setExpandedSections}
          setExpandedTasks={setExpandedTasks}
          hasChanges={hasChanges}
          getChangeSummary={getChangeSummary}
        />

        <CenterPanel
          selectedMode={selectedMode}
          selectedScenario={selectedScenario}
          draft={draft}
          language={language}
          editingField={editingField}
          editingValue={editingValue}
          expandedSections={expandedSections}
          expandedTasks={expandedTasks}
          loadingScenarios={loadingScenarios}
          allScenarios={allScenarios}
          setSelectedScenario={setSelectedScenario}
          setActiveSection={setActiveSection}
          setExpandedSections={setExpandedSections}
          setExpandedTasks={setExpandedTasks}
          loadScenarioById={loadScenarioById}
          deleteScenario={deleteScenario}
          toggleSection={toggleSection}
          toggleTask={toggleTask}
          startEditing={startEditing}
          setEditingValue={setEditingValue}
          saveInlineEdit={saveInlineEdit}
          cancelInlineEdit={cancelInlineEdit}
          updateDraft={updateDraft}
        />

        <RightPanel
          rightPanelCollapsed={rightPanelCollapsed}
          setRightPanelCollapsed={setRightPanelCollapsed}
          language={language}
          setLanguage={setLanguage}
          hasChanges={hasChanges}
          discardChanges={discardChanges}
          publish={publish}
          isPublishing={isPublishing}
          chatMessages={chatMessages}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSendMessage={handleSendMessage}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
}

export default function AgentEditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <AgentEditorContent />
    </Suspense>
  );
}