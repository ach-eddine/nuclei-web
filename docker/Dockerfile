# ─── Stage 1: Build Frontend ───
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Final Image ───
FROM docker.elastic.co/elasticsearch/elasticsearch:8.12.2

USER root

# Install system deps
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    unzip \
    supervisor \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Nuclei
RUN curl -sSL https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_$(curl -s https://api.github.com/repos/projectdiscovery/nuclei/releases/latest | grep tag_name | cut -d '"' -f 4 | sed 's/v//')_linux_amd64.zip -o /tmp/nuclei.zip \
    && unzip /tmp/nuclei.zip -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/nuclei \
    && rm /tmp/nuclei.zip

# ─── Backend ───
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/ ./

# ─── Frontend (built) ───
COPY --from=frontend-builder /build/frontend/dist /app/frontend/dist

# ─── Nginx config (serve frontend) ───
RUN rm /etc/nginx/sites-enabled/default
COPY docker/nginx.conf /etc/nginx/sites-enabled/nuclei-dashboard

# ─── Supervisord ───
COPY docker/supervisord.conf /etc/supervisor/conf.d/nuclei-dashboard.conf

# ─── Entrypoint ───
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Elasticsearch config: single-node, disable security for simplicity
ENV discovery.type=single-node
ENV xpack.security.enabled=false
ENV ES_JAVA_OPTS="-Xms512m -Xmx512m"
ENV ES_NODE=http://localhost:9200

# Declare persistent volumes
VOLUME /usr/share/elasticsearch/data
VOLUME /root/.local/nuclei-templates

EXPOSE 8080 3001 9200

ENTRYPOINT ["/entrypoint.sh"]
