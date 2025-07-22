#!/bin/bash
# Quick setup script for MISMO Expert MCP with Claude Code

echo "🏠 MISMO Expert MCP Setup for Claude Code"
echo "========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start the container
echo "📦 Building Docker container..."
docker-compose build

echo "🚀 Starting container..."
docker-compose up -d

# Wait for container to be ready
echo "⏳ Waiting for container to initialize..."
sleep 5

# Check if database was populated
DB_COUNT=$(docker exec mismo-expert-mcp sqlite3 /app/db/mismo.db "SELECT COUNT(*) FROM classes;" 2>/dev/null || echo "0")
if [ "$DB_COUNT" -lt 100 ]; then
    echo "⚠️  Database not fully populated. Waiting longer..."
    sleep 10
fi

# Remove any existing MCP configuration
echo "🔧 Configuring Claude Code..."
claude mcp remove mismo-expert 2>/dev/null || true

# Add the MCP server (WITHOUT 'stdio' prefix!)
claude mcp add mismo-expert "docker exec -i mismo-expert-mcp node src/server.js"

# Verify configuration
echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Configuration:"
claude mcp list | grep mismo-expert

echo ""
echo "🎯 Next steps:"
echo "1. Restart Claude Code"
echo "2. Test with: 'Use the mismo expert tool to find bathroom fields'"
echo ""
echo "📚 For troubleshooting, see TROUBLESHOOTING.md"