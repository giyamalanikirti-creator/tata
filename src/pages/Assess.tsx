import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, UserPlus, CloudSun, ClipboardList, Send, Minus, Plus, ScrollText, Fingerprint } from 'lucide-react';
import { ASSETS, INSTALLERS, LENDER, plan, history, inr, uid, today, advance, completeStep, log, type AssetKey, type Case, type Farmer } from '../model';
import { useStore } from '../store';
import { AssetIcon, DualChart } from '../ui';

const DISTRICTS = ['Banda', 'Chitrakoot', 'Hamirpur', 'Jalaun', 'Jhansi', 'Lalitpur', 'Mahoba'];
const STEPS = [
  { t: 'Farmer', i: <Fingerprint size={15} /> },
  { t: 'Risk profile', i: <CloudSun size={15} /> },
  { t: 'Dhara Plan', i: <ClipboardList size={15} /> },
  { t: 'Review and file', i: <Send size={15} /> },
];

const blank = (): Farmer => ({ id: '', name: '', agristack: '', village: '', district: 'Mahoba', acres: 2, crop: '', water: 'Borewell', woman: true, tenant: false });

export default function Assess() {
  const { state, route, update, go, toast } = useStore();
  const pre = state.farmers.find(f => f.id === route.id);
  const [step, setStep] = useState(pre ? 1 : 0);
  const [pick, setPick] = useState<string>(pre?.id ?? '');
  const [draft, setDraft] = useState<Farmer>(blank);
  const [mode, setMode] = useState<'finance' | 'record'>('finance');
  const [asset, setAsset] = useState<AssetKey>(pre?.water.toLowerCase().includes('pond') ? 'drip' : 'drip');
  const [units, setUnits] = useState(1);
  const [installer, setInstaller] = useState(INSTALLERS[0].id);
  const [bridge, setBridge] = useState(true);
  const [built, setBuilt] = useState(2021);
  const [loss, setLoss] = useState('About a third of the crop');
  const [consent, setConsent] = useState(false);

  const farmer: Farmer = pick === 'new' ? draft : state.farmers.find(f => f.id === pick) ?? draft;
  const newValid = draft.name.trim() && /^[A-Z]{2}-\d{2}-\d{4}-\d{4}$/.test(draft.agristack.trim()) && draft.village.trim() && draft.acres > 0;
  const farmerOk = pick === 'new' ? !!newValid : !!pick;
  const maxUnits = Math.max(1, Math.floor(farmer.acres || 1));
  const h = useMemo(() => history('assess' + (farmer.agristack || 'x'), 9999), [farmer.agristack]);
  const dryYears = h.years.filter((_, i) => h.deficit[i] > 25).length;

  const submit = () => {
    const prefix = mode === 'finance' ? 'DH-' : 'RR-';
    const newId = prefix + (Math.max(0, ...state.cases.filter(c => c.id.startsWith(prefix)).map(c => +c.id.slice(3))) + 1);
    update(s => {
      let f = farmer;
      if (pick === 'new') { f = { ...draft, id: uid('f'), name: draft.name.trim(), agristack: draft.agristack.trim(), village: draft.village.trim(), crop: draft.crop.trim() || 'Wheat' }; s.farmers.push(f); }
      const at = today();
      const c: Case = { id: newId, kind: mode, farmerId: f.id, asset, units: ASSETS[asset].perAcre ? units : 1, installer: mode === 'finance' ? installer : '', bridge: mode === 'finance' && bridge, created: at, updated: at, steps: {}, released: {}, evidence: [], shares: [], log: [], builtYear: mode === 'record' ? built : undefined };
      c.evidence.push({ id: uid('e'), label: 'Farm and water profile', detail: `${f.acres} acres · ${f.crop} · ${f.water} · last dry year: ${loss.toLowerCase()}`, prov: 'self', at, by: 'Farmer, via Dhara Mitra' });
      if (mode === 'finance') {
        c.log.push({ at, who: 'Ramesh Kushwaha · Dhara Mitra', text: `Assessment run against AgriStack ID ${f.agristack}. Farmer consented to share her Dhara Plan with ${LENDER}.` });
        advance(c, at);
        completeStep(c, 'assess', 'mitra', `Dhara Plan filed: ${ASSETS[asset].name.toLowerCase()}${ASSETS[asset].perAcre ? ` on ${units} acre${units > 1 ? 's' : ''}` : ''}${bridge ? ', bridge requested' : ''}`, at);
      } else {
        c.evidence.push({ id: uid('e'), label: `${ASSETS[asset].name} built ${built}`, detail: 'Self-reported at assessment; papers to be checked in the field', prov: 'self', at, by: 'Farmer, via Dhara Mitra' });
        c.steps.request = { state: 'done', at, by: 'Ramesh Kushwaha · Dhara Mitra' };
        log(c, 'mitra', 'Resilience Record requested for an existing asset.', undefined, at);
        advance(c, at);
      }
      s.cases.unshift(c);
    });
    toast(mode === 'finance' ? `Dhara Plan filed with ${LENDER} for sanction` : 'Record requested. A field verifier will check the asset.');
    go({ page: 'case', id: newId });
  };

  const p = plan(asset, units);

  return (
    <div className="page narrow">
      <div className="page-head">
        <div><span className="eyebrow">Dhara Plan · assisted assessment</span><h1>New farm assessment</h1><p className="lede sm">About 20 minutes with the farmer. Dhara adds IMD rainfall and Sentinel-2 history to what she tells you.</p></div>
      </div>
      <ol className="stepper" aria-label="Assessment steps">
        {STEPS.map((s, i) => <li key={s.t} className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}><span>{i < step ? <Check size={14} /> : s.i}</span>{s.t}</li>)}
      </ol>

      <section className="card wizard">
        {step === 0 && <>
          <h2>Who are you assessing?</h2>
          <p className="muted">Pick a farmer already on Dhara, or add a new one with her AgriStack farmer ID.</p>
          <div className="pick-grid">
            {state.farmers.map(f => (
              <button key={f.id} className={'pick' + (pick === f.id ? ' on' : '')} aria-pressed={pick === f.id} onClick={() => setPick(f.id)}>
                <span className="avatar sm f">{f.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>
                <span><strong>{f.name}</strong><small>{f.village}, {f.district} · {f.acres} ac</small></span>
              </button>
            ))}
            <button className={'pick new' + (pick === 'new' ? ' on' : '')} aria-pressed={pick === 'new'} onClick={() => setPick('new')}><UserPlus size={18} /><span><strong>New farmer</strong><small>Add with AgriStack ID</small></span></button>
          </div>
          {pick === 'new' && <div className="form-grid">
            <label className="field">Farmer’s name<input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
            <label className="field">AgriStack farmer ID<input value={draft.agristack} placeholder="UP-09-1234-5678" onChange={e => setDraft({ ...draft, agristack: e.target.value.toUpperCase() })} /><small className="hint">Format UP-09-1234-5678</small></label>
            <label className="field">Village<input value={draft.village} onChange={e => setDraft({ ...draft, village: e.target.value })} /></label>
            <label className="field">District<select value={draft.district} onChange={e => setDraft({ ...draft, district: e.target.value })}>{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select></label>
            <label className="field">Land (acres)<input type="number" min={0.5} step={0.5} value={draft.acres} onChange={e => setDraft({ ...draft, acres: +e.target.value })} /></label>
            <label className="field">Main crops<input value={draft.crop} placeholder="e.g. Wheat, chickpea" onChange={e => setDraft({ ...draft, crop: e.target.value })} /></label>
            <label className="field">Water source<select value={draft.water} onChange={e => setDraft({ ...draft, water: e.target.value })}>{['Borewell', 'Shared borewell', 'Open well', 'Canal', 'Diesel pump on canal', 'Farm pond', 'Rain-fed only'].map(w => <option key={w}>{w}</option>)}</select></label>
            <div className="field checks-inline">
              <label className="check-line"><input type="checkbox" checked={draft.woman} onChange={e => setDraft({ ...draft, woman: e.target.checked })} />Woman farmer</label>
              <label className="check-line"><input type="checkbox" checked={draft.tenant} onChange={e => setDraft({ ...draft, tenant: e.target.checked })} />Tenant (FPO group loan)</label>
            </div>
          </div>}
        </>}

        {step === 1 && <>
          <h2>{farmer.name}’s risk profile</h2>
          <p className="muted">{farmer.village}, {farmer.district} · {farmer.acres} acres · {farmer.crop || 'crops not given'} · {farmer.water}</p>
          <div className="risk-row">
            <div className="risk-badge high"><strong>High</strong><small>Drought exposure</small></div>
            <div><strong>{dryYears} of the last 9 years</strong><small>had a kharif rainfall deficit above 25% (IMD)</small></div>
            <div><strong>17 droughts in a decade</strong><small>across Bundelkhand</small></div>
          </div>
          <DualChart title="Rainfall deficit and NDVI drop in dry spells" labels={h.years} bars={h.deficit} barLabel="IMD rainfall deficit, %" lines={[{ name: 'Block median NDVI drop', values: h.block, cls: 'l-block' }, { name: 'This plot (Sentinel-2)', values: h.plot, cls: 'l-plot' }]} yMax={50} unit="%" />
          <label className="field">In the last dry year, how much of her crop was lost? <small className="hint">Self-reported</small>
            <select value={loss} onChange={e => setLoss(e.target.value)}>{['Little or none', 'About a quarter of the crop', 'About a third of the crop', 'Half or more of the crop'].map(x => <option key={x}>{x}</option>)}</select>
          </label>
        </>}

        {step === 2 && <>
          <div className="seg" role="radiogroup" aria-label="What does she need?">
            <button role="radio" aria-checked={mode === 'finance'} className={mode === 'finance' ? 'on' : ''} onClick={() => setMode('finance')}><ClipboardList size={15} />Finance a new asset</button>
            <button role="radio" aria-checked={mode === 'record'} className={mode === 'record' ? 'on' : ''} onClick={() => setMode('record')}><ScrollText size={15} />Record an asset she already has</button>
          </div>
          <h2>{mode === 'finance' ? 'Choose the asset' : 'Which asset does she already have?'}</h2>
          <div className="asset-grid">
            {(Object.keys(ASSETS) as AssetKey[]).map(k => {
              const a = ASSETS[k]; const q = plan(k, a.perAcre ? Math.min(units, maxUnits) : 1);
              return (
                <button key={k} className={'asset-card' + (asset === k ? ' on' : '')} aria-pressed={asset === k} onClick={() => setAsset(k)}>
                  <div className="asset-top"><span className="asset-badge"><AssetIcon asset={k} /></span><span><strong>{a.name}</strong><small>{a.unit} · {a.scheme}</small></span>{asset === k && <Check size={17} className="tick" />}</div>
                  <p>{a.outcome}</p>
                  {mode === 'finance' && <dl>
                    <div><dt>Cost</dt><dd>{inr(q.cost)}</dd></div>
                    <div><dt>Subsidy {a.subsidyPct}%</dt><dd>{inr(q.subsidy)}</dd></div>
                    <div><dt>Her share</dt><dd>{inr(q.share)}</dd></div>
                    <div><dt>Payback</dt><dd>{q.payback.toFixed(1)} yrs</dd></div>
                  </dl>}
                </button>
              );
            })}
          </div>
          {mode === 'finance' ? <div className="plan-config">
            {ASSETS[asset].perAcre && <div className="field"><span>Acres to cover</span><div className="stepper-num"><button aria-label="Fewer acres" disabled={units <= 1} onClick={() => setUnits(units - 1)}><Minus size={14} /></button><strong aria-live="polite">{units}</strong><button aria-label="More acres" disabled={units >= maxUnits} onClick={() => setUnits(units + 1)}><Plus size={14} /></button></div></div>}
            <label className="field">Certified installer<select value={installer} onChange={e => setInstaller(e.target.value)}>{INSTALLERS.map(i => <option key={i.id} value={i.id}>{i.name} · ★ {i.rating} · {i.functioning}% working at 12 months</option>)}</select></label>
            <label className="switch-line"><input type="checkbox" checked={bridge} onChange={e => setBridge(e.target.checked)} /><span><strong>Bridge the subsidy of {inr(p.subsidy)}</strong><small>So the installer is paid now; repaid when the state releases it</small></span></label>
          </div> : <label className="field">Year built<select value={built} onChange={e => setBuilt(+e.target.value)}>{[2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map(y => <option key={y}>{y}</option>)}</select></label>}
        </>}

        {step === 3 && <>
          <h2>{mode === 'finance' ? 'Her Dhara Plan' : 'Resilience Record request'}</h2>
          {mode === 'finance' ? <>
            <div className="plan-summary">
              <div className="ps-asset"><span className="asset-badge lg"><AssetIcon asset={asset} size={24} /></span><div><strong>{ASSETS[asset].name}{ASSETS[asset].perAcre ? ` · ${units} acre${units > 1 ? 's' : ''}` : ''}</strong><small>{ASSETS[asset].outcome}</small></div></div>
              <div className="waterfall">
                <div><span>Asset cost</span><strong>{inr(p.cost)}</strong></div>
                <div className="minus"><span>Subsidy ({ASSETS[asset].scheme})</span><strong>− {inr(p.subsidy)}</strong></div>
                <div className="total"><span>Her share</span><strong>{inr(p.share)}</strong></div>
                <div className="split"><span><i className="sw loan" />Loan from {LENDER} (85%)</span><strong>{inr(p.loan)}</strong></div>
                <div className="split"><span><i className="sw own" />She pays upfront (15%)</span><strong>{inr(p.own)}</strong></div>
              </div>
              <div className="terms-grid">
                <div><small>Nothing due until</small><strong>First harvest</strong></div>
                <div><small>Then 5 yearly instalments of</small><strong>{inr(p.instalment)}</strong></div>
                <div><small>Expected benefit a year</small><strong>{inr(p.benefit)}</strong></div>
                <div><small>Benefit covers instalment</small><strong className={p.cover >= 1.2 ? 'good' : 'bad'}>{p.cover.toFixed(1)}×</strong></div>
              </div>
              {p.cover < 1.2 && <p className="error">Payback is thin for this asset at her scale. Consider a smaller system or a pond first.</p>}
              <p className="fine">13% a year and a 1% processing fee ({inr(p.fee)}). Money goes to {INSTALLERS.find(i => i.id === installer)!.name} in three tranches, each released only when Dhara verifies the work.</p>
            </div>
          </> : <div className="plan-summary">
            <div className="ps-asset"><span className="asset-badge lg"><AssetIcon asset={asset} size={24} /></span><div><strong>{ASSETS[asset].name}, built {built}</strong><small>Field check, then the satellite archive back to 2017</small></div></div>
            <p className="muted">Free to {farmer.name.split(' ')[0]}. A lender pays ₹500 when she chooses to share the record with them.</p>
          </div>}
          <label className="check-line consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />{mode === 'finance' ? `${farmer.name} consents to share this plan and her farm profile with ${LENDER} for a loan decision` : `${farmer.name} consents to a field visit and to Dhara reading satellite history for her plot`}</label>
        </>}

        <div className="wizard-foot">
          {step > 0 ? <button className="btn ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={15} />Back</button> : <span />}
          {step < 3
            ? <button className="btn primary" disabled={step === 0 && !farmerOk} onClick={() => { if (ASSETS[asset].perAcre) setUnits(Math.min(units, maxUnits)); setStep(step + 1); }}>Continue<ArrowRight size={15} /></button>
            : <button className="btn primary" disabled={!consent || (mode === 'finance' && p.cover < 1.2)} onClick={submit}><Send size={15} />{mode === 'finance' ? `File with ${LENDER}` : 'Request record'}</button>}
        </div>
      </section>
    </div>
  );
}
