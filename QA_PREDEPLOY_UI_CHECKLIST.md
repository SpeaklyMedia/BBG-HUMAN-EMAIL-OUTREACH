# QA Predeploy UI Checklist

## Home / Entry
- Page loads without errors or layout shifts.
- Primary navigation or entry action is visible without scrolling.
- Authentication states (signed out / signed in) display correctly.

## Main Flows
- Core flow pages render expected sections and headings.
- Call-to-action buttons are clickable and return expected responses.
- Log or status output is readable and formatted.

## Forms / Interactions
- Inputs accept values and remain editable.
- Buttons show enabled/disabled states appropriately.
- Errors or empty states are understandable.

## Mobile Layout
- Content remains readable at 375px width.
- Tap targets are sized comfortably.
- Horizontal scrolling is avoided.

## Build
- `pnpm i --frozen-lockfile` succeeds.
- `pnpm run build` succeeds.
- Deployed build renders without missing assets.
