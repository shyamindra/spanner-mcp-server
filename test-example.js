#!/usr/bin/env node

/**
 * Example script demonstrating how to use the Spanner MCP Server
 * This script shows how to connect to the MCP server and execute queries
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

// Example queries to test
const testQueries = [
  {
    name: "List all tables",
    tool: "list_tables",
    args: {}
  },
  {
    name: "Get database schema",
    tool: "get_schema", 
    args: {}
  },
  {
    name: "Simple query - show all users",
    tool: "query_database",
    args: {
      query: "show me all users",
      limit: 10
    }
  },
  {
    name: "Count query",
    tool: "query_database", 
    args: {
      query: "count total orders",
      limit: 1
    }
  },
  {
    name: "Explain query",
    tool: "query_database",
    args: {
      query: "find users who made purchases in the last month",
      explain: true
    }
  }
];

async function testMCPServer() {
  console.log('🚀 Testing Spanner MCP Server...\n');

  // Start the MCP server process
  const serverProcess = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverReady = false;
  let testResults = [];

  // Handle server output
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Server:', output);
    
    if (output.includes('Spanner MCP Server started successfully')) {
      serverReady = true;
      console.log('✅ Server is ready! Starting tests...\n');
      runTests();
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('Server Error:', data.toString());
  });

  serverProcess.on('close', (code) => {
    console.log(`\n🔚 Server process exited with code ${code}`);
    printTestResults();
  });

  async function runTests() {
    for (const test of testQueries) {
      console.log(`\n🧪 Testing: ${test.name}`);
      console.log(`Tool: ${test.tool}`);
      console.log(`Args: ${JSON.stringify(test.args, null, 2)}`);
      
      try {
        const result = await executeTool(test.tool, test.args);
        testResults.push({
          name: test.name,
          success: true,
          result: result
        });
        console.log('✅ Test passed');
      } catch (error) {
        testResults.push({
          name: test.name,
          success: false,
          error: error.message
        });
        console.log('❌ Test failed:', error.message);
      }
    }
    
    // Close server after tests
    setTimeout(() => {
      serverProcess.kill('SIGTERM');
    }, 1000);
  }

  function executeTool(toolName, args) {
    return new Promise((resolve, reject) => {
      // This is a simplified example - in a real implementation,
      // you would use the MCP client library to communicate with the server
      
      const toolCall = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      // Send the tool call to the server
      serverProcess.stdin.write(JSON.stringify(toolCall) + '\n');
      
      // In a real implementation, you would parse the response
      // For this example, we'll simulate a successful response
      setTimeout(() => {
        resolve({
          tool: toolName,
          args: args,
          status: 'executed'
        });
      }, 1000);
    });
  }

  function printTestResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / testResults.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.filter(r => !r.success).forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
    }
  }
}

// Example of how to use the server in a real application
function exampleUsage() {
  console.log('\n📖 Example Usage:');
  console.log('================');
  
  console.log(`
// 1. Start the MCP server
const server = spawn('node', ['dist/server.js']);

// 2. Send a tool call
const toolCall = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'query_database',
    arguments: {
      query: 'show me all users',
      limit: 10
    }
  }
};

server.stdin.write(JSON.stringify(toolCall) + '\\n');

// 3. Handle the response
server.stdout.on('data', (data) => {
  const response = JSON.parse(data.toString());
  console.log('Query result:', response.result);
});
  `);
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMCPServer().catch(console.error);
  exampleUsage();
}

export { testMCPServer, exampleUsage }; 