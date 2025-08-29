# Use official Node.js LTS image
FROM node:18-alpine

# For sharp and native deps
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /usr/src/app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
