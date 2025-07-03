#!/usr/bin/env node
/**
 * Simple YAML <-> JSON sync utility
 * Handles conversion between formats for hybrid workflow
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class DataSync {
  constructor() {
    this.yamlDir = path.join(__dirname, '../public/rubrics_data');
    this.jsonDir = path.join(__dirname, '../src/data');
    this.prodJsonDir = path.join(__dirname, '../public/data');
    
    // Ensure directories exist
    [this.jsonDir, this.prodJsonDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Convert YAML to JSON (for development)
   */
  yamlToJson(filename) {
    const yamlPath = path.join(this.yamlDir, `${filename}.yaml`);
    const jsonPath = path.join(this.jsonDir, `${filename}.json`);
    
    if (!fs.existsSync(yamlPath)) {
      console.error(`❌ YAML file not found: ${yamlPath}`);
      return false;
    }

    try {
      // Read and parse YAML
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      const data = yaml.load(yamlContent);
      
      // Write formatted JSON for development
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      
      // Also create optimized JSON for production
      const prodJsonPath = path.join(this.prodJsonDir, `${filename}.json`);
      fs.writeFileSync(prodJsonPath, JSON.stringify(data));
      
      console.log(`✅ ${filename}: YAML → JSON`);
      return true;
    } catch (error) {
      console.error(`❌ Error converting ${filename}:`, error.message);
      return false;
    }
  }

  /**
   * Convert JSON to YAML (for content editors)
   */
  jsonToYaml(filename) {
    const jsonPath = path.join(this.jsonDir, `${filename}.json`);
    const yamlPath = path.join(this.yamlDir, `${filename}.yaml`);
    
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ JSON file not found: ${jsonPath}`);
      return false;
    }

    try {
      // Read and parse JSON
      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      const data = JSON.parse(jsonContent);
      
      // Create readable YAML with comments
      let yamlContent = yaml.dump(data, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
        quotingType: '"',
        forceQuotes: false
      });
      
      // Add helpful header
      const header = `# ${filename.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
# Last synced: ${new Date().toISOString()}
# 
# 編輯說明:
# - 使用空格縮排 (不要用 Tab)
# - 多行文字使用 | 符號
# - 儲存後執行 npm run data:sync
#
`;
      
      yamlContent = header + yamlContent;
      
      // Write YAML
      fs.writeFileSync(yamlPath, yamlContent);
      console.log(`✅ ${filename}: JSON → YAML`);
      return true;
    } catch (error) {
      console.error(`❌ Error converting ${filename}:`, error.message);
      return false;
    }
  }

  /**
   * Sync all files
   */
  syncAll(direction = 'yaml-to-json') {
    console.log(`\n🔄 Syncing data files (${direction})...\n`);
    
    const files = [
      'ai_lit_domains',
      'ksa_codes',
      'ai_literacy_questions',
      'ai_job_search_scenario'
    ];
    
    let success = 0;
    let failed = 0;
    
    files.forEach(file => {
      const result = direction === 'yaml-to-json' 
        ? this.yamlToJson(file)
        : this.jsonToYaml(file);
      
      if (result) success++;
      else failed++;
    });
    
    console.log(`\n📊 Summary: ${success} succeeded, ${failed} failed`);
    
    if (failed > 0) {
      process.exit(1);
    }
  }

  /**
   * Watch for changes
   */
  watch() {
    console.log('👀 Watching for file changes...\n');
    
    // Watch YAML files
    fs.watch(this.yamlDir, (eventType, filename) => {
      if (filename && filename.endsWith('.yaml')) {
        console.log(`\n📝 Change detected: ${filename}`);
        const basename = filename.replace('.yaml', '');
        this.yamlToJson(basename);
      }
    });
    
    // Watch JSON files
    fs.watch(this.jsonDir, (eventType, filename) => {
      if (filename && filename.endsWith('.json')) {
        console.log(`\n📝 Change detected: ${filename}`);
        const basename = filename.replace('.json', '');
        this.jsonToYaml(basename);
      }
    });
    
    console.log('Press Ctrl+C to stop watching.\n');
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0] || 'help';
const sync = new DataSync();

switch (command) {
  case 'yaml-to-json':
  case 'y2j':
    sync.syncAll('yaml-to-json');
    break;
    
  case 'json-to-yaml':
  case 'j2y':
    sync.syncAll('json-to-yaml');
    break;
    
  case 'watch':
    sync.watch();
    break;
    
  case 'help':
  default:
    console.log(`
YAML ↔ JSON Data Sync Utility

Usage:
  node sync-yaml-json.js <command>

Commands:
  yaml-to-json, y2j    Convert YAML files to JSON
  json-to-yaml, j2y    Convert JSON files to YAML  
  watch               Watch for changes and auto-sync
  help                Show this help message

Examples:
  npm run data:sync          # Sync YAML to JSON
  npm run data:reverse-sync  # Sync JSON to YAML
  npm run data:watch         # Watch mode
`);
    break;
}

module.exports = DataSync;