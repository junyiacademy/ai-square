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
            "flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer",
            isSelected && "bg-blue-50 text-blue-700"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
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
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 mr-1" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1" />
              )}
              <Folder className="w-4 h-4 mr-2 text-blue-500" />
            </>
          ) : (
            <FileText className="w-4 h-4 mr-2 ml-5 text-gray-500" />
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
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="py-2">
            {files.map(node => renderNode(node))}
          </div>
        )}
      </div>
    </div>
  );
}