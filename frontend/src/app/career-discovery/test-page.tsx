'use client';

import React from 'react';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <h1 className="text-4xl font-bold text-center text-gray-900">Career Discovery Test</h1>
      <p className="text-center mt-4 text-gray-600">If you can see this, basic routing works!</p>
      
      <div className="mt-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Test Content</h2>
        <p>This is a test page to verify the Career Discovery route is working.</p>
        
        <button 
          onClick={() => alert('Button clicked!')}
          className="mt-4 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
        >
          Test Button
        </button>
      </div>
    </div>
  );
}