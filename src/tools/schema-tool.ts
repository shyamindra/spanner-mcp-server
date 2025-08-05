import { z } from 'zod';
import { SpannerClient } from '../spanner-client.js';
import winston from 'winston';

export class SchemaTool {
  private spannerClient: SpannerClient;
  private logger: winston.Logger;

  constructor(spannerClient: SpannerClient) {
    this.spannerClient = spannerClient;
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'schema-tool.log' })
      ]
    });
  }

  getToolDefinitions() {
    return [
      {
        name: 'get_schema',
        description: 'Get the complete database schema including tables, columns, and relationships',
        inputSchema: z.object({})
      },
      {
        name: 'list_tables',
        description: 'List all available tables in the database',
        inputSchema: z.object({})
      },
      {
        name: 'get_table_info',
        description: 'Get detailed information about a specific table',
        inputSchema: z.object({
          tableName: z.string().describe('Name of the table to get information about')
        })
      }
    ];
  }

  async getSchema() {
    try {
      this.logger.info('Getting database schema');
      
      const schema = await this.spannerClient.getSchema();
      
      return {
        success: true,
        schema: {
          tables: schema.tables.map(table => ({
            name: table.name,
            columns: table.columns.map(col => ({
              name: col.name,
              type: col.type,
              nullable: col.nullable,
              isPrimaryKey: col.isPrimaryKey
            })),
            primaryKey: table.primaryKey,
            columnCount: table.columns.length
          })),
          tableCount: schema.tables.length,
          lastUpdated: schema.lastUpdated
        },
        type: 'schema_info'
      };
    } catch (error) {
      this.logger.error('Error getting schema', { error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        type: 'schema_error'
      };
    }
  }

  async listTables() {
    try {
      this.logger.info('Listing tables');
      
      const tables = await this.spannerClient.listTables();
      
      return {
        success: true,
        tables,
        tableCount: tables.length,
        type: 'table_list'
      };
    } catch (error) {
      this.logger.error('Error listing tables', { error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        type: 'table_list_error'
      };
    }
  }

  async getTableInfo(args: { tableName: string }) {
    try {
      this.logger.info('Getting table info', { tableName: args.tableName });
      
      const tableInfo = await this.spannerClient.getTableInfo(args.tableName);
      
      if (!tableInfo) {
        return {
          success: false,
          error: `Table '${args.tableName}' not found`,
          type: 'table_not_found'
        };
      }
      
      return {
        success: true,
        table: {
          name: tableInfo.name,
          columns: tableInfo.columns.map(col => ({
            name: col.name,
            type: col.type,
            nullable: col.nullable,
            isPrimaryKey: col.isPrimaryKey
          })),
          primaryKey: tableInfo.primaryKey,
          columnCount: tableInfo.columns.length
        },
        type: 'table_info'
      };
    } catch (error) {
      this.logger.error('Error getting table info', { tableName: args.tableName, error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        type: 'table_info_error'
      };
    }
  }
} 