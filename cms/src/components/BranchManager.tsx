'use client'

import { useState, useEffect } from 'react'

interface PullRequest {
  number: number
  title: string
  state: string
  branch: string
  merged: boolean
  url: string
}

export default function BranchManager() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newBranchName, setNewBranchName] = useState('')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    loadPullRequests()
  }, [])

  const loadPullRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/branches/list')
      
      if (!response.ok) {
        throw new Error('Failed to load pull requests')
      }
      
      const data = await response.json()
      setPullRequests(data.pullRequests || [])
    } catch (error) {
      setError('Error loading pull requests')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return

    try {
      setCreating(true)
      setMessage(null)
      
      const response = await fetch('/api/git/branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: newBranchName,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create branch')
      }
      
      setMessage('Branch created successfully')
      setNewBranchName('')
    } catch (error) {
      setMessage('Error creating branch')
    } finally {
      setCreating(false)
    }
  }

  const handleCreatePR = async (pr: PullRequest) => {
    try {
      setMessage(null)
      
      const response = await fetch('/api/git/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: pr.branch,
          title: pr.title,
          description: 'Automated PR created from CMS',
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create pull request')
      }
      
      setMessage('Pull request created successfully')
      loadPullRequests()
    } catch (error) {
      setMessage('Error creating pull request')
    }
  }

  const handleMergePR = async (pr: PullRequest) => {
    try {
      setMessage(null)
      
      const response = await fetch(`/api/branches/${pr.branch}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pullNumber: pr.number,
          commitTitle: pr.title,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to merge pull request')
      }
      
      setMessage('Pull request merged successfully')
      loadPullRequests()
    } catch (error) {
      setMessage('Error merging pull request')
    }
  }

  return (
    <div>
      <h2>Branch Management</h2>
      
      <div>
        <input
          type="text"
          placeholder="Enter branch name"
          value={newBranchName}
          onChange={(e) => setNewBranchName(e.target.value)}
        />
        <button
          onClick={handleCreateBranch}
          disabled={creating || !newBranchName.trim()}
        >
          {creating ? 'Creating...' : 'Create Branch'}
        </button>
      </div>

      {message && <div>{message}</div>}

      <div>
        <button onClick={loadPullRequests}>Refresh</button>
      </div>

      {loading && <div>Loading pull requests...</div>}
      {error && <div>{error}</div>}

      {!loading && !error && pullRequests.length === 0 && (
        <div>No open pull requests</div>
      )}

      {pullRequests.map((pr) => (
        <div key={pr.number}>
          <h3>
            {pr.title} <span>#{pr.number}</span>
          </h3>
          <p>Branch: {pr.branch}</p>
          
          <div>
            <button onClick={() => handleCreatePR(pr)}>
              Create PR
            </button>
            <button onClick={() => handleMergePR(pr)}>
              Merge
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}