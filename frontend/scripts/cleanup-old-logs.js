#!/usr/bin/env node

/**
 * Script to clean up old interaction logs that have the wrong format
 * This will help remove logs where content is stored as "User interaction: [type]"
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || 
    path.join(__dirname, '../../ai-square-key.json')
});

const bucketName = process.env.GCS_BUCKET_NAME || 'ai-square-db';

async function cleanupOldLogs() {
  console.log('Starting cleanup of old interaction logs...');
  
  try {
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles({
      prefix: 'users/',
      delimiter: '/'
    });

    let processedCount = 0;
    let cleanedCount = 0;

    for (const file of files) {
      if (file.name.includes('/logs/') && file.name.endsWith('.json')) {
        try {
          // Download the file
          const [contents] = await file.download();
          const log = JSON.parse(contents.toString());

          // Check if this is an old format log
          if (log.message && log.message.startsWith('User interaction:') && 
              log.type === 'INTERACTION') {
            console.log(`Found old format log: ${file.name}`);
            
            // Extract the actual content from data if available
            if (log.data && log.data.content) {
              // Update the message to use the actual content
              log.message = log.data.content;
              
              // Save the updated log
              await file.save(JSON.stringify(log, null, 2), {
                contentType: 'application/json',
                metadata: {
                  updated: new Date().toISOString(),
                  cleanedBy: 'cleanup-script'
                }
              });
              
              cleanedCount++;
              console.log(`✓ Updated log: ${file.name}`);
            }
          }
          
          processedCount++;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error.message);
        }
      }
    }

    console.log(`\nCleanup complete!`);
    console.log(`Processed: ${processedCount} logs`);
    console.log(`Cleaned: ${cleanedCount} logs`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  console.log('Old Log Cleanup Script');
  console.log('======================');
  console.log('This script will update old interaction logs to use the correct format.');
  console.log('');
  
  // Add confirmation prompt
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Do you want to proceed? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      rl.close();
      cleanupOldLogs();
    } else {
      console.log('Cleanup cancelled.');
      rl.close();
      process.exit(0);
    }
  });
}

module.exports = { cleanupOldLogs };