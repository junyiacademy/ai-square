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
    // Verify admin key
    const adminKey = request.headers.get('X-Admin-Key');
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const users: UserSeed[] = body.users || [];

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No users provided' },
        { status: 400 }
      );
    }

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