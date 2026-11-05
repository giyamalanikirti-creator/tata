import { useState } from 'react';
import { Search, ArrowRight, PlusCircle, Inbox, Star, Route as RouteIcon, ShieldCheck, Building2 } from 'lucide-react';
import { ASSETS, INSTALLERS, ROLES, waitingOn, statusOf, farmerOf, caseTitle, disbursement, trancheAmount, progress, fmtDate, inrShort, installerName, plan, type Case, type Role } from '../model';
import { useStore, QUEUE_LABEL } from '../store';
import { AssetIcon, Pill, Meter, Empty } from '../ui';

const INTRO: Record<Role, string> = {
  farmer: 'Your cases.',
  mitra: 'Every case you have filed on a farmer’s behalf, from the first assessment to her Resilience Record.',
  lender: 'Investment loans from Dhara Plans. You sanction; Dhara releases each tranche only against verified work.',
  installer: 'Jobs for Dhara-certified installers. Upload delivery and commissioning evidence to get paid faster.',
  verifier: 'Independent checks on your route. Each pass releases money; a fail sends the installer back.',
  state: 'Standard verification packs for subsidy release. Each pack reuses the lender’s verified evidence.',
};

export const released = (c: Case) => (['t1', 't2', 'hold'] as const).reduce((a, t) => a + (c.released[t] ? trancheAmount(c, t) : 0), 0);

function relevant(c: Case, role: Role) {
  if (role === 'mitra' || role === 'lender') return true;
  if (role === 'installer') return c.kind === 'finance' && c.steps.sanction?.state === 'done';
  if (role === 'verifier') return c.kind === 'record' || ['deliver', 'commission'].some(k => c.steps[k]?.state === 'done');
  return c.kind === 'finance' && c.steps.fieldCheck?.state === 'done';
}

export default function Queue() {
  const { state, role, go } = useStore();
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [q, setQ] = useState('');
  const me = ROLES.find(r => r.id === role)!;
  const scope = state.cases.filter(c => relevant(c, role));
  const mine = scope.filter(c => waitingOn(c).includes(role));
  const list = (tab === 'mine' ? mine : scope)
    .filter(c => { const f = farmerOf(state, c); return !q || [c.id, f.name, f.village, f.district, ASSETS[c.asset].name].join(' ').toLowerCase().includes(q.toLowerCase()); })
    .sort((a, b) => b.updated.localeCompare(a.updated));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">{me.label} · {me.org}</span>
          <h1>{QUEUE_LABEL[role]}</h1>
          <p className="lede sm">{INTRO[role]}</p>
        </div>
        {role === 'mitra' && <button className="btn primary" onClick={() => go({ page: 'assess' })}><PlusCircle size={16} />New assessment</button>}
      </div>

      <RoleSummary scope={scope} mine={mine.length} />

      <div className="card flush">
        <div className="toolbar">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>Needs my action <span>{mine.length}</span></button>
            <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All cases <span>{scope.length}</span></button>
          </div>
          <label className="search"><Search size={15} /><input aria-label="Search cases" placeholder="Search farmer, village or case" value={q} onChange={e => setQ(e.target.value)} /></label>
        </div>
        {list.length === 0
          ? <Empty icon={<Inbox size={22} />} title={tab === 'mine' ? 'Nothing waiting on you' : 'No cases match'}>
              <p>{tab === 'mine' ? 'Every case is with another party. Switch to "All cases" or act as another role from the Overview.' : 'Try a different search.'}</p>
              {tab === 'mine' && <button className="btn ghost sm" onClick={() => setTab('all')}>Show all cases</button>}
            </Empty>
          : <div className="table-scroll">
              <table className="table cases">
                <thead><tr><th>Case</th><th>Asset</th><th>Stage</th><th>Money released</th><th>Updated</th><th><span className="sr">Action</span></th></tr></thead>
                <tbody>
                  {list.map(c => {
                    const f = farmerOf(state, c);
                    const s = statusOf(c);
                    const act = waitingOn(c).includes(role);
                    const total = c.kind === 'finance' ? disbursement(c) : 0;
                    return (
                      <tr key={c.id} onClick={() => go({ page: 'case', id: c.id })} className={act ? 'act' : ''}>
                        <td><div className="cell-main"><span className={'avatar sm f'}>{f.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span><div><strong>{f.name}</strong><small>{c.id} · {f.village}, {f.district}</small></div></div></td>
                        <td><div className="cell-asset"><AssetIcon asset={c.asset} size={16} /><div><span>{caseTitle(c)}</span><small>{c.kind === 'finance' ? 'Verify-to-Finance' : 'Resilience Record'}</small></div></div></td>
                        <td><Pill tone={s.tone}>{s.label}</Pill><Meter value={progress(c)} /></td>
                        <td>{c.kind === 'finance' ? <><strong className="num">{inrShort(released(c))}</strong><small> of {inrShort(total)}</small></> : <small>₹500 record fee</small>}</td>
                        <td><small>{fmtDate(c.updated)}</small></td>
                        <td className="right"><button className={'btn sm ' + (act ? 'primary' : 'ghost')} onClick={e => { e.stopPropagation(); go({ page: 'case', id: c.id }); }}>{act ? 'Take action' : 'Open'}<ArrowRight size={14} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}
      </div>
    </div>
  );
}

function RoleSummary({ scope, mine }: { scope: Case[]; mine: number }) {
  const { role } = useStore();
  const fin = scope.filter(c => c.kind === 'finance' && !c.declined);
  if (role === 'installer') {
    return (
      <div className="kpis">
        {INSTALLERS.map(i => (
          <div className="kpi" key={i.id}>
            <span className="kpi-label">{i.name}</span>
            <strong className="kpi-value"><Star size={16} className="star" />{i.rating}</strong>
            <small>{i.functioning}% still working at 12 months · {i.jobs} jobs</small>
          </div>
        ))}
        <div className="kpi accent"><span className="kpi-label">Awaiting payment</span><strong className="kpi-value">{inrShort(fin.reduce((a, c) => a + disbursement(c) - released(c), 0))}</strong><small>Unlocks as each check passes</small></div>
      </div>
    );
  }
  if (role === 'verifier') {
    return (
      <div className="kpis">
        <div className="kpi accent"><span className="kpi-label">Checks due</span><strong className="kpi-value">{mine}</strong><small>On the Mahoba–Banda route</small></div>
        <div className="kpi"><span className="kpi-label"><RouteIcon size={13} />Field cost per farmer</span><strong className="kpi-value">₹1,140</strong><small>Pilot today · ₹750 gate · ₹400 at density</small></div>
        <div className="kpi"><span className="kpi-label"><ShieldCheck size={13} />Integrity controls</span><strong className="kpi-value sm">Rotated checkers</strong><small>Random re-checks · satellite cross-checks</small></div>
      </div>
    );
  }
  if (role === 'state') {
    const packs = fin.filter(c => c.steps.subsidy?.state === 'done');
    return (
      <div className="kpis">
        <div className="kpi accent"><span className="kpi-label">Packs to review</span><strong className="kpi-value">{mine}</strong><small>Field-verified installs</small></div>
        <div className="kpi"><span className="kpi-label"><Building2 size={13} />Subsidy released</span><strong className="kpi-value">{inrShort(packs.reduce((a, c) => a + plan(c.asset, c.units).subsidy, 0))}</strong><small>{packs.length} files · no separate inspection</small></div>
        <div className="kpi"><span className="kpi-label">Pack fee</span><strong className="kpi-value">₹400</strong><small>Per file · free during the pilot</small></div>
      </div>
    );
  }
  const sanctioned = fin.filter(c => c.steps.sanction?.state === 'done');
  const total = sanctioned.reduce((a, c) => a + disbursement(c), 0);
  const rel = sanctioned.reduce((a, c) => a + released(c), 0);
  return (
    <div className="kpis">
      <div className="kpi accent"><span className="kpi-label">Waiting on you</span><strong className="kpi-value">{mine}</strong><small>{role === 'lender' ? 'Sanction decisions' : 'Assessments and records'}</small></div>
      <div className="kpi"><span className="kpi-label">Sanctioned</span><strong className="kpi-value">{inrShort(total)}</strong><small>{sanctioned.length} loans · avg {inrShort(total / (sanctioned.length || 1))}</small></div>
      <div className="kpi"><span className="kpi-label">Released against proof</span><strong className="kpi-value">{inrShort(rel)}</strong><Meter value={rel} max={total || 1} /></div>
      <div className="kpi"><span className="kpi-label">Installers in use</span><strong className="kpi-value sm">{[...new Set(fin.map(c => installerName(c.installer)))].length} certified</strong><small>Rated on 12-month functioning</small></div>
    </div>
  );
}
