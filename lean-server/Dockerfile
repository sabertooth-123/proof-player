# Lean server for Proof Player's live "Open .lean file".
# Build from the repo root:   docker build -f lean-server/Dockerfile -t proof-player-lean .
# Run:                        docker run --rm -p 7860:7860 proof-player-lean
# On Hugging Face Spaces the same files are uploaded with this Dockerfile at the top level
# (npm run space builds that folder).
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

# Hugging Face runs containers as UID 1000, which is the image's `node` user.
USER node
ENV HOME=/home/node \
    PATH=/home/node/.elan/bin:$PATH

# Same Lean version the committed traces were made with.
RUN curl -sSfL https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh \
    | sh -s -- -y --no-modify-path --default-toolchain leanprover/lean4:v4.35.0 \
  && lean --version

WORKDIR /home/node/app
COPY --chown=node scripts/extract-traces.mjs scripts/lean-api.mjs scripts/
COPY --chown=node lean-server/server.mjs lean-server/

ENV PORT=7860 NODE_ENV=production
EXPOSE 7860
CMD ["node", "lean-server/server.mjs"]
