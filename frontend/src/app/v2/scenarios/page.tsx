'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScenarioWithHierarchy } from '@/lib/v2/types';
import { Layers, Search, FileCheck, Plus, ChevronRight } from 'lucide-react';

type ScenarioType = 'pbl' | 'discovery' | 'assessment';

interface GroupedScenarios {
  assessment: ScenarioWithHierarchy[];
  pbl: ScenarioWithHierarchy[];
  discovery: ScenarioWithHierarchy[];
}

export default function ScenariosPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<GroupedScenarios>({
    assessment: [],
    pbl: [],
    discovery: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ScenarioType | 'all'>('all');

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v2/scenarios');
      if (!response.ok) {
        throw new Error('Failed to load scenarios');
      }
      const data = await response.json();
      
      // Group scenarios by type
      const grouped: GroupedScenarios = {
        assessment: [],
        pbl: [],
        discovery: []
      };
      
      data.scenarios.forEach((scenario: ScenarioWithHierarchy) => {
        const type = scenario.metadata?.learning_type || 'pbl';
        if (type in grouped) {
          grouped[type as ScenarioType].push(scenario);
        }
      });
      
      setScenarios(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: ScenarioType) => {
    switch (type) {
      case 'pbl':
        return <Layers className="w-5 h-5" />;
      case 'discovery':
        return <Search className="w-5 h-5" />;
      case 'assessment':
        return <FileCheck className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: ScenarioType) => {
    switch (type) {
      case 'pbl':
        return 'bg-blue-500 text-white';
      case 'discovery':
        return 'bg-green-500 text-white';
      case 'assessment':
        return 'bg-purple-500 text-white';
    }
  };

  const getTypeBgColor = (type: ScenarioType) => {
    switch (type) {
      case 'pbl':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'discovery':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'assessment':
        return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
    }
  };

  const getTypeTitle = (type: ScenarioType) => {
    switch (type) {
      case 'assessment':
        return 'Skills Assessment';
      case 'pbl':
        return 'Problem-Based Learning';
      case 'discovery':
        return 'Career Discovery';
    }
  };

  const filteredScenarios = selectedType === 'all' 
    ? [...scenarios.assessment, ...scenarios.pbl, ...scenarios.discovery]
    : scenarios[selectedType];

  const navigateToScenario = (scenario: ScenarioWithHierarchy) => {
    router.push(`/v2/scenarios/${scenario.id}`);
  };

  const createNewScenario = (type: ScenarioType) => {
    router.push(`/v2/scenarios/new?type=${type}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 text-center">
          <p className="text-xl font-semibold mb-2">Error loading scenarios</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Scenarios</h1>
          <p className="text-gray-600">Choose your learning path from our AI-powered scenarios</p>
        </div>

        {/* Type Filter */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Scenarios
          </button>
          {(['assessment', 'pbl', 'discovery'] as ScenarioType[]).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                selectedType === type
                  ? getTypeColor(type)
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {getTypeIcon(type)}
              {getTypeTitle(type)}
            </button>
          ))}
        </div>

        {/* Scenario Types Grid */}
        {selectedType === 'all' && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {(['assessment', 'pbl', 'discovery'] as ScenarioType[]).map(type => (
              <div key={type} className="bg-white rounded-lg shadow-md p-6">
                <div className={`inline-flex p-3 rounded-lg ${getTypeColor(type)} mb-4`}>
                  {getTypeIcon(type)}
                </div>
                <h2 className="text-xl font-semibold mb-2">{getTypeTitle(type)}</h2>
                <p className="text-gray-600 mb-4">
                  {type === 'assessment' && 'Test your knowledge and skills'}
                  {type === 'pbl' && 'Structured learning through real-world problems'}
                  {type === 'discovery' && 'Explore different career paths and scenarios'}
                </p>
                <div className="text-sm text-gray-500 mb-4">
                  {scenarios[type].length} scenarios available
                </div>
                <button
                  onClick={() => createNewScenario(type)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Scenarios List */}
        <div className="space-y-4">
          {filteredScenarios.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 mb-4">No scenarios found</p>
              {selectedType !== 'all' && (
                <button
                  onClick={() => createNewScenario(selectedType as ScenarioType)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create First {getTypeTitle(selectedType as ScenarioType)} Scenario
                </button>
              )}
            </div>
          ) : (
            filteredScenarios.map(scenario => {
              const type = (scenario.metadata?.learning_type as ScenarioType) || 'pbl';
              const programCount = scenario.programs?.length || 0;
              const taskCount = scenario.programs?.reduce((sum, prog) => sum + (prog.tasks?.length || 0), 0) || 0;
              
              return (
                <div
                  key={scenario.id}
                  onClick={() => navigateToScenario(scenario)}
                  className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all border-2 ${getTypeBgColor(type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`inline-flex p-2 rounded-lg ${getTypeColor(type)}`}>
                          {getTypeIcon(type)}
                        </div>
                        <h3 className="text-xl font-semibold">{scenario.title}</h3>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{scenario.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{programCount} programs</span>
                        <span>•</span>
                        <span>{taskCount} tasks</span>
                        <span>•</span>
                        <span>{scenario.metadata?.difficulty || 'intermediate'}</span>
                        {scenario.metadata?.language && (
                          <>
                            <span>•</span>
                            <span>{scenario.metadata.language}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}