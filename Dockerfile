# Multi-stage Dockerfile for VoiceForge Studio
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package manifests
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
RUN npm install
RUN npm --prefix client install
RUN npm --prefix server install

# Copy source code
COPY client ./client
COPY server ./server
COPY shared ./shared

# Build frontend and backend
RUN npm --prefix client run build
RUN npm --prefix server run build

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies for server
COPY package.json ./
COPY server/package.json ./server/
RUN npm --prefix server install --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist

# Ensure temporary storage directory exists
RUN mkdir -p /app/temp_storage

EXPOSE 5000

CMD ["node", "server/dist/server/src/index.js"]
