'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Eye, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-600">Loading editor...</p>
        </div>
      </div>
    )
  }
);

interface EditorProps {
  file: string | null;
  content: string;
  onChange: (value: string) => void;
  isLoading: boolean;
}

export function Editor({ file, content, onChange, isLoading }: EditorProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'visual' | 'preview'>('code');
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    if (file) {
      loadFileContent(file);
    }
  }, [file]);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const loadFileContent = async (filePath: string) => {
    try {
      const response = await fetch(`/api/content?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      setLocalContent(data.content);
      onChange(data.content);

      // Store original content for comparison
      const windowWithSetOriginalContent = window as Window & { setOriginalContent?: (content: string) => void };
      if (windowWithSetOriginalContent.setOriginalContent) {
        windowWithSetOriginalContent.setOriginalContent(data.content);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setLocalContent(value);
      onChange(value);
    }
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center shadow-lg shadow-gray-200/50">
            <FileText className="w-12 h-12 text-gray-500" />
          </div>
          <p className="text-xl font-semibold text-gray-800 mb-2">No file selected</p>
          <p className="text-sm text-gray-600 max-w-xs mx-auto">
            Choose a file from the sidebar to start editing your content
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'code' | 'visual' | 'preview')} className="flex-1 flex flex-col">
        <div className="border-b border-gray-100 px-6 bg-white">
          <div className="flex gap-1 h-14 items-center">
            <button
              onClick={() => setActiveTab('code')}
              className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'code'
                  ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Code className="w-4 h-4" />
              Code
            </button>
            <button
              onClick={() => setActiveTab('visual')}
              className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'visual'
                  ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Visual
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'preview'
                  ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </div>
        </div>

        <TabsContent value="code" className="flex-1 m-0">
          <MonacoEditor
            height="100%"
            language="yaml"
            theme="vs-light"
            value={localContent}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              folding: true,
              showFoldingControls: 'always',
              bracketPairColorization: {
                enabled: true
              },
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </TabsContent>

        <TabsContent value="visual" className="flex-1 m-0 p-8 overflow-y-auto bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-4xl mx-auto text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center">
              <FileText className="w-10 h-10 text-indigo-600" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">Visual Editor</p>
            <p className="text-sm text-gray-500">Coming soon with drag-and-drop components</p>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 m-0 p-8 overflow-y-auto bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
              <pre className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl overflow-x-auto">
                <code className="text-sm text-gray-700">{localContent}</code>
              </pre>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
