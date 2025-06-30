'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-100 to-pink-100 rounded-3xl flex items-center justify-center shadow-lg shadow-red-200/50">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
        <p className="text-gray-600 mb-8">
          We encountered an unexpected error. Don't worry, your work is safe.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium hover:-translate-y-0.5"
        >
          Try Again
        </button>
        <p className="mt-4 text-xs text-gray-500">
          Error ID: {error.digest}
        </p>
      </div>
    </div>
  );
}