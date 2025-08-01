# Setting Up MISMO Expert for Claude Desktop

## Steps to Enable the MISMO Expert MCP Tool

### 1. Open Claude Desktop Settings
- Open Claude Desktop
- Click on the Claude menu
- Select "Settings..."
- Click on "Developer" in the left sidebar
- Click "Edit Config"

### 2. Add MISMO Expert Configuration

Add this to your configuration file (merge with existing servers if any):

```json
{
  "mcpServers": {
    "mismo-expert": {
      "command": "node",
      "args": [
        "./src/server.js"
      ]
    }
  }
}
```

**Note**: Replace `/home/ccr` with your actual home directory path if different.

### 3. Alternative: Using Docker

If you prefer to use the Docker version:

```json
{
  "mcpServers": {
    "mismo-expert": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "mismo-expert:latest"
      ]
    }
  }
}
```

### 4. Alternative: Using npx (if published to npm)

If you publish your tool to npm:

```json
{
  "mcpServers": {
    "mismo-expert": {
      "command": "npx",
      "args": [
        "-y",
        "mismo-expert-mcp"
      ]
    }
  }
}
```

### 5. Save and Restart
1. Save the configuration file
2. **Restart Claude Desktop** (important!)
3. Look for the tools icon (🔧) in the bottom left of the input box
4. Click it to see available MCP tools - "mismo-expert" should appear

## Verifying It Works

Once configured, you should be able to:
1. See a tools/slider icon in Claude Desktop
2. Click it to see "mismo-expert" listed
3. Use commands like:
   - "Use mismo-expert to find kitchen fields"
   - "Ask mismo-expert about property types"
   - "Query mismo-expert for required appraisal fields"

## Troubleshooting

If it doesn't work:

1. **Check logs**:
   - macOS: `~/Library/Logs/Claude/mcp-server-mismo-expert.log`
   - Windows: `%APPDATA%\Claude\logs\mcp-server-mismo-expert.log`

2. **Test manually**:
   ```bash
   cd /path/to/mismo-expert-mcp
   node src/server.js
   ```
   Then type: `{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}`
   
   You should see a response.

3. **Common issues**:
   - Node.js not installed
   - Incorrect file paths
   - Server not starting due to dependencies

## File Locations

Configuration file locations:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: Not officially supported yet for Claude Desktop