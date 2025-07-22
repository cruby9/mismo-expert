# MISMO Expert MCP Tool 🏠

An AI-powered Model Context Protocol (MCP) server that provides expert knowledge about the MISMO V3.6 B366 Logical Data Model for mortgage and appraisal data. This tool enables Claude Code and other MCP-compatible AI assistants to answer questions about MISMO form fields, validate data, and help with legacy system migrations.

**Important**: This tool contains the complete MISMO V3.6 data model with 3,551 classes, 10,255 properties, and 913 enumerations fully parsed and searchable.

## 🌟 Features

- **Field Discovery**: Find all MISMO fields for specific property features (kitchen, bathroom, roof, etc.)
- **Narrative Parsing**: Convert natural language descriptions to structured MISMO fields
- **Data Validation**: Validate property data against MISMO V3.6 requirements
- **Enum Lookups**: Get valid values for any MISMO enumerated field with all possible options
- **Required Fields**: Identify required fields for different use cases (appraisal, origination, etc.)
- **Legacy Migration**: Map legacy narrative appraisal data to MISMO V3.6 format
- **Field Information**: Get detailed metadata about specific MISMO fields

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Claude Code or any MCP-compatible client

### 1. Clone and Build

```bash
# Clone the repository
git clone <repository-url>
cd mismo-expert-mcp

# Build and start with Docker Compose
docker-compose up -d

# Verify it's running
docker logs mismo-expert-mcp
```

### 2. Add to Claude Code

```bash
# Navigate to your project directory
cd /path/to/your/project

# Add the MCP server to Claude Code (note: no 'stdio' prefix needed)
claude mcp add mismo-expert "docker exec -i mismo-expert-mcp node src/server.js"

# Restart Claude Code to load the new MCP tool
# Then try: "Use the mismo expert tool to find bathroom fields"
```

### 3. Test It Works

Ask Claude Code:
- "Use mismo-expert to find fields for kitchen features"
- "Ask mismo-expert to parse: '3 bedroom ranch built in 1995'"
- "Query mismo-expert for valid property types"

## 📋 Detailed Setup Instructions

### Option 1: Docker (Recommended)

1. **Build the Docker image**:
```bash
docker-compose build
```

2. **Start the container**:
```bash
docker-compose up -d
```

3. **Configure Claude Code**:
```bash
claude mcp add mismo-expert "docker exec -i mismo-expert-mcp node src/server.js"
```

### Option 2: Local Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Parse the MISMO XMI file** (optional - uses mock data by default):
```bash
npm run parse-xmi
```

3. **Configure Claude Code**:
```bash
claude mcp add mismo-expert "node /full/path/to/mismo-expert-mcp/src/server.js"
```

### Option 3: Development Mode

1. **Use the development Docker Compose**:
```bash
docker-compose -f docker-compose.dev.yml up
```

This mounts your source code for hot reloading during development.

## 🔧 Configuration

### MCP Server Configuration

The tool runs as a stdio-based MCP server. No additional configuration is needed beyond adding it to Claude Code.

### Environment Variables

- `NODE_ENV`: Set to "production" or "development"
- `LOG_LEVEL`: Control logging verbosity ("info", "debug", "error")

## 📚 Real Usage Examples

### Query Fields by Feature

```
User: Show me the bathroom fields
Claude: I'll use the MISMO Expert tool to get bathroom fields...

Found 30 fields related to bathrooms:
- Property Unit.Full Bathroom Count
- Property Unit.Half Bathroom Count  
- Property Unit.Overall Bathrooms Quality Description
- Property Unit.Overall Bathrooms Update Status Type
- Bath Equipment.Bath Equipment Type (enum: Bathtub, Shower, Toilet, Sink, Bidet)
- Bath Equipment.Bath Equipment Count
- Room fields (when Room Type = "Bathroom"):
  - Room.Indicated Area Measure
  - Room.Condition Rating Type (C1-C6)
  - Room.Room Update Status Type
... and more
```

### Parse Narrative Text

```
User: Parse this: "Beautiful 4 bedroom colonial with 2.5 baths, built in 2005"
Claude: Using MISMO Expert to parse...

Extracted fields:
- Property.BedroomTotalCount = 4
- Property.BathroomTotalCount = 2.5
- Property.YearBuilt = 2005
- Property.ArchitecturalDesignType = "Colonial"
```

### Get Enum Values

```
User: What are valid property types?
Claude: Checking MISMO Expert...

Valid PropertyType values:
- SingleFamily: Single Family Detached
- Condominium: Condominium Unit
- Townhouse: Townhouse
- Cooperative: Cooperative Unit
- ManufacturedHome: Manufactured/Mobile Home
- MultiFamily: Multi-Family Property
```

## 🛠️ Available Query Types

### 1. fields_for_feature
Find all fields related to a property feature.
```json
{
  "type": "fields_for_feature",
  "params": { "feature": "kitchen" }
}
```

### 2. map_narrative
Convert narrative text to MISMO fields.
```json
{
  "type": "map_narrative",
  "params": { "text": "3 bedroom ranch built in 1995" }
}
```

### 3. get_enum_values
Get valid values for an enumeration.
```json
{
  "type": "get_enum_values",
  "params": { "enumType": "PropertyType" }
}
```

### 4. validate
Validate data against MISMO requirements.
```json
{
  "type": "validate",
  "params": { 
    "data": { "bedrooms": 3, "bathrooms": 2 },
    "context": "property"
  }
}
```

### 5. check_required
Get required fields for a use case.
```json
{
  "type": "check_required",
  "params": { 
    "propertyType": "SingleFamily",
    "useCase": "appraisal"
  }
}
```

### 6. get_field_info
Get detailed information about a field.
```json
{
  "type": "get_field_info",
  "params": { "fieldPath": "Property.YearBuilt" }
}
```

### 7. get_relationships
Explore entity relationships.
```json
{
  "type": "get_relationships",
  "params": { "entity": "Property" }
}
```

## 🧪 Testing

### Run Comprehensive Tests
```bash
node test-comprehensive.js
```

### Run Form-Specific Tests
```bash
node form-specific-test.js
```

### Monitor Server Health
```bash
node monitor-dashboard.js
```

## 📁 Project Structure

```
mismo-expert-mcp/
├── src/
│   ├── server.js         # MCP server implementation
│   ├── query-engine.js   # Query processing logic
│   ├── knowledge-graph.js # SQLite knowledge base
│   ├── parser.js         # XMI parser
│   └── migrations.js     # Legacy data migration
├── data/
│   └── mismo-v36.xmi    # MISMO V3.6 data model
├── docker-compose.yml    # Production Docker config
├── docker-compose.dev.yml # Development Docker config
├── package.json
└── README.md
```

## 🔍 Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs mismo-expert-mcp

# Restart container
docker-compose restart
```

### MCP Server Not Found
```bash
# List MCP servers
claude mcp list

# Re-add the server (without 'stdio' prefix)
claude mcp remove mismo-expert
claude mcp add mismo-expert "docker exec -i mismo-expert-mcp node src/server.js"

# Restart Claude Code after adding
```

### No Response from Queries
1. Ensure Docker container is running: `docker ps | grep mismo-expert`
2. Test server manually: `docker exec -it mismo-expert-mcp node test-server.js`
3. Check Claude Code can access Docker: `docker --version`

## 🚧 Known Issues & Solutions

### Claude Code MCP Integration

1. **IMPORTANT**: When adding the MCP server, do NOT include 'stdio' in the command:
   - ❌ Wrong: `claude mcp add mismo-expert stdio "docker exec -i ..."`
   - ✅ Correct: `claude mcp add mismo-expert "docker exec -i ..."`

2. **Server logs to stderr**: The server has been modified to suppress all non-critical stderr output to ensure clean JSON-RPC communication.

3. **Restart Required**: After adding the MCP server, you must restart Claude Code for it to recognize the new tool.

4. **Container Name**: Ensure your Docker container is named `mismo-expert-mcp` as expected by the command.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add new query types in `src/query-engine.js`
4. Add tests in `test-comprehensive.js`
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built for the MISMO V3.6 B366 Logical Data Model
- Uses the Model Context Protocol (MCP) by Anthropic
- Designed to help appraisers transition to new MISMO forms

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review test files for usage examples
3. Open an issue on GitHub

---

**Note**: This tool is designed to work with Claude Code and other MCP-compatible AI assistants. It provides a bridge between AI capabilities and the complex MISMO V3.6 mortgage data standard.