import { ScrollText, Lock, ArrowRight, PlusCircle, ShieldCheck } from 'lucide-react';
import { ASSETS, LENDER, TERMS, isComplete, farmerOf, statusOf, fmtDate, caseTitle, inr, type Case } from '../model';
import { useStore } from '../store';
import { AssetIcon, Pill, ProvChip, Empty } from '../ui';

export default function Records() {
  const { state, role, go } = useStore();
  // Every completed financed install ends as a record too (A leads to B).
  const all = state.cases.filter(c => c.kind === 'record' || isComplete(c));
  const sharedWithMe = (c: Case) => c.shares.some(s => s.org === LENDER && !s.revoked);
  const visible = role === 'lender' ? all.filter(c => isComplete(c) && sharedWithMe(c)) : all;
  const hidden = role === 'lender' ? all.filter(c => isComplete(c)).length - visible.length : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Proposition B · the on-ramp</span>
          <h1>Resilience Records</h1>
          <p className="lede sm">{role === 'lender'
            ? `Records farmers have chosen to share with ${LENDER}. ${inr(TERMS.recordFee)} per record; the decision stays yours.`
            : 'Verified, consented records of the resilience a farmer has built. Free to her; shared only when she says so.'}</p>
        </div>
        {role === 'mitra' && <button className="btn primary" onClick={() => go({ page: 'assess' })}><PlusCircle size={16} />Request a record</button>}
      </div>

      {role === 'lender' && hidden > 0 && <div className="banner"><Lock size={18} /><div><strong>{hidden} more record{hidden > 1 ? 's' : ''} on Dhara</strong><p>Not shared with you. Farmers control access; you see a record only after consent.</p></div></div>}

      {visible.length === 0 ? <div className="card"><Empty icon={<ScrollText size={22} />} title="No records shared with you yet"><p>When a farmer consents, her record appears here.</p></Empty></div> : (
        <div className="record-grid">
          {visible.map(c => {
            const f = farmerOf(state, c); const s = statusOf(c);
            const facts = c.evidence.filter(e => e.prov !== 'installer').slice(0, 3);
            return (
              <article key={c.id} className="record-card" onClick={() => go({ page: 'case', id: c.id })}>
                <div className="rc-top">
                  <span className="asset-badge"><AssetIcon asset={c.asset} /></span>
                  <div><strong>{f.name}</strong><small>{f.village}, {f.district}</small></div>
                  <Pill tone={isComplete(c) ? 'green' : s.tone}>{isComplete(c) ? 'Issued' : s.label}</Pill>
                </div>
                <h3>{c.kind === 'record' ? `${ASSETS[c.asset].name}, built ${c.builtYear}` : `${caseTitle(c)} · financed`}</h3>
                <ul className="rc-facts">{facts.map(e => <li key={e.id}><span>{e.label}</span><ProvChip prov={e.prov} /></li>)}</ul>
                <div className="rc-foot">
                  <small>{c.shares.filter(x => !x.revoked).length ? <><ShieldCheck size={13} />Shared with {c.shares.filter(x => !x.revoked).map(x => x.org).join(', ')}</> : <><Lock size={13} />Private</>}</small>
                  <span className="link">Open<ArrowRight size={13} /></span>
                </div>
                <small className="rc-date">{c.id} · updated {fmtDate(c.updated)}</small>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
