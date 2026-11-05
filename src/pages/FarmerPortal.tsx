import { useState } from 'react';
import { type State, KEY, caseTitle, statusOf, inr, fmtDate, activeSteps, roleOf } from '../model';
import { Pill } from '../ui';
import { released } from './Queue';

const SESSION_KEY = KEY + '.farmer-session';

export default function FarmerPortal({ state, onExit }: { state: State; onExit: () => void }) {
  const [farmerId, setFarmerId] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) ?? ''; } catch { return ''; }
  });
  const [identity, setIdentity] = useState('');
  const [error, setError] = useState('');
  const farmer = state.farmers.find(f => f.id === farmerId);
  const [selected, setSelected] = useState('');
  const cases = farmer ? state.cases.filter(c => c.farmerId === farmer.id) : [];
  const detail = cases.find(c => c.id === selected);

  function signOut() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* session remains in memory only */ }
    setFarmerId(''); setIdentity(''); setSelected(''); setError('');
  }

  return <div className="farmer-portal">
    <header className="farmer-header"><strong>Dhara · Farmer portal</strong>{farmer ? <button className="btn ghost" onClick={signOut}>Sign out</button> : <button className="btn ghost" onClick={onExit}>Back to partner demo</button>}</header>
    <main className="page narrow">
      {!farmer ? <section className="card farmer-login">
        <span className="eyebrow">Your farm. Your progress.</span>
        <h1>Farmer login</h1>
        <p>View your investment applications, verified work and Resilience Records.</p>
        <p className="farmer-notice">Demo access only. Choose a sample farmer below; no password or SMS is required. Do not enter real personal information.</p>
        <form onSubmit={e => {
          e.preventDefault();
          const match = state.farmers.find(f => f.agristack.toUpperCase() === identity.trim().toUpperCase());
          if (!match) { setError('Choose a sample farmer or enter a valid demo Farmer ID.'); return; }
          try { sessionStorage.setItem(SESSION_KEY, match.id); } catch { /* memory session still works */ }
          setFarmerId(match.id); setSelected(''); setError('');
        }}>
          <label className="field">Sample farmer<select value={identity} onChange={e => { setIdentity(e.target.value); setError(''); }}><option value="">Choose your demo profile</option>{state.farmers.map(f => <option key={f.id} value={f.agristack}>{f.name} · {f.village}</option>)}</select></label>
          <label className="field">Demo Farmer ID<input required autoComplete="off" value={identity} onChange={e => { setIdentity(e.target.value); setError(''); }} placeholder="UP-09-4471-2286" aria-invalid={!!error} aria-describedby={error ? 'farmer-login-error' : undefined} /></label>
          {error && <p role="alert" id="farmer-login-error">{error}</p>}
          <button className="btn primary" type="submit">Log in to my farm</button>
        </form>
      </section> : <>
        <div className="page-head"><div><span className="eyebrow">My farm</span><h1>Welcome, {farmer.name}</h1><p>{farmer.village}, {farmer.district} · {farmer.acres} acres · {farmer.crop}</p></div></div>
        <p className="farmer-notice">Demo session · illustrative records only. Payments shown are released to your installer against verified work.</p>
        <section className="page" aria-label="My applications and records"><h2>My applications and records</h2>
          {cases.length === 0 && <p>No applications yet. Contact your Dhara Mitra for an assessment.</p>}
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
    </main>
  </div>;
}
