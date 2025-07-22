#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testMISMOExpert() {
  console.log('Starting MISMO Expert MCP test client...\n');
  
  const transport = new StdioClientTransport({
    command: 'docker',
    args: ['exec', '-i', 'mismo-expert-mcp-new', 'node', 'src/server.js'],
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to MISMO Expert MCP server\n');

    // List available tools
    const tools = await client.listTools();
    console.log('Available tools:');
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // Test 1: Get fields for kitchen feature
    console.log('Test 1: Getting fields for kitchen feature...');
    const kitchenResult = await client.callTool({
      name: 'query',
      arguments: {
        type: 'fields_for_feature',
        params: { feature: 'kitchen' }
      }
    });
    console.log('Result:', JSON.parse(kitchenResult.content[0].text));
    console.log('');

    // Test 2: Map narrative to fields
    console.log('Test 2: Mapping narrative text to MISMO fields...');
    const narrative = "The subject is a 3 bedroom, 2 bath ranch style home built in 1978 with 1,850 square feet.";
    const mappingResult = await client.callTool({
      name: 'query',
      arguments: {
        type: 'map_narrative',
        params: { text: narrative }
      }
    });
    console.log('Result:', JSON.parse(mappingResult.content[0].text));
    console.log('');

    // Test 3: Get enum values
    console.log('Test 3: Getting enum values for PropertyType...');
    const enumResult = await client.callTool({
      name: 'query',
      arguments: {
        type: 'get_enum_values',
        params: { enumType: 'PropertyType' }
      }
    });
    console.log('Result:', JSON.parse(enumResult.content[0].text));
    console.log('');

    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    process.exit(0);
  }
}

testMISMOExpert();