FROM node:20-bookworm-slim

# Prisma's query engine needs OpenSSL at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (dev deps are needed to compile TypeScript).
COPY package*.json ./
RUN npm ci

# Generate the Prisma client against the schema.
COPY prisma ./prisma
RUN npx prisma generate

# Compile TypeScript to dist/.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Apply pending migrations on boot, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
