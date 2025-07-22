#!/bin/bash

# MISMO Expert MCP Tool - Quick Setup Script

set -e

echo "🏠 MISMO Expert MCP Tool - Setup Script"
echo "======================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

if ! command -v claude &> /dev/null; then
    echo "⚠️  Claude Code CLI is not installed."
    echo "   You can still use the tool, but will need to configure it manually."
    CLAUDE_INSTALLED=false
else
    CLAUDE_INSTALLED=true
fi

echo "✅ Prerequisites checked"
echo ""

# Build and start the container
echo "Building Docker image..."
docker-compose build

echo ""
echo "Starting container..."
docker-compose up -d

# Wait for container to be ready
echo ""
echo "Waiting for container to be ready..."
sleep 3

# Check if container is running
if docker ps | grep -q mismo-expert-mcp; then
    echo "✅ Container is running"
else
    echo "❌ Container failed to start. Check logs with: docker logs mismo-expert-mcp"
    exit 1
fi

# Configure Claude Code if available
if [ "$CLAUDE_INSTALLED" = true ]; then
    echo ""
    echo "Configuring Claude Code..."
    
    # Get the current directory
    CURRENT_DIR=$(pwd)
    
    # Remove existing configuration if any
    claude mcp remove mismo-expert 2>/dev/null || true
    
    # Add the MCP server
    claude mcp add mismo-expert stdio "docker exec -i mismo-expert-mcp node src/server.js"
    
    echo "✅ Claude Code configured"
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "You can now use the MISMO Expert tool in Claude Code:"
    echo "  - 'Use mismo-expert to find kitchen fields'"
    echo "  - 'Ask mismo-expert about property types'"
    echo "  - 'Query mismo-expert to parse: 3BR/2BA ranch'"
else
    echo ""
    echo "🎉 Docker setup complete!"
    echo ""
    echo "To use with Claude Code, run:"
    echo "  claude mcp add mismo-expert stdio \"docker exec -i mismo-expert-mcp node src/server.js\""
fi

echo ""
echo "📚 For more information, see README.md"
echo "🧪 To run tests: node test-comprehensive.js"
echo "📊 To monitor: node monitor-dashboard.js"