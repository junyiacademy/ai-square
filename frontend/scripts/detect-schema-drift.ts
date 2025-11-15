#!/usr/bin/env tsx
/**
 * Schema Drift Detector
 * 檢測 staging/production 與本地 schema 的差異
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface SchemaField {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface SchemaDiff {
  table: string;
  missingInRemote: string[];
  missingInLocal: string[];
  typeMismatches: Array<{
    field: string;
    local: string;
    remote: string;
  }>;
}

class SchemaDriftDetector {
  private localPool: Pool;
  private remotePool?: Pool;

  constructor() {
    // Local database connection
    this.localPool = new Pool({
      host: '127.0.0.1',
      port: 5433,
      user: 'postgres',
      password: 'postgres',
      database: 'ai_square_db'
    });
  }

  /**
   * Connect to remote database (staging/production)
   */
  async connectRemote(env: 'staging' | 'production'): Promise<void> {
    if (env === 'staging') {
      // For staging, we'd need Cloud SQL Proxy or special connection
      console.log(chalk.yellow('⚠️  Note: Direct staging connection requires Cloud SQL Proxy'));
      console.log(chalk.yellow('   Run: cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5434'));

      this.remotePool = new Pool({
        host: '127.0.0.1',
        port: 5434, // Cloud SQL Proxy port
        user: process.env.STAGING_DB_USER || 'postgres',
        password: process.env.STAGING_DB_PASSWORD || '',
        database: 'ai_square_db'
      });
    }
  }

  /**
   * Get schema for a specific database
   */
  async getSchema(pool: Pool): Promise<Record<string, SchemaField[]>> {
    const query = `
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'scenarios', 'programs', 'tasks', 'evaluations', 'domains', 'achievements')
      ORDER BY table_name, ordinal_position
    `;

    const result = await pool.query(query);

    const schema: Record<string, SchemaField[]> = {};
    for (const row of result.rows) {
      if (!schema[row.table_name]) {
        schema[row.table_name] = [];
      }
      schema[row.table_name].push(row);
    }

    return schema;
  }

  /**
   * Compare two schemas and find differences
   */
  compareSchemas(
    localSchema: Record<string, SchemaField[]>,
    remoteSchema: Record<string, SchemaField[]>
  ): SchemaDiff[] {
    const diffs: SchemaDiff[] = [];

    const allTables = new Set([
      ...Object.keys(localSchema),
      ...Object.keys(remoteSchema)
    ]);

    for (const table of allTables) {
      const localFields = localSchema[table] || [];
      const remoteFields = remoteSchema[table] || [];

      const localFieldMap = new Map(
        localFields.map(f => [f.column_name, f])
      );
      const remoteFieldMap = new Map(
        remoteFields.map(f => [f.column_name, f])
      );

      const diff: SchemaDiff = {
        table,
        missingInRemote: [],
        missingInLocal: [],
        typeMismatches: []
      };

      // Check fields in local but not in remote
      for (const [fieldName, field] of localFieldMap) {
        if (!remoteFieldMap.has(fieldName)) {
          diff.missingInRemote.push(fieldName);
        } else {
          const remoteField = remoteFieldMap.get(fieldName)!;
          if (field.data_type !== remoteField.data_type) {
            diff.typeMismatches.push({
              field: fieldName,
              local: field.data_type,
              remote: remoteField.data_type
            });
          }
        }
      }

      // Check fields in remote but not in local
      for (const fieldName of remoteFieldMap.keys()) {
        if (!localFieldMap.has(fieldName)) {
          diff.missingInLocal.push(fieldName);
        }
      }

      // Only add if there are differences
      if (
        diff.missingInRemote.length > 0 ||
        diff.missingInLocal.length > 0 ||
        diff.typeMismatches.length > 0
      ) {
        diffs.push(diff);
      }
    }

    return diffs;
  }

  /**
   * Generate SQL migration to fix differences
   */
  generateMigration(diffs: SchemaDiff[]): string {
    const migrations: string[] = [
      '-- Schema Drift Migration',
      '-- Generated: ' + new Date().toISOString(),
      ''
    ];

    for (const diff of diffs) {
      if (diff.table === 'evaluations' && diff.missingInRemote.includes('evaluation_subtype')) {
        migrations.push(`-- 🚨 CRITICAL: Fix evaluation_subtype issue`);
        migrations.push(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS evaluation_subtype TEXT;`);
        migrations.push('');
      }

      for (const field of diff.missingInRemote) {
        migrations.push(`-- Add missing field to remote`);
        migrations.push(`-- ALTER TABLE ${diff.table} ADD COLUMN ${field} <TYPE>;`);
        migrations.push('');
      }

      for (const field of diff.missingInLocal) {
        migrations.push(`-- Field exists in remote but not local`);
        migrations.push(`-- Consider adding to Prisma schema: ${diff.table}.${field}`);
        migrations.push('');
      }
    }

    return migrations.join('\n');
  }

  /**
   * Check specific evaluation_subtype issue
   */
  async checkEvaluationSubtype(): Promise<void> {
    console.log(chalk.blue('\n🔍 Checking evaluation_subtype specifically...\n'));

    const localCheck = await this.localPool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'evaluations'
        AND column_name = 'evaluation_subtype'
    `);

    const prismaPath = path.join(process.cwd(), 'prisma/schema.prisma');
    const prismaContent = fs.readFileSync(prismaPath, 'utf-8');
    const hasPrismaField = prismaContent.includes('evaluationSubtype');

    const typesPath = path.join(process.cwd(), 'src/types/database.ts');
    const typesContent = fs.readFileSync(typesPath, 'utf-8');
    const hasTypeField = typesContent.includes('evaluation_subtype');

    console.log('Status Report:');
    console.log('─'.repeat(50));
    console.log(`Local DB has evaluation_subtype: ${localCheck.rows.length > 0 ? chalk.green('YES') : chalk.red('NO')}`);
    console.log(`Prisma schema has evaluationSubtype: ${hasPrismaField ? chalk.green('YES') : chalk.red('NO')}`);
    console.log(`TypeScript has evaluation_subtype: ${hasTypeField ? chalk.green('YES') : chalk.red('NO')}`);

    if (localCheck.rows.length > 0 && !hasPrismaField) {
      console.log(chalk.red('\n🚨 PROBLEM DETECTED: Database has field but Prisma schema doesn\'t!'));
      console.log(chalk.yellow('Fix: Add to Prisma schema or remove from database'));
    }

    if (hasTypeField && !hasPrismaField) {
      console.log(chalk.red('\n🚨 PROBLEM DETECTED: TypeScript has field but Prisma schema doesn\'t!'));
      console.log(chalk.yellow('Fix: Add to Prisma schema or remove from TypeScript'));
    }
  }

  /**
   * Run the drift detection
   */
  async detect(compareWithRemote = false): Promise<void> {
    console.log(chalk.blue('🚀 Schema Drift Detection\n'));

    try {
      // Always check local consistency
      await this.checkEvaluationSubtype();

      if (compareWithRemote) {
        console.log(chalk.blue('\n📊 Comparing local vs remote schemas...\n'));

        const localSchema = await this.getSchema(this.localPool);
        const remoteSchema = await this.getSchema(this.remotePool!);

        const diffs = this.compareSchemas(localSchema, remoteSchema);

        if (diffs.length === 0) {
          console.log(chalk.green('✅ No schema drift detected!'));
        } else {
          console.log(chalk.red(`❌ Found ${diffs.length} table(s) with differences:\n`));

          for (const diff of diffs) {
            console.log(chalk.yellow(`Table: ${diff.table}`));

            if (diff.missingInRemote.length > 0) {
              console.log(chalk.red(`  Missing in remote: ${diff.missingInRemote.join(', ')}`));
            }

            if (diff.missingInLocal.length > 0) {
              console.log(chalk.blue(`  Missing in local: ${diff.missingInLocal.join(', ')}`));
            }

            if (diff.typeMismatches.length > 0) {
              console.log(chalk.magenta('  Type mismatches:'));
              for (const mismatch of diff.typeMismatches) {
                console.log(`    ${mismatch.field}: ${mismatch.local} (local) vs ${mismatch.remote} (remote)`);
              }
            }

            console.log('');
          }

          // Generate migration
          const migration = this.generateMigration(diffs);
          const migrationPath = path.join(process.cwd(), 'schema-drift-migration.sql');
          fs.writeFileSync(migrationPath, migration);
          console.log(chalk.green(`\n📝 Migration script generated: ${migrationPath}`));
        }
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error);
    } finally {
      await this.localPool.end();
      if (this.remotePool) {
        await this.remotePool.end();
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  const detector = new SchemaDriftDetector();

  const args = process.argv.slice(2);
  const compareWithRemote = args.includes('--remote');

  if (compareWithRemote) {
    console.log(chalk.yellow('Note: Remote comparison requires Cloud SQL Proxy setup'));
  }

  detector.detect(compareWithRemote).then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}

export { SchemaDriftDetector };
