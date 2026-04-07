# Recommended First Build Slice

## Recommendation

Build a BBG Wave 2 operator-safe control plane slice, not a generic multi-brand system.

## Scope

- Convert shared auth and Apps Script proxy utilities to TypeScript
- Add a typed Apps Script client with the currently known route contract
- Replace the stub dashboard with:
  - Run list
  - Create run form with BBG Wave 2 locked defaults
  - Run detail with preview and confirm panels
  - Config validation panel
- Keep segment editing read-only or minimally scoped until the exact Apps Script contract is confirmed
- Keep template support inspection-only for the first slice

## Why this slice first

- It directly advances milestone 1: BBG Wave 2 delivery
- It preserves Apps Script authority
- It avoids premature abstraction
- It gives operators safe visibility before adding more mutable surfaces

## Explicit non-goals for the first slice

- Rewriting the sender in Node
- Rebuilding workbook logic
- Generic brand wizard
- Optional Node preview or scheduler
- Any live-send path without dry-run QA blockers
