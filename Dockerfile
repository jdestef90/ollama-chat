# ==========================================
# Stage 1: Build Frontend Assets
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Backend Application
# ==========================================
FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY src/ ./src
RUN npm run build

# ==========================================
# Stage 3: Minimal Production Runtime
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    OLLAMA_BASE_URL=http://host.docker.internal:11434

COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled backend
COPY --from=backend-builder /app/dist ./dist

# Copy compiled frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
