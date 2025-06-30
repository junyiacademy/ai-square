'use client';

import { useState, useEffect } from 'react';
import { FileTree } from '@/components/cms/FileTree';
import { Editor } from '@/components/cms/Editor';
import { AIAssistant } from '@/components/cms/AIAssistant';
import { Header } from '@/components/cms/Header';

export default function CmsPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [isOnMain, setIsOnMain] = useState(true);

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
        saveToast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-right';
        
        // Check if we created a new branch (was on main before)
        const displayBranch = wasOnMain ? branchData?.branch || currentBranch : currentBranch;
        
        if (wasOnMain) {
          saveToast.innerHTML = `🌟 Created branch<br/><strong>${displayBranch}</strong> & committed`;
        } else {
          saveToast.innerHTML = `💾 Saved & committed to<br/><strong>${displayBranch}</strong>`;
        }
        
        document.body.appendChild(saveToast);
        
        setTimeout(() => {
          if (document.body.contains(saveToast)) {
            document.body.removeChild(saveToast);
          }
        }, 2000);
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
    toastMsg.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-right';
    toastMsg.textContent = `🚀 Creating PR for ${currentBranch}...`;
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
        successToast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-right';
        successToast.innerHTML = `✅ PR created successfully!<br/><small>Opening in new tab...</small>`;
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
      
      <div className="flex flex-1 overflow-hidden">
        {/* File Browser */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <FileTree 
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
          />
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <Editor
            file={selectedFile}
            content={content}
            onChange={setContent}
            isLoading={isLoading}
          />
        </div>

        {/* AI Assistant */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <AIAssistant
            content={content}
            onContentUpdate={setContent}
            selectedFile={selectedFile}
          />
        </div>
      </div>
    </div>
  );
}