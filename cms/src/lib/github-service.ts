import { Octokit } from '@octokit/rest'
import yaml from 'js-yaml'

export interface ContentFile {
  path: string
  name: string
  sha: string
  content?: any
  type: 'yaml' | 'json'
}

export interface CreatePRParams {
  title: string
  body: string
  files: Array<{
    path: string
    content: string
    sha?: string
  }>
}

class GitHubService {
  private octokit: Octokit
  private owner: string
  private repo: string
  private basePath: string

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    })
    this.owner = process.env.GITHUB_OWNER || ''
    this.repo = process.env.GITHUB_REPO || ''
    this.basePath = process.env.GITHUB_CONTENT_PATH || ''
  }

  async listContent(path: string): Promise<ContentFile[]> {
    try {
      const fullPath = `${this.basePath}/${path}`.replace(/\/+/g, '/')
      console.log('Fetching from GitHub:', { owner: this.owner, repo: this.repo, path: fullPath })
      
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: fullPath
      })

      if (!Array.isArray(data)) {
        return []
      }

      return data
        .filter(item => 
          item.type === 'file' && 
          !item.name.startsWith('_') &&  // 忽略模板檔案
          (item.name.endsWith('.yaml') || item.name.endsWith('.yml') || item.name.endsWith('.json'))
        )
        .map(item => ({
          path: item.path,
          name: item.name,
          sha: item.sha,
          type: item.name.endsWith('.json') ? 'json' : 'yaml'
        }))
    } catch (error) {
      console.error('Error listing content:', error)
      return []
    }
  }

  async getContent(path: string): Promise<ContentFile | null> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path
      })

      if ('content' in data && data.type === 'file') {
        const content = Buffer.from(data.content, 'base64').toString('utf-8')
        const isJson = path.endsWith('.json')
        
        return {
          path: data.path,
          name: data.name,
          sha: data.sha,
          content: isJson ? JSON.parse(content) : yaml.load(content),
          type: isJson ? 'json' : 'yaml'
        }
      }

      return null
    } catch (error) {
      console.error('Error getting content:', error)
      return null
    }
  }

  async createPullRequest(params: CreatePRParams): Promise<{ url: string; number: number }> {
    // Create a new branch
    const timestamp = Date.now()
    const branchName = `cms-update-${timestamp}`

    // Get the default branch SHA
    const { data: ref } = await this.octokit.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: 'heads/main'
    })

    // Create new branch
    await this.octokit.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha
    })

    // Update files
    for (const file of params.files) {
      const content = file.path.endsWith('.json') 
        ? JSON.stringify(JSON.parse(file.content), null, 2)
        : file.content

      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: file.path,
        message: `Update ${file.path} via CMS`,
        content: Buffer.from(content).toString('base64'),
        branch: branchName,
        sha: file.sha
      })
    }

    // Create pull request
    const { data: pr } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: params.title,
      body: params.body,
      head: branchName,
      base: 'main'
    })

    return {
      url: pr.html_url,
      number: pr.number
    }
  }

  // Convert YAML content to JSON for saving
  convertToJson(content: any, type: 'yaml' | 'json'): string {
    if (type === 'json') {
      return JSON.stringify(content, null, 2)
    }
    return yaml.dump(content, { 
      indent: 2,
      lineWidth: -1,
      noRefs: true 
    })
  }
}

// Export singleton instance
export const githubService = new GitHubService()