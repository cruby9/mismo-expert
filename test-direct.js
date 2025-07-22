#!/usr/bin/env node
import { spawn } from 'child_process';

// Test direct communication with the MCP server
const dockerProcess = spawn('docker', ['exec', '-i', 'mismo-expert-mcp', 'node', 'src/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

dockerProcess.stderr.on('data', (data) => {
  console.error('Server:', data.toString());
});

dockerProcess.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  },
  id: 1
};

console.log('Sending initialize request...');
dockerProcess.stdin.write(JSON.stringify(initRequest) + '\n');

// Send tools/list request after a delay
setTimeout(() => {
  const toolsRequest = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2
  };
  
  console.log('Sending tools/list request...');
  dockerProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
  
  // Close after another delay
  setTimeout(() => {
    dockerProcess.stdin.end();
  }, 1000);
}, 1000);