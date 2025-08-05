import { QueryProcessor } from '../query-processor.js';
import { SpannerClient } from '../spanner-client.js';

// Mock SpannerClient
jest.mock('../spanner-client.js');

describe('QueryProcessor', () => {
  let queryProcessor: QueryProcessor;
  let mockSpannerClient: jest.Mocked<SpannerClient>;

  beforeEach(() => {
    mockSpannerClient = {
      getSchema: jest.fn(),
      executeQuery: jest.fn(),
      testConnection: jest.fn(),
      getTableInfo: jest.fn(),
      listTables: jest.fn(),
      close: jest.fn(),
    } as any;

    queryProcessor = new QueryProcessor(mockSpannerClient);
  });

  describe('processNaturalLanguageQuery', () => {
    it('should reject modification queries', async () => {
      const result = await queryProcessor.processNaturalLanguageQuery({
        query: 'delete all users',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('modification');
    });

    it('should reject update queries', async () => {
      const result = await queryProcessor.processNaturalLanguageQuery({
        query: 'update user status',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('modification');
    });

    it('should accept read-only queries', async () => {
      mockSpannerClient.getSchema.mockResolvedValue({
        tables: [],
        lastUpdated: new Date(),
      });

      mockSpannerClient.executeQuery.mockResolvedValue({
        success: true,
        data: [],
        rowCount: 0,
        executionTime: 100,
        sql: 'SELECT * FROM users LIMIT 10',
      });

      const result = await queryProcessor.processNaturalLanguageQuery({
        query: 'show me all users',
        limit: 10,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('explainQuery', () => {
    it('should provide explanation for valid queries', async () => {
      mockSpannerClient.getSchema.mockResolvedValue({
        tables: [],
        lastUpdated: new Date(),
      });

      const explanation = await queryProcessor.explainQuery('show me all users');

      expect(explanation).toContain('Generated SQL');
    });
  });
}); 