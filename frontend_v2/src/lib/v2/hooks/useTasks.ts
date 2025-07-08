/**
 * V2 useTasks Hook
 * Manages tasks within a program
 */

import { useState, useEffect, useCallback } from 'react';
import { Task, Evaluation } from '@/lib/v2/interfaces/base';

interface UseTasksOptions {
  programId?: string;
  autoActivate?: boolean;
}

interface UseTasksReturn {
  tasks: Task[];
  activeTask: Task | null;
  completedCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setActiveTask: (task: Task) => void;
  submitTask: (taskId: string, response: any) => Promise<Evaluation>;
}

export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!options.programId) {
      setTasks([]);
      setActiveTask(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/v2/tasks?programId=${options.programId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data.tasks || []);
      
      // Set active task
      const active = data.active || (options.autoActivate ? data.tasks[0] : null);
      setActiveTask(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.programId, options.autoActivate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const submitTask = async (taskId: string, response: any): Promise<Evaluation> => {
    try {
      setError(null);

      const res = await fetch(`/api/v2/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit task');
      }

      const data = await res.json();
      
      // Refresh tasks to update statuses
      await fetchTasks();
      
      // If there's a next task, set it as active
      if (data.nextTask) {
        setActiveTask(data.nextTask);
      }
      
      return data.evaluation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit task';
      setError(message);
      throw new Error(message);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return {
    tasks,
    activeTask,
    completedCount,
    loading,
    error,
    refresh: fetchTasks,
    setActiveTask,
    submitTask
  };
}