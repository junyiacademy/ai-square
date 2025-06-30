'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, GitBranch, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { githubService, ContentFile } from '@/lib/github-service'
import { PBLFormAI } from '@/components/pbl/pbl-form-ai'
import { PRDialog } from '@/components/pbl/pr-dialog'

export default function PBLEditPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const path = searchParams.get('path') || ''
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<ContentFile | null>(null)
  const [originalContent, setOriginalContent] = useState<any>(null)
  const [showPRDialog, setShowPRDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

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
        setOriginalContent(JSON.parse(JSON.stringify(file.content)))
      }
    } catch (error) {
      console.error('Error loading content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (updatedContent: any) => {
    if (content) {
      setContent({ ...content, content: updatedContent })
      setHasChanges(JSON.stringify(updatedContent) !== JSON.stringify(originalContent))
    }
  }

  const handleCreatePR = async (title: string, description: string) => {
    if (!content) return

    setSaving(true)
    try {
      const yamlContent = githubService.convertToYaml(content.content, content.type)
      
      const pr = await githubService.createPullRequest({
        title,
        body: description,
        files: [{
          path: content.path,
          content: yamlContent,
          sha: content.sha
        }]
      })

      // Redirect to PR
      window.open(pr.url, '_blank')
      router.push('/pbl')
    } catch (error) {
      console.error('Error creating PR:', error)
      alert('Failed to create PR. Please check your GitHub token.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading scenario...</p>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load scenario</p>
          <Link href="/pbl" className="mt-4 inline-block text-primary hover:underline">
            Back to list
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/pbl" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Scenarios
        </Link>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Edit PBL Scenario</h1>
            <p className="text-muted-foreground mt-1">
              {content.name}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPRDialog(true)}
              disabled={!hasChanges || saving}
            >
              <GitBranch className="mr-2 h-4 w-4" />
              Create PR
            </Button>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            You have unsaved changes. Create a PR to save them.
          </p>
        </div>
      )}

      <PBLFormAI
        content={content.content}
        onChange={handleFormChange}
      />

      <PRDialog
        open={showPRDialog}
        onClose={() => setShowPRDialog(false)}
        onSubmit={handleCreatePR}
        loading={saving}
        fileName={content.name}
      />
    </div>
  )
}