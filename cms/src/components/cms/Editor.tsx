'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Eye, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

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
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Select a file to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 px-4">
          <TabsList className="h-12">
            <TabsTrigger value="code" className="gap-2">
              <Code className="w-4 h-4" />
              Code
            </TabsTrigger>
            <TabsTrigger value="visual" className="gap-2">
              <FileText className="w-4 h-4" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>
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

        <TabsContent value="visual" className="flex-1 m-0 p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <p className="text-gray-500">Visual editor coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 m-0 p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto prose">
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
              <code>{localContent}</code>
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}