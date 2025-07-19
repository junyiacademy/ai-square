import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// This endpoint is for staging environment only
export async function POST(request: NextRequest) {
  // Only allow in staging environment
  if (process.env.ENVIRONMENT !== 'staging') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in staging environment' },
      { status: 403 }
    );
  }

  try {
    // Check if using PostgreSQL
    if (!process.env.USE_POSTGRES) {
      return NextResponse.json(
        { success: false, error: 'PostgreSQL is not enabled' },
        { status: 400 }
      );
    }

    // Get the raw database connection
    const pool = repositoryFactory.getPool();
    
    // Create sample test user
    const testUserQuery = `
      INSERT INTO users (id, email, name, preferred_language, onboarding_completed) 
      VALUES (
        '550e8400-e29b-41d4-a716-446655440000',
        'staging-test@ai-square.com',
        'Staging Test User',
        'en',
        true
      )
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        onboarding_completed = EXCLUDED.onboarding_completed
    `;

    // Create sample scenarios
    const scenariosQuery = `
      INSERT INTO scenarios (id, type, status, difficulty_level, estimated_minutes) VALUES
      ('marketing-crisis-management', 'pbl', 'active', 'intermediate', 45),
      ('social-media-strategy', 'pbl', 'active', 'beginner', 30),
      ('customer-service-automation', 'pbl', 'active', 'intermediate', 40),
      ('data-privacy-compliance', 'pbl', 'active', 'advanced', 60),
      ('ai-literacy-assessment', 'assessment', 'active', 'intermediate', 30),
      ('basic-ai-knowledge', 'assessment', 'active', 'beginner', 20),
      ('career-exploration', 'discovery', 'active', 'beginner', 25)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        difficulty_level = EXCLUDED.difficulty_level,
        estimated_minutes = EXCLUDED.estimated_minutes
    `;

    // Execute queries
    await pool.query(testUserQuery);
    await pool.query(scenariosQuery);

    // Verify data was inserted
    const userCheck = await pool.query('SELECT COUNT(*) FROM users');
    const scenarioCheck = await pool.query('SELECT COUNT(*) FROM scenarios');

    return NextResponse.json({
      success: true,
      message: 'Staging database initialized successfully',
      data: {
        users: userCheck.rows[0].count,
        scenarios: scenarioCheck.rows[0].count
      }
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize database',
        details: error.message 
      },
      { status: 500 }
    );
  }
}