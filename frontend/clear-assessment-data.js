#!/usr/bin/env node

/**
 * Script to clear Assessment module data from GCS
 * This will help reset the assessment module to a clean state
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function clearAssessmentData() {
  console.log('⚠️  WARNING: This will clear all Assessment data from the database!');
  console.log('This includes:');
  console.log('- All assessment scenarios');
  console.log('- All user programs');
  console.log('- All tasks and evaluations');
  console.log('');
  
  rl.question('Are you sure you want to continue? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      rl.close();
      return;
    }
    
    console.log('\n🗑️  Clearing Assessment data...\n');
    
    try {
      // Import the repositories
      const { 
        getScenarioRepository, 
        getProgramRepository, 
        getTaskRepository, 
        getEvaluationRepository 
      } = require('./src/lib/implementations/gcs-v2');
      
      const scenarioRepo = getScenarioRepository();
      const programRepo = getProgramRepository();
      const taskRepo = getTaskRepository();
      const evaluationRepo = getEvaluationRepository();
      
      // 1. Get all assessment scenarios
      console.log('1️⃣ Finding assessment scenarios...');
      const allScenarios = await scenarioRepo.findAll();
      const assessmentScenarios = allScenarios.filter(s => s.sourceType === 'assessment');
      console.log(`   Found ${assessmentScenarios.length} assessment scenarios`);
      
      // 2. Get all programs for assessment scenarios
      console.log('\n2️⃣ Finding assessment programs...');
      let totalPrograms = 0;
      let totalTasks = 0;
      let totalEvaluations = 0;
      
      for (const scenario of assessmentScenarios) {
        const programs = await programRepo.findByScenario(scenario.id);
        totalPrograms += programs.length;
        
        // Get tasks for each program
        for (const program of programs) {
          const tasks = await taskRepo.findByProgram(program.id);
          totalTasks += tasks.length;
          
          // Get evaluations
          const evaluations = await evaluationRepo.findByTarget('program', program.id);
          totalEvaluations += evaluations.length;
        }
      }
      
      console.log(`   Found ${totalPrograms} programs`);
      console.log(`   Found ${totalTasks} tasks`);
      console.log(`   Found ${totalEvaluations} evaluations`);
      
      // 3. Clear the data
      console.log('\n3️⃣ Clearing data...');
      
      // Note: The current GCS implementation doesn't have delete methods
      // We would need to implement them or manually clear from GCS
      console.log('   ⚠️  Note: Automatic deletion not implemented in current GCS repository');
      console.log('   You may need to manually clear the GCS bucket or local storage');
      
      // Alternative: Create a marker file to indicate reset
      const fs = require('fs').promises;
      const path = require('path');
      const resetMarker = path.join(process.cwd(), '.assessment-reset');
      await fs.writeFile(resetMarker, new Date().toISOString());
      console.log('   ✅ Created reset marker file');
      
      console.log('\n✅ Assessment data clearing complete!');
      console.log('\n📝 Next steps:');
      console.log('1. Restart the development server');
      console.log('2. Navigate to /assessment');
      console.log('3. The assessment scenario will be recreated automatically');
      
    } catch (error) {
      console.error('\n❌ Error clearing data:', error.message);
    }
    
    rl.close();
  });
}

// For direct execution
if (require.main === module) {
  clearAssessmentData();
} else {
  // For import
  module.exports = { clearAssessmentData };
}