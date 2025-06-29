#!/usr/bin/env node

const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize storage
const storage = new Storage({
  projectId: 'ai-square-399620',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || 
    path.join(__dirname, '../google-credentials.json')
});

const bucket = storage.bucket('ai-square-db');

async function migrateProgramPaths() {
  console.log('Starting migration of program paths...');
  
  try {
    // List all files with the old pattern
    const [files] = await bucket.getFiles({
      prefix: 'user_pbl_logs/',
    });
    
    // Group files by old program path
    const oldProgramPaths = new Map();
    
    for (const file of files) {
      // Match old pattern: program_prog_TIMESTAMP_RANDOM_TIMESTAMP
      const match = file.name.match(/(.+\/program_prog_(\d+)_([a-z0-9]+))_\d+\//);
      if (match) {
        const [fullMatch, newPath, timestamp, random] = match;
        const oldPath = match.input.substring(0, match.input.indexOf(fullMatch) + fullMatch.length - 1);
        
        if (!oldProgramPaths.has(oldPath)) {
          oldProgramPaths.set(oldPath, {
            newPath: newPath,
            files: []
          });
        }
        oldProgramPaths.get(oldPath).files.push(file);
      }
    }
    
    console.log(`Found ${oldProgramPaths.size} programs to migrate`);
    
    // Migrate each program
    for (const [oldPath, { newPath, files }] of oldProgramPaths) {
      console.log(`\nMigrating: ${oldPath}`);
      console.log(`To: ${newPath}`);
      
      // Copy all files to new location
      for (const file of files) {
        const relativePath = file.name.substring(oldPath.length);
        const newFileName = `${newPath}${relativePath}`;
        
        try {
          await file.copy(bucket.file(newFileName));
          console.log(`  ✓ Copied: ${relativePath}`);
        } catch (error) {
          console.error(`  ✗ Failed to copy ${relativePath}:`, error.message);
        }
      }
      
      // Optional: Delete old files after successful copy
      // Uncomment the following lines if you want to delete old files
      /*
      console.log('  Deleting old files...');
      for (const file of files) {
        try {
          await file.delete();
          console.log(`  ✓ Deleted: ${file.name}`);
        } catch (error) {
          console.error(`  ✗ Failed to delete ${file.name}:`, error.message);
        }
      }
      */
    }
    
    console.log('\nMigration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateProgramPaths();