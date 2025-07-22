#!/usr/bin/env node
import { spawn } from 'child_process';

// Comprehensive test of MISMO Expert MCP tool
const dockerProcess = spawn('docker', ['exec', '-i', 'mismo-expert-mcp', 'node', 'src/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';
const responses = {};

dockerProcess.stderr.on('data', (data) => {
  console.error('Server log:', data.toString().trim());
});

dockerProcess.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop(); // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        if (response.id && responses[response.id]) {
          responses[response.id](response);
        }
      } catch (e) {
        console.error('Failed to parse:', line);
      }
    }
  }
});

// Helper to send request and wait for response
function sendRequest(method, params, id) {
  return new Promise((resolve) => {
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };
    
    responses[id] = resolve;
    dockerProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function runTests() {
  console.log('🚀 Starting MISMO Expert MCP comprehensive test\n');
  
  try {
    // Test 1: Initialize
    console.log('Test 1: Initialize connection');
    const initResponse = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }, 1);
    console.log('✅ Initialized:', initResponse.result.serverInfo);
    console.log('');
    
    // Test 2: List tools
    console.log('Test 2: List available tools');
    const toolsResponse = await sendRequest('tools/list', {}, 2);
    console.log('✅ Available tools:', toolsResponse.result.tools.map(t => t.name));
    console.log('');
    
    // Test 3: Query kitchen fields
    console.log('Test 3: Get fields for kitchen feature');
    const kitchenResponse = await sendRequest('tools/call', {
      name: 'query',
      arguments: {
        type: 'fields_for_feature',
        params: { feature: 'kitchen' }
      }
    }, 3);
    const kitchenFields = JSON.parse(kitchenResponse.result.content[0].text);
    console.log('✅ Kitchen fields:', kitchenFields.fields.slice(0, 3), '...');
    console.log('');
    
    // Test 4: Map narrative text
    console.log('Test 4: Map narrative to MISMO fields');
    const narrativeResponse = await sendRequest('tools/call', {
      name: 'query',
      arguments: {
        type: 'map_narrative',
        params: { 
          text: 'The subject is a 3 bedroom, 2 bath ranch style home built in 1978 with 1,850 square feet. It has a full basement and attached 2-car garage.'
        }
      }
    }, 4);
    const mapping = JSON.parse(narrativeResponse.result.content[0].text);
    console.log('✅ Mapped fields:', Object.keys(mapping.fields));
    console.log('');
    
    // Test 5: Get enum values
    console.log('Test 5: Get enum values for PropertyType');
    const enumResponse = await sendRequest('tools/call', {
      name: 'query',
      arguments: {
        type: 'get_enum_values',
        params: { enumType: 'PropertyType' }
      }
    }, 5);
    const enumValues = JSON.parse(enumResponse.result.content[0].text);
    console.log('✅ Enum values:', enumValues.values.slice(0, 5), '...');
    console.log('');
    
    // Test 6: Validate data
    console.log('Test 6: Validate MISMO data');
    const validateResponse = await sendRequest('tools/call', {
      name: 'query',
      arguments: {
        type: 'validate',
        params: { 
          data: { bedrooms: 3, bathrooms: 2.5, yearBuilt: 2020 },
          context: 'property'
        }
      }
    }, 6);
    const validation = JSON.parse(validateResponse.result.content[0].text);
    console.log('✅ Validation result:', validation.valid ? 'Valid' : 'Invalid');
    console.log('');
    
    // Test 7: Get required fields
    console.log('Test 7: Get required fields for residential appraisal');
    const requiredResponse = await sendRequest('tools/call', {
      name: 'query',
      arguments: {
        type: 'check_required',
        params: { 
          propertyType: 'SingleFamily',
          useCase: 'appraisal'
        }
      }
    }, 7);
    const required = JSON.parse(requiredResponse.result.content[0].text);
    console.log('✅ Required fields:', required.required.slice(0, 5), '...');
    console.log('');
    
    console.log('🎉 All tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    dockerProcess.stdin.end();
    dockerProcess.kill();
  }
}

// Run tests after a small delay to ensure server is ready
setTimeout(runTests, 500);