# Kelly Grappe for Secretary of State — Campaign Ops PWA

This repository is a modular, mobile-first Progressive Web App (PWA) deployed to Netlify.
It starts with **Module 001 — Event Request** and is designed to expand with additional modules all year.

## Quick start (local)

### Prereqs
- Node.js LTS
- Git
- (Optional) Netlify CLI: `npm i -g netlify-cli`

### Install
From the repo root:

```powershell
cd app
npm install
```

### Run locally (Vite)
```powershell
npm run dev
```

### Run locally with Netlify Functions (recommended)
From repo root:

```powershell
npm i -g netlify-cli
netlify dev
```

## Deploy (Netlify)
- Connect the GitHub repo to Netlify
- Set build settings (already in `netlify.toml`)
- Add environment variables (see below)
- Deploy

## Environment Variables (Netlify)
Required for Phase 1 integrations (can be stubbed while building UI):

### Anti-spam (Cloudflare Turnstile)
- `TURNSTILE_SECRET_KEY`

### Email (SendGrid)
- `SENDGRID_API_KEY`
- `EMAIL_TO` (default: kelly@kellygrappe.com)
- `EMAIL_FROM` (verified sender address)

### Google Calendar
- `GOOGLE_SERVICE_ACCOUNT_JSON` (single-line JSON)
- `GOOGLE_CALENDAR_ID`

## Module System
Modules live in `app/src/modules/*`. Each module includes:
- `module.json` (metadata)
- `schema.json` (validation)
- `actions.json` (server-side action pipeline)
- UI page(s)

All module submissions POST to:
- `POST /.netlify/functions/api/submit`

## Overlay-based module delivery
Each module is shipped as a zip overlay that can be unzipped onto the repo root.
Overlays are additive and may overwrite existing module files by design.
