FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache openssl curl

# Create app directory
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli 2>/dev/null || true

# Copy application code
COPY . .

# Build application
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Expose port
EXPOSE $PORT

# Start command
CMD ["npm", "run", "docker-start"]
