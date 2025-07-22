#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

console.error('Creating MCP server...');

try {
  const server = new Server({
    name: 'test-server',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  console.error('Server created successfully');
  
  // Try the simplest handler
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Server connected!');
  
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}