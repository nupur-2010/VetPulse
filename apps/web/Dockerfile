FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY tsconfig*.json ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
