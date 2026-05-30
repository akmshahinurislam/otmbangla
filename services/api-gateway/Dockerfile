# Use Node.js 18 Alpine for a smaller image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy root package.json, pnpm workspace, turbo config, and pnpm lockfile
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./

# Copy the api-gateway source and its package.json
COPY services/api-gateway services/api-gateway

# Copy shared packages (needed for @qravy/shared and @qravy/config)
COPY packages packages

# Install pnpm globally
RUN npm install -g pnpm@9.4.0

# Install dependencies using frozen lockfile
RUN pnpm install --frozen-lockfile

# Build the api-gateway and its dependencies using Turbo
RUN pnpm turbo run build --filter=@qravy/api-gateway...

# Set working directory to the api-gateway service
WORKDIR /app/services/api-gateway

# Expose the port
EXPOSE 3002

# Start the service
CMD ["pnpm", "start"]
