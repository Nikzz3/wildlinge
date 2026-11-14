# Download website: website/ + browser build of the game (play/), served by Caddy.
# Built by Railway on every push to master (see .railway/railway.ts). Build context is the repo root.
FROM node:24-slim AS build
WORKDIR /app
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
ARG RAILWAY_GIT_COMMIT_SHA
RUN npm run site

FROM caddy:2-alpine
COPY website/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/_site /srv
