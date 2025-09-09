const { Pool } = require('pg');

// This simulates what happens when we insert into staging DB
async function testStagingConnection() {
  console.log('🔍 Testing staging database schema...');
  
  // Check if we can connect to staging (we can't directly, but we can test the insert format)
  // Let's test the exact SQL that would be executed
  
  const testInsert = `
    INSERT INTO evaluations (
      id, mode, task_id, program_id, user_id, evaluation_type, evaluation_subtype,
      score, max_score, feedback_text, feedback_data, domain_scores, 
      assessment_data, metadata, created_at, time_taken_seconds
    ) VALUES (
      'test-id', 'assessment', NULL, 'test-program-id', 'test-user-id', 
      'program', 'assessment_complete', 75, 100, 'Great job!', '{}', '{}',
      '{}', '{}', NOW(), 120
    )
    ON CONFLICT (id) DO NOTHING;
  `;
  
  console.log('SQL that would be executed on staging:');
  console.log(testInsert);
  
  // Test with our local DB to verify the format works
  const localPool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'ai_square_db'
  });
  
  try {
    console.log('\n🔄 Testing with local database...');
    
    // First check the schema
    const schemaResult = await localPool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'evaluations' AND column_name LIKE '%subtype%'
      ORDER BY ordinal_position
    `);
    
    console.log('Evaluation subtype columns:', schemaResult.rows);
    
    // Test the actual insert
    const testResult = await localPool.query(testInsert);
    console.log('✅ Local insert successful, rowCount:', testResult.rowCount);
    
    // Clean up test data
    await localPool.query(`DELETE FROM evaluations WHERE id = 'test-id'`);
    
  } catch (error) {
    console.error('❌ Local test failed:', error.message);
  } finally {
    await localPool.end();
  }
}

testStagingConnection();
