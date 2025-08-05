# Technical Specifications

## 🔧 Core Components

### 1. MCP Server (`src/server.ts`)
**Purpose**: Main server that handles MCP protocol communication

**Key Features**:
- MCP protocol implementation
- Tool registration and management
- Error handling and graceful shutdown
- Logging and monitoring setup

**Dependencies**:
- `@modelcontextprotocol/sdk`
- Winston logging
- Configuration manager

### 2. Spanner Client (`src/spanner-client.ts`)
**Purpose**: Manages Google Cloud Spanner connections and operations

**Key Features**:
- Spanner connection management
- Read-only query execution
- Schema extraction and caching
- Connection pooling and optimization

**Dependencies**:
- `@google-cloud/spanner`
- Configuration manager
- Winston logging

### 3. Query Processor (`src/query-processor.ts`)
**Purpose**: Converts natural language to SQL with security validation

**Key Features**:
- LLM-based SQL generation
- Fallback rule-based generation
- Multi-layer security validation
- Schema-aware query generation

**Dependencies**:
- OpenAI API
- Spanner client
- Configuration manager
- Winston logging

### 4. Configuration Manager (`src/config/spanner-config.ts`)
**Purpose**: Centralized configuration management

**Key Features**:
- Environment variable validation
- Configuration schema validation
- Default value management
- Security settings

**Dependencies**:
- `zod` for validation
- `dotenv` for environment variables

### 5. Tools (`src/tools/`)
**Purpose**: MCP tool implementations

**Components**:
- `query-tool.ts` - Main query execution tool
- `schema-tool.ts` - Schema inspection tools

## 🔒 Security Implementation

### Layer 1: Natural Language Validation
```typescript
// Location: QueryTool.execute()
const modificationKeywords = [
  'insert', 'update', 'delete', 'drop', 'create', 'alter', 'modify',
  'change', 'remove', 'add', 'set', 'clear', 'truncate', 'replace'
];

for (const keyword of modificationKeywords) {
  if (query.includes(keyword)) {
    return { success: false, error: 'Modification operation detected' };
  }
}
```

### Layer 2: LLM Prompt Security
```typescript
// Location: QueryProcessor.generateSQL()
const prompt = `
CRITICAL SECURITY RULES:
1. ONLY generate SELECT statements - NO INSERT, UPDATE, DELETE, etc.
2. This is a READ-ONLY system - any modification operations are strictly forbidden
3. If the user asks for any data modification, return an error message instead
`;
```

### Layer 3: SQL Validation
```typescript
// Location: QueryProcessor.validateQuery()
const dangerousKeywords = [
  'DELETE', 'DROP', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE',
  'GRANT', 'REVOKE', 'EXECUTE', 'EXEC', 'CALL', 'PROCEDURE', 'FUNCTION'
];

if (!sqlUpper.startsWith('SELECT')) {
  errors.push('Only SELECT statements are allowed');
}
```

### Layer 4: Database-Level Protection
```typescript
// Location: SpannerClient.executeQuery()
const transaction = this.database.runTransaction({
  readOnly: true,
  timeout: configManager.getMaxQueryTime(),
});
```

## 📊 Data Models

### QueryResult Interface
```typescript
interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  executionTime?: number;
  rowCount?: number;
  sql?: string;
}
```

### SchemaInfo Interface
```typescript
interface SchemaInfo {
  tables: TableInfo[];
  lastUpdated: Date;
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKey?: string[];
  indexes?: IndexInfo[];
}
```

### NaturalLanguageQuery Interface
```typescript
interface NaturalLanguageQuery {
  query: string;
  context?: string;
  limit?: number;
  explain?: boolean;
}
```

## 🔄 Workflow Diagrams

### Query Processing Flow
```
1. Natural Language Input
   ↓
2. Tool Level Validation
   ↓
3. LLM SQL Generation
   ↓
4. SQL Validation
   ↓
5. Database Execution
   ↓
6. Result Processing
   ↓
7. Response Return
```

### Security Validation Flow
```
1. Input Received
   ↓
2. Natural Language Check
   ↓
3. LLM Generation (with security prompts)
   ↓
4. SQL Keyword Validation
   ↓
5. Schema Validation
   ↓
6. Database Read-Only Transaction
   ↓
7. Result Return
```

## 🛠️ Configuration Schema

### Environment Variables Schema
```typescript
const ConfigSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  instanceId: z.string().min(1, 'Instance ID is required'),
  databaseId: z.string().min(1, 'Database ID is required'),
  credentials: z.string().optional(),
  openaiApiKey: z.string().optional(),
  maxQueryTime: z.number().default(30000),
  maxResults: z.number().default(1000),
  enableLogging: z.boolean().default(true),
  cacheSchemaFor: z.number().default(3600000),
});
```

## 📈 Performance Specifications

### Query Performance Targets
- **Simple Queries**: < 1 second
- **Complex Queries**: < 5 seconds
- **Schema Operations**: < 2 seconds
- **LLM Generation**: < 3 seconds

### Resource Requirements
- **Memory**: 512MB minimum, 1GB recommended
- **CPU**: 1 vCPU minimum, 2 vCPU recommended
- **Storage**: 1GB minimum for logs and cache
- **Network**: Low latency to Google Cloud

### Caching Strategy
- **Schema Cache**: 1 hour TTL
- **Query Cache**: Not implemented (security reasons)
- **Connection Pool**: Managed by Spanner client

## 🔍 Error Handling

### Error Categories
1. **Configuration Errors**: Missing environment variables
2. **Connection Errors**: Spanner connection failures
3. **Security Errors**: Modification attempts
4. **Validation Errors**: Invalid SQL generation
5. **Execution Errors**: Query execution failures

### Error Response Format
```typescript
{
  success: false,
  error: "Descriptive error message",
  type: "error_category",
  details?: any
}
```

## 📊 Logging Strategy

### Log Levels
- **ERROR**: System failures, security violations
- **WARN**: Performance issues, validation failures
- **INFO**: Normal operations, query execution
- **DEBUG**: Detailed debugging information

### Log Format
```typescript
{
  timestamp: "2024-01-01T00:00:00.000Z",
  level: "info",
  message: "Query executed successfully",
  metadata: {
    query: "SELECT * FROM users",
    executionTime: 150,
    rowCount: 100
  }
}
```

## 🧪 Testing Specifications

### Unit Tests
- Configuration validation
- SQL generation logic
- Security validation
- Error handling

### Integration Tests
- MCP protocol communication
- Spanner connection and queries
- LLM integration
- Tool execution

### Security Tests
- Modification attempt blocking
- SQL injection prevention
- System access blocking
- Transaction control prevention

### Performance Tests
- Query response times
- Memory usage
- CPU utilization
- Concurrent request handling

## 🚀 Deployment Specifications

### Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Kubernetes Configuration
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spanner-mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spanner-mcp-server
  template:
    spec:
      containers:
      - name: spanner-mcp-server
        image: spanner-mcp-server:latest
        env:
        - name: GOOGLE_CLOUD_PROJECT_ID
          value: "your-project-id"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### Health Check Configuration
```typescript
const healthCheck = {
  interval: 30,
  timeout: 10,
  retries: 3,
  startPeriod: 40
};
```

## 🔧 Development Tools

### Required Tools
- Node.js 18+
- TypeScript 5.0+
- Docker (for containerization)
- Git (for version control)

### Development Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx src/server.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

### Code Quality Tools
- ESLint for code linting
- Prettier for code formatting
- Jest for testing
- TypeScript for type safety 