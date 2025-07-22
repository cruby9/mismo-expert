#!/usr/bin/env node
import { spawn } from 'child_process';
import readline from 'readline';

// Spawn the MCP server
const server = spawn('node', ['./src/server.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Create readline interface for server output
const rl = readline.createInterface({
  input: server.stdout,
  output: process.stdout,
  terminal: false
});

// Handle server responses
rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    if (response.result && response.result.content) {
      console.log('\nNeighborhood-related fields in MISMO V3.6:');
      console.log('=' * 50);
      const data = JSON.parse(response.result.content[0].text);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    // Ignore non-JSON lines
  }
});

// Initialize the server
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'query-client',
      version: '1.0.0'
    }
  }
};

server.stdin.write(JSON.stringify(initRequest) + '\n');

// Wait a bit for initialization
setTimeout(() => {
  // Query for neighborhood fields
  const queryRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'query',
      arguments: {
        type: 'fields_for_feature',
        params: {
          feature: 'neighborhood'
        }
      }
    }
  };
  
  server.stdin.write(JSON.stringify(queryRequest) + '\n');
  
  // Give it time to process then exit
  setTimeout(() => {
    server.kill();
    process.exit(0);
  }, 2000);
}, 1000);