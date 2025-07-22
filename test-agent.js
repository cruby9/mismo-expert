#!/usr/bin/env node
import { spawn } from 'child_process';
import readline from 'readline';

class MISMOTestAgent {
  constructor() {
    this.requestId = 0;
    this.responses = {};
    this.stats = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
  }

  async connect() {
    console.log('🤖 MISMO Test Agent starting...\n');
    
    this.process = spawn('docker', ['exec', '-i', 'mismo-expert-mcp', 'node', 'src/server.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let responseBuffer = '';
    
    this.process.stdout.on('data', (data) => {
      responseBuffer += data.toString();
      const lines = responseBuffer.split('\n');
      responseBuffer = lines.pop();
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            if (response.id && this.responses[response.id]) {
              this.responses[response.id](response);
            }
          } catch (e) {
            console.error('Parse error:', e.message);
          }
        }
      }
    });

    this.process.stderr.on('data', (data) => {
      const log = data.toString().trim();
      if (log && !log.includes('Request:')) {
        console.log('📋 Server log:', log);
      }
    });

    // Initialize connection
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-agent', version: '1.0.0' }
    });
    
    console.log('✅ Connected to MISMO Expert MCP\n');
  }

  async sendRequest(method, params) {
    const startTime = Date.now();
    const id = ++this.requestId;
    
    return new Promise((resolve) => {
      const request = { jsonrpc: '2.0', method, params, id };
      this.responses[id] = (response) => {
        const responseTime = Date.now() - startTime;
        this.stats.responseTimes.push(responseTime);
        this.stats.totalQueries++;
        
        if (response.error) {
          this.stats.failedQueries++;
          console.error(`❌ Error: ${response.error.message}`);
        } else {
          this.stats.successfulQueries++;
        }
        
        resolve(response);
      };
      
      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async queryTool(type, params) {
    const response = await this.sendRequest('tools/call', {
      name: 'query',
      arguments: { type, params }
    });
    
    if (response.result?.content?.[0]?.text) {
      return JSON.parse(response.result.content[0].text);
    }
    return null;
  }

  async runTestScenarios() {
    console.log('🧪 Running comprehensive test scenarios...\n');
    
    // Test Scenario 1: Property Features
    console.log('📍 Test 1: Querying various property features');
    const features = ['kitchen', 'bathroom', 'roof', 'foundation', 'garage', 'basement'];
    
    for (const feature of features) {
      console.log(`\n  Testing "${feature}" fields...`);
      const result = await this.queryTool('fields_for_feature', { feature });
      
      if (result?.fields?.length > 0) {
        console.log(`  ✓ Found ${result.fields.length} fields for ${feature}`);
        console.log(`  Sample fields: ${result.fields.slice(0, 3).map(f => f.fieldPath).join(', ')}`);
      } else {
        console.log(`  ⚠️  No fields found for ${feature}`);
      }
    }
    
    // Test Scenario 2: Narrative Parsing
    console.log('\n\n📍 Test 2: Parsing various narrative descriptions');
    const narratives = [
      "Beautiful 4 bedroom colonial with 2.5 baths, built in 2005. Features granite countertops and hardwood floors throughout.",
      "Cozy 2BR/1BA condo on 3rd floor. HOA fee $250/month. Built 1985, recently renovated kitchen with stainless steel appliances.",
      "Ranch style home, 1,500 sq ft, 3 car garage, full finished basement with wet bar. Corner lot with mature landscaping.",
      "Investment property: duplex with two 2-bedroom units. Each unit has separate utilities. Good rental history at $1,200/month per unit."
    ];
    
    for (const narrative of narratives) {
      console.log(`\n  Parsing: "${narrative.substring(0, 50)}..."`);
      const result = await this.queryTool('map_narrative', { text: narrative });
      
      if (result?.fields) {
        console.log(`  ✓ Extracted ${Object.keys(result.fields).length} fields`);
        console.log(`  Fields:`, Object.keys(result.fields).slice(0, 5).join(', '));
      }
    }
    
    // Test Scenario 3: Enum Values
    console.log('\n\n📍 Test 3: Checking enumeration values');
    const enums = [
      'PropertyType',
      'ArchitecturalDesignType',
      'FoundationType',
      'RoofType',
      'HeatingType',
      'KitchenCabinetMaterialEnum'
    ];
    
    for (const enumType of enums) {
      console.log(`\n  Checking enum: ${enumType}`);
      const result = await this.queryTool('get_enum_values', { enumType });
      
      if (result?.values?.length > 0) {
        console.log(`  ✓ Found ${result.values.length} values`);
        console.log(`  Sample values: ${result.values.slice(0, 3).map(v => v.value).join(', ')}`);
      } else {
        console.log(`  ⚠️  No values found or enum doesn't exist`);
      }
    }
    
    // Test Scenario 4: Validation
    console.log('\n\n📍 Test 4: Validating different data sets');
    const testData = [
      { data: { bedrooms: 3, bathrooms: 2, yearBuilt: 2020 }, context: 'property' },
      { data: { bedrooms: -1, bathrooms: 0 }, context: 'property' },
      { data: { yearBuilt: 1800, squareFeet: 50000 }, context: 'property' },
      { data: { price: 500000, bedrooms: 4, bathrooms: 3 }, context: 'appraisal' }
    ];
    
    for (const test of testData) {
      console.log(`\n  Validating:`, JSON.stringify(test.data));
      const result = await this.queryTool('validate', test);
      console.log(`  Result: ${result?.valid ? '✓ Valid' : '✗ Invalid'}`);
      if (result?.issues) {
        console.log(`  Issues:`, result.issues);
      }
    }
    
    // Test Scenario 5: Required Fields
    console.log('\n\n📍 Test 5: Checking required fields for different scenarios');
    const scenarios = [
      { propertyType: 'SingleFamily', useCase: 'appraisal' },
      { propertyType: 'Condominium', useCase: 'appraisal' },
      { propertyType: 'MultiFamily', useCase: 'origination' }
    ];
    
    for (const scenario of scenarios) {
      console.log(`\n  Checking ${scenario.propertyType} for ${scenario.useCase}`);
      const result = await this.queryTool('check_required', scenario);
      
      if (result?.required?.length > 0) {
        console.log(`  ✓ ${result.required.length} required fields`);
        console.log(`  Key fields: ${result.required.slice(0, 5).join(', ')}`);
      } else {
        console.log(`  ⚠️  No required fields defined for this scenario`);
      }
    }
    
    // Test Scenario 6: Field Information
    console.log('\n\n📍 Test 6: Getting detailed field information');
    const fieldPaths = [
      'Property.BedroomTotalCount',
      'Property.YearBuilt',
      'Kitchen.CountertopMaterialType',
      'PropertyValuation.PropertyValuationAmount',
      'Address.CityName'
    ];
    
    for (const fieldPath of fieldPaths) {
      console.log(`\n  Checking field: ${fieldPath}`);
      const result = await this.queryTool('get_field_info', { fieldPath });
      
      if (result && !result.error) {
        console.log(`  ✓ Field type: ${result.dataType || 'Unknown'}`);
        console.log(`  Required: ${result.required ? 'Yes' : 'No'}`);
      } else {
        console.log(`  ⚠️  Field not found or error occurred`);
      }
    }
    
    // Test Scenario 7: Complex Queries
    console.log('\n\n📍 Test 7: Complex appraisal scenarios');
    
    // Simulate an appraiser filling out a form
    console.log('\n  Scenario: Appraiser documenting a property inspection');
    
    const inspectionNarrative = `
      Subject property is a well-maintained 2-story colonial built in 1998.
      Living area is 2,450 sf with 4 bedrooms and 2.5 bathrooms.
      Kitchen was updated in 2018 with granite counters and stainless appliances.
      Full unfinished basement with rough plumbing for future bathroom.
      Attached 2-car garage. Forced air heating and central AC.
      Architectural shingle roof appears to be 5-7 years old.
      Property sits on 0.35 acre lot with professional landscaping.
    `;
    
    console.log('  Parsing inspection narrative...');
    const parsedData = await this.queryTool('map_narrative', { text: inspectionNarrative });
    console.log(`  ✓ Extracted ${Object.keys(parsedData?.fields || {}).length} fields from narrative`);
    
    console.log('\n  Validating extracted data...');
    const validation = await this.queryTool('validate', { 
      data: parsedData?.fields || {}, 
      context: 'appraisal' 
    });
    console.log(`  Validation: ${validation?.valid ? '✓ Pass' : '✗ Fail'}`);
    
    console.log('\n  Checking what else is required...');
    const required = await this.queryTool('check_required', {
      propertyType: 'SingleFamily',
      useCase: 'appraisal'
    });
    console.log(`  Total required fields: ${required?.required?.length || 0}`);
  }

  showStatistics() {
    console.log('\n\n📊 Test Statistics:');
    console.log('═══════════════════════════════════════');
    console.log(`Total queries: ${this.stats.totalQueries}`);
    console.log(`Successful: ${this.stats.successfulQueries} (${(this.stats.successfulQueries/this.stats.totalQueries*100).toFixed(1)}%)`);
    console.log(`Failed: ${this.stats.failedQueries}`);
    
    if (this.stats.responseTimes.length > 0) {
      const avgTime = this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length;
      const minTime = Math.min(...this.stats.responseTimes);
      const maxTime = Math.max(...this.stats.responseTimes);
      
      console.log(`\nResponse Times:`);
      console.log(`  Average: ${avgTime.toFixed(1)}ms`);
      console.log(`  Min: ${minTime}ms`);
      console.log(`  Max: ${maxTime}ms`);
    }
    console.log('═══════════════════════════════════════');
  }

  async interactiveMode() {
    console.log('\n\n🎯 Interactive Mode - Ask questions about MISMO V3.6');
    console.log('Type "exit" to quit, "stats" for statistics\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const askQuestion = () => {
      rl.question('\n❓ Your question: ', async (input) => {
        if (input.toLowerCase() === 'exit') {
          rl.close();
          this.disconnect();
          return;
        }
        
        if (input.toLowerCase() === 'stats') {
          this.showStatistics();
          askQuestion();
          return;
        }
        
        // Try to interpret the question and route to appropriate query
        console.log('\n🔍 Processing your question...');
        
        if (input.includes('field') && input.includes('for')) {
          // Extract feature from question
          const match = input.match(/fields?\s+for\s+(\w+)/i);
          if (match) {
            const feature = match[1];
            const result = await this.queryTool('fields_for_feature', { feature });
            console.log(`\nFields for ${feature}:`, result?.fields?.slice(0, 5) || 'None found');
          }
        } else if (input.includes('enum') || input.includes('values for')) {
          // Extract enum type
          const words = input.split(' ');
          const enumType = words[words.length - 1];
          const result = await this.queryTool('get_enum_values', { enumType });
          console.log(`\nValues:`, result?.values?.slice(0, 10) || 'None found');
        } else {
          // Try narrative parsing as fallback
          const result = await this.queryTool('map_narrative', { text: input });
          console.log('\nExtracted fields:', result?.fields || 'None');
        }
        
        askQuestion();
      });
    };
    
    askQuestion();
  }

  disconnect() {
    console.log('\n\n👋 Disconnecting from MISMO Expert MCP...');
    this.process.stdin.end();
    this.process.kill();
    this.showStatistics();
    process.exit(0);
  }
}

// Main execution
async function main() {
  const agent = new MISMOTestAgent();
  
  try {
    await agent.connect();
    await agent.runTestScenarios();
    await agent.interactiveMode();
  } catch (error) {
    console.error('Fatal error:', error);
    agent.disconnect();
  }
}

main();