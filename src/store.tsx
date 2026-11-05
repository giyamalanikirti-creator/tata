import { createContext, useContext } from 'react';
import type { Case, Role, State } from './model';

export const QUEUE_LABEL: Record<Role, string> = {
  farmer: 'My journey', mitra: 'Farmer cases', lender: 'Loan pipeline', installer: 'My jobs', verifier: 'Verification queue', state: 'Subsidy packs',
};


export type Route = { page: 'overview' | 'queue' | 'case' | 'assess' | 'portfolio' | 'records' | 'thesis' | 'farmer'; id?: string };

export type Store = {
  state: State; role: Role; route: Route;
  setRole: (r: Role) => void;
  go: (r: Route) => void;
  update: (fn: (s: State) => void) => void;
  updateCase: (id: string, fn: (c: Case, s: State) => void) => void;
  toast: (msg: string) => void;
};

export const StoreCtx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('Store missing');
  return s;
};

export function parseHash(h: string): Route {
  const [page, id] = h.replace(/^#\/?/, '').split('/');
  const pages: Route['page'][] = ['overview', 'queue', 'case', 'assess', 'portfolio', 'records', 'thesis', 'farmer'];
  return pages.includes(page as Route['page']) ? { page: page as Route['page'], id: id ? decodeURIComponent(id) : undefined } : { page: 'overview' };
}
export const toHash = (r: Route) => '#/' + r.page + (r.id ? '/' + encodeURIComponent(r.id) : '');
