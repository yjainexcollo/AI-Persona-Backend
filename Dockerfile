# Use Debian-based Node image
FROM node:20-bullseye-slim

# Install required libs
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files first (for better layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies (skip dev deps to speed up build)
# Use --ignore-scripts to prevent postinstall from running (we'll generate Prisma manually)
RUN npm ci --only=production --ignore-scripts

# Generate Prisma client (only once, not in postinstall)
RUN npx prisma generate

# Copy application source (do this after npm install for better caching)
COPY . .

EXPOSE 3000

# Start app directly without migrations
CMD ["npm", "run", "start"]