FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create app directory with non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    # Clean npm cache to reduce image size
    npm cache clean --force

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Set NODE_OPTIONS for optimized container performance
ENV NODE_OPTIONS="--max-old-space-size=256 --max-http-header-size=16384"

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Health check configuration
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]