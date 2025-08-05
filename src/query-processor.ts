import OpenAI from 'openai';
import { configManager } from './config/spanner-config.js';
import { 
  NaturalLanguageQuery, 
  SQLGenerationContext, 
  SchemaInfo, 
  QueryValidationResult,
  QueryResult 
} from './types/index.js';
import { SpannerClient } from './spanner-client.js';
import winston from 'winston';

export class QueryProcessor {
  private openai: OpenAI | null = null;
  private spannerClient: SpannerClient;
  private logger: winston.Logger;
  private schemaCache: SchemaInfo | null = null;
  private lastSchemaUpdate: number = 0;

  constructor(spannerClient: SpannerClient) {
    this.spannerClient = spannerClient;
    
    const apiKey = configManager.getOpenAIApiKey();
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'query-processor.log' })
      ]
    });
  }

  async processNaturalLanguageQuery(query: NaturalLanguageQuery): Promise<QueryResult> {
    try {
      this.logger.info('Processing natural language query', { query: query.query });

      // Get or refresh schema
      const schema = await this.getSchema();
      
      // Generate SQL from natural language
      const sql = await this.generateSQL(query.query, schema);
      
      if (!sql) {
        return {
          success: false,
          error: 'Failed to generate SQL from natural language query'
        };
      }

      // Validate the generated SQL
      const validation = await this.validateQuery(sql, schema);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Query validation failed: ${validation.errors.join(', ')}`,
          sql
        };
      }

      // Add LIMIT clause if not present and limit is specified
      let finalSql = sql;
      if (query.limit && !sql.toLowerCase().includes('limit')) {
        finalSql = `${sql} LIMIT ${query.limit}`;
      }

      // Execute the query
      const result = await this.spannerClient.executeQuery(finalSql);
      
      if (result.success) {
        this.logger.info('Query executed successfully', {
          originalQuery: query.query,
          generatedSql: finalSql,
          rowCount: result.rowCount
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Error processing natural language query', { 
        query: query.query, 
        error: error instanceof Error ? error.message : error 
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async getSchema(): Promise<SchemaInfo> {
    const now = Date.now();
    const cacheTime = configManager.getSchemaCacheTime();

    if (!this.schemaCache || (now - this.lastSchemaUpdate) > cacheTime) {
      this.logger.info('Refreshing schema cache');
      this.schemaCache = await this.spannerClient.getSchema();
      this.lastSchemaUpdate = now;
    }

    return this.schemaCache;
  }

  private async generateSQL(naturalQuery: string, schema: SchemaInfo): Promise<string | null> {
    if (!this.openai) {
      return this.generateSQLFallback(naturalQuery, schema);
    }

    try {
      const schemaDescription = this.createSchemaDescription(schema);
      
      const prompt = `
You are a SQL expert for Google Cloud Spanner. Convert the natural language query to SQL.

Database Schema:
${schemaDescription}

CRITICAL SECURITY RULES:
1. ONLY generate SELECT statements - NO INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, etc.
2. This is a READ-ONLY system - any modification operations are strictly forbidden
3. Use proper JOIN syntax for Spanner
4. ALWAYS include LIMIT clauses for large result sets
5. Handle NULL values appropriately
6. Use proper table and column names from the schema
7. Return only the SQL query, no explanations
8. If the user asks for any data modification, return an error message instead

Natural Language Query: "${naturalQuery}"

SQL Query:`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a SQL expert for Google Cloud Spanner. Generate only SQL queries, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const sql = completion.choices[0]?.message?.content?.trim();
      return sql || null;
    } catch (error) {
      this.logger.warn('OpenAI API failed, falling back to rule-based generation', { error });
      return this.generateSQLFallback(naturalQuery, schema);
    }
  }

  private generateSQLFallback(naturalQuery: string, schema: SchemaInfo): string | null {
    const query = naturalQuery.toLowerCase();
    const tables = schema.tables;

    // READ-ONLY PATTERN MATCHING - Only SELECT operations allowed
    
    // Check for modification keywords and reject them
    const modificationKeywords = [
      'insert', 'update', 'delete', 'drop', 'create', 'alter', 'modify',
      'change', 'remove', 'add', 'set', 'clear', 'truncate', 'replace'
    ];
    
    for (const keyword of modificationKeywords) {
      if (query.includes(keyword)) {
        this.logger.warn('Modification keyword detected in fallback generation', { 
          query: naturalQuery, 
          keyword 
        });
        return null; // Reject modification attempts
      }
    }

    // Simple pattern matching for read-only queries
    if (query.includes('all') || query.includes('list') || query.includes('show')) {
      const tableName = this.extractTableName(query, tables);
      if (tableName) {
        return `SELECT * FROM ${tableName} LIMIT ${configManager.getMaxResults()}`;
      }
    }

    if (query.includes('count')) {
      const tableName = this.extractTableName(query, tables);
      if (tableName) {
        return `SELECT COUNT(*) as count FROM ${tableName}`;
      }
    }

    if (query.includes('find') || query.includes('search')) {
      const tableName = this.extractTableName(query, tables);
      if (tableName) {
        const table = tables.find(t => t.name.toLowerCase() === tableName);
        if (table) {
          const columns = table.columns.map(c => c.name).join(', ');
          return `SELECT ${columns} FROM ${tableName} LIMIT ${configManager.getMaxResults()}`;
        }
      }
    }

    // Default fallback - always read-only
    const firstTable = tables[0];
    if (firstTable) {
      return `SELECT * FROM ${firstTable.name} LIMIT ${configManager.getMaxResults()}`;
    }

    return null;
  }

  private extractTableName(query: string, tables: SchemaInfo['tables']): string | null {
    for (const table of tables) {
      if (query.includes(table.name.toLowerCase())) {
        return table.name;
      }
    }
    return null;
  }

  private createSchemaDescription(schema: SchemaInfo): string {
    return schema.tables.map(table => {
      const columns = table.columns.map(col => 
        `  - ${col.name} (${col.type}${col.nullable ? ', nullable' : ''}${col.isPrimaryKey ? ', primary key' : ''})`
      ).join('\n');
      
      return `Table: ${table.name}\n${columns}`;
    }).join('\n\n');
  }

  private async validateQuery(sql: string, schema: SchemaInfo): Promise<QueryValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // STRICT READ-ONLY VALIDATION
    const sqlUpper = sql.toUpperCase().trim();
    
    // 1. Enforce SELECT-only operations
    if (!sqlUpper.startsWith('SELECT')) {
      errors.push('Only SELECT statements are allowed. Read-only operations only.');
      return {
        isValid: false,
        errors,
        warnings,
        suggestedSql: undefined
      };
    }

    // 2. Comprehensive dangerous operations check
    const dangerousKeywords = [
      'DELETE', 'DROP', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE',
      'GRANT', 'REVOKE', 'EXECUTE', 'EXEC', 'CALL', 'PROCEDURE', 'FUNCTION',
      'TRIGGER', 'INDEX', 'VIEW', 'SCHEMA', 'DATABASE', 'INSTANCE',
      'BACKUP', 'RESTORE', 'IMPORT', 'EXPORT', 'LOAD', 'UNLOAD',
      'MERGE', 'UPSERT', 'REPLACE', 'MODIFY', 'CHANGE', 'SET'
    ];
    
    for (const keyword of dangerousKeywords) {
      if (sqlUpper.includes(keyword)) {
        errors.push(`Dangerous operation detected: ${keyword} - Read-only mode only`);
      }
    }

    // 3. Check for transaction control statements
    const transactionKeywords = ['BEGIN', 'COMMIT', 'ROLLBACK', 'START TRANSACTION', 'SAVEPOINT'];
    for (const keyword of transactionKeywords) {
      if (sqlUpper.includes(keyword)) {
        errors.push(`Transaction control not allowed: ${keyword} - Read-only mode only`);
      }
    }

    // 4. Check for system table access (additional security)
    const systemTables = ['information_schema', 'pg_', 'mysql.', 'sys.', 'performance_schema'];
    const sqlLower = sql.toLowerCase();
    for (const systemTable of systemTables) {
      if (sqlLower.includes(systemTable)) {
        errors.push(`System table access not allowed: ${systemTable}`);
      }
    }

    // 5. Validate table names against actual schema
    const tableNames = schema.tables.map(t => t.name.toLowerCase());
    const tableMatches = sqlLower.match(/from\s+(\w+)|join\s+(\w+)/g);
    if (tableMatches) {
      for (const match of tableMatches) {
        const tableName = match.replace(/from\s+|join\s+/, '').trim();
        if (!tableNames.includes(tableName)) {
          errors.push(`Unknown table: ${tableName}`);
        }
      }
    }

    // 6. Enforce LIMIT clause for large result sets
    if (!sqlLower.includes('limit') && sqlLower.includes('select')) {
      warnings.push('No LIMIT clause found - query may return many rows');
      // Auto-add LIMIT if not present
      const suggestedSql = `${sql} LIMIT ${configManager.getMaxResults()}`;
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestedSql: errors.length === 0 ? suggestedSql : undefined
      };
    }

    // 7. Check for potential SQL injection patterns
    const injectionPatterns = [
      /;\s*$/i,  // Trailing semicolon
      /--\s*$/i, // SQL comments
      /\/\*.*\*\//i, // Block comments
      /union\s+select/i, // UNION attacks
      /exec\s*\(/i, // EXEC calls
    ];
    
    for (const pattern of injectionPatterns) {
      if (pattern.test(sql)) {
        errors.push('Potential SQL injection pattern detected');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestedSql: errors.length === 0 ? sql : undefined
    };
  }

  async explainQuery(naturalQuery: string): Promise<string> {
    try {
      const schema = await this.getSchema();
      const sql = await this.generateSQL(naturalQuery, schema);
      
      if (!sql) {
        return 'Could not generate SQL for this query.';
      }

      const validation = await this.validateQuery(sql, schema);
      
      let explanation = `Generated SQL: ${sql}\n\n`;
      
      if (validation.errors.length > 0) {
        explanation += `Errors: ${validation.errors.join(', ')}\n`;
      }
      
      if (validation.warnings.length > 0) {
        explanation += `Warnings: ${validation.warnings.join(', ')}\n`;
      }

      return explanation;
    } catch (error) {
      return `Error explaining query: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
} 