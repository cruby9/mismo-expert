#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'mismo-expert',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Create and connect transport
const transport = new StdioServerTransport();

server.connect(transport).then(() => {
  console.error('MISMO Expert MCP Server started');
}).catch(error => {
  console.error('Failed to start:', error);
  process.exit(1);
});