# TypeScript Service Layer Plan

## Goal

Refactor the current thin JavaScript proxy into a typed service layer without changing Apps Script authority.

## Proposed layering

### Layer 1. Auth and session guards
- Keep NextAuth
- Keep `requireAdmin` and `requireViewerOrAdmin`
- Migrate to TypeScript first, behavior unchanged

### Layer 2. Transport client
- `lib/apps-script/client.ts`
- HMAC signing
- Envelope creation
- HTTP transport
- JSON parse normalization

### Layer 3. Domain services
- `services/runs.ts`
- `services/segments.ts`
- `services/templates.ts`
- `services/event-log.ts`
- `services/config.ts`

These services should:
- Validate local inputs
- Call the typed client
- Normalize and shape data for UI consumption
- Not reimplement Apps Script eligibility or send logic

### Layer 4. Screen loaders and actions
- API routes or server actions
- Role-based capability checks
- Error boundary shaping for operator UX

## Proposed file plan

```text
vercel-dashboard/
  lib/apps-script/
    client.ts
    signing.ts
    types.ts
  services/
    runs.ts
    segments.ts
    templates.ts
    event-log.ts
    config.ts
  lib/auth/
    session.ts
    rbac.ts
```

## Service responsibilities

`runs.ts`
- Create, preview, confirm, list, pause, resume, kill, export
- Derive UI-safe summaries and lifecycle badges

`segments.ts`
- List and upsert
- Parse and stringify `filter_json`

`templates.ts`
- Read-only inspection first
- Defer edit mutations until Apps Script contract is confirmed

`event-log.ts`
- Read-only viewer contract
- If no Apps Script endpoint exists, phase as a read-only Sheets reconciliation item later

`config.ts`
- Runtime env validation
- Feature readiness summary

## Migration order

1. Convert shared libs to TypeScript
2. Convert API route wrappers to call services
3. Build screen loaders on top of services
4. Add read-only template and event-log support
5. Add policy gate services
