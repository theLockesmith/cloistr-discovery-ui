# Build stage
FROM node:22.23.3-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build

# Production stage - serve with nginx (unprivileged for OpenShift)
FROM nginxinc/nginx-unprivileged:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config is a template: the base image substitutes CLOISTR_* vars at
# start (filter keeps nginx's own $uri etc. untouched) and writes /config.js.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Production defaults: an unconfigured container behaves exactly like production.
ENV CLOISTR_RELAY_URL=wss://relay.cloistr.xyz \
    CLOISTR_SIGNER_URL=https://signer.cloistr.xyz \
    CLOISTR_BLOSSOM_URL=https://files.cloistr.xyz \
    CLOISTR_DISCOVERY_URL=https://discover.cloistr.xyz \
    CLOISTR_APP_URL=https://discover.cloistr.xyz \
    CLOISTR_ENVIRONMENT=production \
    NGINX_ENVSUBST_FILTER=^CLOISTR_

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
