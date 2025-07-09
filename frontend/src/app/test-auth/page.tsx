'use client';

import { useState, useEffect } from 'react';

export default function TestAuthPage() {
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      setAuthStatus({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test123'
        })
      });
      const data = await response.json();
      console.log('Login result:', data);
      checkAuth(); // Re-check auth status
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Status Test</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <pre>{JSON.stringify(authStatus, null, 2)}</pre>
      </div>

      {!authStatus?.authenticated && (
        <div className="space-y-4">
          <p className="text-red-600">You are not authenticated!</p>
          <button
            onClick={login}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Login
          </button>
          <p className="text-sm text-gray-600">
            Or manually login at <a href="/login" className="text-blue-600 underline">/login</a>
          </p>
        </div>
      )}

      {authStatus?.authenticated && (
        <div className="space-y-4">
          <p className="text-green-600">You are authenticated!</p>
          <p>Email: {authStatus.user?.email}</p>
          <a
            href="/v2/assessment"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Go to Assessment
          </a>
        </div>
      )}
    </div>
  );
}