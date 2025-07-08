'use client';

import { useState } from 'react';
import { useProgram } from '@/lib/v2/hooks/useProgram';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Clock, ChevronRight, Loader2 } from 'lucide-react';

interface ProgramSelectorProps {
  scenarioId: string;
}

export function ProgramSelector({ scenarioId }: ProgramSelectorProps) {
  const { programs, loading, error, createProgram } = useProgram(scenarioId);
  const { t } = useTranslation();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleCreateProgram = async () => {
    setCreating(true);
    try {
      const newProgram = await createProgram();
      if (newProgram) {
        router.push(`/v2/scenarios/${scenarioId}/programs/${newProgram.id}`);
      }
    } catch (err) {
      console.error('Failed to create program:', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        {t('v2.error.loadPrograms', 'Failed to load programs')}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <button
          onClick={handleCreateProgram}
          disabled={creating}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 px-6 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Plus size={20} />
          )}
          {t('v2.programs.createNew', 'Start New Learning Session')}
        </button>
      </div>

      {programs.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            {t('v2.programs.existing', 'Continue Learning')}
          </h2>
          
          <div className="space-y-3">
            {programs.map((program) => (
              <div
                key={program.id}
                onClick={() => router.push(`/v2/scenarios/${scenarioId}/programs/${program.id}`)}
                className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-medium group-hover:text-blue-600 transition-colors">
                        {t('v2.programs.session', 'Session')} #{program.sessionNumber || programs.indexOf(program) + 1}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        program.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {program.status === 'completed' 
                          ? t('v2.status.completed', 'Completed')
                          : t('v2.status.inProgress', 'In Progress')
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{new Date(program.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{program.completedTasks || 0}/{program.totalTasks || 0} {t('v2.tasks', 'tasks')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight className="text-gray-400 group-hover:text-blue-600 transition-colors" size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}