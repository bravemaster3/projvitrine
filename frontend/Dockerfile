# Public web container: the built React app served by nginx, which also
# forwards /api to Django and serves uploaded media.

FROM node:22-alpine AS build
WORKDIR /app

# Build-time configuration (Vite inlines VITE_* variables into the bundle).
ARG VITE_API_URL=""
ARG VITE_SITE_URL=""
ARG VITE_FRONTEND_URL=""
ARG VITE_GITHUB_CLIENT_ID=""
ARG VITE_BRAND_NAME="Showcase"
ARG VITE_DEFAULT_LANG="en"
ARG VITE_LANGS="en,fr,sv"
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_FRONTEND_URL=$VITE_FRONTEND_URL \
    VITE_GITHUB_CLIENT_ID=$VITE_GITHUB_CLIENT_ID \
    VITE_BRAND_NAME=$VITE_BRAND_NAME \
    VITE_DEFAULT_LANG=$VITE_DEFAULT_LANG \
    VITE_LANGS=$VITE_LANGS \
    NODE_OPTIONS="--max_old_space_size=4096"

COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
ENV BACKEND_UPSTREAM=backend:8000 \
    CANONICAL_HOST=""
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/40-canonical-host.sh /docker-entrypoint.d/40-canonical-host.sh
RUN chmod +x /docker-entrypoint.d/40-canonical-host.sh && mkdir -p /media
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
