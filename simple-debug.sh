#!/bin/bash
echo "[DEBUG] MCP Server starting at $(date)" >> /tmp/mismo-debug.txt
echo "[DEBUG] Arguments: $@" >> /tmp/mismo-debug.txt
echo "[DEBUG] Environment:" >> /tmp/mismo-debug.txt
env | grep -E "(PATH|USER|HOME)" >> /tmp/mismo-debug.txt

# Try to capture any input
if [ -t 0 ]; then
    echo "[DEBUG] Terminal input detected" >> /tmp/mismo-debug.txt
else
    echo "[DEBUG] Pipe input detected" >> /tmp/mismo-debug.txt
fi

# Run the actual command
docker exec -i mismo-expert-mcp node src/server.js 2>>/tmp/mismo-debug.txt