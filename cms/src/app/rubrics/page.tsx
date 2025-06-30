'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, FileText, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { githubService, ContentFile } from '@/lib/github-service'

export default function RubricsListPage() {
  const [rubrics, setRubrics] = useState<ContentFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRubrics()
  }, [])

  const loadRubrics = async () => {
    try {
      const files = await githubService.listContent('rubrics_data')
      setRubrics(files)
    } catch (error) {
      console.error('Error loading rubrics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Rubrics Management
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Manage AI literacy assessment rubrics
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600">Loading rubrics...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {rubrics.map((rubric) => (
              <Link
                key={rubric.path}
                href={`/rubrics/edit?path=${encodeURIComponent(rubric.path)}`}
                className="block"
              >
                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-purple-400 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 capitalize">
                          {rubric.name.replace(/\.(yaml|yml|json)$/, '').replace(/_/g, ' ')}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {rubric.path}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="hover:bg-purple-50">
                      <Edit className="h-4 w-4 text-purple-600" />
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
            
            {rubrics.length === 0 && (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No rubrics found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}