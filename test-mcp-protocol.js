#!/usr/bin/env node
import { spawn } from 'child_process';

const mcpProcess = spawn('/home/ccr/form_program/mismo-expert-mcp/mcp-wrapper.sh', [], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';

mcpProcess.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.error('Failed to parse:', line);
      }
    }
  }
});

mcpProcess.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

mcpProcess.on('close', (code) => {
  console.log('Process exited with code:', code);
});

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {}
  },
  id: 1
};

console.log('Sending:', JSON.stringify(initRequest));
mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');

// Send tools/list request after a delay
setTimeout(() => {
  const toolsRequest = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2
  };
  
  console.log('Sending:', JSON.stringify(toolsRequest));
  mcpProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
  
  // Close stdin after sending requests
  setTimeout(() => {
    mcpProcess.stdin.end();
  }, 1000);
}, 500);