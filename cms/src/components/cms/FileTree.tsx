'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileTreeProps {
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
}

export function FileTree({ onFileSelect, selectedFile }: FileTreeProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFileTree();
  }, []);

  const loadFileTree = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      setFiles(data.files);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load file tree:', error);
      setLoading(false);
    }
  };

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFile === node.path;
    const matchesSearch = !searchQuery || 
      node.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch && node.type === 'file') {
      return null;
    }

    return (
      <div key={node.path}>
        <div
          className={cn(
            "flex items-center px-3 py-2 rounded-lg mx-2 my-0.5 cursor-pointer transition-all duration-200",
            isSelected 
              ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-medium shadow-sm" 
              : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
          )}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleDirectory(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
        >
          {node.type === 'directory' ? (
            <>
              <div className={cn(
                "w-5 h-5 rounded flex items-center justify-center mr-2 transition-all duration-200",
                isExpanded ? "bg-indigo-100" : "hover:bg-gray-100"
              )}>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                )}
              </div>
              <Folder className={cn(
                "w-4 h-4 mr-2.5",
                isExpanded ? "text-indigo-500" : "text-gray-400"
              )} />
            </>
          ) : (
            <>
              <div className="w-5 h-5 mr-2" />
              <FileText className={cn(
                "w-4 h-4 mr-2.5",
                isSelected ? "text-indigo-600" : "text-gray-400"
              )} />
            </>
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
        
        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-3 pr-12 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Content Files</h2>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-gray-500">Loading files...</div>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <Folder className="w-8 h-8 mb-2" />
            <p className="text-sm">No files found</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {files.map(node => renderNode(node))}
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          {files.reduce((count, node) => 
            count + (node.type === 'directory' && node.children ? node.children.length : 1), 0
          )} files
        </p>
      </div>
    </div>
  );
}