import { Octokit } from '@octokit/rest'
import { GitHubPullRequest } from '@/types'

export interface FileItem {
  name: string
  type: 'file' | 'dir'
  path: string
}

export interface PullRequest {
  number: number
  title: string
  state: string
  branch: string
  merged: boolean
  url: string
}

export class GitHubService {
  private octokit: Octokit
  private owner: string
  private repo: string

  constructor() {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      throw new Error('GITHUB_TOKEN is required')
    }

    this.octokit = new Octokit({
      auth: token,
    })

    this.owner = process.env.GITHUB_OWNER || ''
    this.repo = process.env.GITHUB_REPO || ''
  }

  async listFiles(directory?: string): Promise<FileItem[]> {
    try {
      const path = directory || ''
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      })

      if (Array.isArray(response.data)) {
        return response.data.map(item => ({
          name: item.name,
          type: item.type as 'file' | 'dir',
          path: item.path,
        }))
      }

      return []
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`)
    }
  }

  async readFile(path: string): Promise<string> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      })

      if (!Array.isArray(response.data) && response.data.type === 'file') {
        return Buffer.from(response.data.content, 'base64').toString('utf-8')
      }

      throw new Error('File not found or is not a file')
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`)
    }
  }

  async saveFile(
    path: string,
    content: string,
    message: string,
    branch: string = 'main'
  ): Promise<void> {
    try {
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
      })
    } catch (error) {
      throw new Error(`Failed to save file: ${error}`)
    }
  }

  async createBranch(branchName: string): Promise<void> {
    try {
      // Get the latest commit SHA from main branch
      const mainBranch = await this.octokit.rest.repos.getBranch({
        owner: this.owner,
        repo: this.repo,
        branch: 'main',
      })

      // Create new branch
      await this.octokit.rest.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: mainBranch.data.commit.sha,
      })
    } catch (error) {
      throw new Error(`Failed to create branch: ${error}`)
    }
  }

  async createPullRequest(
    branchName: string,
    title: string,
    description: string
  ): Promise<{ number: number; title: string; url: string }> {
    try {
      const response = await this.octokit.rest.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body: description,
        head: branchName,
        base: 'main',
      })

      return {
        number: response.data.number,
        title: response.data.title,
        url: response.data.html_url,
      }
    } catch (error) {
      throw new Error(`Failed to create pull request: ${error}`)
    }
  }

  async listPullRequests(): Promise<PullRequest[]> {
    try {
      const response = await this.octokit.rest.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
      })

      return response.data.map(pr => {
        const pullRequest = pr as GitHubPullRequest;
        return {
          number: pullRequest.number,
          title: pullRequest.title,
          state: pullRequest.state,
          branch: pullRequest.head.ref,
          merged: pullRequest.merged || false,
          url: pullRequest.html_url,
        }
      })
    } catch (error) {
      throw new Error(`Failed to list pull requests: ${error}`)
    }
  }

  async mergePullRequest(pullNumber: number, commitTitle: string): Promise<boolean> {
    try {
      const response = await this.octokit.rest.pulls.merge({
        owner: this.owner,
        repo: this.repo,
        pull_number: pullNumber,
        commit_title: commitTitle,
      })

      return response.data.merged
    } catch (error) {
      throw new Error(`Failed to merge pull request: ${error}`)
    }
  }
}
