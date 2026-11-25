
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript into JavaScript
RUN npm run build

# Expose API port
EXPOSE 3000

# Start production server
CMD ["npm", "start"]
