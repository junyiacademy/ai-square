const { Pool } = require('pg');
const crypto = require('crypto');

async function testStagingConnection() {
  console.log('🔍 Testing staging database schema...');
  
  // Generate proper UUIDs
  const testId = crypto.randomUUID();
  const testProgramId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  
  const testInsert = `
    INSERT INTO evaluations (
      id, mode, program_id, user_id, evaluation_type, evaluation_subtype,
      score, max_score, feedback_text, feedback_data, domain_scores, 
      assessment_data, metadata, created_at, time_taken_seconds
    ) VALUES (
      $1, 'assessment', $2, $3, 'program', 'assessment_complete', 
      75, 100, 'Great job!', '{}', '{}', '{}', '{}', NOW(), 120
    )
  `;
  
  const localPool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'ai_square_db'
  });
  
  try {
    console.log('🔄 Testing evaluation insert with proper UUIDs...');
    
    // Test the actual insert with parameters
    const testResult = await localPool.query(testInsert, [testId, testProgramId, testUserId]);
    console.log('✅ Local insert successful, rowCount:', testResult.rowCount);
    
    // Verify the data was inserted
    const verifyResult = await localPool.query(
      'SELECT evaluation_type, evaluation_subtype, score FROM evaluations WHERE id = $1',
      [testId]
    );
    console.log('✅ Inserted data:', verifyResult.rows[0]);
    
    // Clean up test data
    await localPool.query(`DELETE FROM evaluations WHERE id = $1`, [testId]);
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await localPool.end();
  }
}

testStagingConnection();
