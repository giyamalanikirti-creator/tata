import { Download, Leaf, Droplets, ShieldCheck, Banknote, Landmark, ArrowRight } from 'lucide-react';
import { ASSETS, LENDER, PARTNER_BANK, TERMS, plan, disbursement, trancheAmount, isComplete, farmerOf, caseTitle, statusOf, inr, inrShort, fmtDate, type Case } from '../model';
import { useStore } from '../store';
import { Meter, Pill, AssetIcon } from '../ui';
import { released } from './Queue';

const category = (c: Case) => c.asset === 'solar' ? 'Renewable energy · irrigation' : 'Water-efficient irrigation · adaptation';

export default function Portfolio() {
  const { state, go, toast } = useStore();
  const fin = state.cases.filter(c => c.kind === 'finance' && !c.declined && c.steps.sanction?.state === 'done');
  const total = fin.reduce((a, c) => a + disbursement(c), 0);
  const rel = fin.reduce((a, c) => a + released(c), 0);
  const held = fin.reduce((a, c) => a + (['t1', 't2', 'hold'] as const).filter(t => !c.released[t]).reduce((b, t) => b + trancheAmount(c, t), 0), 0);
  const green = fin.filter(c => c.steps.fieldCheck?.state === 'done');
  const greenAmt = green.reduce((a, c) => a + disbursement(c), 0);
  const ha = green.filter(c => ASSETS[c.asset].perAcre).reduce((a, c) => a + c.units * 0.405, 0);
  const subsidy = fin.filter(c => c.steps.subsidy?.state === 'done').reduce((a, c) => a + plan(c.asset, c.units).subsidy, 0);
  const recordViews = state.cases.flatMap(c => c.shares.filter(s => s.org === LENDER && s.viewed)).length;
  const loanBook = fin.reduce((a, c) => a + plan(c.asset, c.units).loan, 0);

  const funnel = [
    { l: 'Sanctioned', n: fin.length },
    { l: 'Delivery verified', n: fin.filter(c => c.released.t1).length },
    { l: 'Field-checked', n: green.length },
    { l: 'In use through dry spell', n: fin.filter(c => c.released.hold).length },
  ];

  const csv = () => {
    const rows = [['Case', 'Farmer', 'District', 'Asset', 'Green category', 'Sanctioned (INR)', 'Released (INR)', 'End-use verified', 'In use (remote)', 'Subsidy released'],
      ...fin.map(c => { const f = farmerOf(state, c); return [c.id, f.name, f.district, caseTitle(c), category(c), disbursement(c), released(c), c.steps.fieldCheck?.state === 'done' ? 'Yes' : 'No', c.released.hold ? 'Yes' : 'Pending', c.steps.subsidy?.state === 'done' ? 'Yes' : 'Pending']; })];
    const blob = new Blob([rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dhara-impact-report.csv'; a.click(); URL.revokeObjectURL(a.href);
    toast('Impact report downloaded (illustrative)');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div><span className="eyebrow">{LENDER} · treasury and risk</span><h1>Portfolio and impact</h1><p className="lede sm">Every rupee here moved against verified work. Asset-level tagging for RBI’s 2025 climate finance directions.</p></div>
        <button className="btn ghost" onClick={csv}><Download size={16} />Impact report (CSV)</button>
      </div>

      <div className="kpis">
        <div className="kpi accent"><span className="kpi-label"><Banknote size={13} />Sanctioned through Dhara</span><strong className="kpi-value">{inrShort(total)}</strong><small>{fin.length} farmers · loans and bridges</small></div>
        <div className="kpi"><span className="kpi-label">Released against proof</span><strong className="kpi-value">{inrShort(rel)}</strong><Meter value={rel} max={total || 1} /><small>{inrShort(held)} still held for the next check</small></div>
        <div className="kpi"><span className="kpi-label"><Leaf size={13} />Green-finance eligible</span><strong className="kpi-value">{inrShort(greenAmt)}</strong><small>End-use independently verified</small></div>
        <div className="kpi"><span className="kpi-label"><Droplets size={13} />Verified micro-irrigation</span><strong className="kpi-value">{ha.toFixed(1)} ha</strong><small>{inrShort(subsidy)} subsidy put to verified use</small></div>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Verification funnel</h2><small>Loans by the last check passed</small></div>
          <ul className="funnel">
            {funnel.map(f => <li key={f.l}><span>{f.l}</span><div className="bar-track"><span style={{ width: (f.n / (funnel[0].n || 1)) * 100 + '%' }} /></div><strong>{f.n}</strong></li>)}
          </ul>
        </section>
        <section className="card">
          <div className="card-head"><h2>Co-lending split</h2><Landmark size={17} className="muted-icon" /></div>
          <div className="split-bar"><span className="tc" style={{ width: '20%' }}>20%</span><span className="pb" style={{ width: '80%' }}>80%</span></div>
          <dl className="facts two">
            <div><dt>{LENDER} on book</dt><dd>{inrShort(loanBook * 0.2)}</dd></div>
            <div><dt>{PARTNER_BANK}</dt><dd>{inrShort(loanBook * 0.8)}</dd></div>
            <div><dt>Rate to farmer</dt><dd>{(TERMS.rate * 100).toFixed(0)}%</dd></div>
            <div><dt>Partner bank yield</dt><dd>9.25%</dd></div>
          </dl>
          <p className="fine">Verified small-farmer loans count toward the partner bank’s priority-sector target, which is why it accepts a lower yield. That gap is {LENDER}’s excess spread.</p>
          <div className="row-between"><span className="muted small">Resilience Records opened under consent</span><strong>{recordViews} · {inr(recordViews * TERMS.recordFee)}</strong></div>
        </section>
      </div>

      <section className="card flush">
        <div className="card-head pad"><div><h2>Asset-level green tagging</h2><small>One verification serves the loan, the subsidy and this report</small></div></div>
        <div className="table-scroll">
          <table className="table cases">
            <thead><tr><th>Loan</th><th>Asset</th><th>Category</th><th>Sanctioned</th><th>End-use</th><th>In use</th><th><span className="sr">Open</span></th></tr></thead>
            <tbody>
              {fin.map(c => {
                const f = farmerOf(state, c); const s = statusOf(c);
                return (
                  <tr key={c.id} onClick={() => go({ page: 'case', id: c.id })}>
                    <td><div className="cell-main"><div><strong>{f.name}</strong><small>{c.id} · {f.district} · {fmtDate(c.steps.sanction?.at)}</small></div></div></td>
                    <td><div className="cell-asset"><AssetIcon asset={c.asset} size={16} /><span>{caseTitle(c)}</span></div></td>
                    <td><small>{category(c)}</small></td>
                    <td><strong className="num">{inr(disbursement(c))}</strong></td>
                    <td>{c.steps.fieldCheck?.state === 'done' ? <Pill tone="green">Verified</Pill> : <Pill tone="gold">{s.label}</Pill>}</td>
                    <td>{c.released.hold ? <span className="ok-text"><ShieldCheck size={14} />Confirmed</span> : <small>{isComplete(c) ? '' : 'Pending'}</small>}</td>
                    <td className="right"><button className="btn ghost sm" onClick={e => { e.stopPropagation(); go({ page: 'case', id: c.id }); }}>Open<ArrowRight size={14} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
