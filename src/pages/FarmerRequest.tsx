import { useEffect, useRef, useState } from 'react';
import { ASSETS, INSTALLERS, LENDER, TERMS, advance, plan, inr, today, uid, type AssetKey, type Case, type Farmer, type State } from '../model';
import { AssetIcon } from '../ui';
import FarmAdvisor from './FarmAdvisor';

export default function FarmerRequest({ farmer, mode, cases, update, onCancel, onSubmitted }: {
  farmer: Farmer; mode: 'finance' | 'record'; cases: Case[]; update: (fn: (s: State) => void) => void;
  onCancel: () => void; onSubmitted: (id: string) => void;
}) {
  const [asset, setAsset] = useState<AssetKey>('drip');
  const [units, setUnits] = useState('1');
  const [installer, setInstaller] = useState(INSTALLERS[0].id);
  const [bridge, setBridge] = useState(true);
  const [built, setBuilt] = useState(String(new Date().getFullYear() - 1));
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); heading.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [review]);
  const quantity = ASSETS[asset].perAcre ? Number(units) : 1;
  const p = plan(asset, quantity);
  const valid = Number.isFinite(quantity) && quantity >= 0.5 && (!ASSETS[asset].perAcre || quantity <= farmer.acres) && (!ASSETS[asset].perAcre || Number.isInteger(quantity * 2));
  const yearValid = Number.isInteger(Number(built)) && Number(built) >= 2017 && Number(built) <= new Date().getFullYear();

  function submit() {
    if (submitted.current || !consent || !valid || (mode === 'record' && !yearValid)) return;
    submitted.current = true;
    const prefix = mode === 'finance' ? 'DH-' : 'RR-';
    const id = prefix + (Math.max(0, ...cases.filter(c => c.id.startsWith(prefix)).map(c => Number(c.id.slice(3))).filter(Number.isFinite)) + 1);
    const at = today();
    const c: Case = {
      id, kind: mode, farmerId: farmer.id, asset, units: quantity,
      installer: mode === 'finance' ? installer : '', bridge: mode === 'finance' && bridge,
      created: at, updated: at, steps: {}, released: {}, evidence: [], shares: [], log: [],
      builtYear: mode === 'record' ? Number(built) : undefined,
    };
    const by = farmer.name + ' · Farmer';
    c.evidence.push({ id: uid('e'), label: 'Farmer application', detail: `${farmer.acres} acres · ${farmer.crop} · ${farmer.water}${notes.trim() ? ' · ' + notes.trim() : ''}`, prov: 'self', at, by });
    if (mode === 'finance') {
      c.steps.assess = { state: 'done', at, by, note: 'Farmer selected and reviewed the investment plan. Farm facts are self-reported.' };
      c.log.push({ at, who: by, text: `Applied for ${ASSETS[asset].name} with ${LENDER}. Requested loan ${inr(p.loan)}${bridge ? ` and subsidy bridge ${inr(p.subsidy)}` : ''}. Consented to share this plan and farm profile for a lending decision. Approval and eligibility remain subject to review.` });
    } else {
      c.steps.request = { state: 'done', at, by };
      c.evidence.push({ id: uid('e'), label: `${ASSETS[asset].name} built ${built}`, detail: 'Farmer-reported; awaiting independent verification.', prov: 'self', at, by });
      c.log.push({ at, who: by, text: 'Requested a Resilience Record. Consented to a field visit and satellite history review; no lender sharing permission granted.' });
    }
    advance(c, at);
    update(s => { s.cases.unshift(c); });
    onSubmitted(id);
  }

  return <section className="card wizard" aria-label={mode === 'finance' ? 'Infrastructure application' : 'Record verification request'}>
    <span className="eyebrow">{review ? 'Review your request' : 'Start a request'} · {farmer.name}</span>
    <h2 ref={heading} tabIndex={-1}>{mode === 'finance' ? 'Your farm investment plan' : 'Verify infrastructure you already own'}</h2>
    <p>{mode === 'finance' ? 'Choose what your farm needs. Review the costs, subsidy and repayment estimate before applying.' : 'Tell us about your existing asset. A field verifier checks it before a Resilience Record can be issued.'}</p>
    <FarmAdvisor farmer={farmer} cases={cases.filter(c => c.farmerId === farmer.id)} selected={asset} units={quantity} />
    <form onSubmit={e => { e.preventDefault(); if (!valid || (mode === 'record' && !yearValid)) { setError('Check the acreage and year before continuing.'); return; } setError(''); if (review) submit(); else setReview(true); }}>
      {!review ? <>
        <div className="asset-grid" aria-label="Infrastructure options">{(Object.keys(ASSETS) as AssetKey[]).map(key => <button type="button" key={key} className={'asset-card' + (asset === key ? ' on' : '')} aria-pressed={asset === key} onClick={() => { setAsset(key); setConsent(false); }}>
          <div className="asset-top"><span className="asset-badge"><AssetIcon asset={key} /></span><strong>{ASSETS[key].name}</strong></div><p>{ASSETS[key].outcome}</p>{mode === 'finance' && <small>From {inr(ASSETS[key].cost)} · {ASSETS[key].unit}<br />{ASSETS[key].subsidyPct}% potential subsidy</small>}
        </button>)}</div>
        <div className="form-grid">
          {ASSETS[asset].perAcre && <label className="field">Acres to cover<input type="number" required min="0.5" max={farmer.acres} step="0.5" value={units} onChange={e => setUnits(e.target.value)} /><small>Up to your farm size of {farmer.acres} acres.</small></label>}
          {mode === 'finance' ? <label className="field">Preferred installer<select value={installer} onChange={e => setInstaller(e.target.value)}>{INSTALLERS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label> : <label className="field">Year built<input type="number" required min="2017" max={new Date().getFullYear()} step="1" value={built} onChange={e => setBuilt(e.target.value)} /></label>}
        </div>
        {mode === 'finance' && <label className="check-line"><input type="checkbox" checked={bridge} onChange={e => setBridge(e.target.checked)} />Request a subsidy bridge so installation can start before the subsidy arrives</label>}
        <label className="field">{mode === 'finance' ? 'What support does your farm need?' : 'About your existing asset'}<textarea maxLength={1500} value={notes} onChange={e => setNotes(e.target.value)} placeholder={mode === 'finance' ? 'Tell us about water availability, crops or installation needs.' : 'Location, current condition and any documents available for the field visit.'} /></label>
      </> : <>
        <div className="plan-summary"><h3>{ASSETS[asset].name}{ASSETS[asset].perAcre ? ` · ${quantity} acres` : ''}</h3>
          {mode === 'finance' ? <><div className="waterfall">
            <div><span>Infrastructure cost</span><strong>{inr(p.cost)}</strong></div>
            <div><span>Potential subsidy · {ASSETS[asset].scheme}</span><strong>{inr(p.subsidy)}</strong></div>
            <div className="total"><span>Your share after subsidy</span><strong>{inr(p.share)}</strong></div>
            <div><span>Requested investment loan</span><strong>{inr(p.loan)}</strong></div>
            <div><span>Your upfront contribution</span><strong>{inr(p.own)}</strong></div>
            {bridge && <div><span>Requested subsidy bridge</span><strong>{inr(p.subsidy)}</strong></div>}
          </div><div className="terms-grid"><div><small>Estimated yearly instalment</small><strong>{inr(p.instalment)}</strong></div><div><small>Repayment period</small><strong>{TERMS.years} years</strong></div></div>
          <p className="fine">13% annual interest; 1% processing fee ({inr(p.fee)}). Repayments start after the first harvest. Subsidy eligibility and loan terms are subject to review. Bridge repayment comes from the subsidy when released. Payments go to {INSTALLERS.find(i => i.id === installer)?.name} only against verified work.</p>
          {p.cover < 1.2 && <p className="error">Estimated farm benefits may leave little room for repayments. Ask your Dhara Mitra to review affordability before accepting a loan.</p>}
          </> : <><p>Built in {built}. Field verification is followed by satellite history review.</p><p>No charge to you. A lender pays the record fee only if you later choose to share your issued record.</p></>}
          {notes.trim() && <p>{notes}</p>}
        </div>
        <label className="check-line consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />{mode === 'finance' ? `I consent to share my farm profile and this application with ${LENDER} for a lending decision.` : 'I consent to a field visit and satellite history review of my plot. Sharing with lenders will require my separate consent.'}</label>
      </>}
      {error && <p role="alert">{error}</p>}
      <div className="wizard-foot"><button type="button" className="btn ghost" onClick={onCancel}>Cancel request</button><div className="farmer-form-actions">{review && <button type="button" className="btn ghost" onClick={() => { setReview(false); setConsent(false); }}>Edit details</button>}<button type="submit" className="btn primary" disabled={review && !consent}>{review ? mode === 'finance' ? 'Submit finance application' : 'Submit verification request' : 'Review request'}</button></div></div>
    </form>
  </section>;
}
