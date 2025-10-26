# --- Builder (installs dev deps and builds if needed)
FROM node:20-alpine AS builder
WORKDIR /app

# Speed up installs by only copying manifests first
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Now bring in the source
COPY . .

# Run build if present (TypeScript transpile / bundlers). Using --if-present
# ensures the step exits successfully even if no build script is defined.
RUN npm run build --if-present

# --- Runtime (small, only runtime deps)
FROM node:20-alpine AS runtime

# Use /data as the runtime working directory (this is where downloads will be saved).
WORKDIR /data
RUN addgroup -S app && adduser -S app -G app

# Place the application code under /opt/app so a host-mounted /data won't hide
# the app files. Keep WORKDIR as /data so downloads default there.
ENV APP_DIR=/opt/app
RUN mkdir -p ${APP_DIR}

# Copy package manifests from the builder (to ensure consistent versions) and
# install production dependencies into /opt/app
COPY --from=builder /app/package*.json ${APP_DIR}/
RUN cd ${APP_DIR} && npm ci --omit=dev --no-audit --no-fund

# Copy built app artifacts into /opt/app
COPY --from=builder /app/dist ${APP_DIR}/dist
COPY --from=builder /app/bin ${APP_DIR}/bin

# Ensure proper ownership
RUN chown -R app:app /data ${APP_DIR}

# Make /data a docker volume so host can mount it easily
VOLUME ["/data"]

# Use the CLI entrypoint, referencing the app location outside of /data so
# a host mount won't hide the application files.
ENTRYPOINT ["node", "/opt/app/bin/xenforo-dl.js"]
CMD ["--help"]

USER app
