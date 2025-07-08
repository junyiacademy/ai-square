import Link from 'next/link';

export default function V2Page() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Square V2</h1>
        <p className="text-xl text-gray-600 mb-8">
          Next generation learning architecture with flexible scenario structures
        </p>
        
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/v2/scenarios"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-blue-500"
          >
            <h2 className="text-2xl font-semibold mb-2 text-blue-600">Learning Scenarios</h2>
            <p className="text-gray-600">
              Browse and start learning from our AI-powered scenarios across PBL, Discovery, and Assessment modes
            </p>
          </Link>
          
          <Link
            href="/v2/test"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Architecture Test</h2>
            <p className="text-gray-600">
              Test the V2 architecture with sample scenarios and see the data structure
            </p>
          </Link>
          
          <div className="bg-gray-100 rounded-lg p-6 opacity-50">
            <h2 className="text-2xl font-semibold mb-2">Analytics</h2>
            <p className="text-gray-600">
              Coming soon: View your learning progress and achievements
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Link
            href="/v2/assessment"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-green-500"
          >
            <h2 className="text-2xl font-semibold mb-2 text-green-600">AI Literacy Assessment</h2>
            <p className="text-gray-600">
              Test your AI literacy knowledge with our comprehensive assessment across all domains
            </p>
          </Link>
          
          <Link
            href="/v2/demo/completion"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">Completion Demo</h2>
            <p className="text-gray-600">
              Preview the completion interface with KSA scores and knowledge graph visualization
            </p>
          </Link>
          
          <div className="bg-gray-100 rounded-lg p-6 opacity-50">
            <h2 className="text-2xl font-semibold mb-2">History</h2>
            <p className="text-gray-600">
              Coming soon: View your assessment history and progress over time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}