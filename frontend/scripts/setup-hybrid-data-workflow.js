#!/usr/bin/env node
/**
 * Setup Hybrid YAML/JSON Data Workflow
 * - Development: Use JSON (better tooling)
 * - Content Editing: Use YAML (human-friendly)
 * - Production: Use optimized JSON (performance)
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class HybridDataSetup {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.dataDir = path.join(this.rootDir, 'public/rubrics_data');
    this.srcDataDir = path.join(this.rootDir, 'src/data');
  }

  async setup() {
    console.log('🚀 Setting up Hybrid YAML/JSON Workflow\n');

    try {
      // 1. Create directory structure
      await this.createDirectoryStructure();

      // 2. Move existing files
      await this.reorganizeFiles();

      // 3. Update TypeScript imports
      await this.updateImports();

      // 4. Add npm scripts
      await this.updatePackageJson();

      // 5. Create data service
      await this.createDataService();

      // 6. Setup git hooks
      await this.setupGitHooks();

      console.log('\n✅ Hybrid workflow setup complete!');
      console.log('\n📚 Usage:');
      console.log('  - Developers: Edit files in src/data/*.json');
      console.log('  - Content editors: Edit files in public/rubrics_data/*.yaml');
      console.log('  - Run "npm run data:sync" to synchronize');
      console.log('  - Production build automatically uses optimized JSON');

    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  }

  async createDirectoryStructure() {
    console.log('📁 Creating directory structure...');

    const dirs = [
      'src/data',              // JSON files for development
      'src/data/schemas',      // JSON schemas for validation
      'public/rubrics_data',   // YAML files for editing
      'public/data',          // Optimized JSON for production
    ];

    for (const dir of dirs) {
      const fullPath = path.join(this.rootDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`  ✓ Created ${dir}`);
      }
    }
  }

  async reorganizeFiles() {
    console.log('\n📦 Reorganizing files...');

    // Check if we need to convert YAML to JSON first
    const yamlFiles = fs.readdirSync(this.dataDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    if (yamlFiles.length > 0) {
      console.log(`  Found ${yamlFiles.length} YAML files to process`);
      
      // Install js-yaml if needed
      try {
        require('js-yaml');
      } catch {
        console.log('  Installing js-yaml...');
        await execPromise('npm install js-yaml');
      }

      const yaml = require('js-yaml');

      for (const file of yamlFiles) {
        const yamlPath = path.join(this.dataDir, file);
        const jsonPath = path.join(this.srcDataDir, file.replace(/\.ya?ml$/, '.json'));

        // Read YAML
        const yamlContent = fs.readFileSync(yamlPath, 'utf8');
        const data = yaml.load(yamlContent);

        // Write JSON
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        console.log(`  ✓ Converted ${file} to JSON`);
      }
    }
  }

  async updateImports() {
    console.log('\n🔧 Creating data service...');

    const dataService = `/**
 * Hybrid Data Service
 * Handles loading data from appropriate source based on environment
 */

interface DataConfig {
  useCached?: boolean;
  preferJson?: boolean;
}

class DataService {
  private static cache = new Map<string, any>();
  private static isProduction = process.env.NODE_ENV === 'production';

  /**
   * Load data with automatic format selection
   */
  static async loadData<T>(filename: string, config: DataConfig = {}): Promise<T> {
    const cacheKey = filename;
    
    // Check cache
    if (config.useCached && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      let data: T;

      if (this.isProduction || config.preferJson) {
        // Production: Use optimized JSON
        data = await import(\`/data/\${filename}.json\`).then(m => m.default);
      } else {
        // Development: Use source JSON
        data = await import(\`@/data/\${filename}.json\`).then(m => m.default);
      }

      // Cache the data
      this.cache.set(cacheKey, data);
      return data;

    } catch (error) {
      console.error(\`Failed to load data: \${filename}\`, error);
      throw error;
    }
  }

  /**
   * Load domain data
   */
  static async getDomainData() {
    return this.loadData<DomainData>('ai_lit_domains', { useCached: true });
  }

  /**
   * Load KSA codes
   */
  static async getKSACodes() {
    return this.loadData<KSACodesFile>('ksa_codes', { useCached: true });
  }

  /**
   * Load assessment questions
   */
  static async getQuestions() {
    return this.loadData('ai_literacy_questions', { useCached: true });
  }

  /**
   * Load PBL scenarios
   */
  static async getScenarios() {
    return this.loadData('ai_job_search_scenario', { useCached: true });
  }

  /**
   * Clear cache (useful for hot reloading in development)
   */
  static clearCache() {
    this.cache.clear();
  }
}

// Types
interface DomainData {
  domains: Record<string, Domain>;
}

interface Domain {
  emoji: string;
  overview: string;
  [key: string]: any;
}

interface KSACodesFile {
  knowledge_codes: any;
  skills_codes: any;
  attitudes_codes: any;
}

export default DataService;
export { DataService, type DataConfig };
`;

    const servicePath = path.join(this.rootDir, 'src/services/data-service.ts');
    fs.writeFileSync(servicePath, dataService);
    console.log('  ✓ Created src/services/data-service.ts');
  }

  async updatePackageJson() {
    console.log('\n📝 Updating package.json...');

    const packagePath = path.join(this.rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Add new scripts
    const newScripts = {
      'data:json-to-yaml': 'python scripts/json-to-yaml-workflow.py j2y',
      'data:yaml-to-json': 'python scripts/json-to-yaml-workflow.py y2j',
      'data:sync': 'npm run data:yaml-to-json && npm run data:validate',
      'data:validate': 'tsx scripts/validate-content-simple.ts',
      'data:optimize': 'NODE_ENV=production node scripts/build-data-optimizer.js',
      'prebuild': 'npm run data:sync && npm run data:optimize',
      'dev:sync': 'nodemon --watch "public/rubrics_data/*.yaml" --exec "npm run data:sync"'
    };

    packageJson.scripts = {
      ...packageJson.scripts,
      ...newScripts
    };

    // Add devDependencies if needed
    if (!packageJson.devDependencies.nodemon) {
      packageJson.devDependencies.nodemon = '^3.0.0';
    }

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('  ✓ Added data management scripts');
  }

  async createDataService() {
    console.log('\n🎯 Creating optimized data loader...');

    const loaderContent = `/**
 * Data Loader Configuration
 * Automatically selects appropriate data source
 */

import { DataService } from '@/services/data-service';

// Re-export for convenience
export { DataService };

// Environment-based configuration
const config = {
  development: {
    source: 'src/data',
    format: 'json',
    cache: true
  },
  production: {
    source: 'public/data',
    format: 'json',
    cache: true,
    preload: true
  }
};

// Initialize based on environment
const env = process.env.NODE_ENV || 'development';
const currentConfig = config[env as keyof typeof config];

// Preload critical data in production
if (currentConfig.preload && typeof window !== 'undefined') {
  // Use requestIdleCallback for non-blocking preload
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      DataService.getDomainData();
      DataService.getKSACodes();
    });
  }
}

export default currentConfig;
`;

    const loaderPath = path.join(this.rootDir, 'src/lib/data-loader.ts');
    fs.writeFileSync(loaderPath, loaderContent);
    console.log('  ✓ Created src/lib/data-loader.ts');
  }

  async setupGitHooks() {
    console.log('\n🔗 Setting up git hooks...');

    const huskyConfig = {
      hooks: {
        'pre-commit': 'npm run data:sync && git add src/data/*.json public/data/*.json'
      }
    };

    // Create .husky directory if it doesn't exist
    const huskyDir = path.join(this.rootDir, '.husky');
    if (!fs.existsSync(huskyDir)) {
      console.log('  ℹ️  Husky not configured. Skipping git hooks.');
      console.log('  To enable: npx husky install');
      return;
    }

    // Create pre-commit hook
    const preCommitHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Sync data files before commit
echo "🔄 Syncing data files..."
npm run data:sync

# Add updated JSON files
git add src/data/*.json public/data/*.json

echo "✅ Data files synced"
`;

    const hookPath = path.join(huskyDir, 'pre-commit');
    fs.writeFileSync(hookPath, preCommitHook);
    fs.chmodSync(hookPath, '755');
    console.log('  ✓ Created pre-commit hook');
  }
}

// Run setup
if (require.main === module) {
  const setup = new HybridDataSetup();
  setup.setup();
}

module.exports = HybridDataSetup;