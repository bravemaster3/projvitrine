# Public web container: the built React app served by nginx, which also
# forwards /api and /u/* to Django and serves uploaded media.
#
# The image contains no deployment settings: site URL, brand name and GitHub
# client id are written to /config.js when the container starts, so the same
# image (built once by GitHub Actions) runs anywhere.

FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS="--max_old_space_size=4096"
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
ENV BACKEND_UPSTREAM=backend:8000 \
    CANONICAL_HOST=""
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/30-runtime-config.sh /docker-entrypoint.d/30-runtime-config.sh
COPY nginx/40-canonical-host.sh /docker-entrypoint.d/40-canonical-host.sh
RUN chmod +x /docker-entrypoint.d/30-runtime-config.sh /docker-entrypoint.d/40-canonical-host.sh && mkdir -p /media
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
