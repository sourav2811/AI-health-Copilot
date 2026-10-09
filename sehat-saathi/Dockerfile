FROM node:22-bookworm-slim
WORKDIR /app
ENV CLOUDFLARE_CF_FETCH_ENABLED=false WRANGLER_SEND_METRICS=false WRANGLER_WRITE_LOGS=false
COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=dev --include=optional
COPY . .
RUN node scripts/run-framework.mjs build && mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 3000
CMD ["node", "scripts/docker-start.mjs"]
