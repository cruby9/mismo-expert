#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function summarizeNeighborhoodFields() {
  console.log('Querying MISMO V3.6 for neighborhood-related fields...\n');
  
  const transport = new StdioClientTransport({
    command: 'docker',
    args: ['exec', '-i', 'mismo-expert-mcp-new', 'node', 'src/server.js'],
  });

  const client = new Client({
    name: 'neighborhood-summary-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    
    // Query for neighborhood fields
    const result = await client.callTool({
      name: 'query',
      arguments: {
        type: 'fields_for_feature',
        params: { feature: 'neighborhood' }
      }
    });
    
    const parsedResult = JSON.parse(result.content[0].text);
    const fields = parsedResult.fields || [];
    
    // Group fields by class
    const fieldsByClass = {};
    fields.forEach(field => {
      if (!fieldsByClass[field.className]) {
        fieldsByClass[field.className] = [];
      }
      fieldsByClass[field.className].push(field);
    });
    
    // Print summary
    console.log('=== MISMO V3.6 NEIGHBORHOOD-RELATED FIELDS SUMMARY ===\n');
    console.log(`Total fields found: ${fields.length}\n`);
    
    // Show classes with most neighborhood-related fields
    const sortedClasses = Object.entries(fieldsByClass)
      .sort((a, b) => b[1].length - a[1].length);
    
    console.log('Classes with neighborhood-related fields:');
    sortedClasses.forEach(([className, classFields]) => {
      console.log(`\n${className} (${classFields.length} fields):`);
      classFields.slice(0, 5).forEach(field => {
        console.log(`  - ${field.fieldName}`);
        if (field.dataType !== 'string') {
          console.log(`    Type: ${field.dataType}`);
        }
      });
      if (classFields.length > 5) {
        console.log(`  ... and ${classFields.length - 5} more fields`);
      }
    });
    
    // Show key neighborhood-specific fields
    console.log('\n\n=== KEY NEIGHBORHOOD-SPECIFIC FIELDS ===\n');
    
    const keyFields = fields.filter(f => 
      f.className === 'Neighborhood' || 
      f.className === 'Neighborhood Influence' ||
      f.className === 'Housing' ||
      f.className === 'Present Land Use'
    );
    
    console.log('Primary Neighborhood Fields:');
    keyFields.filter(f => f.className === 'Neighborhood').forEach(field => {
      console.log(`\n${field.fieldPath}`);
      console.log(`  Description: ${field.fieldName}`);
      console.log(`  Data Type: ${field.dataType}`);
    });
    
    console.log('\n\nNeighborhood Influence Fields:');
    keyFields.filter(f => f.className === 'Neighborhood Influence').forEach(field => {
      console.log(`\n${field.fieldPath}`);
      console.log(`  Description: ${field.fieldName}`);
      console.log(`  Data Type: ${field.dataType}`);
    });
    
    console.log('\n\nHousing/Market Fields:');
    keyFields.filter(f => f.className === 'Housing').slice(0, 10).forEach(field => {
      console.log(`\n${field.fieldPath}`);
      console.log(`  Description: ${field.fieldName}`);
      console.log(`  Data Type: ${field.dataType}`);
    });
    
    console.log('\n\nLand Use Fields:');
    keyFields.filter(f => f.className === 'Present Land Use').forEach(field => {
      console.log(`\n${field.fieldPath}`);
      console.log(`  Description: ${field.fieldName}`);
      console.log(`  Data Type: ${field.dataType}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
    process.exit(0);
  }
}

summarizeNeighborhoodFields();