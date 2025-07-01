'use client'

import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'

interface FileEditorProps {
  selectedFile: string | null
}

export default function FileEditor({ selectedFile }: FileEditorProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (selectedFile) {
      loadFile(selectedFile)
    }
  }, [selectedFile])

  const loadFile = async (filePath: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/content?path=${filePath}`)
      
      if (!response.ok) {
        throw new Error('Failed to load file')
      }
      
      const data = await response.json()
      setContent(data.content)
      setHasUnsavedChanges(false)
    } catch (error) {
      setError('Error loading file')
    } finally {
      setLoading(false)
    }
  }

  const handleContentChange = (value: string | undefined) => {
    setContent(value || '')
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    if (!selectedFile) return

    try {
      setSaving(true)
      setMessage(null)
      
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedFile,
          content,
          message: `Update ${selectedFile} via CMS`,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save file')
      }
      
      setHasUnsavedChanges(false)
      setMessage('File saved successfully!')
    } catch (error) {
      setMessage('Error saving file')
    } finally {
      setSaving(false)
    }
  }

  const handleAIAssist = async (action: string) => {
    try {
      setMessage(null)
      
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          content,
        }),
      })
      
      if (!response.ok) {
        throw new Error('AI assistance failed')
      }
      
      const data = await response.json()
      setContent(data.content)
      setHasUnsavedChanges(true)
    } catch (error) {
      setMessage('AI assistance failed')
    }
  }

  if (!selectedFile) {
    return <div>Select a file to edit</div>
  }

  if (loading) {
    return <div>Loading file...</div>
  }

  if (error) {
    return <div>{error}</div>
  }

  return (
    <div>
      <div>
        <h3>
          {selectedFile} 
          {hasUnsavedChanges && <span>*</span>}
        </h3>
        
        <div>
          <button onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          
          <button onClick={() => handleAIAssist('complete')}>
            AI Complete
          </button>
          
          <button onClick={() => handleAIAssist('translate')}>
            AI Translate
          </button>
          
          <button onClick={() => handleAIAssist('improve')}>
            AI Improve
          </button>
          
          <button onClick={() => handleAIAssist('map-ksa')}>
            AI Map KSA
          </button>
        </div>
        
        {message && <div>{message}</div>}
      </div>
      
      <Editor
        height="400px"
        defaultLanguage="yaml"
        value={content}
        onChange={handleContentChange}
      />
    </div>
  )
}