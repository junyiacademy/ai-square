'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';

export default function TestDarkModePage() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Dark Mode Test Page</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
            <p className="text-gray-900 dark:text-white">
              Current theme: <strong>{theme}</strong>
            </p>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              This text should change color in dark mode
            </p>
          </div>

          <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
            <p className="text-gray-800 dark:text-gray-200">
              Testing different background colors
            </p>
          </div>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            Toggle Theme
          </button>

          <div className="mt-8 p-4 border border-gray-300 dark:border-gray-600 rounded">
            <h2 className="text-xl font-semibold mb-4">Debug Info:</h2>
            <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
              {JSON.stringify({
                theme,
                htmlClasses: typeof document !== 'undefined' ? document.documentElement.className : 'SSR',
                bodyClasses: typeof document !== 'undefined' ? document.body.className : 'SSR',
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}