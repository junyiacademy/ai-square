#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Files to update
const filesToUpdate = [
  '/src/app/api/assessment/programs/[programId]/answer/route.ts',
  '/src/app/api/assessment/programs/[programId]/batch-answers/route.ts',
  '/src/app/api/assessment/programs/[programId]/complete/route.ts',
  '/src/app/api/assessment/programs/[programId]/evaluation/route.ts',
  '/src/app/api/assessment/programs/[programId]/next-task/route.ts'
];

async function fixAuthInFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    let content = await fs.readFile(fullPath, 'utf8');
    let modified = false;
    
    // Pattern 1: Fix user = await getServerSession() followed by user.email
    if (content.includes('const user = await getServerSession()')) {
      // Replace user with session for clarity
      content = content.replace(/const user = await getServerSession\(\)/g, 'const session = await getServerSession()');
      
      // Fix the email access patterns
      content = content.replace(/if \(user\) \{/g, 'if (session?.user?.email) {');
      content = content.replace(/userEmail = user\.email;/g, 'userEmail = session.user.email;');
      
      // Fix !user checks
      content = content.replace(/if \(!user\)/g, 'if (!session?.user?.email)');
      content = content.replace(/!user/g, '!session?.user?.email');
      
      // Fix user.email references
      content = content.replace(/user\.email/g, 'session.user.email');
      
      modified = true;
    }
    
    // Pattern 2: Fix authUser = await getServerSession() 
    if (content.includes('const authUser = await getServerSession()')) {
      content = content.replace(/const authUser = await getServerSession\(\)/g, 'const session = await getServerSession()');
      content = content.replace(/if \(authUser\) \{/g, 'if (session?.user) {');
      content = content.replace(/user = authUser;/g, 'user = session.user;');
      content = content.replace(/authUser\.email/g, 'session.user.email');
      modified = true;
    }
    
    // Pattern 3: Fix complete route special case
    if (content.includes('let user: { email: string; id?: string } | null = null;')) {
      // This is the complete route with special handling
      content = content.replace(
        'if (authUser) {\n      user = authUser;',
        'if (session?.user) {\n      user = session.user;'
      );
      modified = true;
    }
    
    // Pattern 4: Fix evaluation route
    if (content.includes('if (user) {') && content.includes('userEmail = user.email;')) {
      content = content.replace(
        'if (user) {\n      userEmail = user.email;',
        'if (session?.user?.email) {\n      userEmail = session.user.email;'
      );
      modified = true;
    }
    
    // Pattern 5: Fix answer route
    if (content.includes('program.userId !== user.email')) {
      content = content.replace('program.userId !== user.email', 'program.userId !== session.user.email');
      modified = true;
    }
    
    // Pattern 6: Fix next-task route
    if (content.includes('program.userId !== user.email')) {
      content = content.replace('program.userId !== user.email', 'program.userId !== session.user.email');
      modified = true;
    }
    
    if (modified) {
      await fs.writeFile(fullPath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`⏭️  Skipped: ${filePath} (no changes needed)`);
    }
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

async function main() {
  console.log('🔧 Fixing Assessment module authentication (v2)...\n');
  
  for (const file of filesToUpdate) {
    await fixAuthInFile(file);
  }
  
  console.log('\n✅ Authentication fix complete!');
  console.log('\n📝 Summary of changes:');
  console.log('- Changed: const user = await getServerSession() → const session = await getServerSession()');
  console.log('- Fixed: user.email → session.user.email');
  console.log('- Fixed: if (user) → if (session?.user?.email)');
  console.log('- Fixed: !user → !session?.user?.email');
}

main().catch(console.error);