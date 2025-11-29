'use client';

import { Target } from 'lucide-react';
import { WelcomePanel } from '../scenario-editor/WelcomePanel';
import { ScenarioListPanel } from '../scenario-editor/ScenarioListPanel';
import { ScenarioBasicInfo } from '../scenario-editor/ScenarioBasicInfo';
import { ScenarioObjectives } from '../scenario-editor/ScenarioObjectives';
import { PBLModeSettings } from '../scenario-editor/PBLModeSettings';
import { DiscoveryModeSettings } from '../scenario-editor/DiscoveryModeSettings';
import { AssessmentModeSettings } from '../scenario-editor/AssessmentModeSettings';
import { TaskList, TaskTemplate } from '../scenario-editor/TaskList';

// Type definitions
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
  // Handler functions
  const handleCreateNew = () => {
    setSelectedScenario('new');
    setActiveSection('basic-info');
    loadScenarioById('new');
  };

  const handleEditScenario = (scenarioId: string, dbId: string) => {
    setSelectedScenario(scenarioId);
    setActiveSection('basic-info');
    loadScenarioById(dbId);
  };

  const handleUpdateObjective = (index: number, value: string, isMultilingual: boolean) => {
    if (!draft?.objectives) return;

    if (isMultilingual && typeof draft.objectives === 'object' && !Array.isArray(draft.objectives)) {
      const objectivesList = draft.objectives[language] || [];
      const newObjectives = [...objectivesList];
      newObjectives[index] = value;
      updateDraft({ objectives: { ...draft.objectives, [language]: newObjectives } });
    } else if (Array.isArray(draft.objectives)) {
      const newObjectives = [...draft.objectives];
      newObjectives[index] = value;
      updateDraft({ objectives: newObjectives });
    }
  };

  const handleUpdatePBLData = (updates: Partial<PBLData>) => {
    updateDraft({
      pblData: {
        ...draft?.pblData,
        ...updates
      }
    });
  };

  const handleAddTask = () => {
    const newTask: TaskTemplate = {
      id: `task-${Date.now()}`,
      title: { en: 'New Task', zh: '新任務' },
      type: 'conversation',
      description: { en: 'Click to edit description', zh: '點擊編輯描述' },
      content: {}
    };
    updateDraft({ taskTemplates: [...(draft?.taskTemplates || []), newTask] });
  };

  const handleDeleteTask = (taskId: string) => {
    if (!draft) return;
    updateDraft({ taskTemplates: draft.taskTemplates.filter(t => t.id !== taskId) });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Welcome - No mode selected */}
        {!selectedMode && <WelcomePanel />}

        {/* Scenario List - Mode selected but no scenario */}
        {selectedMode && !selectedScenario && (
          <ScenarioListPanel
            selectedMode={selectedMode}
            language={language}
            loadingScenarios={loadingScenarios}
            allScenarios={allScenarios}
            onCreateNew={handleCreateNew}
            onEditScenario={handleEditScenario}
            onDeleteScenario={deleteScenario}
          />
        )}

        {/* Edit Mode - Three-Level Structure */}
        {selectedScenario && draft && (
          <div className="space-y-6">
            {/* ========== LEVEL 1: SCENARIO LEVEL ========== */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
              <h2 className="text-xl font-bold text-purple-700 mb-4 flex items-center gap-2">
                <Target className="h-6 w-6" />
                Level 1: Scenario Level - 場景層級
              </h2>

              {/* Basic Info */}
              <ScenarioBasicInfo
                draft={draft}
                language={language}
                editingField={editingField}
                editingValue={editingValue}
                isExpanded={expandedSections['scenario-basic'] || false}
                onToggle={() => toggleSection('scenario-basic')}
                onStartEditing={startEditing}
                onEditingValueChange={setEditingValue}
                onSave={saveInlineEdit}
                onCancel={cancelInlineEdit}
                onUpdateDraft={updateDraft}
              />

              {/* Learning Objectives */}
              <ScenarioObjectives
                objectives={draft.objectives}
                language={language}
                editingField={editingField}
                editingValue={editingValue}
                isExpanded={expandedSections['scenario-objectives'] || false}
                onToggle={() => toggleSection('scenario-objectives')}
                onStartEditing={startEditing}
                onEditingValueChange={setEditingValue}
                onCancel={cancelInlineEdit}
                onUpdateObjective={handleUpdateObjective}
              />

              {/* Mode-Specific Settings */}
              {draft.mode === 'pbl' && (
                <PBLModeSettings
                  pblData={draft.pblData}
                  editingField={editingField}
                  editingValue={editingValue}
                  isExpanded={expandedSections['scenario-mode-specific'] || false}
                  onToggle={() => toggleSection('scenario-mode-specific')}
                  onStartEditing={startEditing}
                  onEditingValueChange={setEditingValue}
                  onCancel={cancelInlineEdit}
                  onUpdatePBLData={handleUpdatePBLData}
                />
              )}

              {draft.mode === 'discovery' && (
                <DiscoveryModeSettings
                  discoveryData={draft.discoveryData}
                  isExpanded={expandedSections['scenario-mode-specific'] || false}
                  onToggle={() => toggleSection('scenario-mode-specific')}
                />
              )}

              {draft.mode === 'assessment' && (
                <AssessmentModeSettings
                  assessmentData={draft.assessmentData}
                  isExpanded={expandedSections['scenario-mode-specific'] || false}
                  onToggle={() => toggleSection('scenario-mode-specific')}
                />
              )}
            </div>

            {/* ========== LEVEL 2: TASK LIST ========== */}
            <TaskList
              tasks={draft.taskTemplates || []}
              language={language}
              expandedTasks={expandedTasks}
              editingField={editingField}
              editingValue={editingValue}
              onToggleTask={toggleTask}
              onDeleteTask={handleDeleteTask}
              onAddTask={handleAddTask}
              onStartEditing={startEditing}
              onEditingValueChange={setEditingValue}
              onSaveEdit={saveInlineEdit}
              onCancelEdit={cancelInlineEdit}
            />
          </div>
        )}
      </div>
    </div>
  );
}
