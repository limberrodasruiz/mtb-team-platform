import type { DashboardData, Role } from '../types';
import { currentMonth } from '../utils/format';
import { getPublishedNews } from './content';
import {
  getCashMonthly,
  getCashSummary,
} from './finance';
import { getMembers, getMemberDebt, getMembershipSummary } from './members';
import { getPublicStats } from './public';
import { getUpcomingRaces } from './races';
import { getPublicResults } from './results';

const FINANCE_ROLES: Role[] = ['ADMIN', 'DIRECTIVA', 'TESORERIA'];

export function canViewFinance(role: Role | null | undefined): boolean {
  return Boolean(role && FINANCE_ROLES.includes(role));
}

export async function getDashboardData(role: Role): Promise<DashboardData> {
  const period = currentMonth();
  const finance = canViewFinance(role);

  const [stats, members, debt, summaries, cash, monthly, upcoming, newsPage, results] =
    await Promise.all([
      getPublicStats(),
      finance ? getMembers() : Promise.resolve([]),
      finance ? getMemberDebt() : Promise.resolve([]),
      finance ? getMembershipSummary(period.year) : Promise.resolve([]),
      finance ? getCashSummary() : Promise.resolve(null),
      finance ? getCashMonthly() : Promise.resolve([]),
      getUpcomingRaces(5),
      getPublishedNews(4),
      getPublicResults(),
    ]);

  const currentSummary = summaries.find(
    (summary) => summary.year === period.year && summary.month === period.month,
  );
  const currentCash = monthly.find(
    (row) =>
      row.month_key === `${period.year}-${String(period.month).padStart(2, '0')}`,
  );

  const activeMembers = members.filter((member) => member.status === 'ACTIVO').length;

  return {
    stats,
    members: members.length,
    activeMembers,
    pendingMemberships: currentSummary?.pending_count ?? 0,
    pendingAmount: currentSummary?.pending_total ?? 0,
    overdueAmount: debt.reduce((acc, item) => acc + item.overdue_amount, 0),
    debtors: debt.length,
    incomeMonth: currentCash?.operating_income ?? 0,
    expensesMonth: currentCash?.expenses ?? 0,
    balance: cash?.balance ?? 0,
    openingBalance: cash?.opening_balance ?? 0,
    upcoming,
    latestNews: newsPage.items,
    latestResults: results.slice(0, 5),
    cashSummary: cash,
  };
}
