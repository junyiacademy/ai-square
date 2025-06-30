import { promises as fs } from 'fs'
import path from 'path'
import yaml from 'js-yaml'

export interface LocalFile {
  path: string
  name: string
  content?: any
  type: 'yaml' | 'json'
}

class LocalFileService {
  private basePath: string

  constructor() {
    this.basePath = path.join(process.cwd(), 'content')
  }

  async listContent(dir: string): Promise<LocalFile[]> {
    try {
      const fullPath = path.join(this.basePath, dir)
      const files = await fs.readdir(fullPath)
      
      return files
        .filter(file => 
          file.endsWith('.yaml') || 
          file.endsWith('.yml') || 
          file.endsWith('.json') &&
          !file.startsWith('_')  // 排除模板檔案
        )
        .map(file => ({
          path: path.join(dir, file),
          name: file,
          type: file.endsWith('.json') ? 'json' : 'yaml'
        }))
    } catch (error) {
      console.error('Error listing files:', error)
      return []
    }
  }

  async getContent(filePath: string): Promise<LocalFile | null> {
    try {
      const fullPath = path.join(this.basePath, filePath)
      const content = await fs.readFile(fullPath, 'utf-8')
      const isJson = filePath.endsWith('.json')
      
      return {
        path: filePath,
        name: path.basename(filePath),
        content: isJson ? JSON.parse(content) : yaml.load(content),
        type: isJson ? 'json' : 'yaml'
      }
    } catch (error) {
      console.error('Error reading file:', error)
      return null
    }
  }

  async saveContent(filePath: string, content: any, type: 'yaml' | 'json'): Promise<void> {
    try {
      const fullPath = path.join(this.basePath, filePath)
      const data = type === 'json' 
        ? JSON.stringify(content, null, 2)
        : yaml.dump(content, { indent: 2, lineWidth: -1, noRefs: true })
      
      await fs.writeFile(fullPath, data, 'utf-8')
    } catch (error) {
      console.error('Error saving file:', error)
      throw error
    }
  }

  convertToYaml(content: any, type: 'yaml' | 'json'): string {
    if (type === 'json') {
      return yaml.dump(content, { indent: 2, lineWidth: -1, noRefs: true })
    }
    return yaml.dump(content, { indent: 2, lineWidth: -1, noRefs: true })
  }
}

export const localFileService = new LocalFileService()