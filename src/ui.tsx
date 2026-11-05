import React, { useEffect, useRef } from 'react';
import { X, Droplets, Waves, Sun, CloudDrizzle, BadgeCheck, Satellite, User, Wrench } from 'lucide-react';
import { type AssetKey, type Provenance, PROV } from './model';

export const AssetIcon = ({ asset, size = 20 }: { asset: AssetKey; size?: number }) => {
  const I = { drip: Droplets, pond: Waves, solar: Sun, sprinkler: CloudDrizzle }[asset];
  return <I size={size} aria-hidden />;
};

export function Pill({ tone, children }: { tone: 'green' | 'gold' | 'rust' | 'blue' | 'grey'; children: React.ReactNode }) {
  return <span className={'pill ' + tone}><span className="dot" />{children}</span>;
}

export function ProvChip({ prov }: { prov: Provenance }) {
  const I = { self: User, installer: Wrench, verified: BadgeCheck, remote: Satellite }[prov];
  return <span className={'prov ' + prov} title={PROV[prov].label}><I size={12} aria-hidden />{PROV[prov].label}</span>;
}

export function Modal({ title, sub, onClose, children, wide }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.querySelector<HTMLElement>('input,select,textarea,button:not(.close)')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && el) {
        const a = Array.from(el.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')).filter(x => !x.hasAttribute('disabled'));
        if (!a.length) return;
        if (e.shiftKey && document.activeElement === a[0]) { e.preventDefault(); a[a.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === a[a.length - 1]) { e.preventDefault(); a[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); prev?.focus(); };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
          <button className="icon-btn close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Meter({ value, max = 1, tone = 'brand' }: { value: number; max?: number; tone?: string }) {
  return <div className="meter" role="presentation"><span className={tone} style={{ width: Math.max(0, Math.min(100, (value / max) * 100)) + '%' }} /></div>;
}

/** Bars for rainfall (or deficit) behind two lines: the plot and the block median. */
export function DualChart({ labels, bars, barLabel, lines, yMax, yMin = 0, unit = '', height = 190, title }: {
  labels: (string | number)[]; bars?: number[]; barLabel?: string; title: string;
  lines: { name: string; values: number[]; cls: string }[]; yMax: number; yMin?: number; unit?: string; height?: number;
}) {
  const W = 560, H = height, pl = 38, pr = 10, pt = 12, pb = 30;
  const iw = W - pl - pr, ih = H - pt - pb;
  const x = (i: number) => pl + (labels.length === 1 ? iw / 2 : (i * iw) / (labels.length - 1));
  const y = (v: number) => pt + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const bmax = bars ? Math.max(...bars, 1) : 1;
  const bw = Math.min(26, iw / labels.length * 0.55);
  const ticks = [0, 0.5, 1].map(t => yMin + (yMax - yMin) * t);
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        {ticks.map(t => <g key={t}><line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} className="grid" /><text x={pl - 6} y={y(t) + 3} className="tick" textAnchor="end">{Number.isInteger(t) ? t : t.toFixed(2)}{unit}</text></g>)}
        {bars?.map((b, i) => <rect key={i} x={x(i) - bw / 2} width={bw} y={pt + ih - (b / bmax) * ih * 0.62} height={(b / bmax) * ih * 0.62} rx={3} className="bar"><title>{`${labels[i]}: ${b} ${barLabel ?? ''}`}</title></rect>)}
        {lines.map(l => <g key={l.name} className={l.cls}>
          <path d={l.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} className="line" />
          {l.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3}><title>{`${l.name}, ${labels[i]}: ${v}${unit}`}</title></circle>)}
        </g>)}
        {labels.map((lb, i) => <text key={i} x={x(i)} y={H - 8} className="tick" textAnchor="middle">{lb}</text>)}
      </svg>
      <figcaption>
        {lines.map(l => <span key={l.name}><i className={'key ' + l.cls} />{l.name}</span>)}
        {bars && <span><i className="key barkey" />{barLabel}</span>}
      </figcaption>
    </figure>
  );
}

/** Stacked bar showing where the money is: released, unlocked by the next check, or still held. */
export function TrancheBar({ parts }: { parts: { label: string; value: number; state: 'released' | 'next' | 'locked' }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div className="tranche-bar" aria-hidden>
      {parts.map(p => <span key={p.label} className={p.state} style={{ width: (p.value / total) * 100 + '%' }} />)}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3>{children}</div>;
}
