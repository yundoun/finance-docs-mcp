FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npx tsc

FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/ dist/
COPY data/ data/
COPY docs-mcp.config.ts ./

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.js", "--http"]
