'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Development Auto-Login Page
 *
 * This page automatically logs you in during development
 * No more manual login every time you restart the server!
 */
export default function DevLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Attempting auto-login...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      setError('This page is only available in development mode');
      return;
    }

    const autoLogin = async () => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}) // Empty body triggers auto-login
        });

        const data = await res.json();

        if (data.success) {
          setStatus(`Logged in as ${data.user.email}! Redirecting...`);

          // Store user in localStorage for client components
          localStorage.setItem('user', JSON.stringify(data.user));

          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        } else {
          setError(data.error || 'Auto-login failed');
        }
      } catch (err) {
        setError('Failed to connect to login API');
        console.error(err);
      }
    };

    autoLogin();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            🚀 Development Auto-Login
          </h2>
          <div className="mt-8">
            {error ? (
              <div className="text-red-600">
                <p className="text-lg font-semibold">Error:</p>
                <p>{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="text-gray-600">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4">{status}</p>
              </div>
            )}
          </div>
          <div className="mt-8 text-sm text-gray-500">
            <p>💡 Tip: Bookmark this page for instant login during development</p>
            <p className="mt-2">Session will last for 30 days</p>
          </div>
        </div>
      </div>
    </div>
  );
}
