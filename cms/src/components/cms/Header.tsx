'use client';

import { Button } from '@/components/ui/button';
import { Save, GitBranch, Eye } from 'lucide-react';

interface HeaderProps {
  selectedFile: string | null;
  onSave?: () => void;
  onPreview?: () => void;
  onCreatePR?: () => void;
}

export function Header({ selectedFile, onSave, onPreview, onCreatePR }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold">AI Square CMS</h1>
          {selectedFile && (
            <>
              <span className="text-gray-400">/</span>
              <span className="text-sm text-gray-600">{selectedFile}</span>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            disabled={!selectedFile}
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={!selectedFile}
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          
          <Button
            size="sm"
            onClick={onCreatePR}
            disabled={!selectedFile}
          >
            <GitBranch className="w-4 h-4 mr-1" />
            Create PR
          </Button>
        </div>
      </div>
    </header>
  );
}