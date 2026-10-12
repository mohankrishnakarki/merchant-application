# ==========================================
# Stage 1: Install dependencies
# ==========================================
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./

RUN npm ci


# ==========================================
# Stage 2: Build application
# ==========================================
FROM dependencies AS builder

WORKDIR /app

COPY . .

RUN npm run build


# ==========================================
# Stage 3: Production image
# ==========================================
FROM node:22-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force

# Copy compiled application
COPY --from=builder /app/dist ./dist

# Run as non-root user
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]