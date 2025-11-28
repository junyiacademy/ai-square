'use client';

/**
 * YAMLEditor Component
 * Monaco Editor for YAML code editing
 */

import { Editor } from '@monaco-editor/react';

interface YAMLEditorProps {
  yaml: string;
  onChange: (value: string) => void;
}

export function YAMLEditor({ yaml, onChange }: YAMLEditorProps) {
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <Editor
        height="600px"
        defaultLanguage="yaml"
        value={yaml}
        onChange={handleEditorChange}
        theme="vs-light"
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          rulers: [80],
          wordWrap: 'on',
          wrappingIndent: 'indent',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
