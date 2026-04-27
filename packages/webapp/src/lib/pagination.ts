import { PAGINATION_DEFAULTS } from '@/lib/constants';

export interface PageState {
  limit: number;
  offset: number;
}

export function nextPage(state: PageState): PageState {
  return { limit: state.limit, offset: state.offset + state.limit };
}

export function previousPage(state: PageState): PageState {
  return { limit: state.limit, offset: Math.max(0, state.offset - state.limit) };
}

export function pageNumber(state: PageState): number {
  return Math.floor(state.offset / state.limit) + 1;
}

export function totalPages(total: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.max(1, Math.ceil(total / limit));
}

export function defaultPageState(): PageState {
  return { ...PAGINATION_DEFAULTS };
}
