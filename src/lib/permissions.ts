import type { Role } from '../types';

const FINANCE_WRITERS: readonly Role[] = ['ADMIN', 'TESORERIA'];
const FINANCE_READERS: readonly Role[] = ['ADMIN', 'DIRECTIVA', 'TESORERIA'];
const CONTENT_EDITORS: readonly Role[] = ['ADMIN', 'EDITOR'];
const MEMBER_READERS: readonly Role[] = ['ADMIN', 'DIRECTIVA', 'TESORERIA'];

export function canWriteFinance(role: Role | null | undefined): boolean {
  return Boolean(role && FINANCE_WRITERS.includes(role));
}

export function canReadFinance(role: Role | null | undefined): boolean {
  return Boolean(role && FINANCE_READERS.includes(role));
}

export function canEditContent(role: Role | null | undefined): boolean {
  return Boolean(role && CONTENT_EDITORS.includes(role));
}

export function canReadMembers(role: Role | null | undefined): boolean {
  return Boolean(role && MEMBER_READERS.includes(role));
}

export function isAdmin(role: Role | null | undefined): boolean {
  return role === 'ADMIN';
}
