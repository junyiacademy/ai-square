'use client';

import { useState } from 'react';

export default function UnifiedArchitectureTestPage() {
  const [loading, setLoading] = useState(false);
  const [getResult, setGetResult] = useState<any>(null);
  const [postResult, setPostResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGet = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test/unified-architecture');
      const data = await response.json();
      setGetResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test/unified-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-test' }),
      });
      const data = await response.json();
      setPostResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Unified Learning Architecture Test</h1>
      
      <div className="space-y-6">
        {/* 測試按鈕 */}
        <div className="bg-gray-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test Operations</h2>
          <div className="flex gap-4">
            <button
              onClick={handleGet}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              GET - Check Status
            </button>
            <button
              onClick={handlePost}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              POST - Create Test Data
            </button>
          </div>
        </div>

        {/* 錯誤顯示 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* GET 結果 */}
        {getResult && (
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">GET Result:</h3>
            <div className="space-y-3">
              <div>
                <strong>Status:</strong> {getResult.success ? '✅ Success' : '❌ Failed'}
              </div>
              <div>
                <strong>Architecture:</strong>
                <ul className="ml-4 mt-1">
                  <li>Bucket: {getResult.architecture?.bucketName}</li>
                  <li>Configured: {getResult.architecture?.isConfigured ? 'Yes' : 'No'}</li>
                </ul>
              </div>
              <div>
                <strong>Data Found:</strong>
                <ul className="ml-4 mt-1">
                  <li>Scenarios: {getResult.data?.scenarios?.length || 0}</li>
                  <li>Programs: {getResult.data?.programs?.length || 0}</li>
                  <li>Tasks: {getResult.data?.tasks?.length || 0}</li>
                  <li>Evaluations: {getResult.data?.evaluations?.length || 0}</li>
                </ul>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-blue-600">View Raw JSON</summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(getResult, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* POST 結果 */}
        {postResult && (
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">POST Result:</h3>
            <div className="space-y-3">
              <div>
                <strong>Status:</strong> {postResult.success ? '✅ Success' : '❌ Failed'}
              </div>
              {postResult.data && (
                <div>
                  <strong>Created Items:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>📋 Scenario ID: <code className="text-sm bg-gray-100 px-1">{postResult.data.scenario?.id}</code></li>
                    <li>🎯 Program ID: <code className="text-sm bg-gray-100 px-1">{postResult.data.program?.id}</code></li>
                    <li>📝 Task ID: <code className="text-sm bg-gray-100 px-1">{postResult.data.task?.id}</code></li>
                    <li>⭐ Evaluation ID: <code className="text-sm bg-gray-100 px-1">{postResult.data.evaluation?.id}</code></li>
                  </ul>
                </div>
              )}
              {postResult.instructions && (
                <div className="mt-3 p-3 bg-blue-50 rounded">
                  <strong>Next Steps:</strong>
                  <p className="text-sm mt-1">{postResult.instructions.next}</p>
                </div>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-blue-600">View Raw JSON</summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(postResult, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* 使用說明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">📚 Testing Instructions</h3>
          <ol className="list-decimal ml-5 space-y-2">
            <li>Click <strong>GET - Check Status</strong> to verify GCS configuration</li>
            <li>Click <strong>POST - Create Test Data</strong> to create a complete learning flow</li>
            <li>Click GET again to see the newly created data</li>
            <li>Check the console for any errors</li>
          </ol>
          
          <div className="mt-4">
            <h4 className="font-semibold">🔧 Required Environment Variables:</h4>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-sm">
{`GOOGLE_CLOUD_PROJECT=your-project-id
GCS_BUCKET_NAME=ai-square-db-v2
NEXT_PUBLIC_GCS_BUCKET=ai-square-db-v2`}
            </pre>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">🌐 Direct API Access:</h4>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-sm">
{`# GET
curl http://localhost:3000/api/test/unified-architecture

# POST
curl -X POST http://localhost:3000/api/test/unified-architecture \\
  -H "Content-Type: application/json" \\
  -d '{"action": "create-test"}'`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}