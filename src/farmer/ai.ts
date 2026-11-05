// Illustrative "AI" outputs for the farmer app. Deterministic, rule-based and seeded per farmer,
// so the demo is repeatable. Nothing here calls a model or a real data source.
import { ASSETS, plan, inr, st, isComplete, trancheAmount, installerName, fmtDate, type AssetKey, type Case, type Farmer } from '../model';

export type Lang = 'en' | 'hi';
export const tr = (lang: Lang) => (en: string, hi: string) => (lang === 'hi' ? hi : en);

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

export const ASSET_HI: Record<AssetKey, string> = { drip: 'ड्रिप सिंचाई', pond: 'खेत तालाब', solar: 'सोलर पंप', sprinkler: 'स्प्रिंकलर' };
export const assetName = (k: AssetKey, lang: Lang) => (lang === 'hi' ? ASSET_HI[k] : ASSETS[k].name);

/* ---------------- Farm scan ---------------- */

export type Recommendation = { asset: AssetKey; score: number; units: number; reasons: { en: string; hi: string }[] };
export type FarmScan = {
  hectares: number; soil: { en: string; hi: string }; groundwater: { en: string; hi: string; level: 'critical' | 'semi' | 'safe' };
  dryLoss: number; dryYears: number; ndvi: number; blockNdvi: number; confidence: number; cells: number[];
  recs: Recommendation[]; summary: { en: string; hi: string };
};

const SOILS = [
  { en: 'Rakar (light, gravelly)', hi: 'राकड़ (हल्की, कंकरीली)', light: true },
  { en: 'Parua (sandy loam)', hi: 'पड़ुआ (बलुई दोमट)', light: true },
  { en: 'Kabar (heavy clay)', hi: 'काबर (भारी चिकनी)', light: false },
  { en: 'Mar (black cotton)', hi: 'मार (काली मिट्टी)', light: false },
];

export function scanFarm(f: Farmer): FarmScan {
  const r = rng(f.id + f.agristack);
  const soil = SOILS[Math.floor(r() * SOILS.length)];
  const gwRoll = r();
  const groundwater = gwRoll < 0.35 ? { en: 'Over-exploited block', hi: 'अति-दोहित ब्लॉक', level: 'critical' as const } : gwRoll < 0.8 ? { en: 'Semi-critical block', hi: 'अर्ध-संकटग्रस्त ब्लॉक', level: 'semi' as const } : { en: 'Safe block', hi: 'सुरक्षित ब्लॉक', level: 'safe' as const };
  const w = f.water.toLowerCase();
  const hasPond = w.includes('pond'), diesel = w.includes('diesel'), rainfed = w.includes('rain'), well = w.includes('well') || w.includes('bore');
  const units = Math.max(1, Math.min(3, Math.floor(f.acres)));
  const recs: Recommendation[] = [
    {
      asset: 'drip' as AssetKey, units, score: 62 + (hasPond ? 26 : 0) + (well ? 10 : 0) - (groundwater.level === 'critical' ? 12 : 0) + (soil.light ? 4 : 0),
      reasons: [
        hasPond ? { en: 'Your pond gives a steady source; drip stretches it across the rabi season', hi: 'आपका तालाब पानी देता है; ड्रिप उसे पूरे रबी मौसम तक चलाता है' } : { en: 'Cuts water use by 30–50% on the same field', hi: 'उसी खेत में 30–50% कम पानी लगता है' },
        { en: `Fits ${(f.crop.split(',')[0].trim() || 'your crop').toLowerCase()} rows on ${units} acre${units > 1 ? 's' : ''}`, hi: `${units} एकड़ पर आपकी फसल की कतारों के लिए सही` },
      ],
    },
    {
      asset: 'pond' as AssetKey, units: 1, score: 58 + (rainfed ? 30 : 0) + (groundwater.level === 'critical' ? 22 : groundwater.level === 'semi' ? 10 : 0) - (hasPond ? 60 : 0),
      reasons: [
        groundwater.level !== 'safe' ? { en: 'Recharges groundwater in a stressed block, so it is preferred here', hi: 'दबाव वाले ब्लॉक में भूजल भरता है, इसलिए यहाँ पहली पसंद' } : { en: 'Stores monsoon run-off for one protective rabi irrigation', hi: 'बरसात का पानी रोककर रबी में एक बचाव सिंचाई' },
        { en: 'Khet Talab subsidy covers half the cost', hi: 'खेत तालाब योजना आधी लागत देती है' },
      ],
    },
    {
      asset: 'solar' as AssetKey, units: 1, score: 50 + (diesel ? 38 : 0) + (well ? 8 : 0),
      reasons: [
        diesel ? { en: 'Ends your diesel spend, about ₹28,000 a year', hi: 'डीज़ल का खर्च खत्म, लगभग ₹28,000 सालाना' } : { en: 'Daytime pumping without grid or diesel', hi: 'बिना बिजली या डीज़ल के दिन में सिंचाई' },
        { en: 'PM-KUSUM pays 75% of the cost', hi: 'पीएम-कुसुम 75% लागत देता है' },
      ],
    },
    {
      asset: 'sprinkler' as AssetKey, units, score: 48 + (soil.light ? 18 : 0) + (well ? 6 : 0),
      reasons: [
        soil.light ? { en: 'Light soil drains fast; sprinklers wet it evenly', hi: 'हल्की मिट्टी जल्दी सूखती है; स्प्रिंकलर बराबर नमी देता है' } : { en: 'Low-cost start for wheat and pulses', hi: 'गेहूँ और दालों के लिए कम लागत की शुरुआत' },
        { en: 'Smallest loan and fastest payback', hi: 'सबसे छोटा कर्ज़, सबसे जल्दी वापसी' },
      ],
    },
  ].map(x => ({ ...x, score: Math.max(18, Math.min(97, Math.round(x.score + (r() - 0.5) * 6))) })).sort((a, b) => b.score - a.score);
  const cells = Array.from({ length: 48 }, () => +(0.32 + r() * 0.28).toFixed(2));
  return {
    hectares: +(f.acres * 0.405).toFixed(2), soil, groundwater,
    dryLoss: Math.round(24 + r() * 16), dryYears: 3 + Math.floor(r() * 3), ndvi: +(0.38 + r() * 0.08).toFixed(2), blockNdvi: +(0.4 + r() * 0.05).toFixed(2),
    confidence: +(0.82 + r() * 0.1).toFixed(2), cells, recs,
    summary: {
      en: `In past dry spells your field browned faster than the block, mostly in the patches shown in tan. ${ASSETS[recs[0].asset].name} scores highest because ${recs[0].reasons[0].en.charAt(0).toLowerCase() + recs[0].reasons[0].en.slice(1)}.`,
      hi: `पिछले सूखे में आपका खेत ब्लॉक से जल्दी सूखा, ख़ासकर भूरे हिस्सों में। ${ASSET_HI[recs[0].asset]} सबसे ऊपर है क्योंकि ${recs[0].reasons[0].hi}।`,
    },
  };
}

/* ---------------- Weekly advisory ---------------- */

export function advisory(f: Farmer, asset: AssetKey | null, lang: Lang) {
  const t = tr(lang);
  const r = rng(f.id + 'wk');
  const days = lang === 'hi' ? ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rain = days.map((_, i) => (i === 5 ? Math.round(6 + r() * 8) : r() < 0.15 ? Math.round(r() * 3) : 0));
  const temp = days.map(() => Math.round(27 + r() * 5));
  const plan7 = days.map((d, i) => {
    if (rain[i] > 4) return { d, rain: rain[i], temp: temp[i], act: t('Skip, rain expected', 'छोड़ें, बारिश संभव') };
    if (!asset) return { d, rain: rain[i], temp: temp[i], act: i === 1 ? t('Check soil moisture', 'मिट्टी की नमी देखें') : '—' };
    if (asset === 'pond') return { d, rain: rain[i], temp: temp[i], act: i % 3 === 1 ? t('Pump 2 hrs from pond', 'तालाब से 2 घंटे पंप') : '—' };
    if (asset === 'solar') return { d, rain: rain[i], temp: temp[i], act: i % 2 === 0 ? t('Run 10am–2pm', 'सुबह 10–दोपहर 2 चलाएँ') : '—' };
    const mins = asset === 'drip' ? 40 + Math.round(r() * 15) : 60;
    return { d, rain: rain[i], temp: temp[i], act: i % 2 === 1 ? t(`Run ${mins} min`, `${mins} मिनट चलाएँ`) : '—' };
  });
  const headline = asset
    ? t(`Dry week ahead until Saturday. Your ${assetName(asset, lang).toLowerCase()} can keep the crop on track.`, `शनिवार तक सूखा हफ्ता। आपका ${assetName(asset, lang)} फसल को बचाए रखेगा।`)
    : t('Dry week ahead. Sow chickpea after the Saturday shower to use the moisture.', 'सूखा हफ्ता। शनिवार की बारिश के बाद चना बोएँ ताकि नमी का फायदा मिले।');
  const saving = asset ? Math.round(18 + r() * 14) : 0;
  return { plan7, headline, saving };
}

/* ---------------- Farmer-friendly status ---------------- */

export const JOURNEY = [
  { key: 'assess', en: 'Farm check', hi: 'खेत की जाँच', den: 'We look at your farm, rainfall and satellite history, then suggest what to build.', dhi: 'हम आपके खेत, बारिश और सैटेलाइट इतिहास को देखकर सही ढाँचा सुझाते हैं।' },
  { key: 'sanction', en: 'Loan approved', hi: 'कर्ज़ मंज़ूर', den: 'The lender approves 85% of your share. You pay only the remaining 15%.', dhi: 'आपके हिस्से का 85% कर्ज़। आप सिर्फ़ 15% देती हैं।' },
  { key: 'install', en: 'Installation', hi: 'लगवाना', den: 'A certified installer fits it. They upload photos from your field.', dhi: 'प्रमाणित इंस्टॉलर लगाता है और खेत से फ़ोटो भेजता है।' },
  { key: 'checks', en: 'Checked, then paid', hi: 'जाँच के बाद भुगतान', den: 'An independent checker visits. The installer is paid in parts, only after each check passes.', dhi: 'स्वतंत्र जाँचकर्ता आता है। हर जाँच पास होने पर ही इंस्टॉलर को किस्त मिलती है।' },
  { key: 'subsidy', en: 'Subsidy released', hi: 'सब्सिडी जारी', den: 'The same proof goes to the state, so the subsidy comes faster.', dhi: 'वही सबूत सरकार को जाता है, सब्सिडी जल्दी आती है।' },
  { key: 'dry', en: 'Works through a dry spell', hi: 'सूखे में काम', den: 'Satellites confirm it kept your field green. The last payment is held until then.', dhi: 'सैटेलाइट देखता है कि सूखे में खेत हरा रहा। तब तक आख़िरी भुगतान रुका रहता है।' },
  { key: 'record', en: 'Your Resilience Record', hi: 'आपका रेज़िलिएंस रिकॉर्ड', den: 'A record you own. Share it for your next loan, a KCC limit review or insurance.', dhi: 'आपका अपना रिकॉर्ड। अगले कर्ज़, केसीसी या बीमा के लिए साझा करें।' },
];

export function journeyIndex(c: Case): number {
  if (c.kind === 'record') return isComplete(c) ? 7 : 6;
  const d = (k: string) => st(c, k) === 'done';
  if (d('record')) return 7;
  if (d('subsidy') && !d('satellite')) return 5;
  if (d('fieldCheck')) return d('subsidy') ? 5 : 4;
  if (d('commission') || d('verifyDelivery')) return 3;
  if (d('sanction')) return 2;
  if (d('assess')) return 1;
  return 0;
}

export function plainStatus(c: Case, lang: Lang) {
  const t = tr(lang);
  const a = assetName(c.asset, lang);
  if (c.declined) return { title: t('Loan not approved this time', 'इस बार कर्ज़ मंज़ूर नहीं हुआ'), next: c.declined, who: t('Talk to your Dhara Mitra about a smaller plan', 'छोटी योजना के लिए धारा मित्र से बात करें') };
  if (c.kind === 'record') return isComplete(c)
    ? { title: t('Your record is ready', 'आपका रिकॉर्ड तैयार है'), next: t('Share it with a lender or insurer when you choose.', 'जब चाहें, बैंक या बीमा कंपनी से साझा करें।'), who: t('You decide who sees it', 'कौन देखे, यह आप तय करती हैं') }
    : { title: t(`We are checking your ${a.toLowerCase()}`, `आपके ${a} की जाँच हो रही है`), next: t('A field checker will visit, then we read satellite history back to 2017.', 'जाँचकर्ता खेत पर आएगा, फिर 2017 से सैटेलाइट इतिहास देखा जाएगा।'), who: t('Field checker · Dhara Verify', 'जाँचकर्ता · धारा वेरिफ़ाई') };
  const failed = Object.entries(c.steps).find(([, v]) => v.state === 'failed');
  if (failed) return { title: t('Installer is fixing an issue', 'इंस्टॉलर एक कमी ठीक कर रहा है'), next: t(`The checker found: “${failed[1].note}”. The installer is not paid until it is fixed. You pay nothing extra.`, `जाँच में मिला: “${failed[1].note}”. ठीक होने तक इंस्टॉलर को भुगतान नहीं। आपको कुछ अतिरिक्त नहीं देना।`), who: installerName(c.installer) };
  const i = journeyIndex(c);
  const map: Record<number, { title: string; next: string; who: string }> = {
    1: { title: t('Your plan is with the lender', 'आपकी योजना बैंक के पास है'), next: t('Tata Capital usually decides within 3 working days. We will send an SMS.', 'टाटा कैपिटल आमतौर पर 3 कार्यदिवस में फ़ैसला करता है। हम SMS भेजेंगे।'), who: 'Tata Capital' },
    2: { title: t(`Loan approved. ${a} is on its way`, `कर्ज़ मंज़ूर। ${a} आ रहा है`), next: t('The installer will call to fix a delivery date. Keep your Aadhaar-linked phone handy.', 'इंस्टॉलर डिलीवरी की तारीख़ के लिए फ़ोन करेगा।'), who: installerName(c.installer) },
    3: { title: t('Installed. Waiting for the field check', 'लग गया। खेत जाँच बाकी'), next: t('An independent checker will visit. Show them the system running.', 'स्वतंत्र जाँचकर्ता आएगा। उन्हें सिस्टम चलाकर दिखाएँ।'), who: t('Field checker · Dhara Verify', 'जाँचकर्ता · धारा वेरिफ़ाई') },
    4: { title: t('Check passed. Subsidy on the way', 'जाँच पास। सब्सिडी आ रही है'), next: t('The state is reviewing the proof. Satellites will watch your field through the next dry spell.', 'सरकार सबूत देख रही है। अगले सूखे में सैटेलाइट खेत पर नज़र रखेगा।'), who: t('UP Agriculture Department', 'उ.प्र. कृषि विभाग') },
    5: { title: t('Almost done', 'लगभग पूरा'), next: t('Waiting for the last check. Keep using the system in dry weeks.', 'आख़िरी जाँच बाकी। सूखे हफ़्तों में सिस्टम चलाती रहें।'), who: 'Dhara' },
    7: { title: t(`${a} is working and verified`, `${a} चालू और प्रमाणित`), next: t('It is now on your Resilience Record. First instalment is due after harvest.', 'यह अब आपके रिकॉर्ड में है। पहली किस्त फ़सल के बाद।'), who: t('You', 'आप') },
  };
  return map[i] ?? map[1];
}

/* ---------------- Photo check ---------------- */

export function photoCheck(asset: AssetKey, seed: string) {
  const r = rng(seed + asset);
  const conf = +(0.86 + r() * 0.1).toFixed(2);
  const findings: Record<AssetKey, string[]> = {
    drip: ['Drip laterals detected along crop rows', `Emitter spacing about ${38 + Math.round(r() * 6)} cm`, 'Filter and venturi visible at the header'],
    pond: [`Lined pond, about ${20 + Math.round(r() * 3)} × ${19 + Math.round(r() * 3)} m`, 'Standing water present', 'Inlet and silt trap visible'],
    solar: [`${6 + Math.round(r() * 2)} solar panels on a tilted frame`, 'Pump controller mounted and powered', 'Delivery pipe running to the field'],
    sprinkler: ['Sprinkler risers in a grid pattern', 'Even spray arc observed', 'Main line connected to the source'],
  };
  return { conf, findings: findings[asset], geo: 'Geotag inside the AgriStack plot boundary', time: 'Timestamp after sanction' };
}

/* ---------------- Sahayak (assistant) ---------------- */

export type Ctx = { f: Farmer; cases: Case[]; lang: Lang };
export type Reply = { text: string; card?: { label: string; value: string }[]; sources: string[] };

export const SUGGESTIONS = (lang: Lang) => lang === 'hi'
  ? ['मेरे खेत के लिए क्या सही है?', 'मुझे कितना देना होगा?', 'सब्सिडी कब आएगी?', 'इस हफ़्ते सिंचाई कब करूँ?', 'मेरा रिकॉर्ड कौन देख सकता है?', 'बीमा कैसे मिलेगा?']
  : ['What suits my farm?', 'How much will I pay?', 'When will the subsidy come?', 'When should I irrigate this week?', 'Who can see my record?', 'How do I get insurance?'];

export function answer(q: string, { f, cases, lang }: Ctx): Reply {
  const t = tr(lang);
  const s = q.toLowerCase();
  const fin = cases.find(c => c.kind === 'finance' && !c.declined);
  const has = (...w: string[]) => w.some(x => s.includes(x));
  if (has('suit', 'best', 'which', 'recommend', 'सही', 'क्या लगवा', 'कौन सा')) {
    const scan = scanFarm(f); const owned = new Set(cases.filter(c => !c.declined).map(c => c.asset)); const top = scan.recs.find(r => !owned.has(r.asset)) ?? scan.recs[0]; const p = plan(top.asset, top.units);
    return {
      text: t(`For your ${f.acres} acres in ${f.village}, ${assetName(top.asset, lang).toLowerCase()} fits best (score ${top.score}/100). ${top.reasons[0].en}. Your field lost about ${scan.dryLoss}% more greenness than it should in past dry spells.`,
        `${f.village} में आपके ${f.acres} एकड़ के लिए ${assetName(top.asset, lang)} सबसे सही है (स्कोर ${top.score}/100)। ${top.reasons[0].hi}। पिछले सूखे में आपके खेत की हरियाली लगभग ${scan.dryLoss}% घटी।`),
      card: [{ label: t('Cost', 'लागत'), value: inr(p.cost) }, { label: t('Subsidy', 'सब्सिडी'), value: inr(p.subsidy) }, { label: t('You pay upfront', 'आप अभी देंगी'), value: inr(p.own) }, { label: t('Payback', 'वसूली'), value: t(`${p.payback.toFixed(1)} years`, `${p.payback.toFixed(1)} साल`) }],
      sources: ['Sentinel-2 2017–2025', 'IMD rainfall', 'CGWB block status', 'AgriStack'],
    };
  }
  if (has('pay', 'cost', 'emi', 'instal', 'kitna', 'कितना', 'किस्त', 'पैसा', 'देना')) {
    if (!fin) return { text: t('You have no loan yet. Open “Plan” to see costs for each option before you decide.', 'अभी कोई कर्ज़ नहीं है। फ़ैसले से पहले “योजना” में हर विकल्प की लागत देखें।'), sources: ['Dhara Plan'] };
    const p = plan(fin.asset, fin.units);
    return {
      text: t(`For your ${assetName(fin.asset, lang).toLowerCase()}: you pay ${inr(p.own)} upfront. Nothing more until your first harvest, then ${inr(p.instalment)} once a year for 5 years. The expected benefit is ${inr(p.benefit)} a year, about ${p.cover.toFixed(1)} times the instalment.`,
        `आपके ${assetName(fin.asset, lang)} के लिए: अभी ${inr(p.own)} देना है। पहली फ़सल तक कुछ नहीं, फिर 5 साल तक साल में एक बार ${inr(p.instalment)}। अनुमानित फ़ायदा ${inr(p.benefit)} सालाना, यानी किस्त का ${p.cover.toFixed(1)} गुना।`),
      card: [{ label: t('Loan', 'कर्ज़'), value: inr(p.loan) }, { label: t('Interest', 'ब्याज'), value: '13%' }, { label: t('Yearly instalment', 'सालाना किस्त'), value: inr(p.instalment) }, { label: t('Processing fee', 'प्रोसेसिंग फ़ीस'), value: inr(p.fee) }],
      sources: ['Your loan terms', 'Dhara Plan'],
    };
  }
  if (has('subsid', 'sabsid', 'सब्सिडी', 'anudan', 'अनुदान')) {
    if (!fin) return { text: t('Subsidy is released once your asset passes the field check. You do not apply separately: Dhara sends the proof to the state.', 'खेत जाँच पास होते ही सब्सिडी जारी होती है। अलग से आवेदन नहीं: धारा सबूत सरकार को भेजता है।'), sources: ['PMKSY', 'Khet Talab'] };
    const p = plan(fin.asset, fin.units);
    const done = st(fin, 'subsidy') === 'done';
    return {
      text: done
        ? t(`Your subsidy of ${inr(p.subsidy)} was released on ${fmtDate(fin.steps.subsidy?.at)}.${fin.bridge ? ' It repaid the bridge loan, so you owe nothing on it.' : ''}`, `आपकी ${inr(p.subsidy)} सब्सिडी ${fmtDate(fin.steps.subsidy?.at)} को जारी हुई।${fin.bridge ? ' इससे ब्रिज कर्ज़ चुक गया।' : ''}`)
        : t(`Your subsidy of ${inr(p.subsidy)} (${ASSETS[fin.asset].scheme}) is sent to the state after the field check passes. ${fin.bridge ? 'Because you chose a bridge, the installer is paid now and you do not wait.' : ''}`, `आपकी ${inr(p.subsidy)} सब्सिडी खेत जाँच पास होने के बाद सरकार को भेजी जाती है। ${fin.bridge ? 'ब्रिज चुना है, इसलिए आपको इंतज़ार नहीं करना।' : ''}`),
      sources: [ASSETS[fin.asset].scheme, 'Dhara verification pack'],
    };
  }
  if (has('irrigat', 'water', 'rain', 'weather', 'सिंचाई', 'बारिश', 'मौसम', 'पानी')) {
    const live = cases.find(c => c.kind === 'record' ? isComplete(c) : st(c, 'commission') === 'done');
    const a = advisory(f, live?.asset ?? null, lang);
    return { text: a.headline + (a.saving ? t(` Following this saves about ${a.saving}% water this week.`, ` इससे इस हफ़्ते लगभग ${a.saving}% पानी बचेगा।`) : ''), card: a.plan7.filter(d => d.act !== '—').slice(0, 4).map(d => ({ label: d.d, value: d.act })), sources: ['IMD 7-day forecast', 'Sentinel-1 soil moisture'] };
  }
  if (has('record', 'share', 'see', 'रिकॉर्ड', 'देख', 'साझा')) {
    const shares = cases.flatMap(c => c.shares.filter(x => !x.revoked).map(x => x.org));
    return {
      text: shares.length
        ? t(`Right now ${[...new Set(shares)].join(' and ')} can see your record. You can stop any of them in “My record”. Nobody else can, and Dhara never sells your data.`, `अभी ${[...new Set(shares)].join(' और ')} आपका रिकॉर्ड देख सकते हैं। “मेरा रिकॉर्ड” में कभी भी रोक सकती हैं। धारा आपका डेटा कभी नहीं बेचता।`)
        : t('Nobody can see your record until you say yes with an OTP. You choose who, why and for how long.', 'जब तक आप OTP से हाँ नहीं कहतीं, कोई नहीं देख सकता। किसे, क्यों और कितने समय के लिए, आप तय करती हैं।'),
      sources: ['DPDP Act, 2023', 'Your consent log'],
    };
  }
  if (has('insur', 'bima', 'बीमा')) {
    return { text: t('Tata AIG can cover your asset against damage for about 1.2% of its value a year. Share your record with them to get a quote; the verified record means no extra inspection.', 'टाटा AIG आपके ढाँचे का बीमा लगभग 1.2% सालाना में करता है। कोटेशन के लिए रिकॉर्ड साझा करें; प्रमाणित रिकॉर्ड से अलग जाँच नहीं।'), sources: ['Tata AIG asset cover (illustrative)'] };
  }
  if (has('when', 'status', 'kab', 'कब', 'installer', 'इंस्टॉलर')) {
    if (!fin) return { text: t('Start with a farm check in “Plan”. It takes about 5 minutes here, or 20 with your Dhara Mitra.', '“योजना” में खेत जाँच से शुरू करें। यहाँ 5 मिनट, या धारा मित्र के साथ 20 मिनट।'), sources: ['Dhara'] };
    const ps = plainStatus(fin, lang);
    return { text: `${ps.title}. ${ps.next}`, card: (['t1', 't2', 'hold'] as const).map((x, i) => ({ label: t(`Installer payment ${i + 1}`, `इंस्टॉलर भुगतान ${i + 1}`), value: fin.released[x] ? t('Paid', 'दिया') : t(`Held · ${inr(trancheAmount(fin, x))}`, `रुका · ${inr(trancheAmount(fin, x))}`) })), sources: ['Your case timeline'] };
  }
  return { text: t('I can help with what to build, what you will pay, subsidy, irrigation this week, insurance and who can see your record. Try one of the questions below.', 'मैं बता सकती हूँ: क्या लगवाएँ, कितना देना होगा, सब्सिडी, इस हफ़्ते सिंचाई, बीमा, और रिकॉर्ड कौन देख सकता है। नीचे का कोई सवाल चुनें।'), sources: [] };
}
