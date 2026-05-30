# Use Node.js 18 Alpine for a smaller image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy root package.json, pnpm workspace, turbo config, and pnpm lockfile
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./

# Copy the auth source and its package.json
COPY services/auth-service services/auth-service

# Copy shared packages (needed for @qravy/shared and @qravy/config)
COPY packages packages

# Install pnpm globally
RUN npm install -g pnpm@9.4.0

# Install dependencies using frozen lockfile
RUN pnpm install --frozen-lockfile

# Build the auth and its dependencies using Turbo
RUN pnpm turbo run build --filter=@qravy/auth-service...

# Set working directory to the auth service
WORKDIR /app/services/auth-service

# Expose the port
EXPOSE 3001

# Start the service
CMD ["pnpm", "start"]
