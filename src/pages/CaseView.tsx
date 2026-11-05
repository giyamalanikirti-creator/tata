import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X, Circle, Camera, Upload, FileText, Lock, Share2, Leaf, Banknote, Satellite, ShieldCheck, Sprout, Users, History, Paperclip, MapPin, AlertTriangle, Sparkles, Ban, Send, Clock, Wand2 } from 'lucide-react';
import {
  FLOW, ROLES, ASSETS, LENDER, PARTNER_BANK, TERMS, PROV, st, stepDef, waitingOn, statusOf, farmerOf, caseTitle, plan, disbursement, trancheAmount,
  completeStep, failStep, reworkStep, activeSteps, isComplete, drySpell, history, inr, inrShort, fmtDate, installerName, uid, today, roleOf,
  type Case, type Role, type Attachment, type Tranche, type StepDef,
} from '../model';
import { useStore, QUEUE_LABEL } from '../store';
import { scanFarm, photoCheck } from '../farmer/ai';
import { AssetIcon, Pill, ProvChip, Modal, DualChart, TrancheBar, Empty } from '../ui';

const T_LABEL: Record<Tranche, string> = { t1: 'Tranche 1', t2: 'Tranche 2', hold: 'Holdback' };

export default function CaseView({ id }: { id: string }) {
  const { state, role, go, setRole, updateCase } = useStore();
  const c = state.cases.find(x => x.id === id);

  const activeLenderShare = c?.shares.find(s => s.org === LENDER && !s.revoked);
  useEffect(() => {
    if (c && role === 'lender' && c.kind === 'record' && activeLenderShare && !activeLenderShare.viewed && isComplete(c)) {
      updateCase(c.id, x => {
        const s = x.shares.find(s => s.id === activeLenderShare.id)!;
        s.viewed = today();
        x.log.unshift({ at: today(), who: `${LENDER} · Lender`, text: `Record opened under consent. ${inr(TERMS.recordFee)} record fee billed to ${LENDER}.`, tone: 'money' });
      });
    }
  }, [c, role, activeLenderShare, updateCase]);

  if (!c) return <div className="page"><Empty icon={<AlertTriangle size={22} />} title="Case not found"><button className="btn ghost sm" onClick={() => go({ page: 'queue' })}>Back to queue</button></Empty></div>;

  const f = farmerOf(state, c);
  const s = statusOf(c);
  const waiting = waitingOn(c);
  const mine = waiting.includes(role);
  const locked = role === 'lender' && c.kind === 'record' && !activeLenderShare;

  return (
    <div className="page">
      <button className="back" onClick={() => go({ page: 'queue' })}><ArrowLeft size={15} />{QUEUE_LABEL[role]}</button>
      <header className="case-head">
        <span className="asset-badge lg"><AssetIcon asset={c.asset} size={26} /></span>
        <div className="case-title">
          <span className="eyebrow">{c.id} · {c.kind === 'finance' ? 'Proposition A · Verify-to-Finance' : 'Proposition B · Resilience Record'}</span>
          <h1>{f.name}</h1>
          <p>{caseTitle(c)}{c.builtYear ? `, built ${c.builtYear}` : ''} · {f.village}, {f.district} · AgriStack {f.agristack}</p>
        </div>
        <Pill tone={s.tone}>{s.label}</Pill>
      </header>

      {locked
        ? <LockedRecord c={c} name={f.name} />
        : <>
          <NextBanner c={c} mine={mine} waiting={waiting} role={role} onSwitch={r => setRole(r)} />
          <div className="case-grid">
            <div className="col">
              {mine && <ActionPanel c={c} />}
              <Timeline c={c} />
              <RemotePanel c={c} />
              <EvidenceLedger c={c} />
              <ActivityLog c={c} />
            </div>
            <div className="col side">
              {c.kind === 'finance' && <MoneyCard c={c} />}
              {c.kind === 'finance' && c.steps.fieldCheck?.state === 'done' && <GreenTag c={c} />}
              <FarmCard c={c} />
              <ConsentCard c={c} />
              {c.kind === 'record' && isComplete(c) && role === 'mitra' && (
                <div className="card cta-card">
                  <Sparkles size={18} />
                  <h3>Finance the next asset</h3>
                  <p>{f.name.split(' ')[0]} already has a verified {ASSETS[c.asset].name.toLowerCase()}. Drip on the same field is the usual next step.</p>
                  <button className="btn primary sm" onClick={() => go({ page: 'assess', id: f.id })}>Start a Dhara Plan<ArrowRight size={14} /></button>
                </div>
              )}
            </div>
          </div>
        </>}
    </div>
  );
}

function LockedRecord({ c, name }: { c: Case; name: string }) {
  const { updateCase, toast } = useStore();
  const req = (c.requests ?? []).find(r => r.org === LENDER && r.status === 'pending');
  const declined = (c.requests ?? []).find(r => r.org === LENDER && r.status === 'declined');
  return (
    <div className="card locked">
      <Lock size={22} />
      <div>
        <h2>Not shared with {LENDER}</h2>
        <p>This Resilience Record belongs to {name}. You can see it only after she consents. Requests reach her in the Dhara Kisan app and she approves with an OTP.</p>
        <div className="locked-a">
          {req ? <span className="pill gold"><span className="dot" />Request sent {fmtDate(req.at)} · waiting for {name.split(' ')[0]}</span>
            : <button className="btn primary sm" onClick={() => { updateCase(c.id, x => { x.requests = [...(x.requests ?? []), { id: uid('q'), org: LENDER, purpose: 'Limit review and next investment loan', at: today(), status: 'pending' }]; x.log.unshift({ at: today(), who: 'Ananya Rao · Lender', text: `${LENDER} requested access to the record.` }); x.updated = today(); }); toast(`Request sent to ${name}`); }}><Send size={14} />Request access</button>}
          {declined && !req && <small className="muted">Her last answer was no ({fmtDate(declined.at)}).</small>}
        </div>
      </div>
    </div>
  );
}

function NextBanner({ c, mine, waiting, role, onSwitch }: { c: Case; mine: boolean; waiting: Role[]; role: Role; onSwitch: (r: Role) => void }) {
  const others = waiting.filter(w => w !== role);
  const switches = others.length > 0 && <div className="banner-actions">{others.map(w => <button key={w} className={'btn sm ' + (mine ? 'soft' : 'ghost')} onClick={() => onSwitch(w)}>Act as {roleOf(w)!.label}<ArrowRight size={14} /></button>)}</div>;
  if (c.declined) return <div className="banner grey"><Ban size={18} /><div><strong>Declined by the lender</strong><p>{c.declined}</p></div></div>;
  if (isComplete(c)) return <div className="banner green"><ShieldCheck size={18} /><div><strong>{c.kind === 'finance' ? 'Fully verified and live' : 'Resilience Record issued'}</strong><p>{c.kind === 'finance' ? 'All tranches released against proof. Seasonal satellite monitoring continues for the loan’s life.' : 'Each fact is labelled by how it is known. The farmer chooses who sees it.'}</p></div></div>;
  if (mine) {
    const a = activeSteps(c).filter(s => st(c, s.key) === 'failed' || s.owner !== 'system');
    const minePart = a.filter(s => st(c, s.key) === 'failed' || s.owner === role);
    return <div className="banner brand"><Sparkles size={18} /><div><strong>Your move</strong><p>{minePart.map(s => st(c, s.key) === 'failed' ? `Fix and resubmit: ${s.label}` : s.action).join(' · ')}{others.length ? ` · also waiting on ${others.map(w => roleOf(w)!.label).join(', ')}` : ''}</p></div>{switches}</div>;
  }
  return (
    <div className="banner">
      <Users size={18} />
      <div><strong>Waiting on {waiting.map(w => roleOf(w)!.label).join(' and ')}</strong><p>{activeSteps(c).map(s => st(c, s.key) === 'failed' ? `Rework on ${s.label.toLowerCase()}` : s.action).join(' · ')}</p></div>
      {switches}
    </div>
  );
}

/* ---------------- Timeline ---------------- */

function Timeline({ c }: { c: Case }) {
  return (
    <section className="card">
      <div className="card-head"><h2>Verification timeline</h2><small>{FLOW[c.kind].filter(s => st(c, s.key) === 'done').length} of {FLOW[c.kind].length} steps</small></div>
      <ol className="timeline">
        {FLOW[c.kind].map(s => {
          const state = st(c, s.key);
          const rec = c.steps[s.key];
          const owner = s.owner === 'system' ? 'Dhara' : roleOf(s.owner)!.label;
          return (
            <li key={s.key} className={state}>
              <span className="tl-icon">{state === 'done' ? <Check size={14} /> : state === 'failed' ? <X size={14} /> : state === 'active' ? <span className="pulse" /> : <Circle size={10} />}</span>
              <div className="tl-body">
                <div className="tl-top">
                  <h3>{s.label}</h3>
                  <span className="owner">{owner}</span>
                  {s.release && c.kind === 'finance' && <span className={'release ' + (c.released[s.release] ? 'paid' : '')}><Banknote size={12} />{c.released[s.release] ? 'Released' : 'Releases'} {inrShort(trancheAmount(c, s.release))}</span>}
                </div>
                <p>{s.desc}</p>
                {rec?.at && <small>{state === 'failed' ? 'Not passed' : 'Done'} {fmtDate(rec.at)}{rec.by ? ` · ${rec.by}` : ''}{rec.note ? ` · “${rec.note}”` : ''}</small>}
                {state === 'active' && rec?.note && <small className="warn">{rec.note}</small>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------------- Actions ---------------- */

function ActionPanel({ c }: { c: Case }) {
  const { role } = useStore();
  const steps = activeSteps(c).filter(s => {
    if (st(c, s.key) === 'failed') return role === (c.kind === 'finance' ? 'installer' : 'mitra');
    return s.owner === role;
  });
  return <>{steps.map(s => <section className="card action" key={s.key} aria-label={'Action: ' + s.label}>
    <div className="card-head"><div><span className="eyebrow">Your action</span><h2>{st(c, s.key) === 'failed' ? `Rework: ${s.label}` : s.action}</h2></div>{s.layer && <span className="chip">{s.layer}</span>}</div>
    {st(c, s.key) === 'failed' ? <Rework c={c} s={s} />
      : s.key === 'sanction' ? <Sanction c={c} />
      : s.key === 'deliver' || s.key === 'commission' ? <InstallerUpload c={c} s={s} />
      : s.key === 'satellite' || s.key === 'history' ? <RemoteCheck c={c} s={s} />
      : s.key === 'subsidy' ? <SubsidyPack c={c} />
      : <FieldCheck c={c} s={s} />}
  </section>)}</>;
}

function Sanction({ c }: { c: Case }) {
  const { updateCase, toast } = useStore();
  const p = plan(c.asset, c.units);
  const [bridge, setBridge] = useState(c.bridge);
  const [checks, setChecks] = useState([false, false, false]);
  const [decline, setDecline] = useState(false);
  const [reason, setReason] = useState('');
  const items = ['Payback checked in the Dhara Plan', 'Loan sized to the farmer’s share only', `Installer is Dhara-certified (${installerName(c.installer)})`];
  const { state } = useStore();
  const scan = scanFarm(farmerOf(state, c));
  const fit = scan.recs.find(r => r.asset === c.asset);
  return (
    <div>
      <div className="ai-box">
        <div className="ai-box-h"><Wand2 size={15} /><strong>AI credit summary</strong><span className="ai-tag">AI · demo · {Math.round(scan.confidence * 100)}%</span></div>
        <p>{ASSETS[c.asset].name} ranks <strong>{scan.recs.indexOf(fit!) + 1} of 4</strong> for this plot (fit {fit?.score}/100). The field lost about {scan.dryLoss}% greenness in {scan.dryYears} dry years since 2017; {scan.groundwater.en.toLowerCase()}. Expected benefit covers the instalment <strong>{p.cover.toFixed(1)}×</strong>. No red flags in the plan; first repayment falls after the rabi harvest.</p>
        <small>Explains the case; the decision stays with you.</small>
      </div>
      <div className="terms-grid">
        <div><small>Investment loan (85% of share)</small><strong>{inr(p.loan)}</strong></div>
        <div><small>Farmer pays upfront</small><strong>{inr(p.own)}</strong></div>
        <div><small>Annual instalment, from first harvest</small><strong>{inr(p.instalment)}</strong></div>
        <div><small>Benefit covers instalment</small><strong>{p.cover.toFixed(1)}×</strong></div>
      </div>
      <label className="switch-line"><input type="checkbox" checked={bridge} onChange={e => setBridge(e.target.checked)} /><span><strong>Add subsidy bridge of {inr(p.subsidy)}</strong><small>Repaid when the state releases the subsidy against Dhara’s pack</small></span></label>
      <p className="fine">Co-lending: {LENDER} originates and keeps 20%; {PARTNER_BANK} funds 80%. 13% a year to the farmer, 1% processing fee ({inr(p.fee)}), five annual instalments.</p>
      <fieldset className="checks"><legend>Before you sanction</legend>
        {items.map((t, i) => <label key={t} className="check-line"><input type="checkbox" checked={checks[i]} onChange={e => setChecks(checks.map((x, j) => j === i ? e.target.checked : x))} />{t}</label>)}
      </fieldset>
      {decline && <label className="field">Reason for declining<textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Shared with the farmer through the Dhara Mitra" /></label>}
      <div className="actions">
        {decline
          ? <><button className="btn ghost" onClick={() => setDecline(false)}>Cancel</button><button className="btn danger" disabled={!reason.trim()} onClick={() => { updateCase(c.id, x => { x.declined = reason.trim(); x.log.unshift({ at: today(), who: 'Ananya Rao · Lender', text: 'Loan declined: ' + reason.trim(), tone: 'fail' }); x.updated = today(); }); toast('Loan declined'); }}>Confirm decline</button></>
          : <><button className="btn ghost" onClick={() => setDecline(true)}>Decline</button><button className="btn primary" disabled={!checks.every(Boolean)} onClick={() => { updateCase(c.id, x => { x.bridge = bridge; completeStep(x, 'sanction', 'lender', bridge ? 'Sanctioned with subsidy bridge' : 'Sanctioned without bridge'); }); toast(`Loan sanctioned. ${inrShort(p.loan + (bridge ? p.subsidy : 0))} held in tranches until each check passes.`); }}><Check size={16} />Sanction loan</button></>}
      </div>
    </div>
  );
}

function fakePhoto(label: string, geo: string, at: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3ea"/><stop offset="1" stop-color="#f4ead2"/></linearGradient></defs><rect width="320" height="220" fill="url(#s)"/><path d="M0 120 Q80 100 160 118 T320 112 V220 H0Z" fill="#b9c98f"/><path d="M0 150 Q90 132 170 150 T320 146 V220 H0Z" fill="#8fae6a"/>${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${20 + i * 50}" y1="220" x2="${120 + i * 14}" y2="132" stroke="#3f6b45" stroke-width="2.5"/>`).join('')}<circle cx="262" cy="46" r="20" fill="#f6c76b"/><rect x="0" y="182" width="320" height="38" fill="#0b2a20cc"/><text x="10" y="198" font-family="monospace" font-size="11" fill="#fff">${label}</text><text x="10" y="212" font-family="monospace" font-size="10" fill="#c8e6d4">${geo} · ${at}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function useUpload() {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [err, setErr] = useState('');
  const pick = (list: FileList | null) => {
    setErr('');
    for (const file of Array.from(list ?? [])) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) { setErr('Use JPG, PNG, WebP or PDF.'); continue; }
      if (file.size > 500_000) { setErr('Each file must be 500 KB or smaller in this demo.'); continue; }
      const r = new FileReader();
      r.onload = () => setFiles(f => [...f, { name: file.name, type: file.type, data: String(r.result) }]);
      r.readAsDataURL(file);
    }
  };
  return { files, setFiles, err, pick };
}

function InstallerUpload({ c, s }: { c: Case; s: StepDef }) {
  const { updateCase, toast } = useStore();
  const p = plan(c.asset, c.units);
  const deliver = s.key === 'deliver';
  const [invoice, setInvoice] = useState(deliver ? `JS/26/${c.id.slice(3)}` : '');
  const [amount, setAmount] = useState(String(p.cost));
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<Attachment | null>(null);
  const up = useUpload();
  const geo = '25.39° N, 79.71° E';
  const ready = photo && note.trim() && (!deliver || invoice.trim());
  return (
    <div>
      <p className="muted">{deliver ? 'Upload the invoice and geotagged photos of the delivered kit. Tranche 1 is released once Dhara verifies them.' : 'Show the asset fitted and running. An independent field check follows; it releases tranche 2.'}</p>
      <div className="form-grid">
        {deliver && <label className="field">Invoice number<input value={invoice} onChange={e => setInvoice(e.target.value)} /></label>}
        {deliver && <label className="field">Invoice amount (₹)<input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} /></label>}
        <label className="field wide">{deliver ? 'What was delivered?' : 'What was installed and tested?'}<textarea value={note} onChange={e => setNote(e.target.value)} placeholder={deliver ? 'e.g. 16 mm laterals, screen filter, venturi, 2,400 emitters' : 'e.g. Laid across both plots, pressure-tested at 1.2 bar'} /></label>
      </div>
      <div className="capture">
        {photo
          ? <figure className="photo"><img src={photo.data} alt={`Geotagged photo: ${photo.name}`} /><figcaption><MapPin size={12} />{geo} · inside plot boundary</figcaption></figure>
          : <button className="capture-btn" onClick={() => setPhoto({ name: deliver ? 'delivery-photo.svg' : 'commissioning-photo.svg', type: 'image/svg+xml', data: fakePhoto(deliver ? 'DELIVERY · ' + c.id : 'COMMISSIONING · ' + c.id, geo, today()) })}><Camera size={20} /><span><strong>Capture geotagged photo</strong><small>Simulated camera · stamps location and time</small></span></button>}
        <label className="upload"><Upload size={18} /><span><strong>Attach invoice or papers</strong><small>JPG, PNG, WebP or PDF · 500 KB max · optional</small></span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={e => up.pick(e.target.files)} /></label>
      </div>
      {up.err && <p className="error" role="alert">{up.err}</p>}
      {!!up.files.length && <ul className="files">{up.files.map(f => <li key={f.name}><Paperclip size={13} />{f.name}<button className="icon-btn" aria-label={'Remove ' + f.name} onClick={() => up.setFiles(up.files.filter(x => x !== f))}><X size={13} /></button></li>)}</ul>}
      <div className="actions">
        <button className="btn primary" disabled={!ready} onClick={() => {
          updateCase(c.id, x => {
            const at = today();
            x.evidence.unshift({ id: uid('e'), label: deliver ? `Invoice ${invoice} · ${inr(+amount || 0)}` : 'Commissioning photos', detail: note.trim(), prov: 'installer', at, by: installerName(x.installer), geo: geo + ' · within plot boundary', file: photo! });
            up.files.forEach(f => x.evidence.unshift({ id: uid('e'), label: f.name, detail: 'Attached by installer', prov: 'installer', at, by: installerName(x.installer), file: f }));
            completeStep(x, s.key, 'installer', note.trim());
          });
          toast(deliver ? 'Delivery evidence submitted. Waiting for verification to release tranche 1.' : 'Commissioning submitted. An independent field check is next.');
        }}><Check size={16} />Submit for verification</button>
      </div>
    </div>
  );
}

const CHECKS: Record<string, string[]> = {
  verifyDelivery: ['Invoice matches the sanctioned asset and amount', 'Photo geotag falls inside the farmer’s plot', 'Timestamp is after sanction and before today'],
  fieldCheck: ['Asset installed to specification on this plot', 'Runs on commissioning (pressure, flow or water held)', 'Farmer confirms the installer explained use and upkeep'],
  assetCheck: ['Asset exists on the farmer’s plot and is working', 'Papers or subsidy sanction attached where they exist', 'Farmer confirms ownership and year built'],
};

function FieldCheck({ c, s }: { c: Case; s: StepDef }) {
  const { updateCase, toast } = useStore();
  const items = CHECKS[s.key] ?? [];
  const [checks, setChecks] = useState(items.map(() => false));
  const [method, setMethod] = useState(s.key === 'verifyDelivery' ? 'Document and geotag review' : 'Field visit');
  const [note, setNote] = useState('');
  const toVerify = c.evidence.filter(e => e.prov === 'installer' || e.prov === 'self').slice(0, 3);
  const release = s.release ? `${T_LABEL[s.release]} of ${inr(trancheAmount(c, s.release))}` : '';
  return (
    <div>
      {(s.key === 'verifyDelivery' || s.key === 'fieldCheck' || s.key === 'assetCheck') && (() => { const pc = photoCheck(c.asset, c.id); return (
        <div className="ai-box">
          <div className="ai-box-h"><Wand2 size={15} /><strong>AI photo pre-check</strong><span className="ai-tag">AI · demo · {Math.round(pc.conf * 100)}%</span></div>
          <ul>{pc.findings.map(x => <li key={x}><Check size={13} />{x}</li>)}<li><Check size={13} />{pc.geo}</li><li><Check size={13} />{pc.time}</li></ul>
          <small>Flags what to look at. Your check is what releases money.</small>
        </div>); })()}
      {!!toVerify.length && <div className="to-verify">{toVerify.map(e => <div key={e.id} className="mini-ev">{e.file?.type.startsWith('image') ? <img src={e.file.data} alt="" /> : <FileText size={18} />}<div><strong>{e.label}</strong><small>{e.detail}</small><ProvChip prov={e.prov} /></div></div>)}</div>}
      <label className="field">Method<select value={method} onChange={e => setMethod(e.target.value)}><option>Field visit</option><option>Document and geotag review</option><option>Video call with farmer</option></select></label>
      <fieldset className="checks"><legend>Checklist</legend>
        {items.map((t, i) => <label key={t} className="check-line"><input type="checkbox" checked={checks[i]} onChange={e => setChecks(checks.map((x, j) => j === i ? e.target.checked : x))} />{t}</label>)}
      </fieldset>
      <label className="field">Verifier notes<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What you saw, and anything the installer must fix" /></label>
      {release && <p className="release-note"><Banknote size={15} />Passing releases {release} to {installerName(c.installer)}.</p>}
      <div className="actions">
        <button className="btn ghost danger-text" disabled={!note.trim()} onClick={() => { updateCase(c.id, x => failStep(x, s.key, 'verifier', note.trim())); toast('Check not passed. Payment held; the case goes back for rework.'); }}><X size={16} />Not passed</button>
        <button className="btn primary" disabled={!checks.every(Boolean)} onClick={() => {
          updateCase(c.id, x => {
            x.evidence.unshift({ id: uid('e'), label: s.key === 'verifyDelivery' ? 'Delivery matched to invoice' : s.key === 'assetCheck' ? 'Asset installed and working' : 'Installed correctly and runs', detail: `${method}${note.trim() ? ' · ' + note.trim() : ''}`, prov: 'verified', at: today(), by: 'Meera Singh · Field verifier' });
            completeStep(x, s.key, 'verifier', note.trim() || method);
          });
          toast(release ? `Passed. ${release} released.` : 'Passed and added to the record.');
        }}><ShieldCheck size={16} />Pass check</button>
      </div>
    </div>
  );
}

function RemoteCheck({ c, s }: { c: Case; s: StepDef }) {
  const { updateCase, toast } = useStore();
  const [unused, setUnused] = useState(false);
  const [note, setNote] = useState('');
  const isHist = s.key === 'history';
  const d = drySpell(c.id, !unused);
  const h = history(c.id, c.builtYear ?? 2021);
  const gap = isHist ? 0 : +(d.plot.slice(3, 8).reduce((a, v, i) => a + v - d.block[i + 3], 0) / 5).toFixed(2);
  return (
    <div>
      {isHist
        ? <DualChart title="Dry-spell NDVI drop, plot versus block" labels={h.years} bars={h.deficit} barLabel="IMD rainfall deficit, %" lines={[{ name: 'Block median NDVI drop', values: h.block, cls: 'l-block' }, { name: 'This plot', values: h.plot, cls: 'l-plot' }]} yMax={50} unit="%" />
        : <DualChart title="NDVI through the first dry spell" labels={d.labels} bars={d.rain} barLabel="IMD rainfall, mm/week" lines={[{ name: 'Block median', values: d.block, cls: 'l-block' }, { name: 'This plot', values: d.plot, cls: 'l-plot' }]} yMin={0.3} yMax={0.8} />}
      <div className="readings">
        {isHist
          ? <><div><small>Archive read</small><strong>2017 – 2025</strong></div><div><small>Dry years since built</small><strong>{h.years.filter((y, i) => y >= (c.builtYear ?? 0) && h.deficit[i] > 25).length}</strong></div><div><small>Avg drop vs block since built</small><strong>{Math.round(100 - 100 * avg(h.plot.filter((_, i) => h.years[i] >= (c.builtYear ?? 0))) / avg(h.block.filter((_, i) => h.years[i] >= (c.builtYear ?? 0))))}% lower</strong></div></>
          : <><div><small>Sentinel-2 NDVI gap in dry weeks</small><strong className={gap > 0.06 ? 'good' : 'bad'}>{gap > 0 ? '+' : ''}{gap}</strong></div><div><small>Sentinel-1 soil moisture</small><strong className={d.moisture > 0.2 ? 'good' : 'bad'}>{d.moisture} m³/m³</strong></div><div><small>Holdback at stake</small><strong>{inr(trancheAmount(c, 'hold'))}</strong></div></>}
      </div>
      {!isHist && <label className="switch-line compact"><input type="checkbox" checked={unused} onChange={e => setUnused(e.target.checked)} /><span><strong>Simulate an unused asset</strong><small>See how a failed reading holds the money back</small></span></label>}
      <label className="field">Notes<textarea value={note} onChange={e => setNote(e.target.value)} placeholder={isHist ? 'e.g. Pond surface water visible every rabi since 2021' : 'e.g. Plot stayed green through weeks 3–7 while the block browned'} /></label>
      <div className="actions">
        {!isHist && <button className="btn ghost danger-text" disabled={!note.trim()} onClick={() => { updateCase(c.id, x => failStep(x, s.key, 'verifier', note.trim())); toast('Use not confirmed. Holdback stays with the lender; installer sent back.'); }}><X size={16} />Flag: not in use</button>}
        <button className="btn primary" disabled={!isHist && unused} onClick={() => {
          updateCase(c.id, x => {
            x.evidence.unshift({ id: uid('e'), label: isHist ? 'Dry-spell history since 2017' : 'In use through first dry spell', detail: note.trim() || (isHist ? 'Field held up better than the block in dry years' : `NDVI ${gap > 0 ? '+' : ''}${gap} above block in dry weeks; soil moisture ${d.moisture}`), prov: 'remote', at: today(), by: 'Dhara satellite stack' });
            completeStep(x, s.key, 'verifier', note.trim() || (isHist ? 'History read' : 'Use confirmed'));
          });
          toast(isHist ? 'History confirmed. Resilience Record issued.' : `Use confirmed. Holdback of ${inr(trancheAmount(c, 'hold'))} released.`);
        }}><Satellite size={16} />{isHist ? 'Confirm history' : 'Confirm in use'}</button>
      </div>
    </div>
  );
}
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

function SubsidyPack({ c }: { c: Case }) {
  const { state, updateCase, toast } = useStore();
  const f = farmerOf(state, c);
  const p = plan(c.asset, c.units);
  const [note, setNote] = useState('');
  const pack = [
    ['AgriStack farmer ID matched', f.agristack],
    ['Invoice from certified installer', installerName(c.installer)],
    ['Geotagged delivery and commissioning photos', 'Inside plot boundary'],
    ['Independent field check passed', fmtDate(c.steps.fieldCheck?.at)],
    ['Scheme', ASSETS[c.asset].scheme],
  ];
  return (
    <div>
      <div className="pack">
        {pack.map(([k, v]) => <div key={k}><Check size={15} /><span>{k}</span><strong>{v}</strong></div>)}
      </div>
      <div className="terms-grid two">
        <div><small>Subsidy due ({ASSETS[c.asset].subsidyPct}%)</small><strong>{inr(p.subsidy)}</strong></div>
        <div><small>Paid to</small><strong>{c.bridge ? `${LENDER} (repays bridge)` : installerName(c.installer)}</strong></div>
      </div>
      <label className="field">Notes for the file<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional for approval; required to return the pack" /></label>
      <div className="actions">
        <button className="btn ghost danger-text" disabled={!note.trim()} onClick={() => { updateCase(c.id, x => failStep(x, 'subsidy', 'state', note.trim())); toast('Pack returned for correction.'); }}><X size={16} />Return pack</button>
        <button className="btn primary" onClick={() => { updateCase(c.id, x => completeStep(x, 'subsidy', 'state', note.trim() || 'Pack accepted without a separate inspection')); toast(`Subsidy of ${inr(p.subsidy)} released.`); }}><Check size={16} />Approve and release subsidy</button>
      </div>
    </div>
  );
}

function Rework({ c, s }: { c: Case; s: StepDef }) {
  const { updateCase, toast } = useStore();
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(false);
  const rec = c.steps[s.key];
  return (
    <div>
      <div className="banner rust inline"><AlertTriangle size={17} /><div><strong>{rec?.by ?? 'Checker'} did not pass this step</strong><p>{rec?.note}</p></div></div>
      <label className="field">What did you fix?<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Replaced clogged filter and re-laid the north lateral" /></label>
      <label className="check-line"><input type="checkbox" checked={photo} onChange={e => setPhoto(e.target.checked)} />Attach a new geotagged photo (simulated)</label>
      <div className="actions"><button className="btn primary" disabled={!note.trim()} onClick={() => {
        updateCase(c.id, x => {
          if (photo) x.evidence.unshift({ id: uid('e'), label: 'Rework photo', detail: note.trim(), prov: c.kind === 'finance' ? 'installer' : 'self', at: today(), by: c.kind === 'finance' ? installerName(x.installer) : 'Farmer, via Dhara Mitra', geo: '25.39° N, 79.71° E', file: { name: 'rework.svg', type: 'image/svg+xml', data: fakePhoto('REWORK · ' + c.id, '25.39° N, 79.71° E', today()) } });
          reworkStep(x, s.key, c.kind === 'finance' ? 'installer' : 'mitra', note.trim());
        });
        toast('Resubmitted. The check is back in the verifier’s queue.');
      }}>Resubmit for check</button></div>
    </div>
  );
}

/* ---------------- Side cards ---------------- */

function MoneyCard({ c }: { c: Case }) {
  const p = plan(c.asset, c.units);
  const sanctioned = c.steps.sanction?.state === 'done';
  const ts = (['t1', 't2', 'hold'] as const);
  let nextSet = false;
  const parts = ts.map(t => {
    const s = c.released[t] ? 'released' as const : !nextSet ? (nextSet = true, 'next' as const) : 'locked' as const;
    return { t, label: T_LABEL[t], value: trancheAmount(c, t), state: s };
  });
  const trigger: Record<Tranche, string> = { t1: 'Verified delivery', t2: 'Independent field check', hold: 'In use through first dry spell' };
  return (
    <section className="card money">
      <div className="card-head"><h2>Money</h2>{sanctioned ? <Pill tone="green">Sanctioned</Pill> : <Pill tone="grey">Not yet sanctioned</Pill>}</div>
      <dl className="ledger">
        <div><dt>Asset cost</dt><dd>{inr(p.cost)}</dd></div>
        <div><dt>Subsidy · {ASSETS[c.asset].subsidyPct}%</dt><dd>− {inr(p.subsidy)}</dd></div>
        <div className="sum"><dt>Farmer’s share</dt><dd>{inr(p.share)}</dd></div>
        <div><dt>Investment loan · 85%</dt><dd>{inr(p.loan)}</dd></div>
        <div><dt>Paid upfront by farmer</dt><dd>{inr(p.own)}</dd></div>
        {c.bridge && <div><dt>Subsidy bridge</dt><dd>{inr(p.subsidy)}</dd></div>}
      </dl>
      <div className="row-between strong"><span>Released through Dhara</span><strong>{inr(disbursement(c))}</strong></div>
      <TrancheBar parts={parts} />
      <ul className="tranche-list">
        {parts.map(x => <li key={x.t} className={x.state}><span className="tick-dot" /><span className="tl-l">{x.label}<small>{trigger[x.t]}</small></span><strong>{inr(x.value)}</strong><em>{x.state === 'released' ? `Released ${fmtDate(c.released[x.t])}` : x.state === 'next' ? (sanctioned ? 'Next to unlock' : 'After sanction') : 'Locked'}</em></li>)}
      </ul>
      <p className="fine">13% a year · 1% fee · nothing due until first harvest, then 5 instalments of {inr(p.instalment)}. Expected benefit {inr(p.benefit)} a year.</p>
    </section>
  );
}

function GreenTag({ c }: { c: Case }) {
  return (
    <section className="card green-tag">
      <Leaf size={18} />
      <div>
        <h3>Green-finance eligible</h3>
        <p>{c.asset === 'solar' ? 'Renewable energy for irrigation' : 'Water-efficient irrigation and adaptation'} · end-use independently verified, as RBI’s 2025 climate finance directions require.</p>
      </div>
    </section>
  );
}

function FarmCard({ c }: { c: Case }) {
  const { state } = useStore();
  const f = farmerOf(state, c);
  return (
    <section className="card">
      <div className="card-head"><h2>Farm</h2><Sprout size={18} className="muted-icon" /></div>
      <dl className="facts">
        <div><dt>Land</dt><dd>{f.acres} acres</dd></div>
        <div><dt>Crops</dt><dd>{f.crop}</dd></div>
        <div><dt>Water</dt><dd>{f.water}</dd></div>
        <div><dt>Installer</dt><dd>{c.installer ? installerName(c.installer) : '—'}</dd></div>
      </dl>
      <div className="tags">{f.woman && <span className="tag">Woman farmer</span>}{f.tenant && <span className="tag">Tenant · FPO group loan</span>}<span className="tag">{f.district} · Bundelkhand</span></div>
    </section>
  );
}

const ORGS = [LENDER, PARTNER_BANK, 'Tata AIG (asset cover)', 'UP Agriculture Department'];

function ConsentCard({ c }: { c: Case }) {
  const { state, role, updateCase, toast } = useStore();
  const f = farmerOf(state, c);
  const [open, setOpen] = useState(false);
  const [revoke, setRevoke] = useState('');
  const [org, setOrg] = useState(ORGS[0]);
  const [purpose, setPurpose] = useState('Limit review and next investment loan');
  const [months, setMonths] = useState('6');
  const [ok, setOk] = useState(false);
  const canShare = role === 'mitra' && isComplete(c);
  return (
    <section className="card">
      <div className="card-head"><h2>Consent and sharing</h2><Lock size={16} className="muted-icon" /></div>
      <p className="muted">{f.name.split(' ')[0]} owns this record. Each share is specific, time-limited, logged and revocable (DPDP Act, 2023).</p>
      {(c.requests ?? []).filter(r => r.status === 'pending').map(r => <div key={r.id} className="req-line"><Clock size={14} /><span><strong>{r.org}</strong> asked {fmtDate(r.at)} · waiting for {f.name.split(' ')[0]} in her app</span></div>)}
      {c.shares.length === 0 ? <p className="muted small">Not shared with anyone yet.</p> : (
        <ul className="shares">
          {c.shares.map(s => (
            <li key={s.id} className={s.revoked ? 'revoked' : ''}>
              <div><strong>{s.org}</strong><small>{s.purpose}</small><small>{s.revoked ? `Revoked ${fmtDate(s.revoked)}` : `Until ${fmtDate(s.expires)}${s.viewed ? ` · opened ${fmtDate(s.viewed)}` : ''}`}</small></div>
              {!s.revoked && role === 'mitra' && <button className="btn ghost sm" onClick={() => setRevoke(s.id)}>Revoke</button>}
            </li>
          ))}
        </ul>
      )}
      {canShare && <button className="btn soft full" onClick={() => { setOpen(true); setOk(false); }}><Share2 size={15} />Share on consent</button>}
      {!isComplete(c) && role === 'mitra' && <p className="fine">Sharing opens once the record is issued.</p>}
      {open && <Modal title="Share on consent" sub={`${f.name}’s Resilience Record · ${caseTitle(c)}`} onClose={() => setOpen(false)}>
        <label className="field">Share with<select value={org} onChange={e => setOrg(e.target.value)}>{ORGS.map(o => <option key={o}>{o}</option>)}</select></label>
        <label className="field">Purpose<input value={purpose} onChange={e => setPurpose(e.target.value)} /></label>
        <label className="field">For how long<select value={months} onChange={e => setMonths(e.target.value)}><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option></select></label>
        <div className="share-preview"><h4>They will see</h4>{c.evidence.slice(0, 4).map(e => <div key={e.id}><span>{e.label}</span><ProvChip prov={e.prov} /></div>)}<small>Every fact keeps its label. The recipient keeps the lending decision.</small></div>
        <label className="check-line"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} />{f.name} confirmed consent by OTP on her phone</label>
        <div className="actions"><button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn primary" disabled={!ok || !purpose.trim()} onClick={() => {
          updateCase(c.id, x => {
            const exp = new Date(); exp.setMonth(exp.getMonth() + +months);
            x.shares.unshift({ id: uid('s'), org, purpose: purpose.trim(), granted: today(), expires: exp.toISOString().slice(0, 10) });
            x.log.unshift({ at: today(), who: 'Ramesh Kushwaha · Dhara Mitra', text: `${f.name} consented to share the record with ${org} for ${months} months.` });
            x.updated = today();
          });
          setOpen(false); toast(`Shared with ${org}`);
        }}>Confirm sharing</button></div>
      </Modal>}
      {revoke && <Modal title="Revoke access?" onClose={() => setRevoke('')}>
        <p className="muted">The recipient loses access immediately. What they already saw stays in their audit trail.</p>
        <div className="actions"><button className="btn ghost" onClick={() => setRevoke('')}>Keep sharing</button><button className="btn danger" onClick={() => {
          updateCase(c.id, x => { const s = x.shares.find(s => s.id === revoke)!; s.revoked = today(); x.log.unshift({ at: today(), who: 'Ramesh Kushwaha · Dhara Mitra', text: `Consent for ${s.org} revoked at ${f.name}’s request.` }); x.updated = today(); });
          setRevoke(''); toast('Access revoked');
        }}>Revoke access</button></div>
      </Modal>}
    </section>
  );
}

/* ---------------- Evidence, remote sensing and log ---------------- */

function RemotePanel({ c }: { c: Case }) {
  const satStep = c.kind === 'finance' ? 'satellite' : 'history';
  const s = st(c, satStep);
  if (s !== 'done') return null;
  const d = drySpell(c.id, true);
  const h = history(c.id, c.builtYear ?? 2021);
  return (
    <section className="card">
      <div className="card-head"><div><h2>{c.kind === 'finance' ? 'Use through the first dry spell' : 'How the field held up in dry years'}</h2><small>Sentinel-2 optical and Sentinel-1 radar, read against IMD rainfall · illustrative</small></div><ProvChip prov="remote" /></div>
      {c.kind === 'finance'
        ? <DualChart title="NDVI through the first dry spell" labels={d.labels} bars={d.rain} barLabel="IMD rainfall, mm/week" lines={[{ name: 'Block median', values: d.block, cls: 'l-block' }, { name: 'This plot', values: d.plot, cls: 'l-plot' }]} yMin={0.3} yMax={0.8} />
        : <DualChart title="Dry-spell NDVI drop, plot versus block" labels={h.years} bars={h.deficit} barLabel="IMD rainfall deficit, %" lines={[{ name: 'Block median NDVI drop', values: h.block, cls: 'l-block' }, { name: 'This plot', values: h.plot, cls: 'l-plot' }]} yMax={50} unit="%" />}
    </section>
  );
}

function EvidenceLedger({ c }: { c: Case }) {
  const [view, setView] = useState<string | null>(null);
  const shown = c.evidence.find(e => e.id === view);
  return (
    <section className="card">
      <div className="card-head"><div><h2>Evidence ledger</h2><small>Every fact is labelled by how it is known</small></div></div>
      <div className="prov-key">{(Object.keys(PROV) as (keyof typeof PROV)[]).map(p => <ProvChip key={p} prov={p} />)}</div>
      {c.evidence.length === 0 ? <p className="muted">No evidence yet.</p> : (
        <ul className="evidence">
          {c.evidence.map(e => (
            <li key={e.id}>
              {e.file ? (e.file.type.startsWith('image')
                ? <button className="thumb" onClick={() => setView(e.id)} aria-label={'View ' + e.label}><img src={e.file.data} alt="" /></button>
                : <a className="thumb doc" href={e.file.data} download={e.file.name} aria-label={'Download ' + e.file.name}><FileText size={18} /></a>)
                : <span className={'thumb ic ' + e.prov}>{e.prov === 'remote' ? <Satellite size={17} /> : e.prov === 'verified' ? <ShieldCheck size={17} /> : <History size={17} />}</span>}
              <div className="ev-body">
                <div className="ev-top"><strong>{e.label}</strong><ProvChip prov={e.prov} /></div>
                <p>{e.detail}</p>
                <small>{fmtDate(e.at)} · {e.by}{e.geo ? ` · ${e.geo}` : ''}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
      {shown?.file && <Modal title={shown.label} sub={`${shown.by} · ${fmtDate(shown.at)}`} onClose={() => setView(null)} wide><img className="full-img" src={shown.file.data} alt={shown.label} />{shown.geo && <p className="muted"><MapPin size={13} /> {shown.geo}</p>}</Modal>}
    </section>
  );
}

function ActivityLog({ c }: { c: Case }) {
  const [all, setAll] = useState(false);
  const list = all ? c.log : c.log.slice(0, 6);
  return (
    <section className="card">
      <div className="card-head"><h2>Activity</h2><small>Audit trail · {c.log.length} events</small></div>
      <ul className="log">
        {list.map((e, i) => <li key={i} className={e.tone ?? ''}><span className="log-dot">{e.tone === 'money' ? <Banknote size={12} /> : e.tone === 'fail' ? <X size={12} /> : e.tone === 'ok' ? <Check size={12} /> : <Circle size={8} />}</span><div><p>{e.text}</p><small>{fmtDate(e.at)} · {e.who}</small></div></li>)}
      </ul>
      {c.log.length > 6 && <button className="link" onClick={() => setAll(!all)}>{all ? 'Show less' : `Show all ${c.log.length} events`}</button>}
    </section>
  );
}

