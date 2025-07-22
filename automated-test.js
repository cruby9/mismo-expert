#!/usr/bin/env node
import { spawn } from 'child_process';

// Automated test questions for MISMO Expert
const testQuestions = [
  {
    category: "Property Features",
    questions: [
      "What fields are available for documenting kitchen features?",
      "How do I record bathroom information?",
      "What fields exist for exterior features?",
      "How do I document heating and cooling systems?",
      "What options are there for roof types?"
    ]
  },
  {
    category: "Appraisal Workflow",
    questions: [
      "What are the required fields for a single family appraisal?",
      "How do I document property condition?",
      "What fields are needed for comparable sales?",
      "How do I record property measurements?",
      "What fields are used for valuation?"
    ]
  },
  {
    category: "Data Migration",
    questions: [
      "I have 'Year Built: 1995' - how do I map this?",
      "Convert: '3BR/2BA ranch on slab foundation'",
      "How do I map HOA fees from legacy system?",
      "Map this: 'Lot size 0.25 acres, corner lot'",
      "Convert: 'Central heat/air, updated 2020'"
    ]
  },
  {
    category: "Validation",
    questions: [
      "Is -1 bedrooms valid?",
      "What's the valid range for year built?",
      "Are there constraints on square footage?",
      "What property types are valid?",
      "Can bathrooms be fractional?"
    ]
  }
];

class AutomatedTester {
  constructor() {
    this.requestId = 0;
    this.responses = {};
  }

  async connect() {
    console.log('🤖 Starting Automated MISMO Expert Test\n');
    
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
            // Ignore parse errors
          }
        }
      }
    });

    // Initialize
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'automated-tester', version: '1.0.0' }
    });
  }

  async sendRequest(method, params) {
    const id = ++this.requestId;
    
    return new Promise((resolve) => {
      this.responses[id] = resolve;
      const request = { jsonrpc: '2.0', method, params, id };
      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async askQuestion(question) {
    // Determine query type based on question content
    let queryType, params;
    
    if (question.includes('fields') && (question.includes('for') || question.includes('available'))) {
      // Extract feature
      const features = ['kitchen', 'bathroom', 'exterior', 'heating', 'cooling', 'roof', 'foundation'];
      const found = features.find(f => question.toLowerCase().includes(f));
      if (found) {
        queryType = 'fields_for_feature';
        params = { feature: found };
      }
    } else if (question.includes('required') && question.includes('fields')) {
      queryType = 'check_required';
      params = { propertyType: 'SingleFamily', useCase: 'appraisal' };
    } else if (question.includes('valid') || question.includes('range') || question.includes('constraints')) {
      // Validation question
      queryType = 'validate';
      if (question.includes('-1 bedroom')) {
        params = { data: { bedrooms: -1 }, context: 'property' };
      } else if (question.includes('year built')) {
        params = { data: { yearBuilt: 1700 }, context: 'property' };
      } else {
        params = { data: {}, context: 'property' };
      }
    } else if (question.includes('property types')) {
      queryType = 'get_enum_values';
      params = { enumType: 'PropertyType' };
    } else if (question.includes('map') || question.includes('Convert') || question.includes('have')) {
      // Extract text after colon or quotes
      const match = question.match(/['":](.+)['"]?$/);
      const text = match ? match[1].trim() : question;
      queryType = 'map_narrative';
      params = { text };
    } else {
      // Default to narrative mapping
      queryType = 'map_narrative';
      params = { text: question };
    }
    
    const response = await this.sendRequest('tools/call', {
      name: 'query',
      arguments: { type: queryType, params }
    });
    
    return response;
  }

  async runTests() {
    for (const category of testQuestions) {
      console.log(`\n📋 ${category.category}`);
      console.log('═'.repeat(50));
      
      for (const question of category.questions) {
        console.log(`\n❓ ${question}`);
        
        try {
          const response = await this.askQuestion(question);
          
          if (response.error) {
            console.log(`❌ Error: ${response.error.message}`);
          } else if (response.result?.content?.[0]?.text) {
            const result = JSON.parse(response.result.content[0].text);
            
            // Format output based on result type
            if (result.fields && Array.isArray(result.fields)) {
              console.log(`✅ Found ${result.fields.length} fields:`);
              result.fields.slice(0, 5).forEach(f => {
                console.log(`   - ${f.fieldPath || f.fieldName}: ${f.dataType || f.description || ''}`);
              });
              if (result.fields.length > 5) {
                console.log(`   ... and ${result.fields.length - 5} more`);
              }
            } else if (result.fields && typeof result.fields === 'object') {
              const entries = Object.entries(result.fields);
              console.log(`✅ Mapped to ${entries.length} fields:`);
              entries.slice(0, 5).forEach(([field, value]) => {
                console.log(`   - ${field}: ${value}`);
              });
            } else if (result.values) {
              console.log(`✅ Valid values (${result.values.length}):`);
              result.values.slice(0, 5).forEach(v => {
                console.log(`   - ${v.value}: ${v.description}`);
              });
            } else if (result.required) {
              console.log(`✅ Required fields (${result.required.length}):`);
              result.required.slice(0, 5).forEach(f => {
                console.log(`   - ${f}`);
              });
            } else if (result.valid !== undefined) {
              console.log(`✅ Validation: ${result.valid ? 'Valid' : 'Invalid'}`);
              if (result.issues) {
                console.log(`   Issues: ${result.issues}`);
              }
            } else {
              console.log(`✅ Result:`, JSON.stringify(result, null, 2).split('\n').slice(0, 5).join('\n'));
            }
          }
        } catch (error) {
          console.log(`❌ Test failed: ${error.message}`);
        }
        
        // Small delay between questions
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n\n✅ All automated tests completed!');
    this.process.stdin.end();
    this.process.kill();
  }
}

// Run automated tests
async function main() {
  const tester = new AutomatedTester();
  await tester.connect();
  await tester.runTests();
}

main().catch(console.error);