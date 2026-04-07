# Implementation Phases

## Phase 0. Inspection and SSOT

Deliver:
- Architecture map
- Route contract
- Sheet/data contract
- Env/config matrix
- Run lifecycle
- Risk register
- BBG Wave 2 roadmap
- Brand-agnostic wizard roadmap

Status:
- Completed in this doc set, with explicit gaps noted where Apps Script code is not bundled

## Phase 1. Control plane

Build:
- Next.js dashboard shell
- NextAuth auth/session
- Typed Apps Script client
- HMAC signing helper
- Run list/detail UI
- Segment list/edit UI
- Wave 2 template inspection/editor UI
- Dry-run QA panel
- `EVENT_LOG` viewer
- Config validation screen

Constraints:
- No sender rewrite
- No workbook logic rewrite
- No brand-agnostic generalization first

## Phase 2. Operator safety and policy

Build:
- Sender readiness checks
- Suppression freshness checks
- Template classification
- Approval gates
- Admin-only go-live controls
- Complaint-rate alerting
- Dry-run defaults and blockers

## Phase 3. Selective hybrid expansion

Only after Phase 0-2 stabilize:
- Read-only Google Sheets reconciliation layer
- Optional Node preview engine
- Optional Node scheduler/orchestrator
- Use Apps Script endpoints first for any write-back needs
- Prefer Sheets API reads before write operations

## Phase 4. Brand-agnostic wizard

Build:
- Brand profile model
- Onboarding wizard
- Per-brand sender/auth settings
- Per-brand template packs
- Per-brand compliance settings
- Assignable operator roles
- Reusable campaign flows
