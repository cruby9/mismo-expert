#!/usr/bin/env node
import { spawn } from 'child_process';
import readline from 'readline';

// Spawn the MCP server
const server = spawn('node', ['./src/server.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Create readline interface for server output
const rl = readline.createInterface({
  input: server.stdout,
  output: process.stdout,
  terminal: false
});

let requestId = 1;
const responses = {};

// Handle server responses
rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    if (response.id && response.result && response.result.content) {
      responses[response.id] = JSON.parse(response.result.content[0].text);
    }
  } catch (e) {
    // Ignore non-JSON lines
  }
});

// Helper to send request
function sendRequest(method, params) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method: method,
    params: params
  };
  server.stdin.write(JSON.stringify(request) + '\n');
  return request.id;
}

// Initialize the server
sendRequest('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: {
    name: 'query-client',
    version: '1.0.0'
  }
});

// Wait for initialization then run queries
setTimeout(async () => {
  console.log('Searching for neighborhood-related fields in MISMO V3.6...\n');
  
  // Query 1: Direct feature search
  const id1 = sendRequest('tools/call', {
    name: 'query',
    arguments: {
      type: 'fields_for_feature',
      params: {
        feature: 'neighborhood'
      }
    }
  });
  
  // Query 2: Try location/area related
  const id2 = sendRequest('tools/call', {
    name: 'query',
    arguments: {
      type: 'fields_for_feature',
      params: {
        feature: 'location'
      }
    }
  });
  
  // Query 3: Try site feature (might contain neighborhood info)
  const id3 = sendRequest('tools/call', {
    name: 'query',
    arguments: {
      type: 'fields_for_feature',
      params: {
        feature: 'site'
      }
    }
  });
  
  // Wait for responses and display results
  setTimeout(() => {
    console.log('='.repeat(60));
    console.log('QUERY RESULTS:');
    console.log('='.repeat(60));
    
    // Display results for neighborhood query
    if (responses[id1]) {
      console.log('\n1. Direct "neighborhood" feature search:');
      if (responses[id1].fields && responses[id1].fields.length > 0) {
        responses[id1].fields.forEach(field => {
          console.log(`  - ${field.fieldPath} (${field.dataType})`);
          if (field.enumType) console.log(`    Enum: ${field.enumType}`);
        });
      } else {
        console.log('  No fields found');
      }
    }
    
    // Display results for location query
    if (responses[id2]) {
      console.log('\n2. "location" feature search:');
      if (responses[id2].fields && responses[id2].fields.length > 0) {
        responses[id2].fields.forEach(field => {
          console.log(`  - ${field.fieldPath} (${field.dataType})`);
          if (field.enumType) console.log(`    Enum: ${field.enumType}`);
        });
      } else {
        console.log('  No fields found');
      }
    }
    
    // Display results for site query
    if (responses[id3]) {
      console.log('\n3. "site" feature search (filtered for neighborhood-related):');
      if (responses[id3].fields && responses[id3].fields.length > 0) {
        // Filter for neighborhood-related fields
        const neighborhoodFields = responses[id3].fields.filter(field => 
          field.fieldName.toLowerCase().includes('neighborhood') ||
          field.fieldName.toLowerCase().includes('location') ||
          field.fieldName.toLowerCase().includes('area') ||
          field.fieldName.toLowerCase().includes('district') ||
          field.fieldName.toLowerCase().includes('community')
        );
        
        if (neighborhoodFields.length > 0) {
          neighborhoodFields.forEach(field => {
            console.log(`  - ${field.fieldPath} (${field.dataType})`);
            if (field.enumType) console.log(`    Enum: ${field.enumType}`);
          });
        } else {
          console.log('  No neighborhood-related fields found in site data');
        }
      } else {
        console.log('  No fields found');
      }
    }
    
    // Let's also try to get specific field info
    console.log('\n4. Checking common neighborhood field patterns:');
    
    // Common field paths to check
    const commonFields = [
      'Property.NeighborhoodDescription',
      'Site.NeighborhoodDescription', 
      'Location.NeighborhoodName',
      'Property.LocationDescription',
      'SubjectProperty.NeighborhoodDescription',
      'Neighborhood.Description',
      'NeighborhoodSection.Description'
    ];
    
    commonFields.forEach(fieldPath => {
      sendRequest('tools/call', {
        name: 'query',
        arguments: {
          type: 'get_field_info',
          params: {
            fieldPath: fieldPath
          }
        }
      });
    });
    
    // Wait a bit more for field info queries
    setTimeout(() => {
      console.log('\n='.repeat(60));
      server.kill();
      process.exit(0);
    }, 2000);
    
  }, 3000);
}, 1000);