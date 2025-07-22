#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { QueryEngine } from './query-engine.js';
import { KnowledgeGraph } from './knowledge-graph.js';

// Initialize components  
const queryEngine = new QueryEngine();
const knowledgeGraph = new KnowledgeGraph();

// Create server
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

// Define the query tool schema
const QueryToolSchema = z.object({
  type: z.enum([
    'fields_for_feature',
    'get_field_info', 
    'validate',
    'get_enum_values',
    'map_narrative',
    'check_required',
    'get_relationships'
  ]),
  params: z.object({}).passthrough().optional()
});

// Register tool
server.tool(
  'query',
  'Query MISMO V3.6 knowledge base',
  QueryToolSchema,
  async ({ type, params = {} }) => {
    let result;
    
    switch (type) {
      case 'fields_for_feature':
        result = await queryEngine.getFieldsForFeature(params.feature);
        break;
        
      case 'get_field_info':
        result = await queryEngine.getFieldInfo(params.fieldPath);
        break;
        
      case 'validate':
        result = await queryEngine.validateData(params.data, params.context);
        break;
        
      case 'get_enum_values':
        result = await queryEngine.getEnumValues(params.enumType);
        break;
        
      case 'map_narrative':
        result = await queryEngine.mapNarrativeToFields(params.text);
        break;
        
      case 'check_required':
        result = await queryEngine.checkRequiredFields(params.propertyType, params.useCase);
        break;
        
      case 'get_relationships':
        result = await queryEngine.getRelationships(params.entity);
        break;
        
      default:
        throw new Error(`Unknown query type: ${type}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

// Start server
async function main() {
  try {
    // Initialize knowledge graph
    await knowledgeGraph.initialize();
    
    // Create and connect transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('MISMO Expert MCP Server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();