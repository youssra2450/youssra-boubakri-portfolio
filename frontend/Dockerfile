# syntax=docker/dockerfile:1
#
# Portfolio website: React + TypeScript built by Vite, served by nginx (SPA fallback, caching, security
# headers, reverse proxy of /api, /robots.txt and /sitemap.xml to the backend service).
#
# Build context = frontend/ :
#     docker build --build-arg VITE_SITE_URL=https://your-domain.example -t portfolio-web frontend

# ---------------------------------------------------------------------------------------------------------
# 1. Build the static site
# ---------------------------------------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Public URL of the site (canonical link, Open Graph tags, JSON-LD) and API base path (same origin via nginx).
ARG VITE_SITE_URL=http://localhost:8080
ARG VITE_API_BASE_URL=/api
ENV VITE_SITE_URL=${VITE_SITE_URL} \
    VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ---------------------------------------------------------------------------------------------------------
# 2. Serve it with nginx
# ---------------------------------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="portfolio-web" \
      org.opencontainers.image.description="Website of Youssra Boubakri's professional portfolio (React + nginx)"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
