import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

interface UserSeed {
  email: string;
  password: string;
  role: string;
  name?: string;
}

/**
 * Seed demo user accounts via API
 * This endpoint is called by GitHub Actions during deployment
 */
export async function POST(request: NextRequest) {
  let pool: Pool | null = null;

  try {
    // Default demo users
    const defaultUsers: UserSeed[] = [
      { email: 'student@example.com', password: 'student123', role: 'student', name: 'Demo Student' },
      { email: 'teacher@example.com', password: 'teacher123', role: 'teacher', name: 'Demo Teacher' },
      { email: 'admin@example.com', password: 'admin123', role: 'admin', name: 'Demo Admin' }
    ];

    // Allow override from request body for testing, but use defaults if not provided
    let users: UserSeed[] = defaultUsers;

    try {
      const body = await request.json();
      if (body.users && Array.isArray(body.users) && body.users.length > 0) {
        users = body.users;
      }
    } catch {
      // If no body or invalid JSON, use defaults
    }

    // Create database connection
    if (process.env.DATABASE_URL) {
      const isCloudSQL = process.env.DATABASE_URL.includes('/cloudsql/');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        connectionTimeoutMillis: isCloudSQL ? 10000 : 2000,
        idleTimeoutMillis: 30000,
      });
    } else {
      const dbHost = process.env.DB_HOST || '127.0.0.1';
      const isCloudSQL = dbHost.startsWith('/cloudsql/');

      const dbConfig: Record<string, unknown> = {
        database: process.env.DB_NAME || 'ai_square_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 20,
        connectionTimeoutMillis: isCloudSQL ? 10000 : 2000,
        idleTimeoutMillis: 30000,
      };

      if (isCloudSQL) {
        dbConfig.host = dbHost;
      } else {
        dbConfig.host = dbHost;
        dbConfig.port = parseInt(process.env.DB_PORT || '5433');
      }

      pool = new Pool(dbConfig);
    }

    const results = await Promise.all(
      users.map(async (userData) => {
        try {
          // Check if user already exists
          const existingUserResult = await pool!.query(
            'SELECT id FROM users WHERE email = $1',
            [userData.email]
          );

          if (existingUserResult.rows.length > 0) {
            // Update password if user exists
            const passwordHash = await bcrypt.hash(userData.password, 10);
            await pool!.query(
              `UPDATE users
               SET password_hash = $1, role = $2, updated_at = CURRENT_TIMESTAMP
               WHERE email = $3`,
              [passwordHash, userData.role, userData.email]
            );

            return {
              email: userData.email,
              status: 'updated'
            };
          } else {
            // Create new user
            const passwordHash = await bcrypt.hash(userData.password, 10);
            const name = userData.name || `${userData.role.charAt(0).toUpperCase()}${userData.role.slice(1)} User`;

            await pool!.query(
              `INSERT INTO users (id, email, password_hash, name, role, email_verified, metadata, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [userData.email, passwordHash, name, userData.role, true, JSON.stringify({ seeded: true })]
            );

            return {
              email: userData.email,
              status: 'created'
            };
          }
        } catch (error) {
          console.error(`Failed to seed user ${userData.email}:`, error);
          return {
            email: userData.email,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const created = results.filter(r => r.status === 'created').length;
    const updated = results.filter(r => r.status === 'updated').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: failed === 0,
      message: `Created: ${created}, Updated: ${updated}, Failed: ${failed}`,
      results
    });

  } catch (error) {
    console.error('User seeding error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'User seeding failed'
      },
      { status: 500 }
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
