'use client';

import { FileText, Trash2, Plus } from 'lucide-react';
import { TaskDetail } from './TaskDetail';

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

export interface TaskTemplate {
  id: string;
  title: Record<string, string>;
  type: string;
  description?: Record<string, string>;
  content?: TaskContent;
  [key: string]: unknown;
}

interface TaskListProps {
  tasks: TaskTemplate[];
  language: string;
  expandedTasks: Record<string, boolean>;
  editingField: string | null;
  editingValue: string;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
  onStartEditing: (field: string, value: string) => void;
  onEditingValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export function TaskList({
  tasks,
  language,
  expandedTasks,
  editingField,
  editingValue,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onStartEditing,
  onEditingValueChange,
  onSaveEdit,
  onCancelEdit
}: TaskListProps) {
  return (
    <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border-2 border-green-200">
      <h2 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
        <FileText className="h-6 w-6" />
        Level 2: Task List - 任務列表 ({tasks.length} 個任務)
      </h2>

      <div className="space-y-3">
        {tasks.map((task, index) => (
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
                onClick={() => onToggleTask(task.id)}
                className="ml-3 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
              >
                {expandedTasks[task.id] ? '收合' : '展開編輯'}
              </button>
              <button
                onClick={() => {
                  if (confirm('確定要刪除此任務嗎？')) {
                    onDeleteTask(task.id);
                  }
                }}
                className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Task Detail (Expandable) */}
            {expandedTasks[task.id] && (
              <TaskDetail
                task={task}
                language={language}
                editingField={editingField}
                editingValue={editingValue}
                onStartEditing={onStartEditing}
                onEditingValueChange={onEditingValueChange}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
              />
            )}
          </div>
        ))}

        {/* Add Task Button */}
        <button
          onClick={onAddTask}
          className="w-full p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5 text-green-600" />
          <span className="text-green-700 font-medium">新增任務</span>
        </button>
      </div>
    </div>
  );
}
