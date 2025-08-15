import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';

// Admin key for schema initialization
const ADMIN_KEY = process.env.ADMIN_INIT_KEY || 'schema-init-2025-secure';

export async function POST(request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    // Check authorization
    const authHeader = request.headers.get('x-admin-key');
    if (authHeader !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database configuration
    const dbConfig = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    // Special handling for Cloud SQL Unix socket
    if (dbConfig.host.startsWith('/cloudsql/')) {
      // Unix socket connection doesn't use port
      delete (dbConfig as any).port;
    }

    pool = new Pool(dbConfig);

    // First check if tables already exist
    const tablesCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'scenarios', 'programs', 'tasks', 'evaluations')
    `);

    const existingTables = parseInt(tablesCheck.rows[0].count);
    
    if (existingTables >= 5) {
      // Tables already exist, check if we need to add missing columns
      const columnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'scenarios'
        AND column_name IN ('version', 'difficulty', 'estimated_minutes', 'xp_rewards')
      `);

      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      const missingColumns = ['version', 'difficulty', 'estimated_minutes', 'xp_rewards']
        .filter(col => !existingColumns.includes(col));

      if (missingColumns.length > 0) {
        // Apply hotfix for missing columns
        await pool.query(`
          ALTER TABLE scenarios 
          ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT '1.0',
          ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'intermediate',
          ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 30,
          ADD COLUMN IF NOT EXISTS xp_rewards JSONB DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS ksa_codes JSONB DEFAULT '[]',
          ADD COLUMN IF NOT EXISTS unlock_requirements JSONB DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS image_url TEXT,
          ADD COLUMN IF NOT EXISTS badge_icon TEXT;
        `);

        return NextResponse.json({
          success: true,
          message: 'Schema already exists, missing columns added',
          tablesExist: existingTables,
          columnsAdded: missingColumns
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Schema already initialized',
        tablesExist: existingTables
      });
    }

    // Read schema file
    const schemaPath = path.join(process.cwd(), 'src/lib/repositories/postgresql/schema-v4.sql');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');

    // Execute schema in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute the entire schema as one statement
      // The schema file already contains proper transaction handling
      const statements = [schemaContent];

      // Execute the schema
      try {
        await client.query(schemaContent);
      } catch (err: any) {
        // Ignore certain expected errors
        if (!err.message?.includes('already exists') && 
            !err.message?.includes('duplicate key')) {
          throw err;
        }
      }

      await client.query('COMMIT');
      
      // Verify tables were created
      const verifyTables = await pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'scenarios', 'programs', 'tasks', 'evaluations')
      `);

      const createdTables = parseInt(verifyTables.rows[0].count);

      // Insert demo users
      await pool.query(`
        INSERT INTO users (email, name, password_hash, role)
        VALUES 
          ('student@example.com', 'Student User', '$2b$10$K7L1OJ0TfPALHfRplJNYPOefsVTPLiFve0ic1YYRdRbGhPcDDiliS', 'student'),
          ('teacher@example.com', 'Teacher User', '$2b$10$K7L1OJ0TfPALHfRplJNYPOefsVTPLiFve0ic1YYRdRbGhPcDDiliS', 'teacher'),
          ('admin@example.com', 'Admin User', '$2b$10$K7L1OJ0TfPALHfRplJNYPOefsVTPLiFve0ic1YYRdRbGhPcDDiliS', 'admin')
        ON CONFLICT (email) DO NOTHING;
      `);

      return NextResponse.json({
        success: true,
        message: 'Schema initialized successfully',
        tablesCreated: createdTables,
        demoUsersCreated: true
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Schema initialization error:', error);
    return NextResponse.json({
      error: 'Failed to initialize schema',
      details: error.message
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// GET method to check schema status
export async function GET(request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    const dbConfig = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    if (dbConfig.host.startsWith('/cloudsql/')) {
      delete (dbConfig as any).port;
    }

    pool = new Pool(dbConfig);

    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM scenarios) as scenario_count,
        (SELECT COUNT(*) FROM scenarios WHERE mode = 'assessment') as assessment_count,
        (SELECT COUNT(*) FROM scenarios WHERE mode = 'pbl') as pbl_count,
        (SELECT COUNT(*) FROM scenarios WHERE mode = 'discovery') as discovery_count
    `);

    return NextResponse.json({
      success: true,
      status: result.rows[0]
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      hint: 'Schema might not be initialized'
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}