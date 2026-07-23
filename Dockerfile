# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/d76riders?schema=public
ARG NEXT_PUBLIC_MAPTILER_KEY=obC42hwWFOQLwRc1MEPO
ENV NEXT_PUBLIC_MAPTILER_KEY=$NEXT_PUBLIC_MAPTILER_KEY

# Google Analytics is deliberately NOT built in here. Don't copy the pattern
# above for it:
#
#   # ARG NEXT_PUBLIC_GA_ID=          <- do not do this
#   # ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
#
# NEXT_PUBLIC_* values are inlined into the client bundle at `next build`, so a
# measurement ID added here would be frozen into the image — changing or
# removing it would need a rebuild and a new tag. The root layout reads
# GA_MEASUREMENT_ID server-side at request time instead, which makes it a plain
# runtime setting.
#
# To turn analytics on: add GA_MEASUREMENT_ID to the d76riders-config ConfigMap
# in the infrastructure repo and restart the deployment. It is not a secret — a
# measurement ID is visible in page source by design. GA still loads only for
# riders who accept cookies.
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
ENV DATABASE_URL=
RUN --mount=type=cache,target=/app/.next/cache npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk upgrade --no-cache
RUN npm install -g prisma@7.8.0
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
RUN mkdir -p .next/cache && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
