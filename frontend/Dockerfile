# Debian, not Alpine: better-sqlite3 and the Prisma schema engine ship glibc builds.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Compilers only in case the better-sqlite3 prebuilt binary cannot be fetched.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# postinstall runs `prisma generate`, which needs the schema copied above.
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public values are baked into the browser bundle at build time.
ARG SITE_URL=http://localhost:8080
ARG VITE_ADSENSE_CLIENT_ID=
ARG VITE_ADSENSE_ENABLED=
ARG VITE_ADSENSE_MODE=manual
ARG VITE_ADSENSE_REQUIRE_CONSENT=true
ARG VITE_ADSENSE_SLOT_HEADER=
ARG VITE_ADSENSE_SLOT_WORKSPACE=
ARG VITE_ADSENSE_SLOT_MID=
ARG VITE_ADSENSE_SLOT_FOOTER=
ENV SITE_URL=$SITE_URL \
    NEXT_PUBLIC_ADSENSE_CLIENT_ID=$VITE_ADSENSE_CLIENT_ID \
    NEXT_PUBLIC_ADSENSE_ENABLED=$VITE_ADSENSE_ENABLED \
    NEXT_PUBLIC_ADSENSE_MODE=$VITE_ADSENSE_MODE \
    NEXT_PUBLIC_ADSENSE_REQUIRE_CONSENT=$VITE_ADSENSE_REQUIRE_CONSENT \
    NEXT_PUBLIC_ADSENSE_SLOT_HEADER=$VITE_ADSENSE_SLOT_HEADER \
    NEXT_PUBLIC_ADSENSE_SLOT_WORKSPACE=$VITE_ADSENSE_SLOT_WORKSPACE \
    NEXT_PUBLIC_ADSENSE_SLOT_MID=$VITE_ADSENSE_SLOT_MID \
    NEXT_PUBLIC_ADSENSE_SLOT_FOOTER=$VITE_ADSENSE_SLOT_FOOTER \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# The Prisma CLI for `migrate deploy` at start-up. The app's standalone bundle
# does not include it, so it lives apart in /migrator, pinned to the lockfile.
FROM node:22-bookworm-slim AS migrator
WORKDIR /migrator
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package-lock.json /tmp/package-lock.json
RUN npm init -y >/dev/null \
    && npm install --no-audit --no-fund \
        "prisma@$(node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version")" \
        "dotenv@$(node -p "require('/tmp/package-lock.json').packages['node_modules/dotenv'].version")"
COPY prisma.config.ts ./
COPY prisma ./prisma

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/solva.db \
    NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data \
    && chown node:node /data
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=migrator --chown=node:node /migrator /migrator
COPY --chmod=755 solva-entrypoint.sh /usr/local/bin/solva-entrypoint.sh
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:8080/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["solva-entrypoint.sh"]
CMD ["node", "server.js"]
