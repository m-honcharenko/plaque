# syntax=docker/dockerfile:1

FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:1-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/dist ./dist
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD bun -e "const r = await fetch('http://127.0.0.1:' + process.env.PORT + '/health'); process.exit(r.ok ? 0 : 1)"
CMD ["bun", "dist/main.js"]
