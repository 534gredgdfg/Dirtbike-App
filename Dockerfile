# Redline Garage — zero npm dependencies (uses Node's built-in SQLite)
FROM node:22-alpine
RUN apk add --no-cache tzdata
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY public ./public
ENV NODE_ENV=production PORT=8250 DATA_DIR=/app/data
VOLUME ["/app/data"]
EXPOSE 8250
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://127.0.0.1:8250/healthz >/dev/null || exit 1
CMD ["node", "--no-warnings", "server/server.js"]
