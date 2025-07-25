#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Files to update
const filesToUpdate = [
  '/src/app/api/assessment/programs/[programId]/answer/route.ts',
  '/src/app/api/assessment/programs/[programId]/route.ts',
  '/src/app/api/assessment/programs/[programId]/next-task/route.ts',
  '/src/app/api/assessment/programs/[programId]/complete/route.ts',
  '/src/app/api/assessment/programs/[programId]/batch-answers/route.ts',
  '/src/app/api/assessment/programs/[programId]/evaluation/route.ts'
];

async function fixAuthInFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    let content = await fs.readFile(fullPath, 'utf8');
    
    // Check if file uses getAuthFromRequest
    if (!content.includes('getAuthFromRequest')) {
      console.log(`✅ ${filePath} - Already using getServerSession`);
      return;
    }
    
    // Check if getServerSession is already imported
    if (!content.includes("import { getServerSession }")) {
      // Add getServerSession import
      if (content.includes("import { getAuthFromRequest }")) {
        // Replace the import
        content = content.replace(
          "import { getAuthFromRequest } from '@/lib/auth/auth-utils';",
          "import { getServerSession } from '@/lib/auth/session';"
        );
      } else {
        // Add new import after other imports
        const importMatch = content.match(/import .* from .*/);
        if (importMatch) {
          const lastImport = importMatch[importMatch.length - 1];
          const lastImportIndex = content.lastIndexOf(lastImport);
          content = content.substring(0, lastImportIndex + lastImport.length) + 
                   "\nimport { getServerSession } from '@/lib/auth/session';" +
                   content.substring(lastImportIndex + lastImport.length);
        }
      }
    }
    
    // Replace getAuthFromRequest usage pattern
    const authPattern = /const authUser = await getAuthFromRequest\(request\);[\s\S]*?const email = authUser\.email;/g;
    const authReplacement = `const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const email = session.user.email;`;
    
    if (content.match(authPattern)) {
      content = content.replace(authPattern, authReplacement);
    } else {
      // Try alternative patterns
      const altPattern1 = /const user = await getAuthFromRequest\(request\);[\s\S]*?if \(!user\) {[\s\S]*?}\s*const email = user\.email;/g;
      if (content.match(altPattern1)) {
        content = content.replace(altPattern1, authReplacement);
      } else {
        // Manual pattern for edge cases
        content = content.replace(/getAuthFromRequest\(request\)/g, 'getServerSession()');
        content = content.replace(/authUser\.email/g, 'session.user.email');
        content = content.replace(/authUser\?\.email/g, 'session?.user?.email');
        content = content.replace(/!authUser/g, '!session?.user?.email');
      }
    }
    
    // Replace userName references
    content = content.replace(/authUser\?\.name \|\| email/g, "email.split('@')[0]");
    content = content.replace(/authUser\.name/g, "email.split('@')[0]");
    content = content.replace(/user\?\.name \|\| email/g, "email.split('@')[0]");
    content = content.replace(/user\.name/g, "email.split('@')[0]");
    
    // Write back the file
    await fs.writeFile(fullPath, content, 'utf8');
    console.log(`✅ ${filePath} - Updated to use getServerSession`);
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

async function main() {
  console.log('🔧 Fixing Assessment module authentication...\n');
  
  for (const file of filesToUpdate) {
    await fixAuthInFile(file);
  }
  
  console.log('\n✅ Authentication fix complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Run tests to verify the changes');
  console.log('2. Test the Assessment flow in the browser');
}

main().catch(console.error);