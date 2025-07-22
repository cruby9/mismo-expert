#!/bin/bash
# Debug wrapper to log MCP interactions

LOG_FILE="/tmp/mismo-mcp-debug.log"
echo "===== MCP Debug Session Started at $(date) =====" >> "$LOG_FILE"

# Function to log and pass through
log_and_pass() {
    while IFS= read -r line; do
        echo "[$(date +%H:%M:%S)] $1: $line" >> "$LOG_FILE"
        echo "$line"
    done
}

# Run the actual MCP server
exec docker exec -i mismo-expert-mcp node src/server.js 2>>"$LOG_FILE"