import { createContext, useContext, useState, type ReactNode } from 'react';
import { Sparkles, Lock, Languages, Check, RefreshCw } from 'lucide-react';
import { uid, today, log, type Case, type Farmer } from '../model';
import { useStore } from '../store';
import { Modal } from '../ui';
import { tr, type Lang } from './ai';

export const OTP = '2468';
export type Tab = 'home' | 'plan' | 'finance' | 'record' | 'ask';

export type FarmerCtx = { f: Farmer; cases: Case[]; lang: Lang; t: (en: string, hi: string) => string; setTab: (t: Tab) => void; askAi: (q?: string) => void };
export const FCtx = createContext<FarmerCtx | null>(null);
export const useFarmer = () => { const c = useContext(FCtx); if (!c) throw new Error('no farmer'); return c; };

/** The single visual language for anything produced by Dhara AI in this demo. */
export function AiPanel({ title, sub, sources, conf, children, onAgain, action }: { title: string; sub?: string; sources?: string[]; conf?: number; children: ReactNode; onAgain?: () => void; action?: ReactNode }) {
  const { t } = useFarmer();
  return (
    <section className="ai-panel" aria-label={'Dhara AI: ' + title}>
      <header>
        <span className="ai-mark"><Sparkles size={16} /></span>
        <div><span className="ai-kicker">{t('Dhara AI', 'धारा AI')}</span><h3>{title}</h3>{sub && <small>{sub}</small>}</div>
        <span className="ai-tag">{t('Demo response', 'डेमो जवाब')}{conf ? ` · ${Math.round(conf * 100)}%` : ''}</span>
      </header>
      <div className="ai-body">{children}</div>
      {(sources?.length || onAgain || action) && <footer>
        {!!sources?.length && <small>{t('Based on', 'आधार')}: {sources.join(' · ')}</small>}
        <span className="ai-foot-a">{onAgain && <button className="link" onClick={onAgain}><RefreshCw size={13} />{t('Run again', 'फिर चलाएँ')}</button>}{action}</span>
      </footer>}
    </section>
  );
}

export function StageHead({ n, title, sub, right }: { n: 1 | 2 | 3; title: string; sub: string; right?: ReactNode }) {
  const { t, setTab } = useFarmer();
  const names: [string, string][] = [['Plan', 'योजना'], ['Finance', 'वित्त'], ['Record', 'रिकॉर्ड']];
  return (
    <section className="stage-head">
      <ol className="stage-rail" aria-label={t('Stages', 'चरण')}>
        {names.map(([en, hi], i) => <li key={en} className={i + 1 === n ? 'on' : ''}><button onClick={() => setTab((['plan', 'finance', 'record'] as Tab[])[i])}><span>{i + 1}</span>{t(en, hi)}</button></li>)}
      </ol>
      <div className="stage-title">
        <div><span className="eyebrow">{t(`Stage ${n} of 3`, `चरण ${n} / 3`)}</span><h1>{title}</h1><p>{sub}</p></div>
        {right}
      </div>
    </section>
  );
}

export function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return <div className="fa-lang" role="group" aria-label="Language"><Languages size={15} /><button aria-pressed={lang === 'en'} className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button><button aria-pressed={lang === 'hi'} className={lang === 'hi' ? 'on' : ''} onClick={() => setLang('hi')}>हिं</button></div>;
}

export function OtpConfirm({ title, body, cta, onConfirm, onClose }: { title: string; body: ReactNode; cta: string; onConfirm: () => void; onClose: () => void }) {
  const { t } = useFarmer();
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

export function useCaseOps() {
  const { updateCase, toast } = useStore();
  const { t } = useFarmer();
  return {
    allow: (c: Case, rid: string) => {
      updateCase(c.id, x => {
        const r = (x.requests ?? []).find(q => q.id === rid)!; r.status = 'allowed';
        const exp = new Date(); exp.setMonth(exp.getMonth() + 6);
        x.shares.unshift({ id: uid('s'), org: r.org, purpose: r.purpose, granted: today(), expires: exp.toISOString().slice(0, 10) });
        log(x, 'farmer', `Farmer allowed ${r.org} to see her record for six months (OTP confirmed).`);
      });
      toast(t('Access allowed for 6 months', '6 महीने के लिए अनुमति दी'));
    },
    decline: (c: Case, rid: string) => {
      updateCase(c.id, x => { const r = (x.requests ?? []).find(q => q.id === rid)!; r.status = 'declined'; log(x, 'farmer', `Farmer declined ${r.org}'s request.`); });
      toast(t('Request declined', 'अनुरोध अस्वीकार'));
    },
    revoke: (c: Case, sid: string) => {
      updateCase(c.id, x => { const s = x.shares.find(q => q.id === sid)!; s.revoked = today(); log(x, 'farmer', `Farmer revoked access for ${s.org}.`); });
      toast(t('Access stopped', 'पहुँच रोकी गई'));
    },
    share: (c: Case, org: string, purpose: string, months: number) => {
      updateCase(c.id, x => {
        const exp = new Date(); exp.setMonth(exp.getMonth() + months);
        x.shares.unshift({ id: uid('s'), org, purpose, granted: today(), expires: exp.toISOString().slice(0, 10) });
        log(x, 'farmer', `Farmer shared her record with ${org} for ${months} months (OTP confirmed).`);
      });
      toast(t(`Shared with ${org}`, `${org} के साथ साझा किया`));
    },
  };
}

export function FarmMap({ cells, faded }: { cells: number[]; faded?: boolean }) {
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

export const Tick = ({ ok = true }: { ok?: boolean }) => <span className={'tick ' + (ok ? 'ok' : 'warn')}>{ok ? <Check size={12} /> : '!'}</span>;
export const initials = (n: string) => n.split(' ').map(x => x[0]).slice(0, 2).join('');
export { tr };
