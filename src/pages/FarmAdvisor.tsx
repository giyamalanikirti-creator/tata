import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { farmAdvice, type AdviceMode, type Goal } from '../advisor';
import { type AssetKey, type Case, type Farmer } from '../model';

const MODES: { id: AdviceMode; label: string }[] = [{ id: 'planning', label: 'Plan' }, { id: 'recommendations', label: 'Recommend' }, { id: 'assessment', label: 'Assess' }, { id: 'monitoring', label: 'Monitor' }];
export default function FarmAdvisor({ farmer, cases, selected, units, onPlan }: { farmer: Farmer; cases: Case[]; selected?: AssetKey; units?: number; onPlan?: () => void }) {
  const [mode, setMode] = useState<AdviceMode>(selected ? 'assessment' : 'planning');
  const [goal, setGoal] = useState<Goal>('water');
  const [budget, setBudget] = useState('10000');
  const [answer, setAnswer] = useState<{ text: string; source: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [permission, setPermission] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const validBudget = budget.trim() !== '' && Number.isFinite(Number(budget)) && Number(budget) >= 0;
  const result = useMemo(() => farmAdvice(farmer, cases, goal, validBudget ? Number(budget) : 0, selected, units), [farmer, cases, goal, budget, selected, units, validBudget]);
  // Invalidate in-flight responses when the underlying plan or profile changes.
  useEffect(() => { controller.current?.abort(); setAnswer(null); setMessage(''); setLoading(false); }, [result, mode]);
  useEffect(() => () => controller.current?.abort(), []);
  async function askAI() {
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    setLoading(true); setAnswer(null); setMessage('');
    try {
      const response = await fetch('/api/advisor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, facts: result.facts }), signal: AbortSignal.any([current.signal, AbortSignal.timeout(25000)]) });
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      if (typeof data.text !== 'string' || !data.text.trim() || data.source !== 'ai') throw new Error('invalid');
      if (!current.signal.aborted) setAnswer({ text: data.text, source: 'AI-generated guidance' });
    } catch { if (!current.signal.aborted) setMessage('AI is unavailable right now. Your local farm guidance is shown below.'); }
    finally { if (!current.signal.aborted) setLoading(false); }
  }
  return <section className="card farm-advisor" aria-label="Farm assistant">
    <div className="page-head"><div><span className="eyebrow"><Sparkles size={14} aria-hidden /> Dhara intelligence</span><h2>Your farm assistant</h2><p>Plan investments, compare options and understand what needs attention.</p></div><span className="pill blue">{answer ? 'AI guidance' : 'Local guidance'}</span></div>
    <div className="advisor-modes" aria-label="Assistant tools">{MODES.map(item => <button type="button" key={item.id} className={'btn ' + (mode === item.id ? 'primary' : 'ghost')} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>{item.label}</button>)}</div>
    <div className="form-grid"><label className="field">Your priority<select value={goal} onChange={e => setGoal(e.target.value as Goal)}><option value="water">Save water</option><option value="energy">Reduce pumping costs</option><option value="budget">Keep upfront costs low</option></select></label><label className="field">Upfront budget (₹)<input type="number" min="0" step="100" value={budget} onChange={e => setBudget(e.target.value)} /></label></div>
    {!validBudget && <p role="alert">Enter an upfront budget of zero or more.</p>}
    {validBudget && <div className="advisor-output" aria-live="polite">{answer ? <p className="advisor-ai">{answer.text}</p> : <ul>{result.advice[mode].map(text => <li key={text}>{text}</li>)}</ul>}</div>}
    <label className="check-line"><input type="checkbox" checked={permission} onChange={e => { setPermission(e.target.checked); if (!e.target.checked) { controller.current?.abort(); setLoading(false); setAnswer(null); } }} />Share farm size, crops, water source, budget and case stages with the AI service for guidance.</label>
    <div className="farmer-form-actions"><button type="button" className="btn primary" disabled={!permission || !validBudget || loading} onClick={askAI}>{loading ? 'Reviewing your farm…' : 'Ask AI for guidance'}</button>{onPlan && <button type="button" className="btn ghost" onClick={onPlan}>Build my investment plan</button>}</div>
    {message && <p role="status">{message}</p>}
    <p className="fine">Local guidance uses your farm profile and catalogue estimates. AI can make mistakes. No live weather or satellite feed is connected; field verification and lending decisions remain with the responsible partners.</p>
  </section>;
}
