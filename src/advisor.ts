import { ASSETS, activeSteps, plan, inr, statusOf, type AssetKey, type Case, type Farmer } from './model';

export type AdviceMode = 'planning' | 'recommendations' | 'assessment' | 'monitoring';
export type Goal = 'water' | 'energy' | 'budget';
export function farmAdvice(farmer: Farmer, cases: Case[], goal: Goal, budget: number, selected?: AssetKey, units?: number) {
  const owned = cases.filter(c => c.kind === 'record' || c.steps.commission?.state === 'done').map(c => c.asset);
  const choices = (Object.keys(ASSETS) as AssetKey[]).map(asset => {
    const quantity = ASSETS[asset].perAcre ? (selected === asset && units && Number.isFinite(units) ? units : Math.min(2, farmer.acres)) : 1;
    const costs = plan(asset, quantity);
    const source = farmer.water.toLowerCase();
    let score = asset === 'drip' ? 3 : asset === 'sprinkler' ? 2 : 1;
    let reason = asset === 'drip' ? 'Targeted irrigation can reduce water use; confirm crop spacing and filtration.' : asset === 'sprinkler' ? 'Portable irrigation can suit wheat and pulses; check pressure and wind exposure.' : asset === 'pond' ? 'Storage can provide protective irrigation; check runoff, land and lining.' : 'Solar pumping can reduce diesel use; check source yield and pump sizing.';
    if ((source.includes('rain') || source.includes('shared')) && asset === 'pond') { score += 5; reason = 'Limited or shared water makes storage worth assessing; confirm monsoon runoff before investing.'; }
    if ((goal === 'energy' || source.includes('diesel')) && asset === 'solar') { score += 7; reason = 'Solar pumping addresses your energy goal; confirm reliable water supply before sizing a pump.'; }
    if (goal === 'water' && asset === 'drip') score += 3;
    if (goal === 'budget' && asset === 'sprinkler') score += 5;
    if (owned.includes(asset)) { score -= 8; reason += ' You already have this asset recorded; review its condition before adding another.'; }
    if (costs.own > budget) score -= 5;
    return { asset, quantity, costs, reason, score, affordable: costs.own <= budget };
  }).sort((a, b) => b.score - a.score);
  const chosen = choices.find(c => c.asset === selected) ?? choices[0];
  const top = choices[0];
  const monitoring = cases.length ? cases.map(c => {
    if (c.declined) return `${c.id}: Declined. Ask your Dhara Mitra to review the decision and alternatives.`;
    const failed = activeSteps(c).find(s => c.steps[s.key]?.state === 'failed');
    if (failed) return `${c.id}: ${failed.label} needs rework. Keep payments held until an independent re-check passes.`;
    if (c.kind === 'finance' && c.steps.fieldCheck?.state === 'done' && c.steps.satellite?.state !== 'done') return `${c.id}: Installation field check is complete. Dry-spell use confirmation is pending; no satellite conclusion should be drawn yet.`;
    return `${c.id}: ${statusOf(c).label}. ${activeSteps(c).map(s => s.desc).join(' ') || 'Continue seasonal checks and keep service records.'}`;
  }) : ['No cases to monitor yet. Submit an application or request verification of an existing asset.'];
  const advice: Record<AdviceMode, string[]> = {
    planning: [`Start by assessing ${ASSETS[top.asset].name.toLowerCase()}. ${top.reason}`, `For ${top.quantity} ${ASSETS[top.asset].perAcre ? 'acres' : 'unit'}: estimated cost ${inr(top.costs.cost)}, potential subsidy ${inr(top.costs.subsidy)}, upfront contribution ${inr(top.costs.own)}.`, 'Confirm water availability, site suitability and subsidy eligibility with your Dhara Mitra before installation.'],
    recommendations: choices.map(c => `${ASSETS[c.asset].name}: ${c.reason} Upfront ${inr(c.costs.own)}; ${c.affordable ? 'within' : 'above'} your stated upfront budget. Estimated annual instalment ${inr(c.costs.instalment)}.`),
    assessment: [`${ASSETS[chosen.asset].name}: ${chosen.costs.own <= budget ? 'Estimated upfront contribution fits' : 'Estimated upfront contribution exceeds'} your ${inr(budget)} budget.`, `Estimated annual benefit ${inr(chosen.costs.benefit)} versus annual instalment ${inr(chosen.costs.instalment)} (${chosen.costs.cover.toFixed(1)}× coverage). These are catalogue estimates, not measured farm income.`, ...(chosen.costs.cover < 1.2 ? ['Repayment margin is thin. Review a smaller system or lower-cost option before borrowing.'] : []), 'Assessment needs soil, water reliability, household cash flow and field evidence. This guidance is not a credit decision.'],
    monitoring,
  };
  // Only agronomic and workflow facts enter the AI request: no names, IDs or attachments.
  const facts = { farm: { acres: farmer.acres, crops: farmer.crop, water: farmer.water }, goal, upfrontBudget: budget, selectedAsset: chosen.asset, options: choices.map(c => ({ asset: c.asset, quantity: c.quantity, cost: c.costs.cost, subsidy: c.costs.subsidy, upfront: c.costs.own, annualInstalment: c.costs.instalment, reason: c.reason })), workflow: cases.map(c => ({ kind: c.kind, asset: c.asset, status: statusOf(c).label, failedCheck: activeSteps(c).some(s => c.steps[s.key]?.state === 'failed'), fieldChecked: c.steps.fieldCheck?.state === 'done', useConfirmed: c.steps.satellite?.state === 'done' })) };
  return { advice, facts, top };
}
