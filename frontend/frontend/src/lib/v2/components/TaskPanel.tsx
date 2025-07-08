'use client';

import { useTranslation } from 'react-i18next';
import { CheckCircle, Circle, PlayCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  order?: number;
}

interface TaskPanelProps {
  tasks: Task[];
  currentTaskId: string | null;
  taskStatuses: Record<string, 'pending' | 'in-progress' | 'completed'>;
  onTaskSelect: (taskId: string) => void;
}

export function TaskPanel({ tasks, currentTaskId, taskStatuses, onTaskSelect }: TaskPanelProps) {
  const { t, i18n } = useTranslation();

  const getLocalizedField = (obj: any, field: string) => {
    const lang = i18n.language;
    const fieldWithLang = `${field}_${lang}`;
    return obj[fieldWithLang] || obj[field] || '';
  };

  const getStatusIcon = (taskId: string) => {
    const status = taskStatuses[taskId] || 'pending';
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'in-progress':
        return <PlayCircle className="text-blue-500" size={20} />;
      default:
        return <Circle className="text-gray-400" size={20} />;
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">
        {t('v2.tasks.title', 'Learning Tasks')}
      </h2>
      
      <div className="space-y-2">
        {sortedTasks.map((task, index) => {
          const status = taskStatuses[task.id] || 'pending';
          const isActive = task.id === currentTaskId;
          
          return (
            <div
              key={task.id}
              onClick={() => onTaskSelect(task.id)}
              className={`
                flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all
                ${isActive 
                  ? 'bg-blue-50 border-2 border-blue-300' 
                  : 'hover:bg-gray-50 border-2 border-transparent'
                }
                ${status === 'completed' ? 'opacity-75' : ''}
              `}
            >
              <div className="mt-1">
                {getStatusIcon(task.id)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-500">
                    {t('v2.task', 'Task')} {index + 1}
                  </span>
                  {status === 'completed' && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      {t('v2.completed', 'Completed')}
                    </span>
                  )}
                </div>
                
                <h3 className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                  {getLocalizedField(task, 'title')}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{t('v2.progress', 'Progress')}</span>
          <span className="font-medium">
            {Object.values(taskStatuses).filter(s => s === 'completed').length} / {tasks.length}
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
            style={{
              width: `${(Object.values(taskStatuses).filter(s => s === 'completed').length / tasks.length) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}