import { Check, Clock, Database, Building2, Wrench, MapPinned, Anchor, Landmark, Cpu, ShieldPlus, Sprout, HeartHandshake } from 'lucide-react';
import { THESIS } from '../model';
import { useStore } from '../store';
import { Meter } from '../ui';

const MOAT = [
  { i: <Database size={18} />, t: 'Outcome-labelled data', d: 'Every verified asset tied to dry-spell performance, repayment and claims. Past seasons cannot be bought.' },
  { i: <Building2 size={18} />, t: 'A place in public workflows', d: 'One visit serves the loan tranche, the subsidy release and the green-finance report.' },
  { i: <Wrench size={18} />, t: 'Rated installer network', d: 'Installers join for financed demand; lenders prefer them because 12-month functioning is measured.' },
  { i: <MapPinned size={18} />, t: 'Density economics', d: 'Field cost per farmer falls from ₹1,500 in the pilot to ₹400 at scale as farms per route rise.' },
  { i: <Anchor size={18} />, t: 'Anchor volume and trust', d: 'Tata Capital supplies volume from day one, so the data loop spins in year one, not year four.' },
];

const TATA = [
  { i: <Landmark size={18} />, co: 'Tata Capital', role: 'Owner and anchor lender', gain: '₹360 cr lending contribution; ₹3,400 cr co-lent book by FY36' },
  { i: <Cpu size={18} />, co: 'TCS', role: 'Builds and runs the platform', gain: 'Platform IP for other lenders and countries' },
  { i: <ShieldPlus size={18} />, co: 'Tata AIG', role: 'Insures the assets', gain: '₹22 cr underwriting profit; farm-level loss data' },
  { i: <Sprout size={18} />, co: 'Rallis', role: 'Retailers originate loans', gain: '₹35 cr contribution; fertigation demand' },
  { i: <HeartHandshake size={18} />, co: 'Tata Trusts', role: 'Field partner in early districts', gain: 'Impact at scale on water security' },
];

export default function Thesis() {
  const { state } = useStore();
  const stateAccepted = state.cases.some(c => c.steps.subsidy?.state === 'done');
  const gate = [
    { t: 'Annual credit loss on verified loans', bar: '≤ 2.5%', now: '1.8%', v: 1.8, max: 2.5, pass: true, lowGood: true },
    { t: 'Assessed farmers who take a financed install', bar: '≥ 40%', now: '43%', v: 43, max: 40, pass: true },
    { t: 'All-in field verification cost per farmer', bar: '≤ ₹750', now: '₹1,140', v: 750, max: 1140, pass: false, lowGood: true },
    { t: 'States accepting Dhara’s pack for subsidy', bar: '≥ 1', now: stateAccepted ? '1 · UP' : '0', v: stateAccepted ? 1 : 0, max: 1, pass: stateAccepted },
  ];
  const maxRev = Math.max(...THESIS.revenue.map(r => r.v));
  const npvMax = 728;

  return (
    <div className="page">
      <section className="thesis-hero">
        <div>
          <span className="eyebrow light">The investment case · base case, FY27–FY36</span>
          <h1>A staged bet worth about ₹207 crore, with the downside capped at ₹39 crore.</h1>
          <p>Verification on its own is a cost centre. The value is in the loans it unlocks, so it belongs with a group that lends, insures, sells inputs and builds technology, and can keep both halves.</p>
        </div>
        <dl className="big-nums">
          <div><dt>Base-case NPV</dt><dd>₹147 cr</dd><small>at 13%, incl. terminal value</small></div>
          <div><dt>Peak investment</dt><dd>₹128 cr</dd><small>base case</small></div>
          <div><dt>Staged EV</dt><dd>₹207 cr</dd><small>vs ₹115 cr all-in on day one</small></div>
          <div><dt>Max loss at gate</dt><dd>₹39 cr</dd><small>present value, if FY29 gate fails</small></div>
        </dl>
      </section>

      <section className="section">
        <div className="section-head"><div><h2>By FY36, in the base case</h2></div></div>
        <div className="kpis">{THESIS.fy36.map(x => <div className="kpi" key={x.v}><strong className="kpi-value">{x.k}</strong><small>{x.v}</small></div>)}</div>
      </section>

      <section className="section">
        <div className="section-head"><div><h2>The FY29 go/no-go gate</h2><p>After about 25,000 farmers and two or more seasons of repayments, scale only if all four hold. Pilot-to-date values are illustrative.</p></div></div>
        <div className="gate-grid">
          {gate.map(g => (
            <article key={g.t} className={'gate ' + (g.pass ? 'pass' : 'open')}>
              <span className="gate-icon">{g.pass ? <Check size={16} /> : <Clock size={16} />}</span>
              <h3>{g.t}</h3>
              <div className="gate-nums"><div><small>Bar</small><strong>{g.bar}</strong></div><div><small>Pilot to date</small><strong>{g.now}</strong></div></div>
              <Meter value={g.v} max={g.max} tone={g.pass ? 'brand' : 'accent'} />
              <small className="gate-state">{g.pass ? 'On track' : g.t.includes('cost') ? 'Falls with route density' : 'Not yet met'}</small>
            </article>
          ))}
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><div><h2>Scenarios</h2><small>NPV incl. terminal value, ₹ crore</small></div></div>
          <ul className="scen">
            {THESIS.scenarios.map(s => (
              <li key={s.name} className={s.name.toLowerCase()}>
                <div className="scen-top"><strong>{s.name}</strong><span className="num">{s.npv > 0 ? '+' : ''}{s.npv}</span></div>
                <div className="diverge"><span className={s.npv >= 0 ? 'pos' : 'neg'} style={{ width: Math.abs(s.npv) / npvMax * 50 + '%' }} /></div>
                <small>{s.what} · peak investment ₹{s.peak} cr · 10-year NPV {s.npv10}</small>
              </li>
            ))}
          </ul>
          <p className="fine">Credit losses alone do not break the case: at base volume NPV stays positive even at 3.5% a year. Low volume combined with high losses does.</p>
        </section>
        <section className="card">
          <div className="card-head"><div><h2>Platform revenue, FY36</h2><small>₹198 cr total · 32% EBITDA margin</small></div></div>
          <ul className="hbars">
            {THESIS.revenue.map(r => <li key={r.name}><div><strong>{r.name}</strong><small>{r.who}</small></div><div className="bar-track"><span style={{ width: (r.v / maxRev) * 100 + '%' }} /></div><span className="num">₹{r.v}</span></li>)}
          </ul>
          <p className="fine">The loans earn about three times as much: ₹360 cr of lending contribution against ₹119 cr of platform EBITDA over ten years.</p>
        </section>
      </div>

      <section className="section">
        <div className="section-head"><div><h2>The moat: five layers that compound with every install</h2><p>The app and the imagery can be copied in a year. These cannot. Dhara opens its verification standard and keeps its network and data closed.</p></div></div>
        <ol className="moat">{MOAT.map((m, i) => <li key={m.t}><span className="moat-n">{i + 1}</span><span className="moat-i">{m.i}</span><h3>{m.t}</h3><p>{m.d}</p></li>)}</ol>
      </section>

      <section className="section">
        <div className="section-head"><div><h2>Why Tata, and what each company gains</h2></div></div>
        <div className="tata-grid">{TATA.map(t => <article key={t.co}><span className="role-icon r-lender">{t.i}</span><div><h3>{t.co}</h3><small>{t.role}</small><p>{t.gain}</p></div></article>)}</div>
      </section>

      <section className="ask card">
        <div><span className="eyebrow">The ask</span><h2>Fund a 500-farmer Bundelkhand pilot in FY27 (about ₹10 crore) and commit to the FY29 gate.</h2></div>
        <p>Two UP districts first, chosen for drought exposure and active Khet Talab and PMKSY programmes, with a matched comparison group and at least 30% women farmers.</p>
      </section>
    </div>
  );
}
