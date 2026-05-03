#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# scripts/build-stockfish-wasm.sh
#
# Build the upstream Stockfish C++ source (engine/Stockfish) to WebAssembly
# using Emscripten, and drop the artifacts into apps/web/public/engine/.
#
#   - Idempotent: skips rebuild if outputs are newer than the source tree.
#   - Auto-installs emsdk under engine/emsdk/ (gitignored).
#   - Pinned Emscripten version: see EMSDK_VERSION below.
#
# Usage:
#   pnpm engine:build           # via root package.json
#   bash scripts/build-stockfish-wasm.sh
#
# Force a rebuild:
#   bash scripts/build-stockfish-wasm.sh --force
# ---------------------------------------------------------------------------

set -euo pipefail

# ---- locate the repo root ------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENGINE_SRC="${REPO_ROOT}/engine/Stockfish/src"
EMSDK_DIR="${REPO_ROOT}/engine/emsdk"
OUT_DIR="${REPO_ROOT}/apps/web/public/engine"

EMSDK_VERSION="3.1.61"

# ---- argument handling ---------------------------------------------------
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=1 ;;
    --help|-h)
      sed -n '2,21p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

# ---- terminal colors -----------------------------------------------------
if [ -t 1 ]; then
  C_INFO=$'\033[1;34m'; C_OK=$'\033[1;32m'; C_WARN=$'\033[1;33m'
  C_ERR=$'\033[1;31m'; C_DIM=$'\033[2m'; C_RESET=$'\033[0m'
else
  C_INFO=""; C_OK=""; C_WARN=""; C_ERR=""; C_DIM=""; C_RESET=""
fi
log()  { printf "%s[engine]%s %s\n" "${C_INFO}" "${C_RESET}" "$*"; }
ok()   { printf "%s[engine]%s %s\n" "${C_OK}"   "${C_RESET}" "$*"; }
warn() { printf "%s[engine]%s %s\n" "${C_WARN}" "${C_RESET}" "$*"; }
err()  { printf "%s[engine]%s %s\n" "${C_ERR}"  "${C_RESET}" "$*" >&2; }

# ---- sanity: Stockfish source must exist ---------------------------------
if [ ! -d "${ENGINE_SRC}" ] || [ ! -f "${ENGINE_SRC}/Makefile" ]; then
  err "Stockfish source not found at ${ENGINE_SRC}."
  err "This monorepo expects the upstream source at engine/Stockfish/."
  exit 1
fi

# ---- idempotence check ---------------------------------------------------
need_build=1
OUT_JS="${OUT_DIR}/stockfish.js"
OUT_WASM="${OUT_DIR}/stockfish.wasm"

if [ "${FORCE}" -eq 0 ] && [ -f "${OUT_JS}" ] && [ -f "${OUT_WASM}" ]; then
  newest_src=$(find "${ENGINE_SRC}" -type f \
    \( -name "*.cpp" -o -name "*.h" -o -name "Makefile" \) \
    -print0 2>/dev/null | xargs -0 stat -f "%m" 2>/dev/null \
      | sort -nr | head -n 1 || true)
  if [ -z "${newest_src}" ]; then
    # GNU stat fallback (Linux)
    newest_src=$(find "${ENGINE_SRC}" -type f \
      \( -name "*.cpp" -o -name "*.h" -o -name "Makefile" \) \
      -printf "%T@\n" 2>/dev/null | sort -nr | head -n 1 || true)
  fi
  newest_out=$(stat -f "%m" "${OUT_JS}" 2>/dev/null || stat -c "%Y" "${OUT_JS}" 2>/dev/null || echo 0)
  if [ -n "${newest_src}" ] && [ "${newest_out%.*}" -ge "${newest_src%.*}" ]; then
    ok "WASM artifacts are newer than source — skipping rebuild."
    log "  ${C_DIM}${OUT_JS}${C_RESET}"
    log "  ${C_DIM}${OUT_WASM}${C_RESET}"
    log "  pass --force to rebuild anyway."
    exit 0
  fi
fi

# ---- install / activate emsdk -------------------------------------------
if [ ! -d "${EMSDK_DIR}" ]; then
  log "Cloning emsdk ${EMSDK_VERSION} into ${EMSDK_DIR}"
  git clone --depth 1 https://github.com/emscripten-core/emsdk.git "${EMSDK_DIR}"
fi

pushd "${EMSDK_DIR}" >/dev/null

if [ ! -f "${EMSDK_DIR}/upstream/emscripten/emcc" ]; then
  log "Installing emscripten ${EMSDK_VERSION} (this may take a while)..."
  ./emsdk install "${EMSDK_VERSION}"
  ./emsdk activate "${EMSDK_VERSION}"
fi

# shellcheck disable=SC1091
source ./emsdk_env.sh > /dev/null
popd >/dev/null

if ! command -v emcc >/dev/null 2>&1; then
  err "emcc not on PATH after activating emsdk — aborting."
  exit 1
fi
log "Using emcc: $(emcc --version | head -n1)"

mkdir -p "${OUT_DIR}"

# ---- build ---------------------------------------------------------------
# We try Stockfish's own WASM Makefile target first; if that's not available,
# fall back to a manual emcc invocation that links the existing object files.
pushd "${ENGINE_SRC}" >/dev/null

EMCC_FLAGS=(
  "-O3"
  "-msimd128"
  "-s" "WASM=1"
  "-s" "ALLOW_MEMORY_GROWTH=1"
  "-s" "EXPORT_NAME=Stockfish"
  "-s" "ENVIRONMENT=worker"
  "-s" "MODULARIZE=1"
  "-s" "EXPORT_ES6=0"
  "-s" "INVOKE_RUN=0"
  "-s" "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','stringToUTF8']"
)

JOBS="$(getconf _NPROCESSORS_ONLN 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)"

build_via_makefile() {
  log "Trying Stockfish Makefile target: emscripten_build"
  emmake make -j"${JOBS}" \
    ARCH=wasm-simd-postmvp \
    COMP=emcc \
    EXE=stockfish.js \
    EMCC="emcc" \
    EMCXX="em++" \
    emscripten_build 2>/dev/null
}

build_manual() {
  warn "Falling back to manual emcc link (no emscripten_build target)."
  emmake make clean >/dev/null 2>&1 || true
  CXX="em++" CC="emcc" \
    emmake make -j"${JOBS}" \
    ARCH=wasm-simd-postmvp \
    COMP=emcc \
    build || true

  # Manual final link if the Makefile produced a non-WASM binary or none.
  if [ ! -f "stockfish.js" ]; then
    log "Linking object files directly with emcc..."
    # shellcheck disable=SC2046
    em++ "${EMCC_FLAGS[@]}" -o stockfish.js \
      $(find . -maxdepth 1 -name "*.o" -print)
  fi
}

if ! build_via_makefile; then
  build_manual
fi

if [ ! -f "stockfish.js" ] || [ ! -f "stockfish.wasm" ]; then
  err "Build did not produce stockfish.js + stockfish.wasm."
  err "Inspect ${ENGINE_SRC} for partial output and retry with --force."
  exit 1
fi

popd >/dev/null

# ---- copy artifacts ------------------------------------------------------
log "Copying artifacts to ${OUT_DIR}"
cp -f "${ENGINE_SRC}/stockfish.js"   "${OUT_DIR}/stockfish.js"
cp -f "${ENGINE_SRC}/stockfish.wasm" "${OUT_DIR}/stockfish.wasm"

if [ -f "${ENGINE_SRC}/stockfish.worker.js" ]; then
  cp -f "${ENGINE_SRC}/stockfish.worker.js" "${OUT_DIR}/stockfish.worker.js"
fi

ok "Stockfish WASM built successfully."
ls -lh "${OUT_DIR}" | sed "s/^/  ${C_DIM}/" | sed "s/$/${C_RESET}/"
