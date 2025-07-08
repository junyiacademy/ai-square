'use client';

import { useState, useEffect } from 'react';
import { 
  mockProjects, 
  mockAssessmentOptions, 
  mockDiscoveryOptions,
  mockAdaptiveAssessmentOptions,
  mockCertificationOptions,
  generateMockUser,
  mockScenarioResults
} from '@/lib/v2/utils/mock-data';
import { ScenarioHierarchyView } from './components/ScenarioHierarchyView';
import { ScenarioWithHierarchy, Project } from '@/lib/v2/types';
import { Plus, RefreshCw, Layers, Search, FileCheck, Zap } from 'lucide-react';

// Mock services for demonstration
import { ScenarioService } from '@/lib/v2/services/scenario-service';
import { PBLServiceV2 } from '@/lib/v2/services/pbl-service';
import { DiscoveryServiceV2 } from '@/lib/v2/services/discovery-service';
import { AssessmentServiceV2 } from '@/lib/v2/services/assessment-service';
import { DatabaseFactory } from '@/lib/v2/utils/database';

export default function V2TestPage() {
  const [scenarios, setScenarios] = useState<ScenarioWithHierarchy[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pbl' | 'discovery' | 'assessment'>('pbl');

  // Initialize mock database connection
  const db = new DatabaseFactory().create({ database: 'ai-square-v2-test' });
  const scenarioService = new ScenarioService(db);
  const pblService = new PBLServiceV2(db);
  const discoveryService = new DiscoveryServiceV2(db);
  const assessmentService = new AssessmentServiceV2(db);

  // Load existing scenarios on mount
  useEffect(() => {
    loadMockScenarios();
  }, []);

  const loadMockScenarios = () => {
    // For demonstration, we'll use the mock scenario results
    setScenarios([
      mockScenarioResults.pbl,
      mockScenarioResults.discovery,
      mockScenarioResults.assessment
    ]);
  };

  const createPBLScenario = async () => {
    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate PBL scenario creation
      const newScenario = await pblService.createTrackFromProject({
        project: selectedProject,
        userId: generateMockUser().id,
        language: 'en'
      });

      // For demo purposes, use mock data
      const mockScenario = {
        ...mockScenarioResults.pbl,
        id: `scenario_pbl_${Date.now()}`,
        title: selectedProject.title,
        description: selectedProject.description,
        created_at: new Date(),
        updated_at: new Date()
      };

      setScenarios([...scenarios, mockScenario]);
      setSelectedProject(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PBL scenario');
    } finally {
      setLoading(false);
    }
  };

  const createDiscoveryScenario = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate Discovery scenario creation
      const mockScenario = {
        ...mockScenarioResults.discovery,
        id: `scenario_discovery_${Date.now()}`,
        title: `Exploring ${mockDiscoveryOptions.topic}`,
        created_at: new Date(),
        updated_at: new Date()
      };

      setScenarios([...scenarios, mockScenario]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Discovery scenario');
    } finally {
      setLoading(false);
    }
  };

  const createAssessmentScenario = async (type: 'quick' | 'adaptive' | 'certification') => {
    setLoading(true);
    setError(null);

    try {
      let mockScenario: ScenarioWithHierarchy;
      
      switch (type) {
        case 'quick':
          mockScenario = {
            ...mockScenarioResults.assessment,
            id: `scenario_assessment_${Date.now()}`,
            title: mockAssessmentOptions.title,
            description: mockAssessmentOptions.description,
            created_at: new Date(),
            updated_at: new Date()
          };
          break;
        case 'adaptive':
          mockScenario = {
            ...mockScenarioResults.assessment,
            id: `scenario_adaptive_${Date.now()}`,
            title: mockAdaptiveAssessmentOptions.title,
            description: mockAdaptiveAssessmentOptions.description,
            created_at: new Date(),
            updated_at: new Date(),
            metadata: {
              assessment_type: 'adaptive',
              ...mockAdaptiveAssessmentOptions
            }
          };
          break;
        case 'certification':
          mockScenario = {
            ...mockScenarioResults.assessment,
            id: `scenario_cert_${Date.now()}`,
            title: `${mockCertificationOptions.certification_type} Certification`,
            description: 'Comprehensive certification assessment',
            created_at: new Date(),
            updated_at: new Date(),
            metadata: {
              assessment_type: 'certification',
              ...mockCertificationOptions
            }
          };
          break;
        default:
          throw new Error('Unknown assessment type');
      }

      setScenarios([...scenarios, mockScenario]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Assessment scenario');
    } finally {
      setLoading(false);
    }
  };

  const clearScenarios = () => {
    setScenarios([]);
    setError(null);
  };

  const handleTaskClick = (taskId: string) => {
    console.log('Task clicked:', taskId);
    // In a real implementation, this would navigate to the task page
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">V2 System Test Page</h1>
          <p className="text-gray-600">
            Test the flexible scenario architecture with PBL, Discovery, and Assessment structures
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Creation Controls */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Scenarios</h2>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            <button
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'pbl' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('pbl')}
            >
              <Layers className="w-4 h-4 inline-block mr-2" />
              PBL (Standard)
            </button>
            <button
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'discovery' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('discovery')}
            >
              <Search className="w-4 h-4 inline-block mr-2" />
              Discovery (Single Program)
            </button>
            <button
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'assessment' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('assessment')}
            >
              <FileCheck className="w-4 h-4 inline-block mr-2" />
              Assessment (Direct Task)
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === 'pbl' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Standard PBL Structure (Scenario → Programs → Tasks)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Creates a traditional learning path with multiple programs containing various tasks.
                </p>
                
                {/* Project Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select a Learning Project:
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedProject?.id || ''}
                    onChange={(e) => {
                      const project = mockProjects.find(p => p.id === e.target.value);
                      setSelectedProject(project || null);
                    }}
                  >
                    <option value="">Choose a project...</option>
                    {mockProjects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.title} ({project.difficulty})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProject && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">{selectedProject.description}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Duration: {selectedProject.estimated_duration} min | 
                      Domains: {selectedProject.target_domains.join(', ')}
                    </p>
                  </div>
                )}

                <button
                  onClick={createPBLScenario}
                  disabled={loading || !selectedProject}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create PBL Scenario
                </button>
              </div>
            )}

            {activeTab === 'discovery' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Discovery Structure (Scenario → Multiple Scenario Programs → Tasks)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Experience different career scenarios through role-playing programs.
                </p>
                
                <div className="mb-4 p-3 bg-green-50 rounded-md">
                  <p className="text-sm font-medium text-green-800">
                    Career: {mockDiscoveryOptions.topic}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {mockDiscoveryOptions.user_context}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    3 Scenarios: Daily Routine, Challenge, Career Growth
                  </p>
                </div>

                <button
                  onClick={createDiscoveryScenario}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start Discovery Scenario
                </button>
              </div>
            )}

            {activeTab === 'assessment' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Assessment Structure (Scenario → Virtual Program → Question Tasks)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Creates assessments with direct task access for quick evaluation.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => createAssessmentScenario('quick')}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Quick Assessment (5 questions)
                  </button>
                  
                  <button
                    onClick={() => createAssessmentScenario('adaptive')}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Adaptive Assessment (AI-adjusted difficulty)
                  </button>
                  
                  <button
                    onClick={() => createAssessmentScenario('certification')}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Certification Assessment (Comprehensive)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scenario List Controls */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Created Scenarios ({scenarios.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={loadMockScenarios}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset to Defaults
            </button>
            <button
              onClick={clearScenarios}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Scenario Display */}
        <div className="space-y-6">
          {scenarios.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              <p>No scenarios created yet. Use the controls above to create different scenario types.</p>
            </div>
          ) : (
            scenarios.map((scenario) => (
              <ScenarioHierarchyView 
                key={scenario.id} 
                scenario={scenario} 
                onTaskClick={handleTaskClick}
              />
            ))
          )}
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-700">Creating scenario...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}