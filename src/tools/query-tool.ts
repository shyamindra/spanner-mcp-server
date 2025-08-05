import { z } from 'zod';
import { QueryProcessor } from '../query-processor.js';
import { NaturalLanguageQuery } from '../types/index.js';
import winston from 'winston';

export class QueryTool {
  private queryProcessor: QueryProcessor;
  private logger: winston.Logger;

  constructor(queryProcessor: QueryProcessor) {
    this.queryProcessor = queryProcessor;
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'query-tool.log' })
      ]
    });
  }

  getToolDefinition() {
    return {
      name: 'query_database',
      description: 'Execute READ-ONLY natural language queries against Google Cloud Spanner database. Only SELECT operations are allowed.',
      inputSchema: z.object({
        query: z.string().describe('Natural language query to execute (READ-ONLY only, e.g., "show me all users", "count orders by status")'),
        limit: z.number().optional().describe('Maximum number of rows to return (default: 1000)'),
        explain: z.boolean().optional().describe('If true, explain the query without executing it')
      })
    };
  }

  async execute(args: { query: string; limit?: number; explain?: boolean }) {
    try {
      this.logger.info('Executing READ-ONLY query tool', { args });

      // ADDITIONAL READ-ONLY VALIDATION AT TOOL LEVEL
      const query = args.query.toLowerCase();
      const modificationKeywords = [
        'insert', 'update', 'delete', 'drop', 'create', 'alter', 'modify',
        'change', 'remove', 'add', 'set', 'clear', 'truncate', 'replace',
        'edit', 'modify', 'change', 'remove', 'delete', 'erase', 'clear'
      ];
      
      for (const keyword of modificationKeywords) {
        if (query.includes(keyword)) {
          this.logger.warn('Modification keyword detected in tool execution', { 
            query: args.query, 
            keyword 
          });
          return {
            success: false,
            error: `Modification operation detected: "${keyword}" - This is a read-only system. Only SELECT operations are allowed.`,
            type: 'security_error'
          };
        }
      }

      if (args.explain) {
        const explanation = await this.queryProcessor.explainQuery(args.query);
        return {
          success: true,
          explanation,
          type: 'explanation'
        };
      }

      const naturalQuery: NaturalLanguageQuery = {
        query: args.query,
        limit: args.limit,
        explain: false
      };

      const result = await this.queryProcessor.processNaturalLanguageQuery(naturalQuery);

      if (result.success) {
        return {
          success: true,
          data: result.data,
          rowCount: result.rowCount,
          executionTime: result.executionTime,
          sql: result.sql,
          type: 'query_result'
        };
      } else {
        return {
          success: false,
          error: result.error,
          sql: result.sql,
          type: 'query_error'
        };
      }
    } catch (error) {
      this.logger.error('Error in query tool execution', { 
        args, 
        error: error instanceof Error ? error.message : error 
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        type: 'tool_error'
      };
    }
  }
} 