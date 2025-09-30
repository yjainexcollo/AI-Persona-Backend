# Use official Node.js LTS image
FROM node:18-alpine

# For sharp and native deps
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including dev dependencies needed for Prisma)
RUN npm ci

# Generate Prisma client for the target platform
RUN npx prisma generate

# Remove dev dependencies to reduce image size
RUN npm prune --omit=dev

# Copy application source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start: run DB migrations first (works on free tier, no pre-deploy needed)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
