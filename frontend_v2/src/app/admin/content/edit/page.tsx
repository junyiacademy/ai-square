'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import yaml from 'js-yaml';
import Link from 'next/link';
import { formatDateWithLocale } from '@/utils/locale';

// Dynamic import Monaco to avoid SSR issues
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false }
);

export default function ContentEditor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contentType = searchParams.get('type') || 'domain';
  const contentId = searchParams.get('id') || '';
  
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [metadata, setMetadata] = useState<{
    version: number;
    updated_at: string;
    updated_by: string;
    gcs_path?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const fetchContent = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/content/${encodeURIComponent(contentId)}`);
      if (response.ok) {
        const data = await response.json();
        const yamlContent = yaml.dump(data.content, { 
          indent: 2,
          lineWidth: -1,
          noRefs: true 
        });
        setContent(yamlContent);
        setOriginalContent(yamlContent);
        setMetadata(data);
      } else {
        setError('Failed to load content');
      }
    } catch (err) {
      setError('Failed to load content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    if (contentId) {
      fetchContent();
    }
  }, [contentId, fetchContent]);

  const handleSave = async (status: 'draft' | 'published') => {
    setSaving(true);
    setError(null);

    try {
      // Validate YAML
      const parsedContent = yaml.load(content);
      
      const response = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: contentType,
          id: contentId,
          content: parsedContent,
          status,
        }),
      });

      if (response.ok) {
        setOriginalContent(content);
        setIsDirty(false);
        
        // Show success message
        const message = status === 'published' ? 'Content published!' : 'Draft saved!';
        alert(message);
        
        // Redirect to content list
        router.push(`/admin/content?type=${contentType}`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save content');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid YAML format');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this override? This will restore the original content from the repository.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/content/${encodeURIComponent(contentId)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Override deleted! Content restored to repository version.');
        router.push(`/admin/content?type=${contentType}`);
      } else {
        setError('Failed to delete override');
      }
    } catch {
      setError('Failed to delete override');
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setIsDirty(value !== originalContent);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-0">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Edit Content</h1>
            <p className="mt-1 text-sm text-gray-600">
              {contentId} {metadata?.gcs_path && '(Override)'}
            </p>
          </div>
          <Link
            href={`/admin/content?type=${contentType}`}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            ← Back to list
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Editor */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">YAML Editor</span>
              {isDirty && (
                <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                  Unsaved changes
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {metadata && (
                <>
                  <span>Version: {metadata.version}</span>
                  <span>•</span>
                  <span>Updated: {formatDateWithLocale(new Date(metadata.updated_at), 'en')}</span>
                  <span>•</span>
                  <span>By: {metadata.updated_by}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="h-[600px]">
          <MonacoEditor
            height="100%"
            defaultLanguage="yaml"
            value={content}
            onChange={handleEditorChange}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          {metadata?.gcs_path && (
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 text-sm"
              disabled={saving}
            >
              Delete Override
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving || !isDirty}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          
          <button
            onClick={() => handleSave('published')}
            disabled={saving || !isDirty}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Publishing Notes:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Save as Draft</strong>: Saves changes to GCS but doesn&apos;t affect the live site</li>
          <li>• <strong>Publish</strong>: Makes changes live immediately by creating a GCS override</li>
          <li>• <strong>Delete Override</strong>: Removes GCS override and reverts to repository version</li>
          <li>• Changes are isolated to GCS and don&apos;t modify the git repository</li>
        </ul>
      </div>
    </div>
  );
}