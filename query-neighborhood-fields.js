#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function queryNeighborhoodFields() {
  console.log('Starting MISMO Expert MCP client to query neighborhood description fields...\n');
  
  const transport = new StdioClientTransport({
    command: 'docker',
    args: ['exec', '-i', 'mismo-expert-mcp-new', 'node', 'src/server.js'],
  });

  const client = new Client({
    name: 'neighborhood-query-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to MISMO Expert MCP server\n');

    // Query for neighborhood-related fields
    console.log('Querying for fields related to neighborhood description...\n');
    
    // Try different approaches to find neighborhood-related fields
    const queries = [
      {
        description: 'Direct query for "neighborhood" feature',
        type: 'fields_for_feature',
        params: { feature: 'neighborhood' }
      },
      {
        description: 'Query for "neighborhood description" feature',
        type: 'fields_for_feature',
        params: { feature: 'neighborhood description' }
      },
      {
        description: 'Map narrative text about neighborhood',
        type: 'map_narrative',
        params: { 
          text: 'The neighborhood is a quiet residential area with mature trees, well-maintained homes, and good access to schools and shopping.' 
        }
      },
      {
        description: 'Query for "location" feature (may include neighborhood)',
        type: 'fields_for_feature',
        params: { feature: 'location' }
      },
      {
        description: 'Query for "area" feature',
        type: 'fields_for_feature',
        params: { feature: 'area' }
      }
    ];

    for (const query of queries) {
      console.log(`\n📋 ${query.description}:`);
      console.log(`   Query type: ${query.type}`);
      console.log(`   Parameters: ${JSON.stringify(query.params)}`);
      
      try {
        const result = await client.callTool({
          name: 'query',
          arguments: {
            type: query.type,
            params: query.params
          }
        });
        
        const parsedResult = JSON.parse(result.content[0].text);
        console.log('\n   Result:');
        console.log(JSON.stringify(parsedResult, null, 2));
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Also try to get field info for any known neighborhood-related paths
    console.log('\n\n📋 Checking specific field paths that might relate to neighborhood:');
    const fieldPaths = [
      'SUBJECT_PROPERTY.NEIGHBORHOOD',
      'SUBJECT_PROPERTY.LOCATION',
      'PROPERTY.NEIGHBORHOOD',
      'APPRAISAL.NEIGHBORHOOD',
      'NEIGHBORHOOD_SECTION'
    ];

    for (const fieldPath of fieldPaths) {
      console.log(`\n   Checking field path: ${fieldPath}`);
      try {
        const result = await client.callTool({
          name: 'query',
          arguments: {
            type: 'get_field_info',
            params: { fieldPath: fieldPath }
          }
        });
        
        const parsedResult = JSON.parse(result.content[0].text);
        console.log('   Result:');
        console.log(JSON.stringify(parsedResult, null, 2));
      } catch (error) {
        console.log(`   ❌ Not found or error: ${error.message}`);
      }
    }

    console.log('\n\n✅ Query completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    process.exit(0);
  }
}

queryNeighborhoodFields();