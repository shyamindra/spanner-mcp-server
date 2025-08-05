import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { configManager } from './config/spanner-config.js';
import { SpannerClient } from './spanner-client.js';
import { QueryProcessor } from './query-processor.js';
import { QueryTool } from './tools/query-tool.js';
import { SchemaTool } from './tools/schema-tool.js';
import winston from 'winston';

class SpannerMCPServer {
  private server: Server;
  private spannerClient: SpannerClient;
  private queryProcessor: QueryProcessor;
  private queryTool: QueryTool;
  private schemaTool: SchemaTool;
  private logger: winston.Logger;

  constructor() {
    // Initialize configuration
    configManager.validate();

    // Initialize logging
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ filename: 'mcp-server.log' })
      ]
    });

    // Initialize Spanner client
    this.spannerClient = new SpannerClient();
    
    // Initialize query processor
    this.queryProcessor = new QueryProcessor(this.spannerClient);
    
    // Initialize tools
    this.queryTool = new QueryTool(this.queryProcessor);
    this.schemaTool = new SchemaTool(this.spannerClient);

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'spanner-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Add security warning to server description
    this.logger.warn('🚨 READ-ONLY MODE ENABLED - All data modification operations are blocked');
    this.logger.warn('🔒 Security features: SELECT-only queries, transaction control disabled, system table access blocked');

    this.setupTools();
    this.setupErrorHandling();
  }

  private setupTools() {
    // Register query tool
    const queryToolDef = this.queryTool.getToolDefinition();
    this.server.setRequestHandler('tools/call', async (request) => {
      if (request.params.name === 'query_database') {
        const result = await this.queryTool.execute(request.params.arguments);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      // Handle schema tools
      if (request.params.name === 'get_schema') {
        const result = await this.schemaTool.getSchema();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      if (request.params.name === 'list_tables') {
        const result = await this.schemaTool.listTables();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
      
      if (request.params.name === 'get_table_info') {
        const result = await this.schemaTool.getTableInfo(request.params.arguments);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });

    // Register tool definitions
    this.server.setRequestHandler('tools/list', async () => {
      const schemaToolDefs = this.schemaTool.getToolDefinitions();
      
      return {
        tools: [
          queryToolDef,
          ...schemaToolDefs
        ]
      };
    });

    // Add health check handler
    this.server.setRequestHandler('health/check', async () => {
      const isConnected = await this.spannerClient.testConnection();
      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        spanner: {
          connected: isConnected
        }
      };
    });
  }

  private setupErrorHandling() {
    process.on('SIGINT', async () => {
      this.logger.info('Received SIGINT, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      this.logger.info('Received SIGTERM, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', { error });
      this.shutdown().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection', { reason, promise });
    });
  }

  async start() {
    try {
      this.logger.info('Starting Spanner MCP Server...');

      // Test Spanner connection
      const isConnected = await this.spannerClient.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Spanner database');
      }

      this.logger.info('Successfully connected to Spanner database');

      // Start MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      this.logger.info('Spanner MCP Server started successfully');
      this.logger.info('Available tools: query_database, get_schema, list_tables, get_table_info');

    } catch (error) {
      this.logger.error('Failed to start server', { error });
      throw error;
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down Spanner MCP Server...');
      
      // Close Spanner connection
      await this.spannerClient.close();
      
      this.logger.info('Spanner MCP Server shut down successfully');
    } catch (error) {
      this.logger.error('Error during shutdown', { error });
    }
  }
}

// Start the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SpannerMCPServer();
  
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { SpannerMCPServer }; 