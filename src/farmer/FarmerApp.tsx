import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Home, Sparkles, MessageCircle, LogOut, Phone, ShieldCheck, ArrowRight, ArrowLeft, Mic, Send, Satellite, CloudSun, Droplets, BadgeCheck, Banknote, Lock, Bell, ScrollText, Wand2, UserPlus, Loader2, Leaf, HandCoins, ClipboardList, Check, Info, Briefcase } from 'lucide-react';
import { ROLES, isComplete, fmtDate, uid, type Case, type Farmer, type Role } from '../model';
import { useStore } from '../store';
import { tr, advisory, plainStatus, answer, resilienceScore, assetName, type Lang, type Reply } from './ai';
import { FCtx, LangToggle, OtpConfirm, useCaseOps, initials, OTP, AiPanel, type Tab, type FarmerCtx, useFarmer } from './parts';
import PlanStage, { readDraft } from './PlanStage';
import FinanceStage from './FinanceStage';
import RecordStage from './RecordStage';

const SKEY = 'dhara.v3.farmer';
const LKEY = 'dhara.v3.lang';
const TABS: { id: Tab; en: string; hi: string; n?: number }[] = [
  { id: 'home', en: 'Home', hi: 'होम' },
  { id: 'plan', en: 'Plan', hi: 'योजना', n: 1 },
  { id: 'finance', en: 'Finance', hi: 'वित्त', n: 2 },
  { id: 'record', en: 'Record', hi: 'रिकॉर्ड', n: 3 },
  { id: 'ask', en: 'Ask AI', hi: 'AI से पूछें' },
];
const ICON: Record<Tab, ReactNode> = { home: <Home size={18} />, plan: <ClipboardList size={18} />, finance: <Banknote size={18} />, record: <ScrollText size={18} />, ask: <Sparkles size={18} /> };
const read = (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };
const write = (k: string, v: string) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* ignore */ } };
const LEGACY: Record<string, Tab> = { journey: 'finance', sahayak: 'ask' };

export default function FarmerApp() {
  const { state, route, go, setRole, role } = useStore();
  const [fid, setFid] = useState(() => read(SKEY));
  const [lang, setLangRaw] = useState<Lang>(() => (read(LKEY) === 'hi' ? 'hi' : 'en'));
  const [pendingQ, setPendingQ] = useState('');
  const setLang = (l: Lang) => { setLangRaw(l); write(LKEY, l); };
  const f = state.farmers.find(x => x.id === fid);
  const rid = LEGACY[route.id ?? ''] ?? route.id;
  const tab: Tab = (TABS.some(x => x.id === rid) ? rid : 'home') as Tab;
  const setTab = (t: Tab) => go({ page: 'farmer', id: t });
  const t = tr(lang);
  const login = (id: string) => { setFid(id); write(SKEY, id); setTab('home'); };
  const logout = () => { setFid(''); write(SKEY, ''); };
  const toPartner = () => { setRole('mitra'); go({ page: 'overview' }); };
  const roleSelect = <label className="fa-demo"><span>{t('View as', 'देखें')}</span><select aria-label="Demo role" value={role} onChange={e => { const r = e.target.value as Role; setRole(r); if (r !== 'farmer') go({ page: 'queue' }); }}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>;

  if (!f) return <Login lang={lang} setLang={setLang} onLogin={login} roleSelect={roleSelect} toPartner={toPartner} />;
  const cases = state.cases.filter(c => c.farmerId === f.id);
  const pending = cases.flatMap(c => (c.requests ?? []).filter(r => r.status === 'pending')).length;
  const ctx: FarmerCtx = { f, cases, lang, t, setTab, askAi: (q?: string) => { setPendingQ(q ?? ''); setTab('ask'); } };

  return (
    <FCtx.Provider value={ctx}>
      <div className="fa" lang={lang === 'hi' ? 'hi' : 'en'}>
        <header className="fa-top">
          <div className="fa-top-in">
            <button className="fa-brand" onClick={() => setTab('home')} aria-label="Dhara home"><span className="fa-logo"><Droplets size={18} /></span><strong>Dhara</strong><em>{t('Kisan', 'किसान')}</em></button>
            <nav className="fa-tabs" aria-label="Farmer app">
              {TABS.map(x => <button key={x.id} className={(tab === x.id ? 'on ' : '') + (x.id === 'ask' ? 'ai' : '')} aria-current={tab === x.id ? 'page' : undefined} onClick={() => setTab(x.id)}>{x.n ? <span className="tab-n">{x.n}</span> : ICON[x.id]}<span className="tab-l">{lang === 'hi' ? x.hi : x.en}</span>{x.id === 'home' && pending > 0 && <i className="fa-dot" />}</button>)}
            </nav>
            <div className="fa-top-r">
              <LangToggle lang={lang} setLang={setLang} />
              {roleSelect}
              <button className="fa-me" onClick={logout} title={t('Log out', 'लॉग आउट')}><span className="avatar sm f">{initials(f.name)}</span><span className="fa-me-t"><strong>{f.name}</strong><small>{t('Log out', 'लॉग आउट')}</small></span><LogOut size={15} /></button>
            </div>
          </div>
        </header>
        <main className="fa-main">
          {tab === 'home' && <HomeTab />}
          {tab === 'plan' && <PlanStage />}
          {tab === 'finance' && <FinanceStage />}
          {tab === 'record' && <RecordStage />}
          {tab === 'ask' && <Ask initial={pendingQ} onUsed={() => setPendingQ('')} />}
          <p className="fa-foot"><Info size={13} />{t('Prototype. Farms, money and satellite readings are simulated, and every purple “Dhara AI” panel is a demo response, not a live model.', 'प्रोटोटाइप। खेत, पैसा और सैटेलाइट आँकड़े काल्पनिक हैं, और हर बैंगनी “धारा AI” पैनल डेमो जवाब है।')} <button className="link" onClick={toPartner}><Briefcase size={13} />{t('Lender and partner portal', 'बैंक और पार्टनर पोर्टल')}</button></p>
        </main>
        {tab !== 'ask' && <button className="fab" onClick={() => ctx.askAi()} aria-label={t('Ask Dhara AI', 'धारा AI से पूछें')}><Sparkles size={18} /><span>{t('Ask Dhara AI', 'धारा AI से पूछें')}</span></button>}
        <nav className="fa-bottom" aria-label="Farmer app tabs">
          {TABS.map(x => <button key={x.id} className={(tab === x.id ? 'on ' : '') + (x.id === 'ask' ? 'ai' : '')} onClick={() => setTab(x.id)} aria-label={lang === 'hi' ? x.hi : x.en}>{x.n ? <span className="tab-n">{x.n}</span> : ICON[x.id]}<span>{lang === 'hi' ? x.hi : x.en}</span></button>)}
        </nav>
      </div>
    </FCtx.Provider>
  );
}

/* ---------------- Login ---------------- */

function Login({ lang, setLang, onLogin, roleSelect, toPartner }: { lang: Lang; setLang: (l: Lang) => void; onLogin: (id: string) => void; roleSelect: ReactNode; toPartner: () => void }) {
  const { state, update, go } = useStore();
  const t = tr(lang);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'pick' | 'phone' | 'otp' | 'register'>('pick');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [reg, setReg] = useState({ name: '', agristack: '', village: '', district: 'Mahoba', acres: 2, crop: '', water: 'Rain-fed only' });
  const [fetching, setFetching] = useState(false);
  const match = state.farmers.find(f => f.phone === phone);
  const stageOf = (f: Farmer): 0 | 1 | 2 => {
    const c = state.cases.filter(x => x.farmerId === f.id);
    if (c.some(x => x.kind === 'finance' && !x.declined && !isComplete(x))) return 1;
    return c.length ? 2 : 0;
  };
  const groups: [string, string, Farmer[]][] = [
    [t('Starting at Plan', 'योजना से शुरू'), t('No investment yet', 'अभी कोई निवेश नहीं'), state.farmers.filter(f => f.phone && stageOf(f) === 0)],
    [t('In Finance', 'वित्त में'), t('Loan or installation under way', 'कर्ज़ या फ़िटिंग जारी'), state.farmers.filter(f => f.phone && stageOf(f) === 1)],
    [t('Record ready', 'रिकॉर्ड तैयार'), t('Verified asset to share', 'साझा करने लायक प्रमाणित ढाँचा'), state.farmers.filter(f => f.phone && stageOf(f) === 2)],
  ];
  const sub = (f: Farmer) => {
    const c = state.cases.filter(x => x.farmerId === f.id);
    const fin = c.find(x => x.kind === 'finance' && !x.declined && !isComplete(x));
    if (c.some(x => (x.requests ?? []).some(r => r.status === 'pending'))) return t('Has a consent request', 'सहमति अनुरोध है');
    if (fin) return plainStatus(fin, lang).title;
    if (c.length) return t('Resilience Record', 'रेज़िलिएंस रिकॉर्ड');
    return `${f.acres} ${t('acres', 'एकड़')} · ${f.water}`;
  };
  const verify = () => {
    if (otp !== OTP) { setErr(t('That code is not right. Use the demo code shown.', 'कोड सही नहीं है। दिखाया गया डेमो कोड डालें।')); return; }
    setErr(''); if (match) onLogin(match.id); else setStep('register');
  };
  const fetchAgri = () => { setFetching(true); setTimeout(() => { setReg(r => ({ ...r, agristack: r.agristack || 'UP-09-' + phone.slice(2, 6) + '-' + phone.slice(6, 10), village: r.village || 'Kulpahar', district: 'Mahoba', acres: 2.5, crop: r.crop || 'Wheat, chickpea' })); setFetching(false); }, 700); };
  const register = () => {
    const id = uid('f');
    update(s => { s.farmers.push({ id, name: reg.name.trim(), agristack: reg.agristack.trim(), village: reg.village.trim(), district: reg.district, acres: reg.acres, crop: reg.crop.trim() || 'Wheat', water: reg.water, woman: true, tenant: false, phone }); });
    onLogin(id); go({ page: 'farmer', id: 'plan' });
  };
  const kamla = state.farmers.find(f => f.id === 'kamla');

  return (
    <div className="fa-login">
      <section className="fa-login-art">
        <div className="fa-brand big"><span className="fa-logo"><Droplets size={22} /></span><strong>Dhara</strong><em>{t('Kisan', 'किसान')}</em></div>
        <h1>{t('Build a drought-proof farm. Pay only for what works.', 'सूखे से सुरक्षित खेत बनाइए। भुगतान सिर्फ़ काम करने वाले ढाँचे का।')}</h1>
        <ol className="login-stages">
          <li><span>1</span><div><strong>{t('Plan', 'योजना')}</strong>{t('AI reads your field from space and tells you what to build.', 'AI अंतरिक्ष से खेत पढ़कर बताता है क्या लगवाएँ।')}</div></li>
          <li><span>2</span><div><strong>{t('Finance', 'वित्त')}</strong>{t('A loan for 85% of your share. The installer is paid only after checks.', 'आपके हिस्से का 85% कर्ज़। जाँच के बाद ही इंस्टॉलर को भुगतान।')}</div></li>
          <li><span>3</span><div><strong>{t('Record', 'रिकॉर्ड')}</strong>{t('Proof you own, for your next loan or insurance.', 'आपका सबूत, अगले कर्ज़ या बीमा के लिए।')}</div></li>
        </ol>
        <p className="login-ai"><Sparkles size={15} />{t('Dhara AI helps at every stage.', 'धारा AI हर चरण में मदद करता है।')}</p>
      </section>
      <section className="fa-login-pane">
        <div className="fa-login-bar"><LangToggle lang={lang} setLang={setLang} />{roleSelect}</div>
        <div className="fa-login-card">
          {step === 'pick' && <>
            <h2>{t('Welcome to Dhara', 'धारा में स्वागत है')}</h2>
            <p className="muted">{t('Pick a demo farmer to see her side of Dhara, or log in with a mobile number.', 'किसान की तरफ़ से धारा देखने के लिए डेमो किसान चुनें, या मोबाइल नंबर से लॉग इन करें।')}</p>
            {kamla && <button className="btn primary lg full" onClick={() => onLogin(kamla.id)}><Sparkles size={16} />{t(`Start as ${kamla.name}, a new farmer`, `${kamla.name} (नई किसान) के रूप में शुरू करें`)}<ArrowRight size={16} /></button>}
            {groups.map(([g, gs, list]) => list.length > 0 && <div className="fa-demo-group" key={g}><h4>{g}<small>{gs}</small></h4><div className="fa-demo-list">{list.map(f => <button key={f.id} onClick={() => onLogin(f.id)}><span className="avatar sm f">{initials(f.name)}</span><span><strong>{f.name}</strong><small>{f.village} · {sub(f)}</small></span><ArrowRight size={15} /></button>)}</div></div>)}
            <button className="btn ghost full" onClick={() => setStep('phone')}><Phone size={15} />{t('Log in with mobile number', 'मोबाइल नंबर से लॉग इन')}</button>
          </>}
          {step === 'phone' && <>
            <button className="back" onClick={() => setStep('pick')}><ArrowLeft size={15} />{t('Demo farmers', 'डेमो किसान')}</button>
            <h2>{t('Log in or sign up', 'लॉग इन या साइन अप')}</h2>
            <p className="muted">{t('Use the mobile number linked to your AgriStack farmer ID.', 'अपने एग्रीस्टैक किसान आईडी से जुड़ा मोबाइल नंबर डालें।')}</p>
            <label className="field">{t('Mobile number', 'मोबाइल नंबर')}<div className="fa-phone"><span>+91</span><input aria-label="Mobile number" inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></div></label>
            <button className="btn primary lg full" disabled={phone.length !== 10} onClick={() => { setStep('otp'); setOtp(''); }}><Phone size={16} />{t('Send OTP', 'OTP भेजें')}</button>
            <p className="fine">{t('No smartphone? Your Dhara Mitra at the nearest Rallis store or FPO can do all of this with you.', 'स्मार्टफ़ोन नहीं है? नज़दीकी रैलिस दुकान या FPO पर धारा मित्र मदद करेंगे।')}</p>
          </>}
          {step === 'otp' && <>
            <button className="back" onClick={() => setStep('phone')}><ArrowLeft size={15} />{t('Change number', 'नंबर बदलें')}</button>
            <h2>{t('Enter the code', 'कोड डालें')}</h2>
            <p className="muted">{t(`We sent a 4-digit code to +91 ${phone}.`, `+91 ${phone} पर 4 अंकों का कोड भेजा गया।`)}{match ? '' : ' ' + t('This number is new to Dhara.', 'यह नंबर धारा में नया है।')}</p>
            <label className="field">{t('Enter OTP', 'OTP डालें')}<input aria-label="Enter OTP" className="fa-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && otp.length === 4 && verify()} /></label>
            <p className="fa-hint"><Lock size={13} />{t('Demo code', 'डेमो कोड')}: <strong>{OTP}</strong></p>
            {err && <p className="error" role="alert">{err}</p>}
            <button className="btn primary lg full" disabled={otp.length !== 4} onClick={verify}>{t('Verify and continue', 'सत्यापित करें')}<ArrowRight size={16} /></button>
          </>}
          {step === 'register' && <>
            <h2>{t('Tell us about your farm', 'अपने खेत के बारे में बताएँ')}</h2>
            <p className="muted">{t('We can fetch most of it from AgriStack.', 'ज़्यादातर जानकारी एग्रीस्टैक से मिल जाएगी।')}</p>
            <label className="field">{t('Your name', 'आपका नाम')}<input value={reg.name} onChange={e => setReg({ ...reg, name: e.target.value })} /></label>
            <div className="fa-row">
              <label className="field grow">{t('AgriStack farmer ID', 'एग्रीस्टैक किसान आईडी')}<input value={reg.agristack} placeholder="UP-09-1234-5678" onChange={e => setReg({ ...reg, agristack: e.target.value.toUpperCase() })} /></label>
              <button className="btn soft" onClick={fetchAgri} disabled={fetching}>{fetching ? <Loader2 size={15} className="spin" /> : <Wand2 size={15} />}{t('Fetch from AgriStack', 'एग्रीस्टैक से लाएँ')}</button>
            </div>
            <div className="form-grid">
              <label className="field">{t('Village', 'गाँव')}<input value={reg.village} onChange={e => setReg({ ...reg, village: e.target.value })} /></label>
              <label className="field">{t('Land (acres)', 'ज़मीन (एकड़)')}<input type="number" min={0.5} step={0.5} value={reg.acres} onChange={e => setReg({ ...reg, acres: +e.target.value })} /></label>
              <label className="field">{t('Main crops', 'मुख्य फ़सलें')}<input value={reg.crop} onChange={e => setReg({ ...reg, crop: e.target.value })} /></label>
              <label className="field">{t('Water source', 'पानी का स्रोत')}<select value={reg.water} onChange={e => setReg({ ...reg, water: e.target.value })}>{['Rain-fed only', 'Borewell', 'Open well', 'Diesel pump on canal', 'Farm pond'].map(w => <option key={w}>{w}</option>)}</select></label>
            </div>
            <button className="btn primary lg full" disabled={!reg.name.trim() || !reg.village.trim() || !/^[A-Z]{2}-\d{2}-\d{4}-\d{4}$/.test(reg.agristack)} onClick={register}><UserPlus size={16} />{t('Create my account', 'मेरा खाता बनाएँ')}</button>
          </>}
        </div>
        <button className="link partner-link" onClick={toPartner}><Briefcase size={14} />{t('Lenders, verifiers and partners: open the partner portal', 'बैंक, जाँचकर्ता और पार्टनर: पार्टनर पोर्टल खोलें')}</button>
      </section>
    </div>
  );
}

/* ---------------- Home ---------------- */

function HomeTab() {
  const { f, cases, t, lang, setTab, askAi } = useFarmer();
  const ops = useCaseOps();
  const [confirm, setConfirm] = useState<{ c: Case; rid: string } | null>(null);
  const fins = cases.filter(c => c.kind === 'finance' && !c.declined);
  const fin = fins.find(c => !isComplete(c));
  const recs = cases.filter(c => c.kind === 'record' || isComplete(c));
  const issued = recs.filter(isComplete);
  const draft = readDraft(f.id);
  const reqs = cases.flatMap(c => (c.requests ?? []).filter(r => r.status === 'pending').map(r => ({ c, r })));
  const live = cases.find(c => (c.kind === 'record' && isComplete(c)) || (c.kind === 'finance' && c.steps.commission?.state === 'done'));
  const adv = advisory(f, live?.asset ?? null, lang);
  const updates = cases.flatMap(c => c.log.map(e => ({ ...e }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const hour = new Date().getHours();
  const best = issued[0] ? resilienceScore(issued[0]).total : 0;
  const ps = fin ? plainStatus(fin, lang) : null;

  const stages = [
    { n: 1, tab: 'plan' as Tab, title: t('Plan', 'योजना'), icon: <ClipboardList size={20} />,
      status: fins.length ? t('Done', 'पूरा') : draft ? t('Plan ready', 'योजना तैयार') : t('Start here', 'यहाँ से शुरू'), tone: fins.length ? 'done' : 'now',
      desc: t('Find out what would protect your farm, what it costs after subsidy, and whether it pays back.', 'जानें क्या आपके खेत को बचाएगा, सब्सिडी के बाद लागत, और क्या पैसा वापस आएगा।'),
      ai: [t('Farm check from 9 years of satellite images', '9 साल की सैटेलाइट तस्वीरों से खेत जाँच'), t('Ranks drip, pond, solar pump and sprinkler for you', 'ड्रिप, तालाब, सोलर और स्प्रिंकलर को क्रम देता है'), t('Simulates a dry year and six years of cash', 'सूखा साल और छह साल का हिसाब दिखाता है')],
      cta: fins.length ? t('Plan your next asset', 'अगला ढाँचा सोचें') : t('Run my AI farm check', 'AI खेत जाँच चलाएँ') },
    { n: 2, tab: 'finance' as Tab, title: t('Finance', 'वित्त'), icon: <Banknote size={20} />,
      status: fin ? t('In progress', 'जारी') : fins.length ? t('Done', 'पूरा') : draft ? t('Ready to apply', 'आवेदन के लिए तैयार') : t('After Plan', 'योजना के बाद'), tone: fin || (draft && !fins.length) ? 'now' : fins.length ? 'done' : 'later',
      desc: fin && ps ? ps.title : t('Apply for a loan for 85% of your share. The installer is paid in three parts, only after checks.', 'आपके हिस्से के 85% का कर्ज़। इंस्टॉलर को तीन हिस्सों में, जाँच के बाद भुगतान।'),
      ai: [t('Explains your loan in simple words, and reads it aloud', 'आसान शब्दों में कर्ज़ समझाता है, बोलकर भी'), t('Checks if you can afford it and reads your documents', 'क्षमता जाँचता है और कागज़ पढ़ता है'), t('Checks installer photos and tells you what is next', 'इंस्टॉलर फ़ोटो जाँचता है, आगे क्या बताता है')],
      cta: fin ? t('Track my installation', 'फ़िटिंग देखें') : draft ? t('Apply now', 'अभी आवेदन करें') : t('See how finance works', 'वित्त कैसे काम करता है') },
    { n: 3, tab: 'record' as Tab, title: t('Record', 'रिकॉर्ड'), icon: <ScrollText size={20} />,
      status: issued.length ? t(`Ready · score ${best}`, `तैयार · स्कोर ${best}`) : recs.length ? t('Being checked', 'जाँच जारी') : t('After Finance', 'वित्त के बाद'), tone: issued.length ? 'done' : recs.length ? 'now' : 'later',
      desc: t('Proof of what you built and how your field held up in dry years. You decide who sees it.', 'आपने क्या बनाया और सूखे में खेत कैसा रहा, इसका सबूत। कौन देखे, आप तय करती हैं।'),
      ai: [t('Gives your record a resilience score', 'रिकॉर्ड को रेज़िलिएंस स्कोर देता है'), t('Writes the summary a lender will read', 'बैंक के लिए सारांश लिखता है'), t('Suggests how to use it: KCC, insurance, next asset', 'उपयोग सुझाता है: KCC, बीमा, अगला ढाँचा')],
      cta: issued.length ? t('Open my record', 'रिकॉर्ड खोलें') : t('Record an asset I have', 'मेरे ढाँचे का रिकॉर्ड') },
  ];

  return (
    <div className="fa-page">
      <section className="fa-hello">
        <div>
          <span className="eyebrow">{f.village}, {f.district} · {f.acres} {t('acres', 'एकड़')} · {f.crop}</span>
          <h1>{lang === 'hi' ? 'नमस्ते' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, {f.name.split(' ')[0]}</h1>
          <p>{t('Dhara helps you in three stages. Here is where you are.', 'धारा तीन चरणों में मदद करता है। आप यहाँ हैं।')}</p>
        </div>
        <div className="fa-id"><BadgeCheck size={16} /><span><small>AgriStack</small><strong>{f.agristack}</strong></span></div>
      </section>

      {reqs.length > 0 && <section className="fa-requests">
        {reqs.map(({ c, r }) => <div className="fa-req" key={r.id}><span className="fa-req-i"><Bell size={17} /></span><div><strong>{t(`${r.org} wants to see your record`, `${r.org} आपका रिकॉर्ड देखना चाहता है`)}</strong><small>{r.purpose} · {assetName(c.asset, lang)} · {fmtDate(r.at)}</small></div><div className="fa-req-a"><button className="btn ghost sm" onClick={() => ops.decline(c, r.id)}>{t('Decline', 'मना करें')}</button><button className="btn primary sm" onClick={() => setConfirm({ c, rid: r.id })}>{t('Allow', 'अनुमति दें')}</button></div></div>)}
      </section>}
      {confirm && <OtpConfirm title={t('Allow access?', 'अनुमति दें?')} cta={t('Allow for 6 months', '6 महीने के लिए अनुमति')} onClose={() => setConfirm(null)} onConfirm={() => ops.allow(confirm.c, confirm.rid)} body={<p className="muted">{t('They will see your verified assets and how your field held up in dry years, each labelled by how it is known. You can stop access any time.', 'वे आपके प्रमाणित ढाँचे और सूखे में खेत का प्रदर्शन देखेंगे। आप कभी भी रोक सकती हैं।')}</p>} />}

      <section className="stages">
        {stages.map(s => (
          <article key={s.n} className={'stage-card ' + s.tone}>
            <div className="sc-top"><span className="sc-n">{s.tone === 'done' ? <Check size={16} /> : s.n}</span><span className="sc-i">{s.icon}</span><span className={'sc-status ' + s.tone}>{s.status}</span></div>
            <h2>{s.title}</h2>
            <p>{s.desc}</p>
            <div className="sc-ai"><span><Sparkles size={13} />{t('Dhara AI helps', 'धारा AI मदद करता है')}</span><ul>{s.ai.map(a => <li key={a}>{a}</li>)}</ul></div>
            <button className={'btn ' + (s.tone === 'now' ? 'primary' : 'ghost')} onClick={() => setTab(s.tab)}>{s.cta}<ArrowRight size={15} /></button>
          </article>
        ))}
      </section>

      <div className="fa-grid">
        <div className="fa-col">
          <AiPanel title={t('This week on your farm', 'इस हफ़्ते आपका खेत')} sub={t('Water advice from the forecast and soil moisture', 'पूर्वानुमान और नमी से पानी की सलाह')} sources={['IMD 7-day forecast', 'Sentinel-1 soil moisture']}>
            <p className="ai-say">{adv.headline}</p>
            <div className="fa-week">
              {adv.plan7.map(d => <div key={d.d} className={d.rain > 4 ? 'rain' : d.act !== '—' ? 'act' : ''}><small>{d.d}</small><span className="wx">{d.rain > 4 ? <Droplets size={16} /> : <CloudSun size={16} />}</span><strong>{d.temp}°</strong><em>{d.rain} mm</em><p>{d.act}</p></div>)}
            </div>
            {adv.saving > 0 && <p className="fa-save"><Leaf size={14} />{t(`Following this saves about ${adv.saving}% water this week.`, `इससे इस हफ़्ते लगभग ${adv.saving}% पानी बचेगा।`)}</p>}
          </AiPanel>
          <section className="fa-card">
            <div className="fa-card-h"><h2><Bell size={18} />{t('Updates', 'अपडेट')}</h2></div>
            {updates.length === 0 ? <p className="muted">{t('No updates yet. Start with your AI farm check.', 'अभी कोई अपडेट नहीं। AI खेत जाँच से शुरू करें।')}</p> : <ul className="fa-updates">{updates.map((u, i) => <li key={i} className={u.tone ?? ''}><span />{u.text}<small>{fmtDate(u.at)}</small></li>)}</ul>}
          </section>
        </div>
        <div className="fa-col">
          <section className="fa-card ai-legend">
            <div className="fa-card-h"><h2><Info size={18} />{t('Where AI is used', 'AI कहाँ इस्तेमाल होता है')}</h2></div>
            <div className="legend-row"><span className="swatch ai" /><div><strong>{t('Purple panels = Dhara AI', 'बैंगनी पैनल = धारा AI')}</strong><small>{t('Suggestions, explanations, scores and checks. In this prototype they are demo responses built from rules and your data, not a live model.', 'सुझाव, समझाना, स्कोर और जाँच। इस प्रोटोटाइप में ये नियमों और आपके डेटा से बने डेमो जवाब हैं।')}</small></div></div>
            <div className="legend-row"><span className="swatch plain" /><div><strong>{t('White cards = facts and actions', 'सफ़ेद कार्ड = तथ्य और कदम')}</strong><small>{t('Loan terms, subsidy rates, payments, checks done by people, and your consent. AI never changes these.', 'कर्ज़ की शर्तें, सब्सिडी, भुगतान, लोगों की जाँच, और आपकी सहमति। AI इन्हें कभी नहीं बदलता।')}</small></div></div>
            <div className="legend-row"><span className="swatch demo" /><div><strong>{t('Dashed = demo control', 'डैश वाला = डेमो नियंत्रण')}</strong><small>{t('Moves your case forward as the lender, installer or checker would.', 'बैंक, इंस्टॉलर या जाँचकर्ता की तरह केस आगे बढ़ाता है।')}</small></div></div>
          </section>
          <section className="fa-card fa-ask" onClick={() => askAi()}>
            <div className="fa-ask-i"><MessageCircle size={20} /></div>
            <div><h3>{t('Ask Dhara AI anything', 'धारा AI से कुछ भी पूछें')}</h3><p>{t('Money, subsidy, water, documents or your record, in Hindi or English. Speak or type.', 'पैसा, सब्सिडी, पानी, कागज़ या रिकॉर्ड, हिंदी या अंग्रेज़ी में। बोलें या लिखें।')}</p></div>
            <ArrowRight size={18} />
          </section>
          <section className="fa-card">
            <div className="fa-card-h"><h2><HandCoins size={18} />{t('Your promises from Dhara', 'धारा के वादे')}</h2></div>
            <ul className="fa-benefits">
              <li><span><ShieldCheck size={16} /></span><div><strong>{t('No payment for unproven work', 'बिना सबूत भुगतान नहीं')}</strong><small>{t('The installer fixes failed checks at no cost to you', 'फ़ेल जाँच इंस्टॉलर मुफ़्त ठीक करता है')}</small></div></li>
              <li><span><Lock size={16} /></span><div><strong>{t('Your data, your choice', 'आपका डेटा, आपकी मर्ज़ी')}</strong><small>{t('Shared only with your OTP, never sold', 'सिर्फ़ आपके OTP से साझा, कभी बेचा नहीं')}</small></div></li>
              <li><span><Satellite size={16} /></span><div><strong>{t('AI advises, people decide', 'AI सलाह देता है, फ़ैसला लोग करते हैं')}</strong><small>{t('Loans and checks are decided by the lender and checkers', 'कर्ज़ और जाँच बैंक और जाँचकर्ता तय करते हैं')}</small></div></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Ask Dhara AI ---------------- */

type Msg = { from: 'me' | 'ai'; text: string; voice?: boolean; reply?: Reply };
const GROUPS = (lang: Lang): [string, string[]][] => lang === 'hi'
  ? [['योजना', ['मेरे खेत के लिए क्या सही है?', 'इस हफ़्ते सिंचाई कब करूँ?']], ['वित्त', ['मुझे कितना देना होगा?', 'सब्सिडी कब आएगी?', 'कौन से कागज़ चाहिए?', 'कितने दिन लगेंगे?']], ['रिकॉर्ड', ['मेरा स्कोर क्या है?', 'मेरा रिकॉर्ड कौन देख सकता है?', 'बीमा कैसे मिलेगा?']]]
  : [['Plan', ['What suits my farm?', 'When should I irrigate this week?']], ['Finance', ['How much will I pay?', 'When will the subsidy come?', 'What documents do I need?', 'How long will it take?']], ['Record', ['What is my score?', 'Who can see my record?', 'How do I get insurance?']]];

function Ask({ initial, onUsed }: { initial: string; onUsed: () => void }) {
  const { f, cases, lang, t } = useFarmer();
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ from: 'ai', text: t(`Namaste ${f.name.split(' ')[0]}. I am Dhara AI. I know your farm, your plan, your loan and your record. Ask me anything, by voice or text.`, `नमस्ते ${f.name.split(' ')[0]}। मैं धारा AI हूँ। मुझे आपके खेत, योजना, कर्ज़ और रिकॉर्ड की जानकारी है। बोलकर या लिखकर पूछें।`) }]);
  const [q, setQ] = useState('');
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const used = useRef(false);
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, typing]);
  const ask = (text: string, voice = false) => {
    if (!text.trim()) return;
    setMsgs(m => [...m, { from: 'me', text, voice }]); setQ(''); setTyping(true);
    setTimeout(() => { const reply = answer(text, { f, cases, lang }); setMsgs(m => [...m, { from: 'ai', text: reply.text, reply }]); setTyping(false); }, 650);
  };
  useEffect(() => { if (initial && !used.current) { used.current = true; onUsed(); ask(initial); } }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps
  const voice = () => { setListening(true); setTimeout(() => { setListening(false); ask(lang === 'hi' ? 'सब्सिडी कब आएगी?' : 'When will the subsidy come?', true); }, 1100); };
  const groups = useMemo(() => GROUPS(lang), [lang]);
  return (
    <div className="fa-page">
      <section className="fa-hello"><div><span className="eyebrow ai">{t('Dhara AI · demo responses', 'धारा AI · डेमो जवाब')}</span><h1>{t('Ask about any stage', 'किसी भी चरण पर पूछें')}</h1><p>{t('Answers use your own farm, plan, loan and record, and say what they are based on.', 'जवाब आपके खेत, योजना, कर्ज़ और रिकॉर्ड से बनते हैं, और बताते हैं किस आधार पर।')}</p></div></section>
      <div className="fa-chat-wrap">
        <section className="fa-card fa-chat">
          <div className="fa-chat-h"><span className="fa-ask-i"><Sparkles size={18} /></span><div><strong>{t('Dhara AI', 'धारा AI')}</strong><small>{t('Hindi and English · voice or text', 'हिंदी और अंग्रेज़ी · बोलें या लिखें')}</small></div><span className="ai-tag">{t('Demo response', 'डेमो जवाब')}</span></div>
          <div className="fa-msgs" aria-live="polite" ref={box}>
            {msgs.map((m, i) => (
              <div key={i} className={'fa-msg ' + m.from}>
                {m.voice && <small className="voice"><Mic size={12} />{t('Voice note · transcribed', 'वॉइस नोट · लिखा गया')}</small>}
                <p>{m.text}</p>
                {m.reply?.card && <div className="fa-msg-card">{m.reply.card.map(x => <div key={x.label}><small>{x.label}</small><strong>{x.value}</strong></div>)}</div>}
                {!!m.reply?.sources.length && <small className="src">{t('Based on', 'आधार')}: {m.reply.sources.join(' · ')}</small>}
              </div>
            ))}
            {typing && <div className="fa-msg ai typing"><span /><span /><span /></div>}
          </div>
          <form className="fa-input" onSubmit={e => { e.preventDefault(); ask(q); }}>
            <button type="button" className={'fa-mic' + (listening ? ' on' : '')} aria-label={t('Speak', 'बोलें')} onClick={voice}><Mic size={18} /></button>
            <input aria-label={t('Ask Dhara AI', 'धारा AI से पूछें')} placeholder={listening ? t('Listening…', 'सुन रहा है…') : t('Type your question', 'अपना सवाल लिखें')} value={q} onChange={e => setQ(e.target.value)} />
            <button className="btn ai" type="submit" disabled={!q.trim()} aria-label={t('Send', 'भेजें')}><Send size={16} /></button>
          </form>
        </section>
        <aside className="fa-card ask-side">
          <h3>{t('Try asking', 'ऐसे पूछें')}</h3>
          {groups.map(([g, qs], i) => <div key={g} className="ask-group"><span className="ag-n">{i + 1}</span><div><strong>{g}</strong>{qs.map(x => <button key={x} onClick={() => ask(x)}>{x}</button>)}</div></div>)}
          <p className="fine">{t('Dhara AI explains; it never decides your loan. In this prototype, answers come from rules over your data, not a live model.', 'धारा AI समझाता है; कर्ज़ का फ़ैसला नहीं करता। इस प्रोटोटाइप में जवाब नियमों से बनते हैं।')}</p>
        </aside>
      </div>
    </div>
  );
}
