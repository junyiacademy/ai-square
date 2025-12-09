'use client';

/**
 * PreviewTabs Component
 * Tabbed interface for Visual, Markdown, and Code previews
 */

import { useState } from 'react';
import { VisualPreview } from './VisualPreview';
import { MarkdownPreview } from './MarkdownPreview';
import { YAMLEditor } from './YAMLEditor';
import type { PreviewMode } from '@/types/prompt-to-course';

interface PreviewTabsProps {
  yaml: string;
  onYamlChange: (yaml: string) => void;
}

export function PreviewTabs({ yaml, onYamlChange }: PreviewTabsProps) {
  const [activeTab, setActiveTab] = useState<PreviewMode>('visual');

  const tabs: Array<{ id: PreviewMode; label: string; icon: string }> = [
    { id: 'visual', label: 'Visual Preview', icon: '👁️' },
    { id: 'markdown', label: 'Markdown', icon: '📝' },
    { id: 'code', label: 'YAML Code', icon: '💻' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'visual' && <VisualPreview yaml={yaml} />}
        {activeTab === 'markdown' && <MarkdownPreview yaml={yaml} />}
        {activeTab === 'code' && <YAMLEditor yaml={yaml} onChange={onYamlChange} />}
      </div>
    </div>
  );
}
