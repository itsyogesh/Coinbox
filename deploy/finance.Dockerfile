FROM node:22-bookworm-slim AS web
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/chains packages/chains
COPY apps/desktop apps/desktop
RUN pnpm install --frozen-lockfile && pnpm build

FROM rust:1.93-bookworm AS server
WORKDIR /src
RUN apt-get update && apt-get install -y --no-install-recommends libssl-dev pkg-config && rm -rf /var/lib/apt/lists/*
COPY packages/finance packages/finance
COPY apps/finance-server apps/finance-server
RUN cargo build --locked --release --manifest-path apps/finance-server/Cargo.toml

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl3 poppler-utils tesseract-ocr tesseract-ocr-eng && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 coinbox && useradd --uid 10001 --gid 10001 --no-create-home coinbox \
    && install -d -m 0700 -o coinbox -g coinbox /data
COPY --from=web /src/apps/desktop/dist /opt/coinbox/web
COPY --from=server /src/apps/finance-server/target/release/coinbox-finance-server /usr/local/bin/
USER 10001:10001
ENV COINBOX_SERVER_DIR=/data COINBOX_WEB_DIST=/opt/coinbox/web COINBOX_SERVER_BIND=0.0.0.0:8787
EXPOSE 8787
ENTRYPOINT ["coinbox-finance-server"]
