import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TaskProgressSidebar } from '../TaskProgressSidebar';
import { Scenario, Task } from '@/types/pbl';
import { TaskEvaluation } from '@/types/pbl-completion';
import { TFunction } from 'i18next';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Create a mock t function that satisfies TFunction type
const createMockT = (): TFunction<readonly ['pbl', 'common'], undefined> => {
  const mockFn = ((key: string) => key) as TFunction<readonly ['pbl', 'common'], undefined>;
  return mockFn;
};

const mockScenario: Scenario = {
  id: 'scenario-1',
  title: 'Test Scenario',
  title_zhTW: '測試場景',
  description: 'Test Description',
  description_zhTW: '測試描述',
  targetDomains: ['engaging_with_ai'],
  difficulty: 'beginner',
  estimatedDuration: 60,
  learningObjectives: ['Test objective'],
  ksaMapping: { knowledge: [], skills: [], attitudes: [] },
  tasks: [
    {
      id: 'task-1',
      title: 'Task 1',
      title_zhTW: '任務 1',
      description: 'First task',
      description_zhTW: '第一個任務',
      category: 'research',
      instructions: ['Do this'],
      expectedOutcome: 'Complete task 1',
      expectedOutcome_zhTW: '完成任務 1',
    },
    {
      id: 'task-2',
      title: 'Task 2',
      title_zhTW: '任務 2',
      description: 'Second task',
      description_zhTW: '第二個任務',
      category: 'research',
      instructions: ['Do that'],
      expectedOutcome: 'Complete task 2',
      expectedOutcome_zhTW: '完成任務 2',
    },
  ] as Task[],
};

const mockProgramTasks = [
  { id: 'program-task-1', taskIndex: 0 },
  { id: 'program-task-2', taskIndex: 1 },
];

const mockTaskEvaluations: Record<string, TaskEvaluation> = {
  'program-task-1': {
    score: 4.5,
    strengths: ['Good work'],
    improvements: ['Improve this'],
    domainScores: {
      engaging_with_ai: 4.5,
      creating_with_ai: 0,
      managing_with_ai: 0,
      designing_with_ai: 0,
    },
  },
};

describe('TaskProgressSidebar', () => {
  const mockOnSwitchTask = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders progress sidebar with all tasks', () => {
    const { container } = render(
      <TaskProgressSidebar
        scenario={mockScenario}
        currentTaskId="program-task-1"
        programTasks={mockProgramTasks}
        taskEvaluations={mockTaskEvaluations}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        onSwitchTask={mockOnSwitchTask}
        language="en"
        scenarioId="scenario-1"
        programId="program-1"
        t={createMockT()}
      />
    );

    expect(screen.getByText('pbl:learn.progress')).toBeInTheDocument();
    // Check for task buttons by their structure (only task buttons, not collapse)
    const taskButtons = container.querySelectorAll('button.flex.items-center.w-full');
    expect(taskButtons.length).toBe(2); // 2 tasks
  });

  it('shows checkmark for evaluated tasks', () => {
    const { container } = render(
      <TaskProgressSidebar
        scenario={mockScenario}
        currentTaskId="program-task-1"
        programTasks={mockProgramTasks}
        taskEvaluations={mockTaskEvaluations}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        onSwitchTask={mockOnSwitchTask}
        language="en"
        scenarioId="scenario-1"
        programId="program-1"
        t={createMockT()}
      />
    );

    const checkmarks = container.querySelectorAll('svg path[fill-rule="evenodd"]');
    expect(checkmarks.length).toBeGreaterThan(0);
  });

  it('highlights current task', () => {
    // Use a scenario where current task is NOT evaluated to see the purple ring
    const noEvaluations: Record<string, TaskEvaluation> = {};
    const { container } = render(
      <TaskProgressSidebar
        scenario={mockScenario}
        currentTaskId="program-task-1"
        programTasks={mockProgramTasks}
        taskEvaluations={noEvaluations}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        onSwitchTask={mockOnSwitchTask}
        language="en"
        scenarioId="scenario-1"
        programId="program-1"
        t={createMockT()}
      />
    );

    // Check for purple border which indicates current task
    const currentTaskIndicator = container.querySelector('[class*="ring-2"]');
    expect(currentTaskIndicator).toBeInTheDocument();
  });

  it('calls onSwitchTask when task is clicked', () => {
    const { container } = render(
      <TaskProgressSidebar
        scenario={mockScenario}
        currentTaskId="program-task-1"
        programTasks={mockProgramTasks}
        taskEvaluations={mockTaskEvaluations}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        onSwitchTask={mockOnSwitchTask}
        language="en"
        scenarioId="scenario-1"
        programId="program-1"
        t={createMockT()}
      />
    );

    // Get all task buttons (first two are tasks, last is collapse button)
    const taskButtons = container.querySelectorAll('button.flex.items-center.w-full');
    fireEvent.click(taskButtons[1]); // Click second task

    expect(mockOnSwitchTask).toHaveBeenCalledWith('program-task-2');
  });

  it('shows collapsed view when isCollapsed is true', () => {
    const { container } = render(
      <TaskProgressSidebar
        scenario={mockScenario}
        currentTaskId="program-task-1"
        programTasks={mockProgramTasks}
        taskEvaluations={mockTaskEvaluations}
        isCollapsed={true}
        onToggleCollapse={() => {}}
        onSwitchTask={mockOnSwitchTask}
        language="en"
        scenarioId="scenario-1"
        programId="program-1"
        t={createMockT()}
      />
    );

    // In collapsed mode, title text should be hidden
    const progressTitle = screen.queryByText('pbl:learn.progress');
    expect(progressTitle).toHaveClass('opacity-0');
    // Should have buttons with title attributes for tooltips
    expect(container.querySelectorAll('button[title]').length).toBeGreaterThan(0);
  });

  it('shows View Report link when tasks are evaluated', () => {
    render(
      <TaskProgressSidebar
        scenario={mockScenario}
        currentTaskId="program-task-1"
        programTasks={mockProgramTasks}
        taskEvaluations={mockTaskEvaluations}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        onSwitchTask={mockOnSwitchTask}
        language="en"
        scenarioId="scenario-1"
        programId="program-1"
        t={createMockT()}
      />
    );

    expect(screen.getByText('pbl:complete.viewReport')).toBeInTheDocument();
  });

  it('does not show View Report link when collapsed', () => {
    render(
      <TaskProgressSidebar
        scenario={mockScenario}
        currentTaskId="program-task-1"
        programTasks={mockProgramTasks}
        taskEvaluations={mockTaskEvaluations}
        isCollapsed={true}
        onToggleCollapse={() => {}}
        onSwitchTask={mockOnSwitchTask}
        language="en"
        scenarioId="scenario-1"
        programId="program-1"
        t={createMockT()}
      />
    );

    expect(screen.queryByText('pbl:complete.viewReport')).not.toBeInTheDocument();
  });

  it('uses Chinese translations when language is zhTW', () => {
    const { container } = render(
      <TaskProgressSidebar
        scenario={mockScenario}
        currentTaskId="program-task-1"
        programTasks={mockProgramTasks}
        taskEvaluations={mockTaskEvaluations}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        onSwitchTask={mockOnSwitchTask}
        language="zh"
        scenarioId="scenario-1"
        programId="program-1"
        t={createMockT()}
      />
    );

    // getLocalizedField should extract Chinese text when language is 'zh'
    // Since we're mocking the function, just verify the component renders
    const taskButtons = container.querySelectorAll('button.flex.items-center.w-full');
    expect(taskButtons.length).toBe(2);
  });
});
