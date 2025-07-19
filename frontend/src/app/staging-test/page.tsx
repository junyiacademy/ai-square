'use client';

import { useState } from 'react';

export default function StagingTestPage() {
  const [dbStatus, setDbStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/init-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setDbStatus(JSON.stringify(data, null, 2));
    } catch (error) {
      setDbStatus(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  // Only show in staging environment
  if (typeof window !== 'undefined' && !window.location.hostname.includes('staging')) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>This page is only available in staging environment.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">🧪 Staging Environment Test</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Environment Info</h2>
        <ul className="text-sm text-blue-700">
          <li><strong>Environment:</strong> {process.env.NODE_ENV || 'undefined'}</li>
          <li><strong>PostgreSQL:</strong> {process.env.USE_POSTGRES ? 'Enabled' : 'Disabled'}</li>
          <li><strong>Staging Mode:</strong> {process.env.ENVIRONMENT === 'staging' ? 'Yes' : 'No'}</li>
        </ul>
      </div>

      <div className="mb-6">
        <button
          onClick={testDatabase}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Database Connection'}
        </button>
      </div>

      {dbStatus && (
        <div className="bg-gray-100 border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Database Test Result:</h3>
          <pre className="text-sm overflow-auto">{dbStatus}</pre>
        </div>
      )}

      <div className="mt-8 text-sm text-gray-600">
        <p><strong>Staging URL:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
        <p><strong>Test Coverage:</strong></p>
        <ul className="list-disc list-inside ml-4">
          <li>PostgreSQL connection</li>
          <li>Repository factory initialization</li>
          <li>Database schema verification</li>
          <li>Sample data insertion</li>
        </ul>
      </div>
    </div>
  );
}