# MISMO Expert MCP Troubleshooting Guide

## Common Issues and Solutions

### 1. MCP Tool Not Loading in Claude Code

**Symptom**: After adding the MCP server, Claude Code shows "failed" status

**Solution**:
```bash
# 1. Remove any existing configuration
claude mcp remove mismo-expert

# 2. Add WITHOUT the 'stdio' prefix (this is critical!)
claude mcp add mismo-expert "docker exec -i mismo-expert-mcp node src/server.js"

# 3. Verify it was added correctly
claude mcp list
# Should show: mismo-expert: docker exec -i mismo-expert-mcp node src/server.js

# 4. Restart Claude Code (required for MCP tools to load)
```

### 2. Container Name Mismatch

**Symptom**: MCP fails because container name doesn't match

**Solution**:
```bash
# Check running containers
docker ps | grep mismo

# If container has different name (e.g., mismo-expert-mcp-new), update MCP:
claude mcp remove mismo-expert
claude mcp add mismo-expert "docker exec -i <actual-container-name> node src/server.js"
```

### 3. Server Logging Issues

**Problem**: The server logs to stderr which interferes with JSON-RPC communication

**Solution**: The server has been modified to suppress all non-critical stderr output. If you see logging issues:

1. Check that you're using the latest version of `src/server.js`
2. Ensure these files don't have `console.error()` statements:
   - `src/server.js`
   - `src/knowledge-graph.js`
   - `src/parser.js`

### 4. Database Not Populated

**Symptom**: Queries return empty results or only mock data

**Solution**:
```bash
# Force database rebuild
docker exec mismo-expert-mcp rm -f /app/db/mismo.db
docker-compose restart

# Check database was populated
docker exec mismo-expert-mcp sqlite3 /app/db/mismo.db "SELECT COUNT(*) FROM classes;"
# Should return 3551
```

### 5. Testing MCP Connection

**To verify the MCP server is working**:
```bash
# Test basic initialization
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}},"id":1}' | docker exec -i mismo-expert-mcp node src/server.js

# Should return JSON with serverInfo

# Test tools listing
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}' | docker exec -i mismo-expert-mcp node src/server.js

# Should return the 'query' tool
```

### 6. Debug Mode

**To enable debug logging**:
```bash
# Create debug wrapper
cat > debug-mcp.sh << 'EOF'
#!/bin/bash
echo "[$(date)] MCP called with: $@" >> /tmp/mismo-mcp.log
docker exec -i mismo-expert-mcp node src/server.js
EOF

chmod +x debug-mcp.sh

# Use debug wrapper
claude mcp add mismo-expert "/path/to/debug-mcp.sh"

# Check logs
tail -f /tmp/mismo-mcp.log
```

### 7. Full Rebuild Process

**If nothing else works**:
```bash
# 1. Stop everything
docker-compose down
docker rm -f mismo-expert-mcp

# 2. Clean build
docker-compose build --no-cache

# 3. Start fresh
docker-compose up -d

# 4. Remove old MCP config
claude mcp remove mismo-expert

# 5. Add new config (NO 'stdio' prefix!)
claude mcp add mismo-expert "docker exec -i mismo-expert-mcp node src/server.js"

# 6. Restart Claude Code
```

## Verification Steps

After setup, verify everything works:

1. **Check MCP list**:
   ```bash
   claude mcp list
   # Should show mismo-expert without 'stdio' in command
   ```

2. **In Claude Code**, test with:
   - "Use the mismo expert tool to find bathroom fields"
   - "Query market condition fields using mismo expert"

3. **Check for proper response**:
   - Should see "I'll use the MISMO Expert tool..."
   - Should return actual field data, not errors

## Still Having Issues?

1. Check Docker logs: `docker logs mismo-expert-mcp --tail 50`
2. Verify XMI file exists: `docker exec mismo-expert-mcp ls -la data/`
3. Test database: `docker exec mismo-expert-mcp sqlite3 /app/db/mismo.db ".tables"`
4. Ensure Claude Code has Docker access: `docker version`

## Key Points to Remember

1. **Never use 'stdio' prefix** when adding MCP server
2. **Always restart Claude Code** after adding/modifying MCP tools
3. **Container must be running** before adding to Claude Code
4. **The server suppresses stderr** to ensure clean JSON-RPC communication
5. **Database is populated on first run** - this takes a few seconds