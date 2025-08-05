export interface SpannerConfig {
  projectId: string;
  instanceId: string;
  databaseId: string;
  credentials?: string; // Path to service account key file
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  executionTime?: number;
  rowCount?: number;
  sql?: string; // Generated SQL for transparency
}

export interface SchemaInfo {
  tables: TableInfo[];
  lastUpdated: Date;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKey?: string[];
  indexes?: IndexInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface NaturalLanguageQuery {
  query: string;
  context?: string;
  limit?: number;
  explain?: boolean;
}

export interface SQLGenerationContext {
  schema: SchemaInfo;
  query: string;
  tables?: string[];
  columns?: string[];
}

export interface QueryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedSql?: string;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface QueryMetrics {
  queryTime: number;
  rowsReturned: number;
  bytesProcessed?: number;
  timestamp: Date;
} 