import { useState } from 'react';
import { type State, KEY, caseTitle, statusOf, inr, fmtDate, activeSteps, roleOf } from '../model';
import { Pill } from '../ui';
import { released } from './Queue';
import FarmerRequest from './FarmerRequest';

const SESSION_KEY = KEY + '.farmer-session';

export default function FarmerPortal({ state, update, onExit }: { state: State; update: (fn: (s: State) => void) => void; onExit: () => void }) {
  const [farmerId, setFarmerId] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) ?? ''; } catch { return ''; }
  });
  const [identity, setIdentity] = useState('');
  const [request, setRequest] = useState<'finance' | 'record' | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const farmer = state.farmers.find(f => f.id === farmerId);
  const [selected, setSelected] = useState('');
  const cases = farmer ? state.cases.filter(c => c.farmerId === farmer.id) : [];
  const detail = cases.find(c => c.id === selected);

  function signOut() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* session remains in memory only */ }
    setFarmerId(''); setIdentity(''); setSelected(''); setError(''); setRequest(null); setNotice('');
  }

  return <div className="farmer-portal">
    <header className="farmer-header"><strong>Dhara · Farmer portal</strong>{farmer ? <button className="btn ghost" onClick={signOut}>Sign out</button> : <button className="btn ghost" onClick={onExit}>Partner portal</button>}</header>
    <main className="page narrow">
      {!farmer ? <section className="card farmer-login">
        <span className="eyebrow">Your farm. Your progress.</span>
        <h1>Farmer login</h1>
        <p>Apply for farm infrastructure, access financial support and build your Resilience Record.</p>
        <form onSubmit={e => {
          e.preventDefault();
          const match = state.farmers.find(f => f.agristack.toUpperCase() === identity.trim().toUpperCase());
          if (!match) { setError('Farmer ID not found. Check your ID or contact your Dhara Mitra.'); return; }
          try { sessionStorage.setItem(SESSION_KEY, match.id); } catch { /* memory session still works */ }
          setFarmerId(match.id); setSelected(''); setError('');
        }}>
          <label className="field">Farmer ID<input required autoComplete="off" value={identity} onChange={e => { setIdentity(e.target.value); setError(''); }} placeholder="UP-09-4471-2286" aria-invalid={!!error} aria-describedby={error ? 'farmer-login-error' : undefined} /></label>
          {error && <p role="alert" id="farmer-login-error">{error}</p>}
          <button className="btn primary" type="submit">Log in to my farm</button>
        </form>
      </section> : <>
        <div className="page-head"><div><span className="eyebrow">My farm</span><h1>Welcome, {farmer.name}</h1><p>{farmer.village}, {farmer.district} · {farmer.acres} acres · {farmer.crop}</p></div></div>
        {notice && <div className="banner" role="status">{notice}</div>}
        <section className="farmer-services" aria-label="Farmer services">
          <article className="card"><span className="eyebrow">Invest in your farm</span><h2>Water and energy infrastructure</h2><p>Drip irrigation, farm ponds, solar pumps and sprinklers. Compare costs and plan your investment.</p><button className="btn primary" onClick={() => { setRequest('finance'); setNotice(''); }}>Apply for infrastructure</button></article>
          <article className="card"><span className="eyebrow">Make it affordable</span><h2>Financial support</h2><p>Request an investment loan and subsidy bridge, with a clear view of your contribution and repayments.</p><button className="btn primary" onClick={() => { setRequest('finance'); setNotice(''); }}>Request financial support</button></article>
          <article className="card"><span className="eyebrow">Build your track record</span><h2>Verify an existing asset</h2><p>Request a field check and satellite history for infrastructure you already own. Build a record you can share with lenders.</p><button className="btn primary" onClick={() => { setRequest('record'); setNotice(''); }}>Request record verification</button></article>
        </section>
        {request && <FarmerRequest key={request} farmer={farmer} mode={request} cases={state.cases} update={update} onCancel={() => setRequest(null)} onSubmitted={id => { setSelected(id); setRequest(null); setNotice(`Request ${id} received. ${request === 'finance' ? 'Your application is awaiting a lender decision. No loan has been approved yet.' : 'Your asset is awaiting an independent field check.'}`); }} />}
        <section className="page" aria-label="My applications and records"><h2>My applications and records</h2>
          {cases.length === 0 && <p>Your applications will appear here. Choose a service above to get started.</p>}
          {cases.map(c => { const status = statusOf(c); return <article className="card" key={c.id}>
            <div className="page-head"><div><span className="eyebrow">{c.id} · {c.kind === 'finance' ? 'Investment application' : 'Resilience Record'}</span><h2>{caseTitle(c)}</h2></div><Pill tone={status.tone}>{status.label}</Pill></div>
            {c.kind === 'finance' && <p>Released to installer: <strong>{inr(released(c))}</strong></p>}
            <p>{c.declined ? 'Your application was declined. Contact your Dhara Mitra for help.' : activeSteps(c).map(s => `${s.label} — ${s.owner === 'system' ? 'Dhara' : roleOf(s.owner)?.label}`).join(' · ') || 'Verification complete.'}</p>
            <button className="btn ghost" aria-expanded={selected === c.id} onClick={() => setSelected(selected === c.id ? '' : c.id)}>View progress for {c.id}</button>
            {detail?.id === c.id && <div className="farmer-progress"><h3>Progress history</h3><ol>{c.log.map((event, i) => <li key={i}><small>{fmtDate(event.at)}</small><p>{event.text}</p></li>)}</ol><h3>Record sharing</h3>{c.shares.length ? <ul>{c.shares.map(s => <li key={s.id}>{s.org} · {s.purpose} · {s.revoked ? 'Revoked' : `Expires ${fmtDate(s.expires)}`}</li>)}</ul> : <p>No sharing permissions recorded.</p>}</div>}
          </article>; })}
        </section>
        <section className="card"><h2>Need help?</h2><p>Contact your Dhara Mitra for application updates, corrections or help managing consent.</p></section>
      </>}
    <footer className="farmer-disclosure">Applications are saved in this browser. Online identity verification and submission to external lenders are not connected.</footer>
    </main>
  </div>;
}
