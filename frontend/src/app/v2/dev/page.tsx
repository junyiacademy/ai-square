'use client';

import { useState } from 'react';
import { Database, FileJson, History, ClipboardList } from 'lucide-react';

export default function DevDataViewerPage() {
  const [activeSection, setActiveSection] = useState<'demo' | 'assessment' | 'pbl' | 'discovery'>('demo');
  const [activeTab, setActiveTab] = useState<'scenarios' | 'completion' | 'history' | 'raw'>('scenarios');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Section configurations
  const sections = [
    { id: 'demo' as const, label: 'General Demo', icon: Database },
    { id: 'assessment' as const, label: 'Assessment', icon: ClipboardList },
    { id: 'pbl' as const, label: 'PBL', icon: FileJson },
    { id: 'discovery' as const, label: 'Discovery', icon: History }
  ];

  const tabs = [
    { id: 'scenarios' as const, label: 'Scenarios' },
    { id: 'completion' as const, label: 'Completion Template' },
    { id: 'history' as const, label: 'History' },
    { id: 'raw' as const, label: 'SPT Log / Raw Data' }
  ];

  // Handlers for different data types
  const loadData = async () => {
    setLoading(true);
    setData(null);
    
    try {
      let result = null;
      
      if (activeSection === 'assessment') {
        if (activeTab === 'scenarios') {
          // Load assessment types
          result = {
            assessments: [
              { id: 'comprehensive', title: 'Comprehensive AI Literacy Assessment', questions: 30 },
              { id: 'quick-literacy', title: 'Quick AI Literacy Check', questions: 10 },
              { id: 'engaging-domain', title: 'Engaging with AI - Domain Assessment', questions: 15 },
              { id: 'creating-domain', title: 'Creating with AI - Domain Assessment', questions: 18 },
              { id: 'managing-domain', title: 'Managing with AI - Domain Assessment', questions: 15 },
              { id: 'adaptive-personalized', title: 'Adaptive AI Literacy Assessment', questions: 20 }
            ]
          };
        } else if (activeTab === 'completion') {
          // Show completion data structure
          result = {
            structure: {
              completedAt: 'Date',
              timeSpent: 'number (seconds)',
              overallScore: 'number (0-100)',
              performance: 'excellent | good | satisfactory | needs-improvement',
              domainScores: {
                engaging_with_ai: 'number (0-100)',
                creating_with_ai: 'number (0-100)',
                managing_with_ai: 'number (0-100)',
                designing_with_ai: 'number (0-100)'
              },
              ksaScores: {
                knowledge: 'number (0-100)',
                skills: 'number (0-100)',
                attitudes: 'number (0-100)'
              },
              level: 'beginner | intermediate | advanced | expert',
              correctAnswers: 'number',
              totalQuestions: 'number',
              recommendations: ['string array'],
              detailedAnalysis: {
                strengths: ['string array'],
                weaknesses: ['string array'],
                opportunities: ['string array']
              }
            }
          };
        } else if (activeTab === 'history') {
          // Load assessment history
          const response = await fetch('/api/v2/assessment/history');
          const data = await response.json();
          result = data;
        } else if (activeTab === 'raw') {
          // Load raw GCS data structure
          result = {
            storageStructure: {
              bucket: 'ai-square-db',
              paths: [
                'v2/assessments/{userEmail}/{sessionId}.json',
                'v2/user-history/{userEmail}.json'
              ],
              sessionSchema: {
                id: 'string',
                userEmail: 'string',
                sessionType: 'comprehensive | quick | domain | adaptive',
                startedAt: 'ISO string',
                completedAt: 'ISO string',
                status: 'in-progress | completed | abandoned',
                config: {
                  totalQuestions: 'number',
                  passingScore: 'number',
                  domains: ['array of domain strings'],
                  language: 'string'
                },
                responses: [{
                  questionId: 'string',
                  answer: 'string | null',
                  timeSpent: 'number',
                  timestamp: 'ISO string'
                }],
                results: '(populated when completed)'
              }
            }
          };
        }
      } else if (activeSection === 'pbl') {
        if (activeTab === 'scenarios') {
          // Load PBL scenarios
          const response = await fetch('/api/pbl/scenarios?lang=en');
          const data = await response.json();
          result = data;
        } else if (activeTab === 'completion') {
          result = {
            structure: {
              journeyMilestones: [{
                title: 'string',
                description: 'string',
                completed: 'boolean',
                timestamp: 'Date (optional)'
              }],
              problemsSolved: 'number',
              collaborationScore: 'number (optional)',
              appliedConcepts: ['string array'],
              reflections: ['string array (optional)']
            }
          };
        } else if (activeTab === 'history') {
          result = {
            note: 'PBL history would show completed scenarios and programs',
            mockData: {
              scenarios: ['Sustainable City AI', 'Health Diagnosis Assistant'],
              completedPrograms: 5,
              totalTimeSpent: '12 hours'
            }
          };
        } else if (activeTab === 'raw') {
          result = {
            storageStructure: {
              bucket: 'ai-square-db',
              paths: [
                'scenarios/{scenarioId}/users/{userEmail}/programs/{programId}.json',
                'scenarios/{scenarioId}/users/{userEmail}/tasks/{taskId}.json'
              ]
            }
          };
        }
      } else if (activeSection === 'discovery') {
        if (activeTab === 'scenarios') {
          result = {
            discoveries: [
              { id: 'ai-engineer', title: 'AI Engineer Career Path', modules: 8 },
              { id: 'data-scientist', title: 'Data Scientist Journey', modules: 10 },
              { id: 'ai-product-manager', title: 'AI Product Manager Track', modules: 6 }
            ]
          };
        } else if (activeTab === 'completion') {
          result = {
            structure: {
              careerFit: {
                role: 'string',
                fitScore: 'number (0-100)',
                requiredSkills: ['string array'],
                matchedSkills: ['string array'],
                gaps: ['string array']
              },
              exploredAreas: ['string array'],
              interestLevel: 'low | medium | high | very-high',
              pathwayRecommendations: [{
                title: 'string',
                description: 'string',
                difficulty: 'beginner | intermediate | advanced',
                estimatedTime: 'string'
              }]
            }
          };
        } else if (activeTab === 'history') {
          result = {
            note: 'Discovery history would show explored career paths',
            mockData: {
              exploredPaths: ['AI Engineer', 'Data Scientist'],
              totalExplorations: 3,
              bestFit: 'AI Engineer (85%)'
            }
          };
        } else if (activeTab === 'raw') {
          result = {
            storageStructure: {
              bucket: 'ai-square-db',
              paths: [
                'discovery/{discoveryId}/users/{userEmail}/explorations/{explorationId}.json',
                'discovery/{discoveryId}/users/{userEmail}/progress.json'
              ]
            }
          };
        }
      } else if (activeSection === 'demo') {
        if (activeTab === 'scenarios') {
          result = {
            demoScenarios: [
              { id: 'onboarding', title: 'User Onboarding Flow', steps: 5 },
              { id: 'competency-map', title: 'AI Literacy Competency Map', domains: 4 },
              { id: 'learning-path', title: 'Personalized Learning Path', modules: 12 }
            ]
          };
        } else if (activeTab === 'completion') {
          result = {
            note: 'General completion template structure',
            baseStructure: {
              completedAt: 'Date',
              timeSpent: 'number',
              tasksCompleted: 'number',
              totalTasks: 'number',
              completionRate: 'number',
              overallScore: 'number (optional)',
              performance: 'string (optional)',
              domainScores: 'object',
              ksaScores: 'object',
              keyAchievements: ['string array'],
              skillsDeveloped: ['string array'],
              nextSteps: ['string array'],
              recommendedActions: [{
                label: 'string',
                action: 'function',
                variant: 'primary | secondary'
              }]
            }
          };
        } else if (activeTab === 'history') {
          result = {
            userStats: {
              totalActivities: 25,
              completedAssessments: 3,
              completedPBLScenarios: 5,
              discoveryExplorations: 2,
              totalLearningTime: '18 hours',
              lastActivity: new Date().toISOString()
            }
          };
        } else if (activeTab === 'raw') {
          result = {
            systemArchitecture: {
              frontend: 'Next.js 15 + TypeScript',
              backend: 'FastAPI + Python',
              storage: 'Google Cloud Storage',
              ai: 'Vertex AI (Gemini)',
              database: 'GCS as document store',
              caching: 'Memory + localStorage'
            }
          };
        }
      }
      
      setData(result);
    } catch (error) {
      console.error('Error loading data:', error);
      setData({ error: 'Failed to load data', details: error });
    } finally {
      setLoading(false);
    }
  };

  // Create test data
  const createTestData = async () => {
    if (activeSection === 'assessment') {
      try {
        const response = await fetch('/api/v2/assessment/test-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentId: 'comprehensive', count: 3 })
        });
        const result = await response.json();
        alert(`Created test data: ${result.message}`);
        loadData(); // Reload to show new data
      } catch (error) {
        alert('Failed to create test data');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Developer Data Viewer</h1>
        
        {/* Section Selector */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                setData(null);
              }}
              className={`p-4 rounded-lg font-medium transition-all flex flex-col items-center gap-2 ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <section.icon className="w-6 h-6" />
              <span className="text-sm">{section.label}</span>
            </button>
          ))}
        </div>
        
        {/* Tab Selector */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-1">
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setData(null);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load Data
          </button>
          {activeSection === 'assessment' && (
            <button
              onClick={createTestData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Test Data
            </button>
          )}
        </div>
        
        {/* Data Display */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {activeSection.toUpperCase()} - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading...</p>
            </div>
          ) : data ? (
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Click "Load Data" to view information
            </p>
          )}
        </div>
      </div>
    </div>
  );
}