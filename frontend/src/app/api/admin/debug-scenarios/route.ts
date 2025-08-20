import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(_request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    // Use DATABASE_URL for connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 5000,
    });
    
    // Direct SQL query
    const query = `
      SELECT 
        id, 
        mode, 
        status, 
        title::text as title_json,
        source_type,
        source_path,
        created_at,
        updated_at
      FROM scenarios 
      ORDER BY mode, created_at DESC
    `;
    
    const result = await pool.query(query);
    
    // Group by mode
    const byMode: Record<string, any[]> = {
      pbl: [],
      discovery: [],
      assessment: []
    };
    
    result.rows.forEach(row => {
      const scenario = {
        id: row.id,
        mode: row.mode,
        status: row.status,
        title: row.title_json ? JSON.parse(row.title_json) : {},
        sourceType: row.source_type,
        sourcePath: row.source_path,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      
      if (byMode[row.mode]) {
        byMode[row.mode].push(scenario);
      }
    });
    
    // Also test repository
    let repoTest = null;
    try {
      const { repositoryFactory } = await import('@/lib/repositories/base/repository-factory');
      const scenarioRepo = repositoryFactory.getScenarioRepository();
      const pblScenarios = await scenarioRepo.findByMode?.('pbl', true) || [];
      repoTest = {
        success: true,
        count: pblScenarios.length,
        firstTitle: pblScenarios[0]?.title
      };
    } catch (error) {
      repoTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    return NextResponse.json({
      success: true,
      summary: {
        total: result.rows.length,
        pbl: byMode.pbl.length,
        discovery: byMode.discovery.length,
        assessment: byMode.assessment.length
      },
      scenarios: byMode,
      repositoryTest: repoTest
    });
    
  } catch (error: unknown) {
    console.error('Debug scenarios error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}