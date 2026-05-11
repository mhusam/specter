# ── Stage 1: build the Vite frontend ────────────────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /app

# Install pnpm
RUN corepack enable

# Install dependencies first (cached unless lockfile changes)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build   # outputs to /app/dist

# ── Stage 2: production server ───────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

RUN corepack enable

# Install only production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy backend source
COPY server/ ./server/

# Copy built frontend from stage 1
COPY --from=frontend-build /app/dist ./dist

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
