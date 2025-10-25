FROM node:lts-slim AS builder
WORKDIR /app

COPY ./src ./src
COPY ./package.json tsconfig.json yarn.lock .yarn .yarnrc.yml ./

RUN corepack enable
RUN yarn install --immutable && yarn run build

FROM node:lts-slim
WORKDIR /app 

COPY --from=builder /app/build ./build
COPY ./templates ./templates
COPY ./package.json yarn.lock load-env.mjs .yarn .yarnrc.yml ./

RUN corepack enable
RUN yarn workspaces focus

ENTRYPOINT [ "node", "-r", "./load-env.mjs", "./build/main.js" ]