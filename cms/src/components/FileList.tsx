'use client'

import { useState, useEffect } from 'react'

interface FileItem {
  name: string
  type: 'file' | 'dir'
  path: string
}

interface FileListProps {
  onFileSelect: (path: string) => void
  currentDirectory?: string
}

export default function FileList({ onFileSelect, currentDirectory }: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFiles = async (directory?: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const url = directory ? `/api/files?directory=${directory}` : '/api/files'
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to load files')
      }
      
      const data = await response.json()
      setFiles(data.files || [])
    } catch (error) {
      setError('Error loading files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles(currentDirectory)
  }, [currentDirectory])

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'file') {
      onFileSelect(file.path)
    } else {
      // Navigate to directory
      loadFiles(file.path)
    }
  }

  const handleBackClick = () => {
    const parentDir = currentDirectory?.split('/').slice(0, -1).join('/')
    loadFiles(parentDir || undefined)
  }

  if (loading) {
    return <div>Loading files...</div>
  }

  if (error) {
    return <div>{error}</div>
  }

  if (files.length === 0) {
    return <div>No files found</div>
  }

  return (
    <div>
      {currentDirectory && (
        <button onClick={handleBackClick}>← Back</button>
      )}
      
      <button onClick={() => loadFiles(currentDirectory)}>Refresh</button>
      
      <ul>
        {files.map((file) => (
          <li key={file.path}>
            <button onClick={() => handleFileClick(file)}>
              {file.name} {file.type === 'dir' ? '📁' : '📄'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}