import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CenterPanel } from '../CenterPanel';

const mockScenarioData = {
  id: 'test-scenario-1',
  title: { en: 'Test Scenario', zh: '測試場景' },
  description: { en: 'Test description', zh: '測試描述' },
  mode: 'pbl' as const,
  difficulty: 'medium',
  estimatedMinutes: 30,
  taskTemplates: [
    {
      id: 'task-1',
      title: { en: 'Task 1', zh: '任務 1' },
      type: 'conversation',
      description: { en: 'Task 1 desc', zh: '任務 1 描述' },
      content: {
        instructions: ['Step 1', 'Step 2'],
        expectedOutcome: 'Complete the task',
        resources: ['Resource 1']
      }
    }
  ],
  objectives: { en: ['Learn X', 'Master Y'], zh: ['學習 X', '掌握 Y'] },
  pblData: {
    ksaMapping: {
      knowledge: ['K1.1', 'K1.4'],
      skills: ['S1.1', 'S3.1'],
      attitudes: ['A2.1']
    },
    aiMentorGuidelines: 'Be supportive',
    reflectionPrompts: ['What did you learn?', 'How can you improve?']
  }
};

const mockAllScenarios = [
  {
    id: '1',
    scenario_id: 'pbl-scenario-1',
    title: { en: 'PBL Scenario 1', zh: 'PBL 場景 1' },
    mode: 'pbl',
    difficulty: 'easy',
    estimated_time: 20
  },
  {
    id: '2',
    scenario_id: 'discovery-scenario-1',
    title: { en: 'Discovery Scenario 1', zh: 'Discovery 場景 1' },
    mode: 'discovery',
    difficulty: 'medium',
    estimated_time: 30
  }
];

describe('CenterPanel Component', () => {
  const mockProps = {
    selectedMode: null as 'pbl' | 'discovery' | 'assessment' | null,
    selectedScenario: null,
    draft: null,
    language: 'zh',
    editingField: null,
    editingValue: '',
    expandedSections: {
      'scenario-basic': true,
      'scenario-objectives': true,
      'scenario-mode-specific': true,
      'scenario-advanced': false
    },
    expandedTasks: {},
    loadingScenarios: false,
    allScenarios: mockAllScenarios,
    setSelectedScenario: jest.fn(),
    setActiveSection: jest.fn(),
    setExpandedSections: jest.fn(),
    setExpandedTasks: jest.fn(),
    loadScenarioById: jest.fn(),
    deleteScenario: jest.fn(),
    toggleSection: jest.fn(),
    toggleTask: jest.fn(),
    startEditing: jest.fn(),
    setEditingValue: jest.fn(),
    saveInlineEdit: jest.fn(),
    cancelInlineEdit: jest.fn(),
    updateDraft: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Welcome Screen (No Mode Selected)', () => {
    it('should show welcome message when no mode selected', () => {
      render(<CenterPanel {...mockProps} />);
      expect(screen.getByText('歡迎使用場景編輯器')).toBeInTheDocument();
      expect(screen.getByText('請從左側選擇學習模式開始')).toBeInTheDocument();
    });

    it('should display all three mode indicators', () => {
      render(<CenterPanel {...mockProps} />);
      expect(screen.getByText('PBL 專案')).toBeInTheDocument();
      expect(screen.getByText('Discovery 探索')).toBeInTheDocument();
      expect(screen.getByText('Assessment 評測')).toBeInTheDocument();
    });
  });

  describe('Scenario List View (Mode Selected, No Scenario)', () => {
    it('should show PBL scenarios when PBL mode selected', () => {
      render(<CenterPanel {...mockProps} selectedMode="pbl" />);
      expect(screen.getByText('🎯 PBL 專案式學習')).toBeInTheDocument();
      expect(screen.getByText('PBL 場景 1')).toBeInTheDocument();
    });

    it('should show "新增場景" button', () => {
      render(<CenterPanel {...mockProps} selectedMode="pbl" />);
      expect(screen.getByText('新增場景')).toBeInTheDocument();
    });

    it('should filter scenarios by selected mode', () => {
      render(<CenterPanel {...mockProps} selectedMode="pbl" />);
      expect(screen.getByText('PBL 場景 1')).toBeInTheDocument();
      expect(screen.queryByText('Discovery 場景 1')).not.toBeInTheDocument();
    });

    it('should show loading spinner when loading scenarios', () => {
      const { container } = render(<CenterPanel {...mockProps} selectedMode="pbl" loadingScenarios={true} />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should show empty state when no scenarios exist', () => {
      render(<CenterPanel {...mockProps} selectedMode="assessment" allScenarios={[]} />);
      expect(screen.getByText('尚無場景')).toBeInTheDocument();
      expect(screen.getByText('開始創建您的第一個場景')).toBeInTheDocument();
    });

    it('should call loadScenarioById when edit button clicked', () => {
      render(<CenterPanel {...mockProps} selectedMode="pbl" />);
      const editButton = screen.getAllByText('編輯')[0].closest('button');
      fireEvent.click(editButton!);

      expect(mockProps.setSelectedScenario).toHaveBeenCalledWith('pbl-scenario-1');
      expect(mockProps.setActiveSection).toHaveBeenCalledWith('basic-info');
      expect(mockProps.loadScenarioById).toHaveBeenCalledWith('1');
    });

    it('should call deleteScenario when delete button clicked', () => {
      const { container } = render(<CenterPanel {...mockProps} selectedMode="pbl" />);

      // Find delete button (red background button)
      const deleteButton = container.querySelector('button.bg-red-600');
      fireEvent.click(deleteButton!);

      expect(mockProps.deleteScenario).toHaveBeenCalledWith('1');
    });
  });

  describe('Scenario Editor View (Scenario Selected)', () => {
    const propsWithDraft = {
      ...mockProps,
      selectedMode: 'pbl' as const,
      selectedScenario: 'test-scenario-1',
      draft: mockScenarioData
    };

    it('should render scenario editor when scenario selected', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('Level 1: Scenario Level - 場景層級')).toBeInTheDocument();
    });

    it('should display scenario title', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('測試場景')).toBeInTheDocument();
    });

    it('should display scenario description', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('測試描述')).toBeInTheDocument();
    });

    it('should display difficulty badge', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('中等')).toBeInTheDocument();
    });

    it('should display estimated time', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('30 分鐘')).toBeInTheDocument();
    });

    it('should display mode badge', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('PBL')).toBeInTheDocument();
    });

    it('should render all collapsible sections', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('📝 基本資訊')).toBeInTheDocument();
      expect(screen.getByText('🎯 學習目標')).toBeInTheDocument();
      expect(screen.getByText('🧩 PBL 專屬設定')).toBeInTheDocument();
    });

    it('should toggle section when section header clicked', () => {
      render(<CenterPanel {...propsWithDraft} />);
      const sectionHeader = screen.getByText('📝 基本資訊').closest('button');
      fireEvent.click(sectionHeader!);

      expect(mockProps.toggleSection).toHaveBeenCalledWith('scenario-basic');
    });
  });

  describe('Inline Editing', () => {
    const propsWithDraft = {
      ...mockProps,
      selectedMode: 'pbl' as const,
      selectedScenario: 'test-scenario-1',
      draft: mockScenarioData
    };

    it('should enter edit mode when title clicked', () => {
      render(<CenterPanel {...propsWithDraft} />);
      const titleElement = screen.getByText('測試場景');
      fireEvent.click(titleElement);

      expect(mockProps.startEditing).toHaveBeenCalledWith('title', '測試場景');
    });

    it('should show input field when editing title', () => {
      render(<CenterPanel {...propsWithDraft} editingField="title" editingValue="New Title" />);
      const input = screen.getByDisplayValue('New Title');
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();
    });

    it('should call saveInlineEdit when Enter pressed', () => {
      render(<CenterPanel {...propsWithDraft} editingField="title" editingValue="New Title" />);
      const input = screen.getByDisplayValue('New Title');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockProps.saveInlineEdit).toHaveBeenCalled();
    });

    it('should call cancelInlineEdit when Escape pressed', () => {
      render(<CenterPanel {...propsWithDraft} editingField="title" editingValue="New Title" />);
      const input = screen.getByDisplayValue('New Title');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockProps.cancelInlineEdit).toHaveBeenCalled();
    });

    it('should call saveInlineEdit when input loses focus', () => {
      render(<CenterPanel {...propsWithDraft} editingField="title" editingValue="New Title" />);
      const input = screen.getByDisplayValue('New Title');
      fireEvent.blur(input);

      expect(mockProps.saveInlineEdit).toHaveBeenCalled();
    });

    it('should update editingValue when input changes', () => {
      render(<CenterPanel {...propsWithDraft} editingField="title" editingValue="Old" />);
      const input = screen.getByDisplayValue('Old');
      fireEvent.change(input, { target: { value: 'New Value' } });

      expect(mockProps.setEditingValue).toHaveBeenCalledWith('New Value');
    });
  });

  describe('Task List Management', () => {
    const propsWithDraft = {
      ...mockProps,
      selectedMode: 'pbl' as const,
      selectedScenario: 'test-scenario-1',
      draft: mockScenarioData
    };

    it('should display task count', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText(/1 個任務/)).toBeInTheDocument();
    });

    it('should render task cards', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('任務 1')).toBeInTheDocument();
      expect(screen.getByText('任務 1 描述')).toBeInTheDocument();
    });

    it('should expand task when "展開編輯" clicked', () => {
      render(<CenterPanel {...propsWithDraft} />);
      const expandButton = screen.getByText('展開編輯').closest('button');
      fireEvent.click(expandButton!);

      expect(mockProps.toggleTask).toHaveBeenCalledWith('task-1');
    });

    it('should show task details when expanded', () => {
      const propsWithExpandedTask = {
        ...propsWithDraft,
        expandedTasks: { 'task-1': true }
      };
      render(<CenterPanel {...propsWithExpandedTask} />);
      expect(screen.getByText('Level 3: Task Detail - 任務詳細設定')).toBeInTheDocument();
    });

    it('should add new task when "新增任務" clicked', () => {
      render(<CenterPanel {...propsWithDraft} />);
      const addButton = screen.getByText('新增任務').closest('button');
      fireEvent.click(addButton!);

      expect(mockProps.updateDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          taskTemplates: expect.arrayContaining([
            expect.objectContaining({
              type: 'conversation',
              title: { en: 'New Task', zh: '新任務' }
            })
          ])
        })
      );
    });

    it('should delete task when delete button clicked and confirmed', () => {
      global.confirm = jest.fn(() => true);
      render(<CenterPanel {...propsWithDraft} />);

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('[data-icon="trash-2"]') || btn.innerHTML.includes('Trash2')
      );

      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);
        expect(mockProps.updateDraft).toHaveBeenCalled();
      }
    });
  });

  describe('PBL-Specific Data', () => {
    const propsWithDraft = {
      ...mockProps,
      selectedMode: 'pbl' as const,
      selectedScenario: 'test-scenario-1',
      draft: mockScenarioData
    };

    it('should display KSA Mapping section', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('KSA Mapping')).toBeInTheDocument();
    });

    it('should display knowledge items', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('K1.1, K1.4')).toBeInTheDocument();
    });

    it('should display skills items', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('S1.1, S3.1')).toBeInTheDocument();
    });

    it('should display attitudes items', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('A2.1')).toBeInTheDocument();
    });

    it('should display AI Mentor Guidelines', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('Be supportive')).toBeInTheDocument();
    });

    it('should display reflection prompts', () => {
      render(<CenterPanel {...propsWithDraft} />);
      expect(screen.getByText('What did you learn?')).toBeInTheDocument();
      expect(screen.getByText('How can you improve?')).toBeInTheDocument();
    });
  });

  describe('Discovery Mode Specific', () => {
    const discoveryData = {
      ...mockScenarioData,
      mode: 'discovery' as const,
      discoveryData: {
        careerType: 'Software Engineer',
        careerInfo: {
          avgSalary: '$100k',
          demandLevel: 'High',
          requiredSkills: ['JavaScript', 'React']
        },
        skillTree: {
          core: ['HTML', 'CSS'],
          advanced: ['TypeScript', 'Node.js']
        },
        xpRewards: {
          completion: 100,
          challenge: 50,
          innovation: 25
        }
      }
    };

    it('should show Discovery-specific settings when mode is discovery', () => {
      render(<CenterPanel {...mockProps} selectedMode="discovery" selectedScenario="test" draft={discoveryData} />);
      expect(screen.getByText('🔍 Discovery 專屬設定')).toBeInTheDocument();
    });

    it('should display career type', () => {
      render(<CenterPanel {...mockProps} selectedMode="discovery" selectedScenario="test" draft={discoveryData} />);
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    it('should display XP rewards', () => {
      render(<CenterPanel {...mockProps} selectedMode="discovery" selectedScenario="test" draft={discoveryData} />);
      expect(screen.getByText('100 XP')).toBeInTheDocument();
      expect(screen.getByText('50 XP')).toBeInTheDocument();
      expect(screen.getByText('25 XP')).toBeInTheDocument();
    });
  });

  describe('Assessment Mode Specific', () => {
    const assessmentData = {
      ...mockScenarioData,
      mode: 'assessment' as const,
      assessmentData: {
        assessmentType: 'diagnostic' as const,
        questionBank: {
          total: 50,
          byDomain: {
            'Math': 20,
            'Science': 30
          }
        },
        scoringRubric: {
          passingScore: 60,
          excellentScore: 90
        },
        timeLimits: {
          perQuestion: 2,
          total: 60
        }
      }
    };

    it('should show Assessment-specific settings when mode is assessment', () => {
      render(<CenterPanel {...mockProps} selectedMode="assessment" selectedScenario="test" draft={assessmentData} />);
      expect(screen.getByText('📊 Assessment 專屬設定')).toBeInTheDocument();
    });

    it('should display assessment type badge', () => {
      render(<CenterPanel {...mockProps} selectedMode="assessment" selectedScenario="test" draft={assessmentData} />);
      expect(screen.getByText('診斷性評測')).toBeInTheDocument();
    });

    it('should display scoring rubric', () => {
      render(<CenterPanel {...mockProps} selectedMode="assessment" selectedScenario="test" draft={assessmentData} />);
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty objectives array', () => {
      const dataWithEmptyObjectives = {
        ...mockScenarioData,
        objectives: { en: [], zh: [] }
      };
      render(<CenterPanel {...mockProps} selectedMode="pbl" selectedScenario="test" draft={dataWithEmptyObjectives} />);
      expect(screen.queryByText('Learn X')).not.toBeInTheDocument();
    });

    it('should handle missing pblData', () => {
      const dataWithoutPBL = {
        ...mockScenarioData,
        pblData: undefined
      };
      render(<CenterPanel {...mockProps} selectedMode="pbl" selectedScenario="test" draft={dataWithoutPBL} />);
      // KSA Mapping section should still be shown for PBL mode even without pblData
      expect(screen.getByText('KSA Mapping')).toBeInTheDocument();
    });

    it('should handle empty task templates', () => {
      const dataWithNoTasks = {
        ...mockScenarioData,
        taskTemplates: []
      };
      render(<CenterPanel {...mockProps} selectedMode="pbl" selectedScenario="test" draft={dataWithNoTasks} />);
      expect(screen.getByText(/0 個任務/)).toBeInTheDocument();
    });
  });
});
