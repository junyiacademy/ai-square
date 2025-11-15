'use client';

import { useState, useEffect, useRef } from 'react';
import { FileTree } from '@/components/cms/FileTree';
import { Editor } from '@/components/cms/Editor';
import { AIAssistant } from '@/components/cms/AIAssistant';
import { Header } from '@/components/cms/Header';
import { ProcessingModal, ProcessingStep } from '@/components/cms/ProcessingModal';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { ProcessingModalState, BranchCreateResponse, CommitMessageResponse, PullRequestCreateResponse } from '@/types';
import type { ImperativePanelHandle } from 'react-resizable-panels';

export default function CmsPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [isOnMain, setIsOnMain] = useState(true);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  // Processing modal state
  const [processingModal, setProcessingModal] = useState<ProcessingModalState>({
    isOpen: false,
    steps: [],
    currentStep: 0,
    commitMessage: '',
    prDescription: '',
    branchName: ''
  });

  // Load branch status on mount
  useEffect(() => {
    loadBranchStatus();
    setupLabel();

    // Set global function for Editor to call
    (window as Window & { setOriginalContent?: typeof setOriginalContent }).setOriginalContent = setOriginalContent;

    return () => {
      delete (window as Window & { setOriginalContent?: typeof setOriginalContent }).setOriginalContent;
    };
  }, []);

  const setupLabel = async () => {
    try {
      const response = await fetch('/api/git/setup-label', {
        method: 'POST'
      });
      const data = await response.json();
      if (!data.exists) {
        console.log('Created cms-content-change label');
      }
    } catch (error) {
      console.error('Failed to setup label:', error);
    }
  };

  const loadBranchStatus = async () => {
    try {
      const response = await fetch('/api/git/branch');
      const data = await response.json();
      setCurrentBranch(data.currentBranch);
      setIsOnMain(data.isOnMain);
    } catch (error) {
      console.error('Failed to load branch status:', error);
    }
  };

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
    // Auto-expand left panel when selecting a file
    if (leftPanelCollapsed && leftPanelRef.current) {
      leftPanelRef.current.expand();
      setLeftPanelCollapsed(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !content) return;

    const wasOnMain = isOnMain;

    // Initialize processing steps
    const steps: ProcessingStep[] = wasOnMain
      ? [
          { id: 'create-branch', label: 'Creating feature branch', status: 'pending' },
          { id: 'save-changes', label: 'Saving changes', status: 'pending' },
          { id: 'create-pr', label: 'Creating pull request', status: 'pending' }
        ]
      : [
          { id: 'save-changes', label: 'Saving changes', status: 'pending' }
        ];

    // Open modal
    setProcessingModal({
      isOpen: true,
      steps,
      currentStep: 0,
      commitMessage: '',
      prDescription: '',
      branchName: ''
    });

    setIsLoading(true);
    let branchData: BranchCreateResponse | null = null;
    let targetBranch = currentBranch;
    let currentStepIndex = 0;

    const updateStep = (stepId: string, status: ProcessingStep['status'], error?: string) => {
      setProcessingModal(prev => ({
        ...prev,
        steps: prev.steps.map(s =>
          s.id === stepId ? { ...s, status, error } : s
        )
      }));
    };

    const nextStep = () => {
      currentStepIndex++;
      setProcessingModal(prev => ({ ...prev, currentStep: currentStepIndex }));
    };

    try {
      // Step 1: Create branch if on main
      if (wasOnMain) {
        updateStep('create-branch', 'processing');

        const branchResponse = await fetch('/api/git/branch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedFile }),
        });
        branchData = await branchResponse.json() as BranchCreateResponse;

        if (branchData.success) {
          targetBranch = branchData.branch;
          setCurrentBranch(branchData.branch);
          setIsOnMain(false);

          setProcessingModal(prev => ({ ...prev, branchName: branchData.branch }));
          updateStep('create-branch', 'completed');
          nextStep();
        } else {
          throw new Error('Failed to create feature branch');
        }
      }

      // Step 2: Generate commit message and save
      updateStep('save-changes', 'processing');

      let commitMessage = `更新 ${selectedFile}`;
      try {
        const messageResponse = await fetch('/api/git/generate-commit-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: selectedFile,
            oldContent: originalContent,
            newContent: content
          }),
        });

        const messageData = await messageResponse.json() as CommitMessageResponse;
        if (messageData.success) {
          commitMessage = messageData.message;
          setProcessingModal(prev => ({ ...prev, commitMessage }));
        }
      } catch (error) {
        console.warn('Failed to generate AI commit message, using default');
      }

      // Save the file with commit message
      const saveResponse = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedFile,
          content,
          branch: targetBranch,
          message: commitMessage
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save file');
      }

      const saveData = await saveResponse.json();

      if (!saveData.success) {
        throw new Error('Failed to save content');
      }

      // Update original content after successful save
      setOriginalContent(content);
      updateStep('save-changes', 'completed');

      // Step 3: Create PR if we were on main
      if (wasOnMain) {
        nextStep();
        updateStep('create-pr', 'processing');

        // Generate PR description
        const prResponse = await fetch('/api/git/pr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `CMS Content Updates from ${targetBranch}`,
            body: `Content updates made via AI Square CMS in branch ${targetBranch}`
          }),
        });

        const prData = await prResponse.json() as PullRequestCreateResponse;

        if (prData.success) {
          // Extract PR description from the response
          if (prData.description) {
            setProcessingModal(prev => ({ ...prev, prDescription: prData.description }));
          }

          updateStep('create-pr', 'completed');

          // Open PR in new tab after a short delay
          setTimeout(() => {
            window.open(prData.prUrl, '_blank');
          }, 2000);

          // Reset to main branch
          setCurrentBranch('main');
          setIsOnMain(true);

          // Show success notification
          setTimeout(() => {
            const toast = document.createElement('div');
            toast.className = 'fixed top-6 right-6 toast-success z-[60] animate-in slide-in-from-right flex items-center gap-3';

            const icon = document.createElement('div');
            icon.className = 'text-2xl';
            icon.textContent = '🎉';

            const text = document.createElement('div');
            text.innerHTML = `<div class="font-semibold">Pull Request Created!</div><div class="text-sm opacity-90">Opening in new tab...</div>`;

            toast.appendChild(icon);
            toast.appendChild(text);
            document.body.appendChild(toast);

            setTimeout(() => {
              if (document.body.contains(toast)) {
                document.body.removeChild(toast);
              }
            }, 3000);
          }, 500);
        } else {
          throw new Error(prData.error || 'Failed to create PR');
        }
      }
    } catch (error) {
      console.error('Save error:', error);

      // Update the current step with error
      const currentStepId = steps[currentStepIndex]?.id;
      if (currentStepId) {
        updateStep(currentStepId, 'error', error instanceof Error ? error.message : 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToMain = async () => {
    if (isOnMain) return;

    setIsLoading(true);
    try {
      // Switch to main branch
      const response = await fetch('/api/git/branch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: 'main' }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentBranch('main');
        setIsOnMain(true);

        // Clear content if a file is selected
        if (selectedFile) {
          setContent('');
          setOriginalContent('');
          // Trigger file reload
          const tempFile = selectedFile;
          setSelectedFile(null);
          setTimeout(() => setSelectedFile(tempFile), 100);
        }

        // Success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-6 right-6 toast-success z-50 animate-in slide-in-from-right flex items-center gap-3';

        const icon = document.createElement('div');
        icon.className = 'text-2xl';
        icon.textContent = '✅';

        const text = document.createElement('div');
        text.innerHTML = `<div class="font-semibold">Switched to Main</div><div class="text-sm opacity-90">You are now on the main branch</div>`;

        toast.appendChild(icon);
        toast.appendChild(text);
        document.body.appendChild(toast);

        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Switch branch error:', error);
      alert('Failed to switch to main branch');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex flex-col h-screen">
      <Header
        selectedFile={selectedFile}
        currentBranch={currentBranch}
        isOnMain={isOnMain}
        isLoading={isLoading}
        onSave={handleSave}
        onPreview={() => {}}
        onSwitchToMain={handleSwitchToMain}
      />

      <div className="flex flex-1 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <PanelGroup direction="horizontal" className="flex-1">
          {/* File Browser Panel */}
          <Panel
            ref={leftPanelRef}
            defaultSize={20}
            minSize={15}
            maxSize={30}
            collapsible
            onCollapse={() => setLeftPanelCollapsed(true)}
            onExpand={() => setLeftPanelCollapsed(false)}
            className="relative"
          >
            <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-100 overflow-y-auto shadow-sm relative">
              <FileTree
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
              {/* Collapse button */}
              <button
                onClick={() => {
                  if (leftPanelRef.current) {
                    leftPanelRef.current.collapse();
                    setLeftPanelCollapsed(true);
                  }
                }}
                className="absolute top-4 right-2 p-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 z-10"
                title="Collapse panel"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </Panel>

          {/* Left Resize Handle */}
          <PanelResizeHandle className="relative w-1 bg-gray-200 hover:bg-gray-300 transition-colors group">
            <div className="absolute inset-y-0 -left-2 -right-2 group-hover:bg-blue-500/10" />
            {!leftPanelCollapsed && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-12 flex items-center justify-center">
                <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </div>
            )}
            {leftPanelCollapsed && (
              <button
                onClick={() => {
                  if (leftPanelRef.current) {
                    leftPanelRef.current.expand();
                    setLeftPanelCollapsed(false);
                  }
                }}
                className="absolute top-20 left-1 p-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 z-10 shadow-sm"
                title="Expand panel"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </PanelResizeHandle>

          {/* Editor Panel */}
          <Panel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col bg-white/95 backdrop-blur-sm shadow-sm">
              <Editor
                file={selectedFile}
                content={content}
                onChange={setContent}
                isLoading={isLoading}
              />
            </div>
          </Panel>

          {/* Right Resize Handle */}
          <PanelResizeHandle className="relative w-1 bg-gray-200 hover:bg-gray-300 transition-colors group">
            <div className="absolute inset-y-0 -left-2 -right-2 group-hover:bg-blue-500/10" />
            {!rightPanelCollapsed && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-12 flex items-center justify-center">
                <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </div>
            )}
            {rightPanelCollapsed && (
              <button
                onClick={() => {
                  if (rightPanelRef.current) {
                    rightPanelRef.current.expand();
                    setRightPanelCollapsed(false);
                  }
                }}
                className="absolute top-20 right-1 p-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 z-10 shadow-sm"
                title="Expand panel"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </PanelResizeHandle>

          {/* AI Assistant Panel */}
          <Panel
            ref={rightPanelRef}
            defaultSize={30}
            minSize={20}
            maxSize={40}
            collapsible
            onCollapse={() => setRightPanelCollapsed(true)}
            onExpand={() => setRightPanelCollapsed(false)}
            className="relative"
          >
            <div className="h-full bg-white/95 backdrop-blur-sm border-l border-gray-100 overflow-y-auto shadow-sm relative">
              <AIAssistant
                content={content}
                onContentUpdate={setContent}
                selectedFile={selectedFile}
              />
              {/* Collapse button */}
              <button
                onClick={() => {
                  if (rightPanelRef.current) {
                    rightPanelRef.current.collapse();
                    setRightPanelCollapsed(true);
                  }
                }}
                className="absolute top-4 left-2 p-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 z-10"
                title="Collapse panel"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={processingModal.isOpen}
        onClose={() => setProcessingModal(prev => ({ ...prev, isOpen: false }))}
        steps={processingModal.steps}
        currentStep={processingModal.currentStep}
        commitMessage={processingModal.commitMessage}
        prDescription={processingModal.prDescription}
        branchName={processingModal.branchName}
      />
    </div>
  );
}
