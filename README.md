# Spanner MCP Server

A Model Context Protocol (MCP) server that enables **READ-ONLY** natural language querying of Google Cloud Spanner databases. This server allows AI assistants to interact with Spanner databases using natural language, automatically converting queries to SQL and executing them safely with **STRICT READ-ONLY** protection.

## 🚀 Features

- **Natural Language to SQL**: Convert natural language queries to Spanner-compatible SQL
- **Schema Inspection**: Explore database structure and relationships
- **Query Validation**: Ensure queries are safe and valid before execution
- **LLM Integration**: Uses OpenAI GPT models for enhanced SQL generation
- **Fallback Support**: Rule-based SQL generation when LLM is unavailable
- **Comprehensive Logging**: Detailed logging for debugging and monitoring
- **🔒 STRICT READ-ONLY SECURITY**: Multi-layer protection against data modification
- **Caching**: Schema caching for improved performance

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │◄──►│  Spanner MCP     │◄──►│  Google Cloud   │
│   (AI Assistant)│    │     Server       │    │    Spanner      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   OpenAI API     │
                       │  (SQL Generation)│
                       └──────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ 
- Google Cloud Project with Spanner instance
- Service account with Spanner access
- OpenAI API key (optional, for enhanced SQL generation)

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd spanner-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLOUD_PROJECT_ID` | Your Google Cloud Project ID | Yes |
| `SPANNER_INSTANCE_ID` | Your Spanner instance ID | Yes |
| `SPANNER_DATABASE_ID` | Your Spanner database ID | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key file | No* |
| `OPENAI_API_KEY` | OpenAI API key for enhanced SQL generation | No |
| `MAX_QUERY_TIME` | Maximum query execution time (ms) | No |
| `MAX_RESULTS` | Maximum rows returned per query | No |
| `ENABLE_LOGGING` | Enable detailed logging | No |
| `CACHE_SCHEMA_FOR` | Schema cache duration (ms) | No |

*If not set, uses Application Default Credentials (ADC)

### Authentication

The server supports two authentication methods:

1. **Service Account Key File:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

2. **Application Default Credentials (ADC):**
   ```bash
   gcloud auth application-default login
   ```

## 🚀 Usage

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Available Tools

The server provides the following MCP tools:

#### 1. `query_database`
Execute natural language queries against the database.

**Parameters:**
- `query` (string): Natural language query
- `limit` (number, optional): Maximum rows to return
- `explain` (boolean, optional): Explain query without executing

**Examples:**
```json
{
  "query": "show me all users",
  "limit": 100
}
```

```json
{
  "query": "count orders by status",
  "explain": true
}
```

#### 2. `get_schema`
Get complete database schema information.

**Parameters:** None

#### 3. `list_tables`
List all available tables.

**Parameters:** None

#### 4. `get_table_info`
Get detailed information about a specific table.

**Parameters:**
- `tableName` (string): Name of the table

## 🔧 Development

### Project Structure

```
spanner-mcp-server/
├── src/
│   ├── server.ts              # Main MCP server
│   ├── spanner-client.ts      # Spanner connection and operations
│   ├── query-processor.ts     # Natural language to SQL conversion
│   ├── config/
│   │   └── spanner-config.ts  # Configuration management
│   ├── tools/
│   │   ├── query-tool.ts      # Main query execution tool
│   │   └── schema-tool.ts     # Schema inspection tools
│   └── types/
│       └── index.ts           # TypeScript type definitions
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## 🔒 Security

### READ-ONLY ENFORCEMENT

The server implements **STRICT READ-ONLY** security with multiple layers of protection:

#### 1. **Multi-Layer Validation**
- **Tool Level**: Checks natural language queries for modification keywords
- **SQL Generation Level**: LLM prompts explicitly forbid modification operations
- **Query Validation Level**: Comprehensive SQL analysis and validation
- **Database Level**: Read-only transactions and final SQL checks

#### 2. **Comprehensive Blocking**
- **Dangerous Operations**: Blocks DELETE, DROP, INSERT, UPDATE, ALTER, CREATE, TRUNCATE, etc.
- **Transaction Control**: Blocks BEGIN, COMMIT, ROLLBACK, SAVEPOINT
- **System Access**: Blocks access to system tables and schemas
- **SQL Injection**: Detects and blocks injection patterns
- **Modification Keywords**: Blocks natural language requests for data changes

#### 3. **Enforced Limitations**
- **SELECT-Only**: Only SELECT statements are allowed
- **Read-Only Transactions**: All queries use read-only transactions
- **Result Limits**: Automatic LIMIT clauses for large result sets
- **Timeout Protection**: Prevents long-running queries
- **Schema Validation**: Validates against actual database schema

#### 4. **Security Logging**
- **Audit Trail**: All query attempts are logged
- **Security Events**: Modification attempts are flagged and logged
- **Error Tracking**: Failed queries and security violations are tracked

### Best Practices

1. **Service Account Permissions**: Use minimal required permissions
2. **Network Security**: Restrict access to trusted networks
3. **Audit Logging**: Monitor query execution logs
4. **Regular Updates**: Keep dependencies updated

## 📊 Monitoring

### Logs

The server generates detailed logs in the following files:
- `mcp-server.log`: Main server logs
- `spanner-client.log`: Database operation logs
- `query-processor.log`: Query processing logs
- `query-tool.log`: Tool execution logs
- `schema-tool.log`: Schema operation logs

### Metrics

The server tracks:
- Query execution time
- Success/failure rates
- Schema cache hits/misses
- Error types and frequencies

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY .env ./

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Google Cloud Run

```bash
# Build and deploy
gcloud run deploy spanner-mcp-server \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Kubernetes

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
    metadata:
      labels:
        app: spanner-mcp-server
    spec:
      containers:
      - name: spanner-mcp-server
        image: your-registry/spanner-mcp-server:latest
        env:
        - name: GOOGLE_CLOUD_PROJECT_ID
          value: "your-project-id"
        - name: SPANNER_INSTANCE_ID
          value: "your-instance-id"
        - name: SPANNER_DATABASE_ID
          value: "your-database-id"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify Google Cloud credentials
   - Check Spanner instance and database IDs
   - Ensure service account has proper permissions

2. **SQL Generation Fails**
   - Check OpenAI API key if using LLM features
   - Verify schema is accessible
   - Check query complexity

3. **Performance Issues**
   - Adjust `MAX_QUERY_TIME` and `MAX_RESULTS`
   - Monitor schema cache settings
   - Check Spanner instance configuration

### Getting Help

- Check the logs for detailed error messages
- Verify configuration in `.env` file
- Test Spanner connection separately
- Review Google Cloud Console for Spanner metrics

## 🔮 Future Enhancements

- [ ] Support for parameterized queries
- [ ] Query result caching
- [ ] Advanced analytics queries
- [ ] Multi-database support
- [ ] Query optimization suggestions
- [ ] Real-time data streaming
- [ ] Custom SQL templates
- [ ] Query history and favorites 