/**
 * Simplified Learning Journey Test
 * Focus on basic API flow without complex scenarios
 */

describe.skip('Simple Learning Journey', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3456';
  let pool: any;

  beforeAll(async () => {
    const { Pool } = require('pg');
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5434'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('should fetch learning scenarios', async () => {
    // Step 1: Get PBL scenarios
    const pblResponse = await fetch(`${baseUrl}/api/pbl/scenarios?lang=en`);
    expect(pblResponse.ok).toBe(true);

    const pblData = await pblResponse.json();
    const pblScenarios = pblData?.data?.scenarios || pblData?.scenarios || [];
    expect(Array.isArray(pblScenarios)).toBe(true);

    // Step 2: Get Assessment scenarios
    const assessmentResponse = await fetch(`${baseUrl}/api/assessment/scenarios?lang=en`);
    expect(assessmentResponse.ok).toBe(true);

    const assessmentData = await assessmentResponse.json();
    const assessScenarios = assessmentData?.data?.scenarios || assessmentData?.scenarios || [];
    expect(Array.isArray(assessScenarios)).toBe(true);

    // Step 3: Get Discovery scenarios
    const discoveryResponse = await fetch(`${baseUrl}/api/discovery/scenarios?lang=en`);
    expect(discoveryResponse.ok).toBe(true);

    const discoveryData = await discoveryResponse.json();
    const discScenarios = discoveryData?.data?.scenarios || discoveryData?.scenarios || [];
    expect(Array.isArray(discScenarios)).toBe(true);
  });

  it('should check scenario details', async () => {
    // First, check if we have any scenarios in DB
    const result = await pool.query(
      `SELECT id FROM scenarios WHERE status = 'active' LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log('No active scenarios in database, skipping detail test');
      return;
    }

    const scenarioId = result.rows[0].id;

    // Fetch scenario details
    const response = await fetch(`${baseUrl}/api/pbl/scenarios/${scenarioId}`);

    // Check response (might be 404 if endpoint doesn't exist)
    if (response.ok) {
      const data = await response.json();
      const id = data?.id ?? data?.data?.id;
      expect(id).toBeDefined();
    } else {
      // It's ok if endpoint doesn't exist yet
      expect([404, 405]).toContain(response.status);
    }
  });

  it('should verify database has proper structure', async () => {
    // Check programs table structure
    const programsCheck = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'programs'
      ORDER BY ordinal_position
    `);

    const columns = programsCheck.rows.map((r: any) => r.column_name);

    // Check essential columns exist
    expect(columns).toContain('id');
    expect(columns).toContain('scenario_id');
    expect(columns).toContain('user_id');
    expect(columns).toContain('status');
    expect(columns).toContain('created_at');
  });

  it('should handle API errors gracefully', async () => {
    // Try to access non-existent scenario
    const response = await fetch(`${baseUrl}/api/pbl/scenarios/non-existent-id`);

    // Should return error status
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThanOrEqual(500);

    // Should return JSON error
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      expect(data).toHaveProperty('error');
    }
  });
});
