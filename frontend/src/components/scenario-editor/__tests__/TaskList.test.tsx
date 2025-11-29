import { render, screen, fireEvent } from '@testing-library/react';
import { TaskList } from '../TaskList';

describe('TaskList', () => {
  const mockTasks = [
    {
      id: 'task-1',
      title: { en: 'Task 1', zh: '任務一' },
      type: 'conversation',
      description: { en: 'Description 1', zh: '描述一' },
      content: {}
    },
    {
      id: 'task-2',
      title: { en: 'Task 2', zh: '任務二' },
      type: 'evaluation',
      description: { en: 'Description 2', zh: '描述二' },
      content: {}
    }
  ];

  const defaultProps = {
    tasks: mockTasks,
    language: 'zh',
    expandedTasks: {},
    editingField: null,
    editingValue: '',
    onToggleTask: jest.fn(),
    onDeleteTask: jest.fn(),
    onAddTask: jest.fn(),
    onStartEditing: jest.fn(),
    onEditingValueChange: jest.fn(),
    onSaveEdit: jest.fn(),
    onCancelEdit: jest.fn()
  };

  it('displays task count in header', () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getByText(/2 個任務/)).toBeInTheDocument();
  });

  it('renders all tasks', () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getByText('任務一')).toBeInTheDocument();
    expect(screen.getByText('任務二')).toBeInTheDocument();
  });

  it('displays task descriptions', () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getByText('描述一')).toBeInTheDocument();
    expect(screen.getByText('描述二')).toBeInTheDocument();
  });

  it('calls onToggleTask when expand button is clicked', () => {
    render(<TaskList {...defaultProps} />);
    const expandButtons = screen.getAllByText('展開編輯');
    fireEvent.click(expandButtons[0]);
    expect(defaultProps.onToggleTask).toHaveBeenCalledWith('task-1');
  });

  it('calls onAddTask when add button is clicked', () => {
    render(<TaskList {...defaultProps} />);
    const addButton = screen.getByText('新增任務');
    fireEvent.click(addButton);
    expect(defaultProps.onAddTask).toHaveBeenCalled();
  });

  it('shows delete confirmation before deleting task', () => {
    window.confirm = jest.fn(() => true);
    render(<TaskList {...defaultProps} />);
    const deleteButtons = screen.getAllByRole('button', { name: '' });
    const deleteButton = deleteButtons.find(btn => btn.querySelector('svg'));
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(window.confirm).toHaveBeenCalled();
      expect(defaultProps.onDeleteTask).toHaveBeenCalledWith('task-1');
    }
  });

  it('renders task detail when expanded', () => {
    const expandedProps = {
      ...defaultProps,
      expandedTasks: { 'task-1': true }
    };
    render(<TaskList {...expandedProps} />);
    expect(screen.getByText('Level 3: Task Detail - 任務詳細設定')).toBeInTheDocument();
  });
});
