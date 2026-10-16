FROM node:24-alpine AS development

WORKDIR /workspace/api
RUN npm install --global pnpm@11

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY scripts ./scripts
COPY src ./src
RUN pnpm run build && chown -R node:node /workspace/api

USER node
ENV NODE_ENV=development PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "pnpm run db:migrate && pnpm run start:dev"]

FROM node:24-alpine AS build

WORKDIR /app
RUN npm install --global pnpm@11

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm run build && pnpm prune --prod

FROM node:24-alpine

ENV NODE_ENV=production PORT=3000
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000

CMD ["sh", "-c", "node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js && node dist/main.js"]
