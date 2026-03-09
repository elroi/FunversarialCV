#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/frontend"

echo "[pre-push] Running unit tests (npm test)…"
npm test

echo "[pre-push] Running lint (npm run lint)…"
npm run lint

# Optional: run E2E smoke tests on critical branches only.
# Example pattern: feature/*-critical
BRANCH_NAME="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD || echo "")"
if [[ "$BRANCH_NAME" =~ ^feature/.*-critical$ ]]; then
  echo "[pre-push] Critical branch detected ($BRANCH_NAME); running E2E smoke tests…"
  npx playwright test e2e/specs/smoke.spec.ts e2e/specs/happy-path.spec.ts
fi

echo "[pre-push] All checks passed."

