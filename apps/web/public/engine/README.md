# Stockfish WASM (engine drop-in)

This directory is the runtime location of the Stockfish WASM build used by the
web app. **Do not commit a different chess engine here.**

The engine source of truth lives at the repository root (`engine/Stockfish/`,
mirrored from official-stockfish/Stockfish). The compiled WASM artifacts
(`stockfish.js`, `stockfish.wasm`, `stockfish.worker.js`) should be produced
from that source and dropped into this directory by the build pipeline.

The visual UI pass intentionally does **not** ship engine binaries here, so this
folder may be empty in the meantime. All engine calls in `apps/web/lib/engine.ts`
are stubbed with `// TODO: wire to root-level Stockfish WASM` comments.
