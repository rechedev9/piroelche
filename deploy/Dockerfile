# Build context is the repository root (see compose.yaml); .dockerignore keeps
# node_modules, build directories, tests and env files out of the image.
FROM node:24-alpine AS builder
WORKDIR /build
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# pnpm applies the dependency patches listed in pnpm-workspace.yaml on install.
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .

# next.config.ts evaluates these at build time (canonical URL, robots header),
# so they must be present here and not only at runtime.
ARG PIROBOOM_SITE_URL
ARG PIROBOOM_PUBLIC_SITE=0
ENV PIROBOOM_SITE_URL=${PIROBOOM_SITE_URL} \
    PIROBOOM_PUBLIC_SITE=${PIROBOOM_PUBLIC_SITE} \
    PIROBOOM_DEMO=0 \
    PIROBOOM_LOCAL_REVIEW=0 \
    CATALOGUE_SYNC_ENABLED=0 \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# output: "standalone" leaves static assets and public/ outside the traced
# bundle, so they are copied in beside it.
COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static
COPY --from=builder /build/public ./public

RUN mkdir -p /app/.next/cache && chown -R node:node /app/.next/cache

USER node
EXPOSE 3000
CMD ["node", "server.js"]
