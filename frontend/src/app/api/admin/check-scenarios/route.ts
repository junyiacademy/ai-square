import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  let pool: Pool | null = null;

  try {
    // Use DATABASE_URL for connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 5000,
    });

    // Get scenario counts by mode and status
    const countQuery = `
      SELECT mode, status, COUNT(*) as count
      FROM scenarios
      GROUP BY mode, status
      ORDER BY mode, status
    `;

    const countResult = await pool.query(countQuery);

    // Get sample scenarios
    const sampleQuery = `
      SELECT id, mode, status, title, created_at
      FROM scenarios
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const sampleResult = await pool.query(sampleQuery);

    return NextResponse.json({
      success: true,
      counts: countResult.rows,
      samples: sampleResult.rows,
      total: countResult.rows.reduce(
        (sum, row) => sum + parseInt(row.count),
        0,
      ),
    });
  } catch (error: unknown) {
    console.error("Check scenarios error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
