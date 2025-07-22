#!/bin/bash

echo "🔍 MISMO Expert MCP Server Monitor"
echo "=================================="
echo ""

# Function to show container status
show_status() {
    echo "📊 Container Status:"
    docker ps --filter name=mismo-expert-mcp --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
}

# Function to show resource usage
show_resources() {
    echo "💻 Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" mismo-expert-mcp
    echo ""
}

# Function to tail logs
tail_logs() {
    echo "📜 Recent Logs:"
    docker logs --tail 20 mismo-expert-mcp 2>&1 | grep -v "^$"
    echo ""
}

# Main monitoring loop
while true; do
    clear
    date "+%Y-%m-%d %H:%M:%S"
    echo "=================================="
    
    show_status
    show_resources
    tail_logs
    
    echo "Press Ctrl+C to exit. Refreshing in 5 seconds..."
    sleep 5
done