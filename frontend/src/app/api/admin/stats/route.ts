import { NextResponse } from 'next/server';
import { Pool } from 'pg';

/**
 * Get database statistics for deployment verification
 * This endpoint is called by GitHub Actions to verify initialization
 */
export async function GET() {
  let pool: Pool | null = null;
  
  try {
    // Remove admin key check - keeping API simple

    // Create database connection
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        connectionTimeoutMillis: 5000,
      });
    } else {
      const dbHost = process.env.DB_HOST || '127.0.0.1';
      const isCloudSQL = dbHost.startsWith('/cloudsql/');
      
      const dbConfig: Record<string, unknown> = {
        database: process.env.DB_NAME || 'ai_square_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 1,
        connectionTimeoutMillis: 5000,
      };
      
      if (isCloudSQL) {
        dbConfig.host = dbHost;
      } else {
        dbConfig.host = dbHost;
        dbConfig.port = parseInt(process.env.DB_PORT || '5433');
      }
      
      pool = new Pool(dbConfig);
    }

    // Get scenario counts by mode
    const scenarioStats = await pool.query(`
      SELECT 
        mode,
        COUNT(*) as count
      FROM scenarios
      GROUP BY mode
    `);

    const scenarioCounts = scenarioStats.rows.reduce((acc: Record<string, number>, row: { mode: string; count: string }) => {
      acc[row.mode] = parseInt(row.count);
      return acc;
    }, {});

    // Get user counts by role
    const userStats = await pool.query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users
      GROUP BY role
    `);

    const userCounts = userStats.rows.reduce((acc: Record<string, number>, row: { role: string; count: string }) => {
      acc[row.role] = parseInt(row.count);
      return acc;
    }, {});

    // Get total counts
    const totalScenarios = await pool.query('SELECT COUNT(*) as count FROM scenarios');
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalPrograms = await pool.query('SELECT COUNT(*) as count FROM programs');
    const totalTasks = await pool.query('SELECT COUNT(*) as count FROM tasks');
    const totalEvaluations = await pool.query('SELECT COUNT(*) as count FROM evaluations');

    return NextResponse.json({
      success: true,
      scenarios: {
        total: parseInt(totalScenarios.rows[0].count),
        pbl: scenarioCounts.pbl || 0,
        assessment: scenarioCounts.assessment || 0,
        discovery: scenarioCounts.discovery || 0
      },
      users: {
        total: parseInt(totalUsers.rows[0].count),
        ...userCounts
      },
      programs: parseInt(totalPrograms.rows[0].count),
      tasks: parseInt(totalTasks.rows[0].count),
      evaluations: parseInt(totalEvaluations.rows[0].count),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get stats'
      },
      { status: 500 }
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}