import { useState } from 'react';
import { ScrollText, BadgeCheck, Clock, Bell, Lock, X, Share2, Camera, Loader2, Check, Send, MapPin, Play, ArrowRight, Banknote, Umbrella, Sparkles, MessageCircle, Languages, Plus } from 'lucide-react';
import { ASSETS, LENDER, PARTNER_BANK, PROV, uid, today, fmtDate, isComplete, history, drySpell, advance, log, demoAdvance, activeSteps, st, type AssetKey, type Case } from '../model';
import { useStore } from '../store';
import { AssetIcon, ProvChip, DualChart } from '../ui';
import { resilienceScore, lenderSummary, recordUses, photoCheck, assetName, eta, type Lang } from './ai';
import { useFarmer, AiPanel, StageHead, OtpConfirm, useCaseOps } from './parts';

const ORGS = [LENDER, PARTNER_BANK, 'Tata AIG (asset cover)', 'UP Agriculture Department'];

export default function RecordStage() {
  const { f, cases, t, lang, askAi, setTab } = useFarmer();
  const recs = cases.filter(c => c.kind === 'record' || isComplete(c));
  const [sel, setSel] = useState(recs[0]?.id ?? '');
  const [adding, setAdding] = useState(recs.length === 0);
  const c = recs.find(x => x.id === sel) ?? recs[0];
  const anyFin = cases.some(x => x.kind === 'finance' && !x.declined && !isComplete(x));

  return (
    <div className="fa-page">
      <StageHead n={3} title={t('Record: proof that you own', 'रिकॉर्ड: आपका अपना सबूत')} sub={t('A Resilience Record shows a lender or insurer what you built and how your field held up in dry years. Nobody sees it unless you say yes.', 'रेज़िलिएंस रिकॉर्ड बैंक या बीमा कंपनी को दिखाता है कि आपने क्या बनाया और सूखे में खेत कैसा रहा। आपकी हाँ के बिना कोई नहीं देखता।')}
        right={<button className="btn ghost" onClick={() => askAi(lang === 'hi' ? 'मेरा रिकॉर्ड कौन देख सकता है?' : 'Who can see my record?')}><MessageCircle size={16} />{t('Ask AI about my record', 'रिकॉर्ड पर AI से पूछें')}</button>} />

      <div className="case-chips">
        {recs.map(x => <button key={x.id} className={!adding && c?.id === x.id ? 'on' : ''} onClick={() => { setSel(x.id); setAdding(false); }}><AssetIcon asset={x.asset} size={15} />{assetName(x.asset, lang)}{x.builtYear ? `, ${x.builtYear}` : ''} · {isComplete(x) ? t('Issued', 'जारी') : t('Checking', 'जाँच')}</button>)}
        <button className={adding ? 'on' : ''} onClick={() => setAdding(true)}><Plus size={14} />{t('Record an asset I already have', 'पहले से बने ढाँचे का रिकॉर्ड')}</button>
      </div>

      {adding ? <AddRecord onDone={id => { setSel(id); setAdding(false); }} />
        : c ? (isComplete(c) ? <Issued c={c} /> : <InProgress c={c} />)
        : null}

      {recs.length === 0 && !adding && anyFin && <div className="note-bar"><Clock size={16} />{t('Your financed asset becomes a record once it passes all checks.', 'आपका ढाँचा सभी जाँच पास करते ही रिकॉर्ड बन जाएगा।')} <button className="link" onClick={() => setTab('finance')}>{t('Track it', 'देखें')}<ArrowRight size={13} /></button></div>}
    </div>
  );
}

function Passport({ c }: { c: Case }) {
  const { f, t, lang } = useFarmer();
  const done = isComplete(c);
  const h = history(c.id, c.builtYear ?? 2021);
  const d = drySpell(c.id, true);
  return (
    <article className="fa-passport">
      <header>
        <span className="asset-badge lg"><AssetIcon asset={c.asset} size={24} /></span>
        <div><small>{c.id} · {t('Resilience Record', 'रेज़िलिएंस रिकॉर्ड')}</small><h2>{assetName(c.asset, lang)}{c.builtYear ? `, ${c.builtYear}` : ''}</h2><p>{f.name} · {f.village}, {f.district} · AgriStack {f.agristack}</p></div>
        {done ? <span className="fa-seal"><BadgeCheck size={18} />{t('Verified', 'प्रमाणित')}</span> : <span className="fa-seal pending"><Clock size={16} />{t('Being checked', 'जाँच जारी')}</span>}
      </header>
      <div className="fa-pp-grid">
        <div>
          <h3>{t('Facts on this record', 'इस रिकॉर्ड के तथ्य')}</h3>
          <ul className="fa-facts">{c.evidence.filter(e => !e.file).slice(0, 6).map(e => <li key={e.id}><div><strong>{e.label}</strong><small>{fmtDate(e.at)} · {e.by}</small></div><ProvChip prov={e.prov} /></li>)}</ul>
          <div className="prov-key">{(Object.keys(PROV) as (keyof typeof PROV)[]).map(p => <ProvChip key={p} prov={p} />)}</div>
        </div>
        <div>
          <h3>{c.kind === 'record' ? t('How your field held up in dry years', 'सूखे सालों में आपका खेत') : t('Through the first dry spell', 'पहले सूखे में')}</h3>
          {done ? (c.kind === 'record'
            ? <DualChart title="Dry-spell NDVI drop" labels={h.years} bars={h.deficit} barLabel={t('Rainfall deficit %', 'बारिश की कमी %')} lines={[{ name: t('Block', 'ब्लॉक'), values: h.block, cls: 'l-block' }, { name: t('Your field', 'आपका खेत'), values: h.plot, cls: 'l-plot' }]} yMax={50} unit="%" height={170} />
            : <DualChart title="NDVI in dry spell" labels={d.labels} bars={d.rain} barLabel={t('Rain mm', 'बारिश mm')} lines={[{ name: t('Block', 'ब्लॉक'), values: d.block, cls: 'l-block' }, { name: t('Your field', 'आपका खेत'), values: d.plot, cls: 'l-plot' }]} yMin={0.3} yMax={0.8} height={170} />)
            : <p className="muted">{t('The chart appears once satellites have read your field.', 'सैटेलाइट जाँच के बाद चार्ट दिखेगा।')}</p>}
          <small className="muted">{t('Satellite readings are measurements from Sentinel-2 and IMD, labelled “Remotely confirmed”. Illustrative in this demo.', 'सैटेलाइट आँकड़े सेंटिनल-2 और IMD से मापे गए हैं। इस डेमो में काल्पनिक।')}</small>
        </div>
      </div>
    </article>
  );
}

function Issued({ c }: { c: Case }) {
  const { f, cases, t, lang, setTab } = useFarmer();
  const ops = useCaseOps();
  const sc = resilienceScore(c);
  const [sumLang, setSumLang] = useState<Lang>(lang);
  const uses = recordUses(c, f, cases, lang);
  const [share, setShare] = useState<{ org: string; purpose: string } | null>(null);
  const [allow, setAllow] = useState<string | null>(null);
  const [org, setOrg] = useState(ORGS[0]);
  const [months, setMonths] = useState(6);
  const pend = (c.requests ?? []).filter(r => r.status === 'pending');
  const live = c.shares.filter(s => !s.revoked);
  const R = 52, C = 2 * Math.PI * R;

  return (
    <>
      {pend.map(r => <div className="fa-req" key={r.id}><span className="fa-req-i"><Bell size={17} /></span><div><strong>{t(`${r.org} wants to see this record`, `${r.org} यह रिकॉर्ड देखना चाहता है`)}</strong><small>{r.purpose} · {fmtDate(r.at)}</small></div><div className="fa-req-a"><button className="btn ghost sm" onClick={() => ops.decline(c, r.id)}>{t('Decline', 'मना करें')}</button><button className="btn primary sm" onClick={() => setAllow(r.id)}>{t('Allow', 'अनुमति दें')}</button></div></div>)}
      <Passport c={c} />
      <div className="fa-grid">
        <div className="fa-col">
          <AiPanel title={t('Resilience score', 'रेज़िलिएंस स्कोर')} sub={t('How strong this record looks to a lender', 'बैंक को यह रिकॉर्ड कितना मज़बूत दिखता है')} sources={['Field checks', 'Satellite history', 'Repayment so far']}>
            <div className="score">
              <svg viewBox="0 0 130 130" className="score-ring" role="img" aria-label={`Score ${sc.total} of 100`}><circle cx="65" cy="65" r={R} className="bg" /><circle cx="65" cy="65" r={R} className="fg" strokeDasharray={`${C * sc.total / 100} ${C}`} /><text x="65" y="68" textAnchor="middle" className="n">{sc.total}</text><text x="65" y="88" textAnchor="middle" className="d">/100</text></svg>
              <div className="score-parts">
                <strong className="band">{sc.band === 'Strong' ? t('Strong', 'मज़बूत') : sc.band === 'Good' ? t('Good', 'अच्छा') : t('Building', 'बन रहा')}</strong>
                {sc.parts.map(p => <div key={p.en}><span>{lang === 'hi' ? p.hi : p.en}</span><div className="bar-track"><span className="ai" style={{ width: p.v / p.max * 100 + '%' }} /></div><b>{p.v}/{p.max}</b></div>)}
              </div>
            </div>
          </AiPanel>
          <AiPanel title={t('What a lender will read', 'बैंक क्या पढ़ेगा')} sub={t('Written by Dhara AI from the facts above', 'ऊपर के तथ्यों से धारा AI ने लिखा')} sources={['Facts on this record']}
            action={<button className="link" onClick={() => setSumLang(sumLang === 'en' ? 'hi' : 'en')}><Languages size={13} />{sumLang === 'en' ? 'हिंदी में' : 'In English'}</button>}>
            <blockquote className="ai-quote">{lenderSummary(c, f, sumLang)}</blockquote>
          </AiPanel>
        </div>
        <div className="fa-col">
          <AiPanel title={t('Ways to use your record', 'रिकॉर्ड का उपयोग कैसे करें')} sub={t('Suggested for you; you decide', 'आपके लिए सुझाव; फ़ैसला आपका')} sources={['Your record', 'AI farm check']}>
            <div className="uses">
              {uses.map(u => (
                <div key={u.kind} className="use">
                  <span className="use-i">{u.kind === 'kcc' ? <Banknote size={18} /> : u.kind === 'ins' ? <Umbrella size={18} /> : <Sparkles size={18} />}</span>
                  <div><strong>{u.title}</strong><small>{u.gain}</small><p>{u.why}</p></div>
                  {u.kind === 'next' ? <button className="btn soft sm" onClick={() => setTab('plan')}>{t('Plan it', 'योजना बनाएँ')}</button>
                    : live.some(s => s.org === u.org) ? <span className="ok-text"><Check size={14} />{t('Shared', 'साझा')}</span>
                    : <button className="btn soft sm" onClick={() => setShare({ org: u.org, purpose: u.kind === 'kcc' ? 'KCC limit review' : 'Asset insurance quote' })}><Share2 size={14} />{t('Share', 'साझा करें')}</button>}
                </div>
              ))}
            </div>
          </AiPanel>
          <section className="fa-card">
            <div className="fa-card-h"><div><h2><Lock size={18} />{t('Who can see it', 'कौन देख सकता है')}</h2><small>{t('Your consent log. Not AI.', 'आपकी सहमति का रिकॉर्ड। AI नहीं।')}</small></div></div>
            {live.length === 0 ? <p className="muted">{t('Only you.', 'सिर्फ़ आप।')}</p> : (
              <ul className="who-list">{live.map(s => <li key={s.id}><div><strong>{s.org}</strong><small>{s.purpose} · {t('until', 'तक')} {fmtDate(s.expires)}{s.viewed ? ` · ${t('opened', 'खोला')} ${fmtDate(s.viewed)}` : ''}</small></div><button className="btn ghost sm" onClick={() => ops.revoke(c, s.id)}><X size={14} />{t('Stop', 'रोकें')}</button></li>)}</ul>
            )}
            <button className="btn primary full" onClick={() => setShare({ org: ORGS[0], purpose: 'Loan or insurance decision' })}><Share2 size={15} />{t('Share my record', 'रिकॉर्ड साझा करें')}</button>
          </section>
        </div>
      </div>
      {allow && <OtpConfirm title={t('Allow access?', 'अनुमति दें?')} cta={t('Allow for 6 months', '6 महीने के लिए अनुमति')} onClose={() => setAllow(null)} onConfirm={() => ops.allow(c, allow)} body={<p className="muted">{t('They will see the facts and charts on this record. You can stop access any time.', 'वे इस रिकॉर्ड के तथ्य और चार्ट देखेंगे। आप कभी भी रोक सकती हैं।')}</p>} />}
      {share && <OtpConfirm title={t('Share my record', 'रिकॉर्ड साझा करें')} cta={t('Share', 'साझा करें')} onClose={() => setShare(null)} onConfirm={() => ops.share(c, share.org === ORGS[0] && org !== ORGS[0] ? org : share.org, share.purpose, months)}
        body={<>
          <label className="field">{t('Share with', 'किसके साथ')}<select value={share.org === ORGS[0] ? org : share.org} onChange={e => { setOrg(e.target.value); setShare({ ...share, org: e.target.value }); }}>{ORGS.map(o => <option key={o}>{o}</option>)}</select></label>
          <label className="field">{t('For how long', 'कितने समय के लिए')}<select value={months} onChange={e => setMonths(+e.target.value)}><option value={3}>{t('3 months', '3 महीने')}</option><option value={6}>{t('6 months', '6 महीने')}</option><option value={12}>{t('12 months', '12 महीने')}</option></select></label>
          <p className="muted small">{t('They see the facts, charts and the summary. They do not get your phone number or documents.', 'वे तथ्य, चार्ट और सारांश देखेंगे। फ़ोन नंबर या कागज़ नहीं।')}</p>
        </>} />}
    </>
  );
}

function InProgress({ c }: { c: Case }) {
  const { t, lang } = useFarmer();
  const { updateCase, toast } = useStore();
  const a = activeSteps(c);
  return (
    <>
      <Passport c={c} />
      <div className="fa-grid">
        <section className="fa-card fa-col">
          <div className="fa-card-h"><h2><Clock size={18} />{t('Where it stands', 'कहाँ तक पहुँचा')}</h2></div>
          <ol className="ftrack">{[['assetCheck', 'Field checker visits', 'जाँचकर्ता खेत पर आएगा'], ['history', 'Satellite history read', 'सैटेलाइट इतिहास पढ़ा जाएगा'], ['issue', 'Record issued', 'रिकॉर्ड जारी']].map(([k, en, hi]) => <li key={k} className={st(c, k)}><span className="ft-i">{st(c, k) === 'done' ? <Check size={14} /> : <Clock size={14} />}</span><div><strong>{t(en, hi)}</strong>{st(c, k) === 'active' && <small className="now">{t('Usually', 'आमतौर पर')} {eta(k, lang)}</small>}</div></li>)}</ol>
        </section>
        <AiPanel title={t('AI photo pre-check', 'AI फ़ोटो जाँच')} sources={['Your photo (simulated)']}>
          {c.evidence.some(e => e.label === 'AI photo pre-check') ? <p className="ai-say">{c.evidence.find(e => e.label === 'AI photo pre-check')!.detail}</p> : <p className="muted">{t('No photo was added. The field checker will take one.', 'कोई फ़ोटो नहीं जोड़ी गई। जाँचकर्ता लेगा।')}</p>}
        </AiPanel>
      </div>
      {a.length > 0 && <section className="demo-ctl">
        <div><strong><Play size={15} />{t('Demo control', 'डेमो नियंत्रण')}</strong><p>{t('Plays the field checker and the satellite read. Not AI.', 'जाँचकर्ता और सैटेलाइट की भूमिका निभाता है। AI नहीं।')}</p></div>
        <button className="btn ghost" onClick={() => { updateCase(c.id, x => { demoAdvance(x); }); toast(t('Demo: next check done', 'डेमो: अगली जाँच पूरी')); }}><Play size={15} />{t('Simulate next step', 'अगला कदम चलाएँ')}</button>
      </section>}
    </>
  );
}

function AddRecord({ onDone }: { onDone: (id: string) => void }) {
  const { f, t, lang } = useFarmer();
  const { state, update, toast } = useStore();
  const [asset, setAsset] = useState<AssetKey>(f.water.toLowerCase().includes('pond') ? 'pond' : 'drip');
  const [built, setBuilt] = useState(2021);
  const [photo, setPhoto] = useState<'none' | 'reading' | 'done'>('none');
  const pc = photoCheck(asset, f.id);
  const submit = () => {
    const id = 'RR-' + (Math.max(0, ...state.cases.filter(c => c.id.startsWith('RR-')).map(c => +c.id.slice(3))) + 1);
    update(s => {
      const at = today();
      const c: Case = { id, kind: 'record', farmerId: f.id, asset, units: 1, installer: '', bridge: false, created: at, updated: at, builtYear: built, steps: { request: { state: 'done', at, by: 'Farmer · Dhara Kisan app' } }, released: {}, evidence: [], shares: [], log: [] };
      c.evidence.push({ id: uid('e'), label: `${ASSETS[asset].name} built ${built}`, detail: 'Self-reported in the Dhara Kisan app', prov: 'self', at, by: 'Farmer' });
      if (photo === 'done') c.evidence.unshift({ id: uid('e'), label: 'AI photo pre-check', detail: `${pc.findings.join('; ')} · ${Math.round(pc.conf * 100)}% confident (demo)`, prov: 'remote', at, by: 'Dhara AI (demo)' });
      log(c, 'farmer', 'Farmer requested a Resilience Record from the app.', undefined, at);
      advance(c, at);
      s.cases.unshift(c);
    });
    toast(t('Record requested. A field checker will visit.', 'रिकॉर्ड का अनुरोध भेजा। जाँचकर्ता आएगा।'));
    onDone(id);
  };
  return (
    <div className="fa-grid">
      <section className="fa-card fa-col">
        <div className="fa-card-h"><div><h2><ScrollText size={18} />{t('Record an asset you already have', 'पहले से बने ढाँचे का रिकॉर्ड')}</h2><small>{t('Free for you. A lender pays ₹500 only if you share it.', 'आपके लिए मुफ़्त। बैंक ₹500 तभी देता है जब आप साझा करें।')}</small></div></div>
        <div className="fa-asset-pick">{(Object.keys(ASSETS) as AssetKey[]).map(a => <button key={a} aria-pressed={asset === a} className={asset === a ? 'on' : ''} onClick={() => { setAsset(a); setPhoto('none'); }}><AssetIcon asset={a} />{assetName(a, lang)}</button>)}</div>
        <label className="field">{t('Year built', 'बनाने का साल')}<select value={built} onChange={e => setBuilt(+e.target.value)}>{[2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map(y => <option key={y}>{y}</option>)}</select></label>
        <ol className="mini-steps"><li>{t('A field checker confirms it works', 'जाँचकर्ता पुष्टि करता है कि यह काम करता है')}</li><li>{t('Satellites read your field back to 2017', 'सैटेलाइट 2017 से आपका खेत पढ़ता है')}</li><li>{t('You get a record you control', 'आपको अपने नियंत्रण वाला रिकॉर्ड मिलता है')}</li></ol>
        <div className="actions"><button className="btn primary" onClick={submit}><Send size={15} />{t('Request my record', 'रिकॉर्ड का अनुरोध करें')}</button></div>
      </section>
      <AiPanel title={t('AI photo pre-check', 'AI फ़ोटो जाँच')} sub={t('Optional: a photo helps the checker', 'वैकल्पिक: फ़ोटो से जाँचकर्ता को मदद')} conf={photo === 'done' ? pc.conf : undefined} sources={photo === 'done' ? ['Your photo (simulated)', 'AgriStack plot'] : undefined}>
        {photo !== 'done' ? <button className="capture-btn" disabled={photo === 'reading'} onClick={() => { setPhoto('reading'); setTimeout(() => setPhoto('done'), 900); }}>{photo === 'reading' ? <Loader2 size={20} className="spin" /> : <Camera size={20} />}<span><strong>{photo === 'reading' ? t('Dhara AI is reading the photo…', 'धारा AI फ़ोटो पढ़ रहा है…') : t(`Take a photo of your ${assetName(asset, lang).toLowerCase()}`, `अपने ${assetName(asset, lang)} की फ़ोटो लें`)}</strong><small>{t('Simulated camera', 'सिम्युलेटेड कैमरा')}</small></span></button>
          : <div className="ai-photo">
              <div className="ai-photo-img"><AssetIcon asset={asset} size={34} /><span className="box b1" /><span className="box b2" /></div>
              <div><ul>{pc.findings.map(x => <li key={x}><Check size={13} />{x}</li>)}<li><MapPin size={13} />{pc.geo}</li></ul><small>{t('A human field checker still confirms it in person.', 'फिर भी जाँचकर्ता खेत पर आकर पुष्टि करेगा।')}</small></div>
            </div>}
      </AiPanel>
    </div>
  );
}
