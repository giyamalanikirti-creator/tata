# Dhara

A responsive frontend prototype for documenting farm resilience investments and sharing evidence with a fictional lender. Built with React, TypeScript, Vite, Tailwind CSS and Lucide.

## Run

```sh
npm ci --cache /tmp/dhara-npm
npm run dev -- --port 5173
```

## Validate

```sh
npm run build
npm test
```

Browser tests use the system Chromium at `/usr/bin/chromium`; adjust `playwright.config.ts` if your machine uses a different browser installation. Tests start Vite automatically.

## Demo

Switch between Farmer, Field verifier and Lender using the labelled demo role selector. Farmer profiles share a single localStorage data model. Sample lender access is seeded with consent history; new sharing requires a consent dialog. Reset demo restores the samples and removes local attachment records.

Supported: assessment progress, improvement plans and expenditure, local evidence previews, corrections and resubmission, verification checklists, printable passports, sharing history and revocation, lender filters/sorting/search, information requests and farmer responses.

Attachments accept JPG, PNG, WebP or PDF, up to 500 KB per file and 1.5 MB total for the demo. Files remain in this browser. All people, assessments, costs, financial figures, and verification records are illustrative. No authentication, backend, public share link, live weather, government scheme lookup, satellite connection or financial service is provided. Printing uses the browser PDF dialog. Storage is browser-specific; clearing browser data clears the demo. Do not use sensitive personal documents.
