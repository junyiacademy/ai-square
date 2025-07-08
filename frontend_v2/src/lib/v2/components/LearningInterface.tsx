/**
 * V2 Learning Interface Component
 * Main interface for PBL, Discovery, and Assessment scenarios
 */

import React, { useState } from 'react';
import { Scenario, Program, Task, Evaluation } from '@/lib/v2/interfaces/base';
import { ProgramSelector } from './ProgramSelector';
import { TaskList } from './TaskList';
import { TaskPanel } from './TaskPanel';
import { ArrowLeft, Menu, X } from 'lucide-react';
import clsx from 'clsx';

interface LearningInterfaceProps {
  scenario: Scenario;
  programs: Program[];
  tasks: Task[];
  activeProgram?: Program;
  activeTask?: Task;
  onSelectProgram: (program: Program) => void;
  onSelectTask: (task: Task) => void;
  onSubmitResponse: (taskId: string, response: any) => Promise<Evaluation>;
  onBack?: () => void;
}

export function LearningInterface({
  scenario,
  programs,
  tasks,
  activeProgram,
  activeTask,
  onSelectProgram,
  onSelectTask,
  onSubmitResponse,
  onBack
}: LearningInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get scenario type label
  const getScenarioTypeLabel = () => {
    switch (scenario.type) {
      case 'pbl':
        return 'Problem-Based Learning';
      case 'discovery':
        return 'Career Discovery';
      case 'assessment':
        return 'Assessment';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>

              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {scenario.title}
                </h1>
                <p className="text-sm text-gray-500">{getScenarioTypeLabel()}</p>
              </div>
            </div>

            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className={clsx(
          'bg-white border-r border-gray-200 overflow-y-auto transition-all',
          {
            'w-80': sidebarOpen,
            'w-0': !sidebarOpen,
            'absolute inset-y-0 left-0 z-30 lg:relative': true,
            'translate-x-0': mobileMenuOpen,
            '-translate-x-full lg:translate-x-0': !mobileMenuOpen
          }
        )}>
          <div className="p-4 space-y-6">
            {/* Program Selector */}
            <ProgramSelector
              programs={programs}
              activeProgram={activeProgram}
              onSelect={(program) => {
                onSelectProgram(program);
                setMobileMenuOpen(false);
              }}
              scenarioType={scenario.type}
            />

            {/* Task List */}
            {activeProgram && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Tasks
                </h3>
                <TaskList
                  tasks={tasks}
                  activeTask={activeTask}
                  onSelectTask={(task) => {
                    onSelectTask(task);
                    setMobileMenuOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {activeTask ? (
            <TaskPanel
              task={activeTask}
              program={activeProgram!}
              scenario={scenario}
              onSubmit={onSubmitResponse}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {activeProgram ? 'Select a task to begin' : 'Select a program to start'}
                </h2>
                <p className="text-gray-600">
                  {activeProgram 
                    ? 'Choose a task from the sidebar to continue your learning journey'
                    : 'Choose a learning stage or scenario to get started'}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}