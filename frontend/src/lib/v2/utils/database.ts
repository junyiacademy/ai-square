/**
 * Database Connection Utilities
 * Handles database connections and query building
 */

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  poolSize?: number;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DatabaseConnection {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (client: DatabaseConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * Database connection factory
 * Creates appropriate database connection based on configuration
 */
export class DatabaseFactory {
  static async create(config: DatabaseConfig): Promise<DatabaseConnection> {
    // For now, we'll create a mock implementation
    // In production, this would create actual database connections
    return new MockDatabaseConnection(config);
  }
  
  async create(config: DatabaseConfig): Promise<DatabaseConnection> {
    // Instance method for non-static usage
    return DatabaseFactory.create(config);
  }
}

/**
 * Mock database connection for development
 * Replace with actual database implementation
 */
class MockDatabaseConnection implements DatabaseConnection {
  private config: DatabaseConfig;
  private isConnected: boolean = false;
  // In-memory storage for mock data
  private static storage: Map<string, any[]> = new Map();

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.connect();
  }

  private connect(): void {
    // Simulate connection
    this.isConnected = true;
    console.log('Mock database connected:', this.config.database);
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    console.log('Mock query:', sql, params);
    
    // Parse the SQL to determine the operation
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.startsWith('insert')) {
      return this.handleInsert<T>(sql, params);
    } else if (sqlLower.startsWith('select')) {
      return this.handleSelect<T>(sql, params);
    } else if (sqlLower.startsWith('update')) {
      return this.handleUpdate<T>(sql, params);
    } else if (sqlLower.startsWith('delete')) {
      return this.handleDelete<T>(sql, params);
    }
    
    // Default return
    return {
      rows: [],
      rowCount: 0
    };
  }

  private handleInsert<T>(sql: string, params?: any[]): QueryResult<T> {
    // Extract table name
    const tableMatch = sql.match(/INSERT INTO (\w+)/i);
    if (!tableMatch) {
      return { rows: [], rowCount: 0 };
    }
    
    const tableName = tableMatch[1];
    
    // Extract field names
    const fieldsMatch = sql.match(/\(([^)]+)\)/);
    if (!fieldsMatch || !params) {
      return { rows: [], rowCount: 0 };
    }
    
    const fields = fieldsMatch[1].split(',').map(f => f.trim());
    
    // Create object from fields and params
    const obj: any = {};
    fields.forEach((field, index) => {
      obj[field] = params[index];
    });
    
    // Store in memory
    if (!MockDatabaseConnection.storage.has(tableName)) {
      MockDatabaseConnection.storage.set(tableName, []);
    }
    
    const tableData = MockDatabaseConnection.storage.get(tableName)!;
    tableData.push(obj);
    
    return {
      rows: [obj as T],
      rowCount: 1
    };
  }

  private handleSelect<T>(sql: string, params?: any[]): QueryResult<T> {
    // Extract table name
    const tableMatch = sql.match(/FROM (\w+)/i);
    if (!tableMatch) {
      return { rows: [], rowCount: 0 };
    }
    
    const tableName = tableMatch[1];
    const tableData = MockDatabaseConnection.storage.get(tableName) || [];
    
    // Simple WHERE clause handling
    let filteredData = [...tableData];
    
    // Handle WHERE id = $1
    const whereIdMatch = sql.match(/WHERE id = \$1/i);
    if (whereIdMatch && params && params[0]) {
      filteredData = filteredData.filter(row => row.id === params[0]);
    }
    
    // Handle WHERE id IN
    const whereInMatch = sql.match(/WHERE id IN \(([^)]+)\)/i);
    if (whereInMatch && params) {
      filteredData = filteredData.filter(row => params.includes(row.id));
    }
    
    // Handle other WHERE conditions
    const whereMatch = sql.match(/WHERE (\w+) = \$1/i);
    if (whereMatch && params && params[0]) {
      const field = whereMatch[1];
      filteredData = filteredData.filter(row => row[field] === params[0]);
    }
    
    // Handle ORDER BY
    const orderByMatch = sql.match(/ORDER BY (\w+)(?: (ASC|DESC))?/i);
    if (orderByMatch) {
      const field = orderByMatch[1];
      const direction = orderByMatch[2] || 'ASC';
      
      filteredData.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        
        if (direction === 'DESC') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }
    
    // Handle LIMIT
    const limitMatch = sql.match(/LIMIT (\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1]);
      filteredData = filteredData.slice(0, limit);
    }
    
    return {
      rows: filteredData as T[],
      rowCount: filteredData.length
    };
  }

  private handleUpdate<T>(sql: string, params?: any[]): QueryResult<T> {
    // Extract table name
    const tableMatch = sql.match(/UPDATE (\w+)/i);
    if (!tableMatch || !params) {
      return { rows: [], rowCount: 0 };
    }
    
    const tableName = tableMatch[1];
    const tableData = MockDatabaseConnection.storage.get(tableName) || [];
    
    // Find the item to update (assuming WHERE id = $n)
    const id = params[params.length - 1]; // ID is usually the last parameter
    const itemIndex = tableData.findIndex(row => row.id === id);
    
    if (itemIndex !== -1) {
      // Parse SET clause
      const setMatch = sql.match(/SET (.+) WHERE/i);
      if (setMatch) {
        const setParts = setMatch[1].split(',').map(p => p.trim());
        
        setParts.forEach((setPart, index) => {
          const [field] = setPart.split('=').map(p => p.trim());
          tableData[itemIndex][field] = params[index];
        });
        
        return {
          rows: [tableData[itemIndex] as T],
          rowCount: 1
        };
      }
    }
    
    return { rows: [], rowCount: 0 };
  }

  private handleDelete<T>(sql: string, params?: any[]): QueryResult<T> {
    // Extract table name
    const tableMatch = sql.match(/DELETE FROM (\w+)/i);
    if (!tableMatch) {
      return { rows: [], rowCount: 0 };
    }
    
    const tableName = tableMatch[1];
    const tableData = MockDatabaseConnection.storage.get(tableName) || [];
    
    // Handle WHERE id = $1
    if (params && params[0]) {
      const originalLength = tableData.length;
      const filtered = tableData.filter(row => row.id !== params[0]);
      MockDatabaseConnection.storage.set(tableName, filtered);
      
      return {
        rows: [],
        rowCount: originalLength - filtered.length
      };
    }
    
    return { rows: [], rowCount: 0 };
  }

  async transaction<T>(callback: (client: DatabaseConnection) => Promise<T>): Promise<T> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    console.log('Mock transaction started');
    
    try {
      const result = await callback(this);
      console.log('Mock transaction committed');
      return result;
    } catch (error) {
      console.log('Mock transaction rolled back');
      throw error;
    }
  }

  async close(): Promise<void> {
    this.isConnected = false;
    console.log('Mock database connection closed');
  }
}

/**
 * Query builder helper
 */
export class QueryBuilder {
  private tableName: string;
  private selectFields: string[] = ['*'];
  private whereConditions: string[] = [];
  private whereParams: any[] = [];
  private orderByClause?: string;
  private limitValue?: number;
  private offsetValue?: number;

  constructor(table: string) {
    this.tableName = table;
  }

  select(...fields: string[]): QueryBuilder {
    this.selectFields = fields.length > 0 ? fields : ['*'];
    return this;
  }

  where(field: string, operator: string, value: any): QueryBuilder {
    const paramIndex = this.whereParams.length + 1;
    this.whereConditions.push(`${field} ${operator} $${paramIndex}`);
    this.whereParams.push(value);
    return this;
  }

  whereIn(field: string, values: any[]): QueryBuilder {
    const paramIndices = values.map((_, index) => `$${this.whereParams.length + index + 1}`);
    this.whereConditions.push(`${field} IN (${paramIndices.join(', ')})`);
    this.whereParams.push(...values);
    return this;
  }

  whereNull(field: string): QueryBuilder {
    this.whereConditions.push(`${field} IS NULL`);
    return this;
  }

  whereNotNull(field: string): QueryBuilder {
    this.whereConditions.push(`${field} IS NOT NULL`);
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClause = `${field} ${direction}`;
    return this;
  }

  limit(value: number): QueryBuilder {
    this.limitValue = value;
    return this;
  }

  offset(value: number): QueryBuilder {
    this.offsetValue = value;
    return this;
  }

  build(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.orderByClause) {
      sql += ` ORDER BY ${this.orderByClause}`;
    }
    
    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }
    
    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }
    
    return { sql, params: this.whereParams };
  }

  static insert(table: string, data: Record<string, any>): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const paramIndices = fields.map((_, index) => `$${index + 1}`);
    
    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${paramIndices.join(', ')}) RETURNING *`;
    
    return { sql, params: values };
  }

  static update(table: string, id: string, data: Record<string, any>): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`;
    
    return { sql, params: [...values, id] };
  }

  static delete(table: string, id: string): { sql: string; params: any[] } {
    const sql = `DELETE FROM ${table} WHERE id = $1`;
    return { sql, params: [id] };
  }
}

/**
 * Database migration helper
 */
export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

/**
 * Get a mock database instance for development/testing
 */
let mockDbInstance: DatabaseConnection | null = null;

export function getMockDatabase(): DatabaseConnection {
  if (!mockDbInstance) {
    mockDbInstance = new MockDatabaseConnection({
      database: 'ai-square-mock'
    });
  }
  return mockDbInstance;
}

export class MigrationRunner {
  private connection: DatabaseConnection;
  private migrationsTable: string = 'migrations_v2';

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  async initialize(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await this.connection.query(createTableSql);
  }

  async getAppliedMigrations(): Promise<number[]> {
    const result = await this.connection.query<{ version: number }>(
      `SELECT version FROM ${this.migrationsTable} ORDER BY version`
    );
    
    return result.rows.map(row => row.version);
  }

  async runMigration(migration: Migration): Promise<void> {
    await this.connection.transaction(async (client) => {
      // Run migration
      await client.query(migration.up);
      
      // Record migration
      await client.query(
        `INSERT INTO ${this.migrationsTable} (version, name) VALUES ($1, $2)`,
        [migration.version, migration.name]
      );
    });
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    await this.connection.transaction(async (client) => {
      // Run rollback
      await client.query(migration.down);
      
      // Remove migration record
      await client.query(
        `DELETE FROM ${this.migrationsTable} WHERE version = $1`,
        [migration.version]
      );
    });
  }
}