FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=3000
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable \
    && corepack prepare pnpm@9.7.0 --activate \
    && pnpm install --frozen-lockfile

COPY backend/requirements.txt backend/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r backend/requirements.txt

COPY . .
RUN pnpm build
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
