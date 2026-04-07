# Side-Car Interface Crosswalk

## Purpose

Define the approved planning baseline for reusing the current Side-Car interface skin on the future brand-agnostic version of Human Email Outreach without altering the current BBG runtime contract or expanding product scope early.

This document is planning-only. It does not authorize UI implementation ahead of:
- BBG Wave 2 stability
- live readiness verification
- PM alignment on the transfer boundary

## Evidence Base

BBG system contract:
- `docs/ssot/ui-screen-map.md`
- `docs/ssot/architecture-map.md`
- `docs/ssot/roadmap-brand-agnostic-wizard.md`
- `pages/dashboard.js`
- `apps-script/google-apps-script/Code.js`

Primary Side-Car design source:
- `/Users/marksylvester/Documents/Projects/side-car__packs_registry_hotfix__20260402/src/ui_redesign_r1/App.tsx`
- `/Users/marksylvester/Documents/Projects/side-car__packs_registry_hotfix__20260402/src/ui_redesign_r1/components/AppShell.tsx`
- `/Users/marksylvester/Documents/Projects/side-car__packs_registry_hotfix__20260402/src/ui_redesign_r1/components/SidecarLogo.tsx`
- `/Users/marksylvester/Documents/Projects/side-car__packs_registry_hotfix__20260402/src/ui_redesign_r1/pages/`
- `/Users/marksylvester/Documents/Projects/side-car__packs_registry_hotfix__20260402/src/design/tokens.json`
- `/Users/marksylvester/Documents/Projects/side-car__packs_registry_hotfix__20260402/src/styles/tokens.css`
- `/Users/marksylvester/Documents/Projects/side-car__packs_registry_hotfix__20260402/src/ui_redesign_r1/index.css`
- `/Users/marksylvester/Documents/Projects/side-car__packs_registry_hotfix__20260402/src/visuals/README__HOT_SWAP_PROTOCOL.md`
- `/Users/marksylvester/Documents/Projects/side-car__packs_registry_hotfix__20260402/src/visuals/packs/motion/lux_v1/README.md`
- `/Users/marksylvester/Documents/Projects/side-car__packs_registry_hotfix__20260402/src/visuals/packs/scenes/cleanBright_v1/README.md`
- `/Users/marksylvester/Documents/Projects/side-car__packs_registry_hotfix__20260402/src/visuals/packs/visualization/hud_v1/README.md`

Live confirmation of the shipped Side-Car shell:
- `https://sidecar.speaklymedia.com/`
- `https://sidecar.speaklymedia.com/assets/index-3021030a.js`
- `https://sidecar.speaklymedia.com/assets/index-eb934e73.css`

## Locked BBG Constraints

The following stay fixed while this design transfer is planned:
- current architecture remains `Operator -> Vercel dashboard -> signed Apps Script -> Google Sheet workbook -> EVENT_LOG` per `docs/ssot/architecture-map.md`
- `Create -> Preview -> Confirm` remains the canonical flow per `docs/ssot/ui-screen-map.md`
- `KILL_SWITCH=1` and `DEFAULT_DRY_RUN=1` remain the safe default posture
- BBG Wave 2 invariants remain unchanged in runtime and Apps Script behavior
- brand-agnostic work remains downstream of BBG stabilization per `docs/ssot/roadmap-brand-agnostic-wizard.md`

## What Is Reusable From Side-Car

Reusable interface layer:
- shell layout grammar from `src/ui_redesign_r1/components/AppShell.tsx`
- tokenized color and typography system from `src/design/tokens.json` and `src/styles/tokens.css`
- page chrome, card treatment, and glass surfaces from `src/ui_redesign_r1/index.css`
- operator-first information density visible across `src/ui_redesign_r1/pages/*`
- visual pack discipline from `src/visuals/**/*`
- route-zone mental model confirmed in the shipped bundle at `https://sidecar.speaklymedia.com/assets/index-3021030a.js`

Reusable visual behaviors:
- clean light-mode dashboard shell with restrained gradients
- deep dark-mode operator shell
- strong status pill language
- compact control bars and metric cards
- read-first layout before privileged action
- minimal motion with reduced-motion-friendly posture

## What Is Not Reusable As-Is

Do not port directly:
- Side-Car product names, logos, and copy from `src/ui_redesign_r1/components/SidecarLogo.tsx`
- Side-Car roadmap publishing semantics from `docs/FEATURE_ROADMAP_PUBLISHING_POSTURE__R47.md`
- website visualizer product logic from `docs/WEBSITE_VISUALIZER_CANONICAL_PREVIEW__R1.md`
- Side-Car-specific route meaning for packs, clients, admin, notes, or roadmap publication
- any live/write posture that would weaken BBG’s fail-closed deployment mode

## Crosswalk: Side-Car Shell To BBG Screen Contract

### 1. Sign-in

BBG target:
- Google sign-in for allowlisted operators from `docs/ssot/ui-screen-map.md`

Side-Car source:
- auth-aware root shell and Google-auth posture visible in `src/ui_redesign_r1/App.tsx`
- shipped bundle labels include `Google`, `Read-only`, and `Demo`

Transfer rule:
- reuse the visual framing, status banner position, and auth-entry composition
- replace Side-Car identity with neutral Human Email Outreach branding
- keep BBG environment and role status summary adjacent to sign-in

### 2. Run list

BBG target:
- list all runs with status and dry-run counters from `docs/ssot/ui-screen-map.md`

Side-Car source:
- list/detail shell patterns in `src/ui_redesign_r1/pages/NowPage.tsx`
- control-oriented panel framing in `src/ui_redesign_r1/pages/ControlPage.tsx`

Transfer rule:
- use Side-Car’s dashboard card grid, sticky headers, and status chip treatment
- rename the top-level surface to runs/operations rather than projects/roadmaps

### 3. Run detail

BBG target:
- canonical operator workspace with metadata, blockers, counters, and recent `EVENT_LOG`

Side-Car source:
- single-entity workspace treatment in `src/ui_redesign_r1/pages/RoadmapPage.tsx`
- right-rail and section-block patterns in `src/ui_redesign_r1/components/*`

Transfer rule:
- map roadmap detail composition to run detail composition
- reserve the primary hero/status strip for run lifecycle state, not brand storytelling

### 4. Create run

BBG target:
- creation flow with BBG locked defaults and safe-mode posture

Side-Car source:
- compact control patterns from `src/ui_redesign_r1/pages/ControlPage.tsx`

Transfer rule:
- use Side-Car input framing and grouped action layout
- visually lock invariant fields instead of hiding them
- make dry-run and safety mode status prominent in the header area

### 5. Segment list and editor

BBG target:
- inspect and safely edit saved segment filters

Side-Car source:
- settings/admin patterns in `src/ui_redesign_r1/pages/SettingsPage.tsx`
- structured editor framing in `src/ui_redesign_r1/pages/AdminPage.tsx`

Transfer rule:
- reuse stacked settings panels and validation card patterns
- keep raw JSON secondary; default to human-readable filter summaries

### 6. Wave 2 template inspection/editor

BBG target:
- inspect current template artifacts and render variants while keeping the 3-link block fixed

Side-Car source:
- preview and pack inspection surfaces in `src/ui_redesign_r1/pages/PreviewPage.tsx` and `src/ui_redesign_r1/pages/PacksPage.tsx`

Transfer rule:
- adapt preview/packs split view into template preview/render diff
- fixed link block must be visibly locked
- `P1-P4` spin scope should be rendered as an explicit bounded zone

### 7. Dry-run QA panel

BBG target:
- centralized pre-confirm validation panel

Side-Car source:
- status-centric summary cards and read-only diagnostics throughout `src/ui_redesign_r1/pages/NowPage.tsx` and `src/ui_redesign_r1/pages/ControlPage.tsx`

Transfer rule:
- use the Side-Car summary-card grammar for readiness gates
- show blockers first, then supporting counts and diagnostics

### 8. EVENT_LOG viewer

BBG target:
- read-only run audit surface

Side-Car source:
- timeline/list density patterns in `src/ui_redesign_r1/pages/NotesPage.tsx`

Transfer rule:
- map note/timeline styling to audit rows
- preserve redaction/minimization posture from the BBG contract

### 9. Config validation

BBG target:
- detect environment and deployment mismatches before action

Side-Car source:
- settings/admin panel grammar in `src/ui_redesign_r1/pages/SettingsPage.tsx`
- truthful state/status language confirmed live in the bundle

Transfer rule:
- use stacked check sections with clear pass/fail badges
- treat missing env/config as first-class blockers, not inline footnotes

### 10. Admin go-live controls

BBG target:
- restricted live-send arming surface, still blocked by policy in the current program state

Side-Car source:
- admin gate framing from `src/ui_redesign_r1/pages/AdminPage.tsx`

Transfer rule:
- port the shell only
- keep this surface visibly blocked and policy-gated while no real-send approval exists

## Brand-Agnostic Identity Layer

Identity changes required before reuse:
- replace `Side‑Car` naming with neutral Human Email Outreach branding
- replace Speakly-specific logo marks with a generic operations mark
- retain the token structure while remapping names to platform-neutral semantics where helpful

Recommended naming posture:
- system: `Human Email Outreach Hybrid`
- current instance label: `BBG`
- future umbrella: `Brand-Agnostic Wizard`

## Visual Pack Mapping

Side-Car packs suggest the following transfer model:
- `cleanBright_v1`: base scene language for default operator dashboards
- `hud_v1`: dense telemetry treatment for run metrics and policy status
- `lux_v1`: motion discipline for page reveals and preview transitions only

Use in BBG:
- run list and run detail should borrow `hud_v1` density, not cinematic motion
- template preview can borrow `lux_v1` restrained reveal patterns
- base shell should stay closest to `cleanBright_v1`

## PM Sync Summary

What PM should approve:
- reuse of Side-Car’s shell, token system, page grammar, and motion discipline
- replacement of all Side-Car-specific identity labels and product semantics
- sequencing this transfer after BBG live readiness is verified and Wave 2 remains stable

What PM should not assume:
- this is not approval to port the Side-Car product model
- this does not unblock real-send activation
- this does not replace the current BBG SSOT or Apps Script ownership boundaries

## Tandem Execution Plan

### Step 1. Lock the transfer boundary

Files:
- `docs/ssot/sidecar-interface-crosswalk.md`
- `docs/ssot/roadmap-brand-agnostic-wizard.md`

Done when:
- PM agrees that only the shell/skin/layout grammar is transferring

### Step 2. Produce a neutral token map

Files to create or update later:
- `vercel-dashboard/styles/brand-agnostic-tokens.css`
- `vercel-dashboard/components/layout/*`

Done when:
- Side-Car token names have neutral aliases ready without altering BBG behavior

### Step 3. Map BBG screens to the new shell

Files to create or update later:
- `docs/ssot/ui-screen-map.md`
- planned dashboard components under `vercel-dashboard/components/`

Done when:
- each BBG screen has a Side-Car shell analogue and no orphan surface remains

### Step 4. Implement read-first shell only

Files to create or update later:
- `pages/dashboard.js`
- read-only dashboard components

Done when:
- the dashboard adopts the new shell while preserving `Create -> Preview -> Confirm`

### Step 5. Add PM verification receipts

Expected artifacts:
- annotated screen crosswalk
- before/after screenshots
- guardrail verification note confirming no behavior drift

Done when:
- PM and Codex are aligned on both data posture and interface transfer scope

## Decision

Proceed with Side-Car visual/system reuse only as a controlled skin-and-shell transfer for the future brand-agnostic BBG interface.

Do not proceed as a product merge.
