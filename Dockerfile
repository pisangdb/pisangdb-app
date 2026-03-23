# ─────────────────────────────────────────────────────────────
# Stage 1: Builder
# Install deps + build the TanStack Start / Nitro app
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package manifests first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy the rest of the source
COPY . .

# Build from a clean generated-state baseline, then verify the SSR bundle only
# references assets that actually exist in the final public output.
RUN rm -rf .output .tanstack node_modules/.nitro node_modules/.vite \
  && pnpm build \
  && grep -RhoE '/assets/[[:alnum:]_.-]+\.[[:alnum:]]+' .output/server \
    | sed 's#^/assets/##' \
    | sort -u > /tmp/server-assets.txt \
  && test -s /tmp/server-assets.txt \
  && ls -1 .output/public/assets | sort -u > /tmp/public-assets.txt \
  && comm -23 /tmp/server-assets.txt /tmp/public-assets.txt > /tmp/missing-assets.txt \
  && if [ -s /tmp/missing-assets.txt ]; then \
    echo "Missing built assets:" >&2; \
    cat /tmp/missing-assets.txt >&2; \
    exit 1; \
  fi

# ─────────────────────────────────────────────────────────────
# Stage 2: Runner
# Lean production image — only the built output + prod deps
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package manifests
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy the built output from the builder stage
COPY --from=builder /app/.output ./.output

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs pisang
USER pisang

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", ".output/server/index.mjs"]
