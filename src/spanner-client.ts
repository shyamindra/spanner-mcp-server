import { Spanner } from '@google-cloud/spanner';
import { configManager } from './config/spanner-config.js';
import { QueryResult, SchemaInfo, TableInfo, ColumnInfo } from './types/index.js';
import winston from 'winston';

export class SpannerClient {
  private spanner: Spanner;
  private instance: any;
  private database: any;
  private logger: winston.Logger;

  constructor() {
    const config = configManager.getSpannerConfig();
    
    this.spanner = new Spanner({
      projectId: config.projectId,
      keyFilename: config.credentials,
    });

    this.instance = this.spanner.instance(config.instanceId);
    this.database = this.instance.database(config.databaseId);
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'spanner-client.log' })
      ]
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const [operation] = await this.database.get();
      this.logger.info('Successfully connected to Spanner database', {
        database: operation.name,
        state: operation.state
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to Spanner database', { error });
      return false;
    }
  }

  async executeQuery(sql: string, params?: any): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // ADDITIONAL READ-ONLY ENFORCEMENT AT DATABASE LEVEL
      const sqlUpper = sql.toUpperCase().trim();
      
      // Final safety check - ensure only SELECT statements
      if (!sqlUpper.startsWith('SELECT')) {
        this.logger.warn('Attempted non-SELECT query blocked', { sql });
        return {
          success: false,
          error: 'Only SELECT statements are allowed in read-only mode',
          executionTime: Date.now() - startTime,
          sql
        };
      }

      // Check for dangerous keywords one more time
      const dangerousKeywords = [
        'DELETE', 'DROP', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE',
        'GRANT', 'REVOKE', 'EXECUTE', 'EXEC', 'CALL', 'PROCEDURE', 'FUNCTION',
        'TRIGGER', 'INDEX', 'VIEW', 'SCHEMA', 'DATABASE', 'INSTANCE',
        'BACKUP', 'RESTORE', 'IMPORT', 'EXPORT', 'LOAD', 'UNLOAD',
        'MERGE', 'UPSERT', 'REPLACE', 'MODIFY', 'CHANGE', 'SET'
      ];
      
      for (const keyword of dangerousKeywords) {
        if (sqlUpper.includes(keyword)) {
          this.logger.warn('Dangerous keyword detected in query', { sql, keyword });
          return {
            success: false,
            error: `Dangerous operation detected: ${keyword} - Read-only mode only`,
            executionTime: Date.now() - startTime,
            sql
          };
        }
      }

      this.logger.info('Executing read-only query', { sql, params });
      
      // Use read-only transaction for additional safety
      const transaction = this.database.runTransaction({
        readOnly: true,
        timeout: configManager.getMaxQueryTime(),
      });

      const [rows] = await transaction.run({
        sql,
        params,
      });

      await transaction.commit();

      const executionTime = Date.now() - startTime;
      const rowCount = rows.length;

      this.logger.info('Read-only query executed successfully', {
        executionTime,
        rowCount,
        sql
      });

      return {
        success: true,
        data: rows,
        executionTime,
        rowCount,
        sql
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('Query execution failed', {
        error: error instanceof Error ? error.message : error,
        executionTime,
        sql
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        sql
      };
    }
  }

  async getSchema(): Promise<SchemaInfo> {
    try {
      // Query to get table information
      const tableQuery = `
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = ''
        ORDER BY table_name, ordinal_position
      `;

      const [rows] = await this.database.run({ sql: tableQuery });
      
      const tableMap = new Map<string, TableInfo>();
      
      for (const row of rows) {
        const tableName = row.table_name;
        const columnName = row.column_name;
        
        if (!tableMap.has(tableName)) {
          tableMap.set(tableName, {
            name: tableName,
            columns: [],
            indexes: []
          });
        }
        
        const table = tableMap.get(tableName)!;
        table.columns.push({
          name: columnName,
          type: row.data_type,
          nullable: row.is_nullable === 'YES'
        });
      }

      // Get primary key information
      const pkQuery = `
        SELECT 
          table_name,
          column_name
        FROM information_schema.key_column_usage 
        WHERE constraint_name = 'PRIMARY_KEY'
        ORDER BY ordinal_position
      `;

      const [pkRows] = await this.database.run({ sql: pkQuery });
      
      for (const row of pkRows) {
        const table = tableMap.get(row.table_name);
        if (table) {
          if (!table.primaryKey) {
            table.primaryKey = [];
          }
          table.primaryKey.push(row.column_name);
          
          // Mark column as primary key
          const column = table.columns.find(c => c.name === row.column_name);
          if (column) {
            column.isPrimaryKey = true;
          }
        }
      }

      const schema: SchemaInfo = {
        tables: Array.from(tableMap.values()),
        lastUpdated: new Date()
      };

      this.logger.info('Schema retrieved successfully', {
        tableCount: schema.tables.length,
        totalColumns: schema.tables.reduce((sum, table) => sum + table.columns.length, 0)
      });

      return schema;
    } catch (error) {
      this.logger.error('Failed to retrieve schema', { error });
      throw new Error(`Failed to retrieve schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTableInfo(tableName: string): Promise<TableInfo | null> {
    try {
      const schema = await this.getSchema();
      return schema.tables.find(table => table.name === tableName) || null;
    } catch (error) {
      this.logger.error('Failed to get table info', { tableName, error });
      return null;
    }
  }

  async listTables(): Promise<string[]> {
    try {
      const schema = await this.getSchema();
      return schema.tables.map(table => table.name);
    } catch (error) {
      this.logger.error('Failed to list tables', { error });
      return [];
    }
  }

  async close(): Promise<void> {
    try {
      await this.database.close();
      this.logger.info('Spanner client closed successfully');
    } catch (error) {
      this.logger.error('Error closing Spanner client', { error });
    }
  }
} 