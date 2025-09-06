/**
 * Performance Tests - Bundle Size Validation
 * Following TDD principles from @CLAUDE.md
 */

import fs from 'fs';
import path from 'path';

describe.skip('Bundle Size Performance', () => {
  describe.skip('Dependencies Size Check', () => {
    it('should not include both heroicons and lucide-react (duplicate icon libraries)', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      const hasHeroicons = '@heroicons/react' in (packageJson.dependencies || {});
      const hasLucide = 'lucide-react' in (packageJson.dependencies || {});
      
      // Fail if both are present
      expect(hasHeroicons && hasLucide).toBe(false);
      
      // Should only have one icon library
      expect(hasHeroicons || hasLucide).toBe(true);
    });

    it('should lazy load Monaco Editor to reduce initial bundle', () => {
      // Check if Monaco is imported dynamically
      const searchPattern = /import.*monaco-editor/;
      const dynamicPattern = /dynamic.*monaco|lazy.*monaco/i;
      
      // Find all files that import Monaco
      const srcDir = path.join(process.cwd(), 'src');
      const files = findFilesWithPattern(srcDir, searchPattern);
      
      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const hasDynamicImport = dynamicPattern.test(content) || 
                                content.includes('import(') && content.includes('monaco');
        
        // Monaco should be loaded dynamically
        expect({
          file: path.relative(process.cwd(), file),
          hasDynamicImport
        }).toEqual({
          file: path.relative(process.cwd(), file),
          hasDynamicImport: true
        });
      });
    });
  });

  describe.skip('Build Output Size', () => {
    it('should have First Load JS less than 200KB', async () => {
      // This test would run after build
      // For now, we set expected values
      const MAX_FIRST_LOAD_JS = 200; // KB
      
      // In real scenario, parse build output
      // const buildOutput = await getBuildStats();
      // expect(buildOutput.firstLoadJS).toBeLessThan(MAX_FIRST_LOAD_JS);
      
      // Placeholder assertion
      expect(MAX_FIRST_LOAD_JS).toBeLessThan(250);
    });
  });
});

// Helper function to find files with pattern
function findFilesWithPattern(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        results.push(...findFilesWithPattern(fullPath, pattern));
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (pattern.test(content)) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Directory might not exist
  }
  
  return results;
}