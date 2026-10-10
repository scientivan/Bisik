# Bisik API server + keeper (Railway). One image, role chosen by BISIK_ROLE=server|keeper.
FROM node:24-slim
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/server ./apps/server
COPY services/keeper ./services/keeper
RUN pnpm install --frozen-lockfile --filter @bisik/server... --filter @bisik/keeper... \
 && pnpm --filter @bisik/shared --filter @bisik/zk --filter @bisik/veritas --filter @bisik/sdk run build
ENV NODE_ENV=production SERVER_DB_PATH=/data/bisik.sqlite
EXPOSE 8787
CMD ["sh", "-c", "if [ \"$BISIK_ROLE\" = keeper ]; then cd services/keeper && exec npx tsx src/index.ts; else cd apps/server && exec npx tsx src/index.ts; fi"]
