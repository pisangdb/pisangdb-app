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
  && CSS_REF="$(grep -REho '/assets/styles-[[:alnum:]_-]+\\.css' .output/server | head -n 1)" \
  && JS_REF="$(grep -REho '/assets/main-[[:alnum:]_-]+\\.js' .output/server | head -n 1)" \
  && test -n "$CSS_REF" \
  && test -f ".output/public$CSS_REF" \
  && test -n "$JS_REF" \
  && test -f ".output/public$JS_REF"

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
