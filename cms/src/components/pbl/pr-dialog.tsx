'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { GitBranch } from 'lucide-react'

interface PRDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (title: string, description: string) => void
  loading?: boolean
  fileName: string
}

export function PRDialog({ open, onClose, onSubmit, loading, fileName }: PRDialogProps) {
  const [title, setTitle] = useState(`Update ${fileName}`)
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const fullDescription = `## Changes
${description}

## File Updated
- ${fileName}

---
*This PR was created via the AI Square CMS*`

    onSubmit(title, fullDescription)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Pull Request</DialogTitle>
          <DialogDescription>
            Create a PR to save your changes. The changes will be reviewed before merging.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pr-title">PR Title</Label>
            <Input
              id="pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of changes"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="pr-description">Description</Label>
            <Textarea
              id="pr-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what was changed and why"
              rows={4}
              required
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>Creating PR...</>
              ) : (
                <>
                  <GitBranch className="mr-2 h-4 w-4" />
                  Create PR
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}