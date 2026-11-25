FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src/ ./src/

EXPOSE 3000

CMD ["npm", "run", "dev"]
