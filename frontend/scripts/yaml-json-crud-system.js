#!/usr/bin/env node
/**
 * YAML <-> JSON CRUD System
 * Supports partial updates while maintaining sync between formats
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class YamlJsonCrudSystem {
  constructor() {
    this.dataDir = path.join(__dirname, '../public/rubrics_data');
    this.jsonDir = path.join(__dirname, '../public/rubrics_data_json');
    this.pblDataDir = path.join(__dirname, '../public/pbl_data');
    this.pblJsonDir = path.join(__dirname, '../public/pbl_data_json');
    
    // Ensure JSON directories exist
    [this.jsonDir, this.pblJsonDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Convert all YAML files to JSON
   */
  async convertAllYamlToJson() {
    console.log('🔄 Converting YAML to JSON...\n');
    
    // Convert rubrics data
    const rubricsFiles = fs.readdirSync(this.dataDir)
      .filter(f => f.endsWith('.yaml') && !f.includes('.backup'));
    
    for (const file of rubricsFiles) {
      await this.convertYamlToJson(
        path.join(this.dataDir, file),
        path.join(this.jsonDir, file.replace('.yaml', '.json'))
      );
    }
    
    // Convert PBL data
    const pblFiles = fs.readdirSync(this.pblDataDir)
      .filter(f => f.endsWith('.yaml'));
    
    for (const file of pblFiles) {
      await this.convertYamlToJson(
        path.join(this.pblDataDir, file),
        path.join(this.pblJsonDir, file.replace('.yaml', '.json'))
      );
    }
    
    console.log('\n✅ Conversion complete!');
  }

  /**
   * Convert single YAML file to JSON
   */
  async convertYamlToJson(yamlPath, jsonPath) {
    try {
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      const data = yaml.load(yamlContent);
      
      // Write pretty-printed JSON for better readability
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      
      console.log(`✅ ${path.basename(yamlPath)} → ${path.basename(jsonPath)}`);
      
      // 不再創建 metadata 檔案
      
    } catch (error) {
      console.error(`❌ Error converting ${path.basename(yamlPath)}:`, error.message);
    }
  }

  /**
   * Read JSON data
   */
  readJson(type, filename) {
    const jsonPath = type === 'rubrics' 
      ? path.join(this.jsonDir, `${filename}.json`)
      : path.join(this.pblJsonDir, `${filename}.json`);
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found: ${jsonPath}`);
    }
    
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }

  /**
   * Update JSON data (partial update)
   */
  updateJson(type, filename, updates, options = {}) {
    const data = this.readJson(type, filename);
    
    // Deep merge updates
    this.deepMerge(data, updates);
    
    // Save updated JSON
    const jsonPath = type === 'rubrics'
      ? path.join(this.jsonDir, `${filename}.json`)
      : path.join(this.pblJsonDir, `${filename}.json`);
    
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    
    // Sync to YAML if requested
    if (options.syncToYaml !== false) {
      this.syncJsonToYaml(type, filename);
    }
    
    console.log(`✅ Updated ${filename}.json`);
    return data;
  }

  /**
   * Create new entry in JSON
   */
  createInJson(type, filename, path, newData, options = {}) {
    const data = this.readJson(type, filename);
    
    // Navigate to the target path and add new data
    const keys = path.split('.');
    let target = data;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }
    
    target[keys[keys.length - 1]] = newData;
    
    // Save
    const jsonPath = type === 'rubrics'
      ? path.join(this.jsonDir, `${filename}.json`)
      : path.join(this.pblJsonDir, `${filename}.json`);
    
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    
    // Sync to YAML if requested
    if (options.syncToYaml !== false) {
      this.syncJsonToYaml(type, filename);
    }
    
    console.log(`✅ Created new entry at ${path} in ${filename}.json`);
    return data;
  }

  /**
   * Delete from JSON
   */
  deleteFromJson(type, filename, path, options = {}) {
    const data = this.readJson(type, filename);
    
    // Navigate to target and delete
    const keys = path.split('.');
    let target = data;
    
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
      if (!target) {
        throw new Error(`Path not found: ${path}`);
      }
    }
    
    delete target[keys[keys.length - 1]];
    
    // Save
    const jsonPath = type === 'rubrics'
      ? path.join(this.jsonDir, `${filename}.json`)
      : path.join(this.pblJsonDir, `${filename}.json`);
    
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    
    // Sync to YAML if requested
    if (options.syncToYaml !== false) {
      this.syncJsonToYaml(type, filename);
    }
    
    console.log(`✅ Deleted ${path} from ${filename}.json`);
    return data;
  }

  /**
   * Sync JSON back to YAML
   */
  syncJsonToYaml(type, filename) {
    try {
      const jsonPath = type === 'rubrics'
        ? path.join(this.jsonDir, `${filename}.json`)
        : path.join(this.pblJsonDir, `${filename}.json`);
      
      const yamlPath = type === 'rubrics'
        ? path.join(this.dataDir, `${filename}.yaml`)
        : path.join(this.pblDataDir, `${filename}.yaml`);
      
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      
      // Convert to YAML with nice formatting
      const yamlContent = yaml.dump(data, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
        quotingType: '"',
        forceQuotes: false
      });
      
      // Backup original YAML
      if (fs.existsSync(yamlPath)) {
        const backupPath = yamlPath + '.backup_' + Date.now();
        fs.copyFileSync(yamlPath, backupPath);
      }
      
      fs.writeFileSync(yamlPath, yamlContent);
      console.log(`✅ Synced to ${filename}.yaml`);
      
    } catch (error) {
      console.error(`❌ Error syncing to YAML:`, error.message);
    }
  }

  /**
   * Deep merge helper
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        Object.assign(source[key], this.deepMerge(target[key], source[key]));
      }
    }
    Object.assign(target || {}, source);
    return target;
  }


  /**
   * CLI interface for CRUD operations
   */
  async runCLI(args) {
    const command = args[0];
    
    switch (command) {
      case 'convert':
        await this.convertAllYamlToJson();
        break;
        
      case 'read':
        const readData = this.readJson(args[1], args[2]);
        console.log(JSON.stringify(readData, null, 2));
        break;
        
      case 'update':
        const updateData = args[3] ? JSON.parse(args[3]) : {};
        this.updateJson(args[1], args[2], updateData);
        break;
        
      case 'create':
        const createData = JSON.parse(args[4]);
        this.createInJson(args[1], args[2], args[3], createData);
        break;
        
      case 'delete':
        this.deleteFromJson(args[1], args[2], args[3]);
        break;
        
      case 'sync':
        this.syncJsonToYaml(args[1], args[2]);
        break;
        
      default:
        console.log(`
YAML-JSON CRUD System

Usage:
  node yaml-json-crud-system.js <command> [options]

Commands:
  convert                     Convert all YAML files to JSON
  read <type> <filename>      Read JSON data
  update <type> <filename> <updates>   Update JSON (partial)
  create <type> <filename> <path> <data>   Create new entry
  delete <type> <filename> <path>      Delete entry
  sync <type> <filename>      Sync JSON back to YAML

Types:
  rubrics    Rubrics data (ai_lit_domains, ksa_codes)
  pbl        PBL scenario data

Examples:
  node yaml-json-crud-system.js convert
  node yaml-json-crud-system.js read rubrics ai_lit_domains
  node yaml-json-crud-system.js update rubrics ksa_codes '{"knowledge_codes":{"themes":{"new_theme":{}}}}'
  node yaml-json-crud-system.js create pbl ai_job_search_scenario "tasks.new_task" '{"title":"New Task"}'
  node yaml-json-crud-system.js delete rubrics ai_lit_domains "domains.old_domain"
`);
        break;
    }
  }
}

// Export for use in other scripts
module.exports = YamlJsonCrudSystem;

// Run if called directly
if (require.main === module) {
  const crud = new YamlJsonCrudSystem();
  crud.runCLI(process.argv.slice(2));
}