'use client';

import { useState, useEffect } from 'react';
import { FileTree } from '@/components/cms/FileTree';
import { Editor } from '@/components/cms/Editor';
import { AIAssistant } from '@/components/cms/AIAssistant';
import { Header } from '@/components/cms/Header';

export default function CmsPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [isOnMain, setIsOnMain] = useState(true);

  // Load branch status on mount
  useEffect(() => {
    loadBranchStatus();
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
    try {
      // If on main branch, create feature branch first
      if (isOnMain) {
        const branchResponse = await fetch('/api/git/branch', {
          method: 'POST',
        });
        const branchData = await branchResponse.json();
        
        if (branchData.success) {
          setCurrentBranch(branchData.branch);
          setIsOnMain(false);
        } else {
          throw new Error('Failed to create feature branch');
        }
      }
      
      // Save the file
      const saveResponse = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content }),
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save file');
      }
      
      // Commit to current branch
      const commitResponse = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filePath: selectedFile, 
          message: `Update ${selectedFile} via CMS` 
        }),
      });
      
      const commitData = await commitResponse.json();
      
      if (commitData.success) {
        alert(`Content saved and committed to branch: ${currentBranch}`);
      } else {
        alert('Content saved but commit failed: ' + commitData.error);
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
      
      if (data.success) {
        alert(`Pull request created successfully!\nURL: ${data.prUrl}`);
        // Optionally open PR in new tab
        window.open(data.prUrl, '_blank');
        
        // Reset to main branch state
        setCurrentBranch('main');
        setIsOnMain(true);
      } else {
        alert('Failed to create PR: ' + data.error);
      }
    } catch (error) {
      console.error('Create PR error:', error);
      alert('Failed to create pull request');
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