FROM node:20-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ sqlite

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY src/ ./src/
COPY data/ ./data/

# Create directory for parsed database
RUN mkdir -p /app/db

# Pre-parse the XMI file on build (optional - can be done at runtime)
# RUN npm run parse-xmi

# Expose MCP stdio interface
EXPOSE 8080

# Make test script executable
RUN chmod +x test-server.js || true

# Default to running the MCP server
CMD ["node", "src/server.js"]

# For testing without MCP:
# CMD ["node", "test-server.js"]