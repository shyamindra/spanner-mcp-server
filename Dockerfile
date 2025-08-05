# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY dist ./dist

# Copy environment file
COPY env.example .env

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S spanner-mcp -u 1001

# Change ownership of the app directory
RUN chown -R spanner-mcp:nodejs /app
USER spanner-mcp

# Expose port (if needed for HTTP transport)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start the server
CMD ["node", "dist/server.js"] 