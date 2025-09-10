#!/usr/bin/env node
/**
 * Script to migrate all API routes to use unified authentication
 * This updates all route handlers to use getUnifiedAuth instead of getServerSession
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const API_DIR = path.join(process.cwd(), 'src/app/api');

async function migrateAuthInFile(filePath: string): Promise<boolean> {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Skip test files
    if (filePath.includes('.test.') || filePath.includes('__tests__')) {
      return false;
    }

    // Check if file uses getServerSession
    if (!content.includes('getServerSession')) {
      return false;
    }

    console.log(`Migrating: ${filePath}`);

    // Replace import statements
    if (content.includes("from '@/lib/auth/session'")) {
      content = content.replace(
        /import\s*{\s*getServerSession\s*}\s*from\s*['"]@\/lib\/auth\/session['"]/g,
        "import { getUnifiedAuth } from '@/lib/auth/unified-auth'"
      );
      modified = true;
    }

    // Find the route handler function to get the request parameter
    const routeHandlerRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(\s*([^)]+)\)/g;
    let match;
    
    while ((match = routeHandlerRegex.exec(content)) !== null) {
      const method = match[1];
      const params = match[2];
      
      // Extract request parameter name (usually 'request' or 'req')
      const requestParamMatch = params.match(/(\w+)\s*:\s*NextRequest/);
      const requestParam = requestParamMatch ? requestParamMatch[1] : 'request';

      // Replace getServerSession() calls with getUnifiedAuth(request)
      const sessionRegex = new RegExp(`await\\s+getServerSession\\(\\)`, 'g');
      if (sessionRegex.test(content)) {
        content = content.replace(sessionRegex, `await getUnifiedAuth(${requestParam})`);
        modified = true;
      }

      // Also handle const session = await getServerSession()
      const sessionVarRegex = new RegExp(`const\\s+(\\w+)\\s*=\\s*await\\s+getServerSession\\(\\)`, 'g');
      content = content.replace(sessionVarRegex, `const $1 = await getUnifiedAuth(${requestParam})`);
      
      // Update session?.user?.email to auth?.user.email
      content = content.replace(/(\w+)\?\.user\?\.email/g, '$1?.user.email');
      content = content.replace(/(\w+)\?\.user\?\.id/g, '$1?.user.id');
    }

    // Update error responses to use unified format
    if (content.includes('Authentication required') || content.includes('Unauthorized')) {
      // Add import for createUnauthorizedResponse if needed
      if (!content.includes('createUnauthorizedResponse')) {
        content = content.replace(
          /import\s*{\s*getUnifiedAuth\s*}\s*from\s*['"]@\/lib\/auth\/unified-auth['"]/g,
          "import { getUnifiedAuth, createUnauthorizedResponse } from '@/lib/auth/unified-auth'"
        );
      }

      // Replace manual unauthorized responses
      const unauthorizedRegex = /NextResponse\.json\s*\(\s*{\s*(?:success:\s*false,\s*)?error:\s*['"](?:Authentication required|Unauthorized)['"]\s*}\s*,\s*{\s*status:\s*401\s*}\s*\)/g;
      content = content.replace(unauthorizedRegex, 'createUnauthorizedResponse()');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Migrated: ${path.relative(API_DIR, filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting authentication migration...\n');

  // Find all route.ts files in API directory
  const files = await glob('**/route.ts', {
    cwd: API_DIR,
    absolute: true,
    ignore: ['**/node_modules/**', '**/__tests__/**', '**/*.test.ts']
  });

  console.log(`Found ${files.length} route files to check\n`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const migrated = await migrateAuthInFile(file);
    if (migrated) {
      migratedCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successfully migrated: ${migratedCount} files`);
  console.log(`⏭️  Skipped (no changes needed): ${files.length - migratedCount - errorCount} files`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount} files`);
  }

  // Run TypeScript check
  console.log('\n🔍 Running TypeScript check...');
  const { execSync } = require('child_process');
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('✅ TypeScript check passed!');
  } catch (error) {
    console.error('❌ TypeScript errors found. Please fix them manually.');
    process.exit(1);
  }
}

main().catch(console.error);