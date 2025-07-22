#!/usr/bin/env node
import { spawn } from 'child_process';

// Specific MISMO V3.6 form questions an appraiser might ask
const formQuestions = [
  {
    category: "Subject Property Identification",
    questions: [
      { q: "What fields do I use for the property address?", type: "fields_for_feature", params: { feature: "address" } },
      { q: "How do I record the legal description?", type: "map_narrative", params: { text: "Lot 5, Block 3, Smith Subdivision" } },
      { q: "What are valid property types for appraisal?", type: "get_enum_values", params: { enumType: "PropertyType" } },
      { q: "Fields for recording parcel number and tax ID?", type: "fields_for_feature", params: { feature: "parcel" } }
    ]
  },
  {
    category: "Property Characteristics",
    questions: [
      { q: "How do I document a split-level home built in 1978 with 2,100 sf?", type: "map_narrative", params: { text: "Split-level home built in 1978 with 2,100 square feet of living area" } },
      { q: "What fields for recording room counts?", type: "fields_for_feature", params: { feature: "room" } },
      { q: "How to record a partially finished basement?", type: "map_narrative", params: { text: "Basement is 50% finished with recreation room and half bath" } },
      { q: "Fields for exterior features like deck and patio?", type: "fields_for_feature", params: { feature: "exterior" } }
    ]
  },
  {
    category: "Kitchen and Bathrooms",
    questions: [
      { q: "Kitchen cabinet material options?", type: "get_enum_values", params: { enumType: "KitchenCabinetMaterialEnum" } },
      { q: "Countertop material choices?", type: "get_enum_values", params: { enumType: "KitchenCountertopMaterialEnum" } },
      { q: "How to document updated kitchen with island?", type: "map_narrative", params: { text: "Kitchen updated 2020 with quartz counters, soft-close wood cabinets, and center island" } },
      { q: "Recording multiple bathroom types?", type: "map_narrative", params: { text: "Master bath with double vanity, 2 full baths, 1 powder room" } }
    ]
  },
  {
    category: "Systems and Components",
    questions: [
      { q: "HVAC system documentation fields?", type: "fields_for_feature", params: { feature: "hvac" } },
      { q: "How to record solar panels?", type: "map_narrative", params: { text: "20 solar panels installed 2022, 8kW system with net metering" } },
      { q: "Plumbing and electrical update fields?", type: "fields_for_feature", params: { feature: "systems" } },
      { q: "Recording a new roof?", type: "map_narrative", params: { text: "Architectural shingle roof replaced 2023 with 30-year warranty" } }
    ]
  },
  {
    category: "Site and Location",
    questions: [
      { q: "How to document lot size and shape?", type: "fields_for_feature", params: { feature: "lot" } },
      { q: "Recording neighborhood characteristics?", type: "fields_for_feature", params: { feature: "neighborhood" } },
      { q: "How to note view features?", type: "map_narrative", params: { text: "Mountain views from rear deck and master bedroom" } },
      { q: "Documenting flood zone status?", type: "fields_for_feature", params: { feature: "flood" } }
    ]
  },
  {
    category: "Valuation and Comparables",
    questions: [
      { q: "Required fields for property valuation?", type: "check_required", params: { propertyType: "SingleFamily", useCase: "appraisal" } },
      { q: "How to record comparable sales?", type: "fields_for_feature", params: { feature: "comparable" } },
      { q: "Adjustment fields for comparables?", type: "fields_for_feature", params: { feature: "adjustment" } },
      { q: "Final opinion of value fields?", type: "get_field_info", params: { fieldPath: "PropertyValuation.PropertyValuationAmount" } }
    ]
  },
  {
    category: "Condition and Quality",
    questions: [
      { q: "How to rate property condition?", type: "fields_for_feature", params: { feature: "condition" } },
      { q: "Quality rating options?", type: "get_enum_values", params: { enumType: "QualityRating" } },
      { q: "Documenting deferred maintenance?", type: "map_narrative", params: { text: "Needs exterior paint, gutter repair, and deck staining" } },
      { q: "Recording recent improvements?", type: "map_narrative", params: { text: "New HVAC 2022, kitchen remodel 2021, master bath update 2023" } }
    ]
  }
];

class FormSpecificTester {
  constructor() {
    this.requestId = 0;
    this.responses = {};
    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      byCategory: {}
    };
  }

  async connect() {
    console.log('🏠 MISMO V3.6 Form-Specific Test Suite\n');
    
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
          } catch (e) {}
        }
      }
    });

    // Suppress server logs
    this.process.stderr.on('data', () => {});

    // Initialize
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'form-tester', version: '1.0.0' }
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

  async testQuestion(question) {
    const response = await this.sendRequest('tools/call', {
      name: 'query',
      arguments: question
    });
    
    this.results.total++;
    
    if (response.error) {
      this.results.failed++;
      return { success: false, error: response.error.message };
    }
    
    if (response.result?.content?.[0]?.text) {
      this.results.successful++;
      try {
        const result = JSON.parse(response.result.content[0].text);
        return { success: true, result };
      } catch (e) {
        return { success: false, error: 'Invalid response format' };
      }
    }
    
    this.results.failed++;
    return { success: false, error: 'No response' };
  }

  formatResult(result) {
    if (!result.success) {
      return `   ❌ Error: ${result.error}`;
    }
    
    const data = result.result;
    let output = [];
    
    if (data.fields && Array.isArray(data.fields)) {
      output.push(`   ✅ Found ${data.fields.length} fields:`);
      data.fields.slice(0, 3).forEach(f => {
        output.push(`      • ${f.fieldPath || f.fieldName}: ${f.dataType || ''}`);
      });
      if (data.fields.length > 3) {
        output.push(`      ... and ${data.fields.length - 3} more`);
      }
    } else if (data.fields && typeof data.fields === 'object') {
      const entries = Object.entries(data.fields);
      output.push(`   ✅ Mapped to ${entries.length} fields:`);
      entries.slice(0, 3).forEach(([field, value]) => {
        output.push(`      • ${field} = "${value}"`);
      });
    } else if (data.values) {
      output.push(`   ✅ ${data.values.length} options available:`);
      data.values.slice(0, 4).forEach(v => {
        output.push(`      • ${v.value}${v.description ? ': ' + v.description : ''}`);
      });
    } else if (data.required) {
      output.push(`   ✅ ${data.required.length} required fields for ${data.propertyType} ${data.useCase}`);
      data.required.slice(0, 5).forEach(f => {
        output.push(`      • ${f}`);
      });
    } else if (data.dataType) {
      output.push(`   ✅ Field Information:`);
      output.push(`      • Type: ${data.dataType}`);
      output.push(`      • Required: ${data.required ? 'Yes' : 'No'}`);
      if (data.propertyDescription) {
        output.push(`      • Description: ${data.propertyDescription}`);
      }
    } else if (data.valid !== undefined) {
      output.push(`   ✅ Validation: ${data.valid ? 'Valid' : 'Invalid'}`);
    } else if (data.error) {
      output.push(`   ⚠️  ${data.error}`);
    } else {
      output.push(`   ℹ️  Result: ${JSON.stringify(data).substring(0, 100)}...`);
    }
    
    return output.join('\n');
  }

  async runTests() {
    for (const category of formQuestions) {
      console.log(`\n📋 ${category.category}`);
      console.log('─'.repeat(60));
      
      this.results.byCategory[category.category] = { total: 0, successful: 0 };
      
      for (const item of category.questions) {
        console.log(`\n❓ ${item.q}`);
        const result = await this.testQuestion(item);
        console.log(this.formatResult(result));
        
        this.results.byCategory[category.category].total++;
        if (result.success) {
          this.results.byCategory[category.category].successful++;
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Summary
    console.log('\n\n📊 Test Summary');
    console.log('═'.repeat(60));
    console.log(`Total Questions: ${this.results.total}`);
    console.log(`Successful: ${this.results.successful} (${(this.results.successful/this.results.total*100).toFixed(1)}%)`);
    console.log(`Failed: ${this.results.failed}`);
    console.log('\nBy Category:');
    
    Object.entries(this.results.byCategory).forEach(([cat, stats]) => {
      const pct = (stats.successful/stats.total*100).toFixed(0);
      console.log(`  ${cat}: ${stats.successful}/${stats.total} (${pct}%)`);
    });
    
    console.log('\n✨ Test complete!');
    
    this.process.stdin.end();
    this.process.kill();
  }
}

// Run the tests
async function main() {
  const tester = new FormSpecificTester();
  await tester.connect();
  await tester.runTests();
}

main().catch(console.error);