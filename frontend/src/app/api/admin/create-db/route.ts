import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import path from 'path';
import { promises as fs } from 'fs';

// This endpoint is for staging environment only - creates database and schema
export async function POST() {
  // Only allow in staging environment
  if (process.env.ENVIRONMENT !== 'staging') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in staging environment' },
      { status: 403 }
    );
  }

  // Must use PostgreSQL
  if (!process.env.USE_POSTGRES || !process.env.DB_HOST) {
    return NextResponse.json(
      { success: false, error: 'PostgreSQL is not properly configured' },
      { status: 400 }
    );
  }

  const dbHost = process.env.DB_HOST;
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres';
  const dbName = process.env.DB_NAME || 'ai_square_staging';
  const isCloudSQL = dbHost.startsWith('/cloudsql/');

  try {
    // Step 1: Connect to postgres database to create our database
    const adminPoolConfig: any = {
      host: dbHost,
      database: 'postgres', // Connect to default postgres database
      user: dbUser,
      password: dbPassword,
      max: 1,
      connectionTimeoutMillis: 10000,
    };
    
    if (!isCloudSQL) {
      adminPoolConfig.port = parseInt(process.env.DB_PORT || '5432');
    }

    console.log('Connecting to postgres database to create database...');
    const adminPool = new Pool(adminPoolConfig);
    
    try {
      // Check if database exists
      const checkResult = await adminPool.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
      );
      
      if (checkResult.rows.length === 0) {
        // Create database
        console.log(`Creating database ${dbName}...`);
        await adminPool.query(`CREATE DATABASE ${dbName}`);
        console.log('Database created successfully');
      } else {
        console.log('Database already exists');
      }
    } finally {
      await adminPool.end();
    }

    // Step 2: Connect to the new database and create schema
    const appPoolConfig: any = {
      host: dbHost,
      database: dbName,
      user: dbUser,
      password: dbPassword,
      max: 5,
      connectionTimeoutMillis: 10000,
    };
    
    if (!isCloudSQL) {
      appPoolConfig.port = parseInt(process.env.DB_PORT || '5432');
    }

    console.log(`Connecting to ${dbName} database to create schema...`);
    const appPool = new Pool(appPoolConfig);
    
    try {
      // Check if tables exist
      const tablesResult = await appPool.query(
        `SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'scenarios'`
      );
      
      if (tablesResult.rows[0].count === '0') {
        console.log('Creating database schema...');
        
        // Read schema file
        const schemaPath = path.join(process.cwd(), 'src/lib/repositories/postgresql/schema-v3.sql');
        const schemaContent = await fs.readFile(schemaPath, 'utf-8');
        
        // Execute schema
        await appPool.query(schemaContent);
        console.log('Schema created successfully');
        
        // Insert initial data
        console.log('Inserting initial data...');
        const initDataPath = path.join(process.cwd(), 'scripts/init-staging-data.sql');
        const initDataContent = await fs.readFile(initDataPath, 'utf-8');
        
        await appPool.query(initDataContent);
        console.log('Initial data inserted successfully');
      } else {
        console.log('Schema already exists');
      }
      
      // Get final counts
      const countResult = await appPool.query(
        `SELECT 
          (SELECT COUNT(*) FROM scenarios) as scenarios,
          (SELECT COUNT(*) FROM users) as users`
      );
      
      return NextResponse.json({
        success: true,
        message: 'Database initialization completed',
        data: countResult.rows[0]
      });
      
    } finally {
      await appPool.end();
    }
    
  } catch (error) {
    console.error('Database creation/initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create/initialize database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}