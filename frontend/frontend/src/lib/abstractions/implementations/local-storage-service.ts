interface StorageFile {
  name: string;
  size: number;
  lastModified: Date;
}

export class LocalStorageService {
  private prefix = 'ai-square-v2:';

  async read(path: string): Promise<string | null> {
    try {
      const key = this.prefix + path;
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return null;
    }
  }

  async write(path: string, content: string): Promise<void> {
    try {
      const key = this.prefix + path;
      localStorage.setItem(key, content);
    } catch (error) {
      console.error('Failed to write to localStorage:', error);
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    try {
      const key = this.prefix + path;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to delete from localStorage:', error);
      throw error;
    }
  }

  async list(prefix: string): Promise<StorageFile[]> {
    try {
      const files: StorageFile[] = [];
      const fullPrefix = this.prefix + prefix;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(fullPrefix)) {
          const path = key.substring(this.prefix.length);
          const content = localStorage.getItem(key);
          
          files.push({
            name: path,
            size: content ? content.length : 0,
            lastModified: new Date(), // localStorage doesn't track modification time
          });
        }
      }

      return files;
    } catch (error) {
      console.error('Failed to list from localStorage:', error);
      return [];
    }
  }

  async exists(path: string): Promise<boolean> {
    const key = this.prefix + path;
    return localStorage.getItem(key) !== null;
  }
}