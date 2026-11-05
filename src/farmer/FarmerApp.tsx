import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Home, Route as RouteIcon, Sparkles, MessageCircle, ScrollText, LogOut, Phone, ShieldCheck, ArrowRight, ArrowLeft, Check, Mic, Send, Satellite,
  CloudSun, Droplets, BadgeCheck, Banknote, Lock, Bell, Share2, X, Camera, Wand2, MapPin, Languages, Clock, UserPlus, Leaf, HandCoins, Umbrella, FileCheck2, Wrench, Minus, Plus, Loader2,
} from 'lucide-react';
import {
  ASSETS, INSTALLERS, LENDER, PARTNER_BANK, ROLES, PROV, plan, inr, inrShort, uid, today, fmtDate, advance, completeStep, log, isComplete, trancheAmount, installerName, history, drySpell, caseTitle,
  type AssetKey, type Case, type Farmer, type Role,
} from '../model';
import { useStore } from '../store';
import { AssetIcon, ProvChip, Modal, DualChart, TrancheBar } from '../ui';
import { tr, scanFarm, advisory, JOURNEY, journeyIndex, plainStatus, photoCheck, answer, SUGGESTIONS, assetName, type Lang, type Reply } from './ai';

const SKEY = 'dhara.v3.farmer';
const LKEY = 'dhara.v3.lang';
const OTP = '2468';
type Tab = 'home' | 'journey' | 'plan' | 'sahayak' | 'record';
const TABS: { id: Tab; en: string; hi: string; icon: ReactNode }[] = [
  { id: 'home', en: 'Home', hi: 'होम', icon: <Home size={19} /> },
  { id: 'journey', en: 'My journey', hi: 'मेरी यात्रा', icon: <RouteIcon size={19} /> },
  { id: 'plan', en: 'Plan', hi: 'योजना', icon: <Sparkles size={19} /> },
  { id: 'sahayak', en: 'Sahayak AI', hi: 'सहायक AI', icon: <MessageCircle size={19} /> },
  { id: 'record', en: 'My record', hi: 'मेरा रिकॉर्ड', icon: <ScrollText size={19} /> },
];
const read = (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };
const write = (k: string, v: string) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* ignore */ } };
const initials = (n: string) => n.split(' ').map(x => x[0]).slice(0, 2).join('');

export default function FarmerApp() {
  const { state, route, go, setRole, role } = useStore();
  const [fid, setFid] = useState(() => read(SKEY));
  const [lang, setLangRaw] = useState<Lang>(() => (read(LKEY) === 'hi' ? 'hi' : 'en'));
  const setLang = (l: Lang) => { setLangRaw(l); write(LKEY, l); };
  const f = state.farmers.find(x => x.id === fid);
  const tab: Tab = (TABS.some(x => x.id === route.id) ? route.id : 'home') as Tab;
  const setTab = (t: Tab) => go({ page: 'farmer', id: t });
  const t = tr(lang);
  const login = (id: string) => { setFid(id); write(SKEY, id); setTab('home'); };
  const logout = () => { setFid(''); write(SKEY, ''); };

  if (!f) return <Login lang={lang} setLang={setLang} onLogin={login} />;
  const cases = state.cases.filter(c => c.farmerId === f.id);
  const pending = cases.flatMap(c => (c.requests ?? []).filter(r => r.status === 'pending')).length;

  return (
    <div className="fa" lang={lang === 'hi' ? 'hi' : 'en'}>
      <header className="fa-top">
        <div className="fa-top-in">
          <button className="fa-brand" onClick={() => setTab('home')} aria-label="Dhara home">
            <span className="fa-logo"><Droplets size={18} /></span><strong>Dhara</strong><em>{t('Kisan', 'किसान')}</em>
          </button>
          <nav className="fa-tabs" aria-label="Farmer app">
            {TABS.map(x => <button key={x.id} className={tab === x.id ? 'on' : ''} aria-current={tab === x.id ? 'page' : undefined} onClick={() => setTab(x.id)}>{x.icon}<span>{lang === 'hi' ? x.hi : x.en}</span>{x.id === 'home' && pending > 0 && <i className="fa-dot" />}</button>)}
          </nav>
          <div className="fa-top-r">
            <LangToggle lang={lang} setLang={setLang} />
            <label className="fa-demo"><span>{t('Demo', 'डेमो')}</span>
              <select aria-label="Demo role" value={role} onChange={e => { const r = e.target.value as Role; setRole(r); if (r !== 'farmer') go({ page: 'queue' }); }}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
            </label>
            <button className="fa-me" onClick={logout} title={t('Log out', 'लॉग आउट')}><span className="avatar sm f">{initials(f.name)}</span><span className="fa-me-t"><strong>{f.name}</strong><small>{t('Log out', 'लॉग आउट')}</small></span><LogOut size={15} /></button>
          </div>
        </div>
      </header>
      <main className="fa-main">
        {tab === 'home' && <HomeTab f={f} cases={cases} lang={lang} setTab={setTab} />}
        {tab === 'journey' && <JourneyTab f={f} cases={cases} lang={lang} setTab={setTab} />}
        {tab === 'plan' && <PlanTab f={f} lang={lang} setTab={setTab} />}
        {tab === 'sahayak' && <SahayakTab f={f} cases={cases} lang={lang} />}
        {tab === 'record' && <RecordTab f={f} cases={cases} lang={lang} setTab={setTab} />}
        <p className="fa-foot">{t('Demo · all farms, money, satellite and AI outputs are simulated.', 'डेमो · सभी खेत, पैसा, सैटेलाइट और AI नतीजे काल्पनिक हैं।')} <button className="link" onClick={() => { setRole('mitra'); go({ page: 'overview' }); }}>{t('Partner portal', 'पार्टनर पोर्टल')}<ArrowRight size={13} /></button></p>
      </main>
      <nav className="fa-bottom" aria-label="Farmer app tabs">
        {TABS.map(x => <button key={x.id} className={tab === x.id ? 'on' : ''} onClick={() => setTab(x.id)} aria-label={lang === 'hi' ? x.hi : x.en}>{x.icon}<span>{lang === 'hi' ? x.hi : x.en}</span></button>)}
      </nav>
    </div>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return <div className="fa-lang" role="group" aria-label="Language"><Languages size={15} /><button aria-pressed={lang === 'en'} className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button><button aria-pressed={lang === 'hi'} className={lang === 'hi' ? 'on' : ''} onClick={() => setLang('hi')}>हिं</button></div>;
}

/* ---------------- Login ---------------- */

function Login({ lang, setLang, onLogin }: { lang: Lang; setLang: (l: Lang) => void; onLogin: (id: string) => void }) {
  const { state, update, role, setRole, go } = useStore();
  const t = tr(lang);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [reg, setReg] = useState({ name: '', agristack: '', village: '', district: 'Mahoba', acres: 2, crop: '', water: 'Rain-fed only' });
  const [fetching, setFetching] = useState(false);
  const match = state.farmers.find(f => f.phone === phone);
  const stage = (f: Farmer) => {
    const c = state.cases.filter(x => x.farmerId === f.id);
    const fin = c.find(x => x.kind === 'finance');
    if (c.some(x => (x.requests ?? []).some(r => r.status === 'pending'))) return t('Has a consent request', 'सहमति अनुरोध है');
    if (fin) return plainStatus(fin, lang).title;
    if (c.length) return t('Record in progress', 'रिकॉर्ड प्रगति में');
    return t('New to Dhara', 'धारा में नई');
  };
  const verify = () => {
    if (otp !== OTP) { setErr(t('That code is not right. Use the demo code shown.', 'कोड सही नहीं है। दिखाया गया डेमो कोड डालें।')); return; }
    setErr('');
    if (match) onLogin(match.id); else setStep('register');
  };
  const fetchAgri = () => {
    setFetching(true);
    setTimeout(() => { setReg(r => ({ ...r, agristack: r.agristack || 'UP-09-' + phone.slice(2, 6) + '-' + phone.slice(6, 10), village: r.village || 'Kulpahar', district: 'Mahoba', acres: 2.5, crop: r.crop || 'Wheat, chickpea' })); setFetching(false); }, 700);
  };
  const register = () => {
    const id = uid('f');
    update(s => { s.farmers.push({ id, name: reg.name.trim(), agristack: reg.agristack.trim(), village: reg.village.trim(), district: reg.district, acres: reg.acres, crop: reg.crop.trim() || 'Wheat', water: reg.water, woman: true, tenant: false, phone }); });
    onLogin(id);
    go({ page: 'farmer', id: 'plan' });
  };
  return (
    <div className="fa-login">
      <section className="fa-login-art">
        <div className="fa-brand big"><span className="fa-logo"><Droplets size={22} /></span><strong>Dhara</strong><em>{t('Kisan', 'किसान')}</em></div>
        <h1>{t('Build a drought-proof farm. Pay only for what works.', 'सूखे से सुरक्षित खेत बनाइए। भुगतान सिर्फ़ काम करने वाले ढाँचे का।')}</h1>
        <ul>
          <li><Sparkles size={18} /><span><strong>{t('AI farm check in 5 minutes', '5 मिनट में AI खेत जाँच')}</strong>{t('Satellite history and rainfall tell you what to build.', 'सैटेलाइट और बारिश का इतिहास बताता है क्या लगवाएँ।')}</span></li>
          <li><HandCoins size={18} /><span><strong>{t('Loan for 85% of your share', 'आपके हिस्से का 85% कर्ज़')}</strong>{t('Nothing to repay until your first harvest.', 'पहली फ़सल तक कोई किस्त नहीं।')}</span></li>
          <li><ShieldCheck size={18} /><span><strong>{t('Installer paid only after checks', 'जाँच के बाद ही इंस्टॉलर को भुगतान')}</strong>{t('A bad install never becomes your debt.', 'ख़राब काम कभी आपका कर्ज़ नहीं बनता।')}</span></li>
          <li><ScrollText size={18} /><span><strong>{t('A record you own', 'आपका अपना रिकॉर्ड')}</strong>{t('Use it for your next loan or insurance.', 'अगले कर्ज़ या बीमा के लिए।')}</span></li>
        </ul>
        <FieldArt />
      </section>
      <section className="fa-login-pane">
        <div className="fa-login-bar"><LangToggle lang={lang} setLang={setLang} />
          <label className="fa-demo"><span>{t('Demo', 'डेमो')}</span><select aria-label="Demo role" value={role} onChange={e => { const r = e.target.value as Role; setRole(r); if (r !== 'farmer') go({ page: 'queue' }); }}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
        </div>
        <div className="fa-login-card">
          {step === 'phone' && <>
            <h2>{t('Log in or sign up', 'लॉग इन या साइन अप')}</h2>
            <p className="muted">{t('Use the mobile number linked to your AgriStack farmer ID.', 'अपने एग्रीस्टैक किसान आईडी से जुड़ा मोबाइल नंबर डालें।')}</p>
            <label className="field">{t('Mobile number', 'मोबाइल नंबर')}<div className="fa-phone"><span>+91</span><input aria-label="Mobile number" inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></div></label>
            <button className="btn primary lg full" disabled={phone.length !== 10} onClick={() => { setStep('otp'); setOtp(''); }}><Phone size={16} />{t('Send OTP', 'OTP भेजें')}</button>
            <div className="fa-or"><span>{t('or try a demo farmer', 'या डेमो किसान चुनें')}</span></div>
            <div className="fa-demo-list">
              {state.farmers.filter(f => f.phone).slice(0, 6).map(f => (
                <button key={f.id} onClick={() => { setPhone(f.phone!); setStep('otp'); setOtp(''); }}>
                  <span className="avatar sm f">{initials(f.name)}</span><span><strong>{f.name}</strong><small>{f.village} · {stage(f)}</small></span><ArrowRight size={15} />
                </button>
              ))}
            </div>
            <p className="fine">{t('No smartphone? Your Dhara Mitra at the nearest Rallis store or FPO can do all of this with you.', 'स्मार्टफ़ोन नहीं है? नज़दीकी रैलिस दुकान या FPO पर धारा मित्र आपकी मदद करेंगे।')}</p>
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
            <h2>{t('Welcome to Dhara', 'धारा में स्वागत है')}</h2>
            <p className="muted">{t('Tell us about your farm. We can fetch most of it from AgriStack.', 'अपने खेत के बारे में बताएँ। ज़्यादातर जानकारी एग्रीस्टैक से मिल जाएगी।')}</p>
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
      </section>
    </div>
  );
}

function FieldArt() {
  return (
    <svg className="fa-art" viewBox="0 0 400 140" aria-hidden>
      <path d="M0 70 Q100 50 200 68 T400 60 V140 H0Z" fill="#1d6e54" opacity=".55" />
      <path d="M0 95 Q120 78 220 96 T400 90 V140 H0Z" fill="#2a8a68" opacity=".7" />
      {Array.from({ length: 9 }).map((_, i) => <line key={i} x1={20 + i * 45} y1={140} x2={120 + i * 18} y2={82} stroke="#7fd1ad" strokeWidth="1.5" opacity=".6" />)}
      <circle cx="330" cy="30" r="16" fill="#f4c27a" />
      <ellipse cx="90" cy="112" rx="34" ry="9" fill="#5fb3d6" opacity=".8" />
    </svg>
  );
}

/* ---------------- Shared bits ---------------- */

function useCaseOps() {
  const { updateCase, toast } = useStore();
  return {
    allow: (c: Case, rid: string, lang: Lang) => {
      updateCase(c.id, x => {
        const r = (x.requests ?? []).find(q => q.id === rid)!; r.status = 'allowed';
        const exp = new Date(); exp.setMonth(exp.getMonth() + 6);
        x.shares.unshift({ id: uid('s'), org: r.org, purpose: r.purpose, granted: today(), expires: exp.toISOString().slice(0, 10) });
        log(x, 'farmer', `Farmer allowed ${r.org} to see her record for six months (OTP confirmed).`);
      });
      toast(tr(lang)('Access allowed for 6 months', '6 महीने के लिए अनुमति दी'));
    },
    decline: (c: Case, rid: string, lang: Lang) => {
      updateCase(c.id, x => { const r = (x.requests ?? []).find(q => q.id === rid)!; r.status = 'declined'; log(x, 'farmer', `Farmer declined ${r.org}'s request.`); });
      toast(tr(lang)('Request declined', 'अनुरोध अस्वीकार'));
    },
    revoke: (c: Case, sid: string, lang: Lang) => {
      updateCase(c.id, x => { const s = x.shares.find(q => q.id === sid)!; s.revoked = today(); log(x, 'farmer', `Farmer revoked access for ${s.org}.`); });
      toast(tr(lang)('Access stopped', 'पहुँच रोकी गई'));
    },
    share: (c: Case, org: string, purpose: string, months: number, lang: Lang) => {
      updateCase(c.id, x => {
        const exp = new Date(); exp.setMonth(exp.getMonth() + months);
        x.shares.unshift({ id: uid('s'), org, purpose, granted: today(), expires: exp.toISOString().slice(0, 10) });
        log(x, 'farmer', `Farmer shared her record with ${org} for ${months} months (OTP confirmed).`);
      });
      toast(tr(lang)(`Shared with ${org}`, `${org} के साथ साझा किया`));
    },
  };
}

function OtpConfirm({ lang, title, body, cta, onConfirm, onClose }: { lang: Lang; title: string; body: ReactNode; cta: string; onConfirm: () => void; onClose: () => void }) {
  const t = tr(lang);
  const [otp, setOtp] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      {body}
      <label className="field">{t('Confirm with OTP', 'OTP से पुष्टि करें')}<input aria-label="Confirm with OTP" className="fa-otp sm" inputMode="numeric" maxLength={4} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} /></label>
      <p className="fa-hint"><Lock size={13} />{t('Demo code', 'डेमो कोड')}: <strong>{OTP}</strong></p>
      <div className="actions"><button className="btn ghost" onClick={onClose}>{t('Cancel', 'रद्द करें')}</button><button className="btn primary" disabled={otp !== OTP} onClick={() => { onConfirm(); onClose(); }}>{cta}</button></div>
    </Modal>
  );
}

function JourneyDots({ i, lang }: { i: number; lang: Lang }) {
  return (
    <ol className="fa-dots" aria-label={tr(lang)('Journey progress', 'यात्रा प्रगति')}>
      {JOURNEY.map((j, k) => <li key={j.key} className={k < i ? 'done' : k === i ? 'now' : ''} title={lang === 'hi' ? j.hi : j.en}><span />{k === i && <em>{lang === 'hi' ? 'अभी: ' + j.hi : 'Now: ' + j.en}</em>}</li>)}
    </ol>
  );
}

function AiTag({ lang, conf }: { lang: Lang; conf?: number }) {
  return <span className="ai-tag"><Sparkles size={12} />{tr(lang)('AI · demo', 'AI · डेमो')}{conf ? ` · ${Math.round(conf * 100)}%` : ''}</span>;
}

/* ---------------- Home ---------------- */

function HomeTab({ f, cases, lang, setTab }: { f: Farmer; cases: Case[]; lang: Lang; setTab: (t: Tab) => void }) {
  const t = tr(lang);
  const ops = useCaseOps();
  const [confirm, setConfirm] = useState<{ c: Case; rid: string } | null>(null);
  const fin = cases.find(c => c.kind === 'finance' && !isComplete(c) && !c.declined) ?? cases.find(c => c.kind === 'finance');
  const live = cases.find(c => (c.kind === 'record' && isComplete(c)) || (c.kind === 'finance' && c.steps.commission?.state === 'done'));
  const adv = advisory(f, live?.asset ?? null, lang);
  const reqs = cases.flatMap(c => (c.requests ?? []).filter(r => r.status === 'pending').map(r => ({ c, r })));
  const updates = cases.flatMap(c => c.log.map(e => ({ ...e, id: c.id }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const hour = new Date().getHours();

  return (
    <div className="fa-page">
      <section className="fa-hello">
        <div>
          <span className="eyebrow">{f.village}, {f.district} · {f.acres} {t('acres', 'एकड़')}</span>
          <h1>{t(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening', 'नमस्ते')}, {f.name.split(' ')[0]}</h1>
          <p>{fin ? t('Here is where your investment stands today.', 'आज आपके निवेश की स्थिति।') : t('Let’s find out what would protect your farm from the next dry spell.', 'आइए जानें, अगले सूखे से आपके खेत को क्या बचाएगा।')}</p>
        </div>
        <div className="fa-id"><BadgeCheck size={16} /><span><small>AgriStack</small><strong>{f.agristack}</strong></span></div>
      </section>

      {reqs.length > 0 && <section className="fa-requests" aria-label={t('Requests', 'अनुरोध')}>
        {reqs.map(({ c, r }) => (
          <div className="fa-req" key={r.id}>
            <span className="fa-req-i"><Bell size={17} /></span>
            <div><strong>{t(`${r.org} wants to see your record`, `${r.org} आपका रिकॉर्ड देखना चाहता है`)}</strong><small>{r.purpose} · {caseTitle(c)} · {fmtDate(r.at)}</small></div>
            <div className="fa-req-a"><button className="btn ghost sm" onClick={() => ops.decline(c, r.id, lang)}>{t('Decline', 'मना करें')}</button><button className="btn primary sm" onClick={() => setConfirm({ c, rid: r.id })}>{t('Allow', 'अनुमति दें')}</button></div>
          </div>
        ))}
      </section>}
      {confirm && <OtpConfirm lang={lang} title={t('Allow access?', 'अनुमति दें?')} cta={t('Allow for 6 months', '6 महीने के लिए अनुमति')} onClose={() => setConfirm(null)} onConfirm={() => ops.allow(confirm.c, confirm.rid, lang)}
        body={<p className="muted">{t('They will see your verified assets and how your field held up in dry years, each labelled by how it is known. You can stop access any time.', 'वे आपके प्रमाणित ढाँचे और सूखे में खेत का प्रदर्शन देखेंगे। आप कभी भी रोक सकती हैं।')}</p>} />}

      <div className="fa-grid">
        <div className="fa-col">
          {fin ? <StatusCard c={fin} lang={lang} onMore={() => setTab('journey')} /> : (
            <section className="fa-card fa-start">
              <span className="fa-start-i"><Satellite size={22} /></span>
              <h2>{t('Free AI farm check', 'मुफ़्त AI खेत जाँच')}</h2>
              <p>{t('We read 9 years of satellite images of your plot and IMD rainfall, then tell you which upgrade pays back best, what it costs after subsidy, and what you would pay each year.', 'हम आपके खेत की 9 साल की सैटेलाइट तस्वीरें और बारिश देखकर बताते हैं कि कौन-सा ढाँचा सबसे फ़ायदेमंद है, सब्सिडी के बाद लागत क्या है, और सालाना कितना देना होगा।')}</p>
              <button className="btn primary lg" onClick={() => setTab('plan')}><Sparkles size={17} />{t('Start my farm check', 'खेत जाँच शुरू करें')}</button>
            </section>
          )}

          <section className="fa-card">
            <div className="fa-card-h"><div><h2><CloudSun size={18} />{t('This week on your farm', 'इस हफ़्ते आपका खेत')}</h2><small>{t('IMD forecast + soil moisture from Sentinel-1', 'IMD पूर्वानुमान + सेंटिनल-1 नमी')}</small></div><AiTag lang={lang} conf={0.87} /></div>
            <p className="fa-adv-h">{adv.headline}</p>
            <div className="fa-week">
              {adv.plan7.map(d => <div key={d.d} className={d.rain > 4 ? 'rain' : d.act !== '—' ? 'act' : ''}><small>{d.d}</small><span className="wx">{d.rain > 4 ? <Droplets size={16} /> : <CloudSun size={16} />}</span><strong>{d.temp}°</strong><em>{d.rain ? `${d.rain} mm` : '0 mm'}</em><p>{d.act}</p></div>)}
            </div>
            {adv.saving > 0 && <p className="fa-save"><Leaf size={14} />{t(`Following this saves about ${adv.saving}% water this week.`, `इससे इस हफ़्ते लगभग ${adv.saving}% पानी बचेगा।`)}</p>}
          </section>
        </div>

        <div className="fa-col">
          <section className="fa-card fa-ask" onClick={() => setTab('sahayak')}>
            <div className="fa-ask-i"><MessageCircle size={20} /></div>
            <div><h3>{t('Ask Dhara Sahayak', 'धारा सहायक से पूछें')}</h3><p>{t('Questions about money, subsidy or water, in Hindi or English. Speak or type.', 'पैसा, सब्सिडी या पानी पर सवाल, हिंदी या अंग्रेज़ी में। बोलें या लिखें।')}</p></div>
            <ArrowRight size={18} />
          </section>

          <section className="fa-card">
            <div className="fa-card-h"><h2><HandCoins size={18} />{t('What Dhara does for you', 'धारा आपके लिए क्या करता है')}</h2></div>
            <ul className="fa-benefits">
              {[
                [<Sparkles size={16} />, t('Tells you what to build', 'बताता है क्या लगवाएँ'), t('AI plan from your own field’s history', 'आपके खेत के इतिहास से AI योजना')],
                [<Banknote size={16} />, t('Finances 85% of your share', 'आपके हिस्से का 85% कर्ज़'), t('First instalment only after harvest', 'पहली किस्त फ़सल के बाद')],
                [<Wrench size={16} />, t('Protects you from bad installs', 'ख़राब काम से बचाता है'), t('Installer paid in parts, after checks', 'जाँच के बाद किस्तों में भुगतान')],
                [<FileCheck2 size={16} />, t('Gets your subsidy faster', 'सब्सिडी जल्दी दिलाता है'), t('No separate inspection or forms', 'अलग जाँच या फ़ॉर्म नहीं')],
                [<CloudSun size={16} />, t('Weekly water advice', 'हर हफ़्ते पानी की सलाह'), t('Based on forecast and soil moisture', 'पूर्वानुमान और नमी के आधार पर')],
                [<ScrollText size={16} />, t('A record you own', 'आपका अपना रिकॉर्ड'), t('For your next loan, KCC or insurance', 'अगले कर्ज़, KCC या बीमा के लिए')],
              ].map(([i, a, b], k) => <li key={k}><span>{i}</span><div><strong>{a}</strong><small>{b}</small></div></li>)}
            </ul>
          </section>

          <section className="fa-card">
            <div className="fa-card-h"><h2><Bell size={18} />{t('Updates', 'अपडेट')}</h2></div>
            {updates.length === 0 ? <p className="muted">{t('No updates yet.', 'अभी कोई अपडेट नहीं।')}</p> : (
              <ul className="fa-updates">{updates.map((u, i) => <li key={i} className={u.tone ?? ''}><span />{u.text}<small>{fmtDate(u.at)}</small></li>)}</ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ c, lang, onMore }: { c: Case; lang: Lang; onMore: () => void }) {
  const t = tr(lang);
  const ps = plainStatus(c, lang);
  const p = plan(c.asset, c.units);
  const i = journeyIndex(c);
  const firstDue = new Date(c.created); firstDue.setMonth(firstDue.getMonth() + 7);
  return (
    <section className="fa-card fa-status">
      <div className="fa-status-top">
        <span className="asset-badge lg"><AssetIcon asset={c.asset} size={24} /></span>
        <div><small>{c.id} · {assetName(c.asset, lang)}{ASSETS[c.asset].perAcre ? ` · ${c.units} ${t(c.units > 1 ? 'acres' : 'acre', 'एकड़')}` : ''}</small><h2>{ps.title}</h2></div>
      </div>
      <JourneyDots i={i} lang={lang} />
      <div className="fa-next"><Clock size={16} /><div><strong>{t('What happens next', 'आगे क्या होगा')}</strong><p>{ps.next}</p><small>{t('With', 'किसके पास')}: {ps.who}</small></div></div>
      <div className="fa-money">
        <div><small>{t('You pay upfront', 'आप अभी देंगी')}</small><strong>{inr(p.own)}</strong></div>
        <div><small>{t('Loan', 'कर्ज़')} · 85%</small><strong>{inr(p.loan)}</strong></div>
        <div><small>{t('Yearly instalment', 'सालाना किस्त')}</small><strong>{inr(p.instalment)}</strong></div>
        <div><small>{t('First due', 'पहली किस्त')}</small><strong>{firstDue.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short', year: 'numeric' })}</strong></div>
      </div>
      <button className="btn soft full" onClick={onMore}>{t('See my full journey', 'पूरी यात्रा देखें')}<ArrowRight size={15} /></button>
    </section>
  );
}

/* ---------------- Journey ---------------- */

function JourneyTab({ f, cases, lang, setTab }: { f: Farmer; cases: Case[]; lang: Lang; setTab: (t: Tab) => void }) {
  const t = tr(lang);
  const fins = cases.filter(c => c.kind === 'finance');
  const [sel, setSel] = useState(fins[0]?.id ?? '');
  const c = fins.find(x => x.id === sel) ?? fins[0];
  const i = c ? journeyIndex(c) : 0;
  const dateFor = (k: number) => {
    if (!c) return '';
    const keys = [['assess'], ['sanction'], ['commission', 'deliver'], ['fieldCheck'], ['subsidy'], ['satellite'], ['record']][k];
    const at = keys.map(x => c.steps[x]?.at).find(Boolean);
    return at ? fmtDate(at) : '';
  };
  return (
    <div className="fa-page">
      <section className="fa-hello">
        <div><span className="eyebrow">{t('Your journey with Dhara', 'धारा के साथ आपकी यात्रा')}</span><h1>{t('From farm check to a record you own', 'खेत जाँच से आपके अपने रिकॉर्ड तक')}</h1><p>{t('Seven steps. You act in two of them; Dhara, the lender and the installer handle the rest, and nobody is paid for work that is not proven.', 'सात कदम। आप दो में शामिल हैं; बाकी धारा, बैंक और इंस्टॉलर संभालते हैं, और बिना सबूत किसी को भुगतान नहीं।')}</p></div>
      </section>
      {fins.length > 1 && <div className="seg">{fins.map(x => <button key={x.id} className={x.id === c?.id ? 'on' : ''} onClick={() => setSel(x.id)}><AssetIcon asset={x.asset} size={15} />{assetName(x.asset, lang)}</button>)}</div>}
      <div className="fa-grid">
        <section className="fa-card fa-col">
          <ol className="fa-journey">
            {JOURNEY.map((j, k) => {
              const state = !c ? (k === 0 ? 'now' : '') : k < i ? 'done' : k === i ? 'now' : '';
              const you = k === 0 || k === 6;
              return (
                <li key={j.key} className={state}>
                  <span className="fj-n">{state === 'done' ? <Check size={15} /> : k + 1}</span>
                  <div>
                    <div className="fj-top"><h3>{lang === 'hi' ? j.hi : j.en}</h3>{you && <span className="fj-you">{t('You', 'आप')}</span>}{state === 'now' && <span className="fj-now">{t('Now', 'अभी')}</span>}</div>
                    <p>{lang === 'hi' ? j.dhi : j.den}</p>
                    {state === 'done' && dateFor(k) && <small><Check size={12} />{dateFor(k)}</small>}
                    {!c && k === 0 && <button className="btn primary sm" onClick={() => setTab('plan')}><Sparkles size={14} />{t('Start my farm check', 'खेत जाँच शुरू करें')}</button>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
        <div className="fa-col">
          {c && <section className="fa-card">
            <div className="fa-card-h"><div><h2><ShieldCheck size={18} />{t('How your money is protected', 'आपका पैसा कैसे सुरक्षित है')}</h2><small>{t('The installer gets paid in three parts', 'इंस्टॉलर को तीन हिस्सों में भुगतान')}</small></div></div>
            <TrancheBar parts={(['t1', 't2', 'hold'] as const).map((x, k, arr) => ({ label: x, value: trancheAmount(c, x), state: c.released[x] ? 'released' : arr.slice(0, k).every(y => c.released[y]) ? 'next' : 'locked' }))} />
            <ul className="fa-tranches">
              {(['t1', 't2', 'hold'] as const).map((x, k) => <li key={x} className={c.released[x] ? 'paid' : ''}><span>{c.released[x] ? <Check size={14} /> : <Lock size={13} />}</span><div><strong>{[t('After delivery is verified', 'डिलीवरी जाँच के बाद'), t('After the field check', 'खेत जाँच के बाद'), t('After it works in a dry spell', 'सूखे में चलने के बाद')][k]}</strong><small>{c.released[x] ? t(`Paid ${fmtDate(c.released[x])}`, `${fmtDate(c.released[x])} को दिया`) : t('Held until then', 'तब तक रुका')}</small></div><em>{inrShort(trancheAmount(c, x))}</em></li>)}
            </ul>
            <p className="fine">{t('If a check fails, the installer must fix it before the next payment. You never pay extra for a fix.', 'जाँच फ़ेल हो तो अगले भुगतान से पहले इंस्टॉलर को ठीक करना होगा। आपको ठीक कराने का कोई अतिरिक्त ख़र्च नहीं।')}</p>
          </section>}
          <section className="fa-card">
            <div className="fa-card-h"><h2><Umbrella size={18} />{t('After your record is ready', 'रिकॉर्ड बनने के बाद')}</h2></div>
            <ul className="fa-benefits">
              <li><span><Banknote size={16} /></span><div><strong>{t('Higher KCC limit, faster', 'ज़्यादा KCC सीमा, जल्दी')}</strong><small>{t('Lenders see proof they never had', 'बैंक को वो सबूत मिलता है जो पहले नहीं था')}</small></div></li>
              <li><span><Umbrella size={16} /></span><div><strong>{t('Insurance for the asset', 'ढाँचे का बीमा')}</strong><small>{t('Tata AIG cover without a new inspection', 'नई जाँच के बिना टाटा AIG बीमा')}</small></div></li>
              <li><span><Sparkles size={16} /></span><div><strong>{t('Finance your next upgrade', 'अगला ढाँचा फ़ाइनेंस करें')}</strong><small>{t('A pond today, drip next season', 'आज तालाब, अगले मौसम ड्रिप')}</small></div></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Plan (AI farm check) ---------------- */

const SCAN_STEPS = [
  { en: 'Finding your plot from AgriStack', hi: 'एग्रीस्टैक से आपका खेत ढूँढ रहे हैं' },
  { en: 'Reading Sentinel-2 images, 2017–2025', hi: 'सेंटिनल-2 तस्वीरें पढ़ रहे हैं, 2017–2025' },
  { en: 'Matching IMD rainfall and dry spells', hi: 'IMD बारिश और सूखे से मिला रहे हैं' },
  { en: 'Ranking options by payback', hi: 'वसूली के हिसाब से विकल्प क्रम में' },
];

function PlanTab({ f, lang, setTab }: { f: Farmer; lang: Lang; setTab: (t: Tab) => void }) {
  const t = tr(lang);
  const { state, update, toast } = useStore();
  const [mode, setMode] = useState<'finance' | 'record'>('finance');
  const [phase, setPhase] = useState<'intro' | 'scan' | 'results' | 'plan'>('intro');
  const [k, setK] = useState(0);
  const scan = useMemo(() => scanFarm(f), [f]);
  const [asset, setAsset] = useState<AssetKey>(scan.recs[0].asset);
  const [units, setUnits] = useState(scan.recs[0].units);
  const [installer, setInstaller] = useState(INSTALLERS[0].id);
  const [bridge, setBridge] = useState(true);
  const [otp, setOtp] = useState('');
  const [built, setBuilt] = useState(2021);
  const [photo, setPhoto] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (phase !== 'scan') return;
    if (k >= SCAN_STEPS.length) { setPhase('results'); return; }
    const id = setTimeout(() => setK(k + 1), 420);
    return () => clearTimeout(id);
  }, [phase, k]);

  const p = plan(asset, units);
  const maxUnits = Math.max(1, Math.floor(f.acres));
  const nextId = (prefix: string) => prefix + (Math.max(0, ...state.cases.filter(c => c.id.startsWith(prefix)).map(c => +c.id.slice(3))) + 1);

  const submitFinance = () => {
    const id = nextId('DH-');
    update(s => {
      const at = today();
      const c: Case = { id, kind: 'finance', farmerId: f.id, asset, units: ASSETS[asset].perAcre ? units : 1, installer, bridge, created: at, updated: at, steps: {}, released: {}, evidence: [], shares: [], log: [] };
      c.evidence.push({ id: uid('e'), label: 'AI farm check', detail: `${scan.soil.en} · ${scan.groundwater.en} · ~${scan.dryLoss}% dry-spell greenness loss · fit score ${scan.recs.find(r => r.asset === asset)?.score}/100`, prov: 'remote', at, by: 'Dhara AI (Sentinel-2, IMD)' });
      c.evidence.push({ id: uid('e'), label: 'Farm and water profile', detail: `${f.acres} acres · ${f.crop} · ${f.water}`, prov: 'self', at, by: 'Farmer, via Dhara Kisan app' });
      c.log.push({ at, who: 'Farmer · Dhara Kisan app', text: `Farmer ran the AI farm check and consented by OTP to share her Dhara Plan with ${LENDER}.` });
      advance(c, at);
      completeStep(c, 'assess', 'farmer', `Dhara Plan filed by the farmer: ${ASSETS[asset].name.toLowerCase()}${ASSETS[asset].perAcre ? ` on ${units} acre${units > 1 ? 's' : ''}` : ''}${bridge ? ', bridge requested' : ''}`, at);
      s.cases.unshift(c);
    });
    toast(t(`Plan sent to ${LENDER}. Case ${id}.`, `योजना ${LENDER} को भेजी गई। केस ${id}।`));
    setTab('home');
  };
  const submitRecord = () => {
    const id = nextId('RR-');
    const pc = photoCheck(asset, f.id);
    update(s => {
      const at = today();
      const c: Case = { id, kind: 'record', farmerId: f.id, asset, units: 1, installer: '', bridge: false, created: at, updated: at, builtYear: built, steps: { request: { state: 'done', at, by: 'Farmer · Dhara Kisan app' } }, released: {}, evidence: [], shares: [], log: [] };
      c.evidence.push({ id: uid('e'), label: `${ASSETS[asset].name} built ${built}`, detail: 'Self-reported in the Dhara Kisan app', prov: 'self', at, by: 'Farmer' });
      if (photo) c.evidence.unshift({ id: uid('e'), label: 'AI photo pre-check', detail: `${pc.findings.join('; ')} · confidence ${Math.round(pc.conf * 100)}%`, prov: 'remote', at, by: 'Dhara AI' });
      log(c, 'farmer', 'Farmer requested a Resilience Record from the app.', undefined, at);
      advance(c, at);
      s.cases.unshift(c);
    });
    toast(t('Record requested. A field checker will visit.', 'रिकॉर्ड का अनुरोध भेजा। जाँचकर्ता आएगा।'));
    setTab('record');
  };

  return (
    <div className="fa-page">
      <section className="fa-hello">
        <div><span className="eyebrow">{t('Dhara Plan', 'धारा योजना')}</span><h1>{mode === 'finance' ? t('What should you build next?', 'आगे क्या लगवाएँ?') : t('Get a record of what you built', 'जो बनाया उसका रिकॉर्ड पाएँ')}</h1></div>
        <div className="seg" role="radiogroup">
          <button role="radio" aria-checked={mode === 'finance'} className={mode === 'finance' ? 'on' : ''} onClick={() => setMode('finance')}><Sparkles size={15} />{t('Plan a new asset', 'नया ढाँचा')}</button>
          <button role="radio" aria-checked={mode === 'record'} className={mode === 'record' ? 'on' : ''} onClick={() => setMode('record')}><ScrollText size={15} />{t('I already have one', 'मेरे पास पहले से है')}</button>
        </div>
      </section>

      {mode === 'record' ? (
        <section className="fa-card fa-narrow">
          <h2>{t('Which asset do you have?', 'आपके पास कौन-सा ढाँचा है?')}</h2>
          <div className="fa-asset-pick">{(Object.keys(ASSETS) as AssetKey[]).map(a => <button key={a} aria-pressed={asset === a} className={asset === a ? 'on' : ''} onClick={() => setAsset(a)}><AssetIcon asset={a} />{assetName(a, lang)}</button>)}</div>
          <label className="field">{t('Year built', 'बनाने का साल')}<select value={built} onChange={e => setBuilt(+e.target.value)}>{[2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map(y => <option key={y}>{y}</option>)}</select></label>
          {!photo ? <button className="capture-btn" onClick={() => { setChecking(true); setTimeout(() => { setChecking(false); setPhoto(true); }, 900); }} disabled={checking}>{checking ? <Loader2 size={20} className="spin" /> : <Camera size={20} />}<span><strong>{checking ? t('AI is checking the photo…', 'AI फ़ोटो जाँच रहा है…') : t('Take a photo of it', 'उसकी फ़ोटो लें')}</strong><small>{t('Simulated camera · AI pre-check', 'सिम्युलेटेड कैमरा · AI जाँच')}</small></span></button>
            : <AiPhoto asset={asset} seed={f.id} lang={lang} />}
          <p className="fine">{t('Free for you. A field checker confirms it, and satellites show how your field held up since it was built. Lenders pay ₹500 only if you share it.', 'आपके लिए मुफ़्त। जाँचकर्ता पुष्टि करता है, और सैटेलाइट दिखाता है कि बनने के बाद खेत ने सूखा कैसे झेला। बैंक ₹500 तभी देता है जब आप साझा करें।')}</p>
          <div className="actions"><button className="btn primary" onClick={submitRecord}><Send size={15} />{t('Request my record', 'रिकॉर्ड का अनुरोध करें')}</button></div>
        </section>
      ) : phase === 'intro' ? (
        <section className="fa-card fa-scan-intro">
          <div className="fa-scan-art"><FarmMap cells={scan.cells} faded /></div>
          <div>
            <h2>{t('AI farm check', 'AI खेत जाँच')}</h2>
            <p>{t(`We will look at ${f.name.split(' ')[0]}’s plot in ${f.village} (AgriStack ${f.agristack}) from space, compare it with the block in every dry spell since 2017, and rank the four upgrades Dhara finances.`, `हम ${f.village} में आपके खेत (एग्रीस्टैक ${f.agristack}) को अंतरिक्ष से देखेंगे, 2017 से हर सूखे में ब्लॉक से तुलना करेंगे, और चार विकल्पों को क्रम देंगे।`)}</p>
            <ul className="fa-checklist">{SCAN_STEPS.map(s => <li key={s.en}><Check size={14} />{lang === 'hi' ? s.hi : s.en}</li>)}</ul>
            <button className="btn primary lg" onClick={() => { setK(0); setPhase('scan'); }}><Satellite size={17} />{t('Run AI farm check', 'AI खेत जाँच चलाएँ')}</button>
          </div>
        </section>
      ) : phase === 'scan' ? (
        <section className="fa-card fa-scanning" aria-live="polite">
          <div className="fa-scan-art scanning"><FarmMap cells={scan.cells} /><span className="scanline" /></div>
          <ul className="fa-scan-steps">{SCAN_STEPS.map((s, i) => <li key={s.en} className={i < k ? 'done' : i === k ? 'now' : ''}>{i < k ? <Check size={15} /> : i === k ? <Loader2 size={15} className="spin" /> : <span />}{lang === 'hi' ? s.hi : s.en}</li>)}</ul>
        </section>
      ) : phase === 'results' ? (
        <>
          <section className="fa-card">
            <div className="fa-card-h"><div><h2><Satellite size={18} />{t('What we found', 'हमें क्या मिला')}</h2><small>{f.village}, {f.district} · {scan.hectares} ha</small></div><AiTag lang={lang} conf={scan.confidence} /></div>
            <div className="fa-scan-res">
              <div className="fa-scan-art"><FarmMap cells={scan.cells} /><div className="fa-map-key"><span><i className="lo" />{t('Dry', 'सूखा')}</span><span><i className="hi" />{t('Green', 'हरा')}</span></div></div>
              <div className="fa-findings">
                <div><small>{t('Greenness lost in dry spells', 'सूखे में हरियाली की कमी')}</small><strong className="bad">−{scan.dryLoss}%</strong><em>{t(`${scan.dryYears} dry years since 2017`, `2017 से ${scan.dryYears} सूखे साल`)}</em></div>
                <div><small>{t('Soil', 'मिट्टी')}</small><strong>{lang === 'hi' ? scan.soil.hi : scan.soil.en}</strong></div>
                <div><small>{t('Groundwater', 'भूजल')}</small><strong className={scan.groundwater.level === 'safe' ? 'good' : 'bad'}>{lang === 'hi' ? scan.groundwater.hi : scan.groundwater.en}</strong></div>
                <div><small>{t('Your plot vs block (NDVI)', 'आपका खेत बनाम ब्लॉक (NDVI)')}</small><strong>{scan.ndvi} / {scan.blockNdvi}</strong></div>
                <div className="fa-ai-read"><Wand2 size={16} /><p>{lang === 'hi' ? scan.summary.hi : scan.summary.en}</p></div>
              </div>
            </div>
          </section>
          <section className="fa-card">
            <div className="fa-card-h"><h2><Sparkles size={18} />{t('Recommended for your farm', 'आपके खेत के लिए सुझाव')}</h2></div>
            <div className="fa-recs">
              {scan.recs.map((r, idx) => {
                const q = plan(r.asset, r.units);
                return (
                  <button key={r.asset} className={'fa-rec' + (asset === r.asset ? ' on' : '')} aria-pressed={asset === r.asset} onClick={() => { setAsset(r.asset); setUnits(Math.min(r.units, maxUnits)); }}>
                    <div className="fa-rec-top"><span className="asset-badge"><AssetIcon asset={r.asset} /></span><div><strong>{assetName(r.asset, lang)}</strong>{idx === 0 && <span className="best">{t('Best fit', 'सबसे सही')}</span>}</div><span className="fa-score"><b>{r.score}</b>/100</span></div>
                    <div className="meter"><span style={{ width: r.score + '%' }} /></div>
                    <ul>{r.reasons.map(x => <li key={x.en}><Check size={13} />{lang === 'hi' ? x.hi : x.en}</li>)}</ul>
                    <div className="fa-rec-nums"><span>{t('You pay now', 'अभी')} <b>{inr(q.own)}</b></span><span>{t('Yearly', 'सालाना')} <b>{inr(q.instalment)}</b></span><span>{t('Payback', 'वसूली')} <b>{q.payback.toFixed(1)}{t(' yrs', ' साल')}</b></span></div>
                  </button>
                );
              })}
            </div>
            <div className="actions"><button className="btn ghost" onClick={() => setPhase('intro')}>{t('Run again', 'फिर से')}</button><button className="btn primary" onClick={() => setPhase('plan')}>{t(`Continue with ${assetName(asset, lang).toLowerCase()}`, `${assetName(asset, lang)} के साथ आगे`)}<ArrowRight size={15} /></button></div>
          </section>
        </>
      ) : (
        <div className="fa-grid">
          <section className="fa-card fa-col">
            <div className="fa-card-h"><div><h2><AssetIcon asset={asset} size={18} />{t('Your Dhara Plan', 'आपकी धारा योजना')}</h2><small>{assetName(asset, lang)} · {ASSETS[asset].scheme}</small></div></div>
            {ASSETS[asset].perAcre && <div className="field"><span>{t('Acres', 'एकड़')}</span><div className="stepper-num"><button aria-label="Fewer acres" disabled={units <= 1} onClick={() => setUnits(units - 1)}><Minus size={14} /></button><strong>{units}</strong><button aria-label="More acres" disabled={units >= maxUnits} onClick={() => setUnits(units + 1)}><Plus size={14} /></button></div></div>}
            <div className="waterfall">
              <div><span>{t('Total cost', 'कुल लागत')}</span><strong>{inr(p.cost)}</strong></div>
              <div className="minus"><span>{t('Government subsidy', 'सरकारी सब्सिडी')} ({ASSETS[asset].subsidyPct}%)</span><strong>− {inr(p.subsidy)}</strong></div>
              <div className="total"><span>{t('Your share', 'आपका हिस्सा')}</span><strong>{inr(p.share)}</strong></div>
              <div className="split"><span><i className="sw loan" />{t('Loan from Tata Capital (85%)', 'टाटा कैपिटल से कर्ज़ (85%)')}</span><strong>{inr(p.loan)}</strong></div>
              <div className="split"><span><i className="sw own" />{t('You pay now (15%)', 'आप अभी देंगी (15%)')}</span><strong>{inr(p.own)}</strong></div>
            </div>
            <label className="field">{t('Certified installer', 'प्रमाणित इंस्टॉलर')}<select value={installer} onChange={e => setInstaller(e.target.value)}>{INSTALLERS.map(i => <option key={i.id} value={i.id}>{i.name} · ★ {i.rating} · {t(`${i.functioning}% still working after a year`, `${i.functioning}% एक साल बाद भी चालू`)}</option>)}</select></label>
            <label className="switch-line"><input type="checkbox" checked={bridge} onChange={e => setBridge(e.target.checked)} /><span><strong>{t(`Don’t wait for the subsidy (${inr(p.subsidy)})`, `सब्सिडी (${inr(p.subsidy)}) का इंतज़ार न करें`)}</strong><small>{t('A bridge loan pays the installer now and is repaid by the subsidy. Costs you nothing extra if the subsidy comes on time.', 'ब्रिज कर्ज़ से इंस्टॉलर को अभी भुगतान, सब्सिडी से चुकता।')}</small></span></label>
          </section>
          <div className="fa-col">
            <section className="fa-card fa-explain">
              <div className="fa-card-h"><h2><Wand2 size={18} />{t('In simple words', 'आसान शब्दों में')}</h2><AiTag lang={lang} /></div>
              <p>{t(
                `You pay ${inr(p.own)} now. Tata Capital pays the rest of your share, ${inr(p.loan)}, straight to ${installerName(installer)}, but only in three parts, after each check passes. You pay nothing more until your first harvest. Then you pay ${inr(p.instalment)} once a year for five years. In a normal year the ${assetName(asset, lang).toLowerCase()} should save or earn you about ${inr(p.benefit)}, roughly ${p.cover.toFixed(1)} times the instalment.`,
                `आप अभी ${inr(p.own)} देंगी। टाटा कैपिटल बाकी ${inr(p.loan)} सीधे ${installerName(installer)} को देगा, पर तीन हिस्सों में, हर जाँच पास होने के बाद। पहली फ़सल तक कुछ नहीं देना। फिर पाँच साल तक साल में एक बार ${inr(p.instalment)}। सामान्य साल में ${assetName(asset, lang)} से लगभग ${inr(p.benefit)} की बचत या कमाई होगी, यानी किस्त का ${p.cover.toFixed(1)} गुना।`)}</p>
              <div className="fa-money compact">
                <div><small>{t('Interest', 'ब्याज')}</small><strong>13%</strong></div>
                <div><small>{t('Fee', 'फ़ीस')}</small><strong>{inr(p.fee)}</strong></div>
                <div><small>{t('Instalments', 'किस्तें')}</small><strong>5</strong></div>
              </div>
            </section>
            <section className="fa-card">
              <h3>{t('Send my plan to Tata Capital', 'मेरी योजना टाटा कैपिटल को भेजें')}</h3>
              <p className="muted small">{t(`By entering the OTP you agree to share this plan and your farm profile with ${LENDER} and its partner bank for this loan only.`, `OTP डालकर आप यह योजना और खेत की जानकारी सिर्फ़ इस कर्ज़ के लिए ${LENDER} और ${PARTNER_BANK} से साझा करने की सहमति देती हैं।`)}</p>
              <label className="field">{t('Confirm with OTP', 'OTP से पुष्टि करें')}<input aria-label="Confirm with OTP" className="fa-otp sm" inputMode="numeric" maxLength={4} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} /></label>
              <p className="fa-hint"><Lock size={13} />{t('Demo code', 'डेमो कोड')}: <strong>{OTP}</strong></p>
              <div className="actions"><button className="btn ghost" onClick={() => setPhase('results')}><ArrowLeft size={15} />{t('Back', 'वापस')}</button><button className="btn primary" disabled={otp !== OTP} onClick={submitFinance}><Send size={15} />{t('Send to Tata Capital', 'टाटा कैपिटल को भेजें')}</button></div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function AiPhoto({ asset, seed, lang }: { asset: AssetKey; seed: string; lang: Lang }) {
  const t = tr(lang);
  const pc = photoCheck(asset, seed);
  return (
    <div className="ai-photo">
      <div className="ai-photo-img"><AssetIcon asset={asset} size={34} /><span className="box b1" /><span className="box b2" /></div>
      <div>
        <div className="fa-card-h"><strong>{t('AI photo pre-check', 'AI फ़ोटो जाँच')}</strong><AiTag lang={lang} conf={pc.conf} /></div>
        <ul>{pc.findings.map(x => <li key={x}><Check size={13} />{x}</li>)}<li><MapPin size={13} />{pc.geo}</li></ul>
        <small>{t('A human field checker still confirms it in person.', 'फिर भी जाँचकर्ता खेत पर आकर पुष्टि करेगा।')}</small>
      </div>
    </div>
  );
}

function FarmMap({ cells, faded }: { cells: number[]; faded?: boolean }) {
  const color = (v: number) => { const x = (v - 0.32) / 0.28; return `hsl(${38 + x * 92}, ${45 + x * 15}%, ${62 - x * 26}%)`; };
  return (
    <svg viewBox="0 0 320 220" className={'fa-map' + (faded ? ' faded' : '')} role="img" aria-label="Satellite view of the plot, coloured by greenness">
      <rect width="320" height="220" fill="#e9e3d2" />
      {[[0, 0, 110, 90], [210, 0, 110, 70], [0, 150, 120, 70], [230, 140, 90, 80]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={i % 2 ? '#d9d2b8' : '#cfd6b4'} />)}
      <path d="M0 118 C80 110 160 132 320 112" stroke="#b8ad8c" strokeWidth="7" fill="none" />
      <clipPath id="plot"><path d="M88 40 L248 30 L262 168 L96 182 Z" /></clipPath>
      <g clipPath="url(#plot)">{cells.map((v, i) => <rect key={i} x={80 + (i % 8) * 24} y={26 + Math.floor(i / 8) * 26} width={24} height={26} fill={color(v)} />)}</g>
      <path d="M88 40 L248 30 L262 168 L96 182 Z" fill="none" stroke="#0f4a39" strokeWidth="2.5" strokeDasharray="6 4" />
      <circle cx="120" cy="160" r="5" fill="#1d6b93" /><text x="130" y="164" fontSize="11" fill="#0f4a39">well</text>
    </svg>
  );
}

/* ---------------- Sahayak ---------------- */

type Msg = { from: 'me' | 'ai'; text: string; voice?: boolean; reply?: Reply };

function SahayakTab({ f, cases, lang }: { f: Farmer; cases: Case[]; lang: Lang }) {
  const t = tr(lang);
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ from: 'ai', text: t(`Namaste ${f.name.split(' ')[0]}. I am Dhara Sahayak. I know your farm, your plan and your loan. Ask me anything, by voice or text.`, `नमस्ते ${f.name.split(' ')[0]}। मैं धारा सहायक हूँ। मुझे आपके खेत, योजना और कर्ज़ की जानकारी है। बोलकर या लिखकर कुछ भी पूछें।`) }]);
  const [q, setQ] = useState('');
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, typing]);
  const ask = (text: string, voice = false) => {
    if (!text.trim()) return;
    setMsgs(m => [...m, { from: 'me', text, voice }]);
    setQ(''); setTyping(true);
    setTimeout(() => { const reply = answer(text, { f, cases, lang }); setMsgs(m => [...m, { from: 'ai', text: reply.text, reply }]); setTyping(false); }, 650);
  };
  const voice = () => {
    setListening(true);
    setTimeout(() => { setListening(false); ask(lang === 'hi' ? 'मुझे कितना देना होगा?' : 'How much will I pay?', true); }, 1100);
  };
  return (
    <div className="fa-page">
      <div className="fa-chat-wrap">
        <section className="fa-card fa-chat">
          <div className="fa-chat-h"><span className="fa-ask-i"><Sparkles size={18} /></span><div><strong>{t('Dhara Sahayak', 'धारा सहायक')}</strong><small>{t('Knows your farm, plan and loan · Hindi and English', 'आपके खेत, योजना और कर्ज़ की जानकारी · हिंदी और अंग्रेज़ी')}</small></div><AiTag lang={lang} /></div>
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
          <div className="fa-sugg">{SUGGESTIONS(lang).map(s => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>
          <form className="fa-input" onSubmit={e => { e.preventDefault(); ask(q); }}>
            <button type="button" className={'fa-mic' + (listening ? ' on' : '')} aria-label={t('Speak', 'बोलें')} onClick={voice}><Mic size={18} /></button>
            <input aria-label={t('Ask Sahayak', 'सहायक से पूछें')} placeholder={listening ? t('Listening…', 'सुन रहा है…') : t('Type your question', 'अपना सवाल लिखें')} value={q} onChange={e => setQ(e.target.value)} />
            <button className="btn primary" type="submit" disabled={!q.trim()} aria-label={t('Send', 'भेजें')}><Send size={16} /></button>
          </form>
        </section>
        <aside className="fa-card fa-chat-side">
          <h3>{t('What Sahayak uses', 'सहायक क्या देखता है')}</h3>
          <ul className="fa-benefits">
            <li><span><BadgeCheck size={16} /></span><div><strong>AgriStack</strong><small>{f.agristack}</small></div></li>
            <li><span><Satellite size={16} /></span><div><strong>Sentinel-2 / Sentinel-1</strong><small>{t('Greenness and soil moisture', 'हरियाली और नमी')}</small></div></li>
            <li><span><CloudSun size={16} /></span><div><strong>IMD</strong><small>{t('Rainfall history and forecast', 'बारिश इतिहास और पूर्वानुमान')}</small></div></li>
            <li><span><FileCheck2 size={16} /></span><div><strong>{t('Your case', 'आपका केस')}</strong><small>{cases.length ? cases.map(c => c.id).join(', ') : t('None yet', 'अभी नहीं')}</small></div></li>
          </ul>
          <p className="fine">{t('Sahayak explains; it never decides your loan. Answers in this demo are generated from rules, not a live model.', 'सहायक समझाता है; कर्ज़ का फ़ैसला नहीं करता। इस डेमो में जवाब नियमों से बनते हैं।')}</p>
        </aside>
      </div>
    </div>
  );
}

/* ---------------- Record ---------------- */

const ORGS = [LENDER, PARTNER_BANK, 'Tata AIG (asset cover)', 'UP Agriculture Department'];

function RecordTab({ f, cases, lang, setTab }: { f: Farmer; cases: Case[]; lang: Lang; setTab: (t: Tab) => void }) {
  const t = tr(lang);
  const ops = useCaseOps();
  const recs = cases.filter(c => c.kind === 'record' || isComplete(c));
  const [share, setShare] = useState<Case | null>(null);
  const [allow, setAllow] = useState<{ c: Case; rid: string } | null>(null);
  const [org, setOrg] = useState(ORGS[0]);
  const [months, setMonths] = useState(6);
  if (!recs.length) return (
    <div className="fa-page"><section className="fa-card fa-start fa-narrow">
      <span className="fa-start-i"><ScrollText size={22} /></span>
      <h2>{t('No Resilience Record yet', 'अभी कोई रिकॉर्ड नहीं')}</h2>
      <p>{t('Your record is created when a financed asset passes all its checks, or when we verify an asset you already built.', 'रिकॉर्ड तब बनता है जब फ़ाइनेंस किया ढाँचा सभी जाँच पास करे, या जब हम आपके पहले से बने ढाँचे की पुष्टि करें।')}</p>
      <button className="btn primary" onClick={() => setTab('plan')}>{t('Get a record for an asset I have', 'मेरे ढाँचे का रिकॉर्ड पाएँ')}<ArrowRight size={15} /></button>
    </section></div>
  );
  return (
    <div className="fa-page">
      <section className="fa-hello"><div><span className="eyebrow">{t('Resilience Record', 'रेज़िलिएंस रिकॉर्ड')}</span><h1>{t('Your proof, under your control', 'आपका सबूत, आपके नियंत्रण में')}</h1><p>{t('Every fact is labelled by how it is known. Nobody sees it unless you say yes.', 'हर तथ्य पर लिखा है कि वह कैसे पता चला। आपकी हाँ के बिना कोई नहीं देखता।')}</p></div></section>
      {recs.map(c => {
        const done = isComplete(c);
        const h = history(c.id, c.builtYear ?? 2021);
        const d = drySpell(c.id, true);
        const pend = (c.requests ?? []).filter(r => r.status === 'pending');
        return (
          <article className="fa-passport" key={c.id}>
            <header>
              <span className="asset-badge lg"><AssetIcon asset={c.asset} size={24} /></span>
              <div><small>{c.id} · {done ? t('Issued', 'जारी') : t('Being verified', 'जाँच जारी')}</small><h2>{assetName(c.asset, lang)}{c.builtYear ? `, ${c.builtYear}` : ''}</h2><p>{f.name} · {f.village}, {f.district} · AgriStack {f.agristack}</p></div>
              {done ? <span className="fa-seal"><BadgeCheck size={18} />{t('Verified', 'प्रमाणित')}</span> : <span className="fa-seal pending"><Clock size={16} />{t('In progress', 'प्रगति में')}</span>}
            </header>
            <div className="fa-pp-grid">
              <div>
                <h3>{t('Facts on this record', 'इस रिकॉर्ड के तथ्य')}</h3>
                <ul className="fa-facts">{c.evidence.filter(e => !e.file).slice(0, 5).map(e => <li key={e.id}><div><strong>{e.label}</strong><small>{fmtDate(e.at)}</small></div><ProvChip prov={e.prov} /></li>)}</ul>
                <div className="prov-key">{(Object.keys(PROV) as (keyof typeof PROV)[]).map(p => <ProvChip key={p} prov={p} />)}</div>
              </div>
              <div>
                <h3>{c.kind === 'record' ? t('How your field held up in dry years', 'सूखे सालों में आपका खेत') : t('Through the first dry spell', 'पहले सूखे में')}</h3>
                {done ? (c.kind === 'record'
                  ? <DualChart title="Dry-spell NDVI drop" labels={h.years} bars={h.deficit} barLabel={t('Rainfall deficit %', 'बारिश की कमी %')} lines={[{ name: t('Block', 'ब्लॉक'), values: h.block, cls: 'l-block' }, { name: t('Your field', 'आपका खेत'), values: h.plot, cls: 'l-plot' }]} yMax={50} unit="%" height={170} />
                  : <DualChart title="NDVI in dry spell" labels={d.labels} bars={d.rain} barLabel={t('Rain mm', 'बारिश mm')} lines={[{ name: t('Block', 'ब्लॉक'), values: d.block, cls: 'l-block' }, { name: t('Your field', 'आपका खेत'), values: d.plot, cls: 'l-plot' }]} yMin={0.3} yMax={0.8} height={170} />)
                  : <p className="muted">{t('The chart appears once satellites have read your field.', 'सैटेलाइट जाँच के बाद चार्ट दिखेगा।')}</p>}
              </div>
            </div>
            {pend.map(r => <div className="fa-req inline" key={r.id}><span className="fa-req-i"><Bell size={17} /></span><div><strong>{t(`${r.org} wants to see this record`, `${r.org} यह रिकॉर्ड देखना चाहता है`)}</strong><small>{r.purpose}</small></div><div className="fa-req-a"><button className="btn ghost sm" onClick={() => ops.decline(c, r.id, lang)}>{t('Decline', 'मना करें')}</button><button className="btn primary sm" onClick={() => setAllow({ c, rid: r.id })}>{t('Allow', 'अनुमति दें')}</button></div></div>)}
            <footer>
              <div className="fa-who">
                <h3><Lock size={15} />{t('Who can see it', 'कौन देख सकता है')}</h3>
                {c.shares.filter(s => !s.revoked).length === 0 ? <p className="muted small">{t('Only you.', 'सिर्फ़ आप।')}</p> : (
                  <ul>{c.shares.filter(s => !s.revoked).map(s => <li key={s.id}><div><strong>{s.org}</strong><small>{s.purpose} · {t('until', 'तक')} {fmtDate(s.expires)}{s.viewed ? ` · ${t('opened', 'खोला')} ${fmtDate(s.viewed)}` : ''}</small></div><button className="btn ghost sm" onClick={() => ops.revoke(c, s.id, lang)}><X size={14} />{t('Stop', 'रोकें')}</button></li>)}</ul>
                )}
              </div>
              {done && <button className="btn primary" onClick={() => setShare(c)}><Share2 size={15} />{t('Share my record', 'रिकॉर्ड साझा करें')}</button>}
            </footer>
          </article>
        );
      })}
      {allow && <OtpConfirm lang={lang} title={t('Allow access?', 'अनुमति दें?')} cta={t('Allow for 6 months', '6 महीने के लिए अनुमति')} onClose={() => setAllow(null)} onConfirm={() => ops.allow(allow.c, allow.rid, lang)} body={<p className="muted">{t('They will see the facts and charts on this record. You can stop access any time.', 'वे इस रिकॉर्ड के तथ्य और चार्ट देखेंगे। आप कभी भी रोक सकती हैं।')}</p>} />}
      {share && <OtpConfirm lang={lang} title={t('Share my record', 'रिकॉर्ड साझा करें')} cta={t('Share', 'साझा करें')} onClose={() => setShare(null)} onConfirm={() => ops.share(share, org, t('Loan or insurance decision', 'कर्ज़ या बीमा निर्णय'), months, lang)}
        body={<>
          <label className="field">{t('Share with', 'किसके साथ')}<select value={org} onChange={e => setOrg(e.target.value)}>{ORGS.map(o => <option key={o}>{o}</option>)}</select></label>
          <label className="field">{t('For how long', 'कितने समय के लिए')}<select value={months} onChange={e => setMonths(+e.target.value)}><option value={3}>{t('3 months', '3 महीने')}</option><option value={6}>{t('6 months', '6 महीने')}</option><option value={12}>{t('12 months', '12 महीने')}</option></select></label>
        </>} />}
    </div>
  );
}
