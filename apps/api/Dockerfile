
FROM node:18-bookworm-slim

WORKDIR /app

# Install OpenSSL required by Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma/ ./prisma/

# Generate Prisma client for this Linux environment
RUN npx prisma generate

# Copy TypeScript configuration and source
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

EXPOSE 3000

# Start production server
CMD ["npm", "start"]