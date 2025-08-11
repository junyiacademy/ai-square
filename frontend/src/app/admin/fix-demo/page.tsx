'use client';

import { useState } from 'react';

export default function FixDemoAccountsPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    results?: Array<{ email: string; action: string; role: string }>;
    verification?: Array<{ email: string; role: string; password_status: string; email_verified: boolean }>;
    credentials?: Record<string, string>;
  } | null>(null);
  const [error, setError] = useState<string>('');

  const handleFix = async () => {
    setStatus('loading');
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/admin/fix-demo-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secretKey: 'fix-demo-accounts-2025'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setResult(data);
      } else {
        setStatus('error');
        setError(data.error || 'Failed to fix demo accounts');
      }
    } catch (err) {
      setStatus('error');
      setError('Network error: ' + (err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Fix Demo Accounts
          </h1>

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Admin Only:</strong> This tool will reset the demo accounts with proper passwords.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">Demo Accounts to Fix:</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Student: student@example.com / student123</li>
                <li>• Teacher: teacher@example.com / teacher123</li>
                <li>• Admin: admin@example.com / admin123</li>
              </ul>
            </div>

            <button
              onClick={handleFix}
              disabled={status === 'loading'}
              className={`w-full py-2 px-4 rounded-md font-medium text-white transition-colors ${
                status === 'loading'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {status === 'loading' ? 'Fixing Demo Accounts...' : 'Fix Demo Accounts'}
            </button>

            {status === 'success' && result && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="font-medium text-green-900 mb-2">✅ Success!</h3>
                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700">Actions Performed:</h4>
                    <ul className="mt-1 space-y-1">
                      {result.results?.map((r, i) => (
                        <li key={i} className="text-sm text-gray-600">
                          • {r.email}: {r.action} (role: {r.role})
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mt-3">Verification:</h4>
                    <table className="mt-1 min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Role</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Password</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Verified</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {result.verification?.map((v, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-sm text-gray-600">{v.email}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{v.role}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{v.password_status}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{v.email_verified ? '✓' : '✗'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded">
                    <h4 className="font-medium text-sm text-blue-900">You can now login with:</h4>
                    <ul className="mt-1 space-y-1 text-sm text-blue-700">
                      {Object.entries(result.credentials || {}).map(([role, creds]) => (
                        <li key={role}>• {role}: {creds as string}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <h3 className="font-medium text-red-900">❌ Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}