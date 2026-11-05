import type { ReactNode } from 'react';
import { ArrowRight, ClipboardCheck, Landmark, Wrench, ShieldCheck, Building2, Satellite, ScrollText, Banknote, Repeat, Check, Minus, Sprout, MessageCircle, CloudSun, Camera, Lock } from 'lucide-react';
import { ROLES, ASSETS, waitingOn, isComplete, disbursement, trancheAmount, statusOf, farmerOf, caseTitle, inrShort, type Role } from '../model';
import { useStore } from '../store';
import { AssetIcon, Pill, TrancheBar } from '../ui';

const ROLE_ICON: Record<Role, ReactNode> = {
  farmer: <Sprout size={18} />,
  mitra: <ClipboardCheck size={18} />, lender: <Landmark size={18} />, installer: <Wrench size={18} />, verifier: <ShieldCheck size={18} />, state: <Building2 size={18} />,
};

const STEPS = [
  { n: 1, t: 'Assess', d: '20-minute assisted assessment with AgriStack ID, IMD rainfall and Sentinel-2 history. The farmer gets a Dhara Plan.', who: 'Dhara Mitra' },
  { n: 2, t: 'Sanction', d: 'Investment loan for 85% of her share, plus an optional bridge for the subsidy.', who: 'Lender' },
  { n: 3, t: 'Install', d: 'A certified installer delivers and fits the asset, uploading invoices and geotagged photos.', who: 'Installer' },
  { n: 4, t: 'Verify and release', d: 'Tranche 1 on verified delivery, tranche 2 after an independent field check, holdback after the first dry spell.', who: 'Field verifier', money: true },
  { n: 5, t: 'Release subsidy', d: 'The same evidence goes to the state as a standard pack. Subsidy flows faster; the bridge is repaid.', who: 'State' },
  { n: 6, t: 'Monitor and record', d: 'Seasonal satellite checks for the loan’s life, green-finance reports, and a Resilience Record she owns.', who: 'Dhara' },
];

const LAYERS = [
  { l: 'Invoice and installer upload', can: 'What was bought, from whom, for how much', cannot: 'That it was laid or works' },
  { l: 'Geotagged, time-stamped photos', can: 'Something was installed on this plot on this date', cannot: 'Quality, or that it stays in use' },
  { l: 'Independent field check', can: 'Installed correctly and runs on commissioning', cannot: 'Use in later seasons' },
  { l: 'Sentinel-2 optical (5-day, 10 m)', can: 'Field stays green through a dry spell; pond surface water', cannot: 'Drip versus flood; very small plots' },
  { l: 'Sentinel-1 radar', can: 'Surface water and soil moisture through monsoon cloud', cannot: 'Fine detail at plot edges' },
  { l: 'Repayment and claims history', can: 'Whether the asset changed outcomes', cannot: 'Anything in the first season' },
];

export default function Overview() {
  const { state, role, setRole, go } = useStore();
  const fin = state.cases.filter(c => c.kind === 'finance' && !c.declined);
  const sanctioned = fin.filter(c => c.steps.sanction?.state === 'done');
  const total = sanctioned.reduce((a, c) => a + disbursement(c), 0);
  const released = sanctioned.reduce((a, c) => a + (['t1', 't2', 'hold'] as const).reduce((b, t) => b + (c.released[t] ? trancheAmount(c, t) : 0), 0), 0);
  const records = state.cases.filter(c => c.kind === 'record' && isComplete(c)).length + fin.filter(isComplete).length;
  const feature = state.cases.find(c => c.id === 'DH-1031') ?? fin[0];

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Verify-to-Finance · Bundelkhand pilot</span>
          <h1>Finance farm resilience. Release money only against proven work.</h1>
          <p className="lede">Dhara verifies a small farmer’s drip line, farm pond or solar pump so a lender can finance it. Each tranche moves only when the work is proven, and the asset stays under satellite watch for the life of the loan.</p>
          <div className="hero-cta">
            {role === 'mitra'
              ? <button className="btn primary lg" onClick={() => go({ page: 'assess' })}>Start a farm assessment<ArrowRight size={17} /></button>
              : <button className="btn primary lg" onClick={() => go({ page: 'queue' })}>Open my queue<ArrowRight size={17} /></button>}
            <button className="btn ghost lg" onClick={() => go({ page: 'thesis' })}>See the investment case</button>
          </div>
          <dl className="hero-stats">
            <div><dt>Sanctioned in pilot</dt><dd>{inrShort(total)}</dd></div>
            <div><dt>Released against proof</dt><dd>{inrShort(released)}</dd></div>
            <div><dt>Still held for proof</dt><dd>{inrShort(total - released)}</dd></div>
            <div><dt>Resilience Records</dt><dd>{records}</dd></div>
          </dl>
        </div>
        {feature && <FeatureCard id={feature.id} />}
      </section>

      <section className="farmer-band">
        <div className="fb-copy">
          <span className="eyebrow light">For farmers · Dhara Kisan app</span>
          <h2>Everything starts with her farm.</h2>
          <p>Farmers log in with their AgriStack-linked mobile number, get an AI farm check from nine years of satellite history, see exactly what they would pay, and track every rupee until the asset works. In Hindi or English.</p>
          <div className="fb-feats">
            <span><Satellite size={15} />AI farm check</span><span><MessageCircle size={15} />Sahayak voice assistant</span><span><CloudSun size={15} />Weekly water advice</span><span><Camera size={15} />AI photo pre-check</span><span><Lock size={15} />Consent she controls</span>
          </div>
          <button className="btn light lg" onClick={() => setRole('farmer')}><Sprout size={17} />Open the farmer app<ArrowRight size={17} /></button>
        </div>
        <ol className="fb-steps">
          {['Farm check', 'Loan approved', 'Installation', 'Checked, then paid', 'Subsidy released', 'Works through a dry spell', 'Resilience Record'].map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}
        </ol>
      </section>

      <section className="section">
        <div className="section-head">
          <div><h2>Who needs to act now</h2><p>Every party works the same case. Step into any role to move it forward.</p></div>
        </div>
        <div className="role-grid">
          {ROLES.filter(r => r.id !== 'farmer').map(r => {
            const n = state.cases.filter(c => waitingOn(c).includes(r.id)).length;
            const mine = r.id === role;
            return (
              <article key={r.id} className={'role-tile' + (mine ? ' mine' : '')}>
                <div className="role-tile-top"><span className={'role-icon r-' + r.id}>{ROLE_ICON[r.id]}</span><span className={'count-badge' + (n ? ' hot' : '')}>{n} waiting</span></div>
                <h3>{r.label}</h3>
                <p>{r.blurb}</p>
                {mine
                  ? <button className="btn soft sm" onClick={() => go({ page: 'queue' })}>Open my queue<ArrowRight size={14} /></button>
                  : <button className="btn ghost sm" onClick={() => { setRole(r.id); go({ page: 'queue' }); }}>Act as {r.label}<ArrowRight size={14} /></button>}
              </article>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><h2>How Verify-to-Finance works</h2><p>A ₹43,000 drip-and-pond loan becomes as checkable as a vehicle loan.</p></div></div>
        <ol className="flow">
          {STEPS.map(s => (
            <li key={s.n} className={s.money ? 'money' : ''}>
              <span className="flow-n">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
              <small>{s.who}</small>
            </li>
          ))}
        </ol>
        <div className="release-rule">
          <Banknote size={18} />
          <p><strong>The release rule.</strong> 50% to the installer on verified delivery · 35% after the independent field check · 15% holdback after a satellite or radar check confirms use through the first dry spell. A failed check sends the installer back before the next payment.</p>
        </div>
      </section>

      <section className="section two-props">
        <article className="prop a">
          <span className="prop-tag">Proposition A · lead</span>
          <h2>Verify-to-Finance</h2>
          <p>For farmers who want to invest but cannot fund their share. Dhara verifies each stage of a new install before the next tranche, then its use over the loan’s life.</p>
          <ul>
            <li><Check size={15} />Access to investment loans KCC does not cover</li>
            <li><Check size={15} />Proof of end-use, tranche by tranche</li>
            <li><Check size={15} />Green-finance reports under RBI’s 2025 climate finance directions</li>
          </ul>
          <div className="prop-assets">{(Object.keys(ASSETS) as (keyof typeof ASSETS)[]).map(k => <span key={k}><AssetIcon asset={k} size={15} />{ASSETS[k].name}</span>)}</div>
        </article>
        <div className="prop-link" aria-hidden><Repeat size={18} /><span>About 1 in 5 record holders finance their next asset through A</span></div>
        <article className="prop b">
          <span className="prop-tag">Proposition B · the on-ramp</span>
          <h2>Resilience Record</h2>
          <p>For farmers who have already built drip, a pond or a pump. Dhara verifies the asset, reads its dry-spell history back to 2017, and the farmer shares it with lenders on consent.</p>
          <ul>
            <li><Check size={15} />Recognition at the next loan: limit reviews, faster processing</li>
            <li><Check size={15} />Every fact labelled by how it is known</li>
            <li><Check size={15} />₹500 per record, paid by the lender</li>
          </ul>
          <button className="btn ghost sm" onClick={() => go({ page: 'records' })}><ScrollText size={14} />Browse records</button>
        </article>
      </section>

      <section className="section">
        <div className="section-head"><div><h2>Stacked proof, not a single score</h2><p>Satellites are one layer of proof. Dhara stacks layers so no single one has to carry the claim.</p></div><Satellite size={22} className="muted-icon" /></div>
        <div className="card flush">
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Layer</th><th>Can prove</th><th>Cannot prove</th></tr></thead>
              <tbody>{LAYERS.map(l => <tr key={l.l}><td><strong>{l.l}</strong></td><td><span className="can"><Check size={14} />{l.can}</span></td><td><span className="cannot"><Minus size={14} />{l.cannot}</span></td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ id }: { id: string }) {
  const { state, go } = useStore();
  const c = state.cases.find(x => x.id === id)!;
  const f = farmerOf(state, c);
  const s = statusOf(c);
  type S = 'released' | 'next' | 'locked';
  const parts = (['t1', 't2', 'hold'] as const).map(t => ({ t, label: t === 't1' ? 'Tranche 1 · delivery' : t === 't2' ? 'Tranche 2 · field check' : 'Holdback · dry spell', value: trancheAmount(c, t), state: (c.released[t] ? 'released' : 'locked') as S }));
  const next = parts.find(p => p.state === 'locked');
  if (next) next.state = 'next';
  return (
    <aside className="feature card">
      <div className="feature-top">
        <span className="asset-badge"><AssetIcon asset={c.asset} /></span>
        <div><small>{c.id} · live case</small><h3>{f.name}</h3><p>{caseTitle(c)} · {f.village}, {f.district}</p></div>
      </div>
      <Pill tone={s.tone}>{s.label}</Pill>
      <div className="feature-money">
        <div className="row-between"><span>Loan and subsidy bridge</span><strong>{inrShort(disbursement(c))}</strong></div>
        <TrancheBar parts={parts} />
        <ul className="tranche-list">
          {parts.map(p => <li key={p.t} className={p.state}><span className="tick-dot" />{p.label}<strong>{inrShort(p.value)}</strong><em>{p.state === 'released' ? 'Released' : p.state === 'next' ? 'Next to unlock' : 'Locked'}</em></li>)}
        </ul>
      </div>
      <button className="btn soft full" onClick={() => go({ page: 'case', id: c.id })}>Open case<ArrowRight size={15} /></button>
    </aside>
  );
}
