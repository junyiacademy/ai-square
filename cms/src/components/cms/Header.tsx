'use client';

import { Save, GitBranch, Eye, Loader2, FileText, GitPullRequestIcon } from 'lucide-react';

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
    <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between shadow-soft">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-soft">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AI Square CMS
            </h1>
            <p className="text-xs text-gray-500">Content Management System</p>
          </div>
        </div>
        
        {selectedFile && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              {selectedFile}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {/* Current branch indicator */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
          isOnMain 
            ? 'bg-gray-100 text-gray-600' 
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 border border-indigo-200'
        }`}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <GitBranch className="w-4 h-4" />
          )}
          <span>{currentBranch}</span>
        </div>

        <div className="h-8 w-px bg-gray-200" />

        <button
          onClick={onSave}
          disabled={!selectedFile || isLoading}
          className="px-5 py-2.5 bg-gradient-primary text-white rounded-xl hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all duration-200 hover:-translate-y-0.5"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </button>
        
        <button
          onClick={onPreview}
          disabled={!selectedFile || isLoading}
          className="px-5 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        
        <button
          onClick={onCreatePR}
          disabled={isOnMain || isLoading}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all duration-200 hover:-translate-y-0.5"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <GitPullRequestIcon className="w-4 h-4" />
          )}
          Create PR
        </button>
      </div>
    </header>
  );
}