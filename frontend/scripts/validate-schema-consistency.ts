#!/usr/bin/env tsx
/**
 * Schema Consistency Validator
 * 檢查 Prisma Schema、TypeScript Types 和實際資料庫的一致性
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

class SchemaValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * 1. 檢查 Prisma Schema 與 TypeScript Types 的一致性
   */
  async validatePrismaVsTypes(): Promise<void> {
    console.log('🔍 Checking Prisma Schema vs TypeScript Types...');
    
    const prismaPath = path.join(process.cwd(), 'prisma/schema.prisma');
    const typesPath = path.join(process.cwd(), 'src/types/database.ts');
    
    if (!fs.existsSync(prismaPath)) {
      this.errors.push('❌ Prisma schema file not found');
      return;
    }
    
    if (!fs.existsSync(typesPath)) {
      this.warnings.push('⚠️ TypeScript database types file not found');
      return;
    }
    
    const prismaContent = fs.readFileSync(prismaPath, 'utf-8');
    const typesContent = fs.readFileSync(typesPath, 'utf-8');
    
    // Parse Prisma models
    const prismaModels = this.parsePrismaModels(prismaContent);
    
    // Parse TypeScript interfaces
    const tsInterfaces = this.parseTypeScriptInterfaces(typesContent);
    
    // Compare fields
    for (const [modelName, prismaFields] of Object.entries(prismaModels)) {
      const tsInterface = tsInterfaces[modelName];
      
      if (!tsInterface) {
        this.warnings.push(`⚠️ TypeScript interface missing for Prisma model: ${modelName}`);
        continue;
      }
      
      // Check for fields in Prisma but not in TypeScript
      for (const field of prismaFields) {
        if (!tsInterface.includes(field)) {
          this.errors.push(`❌ Field '${field}' exists in Prisma model '${modelName}' but not in TypeScript interface`);
        }
      }
      
      // Check for fields in TypeScript but not in Prisma
      for (const field of tsInterface) {
        if (!prismaFields.includes(field)) {
          // Special handling for evaluation_subtype - this is our problem!
          if (field === 'evaluation_subtype') {
            this.errors.push(`🚨 CRITICAL: Field 'evaluation_subtype' exists in TypeScript but not in Prisma Schema!`);
          } else {
            this.errors.push(`❌ Field '${field}' exists in TypeScript interface '${modelName}' but not in Prisma model`);
          }
        }
      }
    }
  }

  /**
   * 2. 檢查實際資料庫與 Prisma Schema 的一致性
   */
  async validateDatabaseVsPrisma(): Promise<void> {
    console.log('🔍 Checking Database vs Prisma Schema...');
    
    const dbConfig = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5433'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'ai_square_db'
    };
    
    const pool = new Pool(dbConfig);
    
    try {
      // Get actual database schema
      const result = await pool.query(`
        SELECT 
          t.table_name,
          array_agg(c.column_name ORDER BY c.ordinal_position) as columns
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
          AND t.table_name IN ('users', 'scenarios', 'programs', 'tasks', 'evaluations')
        GROUP BY t.table_name
      `);
      
      const dbSchema = result.rows.reduce((acc, row) => {
        acc[row.table_name] = row.columns;
        return acc;
      }, {} as Record<string, string[]>);
      
      // Compare with Prisma schema
      const prismaPath = path.join(process.cwd(), 'prisma/schema.prisma');
      const prismaContent = fs.readFileSync(prismaPath, 'utf-8');
      const prismaModels = this.parsePrismaModels(prismaContent);
      
      // Check evaluations table specifically
      if (dbSchema['evaluations']) {
        const dbFields = dbSchema['evaluations'];
        const prismaFields = prismaModels['Evaluation'] || [];
        
        // Check for evaluation_subtype specifically
        if (dbFields.includes('evaluation_subtype') && !prismaFields.includes('evaluationSubtype')) {
          this.errors.push(`🚨 CRITICAL: 'evaluation_subtype' exists in database but not in Prisma Schema!`);
        }
        
        // General field comparison
        for (const dbField of dbFields) {
          const prismaField = this.dbFieldToPrismaField(dbField);
          if (!prismaFields.includes(prismaField) && !this.isSystemField(dbField)) {
            this.warnings.push(`⚠️ Database field '${dbField}' not found in Prisma model`);
          }
        }
      }
      
    } catch (error) {
      this.errors.push(`❌ Failed to connect to database: ${(error as Error).message}`);
    } finally {
      await pool.end();
    }
  }

  /**
   * 3. 檢查 Repository 實作與 Schema 的一致性
   */
  async validateRepositoryImplementations(): Promise<void> {
    console.log('🔍 Checking Repository Implementations...');
    
    const repoPath = path.join(process.cwd(), 'src/lib/repositories/postgresql/evaluation-repository.ts');
    
    if (fs.existsSync(repoPath)) {
      const repoContent = fs.readFileSync(repoPath, 'utf-8');
      
      // Check for evaluation_subtype usage
      if (repoContent.includes('evaluation_subtype') || repoContent.includes('evaluationSubtype')) {
        const prismaPath = path.join(process.cwd(), 'prisma/schema.prisma');
        const prismaContent = fs.readFileSync(prismaPath, 'utf-8');
        
        if (!prismaContent.includes('evaluationSubtype')) {
          this.errors.push(`🚨 Repository uses 'evaluation_subtype' but it's not in Prisma Schema!`);
        }
      }
    }
  }

  /**
   * Helper: Parse Prisma models
   */
  private parsePrismaModels(content: string): Record<string, string[]> {
    const models: Record<string, string[]> = {};
    const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
    let match;
    
    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const modelContent = match[2];
      const fields: string[] = [];
      
      const fieldRegex = /^\s*(\w+)\s+/gm;
      let fieldMatch;
      
      while ((fieldMatch = fieldRegex.exec(modelContent)) !== null) {
        const fieldName = fieldMatch[1];
        if (!['model', '@@map', '@@index'].includes(fieldName)) {
          fields.push(fieldName);
        }
      }
      
      models[modelName] = fields;
    }
    
    return models;
  }

  /**
   * Helper: Parse TypeScript interfaces
   */
  private parseTypeScriptInterfaces(content: string): Record<string, string[]> {
    const interfaces: Record<string, string[]> = {};
    const interfaceRegex = /interface\s+(\w+)\s*{([^}]+)}/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceName = match[1];
      const interfaceContent = match[2];
      const fields: string[] = [];
      
      const fieldRegex = /^\s*(\w+)[\?]?\s*:/gm;
      let fieldMatch;
      
      while ((fieldMatch = fieldRegex.exec(interfaceContent)) !== null) {
        fields.push(fieldMatch[1]);
      }
      
      interfaces[interfaceName] = fields;
    }
    
    return interfaces;
  }

  /**
   * Helper: Convert database field name to Prisma field name
   */
  private dbFieldToPrismaField(dbField: string): string {
    // Convert snake_case to camelCase
    return dbField.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Helper: Check if field is a system field
   */
  private isSystemField(field: string): boolean {
    return ['id', 'created_at', 'updated_at'].includes(field);
  }

  /**
   * Run all validations
   */
  async validate(): Promise<ValidationResult> {
    console.log('🚀 Starting Schema Consistency Validation...\n');
    
    await this.validatePrismaVsTypes();
    await this.validateDatabaseVsPrisma();
    await this.validateRepositoryImplementations();
    
    const passed = this.errors.length === 0;
    
    console.log('\n📊 Validation Results:');
    console.log('='.repeat(50));
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(error => console.log(`  ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    if (passed) {
      console.log('\n✅ All schema validations passed!');
    } else {
      console.log('\n❌ Schema validation failed! Please fix the errors above.');
    }
    
    return {
      passed,
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SchemaValidator();
  validator.validate().then(result => {
    process.exit(result.passed ? 0 : 1);
  });
}

export { SchemaValidator };