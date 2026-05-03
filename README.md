# Aleo — Chess Royale

A monorepo for **Aleo — Chess Royale**, a competitive multiplayer web chess
app with the upstream [Stockfish](https://github.com/official-stockfish/Stockfish)
engine compiled to WebAssembly.

## Layout

```
.
├── apps/
│   └── web/                 # Next.js 14 App Router app (Aleo Chess Royale UI)
├── engine/
│   ├── Stockfish/           # Upstream official-stockfish/Stockfish source
│   └── emsdk/               # Emscripten SDK (gitignored, installed by build)
├── infra/
│   └── supabase/            # Migrations, seed, edge functions (later)
├── packages/
│   └── shared/              # Shared TS types & chess utilities
├── scripts/
│   └── build-stockfish-wasm.sh
├── package.json             # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .editorconfig
├── .nvmrc                   # Node 20
└── README.md
```

## Prerequisites

- **Node 20** (use `nvm use` — `.nvmrc` is committed)
- **pnpm 9+** — the only supported package manager (`packageManager` is
  pinned in the root `package.json`)
- A C++ toolchain (`make`, `git`) for Stockfish compilation. The
  `engine:build` script installs Emscripten on demand.

```sh
# Install pnpm if you don't already have it:
corepack enable && corepack prepare pnpm@9.7.0 --activate
# or:
npm install -g pnpm
```

## Bootstrapping

```sh
nvm use            # picks Node 20 from .nvmrc
pnpm install       # installs all workspaces
```

## Build the Stockfish engine to WebAssembly

The compiled artifacts live at `apps/web/public/engine/` and are gitignored
(they're regenerated on every machine).

```sh
pnpm engine:build           # idempotent, skips if WASM is newer than source
pnpm engine:build --force   # force a clean rebuild
```

The script `scripts/build-stockfish-wasm.sh`:

1. Clones [emsdk](https://github.com/emscripten-core/emsdk) into
   `engine/emsdk/` (gitignored) on first run and installs a pinned
   Emscripten version.
2. Builds `engine/Stockfish/` via the upstream `Makefile` with
   `ARCH=wasm-simd-postmvp` and `COMP=emcc`. Falls back to a manual
   `em++` link if the upstream Makefile lacks an `emscripten_build` target.
3. Copies `stockfish.js` (glue) and `stockfish.wasm` to
   `apps/web/public/engine/`.

> The Stockfish source under `engine/Stockfish/` is **never modified**
> by this build. We only invoke its existing Makefile.

## Run the web app

```sh
pnpm --filter web dev
```

Open <http://localhost:3000>.

For the engine smoke test:

<http://localhost:3000/engine-test>

This page spawns one Stockfish Web Worker, sends `position startpos moves e2e4`
+ `go depth 12`, and prints the bestmove on screen.

## Useful scripts

| Script              | What                                            |
| ------------------- | ----------------------------------------------- |
| `pnpm dev`          | Run the web app in dev mode                     |
| `pnpm build`        | Build every workspace                           |
| `pnpm lint`         | Lint every workspace                            |
| `pnpm typecheck`    | `tsc --noEmit` across every workspace           |
| `pnpm engine:build` | Build Stockfish → WASM into `apps/web/public/engine/` |
| `pnpm format`       | Prettier-write everything                       |

## Stockfish licensing

Stockfish is GPL-3.0. See `engine/Stockfish/Copying.txt`. The web app
distributes the compiled WASM artifacts at runtime; ensure your deployment
satisfies the GPL.

## Anti-pattern guard

- Do **not** add another chess engine package. The single source of truth
  is `engine/Stockfish/` + the WASM build script.
- Do **not** modify files inside `engine/Stockfish/` other than to commit
  them at this path; pull upstream updates by re-syncing the directory.
