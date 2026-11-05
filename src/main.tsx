import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home, Inbox, PlusCircle, LineChart, ScrollText, Landmark, RotateCcw, Menu, X, CheckCircle2, ChevronsUpDown, MapPin } from 'lucide-react';
import { KEY, ROLES, readState, seed, waitingOn, type Role, type State, type Case } from './model';
import { StoreCtx, parseHash, toHash, QUEUE_LABEL, type Route, type Store } from './store';
import Overview from './pages/Overview';
import Queue from './pages/Queue';
import CaseView from './pages/CaseView';
import Assess from './pages/Assess';
import Portfolio from './pages/Portfolio';
import Records from './pages/Records';
import Thesis from './pages/Thesis';
import FarmerPortal from './pages/FarmerPortal';
import './style.css';


function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
      <rect width="34" height="34" rx="9" fill="var(--brand)" />
      <path d="M17 7c4 5.2 6.5 8.7 6.5 12a6.5 6.5 0 0 1-13 0C10.5 15.7 13 12.2 17 7Z" fill="#f4c27a" />
      <path d="M13.6 20.2l2.4 2.4 4.6-4.8" stroke="var(--brand)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function App() {
  const [state, setState] = useState<State>(readState);
  const [role, setRoleRaw] = useState<Role>(() => {
    try { const r = localStorage.getItem(KEY + '.role') as Role; if (ROLES.some(x => x.id === r)) return r; } catch { /* ignore */ }
    return 'mitra';
  });
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  const [msg, setMsg] = useState('');
  const [nav, setNav] = useState(false);
  const [farmerPortal, setFarmerPortal] = useState(() => location.hash === '#/farmer');

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { setMsg('Browser storage is full. Remove attachments before saving more changes.'); } }, [state]);
  useEffect(() => { try { localStorage.setItem(KEY + '.role', role); } catch { /* ignore */ } }, [role]);
  useEffect(() => { const f = () => { setFarmerPortal(location.hash === '#/farmer'); setRoute(parseHash(location.hash)); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(''), 5000); return () => clearTimeout(t); } }, [msg]);

  const go = useCallback((r: Route) => { location.hash = toHash(r); setRoute(r); setNav(false); window.scrollTo({ top: 0 }); }, []);
  const update = useCallback((fn: (s: State) => void) => setState(s => { const n = structuredClone(s); fn(n); return n; }), []);
  const updateCase = useCallback((id: string, fn: (c: Case, s: State) => void) => update(s => { const c = s.cases.find(x => x.id === id); if (c) fn(c, s); }), [update]);
  const setRole = useCallback((r: Role) => { setRoleRaw(r); setMsg(`Now acting as ${ROLES.find(x => x.id === r)!.label}`); }, []);

  const store: Store = useMemo(() => ({ state, role, route, setRole, go, update, updateCase, toast: setMsg }), [state, role, route, setRole, go, update, updateCase]);
  const me = ROLES.find(r => r.id === role)!;
  const pending = state.cases.filter(c => waitingOn(c).includes(role)).length;

  const items: { page: Route['page']; label: string; icon: React.ReactNode; count?: number; show: boolean }[] = [
    { page: 'overview', label: 'Overview', icon: <Home size={18} />, show: true },
    { page: 'queue', label: QUEUE_LABEL[role], icon: <Inbox size={18} />, count: pending, show: true },
    { page: 'assess', label: 'New assessment', icon: <PlusCircle size={18} />, show: role === 'mitra' },
    { page: 'records', label: 'Resilience Records', icon: <ScrollText size={18} />, show: role === 'mitra' || role === 'lender' || role === 'verifier' },
    { page: 'portfolio', label: 'Portfolio and impact', icon: <LineChart size={18} />, show: role === 'lender' },
    { page: 'thesis', label: 'Investment case', icon: <Landmark size={18} />, show: true },
  ];
  const current = route.page === 'case' ? 'queue' : route.page;
  const title = route.page === 'case' ? route.id : items.find(i => i.page === route.page)?.label ?? 'Overview';

  const view = (() => {
    switch (route.page) {
      case 'queue': return <Queue />;
      case 'case': return <CaseView id={route.id ?? ''} />;
      case 'assess': return <Assess />;
      case 'portfolio': return <Portfolio />;
      case 'records': return <Records />;
      case 'thesis': return <Thesis />;
      default: return <Overview />;
    }
  })();

  if (farmerPortal) return <FarmerPortal state={state} onExit={() => { setFarmerPortal(false); go({ page: 'overview' }); }} />;

  return (
    <StoreCtx.Provider value={store}>
      <div className="app">
        <aside className={'sidebar' + (nav ? ' open' : '')} aria-label="Main navigation">
          <a className="brand" href="#/overview" onClick={e => { e.preventDefault(); go({ page: 'overview' }); }}>
            <Logo />
            <span><strong>Dhara</strong><small>Verified resilience finance</small></span>
          </a>
          <label className="role-card">
            <span className="role-label">Acting as</span>
            <span className="role-row">
              <span className={'avatar r-' + role}>{me.initials}</span>
              <span className="role-text"><strong>{me.label}</strong><small>{me.org}</small></span>
              <ChevronsUpDown size={16} aria-hidden />
            </span>
            <select aria-label="Demo role" value={role} onChange={e => setRole(e.target.value as Role)}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <nav>
            <button className="nav-item" onClick={() => { location.hash = '#/farmer'; setFarmerPortal(true); setNav(false); }}><Home size={18} /><span>Farmer login</span></button>
            {items.filter(i => i.show).map(i => (
              <button key={i.page} className={'nav-item' + (current === i.page ? ' active' : '')} aria-current={current === i.page ? 'page' : undefined} onClick={() => go({ page: i.page })}>
                {i.icon}<span>{i.label}</span>{!!i.count && <span className="nav-count" aria-label={`${i.count} need your action`}>{i.count}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <p>Illustrative demo. People, farms, money and satellite readings are simulated.</p>
            <button className="reset" onClick={() => { const s = seed(); setState(s); go({ page: 'overview' }); setMsg('Demo reset to sample cases'); }}><RotateCcw size={14} />Reset demo</button>
          </div>
        </aside>
        {nav && <div className="scrim" onClick={() => setNav(false)} />}
        <div className="shell">
          <header className="topbar">
            <button className="icon-btn menu" aria-label={nav ? 'Close menu' : 'Open menu'} onClick={() => setNav(!nav)}>{nav ? <X size={20} /> : <Menu size={20} />}</button>
            <div className="crumbs"><span>Dhara</span><span aria-hidden>/</span><strong>{title}</strong></div>
            <div className="top-right">
              <span className="chip"><MapPin size={13} />Bundelkhand pilot · UP</span>
              <span className="who"><span className={'avatar sm r-' + role}>{me.initials}</span><span><strong>{me.person}</strong><small>{me.label}</small></span></span>
            </div>
          </header>
          <main>{view}</main>
          <footer className="foot">
            <span>Dhara · a verification engine for small-farmer resilience finance</span>
            <span>Prototype · IMD, Sentinel-2/1 and AgriStack are simulated</span>
          </footer>
        </div>
        {msg && <div className="toast" role="status"><CheckCircle2 size={18} /><span>{msg}</span><button aria-label="Dismiss" onClick={() => setMsg('')}><X size={16} /></button></div>}
      </div>
    </StoreCtx.Provider>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
