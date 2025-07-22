#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

// Override handlers directly
const originalConnect = server.connect.bind(server);
server.connect = async function(transport) {
  // Set up request handling
  transport.onmessage = async (message) => {
    const request = JSON.parse(message);
    console.error('Received:', request.method);
    
    let response;
    
    try {
      if (request.method === 'initialize') {
        await knowledgeGraph.initialize();
        response = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'mismo-expert', 
            version: '1.0.0',
          },
        };
      } else if (request.method === 'tools/list') {
        response = {
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
      } else if (request.method === 'tools/call') {
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
        
        response = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } else {
        throw new Error(`Unknown method: ${request.method}`);
      }
      
      // Send response
      await transport.send(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: response
      }));
      
    } catch (error) {
      console.error('Error:', error);
      await transport.send(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message
        }
      }));
    }
  };
  
  // Call original connect
  return originalConnect(transport);
};

// Start server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MISMO Expert MCP Server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();