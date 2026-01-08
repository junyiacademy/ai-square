#!/usr/bin/env npx tsx
/**
 * Data Integrity Check Script
 * Validates database consistency and data quality for AI Square
 *
 * Usage:
 *   npx tsx scripts/data-integrity-check.ts
 *   npx tsx scripts/data-integrity-check.ts --fix
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";
import { createHash } from "crypto";

dotenv.config({ path: ".env.local" });

interface IntegrityIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  description: string;
  details?: unknown;
  fixable: boolean;
  fixQuery?: string;
}

class DataIntegrityChecker {
  private pool: Pool;
  private issues: IntegrityIssue[] = [];
  private shouldFix: boolean;

  constructor(shouldFix = false) {
    this.shouldFix = shouldFix;
    this.pool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5433"),
      database: process.env.DB_NAME || "ai_square_db",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
    });
  }

  private addIssue(issue: IntegrityIssue) {
    this.issues.push(issue);
  }

  /**
   * Check for orphaned records (records without parent)
   */
  async checkOrphanedRecords() {
    console.log("🔍 Checking for orphaned records...");

    // Check orphaned programs (no scenario)
    const orphanedPrograms = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM programs p
      LEFT JOIN scenarios s ON p.scenario_id = s.id
      WHERE s.id IS NULL
    `);

    if (parseInt(orphanedPrograms.rows[0].count) > 0) {
      this.addIssue({
        severity: "critical",
        category: "Orphaned Records",
        description: `Found ${orphanedPrograms.rows[0].count} programs without scenarios`,
        fixable: true,
        fixQuery: `DELETE FROM programs WHERE scenario_id NOT IN (SELECT id FROM scenarios)`,
      });
    }

    // Check orphaned tasks (no program)
    const orphanedTasks = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM tasks t
      LEFT JOIN programs p ON t.program_id = p.id
      WHERE p.id IS NULL
    `);

    if (parseInt(orphanedTasks.rows[0].count) > 0) {
      this.addIssue({
        severity: "critical",
        category: "Orphaned Records",
        description: `Found ${orphanedTasks.rows[0].count} tasks without programs`,
        fixable: true,
        fixQuery: `DELETE FROM tasks WHERE program_id NOT IN (SELECT id FROM programs)`,
      });
    }

    // Check orphaned evaluations (no task)
    const orphanedEvaluations = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM evaluations e
      LEFT JOIN tasks t ON e.task_id = t.id
      WHERE t.id IS NULL
    `);

    if (parseInt(orphanedEvaluations.rows[0].count) > 0) {
      this.addIssue({
        severity: "critical",
        category: "Orphaned Records",
        description: `Found ${orphanedEvaluations.rows[0].count} evaluations without tasks`,
        fixable: true,
        fixQuery: `DELETE FROM evaluations WHERE task_id NOT IN (SELECT id FROM tasks)`,
      });
    }
  }

  /**
   * Check mode propagation consistency
   */
  async checkModePropagation() {
    console.log("🔍 Checking mode propagation...");

    // Check programs with different mode than scenario
    const mismatchedPrograms = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM programs p
      JOIN scenarios s ON p.scenario_id = s.id
      WHERE p.mode != s.mode
    `);

    if (parseInt(mismatchedPrograms.rows[0].count) > 0) {
      this.addIssue({
        severity: "critical",
        category: "Mode Propagation",
        description: `Found ${mismatchedPrograms.rows[0].count} programs with incorrect mode`,
        fixable: true,
        fixQuery: `UPDATE programs p SET mode = s.mode FROM scenarios s WHERE p.scenario_id = s.id AND p.mode != s.mode`,
      });
    }

    // Check tasks with different mode than program
    const mismatchedTasks = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM tasks t
      JOIN programs p ON t.program_id = p.id
      WHERE t.mode != p.mode
    `);

    if (parseInt(mismatchedTasks.rows[0].count) > 0) {
      this.addIssue({
        severity: "critical",
        category: "Mode Propagation",
        description: `Found ${mismatchedTasks.rows[0].count} tasks with incorrect mode`,
        fixable: true,
        fixQuery: `UPDATE tasks t SET mode = p.mode FROM programs p WHERE t.program_id = p.id AND t.mode != p.mode`,
      });
    }
  }

  /**
   * Check multilingual field structure
   */
  async checkMultilingualFields() {
    console.log("🔍 Checking multilingual fields...");

    // Check scenarios with invalid title/description structure
    const invalidScenarios = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM scenarios
      WHERE
        (title IS NOT NULL AND jsonb_typeof(title) != 'object') OR
        (description IS NOT NULL AND jsonb_typeof(description) != 'object') OR
        (title->>'en' IS NULL) OR
        (description->>'en' IS NULL)
    `);

    if (parseInt(invalidScenarios.rows[0].count) > 0) {
      this.addIssue({
        severity: "warning",
        category: "Multilingual Fields",
        description: `Found ${invalidScenarios.rows[0].count} scenarios with invalid multilingual fields`,
        fixable: false,
      });
    }

    // Check for missing English translations
    const missingTranslations = await this.pool.query(`
      SELECT
        'scenarios' as table_name,
        COUNT(*) FILTER (WHERE title->>'en' IS NULL) as missing_title,
        COUNT(*) FILTER (WHERE description->>'en' IS NULL) as missing_description
      FROM scenarios
      UNION ALL
      SELECT
        'domains',
        COUNT(*) FILTER (WHERE name->>'en' IS NULL),
        COUNT(*) FILTER (WHERE description->>'en' IS NULL)
      FROM domains
    `);

    for (const row of missingTranslations.rows) {
      if (row.missing_title > 0 || row.missing_description > 0) {
        this.addIssue({
          severity: "warning",
          category: "Multilingual Fields",
          description: `Table ${row.table_name}: ${row.missing_title} missing titles, ${row.missing_description} missing descriptions (English)`,
          fixable: false,
        });
      }
    }
  }

  /**
   * Check required fields for NULL values
   */
  async checkRequiredFields() {
    console.log("🔍 Checking required fields...");

    const checks = [
      { table: "users", field: "email" },
      { table: "scenarios", field: "mode" },
      { table: "scenarios", field: "status" },
      { table: "programs", field: "user_id" },
      { table: "programs", field: "scenario_id" },
      { table: "programs", field: "status" },
      { table: "tasks", field: "program_id" },
      { table: "tasks", field: "type" },
      { table: "tasks", field: "status" },
    ];

    for (const check of checks) {
      const result = await this.pool.query(
        `SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.field} IS NULL`,
      );

      if (parseInt(result.rows[0].count) > 0) {
        this.addIssue({
          severity: "critical",
          category: "Required Fields",
          description: `Found ${result.rows[0].count} records in ${check.table} with NULL ${check.field}`,
          fixable: false,
        });
      }
    }
  }

  /**
   * Check task order consistency
   */
  async checkTaskOrder() {
    console.log("🔍 Checking task order consistency...");

    // Check for duplicate task indices within the same program
    const duplicateIndices = await this.pool.query(`
      SELECT program_id, task_index, COUNT(*) as count
      FROM tasks
      WHERE task_index IS NOT NULL
      GROUP BY program_id, task_index
      HAVING COUNT(*) > 1
    `);

    if (duplicateIndices.rows.length > 0) {
      this.addIssue({
        severity: "critical",
        category: "Task Order",
        description: `Found ${duplicateIndices.rows.length} programs with duplicate task indices`,
        details: duplicateIndices.rows,
        fixable: false,
      });
    }

    // Check for gaps in task indices
    const gapsInIndices = await this.pool.query(`
      WITH task_sequences AS (
        SELECT
          program_id,
          array_agg(task_index ORDER BY task_index) as indices
        FROM tasks
        WHERE task_index IS NOT NULL
        GROUP BY program_id
      )
      SELECT
        program_id,
        indices
      FROM task_sequences
      WHERE indices != array(SELECT generate_series(0, array_length(indices, 1) - 1))
    `);

    if (gapsInIndices.rows.length > 0) {
      this.addIssue({
        severity: "warning",
        category: "Task Order",
        description: `Found ${gapsInIndices.rows.length} programs with gaps in task indices`,
        fixable: false,
      });
    }
  }

  /**
   * Check timestamp logic
   */
  async checkTimestamps() {
    console.log("🔍 Checking timestamp logic...");

    // Check programs where completed_at is before started_at
    const invalidProgramTimes = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM programs
      WHERE completed_at IS NOT NULL
        AND started_at IS NOT NULL
        AND completed_at < started_at
    `);

    if (parseInt(invalidProgramTimes.rows[0].count) > 0) {
      this.addIssue({
        severity: "warning",
        category: "Timestamps",
        description: `Found ${invalidProgramTimes.rows[0].count} programs with completed_at before started_at`,
        fixable: false,
      });
    }

    // Check tasks where completed_at is before started_at
    const invalidTaskTimes = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE completed_at IS NOT NULL
        AND started_at IS NOT NULL
        AND completed_at < started_at
    `);

    if (parseInt(invalidTaskTimes.rows[0].count) > 0) {
      this.addIssue({
        severity: "warning",
        category: "Timestamps",
        description: `Found ${invalidTaskTimes.rows[0].count} tasks with completed_at before started_at`,
        fixable: false,
      });
    }

    // Check for future timestamps
    const futureTimes = await this.pool.query(`
      SELECT
        'programs' as table_name,
        COUNT(*) as count
      FROM programs
      WHERE started_at > NOW() OR completed_at > NOW()
      UNION ALL
      SELECT
        'tasks',
        COUNT(*)
      FROM tasks
      WHERE started_at > NOW() OR completed_at > NOW()
    `);

    for (const row of futureTimes.rows) {
      if (parseInt(row.count) > 0) {
        this.addIssue({
          severity: "warning",
          category: "Timestamps",
          description: `Found ${row.count} ${row.table_name} with future timestamps`,
          fixable: false,
        });
      }
    }
  }

  /**
   * Check score validity
   */
  async checkScores() {
    console.log("🔍 Checking score validity...");

    // Check for invalid scores (outside 0-100 range)
    const invalidScores = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM evaluations
      WHERE score IS NOT NULL AND (score < 0 OR score > 100)
    `);

    if (parseInt(invalidScores.rows[0].count) > 0) {
      this.addIssue({
        severity: "warning",
        category: "Data Validation",
        description: `Found ${invalidScores.rows[0].count} evaluations with scores outside 0-100 range`,
        fixable: true,
        fixQuery: `UPDATE evaluations SET score = GREATEST(0, LEAST(100, score)) WHERE score IS NOT NULL`,
      });
    }

    // Check for completed programs without scores
    const completedWithoutScore = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM programs
      WHERE status = 'completed' AND total_score IS NULL
    `);

    if (parseInt(completedWithoutScore.rows[0].count) > 0) {
      this.addIssue({
        severity: "info",
        category: "Data Validation",
        description: `Found ${completedWithoutScore.rows[0].count} completed programs without total score`,
        fixable: false,
      });
    }
  }

  /**
   * Check for duplicate data
   */
  async checkDuplicates() {
    console.log("🔍 Checking for duplicates...");

    // Check for duplicate user emails
    const duplicateEmails = await this.pool.query(`
      SELECT email, COUNT(*) as count
      FROM users
      GROUP BY email
      HAVING COUNT(*) > 1
    `);

    if (duplicateEmails.rows.length > 0) {
      this.addIssue({
        severity: "critical",
        category: "Duplicates",
        description: `Found ${duplicateEmails.rows.length} duplicate email addresses`,
        details: duplicateEmails.rows,
        fixable: false,
      });
    }

    // Check for duplicate scenario source paths
    const duplicateScenarios = await this.pool.query(`
      SELECT source_path, COUNT(*) as count
      FROM scenarios
      WHERE source_path IS NOT NULL
      GROUP BY source_path
      HAVING COUNT(*) > 1
    `);

    if (duplicateScenarios.rows.length > 0) {
      this.addIssue({
        severity: "warning",
        category: "Duplicates",
        description: `Found ${duplicateScenarios.rows.length} duplicate scenario source paths`,
        details: duplicateScenarios.rows,
        fixable: false,
      });
    }
  }

  /**
   * Apply fixes for fixable issues
   */
  async applyFixes() {
    console.log("\n🔧 Applying fixes...");

    const fixableIssues = this.issues.filter(
      (issue) => issue.fixable && issue.fixQuery,
    );

    for (const issue of fixableIssues) {
      try {
        console.log(`  Fixing: ${issue.description}`);
        const result = await this.pool.query(issue.fixQuery!);
        console.log(`  ✅ Fixed (affected rows: ${result.rowCount})`);
      } catch (error) {
        console.error(`  ❌ Failed to fix: ${error}`);
      }
    }
  }

  /**
   * Generate summary report
   */
  generateReport() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 DATA INTEGRITY CHECK REPORT");
    console.log("=".repeat(60));

    const summary = {
      critical: this.issues.filter((i) => i.severity === "critical").length,
      warning: this.issues.filter((i) => i.severity === "warning").length,
      info: this.issues.filter((i) => i.severity === "info").length,
      fixable: this.issues.filter((i) => i.fixable).length,
    };

    console.log(`\n📈 Summary:`);
    console.log(`  Critical Issues: ${summary.critical}`);
    console.log(`  Warnings: ${summary.warning}`);
    console.log(`  Info: ${summary.info}`);
    console.log(`  Fixable Issues: ${summary.fixable}`);

    if (this.issues.length === 0) {
      console.log("\n✅ No integrity issues found! Database is healthy.");
      return;
    }

    console.log("\n📋 Issues by Category:\n");

    const categories = [...new Set(this.issues.map((i) => i.category))];

    for (const category of categories) {
      const categoryIssues = this.issues.filter((i) => i.category === category);
      console.log(`${category}:`);

      for (const issue of categoryIssues) {
        const icon =
          issue.severity === "critical"
            ? "❌"
            : issue.severity === "warning"
              ? "⚠️"
              : "ℹ️";
        const fixable = issue.fixable ? " [FIXABLE]" : "";
        console.log(`  ${icon} ${issue.description}${fixable}`);

        if (issue.details && process.env.DEBUG === "true") {
          console.log(
            `     Details: ${JSON.stringify(issue.details, null, 2)}`,
          );
        }
      }
      console.log();
    }

    // Decision matrix
    console.log("=".repeat(60));
    console.log("🎯 DEPLOYMENT DECISION:");

    if (summary.critical > 0) {
      console.log("❌ DO NOT DEPLOY - Critical issues found");
    } else if (summary.warning > 5) {
      console.log("⚠️  DEPLOY WITH CAUTION - Multiple warnings found");
    } else {
      console.log("✅ SAFE TO DEPLOY - No critical issues");
    }

    console.log("=".repeat(60));
  }

  /**
   * Run all checks
   */
  async runAllChecks() {
    console.log("🚀 Starting data integrity checks...\n");

    try {
      await this.checkOrphanedRecords();
      await this.checkModePropagation();
      await this.checkMultilingualFields();
      await this.checkRequiredFields();
      await this.checkTaskOrder();
      await this.checkTimestamps();
      await this.checkScores();
      await this.checkDuplicates();

      if (this.shouldFix) {
        await this.applyFixes();
      }

      this.generateReport();

      // Return exit code based on critical issues
      const criticalCount = this.issues.filter(
        (i) => i.severity === "critical",
      ).length;
      return criticalCount > 0 ? 1 : 0;
    } catch (error) {
      console.error("❌ Error during integrity check:", error);
      return 1;
    } finally {
      await this.pool.end();
    }
  }
}

// Main execution
async function main() {
  const shouldFix = process.argv.includes("--fix");

  if (shouldFix) {
    console.log("⚠️  Running in FIX mode - will attempt to fix issues\n");
  } else {
    console.log("ℹ️  Running in CHECK mode - use --fix to apply fixes\n");
  }

  const checker = new DataIntegrityChecker(shouldFix);
  const exitCode = await checker.runAllChecks();

  process.exit(exitCode);
}

main().catch(console.error);
