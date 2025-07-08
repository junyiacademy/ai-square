'use client';

import { useState, useEffect } from 'react';
import { 
  mockProjects, 
  mockAssessmentOptions, 
  mockDiscoveryOptions,
  mockAdaptiveAssessmentOptions,
  mockCertificationOptions,
  generateMockUser,
  mockTrackResults
} from '@/lib/v2/utils/mock-data';
import { TrackHierarchyView } from './components/TrackHierarchyView';
import { TrackWithHierarchy, Project } from '@/lib/v2/types';
import { Plus, RefreshCw, Layers, Search, FileCheck, Zap } from 'lucide-react';

// Mock services for demonstration
import { TrackService } from '@/lib/v2/services/track-service';
import { PBLServiceV2 } from '@/lib/v2/services/pbl-service';
import { DiscoveryServiceV2 } from '@/lib/v2/services/discovery-service';
import { AssessmentServiceV2 } from '@/lib/v2/services/assessment-service';
import { DatabaseFactory } from '@/lib/v2/utils/database';

export default function V2TestPage() {
  const [tracks, setTracks] = useState<TrackWithHierarchy[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pbl' | 'discovery' | 'assessment'>('pbl');

  // Initialize mock database connection
  const db = new DatabaseFactory().create({ database: 'ai-square-v2-test' });
  const trackService = new TrackService(db);
  const pblService = new PBLServiceV2(db);
  const discoveryService = new DiscoveryServiceV2(db);
  const assessmentService = new AssessmentServiceV2(db);

  // Load existing tracks on mount
  useEffect(() => {
    loadMockTracks();
  }, []);

  const loadMockTracks = () => {
    // For demonstration, we'll use the mock track results
    setTracks([
      mockTrackResults.pbl,
      mockTrackResults.discovery,
      mockTrackResults.assessment
    ]);
  };

  const createPBLTrack = async () => {
    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate PBL track creation
      const newTrack = await pblService.createTrackFromProject({
        project: selectedProject,
        userId: generateMockUser().id,
        language: 'en'
      });

      // For demo purposes, use mock data
      const mockTrack = {
        ...mockTrackResults.pbl,
        id: `track_pbl_${Date.now()}`,
        title: selectedProject.title,
        description: selectedProject.description,
        created_at: new Date(),
        updated_at: new Date()
      };

      setTracks([...tracks, mockTrack]);
      setSelectedProject(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PBL track');
    } finally {
      setLoading(false);
    }
  };

  const createDiscoveryTrack = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate Discovery track creation
      const mockTrack = {
        ...mockTrackResults.discovery,
        id: `track_discovery_${Date.now()}`,
        title: `Exploring ${mockDiscoveryOptions.topic}`,
        created_at: new Date(),
        updated_at: new Date()
      };

      setTracks([...tracks, mockTrack]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Discovery track');
    } finally {
      setLoading(false);
    }
  };

  const createAssessmentTrack = async (type: 'quick' | 'adaptive' | 'certification') => {
    setLoading(true);
    setError(null);

    try {
      let mockTrack: TrackWithHierarchy;
      
      switch (type) {
        case 'quick':
          mockTrack = {
            ...mockTrackResults.assessment,
            id: `track_assessment_${Date.now()}`,
            title: mockAssessmentOptions.title,
            description: mockAssessmentOptions.description,
            created_at: new Date(),
            updated_at: new Date()
          };
          break;
        case 'adaptive':
          mockTrack = {
            ...mockTrackResults.assessment,
            id: `track_adaptive_${Date.now()}`,
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
          mockTrack = {
            ...mockTrackResults.assessment,
            id: `track_cert_${Date.now()}`,
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

      setTracks([...tracks, mockTrack]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Assessment track');
    } finally {
      setLoading(false);
    }
  };

  const clearTracks = () => {
    setTracks([]);
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
            Test the flexible track architecture with PBL, Discovery, and Assessment structures
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
          <h2 className="text-xl font-semibold mb-4">Create New Tracks</h2>
          
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
                  Standard PBL Structure (Track → Programs → Tasks)
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
                  onClick={createPBLTrack}
                  disabled={loading || !selectedProject}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create PBL Track
                </button>
              </div>
            )}

            {activeTab === 'discovery' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Discovery Structure (Track → Multiple Scenario Programs → Tasks)
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
                  onClick={createDiscoveryTrack}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start Discovery Track
                </button>
              </div>
            )}

            {activeTab === 'assessment' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Assessment Structure (Track → Virtual Program → Question Tasks)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Creates assessments with direct task access for quick evaluation.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => createAssessmentTrack('quick')}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    Quick Assessment (5 questions)
                  </button>
                  
                  <button
                    onClick={() => createAssessmentTrack('adaptive')}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Adaptive Assessment (AI-adjusted difficulty)
                  </button>
                  
                  <button
                    onClick={() => createAssessmentTrack('certification')}
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

        {/* Track List Controls */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Created Tracks ({tracks.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={loadMockTracks}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset to Defaults
            </button>
            <button
              onClick={clearTracks}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Track Display */}
        <div className="space-y-6">
          {tracks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              <p>No tracks created yet. Use the controls above to create different track types.</p>
            </div>
          ) : (
            tracks.map((track) => (
              <TrackHierarchyView 
                key={track.id} 
                track={track} 
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
              <span className="text-gray-700">Creating track...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}