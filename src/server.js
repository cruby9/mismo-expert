#!/usr/bin/env node
import { QueryEngine } from './query-engine.js';
import { KnowledgeGraph } from './knowledge-graph.js';
import readline from 'readline';

// Initialize components
const queryEngine = new QueryEngine();
const knowledgeGraph = new KnowledgeGraph();
let initialized = false;

// Helper to ensure initialization
async function ensureInitialized() {
  if (!initialized) {
    await knowledgeGraph.initialize();
    initialized = true;
  }
}

// Handle requests
async function handleRequest(request) {
  // Only log errors, not regular requests
  
  if (request.method === 'initialize') {
    await ensureInitialized();
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: 'mismo-expert',
        version: '1.0.0',
      },
    };
  }
  
  if (request.method === 'tools/list') {
    return {
      tools: [
        {
          name: 'query',
          description: 'Query MISMO V3.6 knowledge base',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: [
                  'fields_for_feature',
                  'get_field_info',
                  'validate',
                  'get_enum_values',
                  'map_narrative',
                  'check_required',
                  'get_relationships'
                ],
                description: 'Type of query to perform'
              },
              params: {
                type: 'object',
                description: 'Query-specific parameters'
              }
            },
            required: ['type']
          }
        }
      ]
    };
  }
  
  if (request.method === 'tools/call') {
    // Tool call request
    
    const { name, arguments: args } = request.params;
    
    if (name !== 'query') {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    const { type, params = {} } = args;
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
  
  throw new Error(`Unknown method: ${request.method}`);
}

// Main server loop
async function main() {
  // Server started silently
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });
  
  rl.on('line', async (line) => {
    let request;
    try {
      request = JSON.parse(line);
      const result = await handleRequest(request);
      
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
      
      console.log(JSON.stringify(response));
    } catch (error) {
      // Error occurred
      
      const errorResponse = {
        jsonrpc: '2.0',
        id: request?.id,
        error: {
          code: -32603,
          message: error.message
        }
      };
      
      console.log(JSON.stringify(errorResponse));
    }
  });
}

main();