import { useState, type ReactNode } from 'react';
import { ArrowRight, Check, Lock, Send, FileText, Loader2, Upload, Volume2, Clock, Banknote, Wrench, ShieldCheck, Satellite, Building2, Play, CalendarDays, Ban, MessageCircle, MapPin } from 'lucide-react';
import { ASSETS, LENDER, PARTNER_BANK, INSTALLERS, plan, inr, inrShort, uid, today, advance, completeStep, fmtDate, trancheAmount, installerName, activeSteps, st, demoAdvance, roleOf, type Case } from '../model';
import { useStore } from '../store';
import { AssetIcon, TrancheBar } from '../ui';
import { scanFarm, affordability, docCheck, eta, plainStatus, photoCheck, assetName } from './ai';
import { useFarmer, AiPanel, StageHead, OTP, Tick } from './parts';
import { readDraft, writeDraft } from './PlanStage';

export default function FinanceStage() {
  const { f, cases, t, lang, setTab, askAi } = useFarmer();
  const active = cases.filter(c => c.kind === 'finance' && !c.declined).sort((a, b) => Number(a.steps.record?.state === 'done') - Number(b.steps.record?.state === 'done'));
  const declined = cases.find(c => c.kind === 'finance' && c.declined);
  const draft = readDraft(f.id);
  const [sel, setSel] = useState(active[0]?.id ?? '');
  const [applyMode, setApplyMode] = useState(false);
  const c = active.find(x => x.id === sel) ?? active[0];
  const showApply = !!draft && (!c || applyMode);

  return (
    <div className="fa-page">
      <StageHead n={2} title={t('Finance: get it paid for, safely', 'वित्त: सुरक्षित तरीके से पैसा')} sub={t('Tata Capital lends 85% of your share. The installer is paid in three parts, each only after a check passes, so a bad install never becomes your debt.', 'टाटा कैपिटल आपके हिस्से का 85% कर्ज़ देता है। इंस्टॉलर को तीन हिस्सों में भुगतान, हर जाँच के बाद, ताकि ख़राब काम आपका कर्ज़ न बने।')}
        right={<button className="btn ghost" onClick={() => askAi(lang === 'hi' ? 'मुझे कितना देना होगा?' : 'How much will I pay?')}><MessageCircle size={16} />{t('Ask AI about money', 'पैसे पर AI से पूछें')}</button>} />

      {active.length > 0 && <div className="case-chips">
        {active.map(x => <button key={x.id} className={!showApply && c?.id === x.id ? 'on' : ''} onClick={() => { setSel(x.id); setApplyMode(false); }}><AssetIcon asset={x.asset} size={15} />{assetName(x.asset, lang)} · {x.id}</button>)}
        {draft && <button className={showApply ? 'on' : ''} onClick={() => setApplyMode(true)}><Send size={14} />{t('New application', 'नया आवेदन')}</button>}
      </div>}

      {showApply ? <Apply draftAsset={draft!} />
        : c ? <Tracker c={c} />
        : <section className="fa-card fa-start fa-narrow">
            <span className="fa-start-i">{declined ? <Ban size={22} /> : <Banknote size={22} />}</span>
            <h2>{declined ? t('Your last application was not approved', 'पिछला आवेदन मंज़ूर नहीं हुआ') : t('Nothing to finance yet', 'अभी वित्त के लिए कुछ नहीं')}</h2>
            <p>{declined ? declined.declined : t('Start in Plan: run the AI farm check and choose what to build. Your plan then comes here as a loan application.', 'योजना से शुरू करें: AI खेत जाँच चलाएँ और चुनें क्या लगवाना है। फिर योजना यहाँ आवेदन बनकर आएगी।')}</p>
            <button className="btn primary" onClick={() => setTab('plan')}>{t('Go to Plan', 'योजना पर जाएँ')}<ArrowRight size={15} /></button>
          </section>}
    </div>
  );
}

/* ---------------- Apply ---------------- */

const INCOMES = [100000, 150000, 250000, 400000];
const OTHERS = [0, 10000, 25000, 50000];

function Apply({ draftAsset }: { draftAsset: { asset: keyof typeof ASSETS; units: number; installer: string; bridge: boolean } }) {
  const { f, t, lang, setTab } = useFarmer();
  const { state, update, toast } = useStore();
  const d = draftAsset;
  const p = plan(d.asset, d.units);
  const [income, setIncome] = useState(150000);
  const [other, setOther] = useState(0);
  const [docs, setDocs] = useState<Record<string, 'none' | 'reading' | 'done'>>({ land: 'none', bank: 'none' });
  const [otp, setOtp] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const af = affordability(p.instalment, income, other);
  const docsDone = docs.land === 'done' && docs.bank === 'done';
  const explain = t(
    `You pay ${inr(p.own)} now. Tata Capital pays the rest of your share, ${inr(p.loan)}, straight to ${installerName(d.installer)}, but only in three parts, after each check passes. You pay nothing more until your first harvest. Then you pay ${inr(p.instalment)} once a year for five years. In a normal year the ${assetName(d.asset, lang).toLowerCase()} should save or earn you about ${inr(p.benefit)}, roughly ${p.cover.toFixed(1)} times the instalment.`,
    `आप अभी ${inr(p.own)} देंगी। टाटा कैपिटल बाकी ${inr(p.loan)} सीधे ${installerName(d.installer)} को देगा, पर तीन हिस्सों में, हर जाँच पास होने के बाद। पहली फ़सल तक कुछ नहीं देना। फिर पाँच साल तक साल में एक बार ${inr(p.instalment)}। सामान्य साल में लगभग ${inr(p.benefit)} की बचत या कमाई होगी, यानी किस्त का ${p.cover.toFixed(1)} गुना।`);
  const speak = () => {
    try {
      const s = window.speechSynthesis;
      if (!s) { setSpeaking(true); setTimeout(() => setSpeaking(false), 2500); return; }
      if (speaking) { s.cancel(); setSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(explain); u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'; u.onend = () => setSpeaking(false);
      setSpeaking(true); s.speak(u);
    } catch { setSpeaking(false); }
  };
  const read = (k: 'land' | 'bank') => { setDocs(x => ({ ...x, [k]: 'reading' })); setTimeout(() => setDocs(x => ({ ...x, [k]: 'done' })), 900); };

  const submit = () => {
    const id = 'DH-' + (Math.max(0, ...state.cases.filter(c => c.id.startsWith('DH-')).map(c => +c.id.slice(3))) + 1);
    const scan = scanFarm(f);
    update(s => {
      const at = today();
      const c: Case = { id, kind: 'finance', farmerId: f.id, asset: d.asset, units: d.units, installer: d.installer, bridge: d.bridge, created: at, updated: at, steps: {}, released: {}, evidence: [], shares: [], log: [] };
      c.evidence.push({ id: uid('e'), label: 'AI farm check', detail: `${scan.soil.en} · ${scan.groundwater.en} · ~${scan.dryLoss}% dry-spell greenness loss`, prov: 'remote', at, by: 'Dhara AI (demo)' });
      c.evidence.push({ id: uid('e'), label: 'Land record and bank passbook', detail: 'Read by Dhara AI; names and area match AgriStack', prov: 'self', at, by: 'Farmer, via Dhara Kisan app' });
      c.evidence.push({ id: uid('e'), label: 'Farm and water profile', detail: `${f.acres} acres · ${f.crop} · ${f.water} · affordability ${af.verdict}`, prov: 'self', at, by: 'Farmer, via Dhara Kisan app' });
      c.log.push({ at, who: 'Farmer · Dhara Kisan app', text: `Farmer applied from the app and consented by OTP to share her plan with ${LENDER}.` });
      advance(c, at);
      completeStep(c, 'assess', 'farmer', `Dhara Plan filed by the farmer: ${ASSETS[d.asset].name.toLowerCase()}${ASSETS[d.asset].perAcre ? ` on ${d.units} acre${d.units > 1 ? 's' : ''}` : ''}${d.bridge ? ', bridge requested' : ''}`, at);
      s.cases.unshift(c);
    });
    writeDraft(f.id, null);
    window.scrollTo({ top: 0 });
    toast(t(`Application sent to ${LENDER}. Case ${id}.`, `आवेदन ${LENDER} को भेजा गया। केस ${id}।`));
  };

  return (
    <>
      <section className="fa-card">
        <div className="fa-card-h"><div><h2><AssetIcon asset={d.asset} size={18} />{t('Your loan offer', 'आपका कर्ज़ प्रस्ताव')}</h2><small>{assetName(d.asset, lang)}{ASSETS[d.asset].perAcre ? ` · ${d.units} ${t('acres', 'एकड़')}` : ''} · {LENDER} {t('with', 'और')} {PARTNER_BANK} · {t('Fixed terms. Not AI.', 'तय शर्तें। AI नहीं।')}</small></div><button className="link" onClick={() => setTab('plan')}>{t('Change plan', 'योजना बदलें')}</button></div>
        <div className="offer-grid">
          <div className="big"><small>{t('Loan', 'कर्ज़')}</small><strong>{inr(p.loan)}</strong><em>{t('85% of your share', 'आपके हिस्से का 85%')}</em></div>
          <div className="big own"><small>{t('You pay now', 'आप अभी देंगी')}</small><strong>{inr(p.own)}</strong><em>{t('15% of your share', 'आपके हिस्से का 15%')}</em></div>
          <div><small>{t('Interest', 'ब्याज')}</small><strong>13% {t('a year', 'सालाना')}</strong></div>
          <div><small>{t('Processing fee', 'प्रोसेसिंग फ़ीस')}</small><strong>{inr(p.fee)}</strong></div>
          <div><small>{t('First payment', 'पहली किस्त')}</small><strong>{t('After harvest', 'फ़सल के बाद')}</strong></div>
          <div><small>{t('Then', 'फिर')}</small><strong>5 × {inr(p.instalment)}</strong></div>
          <div><small>{t('Subsidy', 'सब्सिडी')}</small><strong>{inr(p.subsidy)}</strong></div>
          <div><small>{t('Bridge', 'ब्रिज')}</small><strong>{d.bridge ? t('Yes, installer paid now', 'हाँ, इंस्टॉलर को अभी') : t('No', 'नहीं')}</strong></div>
        </div>
      </section>

      <div className="fa-grid">
        <div className="fa-col">
          <AiPanel title={t('Your loan in simple words', 'आपका कर्ज़, आसान शब्दों में')} sources={['Your loan offer', 'Dhara Plan']}
            action={<button className="link" onClick={speak}><Volume2 size={13} />{speaking ? t('Stop', 'रोकें') : t('Listen', 'सुनें')}</button>}>
            <p className="ai-say lg">{explain}</p>
          </AiPanel>
          <AiPanel title={t('Can you afford it?', 'क्या आप चुका पाएँगी?')} sub={t('Tell us roughly; nothing is checked or shared', 'अंदाज़ा बताइए; कुछ जाँचा या साझा नहीं होता')} sources={['Your answers', 'Instalment due after rabi harvest']}>
            <div className="aff-in">
              <label className="field">{t('Household income a year', 'घर की सालाना आय')}<select aria-label="Household income" value={income} onChange={e => setIncome(+e.target.value)}>{INCOMES.map(v => <option key={v} value={v}>{inrShort(v)}{v === 400000 ? '+' : ''}</option>)}</select></label>
              <label className="field">{t('Other loan payments a year', 'दूसरे कर्ज़ की सालाना किस्त')}<select aria-label="Other loan payments" value={other} onChange={e => setOther(+e.target.value)}>{OTHERS.map(v => <option key={v} value={v}>{v ? inr(v) : t('None', 'कोई नहीं')}</option>)}</select></label>
            </div>
            <div className={'verdict ' + af.verdict}>
              <strong>{af.verdict === 'comfortable' ? t('Comfortable', 'आराम से') : af.verdict === 'manageable' ? t('Manageable', 'संभव') : t('Stretched', 'तंग')}</strong>
              <span>{af.verdict === 'stretched'
                ? t(`The instalment would take more than your usual yearly saving (about ${inr(af.surplus)}). Consider fewer acres or a pond first.`, `किस्त आपकी सालाना बचत (लगभग ${inr(af.surplus)}) से ज़्यादा होगी। कम एकड़ या पहले तालाब पर विचार करें।`)
                : t(`The instalment of ${inr(p.instalment)} is about ${Math.round(af.share * 100)}% of what you usually save in a year (about ${inr(af.surplus)}), and it falls due right after the rabi harvest.`, `${inr(p.instalment)} की किस्त आपकी सालाना बचत (लगभग ${inr(af.surplus)}) का लगभग ${Math.round(af.share * 100)}% है, और रबी फ़सल के ठीक बाद देनी है।`)}</span>
            </div>
            <div className="flow-bars" aria-label={t('Money coming in through the year', 'साल भर आमदनी')}>
              {af.months.map((m, i) => { const max = Math.max(...af.inflow); return <div key={m} className={m === af.dueMonth ? 'due' : ''}><span style={{ height: Math.max(4, af.inflow[i] / max * 70) + 'px' }} /><small>{m}</small>{m === af.dueMonth && <em>{t('Due', 'किस्त')}</em>}</div>; })}
            </div>
          </AiPanel>
        </div>
        <div className="fa-col">
          <AiPanel title={t('Document check', 'कागज़ों की जाँच')} sub={t('Take a photo; Dhara AI reads it and matches it to AgriStack', 'फ़ोटो लें; धारा AI पढ़कर एग्रीस्टैक से मिलाता है')} sources={docsDone ? ['Your photos (simulated)', 'AgriStack'] : undefined}>
            {(['land', 'bank'] as const).map(k => {
              const r = docCheck(f, k);
              return (
                <div className="doc" key={k}>
                  <div className="doc-h"><FileText size={18} /><strong>{k === 'land' ? t('Land record (Khatauni)', 'भूमि रिकॉर्ड (खतौनी)') : t('Bank passbook', 'बैंक पासबुक')}</strong>
                    {docs[k] === 'none' && <button className="btn soft sm" onClick={() => read(k)}><Upload size={14} />{t('Add photo', 'फ़ोटो जोड़ें')}</button>}
                    {docs[k] === 'reading' && <span className="muted small"><Loader2 size={14} className="spin" /> {t('Reading…', 'पढ़ रहे हैं…')}</span>}
                    {docs[k] === 'done' && <span className="ok-text"><Check size={14} />{Math.round(r.conf * 100)}%</span>}
                  </div>
                  {docs[k] === 'done' && <dl className="doc-fields">{r.fields.map(x => <div key={x.k}><dt>{x.k}</dt><dd><Tick ok={x.ok} />{x.v}{x.note && <small>{x.note}</small>}</dd></div>)}</dl>}
                </div>
              );
            })}
          </AiPanel>
          <section className="fa-card">
            <h3>{t('Send your application', 'आवेदन भेजें')}</h3>
            <ul className="pre-list">
              <li className="ok"><Check size={14} />{t('Plan chosen', 'योजना चुनी')}</li>
              <li className={docsDone ? 'ok' : ''}>{docsDone ? <Check size={14} /> : <Clock size={14} />}{t('Documents read', 'कागज़ पढ़े गए')}</li>
              <li className={otp === OTP ? 'ok' : ''}>{otp === OTP ? <Check size={14} /> : <Lock size={14} />}{t('Consent with OTP', 'OTP से सहमति')}</li>
            </ul>
            <p className="muted small">{t(`The OTP shares this plan, your farm profile and documents with ${LENDER} and ${PARTNER_BANK} for this loan only.`, `OTP से यह योजना, खेत की जानकारी और कागज़ सिर्फ़ इस कर्ज़ के लिए ${LENDER} और ${PARTNER_BANK} से साझा होंगे।`)}</p>
            <label className="field">{t('Confirm with OTP', 'OTP से पुष्टि करें')}<input aria-label="Confirm with OTP" className="fa-otp sm" inputMode="numeric" maxLength={4} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} /></label>
            <p className="fa-hint"><Lock size={13} />{t('Demo code', 'डेमो कोड')}: <strong>{OTP}</strong></p>
            <button className="btn primary lg full" disabled={otp !== OTP || !docsDone} onClick={submit}><Send size={16} />{t(`Send to ${LENDER}`, `${LENDER} को भेजें`)}</button>
          </section>
        </div>
      </div>
    </>
  );
}

/* ---------------- Tracker ---------------- */

const FARMER_STEPS: { key: string; en: string; hi: string; icon: ReactNode }[] = [
  { key: 'assess', en: 'Application sent', hi: 'आवेदन भेजा', icon: <Send size={15} /> },
  { key: 'sanction', en: 'Loan approved', hi: 'कर्ज़ मंज़ूर', icon: <Banknote size={15} /> },
  { key: 'deliver', en: 'Kit delivered', hi: 'सामान पहुँचा', icon: <Wrench size={15} /> },
  { key: 'verifyDelivery', en: 'Delivery checked · payment 1', hi: 'डिलीवरी जाँच · भुगतान 1', icon: <ShieldCheck size={15} /> },
  { key: 'commission', en: 'Installed and running', hi: 'लगा और चालू', icon: <Wrench size={15} /> },
  { key: 'fieldCheck', en: 'Field check · payment 2', hi: 'खेत जाँच · भुगतान 2', icon: <ShieldCheck size={15} /> },
  { key: 'subsidy', en: 'Subsidy released', hi: 'सब्सिडी जारी', icon: <Building2 size={15} /> },
  { key: 'satellite', en: 'Works in a dry spell · last payment', hi: 'सूखे में चला · आख़िरी भुगतान', icon: <Satellite size={15} /> },
];

function Tracker({ c }: { c: Case }) {
  const { f, t, lang, setTab } = useFarmer();
  const { updateCase, toast } = useStore();
  const ps = plainStatus(c, lang);
  const p = plan(c.asset, c.units);
  const a = activeSteps(c);
  const photos = c.evidence.filter(e => e.prov === 'installer' && e.file);
  const due = new Date(c.created); due.setMonth(3); due.setFullYear(due.getFullYear() + 1); due.setDate(15);
  const sched = [0, 1, 2, 3, 4].map(i => { const d = new Date(due); d.setFullYear(d.getFullYear() + i); return d; });
  const fmtM = (d: Date) => d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const done = FARMER_STEPS.filter(s => st(c, s.key) === 'done').length;
  const nextParty = a[0] ? (st(c, a[0].key) === 'failed' ? roleOf('installer')!.label : a[0].owner === 'system' ? 'Dhara' : roleOf(a[0].owner)!.label) : '';
  return (
    <>
      <section className="fa-card fa-status">
        <div className="fa-status-top">
          <span className="asset-badge lg"><AssetIcon asset={c.asset} size={24} /></span>
          <div><small>{c.id} · {assetName(c.asset, lang)}{ASSETS[c.asset].perAcre ? ` · ${c.units} ${t(c.units > 1 ? 'acres' : 'acre', 'एकड़')}` : ''} · {installerName(c.installer)}</small><h2>{ps.title}</h2></div>
          <span className="prog-num"><b>{done}</b>/{FARMER_STEPS.length}</span>
        </div>
        <div className="meter big"><span style={{ width: done / FARMER_STEPS.length * 100 + '%' }} /></div>
      </section>

      <div className="fa-grid">
        <div className="fa-col">
          <AiPanel title={t('What is happening now', 'अभी क्या हो रहा है')} sources={['Your case timeline', 'Typical times in your district']}>
            <p className="ai-say lg">{ps.next}</p>
            <div className="eta-grid">
              <div><small>{t('Waiting on', 'किसके पास')}</small><strong>{ps.who}</strong></div>
              <div><small>{t('Usually takes', 'आमतौर पर समय')}</small><strong>{a[0] ? eta(a[0].key, lang) : '—'}</strong></div>
            </div>
            <div className="ai-tips"><strong>{t('What you can do', 'आप क्या कर सकती हैं')}</strong>
              <ul>
                {(a[0]?.key === 'sanction' ? [t('Keep your phone on; the lender may call to confirm.', 'फ़ोन चालू रखें; बैंक पुष्टि के लिए फ़ोन कर सकता है।'), t(`Keep ${inr(p.own)} ready to pay the installer at delivery.`, `डिलीवरी पर इंस्टॉलर को देने के लिए ${inr(p.own)} तैयार रखें।`)]
                  : a[0]?.key === 'deliver' || a[0]?.key === 'commission' ? [t('Be on the field when the installer comes; check every part against the invoice.', 'इंस्टॉलर आए तो खेत पर रहें; हर सामान बिल से मिलाएँ।'), t('Do not sign that it is complete until it runs.', 'चलने से पहले पूरा होने पर हस्ताक्षर न करें।')]
                  : a[0]?.key === 'fieldCheck' || a[0]?.key === 'verifyDelivery' ? [t('Show the checker the system running.', 'जाँचकर्ता को सिस्टम चलाकर दिखाएँ।'), t('Tell them about any leak or fault; the installer must fix it at no cost to you.', 'कोई रिसाव या ख़राबी हो तो बताएँ; इंस्टॉलर मुफ़्त ठीक करेगा।')]
                  : [t('Use the system in dry weeks; satellites confirm it is in use.', 'सूखे हफ़्तों में सिस्टम चलाएँ; सैटेलाइट उपयोग की पुष्टि करता है।'), t('Clean filters every two weeks.', 'हर दो हफ़्ते फ़िल्टर साफ़ करें।')]).map(x => <li key={x}><Check size={13} />{x}</li>)}
              </ul>
            </div>
          </AiPanel>

          <section className="fa-card">
            <div className="fa-card-h"><div><h2><CalendarDays size={18} />{t('Progress', 'प्रगति')}</h2><small>{t('Recorded by each party. Not AI.', 'हर पक्ष द्वारा दर्ज। AI नहीं।')}</small></div></div>
            <ol className="ftrack">
              {FARMER_STEPS.map(s => {
                const state = st(c, s.key);
                return <li key={s.key} className={state}><span className="ft-i">{state === 'done' ? <Check size={14} /> : state === 'failed' ? '!' : s.icon}</span><div><strong>{lang === 'hi' ? s.hi : s.en}</strong>{c.steps[s.key]?.at && <small>{fmtDate(c.steps[s.key]!.at)}{state === 'failed' && c.steps[s.key]?.note ? ` · ${c.steps[s.key]!.note}` : ''}</small>}{state === 'active' && <small className="now">{t('In progress', 'चल रहा है')}</small>}</div></li>;
              })}
            </ol>
          </section>
        </div>

        <div className="fa-col">
          <section className="fa-card">
            <div className="fa-card-h"><div><h2><ShieldCheck size={18} />{t('Installer payments', 'इंस्टॉलर भुगतान')}</h2><small>{t('Money moves only after each check. Not AI.', 'हर जाँच के बाद ही पैसा। AI नहीं।')}</small></div></div>
            <TrancheBar parts={(['t1', 't2', 'hold'] as const).map((x, k, arr) => ({ label: x, value: trancheAmount(c, x), state: c.released[x] ? 'released' : arr.slice(0, k).every(y => c.released[y]) ? 'next' : 'locked' }))} />
            <ul className="fa-tranches">
              {(['t1', 't2', 'hold'] as const).map((x, k) => <li key={x} className={c.released[x] ? 'paid' : ''}><span>{c.released[x] ? <Check size={14} /> : <Lock size={13} />}</span><div><strong>{[t('After delivery is checked', 'डिलीवरी जाँच के बाद'), t('After the field check', 'खेत जाँच के बाद'), t('After it works in a dry spell', 'सूखे में चलने के बाद')][k]}</strong><small>{c.released[x] ? t(`Paid ${fmtDate(c.released[x])}`, `${fmtDate(c.released[x])} को दिया`) : t('Held until then', 'तब तक रुका')}</small></div><em>{inrShort(trancheAmount(c, x))}</em></li>)}
            </ul>
          </section>

          <AiPanel title={t('AI checks on installer photos', 'इंस्टॉलर फ़ोटो की AI जाँच')} sub={t('Each upload is read before a human checker visits', 'हर फ़ोटो जाँचकर्ता के आने से पहले पढ़ी जाती है')} sources={photos.length ? ['Installer photos', 'AgriStack plot boundary'] : undefined}>
            {photos.length === 0 ? <p className="muted">{t('Photos appear here once the installer uploads them at delivery and commissioning.', 'डिलीवरी और फ़िटिंग पर इंस्टॉलर फ़ोटो भेजेगा तो यहाँ दिखेंगी।')}</p>
              : photos.map(e => { const pc = photoCheck(c.asset, e.id); return (
                <div className="photo-ai" key={e.id}>
                  <img src={e.file!.data} alt={e.label} />
                  <div><strong>{e.label}</strong><small>{fmtDate(e.at)} · {Math.round(pc.conf * 100)}% {t('confident', 'भरोसा')}</small>
                    <ul>{pc.findings.slice(0, 2).map(x => <li key={x}><Check size={12} />{x}</li>)}<li><MapPin size={12} />{pc.geo}</li></ul></div>
                </div>); })}
          </AiPanel>

          <section className="fa-card">
            <div className="fa-card-h"><div><h2><CalendarDays size={18} />{t('Repayment schedule', 'किस्तों का कैलेंडर')}</h2><small>{t('After each rabi harvest. Not AI.', 'हर रबी फ़सल के बाद। AI नहीं।')}</small></div></div>
            <table className="sched"><tbody>{sched.map((d, i) => <tr key={i}><td>{t(`Instalment ${i + 1}`, `किस्त ${i + 1}`)}</td><td>{fmtM(d)}</td><td className="num">{inr(p.instalment)}</td></tr>)}</tbody></table>
          </section>
        </div>
      </div>

      {a.length > 0 && <section className="demo-ctl">
        <div><strong><Play size={15} />{t('Demo control', 'डेमो नियंत्रण')}</strong><p>{t(`Plays the next party (${nextParty}) so you can see the whole journey from the farmer’s side. Not AI.`, `अगले पक्ष (${nextParty}) की भूमिका निभाता है ताकि किसान की तरफ़ से पूरी यात्रा दिखे। AI नहीं।`)}</p></div>
        <button className="btn ghost" onClick={() => { let label = ''; updateCase(c.id, x => { label = demoAdvance(x); }); setTimeout(() => toast(t(`Demo: ${label || 'next step'} done`, `डेमो: ${label || 'अगला कदम'} पूरा`)), 0); }}><Play size={15} />{t('Simulate next step', 'अगला कदम चलाएँ')}</button>
      </section>}
      {c.steps.record?.state === 'done' && <button className="btn primary" onClick={() => setTab('record')}>{t('See your Resilience Record', 'अपना रिकॉर्ड देखें')}<ArrowRight size={15} /></button>}
      <p className="muted small center">{INSTALLERS.find(i => i.id === c.installer)?.name} · {t('rated', 'रेटिंग')} ★ {INSTALLERS.find(i => i.id === c.installer)?.rating} · {f.village}</p>
    </>
  );
}
