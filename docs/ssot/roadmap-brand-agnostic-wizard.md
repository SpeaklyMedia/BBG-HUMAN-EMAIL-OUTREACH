# Brand-Agnostic Wizard Roadmap

## Goal

Generalize the BBG control plane into a reusable onboarding and operations layer for additional brands, only after BBG Wave 2 is stable.

## Preconditions

Do not start this phase until:
- Phase 0 SSOT is complete
- Phase 1 control plane is shipped
- Phase 2 policy blockers are stable
- BBG Wave 2 is operational and audited

## Core abstractions to add

- Brand profile model
- Brand-scoped sender/auth settings
- Brand-scoped template packs
- Brand-scoped compliance settings
- Assignable operator roles
- Reusable campaign flows

## What remains non-generic

Until proven otherwise, these stay instance-specific:
- Apps Script sender logic
- Workbook setup details
- Existing BBG Wave 2 render rules
- Current segment semantics already encoded in Apps Script

## Deterministic sequence

### Step 1. Introduce brand model without altering BBG run flow
- Add `brand_id` and brand profile configuration in Node
- Default existing BBG instance into a single known brand record

### Step 2. Parameterize read-only UI
- Scope runs, segments, templates, and config views by brand
- Keep Apps Script write calls pointed at the current BBG engine until additional engines exist

### Step 3. Add onboarding wizard
- Brand identity
- Sender mailbox/auth configuration
- Compliance defaults
- Template pack selection
- Operator role assignment

### Step 4. Expand contract surface carefully
- Add per-brand Apps Script endpoint mapping if separate engines are introduced
- Prefer read/reporting expansion before write expansion

## Exit criteria

Brand-agnostic wizard is ready when:
- New brand setup can be completed without editing code
- Brand-specific policy and template packs are configurable
- Existing BBG Wave 2 behavior is unchanged
