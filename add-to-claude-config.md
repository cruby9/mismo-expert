# Adding MISMO Expert to Claude Code

Add this to your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "mismo-expert": {
      "command": "node",
      "args": ["/home/ccr/form_program/mismo-expert-mcp/src/server.js"],
      "env": {}
    }
  }
}
```

Or if you want to use the Docker version:

```json
{
  "mcpServers": {
    "mismo-expert": {
      "command": "docker",
      "args": ["exec", "-i", "mismo-expert-mcp", "node", "src/server.js"],
      "env": {}
    }
  }
}
```

## Alternative: Run without Docker

If you want to run it directly without Docker:

```bash
cd /home/ccr/form_program/mismo-expert-mcp
npm install
node src/server.js
```

Then use this configuration:

```json
{
  "mcpServers": {
    "mismo-expert": {
      "command": "node",
      "args": ["/home/ccr/form_program/mismo-expert-mcp/src/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

After adding this configuration:
1. Save the file
2. Restart Claude Code
3. The MISMO Expert tool should appear in my available tools

Then you can ask me to use it like:
"@mismo-expert what fields are needed for kitchen features?"