'use client';

import { useState } from 'react';
import { FileTree } from '@/components/cms/FileTree';
import { Editor } from '@/components/cms/Editor';
import { AIAssistant } from '@/components/cms/AIAssistant';
import { Header } from '@/components/cms/Header';

export default function CmsPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!selectedFile || !content) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content }),
      });
      
      if (response.ok) {
        alert('Content saved successfully!');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save content');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header 
        selectedFile={selectedFile} 
        onSave={handleSave}
        onPreview={() => {}}
        onCreatePR={() => {}}
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