# Dhara · Verified resilience finance

Dhara verifies a small farmer's climate-resilience investment (drip, a farm pond, a solar pump) so a lender can finance it, releasing money only against proven work. This repository is a working frontend prototype of the revised thesis: two propositions on one verification engine.

- **A · Verify-to-Finance (lead).** Assess → sanction → install → verify and release → subsidy → monitor. Tranche 1 (50%) is released on verified delivery, tranche 2 (35%) after an independent field check, and a 15% holdback after Sentinel-2/Sentinel-1 confirm use through the first dry spell. A failed check sends the installer back before the next payment.
- **B · Resilience Record (the on-ramp).** Verify an asset the farmer already built, read its dry-spell history back to 2017, and share it with lenders on specific, revocable consent (₹500 per record). An issued record leads straight into a Dhara Plan for the next asset.

## Roles

Switch roles with **Acting as** in the sidebar, or use the **Act as …** buttons on any case. Each case shows who it is waiting on.

| Role | What they do in the demo |
| --- | --- |
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

Tests use Playwright and a system Chromium if one exists (`/opt/pw-browsers/chromium` or `/usr/bin/chromium`; override with `CHROMIUM_PATH`). They cover the full Verify-to-Finance journey including a failed check and rework, the Resilience Record consent flow, and the mobile layout.

## Scope

Everything is illustrative: people, farms, money, AgriStack IDs, IMD rainfall and satellite readings are simulated, and pilot-to-date gate values are placeholders. Investment-case figures come from the thesis base case. Data lives in this browser's localStorage; **Reset demo** restores the sample cases. Attachments are limited to JPG, PNG, WebP or PDF up to 500 KB. No backend, authentication or real financial service is involved.

## Farmer portal

Choose **Farmer login** in the sidebar or open `#/farmer`. Enter a Farmer ID
(for example `UP-09-4471-2286` for Sunita Devi). Sessions survive reloads in the
same browser tab; sign out to switch profiles.

Farmers can apply for drip irrigation, ponds, solar pumps and sprinklers; review
investment loans, subsidy bridges and repayment estimates; and request field
verification of existing infrastructure for a Resilience Record. Both request
flows require explicit consent and create cases in the shared lender/verifier
workflow. Applications, payment progress and sharing history persist locally.
Financial support uses the infrastructure application, rather than creating a
separate disconnected loan request. No loan is automatically approved and no
existing asset is marked verified at submission.

This is simulated login, not authentication: all sample data remains in the
browser and Farmer IDs are not secrets. Online identity verification and external
lender submission are not connected. Production login requires a backend identity
service, verified credentials or SMS OTP, server-side sessions and authorization
on every farmer record request. The portal states the local-storage limitation
in its footer without interrupting the application flow.
