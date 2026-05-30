# Use Node.js 20 Alpine for a smaller image and native File support
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package.json, pnpm workspace, turbo config, and pnpm lockfile
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./

# Copy the webscrap source and its package.json
COPY services/webscrap-service services/webscrap-service

# Copy shared packages (needed for @qravy/shared and @qravy/config)
COPY packages packages

# Install pnpm globally
RUN npm install -g pnpm@9.4.0

# Install dependencies using frozen lockfile
RUN pnpm install --frozen-lockfile

# Build the webscrap and its dependencies using Turbo
RUN pnpm turbo run build --filter=@qravy/webscrap-service...

# Set working directory to the webscrap service
WORKDIR /app/services/webscrap-service

# Expose the port
EXPOSE 3003

# Start the service
CMD ["pnpm", "start"]
