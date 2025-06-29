#!/usr/bin/env node

const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: 'ai-square-463013',
  keyFilename: path.join(__dirname, '../ai-square-key.json')
});

const bucket = storage.bucket('ai-square-db');

async function createCompletionData() {
  const userEmail = 'teacher@example.com';
  const scenarioId = 'ai-job-search';
  const programId = 'prog_1751201301159_wasvzx';
  
  try {
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
    const basePath = `user_pbl_logs/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}`;
    
    console.log('Creating completion data for:', basePath);
    
    // Get all task files
    const [files] = await bucket.getFiles({ prefix: `${basePath}/task_` });
    
    // Extract unique task IDs
    const taskIds = new Set();
    files.forEach(file => {
      const match = file.name.match(/task_([^/]+)\//);
      if (match) taskIds.add(match[1]);
    });
    
    console.log('Found tasks:', Array.from(taskIds));
    
    // Collect task data
    const tasks = [];
    let totalScore = 0;
    let evaluatedTasks = 0;
    const domainScores = {
      engaging_with_ai: [],
      creating_with_ai: [],
      managing_with_ai: [],
      designing_with_ai: []
    };
    const ksaScores = {
      knowledge: [],
      skills: [],
      attitudes: []
    };
    let totalTimeSeconds = 0;
    
    for (const taskId of taskIds) {
      console.log(`Processing task: ${taskId}`);
      
      // Get task data
      const taskBasePath = `${basePath}/task_${taskId}`;
      const taskInfo = {
        taskId,
        metadata: null,
        log: null,
        progress: null,
        evaluation: null
      };
      
      // Try to get metadata
      try {
        const metadataFile = bucket.file(`${taskBasePath}/metadata.json`);
        const [exists] = await metadataFile.exists();
        if (exists) {
          const [content] = await metadataFile.download();
          taskInfo.metadata = JSON.parse(content.toString());
        }
      } catch (error) {
        console.log(`No metadata for task ${taskId}`);
      }
      
      // Try to get log
      try {
        const logFile = bucket.file(`${taskBasePath}/log.json`);
        const [exists] = await logFile.exists();
        if (exists) {
          const [content] = await logFile.download();
          taskInfo.log = JSON.parse(content.toString());
          
          // Calculate time spent from log interactions
          if (taskInfo.log.interactions && taskInfo.log.interactions.length > 0) {
            const firstInteraction = taskInfo.log.interactions[0];
            const lastInteraction = taskInfo.log.interactions[taskInfo.log.interactions.length - 1];
            const timeSpent = new Date(lastInteraction.timestamp).getTime() - new Date(firstInteraction.timestamp).getTime();
            totalTimeSeconds += Math.floor(timeSpent / 1000);
          }
        }
      } catch (error) {
        console.log(`No log for task ${taskId}`);
      }
      
      // Try to get progress
      try {
        const progressFile = bucket.file(`${taskBasePath}/progress.json`);
        const [exists] = await progressFile.exists();
        if (exists) {
          const [content] = await progressFile.download();
          taskInfo.progress = JSON.parse(content.toString());
        }
      } catch (error) {
        console.log(`No progress for task ${taskId}`);
      }
      
      // Try to get evaluation
      try {
        const evalFile = bucket.file(`${taskBasePath}/evaluation.json`);
        const [exists] = await evalFile.exists();
        if (exists) {
          const [content] = await evalFile.download();
          taskInfo.evaluation = JSON.parse(content.toString());
          
          totalScore += taskInfo.evaluation.score;
          evaluatedTasks++;
          
          // Collect domain scores
          if (taskInfo.evaluation.domainScores) {
            Object.entries(taskInfo.evaluation.domainScores).forEach(([domain, score]) => {
              if (domainScores[domain]) {
                domainScores[domain].push(score);
              }
            });
          }
          
          // Collect KSA scores
          if (taskInfo.evaluation.ksaScores) {
            ksaScores.knowledge.push(taskInfo.evaluation.ksaScores.knowledge);
            ksaScores.skills.push(taskInfo.evaluation.ksaScores.skills);
            ksaScores.attitudes.push(taskInfo.evaluation.ksaScores.attitudes);
          }
        }
      } catch (error) {
        console.log(`No evaluation for task ${taskId}`);
      }
      
      tasks.push(taskInfo);
    }
    
    // Calculate averages
    const avgScore = evaluatedTasks > 0 ? Math.round(totalScore / evaluatedTasks) : 0;
    const avgDomainScores = {};
    Object.entries(domainScores).forEach(([domain, scores]) => {
      avgDomainScores[domain] = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    });
    
    const avgKsaScores = {
      knowledge: ksaScores.knowledge.length > 0 
        ? Math.round(ksaScores.knowledge.reduce((a, b) => a + b, 0) / ksaScores.knowledge.length)
        : 0,
      skills: ksaScores.skills.length > 0
        ? Math.round(ksaScores.skills.reduce((a, b) => a + b, 0) / ksaScores.skills.length)
        : 0,
      attitudes: ksaScores.attitudes.length > 0
        ? Math.round(ksaScores.attitudes.reduce((a, b) => a + b, 0) / ksaScores.attitudes.length)
        : 0
    };
    
    // Get program metadata
    let programData = {
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      totalTasks: 5
    };
    
    try {
      const metadataFile = bucket.file(`${basePath}/metadata.json`);
      const [exists] = await metadataFile.exists();
      if (exists) {
        const [content] = await metadataFile.download();
        const metadata = JSON.parse(content.toString());
        programData = {
          status: metadata.status,
          startedAt: metadata.startedAt,
          totalTasks: metadata.totalTasks,
          completedAt: metadata.completedAt
        };
      }
    } catch (error) {
      console.log('No program metadata found');
    }
    
    // Create completion data
    const completionData = {
      programId,
      scenarioId,
      userEmail,
      status: programData.status,
      startedAt: programData.startedAt,
      updatedAt: new Date().toISOString(),
      completedAt: programData.completedAt,
      totalTasks: programData.totalTasks,
      evaluatedTasks,
      overallScore: avgScore,
      domainScores: avgDomainScores,
      ksaScores: avgKsaScores,
      totalTimeSeconds,
      tasks
    };
    
    console.log('Completion data:', JSON.stringify(completionData, null, 2));
    
    // Save completion data
    const completionPath = `${basePath}/completion.json`;
    const file = bucket.file(completionPath);
    await file.save(JSON.stringify(completionData, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });
    
    console.log('Completion data saved to:', completionPath);
    
  } catch (error) {
    console.error('Error creating completion data:', error);
  }
}

// Run the script
createCompletionData();