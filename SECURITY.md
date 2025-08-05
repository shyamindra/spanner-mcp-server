# Security Documentation

## 🔒 READ-ONLY ENFORCEMENT

This MCP server is designed with **STRICT READ-ONLY** security to prevent any accidental data modification. Multiple layers of protection ensure that only SELECT operations are allowed.

## 🛡️ Security Layers

### Layer 1: Natural Language Validation
- **Location**: `QueryTool.execute()`
- **Purpose**: Pre-validate natural language queries for modification keywords
- **Protection**: Blocks queries containing words like "insert", "update", "delete", "modify", etc.

### Layer 2: LLM Prompt Security
- **Location**: `QueryProcessor.generateSQL()`
- **Purpose**: Instructs LLM to only generate SELECT statements
- **Protection**: Explicit instructions forbid any modification operations

### Layer 3: SQL Validation
- **Location**: `QueryProcessor.validateQuery()`
- **Purpose**: Comprehensive SQL analysis and validation
- **Protection**: 
  - Enforces SELECT-only operations
  - Blocks dangerous keywords
  - Prevents transaction control
  - Blocks system table access
  - Detects SQL injection patterns

### Layer 4: Database-Level Protection
- **Location**: `SpannerClient.executeQuery()`
- **Purpose**: Final validation and read-only transaction enforcement
- **Protection**:
  - Read-only transactions
  - Final SQL keyword validation
  - Comprehensive logging of all operations

## 🚫 Blocked Operations

### SQL Keywords Blocked
```sql
-- Data Modification
DELETE, INSERT, UPDATE, MERGE, UPSERT, REPLACE

-- Schema Modification
CREATE, ALTER, DROP, TRUNCATE, RENAME

-- Permission Management
GRANT, REVOKE, DENY

-- Transaction Control
BEGIN, COMMIT, ROLLBACK, SAVEPOINT

-- System Operations
EXECUTE, EXEC, CALL, PROCEDURE, FUNCTION, TRIGGER

-- Database Management
BACKUP, RESTORE, IMPORT, EXPORT, LOAD, UNLOAD

-- Other Dangerous Operations
SET, MODIFY, CHANGE, INDEX, VIEW, SCHEMA
```

### Natural Language Keywords Blocked
```
insert, update, delete, drop, create, alter, modify
change, remove, add, set, clear, truncate, replace
edit, modify, change, remove, delete, erase, clear
```

### System Access Blocked
- `information_schema` tables
- `pg_` prefixed tables (PostgreSQL system tables)
- `mysql.` prefixed tables
- `sys.` prefixed tables
- `performance_schema` tables

## 🔍 Validation Process

### 1. Natural Language Input Validation
```typescript
// Check for modification keywords in natural language
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

### 2. SQL Generation Security
```typescript
// LLM prompt includes explicit security rules
const prompt = `
CRITICAL SECURITY RULES:
1. ONLY generate SELECT statements - NO INSERT, UPDATE, DELETE, etc.
2. This is a READ-ONLY system - any modification operations are strictly forbidden
3. If the user asks for any data modification, return an error message instead
`;
```

### 3. SQL Validation
```typescript
// Enforce SELECT-only operations
if (!sqlUpper.startsWith('SELECT')) {
  errors.push('Only SELECT statements are allowed. Read-only operations only.');
}

// Check for dangerous keywords
const dangerousKeywords = [
  'DELETE', 'DROP', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE',
  // ... comprehensive list
];

for (const keyword of dangerousKeywords) {
  if (sqlUpper.includes(keyword)) {
    errors.push(`Dangerous operation detected: ${keyword} - Read-only mode only`);
  }
}
```

### 4. Database-Level Protection
```typescript
// Use read-only transactions
const transaction = this.database.runTransaction({
  readOnly: true,
  timeout: configManager.getMaxQueryTime(),
});

// Final validation before execution
if (!sqlUpper.startsWith('SELECT')) {
  return { success: false, error: 'Only SELECT statements are allowed' };
}
```

## 📊 Security Logging

### Audit Trail
All query attempts are logged with:
- Timestamp
- User/request identifier
- Natural language query
- Generated SQL
- Execution result
- Security violations (if any)

### Security Events
Modification attempts are flagged and logged:
```typescript
this.logger.warn('Modification keyword detected', { 
  query: naturalQuery, 
  keyword: detectedKeyword 
});
```

### Error Tracking
Failed queries and security violations are tracked:
- Query validation failures
- SQL generation errors
- Database execution errors
- Security rule violations

## 🚨 Security Alerts

The system generates alerts for:
- Modification keyword detection
- Non-SELECT SQL generation
- System table access attempts
- SQL injection pattern detection
- Transaction control attempts

## 🔧 Configuration Security

### Environment Variables
- `MAX_QUERY_TIME`: Prevents long-running queries
- `MAX_RESULTS`: Limits result set size
- `ENABLE_LOGGING`: Ensures audit trail

### Service Account Permissions
Recommended minimal permissions:
```json
{
  "spanner.databases.read": "Read access to database",
  "spanner.sessions.read": "Read access to sessions",
  "spanner.instances.read": "Read access to instance metadata"
}
```

## 🧪 Security Testing

### Test Cases
1. **Natural Language Modification Attempts**
   - "Insert a new user"
   - "Update user status"
   - "Delete old records"

2. **SQL Injection Attempts**
   - "'; DROP TABLE users; --"
   - "UNION SELECT * FROM system_tables"

3. **System Access Attempts**
   - "Show me information_schema tables"
   - "List all system tables"

4. **Transaction Control**
   - "BEGIN TRANSACTION"
   - "COMMIT changes"

### Expected Results
All modification attempts should:
- Be blocked at the appropriate layer
- Generate security warnings in logs
- Return clear error messages
- Not reach the database

## 🔄 Security Updates

### Regular Updates
- Monitor for new SQL injection patterns
- Update blocked keyword lists
- Review and update security rules
- Monitor security logs for new attack vectors

### Incident Response
1. **Detection**: Security events trigger immediate logging
2. **Analysis**: Review logs for patterns and severity
3. **Response**: Update security rules if needed
4. **Documentation**: Record incidents and responses

## 📞 Security Contact

For security issues or questions:
- Review security logs
- Check configuration settings
- Verify service account permissions
- Contact system administrator

---

**⚠️ IMPORTANT**: This system is designed for READ-ONLY operations only. Any attempt to modify data will be blocked and logged. If you need data modification capabilities, this is not the appropriate tool. 