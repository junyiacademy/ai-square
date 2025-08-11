import { Pool } from 'pg';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

export class IntegrationTestEnvironment {
  private dbPool: Pool | null = null;
  private redisClient: Redis | null = null;
  private testDbName: string;
  private isSetup: boolean = false;

  constructor() {
    // Use timestamp and process ID to ensure uniqueness
    this.testDbName = `test_db_${Date.now()}_${process.pid}`;
  }

  async setup() {
    if (this.isSetup) return;
    
    console.log(`🚀 Setting up test environment: ${this.testDbName}`);
    
    try {
      // 1. Create test database
      await this.createTestDatabase();
      
      // 2. Run migrations
      await this.runMigrations();
      
      // 3. Setup Redis test instance
      await this.setupRedis();
      
      // 4. Setup environment variables
      this.setupEnvironmentVariables();
      
      this.isSetup = true;
      console.log('✅ Test environment ready');
    } catch (error) {
      console.error('❌ Setup failed:', error);
      await this.teardown();
      throw error;
    }
  }

  async teardown() {
    console.log('🧹 Cleaning up test environment');
    
    try {
      // Close connections
      if (this.dbPool) {
        await this.dbPool.end();
        this.dbPool = null;
      }
      
      if (this.redisClient) {
        await this.redisClient.flushdb();
        await this.redisClient.quit();
        this.redisClient = null;
      }
      
      // Drop test database
      await this.dropTestDatabase();
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.error('⚠️ Cleanup error:', error);
    }
  }

  private async createTestDatabase() {
    const adminPool = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5433'),
      database: 'postgres',
      user: 'postgres',
      password: 'postgres',
    });

    try {
      // Check and drop existing test database
      await adminPool.query(
        `DROP DATABASE IF EXISTS "${this.testDbName}"`
      );
      
      // Create new test database
      await adminPool.query(
        `CREATE DATABASE "${this.testDbName}"`
      );
      
      console.log(`📦 Created test database: ${this.testDbName}`);
    } finally {
      await adminPool.end();
    }

    // Connect to new database
    this.dbPool = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5433'),
      database: this.testDbName,
      user: 'postgres',
      password: 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    // Test the connection
    try {
      const client = await this.dbPool.connect();
      await client.query('SELECT 1');
      client.release();
    } catch (error) {
      console.error('Failed to connect to test database:', error);
      throw error;
    }
  }

  private async runMigrations() {
    if (!this.dbPool) {
      throw new Error('Database pool not initialized');
    }

    // Check if schema file exists
    const schemaPath = path.join(
      process.cwd(), 
      'src/lib/repositories/postgresql/schema-v3.sql'
    );
    
    if (!fs.existsSync(schemaPath)) {
      console.warn('⚠️ Schema file not found, using basic schema');
      await this.createBasicSchema();
      return;
    }
    
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the full schema file in one go to preserve PL/pgSQL blocks
    try {
      await this.dbPool.query(sql);
    } catch (error: any) {
      console.error(`Error executing schema-v3.sql: ${error.message}`);
    }
    
    // After base schema, also apply auth migration to add password/session related structures
    const authMigrationPath = path.join(
      process.cwd(),
      'src/lib/repositories/postgresql/migrations/20250204-add-password-column.sql'
    );
    if (fs.existsSync(authMigrationPath)) {
      try {
        const authSql = fs.readFileSync(authMigrationPath, 'utf8');
        await this.dbPool.query(authSql);
      } catch (error: any) {
        console.error(`Auth migration error: ${error.message}`);
      }
    } else {
      console.warn('⚠️ Auth migration SQL not found, skipping password/session columns');
    }

    // Ensure compatibility 'sessions' table exists for tests expecting this name
    try {
      await this.dbPool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.dbPool.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
    } catch (error: any) {
      console.error('Error ensuring compatibility sessions table:', error.message);
    }
    
    console.log('📋 Migrations completed');
  }

  private async createBasicSchema() {
    if (!this.dbPool) return;

    // Create basic tables for testing
    const queries = [
      // Extensions
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
      
      // Custom types
      `DO $$ BEGIN
        CREATE TYPE learning_mode AS ENUM ('pbl', 'discovery', 'assessment');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$`,
      
      `DO $$ BEGIN
        CREATE TYPE scenario_status AS ENUM ('draft', 'active', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$`,
      
      `DO $$ BEGIN
        CREATE TYPE program_status AS ENUM ('pending', 'active', 'completed', 'expired');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$`,
      
      `DO $$ BEGIN
        CREATE TYPE task_type AS ENUM ('question', 'chat', 'creation', 'analysis');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$`,
      
      `DO $$ BEGIN
        CREATE TYPE task_status AS ENUM ('pending', 'active', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Scenarios table
      `CREATE TABLE IF NOT EXISTS scenarios (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        mode learning_mode NOT NULL,
        status scenario_status DEFAULT 'draft',
        source_type VARCHAR(50),
        source_path VARCHAR(500),
        source_id VARCHAR(255),
        source_metadata JSONB,
        title JSONB NOT NULL,
        description JSONB,
        objectives JSONB,
        task_templates JSONB,
        pbl_data JSONB,
        discovery_data JSONB,
        assessment_data JSONB,
        ai_modules JSONB,
        resources JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Programs table
      `CREATE TABLE IF NOT EXISTS programs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        mode learning_mode,
        scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        status program_status DEFAULT 'pending',
        total_score NUMERIC,
        time_spent_seconds INTEGER DEFAULT 0,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        pbl_data JSONB,
        discovery_data JSONB,
        assessment_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tasks table
      `CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        mode learning_mode,
        program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
        task_index INTEGER,
        type task_type NOT NULL,
        status task_status DEFAULT 'pending',
        title JSONB,
        instructions JSONB,
        content JSONB,
        context JSONB,
        metadata JSONB,
        interactions JSONB DEFAULT '[]'::jsonb,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        pbl_data JSONB,
        discovery_data JSONB,
        assessment_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Evaluations table
      `CREATE TABLE IF NOT EXISTS evaluations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        mode learning_mode,
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        evaluation_type VARCHAR(50),
        score NUMERIC,
        feedback TEXT,
        criteria JSONB,
        rubric JSONB,
        ai_config JSONB,
        ai_response JSONB,
        pbl_data JSONB,
        discovery_data JSONB,
        assessment_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Verification tokens table
      `CREATE TABLE IF NOT EXISTS verification_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_scenarios_mode ON scenarios(mode)`,
      `CREATE INDEX IF NOT EXISTS idx_programs_user_id ON programs(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_programs_scenario_id ON programs(scenario_id)`,
      `CREATE INDEX IF NOT EXISTS idx_programs_mode ON programs(mode)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_program_id ON tasks(program_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_mode ON tasks(mode)`,
      `CREATE INDEX IF NOT EXISTS idx_evaluations_task_id ON evaluations(task_id)`,
      `CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations(user_id)`
    ];

    for (const query of queries) {
      try {
        await this.dbPool.query(query);
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          console.error(`Schema error: ${error.message}`);
        }
      }
    }
  }

  public async setupRedis() {
    // Check if Redis should be enabled for tests
    const redisEnabled = process.env.TEST_REDIS_ENABLED !== 'false';
    
    if (!redisEnabled) {
      console.log('⏭️ Skipping Redis setup (TEST_REDIS_ENABLED=false)');
      return;
    }

    try {
      this.redisClient = new Redis({
        host: process.env.TEST_REDIS_HOST || 'localhost',
        port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
        db: 1, // Use different db index to avoid conflicts
        retryStrategy: () => null, // Don't retry if Redis is down
      });
      
      // Test connection
      await this.redisClient.ping();
      await this.redisClient.flushdb();
      
      console.log('🔴 Redis connected and cleared');
    } catch (error) {
      console.warn('⚠️ Redis connection failed, tests will run without cache');
      if (this.redisClient) {
        this.redisClient.quit();
        this.redisClient = null;
      }
    }
  }

  private setupEnvironmentVariables() {
    // Set test environment variables
    if (process.env.NODE_ENV !== 'test') {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5433';
    process.env.DB_NAME = this.testDbName;
    process.env.DB_USER = 'postgres';
    process.env.DB_PASSWORD = 'postgres';
    
    if (this.redisClient) {
      process.env.REDIS_ENABLED = 'true';
      process.env.REDIS_URL = 'redis://localhost:6379/1';
    } else {
      process.env.REDIS_ENABLED = 'false';
    }
    
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.NEXTAUTH_SECRET = 'test-secret-for-integration-tests';
    
    console.log('🔧 Environment variables configured');
  }

  private async dropTestDatabase() {
    const adminPool = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5433'),
      database: 'postgres',
      user: 'postgres',
      password: 'postgres',
    });

    try {
      // Force disconnect all connections
      await adminPool.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${this.testDbName}'
          AND pid <> pg_backend_pid()
      `);
      
      // Drop database
      await adminPool.query(
        `DROP DATABASE IF EXISTS "${this.testDbName}"`
      );
      
      console.log(`🗑️ Dropped test database: ${this.testDbName}`);
    } catch (error) {
      console.error('Error dropping database:', error);
    } finally {
      await adminPool.end();
    }
  }

  // Getters for test access
  getDbPool() { 
    if (!this.dbPool) {
      console.warn('Warning: Database pool is null');
    }
    return this.dbPool; 
  }
  
  getRedisClient() { 
    return this.redisClient; 
  }
  
  getTestDbName() { 
    return this.testDbName; 
  }
}