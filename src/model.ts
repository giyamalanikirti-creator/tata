// Dhara data model: Verify-to-Finance (Proposition A) and the Resilience Record (Proposition B)
// running on one verification engine. All people, farms, figures and records are illustrative.

export type Role = 'farmer' | 'mitra' | 'lender' | 'installer' | 'verifier' | 'state';
export type Kind = 'finance' | 'record';
export type AssetKey = 'drip' | 'pond' | 'solar' | 'sprinkler';
export type Provenance = 'self' | 'installer' | 'verified' | 'remote';
export type StepState = 'todo' | 'active' | 'done' | 'failed';
export type Tranche = 't1' | 't2' | 'hold';

export type Attachment = { name: string; type: string; data: string };
export type Evidence = { id: string; label: string; detail: string; prov: Provenance; at: string; by: string; geo?: string; file?: Attachment };
export type StepRecord = { state: StepState; at?: string; by?: string; note?: string };
export type Share = { id: string; org: string; purpose: string; granted: string; expires: string; revoked?: string; viewed?: string };
export type LogEvent = { at: string; who: string; text: string; tone?: 'money' | 'fail' | 'ok' };
export type AccessRequest = { id: string; org: string; purpose: string; at: string; status: 'pending' | 'allowed' | 'declined' };

export type Farmer = {
  id: string; name: string; agristack: string; village: string; district: string;
  acres: number; crop: string; water: string; woman: boolean; tenant: boolean; phone?: string;
};

export type Case = {
  id: string; kind: Kind; farmerId: string; asset: AssetKey; units: number; installer: string;
  bridge: boolean; created: string; updated: string; builtYear?: number;
  steps: Record<string, StepRecord>; released: Partial<Record<Tranche, string>>;
  evidence: Evidence[]; shares: Share[]; log: LogEvent[]; declined?: string; parent?: string; requests?: AccessRequest[];
};

export type State = { v: 4; farmers: Farmer[]; cases: Case[] };

export const KEY = 'dhara.v4';
export const today = () => new Date().toISOString().slice(0, 10);
export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 8);

/* ---------------- People in the demo ---------------- */

export const ROLES: { id: Role; label: string; person: string; org: string; initials: string; blurb: string }[] = [
  { id: 'farmer', label: 'Farmer', person: 'Farmer', org: 'Dhara Kisan app', initials: 'KI', blurb: 'Plans, finances and tracks her own resilience investment, and owns her record.' },
  { id: 'mitra', label: 'Dhara Mitra', person: 'Ramesh Kushwaha', org: 'Assisted partner · Kabrai', initials: 'RK', blurb: 'Runs the 20-minute assessment with the farmer and files cases on her behalf.' },
  { id: 'lender', label: 'Lender', person: 'Ananya Rao', org: 'Tata Capital · co-lending desk', initials: 'AR', blurb: 'Sanctions investment loans. Money moves only when Dhara verifies the work.' },
  { id: 'installer', label: 'Installer', person: 'Vikram Patel', org: 'Certified installer network', initials: 'VP', blurb: 'Delivers and fits the asset, uploads invoices and geotagged photos.' },
  { id: 'verifier', label: 'Field verifier', person: 'Meera Singh', org: 'Dhara Verify · Mahoba route', initials: 'MS', blurb: 'Runs independent field checks and confirms use by satellite and radar.' },
  { id: 'state', label: 'State department', person: 'S. K. Verma', org: 'UP Agriculture · subsidy cell', initials: 'SV', blurb: 'Releases subsidy against Dhara’s standard verification pack.' },
];
export const roleOf = (r: Role | 'system') => ROLES.find(x => x.id === r);

export const INSTALLERS = [
  { id: 'jalshakti', name: 'Jal Shakti Irrigation', rating: 4.7, functioning: 96, jobs: 214 },
  { id: 'bundel', name: 'Bundel Agro Systems', rating: 4.4, functioning: 92, jobs: 131 },
  { id: 'suryakiran', name: 'Suryakiran Solar Pumps', rating: 4.6, functioning: 94, jobs: 88 },
];
export const installerName = (id: string) => INSTALLERS.find(i => i.id === id)?.name ?? id;

export const LENDER = 'Tata Capital';
export const PARTNER_BANK = 'Partner bank (illustrative)';

/* ---------------- Asset catalogue ---------------- */

export const ASSETS: Record<AssetKey, {
  name: string; unit: string; perAcre: boolean; cost: number; subsidyPct: number; scheme: string;
  benefit: number; outcome: string; blurb: string;
}> = {
  drip: { name: 'Drip irrigation', unit: 'per acre', perAcre: true, cost: 52500, subsidyPct: 55, scheme: 'PMKSY · Per Drop More Crop', benefit: 16000, outcome: 'Uses 30–50% less water; holds yield through dry spells', blurb: 'Lines laid to the root zone of each row.' },
  pond: { name: 'Farm pond', unit: '22 × 20 × 3 m', perAcre: false, cost: 105000, subsidyPct: 50, scheme: 'UP Khet Talab Yojana', benefit: 24000, outcome: 'Stores monsoon run-off for a protective rabi irrigation', blurb: 'Lined pond sized for about two acres.' },
  solar: { name: 'Solar pump', unit: '3 HP', perAcre: false, cost: 215700, subsidyPct: 75, scheme: 'PM-KUSUM (central + state)', benefit: 28000, outcome: 'Ends diesel spend; irrigates on demand in daylight', blurb: 'Off-grid pump with panels and controller.' },
  sprinkler: { name: 'Sprinkler set', unit: 'per acre', perAcre: true, cost: 25000, subsidyPct: 55, scheme: 'PMKSY · Per Drop More Crop', benefit: 8500, outcome: 'Even coverage for wheat and pulses on light soils', blurb: 'Portable set with laterals and nozzles.' },
};

export const TERMS = { rate: 0.13, fee: 0.01, loanShare: 0.85, years: 5, tranche: { t1: 0.5, t2: 0.35, hold: 0.15 } as Record<Tranche, number>, recordFee: 500 };

const r100 = (n: number) => Math.round(n / 100) * 100;

export function plan(asset: AssetKey, units = 1) {
  const a = ASSETS[asset];
  const u = a.perAcre ? units : 1;
  const cost = a.cost * u;
  const subsidy = Math.round(cost * a.subsidyPct / 100);
  const share = cost - subsidy;
  const loan = r100(share * TERMS.loanShare);
  const own = share - loan;
  const fee = Math.round(loan * TERMS.fee);
  // Interest accrues until the first harvest (about six months), then five annual instalments.
  const principal = loan * (1 + TERMS.rate * 0.5);
  const instalment = Math.round(principal * TERMS.rate / (1 - (1 + TERMS.rate) ** -TERMS.years));
  const benefit = a.benefit * u;
  return { cost, subsidy, share, loan, own, fee, instalment, benefit, payback: share / benefit, cover: benefit / instalment };
}

/** Money that moves through Dhara's tranches: the loan, plus the subsidy bridge if chosen. */
export function disbursement(c: Case) {
  const p = plan(c.asset, c.units);
  return p.loan + (c.bridge ? p.subsidy : 0);
}
export const trancheAmount = (c: Case, t: Tranche) => Math.round(disbursement(c) * TERMS.tranche[t]);

/* ---------------- The verification engine ---------------- */

export type StepDef = {
  key: string; label: string; owner: Role | 'system'; needs: string[]; release?: Tranche;
  desc: string; action: string; layer?: string;
};

export const FLOW: Record<Kind, StepDef[]> = {
  finance: [
    { key: 'assess', label: 'Assess and plan', owner: 'mitra', needs: [], desc: 'Assisted assessment against the AgriStack ID, with IMD rainfall and Sentinel-2 history.', action: 'File the Dhara Plan' },
    { key: 'sanction', label: 'Sanction', owner: 'lender', needs: ['assess'], desc: 'Investment loan for 85% of the farmer’s share, with an optional subsidy bridge.', action: 'Review and sanction the loan' },
    { key: 'deliver', label: 'Delivery', owner: 'installer', needs: ['sanction'], desc: 'Certified installer delivers the kit and uploads the invoice and geotagged photos.', action: 'Upload delivery evidence', layer: 'Invoice and geotagged photo' },
    { key: 'verifyDelivery', label: 'Verify delivery', owner: 'verifier', needs: ['deliver'], release: 't1', desc: 'Invoice, geotag and timestamp checked against the plot. Pays tranche 1 to the installer.', action: 'Check the delivery', layer: 'Invoice and geotag check' },
    { key: 'commission', label: 'Commissioning', owner: 'installer', needs: ['verifyDelivery'], desc: 'Asset fitted and run on the plot; commissioning photos uploaded.', action: 'Upload commissioning evidence', layer: 'Geotagged photo' },
    { key: 'fieldCheck', label: 'Independent field check', owner: 'verifier', needs: ['commission'], release: 't2', desc: 'A rotated, independent checker confirms it is installed correctly and runs. Pays tranche 2.', action: 'Run the field check', layer: 'Independent field check' },
    { key: 'subsidy', label: 'Subsidy release', owner: 'state', needs: ['fieldCheck'], desc: 'The same evidence goes to the state as a standard pack, so subsidy is released and any bridge repaid.', action: 'Review the verification pack' },
    { key: 'satellite', label: 'Dry-spell use check', owner: 'verifier', needs: ['fieldCheck'], release: 'hold', desc: 'Sentinel-2 and Sentinel-1 confirm the asset is in use through its first dry spell. Releases the holdback.', action: 'Confirm use by satellite', layer: 'Sentinel-2 optical and Sentinel-1 radar' },
    { key: 'record', label: 'Resilience Record', owner: 'system', needs: ['subsidy', 'satellite'], desc: 'The farmer’s record is updated; seasonal monitoring continues for the loan’s life.', action: '' },
  ],
  record: [
    { key: 'request', label: 'Record requested', owner: 'mitra', needs: [], desc: 'Farmer asks for a Resilience Record of an asset she already built.', action: '' },
    { key: 'assetCheck', label: 'Asset field check', owner: 'verifier', needs: ['request'], desc: 'A field visit confirms the asset is installed and working; papers attached where they exist.', action: 'Run the asset check', layer: 'Independent field check' },
    { key: 'history', label: 'Satellite history', owner: 'verifier', needs: ['assetCheck'], desc: 'Sentinel-2 and Sentinel-1 back to 2017, read against IMD rainfall, show how the field held up.', action: 'Read the satellite history', layer: 'Sentinel-2 and Sentinel-1 archive' },
    { key: 'issue', label: 'Record issued', owner: 'system', needs: ['history'], desc: 'Each fact labelled by how it is known. The farmer chooses who sees it.', action: '' },
  ],
};

export const stepDef = (c: Case, key: string) => FLOW[c.kind].find(s => s.key === key)!;
export const st = (c: Case, key: string): StepState => c.steps[key]?.state ?? 'todo';
export const activeSteps = (c: Case) => FLOW[c.kind].filter(s => st(c, s.key) === 'active' || st(c, s.key) === 'failed');
export const isComplete = (c: Case) => FLOW[c.kind].every(s => st(c, s.key) === 'done');

/** Who must act next. A failed check sends the work back to the installer (or the Mitra for records). */
export function waitingOn(c: Case): Role[] {
  if (c.declined) return [];
  const out = new Set<Role>();
  for (const s of activeSteps(c)) {
    if (st(c, s.key) === 'failed') out.add(c.kind === 'finance' ? 'installer' : 'mitra');
    else if (s.owner !== 'system') out.add(s.owner);
  }
  return [...out];
}

export function statusOf(c: Case): { label: string; tone: 'green' | 'gold' | 'rust' | 'blue' | 'grey' } {
  if (c.declined) return { label: 'Declined', tone: 'grey' };
  if (isComplete(c)) return { label: c.kind === 'finance' ? 'Live · monitored' : 'Record issued', tone: 'green' };
  const failed = activeSteps(c).find(s => st(c, s.key) === 'failed');
  if (failed) return { label: 'Rework needed', tone: 'rust' };
  const a = activeSteps(c);
  if (!a.length) return { label: 'In progress', tone: 'grey' };
  return { label: a.map(s => s.label).join(' + '), tone: a.some(s => s.owner === 'lender' || s.owner === 'state') ? 'blue' : 'gold' };
}

export function progress(c: Case) {
  const all = FLOW[c.kind];
  return all.filter(s => st(c, s.key) === 'done').length / all.length;
}

const who = (r: Role | 'system') => r === 'system' ? 'Dhara' : r === 'farmer' ? 'Farmer · Dhara Kisan app' : `${roleOf(r)!.person} · ${roleOf(r)!.label}`;

export function log(c: Case, by: Role | 'system', text: string, tone?: LogEvent['tone'], at = today()) {
  c.log.unshift({ at, who: who(by), text, tone });
  c.updated = at;
}

/** Re-evaluate the flow after any step changes: activate ready steps, release money, issue records. */
export function advance(c: Case, at = today()) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const s of FLOW[c.kind]) {
      if (st(c, s.key) !== 'todo') continue;
      if (s.needs.every(n => st(c, n) === 'done')) {
        if (s.owner === 'system') {
          c.steps[s.key] = { state: 'done', at, by: 'Dhara' };
          if (c.kind === 'finance') {
            log(c, 'system', 'Resilience Record updated with the verified asset. Seasonal monitoring continues for the loan’s life.', 'ok', at);
            c.evidence.unshift({ id: uid('e'), label: 'Asset added to Resilience Record', detail: `${ASSETS[c.asset].name} verified across delivery, field check and first dry spell.`, prov: 'verified', at, by: 'Dhara' });
          } else {
            log(c, 'system', 'Resilience Record issued. The farmer can now share it on consent.', 'ok', at);
          }
        } else c.steps[s.key] = { state: 'active' };
        changed = true;
      }
    }
  }
}

export function completeStep(c: Case, key: string, by: Role, note: string, at = today()) {
  const s = stepDef(c, key);
  c.steps[key] = { state: 'done', at, by: who(by), note };
  log(c, by, `${s.label} completed${note ? ': ' + note : '.'}`, 'ok', at);
  if (s.release) {
    c.released[s.release] = at;
    const amt = trancheAmount(c, s.release);
    const name = s.release === 'hold' ? 'Holdback' : s.release === 't1' ? 'Tranche 1' : 'Tranche 2';
    log(c, 'system', `${name} of ${inr(amt)} released to ${installerName(c.installer)}, triggered by “${s.label}”.`, 'money', at);
  }
  if (key === 'subsidy') {
    const p = plan(c.asset, c.units);
    log(c, 'system', c.bridge ? `Subsidy of ${inr(p.subsidy)} released by the state; bridge loan repaid.` : `Subsidy of ${inr(p.subsidy)} released by the state to the installer.`, 'money', at);
  }
  advance(c, at);
}

export function failStep(c: Case, key: string, by: Role, note: string, at = today()) {
  const s = stepDef(c, key);
  c.steps[key] = { state: 'failed', at, by: who(by), note };
  log(c, by, `${s.label} not passed: ${note || 'see notes'}. Payment held until it is fixed.`, 'fail', at);
}

export function reworkStep(c: Case, key: string, by: Role, note: string, at = today()) {
  const s = stepDef(c, key);
  c.steps[key] = { state: 'active', note: 'Resubmitted after rework' };
  log(c, by, `Rework submitted for “${s.label}”: ${note}`, undefined, at);
}

export function fakePhoto(label: string, geo: string, at: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3ea"/><stop offset="1" stop-color="#f4ead2"/></linearGradient></defs><rect width="320" height="220" fill="url(#s)"/><path d="M0 120 Q80 100 160 118 T320 112 V220 H0Z" fill="#b9c98f"/><path d="M0 150 Q90 132 170 150 T320 146 V220 H0Z" fill="#8fae6a"/>${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${20 + i * 50}" y1="220" x2="${120 + i * 14}" y2="132" stroke="#3f6b45" stroke-width="2.5"/>`).join('')}<circle cx="262" cy="46" r="20" fill="#f6c76b"/><rect x="0" y="182" width="320" height="38" fill="#0b2a20cc"/><text x="10" y="198" font-family="monospace" font-size="11" fill="#fff">${label}</text><text x="10" y="212" font-family="monospace" font-size="10" fill="#c8e6d4">${geo} · ${at}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const GEO = '25.39\u00b0 N, 79.71\u00b0 E';

/** Demo control: perform whatever the next party would do, so a farmer-only demo can walk a case to the end. */
export function demoAdvance(c: Case, at = today()): string {
  const a = activeSteps(c);
  if (!a.length || c.declined) return '';
  const s = a.find(x => st(c, x.key) === 'failed') ?? a[0];
  if (st(c, s.key) === 'failed') { reworkStep(c, s.key, c.kind === 'finance' ? 'installer' : 'mitra', 'Fixed and resubmitted (demo)', at); return 'Rework submitted'; }
  const v = 'Meera Singh \u00b7 Field verifier';
  switch (s.key) {
    case 'sanction': completeStep(c, 'sanction', 'lender', c.bridge ? 'Sanctioned with subsidy bridge' : 'Sanctioned', at); break;
    case 'deliver': case 'commission': {
      const d = s.key === 'deliver';
      c.evidence.unshift({ id: uid('e'), label: d ? 'Invoice and delivery photos' : 'Commissioning photos', detail: d ? `Invoice for ${ASSETS[c.asset].name.toLowerCase()} kit` : 'Asset fitted and run on the plot', prov: 'installer', at, by: installerName(c.installer), geo: GEO + ' \u00b7 within plot boundary', file: { name: d ? 'delivery.svg' : 'commissioning.svg', type: 'image/svg+xml', data: fakePhoto((d ? 'DELIVERY \u00b7 ' : 'COMMISSIONING \u00b7 ') + c.id, GEO, at) } });
      completeStep(c, s.key, 'installer', d ? 'Kit delivered to the plot' : 'Fitted and tested on the plot', at); break;
    }
    case 'verifyDelivery': case 'fieldCheck': case 'assetCheck':
      c.evidence.unshift({ id: uid('e'), label: s.key === 'verifyDelivery' ? 'Delivery matched to invoice' : s.key === 'assetCheck' ? 'Asset installed and working' : 'Installed correctly and runs', detail: 'Field visit', prov: 'verified', at, by: v });
      completeStep(c, s.key, 'verifier', s.key === 'verifyDelivery' ? 'Kit matches invoice' : 'Working on the plot', at); break;
    case 'satellite': case 'history':
      c.evidence.unshift({ id: uid('e'), label: s.key === 'history' ? 'Dry-spell history since 2017' : 'In use through first dry spell', detail: 'Field stayed greener than the block in dry weeks', prov: 'remote', at, by: 'Dhara satellite stack' });
      completeStep(c, s.key, 'verifier', 'Confirmed by satellite', at); break;
    case 'subsidy': completeStep(c, 'subsidy', 'state', 'Pack accepted', at); break;
    default: return '';
  }
  return s.label;
}

export const PROV: Record<Provenance, { label: string; short: string }> = {
  self: { label: 'Self-reported', short: 'Self' },
  installer: { label: 'Installer-reported', short: 'Installer' },
  verified: { label: 'Independently verified', short: 'Verified' },
  remote: { label: 'Remotely confirmed', short: 'Remote' },
};

/* ---------------- Formatting ---------------- */

export function inr(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
export function inrShort(n: number) {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(n >= 1e8 ? 0 : 1) + ' cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(n >= 1e6 ? 1 : 2).replace(/\.?0+$/, '') + ' L';
  return inr(n);
}
export function fmtDate(d?: string) {
  if (!d) return '';
  const t = new Date(d + 'T00:00:00');
  return isNaN(+t) ? d : t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
export const farmerOf = (s: State, c: Case) => s.farmers.find(f => f.id === c.farmerId)!;
export const caseTitle = (c: Case) => `${ASSETS[c.asset].name}${ASSETS[c.asset].perAcre ? ` · ${c.units} acre${c.units > 1 ? 's' : ''}` : ''}`;

/* ---------------- Illustrative remote-sensing series ---------------- */

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

/** Weekly NDVI for the plot and the block median through the first dry spell after commissioning. */
export function drySpell(id: string, inUse = true) {
  const r = rng(id);
  const labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10'];
  const rain = [42, 30, 6, 0, 0, 2, 0, 4, 18, 36].map(v => Math.max(0, Math.round(v + (r() - .5) * 8)));
  const block = [0.62, 0.61, 0.57, 0.5, 0.44, 0.4, 0.37, 0.36, 0.4, 0.46].map(v => +(v + (r() - .5) * .02).toFixed(2));
  const plot = block.map((b, i) => +(inUse ? Math.min(0.78, b + 0.04 + i * 0.022 + (r() - .5) * .02) : b + (r() - .5) * .03).toFixed(2));
  const moisture = inUse ? 0.31 : 0.14;
  return { labels, rain, block, plot, moisture };
}

/** Yearly dry-spell NDVI drop for an existing asset, plot versus block, read from the archive back to 2017. */
export function history(id: string, built: number) {
  const r = rng(id + 'h');
  const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const deficit = years.map(y => [2017, 2019, 2022, 2025].includes(y) ? Math.round(28 + r() * 18) : Math.round(r() * 10));
  const block = deficit.map(d => Math.round(8 + d * 0.7 + r() * 4));
  const plot = years.map((y, i) => Math.round(y >= built ? Math.max(3, block[i] * (0.35 + r() * 0.15)) : block[i] + (r() - .5) * 4));
  return { years, deficit, block, plot };
}

/* ---------------- Seed data ---------------- */

function mk(p: Partial<Case> & Pick<Case, 'id' | 'kind' | 'farmerId' | 'asset'>): Case {
  return { units: 1, installer: 'jalshakti', bridge: true, created: '2026-09-02', updated: '2026-09-02', steps: {}, released: {}, evidence: [], shares: [], log: [], ...p };
}

function walk(c: Case, script: [string, Role, string, string][]) {
  advance(c, c.created);
  for (const [key, by, note, at] of script) {
    if (key === 'deliver' || key === 'commission') {
      c.evidence.unshift({ id: uid('e'), label: key === 'deliver' ? 'Invoice and delivery photos' : 'Commissioning photos', detail: key === 'deliver' ? `Invoice ${c.id.slice(3)}-${key.length} for ${ASSETS[c.asset].name.toLowerCase()} kit` : 'Asset fitted and run on the plot', prov: 'installer', at, by: installerName(c.installer), geo: '25.39° N, 79.71° E · within plot boundary', file: { name: key + '.svg', type: 'image/svg+xml', data: fakePhoto((key === 'deliver' ? 'DELIVERY · ' : 'COMMISSIONING · ') + c.id, '25.39° N, 79.71° E', at) } });
    }
    if (key === 'verifyDelivery' || key === 'fieldCheck' || key === 'assetCheck') c.evidence.unshift({ id: uid('e'), label: key === 'verifyDelivery' ? 'Delivery matched to invoice' : key === 'assetCheck' ? 'Asset installed and working' : 'Installed correctly and runs', detail: note, prov: 'verified', at, by: 'Meera Singh · Field verifier' });
    if (key === 'satellite' || key === 'history') c.evidence.unshift({ id: uid('e'), label: key === 'history' ? 'Dry-spell history since 2017' : 'In use through first dry spell', detail: note, prov: 'remote', at, by: 'Dhara satellite stack' });
    completeStep(c, key, by, note, at);
  }
  return c;
}

export function seed(): State {
  const farmers: Farmer[] = [
    { id: 'sunita', name: 'Sunita Devi', agristack: 'UP-09-4471-2286', village: 'Kabrai', district: 'Mahoba', acres: 2, crop: 'Wheat, chickpea', water: 'Shared borewell', woman: true, tenant: false, phone: '9839041122' },
    { id: 'mohan', name: 'Mohan Lal Yadav', agristack: 'UP-09-3318-0954', village: 'Mauranipur', district: 'Jhansi', acres: 3.5, crop: 'Groundnut, wheat', water: 'Open well', woman: false, tenant: false, phone: '9415520318' },
    { id: 'geeta', name: 'Geeta Rajput', agristack: 'UP-09-5562-1170', village: 'Naraini', district: 'Banda', acres: 4, crop: 'Mustard, lentil', water: 'Diesel pump on canal', woman: true, tenant: false, phone: '9919463007' },
    { id: 'rajesh', name: 'Rajesh Kushwaha', agristack: 'UP-09-2207-6631', village: 'Talbehat', district: 'Lalitpur', acres: 2.5, crop: 'Soybean, wheat', water: 'Borewell', woman: false, tenant: false, phone: '9450172284' },
    { id: 'ramkali', name: 'Ramkali Ahirwar', agristack: 'UP-09-6115-4402', village: 'Charkhari', district: 'Mahoba', acres: 1.5, crop: 'Chickpea, barley', water: 'Farm pond (2022)', woman: true, tenant: true, phone: '9721306645' },
    { id: 'kamla', name: 'Kamla Devi', agristack: 'UP-09-4120-8836', village: 'Kulpahar', district: 'Mahoba', acres: 2.5, crop: 'Wheat, chickpea', water: 'Rain-fed only', woman: true, tenant: false, phone: '9721148830' },
    { id: 'pushpa', name: 'Pushpa Patel', agristack: 'UP-09-7783-3019', village: 'Rath', district: 'Hamirpur', acres: 3, crop: 'Wheat, pea', water: 'Farm pond (2021)', woman: true, tenant: false, phone: '9838817730' },
  ];
  const cases: Case[] = [
    walk(mk({ id: 'DH-1042', kind: 'finance', farmerId: 'sunita', asset: 'drip', units: 2, created: '2026-10-28' }), [['assess', 'mitra', 'Dhara Plan filed: drip on 2 acres, bridge requested', '2026-10-28']]),
    walk(mk({ id: 'DH-1038', kind: 'finance', farmerId: 'mohan', asset: 'pond', installer: 'bundel', created: '2026-10-06' }), [
      ['assess', 'mitra', 'Farm pond selected; payback under five years', '2026-10-06'],
      ['sanction', 'lender', 'Sanctioned with subsidy bridge', '2026-10-09'],
      ['deliver', 'installer', 'Excavation complete, lining delivered', '2026-10-27'],
    ]),
    walk(mk({ id: 'DH-1031', kind: 'finance', farmerId: 'geeta', asset: 'solar', installer: 'suryakiran', created: '2026-09-15' }), [
      ['assess', 'mitra', 'Solar pump replaces diesel', '2026-09-15'],
      ['sanction', 'lender', 'Sanctioned with subsidy bridge', '2026-09-18'],
      ['deliver', 'installer', 'Panels, pump and controller delivered', '2026-10-04'],
      ['verifyDelivery', 'verifier', 'Serial numbers match invoice; geotag inside plot', '2026-10-07'],
    ]),
    walk(mk({ id: 'DH-1024', kind: 'finance', farmerId: 'rajesh', asset: 'drip', units: 2, created: '2026-08-20' }), [
      ['assess', 'mitra', 'Drip on 2 acres of soybean', '2026-08-20'],
      ['sanction', 'lender', 'Sanctioned with subsidy bridge', '2026-08-22'],
      ['deliver', 'installer', 'Laterals, filters and fittings delivered', '2026-09-03'],
      ['verifyDelivery', 'verifier', 'Kit matches invoice', '2026-09-05'],
      ['commission', 'installer', 'Laid on both plots and pressure-tested', '2026-09-16'],
      ['fieldCheck', 'verifier', 'Emitters running across both plots', '2026-09-19'],
    ]),
    walk(mk({ id: 'DH-0987', kind: 'finance', farmerId: 'ramkali', asset: 'sprinkler', units: 1, installer: 'bundel', bridge: false, created: '2026-06-10' }), [
      ['assess', 'mitra', 'Sprinkler for chickpea; group loan via FPO (tenant)', '2026-06-10'],
      ['sanction', 'lender', 'Sanctioned through FPO group lending', '2026-06-12'],
      ['deliver', 'installer', 'Set delivered', '2026-06-21'],
      ['verifyDelivery', 'verifier', 'Kit matches invoice', '2026-06-23'],
      ['commission', 'installer', 'Commissioned on the eastern plot', '2026-07-02'],
      ['fieldCheck', 'verifier', 'Even coverage observed', '2026-07-05'],
      ['subsidy', 'state', 'Pack accepted; PDMC subsidy released', '2026-08-01'],
      ['satellite', 'verifier', 'Plot stayed 0.14 NDVI above block through the August dry spell', '2026-09-02'],
    ]),
    walk(mk({ id: 'RR-2015', kind: 'record', farmerId: 'pushpa', asset: 'pond', builtYear: 2021, installer: '', bridge: false, created: '2026-09-25' }), [
      ['assetCheck', 'verifier', 'Lined pond holding water; Khet Talab sanction letter attached', '2026-09-29'],
      ['history', 'verifier', 'Dry-spell NDVI drop about half the block median since 2021', '2026-10-01'],
    ]),
    walk(mk({ id: 'RR-2021', kind: 'record', farmerId: 'ramkali', asset: 'pond', builtYear: 2022, installer: '', bridge: false, created: '2026-10-30' }), []),
  ];
  // Proposition B starts with the farmer's own request and self-reported facts.
  for (const c of cases.filter(c => c.kind === 'record')) {
    c.steps.request = { state: 'done', at: c.created, by: who('mitra') };
    c.evidence.push({ id: uid('e'), label: `${ASSETS[c.asset].name} built ${c.builtYear}`, detail: 'Built under UP Khet Talab Yojana', prov: 'self', at: c.created, by: 'Farmer, via Dhara Mitra' });
    c.log.push({ at: c.created, who: who('mitra'), text: 'Resilience Record requested for an existing asset.' });
    advance(c, c.created);
  }
  for (const c of cases.filter(c => c.kind === 'finance')) {
    c.evidence.push({ id: uid('e'), label: 'Farm and water profile', detail: 'Landholding, crop and water source from the assisted assessment', prov: 'self', at: c.created, by: 'Farmer, via Dhara Mitra' });
  }
  const rr = cases.find(c => c.id === 'RR-2015')!;
  rr.shares.push({ id: 's1', org: LENDER, purpose: 'Limit review on KCC and next investment loan', granted: '2026-10-02', expires: '2027-04-02', viewed: '2026-10-03' });
  log(rr, 'mitra', `Farmer consented to share the record with ${LENDER} for six months.`, undefined, '2026-10-02');
  const done = cases.find(c => c.id === 'DH-0987')!;
  done.shares.push({ id: 's2', org: 'Tata AIG (asset cover)', purpose: 'Asset insurance quote', granted: '2026-09-05', expires: '2027-03-05' });
  rr.requests = [{ id: 'q1', org: 'Tata AIG (asset cover)', purpose: 'Quote for pond and pump insurance', at: '2026-11-01', status: 'pending' }];
  done.requests = [{ id: 'q2', org: LENDER, purpose: 'KCC limit review before rabi', at: '2026-11-02', status: 'pending' }];
  return { v: 4, farmers, cases };
}

export function readState(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === 4 && Array.isArray(s.farmers) && Array.isArray(s.cases) && s.cases.every((c: Case) => c && typeof c.id === 'string' && c.steps && Array.isArray(c.log))) return s;
    }
  } catch { /* fall through to seed */ }
  return seed();
}

/* ---------------- Investment case (from the thesis, base case) ---------------- */

export const THESIS = {
  fy36: [
    { k: '25.1 lakh', v: 'farmers financed' },
    { k: '₹10,777 cr', v: 'loans verified (cumulative)' },
    { k: '₹3,400 cr', v: 'co-lent book' },
    { k: '₹15,714 cr', v: 'subsidy put to verified use' },
  ],
  scenarios: [
    { name: 'Bull', what: '55% conversion, 1.5% loss, 1.3× volume', npv: 728, npv10: 77, peak: 90 },
    { name: 'Base', what: '45% conversion, 2.0% loss, 3.2 lakh farmers a year by FY36', npv: 147, npv10: -47, peak: 128 },
    { name: 'Bear', what: '35% conversion, 3.5% loss, 0.6× volume, dearer checks', npv: -346, npv10: -173, peak: 375 },
  ],
  revenue: [
    { name: 'Installer network', who: 'Certified installers · 1% of asset value', v: 74.6 },
    { name: 'Verification', who: 'Lenders · ₹800 per financed farmer', v: 52.8 },
    { name: 'Monitoring and impact', who: 'Lenders · ₹200 per active farmer a year', v: 45.4 },
    { name: 'Subsidy verification', who: 'States · ₹400 per file', v: 13.2 },
    { name: 'Data licensing', who: 'Insurers and DFIs · anonymised curves', v: 12.0 },
  ],
};
