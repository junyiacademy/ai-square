'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { githubService, ContentFile } from '@/lib/github-service'
import { PRDialog } from '@/components/pbl/pr-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export default function RubricsEditPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const path = searchParams.get('path') || ''
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<ContentFile | null>(null)
  const [yamlText, setYamlText] = useState('')
  const [originalYaml, setOriginalYaml] = useState('')
  const [showPRDialog, setShowPRDialog] = useState(false)

  useEffect(() => {
    if (path) {
      loadContent()
    }
  }, [path])

  const loadContent = async () => {
    try {
      const file = await githubService.getContent(path)
      if (file) {
        setContent(file)
        const yaml = githubService.convertToYaml(file.content, file.type)
        setYamlText(yaml)
        setOriginalYaml(yaml)
      }
    } catch (error) {
      console.error('Error loading content:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasChanges = yamlText !== originalYaml

  const handleCreatePR = async (title: string, description: string) => {
    if (!content) return

    setSaving(true)
    try {
      const pr = await githubService.createPullRequest({
        title,
        body: description,
        files: [{
          path: content.path,
          content: yamlText,
          sha: content.sha
        }]
      })

      window.open(pr.url, '_blank')
      router.push('/rubrics')
    } catch (error) {
      console.error('Error creating PR:', error)
      alert('Failed to create PR. Please check your GitHub token.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600">Loading rubric...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-red-600">Failed to load rubric</p>
            <Link href="/rubrics" className="mt-4 inline-block text-purple-600 hover:underline">
              Back to list
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/rubrics" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rubrics
          </Link>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Edit Rubric
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                {content.name}
              </p>
            </div>
            
            <Button
              onClick={() => setShowPRDialog(true)}
              disabled={!hasChanges || saving}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            >
              <GitBranch className="mr-2 h-4 w-4" />
              Create PR
            </Button>
          </div>
        </div>

        {hasChanges && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              You have unsaved changes. Create a PR to save them.
            </p>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <Label htmlFor="yaml-content" className="text-lg font-semibold text-gray-900 mb-4 block">
            YAML Content
          </Label>
          <Textarea
            id="yaml-content"
            value={yamlText}
            onChange={(e) => setYamlText(e.target.value)}
            className="font-mono text-sm min-h-[600px]"
            placeholder="Edit your YAML content here..."
          />
        </div>

        <PRDialog
          open={showPRDialog}
          onClose={() => setShowPRDialog(false)}
          onSubmit={handleCreatePR}
          loading={saving}
          fileName={content.name}
        />
      </div>
    </div>
  )
}