#!/usr/bin/env node
/**
 * Build-time data optimization
 * Converts YAML to JSON for production while keeping YAML for development
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class DataOptimizer {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      totalSizeBefore: 0,
      totalSizeAfter: 0,
      errors: []
    };
  }

  async optimizeForProduction() {
    console.log('🚀 Optimizing data files for production...\n');

    const dataDir = path.join(__dirname, '../public/rubrics_data');
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      console.log('⚠️  Not in production mode. Skipping optimization.');
      console.log('   Use: NODE_ENV=production npm run build\n');
      return;
    }

    try {
      // Process all YAML files
      const yamlFiles = fs.readdirSync(dataDir)
        .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

      for (const file of yamlFiles) {
        await this.processFile(path.join(dataDir, file));
      }

      // Generate optimized loader
      this.generateOptimizedLoader(dataDir);

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error('❌ Optimization failed:', error);
      process.exit(1);
    }
  }

  async processFile(filePath) {
    try {
      const fileName = path.basename(filePath);
      console.log(`Processing ${fileName}...`);

      // Read YAML
      const yamlContent = fs.readFileSync(filePath, 'utf8');
      const data = yaml.load(yamlContent);

      // Calculate sizes
      const yamlSize = Buffer.byteLength(yamlContent);
      this.stats.totalSizeBefore += yamlSize;

      // Convert to optimized JSON
      const jsonContent = JSON.stringify(data);
      const jsonSize = Buffer.byteLength(jsonContent);
      this.stats.totalSizeAfter += jsonSize;

      // Save JSON file
      const jsonPath = filePath.replace(/\.ya?ml$/, '.json');
      fs.writeFileSync(jsonPath, jsonContent);

      // Calculate compression ratio
      const reduction = ((yamlSize - jsonSize) / yamlSize * 100).toFixed(1);
      console.log(`  ✅ ${fileName} → ${path.basename(jsonPath)} (${reduction}% smaller)`);

      this.stats.filesProcessed++;

    } catch (error) {
      this.stats.errors.push({ file: filePath, error: error.message });
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }

  generateOptimizedLoader(dataDir) {
    console.log('\nGenerating optimized data loader...');

    const loaderContent = `/**
 * Auto-generated optimized data loader for production
 * Generated at: ${new Date().toISOString()}
 */

// Use dynamic imports for code splitting
export const loadDomainData = () => import('./rubrics_data/ai_lit_domains.json');
export const loadKSAData = () => import('./rubrics_data/ksa_codes.json');
export const loadQuestionsData = () => import('./rubrics_data/ai_literacy_questions.json');
export const loadScenarioData = () => import('./rubrics_data/ai_job_search_scenario.json');

// Preload critical data
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Preload domain data during idle time
    loadDomainData();
  });
}

// Cache management
const dataCache = new Map();

export async function getCachedData(loader, key) {
  if (dataCache.has(key)) {
    return dataCache.get(key);
  }
  
  const data = await loader();
  dataCache.set(key, data.default || data);
  return data.default || data;
}

// Convenience methods
export const getDomainData = () => getCachedData(loadDomainData, 'domains');
export const getKSAData = () => getCachedData(loadKSAData, 'ksa');
export const getQuestionsData = () => getCachedData(loadQuestionsData, 'questions');
export const getScenarioData = () => getCachedData(loadScenarioData, 'scenario');
`;

    const loaderPath = path.join(dataDir, '..', '..', 'lib', 'data-loader.production.ts');
    fs.mkdirSync(path.dirname(loaderPath), { recursive: true });
    fs.writeFileSync(loaderPath, loaderContent);

    console.log('  ✅ Created lib/data-loader.production.ts');
  }

  printSummary() {
    console.log('\n📊 Optimization Summary:');
    console.log('═══════════════════════════════════════');
    
    const sizeBefore = (this.stats.totalSizeBefore / 1024).toFixed(1);
    const sizeAfter = (this.stats.totalSizeAfter / 1024).toFixed(1);
    const totalReduction = (this.stats.totalSizeBefore - this.stats.totalSizeAfter) / 1024;
    const reductionPercent = ((totalReduction / (this.stats.totalSizeBefore / 1024)) * 100).toFixed(1);

    console.log(`Files processed: ${this.stats.filesProcessed}`);
    console.log(`Total size before: ${sizeBefore} KB`);
    console.log(`Total size after: ${sizeAfter} KB`);
    console.log(`Total reduction: ${totalReduction.toFixed(1)} KB (${reductionPercent}%)`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${this.stats.errors.length}`);
      this.stats.errors.forEach(({ file, error }) => {
        console.log(`   - ${path.basename(file)}: ${error}`);
      });
    }

    console.log('\n✨ Production optimization complete!');
  }
}

// Add to package.json scripts
function updatePackageJson() {
  const packagePath = path.join(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  if (!pkg.scripts['build:data']) {
    pkg.scripts['build:data'] = 'node scripts/build-data-optimizer.js';
    pkg.scripts['build:prod'] = 'npm run build:data && next build';
    
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    console.log('\n📝 Updated package.json with new build scripts');
  }
}

// Run if called directly
if (require.main === module) {
  const optimizer = new DataOptimizer();
  optimizer.optimizeForProduction();
}