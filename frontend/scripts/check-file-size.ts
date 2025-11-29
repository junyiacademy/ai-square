#!/usr/bin/env tsx

/**
 * File Size Checker
 *
 * Enforces file size limits to maintain code quality and encourage modularization.
 * Part of the code-quality-enforcer agent workflow.
 *
 * Usage:
 *   npm run check:file-size           # Check all files
 *   npm run check:file-size -- --fix  # Show refactoring suggestions
 *   npm run check:file-size -- --ci   # Exit with error code if violations found
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname, basename } from 'path';

// File size limits by file type (in lines of code)
const FILE_SIZE_LIMITS: Record<string, number> = {
  component: 300,    // React components (.tsx in components/)
  page: 400,         // Next.js pages
  api: 300,          // API routes
  service: 500,      // Service layer
  repository: 400,   // Repository pattern
  utility: 200,      // Utility functions
  test: 600,         // Test files
  config: 1000,      // Configuration files
  default: 500,      // Default limit
};

// Severity levels
enum Severity {
  WARNING = 'WARNING',  // Exceeds limit
  ERROR = 'ERROR',      // Exceeds 2x limit (blocking)
}

interface FileViolation {
  file: string;
  lines: number;
  limit: number;
  severity: Severity;
  type: string;
  suggestions: string[];
}

const EXCLUDED_DIRS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  'public',
  '.git',
];

const EXCLUDED_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

/**
 * Determine file type based on path and naming conventions
 */
function getFileType(filePath: string): string {
  const fileName = basename(filePath);
  const dir = relative(process.cwd(), filePath);

  // Test files
  if (fileName.includes('.test.') || fileName.includes('.spec.')) {
    return 'test';
  }

  // Configuration files
  if (
    fileName.endsWith('.config.ts') ||
    fileName.endsWith('.config.js') ||
    fileName === 'tailwind.config.ts' ||
    fileName === 'next.config.ts'
  ) {
    return 'config';
  }

  // Components
  if (dir.includes('components/') && fileName.endsWith('.tsx')) {
    return 'component';
  }

  // Pages
  if (dir.includes('app/') && (fileName === 'page.tsx' || fileName === 'layout.tsx')) {
    return 'page';
  }

  // API routes
  if (dir.includes('app/') && fileName === 'route.ts') {
    return 'api';
  }

  // Services
  if (dir.includes('services/') || dir.includes('lib/services/')) {
    return 'service';
  }

  // Repositories
  if (dir.includes('repositories/') || dir.includes('lib/repositories/')) {
    return 'repository';
  }

  // Utilities
  if (dir.includes('utils/') || dir.includes('lib/utils/')) {
    return 'utility';
  }

  return 'default';
}

/**
 * Count lines in a file (excluding empty lines and comments)
 */
function countLines(filePath: string): number {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Count non-empty, non-comment lines
    let count = 0;
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) continue;

      // Handle block comments
      if (trimmed.startsWith('/*')) {
        inBlockComment = true;
      }
      if (inBlockComment) {
        if (trimmed.endsWith('*/')) {
          inBlockComment = false;
        }
        continue;
      }

      // Skip single-line comments
      if (trimmed.startsWith('//')) continue;

      count++;
    }

    return count;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return 0;
  }
}

/**
 * Generate refactoring suggestions based on file type
 */
function generateSuggestions(filePath: string, type: string, lines: number): string[] {
  const suggestions: string[] = [];

  switch (type) {
    case 'component':
      suggestions.push('Extract child components into separate files');
      suggestions.push('Move utility functions to a separate utils file');
      suggestions.push('Consider using composition instead of large components');
      suggestions.push('Extract custom hooks if there is complex state logic');
      break;

    case 'page':
      suggestions.push('Move business logic to service layer');
      suggestions.push('Extract data fetching to server components');
      suggestions.push('Create smaller layout components');
      break;

    case 'api':
      suggestions.push('Move business logic to service layer');
      suggestions.push('Extract validation to separate validator functions');
      suggestions.push('Use Repository Pattern for database access');
      break;

    case 'service':
      suggestions.push('Split into multiple focused services');
      suggestions.push('Extract helper functions to utility files');
      suggestions.push('Consider using composition pattern');
      break;

    case 'repository':
      suggestions.push('Split into multiple repositories by domain');
      suggestions.push('Extract query builders to separate files');
      break;

    default:
      suggestions.push('Consider splitting into multiple smaller files');
      suggestions.push('Extract reusable functions to utility files');
      suggestions.push('Group related functionality by feature');
  }

  return suggestions;
}

/**
 * Recursively scan directory for violations
 */
function scanDirectory(dir: string, violations: FileViolation[] = []): FileViolation[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    // Skip excluded directories
    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.includes(entry)) continue;
      scanDirectory(fullPath, violations);
      continue;
    }

    // Skip excluded files
    if (EXCLUDED_FILES.includes(entry)) continue;

    // Only check TypeScript/JavaScript files
    const ext = extname(entry);
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) continue;

    // Check file size
    const lines = countLines(fullPath);
    const type = getFileType(fullPath);
    const limit = FILE_SIZE_LIMITS[type];

    if (lines > limit) {
      const severity = lines > limit * 2 ? Severity.ERROR : Severity.WARNING;
      const relativePath = relative(process.cwd(), fullPath);

      violations.push({
        file: relativePath,
        lines,
        limit,
        severity,
        type,
        suggestions: generateSuggestions(fullPath, type, lines),
      });
    }
  }

  return violations;
}

/**
 * Format violation output
 */
function formatViolations(violations: FileViolation[], showSuggestions: boolean): string {
  if (violations.length === 0) {
    return '✅ All files are within size limits!';
  }

  const errors = violations.filter(v => v.severity === Severity.ERROR);
  const warnings = violations.filter(v => v.severity === Severity.WARNING);

  let output = '';

  if (errors.length > 0) {
    output += `\n❌ ERRORS (${errors.length} files exceed 2x limit - BLOCKING):\n\n`;
    errors.forEach(v => {
      output += `  ${v.file}\n`;
      output += `    Lines: ${v.lines} / Limit: ${v.limit} (${v.type})\n`;
      output += `    Exceeds limit by: ${((v.lines / v.limit - 1) * 100).toFixed(0)}%\n`;

      if (showSuggestions) {
        output += `    Suggestions:\n`;
        v.suggestions.forEach(s => output += `      • ${s}\n`);
      }
      output += '\n';
    });
  }

  if (warnings.length > 0) {
    output += `\n⚠️  WARNINGS (${warnings.length} files exceed limit):\n\n`;
    warnings.forEach(v => {
      output += `  ${v.file}\n`;
      output += `    Lines: ${v.lines} / Limit: ${v.limit} (${v.type})\n`;

      if (showSuggestions) {
        output += `    Suggestions:\n`;
        v.suggestions.forEach(s => output += `      • ${s}\n`);
      }
      output += '\n';
    });
  }

  return output;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const showSuggestions = args.includes('--fix') || args.includes('--suggest');
  const ciMode = args.includes('--ci');

  console.log('🔍 Checking file sizes...\n');

  const srcDir = join(process.cwd(), 'src');
  const violations = scanDirectory(srcDir);

  console.log(formatViolations(violations, showSuggestions));

  // Summary
  const errors = violations.filter(v => v.severity === Severity.ERROR).length;
  const warnings = violations.filter(v => v.severity === Severity.WARNING).length;

  if (violations.length > 0) {
    console.log('\n📊 Summary:');
    console.log(`  Total violations: ${violations.length}`);
    console.log(`  Errors (blocking): ${errors}`);
    console.log(`  Warnings: ${warnings}`);
    console.log('\n💡 Run with --fix flag to see refactoring suggestions');
  }

  // Exit with error code in CI mode if there are errors
  if (ciMode && errors > 0) {
    process.exit(1);
  }
}

main();
