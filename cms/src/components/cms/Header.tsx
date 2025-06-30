'use client';

import { Button } from '@/components/ui/button';
import { Save, GitBranch, Eye, Loader2 } from 'lucide-react';

interface HeaderProps {
  selectedFile: string | null;
  currentBranch: string;
  isOnMain: boolean;
  isLoading?: boolean;
  onSave?: () => void;
  onPreview?: () => void;
  onCreatePR?: () => void;
}

export function Header({ selectedFile, currentBranch, isOnMain, isLoading, onSave, onPreview, onCreatePR }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold">AI Square CMS</h1>
          
          {/* Branch indicator */}
          <div className={`px-2 py-1 rounded-md text-xs font-medium ${
            isOnMain 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            <GitBranch className="w-3 h-3 inline mr-1" />
            {currentBranch}
          </div>
          
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
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save
          </Button>
          
          <Button
            size="sm"
            onClick={onCreatePR}
            disabled={isOnMain || isLoading}
            variant={isOnMain ? "outline" : "default"}
            className={`transition-all duration-200 ${
              isLoading ? 'animate-pulse' : ''
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <GitBranch className="w-4 h-4 mr-1" />
            )}
            {isLoading 
              ? "Creating PR..." 
              : isOnMain 
              ? "Need Changes" 
              : "Create PR"
            }
          </Button>
        </div>
      </div>
    </header>
  );
}