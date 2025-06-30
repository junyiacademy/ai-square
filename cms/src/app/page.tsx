import Link from 'next/link'
import { FileText, BookOpen, Settings, GitBranch, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            <GitBranch className="h-4 w-4" />
            GitHub-based CMS
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Square CMS
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage your educational content with version control, visual editing, and one-click deployment
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <Link
            href="/pbl"
            className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="mb-4 inline-flex p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900">PBL Scenarios</h2>
              <p className="text-gray-600">
                Create and edit problem-based learning scenarios with multi-language support
              </p>
              <div className="mt-4 flex items-center text-blue-600 font-medium">
                Edit scenarios
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            href="/rubrics"
            className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-purple-200"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="mb-4 inline-flex p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900">Rubrics</h2>
              <p className="text-gray-600">
                Manage assessment rubrics and evaluation criteria for AI literacy
              </p>
              <div className="mt-4 flex items-center text-purple-600 font-medium">
                Manage rubrics
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            href="/settings"
            className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-green-200"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="mb-4 inline-flex p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                <Settings className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900">Settings</h2>
              <p className="text-gray-600">
                Configure GitHub integration and CMS preferences
              </p>
              <div className="mt-4 flex items-center text-green-600 font-medium">
                Configure
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              <h3 className="text-xl font-bold text-gray-900">Quick Start Guide</h3>
            </div>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <span className="text-gray-700">Configure your GitHub token in Settings</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <span className="text-gray-700">Choose a content type to edit (PBL or Rubrics)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <span className="text-gray-700">Make changes using the visual editor</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <span className="text-gray-700">Create a Pull Request with one click</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">5</span>
                <span className="text-gray-700">Changes auto-publish to GCS after merge</span>
              </li>
            </ol>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8 rounded-2xl shadow-lg text-white">
            <h3 className="text-xl font-bold mb-4">Key Features</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Visual YAML editor - no coding required</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Multi-language support (9 languages)</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>GitHub version control integration</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Automated content deployment</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>AI-powered translation (coming soon)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}