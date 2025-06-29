#!/usr/bin/env node

const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: 'ai-square-463013',
  keyFilename: path.join(__dirname, '../ai-square-key.json')
});

const bucket = storage.bucket('ai-square-db');

async function updateCompletion() {
  const userEmail = 'teacher@example.com';
  const scenarioId = 'ai-job-search';
  const programId = 'prog_1751201301159_wasvzx';
  
  try {
    // Trigger completion update via API
    const response = await fetch('http://localhost:3000/api/pbl/completion', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `user=${JSON.stringify({ email: userEmail })}`
      },
      body: JSON.stringify({ programId, scenarioId })
    });
    
    if (response.ok) {
      console.log('Completion data updated successfully');
      const result = await response.json();
      console.log(result);
    } else {
      console.error('Failed to update completion data:', await response.text());
    }
  } catch (error) {
    console.error('Error updating completion:', error);
  }
}

// Run the script
updateCompletion();