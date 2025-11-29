'use client';

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

// Type definitions
interface AIModule {
  role?: string;
  model?: string;
  persona?: string;
  initialPrompt?: string;
  [key: string]: unknown;
}

interface AssessmentFocus {
  primary?: string[];
  secondary?: string[];
  [key: string]: unknown;
}

interface TaskContent {
  instructions?: string | string[];
  expectedOutcome?: string;
  resources?: string[];
  aiModule?: AIModule;
  assessmentFocus?: AssessmentFocus;
  timeLimit?: number;
  [key: string]: unknown;
}

interface TaskTemplate {
  id: string;
  title: Record<string, string>;
  type: string;
  description?: Record<string, string>;
  content?: TaskContent;
  [key: string]: unknown;
}

interface KSAMapping {
  knowledge?: string[];
  skills?: string[];
  attitudes?: string[];
}

interface PBLData {
  ksaMapping?: KSAMapping;
  aiMentorGuidelines?: string;
  reflectionPrompts?: string[];
  [key: string]: unknown;
}

interface CareerInfo {
  avgSalary?: string;
  demandLevel?: string;
  requiredSkills?: string[];
  [key: string]: unknown;
}

interface SkillTree {
  core?: string[];
  advanced?: string[];
  [key: string]: unknown;
}

interface XPRewards {
  completion?: number;
  challenge?: number;
  innovation?: number;
  [key: string]: unknown;
}

interface DiscoveryData {
  careerType?: string;
  careerInfo?: CareerInfo;
  skillTree?: SkillTree;
  xpRewards?: XPRewards;
  explorationPath?: string[];
  [key: string]: unknown;
}

interface QuestionBank {
  total?: number;
  byDomain?: Record<string, number>;
  [key: string]: unknown;
}

interface ScoringRubric {
  passingScore?: number;
  excellentScore?: number;
  [key: string]: unknown;
}

interface TimeLimits {
  perQuestion?: number;
  total?: number;
  [key: string]: unknown;
}

interface AssessmentData {
  assessmentType?: 'diagnostic' | 'formative' | 'summative';
  questionBank?: QuestionBank;
  scoringRubric?: ScoringRubric;
  timeLimits?: TimeLimits;
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
  pblData?: PBLData;
  discoveryData?: DiscoveryData;
  assessmentData?: AssessmentData;
  resources?: Array<Record<string, unknown>>;
  aiModules?: Record<string, unknown>;
}

// Props interface
interface CenterPanelProps {
  selectedMode: 'pbl' | 'discovery' | 'assessment' | null;
  selectedScenario: string | null;
  draft: ScenarioData | null;
  language: string;
  editingField: string | null;
  editingValue: string;
  expandedSections: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  loadingScenarios: boolean;
  allScenarios: Array<{
    id: string;
    scenario_id: string;
    title: Record<string, string>;
    mode: string;
    difficulty: string;
    estimated_time: number;
  }>;
  setSelectedScenario: (id: string | null) => void;
  setActiveSection: (section: string) => void;
  setExpandedSections: (sections: Record<string, boolean>) => void;
  setExpandedTasks: (tasks: Record<string, boolean>) => void;
  loadScenarioById: (id: string) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;
  toggleSection: (section: string) => void;
  toggleTask: (taskId: string) => void;
  startEditing: (field: string, value: string) => void;
  setEditingValue: (value: string) => void;
  saveInlineEdit: () => void;
  cancelInlineEdit: () => void;
  updateDraft: (updates: Partial<ScenarioData>) => void;
}

export function CenterPanel({
  selectedMode,
  selectedScenario,
  draft,
  language,
  editingField,
  editingValue,
  expandedSections,
  expandedTasks,
  loadingScenarios,
  allScenarios,
  setSelectedScenario,
  setActiveSection,
  setExpandedSections,
  setExpandedTasks,
  loadScenarioById,
  deleteScenario,
  toggleSection,
  toggleTask,
  startEditing,
  setEditingValue,
  saveInlineEdit,
  cancelInlineEdit,
  updateDraft
}: CenterPanelProps) {
  return (
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
                        {editingField === 'title' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveInlineEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit();
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            className="w-full px-3 py-2 text-lg font-bold border-2 border-purple-400 rounded-lg focus:outline-none focus:border-purple-600"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => startEditing('title', draft.title?.[language] || draft.title?.en || '')}
                            className="text-lg font-bold text-gray-800 cursor-pointer hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 group"
                          >
                            <span className="flex-1">{draft.title?.[language] || draft.title?.en || 'Untitled'}</span>
                            <Edit3 className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">描述</label>
                        {editingField === 'description' ? (
                          <textarea
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveInlineEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            rows={4}
                            className="w-full px-3 py-2 border-2 border-purple-400 rounded-lg focus:outline-none focus:border-purple-600"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => startEditing('description', draft.description?.[language] || draft.description?.en || '')}
                            className="text-gray-600 cursor-pointer hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors min-h-[60px] flex items-start gap-2 group"
                          >
                            <span className="flex-1">{draft.description?.[language] || draft.description?.en || 'No description'}</span>
                            <Edit3 className="h-4 w-4 text-gray-400 group-hover:text-purple-600 mt-0.5" />
                          </div>
                        )}
                      </div>

                      {/* Grid: Difficulty, Time, Mode */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs font-medium text-gray-600 block mb-1">難度</label>
                          {editingField === 'difficulty' ? (
                            <select
                              value={editingValue}
                              onChange={(e) => {
                                setEditingValue(e.target.value);
                                updateDraft({ difficulty: e.target.value });
                                // setEditingField(null);
                              }}
                              onBlur={() => {
                                // setEditingField(null);
                              }}
                              className="w-full px-2 py-1 text-xs border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600"
                              autoFocus
                            >
                              <option value="easy">簡單</option>
                              <option value="medium">中等</option>
                              <option value="hard">困難</option>
                            </select>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span
                                onClick={() => startEditing('difficulty', draft.difficulty || 'medium')}
                                className={`inline-block px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                                  draft.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                  draft.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {draft.difficulty === 'easy' ? '簡單' : draft.difficulty === 'medium' ? '中等' : '困難'}
                              </span>
                              <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs font-medium text-gray-600 block mb-1">時長</label>
                          {editingField === 'estimatedMinutes' ? (
                            <input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={saveInlineEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit();
                                if (e.key === 'Escape') cancelInlineEdit();
                              }}
                              className="w-full px-2 py-1 text-sm border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span
                                onClick={() => startEditing('estimatedMinutes', String(draft.estimatedMinutes || 30))}
                                className="text-sm font-medium text-gray-800 cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                              >
                                {draft.estimatedMinutes} 分鐘
                              </span>
                              <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                            </div>
                          )}
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
                              {editingField === `objective.${i}` ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => {
                                    const newObjectives = [...objectivesList];
                                    newObjectives[i] = editingValue;
                                    if (typeof draft.objectives === 'object' && !Array.isArray(draft.objectives)) {
                                      updateDraft({ objectives: { ...draft.objectives, [language]: newObjectives } });
                                    } else {
                                      updateDraft({ objectives: newObjectives });
                                    }
                                    // setEditingField(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newObjectives = [...objectivesList];
                                      newObjectives[i] = editingValue;
                                      if (typeof draft.objectives === 'object' && !Array.isArray(draft.objectives)) {
                                        updateDraft({ objectives: { ...draft.objectives, [language]: newObjectives } });
                                      } else {
                                        updateDraft({ objectives: newObjectives });
                                      }
                                      // setEditingField(null);
                                    }
                                    if (e.key === 'Escape') cancelInlineEdit();
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onClick={() => startEditing(`objective.${i}`, obj)}
                                  className="text-sm cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors flex-1 flex items-start gap-2 group"
                                >
                                  <span className="flex-1">{obj}</span>
                                  <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600 flex-shrink-0 mt-0.5" />
                                </div>
                              )}
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
                              {editingField === 'ksa.knowledge' ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => {
                                    const newKnowledge = editingValue.split(',').map(s => s.trim()).filter(Boolean);
                                    updateDraft({
                                      pblData: {
                                        ...draft.pblData,
                                        ksaMapping: {
                                          ...draft.pblData?.ksaMapping,
                                          knowledge: newKnowledge
                                        }
                                      }
                                    });
                                    // setEditingField(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newKnowledge = editingValue.split(',').map(s => s.trim()).filter(Boolean);
                                      updateDraft({
                                        pblData: {
                                          ...draft.pblData,
                                          ksaMapping: {
                                            ...draft.pblData?.ksaMapping,
                                            knowledge: newKnowledge
                                          }
                                        }
                                      });
                                      // setEditingField(null);
                                    }
                                    if (e.key === 'Escape') cancelInlineEdit();
                                  }}
                                  className="px-2 py-1 text-sm border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600 w-full mt-1"
                                  placeholder="例如: K1.1, K1.4, K4.2"
                                  autoFocus
                                />
                              ) : (
                                <div className="flex items-center gap-1 group inline-flex">
                                  <span
                                    onClick={() => startEditing('ksa.knowledge', draft.pblData?.ksaMapping?.knowledge?.join(', ') || '')}
                                    className="text-sm text-gray-800 cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                                  >
                                    {draft.pblData?.ksaMapping?.knowledge?.join(', ') || '未設定'}
                                  </span>
                                  <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-600">Skills: </span>
                              {editingField === 'ksa.skills' ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => {
                                    const newSkills = editingValue.split(',').map(s => s.trim()).filter(Boolean);
                                    updateDraft({
                                      pblData: {
                                        ...draft.pblData,
                                        ksaMapping: {
                                          ...draft.pblData?.ksaMapping,
                                          skills: newSkills
                                        }
                                      }
                                    });
                                    // setEditingField(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newSkills = editingValue.split(',').map(s => s.trim()).filter(Boolean);
                                      updateDraft({
                                        pblData: {
                                          ...draft.pblData,
                                          ksaMapping: {
                                            ...draft.pblData?.ksaMapping,
                                            skills: newSkills
                                          }
                                        }
                                      });
                                      // setEditingField(null);
                                    }
                                    if (e.key === 'Escape') cancelInlineEdit();
                                  }}
                                  className="px-2 py-1 text-sm border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600 w-full mt-1"
                                  placeholder="例如: S1.1, S3.1, S6.1"
                                  autoFocus
                                />
                              ) : (
                                <div className="flex items-center gap-1 group inline-flex">
                                  <span
                                    onClick={() => startEditing('ksa.skills', draft.pblData?.ksaMapping?.skills?.join(', ') || '')}
                                    className="text-sm text-gray-800 cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                                  >
                                    {draft.pblData?.ksaMapping?.skills?.join(', ') || '未設定'}
                                  </span>
                                  <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-600">Attitudes: </span>
                              {editingField === 'ksa.attitudes' ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => {
                                    const newAttitudes = editingValue.split(',').map(s => s.trim()).filter(Boolean);
                                    updateDraft({
                                      pblData: {
                                        ...draft.pblData,
                                        ksaMapping: {
                                          ...draft.pblData?.ksaMapping,
                                          attitudes: newAttitudes
                                        }
                                      }
                                    });
                                    // setEditingField(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newAttitudes = editingValue.split(',').map(s => s.trim()).filter(Boolean);
                                      updateDraft({
                                        pblData: {
                                          ...draft.pblData,
                                          ksaMapping: {
                                            ...draft.pblData?.ksaMapping,
                                            attitudes: newAttitudes
                                          }
                                        }
                                      });
                                      // setEditingField(null);
                                    }
                                    if (e.key === 'Escape') cancelInlineEdit();
                                  }}
                                  className="px-2 py-1 text-sm border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600 w-full mt-1"
                                  placeholder="例如: A2.1, A3.1, A5.1"
                                  autoFocus
                                />
                              ) : (
                                <div className="flex items-center gap-1 group inline-flex">
                                  <span
                                    onClick={() => startEditing('ksa.attitudes', draft.pblData?.ksaMapping?.attitudes?.join(', ') || '')}
                                    className="text-sm text-gray-800 cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                                  >
                                    {draft.pblData?.ksaMapping?.attitudes?.join(', ') || '未設定'}
                                  </span>
                                  <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                                </div>
                              )}
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
                              {editingField === `task.${task.id}.title` ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={saveInlineEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveInlineEdit();
                                    if (e.key === 'Escape') cancelInlineEdit();
                                  }}
                                  className="w-full px-3 py-2 text-sm font-bold border-2 border-purple-400 rounded-lg focus:outline-none focus:border-purple-600"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onClick={() => startEditing(`task.${task.id}.title`, task.title?.[language] || task.title?.en || '')}
                                  className="text-sm font-bold text-gray-800 cursor-pointer hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 group"
                                >
                                  <span className="flex-1">{task.title?.[language] || task.title?.en}</span>
                                  <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                                </div>
                              )}
                            </div>

                            {/* Description */}
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1">任務描述</label>
                              {editingField === `task.${task.id}.description` ? (
                                <textarea
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={saveInlineEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') cancelInlineEdit();
                                  }}
                                  rows={3}
                                  className="w-full px-3 py-2 text-sm border-2 border-purple-400 rounded-lg focus:outline-none focus:border-purple-600"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onClick={() => startEditing(`task.${task.id}.description`, task.description?.[language] || task.description?.en || '')}
                                  className="text-sm text-gray-700 cursor-pointer hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors min-h-[60px] flex items-start gap-2 group"
                                >
                                  <span className="flex-1">{task.description?.[language] || task.description?.en}</span>
                                  <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600 flex-shrink-0 mt-0.5" />
                                </div>
                              )}
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
  );
}
