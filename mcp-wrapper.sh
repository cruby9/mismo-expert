#!/bin/bash
# MCP wrapper script for MISMO Expert
exec docker exec -i mismo-expert-mcp node src/server.js 2>/dev/null