# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Build-only placeholder so Prisma client init doesn't throw during page collection.
# Real value is set in the runner stage.
ENV DATABASE_URL="file:/tmp/build.db"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Drop devDependencies so the runtime stage gets a lean tree (prisma CLI stays — it's a prod dep here for migrate deploy at startup).
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat tini
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/data/tripify.db"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Full pruned node_modules — overrides the standalone's traced subset and supplies
# the Prisma CLI (with all its transitive deps) for `migrate deploy` at startup.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN mkdir -p /data && chown -R node:node /app /data
USER node

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
