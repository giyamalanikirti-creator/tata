import { useEffect, useMemo, useState } from 'react';
import { Satellite, Check, Loader2, ArrowRight, Minus, Plus, MapPin, Droplets, Sprout, Users, BadgeCheck, TrendingUp, Fuel, Wand2, MessageCircle } from 'lucide-react';
import { ASSETS, INSTALLERS, plan, inr, type AssetKey } from '../model';
import { AssetIcon } from '../ui';
import { scanFarm, whatIf, assetName } from './ai';
import { useFarmer, AiPanel, StageHead, FarmMap } from './parts';

const SCAN_STEPS = [
  { en: 'Finding your plot from AgriStack', hi: 'एग्रीस्टैक से आपका खेत ढूँढ रहे हैं' },
  { en: 'Reading Sentinel-2 images, 2017–2025', hi: 'सेंटिनल-2 तस्वीरें पढ़ रहे हैं, 2017–2025' },
  { en: 'Matching IMD rainfall and dry spells', hi: 'IMD बारिश और सूखे से मिला रहे हैं' },
  { en: 'Ranking options by payback', hi: 'वसूली के हिसाब से विकल्प क्रम में' },
];

export type Draft = { asset: AssetKey; units: number; installer: string; bridge: boolean };
const key = (fid: string, k: string) => `dhara.v3.${k}.${fid}`;
export const readDraft = (fid: string): Draft | null => { try { const d = JSON.parse(localStorage.getItem(key(fid, 'draft')) ?? 'null'); return d && ASSETS[d.asset as AssetKey] ? d : null; } catch { return null; } };
export const writeDraft = (fid: string, d: Draft | null) => { try { if (d) localStorage.setItem(key(fid, 'draft'), JSON.stringify(d)); else localStorage.removeItem(key(fid, 'draft')); } catch { /* ignore */ } };
const readScanned = (fid: string) => { try { return localStorage.getItem(key(fid, 'scan')) === '1'; } catch { return false; } };
const writeScanned = (fid: string) => { try { localStorage.setItem(key(fid, 'scan'), '1'); } catch { /* ignore */ } };

export default function PlanStage() {
  const { f, cases, t, lang, setTab, askAi } = useFarmer();
  const scan = useMemo(() => scanFarm(f), [f]);
  const owned = new Set(cases.filter(c => !c.declined).map(c => c.asset));
  const firstFree = scan.recs.find(r => !owned.has(r.asset)) ?? scan.recs[0];
  const draft = readDraft(f.id);
  const [phase, setPhase] = useState<'intro' | 'scan' | 'done'>(() => (readScanned(f.id) ? 'done' : 'intro'));
  const [k, setK] = useState(0);
  const [asset, setAsset] = useState<AssetKey>(draft?.asset ?? firstFree.asset);
  const maxUnits = Math.max(1, Math.floor(f.acres));
  const [units, setUnits] = useState(Math.min(draft?.units ?? firstFree.units, maxUnits));
  const [installer, setInstaller] = useState(draft?.installer ?? INSTALLERS[0].id);
  const [bridge, setBridge] = useState(draft?.bridge ?? true);

  useEffect(() => {
    if (phase !== 'scan') return;
    if (k >= SCAN_STEPS.length) { setPhase('done'); writeScanned(f.id); return; }
    const id = setTimeout(() => setK(k + 1), 420);
    return () => clearTimeout(id);
  }, [phase, k, f.id]);

  const p = plan(asset, units);
  const wi = whatIf(f, asset, ASSETS[asset].perAcre ? units : 1);
  const activeFin = cases.find(c => c.kind === 'finance' && !c.declined && c.steps.record?.state !== 'done');

  return (
    <div className="fa-page">
      <StageHead n={1} title={t('Plan: what should you build?', 'योजना: क्या लगवाएँ?')} sub={t('Dhara AI reads your field’s history and ranks the four upgrades Dhara can finance. You choose; nothing is sent to anyone yet.', 'धारा AI आपके खेत का इतिहास पढ़कर चार विकल्पों को क्रम देता है। चुनाव आपका; अभी कुछ किसी को नहीं भेजा जाता।')}
        right={<button className="btn ghost" onClick={() => askAi(lang === 'hi' ? 'मेरे खेत के लिए क्या सही है?' : 'What suits my farm?')}><MessageCircle size={16} />{t('Ask AI about planning', 'योजना पर AI से पूछें')}</button>} />

      {activeFin && <div className="note-bar"><Check size={16} />{t(`You already have ${assetName(activeFin.asset, lang).toLowerCase()} in Finance (${activeFin.id}). You can still plan your next asset here.`, `आपका ${assetName(activeFin.asset, lang)} वित्त चरण में है (${activeFin.id})। आप यहाँ अगला ढाँचा भी सोच सकती हैं।`)} <button className="link" onClick={() => setTab('finance')}>{t('Track it', 'देखें')}<ArrowRight size={13} /></button></div>}

      <section className="fa-card">
        <div className="fa-card-h"><div><h2><Sprout size={18} />{t('Your farm', 'आपका खेत')}</h2><small>{t('From AgriStack and what you told us. Not AI.', 'एग्रीस्टैक और आपकी दी जानकारी से। AI नहीं।')}</small></div></div>
        <dl className="farm-facts">
          <div><dt><MapPin size={14} />{t('Village', 'गाँव')}</dt><dd>{f.village}, {f.district}</dd></div>
          <div><dt><Sprout size={14} />{t('Land', 'ज़मीन')}</dt><dd>{f.acres} {t('acres', 'एकड़')} · {(f.acres * 0.405).toFixed(2)} ha</dd></div>
          <div><dt><Sprout size={14} />{t('Crops', 'फ़सलें')}</dt><dd>{f.crop}</dd></div>
          <div><dt><Droplets size={14} />{t('Water today', 'अभी पानी')}</dt><dd>{f.water}</dd></div>
          <div><dt><BadgeCheck size={14} />AgriStack</dt><dd>{f.agristack}</dd></div>
          <div><dt><Users size={14} />{t('Loan route', 'कर्ज़ का रास्ता')}</dt><dd>{f.tenant ? t('Tenant · FPO group loan', 'किरायेदार · FPO समूह कर्ज़') : t('Individual', 'व्यक्तिगत')}</dd></div>
        </dl>
      </section>

      <AiPanel title={t('AI farm check', 'AI खेत जाँच')} sub={t('Satellite history, rainfall and groundwater for your plot', 'आपके खेत का सैटेलाइट इतिहास, बारिश और भूजल')} conf={phase === 'done' ? scan.confidence : undefined}
        sources={phase === 'done' ? ['Sentinel-2 2017–2025', 'IMD rainfall', 'CGWB block status', 'AgriStack plot'] : undefined} onAgain={phase === 'done' ? () => { setK(0); setPhase('scan'); } : undefined}>
        {phase === 'intro' && <div className="scan-intro">
          <div className="fa-scan-art"><FarmMap cells={scan.cells} faded /></div>
          <div>
            <p>{t(`Dhara AI will look at your plot in ${f.village} from space, compare it with neighbouring fields in every dry spell since 2017, and rank what to build.`, `धारा AI ${f.village} में आपके खेत को अंतरिक्ष से देखेगा, 2017 से हर सूखे में पड़ोसी खेतों से तुलना करेगा, और बताएगा क्या लगवाएँ।`)}</p>
            <ul className="fa-checklist">{SCAN_STEPS.map(s => <li key={s.en}><Check size={14} />{lang === 'hi' ? s.hi : s.en}</li>)}</ul>
            <button className="btn ai lg" onClick={() => { setK(0); setPhase('scan'); }}><Satellite size={17} />{t('Run AI farm check', 'AI खेत जाँच चलाएँ')}</button>
          </div>
        </div>}
        {phase === 'scan' && <div className="scan-intro" aria-live="polite">
          <div className="fa-scan-art scanning"><FarmMap cells={scan.cells} /><span className="scanline" /></div>
          <ul className="fa-scan-steps">{SCAN_STEPS.map((s, i) => <li key={s.en} className={i < k ? 'done' : i === k ? 'now' : ''}>{i < k ? <Check size={15} /> : i === k ? <Loader2 size={15} className="spin" /> : <span />}{lang === 'hi' ? s.hi : s.en}</li>)}</ul>
        </div>}
        {phase === 'done' && <div className="fa-scan-res">
          <div className="fa-scan-art"><FarmMap cells={scan.cells} /><div className="fa-map-key"><span><i className="lo" />{t('Dry', 'सूखा')}</span><span><i className="hi" />{t('Green', 'हरा')}</span></div></div>
          <div className="fa-findings">
            <div><small>{t('Greenness lost in dry spells', 'सूखे में हरियाली की कमी')}</small><strong className="bad">−{scan.dryLoss}%</strong><em>{t(`${scan.dryYears} dry years since 2017`, `2017 से ${scan.dryYears} सूखे साल`)}</em></div>
            <div><small>{t('Soil', 'मिट्टी')}</small><strong>{lang === 'hi' ? scan.soil.hi : scan.soil.en}</strong></div>
            <div><small>{t('Groundwater', 'भूजल')}</small><strong className={scan.groundwater.level === 'safe' ? 'good' : 'bad'}>{lang === 'hi' ? scan.groundwater.hi : scan.groundwater.en}</strong></div>
            <div><small>{t('Your plot vs block (NDVI)', 'आपका खेत बनाम ब्लॉक (NDVI)')}</small><strong>{scan.ndvi} / {scan.blockNdvi}</strong></div>
            <p className="ai-say">{lang === 'hi' ? scan.summary.hi : scan.summary.en}</p>
          </div>
        </div>}
      </AiPanel>

      {phase === 'done' && <>
        <AiPanel title={t('AI recommendations for your farm', 'आपके खेत के लिए AI सुझाव')} sub={t('Ranked by fit with your water, soil and payback. Tap one to choose it.', 'पानी, मिट्टी और वसूली के हिसाब से क्रम। चुनने के लिए टैप करें।')} sources={['AI farm check', 'Scheme subsidy rates', 'Dhara loan terms']}>
          <div className="fa-recs">
            {scan.recs.map((r, idx) => {
              const q = plan(r.asset, Math.min(r.units, maxUnits));
              const has = owned.has(r.asset);
              return (
                <button key={r.asset} className={'fa-rec' + (asset === r.asset ? ' on' : '')} aria-pressed={asset === r.asset} onClick={() => { setAsset(r.asset); setUnits(Math.min(r.units, maxUnits)); }}>
                  <div className="fa-rec-top"><span className="asset-badge"><AssetIcon asset={r.asset} /></span><div><strong>{assetName(r.asset, lang)}</strong>{idx === 0 && <span className="best">{t('Best fit', 'सबसे सही')}</span>}{has && <span className="best grey">{t('You have this', 'आपके पास है')}</span>}</div><span className="fa-score"><b>{r.score}</b>/100</span></div>
                  <div className="meter"><span className="ai" style={{ width: r.score + '%' }} /></div>
                  <ul>{r.reasons.map(x => <li key={x.en}><Check size={13} />{lang === 'hi' ? x.hi : x.en}</li>)}</ul>
                  <div className="fa-rec-nums"><span>{t('You pay now', 'अभी')} <b>{inr(q.own)}</b></span><span>{t('Yearly', 'सालाना')} <b>{inr(q.instalment)}</b></span><span>{t('Payback', 'वसूली')} <b>{q.payback.toFixed(1)}{t(' yrs', ' साल')}</b></span></div>
                </button>
              );
            })}
          </div>
        </AiPanel>

        <AiPanel title={t(`What if you build ${assetName(asset, lang).toLowerCase()}?`, `अगर ${assetName(asset, lang)} लगवाएँ तो?`)} sub={t('A dry year and six years of cash, simulated for your farm', 'एक सूखा साल और छह साल का हिसाब, आपके खेत के लिए')} sources={['AI farm check', 'Your Dhara Plan numbers']}>
          <div className="whatif">
            <div className="wi-bars">
              <h4>{t('Crop lost in a dry year', 'सूखे साल में फ़सल नुकसान')}</h4>
              <div className="wi-row"><span>{t('Without', 'इसके बिना')}</span><div className="bar-track"><span className="bad" style={{ width: wi.lossWithout * 2 + '%' }} /></div><b>{wi.lossWithout}%</b></div>
              <div className="wi-row"><span>{t('With it', 'इसके साथ')}</span><div className="bar-track"><span style={{ width: wi.lossWith * 2 + '%' }} /></div><b>{wi.lossWith}%</b></div>
              <div className="wi-chips">
                {wi.water > 0 && <span><Droplets size={14} />{t(`${wi.water}% less water`, `${wi.water}% कम पानी`)}</span>}
                {wi.diesel > 0 && <span><Fuel size={14} />{t(`${inr(wi.diesel)} diesel saved a year`, `${inr(wi.diesel)} डीज़ल बचत सालाना`)}</span>}
                {asset === 'pond' && <span><Droplets size={14} />{t('One protective rabi irrigation', 'रबी में एक बचाव सिंचाई')}</span>}
                <span><TrendingUp size={14} />{t(`About ${inr(wi.p.benefit)} benefit a year`, `लगभग ${inr(wi.p.benefit)} फ़ायदा सालाना`)}</span>
              </div>
            </div>
            <div>
              <h4>{t('Your cash over six years', 'छह साल में आपका हिसाब')}</h4>
              <CashChart cash={wi.cash} />
              <p className="ai-say">{t(`You get back what you paid upfront in year ${Math.max(1, wi.breakeven)}. After the loan is repaid, you are about ${inr(wi.net6)} better off by year 6.`, `अभी दिया पैसा साल ${Math.max(1, wi.breakeven)} में वापस। कर्ज़ चुकने के बाद, छठे साल तक लगभग ${inr(wi.net6)} का फ़ायदा।`)}</p>
            </div>
          </div>
        </AiPanel>

        <section className="fa-card plan-card">
          <div className="fa-card-h"><div><h2><AssetIcon asset={asset} size={18} />{t('Your Dhara Plan', 'आपकी धारा योजना')}</h2><small>{assetName(asset, lang)} · {ASSETS[asset].scheme} · {t('Fixed scheme and loan numbers. Not AI.', 'तय योजना और कर्ज़ के आँकड़े। AI नहीं।')}</small></div></div>
          <div className="plan-grid">
            <div>
              {ASSETS[asset].perAcre && <div className="field"><span>{t('Acres to cover', 'कितने एकड़')}</span><div className="stepper-num"><button aria-label="Fewer acres" disabled={units <= 1} onClick={() => setUnits(units - 1)}><Minus size={14} /></button><strong>{units}</strong><button aria-label="More acres" disabled={units >= maxUnits} onClick={() => setUnits(units + 1)}><Plus size={14} /></button></div></div>}
              <div className="waterfall">
                <div><span>{t('Total cost', 'कुल लागत')}</span><strong>{inr(p.cost)}</strong></div>
                <div className="minus"><span>{t('Government subsidy', 'सरकारी सब्सिडी')} ({ASSETS[asset].subsidyPct}%)</span><strong>− {inr(p.subsidy)}</strong></div>
                <div className="total"><span>{t('Your share', 'आपका हिस्सा')}</span><strong>{inr(p.share)}</strong></div>
                <div className="split"><span><i className="sw loan" />{t('Loan (85% of your share)', 'कर्ज़ (आपके हिस्से का 85%)')}</span><strong>{inr(p.loan)}</strong></div>
                <div className="split"><span><i className="sw own" />{t('You pay now (15%)', 'आप अभी देंगी (15%)')}</span><strong>{inr(p.own)}</strong></div>
              </div>
            </div>
            <div>
              <span className="field-l">{t('Certified installer', 'प्रमाणित इंस्टॉलर')}</span>
              <div className="inst-list">{INSTALLERS.map(i => <button key={i.id} className={installer === i.id ? 'on' : ''} aria-pressed={installer === i.id} onClick={() => setInstaller(i.id)}><strong>{i.name}</strong><small>★ {i.rating} · {t(`${i.functioning}% still working after a year`, `${i.functioning}% एक साल बाद भी चालू`)} · {i.jobs} {t('jobs', 'काम')}</small></button>)}</div>
              <label className="switch-line"><input type="checkbox" checked={bridge} onChange={e => setBridge(e.target.checked)} /><span><strong>{t(`Don’t wait for the subsidy (${inr(p.subsidy)})`, `सब्सिडी (${inr(p.subsidy)}) का इंतज़ार न करें`)}</strong><small>{t('A bridge loan pays the installer now and is repaid by the subsidy.', 'ब्रिज कर्ज़ से इंस्टॉलर को अभी भुगतान, सब्सिडी से चुकता।')}</small></span></label>
            </div>
          </div>
          <div className="actions">
            <span className="muted small">{t('Next: check the loan, your documents and affordability in Finance.', 'आगे: वित्त में कर्ज़, कागज़ और क्षमता जाँचें।')}</span>
            <button className="btn primary lg" onClick={() => { writeDraft(f.id, { asset, units: ASSETS[asset].perAcre ? units : 1, installer, bridge }); setTab('finance'); }}>{t('Continue to Finance', 'वित्त पर आगे बढ़ें')}<ArrowRight size={16} /></button>
          </div>
        </section>
      </>}

      {phase !== 'done' && <div className="locked-hint"><Wand2 size={16} />{t('Run the AI farm check to see recommendations, a what-if simulation and your plan.', 'सुझाव, अनुमान और योजना देखने के लिए AI खेत जाँच चलाएँ।')}</div>}
    </div>
  );
}

function CashChart({ cash }: { cash: { y: string; v: number }[] }) {
  const W = 420, H = 180, pl = 22, pr = 22, pt = 24, pb = 26;
  const max = Math.max(...cash.map(c => c.v), 1), min = Math.min(...cash.map(c => c.v), 0);
  const x = (i: number) => pl + i * (W - pl - pr) / (cash.length - 1);
  const y = (v: number) => pt + (max - v) / (max - min) * (H - pt - pb);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="cash-chart" role="img" aria-label="Cumulative cash over six years">
      <line x1={pl} x2={W - pr} y1={y(0)} y2={y(0)} className="zero" />
      <path d={`M${x(0)},${y(0)} ` + cash.map((c, i) => `L${x(i)},${y(c.v)}`).join(' ') + ` L${x(cash.length - 1)},${y(0)} Z`} className="area" />
      <path d={cash.map((c, i) => `${i ? 'L' : 'M'}${x(i)},${y(c.v)}`).join(' ')} className="ln" />
      {cash.map((c, i) => <g key={c.y}><circle cx={x(i)} cy={y(c.v)} r={3.5} className={c.v < 0 ? 'neg' : ''}><title>{`${c.y}: ${inr(c.v)}`}</title></circle><text x={x(i)} y={H - 8} textAnchor="middle">{c.y}</text></g>)}
      <text x={x(cash.length - 1)} y={y(cash[cash.length - 1].v) - 8} textAnchor="end" className="lab">{inr(cash[cash.length - 1].v)}</text>
    </svg>
  );
}
