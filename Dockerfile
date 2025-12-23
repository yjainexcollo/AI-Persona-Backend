# Use Debian-based Node image
FROM node:20-bullseye-slim

# Install required libs
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Prune dev dependencies
RUN npm prune --omit=dev

# Copy application source
COPY . .

EXPOSE 3000

# Start app directly without migrations
CMD ["npm", "run", "start"]