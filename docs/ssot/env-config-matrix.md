# Env And Config Matrix

Source of truth:
- `apps-script/google-apps-script/Code.js`
- `apps-script/google-apps-script/appsscript.json`
- `lib/env.js`
- `lib/appsScriptClient.js`

## Apps Script Script Properties

Required:
- `SPREADSHEET_ID`
- `WEBHOOK_SECRET`
- `ADMIN_EMAILS`

Optional but used when present:
- `VIEWER_EMAILS`
- `TIMEZONE`
- `KILL_SWITCH`
- `DEFAULT_DRY_RUN`
- `DEFAULT_MAX_TOTAL`
- `DEFAULT_MAX_PER_DAY`
- `DEFAULT_SEND_WINDOW_START`
- `DEFAULT_SEND_WINDOW_END`
- `DEFAULT_MIN_DELAY_SEC`
- `DEFAULT_MAX_DELAY_SEC`
- `SEND_WINDOW_START`
- `SEND_WINDOW_END`
- `DAILY_CAP_MIN`
- `DAILY_CAP_MAX`
- `MIN_DELAY_SECONDS`
- `MAX_DELAY_SECONDS`
- `BREAK_EVERY_MIN`
- `BREAK_EVERY_MAX`
- `BREAK_MIN_SECONDS`
- `BREAK_MAX_SECONDS`

## Apps Script deployment facts

Confirmed from `appsscript.json`:
- time zone: `America/New_York`
- runtime: `V8`
- web app access: `ANYONE_ANONYMOUS`
- execute as: `USER_DEPLOYING`

Confirmed scopes:
- `https://www.googleapis.com/auth/script.send_mail`
- `https://www.googleapis.com/auth/spreadsheets`

## Vercel environment variables

Required auth:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`

Required app config:
- `ADMIN_EMAILS`
- `APPS_SCRIPT_WEBAPP_URL`
- `WEBHOOK_SECRET`

Optional app config:
- `VIEWER_EMAILS`
- enables viewer-only access when present

Recommended:
- `NEXTAUTH_URL`

Temporary compatibility alias:
- `APPS_SCRIPT_WEB_APP_URL`
- deprecated in favor of `APPS_SCRIPT_WEBAPP_URL`

## Current implementation usage map

Used directly in dashboard code:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAILS`
- `VIEWER_EMAILS`
- `APPS_SCRIPT_WEBAPP_URL`
- `APPS_SCRIPT_WEB_APP_URL`
- `WEBHOOK_SECRET`

Used directly in Apps Script:
- all Script Properties listed above

## Normalization decision

Canonical Vercel env name:
- `APPS_SCRIPT_WEBAPP_URL`

Temporary migration behavior:
- if canonical env is absent, code falls back to `APPS_SCRIPT_WEB_APP_URL`
- config validation should warn when the alias is used
- alias should be removed after environment migration

## Milestone 1 config validator requirements

The validator should report:
- missing required dashboard env vars
- whether the app is running in admin-only mode because `VIEWER_EMAILS` is unset
- whether deprecated alias is in use
- missing required Apps Script properties where detectable via health/setup checks
- current `kill_switch` and `default_dry_run` from signed `health`
- warning that anonymous web app exposure is mitigated by signature verification, not by network privacy
