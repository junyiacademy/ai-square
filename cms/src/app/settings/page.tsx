'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Key, Globe, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const [githubToken, setGithubToken] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // In a real app, you would save these settings
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    alert('Settings saved successfully!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Configure your CMS preferences
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Key className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">GitHub Integration</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="github-token">Personal Access Token</Label>
                <Input
                  id="github-token"
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Your GitHub personal access token with repo permissions
                </p>
              </div>
              
              <div>
                <Label htmlFor="repo-info">Repository</Label>
                <Input
                  id="repo-info"
                  value="junyiacademy/ai-square"
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Language Settings</h2>
            </div>
            
            <p className="text-gray-600">
              Default language: <span className="font-medium">English</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              All 9 languages are enabled by default
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Storage Settings</h2>
            </div>
            
            <p className="text-gray-600">
              Content Path: <span className="font-medium">cms/content/</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Content is stored in GitHub and published to Google Cloud Storage
            </p>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}