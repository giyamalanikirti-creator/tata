# Dhara · Verified resilience finance

Dhara verifies a small farmer's climate-resilience investment (drip, a farm pond, a solar pump) so a lender can finance it, releasing money only against proven work. This repository is a working frontend prototype of the revised thesis: two propositions on one verification engine.

- **A · Verify-to-Finance (lead).** Assess → sanction → install → verify and release → subsidy → monitor. Tranche 1 (50%) is released on verified delivery, tranche 2 (35%) after an independent field check, and a 15% holdback after Sentinel-2/Sentinel-1 confirm use through the first dry spell. A failed check sends the installer back before the next payment.
- **B · Resilience Record (the on-ramp).** Verify an asset the farmer already built, read its dry-spell history back to 2017, and share it with lenders on specific, revocable consent (₹500 per record). An issued record leads straight into a Dhara Plan for the next asset.

## The farmer app (Dhara Kisan)

Open it from **Open the farmer app** on the overview, choose **Farmer** in the role switcher, or go to `#/farmer/home`.

- **Login** with an AgriStack-linked mobile number and OTP (demo code `2468`), or pick one of six demo farmers at different stages. A new number goes through sign-up, with a simulated AgriStack fetch.
- **Home**: plain-language status of her investment, what she pays and when, consent requests to allow or decline, a weekly AI water advisory from the forecast, and updates.
- **My journey**: the seven steps from farm check to Resilience Record, with dates, and how the installer is paid in three parts only after each check.
- **Plan**: an AI farm check (simulated Sentinel-2/IMD/groundwater read, plot map, ranked recommendations with fit scores and reasons), then a Dhara Plan with a plain-language explanation, and OTP consent to send it to the lender. "I already have one" requests a Resilience Record with an AI photo pre-check.
- **Sahayak AI**: an assistant that answers from her own farm, plan and loan, in Hindi or English, by text or a simulated voice note, and cites what each answer is based on.
- **My record**: her verified facts with provenance labels, dry-spell charts, who can see it, sharing and revoking with OTP.

Everything is available in English and Hindi. The AI outputs are deterministic, rule-based demos; no model or real data source is called.

## Roles

Switch roles with **Acting as** in the sidebar, or use the **Act as …** buttons on any case. Each case shows who it is waiting on.

| Role | What they do in the demo |
| --- | --- |
| Farmer | Uses the Dhara Kisan app: AI farm check, files her own plan, tracks money, answers consent requests |
| Dhara Mitra | Runs the 4-step assessment, files Dhara Plans, requests records, manages consent |
| Lender (Tata Capital) | Sanctions loans, sees the portfolio, green-finance tagging and shared records |
| Installer | Uploads invoices and geotagged photos, reworks failed checks |
| Field verifier | Runs delivery, field and satellite checks; passing a check releases money |
| State department | Approves subsidy release from Dhara's standard verification pack |

The **Investment case** page summarises the base case, scenarios, the FY29 gate, revenue mix, the moat and the role of each Tata company.

## Run

```sh
npm ci
npm run dev -- --port 5173
```

## Validate

```sh
npm run build
npm test
```

Tests use Playwright and a system Chromium if one exists (`/opt/pw-browsers/chromium` or `/usr/bin/chromium`; override with `CHROMIUM_PATH`). They cover the full Verify-to-Finance journey including a failed check and rework, the Resilience Record consent flow, farmer sign-up through the AI farm check to a plan the lender sees, farmer consent and Sahayak, lender access requests, and the mobile layout.

## Scope

Everything is illustrative: people, farms, money, AgriStack IDs, IMD rainfall and satellite readings are simulated, and pilot-to-date gate values are placeholders. Investment-case figures come from the thesis base case. Data lives in this browser's localStorage; **Reset demo** restores the sample cases. Attachments are limited to JPG, PNG, WebP or PDF up to 500 KB. No backend, authentication or real financial service is involved.
