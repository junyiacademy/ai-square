'use client';

import { Save, GitBranch, Eye, Loader2, FileText, GitPullRequestIcon, GitMerge } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  selectedFile: string | null;
  currentBranch: string;
  isOnMain: boolean;
  isLoading?: boolean;
  onSave?: () => void;
  onPreview?: () => void;
  onSwitchToMain?: () => void;
}

export function Header({ selectedFile, currentBranch, isOnMain, isLoading, onSave, onPreview, onSwitchToMain }: HeaderProps) {
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
        
        {/* Switch to main button - only show when not on main */}
        {!isOnMain && (
          <button
            onClick={onSwitchToMain}
            disabled={isLoading}
            className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Switch back to main branch"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Back to Main
          </button>
        )}

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
          {isOnMain ? 'Save & Create PR' : 'Save'}
        </button>

        <div className="h-8 w-px bg-gray-200" />

        {/* Branch Management Link */}
        <Link
          href="/branches"
          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 flex items-center gap-2 font-medium"
        >
          <GitMerge className="w-4 h-4" />
          Branches
        </Link>
      </div>
    </header>
  );
}