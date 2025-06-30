'use client';

import { useState, useEffect, useRef } from 'react';
import { FileTree } from '@/components/cms/FileTree';
import { Editor } from '@/components/cms/Editor';
import { AIAssistant } from '@/components/cms/AIAssistant';
import { Header } from '@/components/cms/Header';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';

export default function CmsPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [isOnMain, setIsOnMain] = useState(true);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const leftPanelRef = useRef<any>(null);
  const rightPanelRef = useRef<any>(null);

  // Load branch status on mount
  useEffect(() => {
    loadBranchStatus();
    
    // Set global function for Editor to call
    (window as any).setOriginalContent = setOriginalContent;
    
    return () => {
      delete (window as any).setOriginalContent;
    };
  }, []);

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
    
    setIsLoading(true);
    let branchData = null;
    const wasOnMain = isOnMain;
    
    try {
      // If on main branch, create feature branch first
      let targetBranch = currentBranch;
      
      if (isOnMain) {
        const branchResponse = await fetch('/api/git/branch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedFile }),
        });
        branchData = await branchResponse.json();
        
        if (branchData.success) {
          targetBranch = branchData.branch; // Use the new branch immediately
          setCurrentBranch(branchData.branch);
          setIsOnMain(false);
        } else {
          throw new Error('Failed to create feature branch');
        }
      }
      
      // Generate intelligent commit message
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
        
        const messageData = await messageResponse.json();
        if (messageData.success) {
          commitMessage = messageData.message;
        }
      } catch (error) {
        console.warn('Failed to generate AI commit message, using default');
      }
      
      // Save the file with commit message (GitHub API commits automatically)
      const saveResponse = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: selectedFile, 
          content,
          branch: targetBranch, // Use the target branch, not currentBranch
          message: commitMessage
        }),
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save file');
      }
      
      const saveData = await saveResponse.json();
      
      if (saveData.success) {
        // Update original content after successful save
        setOriginalContent(content);
        
        // Success toast for save
        const saveToast = document.createElement('div');
        saveToast.className = 'fixed top-6 right-6 toast-success z-50 animate-in slide-in-from-right flex items-center gap-3';
        
        // Check if we created a new branch (was on main before)
        const displayBranch = wasOnMain ? branchData?.branch || currentBranch : currentBranch;
        
        const icon = document.createElement('div');
        icon.className = 'text-2xl';
        icon.textContent = wasOnMain ? '🌟' : '✅';
        
        const textContent = document.createElement('div');
        if (wasOnMain) {
          textContent.innerHTML = `<div class="font-semibold">Branch Created</div><div class="text-sm opacity-90">${displayBranch}</div>`;
        } else {
          textContent.innerHTML = `<div class="font-semibold">Changes Saved</div><div class="text-sm opacity-90">Committed to ${displayBranch}</div>`;
        }
        
        saveToast.appendChild(icon);
        saveToast.appendChild(textContent);
        document.body.appendChild(saveToast);
        
        setTimeout(() => {
          if (document.body.contains(saveToast)) {
            document.body.removeChild(saveToast);
          }
        }, 3000);
      } else {
        alert('Failed to save content');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePR = async () => {
    if (isOnMain) {
      alert('Please make some changes and save first to create a feature branch.');
      return;
    }

    setIsLoading(true);
    
    // Show immediate feedback
    const toastMsg = document.createElement('div');
    toastMsg.className = 'fixed top-6 right-6 toast-info z-50 animate-in slide-in-from-right flex items-center gap-3';
    
    const loadingIcon = document.createElement('div');
    loadingIcon.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
    
    const loadingText = document.createElement('div');
    loadingText.innerHTML = `<div class="font-semibold">Creating Pull Request</div><div class="text-sm opacity-90">${currentBranch}</div>`;
    
    toastMsg.appendChild(loadingIcon);
    toastMsg.appendChild(loadingText);
    document.body.appendChild(toastMsg);
    
    try {
      const response = await fetch('/api/git/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `CMS Content Updates from ${currentBranch}`,
          body: `Content updates made via AI Square CMS in branch ${currentBranch}`
        }),
      });
      
      const data = await response.json();
      
      // Remove loading toast
      document.body.removeChild(toastMsg);
      
      if (data.success) {
        // Success toast
        const successToast = document.createElement('div');
        successToast.className = 'fixed top-6 right-6 toast-success z-50 animate-in slide-in-from-right flex items-center gap-3';
        
        const successIcon = document.createElement('div');
        successIcon.className = 'text-2xl';
        successIcon.textContent = '🎉';
        
        const successText = document.createElement('div');
        successText.innerHTML = `<div class="font-semibold">Pull Request Created!</div><div class="text-sm opacity-90">Opening in new tab...</div>`;
        
        successToast.appendChild(successIcon);
        successToast.appendChild(successText);
        document.body.appendChild(successToast);
        
        // Open PR in new tab
        window.open(data.prUrl, '_blank');
        
        // Reset to main branch state
        setCurrentBranch('main');
        setIsOnMain(true);
        
        // Remove success toast after 3 seconds
        setTimeout(() => {
          if (document.body.contains(successToast)) {
            document.body.removeChild(successToast);
          }
        }, 3000);
      } else {
        // Error toast
        const errorToast = document.createElement('div');
        errorToast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-right';
        errorToast.textContent = `❌ Failed to create PR: ${data.error}`;
        document.body.appendChild(errorToast);
        
        setTimeout(() => {
          if (document.body.contains(errorToast)) {
            document.body.removeChild(errorToast);
          }
        }, 5000);
      }
    } catch (error) {
      console.error('Create PR error:', error);
      
      // Remove loading toast if still there
      if (document.body.contains(toastMsg)) {
        document.body.removeChild(toastMsg);
      }
      
      // Error toast
      const errorToast = document.createElement('div');
      errorToast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-right';
      errorToast.textContent = '❌ Network error: Failed to create pull request';
      document.body.appendChild(errorToast);
      
      setTimeout(() => {
        if (document.body.contains(errorToast)) {
          document.body.removeChild(errorToast);
        }
      }, 5000);
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
        onCreatePR={handleCreatePR}
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
    </div>
  );
}